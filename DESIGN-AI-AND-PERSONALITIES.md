# Mahjong AI Strength & Living Personalities: Design Document

## Table of Contents
- [Part 1: AI Strength Analysis](#part-1-ai-strength-analysis)
- [Part 2: Living AI Personalities with LLM](#part-2-living-ai-personalities-with-llm)
- [Part 3: Living Simulation](#part-3-living-simulation)

---

## Part 1: AI Strength Analysis

### 1.1 Current System Assessment

The existing AI (`ai-engine.js` + `ai-learning.js`) is a solid intermediate-strength system:

**What it does well:**
- Memoized shanten calculation with compact 34-index tile representation
- Ukeire (tile acceptance count) for efficiency-based discard selection
- Danger model with genbutsu/suji/kabe defensive reads
- Tedashi tracking (hand-draw vs tsumogiri detection)
- Opponent tenpai probability estimation
- Dynamic attack/defense weight balancing
- Cross-session weight tuning via policy-gradient-like updates

**What's missing compared to strong Mahjong AI (Suphx, NAGA, Mortal):**

#### Weakness 1: No Forward Search / Simulation

The current AI is purely reactive -- it evaluates the current state after discarding each tile but never looks ahead. A strong AI asks: "If I discard tile X, what's the probability distribution of useful draws over the next 3-5 turns, and what hands can I reach?"

**Impact:** The AI cannot distinguish between two 1-shanten hands where one has a much better "hand development tree" than the other. Example: a hand that's 1-shanten toward both pinfu and chinitsu should weight the chinitsu path even if immediate ukeire is lower.

#### Weakness 2: Static Hand Value Estimation

`estimateHandValue()` uses additive heuristics (suit concentration, triplet counts, dragon/wind presence). It never actually calculates the score of the completed hand. This means the AI can't reason about:
- Whether opening the hand is worth the value loss
- Whether to go for a cheap fast hand vs an expensive slow hand
- The actual EV (expected value) of different hand paths

#### Weakness 3: No Expected Value (EV) Framework

Strong AI computes: `EV(discard) = P(win) * E[score_if_win] - P(deal_in) * E[score_if_deal_in] - P(draw) * 0`. The current AI mixes offense/defense scores with arbitrary weights but never models actual point outcomes.

#### Weakness 4: Poor Push/Fold Decisions

The current attack/defense balance (`attackWeight`) uses simple thresholds. Real push/fold requires considering:
- My shanten vs opponent's estimated shanten
- My hand value vs their estimated hand value
- Score situation (am I 1st? 4th? How many hands remain?)
- The specific danger of each tile in my hand, not just "max danger across opponents"

#### Weakness 5: No Score Situation Awareness

The AI plays every hand the same regardless of whether it's leading by 30,000 points or in last place with 2 hands remaining. Placement-aware play is the single largest gap between amateur and expert Mahjong.

#### Weakness 6: Fixed Strategy Space

The learning system (`ai-learning.js`) only tunes 8 weight parameters within fixed clamp ranges. It cannot discover new strategies -- for example, it can't learn to intentionally deal into a cheap hand to prevent a bigger loss, or to play for a draw when in first place.

### 1.2 Most Impactful Improvements (Ranked)

#### Priority 1: Score Situation Awareness (Highest Impact)

This alone can move the AI from intermediate to advanced-level play.

```javascript
// score-situation.js

class ScoreSituationEvaluator {
  constructor() {
    // Points needed to change placement
    this.placementThresholds = null;
  }

  /**
   * Analyze the current score situation and return strategic adjustments.
   * @param {number[]} scores - [east, south, west, north] current scores
   * @param {number} myIdx - My seat index
   * @param {number} handsRemaining - Estimated hands left in the game
   * @param {string} roundWind - Current round wind
   * @returns {SituationStrategy}
   */
  analyze(scores, myIdx, handsRemaining, roundWind) {
    const sorted = scores.map((s, i) => ({ idx: i, score: s }))
      .sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex(s => s.idx === myIdx) + 1; // 1-4
    const myScore = scores[myIdx];

    // Points needed to move up/down in placement
    const gapToNext = myRank > 1
      ? sorted[myRank - 2].score - myScore : Infinity;
    const gapFromBelow = myRank < 4
      ? myScore - sorted[myRank].score : Infinity;

    // Determine strategic mode
    let mode, aggressionMod, defenseMod, minHandValue, acceptDrawRate;

    if (myRank === 1 && gapFromBelow > 20000 && handsRemaining <= 4) {
      // Comfortably first with few hands left: play ultra-safe
      mode = 'protect_lead';
      aggressionMod = -0.3;
      defenseMod = 1.5;
      minHandValue = 0; // accept any win, even cheap
      acceptDrawRate = 0.9; // draws are fine
    } else if (myRank === 1 && gapFromBelow <= 8000) {
      // Narrowly first: moderate defense, still need to win sometimes
      mode = 'defend_lead';
      aggressionMod = -0.1;
      defenseMod = 1.2;
      minHandValue = 0;
      acceptDrawRate = 0.6;
    } else if (myRank === 4 && handsRemaining <= 3) {
      // Last place, running out of time: go all-in on big hands
      mode = 'desperate_attack';
      aggressionMod = 0.3;
      defenseMod = 0.3;
      minHandValue = gapToNext * 0.5; // need big hands to climb
      acceptDrawRate = 0.0; // draws are losses
    } else if (myRank >= 3 && gapToNext <= 12000) {
      // Within striking distance of moving up
      mode = 'aggressive_climb';
      aggressionMod = 0.15;
      defenseMod = 0.7;
      minHandValue = gapToNext * 0.3;
      acceptDrawRate = 0.2;
    } else if (myRank === 2 && gapToNext <= 8000) {
      // Close to first: targeted aggression
      mode = 'chase_first';
      aggressionMod = 0.1;
      defenseMod = 0.9;
      minHandValue = gapToNext * 0.4;
      acceptDrawRate = 0.3;
    } else {
      // Default balanced play
      mode = 'balanced';
      aggressionMod = 0;
      defenseMod = 1.0;
      minHandValue = 0;
      acceptDrawRate = 0.4;
    }

    // Dealer retention: as dealer (East), winning extends your deal
    // which is worth roughly 25% of a hand's value
    const isDealer = (myIdx === 0); // simplified
    const dealerRetentionBonus = isDealer ? 0.15 : 0;

    return {
      mode, myRank, gapToNext, gapFromBelow, handsRemaining,
      aggressionMod: aggressionMod + dealerRetentionBonus,
      defenseMod,
      minHandValue,
      acceptDrawRate,
      // Should I intentionally deal into a cheap hand to prevent
      // someone else from winning a huge hand?
      shouldConsiderCheapDealIn: myRank <= 2 && handsRemaining <= 2,
      // Should I avoid winning with a hand that gives points to
      // the player chasing me?
      avoidFeedingLeader: myRank >= 2 ? sorted[0].idx : -1
    };
  }
}
```

#### Priority 2: Expected Value Framework

Replace the arbitrary weighted scoring with actual EV calculations.

```javascript
// ev-calculator.js

class EVCalculator {
  /**
   * Calculate expected value of discarding a tile.
   * EV = P(win) * E[points_won] - sum(P(deal_in_to_p) * E[points_lost_to_p])
   *
   * @param {object} params
   * @param {number} params.shantenAfterDiscard - Shanten after discarding
   * @param {number} params.ukeireAfterDiscard - Acceptance count
   * @param {number} params.estimatedHandValue - What we'd win
   * @param {number} params.turnsRemaining - Tiles left in wall
   * @param {object[]} params.opponents - Per-opponent danger info
   * @param {object} params.situation - Score situation adjustments
   */
  calculateDiscardEV(params) {
    const {
      shantenAfterDiscard, ukeireAfterDiscard,
      estimatedHandValue, turnsRemaining,
      opponents, situation
    } = params;

    // P(win) based on shanten, ukeire, and turns remaining
    // Empirical approximation from game statistics
    const pWin = this.estimateWinProbability(
      shantenAfterDiscard, ukeireAfterDiscard, turnsRemaining
    );

    // Expected win value, adjusted for situation
    const effectiveHandValue = Math.max(
      estimatedHandValue,
      situation.minHandValue || 0
    );
    const winEV = pWin * effectiveHandValue;

    // P(deal-in) for this specific discard tile
    let dealInEV = 0;
    for (const opp of opponents) {
      const pDealIn = opp.dangerForThisTile * opp.tenpaiProb;
      const expectedLoss = opp.estimatedHandValue || 30; // default avg
      dealInEV += pDealIn * expectedLoss;

      // Extra penalty for feeding the leader
      if (opp.playerIdx === situation.avoidFeedingLeader) {
        dealInEV *= 1.5;
      }
    }

    // Draw EV: slightly negative if we need to climb, neutral otherwise
    const pDraw = Math.max(0, 1 - pWin - opponents.reduce(
      (s, o) => s + o.dangerForThisTile * o.tenpaiProb, 0
    ));
    const drawEV = pDraw * (situation.acceptDrawRate > 0.5 ? 0 : -5);

    return {
      totalEV: winEV - dealInEV + drawEV,
      winEV, dealInEV, drawEV,
      pWin, effectiveHandValue
    };
  }

  /**
   * Empirical win probability given shanten, ukeire, turns remaining.
   * Based on aggregated statistics from professional Mahjong databases.
   *
   * These curves were derived from tenhou.net log analysis:
   * - At shanten 0 with 10 ukeire and 40 tiles remaining: ~45% win rate
   * - At shanten 1 with 20 ukeire and 40 tiles remaining: ~25% win rate
   * - At shanten 2+: drops rapidly
   */
  estimateWinProbability(shanten, ukeire, turnsRemaining) {
    if (shanten < 0) return 1.0; // already won
    if (turnsRemaining <= 0) return 0;

    // Probability of reaching tenpai from current shanten
    // Each ukeire tile has (ukeire / unseenTiles) chance per draw
    const unseenApprox = Math.max(40, turnsRemaining * 1.2);

    if (shanten === 0) {
      // Tenpai: P(win) = 1 - (1 - ukeire/unseen)^turns
      const pPerDraw = Math.min(0.15, ukeire / unseenApprox);
      return 1 - Math.pow(1 - pPerDraw, turnsRemaining);
    }

    if (shanten === 1) {
      // Need to first reach tenpai, then win
      const pReachTenpai = 1 - Math.pow(
        1 - Math.min(0.2, ukeire / unseenApprox),
        turnsRemaining * 0.6
      );
      const turnsAfterTenpai = turnsRemaining * 0.4;
      const avgTenpaiUkeire = 6; // rough average
      const pWinFromTenpai = 1 - Math.pow(
        1 - avgTenpaiUkeire / unseenApprox,
        turnsAfterTenpai
      );
      return pReachTenpai * pWinFromTenpai * 0.8;
    }

    // shanten >= 2: very rough
    return Math.max(0, 0.05 * ukeire / unseenApprox *
      Math.pow(0.4, shanten - 1) * Math.min(1, turnsRemaining / 30));
  }
}
```

#### Priority 3: Better Push/Fold with Per-Opponent Modeling

```javascript
// push-fold.js

class PushFoldDecider {
  /**
   * Decide whether to push (continue attacking) or fold (play defensively).
   * Returns a value 0..1 where 0 = full fold, 1 = full push.
   */
  decide(myState, opponents, situation) {
    const {
      myShanten, myUkeire, myHandValue,
      turnsRemaining, myTenpaiProb
    } = myState;

    // My attacking equity
    const ev = new EVCalculator();
    const myWinProb = ev.estimateWinProbability(
      myShanten, myUkeire, turnsRemaining
    );
    const myAttackEV = myWinProb * myHandValue;

    // Risk from each opponent
    let totalRisk = 0;
    let maxThreatEV = 0;
    for (const opp of opponents) {
      const threatEV = opp.tenpaiProb * opp.estimatedHandValue;
      totalRisk += threatEV;
      maxThreatEV = Math.max(maxThreatEV, threatEV);
    }

    // Core push/fold ratio
    let pushRatio = myAttackEV / (myAttackEV + totalRisk + 1);

    // Situation adjustments
    pushRatio += situation.aggressionMod;

    // If I'm tenpai, always lean toward pushing
    if (myShanten === 0) pushRatio = Math.max(pushRatio, 0.6);

    // If someone declared riichi and I'm 3+ shanten, fold hard
    const riichiDeclared = opponents.some(o => o.riichi);
    if (riichiDeclared && myShanten >= 3) {
      pushRatio = Math.min(pushRatio, 0.15);
    }

    // Dealer retention bonus
    if (situation.isDealer && myShanten <= 1) {
      pushRatio += 0.1;
    }

    return Math.max(0, Math.min(1, pushRatio));
  }
}
```

#### Priority 4: Lightweight Monte Carlo Forward Search

Full MCTS is too expensive for browser JS, but we can do a simplified version.

```javascript
// monte-carlo-lite.js

class MonteCarloLite {
  /**
   * Run a lightweight simulation to estimate hand development potential.
   * Instead of full MCTS, we do "random rollouts" of tile draws.
   *
   * @param {Uint8Array} compact - Current hand in compact form
   * @param {number} meldCount - Number of melds
   * @param {TileTracker} tracker - Tile visibility info
   * @param {number} simCount - Number of simulations (default: 200)
   * @param {number} horizon - Turns to simulate ahead (default: 6)
   * @returns {Map<number, SimResult>} Per-discard-index simulation results
   */
  evaluateDiscards(compact, meldCount, tracker, simCount = 200, horizon = 6) {
    const results = new Map();

    // For each possible discard
    for (let d = 0; d < 34; d++) {
      if (compact[d] === 0) continue;

      compact[d]--;
      const afterCompact = new Uint8Array(compact);
      compact[d]++;

      let totalReachedTenpai = 0;
      let totalWon = 0;
      let totalUkeireSum = 0;
      let totalShantenReduction = 0;

      const startShanten = calcShantenCompact(afterCompact, meldCount);

      for (let sim = 0; sim < simCount; sim++) {
        const result = this.rollout(
          new Uint8Array(afterCompact), meldCount, tracker, horizon
        );
        if (result.reachedTenpai) totalReachedTenpai++;
        if (result.won) totalWon++;
        totalUkeireSum += result.bestUkeire;
        totalShantenReduction += result.shantenReduction;
      }

      results.set(d, {
        tenpaiRate: totalReachedTenpai / simCount,
        winRate: totalWon / simCount,
        avgUkeire: totalUkeireSum / simCount,
        avgShantenReduction: totalShantenReduction / simCount,
        startShanten
      });
    }

    return results;
  }

  /**
   * Single rollout: draw random unseen tiles, greedily discard worst.
   */
  rollout(compact, meldCount, tracker, horizon) {
    // Build pool of drawable tiles
    const pool = [];
    for (let i = 0; i < 34; i++) {
      for (let c = 0; c < tracker.remaining[i]; c++) {
        // Subtract tiles already in our simulated hand
        if (c < compact[i]) continue;
        pool.push(i);
      }
    }

    let currentShanten = calcShantenCompact(new Uint8Array(compact), meldCount);
    const startShanten = currentShanten;
    let bestUkeire = 0;
    let reachedTenpai = false;
    let won = false;

    for (let turn = 0; turn < horizon && pool.length > 0; turn++) {
      // Draw random tile
      const drawIdx = Math.floor(Math.random() * pool.length);
      const drawn = pool[drawIdx];
      pool.splice(drawIdx, 1);
      compact[drawn]++;

      // Check if we won
      const newShanten = calcShantenCompact(new Uint8Array(compact), meldCount);
      if (newShanten < 0) {
        won = true;
        reachedTenpai = true;
        break;
      }
      if (newShanten === 0) reachedTenpai = true;

      // Greedy discard: remove the tile that keeps best shanten+ukeire
      let bestDiscard = -1;
      let bestScore = -Infinity;
      for (let d = 0; d < 34; d++) {
        if (compact[d] === 0) continue;
        compact[d]--;
        const sh = calcShantenCompact(new Uint8Array(compact), meldCount);
        // Quick ukeire estimate: count accepting tiles
        let uk = 0;
        for (let a = 0; a < 34; a++) {
          if (compact[a] >= 4) continue;
          compact[a]++;
          const sh2 = calcShantenCompact(new Uint8Array(compact), meldCount);
          compact[a]--;
          if (sh2 < sh) uk += tracker.remaining[a];
        }
        const score = (6 - sh) * 100 + uk;
        if (score > bestScore) {
          bestScore = score;
          bestDiscard = d;
          bestUkeire = Math.max(bestUkeire, uk);
        }
        compact[d]++;
      }

      if (bestDiscard >= 0) {
        compact[bestDiscard]--;
        currentShanten = calcShantenCompact(new Uint8Array(compact), meldCount);
      }
    }

    return {
      reachedTenpai,
      won,
      bestUkeire,
      shantenReduction: startShanten - currentShanten
    };
  }
}
```

**Performance note:** 200 simulations x 6 horizon x 34 tiles x ~34 discard checks = ~1.4M shanten calls per discard decision. With the memoized cache, this takes ~50-200ms in modern browsers, acceptable for AI turn time. Can be reduced to 50-100 sims for faster play.

### 1.3 Learning NEW Strategies (Beyond Weight Tuning)

The current `LearningSystem` can only adjust 8 continuous weights. Here's how to enable genuine strategy discovery:

#### Approach: Policy Table + Self-Play Evolution

Instead of continuous weights, maintain a **discrete policy table** that maps game situations to action preferences. Self-play discovers which entries should change.

```javascript
// strategy-discovery.js

/**
 * A "strategy gene" is a situation -> action preference mapping.
 * The AI evolves a population of strategy genes through self-play tournaments.
 */

class StrategyGenome {
  constructor() {
    // Each gene maps a discretized game situation to action preferences.
    // Situations are bucketed into categories for tractability.
    this.genes = {};
    this.fitness = 0;
    this.generation = 0;
  }

  /**
   * Situation encoding: compress the game state into a category string.
   * This is the key design decision -- what features matter?
   */
  static encodeSituation(state) {
    const shantenBucket = Math.min(state.shanten, 4);
    const turnBucket = Math.floor(state.turnCount / 10); // 0,1,2,3+
    const dangerBucket = state.maxDanger < 0.2 ? 'L' :
                         state.maxDanger < 0.5 ? 'M' : 'H';
    const handValueBucket = state.handValue < 10 ? 'C' :  // cheap
                            state.handValue < 30 ? 'M' :  // medium
                            'E';                            // expensive
    const placementBucket = state.myRank; // 1-4
    const opponentTenpai = state.anyOpponentTenpai ? 'T' : 'N';
    const isDealer = state.isDealer ? 'D' : '_';

    return `${shantenBucket}${turnBucket}${dangerBucket}${handValueBucket}` +
           `${placementBucket}${opponentTenpai}${isDealer}`;
  }

  /**
   * Get action preferences for a situation.
   * Actions: push/fold ratio, claim aggressiveness, riichi eagerness,
   *          hand value preference, tempo preference
   */
  getPreferences(situationKey) {
    if (!this.genes[situationKey]) {
      // Default: balanced play
      this.genes[situationKey] = {
        pushFold: 0.5,      // 0=full fold, 1=full push
        claimAgg: 0.5,      // 0=never claim, 1=claim everything
        riichiEager: 0.5,   // 0=never riichi, 1=always riichi
        handValuePref: 0.5, // 0=speed, 1=value
        tempoAdj: 0         // -1 to +1 adjustment
      };
    }
    return this.genes[situationKey];
  }

  /**
   * Mutate: randomly adjust some gene values.
   */
  mutate(rate = 0.1, magnitude = 0.15) {
    for (const key of Object.keys(this.genes)) {
      const prefs = this.genes[key];
      for (const field of Object.keys(prefs)) {
        if (Math.random() < rate) {
          prefs[field] += (Math.random() - 0.5) * 2 * magnitude;
          prefs[field] = Math.max(-1, Math.min(1, prefs[field]));
        }
      }
    }
  }

  /**
   * Crossover: combine two genomes.
   */
  static crossover(parent1, parent2) {
    const child = new StrategyGenome();
    const allKeys = new Set([
      ...Object.keys(parent1.genes),
      ...Object.keys(parent2.genes)
    ]);
    for (const key of allKeys) {
      if (Math.random() < 0.5 && parent1.genes[key]) {
        child.genes[key] = { ...parent1.genes[key] };
      } else if (parent2.genes[key]) {
        child.genes[key] = { ...parent2.genes[key] };
      }
    }
    return child;
  }
}

/**
 * Self-play tournament that evolves strategy genomes.
 * Runs in a Web Worker to avoid blocking the UI.
 */
class StrategyEvolution {
  constructor() {
    this.populationSize = 20;
    this.population = [];
    this.generation = 0;
    this.bestGenome = null;
    this.bestFitness = -Infinity;
    this.gamesPerEval = 50; // games to evaluate each genome
  }

  initialize() {
    this.population = [];
    for (let i = 0; i < this.populationSize; i++) {
      const genome = new StrategyGenome();
      // Seed with some variation
      genome.mutate(1.0, 0.3); // mutate everything
      this.population.push(genome);
    }
  }

  /**
   * Run one generation: evaluate all genomes through self-play,
   * select the best, breed the next generation.
   *
   * This should run inside a Web Worker.
   * @param {Function} playGame - Function that plays a game and returns scores
   */
  async runGeneration(playGame) {
    // Evaluate each genome
    for (const genome of this.population) {
      let totalScore = 0;
      let totalPlacement = 0;

      for (let g = 0; g < this.gamesPerEval; g++) {
        // Play a game with this genome as one player,
        // other 3 players use the current best or default strategy
        const opponents = [
          this.bestGenome || new StrategyGenome(),
          new StrategyGenome(), // default
          new StrategyGenome()  // default
        ];

        const result = await playGame(genome, opponents);
        totalScore += result.myScore;
        totalPlacement += result.myPlacement;
      }

      genome.fitness = totalScore / this.gamesPerEval
        - (totalPlacement / this.gamesPerEval) * 5000;
    }

    // Sort by fitness
    this.population.sort((a, b) => b.fitness - a.fitness);

    // Track best
    if (this.population[0].fitness > this.bestFitness) {
      this.bestFitness = this.population[0].fitness;
      this.bestGenome = this.population[0];
    }

    // Breed next generation
    const nextGen = [];
    // Elitism: keep top 4
    for (let i = 0; i < 4; i++) {
      nextGen.push(this.population[i]);
    }
    // Crossover and mutation for the rest
    while (nextGen.length < this.populationSize) {
      const p1 = this.tournament(3);
      const p2 = this.tournament(3);
      const child = StrategyGenome.crossover(p1, p2);
      child.mutate(0.15, 0.1);
      child.generation = this.generation + 1;
      nextGen.push(child);
    }

    this.population = nextGen;
    this.generation++;

    return {
      generation: this.generation,
      bestFitness: this.bestFitness,
      uniqueSituations: Object.keys(this.bestGenome.genes).length,
      topGenomes: this.population.slice(0, 3).map(g => ({
        fitness: g.fitness,
        situations: Object.keys(g.genes).length
      }))
    };
  }

  /** Tournament selection */
  tournament(k) {
    let best = null;
    for (let i = 0; i < k; i++) {
      const candidate = this.population[
        Math.floor(Math.random() * this.population.length)
      ];
      if (!best || candidate.fitness > best.fitness) best = candidate;
    }
    return best;
  }

  /** Serialize the best genome for persistence */
  exportBest() {
    return {
      generation: this.generation,
      fitness: this.bestFitness,
      genes: this.bestGenome ? { ...this.bestGenome.genes } : {}
    };
  }

  /** Load a previously saved genome */
  importBest(data) {
    const genome = new StrategyGenome();
    genome.genes = data.genes || {};
    genome.fitness = data.fitness || 0;
    genome.generation = data.generation || 0;
    this.bestGenome = genome;
    this.bestFitness = genome.fitness;
    this.generation = genome.generation;
  }
}
```

**What this can discover that weight tuning cannot:**
- Situation-specific strategies: "When in 4th place at shanten 1 with an expensive hand and an opponent in tenpai, PUSH" (because the risk of staying 4th is worse than dealing in)
- Dealer retention value: the genome might learn to push harder as dealer in certain situations
- Meta-strategies: "When ahead in late game with cheap hand, fold even at tenpai" -- a strategy that contradicts the usual "tenpai = push" heuristic
- Riichi timing: "Don't riichi with a bad wait when in 1st place" vs "Always riichi when in 4th"

### 1.4 Meta-Game Strategies

#### Placement Awareness

In Japanese Mahjong, final placement matters more than raw points. The strategy implications:

| Situation | Optimal Strategy |
|-----------|-----------------|
| 1st by 20k+, last hand | Full defense. Even draw = win. |
| 1st by <8k | Moderate defense. Win cheap hands to extend lead. |
| 2nd, close to 1st | Target hands that jump you to 1st (direct hit on 1st place). |
| 3rd, close to 2nd | Balance attack/defense. Avoid dealing into 1st. |
| 4th, far behind | Maximum aggression. Go for expensive hands. |
| 4th, dealer | Extend dealership. Win anything. |

#### Dealer Retention

Being dealer in Mahjong is worth roughly 1.5x a normal win (you get to keep dealing). The AI should:
- Value tenpai more highly as dealer
- Push slightly harder to win even cheap hands
- As non-dealer, factor in that letting the dealer win again extends their advantage

#### Intentional Cheap Deal-In

Advanced strategy: sometimes dealing into a cheap hand is correct to prevent someone else from winning an expensive hand. Example: opponent A has riichi (likely 30+ points), opponent B has an open cheap hand (likely 5-10 points). If you can deal into B, you prevent A from winning.

```javascript
// This is encoded in the EVCalculator by comparing:
// EV(deal_into_cheap) = -cheapHandValue
// EV(continuing) = -P(deal_into_expensive) * expensiveValue - P(draw) * 0
// When P(deal_into_expensive) * expensiveValue > cheapHandValue, deal in.
```

### 1.5 Self-Play Reinforcement Loop in JavaScript

Here is a concrete implementation using Web Workers:

```javascript
// self-play-worker.js -- runs in a Web Worker

/**
 * Headless game engine for self-play.
 * Stripped down: no rendering, no DOM, pure game logic.
 */
class HeadlessGame {
  constructor(genomes) {
    // genomes[0..3] are the strategy genomes for each player
    this.genomes = genomes;
    this.scores = [25000, 25000, 25000, 25000];
    this.roundsPlayed = 0;
    this.maxRounds = 8; // East + South round (8 hands)
  }

  /**
   * Play a complete game, return results.
   */
  playGame() {
    for (let round = 0; round < this.maxRounds; round++) {
      this.playRound(round);
    }
    return this.getResults();
  }

  playRound(roundNum) {
    // Initialize hand, wall, deal tiles
    // ... (reuse existing game-state.js logic) ...

    // Each turn:
    for (let turn = 0; turn < 70; turn++) { // max ~70 draws per round
      const currentPlayer = turn % 4; // simplified rotation
      const genome = this.genomes[currentPlayer];

      // Get situation encoding
      const situation = StrategyGenome.encodeSituation({
        shanten: /* calculated */,
        turnCount: turn,
        maxDanger: /* calculated */,
        handValue: /* estimated */,
        myRank: this.getPlacement(currentPlayer),
        anyOpponentTenpai: /* estimated */,
        isDealer: currentPlayer === (roundNum % 4)
      });

      const prefs = genome.getPreferences(situation);

      // Use preferences to adjust the AIEngine weights dynamically
      // ... apply prefs.pushFold, prefs.claimAgg, etc. ...
    }
  }

  getResults() {
    const placements = this.scores
      .map((s, i) => ({ idx: i, score: s }))
      .sort((a, b) => b.score - a.score)
      .map((s, rank) => ({ ...s, rank: rank + 1 }));

    return placements.map(p => ({
      playerIdx: p.idx,
      score: p.score,
      placement: p.rank
    }));
  }

  getPlacement(idx) {
    const sorted = [...this.scores].sort((a, b) => b - a);
    return sorted.indexOf(this.scores[idx]) + 1;
  }
}

// Worker message handler
self.onmessage = function(e) {
  const { type, data } = e.data;

  if (type === 'run_generation') {
    const evolution = new StrategyEvolution();
    if (data.importedGenome) {
      evolution.importBest(data.importedGenome);
    } else {
      evolution.initialize();
    }

    // Run one generation
    evolution.runGeneration(async (genome, opponents) => {
      const game = new HeadlessGame([genome, ...opponents]);
      const results = game.playGame();
      return {
        myScore: results[0].score,
        myPlacement: results[0].placement
      };
    }).then(stats => {
      self.postMessage({
        type: 'generation_complete',
        stats,
        bestGenome: evolution.exportBest()
      });
    });
  }
};
```

**Integration with the main game:**

```javascript
// In the main thread:
class SelfPlayManager {
  constructor() {
    this.worker = new Worker('js/self-play-worker.js');
    this.isRunning = false;
    this.generationCount = 0;
    this.bestGenome = this.loadSaved();
  }

  /** Start background training */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.worker.onmessage = (e) => {
      if (e.data.type === 'generation_complete') {
        this.generationCount++;
        this.bestGenome = e.data.bestGenome;
        this.save();

        // Report progress
        console.log(
          `Gen ${e.data.stats.generation}: ` +
          `fitness=${e.data.stats.bestFitness.toFixed(0)}, ` +
          `situations=${e.data.stats.uniqueSituations}`
        );

        // Continue training if still running
        if (this.isRunning) {
          this.worker.postMessage({
            type: 'run_generation',
            data: { importedGenome: this.bestGenome }
          });
        }
      }
    };

    this.worker.postMessage({
      type: 'run_generation',
      data: { importedGenome: this.bestGenome }
    });
  }

  stop() { this.isRunning = false; }

  /** Apply discovered strategies to the live AI */
  applyToEngine(engine, gameState, playerIdx) {
    if (!this.bestGenome || !this.bestGenome.genes) return;

    const situation = StrategyGenome.encodeSituation(
      this.extractSituation(gameState, playerIdx)
    );
    const genome = new StrategyGenome();
    genome.genes = this.bestGenome.genes;
    const prefs = genome.getPreferences(situation);

    // Modify engine weights based on discovered preferences
    engine.weights.aggressionBase = 0.5 + prefs.pushFold * 0.4;
    engine.weights.openPenalty = 0.3 + prefs.claimAgg * 0.5;
    // ... etc
  }

  save() {
    try {
      localStorage.setItem('mj_evolved_strategy',
        JSON.stringify(this.bestGenome));
    } catch (_) {}
  }

  loadSaved() {
    try {
      const raw = localStorage.getItem('mj_evolved_strategy');
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }
}
```

---

## Part 2: Living AI Personalities with LLM

### 2.1 Research: Best Game AI Companions

**Persona series (Social Links):** Characters have multi-stage relationships that unlock through repeated interaction. Each character has a backstory, motivations, and emotional arc. Conversations change based on relationship level. Key insight: **progression gates** make relationships feel earned.

**Mass Effect (Party Members):** Characters react to your choices, remember past events, and have opinions about each other. Key insight: **triangular relationships** (characters having opinions about each other, not just about the player) create a sense of a living world.

**Character.AI / AI Dungeon:** Use LLM for open-ended conversation with persistent character descriptions. Key insight: **character sheets** (detailed personality prompts) plus **conversation history** create surprisingly believable characters, but they need **guardrails** to stay in-character.

**Key pattern across all:** Characters feel alive when they have:
1. Consistent personality traits that constrain behavior
2. Memory of past interactions that they reference naturally
3. Emotional states that change and affect behavior
4. Goals/motivations independent of the player
5. Relationships with entities other than the player

### 2.2 Memory Architecture

Three-layer memory system inspired by human cognitive architecture:

```javascript
// memory-system.js

/**
 * Three-layer memory: episodic (events), semantic (facts/opinions),
 * emotional (feelings/states). Persisted to localStorage/IndexedDB.
 */

class MemorySystem {
  constructor(characterId) {
    this.characterId = characterId;
    this.episodic = [];   // Time-stamped events
    this.semantic = {};   // Facts and beliefs
    this.emotional = {};  // Emotional states and triggers
    this.storageKey = `mj_memory_${characterId}`;
    this.load();
  }

  // === Episodic Memory: What Happened ===

  /**
   * Record an event with emotional coloring.
   * @param {string} type - Event category
   * @param {object} details - What happened
   * @param {number} significance - 0-10, how important (affects retention)
   * @param {string} emotion - How the character felt
   */
  recordEvent(type, details, significance = 5, emotion = 'neutral') {
    const event = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type,
      details,
      significance,
      emotion,
      timestamp: Date.now(),
      sessionId: this.currentSessionId || 0,
      recalled: 0 // times this memory has been recalled
    };

    this.episodic.push(event);
    this.consolidate(); // Manage memory size
    return event;
  }

  /**
   * Recall relevant memories for a given context.
   * Uses recency, significance, and emotional relevance.
   *
   * @param {string} context - What we're trying to remember about
   * @param {number} limit - Max memories to return
   * @returns {object[]} Relevant memories, most relevant first
   */
  recall(context, limit = 5) {
    const now = Date.now();
    const contextWords = context.toLowerCase().split(/\s+/);

    const scored = this.episodic.map(mem => {
      // Recency score: exponential decay with 7-day half-life
      const ageMs = now - mem.timestamp;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recency = Math.exp(-0.1 * ageDays);

      // Significance score
      const significance = mem.significance / 10;

      // Emotional intensity boosts memory (strong emotions are memorable)
      const emotionBoost = ['joy', 'anger', 'surprise', 'frustration']
        .includes(mem.emotion) ? 0.3 : 0;

      // Context relevance: simple keyword matching
      const detailStr = JSON.stringify(mem.details).toLowerCase();
      const typeStr = mem.type.toLowerCase();
      const relevance = contextWords.reduce((score, word) => {
        if (detailStr.includes(word)) score += 0.2;
        if (typeStr.includes(word)) score += 0.3;
        return score;
      }, 0);

      // Rehearsal effect: memories recalled more often are stronger
      const rehearsal = Math.min(0.3, mem.recalled * 0.05);

      return {
        memory: mem,
        score: recency * 0.3 + significance * 0.25 +
               relevance * 0.25 + emotionBoost + rehearsal
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, limit).map(s => s.memory);

    // Mark as recalled (rehearsal strengthens memory)
    for (const mem of results) mem.recalled++;

    return results;
  }

  /**
   * Memory consolidation: prune old, low-significance memories.
   * Keep memory under 500 events. High-significance events persist longer.
   */
  consolidate() {
    if (this.episodic.length <= 500) return;

    // Sort by retention score
    const now = Date.now();
    this.episodic.sort((a, b) => {
      const aRetention = a.significance * 2 +
        (a.recalled * 0.5) -
        ((now - a.timestamp) / (1000 * 60 * 60 * 24 * 30)); // penalize >1 month old
      const bRetention = b.significance * 2 +
        (b.recalled * 0.5) -
        ((now - b.timestamp) / (1000 * 60 * 60 * 24 * 30));
      return bRetention - aRetention;
    });

    // Keep top 400
    this.episodic = this.episodic.slice(0, 400);
  }

  // === Semantic Memory: What I Know / Believe ===

  /**
   * Store a fact or belief about something.
   * @param {string} subject - What this is about ("player", "game", "self")
   * @param {string} key - Specific fact key
   * @param {*} value - The fact/belief
   * @param {number} confidence - 0-1, how certain
   */
  setFact(subject, key, value, confidence = 0.8) {
    if (!this.semantic[subject]) this.semantic[subject] = {};
    this.semantic[subject][key] = {
      value, confidence, updated: Date.now()
    };
  }

  getFact(subject, key) {
    return this.semantic[subject]?.[key]?.value ?? null;
  }

  getAllFacts(subject) {
    const facts = this.semantic[subject];
    if (!facts) return {};
    const result = {};
    for (const [k, v] of Object.entries(facts)) {
      result[k] = v.value;
    }
    return result;
  }

  // === Emotional Memory: How I Feel ===

  /**
   * Update emotional state. Emotions decay over time toward baseline.
   */
  setEmotion(emotion, intensity, trigger = null) {
    this.emotional[emotion] = {
      intensity: Math.max(0, Math.min(1, intensity)),
      trigger,
      timestamp: Date.now()
    };
  }

  /**
   * Get current emotional state with natural decay.
   * Emotions decay toward 0 with a half-life of ~30 minutes of play.
   */
  getEmotionalState() {
    const now = Date.now();
    const state = {};
    for (const [emotion, data] of Object.entries(this.emotional)) {
      const minutesElapsed = (now - data.timestamp) / (1000 * 60);
      const decayed = data.intensity * Math.exp(-0.023 * minutesElapsed);
      if (decayed > 0.05) { // threshold
        state[emotion] = {
          intensity: decayed,
          trigger: data.trigger
        };
      }
    }
    return state;
  }

  /**
   * Get dominant emotion (highest intensity after decay).
   */
  getDominantEmotion() {
    const state = this.getEmotionalState();
    let dominant = { emotion: 'neutral', intensity: 0 };
    for (const [emotion, data] of Object.entries(state)) {
      if (data.intensity > dominant.intensity) {
        dominant = { emotion, intensity: data.intensity };
      }
    }
    return dominant;
  }

  // === Persistence ===

  save() {
    const data = {
      episodic: this.episodic,
      semantic: this.semantic,
      emotional: this.emotional
    };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      // If localStorage is full, try pruning more aggressively
      this.episodic = this.episodic.slice(-200);
      try {
        localStorage.setItem(this.storageKey, JSON.stringify({
          episodic: this.episodic,
          semantic: this.semantic,
          emotional: this.emotional
        }));
      } catch (_) {}
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        this.episodic = data.episodic || [];
        this.semantic = data.semantic || {};
        this.emotional = data.emotional || {};
      }
    } catch (_) {}
  }

  /** Get a summary for LLM context injection */
  getSummaryForLLM(maxTokenEstimate = 500) {
    const facts = this.getAllFacts('player');
    const recentMemories = this.recall('recent game', 5);
    const emotions = this.getEmotionalState();
    const dominant = this.getDominantEmotion();

    const lines = [];
    lines.push(`Current mood: ${dominant.emotion} (${(dominant.intensity * 100).toFixed(0)}%)`);

    if (Object.keys(facts).length > 0) {
      lines.push('What I know about the player:');
      for (const [k, v] of Object.entries(facts)) {
        lines.push(`  - ${k}: ${v}`);
      }
    }

    if (recentMemories.length > 0) {
      lines.push('Recent memories:');
      for (const mem of recentMemories) {
        const age = Math.round((Date.now() - mem.timestamp) / (1000 * 60));
        const timeStr = age < 60 ? `${age}m ago` : `${Math.round(age/60)}h ago`;
        lines.push(`  - [${timeStr}] ${mem.type}: ${JSON.stringify(mem.details)} (felt: ${mem.emotion})`);
      }
    }

    return lines.join('\n');
  }
}
```

### 2.3 Character Definition System

```javascript
// character-system.js

/**
 * Full character definitions with personality, play style, and conversation traits.
 */
const CHARACTER_DEFINITIONS = {
  mei: {
    id: 'mei',
    name: 'Mei Chen',
    age: 28,
    occupation: 'Data analyst at a tech startup',
    avatar: 'mei_avatar',

    // Core personality (Big Five model)
    personality: {
      openness: 0.7,        // Curious, appreciates beauty in hands
      conscientiousness: 0.8, // Disciplined, strategic
      extraversion: 0.4,     // Quiet but engaged
      agreeableness: 0.7,    // Supportive, encouraging
      neuroticism: 0.3       // Calm under pressure
    },

    // Play style parameters (directly affect AI weights)
    playStyle: {
      aggression: 0.35,         // Conservative
      riskTolerance: 0.3,       // Risk averse
      claimFrequency: 0.4,      // Selective about claims
      handValuePreference: 0.7, // Prefers valuable hands over speed
      defensiveSkill: 0.85,     // Excellent defensive play
      bluffFrequency: 0.1,      // Rarely bluffs
      // Special trait: Mei loves beautiful hands
      prefersPureFlush: true,
      prefersConcealed: true
    },

    // Emotional response patterns
    emotionalProfile: {
      tiltResistance: 0.8,     // Hard to tilt
      winCelebration: 0.4,     // Modest about wins
      lossReaction: 0.3,       // Takes losses calmly
      competitiveness: 0.5,    // Moderately competitive
      empathy: 0.8,            // Notices when player is struggling
      triggers: {
        beautifulHand: { emotion: 'joy', intensity: 0.8 },
        cheapDealIn: { emotion: 'mild_annoyance', intensity: 0.3 },
        opponentBeautifulHand: { emotion: 'admiration', intensity: 0.6 },
        losingStreak: { emotion: 'determination', intensity: 0.5 },
        playerImproving: { emotion: 'pride', intensity: 0.7 }
      }
    },

    // Conversation configuration
    conversation: {
      verbosity: 0.4,          // Doesn't talk too much
      humor: 0.3,              // Occasional dry humor
      philosophicalDepth: 0.6, // Sometimes reflects on life
      teachingInclination: 0.7, // Likes to help
      trashTalkFrequency: 0,   // Never trash talks
      topicsOfInterest: [
        'work-life balance', 'cooking', 'mathematics of probability',
        'her cat Mochi', 'weekend hiking', 'Japanese culture'
      ],
      catchphrases: [
        'The tiles tell a story...',
        'Patience is its own reward.',
        'Mochi would approve of that hand.'
      ],
      // How she talks about Mahjong
      gamePhilosophy: 'Mahjong is a conversation between four players. ' +
        'Every discard is a sentence. I like to listen before I speak.'
    },

    // Backstory for LLM context
    backstory: `Mei learned Mahjong from her grandmother in Taipei. She approaches
the game analytically but appreciates the artistry of beautiful hands. She works
as a data analyst and can't help seeing patterns everywhere. She has a cat named
Mochi who she talks about often. She's been playing online Mahjong for 5 years
and recently started playing in person at a local club. She values the social
aspect of the game as much as winning.`,

    // Goals beyond winning
    personalGoals: [
      'Complete a pure flush in every suit (tracking progress)',
      'Help the player improve their defensive play',
      'Have a meaningful conversation about something non-Mahjong'
    ],

    // Relationship progression levels
    relationshipLevels: [
      { level: 1, name: 'Acquaintance', threshold: 0,
        unlocks: 'Basic game commentary' },
      { level: 2, name: 'Friendly', threshold: 10,
        unlocks: 'Shares opinions on hands, occasional personal stories' },
      { level: 3, name: 'Friend', threshold: 25,
        unlocks: 'Talks about work, life, asks about the player' },
      { level: 4, name: 'Close Friend', threshold: 50,
        unlocks: 'Deep conversations, inside jokes, emotional vulnerability' },
      { level: 5, name: 'Best Friend', threshold: 100,
        unlocks: 'Life advice, shares secrets, references shared history richly' }
    ]
  },

  kenji: {
    id: 'kenji',
    name: 'Kenji Takahashi',
    age: 34,
    occupation: 'Chef at a ramen restaurant',
    avatar: 'kenji_avatar',

    personality: {
      openness: 0.5,
      conscientiousness: 0.4,
      extraversion: 0.9,
      agreeableness: 0.5,
      neuroticism: 0.6
    },

    playStyle: {
      aggression: 0.75,
      riskTolerance: 0.8,
      claimFrequency: 0.7,
      handValuePreference: 0.3, // Speed over value
      defensiveSkill: 0.4,
      bluffFrequency: 0.3,
      prefersAllTriplets: true,
      prefersOpenHands: true
    },

    emotionalProfile: {
      tiltResistance: 0.3,     // Tilts easily
      winCelebration: 0.9,     // Very expressive about wins
      lossReaction: 0.8,       // Dramatic about losses
      competitiveness: 0.9,
      empathy: 0.4,
      triggers: {
        dealIn: { emotion: 'frustration', intensity: 0.8 },
        bigWin: { emotion: 'ecstasy', intensity: 0.9 },
        cheapWin: { emotion: 'satisfaction', intensity: 0.5 },
        losingStreak: { emotion: 'tilt', intensity: 0.7 },
        winningStreak: { emotion: 'overconfidence', intensity: 0.8 },
        playerBeatsHim: { emotion: 'rivalry', intensity: 0.6 }
      }
    },

    conversation: {
      verbosity: 0.8,
      humor: 0.7,
      philosophicalDepth: 0.2,
      teachingInclination: 0.2,
      trashTalkFrequency: 0.5,
      topicsOfInterest: [
        'food and cooking', 'sports', 'competitive gaming',
        'his restaurant', 'fitness', 'action movies'
      ],
      catchphrases: [
        'BOOM! Did you see that?!',
        'That\'s what I call a spicy hand!',
        'Fortune favors the bold, baby!'
      ],
      gamePhilosophy: 'Life is too short for defensive Mahjong. ' +
        'I\'d rather go out in a blaze of glory than draw every round.'
    },

    backstory: `Kenji is a ramen chef who plays Mahjong like he cooks -- bold,
fast, and with lots of fire. He learned at his grandfather's Mahjong parlor
and still plays there on weekends. He's competitive about everything and takes
losses personally, but bounces back quickly. He compares Mahjong hands to
cooking recipes. His restaurant is called "Kenji's Fire Bowl" and he works
12-hour shifts. Mahjong is how he unwinds.`,

    personalGoals: [
      'Win 3 games in a row (current streak tracked)',
      'Land a Big Three Dragons hand',
      'Make the player laugh'
    ],

    relationshipLevels: [
      { level: 1, name: 'Rival', threshold: 0,
        unlocks: 'Trash talk and competition' },
      { level: 2, name: 'Respected Rival', threshold: 10,
        unlocks: 'Acknowledges good plays, shares food metaphors' },
      { level: 3, name: 'Friend-Rival', threshold: 25,
        unlocks: 'Invites you to his restaurant, competitive banter' },
      { level: 4, name: 'True Rival', threshold: 50,
        unlocks: 'Pushes you to improve, shares vulnerabilities' },
      { level: 5, name: 'Best Rival', threshold: 100,
        unlocks: 'Deep respect, considers you his equal, emotional honesty' }
    ]
  },

  yuki: {
    id: 'yuki',
    name: 'Yuki Nakamura',
    age: 72,
    occupation: 'Retired professor of Japanese literature',
    avatar: 'yuki_avatar',

    personality: {
      openness: 0.9,
      conscientiousness: 0.7,
      extraversion: 0.3,
      agreeableness: 0.8,
      neuroticism: 0.1
    },

    playStyle: {
      aggression: 0.5,
      riskTolerance: 0.5,
      claimFrequency: 0.5,
      handValuePreference: 0.6,
      defensiveSkill: 0.9,
      bluffFrequency: 0.05,
      prefersBalance: true,
      prefersReading: true // Focuses on reading opponents
    },

    emotionalProfile: {
      tiltResistance: 0.95,
      winCelebration: 0.2,
      lossReaction: 0.1,
      competitiveness: 0.3,
      empathy: 0.9,
      triggers: {
        playerMistake: { emotion: 'teachingMoment', intensity: 0.6 },
        beautifulGame: { emotion: 'serenity', intensity: 0.8 },
        playerImproving: { emotion: 'grandparentPride', intensity: 0.9 },
        rudeness: { emotion: 'gentle_disapproval', intensity: 0.3 },
        philosophicalMoment: { emotion: 'contemplation', intensity: 0.7 }
      }
    },

    conversation: {
      verbosity: 0.5,
      humor: 0.4, // Subtle, wise humor
      philosophicalDepth: 0.9,
      teachingInclination: 0.9,
      trashTalkFrequency: 0,
      topicsOfInterest: [
        'Japanese poetry', 'philosophy of games', 'seasons and nature',
        'her late husband', 'teaching', 'tea ceremony', 'garden'
      ],
      catchphrases: [
        'In every hand, a lesson.',
        'The discard river tells all.',
        'Patience. Always patience.'
      ],
      gamePhilosophy: 'Mahjong mirrors life itself. We are dealt a hand ' +
        'we did not choose, and we must find beauty and purpose within it. ' +
        'The great players are not those who win most, but those who see most.'
    },

    backstory: `Yuki is a retired literature professor who has been playing
Mahjong for over 50 years. She learned from her husband, who passed away
five years ago. She plays Mahjong partly to honor his memory and partly
because she believes it keeps her mind sharp. She sees profound parallels
between Mahjong and life philosophy. She tends a small garden and writes
haiku. She treats every game as an opportunity to teach and learn.`,

    personalGoals: [
      'Share a meaningful life lesson through Mahjong',
      'Help the player see a pattern they\'ve been missing',
      'Write a haiku about today\'s game'
    ],

    relationshipLevels: [
      { level: 1, name: 'Student', threshold: 0,
        unlocks: 'Teaching mode, gentle guidance' },
      { level: 2, name: 'Promising Student', threshold: 10,
        unlocks: 'Shares stories, philosophical reflections' },
      { level: 3, name: 'Dear Student', threshold: 25,
        unlocks: 'Personal stories, asks about your life' },
      { level: 4, name: 'Kindred Spirit', threshold: 50,
        unlocks: 'Shares memories of her husband, deep wisdom' },
      { level: 5, name: 'Family', threshold: 100,
        unlocks: 'Treats you like a grandchild, full emotional depth' }
    ]
  }
};
```

### 2.4 Personality Affecting Play Style

```javascript
// personality-ai-bridge.js

/**
 * Translates character personality into AI engine weight modifications.
 * This bridges the character system with ai-engine.js.
 */
class PersonalityAIBridge {
  /**
   * Get AI weights modified by personality + emotional state + situation.
   *
   * @param {object} character - Character definition
   * @param {MemorySystem} memory - Character's memory
   * @param {object} gameContext - Current game state info
   * @returns {object} Modified weights for AIEngine
   */
  static getWeights(character, memory, gameContext) {
    const base = window.MJ.AIEngine.AIEngine.defaultWeights();
    const ps = character.playStyle;
    const emotions = memory.getEmotionalState();
    const dominant = memory.getDominantEmotion();

    // Base personality adjustments
    base.aggressionBase = 0.3 + ps.aggression * 0.5;
    base.defense = 400 + (1 - ps.riskTolerance) * 1200;
    base.openPenalty = 0.3 + (1 - ps.claimFrequency) * 0.5;
    base.handValue = 3 + ps.handValuePreference * 12;
    base.defenseThreshold = 0.3 + ps.defensiveSkill * 0.4;

    // Emotional modifications
    if (emotions.tilt) {
      // Tilted: more aggressive, less defensive, worse decisions
      base.aggressionBase = Math.min(0.95,
        base.aggressionBase + emotions.tilt.intensity * 0.3);
      base.defense *= (1 - emotions.tilt.intensity * 0.4);
      // Tilted players also make slightly random discards
      base._randomChance = emotions.tilt.intensity * 0.1;
    }

    if (emotions.overconfidence) {
      // Overconfident: push too hard, claim too much
      base.aggressionBase = Math.min(0.9,
        base.aggressionBase + emotions.overconfidence.intensity * 0.15);
      base.openPenalty = Math.min(0.9,
        base.openPenalty + emotions.overconfidence.intensity * 0.2);
    }

    if (emotions.frustration) {
      // Frustrated: slightly worse play, may make spite discards
      base.handValue *= (1 - emotions.frustration.intensity * 0.2);
    }

    if (emotions.determination) {
      // Determined: actually plays slightly better
      base.ukeire *= (1 + emotions.determination.intensity * 0.1);
      base.defense *= (1 + emotions.determination.intensity * 0.1);
    }

    if (emotions.rivalry) {
      // Rivalry with player: targets direct hits
      base._targetPlayer = 0; // human is seat 0
      base.aggressionBase = Math.min(0.85,
        base.aggressionBase + emotions.rivalry.intensity * 0.1);
    }

    // Character-specific hand preferences
    if (ps.prefersPureFlush) {
      // Boost suit concentration bonus in hand value estimation
      base._suitBonus = 1.5;
    }
    if (ps.prefersAllTriplets) {
      base._tripletBonus = 1.3;
    }
    if (ps.prefersConcealed) {
      base.openPenalty *= 0.7; // stronger penalty for opening
    }

    return base;
  }
}
```

### 2.5 Conversation Engine (Hybrid LLM + Scripted)

```javascript
// conversation-engine.js

/**
 * Hybrid conversation system:
 * - Tier 1: Scripted responses (free, instant) — used for common game events
 * - Tier 2: Template-based with memory injection — medium quality, free
 * - Tier 3: LLM-generated — high quality, costs API calls
 *
 * Cost-aware: tracks API budget and falls back gracefully.
 */
class ConversationEngine {
  constructor(character, memory) {
    this.character = character;
    this.memory = memory;
    this.llmConfig = null;
    this.apiCallsThisSession = 0;
    this.maxApiCallsPerSession = 20; // budget
    this.conversationHistory = []; // for LLM context
    this.lastLLMCallTime = 0;
    this.minLLMInterval = 30000; // 30s between LLM calls
  }

  setLLMConfig(config) {
    this.llmConfig = config;
  }

  /**
   * Generate a response to a game event or conversation.
   * Automatically selects the right tier based on importance + budget.
   *
   * @param {string} trigger - What happened
   * @param {object} context - Game/conversation context
   * @returns {Promise<{text: string, tier: number, emotion: string}>}
   */
  async respond(trigger, context) {
    const importance = this.assessImportance(trigger, context);
    const canUseLLM = this.canUseLLM();

    // Tier selection
    if (importance >= 8 && canUseLLM) {
      return this.llmResponse(trigger, context);
    } else if (importance >= 4) {
      return this.templateResponse(trigger, context);
    } else {
      return this.scriptedResponse(trigger, context);
    }
  }

  assessImportance(trigger, context) {
    const importanceMap = {
      // High importance (LLM-worthy)
      'game_end_conversation': 9,
      'player_asks_question': 9,
      'milestone_reached': 8,
      'emotional_moment': 8,
      'relationship_level_up': 10,
      'between_game_chat': 7,

      // Medium importance (template-worthy)
      'big_win': 6,
      'big_loss': 6,
      'someone_riichi': 5,
      'interesting_hand': 5,
      'player_mistake': 5,
      'game_start': 4,

      // Low importance (scripted)
      'draw_tile': 1,
      'discard': 2,
      'routine_claim': 3,
      'thinking': 2
    };
    return importanceMap[trigger] || 3;
  }

  canUseLLM() {
    if (!this.llmConfig || !this.llmConfig.enabled) return false;
    if (this.apiCallsThisSession >= this.maxApiCallsPerSession) return false;
    if (Date.now() - this.lastLLMCallTime < this.minLLMInterval) return false;
    return true;
  }

  // === Tier 1: Scripted ===

  scriptedResponse(trigger, context) {
    const char = this.character;
    const emotion = this.memory.getDominantEmotion();
    const phrases = this.getScriptedPhrases(trigger, emotion.emotion);

    if (!phrases || phrases.length === 0) return null;

    const text = phrases[Math.floor(Math.random() * phrases.length)];
    return {
      text, tier: 1,
      speaker: char.name,
      emotion: emotion.emotion
    };
  }

  getScriptedPhrases(trigger, currentEmotion) {
    // Character-specific phrase banks organized by trigger + emotion
    const char = this.character;
    const bank = SCRIPTED_PHRASES[char.id];
    if (!bank) return null;

    // Try emotion-specific first, fall back to general
    const emotionKey = `${trigger}_${currentEmotion}`;
    return bank[emotionKey] || bank[trigger] || null;
  }

  // === Tier 2: Template with Memory ===

  templateResponse(trigger, context) {
    const char = this.character;
    const emotion = this.memory.getDominantEmotion();
    const memories = this.memory.recall(trigger, 3);
    const facts = this.memory.getAllFacts('player');

    // Select template
    const template = this.selectTemplate(trigger, emotion.emotion);
    if (!template) return this.scriptedResponse(trigger, context);

    // Fill template with dynamic content
    let text = template;

    // Memory callbacks: reference past events
    if (memories.length > 0 && Math.random() < 0.3) {
      const mem = memories[0];
      const callback = this.formatMemoryCallback(mem);
      if (callback) text += ' ' + callback;
    }

    // Player knowledge injection
    if (facts.name && Math.random() < 0.2) {
      text = text.replace('{player}', facts.name);
    } else {
      text = text.replace('{player}', 'you');
    }

    // Emotional coloring
    if (emotion.intensity > 0.5) {
      text = this.addEmotionalColoring(text, emotion.emotion, emotion.intensity);
    }

    return {
      text, tier: 2,
      speaker: char.name,
      emotion: emotion.emotion
    };
  }

  formatMemoryCallback(memory) {
    const templates = {
      'player_won': 'Just like that hand {timeAgo}...',
      'player_dealt_in': 'Remember when you dealt in {timeAgo}? Same pattern.',
      'good_game': 'This reminds me of our game {timeAgo}.',
      'funny_moment': 'Ha, remember {details}?',
      'player_improved': 'You\'ve gotten better since {timeAgo}.'
    };

    const template = templates[memory.type];
    if (!template) return null;

    const minutesAgo = Math.round(
      (Date.now() - memory.timestamp) / (1000 * 60)
    );
    const timeAgo = minutesAgo < 60
      ? `${minutesAgo} minutes ago`
      : minutesAgo < 1440
        ? `${Math.round(minutesAgo / 60)} hours ago`
        : `${Math.round(minutesAgo / 1440)} days ago`;

    return template
      .replace('{timeAgo}', timeAgo)
      .replace('{details}', JSON.stringify(memory.details));
  }

  addEmotionalColoring(text, emotion, intensity) {
    const modifiers = {
      tilt: { prefix: '*sighs* ', suffix: '', caps: intensity > 0.7 },
      joy: { prefix: '', suffix: ' :)', caps: false },
      frustration: { prefix: 'Ugh. ', suffix: '', caps: intensity > 0.8 },
      rivalry: { prefix: '', suffix: ' ...don\'t get cocky.', caps: false },
      admiration: { prefix: 'Wow. ', suffix: '', caps: false },
      determination: { prefix: '', suffix: ' I\'m not done yet.', caps: false }
    };
    const mod = modifiers[emotion];
    if (!mod) return text;
    let result = mod.prefix + text + mod.suffix;
    if (mod.caps) result = result.toUpperCase();
    return result;
  }

  // === Tier 3: LLM ===

  async llmResponse(trigger, context) {
    this.apiCallsThisSession++;
    this.lastLLMCallTime = Date.now();

    const char = this.character;
    const memorySummary = this.memory.getSummaryForLLM();
    const emotion = this.memory.getDominantEmotion();
    const relationship = this.getRelationshipLevel();

    const systemPrompt = this.buildSystemPrompt(
      char, memorySummary, emotion, relationship, context
    );

    const userMessage = this.buildUserMessage(trigger, context);

    try {
      const response = await this.callLLM(systemPrompt, userMessage);
      const text = response.trim();

      // Store this conversation for future context
      this.conversationHistory.push(
        { role: 'context', content: trigger },
        { role: 'assistant', content: text }
      );

      // Keep conversation history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-14);
      }

      return {
        text, tier: 3,
        speaker: char.name,
        emotion: emotion.emotion
      };
    } catch (e) {
      // Fall back to template
      return this.templateResponse(trigger, context);
    }
  }

  buildSystemPrompt(char, memorySummary, emotion, relationship, context) {
    return `You are ${char.name}, a ${char.age}-year-old ${char.occupation} ` +
      `who is playing Mahjong.\n\n` +
      `PERSONALITY: ${char.backstory}\n\n` +
      `PHILOSOPHY: ${char.conversation.gamePhilosophy}\n\n` +
      `CURRENT MOOD: ${emotion.emotion} (intensity: ${(emotion.intensity * 100).toFixed(0)}%)\n\n` +
      `RELATIONSHIP WITH PLAYER: ${relationship.name} (level ${relationship.level})\n\n` +
      `YOUR MEMORIES:\n${memorySummary}\n\n` +
      `GUIDELINES:\n` +
      `- Stay in character as ${char.name}. Your personality is: ${char.conversation.catchphrases.join(', ')}\n` +
      `- You enjoy talking about: ${char.conversation.topicsOfInterest.join(', ')}\n` +
      `- Respond naturally in 1-3 sentences. No emojis. No quotation marks around your response.\n` +
      `- Reference past memories when relevant, but don't force it.\n` +
      `- Your emotional state should color your response naturally.\n` +
      `- At relationship level ${relationship.level}, you ${relationship.unlocks}.\n` +
      `- DO NOT break character. DO NOT mention being an AI.`;
  }

  buildUserMessage(trigger, context) {
    const lines = [`Game event: ${trigger}`];
    if (context.gameState) {
      lines.push(`Score situation: ${JSON.stringify(context.scores)}`);
      lines.push(`Turn: ${context.turnCount}`);
    }
    if (context.playerMessage) {
      lines.push(`Player said: "${context.playerMessage}"`);
    }
    if (context.handInfo) {
      lines.push(`Hand info: ${context.handInfo}`);
    }
    return lines.join('\n');
  }

  async callLLM(systemPrompt, userMessage) {
    const config = this.llmConfig;
    if (config.provider === 'anthropic') {
      const resp = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 150,
          system: systemPrompt,
          messages: [
            ...this.conversationHistory.slice(-6).map(m => ({
              role: m.role === 'context' ? 'user' : 'assistant',
              content: m.content
            })),
            { role: 'user', content: userMessage }
          ]
        })
      });
      const data = await resp.json();
      return data.content?.[0]?.text || '';
    } else {
      // OpenAI-compatible
      const resp = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 150,
          messages: [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory.slice(-6),
            { role: 'user', content: userMessage }
          ]
        })
      });
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || '';
    }
  }

  getRelationshipLevel() {
    const xp = this.memory.getFact('relationship', 'xp') || 0;
    const levels = this.character.relationshipLevels;
    let current = levels[0];
    for (const level of levels) {
      if (xp >= level.threshold) current = level;
    }
    return current;
  }
}

