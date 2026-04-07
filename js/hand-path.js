/**
 * hand-path.js — Detect which scoring patterns the hand is heading toward
 * Analyzes the current hand and returns progress toward various high-scoring patterns,
 * along with estimated points and strategic advice.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  const Tile = () => root.MJ.Tile;
  const Hand = () => root.MJ.Hand;
  const AIE = () => root.MJ.AIEngine;

  // Suit names matching the index layout in ai-engine (0=characters, 1=bamboo, 2=circles)
  const SUIT_NAMES = ['characters', 'bamboo', 'circles'];

  /**
   * Analyze which scoring paths the hand is pursuing.
   * @param {object} player - Player with hand, seatWind, riichi
   * @param {object} state  - Game state with roundWind, players
   * @returns {Array<{pattern, progress, estimatedPoints, advice}>} top 3, sorted by progress desc
   */
  function analyzePath(player, state) {
    const hand = player.hand;
    const compact = AIE().handToCompact(hand);
    const melds = hand.melds;
    const meldCount = melds.length;

    // Gather all tiles (concealed + melds) into a 34-entry count array
    const allTiles = new Uint8Array(34);
    for (let i = 0; i < 34; i++) allTiles[i] = compact[i];
    for (const m of melds) {
      for (const t of m.tiles) {
        const idx = AIE().tileToIndex(t);
        if (idx >= 0) allTiles[idx]++;
      }
    }

    // Count tiles per suit category
    const suitCounts = [0, 0, 0]; // characters, bamboo, circles
    let honorCount = 0;
    let totalTiles = 0;
    for (let i = 0; i < 27; i++) {
      suitCounts[Math.floor(i / 9)] += allTiles[i];
      totalTiles += allTiles[i];
    }
    for (let i = 27; i < 34; i++) {
      honorCount += allTiles[i];
      totalTiles += allTiles[i];
    }

    if (totalTiles === 0) return [];

    const dominantSuitIdx = suitCounts.indexOf(Math.max(...suitCounts));
    const dominantSuitCount = suitCounts[dominantSuitIdx];
    const dominantSuitName = SUIT_NAMES[dominantSuitIdx];

    // Count triplets, pairs, and sequences in concealed hand
    let tripletCount = 0;
    let pairCount = 0;
    for (let i = 0; i < 34; i++) {
      if (compact[i] >= 3) tripletCount++;
      else if (compact[i] >= 2) pairCount++;
    }
    // Add open meld triplets
    for (const m of melds) {
      if (m.type === 'pong' || m.type === 'kong' || m.type === 'concealed_kong') {
        tripletCount++;
      }
    }

    // Dragon analysis
    let dragonPongs = 0;
    let dragonPairs = 0;
    let dragonTotal = 0;
    for (let i = 31; i < 34; i++) {
      dragonTotal += allTiles[i];
      if (allTiles[i] >= 3) dragonPongs++;
      else if (allTiles[i] >= 2) dragonPairs++;
    }

    // Wind analysis
    let windPongs = 0;
    let windPairs = 0;
    let windTotal = 0;
    for (let i = 27; i < 31; i++) {
      windTotal += allTiles[i];
      if (allTiles[i] >= 3) windPongs++;
      else if (allTiles[i] >= 2) windPairs++;
    }

    // Terminal + honor analysis
    let termHonorCount = 0;
    for (let i = 0; i < 34; i++) {
      if (allTiles[i] > 0) {
        if (i >= 27) {
          // honor
          termHonorCount += allTiles[i];
        } else if ((i % 9) === 0 || (i % 9) === 8) {
          // terminal (rank 1 or 9)
          termHonorCount += allTiles[i];
        }
      }
    }

    // Concealed status
    const isConcealed = melds.length === 0 || melds.every(function (m) { return !m.open; });

    // Shanten check for riichi readiness
    const shanten = AIE().calcShantenCompact(new Uint8Array(compact), meldCount);

    var paths = [];

    // --- Pure Flush ---
    var pureFlushPct = totalTiles > 0 ? (dominantSuitCount / totalTiles) * 100 : 0;
    if (honorCount === 0) {
      // True pure flush potential
      pureFlushPct = Math.min(100, pureFlushPct);
    } else {
      // Penalize if honors present — would need to discard them all
      pureFlushPct = Math.max(0, pureFlushPct - (honorCount * 8));
    }
    if (dominantSuitCount >= 7) {
      paths.push({
        pattern: 'Pure Flush (Qing Yi Se)',
        progress: Math.round(Math.min(100, pureFlushPct)),
        estimatedPoints: 50,
        advice: 'Discard tiles from other suits. Focus on ' + dominantSuitName + '.'
      });
    }

    // --- Mixed Flush ---
    if (dominantSuitCount >= 6 && honorCount >= 1) {
      var otherSuitCount = totalTiles - dominantSuitCount - honorCount;
      var mixedPct = Math.round(Math.min(100, ((dominantSuitCount + honorCount) / totalTiles) * 100));
      if (otherSuitCount <= 3) {
        paths.push({
          pattern: 'Mixed Flush (Hun Yi Se)',
          progress: mixedPct,
          estimatedPoints: 25,
          advice: 'Keep ' + dominantSuitName + ' and honor tiles. Discard other suits.'
        });
      }
    }

    // --- All Triplets ---
    if (tripletCount >= 2) {
      var tripletPct = Math.round(Math.min(100, (tripletCount / 4) * 80 + pairCount * 10));
      paths.push({
        pattern: 'All Triplets (Dui Dui Hu)',
        progress: tripletPct,
        estimatedPoints: 30,
        advice: 'Avoid forming sequences. Collect pairs and triplets instead.'
      });
    }

    // --- Dragon Pong ---
    if (dragonPongs >= 1 || dragonPairs >= 2 || (dragonPongs >= 1 && dragonPairs >= 1)) {
      var dragonPct = 0;
      if (dragonPongs === 3) {
        dragonPct = 100;
      } else if (dragonPongs === 2 && dragonPairs >= 1) {
        dragonPct = 85; // Small Three Dragons territory
      } else if (dragonPongs === 2) {
        dragonPct = 70;
      } else if (dragonPongs === 1 && dragonPairs >= 1) {
        dragonPct = 50;
      } else if (dragonPairs >= 2) {
        dragonPct = 35;
      } else {
        dragonPct = 20;
      }
      var dragonEst = dragonPongs === 3 ? 88 : (dragonPongs === 2 ? 40 : 10 * dragonPongs);
      var dragonAdvice = dragonPongs >= 2
        ? 'Hold all dragon tiles. You are building toward Big/Small Three Dragons!'
        : 'Keep dragon pairs and try to form pongs. Each dragon pong is worth 10 points.';
      paths.push({
        pattern: dragonPongs >= 2 ? 'Three Dragons' : 'Dragon Pong',
        progress: dragonPct,
        estimatedPoints: dragonEst,
        advice: dragonAdvice
      });
    }

    // --- Wind Collection ---
    if (windPongs >= 1 || windPairs >= 2) {
      var windPct = 0;
      if (windPongs >= 3 && windPairs >= 1) {
        windPct = 95; // Small Four Winds
      } else if (windPongs >= 3) {
        windPct = 80;
      } else if (windPongs >= 2) {
        windPct = 55;
      } else if (windPongs >= 1 && windPairs >= 1) {
        windPct = 35;
      } else {
        windPct = 20;
      }
      var windEst = windPongs >= 3 ? 60 : 10 * windPongs;
      var seatWindIdx = 27 + ['east', 'south', 'west', 'north'].indexOf(player.seatWind);
      var hasSeatWind = allTiles[seatWindIdx] >= 2;
      var windAdvice = windPongs >= 2
        ? 'Keep all wind tiles. Building toward Four Winds pattern!'
        : hasSeatWind
          ? 'You have your seat wind. Try to form a pong for 10 points.'
          : 'Collect wind pongs for seat/round wind bonuses.';
      paths.push({
        pattern: 'Wind Collection',
        progress: windPct,
        estimatedPoints: windEst,
        advice: windAdvice
      });
    }

    // --- All Terminals & Honors ---
    if (totalTiles > 0) {
      var termHonorPct = Math.round((termHonorCount / totalTiles) * 100);
      if (termHonorPct >= 50) {
        paths.push({
          pattern: 'All Terminals & Honors',
          progress: termHonorPct,
          estimatedPoints: 40,
          advice: 'Discard middle tiles (2-8). Keep only 1s, 9s, winds, and dragons.'
        });
      }
    }

    // --- Concealed Hand ---
    if (isConcealed && melds.length === 0) {
      // Progress is inverse of how many tiles we still need
      var concealedPct = Math.round(Math.min(100, Math.max(20, (1 - shanten / 6) * 100)));
      paths.push({
        pattern: 'Concealed Hand',
        progress: concealedPct,
        estimatedPoints: 5,
        advice: 'Do not claim any tiles (chow/pong). Win by self-draw for the concealed bonus.'
      });
    }

    // --- Riichi Ready ---
    if (isConcealed && shanten <= 1) {
      var riichiPct = shanten === 0 ? 100 : 60;
      paths.push({
        pattern: 'Riichi Ready',
        progress: riichiPct,
        estimatedPoints: 10,
        advice: shanten === 0
          ? 'You can declare Riichi now for +10 points! Your hand is closed and tenpai.'
          : 'One tile away from tenpai. Keep the hand closed to enable Riichi.'
      });
    }

    // Sort by progress descending
    paths.sort(function (a, b) { return b.progress - a.progress; });

    // Return top 3
    return paths.slice(0, 3);
  }

  root.MJ.HandPath = Object.freeze({ analyzePath: analyzePath });

  if (typeof console !== 'undefined') console.log('[Mahjong] HandPath module loaded');
})(typeof window !== 'undefined' ? window : global);
