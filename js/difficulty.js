/**
 * difficulty.js — AI difficulty levels from beginner to expert
 * Each level modifies AI behavior to simulate different skill levels.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const LEVELS = {
    beginner: {
      name: 'Beginner',
      description: 'Plays randomly, never defends, opens hand freely',
      randomDiscardChance: 0.4,
      claimEverything: true,
      neverDefend: true,
      weights: { shanten: 500, ukeire: 3, handValue: 1, defense: 0, aggressionBase: 0.95, openPenalty: 0.9, defenseThreshold: 1.0 }
    },
    basic: {
      name: 'Basic',
      description: 'Follows tile efficiency, basic awareness',
      randomDiscardChance: 0.15,
      claimEverything: false,
      neverDefend: true,
      weights: { shanten: 800, ukeire: 8, handValue: 3, defense: 200, aggressionBase: 0.8, openPenalty: 0.7, defenseThreshold: 0.8 }
    },
    intermediate: {
      name: 'Intermediate',
      description: 'Defends when behind, calls strategically',
      randomDiscardChance: 0.05,
      claimEverything: false,
      neverDefend: false,
      weights: { shanten: 1000, ukeire: 12, handValue: 6, defense: 600, aggressionBase: 0.65, openPenalty: 0.55, defenseThreshold: 0.5 }
    },
    advanced: {
      name: 'Advanced',
      description: 'Near-optimal play with hand reading',
      randomDiscardChance: 0,
      claimEverything: false,
      neverDefend: false,
      weights: { shanten: 1000, ukeire: 18, handValue: 10, defense: 900, aggressionBase: 0.6, openPenalty: 0.45, defenseThreshold: 0.45 }
    },
    expert: {
      name: 'Expert',
      description: 'Maximum strength, punishes mistakes',
      randomDiscardChance: 0,
      claimEverything: false,
      neverDefend: false,
      weights: { shanten: 1200, ukeire: 25, handValue: 12, defense: 1200, aggressionBase: 0.55, openPenalty: 0.4, defenseThreshold: 0.4 }
    }
  };

  function getLevel(name) {
    return LEVELS[name] || LEVELS.intermediate;
  }

  function getLevelNames() {
    return Object.keys(LEVELS);
  }

  function getAllLevels() {
    return Object.entries(LEVELS).map(([key, val]) => ({ key, ...val }));
  }

  root.MJ.Difficulty = Object.freeze({ LEVELS, getLevel, getLevelNames, getAllLevels });
  if (typeof console !== 'undefined') console.log('[Mahjong] Difficulty module loaded');
})(typeof window !== 'undefined' ? window : global);
