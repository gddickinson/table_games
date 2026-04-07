/**
 * replay.js — Post-hand replay viewer and recording system
 * Records game actions during play and provides a step-through replay viewer.
 */
(function (root) {
  'use strict';

  var MJ = root.MJ || (root.MJ = {});
  var Tile = MJ.Tile;
  var Player = MJ.Player;

  // ─── ActionRecorder ────────────────────────────────────────────────

  /**
   * Records individual game actions during a round for later replay.
   * Only stores lightweight action objects — never full state snapshots.
   */
  function ActionRecorder() {
    this._actions = [];
    this._recording = false;
    this._turnCounter = 0;
    this._roundWind = 'east';
    this._roundNumber = 1;
    this._winner = null;
    this._winScore = 0;
    this._startTime = 0;
    this._concealedSnapshots = []; // sparse: snapshot at each discard step
  }

  /**
   * Begin recording actions for a new round.
   * @param {object} [opts] - Optional: {roundWind, roundNumber}
   */
  ActionRecorder.prototype.startRecording = function (opts) {
    this._actions = [];
    this._concealedSnapshots = [];
    this._recording = true;
    this._turnCounter = 0;
    this._startTime = Date.now();
    if (opts) {
      this._roundWind = opts.roundWind || 'east';
      this._roundNumber = opts.roundNumber || 1;
    }
    this._winner = null;
    this._winScore = 0;
  };

  /**
   * Record a single action.
   * @param {object} action - {type, player, tile?, turn?, timestamp?, concealedHands?}
   *   type: 'draw'|'discard'|'claim_pong'|'claim_chow'|'claim_kong'|'declare_win'|'declare_riichi'|'flower'
   *   player: seatIndex (0-3)
   *   tile: {suit, rank}  (optional for some action types)
   *   concealedHands: optional array of arrays of tile IDs to snapshot at discard steps
   */
  ActionRecorder.prototype.recordAction = function (action) {
    if (!this._recording) return;

    var entry = {
      type: action.type,
      player: action.player,
      tile: action.tile ? { suit: action.tile.suit, rank: action.tile.rank } : null,
      turn: (action.turn !== undefined) ? action.turn : this._turnCounter,
      timestamp: action.timestamp || (Date.now() - this._startTime)
    };

    // Bump turn counter on draws
    if (action.type === 'draw') {
      this._turnCounter++;
    }

    // Track winner
    if (action.type === 'declare_win') {
      this._winner = action.player;
      this._winScore = action.score || 0;
    }

    var idx = this._actions.length;
    this._actions.push(entry);

    // Store a concealed-hand snapshot at discard actions (compact: just tile IDs)
    if (action.type === 'discard' && action.concealedHands) {
      this._concealedSnapshots[idx] = action.concealedHands.map(function (hand) {
        return hand.map(function (t) { return Tile.getId(t); });
      });
    }
  };

  /**
   * @returns {Array} The full action log.
   */
  ActionRecorder.prototype.getRecording = function () {
    return {
      actions: this._actions.slice(),
      snapshots: this._concealedSnapshots.slice()
    };
  };

  /**
   * @returns {object} Metadata about the recorded round.
   */
  ActionRecorder.prototype.getMetadata = function () {
    return {
      date: new Date().toISOString(),
      roundWind: this._roundWind,
      roundNumber: this._roundNumber,
      winner: this._winner,
      score: this._winScore,
      turns: this._turnCounter
    };
  };

  /**
   * Clear all recorded data for a new round.
   */
  ActionRecorder.prototype.clear = function () {
    this._actions = [];
    this._concealedSnapshots = [];
    this._recording = false;
    this._turnCounter = 0;
    this._winner = null;
    this._winScore = 0;
    this._startTime = 0;
  };

  // ─── ReplayViewer ──────────────────────────────────────────────────

  /**
   * Provides step-by-step replay of a recorded round.
   * @param {object} recording - { actions:[], snapshots:[] }
   * @param {object} metadata  - from ActionRecorder.getMetadata()
   */
  function ReplayViewer(recording, metadata) {
    this._actions = recording.actions || [];
    this._snapshots = recording.snapshots || [];
    this._metadata = metadata || {};
    this._currentStep = 0;
    this._onStepChange = null;
  }

  /**
   * Reconstruct a lightweight state at a given step index by reading
   * the nearest snapshot and replaying the discard/claim actions in between.
   * @param {number} stepIndex
   * @returns {object} { hands:[[tileIds]...], melds:[[meldInfo]...], discards:[[tileIds]...], currentPlayer, turn }
   */
  ReplayViewer.prototype.reconstructStateAt = function (stepIndex) {
    var hands = [[], [], [], []];
    var melds = [[], [], [], []];
    var discards = [[], [], [], []];
    var currentPlayer = 0;
    var turn = 0;

    // Find the most recent snapshot at or before stepIndex
    var snapshotIdx = -1;
    for (var s = stepIndex; s >= 0; s--) {
      if (this._snapshots[s]) {
        snapshotIdx = s;
        break;
      }
    }

    if (snapshotIdx >= 0) {
      // Load snapshot
      var snap = this._snapshots[snapshotIdx];
      for (var p = 0; p < 4; p++) {
        hands[p] = snap[p] ? snap[p].slice() : [];
      }

      // Replay discard/claim actions from snapshot up to stepIndex
      for (var i = 0; i <= snapshotIdx; i++) {
        var action = this._actions[i];
        if (!action) continue;
        if (action.type === 'discard') {
          var tileId = action.tile ? (action.tile.suit + '-' + action.tile.rank) : null;
          if (tileId) discards[action.player].push(tileId);
        }
        if (action.type === 'claim_pong' || action.type === 'claim_chow' ||
            action.type === 'claim_kong') {
          melds[action.player].push({
            type: action.type.replace('claim_', ''),
            tile: action.tile ? (action.tile.suit + '-' + action.tile.rank) : null
          });
          // Remove the last discard (it was claimed)
          var prevDiscard = this._findPreviousDiscard(i);
          if (prevDiscard >= 0) {
            var dPlayer = this._actions[prevDiscard].player;
            discards[dPlayer].pop();
          }
        }
        currentPlayer = action.player;
        turn = action.turn;
      }
    } else {
      // No snapshot available — just track discards and melds
      for (var j = 0; j <= Math.min(stepIndex, this._actions.length - 1); j++) {
        var act = this._actions[j];
        if (!act) continue;
        if (act.type === 'discard') {
          var tid = act.tile ? (act.tile.suit + '-' + act.tile.rank) : null;
          if (tid) discards[act.player].push(tid);
        }
        if (act.type === 'claim_pong' || act.type === 'claim_chow' ||
            act.type === 'claim_kong') {
          melds[act.player].push({
            type: act.type.replace('claim_', ''),
            tile: act.tile ? (act.tile.suit + '-' + act.tile.rank) : null
          });
          var pd = this._findPreviousDiscard(j);
          if (pd >= 0) {
            discards[this._actions[pd].player].pop();
          }
        }
        currentPlayer = act.player;
        turn = act.turn;
      }
    }

    return {
      hands: hands,
      melds: melds,
      discards: discards,
      currentPlayer: currentPlayer,
      turn: turn
    };
  };

  /**
   * Find the index of the discard action immediately before actionIndex.
   * @private
   */
  ReplayViewer.prototype._findPreviousDiscard = function (actionIndex) {
    for (var i = actionIndex - 1; i >= 0; i--) {
      if (this._actions[i].type === 'discard') return i;
    }
    return -1;
  };

  /**
   * @returns {number} Total number of recorded actions.
   */
  ReplayViewer.prototype.getStepCount = function () {
    return this._actions.length;
  };

  /**
   * @param {number} index
   * @returns {object} The action at the given index.
   */
  ReplayViewer.prototype.getStep = function (index) {
    return this._actions[index] || null;
  };

  /**
   * For a discard action, compare the actual discard with what the AI engine
   * would have recommended.
   * @param {object} step - The action object
   * @param {number} playerIndex - Which player perspective to evaluate
   * @returns {object|null} { recommended:{suit,rank}, actual:{suit,rank}, match:boolean }
   */
  ReplayViewer.prototype.getAnnotation = function (step, playerIndex) {
    if (!step || step.type !== 'discard') return null;
    if (step.player !== playerIndex) return null;

    var actual = step.tile;
    if (!actual) return null;

    // Try to use AIEngine if available
    var AIEngine = MJ.AI || MJ.AIEngine;
    if (!AIEngine || typeof AIEngine.chooseDiscard !== 'function') {
      return {
        recommended: actual,
        actual: actual,
        match: true
      };
    }

    // Attempt to reconstruct the hand at this step
    var stepIdx = this._actions.indexOf(step);
    if (stepIdx < 0) {
      return { recommended: actual, actual: actual, match: true };
    }

    var state = this.reconstructStateAt(stepIdx);
    var handTileIds = state.hands[playerIndex];

    // If we have concealed hand info, try to build a pseudo-player for AI eval
    if (handTileIds && handTileIds.length > 0) {
      try {
        var tiles = handTileIds.map(function (id) {
          var parts = id.split('-');
          return Tile.create(parts[0], parseInt(parts[1], 10));
        });
        var pseudoPlayer = Player.create(playerIndex, false);
        for (var i = 0; i < tiles.length; i++) {
          pseudoPlayer.hand.concealed.push(tiles[i]);
        }
        var recommended = AIEngine.chooseDiscard(pseudoPlayer, { players: [], roundWind: this._metadata.roundWind || 'east' });
        if (recommended) {
          var recId = recommended.suit + '-' + recommended.rank;
          var actId = actual.suit + '-' + actual.rank;
          return {
            recommended: { suit: recommended.suit, rank: recommended.rank },
            actual: actual,
            match: recId === actId
          };
        }
      } catch (e) {
        // AI evaluation failed — fall through
      }
    }

    return {
      recommended: actual,
      actual: actual,
      match: true
    };
  };

  /**
   * Build a DOM-based replay viewer UI.
   * @returns {HTMLElement}
   */
  ReplayViewer.prototype.buildViewerUI = function () {
    var self = this;
    var totalSteps = this.getStepCount();
    if (totalSteps === 0) totalSteps = 1;

    // Container
    var wrap = document.createElement('div');
    wrap.className = 'replay-viewer-overlay';
    wrap.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;';

    var panel = document.createElement('div');
    panel.className = 'replay-viewer-panel';
    panel.style.cssText = 'background:var(--panel-bg, #1a2a1a);color:var(--text, #e0e0e0);' +
      'border-radius:12px;padding:24px;max-width:700px;width:90%;max-height:80vh;overflow-y:auto;' +
      'box-shadow:0 4px 30px rgba(0,0,0,0.6);font-family:inherit;';

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
    var title = document.createElement('h2');
    title.textContent = 'Replay Viewer';
    title.style.cssText = 'margin:0;font-size:20px;';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.className = 'btn';
    closeBtn.style.cssText = 'padding:6px 16px;cursor:pointer;';
    closeBtn.addEventListener('click', function () {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    });
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Metadata
    if (this._metadata) {
      var meta = document.createElement('div');
      meta.style.cssText = 'font-size:13px;color:#aaa;margin-bottom:12px;';
      var windStr = capitalize(this._metadata.roundWind || 'east');
      meta.textContent = 'Round ' + (this._metadata.roundNumber || '?') + ' | ' +
        windStr + ' Wind | ' + (this._metadata.turns || 0) + ' turns | ' +
        (this._metadata.date ? this._metadata.date.substring(0, 10) : '');
      panel.appendChild(meta);
    }

    // Step counter
    var stepInfo = document.createElement('div');
    stepInfo.style.cssText = 'text-align:center;font-size:16px;font-weight:bold;margin-bottom:8px;';
    stepInfo.textContent = 'Step 1 / ' + totalSteps;
    panel.appendChild(stepInfo);

    // Action description
    var actionDesc = document.createElement('div');
    actionDesc.style.cssText = 'text-align:center;font-size:15px;margin-bottom:12px;min-height:24px;';
    panel.appendChild(actionDesc);

    // Annotation area (AI comparison)
    var annotationArea = document.createElement('div');
    annotationArea.style.cssText = 'text-align:center;font-size:14px;margin-bottom:12px;min-height:20px;';
    panel.appendChild(annotationArea);

    // Hand display area
    var handDisplay = document.createElement('div');
    handDisplay.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:4px;' +
      'margin-bottom:16px;min-height:40px;padding:8px;background:rgba(0,0,0,0.2);border-radius:8px;';
    panel.appendChild(handDisplay);

    // Controls
    var controls = document.createElement('div');
    controls.style.cssText = 'display:flex;justify-content:center;gap:12px;';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'btn';
    prevBtn.textContent = 'Previous';
    prevBtn.style.cssText = 'padding:8px 20px;cursor:pointer;';

    var nextBtn = document.createElement('button');
    nextBtn.className = 'btn';
    nextBtn.textContent = 'Next';
    nextBtn.style.cssText = 'padding:8px 20px;cursor:pointer;';

    controls.appendChild(prevBtn);
    controls.appendChild(nextBtn);
    panel.appendChild(controls);

    wrap.appendChild(panel);

    // Wind labels
    var windLabels = { east: 'East', south: 'South', west: 'West', north: 'North' };
    var seatWinds = ['east', 'south', 'west', 'north'];

    function getPlayerName(seatIdx) {
      var w = seatWinds[seatIdx] || 'unknown';
      return (windLabels[w] || '?') + (seatIdx === 0 ? ' (You)' : ' (AI)');
    }

    function describeAction(step) {
      if (!step) return '';
      var name = getPlayerName(step.player);
      var tileName = step.tile ? tileToName(step.tile) : '?';
      switch (step.type) {
        case 'draw':       return name + ' draws a tile';
        case 'discard':    return name + ' discards ' + tileName;
        case 'claim_pong': return name + ' claims Pong on ' + tileName;
        case 'claim_chow': return name + ' claims Chow on ' + tileName;
        case 'claim_kong': return name + ' claims Kong on ' + tileName;
        case 'declare_win': return name + ' declares Win!';
        case 'declare_riichi': return name + ' declares Riichi!';
        case 'flower':     return name + ' draws flower ' + tileName;
        default:           return name + ' — ' + step.type;
      }
    }

    function tileToName(tile) {
      if (!tile) return '?';
      try {
        return Tile.getName(Tile.create(tile.suit, tile.rank));
      } catch (e) {
        return tile.suit + '-' + tile.rank;
      }
    }

    function renderStep(index) {
      self._currentStep = Math.max(0, Math.min(index, self.getStepCount() - 1));
      var step = self.getStep(self._currentStep);
      var count = self.getStepCount();

      stepInfo.textContent = 'Step ' + (self._currentStep + 1) + ' / ' + count;
      actionDesc.textContent = describeAction(step);

      // Enable/disable buttons
      prevBtn.disabled = (self._currentStep <= 0);
      nextBtn.disabled = (self._currentStep >= count - 1);

      // Annotation
      annotationArea.textContent = '';
      if (step && step.type === 'discard' && step.player === 0) {
        var annotation = self.getAnnotation(step, 0);
        if (annotation) {
          var actualName = tileToName(annotation.actual);
          var recName = tileToName(annotation.recommended);
          var span = document.createElement('span');
          if (annotation.match) {
            span.style.color = '#4caf50';
            span.textContent = 'Your choice: ' + actualName + ' — matches AI recommendation';
          } else {
            span.style.color = '#ff9800';
            span.textContent = 'Your choice: ' + actualName + ' | AI recommends: ' + recName;
          }
          annotationArea.appendChild(span);
        }
      }

      // Hand display (human player, seat 0)
      handDisplay.innerHTML = '';
      var stateAtStep = self.reconstructStateAt(self._currentStep);
      var humanHand = stateAtStep.hands[0];

      if (humanHand && humanHand.length > 0) {
        var TR = MJ.TileRenderer || MJ.TR;
        for (var i = 0; i < humanHand.length; i++) {
          var parts = humanHand[i].split('-');
          var t = Tile.create(parts[0], parseInt(parts[1], 10));
          if (TR && typeof TR.createTileElement === 'function') {
            var el = TR.createTileElement(t);
            el.style.cssText = 'width:32px;height:44px;font-size:22px;display:inline-flex;' +
              'align-items:center;justify-content:center;';
            handDisplay.appendChild(el);
          } else {
            var span = document.createElement('span');
            span.textContent = Tile.getDisplay ? Tile.getDisplay(t) : humanHand[i];
            span.style.cssText = 'font-size:22px;margin:0 2px;';
            handDisplay.appendChild(span);
          }
        }
      } else {
        var empty = document.createElement('span');
        empty.textContent = 'No hand data available for this step';
        empty.style.color = '#888';
        handDisplay.appendChild(empty);
      }

      if (self._onStepChange) self._onStepChange(self._currentStep, step);
    }

    prevBtn.addEventListener('click', function () {
      renderStep(self._currentStep - 1);
    });
    nextBtn.addEventListener('click', function () {
      renderStep(self._currentStep + 1);
    });

    // Keyboard navigation
    function onKey(e) {
      if (!wrap.parentNode) {
        document.removeEventListener('keydown', onKey);
        return;
      }
      if (e.key === 'ArrowLeft') renderStep(self._currentStep - 1);
      else if (e.key === 'ArrowRight') renderStep(self._currentStep + 1);
      else if (e.key === 'Escape') {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
    }
    document.addEventListener('keydown', onKey);

    // Render the first step
    if (this._actions.length > 0) {
      renderStep(0);
    } else {
      stepInfo.textContent = 'No actions recorded';
      actionDesc.textContent = '';
    }

    return wrap;
  };

  /**
   * Register a callback for step changes.
   * @param {function} fn - (stepIndex, action)
   */
  ReplayViewer.prototype.onStepChange = function (fn) {
    this._onStepChange = fn;
  };

  // ─── Helpers ───────────────────────────────────────────────────────

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ─── Export ────────────────────────────────────────────────────────

  MJ.Replay = Object.freeze({
    ActionRecorder: ActionRecorder,
    ReplayViewer: ReplayViewer
  });

  console.log('[Mahjong] Replay module loaded');

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