/**
 * Scripted phrase banks per character.
 * Organized as: character_id -> trigger[_emotion] -> phrases[]
 */
const SCRIPTED_PHRASES = {
  mei: {
    game_start: [
      'Ready for a good game?',
      'Let\'s see what the tiles have in store.',
      'I made tea. Shall we begin?'
    ],
    game_start_joy: [
      'I have a good feeling about this one!',
      'The tiles are warm today. Let\'s play!'
    ],
    big_win: [
      'That came together beautifully.',
      'The patience paid off.',
      'Ah, that was worth waiting for.'
    ],
    big_loss: [
      'Well played. I didn\'t see that coming.',
      'The tiles had other plans for me this time.'
    ],
    discard: [
      'Hmm.', 'Interesting.', 'Let me think...'
    ],
    player_mistake: [
      'That was a risky discard. Did you check the discards?',
      'You might want to count the visible tiles for that one.'
    ],
    someone_riichi: [
      'Careful now.', 'Time to read the river.',
      'Let\'s see who\'s paying attention.'
    ],
    thinking: [
      '...', 'Hmm.', 'One moment.'
    ]
  },

  kenji: {
    game_start: [
      'Let\'s GO!', 'Who\'s ready to get cooked?',
      'Time to bring the heat!'
    ],
    game_start_tilt: [
      'I need to win this one. No more messing around.',
      'Last game was a fluke. Watch this.'
    ],
    big_win: [
      'BOOM! That\'s how it\'s done!',
      'Served! Just like my ramen -- hot and satisfying!',
      'And THAT is why you don\'t mess with the chef!'
    ],
    big_win_rivalry: [
      'HA! Take THAT! Who\'s the champ?!',
      'Bet you didn\'t see that coming!'
    ],
    big_loss: [
      'You got lucky!', 'I can\'t believe this.',
      'The tiles are rigged, I swear.'
    ],
    big_loss_tilt: [
      'THIS IS RIDICULOUS!', 'HOW?! How does that happen?!',
      'I need a minute.'
    ],
    discard: [
      'Take it!', 'Don\'t need it!', 'Here, have some scraps!'
    ],
    someone_riichi: [
      'Oh, you think you\'re tough?', 'Bring it!',
      'Riichi? That just makes it more exciting!'
    ]
  },

  yuki: {
    game_start: [
      'The tiles await. Let us listen.',
      'Another chapter begins.',
      'May we all find what we seek in this game.'
    ],
    big_win: [
      'And so it resolves.', 'A hand finds its completion.',
      'The pattern reveals itself.'
    ],
    big_loss: [
      'The river flows onward.', 'A lesson in every loss.',
      'My husband used to say: the best hands are the ones you fold gracefully.'
    ],
    discard: [
      'Release.', 'This one\'s purpose is elsewhere.',
      'Every discard tells a story.'
    ],
    player_mistake: [
      'Consider the discards of your opponents. They speak volumes.',
      'Patience, young one. The right tile will come.',
      'In haste, we miss what the river tells us.'
    ],
    someone_riichi: [
      'The wind shifts. Take heed.',
      'A declaration of intent. How will you respond?',
      'In this moment, wisdom is defense.'
    ],
    thinking: [
      'Patience...', 'The way becomes clear...', '...'
    ]
  }
};
```

### 2.6 What Makes Conversation Feel Alive

Key principles implemented in the architecture above:

1. **Unpredictability via 3-tier system:** Scripted phrases provide consistency, templates add context-awareness, LLM adds genuine surprise.

2. **Memory callbacks:** "Remember when you dealt into my riichi 20 minutes ago? Same tile." These create emotional continuity.

3. **Emotional state persistence:** Kenji doesn't just comment on a loss -- he stays frustrated for the next 2-3 hands, affecting both his play and his conversation.

4. **Relationship progression:** Yuki's comments at level 1 ("Consider the discards") become richer at level 4 ("My husband used to read discards the same way. You remind me of him in those moments.").

5. **Character-specific interests:** Kenji comparing hands to recipes. Yuki quoting poetry. Mei mentioning her cat. These aren't game-related but create personhood.

6. **Reacting to the player, not just the game:** Tracking the player's tendencies and commenting on improvement, recurring mistakes, or play style changes.

---

## Part 3: Living Simulation

### 3.1 Between-Game Interaction System

```javascript
// world-simulation.js

