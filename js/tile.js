/**
 * tile.js — Tile creation, comparison, and utility functions
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const { SUITS, TILE_SYMBOLS, TILE_NAMES, SUIT_ORDER } = window.MJ.Constants;

  let nextUid = 0;

  function create(suit, rank) {
    return { suit, rank, uid: nextUid++ };
  }

  function clone(tile) {
    return { suit: tile.suit, rank: tile.rank, uid: nextUid++ };
  }

  function equals(a, b) {
    return a.suit === b.suit && a.rank === b.rank;
  }

  function exactEquals(a, b) {
    return a.uid === b.uid;
  }

  function compare(a, b) {
    const ai = SUIT_ORDER.indexOf(a.suit);
    const bi = SUIT_ORDER.indexOf(b.suit);
    if (ai !== bi) return ai - bi;
    return a.rank - b.rank;
  }

  function sortTiles(tiles) {
    return [...tiles].sort(compare);
  }

  function isSuited(tile) {
    return tile.suit === SUITS.BAMBOO ||
           tile.suit === SUITS.CIRCLES ||
           tile.suit === SUITS.CHARACTERS;
  }

  function isHonor(tile) {
    return tile.suit === SUITS.WIND || tile.suit === SUITS.DRAGON;
  }

  function isTerminal(tile) {
    return isSuited(tile) && (tile.rank === 1 || tile.rank === 9);
  }

  function isTerminalOrHonor(tile) {
    return isTerminal(tile) || isHonor(tile);
  }

  function isFlower(tile) {
    return tile.suit === SUITS.FLOWER;
  }

  function getId(tile) {
    return `${tile.suit}-${tile.rank}`;
  }

  function getDisplay(tile) {
    return TILE_SYMBOLS[getId(tile)] || '?';
  }

  function getName(tile) {
    return TILE_NAMES[getId(tile)] || 'Unknown';
  }

  function countById(tiles, tile) {
    const id = getId(tile);
    return tiles.filter(t => getId(t) === id).length;
  }

  function removeFirst(tiles, tile) {
    const idx = tiles.findIndex(t => getId(t) === getId(tile));
    if (idx >= 0) {
      return tiles.splice(idx, 1)[0];
    }
    return null;
  }

  function groupBySuit(tiles) {
    const groups = {};
    for (const t of tiles) {
      if (!groups[t.suit]) groups[t.suit] = [];
      groups[t.suit].push(t);
    }
    return groups;
  }

  window.MJ.Tile = Object.freeze({
    create, clone, equals, exactEquals, compare, sortTiles,
    isSuited, isHonor, isTerminal, isTerminalOrHonor, isFlower,
    getId, getDisplay, getName, countById, removeFirst, groupBySuit
  });

  console.log('[Mahjong] Tile module loaded');
})();
