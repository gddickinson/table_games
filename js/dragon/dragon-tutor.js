/**
 * dragon-tutor.js — Offline tactical advice fallback for D&D dragon battle.
 * Pattern-matches player questions and proactively suggests moves.
 * Exports under window.MJ.Dragon.Tutor (IIFE module).
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};

  // ---------------------------------------------------------------------------
  // Lazy dependency accessors
  // ---------------------------------------------------------------------------
  function Rules()  { return root.MJ.Dragon.Rules; }
  function Chars()  { return root.MJ.Dragon.Characters; }
  function Map()    { return root.MJ.Dragon.Map; }

  // ---------------------------------------------------------------------------
  // System prompt exported for Ollama integration
  // ---------------------------------------------------------------------------
  var DRAGON_TUTOR_PROMPT =
    'You are an expert D&D 5th Edition tactical combat advisor watching a ' +
    '6-person party fight an Adult Red Dragon in a cave.\n\n' +
    'RULES FOR YOUR RESPONSES:\n' +
    '- Give SPECIFIC tactical advice based on the exact combat state\n' +
    '- Reference D&D mechanics: AC, saving throws, spell slots, concentration, action economy\n' +
    '- Name specific characters and their abilities\n' +
    '- Suggest optimal target selection, positioning, and resource usage\n' +
    '- Keep responses to 2-3 sentences maximum\n' +
    '- Prioritize survival when characters are low HP\n' +
    '- Reference the dragon\'s legendary actions and breath weapon recharge';

  // ---------------------------------------------------------------------------
  // Keyword patterns for question matching
  // ---------------------------------------------------------------------------
  var PATTERNS = {
    heal:     /\b(heal|healing|cure|restore|hit\s*points?\s*back|potion)\b/i,
    attack:   /\b(attack|hit|damage|strike|smite|weapon)\b/i,
    spell:    /\b(spell|cast|cantrip|magic|slot)\b/i,
    position: /\b(position|move|where|place|stand|retreat|advance)\b/i,
    dragon:   /\b(dragon|breath|fire|flame|wing|tail|claw)\b/i,
    save:     /\b(save|saving\s*throw|resist|reflex|fortitude)\b/i,
    death:    /\b(death|dying|down|unconscious|death\s*save|stabilize)\b/i,
    strategy: /\b(strategy|plan|tactics|approach|what\s*should|best\s*move)\b/i
  };

  // ---------------------------------------------------------------------------
  // Helper utilities
  // ---------------------------------------------------------------------------

  /**
   * Find the party member with the lowest HP fraction.
   */
  function findLowestAlly(combatState) {
    if (!combatState || !combatState.party) return null;
    var lowest = null;
    var lowestFrac = 1.0;
    for (var i = 0; i < combatState.party.length; i++) {
      var c = combatState.party[i];
      if (c.hp <= 0) continue;                         // skip downed characters
      var frac = c.hp / (c.maxHp || c.hp || 1);
      if (frac < lowestFrac) {
        lowestFrac = frac;
        lowest = c;
      }
    }
    return { character: lowest, fraction: lowestFrac };
  }

  /**
   * Check if multiple party members are within a small radius (clustered).
   */
  function isPartyClustered(combatState) {
    if (!combatState || !combatState.party) return false;
    var positions = [];
    for (var i = 0; i < combatState.party.length; i++) {
      var c = combatState.party[i];
      if (c.hp > 0 && c.position) positions.push(c.position);
    }
    if (positions.length < 3) return false;

    // Count pairs within 2 squares
    var closePairs = 0;
    for (var a = 0; a < positions.length; a++) {
      for (var b = a + 1; b < positions.length; b++) {
        var dx = (positions[a].x || 0) - (positions[b].x || 0);
        var dy = (positions[a].y || 0) - (positions[b].y || 0);
        if (Math.sqrt(dx * dx + dy * dy) <= 2) closePairs++;
      }
    }
    return closePairs >= 3;
  }

  /**
   * Return the dragon entry from combat state, if available.
   */
  function getDragon(combatState) {
    if (!combatState) return null;
    return combatState.dragon || null;
  }

  /**
   * Determine the class role of a character.
   */
  function classRole(character) {
    if (!character || !character.class) return 'unknown';
    var cls = (character.class || '').toLowerCase();
    if (/cleric|druid|bard/.test(cls)) return 'healer';
    if (/fighter|barbarian|paladin|monk/.test(cls)) return 'melee';
    if (/wizard|sorcerer|warlock/.test(cls)) return 'caster';
    if (/ranger|rogue/.test(cls)) return 'ranged';
    return 'unknown';
  }

  /**
   * Recommend a spell level for healing based on ally HP deficit.
   */
  function recommendHealLevel(deficit) {
    if (deficit > 40) return 3;
    if (deficit > 20) return 2;
    return 1;
  }

  /**
   * Count how many enemies/allies are in an area (simple clustering check).
   */
  function countNearby(target, combatState, radius) {
    if (!target || !target.position || !combatState || !combatState.party) return 0;
    var count = 0;
    var entities = (combatState.party || []).concat(
      combatState.minions || []
    );
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (!e.position || e === target) continue;
      var dx = (e.position.x || 0) - (target.position.x || 0);
      var dy = (e.position.y || 0) - (target.position.y || 0);
      if (Math.sqrt(dx * dx + dy * dy) <= radius) count++;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // DragonTutor class
  // ---------------------------------------------------------------------------

  /**
   * @constructor
   * Offline tactical advisor for the dragon combat encounter.
   */
  function DragonTutor() {
    this._lastAdvice = null;
  }

  // ---------------------------------------------------------------------------
  // answerQuestion — pattern-match player questions
  // ---------------------------------------------------------------------------

  /**
   * Answer a free-text question about combat tactics.
   * @param {string} question  The player's question text.
   * @param {object} combatState  Current combat snapshot.
   * @returns {string} Tactical advice string.
   */
  DragonTutor.prototype.answerQuestion = function (question, combatState) {
    if (!question || typeof question !== 'string') {
      return 'I can help with combat tactics, positioning, spells, healing, and dragon weaknesses.';
    }

    var q = question.toLowerCase();

    // --- Healing advice ---
    if (PATTERNS.heal.test(q)) {
      var info = findLowestAlly(combatState);
      if (info.character && info.fraction < 0.5) {
        var deficit = (info.character.maxHp || 50) - info.character.hp;
        var lvl = recommendHealLevel(deficit);
        return info.character.name + ' is at ' + Math.round(info.fraction * 100) +
          '% HP. Cast Cure Wounds at level ' + lvl + ' on them immediately — ' +
          'that should restore roughly ' + (lvl * 8) + ' HP.';
      }
      return 'The party is in decent shape. Save spell slots for emergencies, ' +
        'but keep Healing Word prepared as a bonus action heal in case someone drops.';
    }

    // --- Attack / damage advice ---
    if (PATTERNS.attack.test(q)) {
      var dragon = getDragon(combatState);
      if (dragon) {
        var hpFrac = dragon.hp / (dragon.maxHp || dragon.hp || 1);
        if (hpFrac < 0.25) {
          return 'The dragon is nearly dead at ' + Math.round(hpFrac * 100) +
            '% HP! Focus all attacks — melee should Reckless Attack or Action Surge. ' +
            'Casters should use their highest remaining slots.';
        }
        return 'Target the dragon directly. Martial characters should use their best ' +
          'attack options — Great Weapon Master or Sharpshooter if available. ' +
          'Magic users should concentrate damage spells rather than utility.';
      }
      return 'Focus fire on the biggest threat. Coordinate attacks so melee and ranged ' +
        'hit the same target to drop it quickly.';
    }

    // --- Spell advice ---
    if (PATTERNS.spell.test(q)) {
      var clustered = isPartyClustered(combatState);
      var dragon = getDragon(combatState);
      if (dragon && dragon.minions && dragon.minions.length > 2) {
        return 'Multiple enemies are present — use AoE spells like Fireball or ' +
          'Shatter to hit clusters. Position the template to catch as many as possible ' +
          'while avoiding allies.';
      }
      if (dragon) {
        var hpFrac = dragon.hp / (dragon.maxHp || dragon.hp || 1);
        if (hpFrac < 0.5) {
          return 'The dragon is weakened. Use single-target damage spells like ' +
            'Guiding Bolt or Chromatic Orb at high level to finish it off. ' +
            'Save one slot for emergency healing.';
        }
      }
      return 'Consider your spell slot economy. Use cantrips for consistent damage, ' +
        'save leveled spells for burst damage or emergency heals. Concentration spells ' +
        'like Bless or Haste give lasting value.';
    }

    // --- Positioning advice ---
    if (PATTERNS.position.test(q)) {
      var advice = [];
      if (combatState && combatState.activeCharacter) {
        var role = classRole(combatState.activeCharacter);
        switch (role) {
          case 'healer':
            advice.push('Stay 30-40 feet from the dragon — close enough to heal melee allies ' +
              'but outside easy reach. Keep a pillar or wall between you and the dragon.');
            break;
          case 'melee':
            advice.push('Engage the dragon from its flanks if possible. Avoid standing directly ' +
              'in front of its head — that\'s breath weapon territory. Try to stay adjacent ' +
              'for opportunity attacks.');
            break;
          case 'caster':
            advice.push('Maintain maximum spell range — 60 to 120 feet back. Use cover and ' +
              'elevation when available. Stay spread from other casters to avoid AoE.');
            break;
          case 'ranged':
            advice.push('Keep 60+ feet distance. Use Cunning Action to Disengage if the dragon ' +
              'closes in. High ground gives advantage on ranged attacks in some DM rulings.');
            break;
          default:
            advice.push('Spread out to avoid breath weapon. Use terrain cover when possible.');
        }
      } else {
        advice.push('Spread out to avoid breath weapon. Melee in front, ranged and healers in back. ' +
          'Use cave pillars for half-cover (+2 AC, +2 Dex saves).');
      }
      return advice.join(' ');
    }

    // --- Dragon-specific advice ---
    if (PATTERNS.dragon.test(q)) {
      var dragon = getDragon(combatState);
      var breathWarning = 'The Adult Red Dragon\'s Fire Breath is a 60-foot cone dealing ' +
        '18d6 fire damage (DC 21 Dex save for half). Spread out so it can\'t catch ' +
        'more than 2 party members. ';
      if (dragon && dragon.breathRecharge !== undefined) {
        if (dragon.breathRecharge) {
          breathWarning += 'WARNING: Breath weapon is RECHARGED — scatter immediately!';
        } else {
          breathWarning += 'Breath weapon is currently expended, but it recharges on 5-6 each round.';
        }
      }
      return breathWarning;
    }

    // --- Saving throw advice ---
    if (PATTERNS.save.test(q)) {
      return 'Against the dragon, Dex saves matter most (breath weapon DC 21). ' +
        'Characters with Evasion or Shield Master can mitigate this. ' +
        'The dragon\'s Frightful Presence requires a Wis save (DC 19) — Paladins\' ' +
        'Aura of Courage can help nearby allies. Absorb Elements halves breath damage ' +
        'and adds it to your next attack.';
    }

    // --- Death / dying advice ---
    if (PATTERNS.death.test(q)) {
      return 'A dying character makes death saves at the start of their turn: DC 10, ' +
        '3 successes to stabilize, 3 failures = death. Any damage while at 0 HP is an ' +
        'automatic failure (crits count as 2). Healing Word as a bonus action is the ' +
        'fastest way to get someone up — even 1 HP stops death saves. Spare the Dying ' +
        'stabilizes without using a spell slot.';
    }

    // --- General strategy ---
    if (PATTERNS.strategy.test(q)) {
      var dragon = getDragon(combatState);
      var tips = [];
      if (dragon) {
        var hpFrac = dragon.hp / (dragon.maxHp || dragon.hp || 1);
        if (hpFrac > 0.75) {
          tips.push('Early fight: conserve resources. Use cantrips and weapon attacks.');
          tips.push('Establish positioning — spread out, use cover.');
          tips.push('The healer should save slots for when the dragon uses breath weapon.');
        } else if (hpFrac > 0.25) {
          tips.push('Mid fight: commit stronger spells and abilities now.');
          tips.push('If the dragon is focusing one character, others should pile on damage.');
          tips.push('Keep Counterspell ready if the dragon has spellcasting.');
        } else {
          tips.push('The dragon is nearly dead — go all in!');
          tips.push('Use Action Surge, highest spell slots, and Smites.');
          tips.push('Beware: wounded dragons often fight more desperately with legendary actions.');
        }
      } else {
        tips.push('General combat strategy: focus fire, spread against AoE, protect the healer.');
      }
      var infoLow = findLowestAlly(combatState);
      if (infoLow.character && infoLow.fraction < 0.3) {
        tips.push('URGENT: ' + infoLow.character.name + ' needs healing immediately!');
      }
      return tips.join(' ');
    }

    // --- Default fallback ---
    return 'I can help with combat tactics, positioning, spells, healing, and dragon weaknesses.';
  };

  // ---------------------------------------------------------------------------
  // getAdvice — proactive advice for current turn
  // ---------------------------------------------------------------------------

  /**
   * Generate proactive tactical advice for a character's turn.
   * @param {object} character    The active character.
   * @param {object} combatState  Current combat snapshot.
   * @returns {string} Proactive advice string.
   */
  DragonTutor.prototype.getAdvice = function (character, combatState) {
    if (!character || !combatState) {
      return 'End your turn and prepare for the dragon\'s next move.';
    }

    var role = classRole(character);
    var dragon = getDragon(combatState);
    var lowAlly = findLowestAlly(combatState);
    var clustered = isPartyClustered(combatState);

    // Priority 1: Healer should heal critically low ally
    if (role === 'healer' && lowAlly.character && lowAlly.fraction < 0.30) {
      var allyName = lowAlly.character.name || 'the wounded ally';
      var deficit = (lowAlly.character.maxHp || 50) - lowAlly.character.hp;
      var lvl = recommendHealLevel(deficit);
      return character.name + ' should heal ' + allyName + ' with Cure Wounds' +
        (lvl > 1 ? ' at level ' + lvl : '') + '. They\'re at ' +
        Math.round(lowAlly.fraction * 100) + '% HP.';
    }

    // Priority 2: Breath weapon warning when party is clustered
    if (dragon && clustered) {
      var breathReady = dragon.breathRecharge === undefined || dragon.breathRecharge;
      if (breathReady) {
        return 'Spread out! Dragon\'s breath weapon may be ready. ' +
          'Move at least 15 feet from the nearest ally to avoid the 60-foot cone.';
      }
    }

    // Priority 3: Focus fire when dragon is low
    if (dragon) {
      var dragonFrac = dragon.hp / (dragon.maxHp || dragon.hp || 1);
      if (dragonFrac < 0.25) {
        return 'Focus fire! The dragon is weakened at ' +
          Math.round(dragonFrac * 100) + '% HP. Use your strongest remaining abilities ' +
          'to finish it off before it can heal or flee.';
      }
    }

    // Priority 4: Opportunity attack available
    if (character.canOpportunityAttack || (character.reactions && character.reactions > 0 &&
        dragon && dragon.isMoving)) {
      return character.name + ' can make an opportunity attack as the dragon moves! ' +
        'Use your reaction — this is free damage outside your turn.';
    }

    // Priority 5: Non-healer ally is critically low — suggest off-healing or potions
    if (lowAlly.character && lowAlly.fraction < 0.30 && role !== 'healer') {
      var potionAdvice = character.potions && character.potions > 0
        ? 'Use a healing potion on ' + (lowAlly.character.name || 'them') + '.'
        : 'Try to protect ' + (lowAlly.character.name || 'the wounded ally') +
          ' or draw the dragon\'s attention.';
      return (lowAlly.character.name || 'An ally') + ' is critically wounded! ' + potionAdvice;
    }

    // Priority 6: Role-specific general advice
    if (dragon) {
      switch (role) {
        case 'melee':
          return character.name + ' should engage the dragon in melee. ' +
            'Use your strongest attack option and try to flank if possible.';
        case 'caster':
          return character.name + ' should cast from range. Consider concentration ' +
            'spells like Haste on the fighter or direct damage if the dragon is exposed.';
        case 'ranged':
          return character.name + ' should attack from cover at range. ' +
            'Aim for Sneak Attack if you have an ally adjacent to the dragon.';
        case 'healer':
          return character.name + ' should use a damage cantrip this turn — ' +
            'the party is healthy enough. Save spell slots for emergencies.';
      }
    }

    // Default fallback
    return 'End your turn and prepare for the dragon\'s next move.';
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  root.MJ.Dragon.Tutor = {
    DragonTutor:         DragonTutor,
    DRAGON_TUTOR_PROMPT: DRAGON_TUTOR_PROMPT
  };

  console.log('[Dragon] Tutor module loaded');

})(typeof window !== 'undefined' ? window : this);
