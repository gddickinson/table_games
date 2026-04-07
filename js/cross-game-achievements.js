/**
 * cross-game-achievements.js — Achievements that span both Mahjong and Poker.
 * Tracks and awards achievements based on cross-game player activity.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const STORAGE_KEY = 'mj_cross_achievements';

  const CROSS_GAME_ACHIEVEMENTS = [
    {
      id: 'cg_both_games',
      name: 'Renaissance Player',
      description: 'Play both Mahjong and Poker',
      icon: '\ud83c\udfad',
      check: function (_e, d) { return d.mahjongGames > 0 && d.pokerHands > 0; }
    },
    {
      id: 'cg_win_both',
      name: 'Double Crown',
      description: 'Win at both Mahjong and Poker in one session',
      icon: '\ud83d\udc51',
      check: function (_e, d) { return d.sessionMahjongWins > 0 && d.sessionPokerWins > 0; }
    },
    {
      id: 'cg_kenji_tilt_both',
      name: 'Kenji\'s Nemesis',
      description: 'Make Kenji tilt in both games',
      icon: '\ud83d\ude24',
      check: function (_e, d) { return d.kenjiTiltedMahjong && d.kenjiTiltedPoker; }
    },
    {
      id: 'cg_streak_cross',
      name: 'Unstoppable',
      description: 'Win 3 games in a row across any games',
      icon: '\ud83d\udd25',
      check: function (_e, d) { return d.crossGameStreak >= 3; }
    },
    {
      id: 'cg_play_10_each',
      name: 'Well Rounded',
      description: 'Play 10+ Mahjong games and 10+ poker hands',
      icon: '\u2696\ufe0f',
      check: function (_e, d) { return d.mahjongGames >= 10 && d.pokerHands >= 10; }
    },
    {
      id: 'cg_friends',
      name: 'Table Friends',
      description: 'Reach relationship level 3 with all characters',
      icon: '\ud83e\udd1d',
      check: function (_e, d) { return d.allRelationships3Plus; }
    },
    {
      id: 'cg_level10',
      name: 'Dedicated Player',
      description: 'Reach reputation level 10',
      icon: '\u2b50',
      check: function (_e, d) { return d.level >= 10; }
    },
    {
      id: 'cg_collector',
      name: 'Collector',
      description: 'Earn 500 total coins across all games',
      icon: '\ud83d\udc8e',
      check: function (_e, d) { return d.totalCoins >= 500; }
    },
    {
      id: 'cg_night_owl',
      name: 'Night Owl',
      description: 'Play a game after midnight',
      icon: '\ud83e\udd89',
      check: function (_e, d) { return d.playedAfterMidnight; }
    },
    {
      id: 'cg_marathon',
      name: 'Marathon Session',
      description: 'Play for 2+ hours in one session',
      icon: '\u23f1\ufe0f',
      check: function (_e, d) { return d.sessionMinutes >= 120; }
    }
  ];

  class CrossGameAchievements {
    constructor() {
      this.unlocked = [];
      this.load();
    }

    /**
     * Load unlocked achievements from localStorage.
     */
    load() {
      try {
        var stored = localStorage.getItem(STORAGE_KEY);
        this.unlocked = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(this.unlocked)) {
          this.unlocked = [];
        }
      } catch (e) {
        this.unlocked = [];
      }
    }

    /**
     * Save unlocked achievements to localStorage.
     */
    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.unlocked));
      } catch (e) {
        // Storage may be full or unavailable; silently fail.
      }
    }

    /**
     * Check all achievements against current game data.
     * Returns an array of newly unlocked achievements.
     * @param {Object} gameData - Object with fields like mahjongGames, pokerHands, etc.
     * @returns {Array} Newly unlocked achievement objects.
     */
    check(gameData) {
      var newlyUnlocked = [];
      for (var i = 0; i < CROSS_GAME_ACHIEVEMENTS.length; i++) {
        var ach = CROSS_GAME_ACHIEVEMENTS[i];
        if (this.unlocked.indexOf(ach.id) !== -1) continue;
        try {
          if (ach.check('check', gameData)) {
            this.unlocked.push(ach.id);
            newlyUnlocked.push(ach);
          }
        } catch (e) {
          // Skip achievements whose check function throws.
        }
      }
      if (newlyUnlocked.length > 0) {
        this.save();
      }
      return newlyUnlocked;
    }

    /**
     * Get all achievements with their unlock status.
     * @returns {Array} Achievement objects with an added `unlocked` boolean field.
     */
    getAll() {
      var self = this;
      return CROSS_GAME_ACHIEVEMENTS.map(function (a) {
        return {
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          unlocked: self.unlocked.indexOf(a.id) !== -1
        };
      });
    }

    /**
     * Get progress summary.
     * @returns {{ total: number, unlocked: number }}
     */
    getProgress() {
      return {
        total: CROSS_GAME_ACHIEVEMENTS.length,
        unlocked: this.unlocked.length
      };
    }

    /**
     * Reset all unlocked achievements.
     */
    reset() {
      this.unlocked = [];
      this.save();
    }

    /**
     * Check if a specific achievement is unlocked.
     * @param {string} achievementId
     * @returns {boolean}
     */
    isUnlocked(achievementId) {
      return this.unlocked.indexOf(achievementId) !== -1;
    }

    /**
     * Get a specific achievement definition by ID.
     * @param {string} achievementId
     * @returns {Object|null}
     */
    getById(achievementId) {
      for (var i = 0; i < CROSS_GAME_ACHIEVEMENTS.length; i++) {
        if (CROSS_GAME_ACHIEVEMENTS[i].id === achievementId) {
          return CROSS_GAME_ACHIEVEMENTS[i];
        }
      }
      return null;
    }
  }

  root.MJ.CrossGameAchievements = Object.freeze({
    CrossGameAchievements: CrossGameAchievements,
    CROSS_GAME_ACHIEVEMENTS: CROSS_GAME_ACHIEVEMENTS
  });
  if (typeof console !== 'undefined') console.log('[MJ] CrossGameAchievements module loaded');
})(typeof window !== 'undefined' ? window : global);
