/**
 * campaign-progression.js — D&D 5e level-up system for characters levels 5-10.
 * Exports under window.MJ.Dragon.Campaign.Progression (IIFE module).
 * Dependencies (lazy): MJ.Dragon.Characters
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

  /* ---------- XP table ---------- */

  var XP_TABLE = Object.freeze({
    5: 0,
    6: 6500,
    7: 14000,
    8: 23000,
    9: 34000,
    10: 48000
  });

  /* ---------- Hit dice per class ---------- */

  var HIT_DICE = Object.freeze({
    barbarian: 12,
    cleric:    8,
    wizard:    6,
    rogue:     8,
    paladin:   10,
    ranger:    10
  });

  /* ---------- CON modifiers per character (at base level 5) ---------- */

  var CON_MODS = Object.freeze({
    kenji:  3,   /* CON 16 */
    mei:    2,   /* CON 14 */
    yuki:   1,   /* CON 12 */
    riku:   2,   /* CON 14 */
    tomoe:  2,   /* CON 14 */
    sora:   1    /* CON 12 */
  });

  /* ---------- ASI stat map (which stat improves at ASI levels) ---------- */

  var ASI_STAT = Object.freeze({
    barbarian: 'str',
    cleric:    'wis',
    wizard:    'int',
    rogue:     'dex',
    paladin:   'cha',
    ranger:    'dex'
  });

  /* ---------- Spell slot tables per caster level ---------- */

  var SPELL_SLOTS = Object.freeze({
    cleric: {
      5:  { 1: 4, 2: 3, 3: 2 },
      6:  { 1: 4, 2: 3, 3: 3 },
      7:  { 1: 4, 2: 3, 3: 3, 4: 1 },
      8:  { 1: 4, 2: 3, 3: 3, 4: 2 },
      9:  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
      10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }
    },
    wizard: {
      5:  { 1: 4, 2: 3, 3: 2 },
      6:  { 1: 4, 2: 3, 3: 3 },
      7:  { 1: 4, 2: 3, 3: 3, 4: 1 },
      8:  { 1: 4, 2: 3, 3: 3, 4: 2 },
      9:  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
      10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }
    },
    paladin: {
      5:  { 1: 4, 2: 2 },
      6:  { 1: 4, 2: 2 },
      7:  { 1: 4, 2: 3 },
      8:  { 1: 4, 2: 3 },
      9:  { 1: 4, 2: 3, 3: 2 },
      10: { 1: 4, 2: 3, 3: 2 }
    },
    ranger: {
      5:  { 1: 4, 2: 2 },
      6:  { 1: 4, 2: 2 },
      7:  { 1: 4, 2: 3 },
      8:  { 1: 4, 2: 3 },
      9:  { 1: 4, 2: 3, 3: 2 },
      10: { 1: 4, 2: 3, 3: 2 }
    }
  });

  /* ---------- Class features by level ---------- */

  var CLASS_FEATURES = Object.freeze({
    barbarian: {
      6:  [{ name: 'Mindless Rage', description: 'Cannot be charmed or frightened while raging. Existing effects are suspended for the duration.' }],
      7:  [{ name: 'Feral Instinct', description: 'Advantage on initiative rolls. Can act normally on first turn even if surprised, as long as you rage.' }],
      8:  [{ name: 'Ability Score Improvement', description: '+2 STR (STR increases to 20)', stat: 'str', bonus: 2 }],
      9:  [{ name: 'Brutal Critical', description: 'Roll one additional weapon damage die on a critical hit with a melee attack.' }],
      10: [{ name: 'Intimidating Presence', description: 'Use action to frighten someone within 30 feet. DC 8 + proficiency + CHA mod.' }]
    },
    cleric: {
      6:  [{ name: 'Channel Divinity x2', description: 'Can now use Channel Divinity twice between rests.' }],
      7:  [{ name: 'Destroy Undead', description: 'When Turn Undead succeeds, undead of CR 1 or lower are instantly destroyed.' }],
      8:  [{ name: 'Ability Score Improvement', description: '+2 WIS (WIS increases to 20)', stat: 'wis', bonus: 2 },
           { name: 'Divine Strike', description: 'Once per turn, deal extra 1d8 radiant damage with weapon attacks.' }],
      9:  [{ name: '5th Level Spells', description: 'Access to 5th level spell slots. New spells: Flame Strike, Mass Cure Wounds.' }],
      10: [{ name: 'Divine Intervention', description: 'Call upon deity for aid. Percentage chance equal to cleric level.' }]
    },
    wizard: {
      6:  [{ name: 'Arcane Tradition Feature', description: 'Gain a feature from your chosen Arcane Tradition (Evocation: Potent Cantrip).' }],
      7:  [{ name: '4th Level Spells', description: 'Access to 4th level spell slots. New spells: Greater Invisibility, Ice Storm.' }],
      8:  [{ name: 'Ability Score Improvement', description: '+2 INT (INT increases to 20)', stat: 'int', bonus: 2 }],
      9:  [{ name: '5th Level Spells', description: 'Access to 5th level spell slots. New spells: Cone of Cold, Wall of Force.' }],
      10: [{ name: '5th Level Spells x2', description: 'Gain a second 5th level spell slot.' }]
    },
    rogue: {
      6:  [{ name: 'Expertise', description: 'Double proficiency bonus for two more skill proficiencies (Perception, Investigation).' }],
      7:  [{ name: 'Evasion', description: 'On a successful DEX save against an area effect, take no damage instead of half. (Already acquired)' }],
      8:  [{ name: 'Ability Score Improvement', description: '+2 DEX (DEX increases to 20)', stat: 'dex', bonus: 2 }],
      9:  [{ name: 'Sneak Attack 5d6', description: 'Sneak Attack damage increases to 5d6.' }],
      10: [{ name: 'Ability Score Improvement', description: '+2 CON (CON increases to 16)', stat: 'con', bonus: 2 }]
    },
    paladin: {
      6:  [{ name: 'Aura of Protection', description: 'You and allies within 10 feet add CHA modifier to saving throws. (Already acquired)' }],
      7:  [],
      8:  [{ name: 'Ability Score Improvement', description: '+2 CHA (CHA increases to 16)', stat: 'cha', bonus: 2 }],
      9:  [{ name: '3rd Level Spell Slots x2', description: 'Gain two 3rd level spell slots. New spells: Revivify, Blinding Smite.' }],
      10: [{ name: 'Aura of Courage', description: 'You and allies within 10 feet cannot be frightened while you are conscious.' }]
    },
    ranger: {
      6:  [{ name: 'Favored Enemy Improvement', description: 'Choose an additional favored enemy type. Gain advantage on tracking and recalling information about them.' }],
      7:  [],
      8:  [{ name: 'Ability Score Improvement', description: '+2 DEX (DEX increases to 18)', stat: 'dex', bonus: 2 }],
      9:  [{ name: '3rd Level Spell Slots x2', description: 'Gain two 3rd level spell slots. New spells: Conjure Animals, Lightning Arrow.' }],
      10: [{ name: 'Hide in Plain Sight', description: 'Spend 1 minute camouflaging yourself. Gain +10 bonus to Stealth checks while stationary.' }]
    }
  });

  /* ---------- Public API ---------- */

  /**
   * getHPGain — roll class hit die + CON modifier for a level-up HP gain.
   * @param {string} className - lowercase class name
   * @param {number} conMod - CON modifier
   * @returns {number} HP gained (minimum 1)
   */
  function getHPGain(className, conMod) {
    var die = HIT_DICE[className.toLowerCase()];
    if (!die) { return 1; }
    var roll = rollDie(die);
    var gain = roll + (conMod || 0);
    return Math.max(1, gain);
  }

  /**
   * getNewFeatures — return array of features unlocked at a given level.
   * @param {string} className - lowercase class name
   * @param {number} level - the new level (6-10)
   * @returns {Array} array of { name, description, stat?, bonus? }
   */
  function getNewFeatures(className, level) {
    var classData = CLASS_FEATURES[className.toLowerCase()];
    if (!classData || !classData[level]) { return []; }
    return clone(classData[level]);
  }

  /**
   * getSpellSlots — return spell slot table for a class at a given level.
   * @param {string} className - lowercase class name
   * @param {number} level - character level (5-10)
   * @returns {Object|null} slot table like { 1: 4, 2: 3, 3: 2 } or null for non-casters
   */
  function getSpellSlots(className, level) {
    var table = SPELL_SLOTS[className.toLowerCase()];
    if (!table) { return null; }
    var slots = table[level];
    return slots ? clone(slots) : null;
  }

  /**
   * getProficiencyBonus — return proficiency bonus for a given level.
   * @param {number} level - character level
   * @returns {number} proficiency bonus (+3 at 5-8, +4 at 9+)
   */
  function getProficiencyBonus(level) {
    if (level >= 9) { return 4; }
    return 3;
  }

  /**
   * applyLevelUp — mutate a character state object with new level gains.
   * @param {Object} characterState - mutable character state { id, hp, maxHp, spellSlots, ... }
   * @param {string} className - lowercase class name
   * @returns {Object} summary of changes applied
   */
  function applyLevelUp(characterState, className) {
    var cn = className.toLowerCase();
    var charId = characterState.id;
    var conMod = CON_MODS[charId] || 0;

    /* determine new level from campaign state context */
    var oldMaxHp = characterState.maxHp;
    var hpGain = getHPGain(cn, conMod);

    characterState.maxHp += hpGain;
    characterState.hp += hpGain;

    /* get new spell slots */
    var newLevel = (characterState.level || 5) + 1;
    characterState.level = newLevel;

    var newSlots = getSpellSlots(cn, newLevel);
    if (newSlots) {
      characterState.spellSlots = clone(newSlots);
      characterState.maxSpellSlots = clone(newSlots);
    }

    /* get features */
    var features = getNewFeatures(cn, newLevel);

    /* apply ASI stat bonuses */
    for (var i = 0; i < features.length; i++) {
      if (features[i].stat && features[i].bonus) {
        if (!characterState.statBonuses) {
          characterState.statBonuses = {};
        }
        var stat = features[i].stat;
        characterState.statBonuses[stat] = (characterState.statBonuses[stat] || 0) + features[i].bonus;
      }
    }

    /* update proficiency bonus */
    characterState.proficiencyBonus = getProficiencyBonus(newLevel);

    /* track gained features */
    if (!characterState.gainedFeatures) {
      characterState.gainedFeatures = [];
    }
    for (var j = 0; j < features.length; j++) {
      characterState.gainedFeatures.push({
        level: newLevel,
        name: features[j].name
      });
    }

    var summary = {
      newLevel: newLevel,
      hpGain: hpGain,
      newMaxHp: characterState.maxHp,
      features: features,
      spellSlots: newSlots,
      proficiencyBonus: getProficiencyBonus(newLevel)
    };

    return summary;
  }

  /**
   * getLevelUpSummary — human-readable description of what changes at a given level.
   * @param {string} className - lowercase class name
   * @param {number} newLevel - the level being gained (6-10)
   * @returns {string} multi-line summary text
   */
  function getLevelUpSummary(className, newLevel) {
    var cn = className.toLowerCase();
    var die = HIT_DICE[cn] || 8;
    var features = getNewFeatures(cn, newLevel);
    var profBonus = getProficiencyBonus(newLevel);
    var slots = getSpellSlots(cn, newLevel);

    var lines = [];
    lines.push('=== Level ' + newLevel + ' ' + cn.charAt(0).toUpperCase() + cn.slice(1) + ' ===');
    lines.push('');
    lines.push('HP: +1d' + die + ' + CON modifier');
    lines.push('Proficiency Bonus: +' + profBonus);

    if (features.length > 0) {
      lines.push('');
      lines.push('New Features:');
      for (var i = 0; i < features.length; i++) {
        lines.push('  - ' + features[i].name + ': ' + features[i].description);
      }
    } else {
      lines.push('');
      lines.push('No new class features at this level.');
    }

    if (slots) {
      lines.push('');
      lines.push('Spell Slots:');
      var slotLevels = Object.keys(slots).sort();
      for (var s = 0; s < slotLevels.length; s++) {
        var lv = slotLevels[s];
        lines.push('  Level ' + lv + ': ' + slots[lv] + ' slot(s)');
      }
    }

    lines.push('');
    var nextLevel = newLevel + 1;
    if (nextLevel <= 10) {
      var nextXP = XP_TABLE[nextLevel];
      lines.push('Next level at ' + nextXP.toLocaleString() + ' XP.');
    } else {
      lines.push('Maximum campaign level reached!');
    }

    return lines.join('\n');
  }

  /**
   * getXPForLevel — return XP threshold required for a given level.
   * @param {number} level
   * @returns {number}
   */
  function getXPForLevel(level) {
    return XP_TABLE[level] || 0;
  }

  /**
   * getXPToNextLevel — return XP remaining to next level.
   * @param {number} currentXP
   * @param {number} currentLevel
   * @returns {number|null} null if at max level
   */
  function getXPToNextLevel(currentXP, currentLevel) {
    var nextLevel = currentLevel + 1;
    if (nextLevel > 10) { return null; }
    var threshold = XP_TABLE[nextLevel];
    return Math.max(0, threshold - currentXP);
  }

  /* ---------- Export ---------- */

  root.MJ.Dragon.Campaign.Progression = Object.freeze({
    XP_TABLE: XP_TABLE,
    HIT_DICE: HIT_DICE,
    CLASS_FEATURES: CLASS_FEATURES,
    SPELL_SLOTS: SPELL_SLOTS,

    getHPGain: getHPGain,
    getNewFeatures: getNewFeatures,
    getSpellSlots: getSpellSlots,
    getProficiencyBonus: getProficiencyBonus,
    applyLevelUp: applyLevelUp,
    getLevelUpSummary: getLevelUpSummary,
    getXPForLevel: getXPForLevel,
    getXPToNextLevel: getXPToNextLevel
  });

})(typeof window !== 'undefined' ? window : this);
