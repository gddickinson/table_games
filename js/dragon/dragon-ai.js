/**
 * dragon-ai.js — AI decision system for D&D dragon battle game.
 * Party AI (auto-play / AI allies) and Dragon Boss AI.
 * Exports under window.MJ.Dragon.AI (IIFE module).
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};

  // Lazy dependency accessors
  function Rules()     { return root.MJ.Dragon.Rules; }
  function Chars()     { return root.MJ.Dragon.Characters; }
  function M()         { return root.MJ.Dragon.Map; }
  function CGL()       { return root.MJ.CrossGameLearning; }
  function Cognition() { return root.MJ.CharacterCognition; }

  var HEAL_THR = 0.30, SELF_DANGER = 0.25, CLUSTER_R = 2;
  var RANGED_IDEAL = 8, MELEE_R = 1;

  // -- Helpers ----------------------------------------------------------------
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function hpf(c) { return (c.hp || 0) / (c.maxHp || 1); }

  function alliesBelow(party, thr) {
    var r = [];
    for (var i = 0; i < party.length; i++) {
      if (party[i].hp > 0 && hpf(party[i]) < thr) r.push(party[i]);
    }
    return r;
  }

  function isHealer(c) { return c.class === 'cleric' || c.class === 'paladin'; }
  function isMelee(c)  { return c.class === 'barbarian' || c.class === 'paladin'; }
  function isRanged(c) { return c.class === 'wizard' || c.class === 'ranger'; }

  function distTo(a, b) {
    var m = M();
    if (m && m.getDistance) return m.getDistance(a.pos, b.pos);
    var dr = a.pos.row - b.pos.row, dc = a.pos.col - b.pos.col;
    return Math.sqrt(dr * dr + dc * dc);
  }

  function adjAllyCount(target, party) {
    var n = 0, m = M();
    for (var i = 0; i < party.length; i++) {
      if (party[i].hp > 0 && m && m.isAdjacent(party[i].pos, target.pos)) n++;
    }
    return n;
  }

  function los(from, to) {
    var m = M();
    return (m && m.getLineOfSight) ? m.getLineOfSight(from, to) : true;
  }

  function findFlank(ch, target, party) {
    var m = M();
    if (!m || !m.getAdjacentPassable) return target.pos;
    var adj = m.getAdjacentPassable(target.pos);
    var best = null, bestS = -Infinity;
    for (var i = 0; i < adj.length; i++) {
      var p = adj[i], s = 0;
      for (var j = 0; j < party.length; j++) {
        if (party[j].id !== ch.id && party[j].hp > 0 &&
            m.isAdjacent(party[j].pos, target.pos)) {
          var dr = p.row - target.pos.row, dc = p.col - target.pos.col;
          var ar = party[j].pos.row - target.pos.row;
          var ac = party[j].pos.col - target.pos.col;
          s += (dr === -ar && dc === -ac) ? 50 : 10;
        }
      }
      if (s > bestS) { bestS = s; best = p; }
    }
    return best || adj[0] || target.pos;
  }

  // -- Cross-game emotion modifiers -------------------------------------------
  function getEmotionModifiers(characterId) {
    var mods = { aggression: 0, defense: 0, spellConserve: 0, riskTolerance: 0 };
    try {
      var cglMod = CGL();
      if (!cglMod) return mods;
      var cgl = new cglMod.CrossGameLearning();
      var st = cgl.getState();
      var emo = (st.characterEmotions || {})[characterId] || 'neutral';
      var sc = clamp(((st.characterEmotionIntensity || {})[characterId] || 0) / 5, 0, 1);
      if (characterId === 'kenji' && (emo === 'tilted' || emo === 'frustrated')) {
        mods.aggression = 0.3 * sc; mods.defense = -0.2 * sc;
        mods.riskTolerance = 0.25 * sc;
      } else if (characterId === 'mei' && (emo === 'determined' || emo === 'focused')) {
        mods.spellConserve = 0.2 * sc; mods.defense = 0.15 * sc;
      } else if (characterId === 'yuki' && (emo === 'confident' || emo === 'inspired')) {
        mods.aggression = 0.15 * sc; mods.spellConserve = -0.1 * sc;
      }
      // General risk tolerance from win streaks or emotional intensity
      if (emo === 'tilted' || emo === 'frustrated' || emo === 'reckless') {
        mods.riskTolerance = Math.max(mods.riskTolerance, 0.2 * sc);
      }
      // riku/tomoe/sora: new chars -> defaults
    } catch (e) { /* cross-game learning unavailable */ }
    return mods;
  }

  // -- Action scoring ---------------------------------------------------------
  function scoreAction(action, ch, state, emo) {
    var score = 0, party = state.party || [], dragon = state.dragon;
    if (action.damage) {
      var hit = clamp(action.hitChance || 0.65, 0.05, 0.95);
      score += hit * (action.damage.avg || 0) * (1 + emo.aggression);
    }
    if (action.type === 'heal') {
      var w = alliesBelow(party, HEAL_THR);
      if (w.length > 0) score += (action.healAmount || 10) * (1 - hpf(w[0])) * 2.5;
    }
    if (hpf(ch) < SELF_DANGER &&
        (action.type === 'dodge' || action.type === 'disengage' || action.type === 'shield')) {
      score += 40 * (1 + emo.defense);
    }
    if (action.type === 'move' && action.targetPos && dragon) {
      var near = 0;
      for (var i = 0; i < party.length; i++) {
        if (party[i].id !== ch.id && party[i].hp > 0) {
          var d = M() ? M().getDistance(action.targetPos, party[i].pos) : 99;
          if (d <= CLUSTER_R) near++;
        }
      }
      if (near >= 2) score -= 15;
    }
    if (action.spellLevel) score -= action.spellLevel * 3 * (1 + emo.spellConserve);
    if (ch.id === 'riku' && action.type === 'attack' && dragon && adjAllyCount(dragon, party) > 0) {
      score += 15;
    }
    if (ch.id === 'sora' && action.type === 'huntersMark' && !ch.concentrating) score += 20;
    return score;
  }

  // == Party AI ===============================================================
  function DragonPartyAI() {}

  /** Select full turn actions (move + action + bonus action). */
  DragonPartyAI.prototype.selectActions = function (character, combatState) {
    var actions = [], emo = getEmotionModifiers(character.id);
    var mv = this.selectMovement(character, combatState);
    if (mv) actions.push(mv);
    var chosen = this._classDecision(character, combatState, emo);
    if (chosen) {
      if (Array.isArray(chosen)) {
        for (var i = 0; i < chosen.length; i++) actions.push(chosen[i]);
      } else { actions.push(chosen); }
    }

    // Apply cross-game emotion modifiers to final action selection
    if (emo.aggression > 0.1) {
      // Prefer attack actions over heal/defend — sort attacks earlier
      actions.sort(function (a, b) {
        var aAtk = (a.type === 'attack' || (a.type === 'spell' && a.spell !== 'cureWounds' && a.spell !== 'shield')) ? 1 : 0;
        var bAtk = (b.type === 'attack' || (b.type === 'spell' && b.spell !== 'cureWounds' && b.spell !== 'shield')) ? 1 : 0;
        return bAtk - aAtk;
      });
    }
    if (emo.defense > 0.1) {
      // Prefer heal/defend actions over attack — sort defensive earlier
      actions.sort(function (a, b) {
        var aDef = (a.type === 'heal' || a.type === 'dodge' || a.type === 'shield' ||
                    a.type === 'layOnHands' || (a.type === 'spell' && a.spell === 'cureWounds')) ? 1 : 0;
        var bDef = (b.type === 'heal' || b.type === 'dodge' || b.type === 'shield' ||
                    b.type === 'layOnHands' || (b.type === 'spell' && b.spell === 'cureWounds')) ? 1 : 0;
        return bDef - aDef;
      });
    }
    if (emo.riskTolerance > 0.2) {
      // Prefer high-damage abilities (Fireball, Divine Smite, Reckless Attack)
      for (var j = 0; j < actions.length; j++) {
        var act = actions[j];
        if (act.type === 'attack') { act.reckless = true; act.divineSmite = true; }
        if (act.type === 'spell' && !act.spell) act.spell = 'fireball';
      }
    }

    return actions;
  };

  /** Check if character is adjacent to target. */
  function isAdjacentTo(ch, target) {
    if (!ch.pos || !target.pos) return false;
    var m = M();
    if (m && m.isAdjacent) return m.isAdjacent(ch.pos, target.pos);
    var dr = Math.abs(ch.pos.row - target.pos.row);
    var dc = Math.abs(ch.pos.col - target.pos.col);
    return dr <= 1 && dc <= 1 && (dr + dc > 0);
  }

  /** Select movement target position. */
  DragonPartyAI.prototype.selectMovement = function (character, combatState) {
    var dragon = combatState.dragon, party = combatState.party || [];
    if (!dragon || dragon.hp <= 0) return null;

    // Melee fighters: don't move if already adjacent to the dragon
    if (isMelee(character) || character.id === 'riku') {
      if (isAdjacentTo(character, dragon)) return null;
    }

    var tp = null, m = M();
    if (character.id === 'riku') {
      tp = findFlank(character, dragon, party);
    } else if (isMelee(character)) {
      if (m && m.getAdjacentPassable) {
        var adj = m.getAdjacentPassable(dragon.pos);
        if (adj.length > 0) tp = adj[0];
      }
      if (!tp) tp = dragon.pos;
    } else if (isRanged(character)) {
      tp = this._rangedPos(character, dragon, combatState);
    } else if (character.id === 'mei') {
      tp = this._healerPos(character, dragon, party);
    } else {
      tp = character.pos;
    }
    if (!tp || (tp.row === character.pos.row && tp.col === character.pos.col)) return null;
    return { type: 'move', targetPos: tp };
  };

  DragonPartyAI.prototype._rangedPos = function (ch, dragon, state) {
    var m = M();
    if (!m || !m.findPath) return ch.pos;
    var best = ch.pos, bestS = -Infinity, rad = RANGED_IDEAL + 2;
    for (var dr = -rad; dr <= rad; dr++) {
      for (var dc = -rad; dc <= rad; dc++) {
        var p = { row: dragon.pos.row + dr, col: dragon.pos.col + dc };
        if (!m.isPassable(p)) continue;
        var dist = m.getDistance(p, dragon.pos);
        if (dist < 4 || dist > 12 || !los(p, dragon.pos)) continue;
        var s = -Math.abs(dist - RANGED_IDEAL) * 5;
        var party = state.party || [];
        for (var i = 0; i < party.length; i++) {
          if (party[i].id !== ch.id && party[i].hp > 0 &&
              m.getDistance(p, party[i].pos) <= CLUSTER_R) s -= 10;
        }
        if (s > bestS) { bestS = s; best = p; }
      }
    }
    return best;
  };

  DragonPartyAI.prototype._healerPos = function (ch, dragon, party) {
    var m = M();
    if (!m || !m.findPath) return ch.pos;
    var best = ch.pos, bestS = -Infinity;
    for (var dr = -6; dr <= 6; dr++) {
      for (var dc = -6; dc <= 6; dc++) {
        var p = { row: dragon.pos.row + dr, col: dragon.pos.col + dc };
        if (!m.isPassable(p)) continue;
        var dd = m.getDistance(p, dragon.pos);
        if (dd < 3) continue;
        var s = Math.min(dd, 6) * 2;
        for (var i = 0; i < party.length; i++) {
          if (party[i].hp > 0 && m.getDistance(p, party[i].pos) <= 6) s += 5;
        }
        if (s > bestS) { bestS = s; best = p; }
      }
    }
    return best;
  };

  // -- Class decision trees ---------------------------------------------------
  DragonPartyAI.prototype._classDecision = function (ch, st, emo) {
    var fn = { kenji: '_kenji', mei: '_mei', yuki: '_yuki',
               riku: '_riku', tomoe: '_tomoe', sora: '_sora' }[ch.id];
    return fn ? this[fn](ch, st, emo) : { type: 'attack', target: st.dragon };
  };

  /** Kenji (Barbarian): Rage -> Reckless Attack if HP > 50% or tilted. */
  DragonPartyAI.prototype._kenji = function (ch, st, emo) {
    var a = [];
    if (!ch.raging && (st.round || 1) <= 2) a.push({ type: 'rage' });
    // High aggression: always Reckless Attack, never Dodge
    var useReckless = hpf(ch) > 0.5 || emo.aggression > 0.2;
    if (emo.aggression > 0.1) useReckless = true;
    a.push({ type: 'attack', target: st.dragon,
      reckless: useReckless, multiattack: true });
    // High aggression: strip any Dodge that might have been added
    if (emo.aggression > 0.1) {
      a = a.filter(function (act) { return act.type !== 'dodge'; });
    }
    return a;
  };

  /** Mei (Cleric): Heal critical -> Spirit Guardians -> Sacred Flame / Guiding Bolt. */
  DragonPartyAI.prototype._mei = function (ch, st, emo) {
    var party = st.party || [], dragon = st.dragon;
    // High defense: heal even if ally is at 80% HP (normally only below 30%)
    var healThreshold = emo.defense > 0.1 ? 0.80 : HEAL_THR;
    var wounded = alliesBelow(party, healThreshold);
    if (wounded.length > 0) {
      wounded.sort(function (a, b) { return hpf(a) - hpf(b); });
      return { type: 'spell', spell: 'cureWounds', target: wounded[0], level: 1 };
    }
    if (dragon && !ch.concentrating && adjAllyCount(dragon, party) >= 3) {
      return { type: 'spell', spell: 'spiritGuardians', level: 3 };
    }
    if (dragon && los(ch.pos, dragon.pos)) {
      return emo.spellConserve > 0.1
        ? { type: 'spell', spell: 'sacredFlame', target: dragon, level: 0 }
        : { type: 'spell', spell: 'guidingBolt', target: dragon, level: 1 };
    }
    return { type: 'spell', spell: 'sacredFlame', target: dragon, level: 0 };
  };

  /** Yuki (Wizard): Scorching Ray -> Magic Missile -> Firebolt. Shield as reaction. */
  DragonPartyAI.prototype._yuki = function (ch, st, emo) {
    var dragon = st.dragon;
    if (dragon && los(ch.pos, dragon.pos)) {
      // Positive emotions (low spellConserve / high aggression): prefer higher-level spells
      var preferHighLevel = emo && (emo.aggression > 0.1 || emo.spellConserve < -0.05);
      if (preferHighLevel && ch.spellSlots && ch.spellSlots[3] > 0)
        return { type: 'spell', spell: 'fireball', target: dragon, level: 3 };
      if (ch.spellSlots && ch.spellSlots[2] > 0)
        return { type: 'spell', spell: 'scorchingRay', target: dragon, level: 2 };
      if (ch.spellSlots && ch.spellSlots[1] > 0)
        return { type: 'spell', spell: 'magicMissile', target: dragon, level: 1 };
      return { type: 'spell', spell: 'firebolt', target: dragon, level: 0 };
    }
    return { type: 'dodge' };
  };

  /** Riku (Rogue): Hide (bonus via Cunning Action) -> Sneak Attack with bow or rapier. */
  DragonPartyAI.prototype._riku = function (ch, st) {
    var a = [], dragon = st.dragon;
    // Always try to hide as bonus action first (Cunning Action) if not already hidden
    if (!ch.hidden) a.push({ type: 'hide', actionCost: 'bonus' });
    // Then always attack (sneak attack benefits from being hidden or ally adjacent)
    if (dragon) {
      var party = st.party || [];
      // Will have sneak attack: either hidden (from bonus hide above) or ally adjacent
      var sneak = true; // hidden from bonus action or ally adjacency
      var ranged = distTo(ch, dragon) > MELEE_R;
      a.push({ type: 'attack', target: dragon, sneakAttack: sneak,
        ranged: ranged, weapon: ranged ? 'shortbow' : 'rapier' });
    }
    return a;
  };

  /** Tomoe (Paladin): Compelled Duel if wizard targeted, Lay on Hands, Divine Smite. */
  DragonPartyAI.prototype._tomoe = function (ch, st) {
    var a = [], dragon = st.dragon, party = st.party || [];
    // Protect wizard with Compelled Duel
    if (dragon && dragon.targetId === 'yuki' && !ch.compelledDuelActive) {
      for (var i = 0; i < party.length; i++) {
        if (party[i].id === 'yuki' && party[i].hp > 0) {
          a.push({ type: 'spell', spell: 'compelledDuel', target: dragon, level: 1 });
          break;
        }
      }
    }
    var wounded = alliesBelow(party, HEAL_THR);
    if (wounded.length > 0 && ch.layOnHandsPool > 0) {
      wounded.sort(function (x, y) { return hpf(x) - hpf(y); });
      a.push({ type: 'layOnHands', target: wounded[0], amount: 10 });
    } else if (dragon) {
      var smite = ch.spellSlots && ch.spellSlots[1] > 0;
      a.push({ type: 'attack', target: dragon,
        divineSmite: smite, smiteLevel: smite ? 1 : 0, multiattack: true });
    }
    return a;
  };

  /** Sora (Ranger): Hunter's Mark (bonus, once) -> two longbow attacks every turn. */
  DragonPartyAI.prototype._sora = function (ch, st) {
    var a = [], dragon = st.dragon;
    // Only cast Hunter's Mark if not already concentrating on it
    // Check both the concentrating field and huntersMarkTarget
    var hasMarkActive = !!(ch.concentrating || ch.huntersMarkTarget);
    if (dragon && !hasMarkActive && ch.spellSlots) {
      // Check if spell slots available (spellSlots may be object or tracker)
      var slotsAvail = false;
      if (typeof ch.spellSlots === 'object') {
        if (ch.spellSlots.available) slotsAvail = ch.spellSlots.available(1) > 0;
        else if (ch.spellSlots['1']) slotsAvail = (ch.spellSlots['1'].current || ch.spellSlots['1']) > 0;
      }
      if (slotsAvail) {
        a.push({ type: 'spell', spell: 'huntersMark', target: dragon,
          level: 1, actionCost: 'bonus' });
      }
    }
    // Always attack with longbow twice (Multiattack / Extra Attack)
    if (dragon && los(ch.pos, dragon.pos)) {
      a.push({ type: 'attack', target: dragon, ranged: true, weapon: 'longbow' });
      a.push({ type: 'attack', target: dragon, ranged: true, weapon: 'longbow' });
    }
    return a;
  };

  // == Dragon AI (Boss) =======================================================
  function DragonBrainAI() {}

  DragonBrainAI.prototype._phase = function (d) {
    var f = hpf(d); return f > 0.50 ? 1 : f > 0.25 ? 2 : 3;
  };

  /** Score a party member as a target. */
  DragonBrainAI.prototype._scoreTarget = function (t, dragon, party) {
    if (!t || t.hp <= 0) return -1000;
    var s = 0;
    if (t.concentrating) s += 50;
    if (hpf(t) < 0.25) s += 30;
    if (isHealer(t)) s += 20;
    s += Math.floor((t.damageDealtToDragon || 0) / 10) * 10;
    if (t.hp <= 0) s -= 20;
    if (adjAllyCount(t, party) === 0) s += 15;
    return s;
  };

  DragonBrainAI.prototype._selectTarget = function (dragon, party) {
    var best = null, bestS = -Infinity;
    for (var i = 0; i < party.length; i++) {
      var s = this._scoreTarget(party[i], dragon, party);
      if (s > bestS) { bestS = s; best = party[i]; }
    }
    return best;
  };

  /** Find breath weapon direction hitting most party members. */
  DragonBrainAI.prototype._bestBreath = function (dragon, party) {
    var m = M();
    if (!m || !m.getSquaresInCone) return { direction: { row: 1, col: 0 }, hitCount: 0 };
    var dirs = [
      { row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 },
      { row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 }
    ];
    var bestDir = dirs[0], bestN = 0;
    for (var d = 0; d < dirs.length; d++) {
      var cone = m.getSquaresInCone(dragon.pos, dirs[d], 6), n = 0;
      for (var i = 0; i < party.length; i++) {
        if (party[i].hp <= 0) continue;
        for (var j = 0; j < cone.length; j++) {
          if (cone[j].row === party[i].pos.row && cone[j].col === party[i].pos.col) {
            n++; break;
          }
        }
      }
      if (n > bestN) { bestN = n; bestDir = dirs[d]; }
    }
    return { direction: bestDir, hitCount: bestN };
  };

  function countMeleeNear(dragon, party) {
    var n = 0;
    for (var i = 0; i < party.length; i++) {
      if (party[i].hp > 0 && distTo(dragon, party[i]) <= MELEE_R) n++;
    }
    return n;
  }

  /** Select dragon's turn actions. Phase-based behavior. */
  DragonBrainAI.prototype.selectDragonActions = function (dragonState, partyState) {
    // partyState may be the full state object or just the party array
    var actions = [], party = Array.isArray(partyState) ? partyState : (partyState.party || []);
    var phase = this._phase(dragonState), round = (partyState && partyState.round) || 1;

    // Adaptive AI: read player tendencies
    var tendencies = this._getPlayerTendencies();
    // If player heals often, target the healer more aggressively
    var healerTargetBonus = tendencies.usesHealingOften ? 30 : 0;
    // If player focuses damage, use more defensive tactics (prefer wing attack)
    var preferWingAttack = tendencies.focusesDamage;
    // If player spreads party, lower breath threshold (covers more area)
    var breathThresholdReduction = tendencies.spreadsParty ? 1 : 0;

    // Frightful Presence on turn 1
    if (round === 1 && !dragonState.usedFrightful) {
      actions.push({ type: 'frightfulPresence' });
    }

    // Breath weapon decision
    if (dragonState.breathReady) {
      var br = this._bestBreath(dragonState, party);
      var use = (phase === 1 && br.hitCount >= (3 - breathThresholdReduction)) ||
                (phase === 2 && br.hitCount >= (2 - breathThresholdReduction)) || phase === 3;
      if (use) {
        actions.push({ type: 'breathWeapon', direction: br.direction, hitCount: br.hitCount });
        return actions; // breath replaces multiattack
      }
    }

    // Target selection by phase
    var target;
    if (phase === 2 || healerTargetBonus > 0) {
      // Tactical: healers first (also triggered by adaptive AI when player heals often)
      var ht = null, htScore = -Infinity;
      for (var i = 0; i < party.length; i++) {
        if (party[i].hp > 0 && isHealer(party[i])) {
          var sc = this._scoreTarget(party[i], dragonState, party) + healerTargetBonus;
          if (sc > htScore) { htScore = sc; ht = party[i]; }
        }
      }
      target = ht || this._selectTarget(dragonState, party);
    } else if (phase === 3) {
      // Desperate: lowest HP to secure kills
      var low = null;
      for (var k = 0; k < party.length; k++) {
        if (party[k].hp > 0 && (!low || party[k].hp < low.hp)) low = party[k];
      }
      target = low || this._selectTarget(dragonState, party);
    } else {
      target = this._selectTarget(dragonState, party);
    }
    if (!target) return actions;

    // Wing Attack reposition if surrounded (phase 2+, or adaptive if player focuses damage)
    var wingThreshold = preferWingAttack ? 2 : 3;
    if (phase >= 2 && countMeleeNear(dragonState, party) >= wingThreshold) {
      actions.push({ type: 'wingAttack' });
    }

    // Multiattack: bite + 2 claws — target by string id so engine can resolve
    var tid = target.id || target;
    actions.push({ type: 'attack', attackName: 'bite', target: tid });
    actions.push({ type: 'attack', attackName: 'claw', target: tid });
    // Second claw may target a different party member if phase 2+
    var tid2 = tid;
    if (phase >= 2) {
      var alt = this._selectTarget(dragonState, party);
      if (alt && alt.id !== tid && alt.hp > 0) tid2 = alt.id;
    }
    actions.push({ type: 'attack', attackName: 'claw', target: tid2 });
    return actions;
  };

  /** Select a legendary action between other creatures' turns. */
  DragonBrainAI.prototype.selectLegendaryAction = function (dragonState, partyState) {
    var party = Array.isArray(partyState) ? partyState : (partyState.party || []);
    var rem = dragonState.legendaryActions || (partyState && partyState.legendaryActionsRemaining) || 0;
    if (!rem || rem <= 0) return null;

    // Detect hidden Riku (cost 1)
    for (var i = 0; i < party.length; i++) {
      if (party[i].id === 'riku' && party[i].hidden && party[i].hp > 0) {
        return { type: 'legendaryDetect', cost: 1 };
      }
    }
    // Wing Attack if 2+ melee adjacent (cost 2)
    if (rem >= 2 && countMeleeNear(dragonState, party) >= 2) {
      return { type: 'legendaryWingAttack', cost: 2 };
    }
    // Tail Attack if a melee attacker adjacent (cost 1)
    for (var k = 0; k < party.length; k++) {
      if (party[k].hp > 0 && isMelee(party[k]) &&
          distTo(dragonState, party[k]) <= MELEE_R) {
        return { type: 'legendaryTailAttack', cost: 1, target: party[k].id };
      }
    }
    return null; // save actions
  };

  /** Record combat result to cross-game learning systems. */
  DragonPartyAI.prototype.recordCombatResult = function(result) {
    var L = root.MJ.Dragon.Learning;
    if (L && L.DragonLearning) {
      var dl = new L.DragonLearning();
      if (dl.recordCombatResult) dl.recordCombatResult(result);
    }
    // Also write to CrossGameLearning
    var cglMod = CGL();
    if (cglMod && cglMod.CrossGameLearning) {
      var cgl = new cglMod.CrossGameLearning();
      if (cgl.recordGameResult) cgl.recordGameResult('dragon', result);
    }
  };

  // -- Player pattern tracking (adaptive AI) ----------------------------------
  DragonBrainAI.prototype._getPlayerTendencies = function() {
    // Read from localStorage
    try {
      var data = JSON.parse(localStorage.getItem('mj_dragon_player_patterns') || '{}');
      return {
        usesHealingOften: (data.healCasts || 0) > (data.attackCasts || 0) * 0.3,
        focusesDamage: (data.totalDamage || 0) / Math.max(data.rounds || 1, 1) > 30,
        spreadsParty: (data.avgPartySpread || 5) > 6,
        usesRanged: (data.rangedAttacks || 0) > (data.meleeAttacks || 0)
      };
    } catch(e) { return {}; }
  };

  // Record player actions during combat
  DragonBrainAI.prototype.recordPlayerAction = function(action, state) {
    try {
      var data = JSON.parse(localStorage.getItem('mj_dragon_player_patterns') || '{}');
      data.rounds = (data.rounds || 0) + 1;
      if (action.type === 'attack') data.meleeAttacks = (data.meleeAttacks || 0) + 1;
      if (action.type === 'spell' && action.spellId && action.spellId.toLowerCase().includes('cure')) data.healCasts = (data.healCasts || 0) + 1;
      if (action.type === 'spell') data.attackCasts = (data.attackCasts || 0) + 1;
      localStorage.setItem('mj_dragon_player_patterns', JSON.stringify(data));
    } catch(e) {}
  };

  // -- Export -----------------------------------------------------------------
  root.MJ.Dragon.AI = Object.freeze({
    DragonPartyAI:       DragonPartyAI,
    DragonBrainAI:       DragonBrainAI,
    getEmotionModifiers: getEmotionModifiers
  });

  console.log('[Dragon] AI module loaded');
})(typeof window !== 'undefined' ? window : this);
