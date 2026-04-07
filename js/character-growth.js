/**
 * character-growth.js - Characters that evolve and grow over time based on games played.
 *
 * Tracks per-character milestones, trait modifications, and narrative progression
 * across multiple play sessions. Each character has a unique growth arc that
 * unfolds as the player accumulates games with them.
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Default character seeds
  // ---------------------------------------------------------------------------
  const DEFAULT_CHARACTERS = ['mei', 'kenji', 'yuki'];

  function createBlankState(id) {
    return { gamesPlayed: 0, milestones: [], currentTraits: {} };
  }

  // ---------------------------------------------------------------------------
  // Milestone definitions
  // ---------------------------------------------------------------------------
  // Each milestone: { id, character, gamesRequired, title, message, traitChange (string|null), apply(state) }

  const MILESTONE_DEFS = [
    // --- Kenji: learns patience ---
    {
      id: 'k_patience_1', character: 'kenji', gamesRequired: 10,
      title: 'Growing Patience',
      message: "You know what? I think I'm getting better at not tilting. The ramen shop taught me \u2014 you can't rush a good broth, and you can't rush a good hand.",
      traitChange: 'Kenji tilts 10% less',
      apply: function(s) { s.currentTraits.tiltReduction = 0.1; }
    },
    {
      id: 'k_patience_2', character: 'kenji', gamesRequired: 30,
      title: 'The Calm Before the Storm',
      message: "I used to throw tiles like punches. Now I place them like ingredients. Still aggressive, but... purposeful.",
      traitChange: 'Kenji tilts 25% less, plays more strategically',
      apply: function(s) { s.currentTraits.tiltReduction = 0.25; }
    },
    {
      id: 'k_wisdom', character: 'kenji', gamesRequired: 60,
      title: "The Ramen Master's Wisdom",
      message: "Sixty games. You know what I've learned? The best poker players aren't the boldest. They're the ones who know when NOT to bet. Same here.",
      traitChange: 'Kenji now defends when appropriate',
      apply: function(s) { s.currentTraits.defenseBoost = 0.15; }
    },
    {
      id: 'k_mastery', character: 'kenji', gamesRequired: 100,
      title: 'Fire and Ice',
      message: "A hundred games in and I finally understand. Aggression isn't about being reckless \u2014 it's about choosing the right moment to strike. The rest is patience.",
      traitChange: 'Kenji balances aggression with patience',
      apply: function(s) { s.currentTraits.tiltReduction = 0.4; s.currentTraits.defenseBoost = 0.25; }
    },

    // --- Mei: becomes bolder ---
    {
      id: 'm_bold_1', character: 'mei', gamesRequired: 10,
      title: 'Finding Courage',
      message: "I've been playing it too safe. My grandmother always said: 'A flower that never opens never knows the sun.' Time to open up.",
      traitChange: 'Mei claims slightly more aggressively',
      apply: function(s) { s.currentTraits.aggressionBoost = 0.05; }
    },
    {
      id: 'm_bold_2', character: 'mei', gamesRequired: 25,
      title: 'The Data Speaks',
      message: "I analyzed our games. My defense is strong, but I'm leaving points on the table. The data says: push more when tenpai.",
      traitChange: 'Mei pushes more at tenpai',
      apply: function(s) { s.currentTraits.aggressionBoost = 0.12; }
    },
    {
      id: 'm_confident', character: 'mei', gamesRequired: 50,
      title: 'Quiet Confidence',
      message: "I used to second-guess every discard. Now I trust my reads. The numbers don't lie, and neither does experience.",
      traitChange: 'Mei makes faster, more confident decisions',
      apply: function(s) { s.currentTraits.aggressionBoost = 0.18; s.currentTraits.confidenceBoost = 0.1; }
    },
    {
      id: 'm_mastery', character: 'mei', gamesRequired: 80,
      title: "Grandmother's Legacy",
      message: "Grandmother would be proud, I think. She always wanted me to be strong \u2014 not just smart. I'm getting there.",
      traitChange: 'Mei plays with balanced aggression and defense',
      apply: function(s) { s.currentTraits.aggressionBoost = 0.2; s.currentTraits.confidenceBoost = 0.15; }
    },

    // --- Yuki: shares more about Takeshi ---
    {
      id: 'y_memory_1', character: 'yuki', gamesRequired: 15,
      title: "Takeshi's Teaching",
      message: "Takeshi had a saying: 'Play the player, not the tiles.' He could read people like books. I'm not as good, but I'm learning from watching you all.",
      traitChange: 'Yuki reads opponents slightly better',
      apply: function(s) { s.currentTraits.readingBoost = 0.1; }
    },
    {
      id: 'y_memory_2', character: 'yuki', gamesRequired: 40,
      title: 'The Sunday Table',
      message: "Do you know why I keep playing? Not to win. Every hand I play, I'm sitting across from Takeshi again. The tiles are the same tiles. The love is the same love. This table is our table, wherever it stands.",
      traitChange: null,
      apply: function(s) { /* emotional moment, no gameplay change */ }
    },
    {
      id: 'y_intuition', character: 'yuki', gamesRequired: 65,
      title: 'The Quiet Knowing',
      message: "After so many years, the tiles almost speak to me. Not literally, of course. But there's a rhythm to the game \u2014 like music. Takeshi heard it first. Now I hear it too.",
      traitChange: 'Yuki has improved tile reading intuition',
      apply: function(s) { s.currentTraits.readingBoost = 0.2; s.currentTraits.intuitionBoost = 0.1; }
    },
    {
      id: 'y_peace', character: 'yuki', gamesRequired: 90,
      title: 'Peace at the Table',
      message: "I've stopped playing to remember Takeshi. I play because I love this game. He'd want that. He'd say, 'Yuki, stop being sentimental and win already.'",
      traitChange: 'Yuki plays with renewed focus',
      apply: function(s) { s.currentTraits.readingBoost = 0.25; s.currentTraits.intuitionBoost = 0.15; s.currentTraits.focusBoost = 0.1; }
    }
  ];

  // ---------------------------------------------------------------------------
  // CharacterGrowth class
  // ---------------------------------------------------------------------------

  function CharacterGrowth() {
    this.state = {};
    this.load();
  }

  CharacterGrowth.prototype.load = function() {
    try {
      var saved = JSON.parse(localStorage.getItem('mj_char_growth'));
      if (saved && typeof saved === 'object') {
        this.state = saved;
      } else {
        this.state = {};
      }
    } catch (e) {
      this.state = {};
    }
    // Ensure all default characters exist
    for (var i = 0; i < DEFAULT_CHARACTERS.length; i++) {
      var id = DEFAULT_CHARACTERS[i];
      if (!this.state[id]) {
        this.state[id] = createBlankState(id);
      }
    }
  };

  CharacterGrowth.prototype.save = function() {
    try {
      localStorage.setItem('mj_char_growth', JSON.stringify(this.state));
    } catch (e) {
      // storage full or unavailable
    }
  };

  /**
   * Record a completed game for a character.
   * @param {string} characterId
   * @param {object} gameData - optional metadata about the game (score, result, etc.)
   * @returns {Array} Array of triggered milestone objects
   */
  CharacterGrowth.prototype.recordGame = function(characterId, gameData) {
    var s = this.state[characterId];
    if (!s) return [];
    s.gamesPlayed++;
    // Store optional game metadata for future analysis
    if (gameData) {
      if (!s.recentGames) s.recentGames = [];
      s.recentGames.push({
        timestamp: Date.now(),
        score: gameData.score || 0,
        result: gameData.result || 'unknown',
        handsWon: gameData.handsWon || 0
      });
      // Keep only the last 50 recent games
      if (s.recentGames.length > 50) {
        s.recentGames.splice(0, s.recentGames.length - 50);
      }
    }
    this.save();
    return this.checkMilestones(characterId);
  };

  /**
   * Check and trigger any milestones that the character has earned.
   * @param {string} charId
   * @returns {Array} Array of newly triggered milestone objects
   */
  CharacterGrowth.prototype.checkMilestones = function(charId) {
    var s = this.state[charId];
    if (!s) return [];
    var triggered = [];

    for (var i = 0; i < MILESTONE_DEFS.length; i++) {
      var def = MILESTONE_DEFS[i];
      if (def.character !== charId) continue;
      if (s.gamesPlayed >= def.gamesRequired && s.milestones.indexOf(def.id) === -1) {
        s.milestones.push(def.id);
        def.apply(s);
        triggered.push({
          character: def.character,
          milestone: def.id,
          title: def.title,
          message: def.message,
          traitChange: def.traitChange
        });
      }
    }

    if (triggered.length > 0) {
      this.save();
    }
    return triggered;
  };

  /**
   * Get the current trait modifiers for a character.
   * @param {string} charId
   * @returns {object} Trait modifier map
   */
  CharacterGrowth.prototype.getTraitModifiers = function(charId) {
    var s = this.state[charId];
    if (!s) return {};
    var result = {};
    var traits = s.currentTraits;
    for (var key in traits) {
      if (traits.hasOwnProperty(key)) {
        result[key] = traits[key];
      }
    }
    return result;
  };

  /**
   * Get a summary of growth for all characters.
   * @returns {object} Map of charId -> summary
   */
  CharacterGrowth.prototype.getGrowthSummary = function() {
    var result = {};
    for (var id in this.state) {
      if (!this.state.hasOwnProperty(id)) continue;
      var s = this.state[id];
      var traitsCopy = {};
      for (var key in s.currentTraits) {
        if (s.currentTraits.hasOwnProperty(key)) {
          traitsCopy[key] = s.currentTraits[key];
        }
      }
      result[id] = {
        gamesPlayed: s.gamesPlayed,
        milestonesReached: s.milestones.length,
        totalMilestones: this._countMilestonesFor(id),
        traits: traitsCopy,
        milestoneIds: s.milestones.slice()
      };
    }
    return result;
  };

  /**
   * Get the milestone history for a specific character.
   * @param {string} charId
   * @returns {Array} Array of milestone objects that have been triggered
   */
  CharacterGrowth.prototype.getMilestoneHistory = function(charId) {
    var s = this.state[charId];
    if (!s) return [];
    var history = [];
    for (var i = 0; i < MILESTONE_DEFS.length; i++) {
      var def = MILESTONE_DEFS[i];
      if (def.character === charId && s.milestones.indexOf(def.id) !== -1) {
        history.push({
          id: def.id,
          title: def.title,
          message: def.message,
          traitChange: def.traitChange,
          gamesRequired: def.gamesRequired
        });
      }
    }
    return history;
  };

  /**
   * Get the next upcoming milestone for a character.
   * @param {string} charId
   * @returns {object|null} Next milestone info or null if all achieved
   */
  CharacterGrowth.prototype.getNextMilestone = function(charId) {
    var s = this.state[charId];
    if (!s) return null;
    var best = null;
    for (var i = 0; i < MILESTONE_DEFS.length; i++) {
      var def = MILESTONE_DEFS[i];
      if (def.character !== charId) continue;
      if (s.milestones.indexOf(def.id) !== -1) continue;
      if (!best || def.gamesRequired < best.gamesRequired) {
        best = def;
      }
    }
    if (!best) return null;
    return {
      id: best.id,
      title: best.title,
      gamesRequired: best.gamesRequired,
      gamesRemaining: Math.max(0, best.gamesRequired - s.gamesPlayed),
      progress: Math.min(1, s.gamesPlayed / best.gamesRequired)
    };
  };

  /** @private */
  CharacterGrowth.prototype._countMilestonesFor = function(charId) {
    var count = 0;
    for (var i = 0; i < MILESTONE_DEFS.length; i++) {
      if (MILESTONE_DEFS[i].character === charId) count++;
    }
    return count;
  };

  /**
   * Reset all character growth data.
   */
  CharacterGrowth.prototype.reset = function() {
    this.state = {};
    for (var i = 0; i < DEFAULT_CHARACTERS.length; i++) {
      this.state[DEFAULT_CHARACTERS[i]] = createBlankState(DEFAULT_CHARACTERS[i]);
    }
    this.save();
  };

  /**
   * Ensure a character exists in the growth state (for new/unlocked characters).
   * @param {string} charId
   */
  CharacterGrowth.prototype.ensureCharacter = function(charId) {
    if (!this.state[charId]) {
      this.state[charId] = createBlankState(charId);
      this.save();
    }
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  root.MJ.CharacterGrowth = CharacterGrowth;
  root.MJ.MILESTONE_DEFS = MILESTONE_DEFS;

})(typeof window !== 'undefined' ? window : global);
