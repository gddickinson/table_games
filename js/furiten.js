/**
 * furiten.js — Furiten detection for Mahjong
 * Detects when a player is waiting on a tile they already discarded,
 * or when they passed on an opponent's discard of a wait tile (temporary furiten).
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  const Tile = () => root.MJ.Tile;
  const Hand = () => root.MJ.Hand;
  const AIE = () => root.MJ.AIEngine;

  /**
   * Check whether the player is in furiten.
   * @param {object} player - Player object with hand, discards, seatIndex
   * @param {object} state  - Game state with players, lastDiscard, turnCount
   * @returns {{isFuriten: boolean, furitenTiles: Array<{suit,rank}>, reason: string}}
   */
  function checkFuriten(player, state) {
    const hand = player.hand;
    const compact = AIE().handToCompact(hand);
    const meldCount = hand.melds.length;

    // Build tracker for remaining tile counts
    const tracker = new (AIE().TileTracker)();
    tracker.buildFromState(state, player.seatIndex);

    // Check shanten — furiten only matters at tenpai (shanten === 0)
    const shanten = AIE().calcShantenCompact(new Uint8Array(compact), meldCount);
    if (shanten !== 0) {
      return { isFuriten: false, furitenTiles: [], reason: 'Not tenpai' };
    }

    // Get waiting tiles via ukeire
    const ukeire = AIE().calcUkeire(new Uint8Array(compact), meldCount, tracker);
    const waitIndices = ukeire.tiles.map(t => t.idx);

    if (waitIndices.length === 0) {
      return { isFuriten: false, furitenTiles: [], reason: 'No waiting tiles' };
    }

    // Build a set of tile indices the player has discarded
    const discardIndices = new Set();
    for (const t of player.discards) {
      const idx = AIE().tileToIndex(t);
      if (idx >= 0) discardIndices.add(idx);
    }

    // Check permanent furiten: wait tile appears in own discards
    const permanentFuritenTiles = [];
    for (const waitIdx of waitIndices) {
      if (discardIndices.has(waitIdx)) {
        permanentFuritenTiles.push(AIE().indexToTileDef(waitIdx));
      }
    }

    if (permanentFuritenTiles.length > 0) {
      return {
        isFuriten: true,
        furitenTiles: permanentFuritenTiles,
        reason: 'You discarded a tile you are waiting on (permanent furiten)'
      };
    }

    // Check temporary furiten: an opponent just discarded a wait tile and player passed
    const temporaryFuritenTiles = [];
    if (state.lastDiscard && state.lastDiscard.playerIndex !== player.seatIndex) {
      const lastDiscardIdx = AIE().tileToIndex(state.lastDiscard);
      if (waitIndices.indexOf(lastDiscardIdx) >= 0) {
        temporaryFuritenTiles.push(AIE().indexToTileDef(lastDiscardIdx));
      }
    }

    if (temporaryFuritenTiles.length > 0) {
      return {
        isFuriten: true,
        furitenTiles: temporaryFuritenTiles,
        reason: 'An opponent discarded your wait tile and you passed (temporary furiten)'
      };
    }

    // Check extended temporary furiten: any opponent discarded a wait tile
    // since our last discard turn (we passed on it)
    const extendedFuritenTiles = [];
    for (let p = 0; p < 4; p++) {
      if (p === player.seatIndex) continue;
      const oppDiscards = state.players[p].discards;
      for (const disc of oppDiscards) {
        const idx = AIE().tileToIndex(disc);
        if (waitIndices.indexOf(idx) >= 0) {
          const tileDef = AIE().indexToTileDef(idx);
          // Avoid duplicates
          if (!extendedFuritenTiles.some(t => t.suit === tileDef.suit && t.rank === tileDef.rank)) {
            extendedFuritenTiles.push(tileDef);
          }
        }
      }
    }

    if (extendedFuritenTiles.length > 0) {
      return {
        isFuriten: true,
        furitenTiles: extendedFuritenTiles,
        reason: 'An opponent previously discarded your wait tile and you did not claim it (furiten)'
      };
    }

    return { isFuriten: false, furitenTiles: [], reason: 'Not furiten' };
  }

  root.MJ.Furiten = Object.freeze({ checkFuriten });

  if (typeof console !== 'undefined') console.log('[Mahjong] Furiten module loaded');
})(typeof window !== 'undefined' ? window : global);