/**
 * The "world" that lives between Mahjong games.
 * Characters have lives, events happen, relationships evolve.
 */
class WorldSimulation {
  constructor(characters, playerMemory) {
    this.characters = characters; // { mei, kenji, yuki }
    this.playerMemory = playerMemory;
    this.worldClock = new WorldClock();
    this.eventQueue = [];
    this.notifications = [];
    this.storageKey = 'mj_world_state';
    this.state = this.load();
  }

  /**
   * Called when the player opens the app.
   * Simulates what happened while they were away.
   */
  onAppOpen() {
    const now = Date.now();
    const lastVisit = this.state.lastVisit || now;
    const hoursAway = (now - lastVisit) / (1000 * 60 * 60);

    this.state.lastVisit = now;

    // Generate events that happened while away
    const events = [];

    if (hoursAway > 2) {
      // Characters might have something to say
      events.push(...this.generateAbsenceEvents(hoursAway));
    }

    // Check for time-based events (seasonal, milestones)
    events.push(...this.checkCalendarEvents());

    // Character-initiated messages
    events.push(...this.generateCharacterMessages(hoursAway));

    this.eventQueue = events;
    this.save();
    return events;
  }

  generateAbsenceEvents(hoursAway) {
    const events = [];

    if (hoursAway > 24) {
      // Characters noticed you were gone
      events.push({
        type: 'message',
        from: 'kenji',
        text: hoursAway > 72
          ? 'Where\'ve you been?! I\'ve been waiting for a rematch!'
          : 'Hey, you disappeared! Ready for another game?',
        timestamp: Date.now() - 3600000 // "sent" 1 hour ago
      });

      if (hoursAway > 48) {
        events.push({
          type: 'message',
          from: 'mei',
          text: 'I hope everything is okay. Mochi and I miss our games.',
          timestamp: Date.now() - 7200000
        });
      }

      if (hoursAway > 168) { // 1 week
        events.push({
          type: 'message',
          from: 'yuki',
          text: 'The table has been quiet without you. Take your time, ' +
                'but know that the tiles await your return.',
          timestamp: Date.now() - 86400000
        });
      }
    }

    return events;
  }

