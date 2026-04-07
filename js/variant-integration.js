/**
 * variant-integration.js — Deep integration of rule variants into game flow
 * Modifies wall construction, scoring, game flow, and AI behavior per variant.
 * Exports: root.MJ.VariantIntegration
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Variant descriptions
  // ---------------------------------------------------------------------------

  const VARIANT_DESCRIPTIONS = {
    standard: {
      name: 'Standard',
      rules: [
        'Classic 4-player mahjong with 136 tiles',
        'All suits and honors included',
        'Riichi and dora enabled',
        'Minimum 1 point to win'
      ]
    },
    hong_kong: {
      name: 'Hong Kong Old Style',
      rules: [
        'Minimum 3 points to win (higher bar for claiming victory)',
        'No riichi declaration allowed',
        'No dora indicator tiles',
        'Flowers included for bonus points',
        'Simpler scoring with no dealer bonus'
      ]
    },
    speed: {
      name: 'Speed Mahjong',
      rules: [
        'Reduced wall: only 100 tiles used',
        'All scores are doubled',
        '10-second turn timer — decide fast!',
        'No flowers, shorter rounds'
      ]
    },
    sanma: {
      name: 'Three-Player (Sanma)',
      rules: [
        'Only 3 players — seat 3 (North) is skipped',
        'Characters suit ranks 2-8 removed (1 and 9 kept)',
        'Scoring multiplier: 1.5x',
        'Faster pace with fewer tiles in play'
      ]
    },
    bamboo_only: {
      name: 'Bamboo Garden',
      rules: [
        'Only bamboo tiles and honor tiles in the wall',
        'Characters and circles completely removed',
        'Scoring doubled (flushes come naturally)',
        'Compact wall leads to quicker games'
      ]
    }
  };

  // ---------------------------------------------------------------------------
  // Tile filtering helpers
  // ---------------------------------------------------------------------------

  function isTileInSuit(tile, suit) {
    if (!tile) return false;
    // Support tile objects ({suit, rank}) and string IDs
    if (typeof tile === 'object') return tile.suit === suit;
    var prefixMap = { characters: 'man', circles: 'pin', bamboo: 'sou' };
    var prefix = prefixMap[suit];
    return prefix ? tile.indexOf(prefix) === 0 : false;
  }

  function getTileRank(tile) {
    if (typeof tile === 'object') return tile.rank;
    var match = tile.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // ---------------------------------------------------------------------------
  // VariantIntegration class
  // ---------------------------------------------------------------------------

  class VariantIntegration {
    constructor() {
      this._timers = {};
    }

    // ---- Wall modification ---------------------------------------------------

    applyToWall(variantId, wall) {
      if (!wall || !Array.isArray(wall)) return wall;
      var filtered;

      switch (variantId) {
        case 'sanma':
          // Remove characters suit ranks 2-8; keep 1 and 9
          filtered = wall.filter(function (tile) {
            if (!isTileInSuit(tile, 'characters')) return true;
            var rank = getTileRank(tile);
            return rank === 1 || rank === 9;
          });
          return filtered;

        case 'bamboo_only':
          // Remove characters and circles entirely; keep bamboo + honors
          filtered = wall.filter(function (tile) {
            return !isTileInSuit(tile, 'characters') && !isTileInSuit(tile, 'circles');
          });
          return filtered;

        case 'speed':
          // Use only 100 tiles — shuffle first, then truncate
          var shuffled = wall.slice();
          for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = tmp;
          }
          return shuffled.slice(0, Math.min(100, shuffled.length));

        default:
          return wall;
      }
    }

    // ---- Scoring modification ------------------------------------------------

    applyToScoring(variantId, baseScore) {
      if (typeof baseScore !== 'number') baseScore = 0;

      switch (variantId) {
        case 'hong_kong':
          // Minimum 3 points to win — return 0 if below threshold
          return baseScore >= 3 ? baseScore : 0;

        case 'speed':
          // All scores doubled
          return baseScore * 2;

        case 'sanma':
          // 1.5x multiplier
          return Math.round(baseScore * 1.5);

        case 'bamboo_only':
          // 2x multiplier (from variant definition)
          return baseScore * 2;

        default:
          return baseScore;
      }
    }

    // ---- Game flow modification ----------------------------------------------

    applyToGameFlow(variantId, state) {
      var modifications = {
        skipSeats: [],
        riichiAllowed: true,
        turnTimer: null,
        maxPlayers: 4,
        reducedWall: false
      };

      switch (variantId) {
        case 'speed':
          modifications.turnTimer = 10;
          modifications.reducedWall = true;
          break;

        case 'hong_kong':
          modifications.riichiAllowed = false;
          break;

        case 'sanma':
          modifications.maxPlayers = 3;
          modifications.skipSeats = [3]; // Skip North seat
          break;

        default:
          break;
      }

      // Apply modifications to state if provided
      if (state) {
        if (modifications.skipSeats.length > 0) {
          state.skipSeats = modifications.skipSeats;
        }
        if (!modifications.riichiAllowed) {
          state.riichiAllowed = false;
        }
        if (modifications.turnTimer !== null) {
          state.turnTimer = modifications.turnTimer;
        }
        state.maxPlayers = modifications.maxPlayers;
      }

      return modifications;
    }

    // ---- AI adjustments ------------------------------------------------------

    applyToAI(variantId, weights) {
      if (!weights || typeof weights !== 'object') {
        weights = {
          handValue: 0.5,
          efficiency: 0.5,
          defense: 0.5,
          aggression: 0.5,
          claimFrequency: 0.5
        };
      }
      // Clone to avoid mutation
      var adjusted = {};
      for (var k in weights) {
        if (weights.hasOwnProperty(k)) adjusted[k] = weights[k];
      }

      switch (variantId) {
        case 'bamboo_only':
          // Easier flushes — increase hand value weight
          adjusted.handValue = Math.min(1, (adjusted.handValue || 0.5) + 0.25);
          adjusted.efficiency = Math.max(0, (adjusted.efficiency || 0.5) - 0.1);
          break;

        case 'speed':
          // Less time to build — increase aggression, lower hand value preference
          adjusted.aggression = Math.min(1, (adjusted.aggression || 0.5) + 0.3);
          adjusted.handValue = Math.max(0, (adjusted.handValue || 0.5) - 0.2);
          adjusted.claimFrequency = Math.min(1, (adjusted.claimFrequency || 0.5) + 0.2);
          break;

        case 'sanma':
          // 3 players — less competition for tiles, can be more ambitious
          adjusted.handValue = Math.min(1, (adjusted.handValue || 0.5) + 0.15);
          adjusted.defense = Math.max(0, (adjusted.defense || 0.5) - 0.1);
          break;

        case 'hong_kong':
          // Need 3+ points — push for higher value hands
          adjusted.handValue = Math.min(1, (adjusted.handValue || 0.5) + 0.3);
          adjusted.efficiency = Math.max(0, (adjusted.efficiency || 0.5) - 0.15);
          adjusted.aggression = Math.max(0, (adjusted.aggression || 0.5) - 0.1);
          break;

        default:
          break;
      }

      return adjusted;
    }

    // ---- Turn timer ----------------------------------------------------------

    getTurnTimer(variantId) {
      switch (variantId) {
        case 'speed':
          return { seconds: 10, warningAt: 3, enabled: true };
        default:
          return null;
      }
    }

    // ---- Action validation ---------------------------------------------------

    validateAction(variantId, action, state) {
      if (!action) return { valid: false, reason: 'No action provided' };

      var result = { valid: true, reason: null };

      switch (variantId) {
        case 'hong_kong':
          // No riichi allowed
          if (action.type === 'riichi') {
            result.valid = false;
            result.reason = 'Riichi is not allowed in Hong Kong rules';
          }
          // Check minimum score on win declaration
          if (action.type === 'tsumo' || action.type === 'ron') {
            if (action.score !== undefined && action.score < 3) {
              result.valid = false;
              result.reason = 'Minimum 3 points required to win in Hong Kong rules';
            }
          }
          break;

        case 'sanma':
          // Cannot target or be seat 3
          if (action.targetSeat === 3 || action.seatIndex === 3) {
            result.valid = false;
            result.reason = 'Seat 3 (North) is not in play in Sanma';
          }
          break;

        case 'speed':
          // Validate turn timer
          if (state && state.turnStartTime) {
            var elapsed = (Date.now() - state.turnStartTime) / 1000;
            if (elapsed > 10) {
              result.valid = false;
              result.reason = 'Turn timer expired (10 second limit in Speed Mahjong)';
            }
          }
          break;

        default:
          break;
      }

      return result;
    }

    // ---- Variant description -------------------------------------------------

    getVariantDescription(variantId) {
      var desc = VARIANT_DESCRIPTIONS[variantId];
      if (!desc) {
        return {
          name: variantId || 'Unknown',
          formatted: 'No description available for this variant.',
          rules: []
        };
      }
      var formatted = desc.name + ' Rules:\n' + desc.rules.map(function (r) {
        return '  - ' + r;
      }).join('\n');
      return {
        name: desc.name,
        formatted: formatted,
        rules: desc.rules
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  root.MJ.VariantIntegration = Object.freeze({
    VariantIntegration: VariantIntegration,
    VARIANT_DESCRIPTIONS: VARIANT_DESCRIPTIONS
  });
  if (typeof console !== 'undefined') console.log('[Mahjong] VariantIntegration module loaded');
})(typeof window !== 'undefined' ? window : global);
