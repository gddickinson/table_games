/**
 * campaign-events.js — Non-combat encounter events: traps, puzzles, environmental challenges.
 * Exports under window.MJ.Dragon.Campaign.Events (IIFE module).
 * Dependencies (lazy): MJ.Dragon.Rules
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  /* ==================================================================
   *  Trap definitions
   * ================================================================== */

  var TRAPS = {
    dart_trap: {
      name: 'Dart Trap',
      description: 'Tiny holes line the walls of this narrow corridor.',
      check: { ability: 'dex', dc: 14 },
      damage: '2d6',
      damageType: 'piercing',
      detect: { ability: 'int', dc: 12 },
      disarm: { ability: 'dex', dc: 14 },
      narrative: {
        trigger: 'Darts shoot from the walls!',
        save: ' dodges the volley!',
        fail: ' is struck by poisoned darts!',
        detect: ' notices tiny holes in the walls — a trap!',
        disarm: ' carefully disarms the dart mechanism.'
      }
    },
    pit_trap: {
      name: 'Pit Trap',
      description: 'The floor here looks slightly different...',
      check: { ability: 'dex', dc: 13 },
      damage: '3d6',
      damageType: 'bludgeoning',
      detect: { ability: 'wis', dc: 14 },
      disarm: { ability: 'str', dc: 15 },
      narrative: {
        trigger: 'The floor gives way beneath your feet!',
        save: ' leaps clear of the crumbling floor!',
        fail: ' plummets into a 30-foot pit!',
        detect: ' spots the concealed pit — careful!',
        disarm: ' jams the mechanism with a piton.'
      }
    },
    flame_jet: {
      name: 'Flame Jet',
      description: 'Scorch marks cover the walls ahead.',
      check: { ability: 'dex', dc: 15 },
      damage: '4d6',
      damageType: 'fire',
      detect: { ability: 'int', dc: 13 },
      disarm: { ability: 'dex', dc: 16 },
      narrative: {
        trigger: 'Jets of flame erupt from the walls!',
        save: ' ducks beneath the flames!',
        fail: ' is engulfed in fire!',
        detect: ' notices oil residue on the floor — flame trap!',
        disarm: ' plugs the flame nozzles with wet cloth.'
      }
    },
    poison_gas: {
      name: 'Poison Gas',
      description: 'A faint green mist seeps from cracks in the floor.',
      check: { ability: 'con', dc: 14 },
      damage: '3d8',
      damageType: 'poison',
      detect: { ability: 'wis', dc: 11 },
      disarm: null,
      narrative: {
        trigger: 'Poison gas floods the chamber!',
        save: ' holds their breath and pushes through!',
        fail: ' chokes on the toxic fumes!',
        detect: ' smells something foul — hold your breath!',
        disarm: null
      }
    },
    arcane_glyph: {
      name: 'Arcane Glyph',
      description: 'A glowing rune is inscribed on the floor.',
      check: { ability: 'int', dc: 16 },
      damage: '5d6',
      damageType: 'force',
      detect: { ability: 'int', dc: 14 },
      disarm: { ability: 'int', dc: 17 },
      narrative: {
        trigger: 'The glyph erupts with arcane energy!',
        save: ' resists the magical blast!',
        fail: ' is hurled back by the explosion!',
        detect: ' recognizes the glyph — don\'t step on it!',
        disarm: ' carefully inscribes a counter-rune.'
      }
    }
  };

  /* ==================================================================
   *  Puzzle definitions
   * ================================================================== */

  var PUZZLES = {
    rune_sequence: {
      name: 'Rune Sequence',
      location: 'wizards_crypt',
      description: 'Four pedestals stand before a sealed door. Each bears a different rune: ' +
        'Fire \uD83D\uDD25, Ice \u2744, Lightning \u26A1, Earth \uD83C\uDF0D. ' +
        'The door inscription reads: "First warmth, then cold, then fury, then stillness."',
      solution: ['fire', 'ice', 'lightning', 'earth'],
      hints: [
        'The inscription gives the order.',
        'Warmth = Fire, Cold = Ice, Fury = Lightning, Stillness = Earth.'
      ],
      reward: { xp: 200, item: 'scroll_fireball' },
      failure_damage: '3d6',
      failure_narrative: 'The runes flash angrily — arcane energy lashes out!'
    },
    lever_puzzle: {
      name: 'Lever Puzzle',
      location: 'haunted_castle',
      description: 'Three levers protrude from the wall: Gold \u2694, Silver \uD83E\uDE99, ' +
        'Bronze \uD83E\uDD49. A plaque reads: "The worthy metal opens the way. ' +
        'The base metal seals your fate."',
      solution: ['gold'],
      hints: [
        'Gold is the worthy metal.',
        'Pull only the gold lever.'
      ],
      reward: { xp: 150, item: 'potion_greater_healing' },
      failure_damage: '2d8',
      failure_narrative: 'The wrong lever triggers a blade trap!'
    },
    riddle_door: {
      name: 'The Sphinx\'s Riddle',
      location: 'wizards_crypt',
      description: 'A stone face speaks: "I have cities, but no houses. ' +
        'I have mountains, but no trees. I have water, but no fish. What am I?"',
      solution: ['map', 'a map'],
      hints: [
        'Think about representations of the world.',
        'What shows cities and mountains without containing them?'
      ],
      reward: { xp: 300, item: 'staff_of_power' },
      failure_damage: '4d6',
      failure_narrative: 'The stone face roars in displeasure!'
    },
    pressure_plates: {
      name: 'Pressure Plate Path',
      location: 'haunted_castle',
      description: 'The floor is a grid of stone plates. Some glow faintly. ' +
        'A skeleton lies crushed on one of the dark plates. ' +
        'The glowing path seems to zig-zag across the room.',
      solution: ['glow'],
      hints: [
        'The glowing plates are safe.',
        'The dark plates are deadly.'
      ],
      reward: { xp: 100 },
      failure_damage: '2d10',
      failure_narrative: 'A massive stone block drops from the ceiling!'
    }
  };

  /* ==================================================================
   *  Location event assignments
   * ================================================================== */

  var LOCATION_EVENTS = {
    haunted_castle: {
      traps: ['dart_trap', 'pit_trap'],
      puzzles: ['lever_puzzle', 'pressure_plates'],
      trapChance: 0.4
    },
    wizards_crypt: {
      traps: ['arcane_glyph', 'flame_jet', 'poison_gas'],
      puzzles: ['rune_sequence', 'riddle_door'],
      trapChance: 0.5
    },
    orc_camp: {
      traps: ['pit_trap'],
      puzzles: [],
      trapChance: 0.2
    },
    dragon_lair: {
      traps: ['flame_jet'],
      puzzles: [],
      trapChance: 0.3
    }
  };

  /* ==================================================================
   *  Trap resolution
   * ================================================================== */

  /**
   * Resolve a trap encounter against a party.
   * @param {string} trapId - Key into TRAPS
   * @param {Array} party   - Array of character objects (need .stats, .name, .id)
   * @returns {Object|null} results
   */
  function resolveTrap(trapId, party) {
    var trap = TRAPS[trapId];
    if (!trap) return null;
    var Rules = root.MJ.Dragon.Rules;
    var results = {
      trap: trap,
      detected: false,
      disarmed: false,
      triggered: true,
      victims: []
    };

    /* --- Detection check (best ability modifier in party) --- */
    var bestDetector = null;
    var bestMod = -10;
    for (var i = 0; i < party.length; i++) {
      var stats = party[i].stats || {};
      var mod = Math.floor(((stats[trap.detect.ability] || 10) - 10) / 2);
      if (mod > bestMod) {
        bestMod = mod;
        bestDetector = party[i];
      }
    }

    if (bestDetector && Rules) {
      var detectRoll = Rules.rollD20() + bestMod;
      if (detectRoll >= trap.detect.dc) {
        results.detected = true;
        results.detector = bestDetector.name;

        /* --- Disarm attempt (if possible) --- */
        if (trap.disarm) {
          var disarmer = null;
          for (var d = 0; d < party.length; d++) {
            if (party[d].id === 'riku') { disarmer = party[d]; break; }
          }
          disarmer = disarmer || bestDetector;
          var dexMod = Math.floor(((disarmer.stats && disarmer.stats.dex || 10) - 10) / 2);
          var disarmRoll = Rules.rollD20() + dexMod;
          if (disarmRoll >= trap.disarm.dc) {
            results.disarmed = true;
            results.disarmer = disarmer.name;
            results.triggered = false;
          }
        }
      }
    }

    /* --- Apply damage if triggered --- */
    if (results.triggered && Rules) {
      var dmg = Rules.rollDice(trap.damage);
      for (var j = 0; j < party.length; j++) {
        var save = Rules.makeSave(party[j], trap.check.ability, trap.check.dc);
        var taken = save.success ? Math.floor(dmg.total / 2) : dmg.total;
        Rules.applyDamage(party[j], taken);
        results.victims.push({
          name: party[j].name,
          damage: taken,
          saved: save.success
        });
      }
    }

    return results;
  }

  /* ==================================================================
   *  Puzzle helpers
   * ================================================================== */

  /**
   * Retrieve a puzzle definition by id.
   * @param {string} puzzleId
   * @returns {Object|null}
   */
  function getPuzzle(puzzleId) {
    return PUZZLES[puzzleId] || null;
  }

  /**
   * Check a player's answer against the puzzle solution.
   * @param {string} puzzleId
   * @param {string} answer
   * @returns {boolean}
   */
  function checkPuzzleAnswer(puzzleId, answer) {
    var puzzle = PUZZLES[puzzleId];
    if (!puzzle) return false;
    var norm = (answer || '').toLowerCase().trim();
    for (var i = 0; i < puzzle.solution.length; i++) {
      if (norm === puzzle.solution[i].toLowerCase()) return true;
    }
    return false;
  }

  /* ==================================================================
   *  Location queries
   * ================================================================== */

  /**
   * Get trap/puzzle config for a location.
   * @param {string} locationId
   * @returns {Object}
   */
  function getLocationEvents(locationId) {
    return LOCATION_EVENTS[locationId] || { traps: [], puzzles: [], trapChance: 0 };
  }

  /**
   * Roll to see if a trap triggers at a location.
   * @param {string} locationId
   * @returns {string|null} trapId or null
   */
  function rollForTrap(locationId) {
    var events = LOCATION_EVENTS[locationId];
    if (!events || !events.traps.length || Math.random() > events.trapChance) return null;
    return events.traps[Math.floor(Math.random() * events.traps.length)];
  }

  /**
   * Pick a random puzzle for a location.
   * @param {string} locationId
   * @returns {string|null} puzzleId or null
   */
  function getLocationPuzzle(locationId) {
    var events = LOCATION_EVENTS[locationId];
    if (!events || !events.puzzles.length) return null;
    return events.puzzles[Math.floor(Math.random() * events.puzzles.length)];
  }

  /* ==================================================================
   *  Narrative builder helpers
   * ================================================================== */

  /**
   * Build a narrative string from trap results.
   * @param {Object} results - Output of resolveTrap()
   * @returns {string}
   */
  function buildTrapNarrative(results) {
    if (!results || !results.trap) return '';
    var trap = results.trap;
    var lines = [];

    if (results.detected) {
      lines.push(results.detector + (trap.narrative.detect || ' spots the trap!'));
      if (results.disarmed) {
        lines.push((results.disarmer || results.detector) + (trap.narrative.disarm || ' disarms it!'));
      } else if (trap.disarm) {
        lines.push('The disarm attempt fails!');
      }
    }

    if (results.triggered) {
      lines.push(trap.narrative.trigger);
      for (var i = 0; i < results.victims.length; i++) {
        var v = results.victims[i];
        if (v.saved) {
          lines.push(v.name + (trap.narrative.save || ' avoids the worst!') +
            ' (' + v.damage + ' ' + (trap.damageType || '') + ')');
        } else {
          lines.push(v.name + (trap.narrative.fail || ' is hit!') +
            ' (' + v.damage + ' ' + (trap.damageType || '') + ')');
        }
      }
    } else {
      lines.push('The trap is neutralized!');
    }

    return lines.join(' ');
  }

  /**
   * Build a hint string for a puzzle (progressive hints).
   * @param {string} puzzleId
   * @param {number} hintIndex - Which hint to reveal (0-based)
   * @returns {string}
   */
  function getPuzzleHint(puzzleId, hintIndex) {
    var puzzle = PUZZLES[puzzleId];
    if (!puzzle || !puzzle.hints) return '';
    var idx = Math.min(hintIndex || 0, puzzle.hints.length - 1);
    return puzzle.hints[idx] || '';
  }

  /**
   * Apply puzzle failure damage to a party.
   * @param {string} puzzleId
   * @param {Array} party
   * @returns {Object} { narrative, victims }
   */
  function applyPuzzleFailure(puzzleId, party) {
    var puzzle = PUZZLES[puzzleId];
    if (!puzzle) return { narrative: '', victims: [] };
    var Rules = root.MJ.Dragon.Rules;
    var victims = [];

    if (puzzle.failure_damage && Rules) {
      var dmg = Rules.rollDice(puzzle.failure_damage);
      for (var i = 0; i < party.length; i++) {
        Rules.applyDamage(party[i], dmg.total);
        victims.push({ name: party[i].name, damage: dmg.total });
      }
    }

    return {
      narrative: puzzle.failure_narrative || 'The puzzle punishes your failure!',
      victims: victims
    };
  }

  /**
   * Apply puzzle success rewards.
   * @param {string} puzzleId
   * @returns {Object} reward data { xp, item }
   */
  function applyPuzzleSuccess(puzzleId) {
    var puzzle = PUZZLES[puzzleId];
    if (!puzzle || !puzzle.reward) return { xp: 0, item: null };
    return {
      xp: puzzle.reward.xp || 0,
      item: puzzle.reward.item || null
    };
  }

  /* ==================================================================
   *  Freeze & export
   * ================================================================== */

  root.MJ.Dragon.Campaign.Events = Object.freeze({
    TRAPS: TRAPS,
    PUZZLES: PUZZLES,
    LOCATION_EVENTS: LOCATION_EVENTS,
    resolveTrap: resolveTrap,
    getPuzzle: getPuzzle,
    checkPuzzleAnswer: checkPuzzleAnswer,
    getLocationEvents: getLocationEvents,
    rollForTrap: rollForTrap,
    getLocationPuzzle: getLocationPuzzle,
    buildTrapNarrative: buildTrapNarrative,
    getPuzzleHint: getPuzzleHint,
    applyPuzzleFailure: applyPuzzleFailure,
    applyPuzzleSuccess: applyPuzzleSuccess
  });

  console.log('[Campaign] Events module loaded');
})(typeof window !== 'undefined' ? window : global);
