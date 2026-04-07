/**
 * campaign-locations.js — Location registry tying together all campaign systems.
 * Exports under window.MJ.Dragon.Campaign.Locations (IIFE module).
 * Dependencies (lazy): MJ.Dragon.Campaign.Story, MJ.Dragon.Campaign.State
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  function Story() { return root.MJ.Dragon.Campaign.Story; }
  function State() { return root.MJ.Dragon.Campaign.State; }

  /* ================================================================
   *  LOCATIONS — full definitions for every campaign location
   * ================================================================ */

  var LOCATIONS = Object.freeze({

    /* ---- Willowmere (hub hamlet) ---- */
    willowmere: {
      id: 'willowmere',
      name: 'Willowmere',
      type: 'hamlet',
      terrain: 'grassland',
      hexPos: { q: 5, r: 4 },
      icon: '\uD83C\uDFE0',           // 🏠
      description: 'A peaceful hamlet at the crossroads, home to the ' +
        'Weary Wyrm inn. The party\'s base of operations.',
      recommendedLevel: null,
      encounters: [],
      mapId: null,
      lootTable: null,
      questId: null,
      storyPhase: 1,
      unlockCondition: null
    },

    /* ---- Whispering Woods ---- */
    whispering_woods: {
      id: 'whispering_woods',
      name: 'The Whispering Woods',
      type: 'wilderness',
      terrain: 'forest',
      hexPos: { q: 3, r: 2 },
      icon: '\uD83C\uDF32',           // 🌲
      description: 'Ancient forest where wolves and bandits lurk. The ' +
        'western trade route passes through here.',
      recommendedLevel: 5,
      encounters: [
        {
          name: 'Wolf Pack',
          enemies: ['wolf', 'wolf', 'wolf', 'dire_wolf'],
          boss: null
        },
        {
          name: 'Bandit Ambush',
          enemies: ['bandit', 'bandit', 'bandit', 'bandit_captain'],
          boss: 'bandit_captain'
        }
      ],
      mapId: 'forest_clearing',
      lootTable: 'wolves',
      questId: 'clear_woods',
      storyPhase: 1,
      unlockCondition: null
    },

    /* ---- Stormcrag Pass ---- */
    stormcrag_pass: {
      id: 'stormcrag_pass',
      name: 'Stormcrag Pass',
      type: 'wilderness',
      terrain: 'mountain',
      hexPos: { q: 7, r: 2 },
      icon: '\u26F0\uFE0F',           // ⛰️
      description: 'A narrow mountain pass controlled by ogres. The ' +
        'eastern road is impassable until they are driven out.',
      recommendedLevel: 5,
      encounters: [
        {
          name: 'Ogre Sentries',
          enemies: ['ogre', 'ogre'],
          boss: null
        },
        {
          name: 'Ogre Chieftain',
          enemies: ['ogre', 'ogre', 'ogre_chieftain'],
          boss: 'ogre_chieftain'
        }
      ],
      mapId: 'mountain_pass',
      lootTable: 'ogres',
      questId: 'stormcrag_pass',
      storyPhase: 1,
      unlockCondition: null
    },

    /* ---- Castle Ravenmoor (dungeon — multi-room) ---- */
    haunted_castle: {
      id: 'haunted_castle',
      name: 'Castle Ravenmoor',
      type: 'dungeon',
      terrain: 'ruins',
      hexPos: { q: 2, r: 4 },
      icon: '\uD83C\uDFF0',           // 🏰
      description: 'A crumbling castle overrun by the restless dead. ' +
        'A cold green light pulses from its highest tower.',
      recommendedLevel: 6,
      encounters: [
        {
          name: 'Entrance Hall',
          room: 'entrance_hall',
          enemies: ['skeleton', 'skeleton', 'skeleton', 'skeleton',
                    'skeleton_archer', 'skeleton_archer'],
          boss: null
        },
        {
          name: 'Great Hall',
          room: 'great_hall',
          enemies: ['zombie', 'zombie', 'zombie', 'wight', 'wight'],
          boss: null
        },
        {
          name: 'Throne Room',
          room: 'throne_room',
          enemies: ['skeleton_knight', 'skeleton_knight', 'wraith'],
          boss: 'wraith'
        }
      ],
      mapId: 'castle_ravenmoor',
      lootTable: 'undead',
      questId: 'haunted_castle',
      storyPhase: 2,
      unlockCondition: { type: 'quest_any', quests: ['clear_woods', 'stormcrag_pass'] }
    },

    /* ---- Wizard's Crypt (dungeon — multi-room) ---- */
    wizards_crypt: {
      id: 'wizards_crypt',
      name: 'Aldric\'s Crypt',
      type: 'dungeon',
      terrain: 'underground',
      hexPos: { q: 8, r: 5 },
      icon: '\uD83D\uDDDD\uFE0F',     // 🗝️
      description: 'The sealed crypt of the archmage Aldric. Arcane wards ' +
        'are failing and something stirs within.',
      recommendedLevel: 7,
      encounters: [
        {
          name: 'Entry Chamber',
          room: 'entry_chamber',
          enemies: ['animated_armor', 'animated_armor', 'animated_armor'],
          boss: null
        },
        {
          name: 'Arcane Gallery',
          room: 'arcane_gallery',
          enemies: ['arcane_guardian', 'arcane_guardian', 'arcane_guardian',
                    'arcane_guardian'],
          boss: null
        },
        {
          name: 'Inner Sanctum',
          room: 'inner_sanctum',
          enemies: ['flesh_golem'],
          boss: 'flesh_golem'
        }
      ],
      mapId: 'wizards_crypt',
      lootTable: 'arcane',
      questId: 'wizards_crypt',
      storyPhase: 2,
      unlockCondition: { type: 'quest_any', quests: ['clear_woods', 'stormcrag_pass'] }
    },

    /* ---- Orc Camp ---- */
    orc_camp: {
      id: 'orc_camp',
      name: 'Iron Tusk War Camp',
      type: 'wilderness',
      terrain: 'plains',
      hexPos: { q: 9, r: 3 },
      icon: '\u2694\uFE0F',           // ⚔️
      description: 'The sprawling war camp of the Iron Tusk orc tribe, ' +
        'united under a dragon-skull banner.',
      recommendedLevel: 8,
      encounters: [
        {
          name: 'Outer Perimeter',
          enemies: ['orc_warrior', 'orc_warrior', 'orc_warrior',
                    'orc_warrior', 'orc_archer', 'orc_archer'],
          boss: null
        },
        {
          name: 'Inner Camp',
          enemies: ['orc_berserker', 'orc_berserker', 'orc_shaman',
                    'orc_war_chief'],
          boss: 'orc_war_chief'
        }
      ],
      mapId: 'orc_camp',
      lootTable: 'orcs',
      questId: 'orc_camp',
      storyPhase: 4,
      unlockCondition: { type: 'quest_any', quests: ['haunted_castle', 'wizards_crypt'] }
    },

    /* ---- Dragon's Lair (boss lair — final quest) ---- */
    dragon_lair: {
      id: 'dragon_lair',
      name: 'Scorchfang\'s Lair',
      type: 'boss_lair',
      terrain: 'volcanic',
      hexPos: { q: 6, r: 1 },
      icon: '\uD83D\uDC09',           // 🐉
      description: 'A volcanic cave high in the mountains. The stench of ' +
        'sulfur and the glint of a dragon\'s hoard await within.',
      recommendedLevel: 9,
      encounters: [
        {
          name: 'Scorchfang',
          enemies: ['dragon_scorchfang'],
          boss: 'dragon_scorchfang',
          useDragonEngine: true
        }
      ],
      mapId: 'dragon_map',
      lootTable: 'dragon_hoard',
      questId: 'dragon_lair',
      storyPhase: 5,
      unlockCondition: { type: 'quest_all', quests: ['orc_camp'] }
    },

    /* ---- Cursed Swamp (optional) ---- */
    cursed_swamp: {
      id: 'cursed_swamp',
      name: 'The Cursed Swamp',
      type: 'wilderness',
      terrain: 'swamp',
      hexPos: { q: 1, r: 5 },
      icon: '\uD83C\uDF3F',           // 🌿
      description: 'A mist-choked swamp where travelers vanish and an ' +
        'ancient hag weaves dark bargains.',
      recommendedLevel: 6,
      encounters: [
        {
          name: 'Swamp Approach',
          enemies: ['will_o_wisp', 'will_o_wisp', 'will_o_wisp',
                    'swamp_zombie', 'swamp_zombie'],
          boss: null
        },
        {
          name: 'The Hag\'s Domain',
          enemies: ['will_o_wisp', 'will_o_wisp', 'night_hag'],
          boss: 'night_hag'
        }
      ],
      mapId: 'cursed_swamp',
      lootTable: 'swamp',
      questId: 'cursed_swamp',
      storyPhase: 2,
      unlockCondition: null
    }
  });

  /* ================================================================
   *  ALL_LOCATIONS — flat array of every location object
   * ================================================================ */

  var ALL_LOCATIONS = (function () {
    var arr = [];
    var keys = Object.keys(LOCATIONS);
    for (var i = 0; i < keys.length; i++) {
      arr.push(LOCATIONS[keys[i]]);
    }
    return Object.freeze(arr);
  })();

  /* ================================================================
   *  HELPER: evaluate an unlock condition against campaign state
   * ================================================================ */

  function _evaluateUnlock(condition, completedQuests) {
    if (!condition) return true;
    var i;
    if (condition.type === 'quest_any') {
      for (i = 0; i < condition.quests.length; i++) {
        if (completedQuests.indexOf(condition.quests[i]) !== -1) return true;
      }
      return false;
    }
    if (condition.type === 'quest_all') {
      for (i = 0; i < condition.quests.length; i++) {
        if (completedQuests.indexOf(condition.quests[i]) === -1) return false;
      }
      return true;
    }
    return false;
  }

  /* ================================================================
   *  PUBLIC API
   * ================================================================ */

  /**
   * getLocation — returns the full location definition by id.
   * @param {string} id  Location identifier (e.g. 'whispering_woods').
   * @returns {object|null}
   */
  function getLocation(id) {
    return LOCATIONS[id] || null;
  }

  /**
   * getAvailableLocations — returns locations the player can currently
   * travel to, based on story phase, completed quests, and visits.
   * @param {number} storyPhase       Current story phase (1-6).
   * @param {string[]} completedQuests  Array of completed quest ids.
   * @param {string[]} visitedLocations Array of visited location ids.
   * @returns {object[]}  Array of location objects.
   */
  function getAvailableLocations(storyPhase, completedQuests, visitedLocations) {
    completedQuests = completedQuests || [];
    visitedLocations = visitedLocations || [];
    var available = [];
    for (var i = 0; i < ALL_LOCATIONS.length; i++) {
      var loc = ALL_LOCATIONS[i];
      // Must be at or past the required story phase
      if (loc.storyPhase > storyPhase) continue;
      // Evaluate unlock condition
      if (!_evaluateUnlock(loc.unlockCondition, completedQuests)) continue;
      available.push(loc);
    }
    return available;
  }

  /**
   * getEncounter — returns a specific encounter for a location.
   * For dungeons the encounters represent sequential rooms.
   * @param {string} locationId     Location identifier.
   * @param {number} encounterIndex Zero-based index into encounters array.
   * @returns {object|null}
   */
  function getEncounter(locationId, encounterIndex) {
    var loc = LOCATIONS[locationId];
    if (!loc) return null;
    if (encounterIndex < 0 || encounterIndex >= loc.encounters.length) {
      return null;
    }
    return loc.encounters[encounterIndex];
  }

  /**
   * getLocationByHex — find the location at a given hex coordinate.
   * @param {number} q  Hex column.
   * @param {number} r  Hex row.
   * @returns {object|null}
   */
  function getLocationByHex(q, r) {
    for (var i = 0; i < ALL_LOCATIONS.length; i++) {
      var pos = ALL_LOCATIONS[i].hexPos;
      if (pos.q === q && pos.r === r) return ALL_LOCATIONS[i];
    }
    return null;
  }

  /**
   * isLocationUnlocked — check whether a location is unlocked given
   * the current campaign state.
   * @param {string} locationId  Location identifier.
   * @param {object} state       Campaign state with at least:
   *   { storyPhase: number, completedQuests: string[] }
   * @returns {boolean}
   */
  function isLocationUnlocked(locationId, state) {
    var loc = LOCATIONS[locationId];
    if (!loc) return false;
    if (loc.storyPhase > (state.storyPhase || 1)) return false;
    return _evaluateUnlock(loc.unlockCondition, state.completedQuests || []);
  }

  /**
   * getLocationsByType — returns all locations of a given type.
   * @param {string} type  One of 'wilderness', 'dungeon', 'hamlet', 'boss_lair'.
   * @returns {object[]}  Array of matching location objects.
   */
  function getLocationsByType(type) {
    var results = [];
    for (var i = 0; i < ALL_LOCATIONS.length; i++) {
      if (ALL_LOCATIONS[i].type === type) results.push(ALL_LOCATIONS[i]);
    }
    return results;
  }

  /**
   * getLocationsByPhase — returns all locations that belong to a story phase.
   * @param {number} phase  Story phase number (1-6).
   * @returns {object[]}  Array of matching location objects.
   */
  function getLocationsByPhase(phase) {
    var results = [];
    for (var i = 0; i < ALL_LOCATIONS.length; i++) {
      if (ALL_LOCATIONS[i].storyPhase === phase) results.push(ALL_LOCATIONS[i]);
    }
    return results;
  }

  /**
   * getTotalEncounters — returns the total number of encounters
   * (rooms) for a given location. Useful for dungeon progress tracking.
   * @param {string} locationId  Location identifier.
   * @returns {number}  Number of encounters, or 0 if location not found.
   */
  function getTotalEncounters(locationId) {
    var loc = LOCATIONS[locationId];
    if (!loc) return 0;
    return loc.encounters.length;
  }

  /**
   * isDungeon — returns true if the location is a multi-room dungeon.
   * Dungeon encounters are fought sequentially room by room.
   * @param {string} locationId  Location identifier.
   * @returns {boolean}
   */
  function isDungeon(locationId) {
    var loc = LOCATIONS[locationId];
    if (!loc) return false;
    return loc.type === 'dungeon';
  }

  /**
   * getHexDistance — compute the hex-grid distance between two locations.
   * Uses axial coordinate distance (suitable for offset hex grids).
   * @param {string} locIdA  First location id.
   * @param {string} locIdB  Second location id.
   * @returns {number}  Distance in hex steps, or -1 if either id is invalid.
   */
  function getHexDistance(locIdA, locIdB) {
    var a = LOCATIONS[locIdA];
    var b = LOCATIONS[locIdB];
    if (!a || !b) return -1;
    var dq = Math.abs(a.hexPos.q - b.hexPos.q);
    var dr = Math.abs(a.hexPos.r - b.hexPos.r);
    var ds = Math.abs((a.hexPos.q + a.hexPos.r) - (b.hexPos.q + b.hexPos.r));
    return Math.max(dq, dr, ds);
  }

  /* ================================================================
   *  MODULE EXPORT
   * ================================================================ */

  root.MJ.Dragon.Campaign.Locations = Object.freeze({
    LOCATIONS:      LOCATIONS,
    ALL_LOCATIONS:  ALL_LOCATIONS,

    getLocation:            getLocation,
    getAvailableLocations:  getAvailableLocations,
    getEncounter:           getEncounter,
    getLocationByHex:       getLocationByHex,
    isLocationUnlocked:     isLocationUnlocked,
    getLocationsByType:     getLocationsByType,
    getLocationsByPhase:    getLocationsByPhase,
    getTotalEncounters:     getTotalEncounters,
    isDungeon:              isDungeon,
    getHexDistance:          getHexDistance
  });

})(typeof window !== 'undefined' ? window : this);
