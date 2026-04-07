/**
 * shanten-table.js — Precomputed lookup tables for fast shanten calculation.
 * Generates tables on first call, then caches for subsequent lookups.
 * Uses table-driven decomposition per suit group + honor group.
 */
(function (exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // Cached tables: key -> { mentsu, partial }
  // mentsu = complete sets (triplet or sequence), partial = partial sets (pairs or partial sequences)
  var suitTable = null;   // for suited groups (9 tiles each)
  var honorTable = null;  // for honor group (7 tiles: 4 winds + 3 dragons)
  var tablesReady = false;

  /**
   * Hash a count array into a compact string key.
   */
  function hashCounts(counts, len) {
    var key = 0;
    for (var i = 0; i < len; i++) {
      key = key * 5 + counts[i];
    }
    return key;
  }

  /**
   * Decompose a 9-tile suited group: find max mentsu + partial counts.
   * Uses recursive search with memoization during generation.
   */
  function decomposeSuit(counts) {
    var best = { mentsu: 0, partial: 0 };
    decomposeSuitRec(counts, 0, 0, 0, best);
    return best;
  }

  function decomposeSuitRec(c, idx, mentsu, partial, best) {
    // Prune: even if all remaining tiles form sets, can't beat current best
    if (mentsu + partial > best.mentsu + best.partial ||
        (mentsu + partial === best.mentsu + best.partial && mentsu > best.mentsu)) {
      best.mentsu = mentsu;
      best.partial = partial;
    }
    if (mentsu > best.mentsu ||
        (mentsu === best.mentsu && partial > best.partial)) {
      best.mentsu = mentsu;
      best.partial = partial;
    }

    // Find next non-zero position
    while (idx < 9 && c[idx] === 0) idx++;
    if (idx >= 9) return;

    // Option 1: Triplet (3 of same)
    if (c[idx] >= 3) {
      c[idx] -= 3;
      decomposeSuitRec(c, idx, mentsu + 1, partial, best);
      c[idx] += 3;
    }

    // Option 2: Sequence (consecutive 3)
    if (idx <= 6 && c[idx] >= 1 && c[idx + 1] >= 1 && c[idx + 2] >= 1) {
      c[idx]--; c[idx + 1]--; c[idx + 2]--;
      decomposeSuitRec(c, idx, mentsu + 1, partial, best);
      c[idx]++; c[idx + 1]++; c[idx + 2]++;
    }

    // Option 3: Pair (partial)
    if (c[idx] >= 2) {
      c[idx] -= 2;
      decomposeSuitRec(c, idx, mentsu, partial + 1, best);
      c[idx] += 2;
    }

    // Option 4: Adjacent pair partial (e.g., 4-5)
    if (idx <= 7 && c[idx] >= 1 && c[idx + 1] >= 1) {
      c[idx]--; c[idx + 1]--;
      decomposeSuitRec(c, idx, mentsu, partial + 1, best);
      c[idx]++; c[idx + 1]++;
    }

    // Option 5: Gap pair partial (e.g., 4-6)
    if (idx <= 6 && c[idx] >= 1 && c[idx + 2] >= 1) {
      c[idx]--; c[idx + 2]--;
      decomposeSuitRec(c, idx, mentsu, partial + 1, best);
      c[idx]++; c[idx + 2]++;
    }

    // Option 6: Skip this tile (leave as isolated)
    var saved = c[idx];
    c[idx] = 0;
    decomposeSuitRec(c, idx + 1, mentsu, partial, best);
    c[idx] = saved;
  }

  /**
   * Decompose honor group (no sequences possible, only triplets and pairs).
   */
  function decomposeHonor(counts) {
    var mentsu = 0;
    var partial = 0;
    for (var i = 0; i < 7; i++) {
      if (counts[i] >= 3) {
        mentsu++;
        counts[i] -= 3;
      }
      if (counts[i] >= 2) {
        partial++;
      }
    }
    return { mentsu: mentsu, partial: partial };
  }

  /**
   * Generate all valid count distributions for n tiles with max 4 each,
   * and store their decomposition results.
   */
  function generateTable(numPositions, decomposeFn) {
    var table = {};
    var counts = new Array(numPositions);
    for (var i = 0; i < numPositions; i++) counts[i] = 0;

    function enumerate(pos, remaining) {
      if (pos === numPositions) {
        var copy = counts.slice();
        var key = hashCounts(copy, numPositions);
        var result = decomposeFn(copy);
        // Store best result for this key
        if (!table[key] ||
            result.mentsu > table[key].mentsu ||
            (result.mentsu === table[key].mentsu && result.partial > table[key].partial)) {
          table[key] = { mentsu: result.mentsu, partial: result.partial };
        }
        return;
      }
      var maxHere = Math.min(4, remaining);
      for (var v = 0; v <= maxHere; v++) {
        counts[pos] = v;
        enumerate(pos + 1, remaining - v);
      }
      counts[pos] = 0;
    }

    // Max tiles in a group: 9*4=36 for suits, 7*4=28 for honors
    // But in practice a hand has at most 14 tiles total, so max per group ~14
    // We enumerate all combos up to 14 tiles total for efficiency
    enumerate(0, 14);
    return table;
  }

  /**
   * Build all tables (called once on first use).
   */
  function ensureTables() {
    if (tablesReady) return;

    suitTable = generateTable(9, decomposeSuit);
    honorTable = generateTable(7, function (c) {
      var copy = c.slice();
      return decomposeHonor(copy);
    });

    tablesReady = true;
  }

  /**
   * Fast shanten calculation using precomputed tables.
   * @param {Uint8Array|Array} compact34 - 34-element array of tile counts
   * @param {number} meldCount - number of already-declared melds
   * @returns {number} shanten number (-1 = complete, 0 = tenpai, etc.)
   */
  function fastShanten(compact34, meldCount) {
    ensureTables();

    var needed = 4 - meldCount; // sets still needed
    var bestShanten = 8;

    // Extract suit groups and honor group
    var groups = [
      { counts: Array.prototype.slice.call(compact34, 0, 9), table: suitTable, len: 9 },   // bamboo (offset 0 in constants) OR characters
      { counts: Array.prototype.slice.call(compact34, 9, 18), table: suitTable, len: 9 },  // second suit
      { counts: Array.prototype.slice.call(compact34, 18, 27), table: suitTable, len: 9 }, // third suit
      { counts: Array.prototype.slice.call(compact34, 27, 34), table: honorTable, len: 7 } // honors
    ];

    // Try each possible pair location, or no pair
    // With pair: need (needed) mentsu from remaining, shanten = needed - mentsu - partial (capped)
    // Without pair: need (needed) mentsu + 1 pair, shanten = needed - mentsu + 1 - partial (capped)

    // Look up each group's decomposition
    var groupResults = [];
    for (var g = 0; g < 4; g++) {
      var key = hashCounts(groups[g].counts, groups[g].len);
      var entry = groups[g].table[key];
      groupResults.push(entry || { mentsu: 0, partial: 0 });
    }

    // Combine: total mentsu and partial across all groups
    var totalMentsu = 0;
    var totalPartial = 0;
    for (var i = 0; i < 4; i++) {
      totalMentsu += groupResults[i].mentsu;
      totalPartial += groupResults[i].partial;
    }

    // Cap partials: mentsu + partial <= needed, and we need one pair
    // Shanten without designated pair (pair counted as partial):
    // shanten = (needed - totalMentsu) * 2 - totalPartial - 1
    var usefulPartial = Math.min(totalPartial, needed - totalMentsu);
    if (usefulPartial < 0) usefulPartial = 0;
    bestShanten = (needed - totalMentsu) * 2 - usefulPartial - 1;

    // Also check with no pair bonus (all partials are just partials):
    var noPairShanten = (needed - totalMentsu) * 2 - Math.min(totalPartial, needed - totalMentsu);
    if (noPairShanten < bestShanten) bestShanten = noPairShanten;

    // Clamp
    if (bestShanten < -1) bestShanten = -1;

    return bestShanten;
  }

  root.MJ.ShantenTable = Object.freeze({
    fastShanten: fastShanten,
    ensureTables: ensureTables
  });

  if (typeof console !== 'undefined') console.log('[Mahjong] ShantenTable module loaded');
})(typeof window !== 'undefined' ? window : global);
