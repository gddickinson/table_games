/**
 * game-theory.js — Game theory tools for all games
 * GTO mixing, Nash equilibrium, MDF, regret minimization, Kelly criterion
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // === 1. GTO Action Mixing ===
  class GTOMixer {
    /**
     * Given action frequencies, randomly select one action.
     * Example: mix({fold: 0.3, call: 0.5, raise: 0.2}) -> returns one action
     */
    static mix(frequencies) {
      const rand = Math.random();
      let cumulative = 0;
      for (const [action, freq] of Object.entries(frequencies)) {
        cumulative += freq;
        if (rand < cumulative) return action;
      }
      return Object.keys(frequencies).pop(); // fallback to last
    }

    /**
     * Calculate GTO frequencies for river decisions based on pot odds.
     * If betting pot-sized (offering 2:1), bluff 33% of value combos.
     * @param {number} betSize - bet as fraction of pot (0.5 = half pot, 1.0 = pot)
     * @param {number} handStrength - 0-1
     * @param {boolean} isIP - in position?
     */
    static getRiverFrequencies(betSize, handStrength, isIP) {
      const potOdds = betSize / (1 + betSize); // odds offered to opponent
      const bluffFreq = potOdds; // GTO bluff frequency = pot odds offered

      if (handStrength > 0.75) {
        // Strong hand: bet for value most of the time
        return { bet: 0.85, check: 0.15, fold: 0 };
      }
      if (handStrength > 0.5) {
        // Medium hand: mix between check and thin value bet
        return { bet: isIP ? 0.4 : 0.25, check: isIP ? 0.6 : 0.75, fold: 0 };
      }
      if (handStrength > 0.2) {
        // Weak hand: mostly check, sometimes bluff
        return { bet: bluffFreq * 0.5, check: 1 - bluffFreq * 0.5, fold: 0 };
      }
      // Trash: bluff at GTO frequency or give up
      return { bet: bluffFreq, check: 1 - bluffFreq, fold: 0 };
    }

    /**
     * Facing a bet: GTO defend frequency
     * Must defend at least (1 - potOdds) of range or opponent profits by always bluffing
     */
    static getDefenseFrequencies(betSize, handStrength) {
      const potOdds = betSize / (1 + betSize);
      const mdf = 1 - potOdds; // minimum defense frequency

      if (handStrength > 0.7) return { call: 0.7, raise: 0.3, fold: 0 };
      if (handStrength > mdf) return { call: 0.9, raise: 0.1, fold: 0 };
      if (handStrength > mdf * 0.7) return { call: 0.5, raise: 0, fold: 0.5 }; // borderline
      return { call: 0.1, raise: 0, fold: 0.9 };
    }
  }

  // === 2. Nash Equilibrium Push/Fold ===
  class NashPushFold {
    // Precomputed Nash push ranges for heads-up short stacks
    // Key: stack in BBs, Value: minimum hand strength to push
    static PUSH_THRESHOLDS = {
      3: 0.25,   // 3BB: push with top 75% of hands
      5: 0.30,   // 5BB: push with top 70%
      7: 0.35,   // 7BB: push with top 65%
      10: 0.40,  // 10BB: push with top 60%
      13: 0.45,  // 13BB: push with top 55%
      15: 0.50,  // 15BB: push with top 50%
    };

    static CALL_THRESHOLDS = {
      3: 0.35,
      5: 0.40,
      7: 0.45,
      10: 0.50,
      13: 0.55,
      15: 0.58,
    };

    /**
     * Should we push all-in? (short stack strategy)
     * @param {number} stackBBs - stack in big blinds
     * @param {number} handEquity - pre-flop equity 0-1
     * @param {string} position - 'early'|'middle'|'late'
     * @returns {{shouldPush: boolean, threshold: number}}
     */
    static shouldPush(stackBBs, handEquity, position) {
      if (stackBBs > 15) return { shouldPush: false, threshold: 1 }; // too deep

      const nearestStack = Object.keys(this.PUSH_THRESHOLDS)
        .map(Number).sort((a, b) => Math.abs(a - stackBBs) - Math.abs(b - stackBBs))[0];
      let threshold = this.PUSH_THRESHOLDS[nearestStack] || 0.5;

      // Position adjustment
      if (position === 'late') threshold -= 0.08;
      if (position === 'early') threshold += 0.05;

      return { shouldPush: handEquity >= threshold, threshold };
    }

    /**
     * Should we call an all-in?
     */
    static shouldCall(stackBBs, handEquity, potOdds) {
      if (stackBBs > 15) return null; // use normal decision

      const nearestStack = Object.keys(this.CALL_THRESHOLDS)
        .map(Number).sort((a, b) => Math.abs(a - stackBBs) - Math.abs(b - stackBBs))[0];
      const threshold = this.CALL_THRESHOLDS[nearestStack] || 0.5;

      // Adjust for pot odds -- need less equity with better odds
      const adjustedThreshold = threshold - (potOdds * 0.1);

      return { shouldCall: handEquity >= adjustedThreshold, threshold: adjustedThreshold };
    }
  }

  // === 3. Minimum Defense Frequency ===
  class MDF {
    /**
     * Calculate how often you must call/raise to prevent opponent from profiting with any bluff.
     * @param {number} betSize - bet as fraction of pot
     * @returns {number} minimum defense frequency 0-1
     */
    static calculate(betSize) {
      return 1 - (betSize / (1 + betSize));
    }

    /**
     * Am I defending enough? Compare actual fold rate vs MDF.
     * @param {number} foldRate - how often this player folds to bets
     * @param {number} betSize - typical bet size faced
     * @returns {{overfolding: boolean, exploitable: boolean, adjustment: number}}
     */
    static analyze(foldRate, betSize) {
      const mdf = this.calculate(betSize);
      const defending = 1 - foldRate;
      return {
        mdf,
        defending,
        overfolding: defending < mdf,
        exploitable: Math.abs(defending - mdf) > 0.1,
        adjustment: mdf - defending // positive = need to defend more
      };
    }
  }

  // === 4. Balanced Value-to-Bluff Ratio ===
  class ValueBluffRatio {
    /**
     * Calculate optimal bluff frequency based on bet sizing.
     * On the river, bet bluffs = value_bets x pot_odds_offered
     */
    static optimalBluffRatio(betSizePotFraction) {
      return betSizePotFraction / (1 + betSizePotFraction);
    }

    /**
     * Given N value combos and bet size, how many bluff combos should we have?
     */
    static bluffCombos(valueCombos, betSizePotFraction) {
      const ratio = this.optimalBluffRatio(betSizePotFraction);
      return Math.round(valueCombos * ratio / (1 - ratio));
    }

    /**
     * Is the player's bluff ratio balanced?
     */
    static analyzeBalance(bluffRate, betSizePotFraction) {
      const optimal = this.optimalBluffRatio(betSizePotFraction);
      return {
        optimal,
        actual: bluffRate,
        overbluffing: bluffRate > optimal * 1.3,
        underbluffing: bluffRate < optimal * 0.7,
        balanced: Math.abs(bluffRate - optimal) < optimal * 0.3
      };
    }
  }

  // === 5. Exploitative vs GTO Balance ===
  class ExploitGTOBalance {
    /**
     * Decide how much to deviate from GTO based on opponent info quality.
     * @param {number} sampleSize - hands observed against this opponent
     * @returns {number} exploit_weight 0-1 (0 = pure GTO, 1 = pure exploitative)
     */
    static getExploitWeight(sampleSize) {
      // With few samples, play GTO. With more data, exploit more.
      if (sampleSize < 10) return 0.1;
      if (sampleSize < 30) return 0.3;
      if (sampleSize < 100) return 0.5;
      if (sampleSize < 300) return 0.7;
      return 0.85; // never go pure exploit -- always keep some GTO
    }

    /**
     * Blend GTO and exploitative actions.
     * @param {string} gtoAction - what GTO says
     * @param {string} exploitAction - what reads say
     * @param {number} exploitWeight - 0-1
     */
    static blendDecision(gtoAction, exploitAction, exploitWeight) {
      if (gtoAction === exploitAction) return gtoAction;
      return Math.random() < exploitWeight ? exploitAction : gtoAction;
    }
  }

  // === 6. Regret Minimization ===
  class RegretMinimizer {
    constructor(actions) {
      this.actions = actions; // ['fold', 'call', 'raise']
      this.regretSum = {};
      this.strategySum = {};
      for (const a of actions) {
        this.regretSum[a] = 0;
        this.strategySum[a] = 0;
      }
      this.iterations = 0;
    }

    /**
     * Get current mixed strategy based on regret matching.
     */
    getStrategy() {
      const strategy = {};
      let total = 0;
      for (const a of this.actions) {
        strategy[a] = Math.max(0, this.regretSum[a]);
        total += strategy[a];
      }
      if (total > 0) {
        for (const a of this.actions) strategy[a] /= total;
      } else {
        for (const a of this.actions) strategy[a] = 1 / this.actions.length;
      }
      return strategy;
    }

    /**
     * Update regrets based on outcome.
     * @param {string} chosenAction
     * @param {Object} payoffs - {action: payoff} for each possible action
     */
    update(chosenAction, payoffs) {
      const chosenPayoff = payoffs[chosenAction] || 0;
      for (const a of this.actions) {
        const regret = (payoffs[a] || 0) - chosenPayoff;
        this.regretSum[a] += regret;
      }
      const strategy = this.getStrategy();
      for (const a of this.actions) {
        this.strategySum[a] += strategy[a];
      }
      this.iterations++;
    }

    /**
     * Get average strategy (converges to Nash equilibrium).
     */
    getAverageStrategy() {
      const avg = {};
      let total = 0;
      for (const a of this.actions) total += this.strategySum[a];
      if (total > 0) {
        for (const a of this.actions) avg[a] = this.strategySum[a] / total;
      } else {
        for (const a of this.actions) avg[a] = 1 / this.actions.length;
      }
      return avg;
    }
  }

  // === 7. Mixed Strategy for Mahjong ===
  class MahjongMixedStrategy {
    /**
     * When two discards are close in value, randomize to be unexploitable.
     * @param {Array} candidates - [{tile, score}] sorted by score desc
     * @returns {Object} tile to discard
     */
    static selectWithMixing(candidates) {
      if (candidates.length <= 1) return candidates[0];

      const best = candidates[0].score;
      const second = candidates[1].score;

      // If top two are within 5% of each other, randomize
      if (best > 0 && (best - second) / best < 0.05) {
        return Math.random() < 0.6 ? candidates[0] : candidates[1];
      }
      // If within 10%, slight randomization
      if (best > 0 && (best - second) / best < 0.10) {
        return Math.random() < 0.8 ? candidates[0] : candidates[1];
      }
      return candidates[0];
    }
  }

  // === 8. Information Denial (Dominoes) ===
  class InformationDenial {
    /**
     * Score a domino play based on how much information it denies opponents.
     * Playing a tile that controls scarce values = high denial.
     */
    static scoreDenial(tile, gameState, playerTiles) {
      let denial = 0;
      // If playing this tile removes a scarce value from the chain ends,
      // opponents who need that value are blocked
      const high = tile.high, low = tile.low;

      // Count how many of each value remain unseen
      const valueCounts = new Array(7).fill(0);
      // Values in player's hand
      for (const t of playerTiles) { valueCounts[t.high]++; valueCounts[t.low]++; }

      // Scarce values (few remaining) are more valuable to control
      if (valueCounts[high] <= 1) denial += 3; // we control this value
      if (valueCounts[low] <= 1) denial += 3;

      return denial;
    }
  }

  // === 9. Kelly Criterion ===
  class KellyCriterion {
    /**
     * Calculate optimal bet size as fraction of bankroll.
     * @param {number} winProb - probability of winning (0-1)
     * @param {number} odds - payout odds (e.g., 2.0 for even money)
     * @returns {number} fraction of bankroll to bet (0-1)
     */
    static optimalBet(winProb, odds) {
      // Kelly formula: f* = (bp - q) / b
      // where b = odds-1, p = win prob, q = 1-p
      const b = odds - 1;
      const q = 1 - winProb;
      const kelly = (b * winProb - q) / b;
      return Math.max(0, Math.min(kelly, 0.25)); // cap at 25% of bankroll (quarter Kelly)
    }

    /**
     * For Blackjack: optimal bet based on true count.
     * Higher count = higher edge = bigger bet.
     */
    static blackjackBet(trueCount, minBet, bankroll) {
      const edge = (trueCount - 1) * 0.005; // ~0.5% per true count above 1
      if (edge <= 0) return minBet;
      const kellyFraction = this.optimalBet(0.5 + edge, 2.0);
      return Math.max(minBet, Math.min(Math.floor(bankroll * kellyFraction), bankroll * 0.1));
    }

    /**
     * For Poker: should you buy into this game?
     * @param {number} winRate - your bb/100 win rate
     * @param {number} bankroll - total bankroll
     * @param {number} buyIn - game buy-in
     */
    static pokerBuyIn(winRate, bankroll, buyIn) {
      // Need 20-30 buy-ins minimum for the game
      const buyIns = bankroll / buyIn;
      return { canPlay: buyIns >= 20, buyIns: buyIns.toFixed(1), safe: buyIns >= 30 };
    }
  }

  // === Export all game theory classes ===
  root.MJ.GameTheory = {
    GTOMixer,
    NashPushFold,
    MDF,
    ValueBluffRatio,
    ExploitGTOBalance,
    RegretMinimizer,
    MahjongMixedStrategy,
    InformationDenial,
    KellyCriterion
  };

  if (typeof console !== 'undefined') console.log('[GameTheory] Module loaded');
})(typeof window !== 'undefined' ? window : global);