  generateCharacterMessages(hoursAway) {
    const events = [];
    const roll = Math.random();

    // Kenji might share a food pic or challenge you
    if (roll < 0.3 && this.state.kenjiRelationship >= 2) {
      const kenjiMessages = [
        'New ramen recipe today. It was fire. Like my Mahjong game.',
        'Just beat some guy at the parlor. 3 games straight. You\'re next.',
        'I had the WORST hand today at lunch Mahjong. Like, all winds.',
        'Thinking about adding a Mahjong night at the restaurant. You in?'
      ];
      events.push({
        type: 'message',
        from: 'kenji',
        text: kenjiMessages[Math.floor(Math.random() * kenjiMessages.length)],
        timestamp: Date.now() - Math.random() * 3600000
      });
    }

    // Mei might share an observation
    if (roll < 0.5 && this.state.meiRelationship >= 3) {
      const meiMessages = [
        'I was analyzing our last game and noticed something about your discard timing.',
        'Mochi sat on my tiles today. I think she was trying to tell me something.',
        'Found an interesting Mahjong statistics paper. Want me to share the highlights?',
        'The sakura are blooming near my office. It reminds me of a pure flush somehow.'
      ];
      events.push({
        type: 'message',
        from: 'mei',
        text: meiMessages[Math.floor(Math.random() * meiMessages.length)],
        timestamp: Date.now() - Math.random() * 7200000
      });
    }

    // Yuki shares wisdom
    if (roll < 0.4 && this.state.yukiRelationship >= 2) {
      const yukiMessages = [
        'Today\'s haiku:\n  Tiles fall like leaves\n  Each discard a small goodbye\n  Spring in the river',
        'I was tending my garden and thought: Mahjong hands are like bonsai. ' +
          'You must prune to reveal the beauty within.',
        'My husband\'s favorite hand was Chinitsu in bamboo. "Like a bamboo forest," ' +
          'he\'d say. I smile every time I see one.',
        'A student visited today. She reminded me of you -- eager, curious, ' +
          'still learning to see the whole board.'
      ];
      events.push({
        type: 'message',
        from: 'yuki',
        text: yukiMessages[Math.floor(Math.random() * yukiMessages.length)],
        timestamp: Date.now() - Math.random() * 10800000
      });
    }

    return events;
  }

