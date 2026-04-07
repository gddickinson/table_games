/**
 * hand-history.js — Personal hand encyclopedia
 * Stores every winning hand with decomposition, provides search/stats/UI.
 * Exports: root.MJ.HandHistory
 */
(function (exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── Constants ────────────────────────────────────────────────────

  var STORAGE_KEY = 'mj_hand_history';
  var MAX_ENTRIES = 500;

  // ── Tile encoding ────────────────────────────────────────────────
  // Compact representation: suit letter + rank
  //   b1 = bamboo 1, c5 = circles 5, m9 = characters 9
  //   we = east wind, ws = south wind, ww = west wind, wn = north wind
  //   dr = red dragon, dg = green dragon, dw = white dragon

  var SUIT_LETTER = {
    bamboo: 'b',
    circles: 'c',
    characters: 'm'
  };

  var LETTER_TO_SUIT = {
    b: 'bamboo',
    c: 'circles',
    m: 'characters',
    w: 'wind',
    d: 'dragon'
  };

  var WIND_CODES = { 1: 'e', 2: 's', 3: 'w', 4: 'n' };
  var WIND_DECODE = { e: 1, s: 2, w: 3, n: 4 };

  var DRAGON_CODES = { 1: 'r', 2: 'g', 3: 'w' };
  var DRAGON_DECODE = { r: 1, g: 2, w: 3 };

  /**
   * Encode a single tile object to a 2-char string.
   * @param {{suit:string, rank:number}} tile
   * @returns {string}
   */
  function encodeTile(tile) {
    if (!tile) return '??';
    var suit = tile.suit;
    var rank = tile.rank;

    if (suit === 'bamboo' || suit === 'circles' || suit === 'characters') {
      return SUIT_LETTER[suit] + rank;
    }
    if (suit === 'wind') {
      return 'w' + (WIND_CODES[rank] || rank);
    }
    if (suit === 'dragon') {
      return 'd' + (DRAGON_CODES[rank] || rank);
    }
    return '??';
  }

  /**
   * Decode a 2-char string back to a tile object.
   * @param {string} code
   * @returns {{suit:string, rank:number}}
   */
  function decodeTile(code) {
    if (!code || code.length < 2) return null;
    var suitChar = code[0];
    var rankChar = code[1];

    if (suitChar === 'w') {
      return { suit: 'wind', rank: WIND_DECODE[rankChar] || parseInt(rankChar, 10) };
    }
    if (suitChar === 'd') {
      return { suit: 'dragon', rank: DRAGON_DECODE[rankChar] || parseInt(rankChar, 10) };
    }
    var suit = LETTER_TO_SUIT[suitChar];
    if (!suit) return null;
    return { suit: suit, rank: parseInt(rankChar, 10) };
  }

  /**
   * Encode an array of tiles to a compressed string (e.g., "b1b2b3c5c5").
   */
  function encodeTiles(tiles) {
    if (!tiles || !tiles.length) return '';
    var parts = [];
    for (var i = 0; i < tiles.length; i++) {
      parts.push(encodeTile(tiles[i]));
    }
    return parts.join('');
  }

  /**
   * Decode a compressed tile string back to an array of tile objects.
   */
  function decodeTiles(str) {
    if (!str) return [];
    var tiles = [];
    for (var i = 0; i < str.length; i += 2) {
      var tile = decodeTile(str.substr(i, 2));
      if (tile) tiles.push(tile);
    }
    return tiles;
  }

  /**
   * Encode a meld for storage.
   */
  function encodeMeld(meld) {
    return {
      type: meld.type,
      tiles: encodeTiles(meld.tiles)
    };
  }

  /**
   * Decode a meld from storage.
   */
  function decodeMeld(encoded) {
    return {
      type: encoded.type,
      tiles: decodeTiles(encoded.tiles)
    };
  }

  // ── Storage helpers ──────────────────────────────────────────────

  function loadStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveStorage(entries) {
    try {
      // Prune oldest entries if over the limit
      if (entries.length > MAX_ENTRIES) {
        entries = entries.slice(entries.length - MAX_ENTRIES);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      // localStorage full or unavailable
    }
    return entries;
  }

  // ── HandHistory class ────────────────────────────────────────────

  function HandHistory() {
    this.entries = loadStorage();
  }

  /**
   * Record a winning hand.
   * @param {Object} handData
   * @param {Array}  handData.tiles — array of tile objects in the winning hand
   * @param {Array}  handData.melds — array of meld objects [{type, tiles}]
   * @param {Object} handData.decomposition — the hand decomposition (sets/pair)
   * @param {number} handData.score — total score
   * @param {Array}  handData.breakdown — [{name, points}] of scoring patterns
   * @param {boolean} handData.selfDrawn — was the win by self-draw (tsumo)
   * @param {string} handData.roundWind — current round wind
   * @param {string} handData.seatWind — player's seat wind
   * @param {number} handData.turnCount — how many turns the round lasted
   */
  HandHistory.prototype.recordHand = function (handData) {
    if (!handData || !handData.tiles) return null;

    var entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      tiles: encodeTiles(handData.tiles),
      melds: (handData.melds || []).map(encodeMeld),
      decomposition: this._encodeDecomposition(handData.decomposition),
      score: handData.score || 0,
      breakdown: (handData.breakdown || []).map(function (b) {
        return { name: b.name, points: b.points };
      }),
      selfDrawn: !!handData.selfDrawn,
      roundWind: handData.roundWind || 'east',
      seatWind: handData.seatWind || 'east',
      turnCount: handData.turnCount || 0
    };

    this.entries.push(entry);
    this.entries = saveStorage(this.entries);
    return entry;
  };

  /**
   * Encode decomposition (sets + pair) for compact storage.
   */
  HandHistory.prototype._encodeDecomposition = function (decomp) {
    if (!decomp) return null;
    var encoded = { sets: [] };
    if (decomp.sets) {
      for (var i = 0; i < decomp.sets.length; i++) {
        var s = decomp.sets[i];
        encoded.sets.push({
          type: s.type,
          tiles: encodeTiles(s.tiles)
        });
      }
    }
    return encoded;
  };

  /**
   * Decode a stored decomposition back to full tile objects.
   */
  HandHistory.prototype._decodeDecomposition = function (encoded) {
    if (!encoded) return null;
    var decoded = { sets: [] };
    if (encoded.sets) {
      for (var i = 0; i < encoded.sets.length; i++) {
        var s = encoded.sets[i];
        decoded.sets.push({
          type: s.type,
          tiles: decodeTiles(s.tiles)
        });
      }
    }
    return decoded;
  };

  /**
   * Decode a stored entry back to full tile objects (for display).
   */
  HandHistory.prototype._decodeEntry = function (entry) {
    return {
      id: entry.id,
      timestamp: entry.timestamp,
      tiles: decodeTiles(entry.tiles),
      melds: (entry.melds || []).map(decodeMeld),
      decomposition: this._decodeDecomposition(entry.decomposition),
      score: entry.score,
      breakdown: entry.breakdown,
      selfDrawn: entry.selfDrawn,
      roundWind: entry.roundWind,
      seatWind: entry.seatWind,
      turnCount: entry.turnCount
    };
  };

  /**
   * Get hand history with optional filters.
   * @param {Object} filters
   * @param {number} filters.minScore
   * @param {number} filters.maxScore
   * @param {string} filters.pattern — name of a scoring pattern to require
   * @param {string} filters.suit — 'bamboo'|'circles'|'characters'|'wind'|'dragon'
   * @param {Object} filters.dateRange — {from: timestamp, to: timestamp}
   * @returns {Array}
   */
  HandHistory.prototype.getHistory = function (filters) {
    filters = filters || {};
    var results = [];

    for (var i = 0; i < this.entries.length; i++) {
      var entry = this.entries[i];
      var dominated = false;

      // Score filters
      if (filters.minScore !== undefined && entry.score < filters.minScore) continue;
      if (filters.maxScore !== undefined && entry.score > filters.maxScore) continue;

      // Date range filter
      if (filters.dateRange) {
        if (filters.dateRange.from && entry.timestamp < filters.dateRange.from) continue;
        if (filters.dateRange.to && entry.timestamp > filters.dateRange.to) continue;
      }

      // Pattern filter
      if (filters.pattern) {
        var found = false;
        var patLower = filters.pattern.toLowerCase();
        if (entry.breakdown) {
          for (var b = 0; b < entry.breakdown.length; b++) {
            if (entry.breakdown[b].name.toLowerCase().indexOf(patLower) !== -1) {
              found = true;
              break;
            }
          }
        }
        if (!found) continue;
      }

      // Suit filter — at least one tile in the hand is of this suit
      if (filters.suit) {
        var suitLetter = SUIT_LETTER[filters.suit];
        if (suitLetter) {
          if (entry.tiles.indexOf(suitLetter) === -1) continue;
        } else {
          // wind or dragon
          var prefix = filters.suit === 'wind' ? 'w' : (filters.suit === 'dragon' ? 'd' : '');
          if (prefix && entry.tiles.indexOf(prefix) === -1) continue;
        }
      }

      results.push(this._decodeEntry(entry));
    }

    // Sort by timestamp descending (most recent first)
    results.sort(function (a, b) { return b.timestamp - a.timestamp; });
    return results;
  };

  /**
   * Compute aggregate statistics across all recorded hands.
   */
  HandHistory.prototype.getStatistics = function () {
    var total = this.entries.length;
    if (total === 0) {
      return {
        totalHands: 0,
        avgScore: 0,
        highestScore: 0,
        mostCommonPattern: null,
        patternCounts: {},
        suitDistribution: {},
        selfDrawRate: 0
      };
    }

    var sumScore = 0;
    var highest = 0;
    var selfDrawCount = 0;
    var patternCounts = {};
    var suitCounts = { bamboo: 0, circles: 0, characters: 0, wind: 0, dragon: 0 };

    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      sumScore += e.score;
      if (e.score > highest) highest = e.score;
      if (e.selfDrawn) selfDrawCount++;

      // Count patterns
      if (e.breakdown) {
        for (var b = 0; b < e.breakdown.length; b++) {
          var pName = e.breakdown[b].name;
          patternCounts[pName] = (patternCounts[pName] || 0) + 1;
        }
      }

      // Count suit usage from encoded tile string
      var tiles = e.tiles || '';
      for (var t = 0; t < tiles.length; t += 2) {
        var ch = tiles[t];
        if (ch === 'b') suitCounts.bamboo++;
        else if (ch === 'c') suitCounts.circles++;
        else if (ch === 'm') suitCounts.characters++;
        else if (ch === 'w') suitCounts.wind++;
        else if (ch === 'd') suitCounts.dragon++;
      }
    }

    // Find most common pattern
    var mostCommon = null;
    var mostCount = 0;
    var pKeys = Object.keys(patternCounts);
    for (var p = 0; p < pKeys.length; p++) {
      if (patternCounts[pKeys[p]] > mostCount) {
        mostCount = patternCounts[pKeys[p]];
        mostCommon = pKeys[p];
      }
    }

    return {
      totalHands: total,
      avgScore: Math.round(sumScore / total * 10) / 10,
      highestScore: highest,
      mostCommonPattern: mostCommon,
      patternCounts: patternCounts,
      suitDistribution: suitCounts,
      selfDrawRate: Math.round(selfDrawCount / total * 1000) / 10 // percentage with 1 decimal
    };
  };

  /**
   * Search for all hands containing a specific scoring pattern.
   * @param {string} patternName
   * @returns {Array}
   */
  HandHistory.prototype.searchByPattern = function (patternName) {
    return this.getHistory({ pattern: patternName });
  };

  /**
   * Return the best hand from today (highest score).
   */
  HandHistory.prototype.getHandOfTheDay = function () {
    var now = new Date();
    var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var endOfDay = startOfDay + 86400000;

    var best = null;
    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      if (e.timestamp >= startOfDay && e.timestamp < endOfDay) {
        if (!best || e.score > best.score) {
          best = e;
        }
      }
    }

    return best ? this._decodeEntry(best) : null;
  };

  /**
   * Export the entire history as a JSON string.
   */
  HandHistory.prototype.exportHistory = function () {
    return JSON.stringify(this.entries, null, 2);
  };

  /**
   * Import history from a JSON string. Merges with existing, deduplicating by id.
   * @param {string} jsonStr
   * @returns {number} number of new entries imported
   */
  HandHistory.prototype.importHistory = function (jsonStr) {
    try {
      var imported = JSON.parse(jsonStr);
      if (!Array.isArray(imported)) return 0;

      var existingIds = {};
      for (var i = 0; i < this.entries.length; i++) {
        existingIds[this.entries[i].id] = true;
      }

      var added = 0;
      for (var j = 0; j < imported.length; j++) {
        var entry = imported[j];
        if (entry && entry.id && !existingIds[entry.id]) {
          this.entries.push(entry);
          existingIds[entry.id] = true;
          added++;
        }
      }

      this.entries = saveStorage(this.entries);
      return added;
    } catch (e) {
      return 0;
    }
  };

  // ── DOM rendering ────────────────────────────────────────────────

  /**
   * Build the hand history viewer UI into a container element.
   * @param {HTMLElement} container
   */
  HandHistory.prototype.buildHistoryUI = function (container) {
    if (!container) return;
    container.innerHTML = '';

    var self = this;
    var currentFilter = { sort: 'date' };

    var wrapper = document.createElement('div');
    wrapper.className = 'hand-history-viewer';
    wrapper.style.cssText = 'font-family:sans-serif; max-width:720px; margin:0 auto;';

    // ── Filter/sort controls ───────────────────────────────
    var controls = document.createElement('div');
    controls.className = 'hh-controls';
    controls.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; align-items:center;';

    // Pattern search
    var patternInput = document.createElement('input');
    patternInput.type = 'text';
    patternInput.placeholder = 'Filter by pattern...';
    patternInput.style.cssText = 'padding:6px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; flex:1; min-width:140px;';

    // Min score
    var minScoreInput = document.createElement('input');
    minScoreInput.type = 'number';
    minScoreInput.placeholder = 'Min score';
    minScoreInput.style.cssText = 'padding:6px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; width:90px;';

    // Sort dropdown
    var sortSelect = document.createElement('select');
    sortSelect.style.cssText = 'padding:6px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px;';
    var sortOpts = [
      { value: 'date', label: 'Newest First' },
      { value: 'score_desc', label: 'Highest Score' },
      { value: 'score_asc', label: 'Lowest Score' }
    ];
    for (var s = 0; s < sortOpts.length; s++) {
      var opt = document.createElement('option');
      opt.value = sortOpts[s].value;
      opt.textContent = sortOpts[s].label;
      sortSelect.appendChild(opt);
    }

    // Apply button
    var applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply';
    applyBtn.style.cssText = 'padding:6px 16px; background:#3498db; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:13px;';

    controls.appendChild(patternInput);
    controls.appendChild(minScoreInput);
    controls.appendChild(sortSelect);
    controls.appendChild(applyBtn);
    wrapper.appendChild(controls);

    // ── Stats summary ──────────────────────────────────────
    var statsDiv = document.createElement('div');
    statsDiv.className = 'hh-stats';
    statsDiv.style.cssText = 'background:#f0f4f8; padding:12px 16px; border-radius:6px; margin-bottom:16px; font-size:13px; color:#555;';
    wrapper.appendChild(statsDiv);

    // ── Scrollable list ────────────────────────────────────
    var listDiv = document.createElement('div');
    listDiv.className = 'hh-list';
    listDiv.style.cssText = 'max-height:480px; overflow-y:auto; border:1px solid #e0e0e0; border-radius:6px;';
    wrapper.appendChild(listDiv);

    container.appendChild(wrapper);

    // ── Render function ────────────────────────────────────
    function render() {
      var filters = {};
      var patternVal = patternInput.value.trim();
      if (patternVal) filters.pattern = patternVal;
      var minVal = parseInt(minScoreInput.value, 10);
      if (!isNaN(minVal)) filters.minScore = minVal;

      var hands = self.getHistory(filters);

      // Sort
      var sortVal = sortSelect.value;
      if (sortVal === 'score_desc') {
        hands.sort(function (a, b) { return b.score - a.score; });
      } else if (sortVal === 'score_asc') {
        hands.sort(function (a, b) { return a.score - b.score; });
      }
      // 'date' is default (already sorted newest first from getHistory)

      // Update stats
      var stats = self.getStatistics();
      statsDiv.innerHTML =
        '<strong>Total Hands:</strong> ' + stats.totalHands +
        ' &nbsp;|&nbsp; <strong>Avg Score:</strong> ' + stats.avgScore +
        ' &nbsp;|&nbsp; <strong>Best:</strong> ' + stats.highestScore +
        ' &nbsp;|&nbsp; <strong>Self-Draw Rate:</strong> ' + stats.selfDrawRate + '%' +
        (stats.mostCommonPattern ? ' &nbsp;|&nbsp; <strong>Top Pattern:</strong> ' + stats.mostCommonPattern : '');

      // Render list
      listDiv.innerHTML = '';
      if (hands.length === 0) {
        var emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'padding:32px; text-align:center; color:#999;';
        emptyMsg.textContent = 'No hands recorded yet.';
        listDiv.appendChild(emptyMsg);
        return;
      }

      for (var i = 0; i < hands.length; i++) {
        var hand = hands[i];
        var item = buildHandItem(hand, i);
        listDiv.appendChild(item);
      }
    }

    function buildHandItem(hand, index) {
      var item = document.createElement('div');
      item.className = 'hh-item';
      item.style.cssText = 'padding:10px 14px; border-bottom:1px solid #eee; cursor:pointer; transition:background 0.15s;';
      if (index % 2 === 1) item.style.background = '#fafafa';

      // Header row
      var header = document.createElement('div');
      header.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';

      var dateSpan = document.createElement('span');
      dateSpan.style.cssText = 'font-size:12px; color:#888;';
      dateSpan.textContent = new Date(hand.timestamp).toLocaleString();

      var scoreSpan = document.createElement('span');
      scoreSpan.style.cssText = 'font-weight:bold; font-size:15px; color:#2c3e50;';
      scoreSpan.textContent = hand.score + ' pts';

      var methodSpan = document.createElement('span');
      methodSpan.style.cssText = 'font-size:11px; padding:2px 6px; border-radius:3px; color:#fff; background:' + (hand.selfDrawn ? '#27ae60' : '#e67e22') + ';';
      methodSpan.textContent = hand.selfDrawn ? 'Tsumo' : 'Ron';

      header.appendChild(dateSpan);
      header.appendChild(methodSpan);
      header.appendChild(scoreSpan);
      item.appendChild(header);

      // Tile display (compact)
      var tileRow = document.createElement('div');
      tileRow.style.cssText = 'margin-top:6px; font-size:13px; font-family:monospace; color:#444; letter-spacing:1px;';
      var tileText = '';
      for (var t = 0; t < hand.tiles.length; t++) {
        tileText += tileToDisplay(hand.tiles[t]);
      }
      tileRow.textContent = tileText;
      item.appendChild(tileRow);

      // Patterns
      if (hand.breakdown && hand.breakdown.length > 0) {
        var patRow = document.createElement('div');
        patRow.style.cssText = 'margin-top:4px; font-size:11px; color:#7f8c8d;';
        var patNames = [];
        for (var p = 0; p < hand.breakdown.length; p++) {
          patNames.push(hand.breakdown[p].name + ' (' + hand.breakdown[p].points + ')');
        }
        patRow.textContent = patNames.join(', ');
        item.appendChild(patRow);
      }

      // Expandable detail section (hidden by default)
      var detail = document.createElement('div');
      detail.className = 'hh-detail';
      detail.style.cssText = 'display:none; margin-top:10px; padding-top:10px; border-top:1px dashed #ddd; font-size:12px; color:#555;';

      var windInfo = document.createElement('div');
      windInfo.textContent = 'Round Wind: ' + (hand.roundWind || '-') + ' | Seat Wind: ' + (hand.seatWind || '-') + ' | Turns: ' + (hand.turnCount || '-');
      detail.appendChild(windInfo);

      // Show melds
      if (hand.melds && hand.melds.length > 0) {
        var meldsDiv = document.createElement('div');
        meldsDiv.style.cssText = 'margin-top:6px;';
        meldsDiv.textContent = 'Melds: ';
        for (var m = 0; m < hand.melds.length; m++) {
          var meld = hand.melds[m];
          var meldTiles = '';
          for (var mt = 0; mt < meld.tiles.length; mt++) {
            meldTiles += tileToDisplay(meld.tiles[mt]);
          }
          meldsDiv.textContent += '[' + meld.type + ': ' + meldTiles + '] ';
        }
        detail.appendChild(meldsDiv);
      }

      // Show decomposition
      if (hand.decomposition && hand.decomposition.sets) {
        var decompDiv = document.createElement('div');
        decompDiv.style.cssText = 'margin-top:6px;';
        decompDiv.textContent = 'Decomposition: ';
        for (var d = 0; d < hand.decomposition.sets.length; d++) {
          var set = hand.decomposition.sets[d];
          var setTiles = '';
          for (var st = 0; st < set.tiles.length; st++) {
            setTiles += tileToDisplay(set.tiles[st]);
          }
          decompDiv.textContent += '[' + set.type + ': ' + setTiles + '] ';
        }
        detail.appendChild(decompDiv);
      }

      item.appendChild(detail);

      // Toggle detail on click
      item.addEventListener('click', function () {
        var isHidden = detail.style.display === 'none';
        detail.style.display = isHidden ? 'block' : 'none';
        item.style.background = isHidden ? '#eef5ff' : (index % 2 === 1 ? '#fafafa' : '');
      });

      return item;
    }

    /**
     * Convert a tile object to a short display string.
     */
    function tileToDisplay(tile) {
      if (!tile) return '?';
      if (tile.suit === 'bamboo') return tile.rank + 'B ';
      if (tile.suit === 'circles') return tile.rank + 'C ';
      if (tile.suit === 'characters') return tile.rank + 'M ';
      if (tile.suit === 'wind') {
        var wNames = { 1: 'E', 2: 'S', 3: 'W', 4: 'N' };
        return (wNames[tile.rank] || '?') + 'w ';
      }
      if (tile.suit === 'dragon') {
        var dNames = { 1: 'R', 2: 'G', 3: 'W' };
        return (dNames[tile.rank] || '?') + 'd ';
      }
      return '? ';
    }

    // Wire up apply button
    applyBtn.addEventListener('click', render);

    // Also trigger on Enter in text fields
    patternInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') render();
    });
    minScoreInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') render();
    });

    // Initial render
    render();
  };

  // ── Export ────────────────────────────────────────────────────────

  root.MJ.HandHistory = {
    HandHistory: HandHistory,
    encodeTile: encodeTile,
    decodeTile: decodeTile,
    encodeTiles: encodeTiles,
    decodeTiles: decodeTiles
  };

})(typeof window !== 'undefined' ? window : global);
