/**
 * dragon-ui.js - DOM-based UI panels for D&D dragon battle game
 * Initiative tracker, action panel, character sheets, combat log
 * Exports under window.MJ.Dragon.UI (IIFE module)
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};

  function createPanel(id, cssText) {
    var el = document.createElement('div');
    el.id = id; el.style.cssText = cssText; return el;
  }

  function createButton(text, style, onClick) {
    var btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = 'cursor:pointer;border:none;border-radius:6px;padding:8px 16px;' +
      'font-size:14px;font-weight:bold;font-family:inherit;transition:opacity 0.15s;' + (style || '');
    btn.addEventListener('mouseenter', function() { btn.style.opacity = '0.85'; });
    btn.addEventListener('mouseleave', function() { btn.style.opacity = '1'; });
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
  }

  function formatDice(notation, result) {
    if (!result) return notation;
    var rolls = result.rolls || [], mod = result.modifier || 0;
    var modStr = mod > 0 ? '+' + mod : mod < 0 ? String(mod) : '';
    return notation + ' = [' + rolls.join(',') + ']' + modStr + ' = ' + result.total;
  }

  function DragonUI() {
    this._overlay = null; this._panels = {};
    this._keyHandler = null; this._state = { speed: 1, autoPlay: false };
  }

  DragonUI.prototype.init = function(overlay) {
    this._overlay = overlay; this._panels = {};
  };

  DragonUI.prototype.renderInitiativeTracker = function(turnOrder, currentActorId, round) {
    if (this._panels.initiative) this._panels.initiative.remove();
    var bar = createPanel('dragon-initiative', 'position:absolute;top:0;left:0;right:0;height:50px;' +
      'background:rgba(0,0,0,0.5);display:flex;align-items:center;padding:0 12px;z-index:100;' +
      'font-family:Georgia,serif;color:#fff;gap:6px;');
    var roundLbl = document.createElement('span');
    roundLbl.textContent = 'Round ' + (round || 1);
    roundLbl.style.cssText = 'color:#ffd700;font-weight:bold;font-size:16px;min-width:80px;';
    bar.appendChild(roundLbl);
    var strip = document.createElement('div');
    strip.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;justify-content:center;overflow-x:auto;';
    for (var i = 0; i < turnOrder.length; i++) {
      var actor = turnOrder[i], isDragon = actor.id === 'dragon';
      var isCurrent = actor.id === currentActorId;
      var isDowned = actor.hp !== undefined && actor.hp <= 0, acted = !!actor.acted;
      var slot = document.createElement('div');
      slot.style.cssText = 'display:flex;flex-direction:column;align-items:center;min-width:44px;';
      var circle = document.createElement('div'), size = isCurrent ? 38 : 32;
      circle.style.cssText = 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;' +
        'display:flex;align-items:center;justify-content:center;font-size:' + (size - 12) + 'px;' +
        'border:2px solid ' + (isCurrent ? '#ffd700' : '#666') + ';' +
        'background:' + (isDragon ? '#8b0000' : '#333') + ';' +
        (isCurrent ? 'box-shadow:0 0 8px #ffd700;' : '') +
        (isDowned ? 'opacity:0.35;' : acted ? 'opacity:0.6;' : '');
      circle.textContent = isDragon ? '\uD83D\uDC09' : (actor.avatar || '\uD83D\uDC64');
      if (isDowned) {
        var x = document.createElement('span');
        x.textContent = '\u2715';
        x.style.cssText = 'position:absolute;font-size:20px;color:#e74c3c;font-weight:bold;';
        circle.style.position = 'relative'; circle.appendChild(x);
      }
      slot.appendChild(circle);
      var name = document.createElement('span');
      name.textContent = actor.name || actor.id;
      name.style.cssText = 'font-size:10px;color:' + (isCurrent ? '#ffd700' : '#ccc') + ';margin-top:2px;';
      slot.appendChild(name); strip.appendChild(slot);
    }
    bar.appendChild(strip);
    var ctrls = document.createElement('div');
    ctrls.style.cssText = 'display:flex;gap:6px;align-items:center;';
    var self = this;
    var autoBtn = createButton(self._state.autoPlay ? 'Auto: ON' : 'Auto: OFF',
      'background:#555;color:#fff;padding:4px 10px;font-size:12px;', function() {
        self._state.autoPlay = !self._state.autoPlay;
        autoBtn.textContent = self._state.autoPlay ? 'Auto: ON' : 'Auto: OFF';
      });
    ctrls.appendChild(autoBtn);
    var speeds = [1, 2, 4];
    var speedBtn = createButton(self._state.speed + 'x',
      'background:#444;color:#ffd700;padding:4px 8px;font-size:12px;', function() {
        var idx = (speeds.indexOf(self._state.speed) + 1) % speeds.length;
        self._state.speed = speeds[idx]; speedBtn.textContent = speeds[idx] + 'x';
      });
    ctrls.appendChild(speedBtn);
    var backBtn = createButton('Back', 'background:#6b3030;color:#fff;padding:4px 10px;font-size:12px;');
    backBtn.dataset.action = 'back'; ctrls.appendChild(backBtn);
    bar.appendChild(ctrls);
    this._overlay.appendChild(bar); this._panels.initiative = bar;
  };

  DragonUI.prototype.renderActionPanel = function(validActions, character, onActionSelected) {
    if (this._panels.action) this._panels.action.remove();
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
    var panel = createPanel('dragon-actions', 'position:absolute;bottom:0;left:0;right:0;height:80px;' +
      'background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;' +
      'gap:10px;padding:0 20px;z-index:100;font-family:Georgia,serif;');
    var submenu = null, self = this;
    function clearSubmenu() { if (submenu) { submenu.remove(); submenu = null; } }
    function showSubmenu(items, type) {
      clearSubmenu();
      submenu = createPanel('dragon-submenu', 'position:absolute;bottom:84px;left:50%;' +
        'transform:translateX(-50%);background:rgba(20,15,10,0.92);border:1px solid #ffd700;' +
        'border-radius:8px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;max-width:500px;z-index:101;');
      for (var i = 0; i < items.length; i++) {
        (function(item) {
          var available = type === 'spell'
            ? (character.spellSlots && character.spellSlots[item.level || 1] > 0)
            : (item.usesRemaining === undefined || item.usesRemaining > 0);
          var label = item.name + (type === 'spell' ? ' (Lv' + (item.level || 1) + ')' : '') +
            (item.usesRemaining !== undefined ? ' [' + item.usesRemaining + ']' : '');
          var btn = createButton(label, 'background:' + (available ? '#444' : '#222') +
            ';color:' + (available ? '#fff' : '#666') + ';font-size:12px;padding:6px 12px;');
          btn.title = item.description || '';
          if (available) btn.addEventListener('click', function() {
            clearSubmenu(); onActionSelected({ type: type, item: item });
          });
          submenu.appendChild(btn);
        })(items[i]);
      }
      submenu.appendChild(createButton('Cancel', 'background:#6b3030;color:#fff;font-size:11px;padding:4px 10px;', clearSubmenu));
      self._overlay.appendChild(submenu);
    }
    var actions = [
      { key: 'attack', label: '\u2694\uFE0F Attack', color: '#c0392b', shortcut: 'a' },
      { key: 'spell', label: '\uD83D\uDCD6 Cast Spell', color: '#2980b9', shortcut: 's' },
      { key: 'ability', label: '\u2728 Use Ability', color: '#8e44ad', shortcut: 'i' },
      { key: 'move', label: '\uD83D\uDC5F Move', color: '#27ae60', shortcut: 'm' },
      { key: 'endTurn', label: '\uD83C\uDFC1 End Turn', color: '#7f8c8d', shortcut: 'e' },
      { key: 'dodge', label: '\uD83D\uDEE1 Dodge', color: '#d4ac0d', shortcut: 'd' }
    ];
    var buttonMap = {};
    for (var i = 0; i < actions.length; i++) {
      (function(act) {
        if (validActions && validActions.indexOf(act.key) === -1) return;
        var btn = createButton(act.label + ' (' + act.shortcut.toUpperCase() + ')',
          'background:' + act.color + ';color:#fff;font-size:14px;padding:10px 18px;');
        btn.title = act.key + ' [' + act.shortcut.toUpperCase() + ']';
        btn.addEventListener('click', function() {
          if (act.key === 'spell') {
            var spells = character.abilities ? Object.values(character.abilities).filter(
              function(a) { return a.actionType === 'spell' || a.spellLevel; }) : [];
            showSubmenu(spells, 'spell');
          } else if (act.key === 'ability') {
            var abs = character.abilities ? Object.values(character.abilities).filter(
              function(a) { return a.actionType !== 'spell' && a.actionType !== 'passive'; }) : [];
            showSubmenu(abs, 'ability');
          } else { clearSubmenu(); onActionSelected({ type: act.key }); }
        });
        panel.appendChild(btn); buttonMap[act.shortcut] = btn;
      })(actions[i]);
    }
    this._keyHandler = function(e) { var k = e.key.toLowerCase(); if (buttonMap[k]) buttonMap[k].click(); };
    document.addEventListener('keydown', this._keyHandler);
    this._overlay.appendChild(panel); this._panels.action = panel;
  };

  DragonUI.prototype.renderTargetSelector = function(validTargets, onTargetSelected, onCancel) {
    if (this._panels.targets) this._panels.targets.remove();
    var panel = createPanel('dragon-targets', 'position:absolute;bottom:90px;left:50%;' +
      'transform:translateX(-50%);background:rgba(20,15,10,0.9);border:1px solid #ffd700;' +
      'border-radius:8px;padding:10px;display:flex;gap:8px;z-index:102;font-family:Georgia,serif;');
    var lbl = document.createElement('span');
    lbl.textContent = 'Select target:';
    lbl.style.cssText = 'color:#ffd700;font-size:14px;align-self:center;margin-right:4px;';
    panel.appendChild(lbl);
    for (var i = 0; i < validTargets.length; i++) {
      (function(t) {
        var btn = createButton((t.avatar || '\uD83D\uDC64') + ' ' + (t.name || t.id),
          'background:#444;color:#fff;font-size:13px;padding:6px 14px;');
        btn.addEventListener('click', function() { panel.remove(); onTargetSelected(t.id); });
        panel.appendChild(btn);
      })(validTargets[i]);
    }
    panel.appendChild(createButton('Cancel', 'background:#6b3030;color:#fff;font-size:12px;padding:6px 10px;',
      function() { panel.remove(); if (onCancel) onCancel(); }));
    this._overlay.appendChild(panel); this._panels.targets = panel;
  };

  DragonUI.prototype.renderCharacterSheet = function(characterId, state) {
    if (this._panels.sheet) this._panels.sheet.remove();
    var chars = root.MJ.Dragon.Characters;
    var cs = state || (chars && chars.get ? chars.get(characterId) : null) || {};
    var panel = createPanel('dragon-sheet', 'position:absolute;top:0;right:0;width:280px;height:100%;' +
      'background:#2a2218;border-left:2px solid #ffd700;overflow-y:auto;z-index:110;' +
      'font-family:Georgia,serif;color:#d4c5a0;padding:14px;box-sizing:border-box;');
    panel.appendChild(createButton('\u2715', 'position:absolute;top:8px;right:8px;background:transparent;' +
      'color:#ffd700;font-size:18px;padding:2px 6px;', function() { panel.remove(); }));
    var header = document.createElement('div');
    header.style.cssText = 'text-align:center;margin-bottom:10px;';
    header.innerHTML = '<div style="font-size:48px;">' + (cs.avatar || '\uD83D\uDC64') + '</div>' +
      '<div style="color:#ffd700;font-size:18px;font-weight:bold;">' + (cs.name || characterId) + '</div>' +
      '<div style="font-size:12px;color:#a89070;">' + (cs.race || '') + ' ' + (cs.class || '') +
      (cs.level ? ' Lv' + cs.level : '') + '</div>';
    panel.appendChild(header);
    // HP bar
    var maxHp = cs.hp || 1, curHp = cs.currentHp !== undefined ? cs.currentHp : maxHp;
    var hpPct = Math.max(0, Math.min(100, (curHp / maxHp) * 100));
    var hpColor = hpPct > 60 ? '#27ae60' : hpPct > 30 ? '#f39c12' : '#e74c3c';
    var hpBar = document.createElement('div');
    hpBar.style.cssText = 'margin:6px 0;';
    hpBar.innerHTML = '<div style="font-size:12px;margin-bottom:2px;">HP: ' + curHp + '/' + maxHp + '</div>' +
      '<div style="background:#444;border-radius:4px;height:10px;overflow:hidden;">' +
      '<div style="width:' + hpPct + '%;height:100%;background:' + hpColor + ';border-radius:4px;"></div></div>';
    panel.appendChild(hpBar);
    // AC
    var acDiv = document.createElement('div');
    acDiv.style.cssText = 'font-size:13px;margin:6px 0;';
    acDiv.innerHTML = '\uD83D\uDEE1\uFE0F AC: <strong style="color:#ffd700;">' + (cs.ac || '?') + '</strong>' +
      (cs.armorDesc ? ' <span style="font-size:11px;color:#888;">(' + cs.armorDesc + ')</span>' : '');
    panel.appendChild(acDiv);
    // Stats grid
    var statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:8px 0;';
    for (var s = 0; s < statNames.length; s++) {
      var sn = statNames[s], val = cs.stats ? cs.stats[sn] : '?';
      var m = typeof val === 'number' ? Math.floor((val - 10) / 2) : 0;
      var cell = document.createElement('div');
      cell.style.cssText = 'text-align:center;background:#1e170f;border-radius:4px;padding:4px;';
      cell.innerHTML = '<div style="font-size:10px;color:#ffd700;text-transform:uppercase;">' + sn + '</div>' +
        '<div style="font-size:16px;font-weight:bold;">' + val + '</div>' +
        '<div style="font-size:11px;color:#aaa;">' + (m >= 0 ? '+' : '') + m + '</div>';
      grid.appendChild(cell);
    }
    panel.appendChild(grid);
    // Abilities
    if (cs.abilities) {
      var abSec = document.createElement('div');
      abSec.innerHTML = '<div style="color:#ffd700;font-size:13px;font-weight:bold;margin:6px 0 4px;">Abilities</div>';
      var akeys = Object.keys(cs.abilities);
      for (var a = 0; a < akeys.length; a++) {
        var ab = cs.abilities[akeys[a]], line = document.createElement('div');
        line.style.cssText = 'font-size:11px;padding:2px 0;border-bottom:1px solid #3a3020;';
        var uses = ab.usesPerDay !== undefined ? ' [' + (ab.usesRemaining !== undefined ? ab.usesRemaining : ab.usesPerDay) + '/' + ab.usesPerDay + ']' : '';
        line.textContent = ab.name + uses; line.title = ab.description || '';
        abSec.appendChild(line);
      }
      panel.appendChild(abSec);
    }
    // Equipment
    if (cs.weapons && cs.weapons.length) {
      var eqSec = document.createElement('div');
      eqSec.innerHTML = '<div style="color:#ffd700;font-size:13px;font-weight:bold;margin:6px 0 4px;">Equipment</div>';
      for (var w = 0; w < cs.weapons.length; w++) {
        var wl = document.createElement('div');
        wl.style.cssText = 'font-size:11px;padding:2px 0;';
        wl.textContent = cs.weapons[w].name + ' (' + cs.weapons[w].damage + ' ' + (cs.weapons[w].damageType || '') + ')';
        eqSec.appendChild(wl);
      }
      panel.appendChild(eqSec);
    }
    // Status effects
    if (cs.statusEffects && cs.statusEffects.length) {
      var sfSec = document.createElement('div');
      sfSec.innerHTML = '<div style="color:#ffd700;font-size:13px;font-weight:bold;margin:6px 0 4px;">Status Effects</div>';
      for (var ef = 0; ef < cs.statusEffects.length; ef++) {
        var se = document.createElement('div');
        se.style.cssText = 'font-size:11px;color:#f1c40f;';
        se.textContent = cs.statusEffects[ef].name || cs.statusEffects[ef];
        sfSec.appendChild(se);
      }
      panel.appendChild(sfSec);
    }
    // Personality quote
    if (cs.personality && cs.personality.traits) {
      var pq = document.createElement('div');
      pq.style.cssText = 'font-style:italic;font-size:11px;color:#a89070;margin-top:10px;' +
        'border-top:1px solid #3a3020;padding-top:6px;';
      pq.textContent = '"' + cs.personality.traits[0] + '"';
      panel.appendChild(pq);
    }
    this._overlay.appendChild(panel); this._panels.sheet = panel;
  };

  DragonUI.prototype.renderCombatLog = function(entries) {
    var colors = {
      attack: '#e74c3c', damage: '#e74c3c', healing: '#2ecc71', status: '#f1c40f',
      movement: '#3498db', narrative: '#e0e0e0', dialogue: '#e0e0e0', death: '#9b59b6', down: '#9b59b6'
    };
    if (!this._panels.log) {
      this._panels.log = createPanel('dragon-log', 'position:absolute;bottom:90px;left:0;width:260px;' +
        'max-height:200px;overflow-y:auto;background:rgba(0,0,0,0.6);border-radius:0 8px 0 0;' +
        'padding:8px;z-index:99;font-family:Georgia,serif;font-size:12px;');
      this._overlay.appendChild(this._panels.log);
    }
    var log = this._panels.log; log.innerHTML = '';
    var trimmed = entries.length > 100 ? entries.slice(entries.length - 100) : entries;
    for (var i = 0; i < trimmed.length; i++) {
      var entry = trimmed[i], line = document.createElement('div');
      line.style.cssText = 'padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:' +
        (colors[entry.type] || '#e0e0e0') + ';';
      line.textContent = entry.text || String(entry);
      log.appendChild(line);
    }
    log.scrollTop = log.scrollHeight;
  };

  DragonUI.prototype.renderDiceRoll = function(roll, total, success) {
    if (this._panels.dice) this._panels.dice.remove();
    var isCrit = roll === 20, isFumble = roll === 1;
    var color = isCrit ? '#ffd700' : isFumble ? '#e74c3c' : '#ffffff';
    var label = isFumble ? 'FUMBLE!' : isCrit ? 'CRITICAL!' : success ? 'HIT!' : 'MISS!';
    var panel = createPanel('dragon-dice', 'position:absolute;top:50%;left:50%;' +
      'transform:translate(-50%,-50%);text-align:center;z-index:120;pointer-events:none;');
    panel.innerHTML = '<div style="font-size:64px;color:' + color + ';text-shadow:0 0 16px ' + color + ';">' +
      roll + '</div><div style="font-size:24px;color:' + color + ';font-weight:bold;font-family:Georgia,serif;">' +
      label + '</div>' + (total !== undefined ? '<div style="font-size:14px;color:#aaa;margin-top:4px;">Total: ' + total + '</div>' : '');
    this._overlay.appendChild(panel); this._panels.dice = panel;
    setTimeout(function() { if (panel.parentNode) panel.remove(); }, 1000);
  };

  DragonUI.prototype.renderVictoryScreen = function(results) {
    if (this._panels.endscreen) this._panels.endscreen.remove();
    var panel = createPanel('dragon-victory', 'position:absolute;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.8);display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;z-index:200;font-family:Georgia,serif;');
    var html = '<div style="font-size:48px;color:#ffd700;font-weight:bold;text-shadow:0 0 20px #ffd700;' +
      'margin-bottom:12px;">VICTORY!</div>' +
      '<div style="font-size:18px;color:#e0e0e0;margin-bottom:20px;">The dragon has been slain!</div>';
    if (results) {
      html += '<div style="background:rgba(42,34,24,0.9);border:1px solid #ffd700;border-radius:8px;' +
        'padding:16px;min-width:300px;color:#d4c5a0;font-size:13px;">';
      if (results.rounds) html += '<div>Rounds: <strong>' + results.rounds + '</strong></div>';
      if (results.damageByCharacter) {
        var dk = Object.keys(results.damageByCharacter);
        for (var d = 0; d < dk.length; d++)
          html += '<div>' + dk[d] + ' damage: <strong>' + results.damageByCharacter[dk[d]] + '</strong></div>';
      }
      if (results.healingDone) html += '<div>Healing done: <strong>' + results.healingDone + '</strong></div>';
      if (results.xp) html += '<div style="color:#ffd700;margin-top:6px;">XP: +' + results.xp + '</div>';
      if (results.gold) html += '<div style="color:#ffd700;">Gold: +' + results.gold + '</div>';
      html += '</div>';
    }
    panel.innerHTML = html;
    var contBtn = createButton('Continue', 'background:#ffd700;color:#1a1a1a;font-size:16px;padding:10px 32px;margin-top:20px;');
    contBtn.dataset.action = 'continue';
    panel.appendChild(contBtn);
    this._overlay.appendChild(panel); this._panels.endscreen = panel;
  };

  DragonUI.prototype.renderDefeatScreen = function() {
    if (this._panels.endscreen) this._panels.endscreen.remove();
    var panel = createPanel('dragon-defeat', 'position:absolute;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;z-index:200;font-family:Georgia,serif;');
    panel.innerHTML = '<div style="font-size:48px;color:#e74c3c;font-weight:bold;text-shadow:0 0 20px #600;' +
      'margin-bottom:12px;">DEFEAT...</div>' +
      '<div style="font-size:16px;color:#aaa;margin-bottom:24px;">The dragon proved too powerful...</div>';
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;';
    var retryBtn = createButton('Try Again', 'background:#c0392b;color:#fff;font-size:15px;padding:10px 24px;');
    retryBtn.dataset.action = 'retry';
    var backBtn = createButton('Back to Games', 'background:#555;color:#fff;font-size:15px;padding:10px 24px;');
    backBtn.dataset.action = 'back';
    btnRow.appendChild(retryBtn); btnRow.appendChild(backBtn);
    panel.appendChild(btnRow);
    this._overlay.appendChild(panel); this._panels.endscreen = panel;
  };

  DragonUI.prototype.showCharacterSelectScreen = function(characters, onSelect) {
    if (this._panels.charSelect) this._panels.charSelect.remove();
    var panel = createPanel('dragon-charselect', 'position:absolute;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;z-index:200;font-family:Georgia,serif;');
    var title = document.createElement('div');
    title.textContent = 'Choose Your Hero';
    title.style.cssText = 'font-size:32px;color:#ffd700;font-weight:bold;margin-bottom:20px;text-shadow:0 0 12px #ffd700;';
    panel.appendChild(title);
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:660px;';
    var selectedId = null, cards = [];
    var confirmBtn = createButton('Confirm', 'background:#555;color:#888;font-size:16px;' +
      'padding:10px 32px;margin-top:20px;pointer-events:none;');
    for (var i = 0; i < characters.length; i++) {
      (function(ch) {
        var card = document.createElement('div');
        card.style.cssText = 'background:#2a2218;border:2px solid #555;border-radius:8px;padding:12px;' +
          'cursor:pointer;text-align:center;width:200px;transition:border-color 0.15s;';
        var st = ch.stats || {};
        card.innerHTML = '<div style="font-size:40px;">' + (ch.avatar || '\uD83D\uDC64') + '</div>' +
          '<div style="color:#ffd700;font-size:16px;font-weight:bold;margin:4px 0;">' + ch.name + '</div>' +
          '<div style="color:#a89070;font-size:12px;">' + (ch.race || '') + ' ' + (ch.class || '') + '</div>' +
          '<div style="color:#888;font-size:11px;margin-top:4px;">HP:' + (ch.hp || '?') + ' AC:' + (ch.ac || '?') + '</div>' +
          '<div style="color:#777;font-size:10px;margin-top:2px;">STR:' + (st.str || '?') + ' DEX:' + (st.dex || '?') +
          ' CON:' + (st.con || '?') + '</div>';
        card.addEventListener('click', function() {
          selectedId = ch.id;
          for (var c = 0; c < cards.length; c++) cards[c].style.borderColor = '#555';
          card.style.borderColor = '#ffd700';
          confirmBtn.style.background = '#ffd700'; confirmBtn.style.color = '#1a1a1a';
          confirmBtn.style.pointerEvents = 'auto';
        });
        grid.appendChild(card); cards.push(card);
      })(characters[i]);
    }
    panel.appendChild(grid);
    confirmBtn.addEventListener('click', function() {
      if (selectedId && onSelect) { panel.remove(); onSelect(selectedId); }
    });
    panel.appendChild(confirmBtn);
    this._overlay.appendChild(panel); this._panels.charSelect = panel;
  };

  DragonUI.prototype.cleanup = function() {
    if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
    var keys = Object.keys(this._panels);
    for (var i = 0; i < keys.length; i++) {
      if (this._panels[keys[i]] && this._panels[keys[i]].parentNode) this._panels[keys[i]].remove();
    }
    this._panels = {};
  };

  root.MJ.Dragon.UI = { DragonUI: DragonUI, createButton: createButton, createPanel: createPanel, formatDice: formatDice };
})(typeof window !== 'undefined' ? window : this);