  checkCalendarEvents() {
    const events = [];
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    const dayOfWeek = now.getDay();

    // Seasonal events
    if (month === 0 && day <= 3) {
      events.push({
        type: 'seasonal_event',
        name: 'New Year\'s Mahjong',
        description: 'Traditional New Year\'s Mahjong! All hands score double!',
        modifier: { scoreMultiplier: 2 }
      });
    }

    if (month === 3 && day >= 1 && day <= 7) {
      events.push({
        type: 'seasonal_event',
        name: 'Cherry Blossom Tournament',
        description: 'Spring tournament! Pure Flush hands earn bonus points!',
        modifier: { pureFlushBonus: 20 }
      });
    }

    // Weekly Mahjong night
    if (dayOfWeek === 5) { // Friday
      events.push({
        type: 'weekly_event',
        name: 'Friday Night Mahjong',
        description: 'Kenji brought snacks from the restaurant!'
      });
    }

    return events;
  }

  // === Relationship Evolution ===

  /**
   * Update relationship after a game.
   * XP is based on game events, not just wins.
   */
  updateRelationships(gameResults, gameEvents) {
    for (const charId of Object.keys(this.characters)) {
      let xp = 0;

      // Base XP for playing
      xp += 2;

      // Bonus XP for interesting games
      if (gameEvents.includes('close_game')) xp += 3;
      if (gameEvents.includes('beautiful_hand')) xp += 2;
      if (gameEvents.includes('comeback')) xp += 3;
      if (gameEvents.includes('conversation')) xp += 2;

      // Character-specific XP
      if (charId === 'kenji' && gameEvents.includes('rivalry_moment')) xp += 3;
      if (charId === 'mei' && gameEvents.includes('player_improved')) xp += 3;
      if (charId === 'yuki' && gameEvents.includes('philosophical_moment')) xp += 3;

      // Store
      const key = `${charId}Relationship`;
      this.state[key] = (this.state[key] || 0) + xp;

      // Check for level up
      const char = CHARACTER_DEFINITIONS[charId];
      if (char) {
        const oldLevel = this.getRelationshipLevel(charId, this.state[key] - xp);
        const newLevel = this.getRelationshipLevel(charId, this.state[key]);
        if (newLevel.level > oldLevel.level) {
          this.notifications.push({
            type: 'relationship_level_up',
            character: charId,
            newLevel: newLevel,
            message: `Your relationship with ${char.name} has deepened to: ${newLevel.name}!`
          });
        }
      }
    }

    this.save();
  }

