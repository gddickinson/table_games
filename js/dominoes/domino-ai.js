/**
 * domino-ai.js - AI with personality-driven play for Block Dominoes
 * Kenji: aggressive, high-pip first, tries to block.
 * Mei: optimal, counts tiles, maximizes future options.
 * Yuki: balanced, occasionally unexpected moves.
 * Exports as root.MJ.Dominoes.AI
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Dominoes = root.MJ.Dominoes || {};

  var Tiles = function() { return root.MJ.Dominoes.Tiles; };

  /**
   * Decide what to play given player hand, game state, and personality.
   * Returns {tileUid, end} or null (pass).
   */
  function decidePlay(playerTiles, gameState, personalityKey, adjustments) {
    var T = Tiles();
    var playable = getPlayableOptions(playerTiles, gameState);
    if (playable.length === 0) return null;

    // Score each option
    var scored = [];
    for (var i = 0; i < playable.length; i++) {
      var opt = playable[i];
      var score = evaluatePlay(opt.tile, opt.end, gameState, playerTiles, personalityKey, adjustments);
      scored.push({ tileUid: opt.tile.uid, end: opt.end, score: score, tile: opt.tile });
    }

    // Sort by score descending
    scored.sort(function(a, b) { return b.score - a.score; });

    // Yuki: occasionally pick a non-optimal move (15% chance)
    if (personalityKey === 'yuki' && scored.length > 1 && Math.random() < 0.15) {
      var randIdx = Math.floor(Math.random() * Math.min(3, scored.length));
      return { tileUid: scored[randIdx].tileUid, end: scored[randIdx].end };
    }

    return { tileUid: scored[0].tileUid, end: scored[0].end };
  }

  /**
   * Get all playable options from a hand given the game state.
   * Returns [{tile, end}]
   */
  function getPlayableOptions(playerTiles, gameState) {
    var T = Tiles();
    var options = [];

    if (!gameState.chain || gameState.chain.length === 0) {
      // First play: any tile, use 'first' end
      for (var i = 0; i < playerTiles.length; i++) {
        options.push({ tile: playerTiles[i], end: 'first' });
      }
      return options;
    }

    for (var j = 0; j < playerTiles.length; j++) {
      var tile = playerTiles[j];
      var canLeft = T.canPlay(tile, gameState.leftEnd);
      var canRight = T.canPlay(tile, gameState.rightEnd);

      if (gameState.leftEnd === gameState.rightEnd) {
        if (canLeft) options.push({ tile: tile, end: 'left' });
      } else {
        if (canLeft) options.push({ tile: tile, end: 'left' });
        if (canRight) options.push({ tile: tile, end: 'right' });
      }
    }
    return options;
  }

  /**
   * Score how good a play is (higher = better).
   */
  function evaluatePlay(tile, end, gameState, hand, personalityKey, adjustments) {
    var T = Tiles();
    var score = 0;
    var pips = T.getTotalPips(tile);
    var isDbl = T.isDouble(tile);

    // --- Base scoring ---

    // Play doubles early (they become unplayable easily)
    if (isDbl) score += 15;

    // High pip tiles score higher (get rid of points)
    score += pips * 1.5;

    // Diversity bonus: after playing this tile, how many unique values remain?
    var remaining = hand.filter(function(t) { return t.uid !== tile.uid; });
    var valuesInHand = {};
    for (var i = 0; i < remaining.length; i++) {
      valuesInHand[remaining[i].high] = true;
      valuesInHand[remaining[i].low] = true;
    }
    var diversityCount = Object.keys(valuesInHand).length;
    score += diversityCount * 2;

    // Future options: does the new end value match other tiles in hand?
    var newEnd = -1;
    if (end === 'first') {
      // Both ends open, doesn't matter as much
      score += 2;
    } else {
      var targetEnd = (end === 'left') ? gameState.leftEnd : gameState.rightEnd;
      newEnd = T.getPlayableEnd(tile, targetEnd);
      // Count tiles in hand that match the new end value
      var matchCount = 0;
      for (var k = 0; k < remaining.length; k++) {
        if (T.canPlay(remaining[k], newEnd)) matchCount++;
      }
      score += matchCount * 3;
    }

    // --- Personality modifiers ---

    if (personalityKey === 'kenji') {
      // Aggressive: prioritize high-pip tiles even more
      score += pips * 2;
      // Blocking: prefer ends that opponents likely can't match
      score += _blockingScore(tile, end, gameState, hand);
    }

    if (personalityKey === 'mei') {
      // Optimal: maximize future options heavily
      if (newEnd >= 0) {
        var futureOpts = 0;
        for (var m = 0; m < remaining.length; m++) {
          if (T.canPlay(remaining[m], newEnd)) futureOpts++;
        }
        score += futureOpts * 5;
      }
      // Count played values to infer opponent weakness
      score += _countingScore(tile, end, gameState);
    }

    if (personalityKey === 'yuki') {
      // Balanced: slight preference for variety
      score += diversityCount * 1;
      // Mild preference for medium-value tiles
      if (pips >= 3 && pips <= 8) score += 3;
    }

    // --- Learning adjustments ---
    if (adjustments) {
      if (adjustments.aggressiveness) {
        score += pips * adjustments.aggressiveness;
      }
      if (adjustments.doublePreference && isDbl) {
        score += adjustments.doublePreference;
      }
    }

    return score;
  }

  /**
   * Blocking score: estimate how much an end value blocks opponents.
   * Higher score means the new end is likely harder for opponents.
   */
  function _blockingScore(tile, end, gameState) {
    if (!gameState.chain || gameState.chain.length < 2) return 0;

    var T = Tiles();
    // Count how many of each value have been played
    var playedCounts = {};
    for (var v = 0; v <= 6; v++) playedCounts[v] = 0;

    for (var i = 0; i < gameState.chain.length; i++) {
      var ct = gameState.chain[i].tile;
      playedCounts[ct.high]++;
      playedCounts[ct.low]++;
    }

    // A value with many tiles already played is harder for opponents
    var targetEnd = (end === 'left') ? gameState.leftEnd : gameState.rightEnd;
    var newEnd = T.getPlayableEnd(tile, targetEnd);
    if (newEnd >= 0 && playedCounts[newEnd] !== undefined) {
      return playedCounts[newEnd] * 2;
    }
    return 0;
  }

  /**
   * Counting score: use played tile info for smarter play.
   */
  function _countingScore(tile, end, gameState) {
    if (!gameState.chain || gameState.chain.length < 3) return 0;

    var T = Tiles();
    // Count appearances of each value in the chain
    var counts = {};
    for (var v = 0; v <= 6; v++) counts[v] = 0;
    for (var i = 0; i < gameState.chain.length; i++) {
      var ct = gameState.chain[i].tile;
      counts[ct.high]++;
      counts[ct.low]++;
    }

    // Prefer creating ends with values that have appeared less (opponents likely have them)
    // Wait, actually we want the OPPOSITE for blocking: prefer values that have appeared more
    var targetEnd = (end === 'left') ? gameState.leftEnd : gameState.rightEnd;
    var newEnd = T.getPlayableEnd(tile, targetEnd);
    if (newEnd >= 0) {
      // More appearances = opponents less likely to have matching tiles
      return counts[newEnd] * 1.5;
    }
    return 0;
  }

  /**
   * For first-play: pick the best starting tile.
   * Prefer highest double, then highest pip tile.
   */
  function decideFirstPlay(playerTiles, personalityKey) {
    var T = Tiles();
    var highestDouble = T.getHighestDouble(playerTiles);
    if (highestDouble) {
      return { tileUid: highestDouble.uid, end: 'first' };
    }
    // Pick highest pip tile
    var best = playerTiles[0];
    for (var i = 1; i < playerTiles.length; i++) {
      if (T.getTotalPips(playerTiles[i]) > T.getTotalPips(best)) {
        best = playerTiles[i];
      }
    }
    return { tileUid: best.uid, end: 'first' };
  }

  root.MJ.Dominoes.AI = Object.freeze({
    decidePlay: decidePlay,
    evaluatePlay: evaluatePlay,
    decideFirstPlay: decideFirstPlay,
    getPlayableOptions: getPlayableOptions
  });

  console.log('[Dominoes] AI module loaded');
})(typeof window !== 'undefined' ? window : global);
