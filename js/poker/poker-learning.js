/**
 * poker-learning.js — Persistent adaptive learning system for poker AI.
 * Equivalent to ai-learning.js but tuned for Texas Hold'em strategy weights.
 * Persists weights, opponent profiles, and cumulative stats via localStorage.
 * Exports under root.MJ.Poker.Learning
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Poker = root.MJ.Poker || {};

  var STORAGE_KEY = 'mj_poker_learning';
  var HISTORY_KEY = 'mj_poker_learning_history';

  var isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  var DATA_DIR = isNode ? require('path').join(__dirname, '..', '..', 'data') : null;

  // === Persistent storage abstraction ===
  var Storage = {
    get: function(key) {
      if (isNode) {
        try {
          var fs = require('fs');
          var path = require('path');
          if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
          var file = path.join(DATA_DIR, key + '.json');
          if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (e) { /* ignore */ }
        return null;
      }
      try {
        var val = localStorage.getItem(key);
        return val ? JSON.parse(val) : null;
      } catch (e) { return null; }
    },
    set: function(key, value) {
      if (isNode) {
        try {
          var fs = require('fs');
          var path = require('path');
          if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
          fs.writeFileSync(path.join(DATA_DIR, key + '.json'), JSON.stringify(value, null, 2));
        } catch (e) { /* ignore */ }
        return;
      }
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch (e) { /* ignore */ }
    }
  };

  // === Utility ===
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // === PokerLearningSystem ===
  class PokerLearningSystem {
    constructor() {
      this.load();
    }

    /**
     * Load persisted state from storage, or initialize defaults.
     */
    load() {
      try {
        var d = Storage.get(STORAGE_KEY);
        if (d && d.weights) {
          this.weights = d.weights;
          this.epoch = d.epoch || 0;
          this.learningRate = d.learningRate || 0.008;
          this.cumulativeStats = d.cumulativeStats || this.defaultCumulativeStats();
          this.opponentProfiles = d.opponentProfiles || {};
          // Session-level state is never persisted
          this.handHistory = [];
          this.sessionStats = this.defaultSessionStats();
          this.gameHistory = Storage.get(HISTORY_KEY) || [];
          console.log('[Poker Learning] Restored: epoch ' + this.epoch +
            ', lr=' + this.learningRate.toFixed(4));
          return;
        }
      } catch (e) { /* ignore */ }

      // First-time initialization
      this.weights = this.defaultWeights();
      this.epoch = 0;
      this.learningRate = 0.008;
      this.handHistory = [];
      this.sessionStats = this.defaultSessionStats();
      this.cumulativeStats = this.defaultCumulativeStats();
      this.opponentProfiles = {};
      this.gameHistory = [];
    }

    /**
     * Persist current state to storage.
     */
    save() {
      Storage.set(STORAGE_KEY, {
        weights: this.weights,
        epoch: this.epoch,
        learningRate: this.learningRate,
        cumulativeStats: this.cumulativeStats,
        opponentProfiles: this.opponentProfiles
      });
      // Keep last 500 history entries
      if (this.gameHistory.length > 500) {
        this.gameHistory = this.gameHistory.slice(-500);
      }
      Storage.set(HISTORY_KEY, this.gameHistory);
    }

    /**
     * Default strategy weights for the poker AI.
     * These are the tuneable knobs that the learning system adjusts.
     */
    defaultWeights() {
      return {
        // Pre-flop
        preflopTightness: 0.38,      // threshold for playing a hand (lower = looser)
        preflopRaiseFreq: 0.5,       // how often to raise vs call with playable hands
        stealFrequency: 0.25,        // how often to steal blinds from late position
        // Post-flop
        cBetFrequency: 0.65,         // continuation bet frequency
        bluffFrequency: 0.18,        // bluffing frequency
        foldToReraise: 0.45,         // how often to fold when re-raised
        drawChaseThreshold: 0.35,    // minimum implied odds to chase a draw
        // Bet sizing
        valueBetSize: 0.65,          // fraction of pot for value bets
        bluffBetSize: 0.55,          // fraction of pot for bluffs
        // Meta
        aggressionFactor: 1.2,       // multiplier on aggressive actions
        positionWeight: 0.15         // how much position matters in decisions
      };
    }

    defaultSessionStats() {
      return {
        handsPlayed: 0,
        handsWon: 0,
        totalProfit: 0,
        bluffsAttempted: 0,
        bluffsSuccessful: 0,
        foldsToBet: 0,
        showdownWins: 0,
        showdownLosses: 0
      };
    }

    defaultCumulativeStats() {
      return {
        totalHands: 0,
        totalWins: 0,
        totalProfit: 0,
        bestSession: 0
      };
    }

    /**
     * Return a copy of current weights for the AI to consume.
     */
    getWeights() {
      return Object.assign({}, this.weights);
    }

    /**
     * Record the result of a single hand.
     * @param {Object} result - {won, profit, bluffAttempted, bluffSucceeded,
     *   wentToShowdown, showdownWon, handStrength, position, phase}
     */
    recordHandResult(result) {
      this.handHistory.push(Object.assign({ timestamp: Date.now() }, result));

      // Session stats
      this.sessionStats.handsPlayed++;
      if (result.won) this.sessionStats.handsWon++;
      this.sessionStats.totalProfit += result.profit || 0;
      if (result.bluffAttempted) this.sessionStats.bluffsAttempted++;
      if (result.bluffSucceeded) this.sessionStats.bluffsSuccessful++;
      if (result.foldedToBet) this.sessionStats.foldsToBet++;
      if (result.wentToShowdown) {
        if (result.showdownWon) this.sessionStats.showdownWins++;
        else this.sessionStats.showdownLosses++;
      }

      // Cumulative stats
      this.cumulativeStats.totalHands++;
      if (result.won) this.cumulativeStats.totalWins++;
      this.cumulativeStats.totalProfit += result.profit || 0;
    }

    /**
     * Run adaptive weight updates based on accumulated hand history.
     * Should be called after a batch of hands (e.g. every 10-20 hands or at session end).
     * @returns {Object|null} Summary of the update, or null if not enough data.
     */
    updateWeights() {
      if (this.handHistory.length < 10) return null;

      var lr = this.learningRate;
      var stats = this.sessionStats;

      // Derived rates
      var winRate = stats.handsWon / Math.max(1, stats.handsPlayed);
      var bluffSuccess = stats.bluffsSuccessful / Math.max(1, stats.bluffsAttempted);
      var showdownTotal = stats.showdownWins + stats.showdownLosses;
      var showdownWinRate = stats.showdownWins / Math.max(1, showdownTotal);
      var profitPerHand = stats.totalProfit / Math.max(1, stats.handsPlayed);

      // === Adaptive updates ===

      // Bluff frequency tuning
      if (bluffSuccess < 0.3 && stats.bluffsAttempted > 5) {
        // Bluffing too much and failing: pull back
        this.weights.bluffFrequency *= (1 - lr * 2);
        this.weights.bluffBetSize *= (1 - lr * 0.5);
      } else if (bluffSuccess > 0.6 && stats.bluffsAttempted > 3) {
        // Bluffs are working: can bluff slightly more
        this.weights.bluffFrequency *= (1 + lr);
      }

      // Showdown performance: tighten or loosen pre-flop range
      if (showdownWinRate < 0.4 && showdownTotal > 5) {
        // Losing at showdown too often: play tighter
        this.weights.preflopTightness *= (1 + lr);
        this.weights.drawChaseThreshold *= (1 + lr * 0.5);
      } else if (showdownWinRate > 0.6 && showdownTotal > 5) {
        // Winning most showdowns: can afford to loosen up
        this.weights.preflopTightness *= (1 - lr * 0.5);
      }

      // Aggression and c-bet tuning based on profit
      if (profitPerHand < -5 && this.weights.aggressionFactor > 1.0) {
        // Losing money with high aggression: tone it down
        this.weights.aggressionFactor *= (1 - lr);
        this.weights.cBetFrequency *= (1 - lr * 0.5);
      } else if (profitPerHand > 10) {
        // Making good profit: slightly increase aggression
        this.weights.aggressionFactor *= (1 + lr * 0.3);
      }

      // Steal frequency: if not winning enough, try stealing more from position
      if (winRate < 0.3 && this.weights.stealFrequency < 0.4) {
        this.weights.stealFrequency *= (1 + lr);
      } else if (winRate > 0.5 && this.weights.stealFrequency > 0.15) {
        // Winning plenty: no need to steal as aggressively
        this.weights.stealFrequency *= (1 - lr * 0.3);
      }

      // Raise frequency tuning
      if (winRate > 0.4 && profitPerHand > 5) {
        this.weights.preflopRaiseFreq *= (1 + lr * 0.3);
      } else if (winRate < 0.25) {
        this.weights.preflopRaiseFreq *= (1 - lr * 0.3);
      }

      // Value bet sizing: if profit is negative, bets may be too large
      if (profitPerHand < 0) {
        this.weights.valueBetSize = Math.max(0.4, this.weights.valueBetSize - lr * 0.05);
      } else if (profitPerHand > 15) {
        this.weights.valueBetSize = Math.min(0.85, this.weights.valueBetSize + lr * 0.03);
      }

      // Fold-to-reraise: if folding too much to reraises, tighten up
      var foldRate = stats.foldsToBet / Math.max(1, stats.handsPlayed);
      if (foldRate > 0.5) {
        this.weights.foldToReraise *= (1 - lr * 0.5);
      } else if (foldRate < 0.15 && profitPerHand < 0) {
        this.weights.foldToReraise *= (1 + lr * 0.5);
      }

      // Position weight: winning from late position should reinforce position awareness
      var lateWins = this.handHistory.filter(function(h) {
        return h.position === 'late' && h.won;
      }).length;
      var lateHands = this.handHistory.filter(function(h) {
        return h.position === 'late';
      }).length;
      if (lateHands > 3) {
        var lateWinRate = lateWins / lateHands;
        if (lateWinRate > 0.4) {
          this.weights.positionWeight *= (1 + lr * 0.5);
        }
      }

      // === Clamp all weights to reasonable ranges ===
      this.weights.preflopTightness = clamp(this.weights.preflopTightness, 0.25, 0.55);
      this.weights.preflopRaiseFreq = clamp(this.weights.preflopRaiseFreq, 0.2, 0.8);
      this.weights.stealFrequency = clamp(this.weights.stealFrequency, 0.1, 0.5);
      this.weights.cBetFrequency = clamp(this.weights.cBetFrequency, 0.3, 0.85);
      this.weights.bluffFrequency = clamp(this.weights.bluffFrequency, 0.05, 0.35);
      this.weights.foldToReraise = clamp(this.weights.foldToReraise, 0.2, 0.7);
      this.weights.drawChaseThreshold = clamp(this.weights.drawChaseThreshold, 0.2, 0.5);
      this.weights.valueBetSize = clamp(this.weights.valueBetSize, 0.35, 0.9);
      this.weights.bluffBetSize = clamp(this.weights.bluffBetSize, 0.3, 0.75);
      this.weights.aggressionFactor = clamp(this.weights.aggressionFactor, 0.6, 2.0);
      this.weights.positionWeight = clamp(this.weights.positionWeight, 0.05, 0.3);

      // Cyclical learning rate: decay with periodic warm restarts
      this.learningRate *= 0.995;
      if (this.epoch > 0 && this.epoch % 30 === 0) {
        this.learningRate = 0.005; // warm restart
      }
      this.learningRate = Math.max(0.001, this.learningRate);

      this.epoch++;

      // Track best session
      this.cumulativeStats.bestSession = Math.max(
        this.cumulativeStats.bestSession, stats.totalProfit
      );

      // Build result summary
      var result = {
        epoch: this.epoch,
        handsAnalyzed: this.handHistory.length,
        winRate: winRate,
        bluffSuccess: bluffSuccess,
        showdownWinRate: showdownWinRate,
        profitPerHand: profitPerHand,
        weights: Object.assign({}, this.weights)
      };

      // Archive to game history
      this.gameHistory.push({
        epoch: this.epoch,
        hands: stats.handsPlayed,
        winRate: (winRate * 100).toFixed(1),
        profit: stats.totalProfit,
        profitPerHand: profitPerHand.toFixed(1),
        bluffSuccess: (bluffSuccess * 100).toFixed(1),
        showdownWinRate: (showdownWinRate * 100).toFixed(1),
        weights: Object.assign({}, this.weights),
        timestamp: Date.now()
      });

      // Reset session for next batch
      this.handHistory = [];
      this.sessionStats = this.defaultSessionStats();

      this.save();
      return result;
    }

    /**
     * Persist an opponent profile for cross-session tracking.
     * @param {string} playerId
     * @param {Object} profile - observed stats from OpponentModel
     */
    saveOpponentProfile(playerId, profile) {
      this.opponentProfiles[playerId] = Object.assign(
        { lastUpdated: Date.now() },
        profile
      );
      this.save();
    }

    /**
     * Load a previously persisted opponent profile.
     * @param {string} playerId
     * @returns {Object|null}
     */
    loadOpponentProfile(playerId) {
      return this.opponentProfiles[playerId] || null;
    }

    /**
     * Get all tracked opponent profile keys.
     * @returns {string[]}
     */
    getTrackedOpponents() {
      return Object.keys(this.opponentProfiles);
    }

    /**
     * Get comprehensive stats for display / debugging.
     */
    getStats() {
      return {
        epoch: this.epoch,
        learningRate: this.learningRate,
        weights: Object.assign({}, this.weights),
        session: Object.assign({}, this.sessionStats),
        cumulative: Object.assign({}, this.cumulativeStats),
        roundsRecorded: this.handHistory.length,
        gamesCompleted: this.gameHistory.length,
        opponentCount: Object.keys(this.opponentProfiles).length
      };
    }

    /**
     * Get archived game history for trend analysis.
     * @returns {Array}
     */
    getGameHistory() {
      return this.gameHistory.slice();
    }

    /**
     * Reset everything to defaults and clear all persisted data.
     */
    reset() {
      this.weights = this.defaultWeights();
      this.epoch = 0;
      this.learningRate = 0.008;
      this.handHistory = [];
      this.sessionStats = this.defaultSessionStats();
      this.cumulativeStats = this.defaultCumulativeStats();
      this.opponentProfiles = {};
      this.gameHistory = [];
      this.save();
      console.log('[Poker Learning] Reset to defaults');
    }
  }

  // === Export ===
  root.MJ.Poker.Learning = Object.freeze({ PokerLearningSystem: PokerLearningSystem });

  if (typeof console !== 'undefined') console.log('[Poker] Learning module loaded');
})(typeof window !== 'undefined' ? window : global);