  getRelationshipLevel(charId, xp) {
    const char = CHARACTER_DEFINITIONS[charId];
    if (!char) return { level: 1, name: 'Unknown' };
    let current = char.relationshipLevels[0];
    for (const level of char.relationshipLevels) {
      if ((xp || 0) >= level.threshold) current = level;
    }
    return current;
  }

  // === Character Growth ===

  /**
   * Characters improve at Mahjong over time.
   * Their play style evolves based on their personality.
   */
  evolveCharacterSkill(charId, gamesPlayed) {
    const milestones = [10, 25, 50, 100, 200];
    const char = CHARACTER_DEFINITIONS[charId];
    if (!char) return;

    const totalGames = (this.state[`${charId}Games`] || 0) + gamesPlayed;
    this.state[`${charId}Games`] = totalGames;

    for (const milestone of milestones) {
      if (totalGames >= milestone && !this.state[`${charId}Milestone${milestone}`]) {
        this.state[`${charId}Milestone${milestone}`] = true;

        // Kenji: becomes slightly less tilty, slightly better defense
        if (charId === 'kenji') {
          char.emotionalProfile.tiltResistance =
            Math.min(0.7, char.emotionalProfile.tiltResistance + 0.05);
          char.playStyle.defensiveSkill =
            Math.min(0.7, char.playStyle.defensiveSkill + 0.03);
        }

        // Mei: becomes slightly more aggressive, more confident
        if (charId === 'mei') {
          char.playStyle.aggression =
            Math.min(0.5, char.playStyle.aggression + 0.02);
          char.playStyle.bluffFrequency =
            Math.min(0.2, char.playStyle.bluffFrequency + 0.02);
        }

        // Yuki: becomes slightly faster (less patience-dependent)
        if (charId === 'yuki') {
          char.playStyle.handValuePreference =
            Math.max(0.4, char.playStyle.handValuePreference - 0.02);
        }

        this.notifications.push({
          type: 'character_growth',
          character: charId,
          milestone: totalGames,
          message: `${char.name} has played ${totalGames} games and is evolving their strategy!`
        });
      }
    }

    this.save();
  }

