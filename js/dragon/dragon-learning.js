/**
 * dragon-learning.js — Cross-session learning and emotional state integration
 * for D&D dragon battle. Tracks combat stats, reads cross-game emotions,
 * and maps card-game personality traits to combat style.
 * Exports under window.MJ.Dragon.Learning (IIFE module).
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};

  // ---------------------------------------------------------------------------
  // Lazy dependency accessors
  // ---------------------------------------------------------------------------
  function CGL()        { return root.MJ.CrossGameLearning; }
  function Cognition()  { return root.MJ.CharacterCognition; }
  function Personality() { return root.MJ.Personality; }

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  var STORAGE_KEY = 'mj_dragon_learning';

  var DEFAULT_MODIFIERS = {
    aggression:    0,
    defense:       0,
    riskTolerance: 0
  };

  /**
   * Emotion-to-modifier mapping table.
   * Keys are emotion keywords; values are combat modifier adjustments.
   */
  var EMOTION_MAP = {
    frustrated:  { aggression:  0.2, defense: -0.1, riskTolerance:  0.3 },
    tilted:      { aggression:  0.2, defense: -0.1, riskTolerance:  0.3 },
    angry:       { aggression:  0.2, defense: -0.1, riskTolerance:  0.3 },
    confident:   { aggression:  0.1, defense:  0,   riskTolerance:  0.1 },
    determined:  { aggression:  0.1, defense:  0,   riskTolerance:  0.1 },
    cautious:    { aggression: -0.1, defense:  0.2, riskTolerance: -0.2 },
    anxious:     { aggression: -0.1, defense:  0.2, riskTolerance: -0.2 },
    nervous:     { aggression: -0.1, defense:  0.2, riskTolerance: -0.2 },
    serene:      { aggression:  0,   defense:  0,   riskTolerance:  0   },
    calm:        { aggression:  0,   defense:  0,   riskTolerance:  0   },
    focused:     { aggression:  0,   defense:  0,   riskTolerance:  0   }
  };

  // ---------------------------------------------------------------------------
  // Helper utilities
  // ---------------------------------------------------------------------------

  /**
   * Safely read JSON from localStorage.
   */
  function loadStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('[DragonLearning] Failed to read localStorage:', e);
    }
    return null;
  }

  /**
   * Safely write JSON to localStorage.
   */
  function saveStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[DragonLearning] Failed to write localStorage:', e);
    }
  }

  /**
   * Return a fresh empty stats object.
   */
  function emptyStats() {
    return {
      totalFights:       0,
      wins:              0,
      losses:            0,
      totalRounds:       0,
      totalCharactersDown: 0,
      totalDamageDealt:  0,
      totalHealingDone:  0,
      characterStats:    {},
      history:           []       // last N fight summaries
    };
  }

  /**
   * Ensure a character entry exists in the stats object.
   */
  function ensureCharEntry(stats, id) {
    if (!stats.characterStats[id]) {
      stats.characterStats[id] = {
        damage:  0,
        healing: 0,
        kills:   0,
        downs:   0,
        fights:  0
      };
    }
  }

  /**
   * Clamp a value between min and max.
   */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // ---------------------------------------------------------------------------
  // DragonLearning class
  // ---------------------------------------------------------------------------

  /**
   * @constructor
   * Tracks combat results across sessions and integrates cross-game data.
   */
  function DragonLearning() {
    this._stats = null;    // lazy-loaded from localStorage
  }

  // ---------------------------------------------------------------------------
  // recordCombatResult — persist fight outcome
  // ---------------------------------------------------------------------------

  /**
   * Record a completed combat encounter's results.
   * Accumulates stats across sessions in localStorage.
   *
   * @param {object} result
   * @param {boolean}  result.won               Did the party win?
   * @param {number}   result.roundsToVictory   How many rounds the fight lasted.
   * @param {number}   result.charactersDown     Number of characters that went to 0 HP.
   * @param {number}   result.totalDamageDealt   Total damage dealt by party.
   * @param {number}   result.totalHealingDone   Total healing done by party.
   * @param {object}   result.characterStats     Per-character breakdown {id: {damage, healing, kills, downs}}.
   * @param {number}   result.dragonHPRemaining  Dragon HP at fight end.
   */
  DragonLearning.prototype.recordCombatResult = function (result) {
    if (!result) return;

    var stats = this.getCombatStats();

    // Accumulate top-level stats
    stats.totalFights += 1;
    if (result.won) {
      stats.wins += 1;
    } else {
      stats.losses += 1;
    }
    stats.totalRounds        += (result.roundsToVictory || 0);
    stats.totalCharactersDown += (result.charactersDown || 0);
    stats.totalDamageDealt   += (result.totalDamageDealt || 0);
    stats.totalHealingDone   += (result.totalHealingDone || 0);

    // Accumulate per-character stats
    if (result.characterStats) {
      var ids = Object.keys(result.characterStats);
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var cs = result.characterStats[id];
        ensureCharEntry(stats, id);
        var entry = stats.characterStats[id];
        entry.damage  += (cs.damage  || 0);
        entry.healing += (cs.healing || 0);
        entry.kills   += (cs.kills   || 0);
        entry.downs   += (cs.downs   || 0);
        entry.fights  += 1;
      }
    }

    // Append to history (keep last 20 fights)
    stats.history.push({
      won:              !!result.won,
      rounds:           result.roundsToVictory || 0,
      charactersDown:   result.charactersDown || 0,
      damageDealt:      result.totalDamageDealt || 0,
      healingDone:      result.totalHealingDone || 0,
      dragonHPRemaining: result.dragonHPRemaining || 0,
      timestamp:        Date.now()
    });
    if (stats.history.length > 20) {
      stats.history = stats.history.slice(stats.history.length - 20);
    }

    // Persist
    this._stats = stats;
    saveStorage(stats);
  };

  // ---------------------------------------------------------------------------
  // getCombatStats — retrieve accumulated stats
  // ---------------------------------------------------------------------------

  /**
   * Return the accumulated combat stats object from localStorage.
   * @returns {object} Stats object with totals, per-character data, and history.
   */
  DragonLearning.prototype.getCombatStats = function () {
    if (this._stats) return this._stats;

    var stored = loadStorage();
    if (stored && typeof stored === 'object' && stored.totalFights !== undefined) {
      // Ensure all expected fields exist (forward compat)
      stored.history = stored.history || [];
      stored.characterStats = stored.characterStats || {};
      this._stats = stored;
      return stored;
    }

    this._stats = emptyStats();
    return this._stats;
  };

  // ---------------------------------------------------------------------------
  // getEmotionModifiers — cross-game emotional state → combat modifiers
  // ---------------------------------------------------------------------------

  /**
   * Read cross-game emotional state for a character and map it to combat modifiers.
   *
   * @param {string} characterId  Character identifier.
   * @returns {object} { aggression, defense, riskTolerance } modifier values.
   */
  DragonLearning.prototype.getEmotionModifiers = function (characterId) {
    // Default: no modification (optimal play)
    var mods = {
      aggression:    0,
      defense:       0,
      riskTolerance: 0
    };

    try {
      var cgl = CGL();
      if (!cgl) return mods;

      // Try to get emotional state from CrossGameLearning
      var emotionData = null;
      if (typeof cgl.getEmotionalState === 'function') {
        emotionData = cgl.getEmotionalState(characterId);
      } else if (typeof cgl.getState === 'function') {
        var state = cgl.getState(characterId);
        emotionData = state && state.emotion ? state.emotion : null;
      }

      if (!emotionData) return mods;

      var emotion   = (emotionData.emotion || emotionData.type || '').toLowerCase();
      var intensity = emotionData.intensity || 1.0;

      // Look up the emotion in our mapping table
      var mapped = EMOTION_MAP[emotion];
      if (!mapped) return mods;

      // Scale by intensity and clamp
      mods.aggression    = clamp(mapped.aggression    * intensity, -1, 1);
      mods.defense       = clamp(mapped.defense       * intensity, -1, 1);
      mods.riskTolerance = clamp(mapped.riskTolerance * intensity, -1, 1);

    } catch (e) {
      console.warn('[DragonLearning] Error reading cross-game emotions:', e);
    }

    return mods;
  };

  // ---------------------------------------------------------------------------
  // recordCognition — write notable events to CharacterCognition
  // ---------------------------------------------------------------------------

  /**
   * Record a notable cognitive event for a character if CharacterCognition is available.
   *
   * @param {string} characterId  Character identifier.
   * @param {string} event        Event type: 'heroic_moment', 'near_death',
   *                              'tactical_success', or 'lesson_learned'.
   * @param {object} details      Additional event details.
   */
  DragonLearning.prototype.recordCognition = function (characterId, event, details) {
    if (!characterId || !event) return;

    var validEvents = {
      heroic_moment:    true,
      near_death:       true,
      tactical_success: true,
      lesson_learned:   true
    };

    if (!validEvents[event]) {
      console.warn('[DragonLearning] Unknown cognition event:', event);
      return;
    }

    try {
      var cog = Cognition();
      if (!cog) return;

      var record = {
        game:        'dragon',
        characterId: characterId,
        event:       event,
        details:     details || {},
        timestamp:   Date.now()
      };

      // Try common CharacterCognition API methods
      if (typeof cog.recordEvent === 'function') {
        cog.recordEvent(characterId, record);
      } else if (typeof cog.addMemory === 'function') {
        cog.addMemory(characterId, {
          type:    'dragon_combat_' + event,
          data:    record,
          salience: event === 'heroic_moment' ? 0.9 :
                    event === 'near_death'    ? 0.8 :
                    event === 'lesson_learned' ? 0.7 : 0.5
        });
      } else if (typeof cog.record === 'function') {
        cog.record(characterId, event, record);
      }

    } catch (e) {
      console.warn('[DragonLearning] Error recording cognition:', e);
    }
  };

  // ---------------------------------------------------------------------------
  // mapCrossGameTraits — card game personality → combat style
  // ---------------------------------------------------------------------------

  /**
   * Map personality traits from the card game modules to combat behavior.
   * Reads from the Personality module if available.
   *
   * @param {string} characterId  Character identifier.
   * @returns {object} Combat personality:
   *   { combatAggression, healingPriority, slotUsageStyle, positioningStyle }
   */
  DragonLearning.prototype.mapCrossGameTraits = function (characterId) {
    var combatPersonality = {
      combatAggression: 0.5,   // 0 = passive, 1 = very aggressive
      healingPriority:  0.5,   // 0 = ignore healing, 1 = heal-first
      slotUsageStyle:   0.5,   // 0 = hoard slots, 1 = burn early
      positioningStyle: 0.5    // 0 = turtle/defensive, 1 = aggressive flanking
    };

    try {
      var pers = Personality();
      if (!pers) return combatPersonality;

      // Read personality weights — try common API shapes
      var weights = null;
      if (typeof pers.getWeights === 'function') {
        weights = pers.getWeights(characterId);
      } else if (typeof pers.getProfile === 'function') {
        var profile = pers.getProfile(characterId);
        weights = profile && profile.weights ? profile.weights : null;
      } else if (typeof pers.get === 'function') {
        weights = pers.get(characterId);
      }

      if (!weights) return combatPersonality;

      // Poker aggression → combat aggression multiplier
      if (weights.pokerAggression !== undefined) {
        combatPersonality.combatAggression = clamp(
          0.5 + (weights.pokerAggression - 0.5) * 0.6, 0, 1
        );
      } else if (weights.aggression !== undefined) {
        combatPersonality.combatAggression = clamp(
          0.5 + (weights.aggression - 0.5) * 0.6, 0, 1
        );
      }

      // Mahjong defense orientation → healing/shielding priority
      if (weights.mahjongDefense !== undefined) {
        combatPersonality.healingPriority = clamp(
          0.5 + (weights.mahjongDefense - 0.5) * 0.8, 0, 1
        );
      } else if (weights.defensiveness !== undefined) {
        combatPersonality.healingPriority = clamp(
          0.5 + (weights.defensiveness - 0.5) * 0.8, 0, 1
        );
      }

      // Blackjack risk tolerance → willingness to use high-level slots early
      if (weights.blackjackRisk !== undefined) {
        combatPersonality.slotUsageStyle = clamp(
          0.5 + (weights.blackjackRisk - 0.5) * 0.7, 0, 1
        );
      } else if (weights.riskTolerance !== undefined) {
        combatPersonality.slotUsageStyle = clamp(
          0.5 + (weights.riskTolerance - 0.5) * 0.7, 0, 1
        );
      }

      // Dominoes blocking style → positioning / area denial preference
      if (weights.dominoesBlocking !== undefined) {
        combatPersonality.positioningStyle = clamp(
          0.5 + (weights.dominoesBlocking - 0.5) * 0.5, 0, 1
        );
      } else if (weights.blocking !== undefined) {
        combatPersonality.positioningStyle = clamp(
          0.5 + (weights.blocking - 0.5) * 0.5, 0, 1
        );
      }

    } catch (e) {
      console.warn('[DragonLearning] Error mapping cross-game traits:', e);
    }

    return combatPersonality;
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  root.MJ.Dragon.Learning = {
    DragonLearning: DragonLearning
  };

  console.log('[Dragon] Learning module loaded');

})(typeof window !== 'undefined' ? window : this);
