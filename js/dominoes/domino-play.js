/**
 * domino-play.js - Playable Dominoes game with full UI
 * Full-screen overlay, SVG domino rendering, AI opponents with dialogue.
 * Exports as root.MJ.Dominoes.Play
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Dominoes = root.MJ.Dominoes || {};

  var Engine   = function() { return root.MJ.Dominoes.Engine; };
  var AI       = function() { return root.MJ.Dominoes.AI; };
  var Tiles    = function() { return root.MJ.Dominoes.Tiles; };
  var Learning = function() { return root.MJ.Dominoes.Learning; };
  var TutorBridge = function() { return root.MJ.GameTutorBridge; };
  var DomHints = function() { return root.MJ.Dominoes.Hints; };

  // Pip dot positions for values 0-6 on a 24x24 area (cx, cy)
  var PIP_POSITIONS = {
    0: [],
    1: [[12, 12]],
    2: [[6, 6], [18, 18]],
    3: [[6, 6], [12, 12], [18, 18]],
    4: [[6, 6], [18, 6], [6, 18], [18, 18]],
    5: [[6, 6], [18, 6], [12, 12], [6, 18], [18, 18]],
    6: [[6, 5], [18, 5], [6, 12], [18, 12], [6, 19], [18, 19]]
  };

  var DOMINO_DIALOGUE = {
    mei: {
      play: ['Calculated.', 'This leaves me options.', 'Optimal placement.', 'As expected.', 'Precisely placed.'],
      pass: ['No moves... interesting.', 'I\'ll wait for my moment.', 'Patience is strategy.'],
      win: ['The numbers don\'t lie.', 'Efficiency wins.', 'As my analysis predicted.'],
      blocked: ['A draw by deadlock. Fascinating.', 'Stalemate. How unusual.']
    },
    kenji: {
      play: ['BOOM!', 'Take that!', 'Domino!', 'Ha! Read it and weep!', 'Too easy!'],
      pass: ['Ugh, nothing?!', 'Come ON!', 'This is rigged!'],
      win: ['CRUSHED IT!', 'Who\'s next?!', 'UNSTOPPABLE!'],
      blocked: ['Nobody wins? LAME.', 'A tie? No way!']
    },
    yuki: {
      play: ['The chain grows.', 'Each tile finds its place.', 'A natural connection.', 'Flow, like water.'],
      pass: ['Patience.', 'The tiles will align.', 'Sometimes we wait.'],
      win: ['The chain is complete.', 'Every ending is a beginning.', 'Harmony achieved.'],
      blocked: ['Sometimes the path closes. That too is beautiful.', 'A gentle impasse.']
    }
  };

  var PLAYER_NAMES = ['You', 'Kenji', 'Mei', 'Yuki'];
  var AI_KEYS = [null, 'kenji', 'mei', 'yuki'];
  var PLAYER_AVATARS = ['🙂', '👨', '👩', '👵'];

  // -----------------------------------------------------------------------
  // DominoGameManager
  // -----------------------------------------------------------------------

  function DominoGameManager() {
    this.engine = null;
    this.overlay = null;
    this.running = false;
    this.sharedSystems = null;
    this.roundCount = 0;
    this.selectedTile = null;
    this._aiTimer = null;
    this._messageTimer = null;
    this._sessionStats = { roundsPlayed: 0, roundsWon: 0, roundsLost: 0, timesBlocked: 0 };
  }

  DominoGameManager.prototype.init = function(sharedSystems) {
    this.sharedSystems = sharedSystems || {};

    // Initialize tutor bridge for LLM-powered tutoring and dialogue
    var TB = TutorBridge();
    if (TB && TB.GameTutorBridge && sharedSystems.ollamaClient) {
      this._tutorBridge = new TB.GameTutorBridge(sharedSystems.ollamaClient);
    }
  };

  DominoGameManager.prototype.playSound = function(name) {
    try {
      if (this.sharedSystems && this.sharedSystems.sound) {
        this.sharedSystems.sound.play(name);
      }
    } catch (e) { /* sound not critical */ }
  };

  DominoGameManager.prototype.start = function() {
    if (this.running) return;
    this.running = true;
    this.roundCount = 0;
    this._buildOverlay();
    this._startRound();
  };

  DominoGameManager.prototype.stop = function() {
    this.running = false;
    if (this._aiTimer) { clearTimeout(this._aiTimer); this._aiTimer = null; }
    if (this._messageTimer) { clearTimeout(this._messageTimer); this._messageTimer = null; }
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
  };

  // -----------------------------------------------------------------------
  // Overlay construction
  // -----------------------------------------------------------------------

  DominoGameManager.prototype._buildOverlay = function() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'dominoes-overlay';
    this.overlay.style.cssText =
      'position:fixed;inset:0;z-index:10000;' +
      'background:radial-gradient(ellipse at center,#1a4a2e 0%,#0f3520 50%,#081a10 100%);' +
      'display:flex;flex-direction:column;font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;' +
      'color:#e0e0e0;overflow:hidden;';

    this.overlay.innerHTML =
      '<div id="dom-top-bar" style="display:flex;justify-content:space-between;align-items:center;padding:8px 16px;background:rgba(0,0,0,0.3);">' +
        '<button id="dom-back-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 14px;color:#e0e0e0;cursor:pointer;font-size:13px;">← Back</button>' +
        '<div style="font-size:18px;font-weight:bold;color:#e8b830;">Block Dominoes</div>' +
        '<div id="dom-round-info" style="font-size:13px;color:#a8c4b0;"></div>' +
      '</div>' +
      '<div id="dom-opponents" style="display:flex;justify-content:center;gap:24px;padding:8px 16px;min-height:80px;"></div>' +
      '<div id="dom-message" style="text-align:center;min-height:28px;font-size:14px;color:#e8b830;padding:4px;"></div>' +
      '<div id="dom-chain-area" style="flex:1;display:flex;align-items:center;justify-content:center;overflow-x:auto;overflow-y:hidden;padding:8px 16px;">' +
        '<div id="dom-chain" style="display:flex;align-items:center;gap:2px;white-space:nowrap;"></div>' +
      '</div>' +
      '<div id="dom-end-choice" style="display:none;text-align:center;padding:8px;">' +
        '<span style="margin-right:8px;color:#ccc;">Play on which end?</span>' +
        '<button id="dom-left-btn" style="background:#2d6a4f;border:1px solid #52b788;border-radius:6px;padding:6px 18px;color:#fff;cursor:pointer;margin:0 4px;font-size:14px;">← Left</button>' +
        '<button id="dom-right-btn" style="background:#2d6a4f;border:1px solid #52b788;border-radius:6px;padding:6px 18px;color:#fff;cursor:pointer;margin:0 4px;font-size:14px;">Right →</button>' +
      '</div>' +
      '<div id="dom-player-area" style="padding:12px 16px 16px;background:rgba(0,0,0,0.2);border-top:1px solid rgba(255,255,255,0.1);">' +
        '<div style="text-align:center;margin-bottom:6px;font-size:12px;color:#a8c4b0;">Your tiles</div>' +
        '<div id="dom-hand" style="display:flex;justify-content:center;gap:4px;flex-wrap:wrap;"></div>' +
        '<div id="dom-pass-area" style="text-align:center;margin-top:8px;"></div>' +
      '</div>' +
      '<div id="dom-sidebar" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.4);border-radius:10px;padding:10px;width:120px;font-size:11px;">' +
        '<div style="font-weight:bold;color:#e8b830;margin-bottom:6px;text-align:center;">Scores</div>' +
        '<div id="dom-scores"></div>' +
      '</div>';

    // Chat panel for character dialogue
    var chatPanel = document.createElement('div');
    chatPanel.id = 'dom-chat';
    chatPanel.style.cssText = 'position:fixed;bottom:36px;left:0;width:240px;max-height:160px;' +
      'background:rgba(0,0,0,0.8);border-right:1px solid rgba(255,255,255,0.1);' +
      'border-top:1px solid rgba(255,255,255,0.1);z-index:10001;overflow-y:auto;padding:6px 8px;' +
      'font-size:12px;border-top-right-radius:8px;';
    this.overlay.appendChild(chatPanel);

    // Tutor chat input area
    var tutorArea = document.createElement('div');
    tutorArea.id = 'dom-tutor-input';
    tutorArea.style.cssText = 'position:fixed;bottom:0;left:0;width:240px;z-index:10002;' +
      'background:rgba(0,0,0,0.9);border-right:1px solid rgba(255,255,255,0.1);' +
      'padding:6px 8px;display:flex;gap:4px;';
    tutorArea.innerHTML =
      '<input id="dom-ask-input" type="text" placeholder="Ask the tutor..." ' +
      'style="flex:1;padding:5px 8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);' +
      'border-radius:4px;color:#e0e0e0;font-size:12px;outline:none;" />' +
      '<button id="dom-ask-btn" style="padding:5px 10px;background:#e8b830;border:none;border-radius:4px;' +
      'color:#1a1a1a;font-weight:bold;font-size:11px;cursor:pointer;">Ask</button>';
    this.overlay.appendChild(tutorArea);

    document.body.appendChild(this.overlay);

    var self = this;
    this.overlay.querySelector('#dom-back-btn').addEventListener('click', function() {
      self.stop();
      if (root.MJ.IntroScreen) root.MJ.IntroScreen.show({ onSelect: function(id) { if (root.MJ.Main) root.MJ.Main.startFromIntro(id); } });
    });

    // Wire up tutor chat
    var askInput = document.getElementById('dom-ask-input');
    var askBtn = document.getElementById('dom-ask-btn');
    if (askInput && askBtn) {
      var handleAsk = function() {
        var q = askInput.value.trim();
        if (!q) return;
        askInput.value = '';
        self._addDomChat('You', q);
        self._handleTutorQuestion(q);
      };
      askBtn.addEventListener('click', handleAsk);
      askInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); handleAsk(); }
      });
    }
  };

  // -----------------------------------------------------------------------
  // Round management
  // -----------------------------------------------------------------------

  DominoGameManager.prototype._startRound = function() {
    var E = Engine();
    this.engine = new E.DominoEngine();
    this.selectedTile = null;
    this.roundCount++;

    var firstPlayer = this.engine.start(PLAYER_NAMES);

    this._updateRoundInfo();
    this._renderAll();
    this._showMessage(PLAYER_NAMES[firstPlayer] + ' starts (highest double)');

    var self = this;
    this.engine.onRoundEnd(function(result) {
      self._onRoundEnd(result);
    });

    // If AI starts, trigger their turn
    if (firstPlayer !== 0) {
      this._scheduleAITurn(800);
    }
  };

  DominoGameManager.prototype._onRoundEnd = function(result) {
    var winnerName = PLAYER_NAMES[result.winner];
    var reason = result.reason;
    var isPlayerWin = result.winner === 0;

    this._sessionStats.roundsPlayed++;
    if (isPlayerWin) this._sessionStats.roundsWon++;
    else this._sessionStats.roundsLost++;
    if (reason === 'blocked') this._sessionStats.timesBlocked++;

    // Learning
    try {
      var L = Learning();
      if (L && L.recordResult) {
        L.recordResult({
          playerWon: isPlayerWin,
          blocked: reason === 'blocked',
          remainingPips: this.engine.getScore(0),
          patterns: {}
        });
      }
    } catch (e) { /* learning not critical */ }

    // Coins/XP
    this._awardCoinsXP(isPlayerWin);

    // Dialogue from AI
    if (result.winner > 0) {
      var aiKey = AI_KEYS[result.winner];
      var cat = (reason === 'blocked') ? 'blocked' : 'win';
      this._showAIDialogue(result.winner, aiKey, cat);
    }

    // Show results
    var msg = '';
    if (reason === 'blocked') {
      msg = 'BLOCKED! ' + winnerName + ' wins with lowest pips (' + result.scores[result.winner] + ')';
    } else {
      msg = winnerName + (isPlayerWin ? ' (You) win' : ' wins') + '! Hand emptied!';
    }

    if (isPlayerWin) {
      this.playSound('WIN');
      msg += ' +3 coins';
    }

    this._showMessage(msg);
    this._renderAll();

    // New round button
    var self = this;
    var passArea = this.overlay.querySelector('#dom-pass-area');
    passArea.innerHTML =
      '<button id="dom-newround-btn" style="background:#e8b830;border:none;border-radius:8px;padding:10px 28px;color:#1a1a1a;font-weight:bold;cursor:pointer;font-size:15px;margin-top:8px;">Next Round</button>';
    passArea.querySelector('#dom-newround-btn').addEventListener('click', function() {
      self._startRound();
    });
  };

  DominoGameManager.prototype._awardCoinsXP = function(isPlayerWin) {
    try {
      var eco = this.sharedSystems && this.sharedSystems.economy;
      if (eco) {
        if (typeof eco.addCoins === 'function') eco.addCoins(isPlayerWin ? 3 : 1);
        else if (eco.coins !== undefined) eco.coins += (isPlayerWin ? 3 : 1);
      }
      var wm = this.sharedSystems && this.sharedSystems.worldManager;
      if (wm && typeof wm.addXP === 'function') {
        wm.addXP(isPlayerWin ? 15 : 5);
      }
    } catch (e) { /* economy not critical */ }
  };

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  DominoGameManager.prototype._renderAll = function() {
    this._renderOpponents();
    this._renderChain();
    this._renderHand();
    this._renderScores();
    this._updateRoundInfo();
  };

  DominoGameManager.prototype._updateRoundInfo = function() {
    var el = this.overlay.querySelector('#dom-round-info');
    if (el) el.textContent = 'Round ' + this.roundCount + ' | Won: ' + this._sessionStats.roundsWon;
  };

  DominoGameManager.prototype._renderOpponents = function() {
    var container = this.overlay.querySelector('#dom-opponents');
    if (!container) return;
    var html = '';
    for (var i = 1; i <= 3; i++) {
      var p = this.engine.players[i];
      var isActive = this.engine.currentPlayer === i && this.engine.phase === 'playing';
      var borderColor = isActive ? '#e8b830' : 'rgba(255,255,255,0.15)';
      html += '<div style="text-align:center;padding:8px 14px;border:2px solid ' + borderColor + ';border-radius:10px;background:rgba(0,0,0,0.2);min-width:100px;">';
      html += '<div style="font-size:24px;">' + PLAYER_AVATARS[i] + '</div>';
      html += '<div style="font-size:13px;font-weight:bold;color:' + (isActive ? '#e8b830' : '#ccc') + ';">' + PLAYER_NAMES[i] + '</div>';
      html += '<div style="font-size:11px;color:#888;">' + p.tiles.length + ' tiles</div>';
      // Show facedown tiles
      html += '<div style="display:flex;gap:1px;justify-content:center;margin-top:4px;">';
      for (var t = 0; t < p.tiles.length; t++) {
        html += '<div style="width:12px;height:20px;background:linear-gradient(135deg,#4a2800,#6b3a00);border:1px solid #8b5a00;border-radius:2px;"></div>';
      }
      html += '</div></div>';
    }
    container.innerHTML = html;
  };

  DominoGameManager.prototype._renderChain = function() {
    var container = this.overlay.querySelector('#dom-chain');
    if (!container) return;

    if (this.engine.chain.length === 0) {
      container.innerHTML = '<div style="color:#666;font-size:16px;">No tiles played yet</div>';
      return;
    }

    var html = '';
    // Show left end value indicator
    html += '<div style="color:#e8b830;font-size:12px;margin-right:4px;font-weight:bold;">' + this.engine.leftEnd + ' ←</div>';

    for (var i = 0; i < this.engine.chain.length; i++) {
      var entry = this.engine.chain[i];
      var tile = entry.tile;
      var T = Tiles();
      var isDbl = T.isDouble(tile);

      // Determine which value faces which direction
      var leftVal, rightVal;
      if (i === 0 && this.engine.chain.length === 1) {
        leftVal = tile.low;
        rightVal = tile.high;
      } else if (entry.placedLeft) {
        // Tile was placed on the left end: connecting end should face right
        if (i < this.engine.chain.length - 1) {
          var nextTile = this.engine.chain[i + 1].tile;
          // The connecting end faces right
          rightVal = this._getConnectingValue(tile, i, 'right');
          leftVal = (rightVal === tile.high) ? tile.low : tile.high;
        } else {
          leftVal = tile.low;
          rightVal = tile.high;
        }
      } else {
        leftVal = tile.low;
        rightVal = tile.high;
      }

      if (isDbl) {
        html += this._renderDominoSVGVertical(tile.high, tile.low);
      } else {
        html += this._renderDominoSVGHorizontal(leftVal, rightVal);
      }
    }

    // Show right end value indicator
    html += '<div style="color:#e8b830;font-size:12px;margin-left:4px;font-weight:bold;">→ ' + this.engine.rightEnd + '</div>';

    container.innerHTML = html;
  };

  DominoGameManager.prototype._getConnectingValue = function(tile, chainIdx, direction) {
    // Simple heuristic: just return based on chain position
    if (direction === 'right' && chainIdx < this.engine.chain.length - 1) {
      return tile.high;
    }
    return tile.low;
  };

  DominoGameManager.prototype._renderDominoSVGHorizontal = function(leftVal, rightVal) {
    var w = 60, h = 30;
    var svg = '<svg width="' + w + '" height="' + h + '" style="margin:1px;" viewBox="0 0 60 30">';
    svg += '<rect x="0.5" y="0.5" width="59" height="29" rx="3" fill="#f5f0e0" stroke="#8b7d6b" stroke-width="1"/>';
    svg += '<line x1="30" y1="2" x2="30" y2="28" stroke="#8b7d6b" stroke-width="1"/>';
    svg += this._renderPipsInArea(leftVal, 3, 3, 24, 24);
    svg += this._renderPipsInArea(rightVal, 33, 3, 24, 24);
    svg += '</svg>';
    return svg;
  };

  DominoGameManager.prototype._renderDominoSVGVertical = function(topVal, bottomVal) {
    var w = 30, h = 60;
    var svg = '<svg width="' + w + '" height="' + h + '" style="margin:1px;align-self:center;" viewBox="0 0 30 60">';
    svg += '<rect x="0.5" y="0.5" width="29" height="59" rx="3" fill="#f5f0e0" stroke="#8b7d6b" stroke-width="1"/>';
    svg += '<line x1="2" y1="30" x2="28" y2="30" stroke="#8b7d6b" stroke-width="1"/>';
    svg += this._renderPipsInArea(topVal, 3, 3, 24, 24);
    svg += this._renderPipsInArea(bottomVal, 3, 33, 24, 24);
    svg += '</svg>';
    return svg;
  };

  DominoGameManager.prototype._renderPipsInArea = function(value, ox, oy, aw, ah) {
    var positions = PIP_POSITIONS[value] || [];
    var svg = '';
    var scaleX = aw / 24;
    var scaleY = ah / 24;
    for (var i = 0; i < positions.length; i++) {
      var cx = ox + positions[i][0] * scaleX;
      var cy = oy + positions[i][1] * scaleY;
      svg += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.5" fill="#1a1a1a"/>';
    }
    return svg;
  };

  DominoGameManager.prototype._renderHand = function() {
    var container = this.overlay.querySelector('#dom-hand');
    var passArea = this.overlay.querySelector('#dom-pass-area');
    if (!container || !passArea) return;

    if (this.engine.phase !== 'playing') {
      // Don't clear hand during round_over — results shown
      if (this.engine.phase === 'round_over') return;
      container.innerHTML = '';
      passArea.innerHTML = '';
      return;
    }

    var isMyTurn = this.engine.currentPlayer === 0;
    var player = this.engine.players[0];
    var playable = this.engine.getPlayableTiles(0);
    var playableUids = {};
    for (var p = 0; p < playable.length; p++) {
      playableUids[playable[p].tile.uid] = playable[p].ends;
    }

    var html = '';
    var T = Tiles();

    for (var i = 0; i < player.tiles.length; i++) {
      var tile = player.tiles[i];
      var canPlay = isMyTurn && playableUids[tile.uid];
      var selected = this.selectedTile && this.selectedTile.uid === tile.uid;
      var borderColor = selected ? '#e8b830' : (canPlay ? '#52b788' : '#555');
      var opacity = (isMyTurn && !canPlay) ? '0.4' : '1';
      var cursor = canPlay ? 'pointer' : 'default';
      var glow = canPlay ? 'box-shadow:0 0 8px rgba(82,183,136,0.5);' : '';
      if (selected) glow = 'box-shadow:0 0 12px rgba(232,184,48,0.8);';

      html += '<div class="dom-tile-btn" data-uid="' + tile.uid + '" style="display:inline-block;border:2px solid ' + borderColor + ';border-radius:5px;padding:2px;cursor:' + cursor + ';opacity:' + opacity + ';transition:all 0.15s;' + glow + '">';
      html += this._renderHandTileSVG(tile.low, tile.high);
      html += '</div>';
    }

    container.innerHTML = html;

    // Wire click handlers
    var self = this;
    container.querySelectorAll('.dom-tile-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (!isMyTurn) return;
        var uid = btn.dataset.uid;
        if (!playableUids[uid]) return;
        self._onTileClick(uid, playableUids[uid]);
      });
    });

    // Pass button
    if (isMyTurn && playable.length === 0) {
      passArea.innerHTML =
        '<button id="dom-pass-btn" style="background:#8b0000;border:1px solid #cd5c5c;border-radius:8px;padding:8px 24px;color:#fff;cursor:pointer;font-size:14px;">Pass (no playable tiles)</button>';
      passArea.querySelector('#dom-pass-btn').addEventListener('click', function() {
        self._humanPass();
      });
    } else {
      passArea.innerHTML = isMyTurn
        ? '<div style="font-size:12px;color:#52b788;">Your turn — click a highlighted tile to play</div>'
        : '<div style="font-size:12px;color:#888;">Waiting for ' + PLAYER_NAMES[self.engine.currentPlayer] + '...</div>';
    }
  };

  DominoGameManager.prototype._renderHandTileSVG = function(lowVal, highVal) {
    var w = 60, h = 34;
    var svg = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 60 34">';
    svg += '<rect x="0.5" y="0.5" width="59" height="33" rx="3" fill="#f5f0e0" stroke="#8b7d6b" stroke-width="1"/>';
    svg += '<line x1="30" y1="2" x2="30" y2="32" stroke="#8b7d6b" stroke-width="1"/>';
    svg += this._renderPipsInArea(lowVal, 3, 5, 24, 24);
    svg += this._renderPipsInArea(highVal, 33, 5, 24, 24);
    svg += '</svg>';
    return svg;
  };

  DominoGameManager.prototype._renderScores = function() {
    var container = this.overlay.querySelector('#dom-scores');
    if (!container) return;
    var html = '';
    for (var i = 0; i < 4; i++) {
      var p = this.engine.players[i];
      var pips = this.engine.getScore(i);
      var isActive = this.engine.currentPlayer === i && this.engine.phase === 'playing';
      var color = isActive ? '#e8b830' : '#ccc';
      html += '<div style="margin-bottom:4px;color:' + color + ';">';
      html += PLAYER_AVATARS[i] + ' ' + PLAYER_NAMES[i];
      html += '<div style="font-size:10px;color:#888;">' + p.tiles.length + ' tiles, ' + pips + ' pips</div>';
      html += '</div>';
    }
    container.innerHTML = html;
  };

  // -----------------------------------------------------------------------
  // Player interaction
  // -----------------------------------------------------------------------

  DominoGameManager.prototype._onTileClick = function(uid, ends) {
    if (this.engine.phase !== 'playing' || this.engine.currentPlayer !== 0) return;

    var endChoice = this.overlay.querySelector('#dom-end-choice');

    if (ends.length === 1) {
      // Auto-play on the only valid end
      this._humanPlay(uid, ends[0]);
    } else if (ends.length > 1) {
      // Show left/right choice
      this.selectedTile = Tiles().findByUid(this.engine.players[0].tiles, uid);
      this._renderHand();
      endChoice.style.display = 'block';

      var self = this;
      var leftBtn = this.overlay.querySelector('#dom-left-btn');
      var rightBtn = this.overlay.querySelector('#dom-right-btn');

      // Clone to remove old listeners
      var newLeft = leftBtn.cloneNode(true);
      var newRight = rightBtn.cloneNode(true);
      leftBtn.parentNode.replaceChild(newLeft, leftBtn);
      rightBtn.parentNode.replaceChild(newRight, rightBtn);

      newLeft.addEventListener('click', function() {
        endChoice.style.display = 'none';
        self._humanPlay(uid, 'left');
      });
      newRight.addEventListener('click', function() {
        endChoice.style.display = 'none';
        self._humanPlay(uid, 'right');
      });
    }
  };

  DominoGameManager.prototype._humanPlay = function(uid, end) {
    this.selectedTile = null;
    var ok = this.engine.playTile(0, uid, end);
    if (ok) {
      this.playSound('PLACE');
      this._showMessage('You played ' + Tiles().getDisplay(Tiles().findByUid(this.engine.players[0].tiles, uid) || { low: '?', high: '?' }) + ' on ' + end);
      this._renderAll();

      if (this.engine.phase === 'playing' && this.engine.currentPlayer !== 0) {
        this._scheduleAITurn(600);
      }
    }
  };

  DominoGameManager.prototype._humanPass = function() {
    this.engine.pass(0);
    this.playSound('CLICK');
    this._showMessage('You passed');
    this._renderAll();

    if (this.engine.phase === 'playing' && this.engine.currentPlayer !== 0) {
      this._scheduleAITurn(600);
    }
  };

  // -----------------------------------------------------------------------
  // AI turns
  // -----------------------------------------------------------------------

  DominoGameManager.prototype._scheduleAITurn = function(delay) {
    if (this.engine.phase !== 'playing') return;
    var self = this;
    this._aiTimer = setTimeout(function() {
      self._doAITurn();
    }, delay || 600);
  };

  DominoGameManager.prototype._doAITurn = function() {
    if (!this.engine || this.engine.phase !== 'playing') return;

    var idx = this.engine.currentPlayer;
    if (idx === 0) {
      // Human turn
      this._renderAll();
      return;
    }

    var aiKey = AI_KEYS[idx];
    var player = this.engine.players[idx];
    var gameState = this.engine.getState();
    gameState.chain = this.engine.chain; // Pass full chain with tile objects

    var adjustments = null;
    try { adjustments = Learning().getAdjustments(); } catch (e) {}

    var aiModule = AI();
    var decision = aiModule.decidePlay(player.tiles, gameState, aiKey, adjustments);

    if (decision) {
      var ok = this.engine.playTile(idx, decision.tileUid, decision.end);
      if (ok) {
        this.playSound('PLACE');
        this._showAIDialogue(idx, aiKey, 'play');
      } else {
        // Fallback: pass
        this.engine.pass(idx);
        this._showAIDialogue(idx, aiKey, 'pass');
      }
    } else {
      this.engine.pass(idx);
      this.playSound('CLICK');
      this._showAIDialogue(idx, aiKey, 'pass');
    }

    this._renderAll();

    // Continue to next player
    if (this.engine.phase === 'playing') {
      if (this.engine.currentPlayer === 0) {
        this._renderAll();
      } else {
        this._scheduleAITurn(700);
      }
    }
  };

  // -----------------------------------------------------------------------
  // UI helpers
  // -----------------------------------------------------------------------

  DominoGameManager.prototype._showMessage = function(text) {
    var el = this.overlay.querySelector('#dom-message');
    if (el) el.textContent = text;
  };

  /**
   * Add a chat message to the dominoes chat panel.
   */
  DominoGameManager.prototype._addDomChat = function(speaker, text) {
    var chat = document.getElementById('dom-chat');
    if (!chat) return;
    var msg = document.createElement('div');
    msg.style.cssText = 'padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:#aaa;';
    var nameColors = { Mei: '#3498db', Kenji: '#e74c3c', Yuki: '#9b59b6', Tutor: '#e8b830', You: '#4ade80' };
    msg.innerHTML = '<strong style="color:' + (nameColors[speaker] || '#aaa') + ';">' + speaker + ':</strong> ' + text;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
    while (chat.children.length > 40) chat.removeChild(chat.firstChild);
  };

  DominoGameManager.prototype._showAIDialogue = function(playerIdx, aiKey, category) {
    if (!DOMINO_DIALOGUE[aiKey] || !DOMINO_DIALOGUE[aiKey][category]) return;
    var lines = DOMINO_DIALOGUE[aiKey][category];
    var scriptedLine = lines[Math.floor(Math.random() * lines.length)];

    // Try LLM-powered dialogue
    var self = this;
    if (this._tutorBridge && this._tutorBridge.isAvailable()) {
      this._tutorBridge.generateCharacterLine('dominoes', aiKey, category)
        .then(function(llmLine) {
          var finalLine = llmLine || scriptedLine;
          self._addDomChat(PLAYER_NAMES[playerIdx], finalLine);
          self._showMessage(PLAYER_NAMES[playerIdx] + ': "' + finalLine + '"');
        });
    } else {
      this._addDomChat(PLAYER_NAMES[playerIdx], scriptedLine);
      this._showMessage(PLAYER_NAMES[playerIdx] + ': "' + scriptedLine + '"');
    }
  };

  /**
   * Handle a tutor question from the chat input.
   */
  DominoGameManager.prototype._handleTutorQuestion = async function(question) {
    this._addDomChat('Tutor', '...');

    var playerTiles = this.engine ? this.engine.players[0].tiles : [];
    var gameState = this.engine ? {
      leftEnd: this.engine.leftEnd,
      rightEnd: this.engine.rightEnd,
      chain: this.engine.chain,
      tilesPlayed: this.engine.chain ? this.engine.chain.length : 0,
      players: this.engine.players
    } : {};

    var gameContext = '';
    if (this._tutorBridge) {
      gameContext = this._tutorBridge.formatDominoContext(playerTiles, gameState);
    }

    var offlineFallback = function(q) {
      var hints = DomHints();
      if (hints && hints.getHint) {
        var hint = hints.getHint({ tiles: playerTiles }, gameState);
        if (hint && hint.reason) return hint.reason;
      }
      var ql = (q || '').toLowerCase();
      if (ql.indexOf('block') !== -1) {
        return 'Blocking strategy: play tiles that leave board ends with values your opponents lack. Watch what they pass on — those values are safe to play.';
      }
      if (ql.indexOf('double') !== -1) {
        return 'Play doubles early when possible. They only match one value, so they become harder to play as the game progresses.';
      }
      if (ql.indexOf('count') !== -1 || ql.indexOf('track') !== -1) {
        return 'Track which pip values have been played. If 5 of 7 tiles with value 3 are out, playing a 3 on the board end forces opponents to pass.';
      }
      if (ql.indexOf('pass') !== -1) {
        return 'When opponents pass, note the board end values at that point — they lack those values. Use this to block them later.';
      }
      return 'I can help with blocking strategy, doubles management, tile counting, and specific tile decisions. Ask me something specific!';
    };

    var response;
    if (this._tutorBridge) {
      response = await this._tutorBridge.askTutor('dominoes', question, gameContext, offlineFallback);
    } else {
      response = offlineFallback(question);
    }

    var chat = document.getElementById('dom-chat');
    if (chat && chat.lastChild) {
      chat.removeChild(chat.lastChild);
    }
    this._addDomChat('Tutor', response);
  };

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  root.MJ.Dominoes.Play = Object.freeze({
    DominoGameManager: DominoGameManager
  });

  console.log('[Dominoes] Play module loaded');
})(typeof window !== 'undefined' ? window : global);
