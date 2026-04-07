/**
 * dragon-rules.js - D&D 5e-lite combat rules engine for dragon battle game.
 * Exports under window.MJ.Dragon.Rules (IIFE module).
 */
(function(exports) {
  'use strict';

  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};

  // -- 1. Dice System --------------------------------------------------------

  function rollD20() {
    return Math.floor(Math.random() * 20) + 1;
  }

  function rollD(sides) {
    if (sides < 1) { return 0; }
    return Math.floor(Math.random() * sides) + 1;
  }

  /** Parse and roll a dice expression like "2d6+3". Returns { total, rolls, modifier }. */
  function rollDice(expr) {
    var cleaned = String(expr).replace(/\s+/g, '').toLowerCase();
    var match = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) { throw new Error('Invalid dice expression: ' + expr); }
    var count = parseInt(match[1], 10);
    var sides = parseInt(match[2], 10);
    var mod   = match[3] ? parseInt(match[3], 10) : 0;
    var rolls = [], sum = 0;
    for (var i = 0; i < count; i++) { rolls.push(rollD(sides)); }
    for (var j = 0; j < rolls.length; j++) { sum += rolls[j]; }
    return { total: sum + mod, rolls: rolls, modifier: mod };
  }

  function rollAdvantage() {
    var a = rollD20(), b = rollD20();
    return { result: Math.max(a, b), rolls: [a, b] };
  }

  function rollDisadvantage() {
    var a = rollD20(), b = rollD20();
    return { result: Math.min(a, b), rolls: [a, b] };
  }

  // -- 2. Ability Score Modifiers --------------------------------------------

  function getModifier(score) {
    return Math.floor((score - 10) / 2);
  }

  // -- 5. Damage Types Enum --------------------------------------------------

  var DamageType = Object.freeze({
    SLASHING: 'slashing', PIERCING: 'piercing', BLUDGEONING: 'bludgeoning',
    FIRE: 'fire', COLD: 'cold', LIGHTNING: 'lightning', POISON: 'poison',
    RADIANT: 'radiant', NECROTIC: 'necrotic', FORCE: 'force'
  });

  // -- 6. Status Effects Enum ------------------------------------------------

  var StatusEffect = Object.freeze({
    POISONED: 'poisoned', FRIGHTENED: 'frightened', PRONE: 'prone',
    STUNNED: 'stunned', GRAPPLED: 'grappled', CONCENTRATING: 'concentrating'
  });

  // -- 7. Apply / Remove Status Effects --------------------------------------

  function applyStatus(creature, effect) {
    // Use conditions array (engine format) or statusEffects
    var arr = creature.conditions || creature.statusEffects;
    if (!arr) { creature.conditions = []; arr = creature.conditions; }
    if (Array.isArray(arr)) { if (arr.indexOf(effect) === -1) arr.push(effect); }
    else if (typeof arr === 'object') { arr[effect] = true; }
  }

  function removeStatus(creature, effect) {
    var arr = creature.conditions || creature.statusEffects;
    if (!arr) return;
    if (Array.isArray(arr)) { var idx = arr.indexOf(effect); if (idx !== -1) arr.splice(idx, 1); }
    else if (typeof arr === 'object') { delete arr[effect]; }
  }

  function hasStatus(creature, effect) {
    if (!creature.statusEffects && !creature.conditions) { return false; }
    // Support array (conditions) or object (statusEffects) format
    var arr = creature.conditions || creature.statusEffects;
    if (Array.isArray(arr)) return arr.indexOf(effect) !== -1;
    if (typeof arr === 'object') return !!arr[effect];
    return false;
  }

  // -- 3. Attack Resolution --------------------------------------------------

  /**
   * Determine advantage/disadvantage based on status effects.
   * Returns 'advantage', 'disadvantage', or 'normal'.
   */
  function getAttackRollMode(attacker, target, weapon) {
    var adv = false, dadv = false;

    // Hidden attacker gets advantage (unseen attacker rule)
    if (hasStatus(attacker, 'hidden') || attacker.hidden) { adv = true; }

    if (hasStatus(attacker, StatusEffect.POISONED))  { dadv = true; }
    if (hasStatus(attacker, StatusEffect.FRIGHTENED)) { dadv = true; }
    if (hasStatus(attacker, StatusEffect.PRONE))      { dadv = true; }

    if (hasStatus(target, StatusEffect.PRONE)) {
      if (!weapon || !weapon.ranged) { adv = true; } else { dadv = true; }
    }
    if (hasStatus(target, StatusEffect.STUNNED)) { adv = true; }

    // Reckless attack grants advantage on STR-based melee attacks
    if (attacker.recklessThisTurn && weapon && !weapon.ranged) { adv = true; }

    if (adv && dadv) { return 'normal'; }
    if (adv)  { return 'advantage'; }
    if (dadv) { return 'disadvantage'; }
    return 'normal';
  }

  /**
   * Resolve an attack roll.
   * attacker: { attackBonus, statusEffects }
   * target:   { ac, statusEffects }
   * weapon:   { damage: "2d6+3", type: DamageType.*, ranged: bool, bonus: num }
   * Returns { hit, crit, miss, natural, attackRoll, damage, type, rolls }.
   */
  function resolveAttack(attacker, target, weapon) {
    // Use weapon.toHit as total bonus if available (e.g. dragon attacks include full modifier),
    // otherwise sum attacker.attackBonus + weapon.bonus (for party members)
    var bonus = weapon.toHit != null ? weapon.toHit
              : (attacker.attackBonus || 0) + (weapon.bonus || 0);
    var mode = getAttackRollMode(attacker, target, weapon);
    var natural, rolls;

    if (mode === 'advantage') {
      var advR = rollAdvantage();
      natural = advR.result; rolls = advR.rolls;
    } else if (mode === 'disadvantage') {
      var dadR = rollDisadvantage();
      natural = dadR.result; rolls = dadR.rolls;
    } else {
      natural = rollD20(); rolls = [natural];
    }

    var isCrit = (natural === 20);
    var missResult = {
      hit: false, crit: false, miss: true, natural: natural,
      attackRoll: natural + bonus, damage: 0,
      type: weapon.type || null, rolls: rolls
    };

    // Natural 1 = auto-miss
    if (natural === 1) { return missResult; }

    var totalRoll = natural + bonus;
    var hit = isCrit || totalRoll >= (target.ac || 10);
    if (!hit) { missResult.attackRoll = totalRoll; return missResult; }

    // Calculate damage
    var dmgExpr = weapon.damage || '1d4';
    var dmgResult = rollDice(dmgExpr);
    var totalDamage = dmgResult.total;

    // On crit, roll extra dice (double dice, not modifier)
    if (isCrit) {
      var parsed = String(dmgExpr).replace(/\s+/g, '').toLowerCase()
                                  .match(/^(\d+)d(\d+)([+-]\d+)?$/);
      if (parsed) {
        var critExtra = 0;
        for (var c = 0; c < parseInt(parsed[1], 10); c++) {
          critExtra += rollD(parseInt(parsed[2], 10));
        }
        totalDamage = dmgResult.total + critExtra;
      }
    }
    if (totalDamage < 0) { totalDamage = 0; }

    return {
      hit: true, crit: isCrit, miss: false, natural: natural,
      attackRoll: totalRoll, damage: totalDamage,
      type: weapon.type || null, rolls: rolls
    };
  }

  // -- 4. Saving Throws ------------------------------------------------------

  /**
   * Make a saving throw.
   * creature: { abilities: {str,dex,con,int,wis,cha}, saveProficiencies, profBonus, statusEffects }
   * Returns { success, roll, total, natural, autoFail }.
   */
  function makeSave(creature, ability, DC) {
    // Support both 'stats' (character instances) and 'abilities' (legacy) for ability scores
    var scores = creature.stats || creature.abilityScores || {};
    // If 'abilities' is an object with numeric values (not class abilities), use it
    if (!creature.stats && creature.abilities && typeof creature.abilities[ability] === 'number') {
      scores = creature.abilities;
    }
    var score = scores[ability] || 10;
    var mod = getModifier(score);
    var prof = 0;
    // Support both 'saveProficiencies' and 'savingThrows' field names
    var saveProfs = creature.saveProficiencies || creature.savingThrows;
    if (saveProfs && saveProfs.indexOf(ability) !== -1) {
      prof = creature.profBonus || creature.proficiencyBonus || 2;
    }

    // Stunned creatures auto-fail STR and DEX saves
    if (hasStatus(creature, StatusEffect.STUNNED) &&
        (ability === 'str' || ability === 'dex')) {
      return { success: false, roll: 0, total: 0, natural: 0, autoFail: true };
    }

    var natural = rollD20();
    var total = natural + mod + prof;
    return { success: total >= DC, roll: natural, total: total, natural: natural, autoFail: false };
  }

  // -- 8. Spell Slot Tracking ------------------------------------------------

  var DEFAULT_SLOTS = { 1: 4, 2: 3, 3: 2 };

  function createSlotTracker(slots) {
    var max = {}, current = {};
    var src = slots || DEFAULT_SLOTS;
    for (var lvl in src) {
      if (src.hasOwnProperty(lvl)) {
        var key = parseInt(lvl, 10);
        max[key] = src[lvl];
        current[key] = src[lvl];
      }
    }
    return {
      use: function(level) {
        var k = parseInt(level, 10);
        if (!current.hasOwnProperty(k) || current[k] <= 0) { return false; }
        current[k]--; return true;
      },
      available: function(level) {
        var k = parseInt(level, 10);
        return current.hasOwnProperty(k) ? current[k] : 0;
      },
      reset: function() {
        for (var k in max) {
          if (max.hasOwnProperty(k)) { current[k] = max[k]; }
        }
      },
      snapshot: function() {
        var out = {};
        for (var k in max) {
          if (max.hasOwnProperty(k)) { out[k] = { current: current[k], max: max[k] }; }
        }
        return out;
      }
    };
  }

  // -- 9. Movement on Grid ---------------------------------------------------

  /** Chebyshev distance between two {x,y} positions. */
  function getDistance(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  function isAdjacent(a, b) {
    return getDistance(a, b) === 1;
  }

  var TERRAIN_COST = { normal: 1, difficult: 2, water: 2, lava: 3, ice: 1.5 };

  function getMovementCost(terrain) {
    return TERRAIN_COST.hasOwnProperty(terrain) ? TERRAIN_COST[terrain] : 1;
  }

  // -- 10. Breath Weapon Cone ------------------------------------------------

  function normalizeDirection(dir) {
    var mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
    if (mag === 0) { return { x: 0, y: 0 }; }
    return { x: Math.round(dir.x / mag), y: Math.round(dir.y / mag) };
  }

  /**
   * Get grid positions within a cone (90-degree arc, matching 5e grid rules).
   * origin/direction are {x,y}; length is range in squares; allPositions is [{x,y}].
   */
  function getConeTargets(origin, direction, length, allPositions) {
    var dir = normalizeDirection(direction);
    if (dir.x === 0 && dir.y === 0) { return []; }
    var results = [];
    for (var i = 0; i < allPositions.length; i++) {
      var pos = allPositions[i];
      var dx = pos.x - origin.x, dy = pos.y - origin.y;
      if (dx === 0 && dy === 0) { continue; }
      var dist = getDistance(origin, pos);
      if (dist > length || dist === 0) { continue; }
      // Angle check via dot product: cos(45) ~ 0.7071
      var dot = dx * dir.x + dy * dir.y;
      var magA = Math.sqrt(dx * dx + dy * dy);
      var magB = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      if (dot / (magA * magB) >= 0.7071) { results.push(pos); }
    }
    return results;
  }

  // -- 11. AoE Circle --------------------------------------------------------

  function getCircleTargets(center, radius, allPositions) {
    var results = [];
    for (var i = 0; i < allPositions.length; i++) {
      if (getDistance(center, allPositions[i]) <= radius) {
        results.push(allPositions[i]);
      }
    }
    return results;
  }

  // -- 12. Death Saves -------------------------------------------------------

  /**
   * Roll a single death save. Returns { stable, dead, result, roll, successes, failures }.
   * nat 20 = up with 1hp. nat 1 = 2 failures. 10+ = success. <10 = failure.
   */
  function rollDeathSave() {
    var roll = rollD20();
    if (roll === 20) {
      return { stable: true, dead: false, result: 'critical_success', roll: roll, successes: 0, failures: 0 };
    }
    if (roll === 1) {
      return { stable: false, dead: false, result: 'critical_fail', roll: roll, successes: 0, failures: 2 };
    }
    if (roll >= 10) {
      return { stable: false, dead: false, result: 'success', roll: roll, successes: 1, failures: 0 };
    }
    return { stable: false, dead: false, result: 'fail', roll: roll, successes: 0, failures: 1 };
  }

  /** Cumulative death save tracker. */
  function createDeathSaveTracker() {
    var successes = 0, failures = 0;
    return {
      roll: function() {
        var save = rollDeathSave();
        if (save.stable) {
          successes = 0; failures = 0;
          return { stable: true, dead: false, result: save.result, roll: save.roll,
                   successes: successes, failures: failures };
        }
        successes += save.successes;
        failures  += save.failures;
        var isStable = successes >= 3, isDead = failures >= 3;
        if (isStable) { successes = 3; }
        if (isDead)   { failures  = 3; }
        return { stable: isStable, dead: isDead, result: save.result, roll: save.roll,
                 successes: successes, failures: failures };
      },
      reset: function() { successes = 0; failures = 0; },
      getState: function() { return { successes: successes, failures: failures }; }
    };
  }

  // -- 13. Healing -----------------------------------------------------------

  /** Apply healing capped at maxHP. Returns actual amount healed. */
  function applyHealing(creature, amount) {
    if (amount <= 0) { return 0; }
    var maxHP = creature.maxHP || creature.maxHp || 0;
    var before = creature.hp || creature.currentHp || 0;
    var after = Math.min(before + amount, maxHP);
    creature.hp = after;
    creature.currentHp = after; // sync both fields
    return after - before;
  }

  // -- 14. Opportunity Attack Check ------------------------------------------

  /**
   * Check if creature can opportunity-attack a target moving from oldPos to newPos.
   * Triggers when target leaves reach (adjacent -> non-adjacent) and creature isn't stunned.
   */
  function canOpportunityAttack(creature, targetOldPos, targetNewPos) {
    var pos = creature.position || creature.pos;
    if (!pos) { return false; }
    if (!isAdjacent(pos, targetOldPos)) { return false; }
    if (isAdjacent(pos, targetNewPos)) { return false; }
    if (hasStatus(creature, StatusEffect.STUNNED)) { return false; }
    return true;
  }

  // -- Apply Damage Helper ---------------------------------------------------

  /** Reduce creature HP by amount (min 0). Returns actual damage dealt. */
  function applyDamage(creature, amount) {
    if (amount <= 0) { return 0; }
    var before = creature.hp || creature.currentHp || 0;
    var after = Math.max(before - amount, 0);
    creature.hp = after;
    creature.currentHp = after; // sync both fields
    return before - after;
  }

  // -- Public API ------------------------------------------------------------

  root.MJ.Dragon.Rules = Object.freeze({
    rollD20: rollD20, rollD: rollD, rollDice: rollDice,
    rollAdvantage: rollAdvantage, rollDisadvantage: rollDisadvantage,
    getModifier: getModifier,
    resolveAttack: resolveAttack, makeSave: makeSave, applyDamage: applyDamage,
    applyStatus: applyStatus, removeStatus: removeStatus, hasStatus: hasStatus,
    createSlotTracker: createSlotTracker,
    getDistance: getDistance, isAdjacent: isAdjacent, getMovementCost: getMovementCost,
    getConeTargets: getConeTargets, getCircleTargets: getCircleTargets,
    rollDeathSave: rollDeathSave, createDeathSaveTracker: createDeathSaveTracker,
    applyHealing: applyHealing,
    canOpportunityAttack: canOpportunityAttack,
    DamageType: DamageType, StatusEffect: StatusEffect
  });

  console.log('[Dragon] Rules module loaded');

})(typeof window !== 'undefined' ? window : global);
