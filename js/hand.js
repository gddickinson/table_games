/**
 * hand.js — Hand management, meld detection, and win checking
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const { SUITS, MELD_TYPES } = window.MJ.Constants;
  const Tile = window.MJ.Tile;

  function create() {
    return {
      concealed: [],  // tiles in hand (not melded)
      melds: [],      // open/concealed melds [{type, tiles, open}]
      drawnTile: null  // most recently drawn tile (for highlighting)
    };
  }

  function addTile(hand, tile) {
    hand.concealed.push(tile);
    hand.drawnTile = tile;
  }

  function removeTile(hand, tile) {
    const idx = hand.concealed.findIndex(t => Tile.getId(t) === Tile.getId(tile));
    if (idx >= 0) {
      hand.concealed.splice(idx, 1);
      return true;
    }
    return false;
  }

  function addMeld(hand, meld) {
    hand.melds.push(meld);
  }

  function getTileCount(hand) {
    let count = hand.concealed.length;
    for (const m of hand.melds) {
      count += m.tiles.length;
    }
    return count;
  }

  function findChows(hand, tile) {
    if (!Tile.isSuited(tile)) return [];
    const results = [];
    const concealed = hand.concealed;
    const r = tile.rank;
    const s = tile.suit;

    // tile could be low, middle, or high of sequence
    const patterns = [
      [r, r + 1, r + 2],  // tile is low
      [r - 1, r, r + 1],  // tile is middle
      [r - 2, r - 1, r]   // tile is high
    ];

    for (const pat of patterns) {
      if (pat[0] < 1 || pat[2] > 9) continue;
      const needed = pat.filter(rank => rank !== r);
      const found = [];
      let valid = true;
      for (const rank of needed) {
        const match = concealed.find(t => t.suit === s && t.rank === rank);
        if (!match) { valid = false; break; }
        // Check we haven't used this tile already
        if (found.some(f => Tile.exactEquals(f, match))) {
          const second = concealed.find(t =>
            t.suit === s && t.rank === rank && !Tile.exactEquals(t, match)
          );
          if (!second) { valid = false; break; }
          found.push(second);
        } else {
          found.push(match);
        }
      }
      if (valid) {
        results.push([...found, tile]);
      }
    }

    // Remove duplicate chow patterns
    return deduplicateMelds(results);
  }

  function findPongs(hand, tile) {
    const count = Tile.countById(hand.concealed, tile);
    if (count >= 2) {
      const matches = hand.concealed.filter(t => Tile.getId(t) === Tile.getId(tile));
      return [[matches[0], matches[1], tile]];
    }
    return [];
  }

  function findKongs(hand, tile) {
    const count = Tile.countById(hand.concealed, tile);
    if (count >= 3) {
      const matches = hand.concealed.filter(t => Tile.getId(t) === Tile.getId(tile));
      return [[matches[0], matches[1], matches[2], tile]];
    }
    return [];
  }

  function findConcealedKongs(hand) {
    const counts = {};
    for (const t of hand.concealed) {
      const id = Tile.getId(t);
      if (!counts[id]) counts[id] = [];
      counts[id].push(t);
    }
    const results = [];
    for (const tiles of Object.values(counts)) {
      if (tiles.length === 4) {
        results.push([...tiles]);
      }
    }
    return results;
  }

  function canPromoteToKong(hand, tile) {
    return hand.melds.some(m =>
      m.type === MELD_TYPES.PONG && Tile.getId(m.tiles[0]) === Tile.getId(tile)
    );
  }

  function promoteToKong(hand, tile) {
    const meld = hand.melds.find(m =>
      m.type === MELD_TYPES.PONG && Tile.getId(m.tiles[0]) === Tile.getId(tile)
    );
    if (meld) {
      meld.type = MELD_TYPES.KONG;
      meld.tiles.push(tile);
      removeTile(hand, tile);
      return true;
    }
    return false;
  }

  /**
   * Check if a set of concealed tiles + melds forms a winning hand.
   * Standard win: 4 melds + 1 pair = 14 tiles
   */
  function isWinningHand(hand, extraTile) {
    const tiles = [...hand.concealed];
    if (extraTile) tiles.push(extraTile);
    const meldCount = hand.melds.length;
    const neededSets = 4 - meldCount;
    return canDecompose(Tile.sortTiles(tiles), neededSets);
  }

  /**
   * Recursively check if tiles can form neededSets sets + 1 pair
   */
  function canDecompose(tiles, neededSets) {
    if (tiles.length === 0) return neededSets === 0;
    if (tiles.length === 2 && neededSets === 0) {
      return Tile.equals(tiles[0], tiles[1]);
    }

    // Try extracting a pair first (if we haven't paired yet)
    if (neededSets >= 0) {
      for (let i = 0; i < tiles.length - 1; i++) {
        if (Tile.equals(tiles[i], tiles[i + 1])) {
          // Skip duplicates for this pair choice
          if (i > 0 && Tile.equals(tiles[i], tiles[i - 1])) continue;
          const rest = [...tiles];
          rest.splice(i, 2);
          if (canFormSets(rest, neededSets)) return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if sorted tiles can form exactly n sets (pongs/chows)
   */
  function canFormSets(tiles, n) {
    if (tiles.length === 0) return n === 0;
    if (n <= 0) return false;
    const first = tiles[0];

    // Try pong
    if (tiles.length >= 3 &&
        Tile.equals(tiles[0], tiles[1]) &&
        Tile.equals(tiles[1], tiles[2])) {
      const rest = tiles.slice(3);
      if (canFormSets(rest, n - 1)) return true;
    }

    // Try chow
    if (Tile.isSuited(first)) {
      const second = tiles.find(t => t.suit === first.suit && t.rank === first.rank + 1);
      const third = tiles.find(t => t.suit === first.suit && t.rank === first.rank + 2);
      if (second && third) {
        const rest = [...tiles];
        removeOnce(rest, first);
        removeOnce(rest, second);
        removeOnce(rest, third);
        if (canFormSets(rest, n - 1)) return true;
      }
    }

    return false;
  }

  function removeOnce(arr, tile) {
    const idx = arr.findIndex(t => Tile.equals(t, tile));
    if (idx >= 0) arr.splice(idx, 1);
  }

  function getWinningDecompositions(hand, extraTile) {
    const tiles = Tile.sortTiles([...hand.concealed, ...(extraTile ? [extraTile] : [])]);
    const meldCount = hand.melds.length;
    const neededSets = 4 - meldCount;
    const results = [];
    findDecompositions(tiles, neededSets, [], null, results);
    return results.map(r => ({
      sets: [...hand.melds.map(m => ({ type: m.type, tiles: [...m.tiles] })), ...r.sets],
      pair: r.pair
    }));
  }

  function findDecompositions(tiles, neededSets, sets, pair, results) {
    if (tiles.length === 0 && neededSets === 0 && pair) {
      results.push({ sets: [...sets], pair: [...pair] });
      return;
    }
    if (tiles.length === 2 && neededSets === 0 && !pair) {
      if (Tile.equals(tiles[0], tiles[1])) {
        results.push({ sets: [...sets], pair: [tiles[0], tiles[1]] });
      }
      return;
    }

    // Try pair extraction
    if (!pair) {
      for (let i = 0; i < tiles.length - 1; i++) {
        if (Tile.equals(tiles[i], tiles[i + 1])) {
          if (i > 0 && Tile.equals(tiles[i], tiles[i - 1])) continue;
          const rest = [...tiles];
          rest.splice(i, 2);
          findDecompositions(rest, neededSets, sets, [tiles[i], tiles[i + 1]], results);
        }
      }
    }

    // Try sets from first tile
    if (tiles.length >= 3 && neededSets > 0) {
      const first = tiles[0];
      // Pong
      if (Tile.equals(tiles[0], tiles[1]) && tiles.length >= 3 && Tile.equals(tiles[1], tiles[2])) {
        const rest = tiles.slice(3);
        sets.push({ type: MELD_TYPES.PONG, tiles: [tiles[0], tiles[1], tiles[2]] });
        findDecompositions(rest, neededSets - 1, sets, pair, results);
        sets.pop();
      }
      // Chow
      if (Tile.isSuited(first)) {
        const si = tiles.findIndex(t => t.suit === first.suit && t.rank === first.rank + 1);
        const ti = tiles.findIndex(t => t.suit === first.suit && t.rank === first.rank + 2);
        if (si >= 0 && ti >= 0) {
          const rest = [...tiles];
          const t1 = rest.splice(rest.indexOf(tiles[0]), 1)[0];
          const t2 = rest.splice(rest.indexOf(tiles[si > ti ? si - 1 : si]), 1)[0];
          const idx3 = rest.findIndex(t => t.suit === first.suit && t.rank === first.rank + 2);
          const t3 = rest.splice(idx3, 1)[0];
          sets.push({ type: MELD_TYPES.CHOW, tiles: [t1, t2, t3] });
          findDecompositions(rest, neededSets - 1, sets, pair, results);
          sets.pop();
        }
      }
    }
  }

  function deduplicateMelds(melds) {
    const seen = new Set();
    return melds.filter(m => {
      const sorted = Tile.sortTiles(m);
      const key = sorted.map(t => Tile.getId(t)).join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate shanten number (tiles away from tenpai/winning)
   * Returns: 0 = tenpai, -1 = winning, >0 = tiles away
   */
  function calculateShanten(hand) {
    const tiles = Tile.sortTiles([...hand.concealed]);
    const meldCount = hand.melds.length;
    const neededSets = 4 - meldCount;
    let minShanten = 8; // worst case

    // Try all pair candidates
    const seen = new Set();
    for (let i = 0; i < tiles.length; i++) {
      const id = Tile.getId(tiles[i]);
      if (i > 0 && Tile.getId(tiles[i-1]) === id) continue;
      if (seen.has(id)) continue;
      seen.add(id);

      const pair = tiles.filter(t => Tile.getId(t) === id);
      if (pair.length >= 2) {
        const rest = [...tiles];
        removeOnce(rest, pair[0]);
        removeOnce(rest, pair[1]);
        const s = countShantenForSets(Tile.sortTiles(rest), neededSets);
        minShanten = Math.min(minShanten, s);
      }
    }
    // No pair case
    const s = countShantenForSets(tiles, neededSets) + 1;
    minShanten = Math.min(minShanten, s);

    return minShanten - 1; // adjust: -1 = win, 0 = tenpai
  }

  function countShantenForSets(tiles, needed) {
    if (needed === 0) return 0;
    if (tiles.length < 3) return needed * 2;

    let best = needed * 2;
    const first = tiles[0];

    // Try pong
    const same = tiles.filter(t => Tile.equals(t, first));
    if (same.length >= 3) {
      const rest = [...tiles];
      removeOnce(rest, same[0]);
      removeOnce(rest, same[1]);
      removeOnce(rest, same[2]);
      best = Math.min(best, countShantenForSets(rest, needed - 1));
    }
    if (same.length >= 2) {
      const rest = [...tiles];
      removeOnce(rest, same[0]);
      removeOnce(rest, same[1]);
      best = Math.min(best, countShantenForSets(rest, needed - 1) + 1);
    }

    // Try chow
    if (Tile.isSuited(first)) {
      const s2 = tiles.find(t => t.suit === first.suit && t.rank === first.rank + 1);
      const s3 = tiles.find(t => t.suit === first.suit && t.rank === first.rank + 2);
      if (s2 && s3) {
        const rest = [...tiles];
        removeOnce(rest, first);
        removeOnce(rest, s2);
        removeOnce(rest, s3);
        best = Math.min(best, countShantenForSets(rest, needed - 1));
      }
      // Partial sequences
      if (s2) {
        const rest = [...tiles];
        removeOnce(rest, first);
        removeOnce(rest, s2);
        best = Math.min(best, countShantenForSets(rest, needed - 1) + 1);
      }
      if (s3) {
        const rest = [...tiles];
        removeOnce(rest, first);
        removeOnce(rest, s3);
        best = Math.min(best, countShantenForSets(rest, needed - 1) + 1);
      }
    }

    // Skip first tile
    const rest = tiles.slice(1);
    best = Math.min(best, countShantenForSets(rest, needed));

    return best;
  }

  window.MJ.Hand = Object.freeze({
    create, addTile, removeTile, addMeld, getTileCount,
    findChows, findPongs, findKongs, findConcealedKongs,
    canPromoteToKong, promoteToKong,
    isWinningHand, getWinningDecompositions,
    calculateShanten
  });

  console.log('[Mahjong] Hand module loaded');
})();
