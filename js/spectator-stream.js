/**
 * spectator-stream.js — Enhanced spectator mode with streaming support
 * BroadcastChannel for multi-tab spectating, optional WebSocket for remote,
 * expert commentary, and viewer reactions.
 * Exports: root.MJ.SpectatorStream
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const AIE = () => root.MJ.AIEngine;
  const TileRenderer = () => root.MJ.TileRenderer;

  const CHANNEL_PREFIX = 'mj_spectate_';
  const REACTION_DURATION = 2500;
  const MAX_LOG_ENTRIES = 200;

  // ── Commentary patterns ──

  var COMMENTARY_PATTERNS = {
    discard_safe: '{player} discards {tile}. This is suji-safe from {target} who discarded {related_tile} earlier.',
    discard_dangerous: '{player} discards {tile} \u2014 a bold move. This tile is live against {target}\'s hand.',
    discard_neutral: '{player} discards {tile}. A reasonable play at this stage.',
    riichi: '{player} declares riichi with a {wait_type} wait. {remaining} tiles remaining, approximately {outs} winning tiles left.',
    fold: '{player} folds \u2014 smart move given the riichi declaration.',
    chi: '{player} calls chi on {tile}, building toward a sequence-heavy hand.',
    pon: '{player} calls pon on {tile}. Three of a kind locked in.',
    kan: '{player} declares kan on {tile}! Four of a kind \u2014 the stakes just rose.',
    tsumo: '{player} wins by tsumo! Self-drawn victory with {hand_desc}.',
    ron: '{player} wins by ron off {target}\'s {tile}! {hand_desc}.',
    draw: 'Exhaustive draw. No one claims victory this round.',
    efficiency: '{player} is at {shanten}-shanten with {outs} potential improvements.',
    riichi_threat: 'Warning: {player} in riichi. Other players should consider defensive play.',
    tenpai: '{player} appears to be in tenpai. Dangerous tiles to watch for: {dangerous}.'
  };

  var WAIT_TYPE_NAMES = {
    shanpon: 'dual-pon',
    ryanmen: 'two-sided',
    kanchan: 'closed',
    penchan: 'edge',
    tanki: 'single-tile',
    unknown: 'unknown'
  };

  // ── SpectatorStream class ──

  function SpectatorStream() {
    this._broadcasting = false;
    this._spectating = false;
    this._channel = null;
    this._channelId = null;
    this._ws = null;
    this._viewers = new Set();
    this._viewerCount = 0;
    this._log = [];
    this._container = null;
    this._expertMode = false;
    this._reactionOverlay = null;
    this._onStateUpdate = null;
  }

  // ── Broadcasting ──

  SpectatorStream.prototype.startBroadcast = function (channelId) {
    if (this._broadcasting) return;
    this._channelId = channelId || ('game_' + Date.now().toString(36));
    this._broadcasting = true;

    // BroadcastChannel for same-device multi-tab
    if (typeof BroadcastChannel !== 'undefined') {
      this._channel = new BroadcastChannel(CHANNEL_PREFIX + this._channelId);
      var self = this;
      this._channel.onmessage = function (e) {
        var msg = e.data;
        if (msg.type === 'join') {
          self._viewerCount++;
          self._broadcastViewerCount();
        } else if (msg.type === 'leave') {
          self._viewerCount = Math.max(0, self._viewerCount - 1);
          self._broadcastViewerCount();
        } else if (msg.type === 'reaction') {
          self._showReaction(msg.emoji, msg.from);
        }
      };
    }

    this._log = [];
    this._addLog('system', 'Broadcast started on channel: ' + this._channelId);
    return this._channelId;
  };

  SpectatorStream.prototype.broadcastState = function (gameState) {
    if (!this._broadcasting) return;
    var payload = {
      type: 'state_update',
      state: gameState,
      timestamp: Date.now()
    };
    if (this._channel) {
      this._channel.postMessage(payload);
    }
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(payload));
    }
  };

  SpectatorStream.prototype.broadcastAction = function (action, commentary) {
    if (!this._broadcasting) return;
    var payload = {
      type: 'action',
      action: action,
      commentary: commentary || '',
      timestamp: Date.now()
    };
    if (this._channel) {
      this._channel.postMessage(payload);
    }
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(payload));
    }
    this._addLog('action', commentary || JSON.stringify(action));
  };

  SpectatorStream.prototype.stopBroadcast = function () {
    if (!this._broadcasting) return;
    this._broadcasting = false;
    if (this._channel) {
      this._channel.postMessage({ type: 'broadcast_end' });
      this._channel.close();
      this._channel = null;
    }
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._addLog('system', 'Broadcast ended.');
  };

  SpectatorStream.prototype._broadcastViewerCount = function () {
    if (this._channel) {
      this._channel.postMessage({ type: 'viewer_count', count: this._viewerCount });
    }
  };

  // ── Spectating (joining) ──

  SpectatorStream.prototype.joinBroadcast = function (channelId, wsUrl) {
    if (this._spectating) this.leaveBroadcast();
    this._channelId = channelId;
    this._spectating = true;
    this._log = [];
    var self = this;

    // BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      this._channel = new BroadcastChannel(CHANNEL_PREFIX + channelId);
      this._channel.onmessage = function (e) {
        var msg = e.data;
        if (msg.type === 'state_update' && self._onStateUpdate) {
          self._onStateUpdate(msg.state);
          self._updateSpectatorView(msg.state);
        } else if (msg.type === 'action') {
          self._addLog('action', msg.commentary || JSON.stringify(msg.action));
          self._updateLogUI();
        } else if (msg.type === 'viewer_count') {
          self._viewerCount = msg.count;
          self._updateViewerCountUI();
        } else if (msg.type === 'reaction') {
          self._showReaction(msg.emoji, msg.from);
        } else if (msg.type === 'broadcast_end') {
          self._addLog('system', 'Broadcast has ended.');
          self._updateLogUI();
        }
      };
      // Announce join
      this._channel.postMessage({ type: 'join' });
    }

    // Optional WebSocket for remote spectating
    if (wsUrl) {
      try {
        this._ws = new WebSocket(wsUrl);
        this._ws.onmessage = function (e) {
          try {
            var msg = JSON.parse(e.data);
            if (msg.type === 'state_update' && self._onStateUpdate) {
              self._onStateUpdate(msg.state);
              self._updateSpectatorView(msg.state);
            } else if (msg.type === 'action') {
              self._addLog('action', msg.commentary || '');
              self._updateLogUI();
            }
          } catch (err) {
            // Malformed message
          }
        };
        this._ws.onopen = function () {
          self._ws.send(JSON.stringify({ type: 'join', channel: channelId }));
        };
      } catch (e) {
        console.warn('SpectatorStream: WebSocket connection failed', e);
      }
    }

    this._addLog('system', 'Joined broadcast: ' + channelId);
  };

  SpectatorStream.prototype.leaveBroadcast = function () {
    if (!this._spectating) return;
    if (this._channel) {
      this._channel.postMessage({ type: 'leave' });
      this._channel.close();
      this._channel = null;
    }
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._spectating = false;
    this._addLog('system', 'Left broadcast.');
  };

  SpectatorStream.prototype.onStateUpdate = function (callback) {
    this._onStateUpdate = callback;
  };

  // ── Spectator UI ──

  SpectatorStream.prototype.buildSpectatorUI = function (parentEl) {
    var self = this;
    this._container = parentEl || document.createElement('div');
    this._container.className = 'spectator-stream-ui';

    var html = '<div class="ss-layout">';

    // Header
    html += '<div class="ss-header">';
    html += '<h2>Spectator Mode</h2>';
    html += '<span class="ss-viewer-count" id="ss-viewer-count">Viewers: 0</span>';
    html += '<label class="ss-expert-toggle">';
    html += '<input type="checkbox" id="ss-expert-mode"> Expert Mode';
    html += '</label>';
    html += '<button class="ss-btn" data-action="leave">Leave</button>';
    html += '</div>';

    // Main game area — all 4 hands visible
    html += '<div class="ss-game-area">';
    html += '<div class="ss-hand ss-hand-north" id="ss-hand-north"><h4>North</h4><div class="ss-tiles"></div></div>';
    html += '<div class="ss-center-row">';
    html += '<div class="ss-hand ss-hand-west" id="ss-hand-west"><h4>West</h4><div class="ss-tiles"></div></div>';
    html += '<div class="ss-table-center" id="ss-table-center"><div class="ss-discards"></div></div>';
    html += '<div class="ss-hand ss-hand-east" id="ss-hand-east"><h4>East</h4><div class="ss-tiles"></div></div>';
    html += '</div>';
    html += '<div class="ss-hand ss-hand-south" id="ss-hand-south"><h4>South</h4><div class="ss-tiles"></div></div>';
    html += '</div>';

    // Sidebar: stats + expert info
    html += '<div class="ss-sidebar" id="ss-sidebar">';
    html += '<h3>Player Stats</h3>';
    html += '<div id="ss-stats"></div>';
    html += '<div id="ss-expert-panel" class="ss-expert-panel ss-hidden">';
    html += '<h3>Tile Efficiency</h3>';
    html += '<div id="ss-efficiency"></div>';
    html += '</div>';
    html += '</div>';

    // Commentary panel
    html += '<div class="ss-commentary" id="ss-commentary">';
    html += '<h3>Commentary</h3>';
    html += '<div class="ss-log" id="ss-log"></div>';
    html += '</div>';

    // Reaction overlay
    html += '<div class="ss-reaction-overlay" id="ss-reaction-overlay"></div>';

    // Reaction bar
    html += '<div class="ss-reaction-bar">';
    var reactions = ['\ud83d\udc4f', '\ud83d\ude32', '\ud83d\ude02', '\ud83d\udd25', '\ud83d\udca1', '\ud83d\ude31'];
    reactions.forEach(function (emoji) {
      html += '<button class="ss-reaction-btn" data-reaction="' + emoji + '">' + emoji + '</button>';
    });
    html += '</div>';

    html += '</div>';
    this._container.innerHTML = html;

    this._reactionOverlay = this._container.querySelector('#ss-reaction-overlay');

    // Bind events
    this._container.addEventListener('click', function (e) {
      var actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        var action = actionEl.getAttribute('data-action');
        if (action === 'leave') {
          self.leaveBroadcast();
          self._container.innerHTML = '<p>Disconnected from broadcast.</p>';
        }
      }
      var reactionBtn = e.target.closest('[data-reaction]');
      if (reactionBtn) {
        self.sendReaction(reactionBtn.getAttribute('data-reaction'));
      }
    });

    var expertToggle = this._container.querySelector('#ss-expert-mode');
    if (expertToggle) {
      expertToggle.addEventListener('change', function () {
        self._expertMode = expertToggle.checked;
        var panel = self._container.querySelector('#ss-expert-panel');
        if (panel) panel.classList.toggle('ss-hidden', !self._expertMode);
      });
    }

    this._updateLogUI();
    return this._container;
  };

  SpectatorStream.prototype._updateSpectatorView = function (state) {
    if (!this._container || !state) return;
    var renderer = TileRenderer();
    var winds = ['east', 'south', 'west', 'north'];

    winds.forEach(function (wind) {
      var handEl = this._container.querySelector('#ss-hand-' + wind + ' .ss-tiles');
      if (!handEl) return;
      var player = state.players ? state.players.find(function (p) {
        return (p.wind || p.seat || '').toLowerCase() === wind;
      }) : null;
      if (!player || !player.hand) {
        handEl.innerHTML = '<em>No data</em>';
        return;
      }
      var tilesHtml = '';
      player.hand.forEach(function (tile) {
        if (renderer && renderer.renderTileSVG) {
          var svg = renderer.renderTileSVG(tile, { width: 30, height: 40 });
          tilesHtml += typeof svg === 'string' ? svg : '<span>' + (tile.suit || '') + tile.rank + '</span>';
        } else {
          tilesHtml += '<span class="ss-tile-text">' + (tile.suit || '')[0] + tile.rank + '</span>';
        }
      });
      handEl.innerHTML = tilesHtml;
    }.bind(this));

    // Update stats
    this._updateStatsUI(state);

    // Update expert panel
    if (this._expertMode) {
      this._updateEfficiencyUI(state);
    }
  };

  SpectatorStream.prototype._updateStatsUI = function (state) {
    var statsEl = this._container ? this._container.querySelector('#ss-stats') : null;
    if (!statsEl || !state || !state.players) return;
    var html = '';
    state.players.forEach(function (p) {
      var name = p.name || p.wind || 'Player';
      var score = p.score != null ? p.score : '?';
      var wind = p.wind || p.seat || '';
      html += '<div class="ss-stat-row">';
      html += '<strong>' + name + '</strong> (' + wind + ')';
      html += '<span>' + score + ' pts</span>';
      html += '</div>';
    });
    statsEl.innerHTML = html;
  };

  SpectatorStream.prototype._updateEfficiencyUI = function (state) {
    var effEl = this._container ? this._container.querySelector('#ss-efficiency') : null;
    if (!effEl || !state) return;
    var aie = AIE();
    if (!aie || !state.currentPlayer) {
      effEl.innerHTML = '<em>No data</em>';
      return;
    }

    var player = state.players ? state.players.find(function (p) {
      return p.wind === state.currentPlayer || p.seat === state.currentPlayer;
    }) : null;
    if (!player || !player.hand) return;

    var html = '<div class="ss-eff-header">Current: ' + (player.name || player.wind) + '</div>';
    if (aie.calculateShanten) {
      try {
        var shanten = aie.calculateShanten(player.hand);
        html += '<div>Shanten: ' + shanten + '</div>';
      } catch (e) {
        // Ignore calculation errors
      }
    }
    if (aie.evaluateDiscards) {
      try {
        var evals = aie.evaluateDiscards(player.hand);
        if (evals && evals.length > 0) {
          evals.sort(function (a, b) { return b.score - a.score; });
          html += '<div class="ss-eff-list">';
          evals.slice(0, 5).forEach(function (ev) {
            var code = (ev.tile.suit || '')[0] + ev.tile.rank;
            html += '<div>' + code + ': ' + ev.score.toFixed(1) + '</div>';
          });
          html += '</div>';
        }
      } catch (e) {
        // Ignore
      }
    }
    effEl.innerHTML = html;
  };

  SpectatorStream.prototype._updateViewerCountUI = function () {
    if (!this._container) return;
    var el = this._container.querySelector('#ss-viewer-count');
    if (el) el.textContent = 'Viewers: ' + this._viewerCount;
  };

  // ── Play-by-play log ──

  SpectatorStream.prototype._addLog = function (type, text) {
    this._log.push({
      type: type,
      text: text,
      timestamp: Date.now()
    });
    if (this._log.length > MAX_LOG_ENTRIES) {
      this._log.shift();
    }
  };

  SpectatorStream.prototype._updateLogUI = function () {
    if (!this._container) return;
    var logEl = this._container.querySelector('#ss-log');
    if (!logEl) return;
    var html = '';
    this._log.forEach(function (entry) {
      var time = new Date(entry.timestamp);
      var ts = time.getHours().toString().padStart(2, '0') + ':' +
               time.getMinutes().toString().padStart(2, '0') + ':' +
               time.getSeconds().toString().padStart(2, '0');
      var cls = entry.type === 'system' ? 'ss-log-system' : 'ss-log-action';
      html += '<div class="' + cls + '"><span class="ss-log-time">' + ts + '</span> ' + entry.text + '</div>';
    });
    logEl.innerHTML = html;
    logEl.scrollTop = logEl.scrollHeight;
  };

  // ── Expert commentary generation ──

  SpectatorStream.prototype.generateExpertCommentary = function (action, state) {
    if (!action || !action.type) return '';

    var vars = {
      player: action.player || action.seat || 'Unknown',
      tile: action.tile ? ((action.tile.suit || '')[0] + '-' + action.tile.rank) : '?',
      target: action.target || 'opponent',
      related_tile: '',
      remaining: '?',
      outs: '?',
      wait_type: 'unknown',
      hand_desc: '',
      shanten: '?',
      dangerous: ''
    };

    // Enrich with AI analysis
    var aie = AIE();
    if (aie && state) {
      // Count remaining tiles
      if (state.wallCount != null) {
        vars.remaining = String(state.wallCount);
      }
    }

    var pattern = '';

    switch (action.type) {
      case 'discard':
        // Check if the tile is safe via suji
        if (state && state.discards) {
          var isSafe = this._checkSujiSafe(action.tile, state.discards, action.target);
          if (isSafe.safe) {
            vars.related_tile = (isSafe.relatedTile.suit || '')[0] + '-' + isSafe.relatedTile.rank;
            vars.target = isSafe.target || 'an opponent';
            pattern = COMMENTARY_PATTERNS.discard_safe;
          } else if (this._isDangerous(action.tile, state)) {
            pattern = COMMENTARY_PATTERNS.discard_dangerous;
          } else {
            pattern = COMMENTARY_PATTERNS.discard_neutral;
          }
        } else {
          pattern = COMMENTARY_PATTERNS.discard_neutral;
        }
        break;

      case 'riichi':
        vars.wait_type = action.waitType ? (WAIT_TYPE_NAMES[action.waitType] || action.waitType) : 'unknown';
        if (action.outs != null) vars.outs = String(action.outs);
        pattern = COMMENTARY_PATTERNS.riichi;
        break;

      case 'chi':
        pattern = COMMENTARY_PATTERNS.chi;
        break;

      case 'pon':
        pattern = COMMENTARY_PATTERNS.pon;
        break;

      case 'kan':
        pattern = COMMENTARY_PATTERNS.kan;
        break;

      case 'tsumo':
        vars.hand_desc = action.handDesc || action.yaku || 'a complete hand';
        pattern = COMMENTARY_PATTERNS.tsumo;
        break;

      case 'ron':
        vars.hand_desc = action.handDesc || action.yaku || 'a complete hand';
        pattern = COMMENTARY_PATTERNS.ron;
        break;

      case 'draw':
        pattern = COMMENTARY_PATTERNS.draw;
        break;

      case 'fold':
        pattern = COMMENTARY_PATTERNS.fold;
        break;

      default:
        return vars.player + ' performs: ' + action.type;
    }

    // Fill template
    var result = pattern;
    Object.keys(vars).forEach(function (key) {
      var ph = '{' + key + '}';
      while (result.indexOf(ph) !== -1) {
        result = result.replace(ph, vars[key]);
      }
    });

    return result;
  };

  SpectatorStream.prototype._checkSujiSafe = function (tile, discards, target) {
    // Suji: if 4 is discarded, 1 and 7 of same suit are suji-safe
    // If 5 is discarded, 2 and 8 are safe, etc.
    if (!tile || !tile.suit || !tile.rank) return { safe: false };
    var suit = tile.suit;
    var rank = tile.rank;
    if (suit === 'wind' || suit === 'dragon') return { safe: false };

    var sujiPairs = { 1: [4], 2: [5], 3: [6], 4: [1, 7], 5: [2, 8], 6: [3, 9], 7: [4], 8: [5], 9: [6] };
    var needed = sujiPairs[rank] || [];

    var allDiscards = [];
    if (Array.isArray(discards)) {
      allDiscards = discards;
    } else if (typeof discards === 'object') {
      Object.keys(discards).forEach(function (seat) {
        if (Array.isArray(discards[seat])) {
          discards[seat].forEach(function (t) {
            allDiscards.push({ tile: t, seat: seat });
          });
        }
      });
    }

    for (var i = 0; i < allDiscards.length; i++) {
      var d = allDiscards[i].tile || allDiscards[i];
      var dSeat = allDiscards[i].seat || target;
      if (d.suit === suit && needed.indexOf(d.rank) >= 0) {
        return { safe: true, relatedTile: d, target: dSeat };
      }
    }
    return { safe: false };
  };

  SpectatorStream.prototype._isDangerous = function (tile, state) {
    // Simple heuristic: middle tiles (3-7) in suited are more dangerous
    if (!tile || !tile.rank) return false;
    if (tile.suit === 'wind' || tile.suit === 'dragon') return false;
    return tile.rank >= 3 && tile.rank <= 7;
  };

  // ── Viewer count ──

  SpectatorStream.prototype.getViewerCount = function () {
    return this._viewerCount;
  };

  // ── Reactions ──

  SpectatorStream.prototype.sendReaction = function (emoji) {
    if (!emoji) return;
    var payload = { type: 'reaction', emoji: emoji, from: 'spectator', timestamp: Date.now() };
    if (this._channel) {
      this._channel.postMessage(payload);
    }
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(payload));
    }
    // Show locally too
    this._showReaction(emoji, 'you');
  };

  SpectatorStream.prototype.buildReactionOverlay = function (parentEl) {
    var overlay = document.createElement('div');
    overlay.className = 'ss-reaction-overlay';
    overlay.id = 'ss-reaction-overlay';
    if (parentEl) parentEl.appendChild(overlay);
    this._reactionOverlay = overlay;
    return overlay;
  };

  SpectatorStream.prototype._showReaction = function (emoji, from) {
    var overlay = this._reactionOverlay;
    if (!overlay) return;

    var el = document.createElement('div');
    el.className = 'ss-floating-reaction';
    el.textContent = emoji;
    // Random horizontal position
    el.style.left = (10 + Math.random() * 80) + '%';
    el.style.animationDuration = (REACTION_DURATION + Math.random() * 500) + 'ms';
    overlay.appendChild(el);

    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, REACTION_DURATION + 600);
  };

  // ── Export ──
  root.MJ.SpectatorStream = new SpectatorStream();

})(typeof window !== 'undefined' ? window : this);
