/**
 * ai-learning.js — Adaptive weight tuning and learning system
 * Persistence: uses localStorage in browser, file-based in Node.js.
 * Learning carries over between games, tournaments, and sessions.
 * See interfaces.js for API documentation
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const STORAGE_KEY = 'mj_ai_weights';
  const STATE_KEY = 'mj_ai_state';
  const HISTORY_KEY = 'mj_ai_history';
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  const DATA_DIR = isNode ? require('path').join(__dirname, '..', 'data') : null;

  // === Persistent storage abstraction ===
  const Storage = {
    get(key) {
      if (isNode) {
        try {
          const fs = require('fs');
          const path = require('path');
          if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
          const file = path.join(DATA_DIR, `${key}.json`);
          if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (e) { /* ignore */ }
        return null;
      }
      try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : null;
      } catch (e) { return null; }
    },
    set(key, value) {
      if (isNode) {
        try {
          const fs = require('fs');
          const path = require('path');
          if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
          fs.writeFileSync(path.join(DATA_DIR, `${key}.json`), JSON.stringify(value, null, 2));
        } catch (e) { /* ignore */ }
        return;
      }
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch (e) { /* ignore */ }
    }
  };

  class LearningSystem {
    constructor() {
      // Load full persisted state (epoch, learningRate, weights, dangerTable, history)
      const saved = Storage.get(STATE_KEY);
      if (saved && saved.epoch) {
        this.weights = saved.weights || root.MJ.AIEngine.AIEngine.defaultWeights();
        this.epoch = saved.epoch || 0;
        this.learningRate = saved.learningRate || 0.005;
        this.dangerTable = saved.dangerTable || this.defaultDangerTable();
        this.cumulativeStats = saved.cumulativeStats || this.defaultCumulativeStats();
        console.log(`[Learning] Restored: epoch ${this.epoch}, lr=${this.learningRate.toFixed(4)}`);
      } else {
        this.weights = this.loadLegacyWeights();
        this.epoch = 0;
        this.learningRate = 0.005;
        this.dangerTable = this.defaultDangerTable();
        this.cumulativeStats = this.defaultCumulativeStats();
      }
      this.decayRate = 0.995;
      this.roundHistory = [];
      this.gameHistory = Storage.get(HISTORY_KEY) || [];
    }

    loadLegacyWeights() {
      const w = Storage.get(STORAGE_KEY);
      return w || root.MJ.AIEngine.AIEngine.defaultWeights();
    }

    defaultDangerTable() {
      return {
        honor_early: 0.05, honor_late: 0.15,
        terminal: 0.08, middle: 0.20,
        suji_safe: 0.06, kabe_safe: 0.03,
        genbutsu: 0.0, unknown: 0.15
      };
    }

    defaultCumulativeStats() {
      return {
        totalRounds: 0, totalWins: 0, totalLosses: 0,
        totalDraws: 0, totalScore: 0, bestEpochWinRate: 0
      };
    }

    /** Save full state to persistent storage */
    save() {
      Storage.set(STATE_KEY, {
        weights: this.weights,
        epoch: this.epoch,
        learningRate: this.learningRate,
        dangerTable: this.dangerTable,
        cumulativeStats: this.cumulativeStats
      });
      Storage.set(STORAGE_KEY, this.weights); // legacy compat
      // Keep last 500 history entries
      if (this.gameHistory.length > 500) {
        this.gameHistory = this.gameHistory.slice(-500);
      }
      Storage.set(HISTORY_KEY, this.gameHistory);
    }

    getWeights() { return { ...this.weights }; }

    recordRoundResult(result) {
      this.roundHistory.push({
        epoch: this.epoch,
        playerIdx: result.playerIdx,
        won: result.won,
        dealtIn: result.dealtIn,
        score: result.score,
        shanten: result.finalShanten,
        turnsPlayed: result.turnsPlayed,
        meldsClaimed: result.meldsClaimed,
        timestamp: Date.now()
      });
    }

    /**
     * Update weights after a game/session. Persists automatically.
     */
    updateWeights() {
      if (this.roundHistory.length < 2) return null;

      const wins = this.roundHistory.filter(r => r.won);
      const losses = this.roundHistory.filter(r => r.dealtIn);
      const draws = this.roundHistory.filter(r => !r.won && !r.dealtIn);
      const total = this.roundHistory.length;

      const winRate = wins.length / total;
      const lossRate = losses.length / total;
      const drawRate = draws.length / total;

      // Cumulative stats
      this.cumulativeStats.totalRounds += total;
      this.cumulativeStats.totalWins += wins.length;
      this.cumulativeStats.totalLosses += losses.length;
      this.cumulativeStats.totalDraws += draws.length;
      this.cumulativeStats.totalScore += wins.reduce((s, r) => s + (r.score || 0), 0);
      this.cumulativeStats.bestEpochWinRate = Math.max(
        this.cumulativeStats.bestEpochWinRate, winRate);

      // === Adaptive weight updates ===
      // Defense tuning
      if (lossRate > 0.3) {
        this.weights.defense *= (1 + this.learningRate * 2);
        this.weights.aggressionBase *= (1 - this.learningRate);
      } else if (lossRate < 0.1 && winRate < 0.2) {
        // Too defensive, not winning either
        this.weights.defense *= (1 - this.learningRate * 0.5);
      }

      // Aggression tuning
      if (winRate > 0.3) {
        this.weights.aggressionBase *= (1 + this.learningRate * 0.5);
        this.weights.shanten *= (1 + this.learningRate * 0.3);
      } else if (winRate < 0.15) {
        this.weights.ukeire *= (1 + this.learningRate); // improve efficiency
        this.weights.handValue *= (1 + this.learningRate * 0.5); // aim for better hands
      }

      // Draw rate tuning
      if (drawRate > 0.4) {
        this.weights.ukeire *= (1 + this.learningRate * 1.5);
        this.weights.aggressionBase *= (1 + this.learningRate * 0.3);
      }

      // Meld claiming balance
      const avgMelds = this.roundHistory.reduce((s, r) => s + (r.meldsClaimed || 0), 0) / total;
      if (avgMelds > 2 && winRate < 0.2) {
        this.weights.openPenalty *= (1 - this.learningRate);
      } else if (avgMelds < 0.5 && winRate < 0.15) {
        this.weights.openPenalty *= (1 + this.learningRate * 0.3);
      }

      // Score quality: if winning but low scores, increase handValue
      const avgWinScore = wins.length > 0
        ? wins.reduce((s, r) => s + (r.score || 0), 0) / wins.length : 0;
      if (avgWinScore < 8 && winRate > 0.2) {
        this.weights.handValue *= (1 + this.learningRate);
      }

      // Clamp all weights
      this.weights.shanten = clamp(this.weights.shanten, 500, 2000);
      this.weights.ukeire = clamp(this.weights.ukeire, 3, 30);
      this.weights.handValue = clamp(this.weights.handValue, 1, 15);
      this.weights.defense = clamp(this.weights.defense, 200, 2000);
      this.weights.tempo = clamp(this.weights.tempo, 1, 10);
      this.weights.openPenalty = clamp(this.weights.openPenalty, 0.3, 0.9);
      this.weights.aggressionBase = clamp(this.weights.aggressionBase, 0.3, 0.85);
      this.weights.defenseThreshold = clamp(this.weights.defenseThreshold, 0.3, 0.8);

      // Cyclical learning rate: decay but reset every 50 epochs
      this.learningRate *= this.decayRate;
      if (this.epoch > 0 && this.epoch % 50 === 0) {
        this.learningRate = 0.003; // warm restart
      }
      this.learningRate = Math.max(0.001, this.learningRate);

      this.epoch++;

      // Archive
      const entry = {
        epoch: this.epoch,
        rounds: total,
        winRate: (winRate * 100).toFixed(1),
        lossRate: (lossRate * 100).toFixed(1),
        drawRate: (drawRate * 100).toFixed(1),
        avgWinScore: avgWinScore.toFixed(1),
        avgMelds: avgMelds.toFixed(1),
        weights: { ...this.weights },
        timestamp: Date.now()
      };
      this.gameHistory.push(entry);

      const result = {
        epoch: this.epoch,
        roundsAnalyzed: total,
        winRate, lossRate, drawRate, avgWinScore, avgMelds,
        weights: { ...this.weights }
      };

      this.roundHistory = [];
      this.save(); // PERSIST everything
      return result;
    }

    updateDangerTable(revealedData) {
      if (!revealedData) return;
      const alpha = 0.02;
      for (const entry of revealedData) {
        const cat = entry.category;
        const wasDangerous = entry.wasDangerous ? 1 : 0;
        if (this.dangerTable[cat] !== undefined) {
          this.dangerTable[cat] =
            this.dangerTable[cat] * (1 - alpha) + wasDangerous * alpha;
        }
      }
      this.save(); // persist danger table updates too
    }

    getDangerTable() { return { ...this.dangerTable }; }
    getGameHistory() { return [...this.gameHistory]; }

    getStats() {
      return {
        epoch: this.epoch,
        learningRate: this.learningRate,
        currentWeights: { ...this.weights },
        roundsRecorded: this.roundHistory.length,
        gamesCompleted: this.gameHistory.length,
        dangerTable: { ...this.dangerTable },
        cumulative: { ...this.cumulativeStats }
      };
    }

    /** Reset to default weights and clear all history */
    reset() {
      this.weights = root.MJ.AIEngine.AIEngine.defaultWeights();
      this.roundHistory = [];
      this.gameHistory = [];
      this.epoch = 0;
      this.learningRate = 0.005;
      this.dangerTable = this.defaultDangerTable();
      this.cumulativeStats = this.defaultCumulativeStats();
      this.save();
      console.log('[Learning] Reset to defaults');
    }
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  root.MJ.Learning = Object.freeze({ LearningSystem });

  if (typeof console !== 'undefined') console.log('[Mahjong] Learning module loaded');
})(typeof window !== 'undefined' ? window : global);
