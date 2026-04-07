/**
 * multiplayer.js — WebSocket-based multiplayer client and lobby UI
 */
(function (root) {
  'use strict';

  var MJ = root.MJ || (root.MJ = {});

  // ─── MultiplayerClient ────────────────────────────────────────────

  /**
   * WebSocket client for multiplayer Mahjong games.
   * @param {string} serverUrl - WebSocket server URL (e.g. "wss://example.com/ws")
   */
  function MultiplayerClient(serverUrl) {
    this._serverUrl = serverUrl;
    this._ws = null;
    this._connected = false;
    this._reconnecting = false;
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 5;
    this._reconnectDelay = 2000;
    this._roomId = null;
    this._playerName = null;

    // Callback registries
    this._onMessageHandlers = [];
    this._onStateSyncHandlers = [];
    this._onPlayerJoinHandlers = [];
    this._onPlayerLeaveHandlers = [];
    this._onErrorHandlers = [];
    this._onConnectHandlers = [];
    this._onDisconnectHandlers = [];

    // Pending promises for request/response patterns
    this._pendingRequests = {};
    this._requestIdCounter = 0;
  }

  /**
   * Connect to the WebSocket server.
   * @returns {Promise} Resolves when connected, rejects on failure.
   */
  MultiplayerClient.prototype.connect = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (self._ws && self._connected) {
        resolve();
        return;
      }

      try {
        self._ws = new WebSocket(self._serverUrl);
      } catch (e) {
        reject(new Error('Failed to create WebSocket: ' + e.message));
        return;
      }

      self._ws.onopen = function () {
        self._connected = true;
        self._reconnecting = false;
        self._reconnectAttempts = 0;
        self._fireCallbacks(self._onConnectHandlers);
        resolve();
      };

      self._ws.onclose = function (event) {
        var wasConnected = self._connected;
        self._connected = false;
        self._fireCallbacks(self._onDisconnectHandlers, event);
        if (wasConnected && !event.wasClean) {
          self._attemptReconnect();
        }
      };

      self._ws.onerror = function (event) {
        self._fireCallbacks(self._onErrorHandlers, event);
        if (!self._connected) {
          reject(new Error('WebSocket connection failed'));
        }
      };

      self._ws.onmessage = function (event) {
        self._handleMessage(event);
      };
    });
  };

  /**
   * Disconnect cleanly.
   */
  MultiplayerClient.prototype.disconnect = function () {
    this._reconnecting = false;
    this._reconnectAttempts = this._maxReconnectAttempts; // prevent auto-reconnect
    if (this._ws) {
      this._ws.close(1000, 'Client disconnect');
      this._ws = null;
    }
    this._connected = false;
    this._roomId = null;
  };

  /**
   * @returns {boolean} Whether the WebSocket is currently connected.
   */
  MultiplayerClient.prototype.isConnected = function () {
    return this._connected && this._ws && this._ws.readyState === WebSocket.OPEN;
  };

  /**
   * Send a JSON message to the server.
   * @private
   */
  MultiplayerClient.prototype._send = function (msg) {
    if (!this.isConnected()) {
      console.warn('[Multiplayer] Cannot send — not connected');
      return false;
    }
    this._ws.send(JSON.stringify(msg));
    return true;
  };

  /**
   * Handle an incoming WebSocket message.
   * @private
   */
  MultiplayerClient.prototype._handleMessage = function (event) {
    var data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.warn('[Multiplayer] Could not parse message:', event.data);
      return;
    }

    // Fire general handlers
    this._fireCallbacks(this._onMessageHandlers, data);

    // Route by type
    switch (data.type) {
      case 'room_created':
        this._roomId = data.roomId;
        this._resolvePending('create_room', data);
        break;

      case 'room_joined':
        this._roomId = data.roomId;
        this._resolvePending('join_room', data);
        this._fireCallbacks(this._onPlayerJoinHandlers, data);
        break;

      case 'player_joined':
        this._fireCallbacks(this._onPlayerJoinHandlers, data);
        break;

      case 'player_left':
        this._fireCallbacks(this._onPlayerLeaveHandlers, data);
        break;

      case 'game_start':
      case 'state_update':
        this._fireCallbacks(this._onStateSyncHandlers, data);
        break;

      case 'action_required':
        this._fireCallbacks(this._onStateSyncHandlers, data);
        break;

      case 'round_over':
        this._fireCallbacks(this._onStateSyncHandlers, data);
        break;

      case 'chat':
        // Handled via generic onMessage handlers
        break;

      case 'error':
        this._fireCallbacks(self._onErrorHandlers, data);
        this._rejectPending(null, data.message);
        break;
    }
  };

  /**
   * Attempt automatic reconnection with exponential backoff.
   * @private
   */
  MultiplayerClient.prototype._attemptReconnect = function () {
    var self = this;
    if (self._reconnectAttempts >= self._maxReconnectAttempts) {
      console.warn('[Multiplayer] Max reconnect attempts reached');
      return;
    }
    self._reconnecting = true;
    self._reconnectAttempts++;
    var delay = self._reconnectDelay * Math.pow(1.5, self._reconnectAttempts - 1);
    console.log('[Multiplayer] Reconnecting in ' + Math.round(delay) + 'ms (attempt ' +
      self._reconnectAttempts + ')');

    setTimeout(function () {
      if (!self._reconnecting) return;
      self.connect().then(function () {
        // Re-join room if we were in one
        if (self._roomId && self._playerName) {
          self.joinRoom(self._roomId, self._playerName);
        }
      }).catch(function () {
        self._attemptReconnect();
      });
    }, delay);
  };

  // ─── Pending request tracking ──────────────────────────────────────

  MultiplayerClient.prototype._resolvePending = function (type, data) {
    if (this._pendingRequests[type]) {
      this._pendingRequests[type].resolve(data);
      delete this._pendingRequests[type];
    }
  };

  MultiplayerClient.prototype._rejectPending = function (type, message) {
    if (type && this._pendingRequests[type]) {
      this._pendingRequests[type].reject(new Error(message));
      delete this._pendingRequests[type];
    }
    // If type is null, reject all pending
    if (!type) {
      var keys = Object.keys(this._pendingRequests);
      for (var i = 0; i < keys.length; i++) {
        this._pendingRequests[keys[i]].reject(new Error(message));
      }
      this._pendingRequests = {};
    }
  };

  MultiplayerClient.prototype._createPending = function (type) {
    var self = this;
    return new Promise(function (resolve, reject) {
      self._pendingRequests[type] = { resolve: resolve, reject: reject };
    });
  };

  // ─── Callback helpers ──────────────────────────────────────────────

  MultiplayerClient.prototype._fireCallbacks = function (handlers, data) {
    for (var i = 0; i < handlers.length; i++) {
      try {
        handlers[i](data);
      } catch (e) {
        console.error('[Multiplayer] Handler error:', e);
      }
    }
  };

  // ─── Public API: Room management ───────────────────────────────────

  /**
   * Create a new room.
   * @param {string} playerName
   * @returns {Promise<string>} Resolves with roomId
   */
  MultiplayerClient.prototype.createRoom = function (playerName) {
    this._playerName = playerName;
    this._send({ type: 'create_room', name: playerName });
    return this._createPending('create_room').then(function (data) {
      return data.roomId;
    });
  };

  /**
   * Join an existing room.
   * @param {string} roomId
   * @param {string} playerName
   * @returns {Promise<object>} Resolves with room info
   */
  MultiplayerClient.prototype.joinRoom = function (roomId, playerName) {
    this._playerName = playerName;
    this._roomId = roomId;
    this._send({ type: 'join_room', roomId: roomId, name: playerName });
    return this._createPending('join_room');
  };

  /**
   * Send a game action to the server.
   * @param {object} action - { type:'discard'|'claim'|'pass', tile?, claimType? }
   */
  MultiplayerClient.prototype.sendAction = function (action) {
    this._send({ type: 'action', action: action });
  };

  /**
   * Signal that this player is ready.
   */
  MultiplayerClient.prototype.sendReady = function () {
    this._send({ type: 'ready' });
  };

  /**
   * Send a chat message.
   * @param {string} text
   */
  MultiplayerClient.prototype.sendChat = function (text) {
    this._send({ type: 'chat', text: text });
  };

  // ─── Public API: Event registration ────────────────────────────────

  /**
   * Register a handler for all incoming messages.
   * @param {function} callback - receives parsed message object
   */
  MultiplayerClient.prototype.onMessage = function (callback) {
    if (typeof callback === 'function') this._onMessageHandlers.push(callback);
  };

  /**
   * Register a handler for state synchronization messages.
   * @param {function} callback
   */
  MultiplayerClient.prototype.onStateSync = function (callback) {
    if (typeof callback === 'function') this._onStateSyncHandlers.push(callback);
  };

  /**
   * Register a handler for player join events.
   * @param {function} callback
   */
  MultiplayerClient.prototype.onPlayerJoin = function (callback) {
    if (typeof callback === 'function') this._onPlayerJoinHandlers.push(callback);
  };

  /**
   * Register a handler for player leave events.
   * @param {function} callback
   */
  MultiplayerClient.prototype.onPlayerLeave = function (callback) {
    if (typeof callback === 'function') this._onPlayerLeaveHandlers.push(callback);
  };

  /**
   * Register a handler for errors.
   * @param {function} callback
   */
  MultiplayerClient.prototype.onError = function (callback) {
    if (typeof callback === 'function') this._onErrorHandlers.push(callback);
  };

  /**
   * Register a handler for successful connection.
   * @param {function} callback
   */
  MultiplayerClient.prototype.onConnect = function (callback) {
    if (typeof callback === 'function') this._onConnectHandlers.push(callback);
  };

  /**
   * Register a handler for disconnection.
   * @param {function} callback
   */
  MultiplayerClient.prototype.onDisconnect = function (callback) {
    if (typeof callback === 'function') this._onDisconnectHandlers.push(callback);
  };

  // ─── MultiplayerUI ────────────────────────────────────────────────

  var MultiplayerUI = {};

  /**
   * Build the lobby UI for creating or joining a room.
   * @param {MultiplayerClient} client
   * @param {object} [opts] - { onRoomJoined: function(roomId, players) }
   * @returns {HTMLElement}
   */
  MultiplayerUI.buildLobbyUI = function (client, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'mp-lobby';
    wrap.style.cssText = 'background:var(--panel-bg, #1a2a1a);color:var(--text, #e0e0e0);' +
      'border-radius:12px;padding:24px;max-width:420px;width:100%;font-family:inherit;';

    var title = document.createElement('h2');
    title.textContent = 'Multiplayer Lobby';
    title.style.cssText = 'margin:0 0 20px 0;font-size:20px;text-align:center;';
    wrap.appendChild(title);

    // Status area
    var statusEl = document.createElement('div');
    statusEl.className = 'mp-lobby-status';
    statusEl.style.cssText = 'font-size:13px;min-height:20px;margin-bottom:16px;text-align:center;';
    wrap.appendChild(statusEl);

    function showStatus(msg, color) {
      statusEl.textContent = msg;
      statusEl.style.color = color || '#aaa';
    }

    // Name input
    var nameGroup = createInputGroup('Your Name', 'Enter your name...');
    wrap.appendChild(nameGroup.container);

    // Separator
    wrap.appendChild(createSeparator('Create a Room'));

    // Create room button
    var createBtn = document.createElement('button');
    createBtn.className = 'btn';
    createBtn.textContent = 'Create New Room';
    createBtn.style.cssText = 'width:100%;padding:10px;cursor:pointer;margin-bottom:20px;' +
      'background:var(--accent, #4caf50);color:#fff;border:none;border-radius:6px;font-size:15px;';
    createBtn.addEventListener('click', function () {
      var name = nameGroup.input.value.trim();
      if (!name) {
        showStatus('Please enter your name.', '#ff9800');
        return;
      }
      if (!client.isConnected()) {
        showStatus('Connecting...', '#aaa');
        client.connect().then(function () {
          return client.createRoom(name);
        }).then(function (roomId) {
          showStatus('Room created: ' + roomId, '#4caf50');
          if (opts.onRoomJoined) opts.onRoomJoined(roomId, []);
        }).catch(function (e) {
          showStatus('Error: ' + e.message, '#f44336');
        });
      } else {
        client.createRoom(name).then(function (roomId) {
          showStatus('Room created: ' + roomId, '#4caf50');
          if (opts.onRoomJoined) opts.onRoomJoined(roomId, []);
        }).catch(function (e) {
          showStatus('Error: ' + e.message, '#f44336');
        });
      }
    });
    wrap.appendChild(createBtn);

    // Separator
    wrap.appendChild(createSeparator('Join a Room'));

    // Room ID input
    var roomGroup = createInputGroup('Room ID', 'Enter room ID...');
    wrap.appendChild(roomGroup.container);

    // Join button
    var joinBtn = document.createElement('button');
    joinBtn.className = 'btn';
    joinBtn.textContent = 'Join Room';
    joinBtn.style.cssText = 'width:100%;padding:10px;cursor:pointer;' +
      'background:var(--accent, #4caf50);color:#fff;border:none;border-radius:6px;font-size:15px;';
    joinBtn.addEventListener('click', function () {
      var name = nameGroup.input.value.trim();
      var roomId = roomGroup.input.value.trim().toUpperCase();
      if (!name) {
        showStatus('Please enter your name.', '#ff9800');
        return;
      }
      if (!roomId) {
        showStatus('Please enter a room ID.', '#ff9800');
        return;
      }
      var doJoin = function () {
        client.joinRoom(roomId, name).then(function (data) {
          showStatus('Joined room ' + roomId, '#4caf50');
          if (opts.onRoomJoined) opts.onRoomJoined(roomId, data.players || []);
        }).catch(function (e) {
          showStatus('Error: ' + e.message, '#f44336');
        });
      };
      if (!client.isConnected()) {
        showStatus('Connecting...', '#aaa');
        client.connect().then(doJoin).catch(function (e) {
          showStatus('Connection failed: ' + e.message, '#f44336');
        });
      } else {
        doJoin();
      }
    });
    wrap.appendChild(joinBtn);

    return wrap;
  };

  /**
   * Build the waiting room UI.
   * @param {MultiplayerClient} client
   * @param {Array} players - [{name, seat, ready}]
   * @param {object} [opts] - { isHost:boolean, onReady, onStart }
   * @returns {HTMLElement}
   */
  MultiplayerUI.buildRoomUI = function (client, players, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'mp-room';
    wrap.style.cssText = 'background:var(--panel-bg, #1a2a1a);color:var(--text, #e0e0e0);' +
      'border-radius:12px;padding:24px;max-width:420px;width:100%;font-family:inherit;';

    var title = document.createElement('h2');
    title.textContent = 'Waiting Room';
    title.style.cssText = 'margin:0 0 8px 0;font-size:20px;text-align:center;';
    wrap.appendChild(title);

    // Room ID display
    if (client._roomId) {
      var roomInfo = document.createElement('div');
      roomInfo.style.cssText = 'text-align:center;font-size:14px;color:#aaa;margin-bottom:16px;';
      roomInfo.textContent = 'Room: ' + client._roomId;
      wrap.appendChild(roomInfo);
    }

    // Player list
    var listContainer = document.createElement('div');
    listContainer.className = 'mp-player-list';
    listContainer.style.cssText = 'margin-bottom:20px;';
    wrap.appendChild(listContainer);

    var windNames = ['East', 'South', 'West', 'North'];

    function renderPlayers(playerList) {
      listContainer.innerHTML = '';
      for (var seat = 0; seat < 4; seat++) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;' +
          'padding:8px 12px;margin-bottom:4px;background:rgba(255,255,255,0.05);border-radius:6px;';

        var nameSpan = document.createElement('span');
        var p = findBySeat(playerList, seat);
        if (p) {
          nameSpan.textContent = windNames[seat] + ': ' + p.name;
          nameSpan.style.color = '#e0e0e0';
        } else {
          nameSpan.textContent = windNames[seat] + ': (empty)';
          nameSpan.style.color = '#666';
        }
        row.appendChild(nameSpan);

        if (p) {
          var readyBadge = document.createElement('span');
          readyBadge.textContent = p.ready ? 'Ready' : 'Waiting';
          readyBadge.style.cssText = 'font-size:12px;padding:2px 8px;border-radius:10px;' +
            (p.ready ? 'background:#4caf50;color:#fff;' : 'background:#555;color:#ccc;');
          row.appendChild(readyBadge);
        }

        listContainer.appendChild(row);
      }
    }

    function findBySeat(list, seat) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].seat === seat) return list[i];
      }
      return null;
    }

    renderPlayers(players);

    // Ready button
    var readyBtn = document.createElement('button');
    readyBtn.className = 'btn';
    readyBtn.textContent = 'Ready';
    readyBtn.style.cssText = 'width:100%;padding:10px;cursor:pointer;margin-bottom:8px;' +
      'background:var(--accent, #4caf50);color:#fff;border:none;border-radius:6px;font-size:15px;';
    var isReady = false;
    readyBtn.addEventListener('click', function () {
      isReady = !isReady;
      readyBtn.textContent = isReady ? 'Cancel Ready' : 'Ready';
      readyBtn.style.background = isReady ? '#888' : 'var(--accent, #4caf50)';
      client.sendReady();
      if (opts.onReady) opts.onReady(isReady);
    });
    wrap.appendChild(readyBtn);

    // Start button (host only)
    if (opts.isHost) {
      var startBtn = document.createElement('button');
      startBtn.className = 'btn';
      startBtn.textContent = 'Start Game';
      startBtn.style.cssText = 'width:100%;padding:10px;cursor:pointer;' +
        'background:#ff9800;color:#fff;border:none;border-radius:6px;font-size:15px;';
      startBtn.addEventListener('click', function () {
        client._send({ type: 'start_game' });
        if (opts.onStart) opts.onStart();
      });
      wrap.appendChild(startBtn);
    }

    // Expose update method
    wrap.updatePlayers = renderPlayers;

    return wrap;
  };

  /**
   * Build a small connection status indicator.
   * @param {MultiplayerClient} client
   * @returns {HTMLElement}
   */
  MultiplayerUI.buildConnectionStatus = function (client) {
    var el = document.createElement('div');
    el.className = 'mp-connection-status';
    el.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:12px;' +
      'padding:4px 10px;border-radius:12px;background:rgba(0,0,0,0.3);';

    var dot = document.createElement('span');
    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;display:inline-block;';
    el.appendChild(dot);

    var label = document.createElement('span');
    el.appendChild(label);

    function update() {
      if (client.isConnected()) {
        dot.style.background = '#4caf50';
        label.textContent = 'Connected';
        label.style.color = '#4caf50';
      } else if (client._reconnecting) {
        dot.style.background = '#ff9800';
        label.textContent = 'Reconnecting...';
        label.style.color = '#ff9800';
      } else {
        dot.style.background = '#f44336';
        label.textContent = 'Disconnected';
        label.style.color = '#f44336';
      }
    }

    update();

    // Auto-update on connect/disconnect
    client.onConnect(update);
    client.onDisconnect(update);

    // Poll for reconnecting state changes
    var pollId = setInterval(function () {
      if (!el.parentNode) {
        clearInterval(pollId);
        return;
      }
      update();
    }, 1000);

    return el;
  };

  /**
   * Update a room UI's player list.
   * @param {HTMLElement} roomEl - Element returned by buildRoomUI
   * @param {Array} players
   */
  MultiplayerUI.showInRoom = function (roomEl, players) {
    if (roomEl && typeof roomEl.updatePlayers === 'function') {
      roomEl.updatePlayers(players);
    }
  };

  // ─── DOM helpers ───────────────────────────────────────────────────

  function createInputGroup(labelText, placeholder) {
    var container = document.createElement('div');
    container.style.cssText = 'margin-bottom:12px;';

    var label = document.createElement('label');
    label.textContent = labelText;
    label.style.cssText = 'display:block;font-size:13px;color:#aaa;margin-bottom:4px;';
    container.appendChild(label);

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder || '';
    input.style.cssText = 'width:100%;box-sizing:border-box;padding:8px 12px;' +
      'background:#111;color:#e0e0e0;border:1px solid #444;border-radius:6px;font-size:14px;';
    container.appendChild(input);

    return { container: container, input: input };
  }

  function createSeparator(text) {
    var sep = document.createElement('div');
    sep.style.cssText = 'display:flex;align-items:center;gap:12px;margin:16px 0 12px;';

    var line1 = document.createElement('div');
    line1.style.cssText = 'flex:1;height:1px;background:#333;';
    var label = document.createElement('span');
    label.textContent = text;
    label.style.cssText = 'font-size:12px;color:#888;white-space:nowrap;';
    var line2 = document.createElement('div');
    line2.style.cssText = 'flex:1;height:1px;background:#333;';

    sep.appendChild(line1);
    sep.appendChild(label);
    sep.appendChild(line2);
    return sep;
  }

  // ─── Export ────────────────────────────────────────────────────────

  MJ.Multiplayer = Object.freeze({
    MultiplayerClient: MultiplayerClient,
    MultiplayerUI: MultiplayerUI
  });

  console.log('[Mahjong] Multiplayer module loaded');

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
