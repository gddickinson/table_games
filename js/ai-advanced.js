/**
 * ai-advanced.js — Advanced AI improvements: score-aware strategy,
 * expected value calculation, push/fold decisions, and integrated controller.
 * See interfaces.js for API documentation.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // Lazy accessors for dependencies
  const AIE = () => root.MJ.AIEngine;
  const Tile = () => root.MJ.Tile;

  // =========================================================================
  // 1. ScoreSituationEvaluator (~100 lines)
  //    Tracks cumulative scores across rounds and adjusts strategy.
  // =========================================================================

  class ScoreSituationEvaluator {
    constructor() {
      this.playerScores = [0, 0, 0, 0];
      this.roundsLeft = 4;
      this.dealerSeat = 0;
    }

    /**
     * Copy current scores from player objects.
     * @param {Array} players - array with .score property
     */
    updateScores(players) {
      if (!players) return;
      for (let i = 0; i < 4; i++) {
        if (players[i] && typeof players[i].score === 'number') {
          this.playerScores[i] = players[i].score;
        }
      }
    }

    /** @param {number} n */
    setRoundsLeft(n) {
      this.roundsLeft = Math.max(0, n);
    }

    /**
     * Return placement 1-4 for the given player (1 = first).
     * @param {number} myIndex
     * @returns {number}
     */
    getPlacement(myIndex) {
      const my = this.playerScores[myIndex];
      let rank = 1;
      for (let i = 0; i < 4; i++) {
        if (i !== myIndex && this.playerScores[i] > my) rank++;
      }
      return rank;
    }

    /** @param {number} myIndex */
    isDealer(myIndex) {
      return myIndex === this.dealerSeat;
    }

    /**
     * Determine strategic posture based on score situation.
     * @param {number} myIndex
     * @returns {{ mode: string, aggressionMod: number, handValueMod: number, defenseMod: number }}
     */
    getStrategy(myIndex) {
      const myScore = this.playerScores[myIndex];
      const others = this.playerScores.filter((_, i) => i !== myIndex);
      const maxOther = Math.max(...others);
      const minOther = Math.min(...others);
      const placement = this.getPlacement(myIndex);
      const gap = myScore - maxOther;

      // Leading comfortably with few rounds left -- protect the lead
      if (placement === 1 && gap > 20 && this.roundsLeft <= 2) {
        return { mode: 'protect_lead', aggressionMod: -0.2, handValueMod: -0.3, defenseMod: 0.5 };
      }

      // Dead last with one round remaining -- go all-in
      if (placement === 4 && this.roundsLeft <= 1) {
        return { mode: 'desperate_attack', aggressionMod: 0.3, handValueMod: 0.5, defenseMod: -0.4 };
      }

      // Top two with few rounds left -- steady play
      if (placement <= 2 && this.roundsLeft <= 2) {
        return { mode: 'maintain', aggressionMod: 0, handValueMod: 0.1, defenseMod: 0.1 };
      }

      // Chasing first place -- push for value
      if (placement >= 2 && placement <= 3 && gap < -10 && this.roundsLeft >= 2) {
        return { mode: 'chase_first', aggressionMod: 0.15, handValueMod: 0.3, defenseMod: -0.1 };
      }

      // Dealer bonus -- dealers can afford to be aggressive (repeat chance)
      if (this.isDealer(myIndex)) {
        return { mode: 'dealer_bonus', aggressionMod: 0.1, handValueMod: 0.15, defenseMod: -0.05 };
      }

      // Far behind but still time to catch up -- cautious aggression
      if (placement >= 3 && this.roundsLeft >= 3) {
        return { mode: 'safe_play', aggressionMod: 0.05, handValueMod: 0.2, defenseMod: 0.05 };
      }

      return { mode: 'balanced', aggressionMod: 0, handValueMod: 0, defenseMod: 0 };
    }
  }

  // =========================================================================
  // 2. EVCalculator (~150 lines)
  //    Expected value calculation for discard decisions.
  // =========================================================================

  class EVCalculator {
    constructor() {}

    /**
     * Estimate probability of winning given shanten, acceptance count and
     * remaining turns.
     * @param {number} shanten
     * @param {number} ukeire  - total acceptance count
     * @param {number} turnsLeft
     * @returns {number} 0..1
     */
    winProbability(shanten, ukeire, turnsLeft) {
      if (shanten < 0) return 1.0;
      if (turnsLeft <= 0) return 0.0;
      const drawRate = ukeire / 136;
      if (shanten === 0) {
        // Tenpai: each draw has drawRate chance, over turnsLeft draws
        // Approximate: 1 - (1 - drawRate)^turnsLeft, capped
        return Math.min(0.95, 1 - Math.pow(1 - drawRate * 0.8, turnsLeft));
      }
      if (shanten === 1) {
        // Need to improve once then win; rough discount
        const improvePerTurn = drawRate * 0.5;
        const improveProb = Math.min(0.85, 1 - Math.pow(1 - improvePerTurn, turnsLeft));
        // After improving, have reduced turns
        const avgRemainingAfter = turnsLeft * 0.5;
        return Math.min(0.6, improveProb * this.winProbability(0, ukeire, avgRemainingAfter));
      }
      if (shanten === 2) {
        const improvePerTurn = drawRate * 0.3;
        const improveProb = Math.min(0.7, 1 - Math.pow(1 - improvePerTurn, turnsLeft));
        const avgRemainingAfter = turnsLeft * 0.4;
        return Math.min(0.3, improveProb * this.winProbability(1, ukeire, avgRemainingAfter));
      }
      // shanten >= 3
      return Math.max(0, 0.05 - shanten * 0.01);
    }

    /**
     * Estimate probability of dealing into an opponent's hand with this tile.
     * @param {number} tileIdx
     * @param {object} dangerModel - DangerModel instance
     * @param {number} myIdx
     * @param {number} turnCount
     * @returns {number} 0..1
     */
    dealInProbability(tileIdx, dangerModel, myIdx, turnCount) {
      const raw = dangerModel.getMaxDanger(tileIdx, myIdx, turnCount);
      // Scale: danger model values are already 0..1 but represent relative
      // danger; actual deal-in rate is lower
      return raw * 0.5;
    }

    /**
     * Calculate the expected value of discarding a specific tile.
     * @param {Uint8Array} compact - hand in compact form (tile already removed)
     * @param {number} tileIdx - tile being discarded
     * @param {number} meldCount
     * @param {object} tracker - TileTracker
     * @param {object} dangerModel - DangerModel
     * @param {number} myIdx
     * @param {number} turnCount
     * @param {number} turnsLeft
     * @param {number} estimatedHandValue - expected points if won
     * @param {number} estimatedLossValue - expected points lost if deal-in
     * @returns {{ ev: number, winProb: number, dealInProb: number, shanten: number, ukeire: number }}
     */
    calculateDiscardEV(compact, tileIdx, meldCount, tracker, dangerModel,
                       myIdx, turnCount, turnsLeft, estimatedHandValue, estimatedLossValue) {
      const aie = AIE();
      const shanten = aie.calcShantenCompact(new Uint8Array(compact), meldCount);
      const ukeireResult = aie.calcUkeire(new Uint8Array(compact), meldCount, tracker);
      const winProb = this.winProbability(shanten, ukeireResult.total, turnsLeft);
      const dealInProb = this.dealInProbability(tileIdx, dangerModel, myIdx, turnCount);

      // EV = P(win) * E[points_won] - P(deal_in) * E[points_lost]
      const ev = winProb * estimatedHandValue - dealInProb * estimatedLossValue;

      return { ev, winProb, dealInProb, shanten, ukeire: ukeireResult.total };
    }

    /**
     * Evaluate all discard candidates and return the best by EV.
     * @param {object} hand
     * @param {object} state
     * @param {object} player
     * @param {object} dangerModel
     * @param {object} tracker
     * @returns {{ tile: object, ev: number, analysis: Array }|null}
     */
    bestDiscardByEV(hand, state, player, dangerModel, tracker) {
      const aie = AIE();
      const compact = aie.handToCompact(hand);
      const meldCount = hand.melds.length;
      const turnCount = state.turnCount || 0;
      const turnsLeft = Math.max(1, 70 - turnCount);
      const baseHandValue = aie.estimateHandValue(
        compact, hand.melds, player.seatWind, state.roundWind
      );

      // Rough loss estimate: average losing hand ~15 points
      const estimatedLossValue = 15;

      let bestEV = -Infinity;
      let bestTile = null;
      const analysis = [];
      const seen = new Set();

      for (const tile of hand.concealed) {
        const idx = aie.tileToIndex(tile);
        if (idx < 0) continue;
        const tileId = (typeof Tile() !== 'undefined' && Tile().getId)
          ? Tile().getId(tile) : (tile.suit + tile.rank);
        if (seen.has(tileId)) continue;
        seen.add(tileId);

        // Remove tile, evaluate resulting hand
        compact[idx]--;
        const afterHandValue = aie.estimateHandValue(
          compact, hand.melds, player.seatWind, state.roundWind
        );
        const result = this.calculateDiscardEV(
          compact, idx, meldCount, tracker, dangerModel,
          player.seatIndex, turnCount, turnsLeft,
          afterHandValue, estimatedLossValue
        );
        compact[idx]++;

        analysis.push({
          tile, idx, ev: result.ev,
          winProb: result.winProb,
          dealInProb: result.dealInProb,
          shanten: result.shanten,
          ukeire: result.ukeire
        });

        if (result.ev > bestEV) {
          bestEV = result.ev;
          bestTile = tile;
        }
      }

      analysis.sort((a, b) => b.ev - a.ev);

      return bestTile ? { tile: bestTile, ev: bestEV, analysis } : null;
    }
  }

  // =========================================================================
  // 3. PushFoldDecider (~100 lines)
  //    Decides whether to continue attacking or switch to defense.
  // =========================================================================

  class PushFoldDecider {
    /** @param {EVCalculator} evCalculator */
    constructor(evCalculator) {
      this.ev = evCalculator;
    }

    /**
     * Evaluate whether to push (attack) or fold (defend).
     * @param {object} hand
     * @param {object} state
     * @param {object} player
     * @param {object} dangerModel
     * @param {object} tracker
     * @returns {{ shouldPush: boolean, attackEV: number, defenseRisk: number, ratio: number, recommendation: string }}
     */
    shouldPush(hand, state, player, dangerModel, tracker) {
      const aie = AIE();
      const compact = aie.handToCompact(hand);
      const meldCount = hand.melds.length;
      const shanten = aie.calcShantenCompact(new Uint8Array(compact), meldCount);
      const ukeireResult = aie.calcUkeire(new Uint8Array(compact), meldCount, tracker);
      const turnsLeft = Math.max(1, 70 - (state.turnCount || 0));

      // Calculate attacking EV
      const handValue = aie.estimateHandValue(
        compact, hand.melds, player.seatWind, state.roundWind
      );
      const winProb = this.ev.winProbability(shanten, ukeireResult.total, turnsLeft);
      const attackEV = winProb * handValue;

      // Calculate defensive risk: maximum threat from any opponent
      let maxOpponentThreat = 0;
      for (let i = 0; i < 4; i++) {
        if (i === player.seatIndex) continue;
        const tenpaiProb = dangerModel.estimateTenpaiProb(i, state.turnCount || 0);
        // Estimated loss weighted by opponent's likelihood of tenpai
        const threatValue = 15 * tenpaiProb;
        maxOpponentThreat = Math.max(maxOpponentThreat, threatValue);
      }

      // Push threshold: can be modified externally by score situation
      const pushThreshold = 0.4;
      const shouldPushResult = attackEV > maxOpponentThreat * pushThreshold;

      let recommendation;
      if (attackEV > maxOpponentThreat) {
        recommendation = 'PUSH';
      } else if (shanten <= 1) {
        recommendation = 'CAUTIOUS';
      } else {
        recommendation = 'FOLD';
      }

      return {
        shouldPush: shouldPushResult,
        attackEV,
        defenseRisk: maxOpponentThreat,
        ratio: attackEV / Math.max(0.1, maxOpponentThreat),
        recommendation
      };
    }
  }

  // =========================================================================
  // 4. AdvancedAIController (~100 lines)
  //    Integrates everything; replaces basic AI discard logic.
  // =========================================================================

  class AdvancedAIController {
    /**
     * @param {object} [weights] - optional weight overrides for AIEngine
     */
    constructor(weights) {
      const aie = AIE();
      this.engine = new aie.AIEngine(weights);
      this.ev = new EVCalculator();
      this.pushFold = new PushFoldDecider(this.ev);
      this.scoreSituation = new ScoreSituationEvaluator();
    }

    /**
     * Select the best tile to discard using EV-based reasoning with
     * score-situation awareness and push/fold logic.
     * @param {object} player
     * @param {object} state
     * @returns {object|null} tile to discard
     */
    selectDiscard(player, state) {
      const aie = AIE();

      // 1. Update score situation
      this.scoreSituation.updateScores(state.players);
      if (typeof state.roundsLeft === 'number') {
        this.scoreSituation.setRoundsLeft(state.roundsLeft);
      }
      if (typeof state.dealerSeat === 'number') {
        this.scoreSituation.dealerSeat = state.dealerSeat;
      }
      const strategy = this.scoreSituation.getStrategy(player.seatIndex);

      // 2. Apply strategy mods to engine weights (clone so originals unchanged)
      const modWeights = Object.assign({}, this.engine.weights);
      modWeights.aggressionBase = Math.max(0.1, Math.min(0.95,
        modWeights.aggressionBase + strategy.aggressionMod));
      modWeights.handValue = Math.max(1, Math.min(50,
        modWeights.handValue + strategy.handValueMod * 5));
      modWeights.defense = Math.max(100, Math.min(2000,
        modWeights.defense + strategy.defenseMod * 300));

      // 3. Build tracker and check push/fold
      this.engine.tracker.buildFromState(state, player.seatIndex);
      const pfDecision = this.pushFold.shouldPush(
        player.hand, state, player,
        this.engine.dangerModel, this.engine.tracker
      );

      // 4. If folding, use pure defense discard
      if (pfDecision.recommendation === 'FOLD') {
        const safeTile = this.safestDiscard(player, state);
        if (safeTile) return safeTile;
        // Fall through to engine if no safe discard found
      }

      // 5. For PUSH or CAUTIOUS, use EV-based discard selection
      const evResult = this.ev.bestDiscardByEV(
        player.hand, state, player,
        this.engine.dangerModel, this.engine.tracker
      );

      if (evResult && evResult.tile) {
        return evResult.tile;
      }

      // 6. Fallback to basic engine
      return this.engine.selectDiscard(player, state);
    }

    /**
     * Find the safest tile to discard (pure defensive play).
     * Prefers genbutsu (proven safe tiles), then terminals/honors,
     * then lowest danger.
     * @param {object} player
     * @param {object} state
     * @returns {object|null} tile to discard
     */
    safestDiscard(player, state) {
      const aie = AIE();
      const myIdx = player.seatIndex;
      const turnCount = state.turnCount || 0;
      const hand = player.hand;

      let safest = null;
      let lowestDanger = Infinity;

      for (const tile of hand.concealed) {
        const idx = aie.tileToIndex(tile);
        if (idx < 0) continue;

        // Check genbutsu: tiles each opponent has already discarded
        let isGenbutsu = false;
        for (let p = 0; p < 4; p++) {
          if (p === myIdx) continue;
          if (this.engine.tracker.playerDiscardSet[p][idx] > 0) {
            isGenbutsu = true;
            break;
          }
        }

        if (isGenbutsu) {
          // Among genbutsu, prefer terminals/honors (less useful)
          const isTermHonor = !aie.isSuitedIndex(idx) ||
            (idx % 9 === 0) || (idx % 9 === 8);
          const genbutsuPriority = isTermHonor ? -2 : -1;
          if (genbutsuPriority < lowestDanger) {
            lowestDanger = genbutsuPriority;
            safest = tile;
          }
          continue;
        }

        // Non-genbutsu: score by danger model
        const danger = this.engine.dangerModel.getMaxDanger(idx, myIdx, turnCount);

        // Slight preference for terminals/honors when danger is similar
        const isTermHonor = !aie.isSuitedIndex(idx) ||
          (idx % 9 === 0) || (idx % 9 === 8);
        const adjustedDanger = isTermHonor ? danger * 0.85 : danger;

        if (adjustedDanger < lowestDanger) {
          lowestDanger = adjustedDanger;
          safest = tile;
        }
      }

      return safest;
    }
  }

  // =========================================================================
  // Export
  // =========================================================================

  root.MJ.AIAdvanced = Object.freeze({
    ScoreSituationEvaluator,
    EVCalculator,
    PushFoldDecider,
    AdvancedAIController
  });

  if (typeof console !== 'undefined') console.log('[Mahjong] AIAdvanced module loaded');
})(typeof window !== 'undefined' ? window : global);
