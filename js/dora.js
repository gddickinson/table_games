/**
 * dora.js — Dora (bonus tile) indicator system
 * The dora indicator is a tile from the dead wall; the "next" tile
 * in the suit/rank sequence is the actual dora (bonus tile).
 */
(function (exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  var SUITS = root.MJ.Constants.SUITS;

  /**
   * Given an indicator tile, return the dora tile.
   * Suited tiles: rank wraps 9 -> 1.
   * Winds: East -> South -> West -> North -> East (ranks 1-4).
   * Dragons: Red -> Green -> White -> Red (ranks 1-3).
   */
  function getDoraFromIndicator(tile) {
    if (!tile || !tile.suit) return null;
    var suit = tile.suit;
    var rank = tile.rank;

    if (suit === SUITS.BAMBOO || suit === SUITS.CIRCLES || suit === SUITS.CHARACTERS) {
      // Suited: 1-9, wraps 9->1
      var nextRank = (rank % 9) + 1;
      return { suit: suit, rank: nextRank };
    }
    if (suit === SUITS.WIND) {
      // Wind ranks: 1=East, 2=South, 3=West, 4=North, wraps 4->1
      var nextWind = (rank % 4) + 1;
      return { suit: suit, rank: nextWind };
    }
    if (suit === SUITS.DRAGON) {
      // Dragon ranks: 1=Red, 2=Green, 3=White, wraps 3->1
      var nextDragon = (rank % 3) + 1;
      return { suit: suit, rank: nextDragon };
    }
    // Flowers or unknown — no dora
    return null;
  }

  /**
   * Check if two tile definitions match (same suit and rank).
   */
  function tileMatches(a, b) {
    return a && b && a.suit === b.suit && a.rank === b.rank;
  }

  /**
   * Count how many dora tiles are present in a hand (concealed tiles) + melds,
   * given one or more dora indicators.
   * @param {Array} hand - array of tile objects (concealed tiles)
   * @param {Array} melds - array of meld objects, each with a .tiles array
   * @param {Array} indicators - array of indicator tile objects
   * @returns {number} total dora count
   */
  function countDora(hand, melds, indicators) {
    if (!indicators || indicators.length === 0) return 0;

    // Compute the actual dora tiles from indicators
    var doraTiles = [];
    for (var i = 0; i < indicators.length; i++) {
      var dora = getDoraFromIndicator(indicators[i]);
      if (dora) doraTiles.push(dora);
    }
    if (doraTiles.length === 0) return 0;

    var count = 0;

    // Count in concealed hand
    if (hand && hand.length > 0) {
      for (var h = 0; h < hand.length; h++) {
        for (var d = 0; d < doraTiles.length; d++) {
          if (tileMatches(hand[h], doraTiles[d])) {
            count++;
          }
        }
      }
    }

    // Count in melds
    if (melds && melds.length > 0) {
      for (var m = 0; m < melds.length; m++) {
        var meldTiles = melds[m].tiles;
        if (!meldTiles) continue;
        for (var t = 0; t < meldTiles.length; t++) {
          for (var d2 = 0; d2 < doraTiles.length; d2++) {
            if (tileMatches(meldTiles[t], doraTiles[d2])) {
              count++;
            }
          }
        }
      }
    }

    return count;
  }

  /**
   * Select initial dora indicator position(s) from the dead wall.
   * Standard position: 5th tile from the end of the wall.
   * @param {Object} wall - the wall object with .tiles array
   * @returns {Array} array of indicator tiles
   */
  function selectIndicators(wall) {
    if (!wall || !wall.tiles || wall.tiles.length === 0) return [];

    // Standard: the 5th tile from the end is the first dora indicator
    var pos = wall.tiles.length - 5;
    if (pos < 0) pos = 0;

    var indicator = wall.tiles[pos];
    return indicator ? [indicator] : [];
  }

  root.MJ.Dora = Object.freeze({
    getDoraFromIndicator: getDoraFromIndicator,
    countDora: countDora,
    selectIndicators: selectIndicators
  });

  if (typeof console !== 'undefined') console.log('[Mahjong] Dora module loaded');
})(typeof window !== 'undefined' ? window : global);
