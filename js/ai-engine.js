/**
 * ai-engine.js — Advanced AI: tile tracking, danger model, efficiency calc
 * Improvements: memoized shanten, tedashi tracking, opponent reading,
 * smart kong decisions, dragon pong priority, riichi support.
 * See interfaces.js for API documentation
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  const { SUITS, TILE_DEFS, MELD_TYPES } = root.MJ.Constants;
  const Tile = root.MJ.Tile;
  const Hand = root.MJ.Hand;

  // === Compact tile representation: 34 tile kinds ===
  const SUIT_OFFSETS = { characters: 0, bamboo: 9, circles: 18, wind: 27, dragon: 31 };

  function tileToIndex(tile) {
    const offset = SUIT_OFFSETS[tile.suit];
    return offset !== undefined ? offset + tile.rank - 1 : -1;
  }
  function indexToTileDef(idx) {
    if (idx < 9) return { suit: 'characters', rank: idx + 1 };
    if (idx < 18) return { suit: 'bamboo', rank: idx - 8 };
    if (idx < 27) return { suit: 'circles', rank: idx - 17 };
    if (idx < 31) return { suit: 'wind', rank: idx - 26 };
    return { suit: 'dragon', rank: idx - 30 };
  }
  function isSuitedIndex(idx) { return idx >= 0 && idx < 27; }
  function suitOf(idx) { return Math.floor(idx / 9); }
  function rankOf(idx) { return idx % 9; }
  function isDragonIndex(idx) { return idx >= 31 && idx <= 33; }
  function isWindIndex(idx) { return idx >= 27 && idx <= 30; }

  // === Memoized Shanten Cache ===
  const shantenCache = new Map();
  const CACHE_MAX = 50000;

  function shantenCacheKey(tiles, meldCount) {
    // Compact key: just join counts + meld count
    let key = meldCount;
    for (let i = 0; i < 34; i++) key = key * 5 + tiles[i];
    return key;
  }

  function clearShantenCache() {
    if (shantenCache.size > CACHE_MAX) shantenCache.clear();
  }

  // === Tile Tracker with tedashi support ===
  class TileTracker {
    constructor() { this.reset(); }
    reset() {
      this.visible = new Uint8Array(34);
      this.remaining = new Uint8Array(34);
      this.remaining.fill(4);
      this.playerDiscards = [[], [], [], []];
      this.playerDiscardSet = [
        new Uint8Array(34), new Uint8Array(34),
        new Uint8Array(34), new Uint8Array(34)
      ];
      this.playerMelds = [[], [], [], []];
      this.playerTedashi = [[], [], [], []]; // per discard: true=from hand, false=tsumogiri
      this.playerRiichi = [false, false, false, false];
      this.totalVisible = 0;
    }
    addVisible(tile, playerIdx, source) {
      const idx = tileToIndex(tile);
      if (idx < 0) return;
      this.visible[idx]++;
      this.remaining[idx] = Math.max(0, 4 - this.visible[idx]);
      this.totalVisible++;
      if (source === 'discard' && playerIdx >= 0) {
        this.playerDiscards[playerIdx].push(idx);
        this.playerDiscardSet[playerIdx][idx]++;
      }
    }
    addMeld(meld, playerIdx) {
      this.playerMelds[playerIdx].push(meld);
      for (const t of meld.tiles) {
        const idx = tileToIndex(t);
        if (idx >= 0 && this.visible[idx] < 4) {
          this.visible[idx]++;
          this.remaining[idx] = Math.max(0, 4 - this.visible[idx]);
        }
      }
    }
    getRemainingCount(tileIdx) { return this.remaining[tileIdx]; }
    getTotalUnseen() {
      let sum = 0;
      for (let i = 0; i < 34; i++) sum += this.remaining[i];
      return sum;
    }
    buildFromState(state, myIndex) {
      this.reset();
      const myHand = state.players[myIndex].hand;
      for (const t of myHand.concealed) {
        const idx = tileToIndex(t);
        if (idx >= 0) { this.visible[idx]++; this.remaining[idx] = Math.max(0, 4 - this.visible[idx]); }
      }
      for (let p = 0; p < 4; p++) {
        for (const t of state.players[p].discards) this.addVisible(t, p, 'discard');
        for (const m of state.players[p].hand.melds) this.addMeld(m, p);
        // Tedashi data
        if (state.players[p].tedashi) {
          this.playerTedashi[p] = [...state.players[p].tedashi];
        }
        this.playerRiichi[p] = state.players[p].riichi || false;
      }
    }
  }

  // === Shanten (memoized) ===
  function handToCompact(hand) {
    const compact = new Uint8Array(34);
    for (const t of hand.concealed) {
      const idx = tileToIndex(t);
      if (idx >= 0) compact[idx]++;
    }
    return compact;
  }

  function calcShantenCompact(tiles, meldCount) {
    const key = shantenCacheKey(tiles, meldCount);
    const cached = shantenCache.get(key);
    if (cached !== undefined) return cached;

    const needed = 4 - meldCount;
    let best = 8;
    for (let i = 0; i < 34; i++) {
      if (tiles[i] >= 2) {
        tiles[i] -= 2;
        best = Math.min(best, calcSetsNeeded(tiles, needed, 0));
        tiles[i] += 2;
      }
    }
    best = Math.min(best, calcSetsNeeded(tiles, needed, 0) + 1);
    const result = best - 1;

    shantenCache.set(key, result);
    clearShantenCache();
    return result;
  }

  function calcSetsNeeded(tiles, needed, startIdx) {
    if (needed === 0) return 0;
    let idx = startIdx;
    while (idx < 34 && tiles[idx] === 0) idx++;
    if (idx >= 34) return needed * 2;
    let best = needed * 2;

    if (tiles[idx] >= 3) {
      tiles[idx] -= 3;
      best = Math.min(best, calcSetsNeeded(tiles, needed - 1, idx));
      tiles[idx] += 3;
    }
    if (isSuitedIndex(idx) && rankOf(idx) <= 6) {
      const i2 = idx + 1, i3 = idx + 2;
      if (suitOf(idx) === suitOf(i2) && suitOf(idx) === suitOf(i3) &&
          tiles[i2] > 0 && tiles[i3] > 0) {
        tiles[idx]--; tiles[i2]--; tiles[i3]--;
        best = Math.min(best, calcSetsNeeded(tiles, needed - 1, idx));
        tiles[idx]++; tiles[i2]++; tiles[i3]++;
      }
    }
    if (tiles[idx] >= 2) {
      tiles[idx] -= 2;
      best = Math.min(best, calcSetsNeeded(tiles, needed - 1, idx) + 1);
      tiles[idx] += 2;
    }
    if (isSuitedIndex(idx) && rankOf(idx) <= 7) {
      const i2 = idx + 1;
      if (suitOf(idx) === suitOf(i2) && tiles[i2] > 0) {
        tiles[idx]--; tiles[i2]--;
        best = Math.min(best, calcSetsNeeded(tiles, needed - 1, idx) + 1);
        tiles[idx]++; tiles[i2]++;
      }
      if (rankOf(idx) <= 6) {
        const i3 = idx + 2;
        if (suitOf(idx) === suitOf(i3) && tiles[i3] > 0) {
          tiles[idx]--; tiles[i3]--;
          best = Math.min(best, calcSetsNeeded(tiles, needed - 1, idx) + 1);
          tiles[idx]++; tiles[i3]++;
        }
      }
    }
    const saved = tiles[idx];
    tiles[idx] = 0;
    best = Math.min(best, calcSetsNeeded(tiles, needed, idx + 1));
    tiles[idx] = saved;
    return best;
  }

  function calcUkeire(compact, meldCount, tracker) {
    const currentShanten = calcShantenCompact(new Uint8Array(compact), meldCount);
    const accepts = [];
    let total = 0;
    for (let i = 0; i < 34; i++) {
      if (compact[i] >= 4 || tracker.remaining[i] <= 0) continue;
      compact[i]++;
      const newShanten = calcShantenCompact(new Uint8Array(compact), meldCount);
      compact[i]--;
      if (newShanten < currentShanten) {
        const count = tracker.remaining[i];
        accepts.push({ idx: i, count });
        total += count;
      }
    }
    return { total, tiles: accepts, shanten: currentShanten };
  }

  // === Danger Model with tedashi and opponent reading ===
  class DangerModel {
    constructor(tracker) { this.tracker = tracker; }

    estimateDanger(tileIdx, opponentIdx, turnCount) {
      // Genbutsu: tile opponent already discarded = 100% safe
      if (this.tracker.playerDiscardSet[opponentIdx][tileIdx] > 0) return 0.0;

      let danger = 0.15;
      if (this.isSujiSafe(tileIdx, opponentIdx)) danger *= 0.4;
      if (this.isKabe(tileIdx)) danger *= 0.2;
      if (this.isNoChance(tileIdx)) danger *= 0.05;

      // Riichi = confirmed tenpai, massive danger increase
      if (this.tracker.playerRiichi[opponentIdx]) {
        danger *= 3.0;
      }

      if (!isSuitedIndex(tileIdx)) {
        danger *= (turnCount < 10) ? 0.6 : 1.2;
      }
      if (isSuitedIndex(tileIdx) && (rankOf(tileIdx) === 0 || rankOf(tileIdx) === 8)) {
        danger *= 0.7;
      }
      if (isSuitedIndex(tileIdx) && rankOf(tileIdx) >= 2 && rankOf(tileIdx) <= 6) {
        danger *= 1.3;
      }

      // Opponent hand reading: if they have open melds, we can infer waits
      danger *= (1 + this.estimateTenpaiProb(opponentIdx, turnCount));
      danger *= Math.min(2.0, 1.0 + turnCount * 0.02);

      // Tedashi analysis: opponent discarding from hand (not tsumogiri) in late game
      // suggests they're building something specific
      const tedashi = this.tracker.playerTedashi[opponentIdx];
      if (tedashi.length > 6) {
        const recentTedashi = tedashi.slice(-4).filter(t => t === true).length;
        if (recentTedashi >= 3) danger *= 1.2; // actively reshaping = closer to tenpai
      }

      return Math.min(1.0, Math.max(0.0, danger));
    }

    isSujiSafe(tileIdx, oppIdx) {
      if (!isSuitedIndex(tileIdx)) return false;
      const r = rankOf(tileIdx);
      const base = tileIdx - r;
      const sujiPartner = (r <= 2) ? base + r + 3 : (r >= 6) ? base + r - 3 : -1;
      if (sujiPartner >= 0 && this.tracker.playerDiscardSet[oppIdx][sujiPartner] > 0) return true;
      if (r >= 3 && r <= 5) {
        const low = base + r - 3, high = base + r + 3;
        if (this.tracker.playerDiscardSet[oppIdx][low] > 0 &&
            this.tracker.playerDiscardSet[oppIdx][high] > 0) return true;
      }
      return false;
    }
    isKabe(tileIdx) {
      if (!isSuitedIndex(tileIdx)) return false;
      const r = rankOf(tileIdx), base = tileIdx - r;
      let blocked = 0;
      if (r > 0 && this.tracker.visible[base + r - 1] >= 4) blocked++;
      if (r < 8 && this.tracker.visible[base + r + 1] >= 4) blocked++;
      return blocked >= 2;
    }
    isNoChance(tileIdx) {
      if (!isSuitedIndex(tileIdx)) return this.tracker.remaining[tileIdx] === 0;
      const r = rankOf(tileIdx), base = tileIdx - r;
      let seqPossible = false;
      for (let s = Math.max(0, r - 2); s <= Math.min(6, r); s++) {
        if ((this.tracker.remaining[base+s] > 0 || base+s === tileIdx) &&
            (this.tracker.remaining[base+s+1] > 0 || base+s+1 === tileIdx) &&
            (this.tracker.remaining[base+s+2] > 0 || base+s+2 === tileIdx))
          seqPossible = true;
      }
      return !seqPossible && this.tracker.remaining[tileIdx] < 2;
    }

    estimateTenpaiProb(oppIdx, turnCount) {
      let prob = 0.0;
      const melds = this.tracker.playerMelds[oppIdx];
      prob += melds.length * 0.18;
      prob += Math.min(0.35, turnCount * 0.012);
      if (this.tracker.playerRiichi[oppIdx]) return 1.0;
      // Suit concentration in open melds suggests flush pursuit
      if (melds.length >= 2) {
        const meldSuits = melds.map(m => m.tiles && m.tiles[0] ? m.tiles[0].suit : null);
        if (new Set(meldSuits.filter(s => s)).size === 1) prob += 0.15;
      }
      const discards = this.tracker.playerDiscards[oppIdx];
      if (discards.length > 8) {
        const recent = discards.slice(-3);
        const safeRecent = recent.filter(i => !isSuitedIndex(i) || rankOf(i) === 0 || rankOf(i) === 8).length;
        if (safeRecent >= 2) prob += 0.15;
      }
      return Math.min(0.9, prob);
    }

    getMaxDanger(tileIdx, myIdx, turnCount) {
      let max = 0;
      for (let p = 0; p < 4; p++) {
        if (p === myIdx) continue;
        max = Math.max(max, this.estimateDanger(tileIdx, p, turnCount));
      }
      return max;
    }
  }

  // === Hand Value Estimation (improved) ===
  function estimateHandValue(compact, melds, seatWind, roundWind) {
    let value = 1;
    const allTiles = new Uint8Array(compact);
    for (const m of melds) {
      for (const t of m.tiles) { const i = tileToIndex(t); if (i >= 0) allTiles[i]++; }
    }
    const suitCounts = [0, 0, 0, 0];
    for (let i = 0; i < 27; i++) suitCounts[Math.floor(i / 9)] += allTiles[i];
    for (let i = 27; i < 34; i++) suitCounts[3] += allTiles[i];
    const maxSuit = Math.max(suitCounts[0], suitCounts[1], suitCounts[2]);
    const honors = suitCounts[3];

    if (maxSuit >= 11 && honors === 0) value += 50;
    else if (maxSuit >= 9 && honors === 0) value += 25;
    else if (maxSuit >= 9 && honors > 0) value += 15;
    else if (maxSuit >= 7 && honors > 0) value += 8; // early mixed flush signal

    // Dragon pongs (high value, always worth pursuing)
    for (let i = 31; i < 34; i++) {
      if (allTiles[i] >= 3) value += 12;
      else if (allTiles[i] >= 2) value += 5; // boosted: dragon pairs are valuable
    }
    // Wind pongs
    const seatWindIdx = 27 + ['east','south','west','north'].indexOf(seatWind);
    const roundWindIdx = 27 + ['east','south','west','north'].indexOf(roundWind);
    if (seatWindIdx >= 27) { if (allTiles[seatWindIdx] >= 3) value += 10; else if (allTiles[seatWindIdx] >= 2) value += 3; }
    if (roundWindIdx >= 27) { if (allTiles[roundWindIdx] >= 3) value += 10; else if (allTiles[roundWindIdx] >= 2) value += 3; }

    // All triplets
    let triplets = melds.filter(m => m.type === MELD_TYPES.PONG || m.type === MELD_TYPES.KONG).length;
    for (let i = 0; i < 34; i++) if (compact[i] >= 3) triplets++;
    if (triplets >= 3) value += 20;
    if (triplets >= 4) value += 15;

    // Concealed bonus
    if (melds.length === 0 || melds.every(m => !m.open)) value += 5;
    // All terminals/honors potential
    let termHonor = 0;
    for (let i = 0; i < 34; i++) {
      if (allTiles[i] > 0) {
        if (isSuitedIndex(i) && rankOf(i) !== 0 && rankOf(i) !== 8) break;
        termHonor += allTiles[i];
      }
    }
    if (termHonor >= 12) value += 20;

    return value;
  }

  // === Main Decision Engine ===
  class AIEngine {
    constructor(weights) {
      this.weights = weights || AIEngine.defaultWeights();
      this.tracker = new TileTracker();
      this.dangerModel = new DangerModel(this.tracker);
      this.decisionLog = [];
    }
    static defaultWeights() {
      return {
        shanten: 1000, ukeire: 15, handValue: 8,
        defense: 800, tempo: 3,
        openPenalty: 0.5, aggressionBase: 0.65, defenseThreshold: 0.5
      };
    }

    selectDiscard(player, state) {
      const myIdx = player.seatIndex;
      this.tracker.buildFromState(state, myIdx);
      const hand = player.hand;
      const compact = handToCompact(hand);
      const meldCount = hand.melds.length;
      const turnCount = state.turnCount || 0;
      const currentShanten = calcShantenCompact(new Uint8Array(compact), meldCount);

      let maxTenpaiProb = 0;
      for (let p = 0; p < 4; p++) {
        if (p === myIdx) continue;
        maxTenpaiProb = Math.max(maxTenpaiProb,
          this.dangerModel.estimateTenpaiProb(p, turnCount));
      }

      // Dynamic attack/defense balance
      let attackWeight = this.weights.aggressionBase;
      if (currentShanten <= 1 && maxTenpaiProb < this.weights.defenseThreshold) {
        attackWeight += 0.2; // push for win when close
      } else if (maxTenpaiProb > 0.6 && currentShanten > 2) {
        attackWeight -= 0.25; // bail out defensively
      }
      attackWeight = Math.max(0.15, Math.min(0.9, attackWeight));
      const defenseWeight = 1.0 - attackWeight;

      let bestScore = -Infinity;
      let bestTile = null;
      const candidates = [];

      for (const tile of hand.concealed) {
        const idx = tileToIndex(tile);
        if (idx < 0) continue;
        compact[idx]--;
        const shanten = calcShantenCompact(new Uint8Array(compact), meldCount);
        const ukeire = calcUkeire(new Uint8Array(compact), meldCount, this.tracker);
        const handVal = estimateHandValue(compact, hand.melds, player.seatWind, state.roundWind);
        compact[idx]++;

        const offScore =
          (6 - shanten) * this.weights.shanten +
          ukeire.total * this.weights.ukeire +
          handVal * this.weights.handValue;
        const danger = this.dangerModel.getMaxDanger(idx, myIdx, turnCount);
        const defScore = (1.0 - danger) * this.weights.defense;
        const totalScore = attackWeight * offScore + defenseWeight * defScore;

        candidates.push({ tile, idx, shanten, ukeire: ukeire.total,
          handVal, danger, offScore, defScore, totalScore });
        if (totalScore > bestScore) { bestScore = totalScore; bestTile = tile; }
      }
      candidates.sort((a, b) => b.totalScore - a.totalScore);

      this.decisionLog.push({
        turn: turnCount, player: myIdx, shanten: currentShanten,
        attack: attackWeight.toFixed(2), defense: defenseWeight.toFixed(2),
        chosen: bestTile ? Tile.getId(bestTile) : null,
        topCandidates: candidates.slice(0, 3).map(c => ({
          tile: Tile.getId(c.tile), sh: c.shanten, uk: c.ukeire,
          hv: c.handVal, dg: c.danger.toFixed(2), score: c.totalScore.toFixed(0)
        }))
      });
      return bestTile;
    }

    /** Improved claim logic: always claim dragon pongs, smart chow/pong eval */
    shouldClaimMeld(player, tile, claimType, state) {
      const tileIdx = tileToIndex(tile);

      // ALWAYS claim dragon pongs — 10 pts guaranteed
      if (claimType === 'pong' && isDragonIndex(tileIdx)) return true;

      // ALWAYS claim seat/round wind pongs
      if (claimType === 'pong' && isWindIndex(tileIdx)) {
        const windRank = tileIdx - 27;
        const seatRank = ['east','south','west','north'].indexOf(player.seatWind);
        const roundRank = ['east','south','west','north'].indexOf(state.roundWind);
        if (windRank === seatRank || windRank === roundRank) return true;
      }

      const myIdx = player.seatIndex;
      this.tracker.buildFromState(state, myIdx);
      const hand = player.hand;
      const compact = handToCompact(hand);
      const meldCount = hand.melds.length;

      const shantenBefore = calcShantenCompact(new Uint8Array(compact), meldCount);
      const valueBefore = estimateHandValue(compact, hand.melds, player.seatWind, state.roundWind);

      const simCompact = new Uint8Array(compact);
      let simMeldCount = meldCount + 1;

      if (claimType === 'pong') {
        simCompact[tileIdx] -= 2;
      } else if (claimType === 'chow') {
        const chows = Hand.findChows(hand, tile);
        if (chows.length === 0) return false;
        for (const ct of chows[0]) {
          if (Tile.getId(ct) !== Tile.getId(tile)) {
            const ci = tileToIndex(ct);
            if (ci >= 0) simCompact[ci]--;
          }
        }
      } else if (claimType === 'kong') {
        simCompact[tileIdx] -= 3;
      }

      const shantenAfter = calcShantenCompact(new Uint8Array(simCompact), simMeldCount);
      const dummyMeld = { type: claimType, tiles: [], open: true };
      const valueAfter = estimateHandValue(simCompact, [...hand.melds, dummyMeld],
        player.seatWind, state.roundWind) * this.weights.openPenalty;

      // Pong: claim if shanten improves or stays same with value OK
      if (claimType === 'pong') {
        if (shantenAfter < shantenBefore) return true;
        if (shantenAfter === shantenBefore && valueAfter >= valueBefore * 0.5) return true;
      }
      // Chow: stricter — must improve shanten and not kill value
      if (claimType === 'chow') {
        if (shantenAfter < shantenBefore && valueAfter > valueBefore * 0.4) return true;
      }
      // Kong: check it doesn't break hand shape
      if (claimType === 'kong') {
        return shantenAfter <= shantenBefore;
      }
      return false;
    }

    /** Smart kong: should we declare a concealed kong? */
    shouldDeclareKong(hand, meldCount, seatWind, roundWind) {
      const compact = handToCompact(hand);
      const shantenBefore = calcShantenCompact(new Uint8Array(compact), meldCount);

      // Find 4-of-a-kind in concealed
      for (let i = 0; i < 34; i++) {
        if (compact[i] >= 4) {
          // Simulate declaring kong
          compact[i] -= 4;
          const shantenAfter = calcShantenCompact(new Uint8Array(compact), meldCount + 1);
          compact[i] += 4;
          // Only declare if it doesn't increase shanten
          if (shantenAfter <= shantenBefore) return i;
        }
      }
      return -1; // don't declare
    }

    /** Should we declare riichi? (when tenpai with no open melds) */
    shouldDeclareRiichi(hand, turnCount) {
      if (hand.melds.some(m => m.open)) return false; // can't riichi with open melds
      const compact = handToCompact(hand);
      const shanten = calcShantenCompact(new Uint8Array(compact), hand.melds.length);
      if (shanten !== 0) return false; // must be tenpai
      // Declare riichi if reasonable tiles remain (not too late)
      return turnCount < 50;
    }

    getDecisionLog() { return this.decisionLog; }
    clearDecisionLog() { this.decisionLog = []; }
  }

  root.MJ.AIEngine = Object.freeze({
    AIEngine, TileTracker, DangerModel,
    tileToIndex, indexToTileDef, handToCompact,
    calcShantenCompact, calcUkeire, estimateHandValue,
    isSuitedIndex, suitOf, rankOf, isDragonIndex, isWindIndex
  });

  if (typeof console !== 'undefined') console.log('[Mahjong] AIEngine module loaded');
})(typeof window !== 'undefined' ? window : global);
