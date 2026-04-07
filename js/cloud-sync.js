/**
 * Mahjong Living Simulation - Cloud Sync Client
 * Browser client for cloud save/load, leaderboards, and replays.
 */
(function (root) {
  'use strict';

  var MJ = root.MJ = root.MJ || {};

  // -------------------------------------------------------------------------
  // CloudSync class
  // -------------------------------------------------------------------------

  function CloudSync() {
    this.serverUrl = localStorage.getItem('mj_server_url') || 'http://localhost:3000';
    this.token = localStorage.getItem('mj_cloud_token') || null;
    this.userId = localStorage.getItem('mj_cloud_userId') || null;
    this.syncCode = localStorage.getItem('mj_cloud_code') || null;
    this.online = navigator.onLine;
    this.actionQueue = [];
    this._panel = null;

    this._loadQueue();
    this._bindNetworkEvents();
  }

  // -------------------------------------------------------------------------
  // Server URL
  // -------------------------------------------------------------------------

  CloudSync.prototype.setServerUrl = function (url) {
    this.serverUrl = url.replace(/\/+$/, '');
    localStorage.setItem('mj_server_url', this.serverUrl);
  };

  // -------------------------------------------------------------------------
  // Internal fetch helper
  // -------------------------------------------------------------------------

  CloudSync.prototype._request = function (method, path, body) {
    var self = this;
    var url = this.serverUrl + path;
    var headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = 'Bearer ' + this.token;
    }
    var opts = { method: method, headers: headers };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (resp) {
      if (!resp.ok) {
        return resp.json().then(function (data) {
          var err = new Error(data.error || 'Request failed');
          err.status = resp.status;
          throw err;
        });
      }
      return resp.json();
    }).catch(function (err) {
      if (!navigator.onLine) {
        self.online = false;
      }
      throw err;
    });
  };

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  /**
   * Register a new account. Returns the 6-digit sync code.
   */
  CloudSync.prototype.register = function () {
    var self = this;
    return this._request('POST', '/api/auth/code').then(function (data) {
      self.syncCode = data.code;
      self.userId = data.userId;
      self.token = data.token;
      localStorage.setItem('mj_cloud_code', data.code);
      localStorage.setItem('mj_cloud_userId', data.userId);
      localStorage.setItem('mj_cloud_token', data.token);
      return data.code;
    });
  };

  /**
   * Login with an existing 6-digit sync code.
   */
  CloudSync.prototype.login = function (code) {
    var self = this;
    return this._request('POST', '/api/auth/login', { code: code }).then(function (data) {
      self.userId = data.userId;
      self.token = data.token;
      self.syncCode = code;
      localStorage.setItem('mj_cloud_code', code);
      localStorage.setItem('mj_cloud_userId', data.userId);
      localStorage.setItem('mj_cloud_token', data.token);
      return data;
    });
  };

  /**
   * Check if the user is authenticated.
   */
  CloudSync.prototype.isAuthenticated = function () {
    return !!(this.token && this.userId);
  };

  // -------------------------------------------------------------------------
  // Save / Load
  // -------------------------------------------------------------------------

  /**
   * Collect all mj_* localStorage keys and upload to server.
   */
  CloudSync.prototype.uploadSave = function () {
    var self = this;
    if (!this.isAuthenticated()) {
      return Promise.reject(new Error('Not authenticated'));
    }

    var saveData = {};
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('mj_') === 0 && key !== 'mj_cloud_token' && key !== 'mj_cloud_userId' && key !== 'mj_cloud_code' && key !== 'mj_server_url') {
        try {
          saveData[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          saveData[key] = localStorage.getItem(key);
        }
      }
    }

    if (!this.online) {
      this._enqueue({ action: 'uploadSave', data: saveData });
      return Promise.resolve({ queued: true });
    }

    return this._request('POST', '/api/save', { data: saveData }).then(function (resp) {
      self._setStatus('Save uploaded successfully');
      return resp;
    });
  };

  /**
   * Download save from server and restore to localStorage.
   */
  CloudSync.prototype.downloadSave = function () {
    var self = this;
    if (!this.isAuthenticated()) {
      return Promise.reject(new Error('Not authenticated'));
    }
    return this._request('GET', '/api/save').then(function (resp) {
      var data = resp.data;
      if (data && typeof data === 'object') {
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var value = data[key];
          if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
          } else {
            localStorage.setItem(key, String(value));
          }
        }
      }
      self._setStatus('Save downloaded and restored');
      return resp;
    });
  };

  // -------------------------------------------------------------------------
  // Leaderboard
  // -------------------------------------------------------------------------

  /**
   * Submit a score to the leaderboard.
   */
  CloudSync.prototype.submitScore = function (score, handType) {
    var playerName = localStorage.getItem('mj_player_name') || 'Anonymous';
    var body = { score: score, handType: handType || '', playerName: playerName };

    if (!this.online) {
      this._enqueue({ action: 'submitScore', data: body });
      return Promise.resolve({ queued: true });
    }

    return this._request('POST', '/api/leaderboard', body);
  };

  /**
   * Get leaderboard entries for a time period.
   * @param {string} period - 'weekly', 'monthly', or 'alltime'
   */
  CloudSync.prototype.getLeaderboard = function (period) {
    period = period || 'alltime';
    return this._request('GET', '/api/leaderboard/' + encodeURIComponent(period));
  };

  // -------------------------------------------------------------------------
  // Replays
  // -------------------------------------------------------------------------

  /**
   * Upload a replay to the server.
   */
  CloudSync.prototype.uploadReplay = function (replay, title) {
    var body = { title: title || 'Untitled Replay', data: replay };

    if (!this.online) {
      this._enqueue({ action: 'uploadReplay', data: body });
      return Promise.resolve({ queued: true });
    }

    return this._request('POST', '/api/replay', body);
  };

  /**
   * List shared replays from the server.
   */
  CloudSync.prototype.getSharedReplays = function () {
    return this._request('GET', '/api/replays');
  };

  // -------------------------------------------------------------------------
  // Offline queue
  // -------------------------------------------------------------------------

  CloudSync.prototype._enqueue = function (entry) {
    this.actionQueue.push(entry);
    this._saveQueue();
  };

  CloudSync.prototype._saveQueue = function () {
    try {
      localStorage.setItem('mj_cloud_queue', JSON.stringify(this.actionQueue));
    } catch (e) {
      // storage full, drop oldest entries
      this.actionQueue = this.actionQueue.slice(-10);
      try {
        localStorage.setItem('mj_cloud_queue', JSON.stringify(this.actionQueue));
      } catch (e2) {
        // ignore
      }
    }
  };

  CloudSync.prototype._loadQueue = function () {
    try {
      var raw = localStorage.getItem('mj_cloud_queue');
      if (raw) {
        this.actionQueue = JSON.parse(raw);
      }
    } catch (e) {
      this.actionQueue = [];
    }
  };

  CloudSync.prototype._flushQueue = function () {
    var self = this;
    if (!this.online || this.actionQueue.length === 0) {
      return;
    }
    var queue = this.actionQueue.slice();
    this.actionQueue = [];
    this._saveQueue();

    queue.forEach(function (entry) {
      switch (entry.action) {
        case 'uploadSave':
          self._request('POST', '/api/save', { data: entry.data }).catch(function () {});
          break;
        case 'submitScore':
          self._request('POST', '/api/leaderboard', entry.data).catch(function () {});
          break;
        case 'uploadReplay':
          self._request('POST', '/api/replay', entry.data).catch(function () {});
          break;
      }
    });
  };

  // -------------------------------------------------------------------------
  // Network events
  // -------------------------------------------------------------------------

  CloudSync.prototype._bindNetworkEvents = function () {
    var self = this;
    window.addEventListener('online', function () {
      self.online = true;
      self._setStatus('Back online');
      self._flushQueue();
    });
    window.addEventListener('offline', function () {
      self.online = false;
      self._setStatus('Offline - actions will be queued');
    });
  };

  // -------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------

  CloudSync.prototype._setStatus = function (msg) {
    if (this._statusEl) {
      this._statusEl.textContent = msg;
    }
  };

  /**
   * Build the sync UI panel and append it to the given container (or document.body).
   */
  CloudSync.prototype.buildSyncUI = function (container) {
    var self = this;
    container = container || document.body;

    var panel = document.createElement('div');
    panel.className = 'cloud-sync-panel';
    panel.style.cssText = 'padding:12px;background:#1a1a2e;border-radius:8px;color:#e0e0e0;font-family:sans-serif;font-size:14px;max-width:340px;';

    var title = document.createElement('h3');
    title.textContent = 'Cloud Sync';
    title.style.cssText = 'margin:0 0 10px;color:#ffd700;';
    panel.appendChild(title);

    // Status
    var statusEl = document.createElement('div');
    statusEl.style.cssText = 'margin-bottom:8px;font-size:12px;color:#aaa;min-height:16px;';
    statusEl.textContent = this.online ? 'Online' : 'Offline';
    panel.appendChild(statusEl);
    this._statusEl = statusEl;

    // Sync code display
    if (this.syncCode) {
      var codeDisplay = document.createElement('div');
      codeDisplay.style.cssText = 'margin-bottom:8px;';
      codeDisplay.innerHTML = 'Your sync code: <strong style="color:#ffd700;font-size:18px;letter-spacing:2px;">' + this.syncCode + '</strong>';
      panel.appendChild(codeDisplay);
    }

    // Register button (if not authenticated)
    if (!this.isAuthenticated()) {
      var regBtn = document.createElement('button');
      regBtn.textContent = 'Get Sync Code';
      regBtn.style.cssText = 'display:block;width:100%;padding:8px;margin-bottom:6px;background:#4a6fa5;color:#fff;border:none;border-radius:4px;cursor:pointer;';
      regBtn.addEventListener('click', function () {
        self.register().then(function (code) {
          self._setStatus('Your sync code: ' + code);
          self.buildSyncUI(container);
        }).catch(function (err) {
          self._setStatus('Error: ' + err.message);
        });
      });
      panel.appendChild(regBtn);
    }

    // Login input
    var loginRow = document.createElement('div');
    loginRow.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;';
    var loginInput = document.createElement('input');
    loginInput.type = 'text';
    loginInput.maxLength = 6;
    loginInput.placeholder = 'Enter 6-digit code';
    loginInput.style.cssText = 'flex:1;padding:6px;border:1px solid #444;border-radius:4px;background:#222;color:#fff;';
    var loginBtn = document.createElement('button');
    loginBtn.textContent = 'Login';
    loginBtn.style.cssText = 'padding:6px 12px;background:#4a6fa5;color:#fff;border:none;border-radius:4px;cursor:pointer;';
    loginBtn.addEventListener('click', function () {
      var code = loginInput.value.trim();
      if (code.length !== 6) {
        self._setStatus('Enter a 6-digit code');
        return;
      }
      self.login(code).then(function () {
        self._setStatus('Logged in successfully');
        self.buildSyncUI(container);
      }).catch(function (err) {
        self._setStatus('Login failed: ' + err.message);
      });
    });
    loginRow.appendChild(loginInput);
    loginRow.appendChild(loginBtn);
    panel.appendChild(loginRow);

    // Upload / Download buttons
    if (this.isAuthenticated()) {
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;';

      var uploadBtn = document.createElement('button');
      uploadBtn.textContent = 'Upload Save';
      uploadBtn.style.cssText = 'flex:1;padding:8px;background:#2d6a4f;color:#fff;border:none;border-radius:4px;cursor:pointer;';
      uploadBtn.addEventListener('click', function () {
        self.uploadSave().then(function (r) {
          self._setStatus(r.queued ? 'Save queued (offline)' : 'Save uploaded');
        }).catch(function (err) {
          self._setStatus('Upload failed: ' + err.message);
        });
      });

      var downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Download Save';
      downloadBtn.style.cssText = 'flex:1;padding:8px;background:#6a4c2d;color:#fff;border:none;border-radius:4px;cursor:pointer;';
      downloadBtn.addEventListener('click', function () {
        self.downloadSave().then(function () {
          self._setStatus('Save restored. Reload to apply.');
        }).catch(function (err) {
          self._setStatus('Download failed: ' + err.message);
        });
      });

      btnRow.appendChild(uploadBtn);
      btnRow.appendChild(downloadBtn);
      panel.appendChild(btnRow);
    }

    // Replace existing panel
    if (this._panel && this._panel.parentNode) {
      this._panel.parentNode.removeChild(this._panel);
    }
    this._panel = panel;
    container.appendChild(panel);

    return panel;
  };

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  MJ.CloudSync = CloudSync;

})(typeof window !== 'undefined' ? window : this);
