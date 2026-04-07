/**
 * achievements.js — Achievement/badge system for Mahjong
 * Tracks player milestones and persists to localStorage
 * See interfaces.js for API documentation
 */
(function (exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  var STORAGE_KEY = 'mj_achievements';

  // ── Achievement categories ────────────────────────────────────

  var CATEGORY = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
    MASTERY: 'Mastery'
  };

  // ── Achievement definitions ───────────────────────────────────

  var ACHIEVEMENTS = [
    // ── Beginner (5) ──────────────────────────────────────────
    {
      id: 'first_win',
      name: 'First Win',
      description: 'Win your first round of Mahjong.',
      icon: '\uD83C\uDFC6',
      category: CATEGORY.BEGINNER,
      condition: function (event, data) {
        return event === 'round_end' &&
          data.winner && data.winner.seatIndex === 0;
      }
    },
    {
      id: 'first_pong',
      name: 'First Pong',
      description: 'Claim your first Pong meld.',
      icon: '\uD83D\uDC4A',
      category: CATEGORY.BEGINNER,
      condition: function (event, data) {
        return event === 'claim' &&
          data.type === 'pong' && data.playerIndex === 0;
      }
    },
    {
      id: 'first_chow',
      name: 'First Chow',
      description: 'Claim your first Chow meld.',
      icon: '\uD83D\uDC4D',
      category: CATEGORY.BEGINNER,
      condition: function (event, data) {
        return event === 'claim' &&
          data.type === 'chow' && data.playerIndex === 0;
      }
    },
    {
      id: 'first_kong',
      name: 'First Kong',
      description: 'Declare your first Kong.',
      icon: '\uD83D\uDCAA',
      category: CATEGORY.BEGINNER,
      condition: function (event, data) {
        return event === 'claim' &&
          (data.type === 'kong' || data.type === 'concealed_kong') &&
          data.playerIndex === 0;
      }
    },
    {
      id: 'complete_tutorial',
      name: 'Complete Tutorial',
      description: 'Finish the Mahjong tutorial.',
      icon: '\uD83C\uDF93',
      category: CATEGORY.BEGINNER,
      condition: function (event) {
        return event === 'tutorial_complete';
      }
    },

    // ── Intermediate (5) ──────────────────────────────────────
    {
      id: 'self_draw_win',
      name: 'Win by Self-Draw',
      description: 'Win a round by drawing the winning tile yourself.',
      icon: '\uD83C\uDF1F',
      category: CATEGORY.INTERMEDIATE,
      condition: function (event, data) {
        return event === 'round_end' &&
          data.winner && data.winner.seatIndex === 0 &&
          data.selfDrawn === true;
      }
    },
    {
      id: 'riichi_win',
      name: 'Declare Riichi and Win',
      description: 'Win a round after declaring Riichi.',
      icon: '\u2694\uFE0F',
      category: CATEGORY.INTERMEDIATE,
      condition: function (event, data) {
        if (event !== 'round_end') return false;
        if (!data.winner || data.winner.seatIndex !== 0) return false;
        if (!data.winResult || !data.winResult.breakdown) return false;
        return data.winResult.breakdown.some(function (b) {
          return b.name && b.name.toLowerCase().indexOf('riichi') !== -1;
        });
      }
    },
    {
      id: 'dragon_pong',
      name: 'Win with Dragon Pong',
      description: 'Win a round that includes a Dragon triplet.',
      icon: '\uD83D\uDC32',
      category: CATEGORY.INTERMEDIATE,
      condition: function (event, data) {
        if (event !== 'round_end') return false;
        if (!data.winner || data.winner.seatIndex !== 0) return false;
        if (!data.winResult || !data.winResult.breakdown) return false;
        return data.winResult.breakdown.some(function (b) {
          var n = (b.name || '').toLowerCase();
          return n.indexOf('dragon') !== -1;
        });
      }
    },
    {
      id: 'score_20',
      name: 'Score 20+ Points',
      description: 'Win a round with 20 or more points.',
      icon: '\uD83D\uDCC8',
      category: CATEGORY.INTERMEDIATE,
      condition: function (event, data) {
        return event === 'round_end' &&
          data.winner && data.winner.seatIndex === 0 &&
          data.winResult && data.winResult.total >= 20;
      }
    },
    {
      id: 'win_10',
      name: 'Win 10 Rounds',
      description: 'Accumulate 10 round victories.',
      icon: '\uD83C\uDF1E',
      category: CATEGORY.INTERMEDIATE,
      condition: function (event, data) {
        return event === 'round_end' &&
          data.winner && data.winner.seatIndex === 0 &&
          data.stats && data.stats.playerStats &&
          data.stats.playerStats[0] &&
          data.stats.playerStats[0].wins >= 10;
      }
    },

    // ── Advanced (5) ──────────────────────────────────────────
    {
      id: 'pure_flush',
      name: 'Pure Flush Win',
      description: 'Win with a Pure Flush (all tiles from one suit).',
      icon: '\uD83D\uDC8E',
      category: CATEGORY.ADVANCED,
      condition: function (event, data) {
        if (event !== 'round_end') return false;
        if (!data.winner || data.winner.seatIndex !== 0) return false;
        if (!data.winResult || !data.winResult.breakdown) return false;
        return data.winResult.breakdown.some(function (b) {
          var n = (b.name || '').toLowerCase();
          return n.indexOf('flush') !== -1 && n.indexOf('half') === -1;
        });
      }
    },
    {
      id: 'all_triplets',
      name: 'All Triplets Win',
      description: 'Win with all triplets (no sequences).',
      icon: '\uD83D\uDD36',
      category: CATEGORY.ADVANCED,
      condition: function (event, data) {
        if (event !== 'round_end') return false;
        if (!data.winner || data.winner.seatIndex !== 0) return false;
        if (!data.winResult || !data.winResult.breakdown) return false;
        return data.winResult.breakdown.some(function (b) {
          var n = (b.name || '').toLowerCase();
          return n.indexOf('triplet') !== -1 || n.indexOf('all pong') !== -1;
        });
      }
    },
    {
      id: 'big_three_dragons',
      name: 'Big Three Dragons',
      description: 'Win with the Big Three Dragons pattern.',
      icon: '\uD83D\uDC09',
      category: CATEGORY.ADVANCED,
      condition: function (event, data) {
        if (event !== 'round_end') return false;
        if (!data.winner || data.winner.seatIndex !== 0) return false;
        if (!data.winResult || !data.winResult.breakdown) return false;
        return data.winResult.breakdown.some(function (b) {
          var n = (b.name || '').toLowerCase();
          return n.indexOf('big three dragons') !== -1 ||
            n.indexOf('big 3 dragons') !== -1 ||
            n.indexOf('daisangen') !== -1;
        });
      }
    },
    {
      id: 'score_50',
      name: 'Score 50+ Points',
      description: 'Win a round with 50 or more points.',
      icon: '\uD83D\uDD25',
      category: CATEGORY.ADVANCED,
      condition: function (event, data) {
        return event === 'round_end' &&
          data.winner && data.winner.seatIndex === 0 &&
          data.winResult && data.winResult.total >= 50;
      }
    },
    {
      id: 'win_50',
      name: 'Win 50 Rounds',
      description: 'Accumulate 50 round victories.',
      icon: '\u2B50',
      category: CATEGORY.ADVANCED,
      condition: function (event, data) {
        return event === 'round_end' &&
          data.winner && data.winner.seatIndex === 0 &&
          data.stats && data.stats.playerStats &&
          data.stats.playerStats[0] &&
          data.stats.playerStats[0].wins >= 50;
      }
    },

    // ── Mastery (5) ───────────────────────────────────────────
    {
      id: 'win_100',
      name: 'Win 100 Rounds',
      description: 'Accumulate 100 round victories. True dedication!',
      icon: '\uD83D\uDC51',
      category: CATEGORY.MASTERY,
      condition: function (event, data) {
        return event === 'round_end' &&
          data.winner && data.winner.seatIndex === 0 &&
          data.stats && data.stats.playerStats &&
          data.stats.playerStats[0] &&
          data.stats.playerStats[0].wins >= 100;
      }
    },
    {
      id: 'all_patterns',
      name: 'All Scoring Patterns Seen',
      description: 'Encounter every scoring pattern at least once.',
      icon: '\uD83D\uDCDA',
      category: CATEGORY.MASTERY,
      condition: function (event, data) {
        if (event !== 'round_end') return false;
        if (!data.stats || !data.stats.playerStats || !data.stats.playerStats[0]) return false;
        var patterns = data.stats.playerStats[0].scoringPatterns;
        if (!patterns) return false;
        // Require at least 8 distinct scoring patterns seen
        return Object.keys(patterns).length >= 8;
      }
    },
    {
      id: 'riichi_self_draw',
      name: 'Win with Riichi + Self-Draw',
      description: 'Declare Riichi then win by drawing the tile yourself.',
      icon: '\u26A1',
      category: CATEGORY.MASTERY,
      condition: function (event, data) {
        if (event !== 'round_end') return false;
        if (!data.winner || data.winner.seatIndex !== 0) return false;
        if (!data.selfDrawn) return false;
        if (!data.winResult || !data.winResult.breakdown) return false;
        return data.winResult.breakdown.some(function (b) {
          return b.name && b.name.toLowerCase().indexOf('riichi') !== -1;
        });
      }
    },
    {
      id: 'perfect_session',
      name: 'Perfect Session',
      description: 'Play 5+ rounds without dealing into anyone\'s winning hand.',
      icon: '\uD83D\uDEE1\uFE0F',
      category: CATEGORY.MASTERY,
      condition: function (event, data) {
        if (event !== 'round_end') return false;
        if (!data.stats || !data.stats.playerStats || !data.stats.playerStats[0]) return false;
        var ps = data.stats.playerStats[0];
        var totalRounds = ps.wins + ps.losses + ps.draws;
        return totalRounds >= 5 && ps.dealtIn === 0;
      }
    },
    {
      id: 'score_80',
      name: 'Score 80+ Points',
      description: 'Win a round with 80 or more points. Legendary!',
      icon: '\uD83C\uDF08',
      category: CATEGORY.MASTERY,
      condition: function (event, data) {
        return event === 'round_end' &&
          data.winner && data.winner.seatIndex === 0 &&
          data.winResult && data.winResult.total >= 80;
      }
    }
  ];

  // ── State management ──────────────────────────────────────────

  var unlocked = {};  // id -> { timestamp, ... }

  function loadFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          unlocked = parsed;
        }
      }
    } catch (e) {
      // Silently fail if storage is unavailable
    }
  }

  function saveToStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    } catch (e) {
      // Silently fail
    }
  }

  // Load on module init
  loadFromStorage();

  // ── Core API ──────────────────────────────────────────────────

  /**
   * Check all achievements against an event, return newly unlocked ones.
   * @param {string} event - Event type: 'round_end', 'claim', 'game_start', 'tutorial_complete'
   * @param {Object} data - Event data with winner, score, stats, etc.
   * @returns {Array} Newly unlocked achievement objects
   */
  function check(event, data) {
    var newlyUnlocked = [];
    data = data || {};

    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var ach = ACHIEVEMENTS[i];

      // Skip already unlocked
      if (unlocked[ach.id]) continue;

      try {
        if (ach.condition(event, data)) {
          unlocked[ach.id] = {
            timestamp: Date.now(),
            event: event
          };
          newlyUnlocked.push({
            id: ach.id,
            name: ach.name,
            description: ach.description,
            icon: ach.icon,
            category: ach.category
          });
        }
      } catch (e) {
        // Condition evaluation failed — skip silently
      }
    }

    if (newlyUnlocked.length > 0) {
      saveToStorage();
    }

    return newlyUnlocked;
  }

  /**
   * Get all achievements with their unlock status.
   * @returns {Array} All achievements with unlocked flag and timestamp
   */
  function getAll() {
    return ACHIEVEMENTS.map(function (ach) {
      var u = unlocked[ach.id];
      return {
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        category: ach.category,
        unlocked: !!u,
        unlockedAt: u ? u.timestamp : null
      };
    });
  }

  /**
   * Get only unlocked achievements.
   * @returns {Array}
   */
  function getUnlocked() {
    return getAll().filter(function (a) { return a.unlocked; });
  }

  /**
   * Get progress summary.
   * @returns {Object} Progress info by category and overall
   */
  function getProgress() {
    var total = ACHIEVEMENTS.length;
    var unlockedCount = Object.keys(unlocked).length;

    var byCategory = {};
    for (var cat in CATEGORY) {
      var catName = CATEGORY[cat];
      byCategory[catName] = { total: 0, unlocked: 0 };
    }

    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var ach = ACHIEVEMENTS[i];
      var cat = ach.category;
      if (!byCategory[cat]) {
        byCategory[cat] = { total: 0, unlocked: 0 };
      }
      byCategory[cat].total++;
      if (unlocked[ach.id]) {
        byCategory[cat].unlocked++;
      }
    }

    return {
      total: total,
      unlocked: unlockedCount,
      percentage: total > 0 ? Math.round((unlockedCount / total) * 100) : 0,
      byCategory: byCategory
    };
  }

  /**
   * Reset all achievement progress.
   */
  function reset() {
    unlocked = {};
    saveToStorage();
  }

  /**
   * Manually unlock an achievement by id (for testing or admin use).
   * @param {string} id
   * @returns {boolean} True if newly unlocked
   */
  function unlock(id) {
    if (unlocked[id]) return false;
    var found = false;
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ACHIEVEMENTS[i].id === id) { found = true; break; }
    }
    if (!found) return false;
    unlocked[id] = { timestamp: Date.now(), event: 'manual' };
    saveToStorage();
    return true;
  }

  /**
   * Check if a specific achievement is unlocked.
   * @param {string} id
   * @returns {boolean}
   */
  function isUnlocked(id) {
    return !!unlocked[id];
  }

  // ── Export ─────────────────────────────────────────────────────

  root.MJ.Achievements = Object.freeze({
    check: check,
    getAll: getAll,
    getUnlocked: getUnlocked,
    getProgress: getProgress,
    reset: reset,
    unlock: unlock,
    isUnlocked: isUnlocked,
    ACHIEVEMENTS: ACHIEVEMENTS,
    CATEGORY: CATEGORY
  });

  if (typeof console !== 'undefined') console.log('[Mahjong] Achievements module loaded');
})(typeof window !== 'undefined' ? window : global);
