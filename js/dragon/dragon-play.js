/**
 * dragon-play.js — D&D dragon battle game orchestrator/manager.
 * Connects DragonCombatEngine + DragonPartyAI + DragonBrainAI + Renderer + UI + Dialogue.
 * Creates a full-screen overlay where the human controls one party member.
 * Exports under root.MJ.Dragon.Play
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};  root.MJ.Dragon = root.MJ.Dragon || {};

  var Engine  = function() { return root.MJ.Dragon.Engine; };
  var AI      = function() { return root.MJ.Dragon.AI; };
  var Ren     = function() { return root.MJ.Dragon.Renderer; };
  var UI      = function() { return root.MJ.Dragon.UI; };
  var Dlg     = function() { return root.MJ.Dragon.Dialogue; };
  var Chars   = function() { return root.MJ.Dragon.Characters; };
  var Map     = function() { return root.MJ.Dragon.Map; };
  var TB      = function() { return root.MJ.GameTutorBridge; };

  function el(tag, css, html) {
    var d = document.createElement(tag);
    if (css) d.style.cssText = css; if (html) d.innerHTML = html; return d;
  }

  class DragonGameManager {
    constructor() {
      this.engine = null; this.renderer = null; this.ui = null;
      this.partyAI = null; this.dragonAI = null; this.overlay = null;
      this.running = false; this.autoPlay = false; this.autoPlaySpeed = 1;
      this.sharedSystems = null; this.humanCharacterId = null;
      this._tutorBridge = null; this._gameLoopTimer = null;
      this._boundHandleKey = null; this._humanActionResolver = null;
    }

    playSound(n) { try { if (this.sharedSystems && this.sharedSystems.sound) this.sharedSystems.sound.play(n); } catch(e) {} }
    sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

    init(sharedSystems) {
      this.sharedSystems = sharedSystems || {};
      var tb = TB();
      if (tb && tb.GameTutorBridge && sharedSystems.ollamaClient)
        this._tutorBridge = new tb.GameTutorBridge(sharedSystems.ollamaClient);
      var ai = AI();
      if (ai && ai.DragonPartyAI) this.partyAI = new ai.DragonPartyAI();
      if (ai && ai.DragonBrainAI) this.dragonAI = new ai.DragonBrainAI();
    }

    start() {
      if (this.running) return;
      this.createOverlay();
      this._showCharacterSelect();
    }

    _showCharacterSelect() {
      var area = document.getElementById('dragon-game-area'); if (!area) return;
      var ch = Chars(), data = ch ? ch.CHARACTERS : null;
      var ids = ch ? ch.CHARACTER_IDS : ['kenji','mei','yuki','riku','tomoe','sora'];
      var html = '<div style="text-align:center;padding:40px 20px;">' +
        '<h2 style="color:#e8b830;font-size:24px;margin-bottom:8px;">Dragon\'s Lair</h2>' +
        '<p style="color:#aaa;font-size:14px;margin-bottom:24px;">Choose your champion</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;">';
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i], c = data ? data[id] : null;
        html += '<button class="dragon-char-btn" data-char-id="' + id + '" style="padding:16px 20px;' +
          'background:rgba(0,0,0,0.4);border:2px solid ' + (c?c.color:'#888') + ';border-radius:10px;' +
          'color:#e0e0e0;cursor:pointer;min-width:120px;text-align:center;">' +
          '<div style="font-size:32px;">' + (c?c.avatar:'?') + '</div>' +
          '<div style="color:' + (c?c.color:'#888') + ';font-weight:bold;font-size:14px;margin:4px 0;">' + (c?c.name:id) + '</div>' +
          '<div style="color:#aaa;font-size:12px;">' + (c?c.class:'???') + '</div>' +
          '<div style="color:#4ade80;font-size:11px;">HP: ' + (c?c.hp:'?') + '</div></button>';
      }
      html += '</div></div>';
      area.innerHTML = html;
      var self = this;
      area.querySelectorAll('.dragon-char-btn').forEach(function(b) {
        b.addEventListener('click', function() {
          self.playSound('PLACE'); self.initCombat(this.getAttribute('data-char-id'));
        });
      });
    }

    initCombat(humanCharId) {
      this.humanCharacterId = humanCharId; this.running = true;
      var eng = Engine();
      if (eng && (eng.DragonCombatEngine || eng.create)) {
        this.engine = eng.DragonCombatEngine ? new eng.DragonCombatEngine() : eng.create();
        this.engine.init({ humanCharacterId: humanCharId });
        this.engine.start();
      }
      var ren = Ren(), ga = document.getElementById('dragon-game-area');
      if (ren && ren.DragonRenderer && ga) { this.renderer = new ren.DragonRenderer(); this.renderer.init(ga); }
      var uiM = UI();
      if (uiM && uiM.DragonUI) this.ui = new uiM.DragonUI();
      this.addCombatLog('Narrator', 'The party enters the dragon\'s lair...');
      var dlg = Dlg();
      if (dlg && dlg.getNarration) { var n = dlg.getNarration('combat_start'); if (n) this.addCombatLog('Narrator', n); }
      this.playSound('KONG');
      var self = this;
      this._gameLoopTimer = setTimeout(function() {
        self._gameLoop().catch(function(err) {
          console.error('[Dragon] Game loop error:', err);
          self.addCombatLog('System', 'Error: ' + err.message);
        });
      }, 100);
    }

    stop() {
      this.running = false;
      if (this._gameLoopTimer) { clearTimeout(this._gameLoopTimer); this._gameLoopTimer = null; }
      if (this.engine) this._recordResults(this.engine.getState());
      this.engine = null; this.renderer = null; this.ui = null;
      if (this._boundHandleKey) { document.removeEventListener('keydown', this._boundHandleKey); this._boundHandleKey = null; }
      if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    }

    createOverlay() {
      var self = this;
      this.overlay = el('div', 'position:fixed;inset:0;z-index:500;background:linear-gradient(180deg,#1a0a0a 0%,#2d1520 40%,#0d0d1a 100%);display:flex;flex-direction:column;font-family:"Segoe UI",Arial,sans-serif;');
      this.overlay.id = 'dragon-game';
      // Top: initiative tracker (50px)
      var top = el('div', 'height:50px;padding:8px 16px;background:rgba(0,0,0,0.4);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;border-bottom:1px solid rgba(232,184,48,0.2);');
      top.id = 'dragon-initiative-bar';
      top.innerHTML = '<span style="color:#e8b830;font-weight:bold;font-size:16px;">Dragon\'s Lair</span>' +
        '<div id="dragon-initiative-tracker" style="display:flex;gap:8px;align-items:center;"></div>' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
        '<label style="color:#aaa;font-size:12px;cursor:pointer;"><input type="checkbox" id="dragon-autoplay-toggle" style="margin-right:4px;"/>Auto-play</label>' +
        '<button id="dragon-back" style="padding:4px 12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#e0e0e0;cursor:pointer;font-size:13px;">Back</button></div>';
      this.overlay.appendChild(top);
      // Main row
      var main = el('div', 'flex:1;display:flex;overflow:hidden;position:relative;');
      // Left: combat log (260px)
      var left = el('div', 'width:260px;flex-shrink:0;display:flex;flex-direction:column;background:rgba(0,0,0,0.5);border-right:1px solid rgba(255,255,255,0.1);');
      left.appendChild(el('div', 'padding:8px 10px;color:#e8b830;font-size:12px;font-weight:bold;border-bottom:1px solid rgba(255,255,255,0.1);', 'Combat Log'));
      var log = el('div', 'flex:1;overflow-y:auto;padding:8px;font-size:12px;');
      log.id = 'dragon-combat-log'; left.appendChild(log); main.appendChild(left);
      // Center: game area
      var ga = el('div', 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;position:relative;');
      ga.id = 'dragon-game-area'; main.appendChild(ga);
      // Right: character sheet (hidden)
      var right = el('div', 'width:280px;flex-shrink:0;display:none;flex-direction:column;background:rgba(0,0,0,0.5);border-left:1px solid rgba(255,255,255,0.1);overflow-y:auto;padding:10px;font-size:12px;color:#ccc;');
      right.id = 'dragon-character-sheet'; main.appendChild(right);
      this.overlay.appendChild(main);
      // Bottom: action panel (80px)
      var ap = el('div', 'height:80px;padding:12px 16px;background:rgba(0,0,0,0.5);flex-shrink:0;display:flex;justify-content:center;align-items:center;gap:12px;border-top:1px solid rgba(232,184,48,0.2);');
      ap.id = 'dragon-action-panel'; this.overlay.appendChild(ap);
      // Tutor input (bottom-left)
      var ti = el('div', 'position:fixed;bottom:0;left:0;width:260px;z-index:502;background:rgba(0,0,0,0.9);border-right:1px solid rgba(255,255,255,0.1);border-top:1px solid rgba(255,255,255,0.1);padding:6px 8px;display:flex;gap:4px;',
        '<input id="dragon-ask-input" type="text" placeholder="Ask the tutor..." style="flex:1;padding:5px 8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#e0e0e0;font-size:12px;outline:none;"/>' +
        '<button id="dragon-ask-btn" style="padding:5px 10px;background:#e8b830;border:none;border-radius:4px;color:#1a1a1a;font-weight:bold;font-size:11px;cursor:pointer;">Ask</button>');
      this.overlay.appendChild(ti);
      document.body.appendChild(this.overlay);
      // Wire up events
      document.getElementById('dragon-back').addEventListener('click', function() { self.stop(); });
      var at = document.getElementById('dragon-autoplay-toggle');
      if (at) at.addEventListener('change', function() {
        self.autoPlay = this.checked;
        if (self.autoPlay && self._humanActionResolver) self._humanActionResolver(null);
      });
      var ai = document.getElementById('dragon-ask-input'), ab = document.getElementById('dragon-ask-btn');
      if (ai && ab) {
        var ask = function() { var q = ai.value.trim(); if (!q) return; ai.value = ''; self.addCombatLog('You', q); self._handleTutorQuestion(q); };
        ab.addEventListener('click', ask);
        ai.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); ask(); } });
      }
      this._boundHandleKey = function(e) { self._handleKeyboard(e); };
      document.addEventListener('keydown', this._boundHandleKey);
    }

    _handleKeyboard(e) {
      if (!this.running) return;
      var k = e.key.toLowerCase();
      if (k === 'c' && !e.ctrlKey && !e.metaKey) {
        var s = document.getElementById('dragon-character-sheet');
        if (s) s.style.display = s.style.display === 'none' ? 'flex' : 'none';
      }
      if (k === 'escape') this.stop();
    }

    async _gameLoop() {
      console.log('[Dragon] Game loop starting, engine:', !!this.engine, 'running:', this.running);
      if (this.engine) console.log('[Dragon] isGameOver:', JSON.stringify(this.engine.isGameOver()));
      while (this.running && this.engine && !this.engine.isGameOver().over) {
        var st = this.engine.getState();
        if (!st || !st.currentActor) { await this.sleep(100); continue; }
        var act = st.currentActor;
        if (act.hp <= 0) { this.engine.advanceTurn(); continue; }
        if (this.engine.applyStartOfTurnEffects) this.engine.applyStartOfTurnEffects(act.id);
        this._updateInitiativeTracker(st);

        // DM narration before each character's turn
        await this._dmNarrate(act, st);
        await this.sleep(200 / this.autoPlaySpeed);

        if (act.isDragon) {
          this._showTurnIndicator(act.name || 'Dragon', '#e74c3c');
          await this.sleep(800 / this.autoPlaySpeed);
          if (this.dragonAI) {
            var da = this.dragonAI.selectDragonActions(st.dragon, st);
            for (var i = 0; i < da.length; i++) {
              var dragonResults = this.engine.executeDragonTurn([da[i]]);
              // executeDragonTurn returns array — animate each result
              if (Array.isArray(dragonResults)) {
                for (var dr = 0; dr < dragonResults.length; dr++) this._animateResult(dragonResults[dr]);
              } else {
                this._animateResult(dragonResults);
              }
              this._triggerDialogue('dragon', da[i].type, null);
              await this.sleep(600 / this.autoPlaySpeed);
            }
          }
          // Party reacts to dragon's actions
          var postDragonSt = this.engine ? this.engine.getState() : null;
          if (postDragonSt && postDragonSt.party) {
            var aliveAfterDragon = postDragonSt.party.filter(function(p) { return !p.isDown; });
            if (aliveAfterDragon.length > 0 && Math.random() < 0.5) {
              var commenter = aliveAfterDragon[Math.floor(Math.random() * aliveAfterDragon.length)];
              this._triggerDialogue(commenter.id, 'dragon_roar', null);
            }
          }
          var prevRound = st.round;
          this.engine.endTurn();
          // Check for new round
          var newSt = this.engine ? this.engine.getState() : null;
          if (newSt && newSt.round > prevRound) {
            var roundNarration = 'Round ' + newSt.round + ' \u2014 ';
            var dragonPct = newSt.dragon ? Math.round(newSt.dragon.hp / (newSt.dragon.maxHp||256) * 100) : 100;
            if (dragonPct > 70) roundNarration += 'The dragon seems barely scratched.';
            else if (dragonPct > 40) roundNarration += 'The dragon bleeds from several wounds.';
            else if (dragonPct > 15) roundNarration += 'The dragon staggers, desperate and dangerous.';
            else roundNarration += 'The dragon is near death, but cornered beasts are most dangerous.';
            this.addCombatLog('DM', roundNarration);
          }
        } else if (act.id === this.humanCharacterId && !this.autoPlay) {
          this._showTurnIndicator(act.name || 'Your turn', '#4ade80');
          var ha = await this._waitForHumanAction(this.engine.getValidActions(act.id), act);
          if (ha) { this._animateResult(this.engine.executeAction(act.id, ha)); this._triggerDialogue(act.id, ha.type, null); }
          var prevRound2 = st.round;
          this.engine.endTurn();
          var newSt2 = this.engine ? this.engine.getState() : null;
          if (newSt2 && newSt2.round > prevRound2) {
            var roundNarr2 = 'Round ' + newSt2.round + ' \u2014 ';
            var dPct2 = newSt2.dragon ? Math.round(newSt2.dragon.hp / (newSt2.dragon.maxHp||256) * 100) : 100;
            if (dPct2 > 70) roundNarr2 += 'The dragon seems barely scratched.';
            else if (dPct2 > 40) roundNarr2 += 'The dragon bleeds from several wounds.';
            else if (dPct2 > 15) roundNarr2 += 'The dragon staggers, desperate and dangerous.';
            else roundNarr2 += 'The dragon is near death, but cornered beasts are most dangerous.';
            this.addCombatLog('DM', roundNarr2);
          }
        } else {
          this._showTurnIndicator(act.name || 'Ally', '#3498db');
          await this.sleep(500 / this.autoPlaySpeed);
          if (this.partyAI) {
            var aa = this.partyAI.selectActions(act, st);
            if (aa && aa.length) for (var j = 0; j < aa.length; j++) {
              this._animateResult(this.engine.executeAction(act.id, aa[j]));
              this._triggerDialogue(act.id, aa[j].type, null);
              await this.sleep(400 / this.autoPlaySpeed);
            }
          }
          var prevRound3 = st.round;
          this.engine.endTurn();
          var newSt3 = this.engine ? this.engine.getState() : null;
          if (newSt3 && newSt3.round > prevRound3) {
            var roundNarr3 = 'Round ' + newSt3.round + ' \u2014 ';
            var dPct3 = newSt3.dragon ? Math.round(newSt3.dragon.hp / (newSt3.dragon.maxHp||256) * 100) : 100;
            if (dPct3 > 70) roundNarr3 += 'The dragon seems barely scratched.';
            else if (dPct3 > 40) roundNarr3 += 'The dragon bleeds from several wounds.';
            else if (dPct3 > 15) roundNarr3 += 'The dragon staggers, desperate and dangerous.';
            else roundNarr3 += 'The dragon is near death, but cornered beasts are most dangerous.';
            this.addCombatLog('DM', roundNarr3);
          }
        }
        // Legendary actions between turns
        if (this.engine && this.dragonAI && st.dragon && st.dragon.legendaryActionsRemaining > 0) {
          await this.sleep(300);
          var la = this.dragonAI.selectLegendaryAction(this.engine.getState().dragon, this.engine.getState().party);
          if (la) {
            this._animateResult(this.engine.executeLegendaryAction(la.type));
            this.addCombatLog('Dragon', 'uses a legendary action!');
            await this.sleep(400 / this.autoPlaySpeed);
          }
        }
        // Game over check
        var gameOverCheck = this.engine ? this.engine.isGameOver() : { over: false };
        if (gameOverCheck.over) {
          var fs = this.engine.getState();
          if (gameOverCheck.victory) {
            this.addCombatLog('Narrator', 'The dragon has been slain! Victory!'); this.playSound('WIN');
            if (this.ui && this.ui.renderVictoryScreen) this.ui.renderVictoryScreen(fs);
            this._triggerVictoryDialogue(fs);
          } else {
            this.addCombatLog('Narrator', 'The party has fallen... Defeat.'); this.playSound('CLICK');
            if (this.ui && this.ui.renderDefeatScreen) this.ui.renderDefeatScreen(fs);
          }
          this._recordResults(fs); break;
        }
        if (this.renderer && this.renderer.render) this.renderer.render(this.engine.getState());
        if (this.ui && this.ui.update) this.ui.update(this.engine.getState());
      }
    }

    _waitForHumanAction(validActions, character) {
      var self = this;
      return new Promise(function(resolve) {
        self._humanActionResolver = resolve;
        var cb = function(a) { self._humanActionResolver = null; resolve(a); };
        if (self.ui && self.ui.renderActionPanel) self.ui.renderActionPanel(validActions, character, cb);
        else self._renderFallbackActions(validActions, character, cb);
      });
    }

    _renderFallbackActions(valid, character, onSelect) {
      var p = document.getElementById('dragon-action-panel'); if (!p) return;
      var acts = valid || [], html = '<span style="color:#aaa;font-size:13px;margin-right:12px;">' + (character.name||'Your') + '\'s turn:</span>';
      for (var i = 0; i < acts.length; i++) {
        var clr = acts[i].type === 'attack' ? '#e74c3c' : (acts[i].type === 'spell' ? '#9b59b6' : '#2980b9');
        html += '<button class="dragon-action-btn" data-idx="' + i + '" style="padding:8px 16px;background:' + clr +
          ';border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">' + (acts[i].name||acts[i].type||'Action') + '</button>';
      }
      p.innerHTML = html;
      p.querySelectorAll('.dragon-action-btn').forEach(function(b) {
        b.addEventListener('click', function() { var idx = parseInt(this.getAttribute('data-idx'),10); p.innerHTML = ''; onSelect(acts[idx]); });
      });
    }

    _triggerDialogue(charId, situation, context) {
      var self = this;
      if (this._tutorBridge && this._tutorBridge.isAvailable && this._tutorBridge.isAvailable() && this._tutorBridge.generateCharacterLine) {
        this._tutorBridge.generateCharacterLine('dragon', charId, situation, context ? JSON.stringify(context) : '')
          .then(function(l) { if (l) self.addCombatLog(charId, l); else self._scriptedDialogue(charId, situation); })
          .catch(function() { self._scriptedDialogue(charId, situation); });
        return;
      }
      this._scriptedDialogue(charId, situation);
    }

    _scriptedDialogue(charId, situation) {
      var d = Dlg(); if (!d) return;
      var line = (charId === 'dragon' && d.getDragonDialogue) ? d.getDragonDialogue(situation) : (d.getDialogue ? d.getDialogue(charId, situation) : null);
      if (line) this.addCombatLog(charId, line);
    }

    _triggerVictoryDialogue(state) {
      var d = Dlg();
      if (d && d.getNarration) { var n = d.getNarration('victory'); if (n) this.addCombatLog('Narrator', n); }
      if (this.humanCharacterId) this._triggerDialogue(this.humanCharacterId, 'victory', state);
    }

    async _handleTutorQuestion(question) {
      this.addCombatLog('Tutor', '...');
      var st = this.engine ? this.engine.getState() : {}, ctx = 'D&D Dragon Battle. ';
      if (st.party) for (var i = 0; i < st.party.length; i++) ctx += st.party[i].name + ': HP ' + st.party[i].hp + '/' + st.party[i].maxHp + '. ';
      if (st.dragon) ctx += 'Dragon: HP ' + st.dragon.hp + '/' + st.dragon.maxHp + '. ';
      if (st.currentActor) ctx += 'Current turn: ' + st.currentActor.name + '. ';
      var fb = function() { return 'Focus fire on the dragon, keep your healer safe, and spread out to avoid breath attacks!'; };
      var resp = this._tutorBridge ? await this._tutorBridge.askTutor('dragon', question, ctx, fb) : fb(question);
      var log = document.getElementById('dragon-combat-log');
      if (log && log.lastChild) log.removeChild(log.lastChild);
      this.addCombatLog('Tutor', resp);
    }

    _recordResults(result) {
      var ss = this.sharedSystems; if (!ss) return;
      var v = result && result.victory;
      if (ss.crossGameLearning && ss.crossGameLearning.recordResult)
        ss.crossGameLearning.recordResult('dragon', { victory: v, humanCharacter: this.humanCharacterId, roundsPlayed: result ? result.round : 0 });
      if (ss.characterCognition && ss.characterCognition.addMemory)
        ss.characterCognition.addMemory(this.humanCharacterId, { type: 'dragon_battle', text: v ? 'Defeated the dragon! Great teamwork.' : 'Fell to the dragon. Need better strategy next time.', victory: v });
      if (v && ss.economy && ss.economy.addCoins) ss.economy.addCoins(50);
      if (ss.worldManager && ss.worldManager.addXP) ss.worldManager.addXP(v ? 100 : 25);
    }

    _animateResult(r) {
      if (!r) return;
      var d = r.description || r.type || '';
      if (r.damage) d += ' (' + r.damage + ' damage)';
      if (r.healing) d += ' (' + r.healing + ' healed)';
      if (r.miss) d += ' (miss)';
      if (r.critical) d = 'CRITICAL! ' + d;
      if (d) this.addCombatLog(r.actorName || r.actor || '???', d);
      // Sound effects
      if (r.critical) this.playSound('KONG');
      else if (r.damage > 0) this.playSound('DISCARD');
      else if (r.healing) this.playSound('ACHIEVEMENT');
      else if (r.miss) this.playSound('CLICK');
      else this.playSound('PLACE');
      // Dramatic reactions
      if (r.damage > 20) this._reactToEvent('big_hit', r);
      if (r.critical) this._reactToEvent('critical', r);
    }

    async _reactToEvent(event, result) {
      // Pick a random party member to react (not the actor)
      var st = this.engine ? this.engine.getState() : null;
      if (!st || !st.party) return;
      var alive = st.party.filter(function(p) { return !p.isDown && p.id !== (result.actor || ''); });
      if (alive.length === 0) return;
      var reactor = alive[Math.floor(Math.random() * alive.length)];
      // Only react 40% of the time to avoid spam
      if (Math.random() > 0.4) return;
      this._triggerDialogue(reactor.id, event, { damage: result.damage, target: result.targetName });
    }

    _showTurnIndicator(name, color) {
      var area = document.getElementById('dragon-game-area'); if (!area) return;
      var ex = document.getElementById('dragon-turn-indicator'); if (ex) ex.remove();
      var ind = el('div', 'position:absolute;top:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);border:1px solid ' + color + ';border-radius:6px;padding:6px 20px;color:' + color + ';font-size:13px;font-weight:bold;z-index:10;');
      ind.id = 'dragon-turn-indicator'; ind.textContent = name + '\'s Turn'; area.appendChild(ind);
    }

    _updateInitiativeTracker(state) {
      var t = document.getElementById('dragon-initiative-tracker'); if (!t || !state) return;
      var html = '', ord = state.initiativeOrder || [];
      for (var i = 0; i < ord.length; i++) {
        var c = ord[i], cur = state.currentActor && state.currentActor.id === c.id;
        var clr = c.isDragon ? '#e74c3c' : (c.color || '#4ade80');
        html += '<span style="display:inline-block;padding:2px 8px;border-radius:4px;border:2px solid ' +
          (cur ? clr : 'transparent') + ';color:' + clr + ';opacity:' + (c.hp <= 0 ? '0.3' : '1') +
          ';font-size:11px;font-weight:' + (cur ? 'bold' : 'normal') + ';">' + (c.avatar||'') + ' ' + (c.name||c.id) + '</span>';
      }
      t.innerHTML = html;
    }

    addCombatLog(speaker, text) {
      var log = document.getElementById('dragon-combat-log'); if (!log) return;
      var m = el('div', 'padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:#aaa;');
      var clr = speaker==='DM'?'#c084fc':speaker==='Dragon'?'#e74c3c':speaker==='Narrator'?'#9b59b6':speaker==='Tutor'?'#3498db':'#e8b830';
      m.innerHTML = '<strong style="color:' + clr + ';">' + speaker + ':</strong> ' + text;
      log.appendChild(m); log.scrollTop = log.scrollHeight;
      while (log.children.length > 80) log.removeChild(log.firstChild);
    }
  }

  // --- DM narration and helper methods added to class prototype via assignment ---
  DragonGameManager.prototype._ordinal = function(n) { var s = ['th','st','nd','rd']; var v = n%100; return n + (s[(v-20)%10]||s[v]||s[0]); };

  DragonGameManager.prototype._dmNarrate = async function(actor, state) {
    // Use LLM for rich DM narration, fallback to scripted
    var context = this._buildDMContext(state);
    if (this._tutorBridge && this._tutorBridge.isAvailable()) {
      var prompt = 'You are a Dungeon Master narrating a D&D combat scene. ' +
        'Describe what happens in 1-2 vivid sentences. Use dramatic, evocative language. ' +
        'Reference the environment (cave, lava, shadows, echoes). ' +
        'Do NOT list game mechanics \u2014 describe the ACTION cinematically.';
      var msg = 'It is ' + (actor.name || 'Unknown') + '\'s turn. ' + context;
      try {
        var response = await this._tutorBridge.ollama.generate(prompt, msg,
          { maxTokens: 80, temperature: 0.9 });
        if (response) { this.addCombatLog('DM', response); return; }
      } catch(e) {}
    }
    // Scripted fallback
    this._scriptedDMNarration(actor, state);
  };

  DragonGameManager.prototype._scriptedDMNarration = function(actor, state) {
    // Build contextual narration
    var lines = [];
    var dragonHP = state.dragon ? state.dragon.hp / (state.dragon.maxHp || 256) : 1;
    if (actor.isDragon) {
      if (dragonHP > 0.7) lines = ['The dragon rises to its full height, wings spreading wide.', 'Flames lick between ancient fangs as the dragon surveys its prey.', 'The ground trembles beneath the dragon\'s massive claws.'];
      else if (dragonHP > 0.3) lines = ['The dragon snarls, ichor dripping from fresh wounds.', 'With a roar that shakes stalactites loose, the dragon prepares to strike.', 'The wounded dragon\'s eyes burn with desperate fury.'];
      else lines = ['The dragon staggers, its once-mighty form weakened.', 'Blood pools beneath the ancient wyrm as it fights for survival.', 'The dragon lets out a piteous roar \u2014 it knows the end approaches.'];
    } else {
      var role = (actor.className || actor.class || '').toLowerCase();
      if (role.includes('barb')) lines = ['Muscles rippling, ' + actor.name + ' tightens grip on the greataxe.', actor.name + '\'s eyes blaze with battle-fury.'];
      else if (role.includes('cler')) lines = ['Divine light shimmers around ' + actor.name + '\'s hands.', actor.name + ' whispers a prayer, holy symbol glowing.'];
      else if (role.includes('wiz')) lines = ['Arcane energy crackles at ' + actor.name + '\'s fingertips.', actor.name + '\'s eyes flash with eldritch power.'];
      else if (role.includes('rog')) lines = ['Like a shadow, ' + actor.name + ' shifts position.', actor.name + '\'s dagger gleams in the firelight.'];
      else if (role.includes('pal')) lines = [actor.name + ' raises the longsword, its edge catching divine light.', 'An aura of courage emanates from ' + actor.name + '.'];
      else if (role.includes('rang')) lines = [actor.name + '\'s keen eyes track every movement.', 'An arrow nocked and ready, ' + actor.name + ' takes aim.'];
      else lines = [actor.name + ' steels for the next exchange.'];
    }
    this.addCombatLog('DM', lines[Math.floor(Math.random() * lines.length)]);
  };

  DragonGameManager.prototype._buildDMContext = function(state) {
    var parts = [];
    if (state.round) parts.push('Round ' + state.round + '.');
    if (state.dragon) {
      var pct = Math.round((state.dragon.hp / (state.dragon.maxHp || 256)) * 100);
      parts.push('Dragon at ' + pct + '% HP.');
    }
    var injured = [];
    if (state.party) for (var i = 0; i < state.party.length; i++) {
      var p = state.party[i];
      var hpp = Math.round((p.hp / (p.maxHp || 1)) * 100);
      if (p.isDown) injured.push(p.name + ' is unconscious');
      else if (hpp < 50) injured.push(p.name + ' is wounded (' + hpp + '%)');
    }
    if (injured.length) parts.push('Injured: ' + injured.join(', ') + '.');
    parts.push('The cave echoes with the clash of steel and roar of flames.');
    return parts.join(' ');
  };

  root.MJ.Dragon.Play = Object.freeze({ DragonGameManager: DragonGameManager });

  // Register with GameFramework if available
  if (root.MJ.GameFramework && root.MJ.GameFramework.GameFramework) {
    try {
      var gf = root.MJ.GameFramework;
      if (gf.instance && gf.instance.registerGame)
        gf.instance.registerGame({ id: 'dragon', name: "Dragon's Lair", engine: DragonGameManager });
    } catch(e) {}
  }

  if (typeof console !== 'undefined') console.log('[Dragon] Play module loaded');
})(typeof window !== 'undefined' ? window : global);
