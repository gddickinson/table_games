/**
 * scoring-preview.js — Preview potential scores when tenpai
 * For each waiting tile, simulates adding it to the hand and calculates
 * the resulting score using the full scoring engine.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  const Tile = () => root.MJ.Tile;
  const Hand = () => root.MJ.Hand;
  const AIE = () => root.MJ.AIEngine;
  const Scoring = () => root.MJ.Scoring;

  /**
   * Preview scores for all waiting tiles when tenpai.
   * @param {object} player - Player with hand, seatWind, riichi, flowerTiles, isDealer
   * @param {object} state  - Game state with players, roundWind
   * @returns {Array<{waitTile, score, breakdown, remaining}>} sorted by score desc
   */
  function previewScores(player, state) {
    const hand = player.hand;
    const compact = AIE().handToCompact(hand);
    const meldCount = hand.melds.length;

    // Build tracker
    const tracker = new (AIE().TileTracker)();
    tracker.buildFromState(state, player.seatIndex);

    // Check we are tenpai
    const shanten = AIE().calcShantenCompact(new Uint8Array(compact), meldCount);
    if (shanten !== 0) {
      return [];
    }

    // Get waiting tiles
    const ukeire = AIE().calcUkeire(new Uint8Array(compact), meldCount, tracker);
    if (ukeire.tiles.length === 0) {
      return [];
    }

    const isConcealed = hand.melds.length === 0 || hand.melds.every(function (m) { return !m.open; });
    const flowerCount = player.flowerTiles ? player.flowerTiles.length : 0;
    const results = [];

    for (const wait of ukeire.tiles) {
      const waitTileDef = AIE().indexToTileDef(wait.idx);
      const waitTile = Tile().create(waitTileDef.suit, waitTileDef.rank);

      // Get winning decompositions with this tile added
      const decompositions = Hand().getWinningDecompositions(hand, waitTile);
      if (decompositions.length === 0) continue;

      // Score each decomposition for both ron and tsumo, take the best
      let bestScore = 0;
      let bestBreakdown = [];
      let bestSelfDrawn = false;

      for (const decomp of decompositions) {
        // Try ron (selfDrawn = false)
        const ronCtx = buildContext(player, state, waitTile, false, isConcealed, flowerCount);
        const ronResult = Scoring().calculateScore(decomp, ronCtx);

        if (ronResult.total > bestScore) {
          bestScore = ronResult.total;
          bestBreakdown = ronResult.breakdown;
          bestSelfDrawn = false;
        }

        // Try tsumo (selfDrawn = true)
        const tsumoCtx = buildContext(player, state, waitTile, true, isConcealed, flowerCount);
        const tsumoResult = Scoring().calculateScore(decomp, tsumoCtx);

        if (tsumoResult.total > bestScore) {
          bestScore = tsumoResult.total;
          bestBreakdown = tsumoResult.breakdown;
          bestSelfDrawn = true;
        }
      }

      results.push({
        waitTile: { suit: waitTileDef.suit, rank: waitTileDef.rank },
        score: bestScore,
        breakdown: bestBreakdown.map(function (b) {
          return { name: b.name, points: b.points };
        }),
        remaining: wait.count,
        selfDrawn: bestSelfDrawn
      });
    }

    // Sort by score descending, then by remaining count descending
    results.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return b.remaining - a.remaining;
    });

    return results;
  }

  /**
   * Build scoring context object.
   */
  function buildContext(player, state, lastTile, selfDrawn, isConcealed, flowerCount) {
    return {
      seatWind: player.seatWind,
      roundWind: state.roundWind,
      selfDrawn: selfDrawn,
      lastTile: lastTile,
      concealed: isConcealed,
      melds: player.hand.melds,
      riichi: player.riichi || false,
      flowerCount: flowerCount,
      isDealer: player.isDealer || false
    };
  }

  /**
   * Get just the highest possible score preview.
   * @param {object} player
   * @param {object} state
   * @returns {{waitTile, score, breakdown, remaining}|null}
   */
  function getBestScore(player, state) {
    const previews = previewScores(player, state);
    return previews.length > 0 ? previews[0] : null;
  }

  /**
   * Get a summary string of score previews for display.
   * @param {object} player
   * @param {object} state
   * @returns {string}
   */
  function getPreviewSummary(player, state) {
    const previews = previewScores(player, state);
    if (previews.length === 0) return 'Not tenpai';

    return previews.map(function (p) {
      var tileName = p.waitTile.rank + ' of ' + p.waitTile.suit;
      var patterns = p.breakdown.map(function (b) { return b.name; }).join(', ');
      return tileName + ': ' + p.score + ' pts (' + p.remaining + ' left) [' + patterns + ']';
    }).join('\n');
  }

  root.MJ.ScoringPreview = Object.freeze({
    previewScores: previewScores,
    getBestScore: getBestScore,
    getPreviewSummary: getPreviewSummary
  });

  if (typeof console !== 'undefined') console.log('[Mahjong] ScoringPreview module loaded');
})(typeof window !== 'undefined' ? window : global);
