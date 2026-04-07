/**
 * teaching-overlay.js — Rich visual teaching overlay with tile efficiency heatmap
 * Renders colored overlays on tiles showing efficiency, danger, and hand decomposition.
 * Exports: root.MJ.TeachingOverlay
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  const Tile = () => root.MJ.Tile;
  const Hand = () => root.MJ.Hand;
  const AIE = () => root.MJ.AIEngine;

  // ---------------------------------------------------------------------------
  // Overlay modes
  // ---------------------------------------------------------------------------
  const OVERLAY_MODES = ['off', 'efficiency', 'danger', 'decomposition', 'full'];

  // ---------------------------------------------------------------------------
  // CSS injection
  // ---------------------------------------------------------------------------
  const STYLE_ID = 'mj-teaching-overlay-styles';

  function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.mj-overlay-tile { position: relative; display: inline-block; }',
      '.mj-overlay-glow-green { box-shadow: 0 0 12px 4px rgba(34,197,94,0.7); border-radius: 4px; }',
      '.mj-overlay-glow-yellow { box-shadow: 0 0 10px 3px rgba(234,179,8,0.65); border-radius: 4px; }',
      '.mj-overlay-glow-red { box-shadow: 0 0 10px 3px rgba(239,68,68,0.7); border-radius: 4px; }',
      '.mj-overlay-ukeire { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); font-size: 11px; font-weight: 700; color: #fff; background: rgba(0,0,0,0.7); border-radius: 3px; padding: 1px 4px; pointer-events: none; z-index: 10; }',
      '.mj-overlay-danger-bar { position: absolute; bottom: -6px; left: 10%; width: 80%; height: 4px; border-radius: 2px; background: #333; overflow: hidden; pointer-events: none; z-index: 10; }',
      '.mj-overlay-danger-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }',
      '.mj-overlay-danger-fill.low { background: #22c55e; }',
      '.mj-overlay-danger-fill.medium { background: #eab308; }',
      '.mj-overlay-danger-fill.high { background: #ef4444; }',
      '.mj-overlay-tooltip { position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%); min-width: 220px; max-width: 320px; background: rgba(15,23,42,0.95); color: #e2e8f0; font-size: 12px; padding: 8px 10px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); z-index: 100; pointer-events: none; line-height: 1.5; white-space: normal; }',
      '.mj-overlay-tooltip .row { margin-bottom: 3px; }',
      '.mj-overlay-tooltip .label { color: #94a3b8; }',
      '.mj-overlay-tooltip .warn { color: #f87171; }',
      '.mj-overlay-tooltip .good { color: #4ade80; }',
      '.mj-overlay-win-prob { position: fixed; top: 60px; right: 16px; background: rgba(15,23,42,0.92); color: #e2e8f0; font-size: 13px; padding: 12px 16px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); z-index: 200; min-width: 200px; }',
      '.mj-overlay-win-prob h4 { margin: 0 0 6px; font-size: 14px; color: #93c5fd; }',
      '.mj-overlay-win-prob .prob-row { display: flex; justify-content: space-between; margin: 2px 0; }',
      '.mj-overlay-decomp-seq { background: rgba(34,197,94,0.25); border-radius: 3px; }',
      '.mj-overlay-decomp-pair { background: rgba(234,179,8,0.3); border-radius: 3px; }',
      '.mj-overlay-decomp-triplet { background: rgba(59,130,246,0.3); border-radius: 3px; }',
      '.mj-overlay-decomp-isolated { background: rgba(100,116,139,0.3); border-radius: 3px; }',
      '.mj-overlay-decomp-potential { border: 1px dashed rgba(168,85,247,0.5); border-radius: 3px; }',
      '.mj-overlay-toggle { position: fixed; bottom: 16px; right: 16px; z-index: 300; background: #1e293b; color: #e2e8f0; border: 1px solid #475569; border-radius: 20px; padding: 6px 14px; cursor: pointer; font-size: 12px; font-family: inherit; box-shadow: 0 2px 8px rgba(0,0,0,0.3); transition: background 0.2s; }',
      '.mj-overlay-toggle:hover { background: #334155; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Helper utilities
  // ---------------------------------------------------------------------------

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function dangerLevelClass(danger) {
    if (danger < 0.2) return 'low';
    if (danger < 0.5) return 'medium';
    return 'high';
  }

  function glowClass(shantenChange, ukeireAfter, bestUkeire, danger) {
    if (shantenChange > 0 || danger > 0.6) return 'mj-overlay-glow-red';
    if (shantenChange === 0 && ukeireAfter >= bestUkeire - 2) return 'mj-overlay-glow-green';
    if (shantenChange === 0 && ukeireAfter >= bestUkeire * 0.5) return 'mj-overlay-glow-yellow';
    return 'mj-overlay-glow-red';
  }

  function el(tag, cls, text) {
    if (typeof document === 'undefined') return null;
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ---------------------------------------------------------------------------
  // Win probability estimation
  // ---------------------------------------------------------------------------

  function estimateWinProbability(shanten, ukeireTotal, turnsRemaining, wallSize) {
    if (shanten < 0) return 1;
    if (turnsRemaining <= 0 || wallSize <= 0) return 0;
    // Rough model: probability of drawing useful tile each turn
    var perTurnProb = clamp(ukeireTotal / Math.max(wallSize, 1), 0, 1);
    if (shanten === 0) {
      // Tenpai — cumulative probability over remaining turns
      return clamp(1 - Math.pow(1 - perTurnProb, turnsRemaining), 0, 1);
    }
    // Further from tenpai — each shanten step reduces probability significantly
    var reachTenpaiProb = Math.pow(perTurnProb, shanten) * Math.pow(0.85, shanten);
    var tenpaiTurns = Math.max(turnsRemaining - shanten * 3, 0);
    var winAfterTenpai = clamp(1 - Math.pow(1 - perTurnProb * 0.6, tenpaiTurns), 0, 1);
    return clamp(reachTenpaiProb * winAfterTenpai, 0, 1);
  }

  function estimateDealInRisk(player, state) {
    if (!AIE() || !AIE().TileTracker) return 0;
    var tracker = new (AIE().TileTracker)();
    tracker.buildFromState(state, player.seatIndex);
    var dangerModel = new (AIE().DangerModel)(tracker);
    var hand = player.hand;
    var totalDanger = 0;
    var count = 0;
    for (var i = 0; i < hand.concealed.length; i++) {
      var idx = AIE().tileToIndex(hand.concealed[i]);
      if (idx < 0) continue;
      var d = dangerModel.getMaxDanger(idx, player.seatIndex, state.turnCount || 0);
      totalDanger += d;
      count++;
    }
    return count > 0 ? totalDanger / count : 0;
  }

  // ---------------------------------------------------------------------------
  // Hand decomposition
  // ---------------------------------------------------------------------------

  function decomposeHand(hand) {
    var tiles = hand.concealed.slice().sort(Tile().compare || function(a, b) {
      if (a.suit !== b.suit) return a.suit < b.suit ? -1 : 1;
      return a.rank - b.rank;
    });
    var groups = [];
    var used = new Set();

    // Find triplets
    for (var i = 0; i < tiles.length - 2; i++) {
      if (used.has(i)) continue;
      for (var j = i + 1; j < tiles.length - 1; j++) {
        if (used.has(j)) continue;
        if (tiles[i].suit !== tiles[j].suit || tiles[i].rank !== tiles[j].rank) break;
        for (var k = j + 1; k < tiles.length; k++) {
          if (used.has(k)) continue;
          if (tiles[i].suit === tiles[k].suit && tiles[i].rank === tiles[k].rank) {
            groups.push({ type: 'triplet', tiles: [tiles[i], tiles[j], tiles[k]], indices: [i, j, k] });
            used.add(i); used.add(j); used.add(k);
            break;
          }
        }
        break;
      }
    }

    // Find sequences (suited tiles only)
    var suited = ['characters', 'bamboo', 'circles'];
    for (var si = 0; si < suited.length; si++) {
      var suitTiles = [];
      for (var ti = 0; ti < tiles.length; ti++) {
        if (!used.has(ti) && tiles[ti].suit === suited[si]) {
          suitTiles.push({ tile: tiles[ti], idx: ti });
        }
      }
      for (var a = 0; a < suitTiles.length; a++) {
        if (used.has(suitTiles[a].idx)) continue;
        for (var b = a + 1; b < suitTiles.length; b++) {
          if (used.has(suitTiles[b].idx)) continue;
          if (suitTiles[b].tile.rank !== suitTiles[a].tile.rank + 1) continue;
          for (var c = b + 1; c < suitTiles.length; c++) {
            if (used.has(suitTiles[c].idx)) continue;
            if (suitTiles[c].tile.rank === suitTiles[a].tile.rank + 2) {
              groups.push({ type: 'sequence', tiles: [suitTiles[a].tile, suitTiles[b].tile, suitTiles[c].tile], indices: [suitTiles[a].idx, suitTiles[b].idx, suitTiles[c].idx] });
              used.add(suitTiles[a].idx); used.add(suitTiles[b].idx); used.add(suitTiles[c].idx);
              break;
            }
          }
        }
      }
    }

    // Find pairs from remaining
    for (var p = 0; p < tiles.length - 1; p++) {
      if (used.has(p)) continue;
      for (var q = p + 1; q < tiles.length; q++) {
        if (used.has(q)) continue;
        if (tiles[p].suit === tiles[q].suit && tiles[p].rank === tiles[q].rank) {
          groups.push({ type: 'pair', tiles: [tiles[p], tiles[q]], indices: [p, q] });
          used.add(p); used.add(q);
          break;
        }
      }
    }

    // Find potential sequences (adjacent tiles)
    var potentials = [];
    for (var m = 0; m < tiles.length; m++) {
      if (used.has(m)) continue;
      for (var n = m + 1; n < tiles.length; n++) {
        if (used.has(n)) continue;
        if (tiles[m].suit === tiles[n].suit && suited.indexOf(tiles[m].suit) !== -1) {
          var gap = tiles[n].rank - tiles[m].rank;
          if (gap === 1 || gap === 2) {
            potentials.push({ type: 'potential', tiles: [tiles[m], tiles[n]], indices: [m, n], gap: gap });
            used.add(m); used.add(n);
            break;
          }
        }
      }
    }

    // Remaining are isolated
    var isolated = [];
    for (var r = 0; r < tiles.length; r++) {
      if (!used.has(r)) {
        isolated.push({ type: 'isolated', tiles: [tiles[r]], indices: [r] });
      }
    }

    return { groups: groups, potentials: potentials, isolated: isolated, allTiles: tiles };
  }

  // ---------------------------------------------------------------------------
  // TeachingOverlay class
  // ---------------------------------------------------------------------------

  class TeachingOverlay {
    constructor() {
      this.mode = 'off';
      this._tooltipEl = null;
      this._winProbEl = null;
      this._toggleBtn = null;
      injectStyles();
    }

    // ---- Mode management ----------------------------------------------------

    setOverlayMode(mode) {
      if (OVERLAY_MODES.indexOf(mode) === -1) mode = 'off';
      this.mode = mode;
      this._clearOverlays();
      return this.mode;
    }

    getOverlayMode() { return this.mode; }

    cycleMode() {
      var idx = OVERLAY_MODES.indexOf(this.mode);
      this.mode = OVERLAY_MODES[(idx + 1) % OVERLAY_MODES.length];
      this._clearOverlays();
      if (this._toggleBtn) {
        this._toggleBtn.textContent = 'Overlay: ' + this.mode;
      }
      return this.mode;
    }

    // ---- Efficiency heatmap -------------------------------------------------

    showEfficiencyHeatmap(player, state) {
      if (typeof document === 'undefined') return null;
      var hand = player.hand;
      var compact = AIE().handToCompact(hand);
      var meldCount = hand.melds.length;
      var tracker = new (AIE().TileTracker)();
      tracker.buildFromState(state, player.seatIndex);

      var baseShanten = AIE().calcShantenCompact(new Uint8Array(compact), meldCount);
      var results = {};
      var bestUkeire = 0;

      // First pass: compute stats for each tile
      for (var i = 0; i < hand.concealed.length; i++) {
        var tile = hand.concealed[i];
        var id = Tile().getId(tile);
        if (results[id]) continue;
        var idx = AIE().tileToIndex(tile);
        if (idx < 0) continue;

        compact[idx]--;
        var afterShanten = AIE().calcShantenCompact(new Uint8Array(compact), meldCount);
        var afterUkeire = AIE().calcUkeire(new Uint8Array(compact), meldCount, tracker);
        compact[idx]++;

        var dangerModel = new (AIE().DangerModel)(tracker);
        var danger = dangerModel.getMaxDanger(idx, player.seatIndex, state.turnCount || 0);

        results[id] = {
          tile: tile,
          shantenAfter: afterShanten,
          shantenChange: afterShanten - baseShanten,
          ukeireAfter: afterUkeire.total,
          danger: danger
        };
        if (afterShanten <= baseShanten && afterUkeire.total > bestUkeire) {
          bestUkeire = afterUkeire.total;
        }
      }

      // Second pass: assign glow classes and build overlays
      var overlays = {};
      for (var id in results) {
        var r = results[id];
        overlays[id] = {
          glowClass: glowClass(r.shantenChange, r.ukeireAfter, bestUkeire, r.danger),
          ukeire: r.ukeireAfter,
          danger: r.danger,
          dangerLevel: dangerLevelClass(r.danger),
          shantenChange: r.shantenChange,
          isOptimal: r.shantenChange <= 0 && r.ukeireAfter >= bestUkeire - 2
        };
      }

      return overlays;
    }

    applyHeatmapToDOM(overlays, tileElements) {
      if (typeof document === 'undefined' || !overlays) return;
      for (var id in overlays) {
        var ov = overlays[id];
        var elems = tileElements[id];
        if (!elems) continue;
        var targets = Array.isArray(elems) ? elems : [elems];
        for (var t = 0; t < targets.length; t++) {
          var tileEl = targets[t];
          tileEl.classList.add('mj-overlay-tile', ov.glowClass);

          // Ukeire badge
          var badge = el('span', 'mj-overlay-ukeire', String(ov.ukeire));
          tileEl.style.position = 'relative';
          tileEl.appendChild(badge);

          // Danger bar
          var bar = el('div', 'mj-overlay-danger-bar');
          var fill = el('div', 'mj-overlay-danger-fill ' + ov.dangerLevel);
          fill.style.width = Math.round(ov.danger * 100) + '%';
          bar.appendChild(fill);
          tileEl.appendChild(bar);
        }
      }
    }

    // ---- Win probability display ---------------------------------------------

    showWinProbability(player, state) {
      var hand = player.hand;
      var compact = AIE().handToCompact(hand);
      var meldCount = hand.melds.length;
      var tracker = new (AIE().TileTracker)();
      tracker.buildFromState(state, player.seatIndex);

      var baseShanten = AIE().calcShantenCompact(new Uint8Array(compact), meldCount);
      var baseUkeire = AIE().calcUkeire(new Uint8Array(compact), meldCount, tracker);
      var wallSize = state.wallRemaining || 70;
      var turnsRemaining = Math.floor(wallSize / (state.playerCount || 4));

      var currentProb = estimateWinProbability(baseShanten, baseUkeire.total, turnsRemaining, wallSize);
      var dealInRisk = estimateDealInRisk(player, state);

      // Estimate expected points
      var expectedPoints = 0;
      if (AIE().estimateHandValue) {
        expectedPoints = AIE().estimateHandValue(compact, hand.melds, player.seatWind, state.roundWind) || 0;
      }

      // Per-discard win probabilities
      var discardProbs = {};
      for (var i = 0; i < hand.concealed.length; i++) {
        var tile = hand.concealed[i];
        var id = Tile().getId(tile);
        if (discardProbs[id]) continue;
        var idx = AIE().tileToIndex(tile);
        if (idx < 0) continue;

        compact[idx]--;
        var sh = AIE().calcShantenCompact(new Uint8Array(compact), meldCount);
        var uk = AIE().calcUkeire(new Uint8Array(compact), meldCount, tracker);
        compact[idx]++;

        discardProbs[id] = {
          winProb: estimateWinProbability(sh, uk.total, turnsRemaining - 1, wallSize),
          shanten: sh,
          ukeire: uk.total
        };
      }

      var result = {
        currentWinProbability: currentProb,
        dealInRisk: dealInRisk,
        expectedPoints: expectedPoints,
        turnsRemaining: turnsRemaining,
        shanten: baseShanten,
        discardProbabilities: discardProbs
      };

      this._renderWinProbability(result);
      return result;
    }

    _renderWinProbability(data) {
      if (typeof document === 'undefined') return;
      if (this._winProbEl) this._winProbEl.remove();

      var panel = el('div', 'mj-overlay-win-prob');
      var title = el('h4', null, 'Win Probability');
      panel.appendChild(title);

      var rows = [
        ['Current', (data.currentWinProbability * 100).toFixed(1) + '%'],
        ['Shanten', String(data.shanten)],
        ['Expected pts', String(data.expectedPoints)],
        ['Deal-in risk', (data.dealInRisk * 100).toFixed(1) + '%'],
        ['Turns left', String(data.turnsRemaining)]
      ];
      for (var i = 0; i < rows.length; i++) {
        var row = el('div', 'prob-row');
        row.appendChild(el('span', 'label', rows[i][0]));
        row.appendChild(el('span', null, rows[i][1]));
        panel.appendChild(row);
      }

      document.body.appendChild(panel);
      this._winProbEl = panel;
    }

    // ---- Tile tooltip --------------------------------------------------------

    showTileTooltip(tile, player, state) {
      var id = Tile().getId(tile);
      var hand = player.hand;
      var compact = AIE().handToCompact(hand);
      var meldCount = hand.melds.length;
      var tracker = new (AIE().TileTracker)();
      tracker.buildFromState(state, player.seatIndex);

      var idx = AIE().tileToIndex(tile);
      if (idx < 0) return null;

      compact[idx]--;
      var sh = AIE().calcShantenCompact(new Uint8Array(compact), meldCount);
      var uk = AIE().calcUkeire(new Uint8Array(compact), meldCount, tracker);
      compact[idx]++;

      var dangerModel = new (AIE().DangerModel)(tracker);
      var danger = dangerModel.getMaxDanger(idx, player.seatIndex, state.turnCount || 0);

      // Safe from: players who have discarded this tile
      var safeFrom = [];
      for (var s = 0; s < (state.players || []).length; s++) {
        if (s === player.seatIndex) continue;
        var discards = (state.players[s].discards || []);
        for (var d = 0; d < discards.length; d++) {
          if (Tile().equals(discards[d], tile)) {
            safeFrom.push(state.players[s].name || ('Player ' + (s + 1)));
            break;
          }
        }
      }

      // Warning: dangerous for players who may be tenpai
      var dangerousFor = [];
      for (var p = 0; p < (state.players || []).length; p++) {
        if (p === player.seatIndex) continue;
        var opp = state.players[p];
        if (opp.riichiDeclared || (opp.discards && opp.discards.length >= 12)) {
          var oppDanger = dangerModel.getMaxDanger(idx, p, state.turnCount || 0);
          if (oppDanger > 0.3) {
            dangerousFor.push(opp.name || ('Player ' + (p + 1)));
          }
        }
      }

      // Scoring path
      var scoringPath = '';
      if (AIE().estimateHandValue) {
        var val = AIE().estimateHandValue(compact, hand.melds, player.seatWind, state.roundWind);
        if (val > 0) scoringPath = 'Estimated hand value: ' + val + ' pts';
      }

      var info = {
        tileId: id,
        shantenAfter: sh,
        ukeireAfter: uk.total,
        danger: danger,
        dangerPercent: (danger * 100).toFixed(0),
        safeFrom: safeFrom,
        dangerousFor: dangerousFor,
        scoringPath: scoringPath,
        lines: []
      };

      info.lines.push('If you discard this: shanten=' + sh + ', useful draws=' + uk.total + ', danger=' + info.dangerPercent + '%');
      if (scoringPath) info.lines.push(scoringPath);
      if (safeFrom.length > 0) info.lines.push('This tile is safe from: ' + safeFrom.join(', '));
      if (dangerousFor.length > 0) info.lines.push('Warning: dangerous for ' + dangerousFor.join(', ') + ' who may be tenpai');

      return info;
    }

    renderTileTooltip(info, anchorEl) {
      if (typeof document === 'undefined' || !info) return;
      this.hideTileTooltip();
      var tip = el('div', 'mj-overlay-tooltip');
      for (var i = 0; i < info.lines.length; i++) {
        var row = el('div', 'row');
        if (info.lines[i].indexOf('Warning') === 0) {
          row.className = 'row warn';
        } else if (info.lines[i].indexOf('safe') !== -1) {
          row.className = 'row good';
        }
        row.textContent = info.lines[i];
        tip.appendChild(row);
      }
      if (anchorEl) {
        anchorEl.style.position = 'relative';
        anchorEl.appendChild(tip);
      }
      this._tooltipEl = tip;
    }

    hideTileTooltip() {
      if (this._tooltipEl) {
        this._tooltipEl.remove();
        this._tooltipEl = null;
      }
    }

    // ---- Hand decomposition --------------------------------------------------

    showHandDecomposition(player) {
      var result = decomposeHand(player.hand);
      // Build a flat map: tile index -> group type for DOM highlighting
      var tileAnnotations = {};
      var allGroups = result.groups.concat(result.potentials, result.isolated);
      for (var g = 0; g < allGroups.length; g++) {
        var grp = allGroups[g];
        for (var t = 0; t < grp.tiles.length; t++) {
          var id = Tile().getId(grp.tiles[t]);
          tileAnnotations[id] = grp.type;
        }
      }
      result.tileAnnotations = tileAnnotations;
      return result;
    }

    applyDecompositionToDOM(decomp, tileElements) {
      if (typeof document === 'undefined' || !decomp) return;
      var classMap = {
        sequence: 'mj-overlay-decomp-seq',
        triplet: 'mj-overlay-decomp-triplet',
        pair: 'mj-overlay-decomp-pair',
        isolated: 'mj-overlay-decomp-isolated',
        potential: 'mj-overlay-decomp-potential'
      };
      for (var id in decomp.tileAnnotations) {
        var cls = classMap[decomp.tileAnnotations[id]];
        if (!cls) continue;
        var elems = tileElements[id];
        if (!elems) continue;
        var targets = Array.isArray(elems) ? elems : [elems];
        for (var t = 0; t < targets.length; t++) {
          targets[t].classList.add(cls);
        }
      }
    }

    // ---- Toggle UI -----------------------------------------------------------

    buildOverlayToggleUI() {
      if (typeof document === 'undefined') return null;
      if (this._toggleBtn) return this._toggleBtn;
      var self = this;
      var btn = el('button', 'mj-overlay-toggle', 'Overlay: ' + this.mode);
      btn.addEventListener('click', function () {
        self.cycleMode();
      });
      document.body.appendChild(btn);
      this._toggleBtn = btn;
      return btn;
    }

    // ---- Cleanup -------------------------------------------------------------

    _clearOverlays() {
      if (this._winProbEl) { this._winProbEl.remove(); this._winProbEl = null; }
      this.hideTileTooltip();
      if (typeof document === 'undefined') return;
      var classes = [
        'mj-overlay-glow-green', 'mj-overlay-glow-yellow', 'mj-overlay-glow-red',
        'mj-overlay-decomp-seq', 'mj-overlay-decomp-pair', 'mj-overlay-decomp-triplet',
        'mj-overlay-decomp-isolated', 'mj-overlay-decomp-potential'
      ];
      var els = document.querySelectorAll('.mj-overlay-tile');
      for (var i = 0; i < els.length; i++) {
        for (var c = 0; c < classes.length; c++) {
          els[i].classList.remove(classes[c]);
        }
        var badges = els[i].querySelectorAll('.mj-overlay-ukeire, .mj-overlay-danger-bar');
        for (var b = 0; b < badges.length; b++) badges[b].remove();
        els[i].classList.remove('mj-overlay-tile');
      }
    }

    destroy() {
      this._clearOverlays();
      if (this._toggleBtn) { this._toggleBtn.remove(); this._toggleBtn = null; }
      if (typeof document !== 'undefined') {
        var style = document.getElementById(STYLE_ID);
        if (style) style.remove();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  root.MJ.TeachingOverlay = Object.freeze({
    TeachingOverlay: TeachingOverlay,
    OVERLAY_MODES: OVERLAY_MODES,
    estimateWinProbability: estimateWinProbability,
    decomposeHand: decomposeHand
  });
  if (typeof console !== 'undefined') console.log('[Mahjong] TeachingOverlay module loaded');
})(typeof window !== 'undefined' ? window : global);