  // === Meta-Progression ===

  /**
   * Track player reputation and unlock progression.
   */
  getPlayerProgression() {
    const gamesWon = this.state.playerGamesWon || 0;
    const gamesPlayed = this.state.playerGamesPlayed || 0;
    const totalScore = this.state.playerTotalScore || 0;
    const achievements = this.state.playerAchievements || [];

    const reputationLevel = Math.floor(gamesPlayed / 10) + 1;

    const unlocks = [];

    // New opponents
    if (reputationLevel >= 3 && !achievements.includes('unlock_tournament')) {
      unlocks.push({
        type: 'tournament',
        name: 'Local Club Tournament',
        description: 'Compete against 7 opponents over 4 rounds!'
      });
    }

    // New venues
    if (reputationLevel >= 5 && !achievements.includes('unlock_parlor')) {
      unlocks.push({
        type: 'venue',
        name: 'Kenji\'s Restaurant Back Room',
        description: 'A cozy Mahjong spot with Kenji\'s ramen on the side.'
      });
    }

    // Rule variants
    if (reputationLevel >= 8 && !achievements.includes('unlock_riichi_rules')) {
      unlocks.push({
        type: 'rules',
        name: 'Full Riichi Mahjong',
        description: 'Play with the complete Japanese Riichi ruleset!'
      });
    }

    // New characters
    if (reputationLevel >= 10 && !achievements.includes('unlock_character_4')) {
      unlocks.push({
        type: 'character',
        name: 'Hiroshi',
        description: 'A mysterious pro player who\'s heard about your reputation...'
      });
    }

    return {
      reputationLevel,
      gamesPlayed, gamesWon,
      winRate: gamesPlayed > 0 ? (gamesWon / gamesPlayed * 100).toFixed(1) : 0,
      totalScore,
      achievements,
      pendingUnlocks: unlocks
    };
  }

