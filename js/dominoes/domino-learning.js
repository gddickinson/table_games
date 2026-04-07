/**
 * domino-learning.js - Adaptive learning for dominoes AI
 * Tracks rounds, wins, blocks, average remaining pips, play patterns.
 * Persists to localStorage under 'mj_dominoes_learning'.
 * Exports as root.MJ.Dominoes.Learning
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Dominoes = root.MJ.Dominoes || {};

  var STORAGE_KEY = 'mj_dominoes_learning';

  var DEFAULT_DATA = {
    roundsPlayed: 0,
    playerWins: 0,
    playerLosses: 0,
    timesBlocked: 0,
    totalRemainingPips: 0,
    averageRemainingPips: 0,
    winStreak: 0,
    lossStreak: 0,
    bestWinStreak: 0,
    playPatterns: {
      doublesPlayedEarly: 0,
      highPipFirst: 0,
      blocksAttempted: 0,
      passCount: 0
    },
    aiAdjustments: {
      aggressiveness: 0,
      doublePreference: 0
    }
  };

  /**
   * Load learning data from localStorage.
   */
  function loadLearning() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        // Merge with defaults for any missing keys
        return mergeDefaults(data, DEFAULT_DATA);
      }
    } catch (e) {
      console.warn('[Dominoes] Failed to load learning data:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  /**
   * Save learning data to localStorage.
   */
  function saveLearning(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Dominoes] Failed to save learning data:', e);
    }
  }

  /**
   * Record the result of a round.
   * result: { playerWon: bool, blocked: bool, remainingPips: number, patterns: {} }
   */
  function recordResult(result) {
    var data = loadLearning();

    data.roundsPlayed++;

    if (result.playerWon) {
      data.playerWins++;
      data.winStreak++;
      data.lossStreak = 0;
      if (data.winStreak > data.bestWinStreak) {
        data.bestWinStreak = data.winStreak;
      }
    } else {
      data.playerLosses++;
      data.lossStreak++;
      data.winStreak = 0;
    }

    if (result.blocked) {
      data.timesBlocked++;
    }

    data.totalRemainingPips += (result.remainingPips || 0);
    data.averageRemainingPips = data.roundsPlayed > 0
      ? Math.round(data.totalRemainingPips / data.roundsPlayed)
      : 0;

    // Track patterns
    if (result.patterns) {
      if (result.patterns.doublesPlayedEarly) data.playPatterns.doublesPlayedEarly++;
      if (result.patterns.highPipFirst) data.playPatterns.highPipFirst++;
      if (result.patterns.blocksAttempted) data.playPatterns.blocksAttempted++;
      data.playPatterns.passCount += (result.patterns.passCount || 0);
    }

    // Recalculate AI adjustments based on learning
    data.aiAdjustments = calculateAdjustments(data);

    saveLearning(data);
    return data;
  }

  /**
   * Calculate AI adjustments based on player patterns.
   * If blocking too often -> AI plays more aggressively to empty hand.
   * If losing with high pips -> AI prioritizes high-pip tiles earlier.
   */
  function calculateAdjustments(data) {
    var adj = { aggressiveness: 0, doublePreference: 0 };

    if (data.roundsPlayed < 3) return adj;

    var blockRate = data.timesBlocked / data.roundsPlayed;
    var winRate = data.playerWins / data.roundsPlayed;

    // If games are blocking frequently, increase aggression
    if (blockRate > 0.4) {
      adj.aggressiveness = 2;
    } else if (blockRate > 0.25) {
      adj.aggressiveness = 1;
    }

    // If player is losing with high remaining pips, prioritize doubles
    if (data.averageRemainingPips > 15) {
      adj.doublePreference = 5;
      adj.aggressiveness += 1;
    }

    // If player is winning too much, make AI smarter
    if (winRate > 0.65 && data.roundsPlayed > 5) {
      adj.aggressiveness += 2;
      adj.doublePreference += 3;
    }

    // If player is losing a lot, ease up slightly
    if (winRate < 0.2 && data.roundsPlayed > 5) {
      adj.aggressiveness = Math.max(0, adj.aggressiveness - 1);
    }

    return adj;
  }

  /**
   * Get current adjustments for AI play.
   */
  function getAdjustments() {
    var data = loadLearning();
    return data.aiAdjustments || { aggressiveness: 0, doublePreference: 0 };
  }

  /**
   * Get a summary of learning stats for display.
   */
  function getSummary() {
    var data = loadLearning();
    return {
      roundsPlayed: data.roundsPlayed,
      winRate: data.roundsPlayed > 0
        ? Math.round((data.playerWins / data.roundsPlayed) * 100) + '%'
        : '0%',
      avgPips: data.averageRemainingPips,
      blockRate: data.roundsPlayed > 0
        ? Math.round((data.timesBlocked / data.roundsPlayed) * 100) + '%'
        : '0%',
      bestStreak: data.bestWinStreak
    };
  }

  /**
   * Merge loaded data with defaults (for forward compatibility).
   */
  function mergeDefaults(data, defaults) {
    var result = {};
    for (var key in defaults) {
      if (defaults.hasOwnProperty(key)) {
        if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
          result[key] = mergeDefaults(data[key] || {}, defaults[key]);
        } else {
          result[key] = (data[key] !== undefined) ? data[key] : defaults[key];
        }
      }
    }
    return result;
  }

  root.MJ.Dominoes.Learning = Object.freeze({
    loadLearning: loadLearning,
    saveLearning: saveLearning,
    recordResult: recordResult,
    getAdjustments: getAdjustments,
    getSummary: getSummary,
    calculateAdjustments: calculateAdjustments
  });

  console.log('[Dominoes] Learning module loaded');
})(typeof window !== 'undefined' ? window : global);
