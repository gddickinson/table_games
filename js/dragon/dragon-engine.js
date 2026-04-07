/**
 * dragon-engine.js — Turn-based combat engine for D&D dragon battle.
 * Exports under window.MJ.Dragon.Engine (IIFE module).
 * Dependencies (lazy): MJ.Dragon.Rules, MJ.Dragon.Characters, MJ.Dragon.Map
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};

  function R() { return root.MJ.Dragon.Rules; }
  function C() { return root.MJ.Dragon.Characters; }
  function M() { return root.MJ.Dragon.Map; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var PHASE = Object.freeze({
    SETUP:'SETUP', INITIATIVE:'INITIATIVE', ROUND_START:'ROUND_START',
    TURN_START:'TURN_START', AWAITING_ACTION:'AWAITING_ACTION',
    RESOLVING:'RESOLVING', TURN_END:'TURN_END', ROUND_END:'ROUND_END',
    COMBAT_OVER:'COMBAT_OVER'
  });

  function Engine() {
    this.round = 0; this.turnIndex = -1; this.currentActor = null;
    this.phase = null; this.party = []; this.dragon = null;
    this.turnOrder = []; this.combatLog = []; this.mapState = null;
    this.humanCharId = null; this.turnState = null;
    this._onRoundEnd = null; this._onTurnStart = null; this._onCombatEnd = null;
  }

  Engine.prototype.init = function (opts) {
    opts = opts || {};
    this.humanCharId = opts.humanCharacterId || 'kenji';
    var chars = C(), map = M();
    var ids = chars.CHARACTER_IDS || ['kenji','mei','yuki','riku','tomoe','sora'];
    this.party = [];
    for (var i = 0; i < ids.length; i++) {
      var m = chars.createCharacterInstance ? chars.createCharacterInstance(ids[i]) : clone(chars.CHARACTERS[ids[i]]);
      var sp = map.PARTY_START_POSITIONS[i] || map.PARTY_START_POSITIONS[0];
      m.position = { row: sp.row, col: sp.col };
      m.isDown = false; m.deathSaves = { successes: 0, failures: 0 };
      m.conditions = m.conditions || [];
      // Normalize HP field — rules module uses .hp, characters module uses .currentHp
      if (m.currentHp !== undefined && m.hp === undefined) m.hp = m.currentHp;
      if (m.maxHp === undefined && m.maxHP !== undefined) m.maxHp = m.maxHP;
      if (!m.spellSlots && m.slots) m.spellSlots = R().createSlotTracker(m.slots);
      // Apply equipment bonuses from campaign state
      if (opts.partyState) {
        var charState = null;
        for (var ps = 0; ps < (opts.partyState.characters || []).length; ps++) {
          if (opts.partyState.characters[ps].id === m.id) { charState = opts.partyState.characters[ps]; break; }
        }
        if (charState) {
          // Restore HP from campaign
          if (charState.hp !== undefined) { m.hp = charState.hp; m.currentHp = charState.hp; }
          // Apply equipment bonuses
          if (charState.equipment) {
            var loot = root.MJ.Dragon.Campaign && root.MJ.Dragon.Campaign.Loot;
            if (loot && loot.getItemBonus) {
              for (var slot in charState.equipment) {
                var bonus = loot.getItemBonus(charState.equipment[slot], slot);
                if (bonus) {
                  if (bonus.ac) m.ac += bonus.ac;
                  if (bonus.attackBonus) m.attackBonus = (m.attackBonus || 0) + bonus.attackBonus;
                  if (bonus.damage) { /* store for weapon override */ m._equipDamage = bonus.damage; }
                  if (bonus.spellDCBonus) m.spellSaveDC = (m.spellSaveDC || 0) + bonus.spellDCBonus;
                }
              }
            }
          }
          // Restore spell slots
          if (charState.spellSlots) {
            m.spellSlotsRemaining = charState.spellSlots;
          }
        }
      }
      this.party.push(m);
    }
    var dd = chars.createDragonInstance ? chars.createDragonInstance() : clone(chars.DRAGON);
    var dp = map.DRAGON_START_POSITION;
    dd.position = { row: dp.row, col: dp.col }; dd.conditions = [];
    if (dd.currentHp !== undefined && dd.hp === undefined) dd.hp = dd.currentHp;
    if (dd.maxHp === undefined && dd.maxHP !== undefined) dd.maxHp = dd.maxHP;
    dd.breathRecharge = 0; dd.legendaryActions = dd.maxLegendaryActions || 3;
    dd.legendaryResistances = dd.maxLegendaryResistances || 3; dd.phaseLabel = 'Healthy';
    // Set up boss phases for non-dragon bosses
    if (dd.isBoss && dd.bossPhases) {
      dd._currentPhase = 0;
    }
    this.dragon = dd;
    this.mapState = map.createMapState();
    this.phase = PHASE.SETUP; this.combatLog = [];
    this._log('The party enters the dragon\'s lair.', 'narrative');
  };

  Engine.prototype.start = function () {
    this.phase = PHASE.INITIATIVE;
    var r = R(), inits = [], i, mod, roll;
    for (i = 0; i < this.party.length; i++) {
      var pstats = this.party[i].stats || this.party[i].abilities || {};
      mod = r.getModifier(pstats.dex || 10);
      roll = r.rollD20() + mod;
      inits.push({ id: this.party[i].id, init: roll });
      this._log(this.party[i].name + ' rolls initiative: ' + roll, 'status');
    }
    var dstats = this.dragon.stats || this.dragon.abilities || {};
    mod = r.getModifier(dstats.dex || 10);
    roll = r.rollD20() + mod;
    inits.push({ id: this.dragon.id || 'dragon', init: roll });
    this._log((this.dragon.name || 'Dragon') + ' rolls initiative: ' + roll, 'status');
    inits.sort(function (a, b) { return b.init - a.init; });
    this.turnOrder = inits.map(function (x) { return x.id; });
    this.round = 1; this.turnIndex = -1; this.phase = PHASE.ROUND_START;
    this._log('--- Round 1 ---', 'narrative'); this._rechargeRound();
    return this.advanceTurn();
  };

  Engine.prototype.getState = function () {
    var ps = [], i, m;
    for (i = 0; i < this.party.length; i++) {
      m = this.party[i];
      var mpos = m.position ? { row: m.position.row, col: m.position.col } : null;
      ps.push({ id: m.id, name: m.name, hp: m.currentHp != null ? m.currentHp : m.hp, maxHp: m.maxHp || m.maxHP,
        ac: m.ac, position: mpos, pos: mpos,
        conditions: (m.conditions || []).slice(), isDown: !!m.isDown,
        hidden: !!(m.hidden || (m.conditions && m.conditions.indexOf('hidden') !== -1)),
        class: m.class || '', speed: m.speed || 30,
        concentrating: m.concentrating || null,
        deathSaves: m.deathSaves ? { successes: m.deathSaves.successes, failures: m.deathSaves.failures } : null,
        spellSlots: m.spellSlots ? (m.spellSlots.snapshot ? m.spellSlots.snapshot() : m.spellSlots) : m.spellSlotsRemaining || null,
        abilities: m.abilityList || m.abilities || null,
        className: m.className || m.class || '', avatar: m.avatar || null,
        color: m.color || null });
    }
    var d = this.dragon, dpos = d && d.position ? { row: d.position.row, col: d.position.col } : null;
    var ds = d ? { hp: d.currentHp != null ? d.currentHp : d.hp, maxHp: d.maxHp || d.maxHP, ac: d.ac,
      position: dpos, pos: dpos, name: d.name || 'Dragon', id: d.id || 'dragon',
      conditions: (d.conditions || []).slice(), breathRecharge: d.breathRecharge,
      breathReady: d.breathRecharge === 0, usedFrightful: !!d.usedFrightful,
      attacks: d.attacks || null, breathDC: d.breathDC, breathDamage: d.breathDamage,
      frightfulDC: d.frightfulDC, wingDC: d.wingDC,
      legendaryActions: d.legendaryActions, legendaryResistances: d.legendaryResistances,
      phaseLabel: d.phaseLabel } : null;
    // Resolve currentActor to full object for consumers
    var ca = null;
    if (this.currentActor) {
      var cid = this.currentActor;
      if (cid === (d && d.id || 'dragon')) {
        ca = ds ? Object.assign({ id: cid, isDragon: true, name: d.name || 'Dragon' }, ds) : null;
      } else {
        for (i = 0; i < ps.length; i++) { if (ps[i].id === cid) { ca = Object.assign({ isDragon: false }, ps[i]); break; } }
      }
    }
    return { round: this.round, turnIndex: this.turnIndex, currentActor: ca,
      phase: this.phase, party: ps, dragon: ds, turnOrder: this.turnOrder.slice(),
      map: this.mapState, combatLog: this.combatLog.slice(-20), victory: this.isGameOver().victory };
  };

  Engine.prototype.advanceTurn = function () {
    if (this.phase === PHASE.COMBAT_OVER) return null;
    this.turnIndex++;
    if (this.turnIndex >= this.turnOrder.length) {
      this.phase = PHASE.ROUND_END;
      if (this._onRoundEnd) this._onRoundEnd(this.getState());
      this.round++; this.turnIndex = 0; this.phase = PHASE.ROUND_START;
      this._log('--- Round ' + this.round + ' ---', 'narrative'); this._rechargeRound();
    }
    var id = this.turnOrder[this.turnIndex], actor = this._creature(id);
    if (actor && actor.isDown && id !== (this.dragon.id || 'dragon')) {
      this.currentActor = id; this.phase = PHASE.TURN_START; return this.advanceTurn();
    }
    this.currentActor = id; this.phase = PHASE.TURN_START;
    this.turnState = { hasUsedAction: false, hasUsedBonusAction: false,
      hasUsedReaction: false, hasUsedMovement: false,
      movementRemaining: actor ? (actor.speed || 30) : 30 };
    this.applyStartOfTurnEffects(id);
    var go = this.isGameOver();
    if (go.over) { this.phase = PHASE.COMBAT_OVER; this._log(go.reason, 'narrative');
      if (this._onCombatEnd) this._onCombatEnd(go); return null; }
    this.phase = PHASE.AWAITING_ACTION;
    if (this._onTurnStart) this._onTurnStart(id, this.getState());
    return id;
  };

  Engine.prototype.executeAction = function (actorId, action) {
    if (this.phase !== PHASE.AWAITING_ACTION && this.phase !== PHASE.RESOLVING)
      return { success: false, description: 'Not awaiting action.' };
    if (actorId !== this.currentActor)
      return { success: false, description: 'Not this creature\'s turn.' };
    this.phase = PHASE.RESOLVING;
    var actor = this._creature(actorId), res;
    if (!actor) return { success: false, description: 'Unknown actor.' };
    // Normalize AI action format
    var act = Object.assign({}, action);
    if (act.target && typeof act.target === 'object' && act.target.id) act.target = act.target.id;
    if (!act.target && this.dragon) act.target = this.dragon.id || 'dragon';
    // Normalize spell field: AI uses 'spell', engine expects 'spellId'
    if (act.spell && !act.spellId) act.spellId = act.spell;
    // Normalize ability field: AI uses 'ability', engine expects 'abilityId'
    if (act.ability && !act.abilityId) act.abilityId = act.ability;
    // Map common ability names to the ability action type
    var abilityTypes = ['rage','recklessAttack','cunningAction','layOnHands','huntersMark',
      'divineSmite','absorbElements','compelledDuel','shieldOfFaith','sneakAttack'];
    if (abilityTypes.indexOf(act.type) !== -1) { act.abilityId = act.type; act.type = 'ability'; }
    // Map common spell names to spell action type
    var spellTypes = ['cureWounds','cure_wounds','fireball','shield','counterspell','mistyStep',
      'magicMissile','magic_missile','scorchingRay','scorching_ray','sacredFlame','sacred_flame',
      'guidingBolt','guiding_bolt','spiritualWeapon','spiritual_weapon','spiritGuardians','spirit_guardians',
      'shieldOfFaith','shield_of_faith'];
    if (spellTypes.indexOf(act.type) !== -1) { act.spellId = act.type; act.type = 'spell'; }
    switch (act.type) {
      case 'attack': res = this._attack(actor, act); break;
      case 'spell': res = this._spell(actor, act); break;
      case 'ability': res = this._ability(actor, act); break;
      case 'move': res = this._move(actor, act); break;
      case 'dash': res = this._dash(actor); break;
      case 'dodge': res = this._dodge(actor); break;
      case 'disengage': res = this._disengage(actor); break;
      case 'hide': res = this._hide(actor, act); break;
      case 'end_turn': res = { success: true, description: actor.name + ' ends their turn.', events: [] }; break;
      case 'frightfulPresence': res = this._frightfulPresence(actor); break;
      case 'breathWeapon': res = this._breathWeapon(actor, act); break;
      case 'wingAttack': res = this._wingAttack(actor); break;
      default: res = { success: false, description: 'Unknown action: ' + act.type }; break;
    }
    if (res.success && res.description) this._log(res.description, res.logType || 'attack');
    this._updatePhase(); this.phase = PHASE.AWAITING_ACTION;
    return res;
  };

  Engine.prototype.executeDragonTurn = function (actions) {
    if (!actions || !actions.length) return [];
    var out = [], did = this.dragon.id || 'dragon';
    // Ensure currentActor matches dragon id for the turn check in executeAction
    this.currentActor = did;
    this.phase = PHASE.AWAITING_ACTION;
    for (var i = 0; i < actions.length; i++)
      out.push(this.executeAction(did, actions[i]));
    return out;
  };

  Engine.prototype.executeLegendaryAction = function (type) {
    var d = this.dragon, r = R();
    if (d.legendaryActions <= 0) return { success: false, description: 'No legendary actions remaining.' };
    var res = { success: true, damage: 0, events: [] };
    if (type === 'tail') {
      d.legendaryActions--;
      var t = this._nearest(d.position);
      if (t && M().isAdjacent(d.position, t.position)) {
        var w = (d.attacks && d.attacks.tail) || { damage: '2d8+7', type: 'bludgeoning' };
        var a = r.resolveAttack(d, t, w);
        if (a.hit) { r.applyDamage(t, a.damage); this._checkDown(t); res.damage = a.damage;
          res.description = (d.name||'Dragon') + ' tail strikes ' + t.name + (a.crit?' (CRIT)':'') + ' for ' + a.damage + '!';
        } else { res.description = (d.name||'Dragon') + ' tail swipes at ' + t.name + ' but misses!'; }
        res.rolls = a;
      } else { res.description = (d.name||'Dragon') + ' lashes its tail but no one is in reach.'; }
    } else if (type === 'wing') {
      if (d.legendaryActions < 2) return { success: false, description: 'Need 2 legendary actions for wing attack.' };
      d.legendaryActions -= 2;
      var adj = this._adjParty(d.position), desc = [];
      for (var i = 0; i < adj.length; i++) {
        var ww = (d.attacks && d.attacks.wing) || { damage: '2d6+7', type: 'bludgeoning' };
        var wa = r.resolveAttack(d, adj[i], ww);
        if (wa.hit) { r.applyDamage(adj[i], wa.damage); this._checkDown(adj[i]);
          desc.push(adj[i].name + ': ' + wa.damage + ' dmg'); res.damage += wa.damage;
        } else { desc.push(adj[i].name + ' dodges'); }
      }
      res.description = (d.name||'Dragon') + ' beats its wings! ' + (desc.join(', ') || 'No targets.');
    } else { return { success: false, description: 'Unknown legendary action.' }; }
    this._log(res.description, 'attack'); return res;
  };

  Engine.prototype.checkDeathSave = function (charId) {
    var m = this._member(charId);
    if (!m || !m.isDown) return { success: false, description: 'Not downed.' };
    var roll = R().rollD20(), res = { roll: roll, success: true, events: [] };
    if (roll === 20) {
      m.hp = 1; m.currentHp = 1; m.isDown = false; m.deathSaves = { successes: 0, failures: 0 };
      res.description = m.name + ' rolls nat 20! Back up with 1 HP!'; res.events.push('critical_success');
      this._log(res.description, 'heal');
    } else if (roll === 1) {
      m.deathSaves.failures += 2; res.description = m.name + ' rolls nat 1! Two failures!';
      res.events.push('critical_fail'); this._log(res.description, 'death');
    } else if (roll >= 10) {
      m.deathSaves.successes++; res.description = m.name + ' death save ' + roll + ': success (' + m.deathSaves.successes + '/3).';
      res.events.push('success'); this._log(res.description, 'status');
    } else {
      m.deathSaves.failures++; res.description = m.name + ' death save ' + roll + ': failure (' + m.deathSaves.failures + '/3).';
      res.events.push('fail'); this._log(res.description, 'status');
    }
    if (m.deathSaves.successes >= 3) { m.deathSaves.successes = 3;
      this._log(m.name + ' stabilizes!', 'status'); res.events.push('stabilized'); }
    if (m.deathSaves.failures >= 3) { m.deathSaves.failures = 3;
      this._log(m.name + ' has died!', 'death'); res.events.push('dead'); }
    res.deathSaves = { successes: m.deathSaves.successes, failures: m.deathSaves.failures };
    return res;
  };

  Engine.prototype.endTurn = function () { this.phase = PHASE.TURN_END; return this.advanceTurn(); };

  Engine.prototype.isGameOver = function () {
    var allDown = true;
    for (var i = 0; i < this.party.length; i++)
      if (!this.party[i].isDown || this.party[i].hp > 0) { allDown = false; break; }
    if (allDown && this.party.length > 0)
      return { over: true, victory: false, reason: 'The party has been slain.' };
    if (this.dragon && this.dragon.hp <= 0)
      return { over: true, victory: true, reason: 'The dragon is slain! Victory!' };
    return { over: false, victory: false, reason: '' };
  };

  Engine.prototype.onRoundEnd  = function (cb) { this._onRoundEnd  = cb; };
  Engine.prototype.onTurnStart = function (cb) { this._onTurnStart = cb; };
  Engine.prototype.onCombatEnd = function (cb) { this._onCombatEnd = cb; };
  Engine.prototype.getCombatLog = function () { return this.combatLog.slice(); };

  Engine.prototype.getValidActions = function (actorId) {
    var actor = this._creature(actorId); if (!actor) return [];
    var acts = [], ts = this.turnState || {};
    if (ts.movementRemaining > 0) acts.push({ type: 'move', label: 'Move' });
    if (!ts.hasUsedAction) {
      var targets = this._targets(actor);
      for (var t = 0; t < targets.length; t++)
        acts.push({ type: 'attack', label: 'Attack ' + targets[t].name, target: targets[t].id });
      if (actor.spells && actor.spellSlots)
        for (var s = 0; s < actor.spells.length; s++) {
          var sp = actor.spells[s], lv = sp.level || 0;
          if (lv === 0 || actor.spellSlots.available(lv) > 0)
            acts.push({ type: 'spell', label: 'Cast ' + sp.name, spellId: sp.id, spellLevel: lv });
        }
      acts.push({ type: 'dash', label: 'Dash' }, { type: 'dodge', label: 'Dodge' },
        { type: 'disengage', label: 'Disengage' }, { type: 'hide', label: 'Hide' });
    }
    if (!ts.hasUsedBonusAction && actor.abilityList)
      for (var a = 0; a < actor.abilityList.length; a++) {
        var ab = actor.abilityList[a];
        if (ab.bonusAction) acts.push({ type: 'ability', label: ab.name, abilityId: ab.id });
      }
    acts.push({ type: 'end_turn', label: 'End Turn' }); return acts;
  };

  Engine.prototype.applyStartOfTurnEffects = function (id) {
    var c = this._creature(id); if (!c || !c.position) return;
    var r = R(), map = M();
    if (map.isLava(c.position.row, c.position.col)) {
      var ld = r.rollDice('2d10').total; r.applyDamage(c, ld);
      this._log(c.name + ' takes ' + ld + ' fire damage from lava!', 'damage'); this._checkDown(c);
    }
    if (id === (this.dragon.id || 'dragon'))
      for (var i = 0; i < this.party.length; i++) {
        var pm = this.party[i];
        if (pm.concentrating === 'spirit_guardians' && !pm.isDown &&
            map.getDistance(pm.position, c.position) <= 3) {
          var dc = pm.spellSaveDC || 14, sv = r.makeSave(c, 'wis', dc);
          var sd = r.rollDice('3d8').total; if (sv.success) sd = Math.floor(sd / 2);
          r.applyDamage(c, sd);
          this._log(c.name + ' takes ' + sd + ' radiant from Spirit Guardians' + (sv.success ? ' (saved)' : '') + '!', 'damage');
        }
      }
    if (c.conditions && c.conditions.indexOf('frightened') !== -1)
      this._log(c.name + ' is frightened.', 'status');
    if (c.conditionTimers) {
      var expired = [];
      for (var k in c.conditionTimers) if (c.conditionTimers.hasOwnProperty(k)) {
        c.conditionTimers[k]--; if (c.conditionTimers[k] <= 0) expired.push(k);
      }
      for (var e = 0; e < expired.length; e++) {
        this._rmCond(c, expired[e]); delete c.conditionTimers[expired[e]];
        this._log(c.name + ' is no longer ' + expired[e] + '.', 'status');
      }
    }

    // Collapsible pillars (happens at random in castle maps after round 3)
    if (this.round > 3 && Math.random() < 0.05) {
      var map = M();
      for (var pi = 0; pi < this.party.length; pi++) {
        var p = this.party[pi];
        if (p.position && map && map.getTile && map.getTile(p.position.row, p.position.col) === 4) {
          var r2 = R();
          var pillarSave = r2.makeSave(p, 'dex', 13);
          if (!pillarSave.success) {
            var pillarDmg = r2.rollDice('2d6').total;
            r2.applyDamage(p, pillarDmg);
            this._log('A pillar collapses near ' + p.name + '! ' + pillarDmg + ' bludgeoning damage!', 'damage');
            this._checkDown(p);
          } else {
            this._log(p.name + ' dodges the falling pillar!', 'status');
          }
          break; // Only one per round
        }
      }
    }

    // Spreading fire (dragon lair - lava creep after round 5)
    if (this.round > 5 && this.mapState && Math.random() < 0.08) {
      this._log('The ground trembles as lava seeps into new areas!', 'narrative');
    }
  };

  // --- Dragon-specific action resolvers ---
  Engine.prototype._frightfulPresence = function (actor) {
    var r = R(), dc = actor.frightfulDC || 16, evts = [];
    for (var i = 0; i < this.party.length; i++) {
      var m = this.party[i]; if (m.isDown) continue;
      var sv = r.makeSave(m, 'wis', dc);
      if (!sv.success) { this._addCond(m, 'frightened'); m.conditionTimers = m.conditionTimers || {};
        m.conditionTimers.frightened = 10; evts.push(m.name + ' is frightened!'); }
      else evts.push(m.name + ' resists fear.');
    }
    actor.usedFrightful = true;
    return { success: true, description: (actor.name||'Dragon') + ' uses Frightful Presence! ' + evts.join(' '), events: evts, logType: 'status' };
  };

  Engine.prototype._breathWeapon = function (actor, act) {
    var r = R(), map = M(), dc = actor.breathDC || 18, evts = [], totalDmg = 0;
    var coneSquares = (map && map.getSquaresInCone) ? map.getSquaresInCone(actor.position, act.direction || {row:1,col:0}, 6) : [];
    for (var i = 0; i < this.party.length; i++) {
      var m = this.party[i]; if (m.isDown || !m.position) continue;
      var inCone = false;
      for (var j = 0; j < coneSquares.length; j++) {
        if (coneSquares[j].row === m.position.row && coneSquares[j].col === m.position.col) { inCone = true; break; }
      }
      if (!inCone) continue;
      var dmg = r.rollDice(actor.breathDamage || '12d6').total;
      var sv = r.makeSave(m, 'dex', dc);
      if (sv.success) dmg = Math.floor(dmg / 2);
      r.applyDamage(m, dmg); this._checkDown(m); totalDmg += dmg;
      evts.push(m.name + ': ' + dmg + (sv.success ? ' (saved)' : ''));
    }
    actor.breathRecharge = 5;
    return { success: true, description: (actor.name||'Dragon') + ' unleashes fire breath! ' + evts.join(', '), damage: totalDmg, events: evts, logType: 'damage' };
  };

  Engine.prototype._wingAttack = function (actor) {
    var r = R(), map = M(), evts = [], totalDmg = 0, dc = actor.wingDC || 16;
    for (var i = 0; i < this.party.length; i++) {
      var m = this.party[i]; if (m.isDown || !m.position) continue;
      if (!map.isAdjacent(actor.position, m.position)) continue;
      var dmg = r.rollDice('2d6+7').total;
      var sv = r.makeSave(m, 'dex', dc);
      if (sv.success) { dmg = 0; evts.push(m.name + ' dodges'); }
      else { r.applyDamage(m, dmg); this._checkDown(m); totalDmg += dmg;
        this._addCond(m, 'prone'); evts.push(m.name + ': ' + dmg + ' + prone'); }
    }
    return { success: true, description: (actor.name||'Dragon') + ' wing attack! ' + (evts.join(', ') || 'No targets.'), damage: totalDmg, events: evts, logType: 'damage' };
  };

  // --- Private action resolvers ---
  Engine.prototype._attack = function (actor, act) {
    // Dragon multiattack: don't block on hasUsedAction for the dragon
    var isDragon = (actor === this.dragon || actor.id === (this.dragon && this.dragon.id || 'dragon'));
    // Party members with Extra Attack / Multiattack get a second attack per action
    if (!isDragon && this.turnState.hasUsedAction) {
      var hasExtraAttack = (actor.abilities && (actor.abilities.extraAttack || actor.abilities.multiattack)) ||
                           act.multiattack;
      if (!hasExtraAttack || this.turnState._attackCount >= 2) {
        return { success: false, description: 'Action used.' };
      }
    }
    var tgt = this._creature(act.target); if (!tgt) return { success: false, description: 'Invalid target.' };
    var r = R(), w;
    // Support dragon attackName (bite, claw, tail)
    if (act.attackName && actor.attacks && actor.attacks[act.attackName]) {
      w = actor.attacks[act.attackName];
    } else {
      w = this._weapon(actor, act);
    }
    // If attacker is hidden, grant advantage via temporary condition
    var wasHidden = !!(actor.hidden || (actor.conditions && actor.conditions.indexOf('hidden') !== -1));
    var atk = r.resolveAttack(actor, tgt, w), evts = [];
    // After attacking from stealth, remove hidden
    if (wasHidden) {
      actor.hidden = false; this._rmCond(actor, 'hidden');
      evts.push('Attacks from stealth!');
    }
    if (atk.hit) {
      var dmg = atk.damage, cls = actor.className || actor.class || '';
      // Dragon bite extra fire damage
      if (isDragon && w.extraDamage) {
        var extraDmg = r.rollDice(w.extraDamage).total; dmg += extraDmg;
        evts.push('+' + extraDmg + ' ' + (w.extraDamageType || 'fire'));
      }
      if (cls === 'Rogue') { var sd = r.rollDice(actor.sneakAttackDice || '3d6').total; dmg += sd; evts.push('Sneak Attack +' + sd); }
      if (cls === 'Ranger' && tgt.hp < (tgt.maxHp || tgt.maxHP)) { var cd = r.rollDice('1d8').total; dmg += cd; evts.push('Colossus Slayer +' + cd); }
      // Hunter's Mark bonus damage
      if (actor.huntersMarkTarget && (actor.huntersMarkTarget === tgt.id || actor.huntersMarkTarget === tgt)) {
        var hmd = r.rollDice('1d6').total; dmg += hmd; evts.push("Hunter's Mark +" + hmd);
      }
      if (cls === 'Paladin' && actor.spellSlots && actor.spellSlots.available(1) > 0) {
        actor.spellSlots.use(1); var sm = r.rollDice('2d8').total; dmg += sm; evts.push('Divine Smite +' + sm); }
      r.applyDamage(tgt, dmg); this._checkDown(tgt);
      if (!isDragon) { this.turnState.hasUsedAction = true; this.turnState._attackCount = (this.turnState._attackCount || 0) + 1; }
      // Flavor text for attacks
      var d;
      var wName = (w && w.name) || (act.attackName) || 'weapon';
      var wType = (w && w.type) || 'slashing';
      if (atk.crit) {
        d = actor.name + ' finds a gap between scales \u2014 CRITICAL HIT! ' + dmg + ' ' + wType + ' damage!';
      } else {
        var hitVerbs = ['bites deep into', 'strikes', 'slashes across', 'connects solidly with', 'tears into'];
        var hitVerb = hitVerbs[Math.floor(Math.random() * hitVerbs.length)];
        d = actor.name + '\'s ' + wName + ' ' + hitVerb + ' ' + tgt.name + ' \u2014 ' + dmg + ' ' + wType + ' damage!';
      }
      if (evts.length) d += ' [' + evts.join('; ') + ']';
      return { success: true, description: d, damage: dmg, critical: !!atk.crit, rolls: atk, events: evts, logType: 'damage',
        actor: actor.id, actorName: actor.name, targetName: tgt.name };
    }
    if (!isDragon) { this.turnState.hasUsedAction = true; this.turnState._attackCount = (this.turnState._attackCount || 0) + 1; }
    var missFlavors = [
      actor.name + '\'s ' + ((w && w.name) || 'weapon') + ' glances off ' + tgt.name + ' (' + atk.attackRoll + ' vs AC ' + tgt.ac + ').',
      actor.name + ' swings wide, missing ' + tgt.name + ' entirely (' + atk.attackRoll + ' vs AC ' + tgt.ac + ').',
      actor.name + '\'s strike passes harmlessly through the air (' + atk.attackRoll + ' vs AC ' + tgt.ac + ').'
    ];
    return { success: true, description: missFlavors[Math.floor(Math.random() * missFlavors.length)],
      damage: 0, miss: true, rolls: atk, events: [], logType: 'attack',
      actor: actor.id, actorName: actor.name, targetName: tgt.name };
  };

  Engine.prototype._spell = function (actor, act) {
    // Check if this is a bonus action spell
    var ch = C(), spellCheck = ch.getSpell ? ch.getSpell(act.spellId) : null;
    if (!spellCheck && actor.abilities) {
      for (var sk in actor.abilities) if (actor.abilities.hasOwnProperty(sk) && (sk === act.spellId || sk.toLowerCase() === (act.spellId||'').toLowerCase())) { spellCheck = actor.abilities[sk]; break; }
    }
    var isBonusSpell = spellCheck && spellCheck.actionType === 'bonus';
    if (isBonusSpell) {
      if (this.turnState.hasUsedBonusAction) return { success: false, description: 'Bonus action used.' };
    } else {
      if (this.turnState.hasUsedAction) return { success: false, description: 'Action used.' };
    }
    var ch = C(), spell = ch.getSpell ? ch.getSpell(act.spellId) : null;
    // Also search actor's own abilities for the spell
    if (!spell && actor.abilities) {
      for (var sk in actor.abilities) if (actor.abilities.hasOwnProperty(sk)) {
        var sa = actor.abilities[sk];
        if (sa && sa.type === 'spell' && (sk === act.spellId || sk.toLowerCase() === (act.spellId||'').toLowerCase())) { spell = sa; break; }
      }
    }
    if (!spell) return { success: false, description: 'Unknown spell: ' + (act.spellId || '?') };
    var lv = act.spellLevel || spell.slotLevel || spell.level || 0, r = R();
    if (lv > 0) {
      var slots = actor.spellSlots || (actor.spellSlotsRemaining ? { use: function(l) { var k = String(l); if (actor.spellSlotsRemaining[k] > 0) { actor.spellSlotsRemaining[k]--; return true; } return false; }, available: function(l) { return actor.spellSlotsRemaining[String(l)] || 0; } } : null);
      if (!slots || !slots.use(lv)) return { success: false, description: 'No level ' + lv + ' slots.' };
    }
    var res = { success: true, damage: 0, healing: 0, events: [], rolls: null };
    var spellIsDamage = spell.damage && !spell.healing;
    var spellIsHeal = !!spell.healing || (act.spellId && act.spellId.toLowerCase().indexOf('cure') !== -1);
    if (spellIsDamage) {
      var tgt = this._creature(act.target); if (!tgt) return { success: false, description: 'Invalid target.' };
      var dmg = r.rollDice(spell.damage).total;
      if (spell.save) { var sv = r.makeSave(tgt, spell.save, actor.spellSaveDC || 14);
        if (sv.success) dmg = Math.floor(dmg / 2); res.events.push(sv.success ? 'saved' : 'failed save'); }
      r.applyDamage(tgt, dmg); this._checkDown(tgt); res.damage = dmg;
      // Spell-specific flavor text
      var spellFlavor = {
        'Sacred Flame': 'A pillar of holy fire descends upon ' + tgt.name,
        'Scorching Ray': 'Rays of fire streak across the cave',
        'Magic Missile': 'Glowing darts of force slam unerringly into ' + tgt.name,
        'Fireball': 'A bead of fire erupts into a devastating explosion',
        'Guiding Bolt': 'A flash of brilliant light streaks toward ' + tgt.name,
        'Fire Bolt': 'A mote of flame hurls toward ' + tgt.name,
        'Ray of Frost': 'A frigid beam of blue-white light streaks toward ' + tgt.name,
        'Lightning Bolt': 'A bolt of lightning arcs through the cavern'
      };
      var flav = spellFlavor[spell.name];
      if (flav) {
        res.description = flav + ' \u2014 ' + dmg + ' ' + (spell.damageType || 'magical') + ' damage!';
      } else {
        res.description = actor.name + ' casts ' + spell.name + ' \u2014 arcane energy erupts against ' + tgt.name + ' for ' + dmg + ' damage!';
      }
      res.logType = 'damage'; res.actor = actor.id; res.actorName = actor.name; res.targetName = tgt.name;
    } else if (spellIsHeal) {
      var ht = this._creature(act.target) || actor;
      var healed = r.applyHealing(ht, r.rollDice(spell.healing || spell.damage).total);
      if (ht.isDown && healed > 0) { ht.isDown = false; ht.deathSaves = { successes: 0, failures: 0 }; }
      res.healing = healed;
      // Healing flavor text
      var healFlavor = {
        'Cure Wounds': 'Warm golden light knits wounds closed \u2014 ' + actor.name + ' heals ' + ht.name + ' for ' + healed + '!',
        'Healing Word': 'A whispered prayer carries divine energy \u2014 ' + ht.name + ' regains ' + healed + ' HP!',
        'Mass Cure Wounds': 'A wave of restorative energy washes over the party \u2014 ' + healed + ' HP restored!'
      };
      res.description = healFlavor[spell.name] || (actor.name + ' channels healing magic into ' + ht.name + ' \u2014 ' + healed + ' HP restored!');
      res.logType = 'heal'; res.actor = actor.id; res.actorName = actor.name;
    } else {
      var bt = this._creature(act.target) || actor;
      if (spell.condition) this._addCond(bt, spell.condition);
      if (spell.concentration) { actor.concentrating = act.spellId; r.applyStatus(actor, 'concentrating'); }
      // Hunter's Mark: track the marked target on the actor
      if (act.spellId && act.spellId.toLowerCase().replace(/[_']/g,'') === 'huntersmark') {
        actor.huntersMarkTarget = act.target;
        actor.concentrating = 'huntersMark';
      }
      res.description = actor.name + ' casts ' + spell.name + '!'; res.logType = 'status';
    }
    if (isBonusSpell) this.turnState.hasUsedBonusAction = true;
    else this.turnState.hasUsedAction = true;
    return res;
  };

  Engine.prototype._ability = function (actor, act) {
    var ch = C(), abId = act.abilityId || act.type;
    var ab = ch.getAbility ? ch.getAbility(actor.id, abId) : null;
    // Search actor's own abilities
    if (!ab && actor.abilities) {
      for (var ak in actor.abilities) if (actor.abilities.hasOwnProperty(ak)) {
        if (ak === abId || ak.toLowerCase() === (abId||'').toLowerCase().replace(/_/g,'')) { ab = actor.abilities[ak]; break; }
      }
    }
    if (!ab && actor.abilityList) for (var i = 0; i < actor.abilityList.length; i++)
      if (actor.abilityList[i].id === abId) { ab = actor.abilityList[i]; break; }
    // Fallback: handle known abilities even without definition
    if (!ab) {
      var knownAbilities = { rage: { bonusAction: true }, cunningAction: { bonusAction: true },
        huntersMark: { bonusAction: true }, recklessAttack: { bonusAction: false },
        compelledDuel: { bonusAction: true }, shieldOfFaith: { bonusAction: true } };
      ab = knownAbilities[abId] || knownAbilities[abId.replace(/_/g,'')] || null;
    }
    if (!ab) return { success: false, description: 'Unknown ability: ' + abId };
    if (ab.bonusAction) { if (this.turnState.hasUsedBonusAction) return { success: false, description: 'Bonus action used.' };
      this.turnState.hasUsedBonusAction = true;
    } else { if (this.turnState.hasUsedAction) return { success: false, description: 'Action used.' };
      this.turnState.hasUsedAction = true; }
    var r = R(), res = { success: true, events: [], logType: 'status' };
    switch (act.abilityId) {
      case 'rage': this._addCond(actor, 'raging'); res.description = actor.name + '\'s muscles swell with primal fury \u2014 RAGE!'; break;
      case 'cunning_action': res.description = actor.name + ' darts with uncanny reflexes \u2014 Cunning Action!'; break;
      case 'lay_on_hands':
        var lt = this._creature(act.target) || actor;
        var amt = Math.min(actor.layOnHandsPool || 25, (lt.maxHp || lt.maxHP) - lt.hp);
        if (amt > 0) { r.applyHealing(lt, amt); actor.layOnHandsPool = (actor.layOnHandsPool || 25) - amt;
          if (lt.isDown) { lt.isDown = false; lt.deathSaves = { successes: 0, failures: 0 }; } }
        res.description = actor.name + '\'s hands glow with divine warmth \u2014 heals ' + lt.name + ' for ' + amt + ' HP!'; res.logType = 'heal'; break;
      case 'second_wind':
        var sw = r.rollDice('1d10+5').total; r.applyHealing(actor, sw);
        res.description = actor.name + ' draws upon inner reserves \u2014 Second Wind restores ' + sw + ' HP!'; res.logType = 'heal'; break;
      default: res.description = actor.name + ' channels ' + (ab.name || act.abilityId) + ' with practiced skill!'; break;
    }
    return res;
  };

  Engine.prototype._move = function (actor, act) {
    var tp = act.targetPos; if (!tp) return { success: false, description: 'No target position.' };
    var map = M(), path = map.findPath(actor.position, tp);
    if (!path || path.length < 2) return { success: false, description: 'No valid path.' };
    // Allow partial movement: move as far along the path as movement allows
    var budget = Math.floor(this.turnState.movementRemaining / 5);
    var cost = 0, lastReachable = 0;
    for (var i = 1; i < path.length; i++) {
      var stepCost = map.getMovementCost(path[i].row, path[i].col);
      if (cost + stepCost > budget) break;
      cost += stepCost;
      lastReachable = i;
    }
    if (lastReachable < 1) return { success: false, description: 'Not enough movement.' };
    var partialPath = path.slice(0, lastReachable + 1);
    var dest = partialPath[partialPath.length - 1];
    var oa = actor._disengaging ? [] : this._oaCheck(actor, partialPath);
    var old = { row: actor.position.row, col: actor.position.col };
    actor.position = { row: dest.row, col: dest.col };
    this.turnState.movementRemaining -= cost * 5; this.turnState.hasUsedMovement = true;
    var d = actor.name + ' moves to (' + dest.row + ',' + dest.col + ').';
    if (oa.length) d += ' ' + oa.join(' ');
    return { success: true, description: d, events: oa, logType: 'status' };
  };

  Engine.prototype._dash = function (a) {
    if (this.turnState.hasUsedAction) return { success: false, description: 'Action used.' };
    this.turnState.hasUsedAction = true; this.turnState.movementRemaining += (a.speed || 30);
    return { success: true, description: a.name + ' dashes!', events: [], logType: 'status' };
  };
  Engine.prototype._dodge = function (a) {
    if (this.turnState.hasUsedAction) return { success: false, description: 'Action used.' };
    this.turnState.hasUsedAction = true; this._addCond(a, 'dodging');
    return { success: true, description: a.name + ' dodges!', events: [], logType: 'status' };
  };
  Engine.prototype._disengage = function (a) {
    if (this.turnState.hasUsedAction) return { success: false, description: 'Action used.' };
    this.turnState.hasUsedAction = true; a._disengaging = true;
    return { success: true, description: a.name + ' disengages.', events: [], logType: 'status' };
  };
  Engine.prototype._hide = function (a, act) {
    // Rogues can Hide as a bonus action via Cunning Action
    var cls = (a.className || a.class || '').toLowerCase();
    var isBonus = (act && act.actionCost === 'bonus') || cls === 'rogue';
    if (isBonus) {
      if (this.turnState.hasUsedBonusAction) return { success: false, description: 'Bonus action used.' };
      this.turnState.hasUsedBonusAction = true;
    } else {
      if (this.turnState.hasUsedAction) return { success: false, description: 'Action used.' };
      this.turnState.hasUsedAction = true;
    }
    this._addCond(a, 'hidden'); a.hidden = true;
    var hstats = a.stats || a.abilities || {};
    var roll = R().rollD20() + R().getModifier(hstats.dex || 10);
    return { success: true, description: a.name + ' melts into the shadows (Stealth ' + roll + ').', events: [], logType: 'status' };
  };

  // --- Private helpers ---
  Engine.prototype._creature = function (id) {
    if (id === (this.dragon.id || 'dragon')) return this.dragon;
    return this._member(id);
  };
  Engine.prototype._member = function (id) {
    for (var i = 0; i < this.party.length; i++) if (this.party[i].id === id) return this.party[i];
    return null;
  };
  Engine.prototype._weapon = function (a, act) {
    // Check for equipped campaign weapon
    if (a._equipDamage) return { damage: a._equipDamage, type: 'magical', ranged: false };
    if (a.attacks && act.weaponId && a.attacks[act.weaponId]) return a.attacks[act.weaponId];
    if (a.attacks && a.attacks.primary) return a.attacks.primary;
    // Search weapons array (party members)
    if (a.weapons && a.weapons.length > 0) {
      if (act.weapon) {
        for (var i = 0; i < a.weapons.length; i++) {
          if (a.weapons[i].name && a.weapons[i].name.toLowerCase().indexOf(act.weapon.toLowerCase()) !== -1) return a.weapons[i];
        }
      }
      // Default: pick melee or ranged based on action
      if (act.ranged) {
        for (var j = 0; j < a.weapons.length; j++) { if (a.weapons[j].ranged || a.weapons[j].type === 'ranged') return a.weapons[j]; }
      }
      return a.weapons[0];
    }
    return { damage: '1d8+3', type: 'slashing', ranged: false };
  };
  Engine.prototype._targets = function (actor) {
    var out = [];
    if (actor === this.dragon) {
      for (var i = 0; i < this.party.length; i++)
        if (!this.party[i].isDown && this.party[i].position) out.push(this.party[i]);
    } else if (this.dragon && this.dragon.hp > 0) out.push(this.dragon);
    return out;
  };
  Engine.prototype._nearest = function (pos) {
    var map = M(), best = null, min = Infinity;
    for (var i = 0; i < this.party.length; i++) {
      var m = this.party[i]; if (m.isDown || !m.position) continue;
      var d = map.getDistance(pos, m.position); if (d < min) { min = d; best = m; }
    } return best;
  };
  Engine.prototype._adjParty = function (pos) {
    var map = M(), out = [];
    for (var i = 0; i < this.party.length; i++) {
      var m = this.party[i]; if (!m.isDown && m.position && map.isAdjacent(pos, m.position)) out.push(m);
    } return out;
  };
  Engine.prototype._checkDown = function (c) {
    if (c.hp <= 0 && c !== this.dragon) { c.hp = 0; c.currentHp = 0; c.isDown = true;
      c.deathSaves = { successes: 0, failures: 0 }; this._log(c.name + ' falls!', 'death'); }
  };
  Engine.prototype._oaCheck = function (mover, path) {
    var r = R(), evts = [], enemies = (mover === this.dragon) ? this.party : [this.dragon];
    for (var s = 1; s < path.length; s++) {
      for (var e = 0; e < enemies.length; e++) {
        var en = enemies[e]; if (!en || en.isDown || en.hp <= 0) continue;
        if (r.canOpportunityAttack(en, path[s-1], path[s])) {
          var atk = r.resolveAttack(en, mover, this._weapon(en, {}));
          if (atk.hit) { r.applyDamage(mover, atk.damage); this._checkDown(mover);
            evts.push(en.name + ' OA hits for ' + atk.damage + '!');
            this._log(en.name + ' OA hits ' + mover.name + ' for ' + atk.damage + '!', 'attack');
          } else evts.push(en.name + ' OA misses!');
        }
      }
    } return evts;
  };
  Engine.prototype._addCond = function (c, cond) {
    if (!c.conditions) c.conditions = [];
    if (c.conditions.indexOf(cond) === -1) c.conditions.push(cond);
  };
  Engine.prototype._rmCond = function (c, cond) {
    if (!c.conditions) return; var i = c.conditions.indexOf(cond);
    if (i !== -1) c.conditions.splice(i, 1);
  };
  Engine.prototype._rechargeRound = function () {
    var d = this.dragon; if (!d) return;
    d.legendaryActions = d.maxLegendaryActions || 3;
    if (d.breathRecharge > 0) {
      if (R().rollD(6) >= 5) { d.breathRecharge = 0; this._log((d.name||'Dragon') + ' breath recharges!', 'status'); }
      else d.breathRecharge--;
    }
    for (var i = 0; i < this.party.length; i++) { this._rmCond(this.party[i], 'dodging'); this.party[i]._disengaging = false; }
    this._rmCond(d, 'dodging'); d._disengaging = false;
  };
  Engine.prototype._updatePhase = function () {
    var d = this.dragon; if (!d) return;
    var pct = d.hp / (d.maxHp || d.maxHP || 1);
    var oldPhase = d.phaseLabel;
    d.phaseLabel = pct > 0.66 ? 'Healthy' : pct > 0.33 ? 'Bloodied' : pct > 0 ? 'Desperate' : 'Defeated';

    // Fire phase transition event
    if (oldPhase && oldPhase !== d.phaseLabel) {
      if (d.phaseLabel === 'Bloodied') {
        this._log('--- PHASE CHANGE: The ' + (d.name || 'Dragon') + ' roars in fury! Blood streams from its wounds! ---', 'narrative');
        // Bloodied boss gets a free Frightful Presence
        if (d.abilities && d.abilities.frightfulPresence && !d.usedFrightful) {
          this._log((d.name || 'Dragon') + ' uses Frightful Presence! All heroes must make WIS saves!', 'status');
        }
      } else if (d.phaseLabel === 'Desperate') {
        this._log('--- PHASE CHANGE: The ' + (d.name || 'Dragon') + ' is desperate! Its attacks become frenzied! ---', 'narrative');
        // Desperate boss gets +2 attack bonus
        d.attackBonus = (d.attackBonus || 14) + 2;
        d.legendaryActions = Math.min((d.legendaryActions || 0) + 1, 5);
      }
    }
  };
  Engine.prototype._log = function (text, type) {
    this.combatLog.push({ text: text, type: type || 'status', round: this.round, turn: this.turnIndex });
    if (this.combatLog.length > 200) this.combatLog = this.combatLog.slice(-100);
  };

  root.MJ.Dragon.Engine = Object.freeze({ PHASE: PHASE, create: function () { return new Engine(); } });
  console.log('[Dragon] Engine module loaded');
})(typeof window !== 'undefined' ? window : this);
