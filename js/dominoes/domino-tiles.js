/**
 * domino-tiles.js - Domino tile definitions and utilities
 * Double-six set: 28 tiles, each with two values 0-6.
 * Exports as root.MJ.Dominoes.Tiles
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Dominoes = root.MJ.Dominoes || {};

  var uidCounter = 0;

  /**
   * DominoTile class: high >= low always.
   */
  function DominoTile(a, b) {
    this.high = Math.max(a, b);
    this.low = Math.min(a, b);
    this.uid = 'D' + (uidCounter++);
  }

  DominoTile.prototype.toString = function() {
    return '[' + this.low + '|' + this.high + ']';
  };

  /**
   * Create the full double-six set (28 tiles).
   */
  function createSet() {
    uidCounter = 0;
    var tiles = [];
    for (var i = 0; i <= 6; i++) {
      for (var j = i; j <= 6; j++) {
        tiles.push(new DominoTile(i, j));
      }
    }
    return tiles;
  }

  /**
   * Fisher-Yates shuffle (in-place, returns array).
   */
  function shuffle(tiles) {
    var arr = tiles.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /**
   * Check if tile has a matching end for the given value.
   */
  function canPlay(tile, endValue) {
    return tile.high === endValue || tile.low === endValue;
  }

  /**
   * Returns which end of the tile connects to endValue.
   * Returns the OTHER end value (the one that will become the new chain end).
   * Returns -1 if no match.
   */
  function getPlayableEnd(tile, endValue) {
    if (tile.low === endValue) return tile.high;
    if (tile.high === endValue) return tile.low;
    return -1;
  }

  /**
   * Is this tile a double (both ends same value)?
   */
  function isDouble(tile) {
    return tile.high === tile.low;
  }

  /**
   * Sum of both ends (total pip count).
   */
  function getTotalPips(tile) {
    return tile.high + tile.low;
  }

  /**
   * Text display like "[3|5]".
   */
  function getDisplay(tile) {
    return '[' + tile.low + '|' + tile.high + ']';
  }

  /**
   * Find a tile in an array by uid.
   */
  function findByUid(tiles, uid) {
    for (var i = 0; i < tiles.length; i++) {
      if (tiles[i].uid === uid) return tiles[i];
    }
    return null;
  }

  /**
   * Remove a tile from an array by uid (returns new array).
   */
  function removeByUid(tiles, uid) {
    return tiles.filter(function(t) { return t.uid !== uid; });
  }

  /**
   * Get the highest double in a set of tiles, or null if none.
   */
  function getHighestDouble(tiles) {
    var best = null;
    for (var i = 0; i < tiles.length; i++) {
      if (isDouble(tiles[i])) {
        if (!best || tiles[i].high > best.high) {
          best = tiles[i];
        }
      }
    }
    return best;
  }

  root.MJ.Dominoes.Tiles = Object.freeze({
    DominoTile: DominoTile,
    createSet: createSet,
    shuffle: shuffle,
    canPlay: canPlay,
    getPlayableEnd: getPlayableEnd,
    isDouble: isDouble,
    getTotalPips: getTotalPips,
    getDisplay: getDisplay,
    findByUid: findByUid,
    removeByUid: removeByUid,
    getHighestDouble: getHighestDouble
  });

  console.log('[Dominoes] Tiles module loaded');
})(typeof window !== 'undefined' ? window : global);