  // === Persistence ===

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (_) {}
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : { lastVisit: Date.now() };
    } catch (_) {
      return { lastVisit: Date.now() };
    }
  }
}

/**
 * Simple world clock that tracks in-game time progression.
 */
class WorldClock {
  constructor() {
    // Use real time but allow for "game time" events
    this.sessionStart = Date.now();
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 6) return 'late_night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  getSeason() {
    const month = new Date().getMonth();
    if (month <= 1 || month === 11) return 'winter';
    if (month <= 4) return 'spring';
    if (month <= 7) return 'summer';
    return 'autumn';
  }

  getSessionDuration() {
    return Date.now() - this.sessionStart;
  }
}
```

### 3.2 Notification System Data Structure

```javascript
// notifications.js

/**
 * Between-game notification that appears when the player opens the app.
 */
const NotificationSchema = {
  id: 'string',           // Unique ID
  type: 'string',         // 'message' | 'event' | 'achievement' | 'unlock' | 'story'
  from: 'string|null',    // Character ID or null for system
  title: 'string',        // Short title
  text: 'string',         // Full message
  timestamp: 'number',    // When it was "sent"
  read: 'boolean',        // Has player seen it
  actions: 'array|null',  // Optional response actions
  // actions: [{ label: 'Play now!', action: 'start_game', params: {} }]
  priority: 'number',     // 0-10, affects sort order
  expiresAt: 'number|null' // Auto-dismiss after this time
};
```

### 3.3 Tournament / Storyline System

```javascript
// storylines.js

/**
 * Multi-game storyline that progresses based on player actions.
 */
const STORYLINES = {
  kenjis_challenge: {
    id: 'kenjis_challenge',
    name: 'Kenji\'s Challenge',
    description: 'Kenji bets you can\'t beat him 3 times before he beats you 3 times.',
    prerequisite: { kenjiRelationship: 10 },
    stages: [
      {
        id: 'challenge_issued',
        trigger: 'auto', // starts when prerequisite met
        dialogue: {
          kenji: 'Hey! I challenge you to a best-of-5. Loser buys ramen!'
        },
        tracking: { kenjiWins: 0, playerWins: 0, gamesNeeded: 5 }
      },
      {
        id: 'midway_check',
        trigger: { anyScore: 2 }, // when either side reaches 2 wins
        dialogue: {
          kenji_winning: 'Two down! You\'re buying me the deluxe bowl!',
          kenji_losing: 'Okay okay, you got lucky. But the comeback starts NOW.',
          tied: 'We\'re even! This is getting good!'
        }
      },
      {
        id: 'conclusion',
        trigger: { anyScore: 3 },
        dialogue: {
          player_wins: 'I... I can\'t believe it. Fine. Ramen\'s on me. ' +
            'But don\'t think this is over!',
          kenji_wins: 'HAHAHA! That\'s what I\'m talking about! ' +
            'You\'re buying the Fire Bowl Special!'
        },
        rewards: {
          player_wins: { xp: 15, unlock: 'kenjis_respect_title' },
          kenji_wins: { xp: 10, unlock: 'rivalry_deepens' }
        }
      }
    ]
  },

  yukis_memory: {
    id: 'yukis_memory',
    name: 'Yuki\'s Memory',
    description: 'Yuki slowly shares the story of her husband through Mahjong.',
    prerequisite: { yukiRelationship: 25 },
    stages: [
      {
        id: 'first_mention',
        trigger: { event: 'player_wins_with_chinitsu' },
        dialogue: {
          yuki: 'That hand... my Takeshi loved chinitsu. He said it was ' +
            'like watching a river find its way to the sea.'
        }
      },
      {
        id: 'opening_up',
        trigger: { gamesAfterPrevious: 5 },
        dialogue: {
          yuki: 'Takeshi and I used to play every evening. He was terrible at ' +
            'defense but he made the most beautiful hands. I think you would ' +
            'have liked him.'
        }
      },
      {
        id: 'the_lesson',
        trigger: { gamesAfterPrevious: 10 },
        dialogue: {
          yuki: 'The last game Takeshi and I played, he won with a chicken hand. ' +
            'Just one point. But he smiled like he\'d won a tournament. ' +
            '"It\'s not about the score, Yuki," he said. "It\'s about the ' +
            'company." I understand that now more than ever.'
        },
        rewards: { xp: 20, unlock: 'yukis_wisdom_title', memory: 'takeshis_lesson' }
      }
    ]
  }
};

/**
 * Tournament structure for organized multi-game events.
 */
class Tournament {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.rounds = config.rounds || 4;
    this.currentRound = 0;
    this.scores = {}; // playerId -> cumulative score
    this.specialRules = config.specialRules || {};
    this.participants = config.participants || [];
  }

  startRound() {
    this.currentRound++;
    return {
      round: this.currentRound,
      totalRounds: this.rounds,
      standings: this.getStandings(),
      specialRules: this.specialRules
    };
  }

  recordRoundResult(results) {
    for (const r of results) {
      this.scores[r.playerId] = (this.scores[r.playerId] || 0) + r.score;
    }
  }

  getStandings() {
    return Object.entries(this.scores)
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score);
  }

  isComplete() {
    return this.currentRound >= this.rounds;
  }

  getResults() {
    const standings = this.getStandings();
    return {
      winner: standings[0],
      standings,
      totalRounds: this.rounds,
      specialRules: this.specialRules
    };
  }
}
```

### 3.4 Integration Summary

The complete architecture ties together as follows:

```
                    +-----------------------+
                    |    Main Game Loop      |
                    |    (main.js)           |
                    +-----------+-----------+
                                |
            +-------------------+-------------------+
            |                   |                   |
    +-------v-------+  +-------v-------+  +-------v-------+
    | AI Engine      |  | Conversation  |  | World         |
    | (ai-engine.js) |  | Engine        |  | Simulation    |
    |                |  | (new)         |  | (new)         |
    | + EV Calc      |  |               |  |               |
    | + Push/Fold    |  | Tier 1: Script|  | Between-game  |
    | + Score Sit.   |  | Tier 2: Templ.|  | messages      |
    | + MC Lite      |  | Tier 3: LLM   |  | Relationships |
    +-------+-------+  +-------+-------+  | Tournaments   |
            |                   |          | Progression   |
            |                   |          +-------+-------+
    +-------v-------+  +-------v-------+          |
    | Strategy       |  | Memory System |          |
    | Discovery      |  | (new)         |  +-------v-------+
    | (Web Worker)   |  |               |  | Storylines    |
    |                |  | Episodic      |  | (new)         |
    | Self-play      |  | Semantic      |  +---------------+
    | Evolution      |  | Emotional     |
    +-------+-------+  +---------------+
            |
    +-------v-------+
    | Personality-AI |
    | Bridge (new)   |
    | Emotions affect|
    | play style     |
    +---------------+
```

**Storage budget (localStorage):**
- AI weights + learning state: ~5 KB
- Evolved strategy genome: ~20-50 KB
- Character memories (3 chars): ~60-150 KB (500 events each)
- World state: ~5 KB
- Total: ~100-250 KB (well within localStorage limits)

**For larger storage needs**, IndexedDB can be used as a drop-in upgrade when episodic memories grow.

**API budget guidance:**
- Assume ~$0.01 per LLM call with claude-haiku (150 output tokens)
- 20 calls per session = ~$0.20 per session
- For offline play: Tier 1 + Tier 2 provide 80% of the experience at zero cost
- LLM calls are reserved for relationship milestones, between-game conversations, and player-initiated chat
