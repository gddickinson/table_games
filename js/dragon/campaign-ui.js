/**
 * campaign-ui.js — Campaign-layer UI panels for D&D world map and encounters.
 * HUD, inventory, quest log, level-up, location entry, encounter intro/result,
 * travel animation, and campaign title screen.
 * Exports under window.MJ.Dragon.Campaign.UI (IIFE module).
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  /* ========== HELPERS ========== */

  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function btn(label, style, onClick) {
    var b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'cursor:pointer;border:none;border-radius:6px;padding:10px 20px;' +
      'font-size:14px;font-weight:bold;font-family:Georgia,serif;transition:opacity 0.15s;' +
      (style || '');
    b.addEventListener('mouseenter', function () { b.style.opacity = '0.85'; });
    b.addEventListener('mouseleave', function () { b.style.opacity = '1'; });
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function slidePanel(id, side) {
    var css = 'position:absolute;top:0;' + side + ':0;width:340px;height:100%;' +
      'background:rgba(20,15,10,0.95);color:#e8d9c0;font-family:Georgia,serif;' +
      'overflow-y:auto;padding:16px;box-sizing:border-box;z-index:200;' +
      'border-' + (side === 'left' ? 'right' : 'left') + ':3px solid #8b6914;';
    var panel = el('div', css);
    panel.id = id;
    return panel;
  }

  function centeredModal(id, width, height) {
    var css = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'width:' + width + 'px;max-height:' + height + 'px;overflow-y:auto;' +
      'background:rgba(20,15,10,0.96);color:#e8d9c0;font-family:Georgia,serif;' +
      'border:3px solid #8b6914;border-radius:10px;padding:24px;box-sizing:border-box;z-index:250;';
    var m = el('div', css);
    m.id = id;
    return m;
  }

  function hpBar(current, max, width) {
    var outer = el('div', 'width:' + width + 'px;height:6px;background:#333;border-radius:3px;overflow:hidden;');
    var ratio = Math.max(0, Math.min(1, current / max));
    var color = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';
    var inner = el('div', 'width:' + (ratio * 100) + '%;height:100%;background:' + color + ';');
    outer.appendChild(inner);
    return outer;
  }

  function closeBtn(onClick) {
    return btn('\u2715 Close', 'background:#8b0000;color:#fff;margin-top:12px;', onClick);
  }

  /* ========== CAMPAIGN UI CLASS ========== */

  function CampaignUI() {
    this._overlay = null;
    this._panels = {};
  }

  /**
   * Attach to the overlay container.
   * @param {HTMLElement} overlay
   */
  CampaignUI.prototype.init = function (overlay) {
    this._overlay = overlay;
    this._panels = {};
  };

  /* ---------- WORLD HUD ---------- */

  CampaignUI.prototype.renderWorldHUD = function (state) {
    if (this._panels.hud) this._panels.hud.remove();

    var bar = el('div', 'position:absolute;top:0;left:0;right:0;height:56px;' +
      'background:rgba(20,15,10,0.88);display:flex;align-items:center;padding:0 14px;' +
      'z-index:100;font-family:Georgia,serif;color:#e8d9c0;gap:16px;border-bottom:2px solid #8b6914;');

    /* party level & XP */
    var lvlBox = el('div', 'display:flex;flex-direction:column;min-width:100px;');
    lvlBox.appendChild(el('span', 'font-size:11px;color:#aaa;', 'Party Level'));
    lvlBox.appendChild(el('span', 'font-size:16px;font-weight:bold;color:#ffd700;', 'Lv ' + (state.level || 1)));
    var xpOuter = el('div', 'width:100px;height:5px;background:#333;border-radius:3px;margin-top:2px;');
    var xpRatio = state.xpNext ? Math.min(1, (state.xp || 0) / state.xpNext) : 0;
    xpOuter.appendChild(el('div', 'width:' + (xpRatio * 100) + '%;height:100%;background:#9b59b6;border-radius:3px;'));
    lvlBox.appendChild(xpOuter);
    bar.appendChild(lvlBox);

    /* gold */
    var gold = el('span', 'font-size:14px;color:#ffd700;', '\uD83E\uDE99 ' + (state.gold || 0) + 'g');
    bar.appendChild(gold);

    /* quest name */
    if (state.questName) {
      var q = el('span', 'font-size:12px;color:#daa520;flex:1;text-align:center;', '\uD83D\uDCDC ' + state.questName);
      bar.appendChild(q);
    } else {
      bar.appendChild(el('span', 'flex:1;'));
    }

    /* party HP summary */
    var hpGroup = el('div', 'display:flex;gap:8px;align-items:center;');
    var chars = state.characters || [];
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      var chip = el('div', 'display:flex;flex-direction:column;align-items:center;');
      chip.appendChild(el('span', 'font-size:10px;', c.icon || '\u2694'));
      chip.appendChild(hpBar(c.hp, c.maxHp, 30));
      hpGroup.appendChild(chip);
    }
    bar.appendChild(hpGroup);

    /* buttons */
    var btnGroup = el('div', 'display:flex;gap:6px;margin-left:8px;');
    var invBtn = btn('Inventory', 'background:#5a3a1a;color:#e8d9c0;padding:6px 10px;font-size:11px;');
    var qstBtn = btn('Quests', 'background:#5a3a1a;color:#e8d9c0;padding:6px 10px;font-size:11px;');
    var chrBtn = btn('Party', 'background:#5a3a1a;color:#e8d9c0;padding:6px 10px;font-size:11px;');
    if (state.onInventory) invBtn.addEventListener('click', state.onInventory);
    if (state.onQuests) qstBtn.addEventListener('click', state.onQuests);
    if (state.onParty) chrBtn.addEventListener('click', state.onParty);
    btnGroup.appendChild(invBtn);
    btnGroup.appendChild(qstBtn);
    btnGroup.appendChild(chrBtn);
    bar.appendChild(btnGroup);

    this._overlay.appendChild(bar);
    this._panels.hud = bar;
  };

  /* ---------- INVENTORY PANEL ---------- */

  CampaignUI.prototype.renderInventoryPanel = function (inventory, equipment, onEquip, onUse, onClose) {
    if (this._panels.inventory) this._panels.inventory.remove();

    var panel = slidePanel('campaign-inventory', 'right');
    panel.appendChild(el('h2', 'margin:0 0 12px;color:#ffd700;font-size:18px;', 'Inventory'));

    /* equipped items per character */
    if (equipment) {
      var eqSec = el('div', 'margin-bottom:14px;border-bottom:1px solid #555;padding-bottom:10px;');
      eqSec.appendChild(el('h3', 'margin:0 0 6px;font-size:13px;color:#aaa;', 'Equipped'));
      var charIds = Object.keys(equipment);
      for (var ci = 0; ci < charIds.length; ci++) {
        var cid = charIds[ci];
        var slots = equipment[cid];
        var row = el('div', 'margin-bottom:4px;font-size:12px;');
        row.appendChild(el('span', 'color:#daa520;', cid + ': '));
        var slotNames = Object.keys(slots);
        for (var si = 0; si < slotNames.length; si++) {
          var item = slots[slotNames[si]];
          if (item) {
            row.appendChild(el('span', 'color:#ccc;', slotNames[si] + '=' + item.name + ' '));
          }
        }
        eqSec.appendChild(row);
      }
      panel.appendChild(eqSec);
    }

    /* item list */
    var items = inventory || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var card = el('div', 'background:rgba(60,50,35,0.8);border:1px solid #5a4025;border-radius:6px;' +
        'padding:8px;margin-bottom:8px;');
      var top = el('div', 'display:flex;justify-content:space-between;align-items:center;');
      top.appendChild(el('span', 'font-weight:bold;font-size:13px;', (it.icon || '') + ' ' + it.name));
      if (it.qty > 1) {
        top.appendChild(el('span', 'font-size:11px;color:#aaa;', 'x' + it.qty));
      }
      card.appendChild(top);
      if (it.description) {
        card.appendChild(el('p', 'margin:4px 0 6px;font-size:11px;color:#bbb;', it.description));
      }
      var actions = el('div', 'display:flex;gap:6px;');
      if (it.type === 'equipment' && onEquip) {
        (function (item) {
          actions.appendChild(btn('Equip', 'background:#2e6b2e;color:#fff;padding:4px 10px;font-size:11px;',
            function () { onEquip(item); }));
        })(it);
      }
      if (it.type === 'consumable' && onUse) {
        (function (item) {
          actions.appendChild(btn('Use', 'background:#1a5276;color:#fff;padding:4px 10px;font-size:11px;',
            function () { onUse(item); }));
        })(it);
      }
      card.appendChild(actions);
      panel.appendChild(card);
    }

    if (items.length === 0) {
      panel.appendChild(el('p', 'color:#777;font-style:italic;', 'No items in inventory.'));
    }

    panel.appendChild(closeBtn(function () {
      panel.remove();
      delete this._panels.inventory;
      if (onClose) onClose();
    }.bind(this)));

    this._overlay.appendChild(panel);
    this._panels.inventory = panel;
  };

  /* ---------- QUEST LOG ---------- */

  CampaignUI.prototype.renderQuestLog = function (quests, completedQuests, onClose) {
    if (this._panels.quests) this._panels.quests.remove();

    var panel = slidePanel('campaign-quests', 'right');
    panel.appendChild(el('h2', 'margin:0 0 12px;color:#ffd700;font-size:18px;', 'Quest Log'));

    /* active quests */
    var active = quests || [];
    for (var i = 0; i < active.length; i++) {
      var q = active[i];
      if (q.locked) {
        panel.appendChild(el('div', 'padding:8px;margin-bottom:6px;color:#555;font-style:italic;' +
          'border:1px dashed #444;border-radius:6px;', '??? Locked Quest'));
        continue;
      }
      var card = el('div', 'background:rgba(60,50,35,0.8);border:1px solid #daa520;border-radius:6px;' +
        'padding:10px;margin-bottom:8px;');
      card.appendChild(el('div', 'font-weight:bold;font-size:14px;color:#ffd700;margin-bottom:4px;',
        '\uD83D\uDCDC ' + q.name));
      card.appendChild(el('p', 'margin:2px 0;font-size:12px;color:#ccc;', q.description || ''));
      if (q.objective) {
        card.appendChild(el('p', 'margin:2px 0;font-size:11px;color:#aaa;',
          'Objective: ' + q.objective));
      }
      if (q.reward) {
        card.appendChild(el('p', 'margin:2px 0;font-size:11px;color:#2ecc71;',
          'Reward: ' + q.reward));
      }
      panel.appendChild(card);
    }

    /* completed quests */
    var done = completedQuests || [];
    if (done.length > 0) {
      panel.appendChild(el('h3', 'margin:16px 0 6px;font-size:13px;color:#777;', 'Completed'));
      for (var j = 0; j < done.length; j++) {
        var dq = done[j];
        panel.appendChild(el('div', 'padding:6px 8px;margin-bottom:4px;color:#666;font-size:12px;' +
          'text-decoration:line-through;border:1px solid #444;border-radius:4px;',
          '\u2713 ' + dq.name));
      }
    }

    panel.appendChild(closeBtn(function () {
      panel.remove();
      delete this._panels.quests;
      if (onClose) onClose();
    }.bind(this)));

    this._overlay.appendChild(panel);
    this._panels.quests = panel;
  };

  /* ---------- LEVEL UP SCREEN ---------- */

  CampaignUI.prototype.renderLevelUpScreen = function (characterId, oldLevel, newLevel, changes, onContinue) {
    if (this._panels.levelUp) this._panels.levelUp.remove();

    var modal = centeredModal('campaign-levelup', 400, 500);

    /* LEVEL UP! header with glow */
    var header = el('h1', 'text-align:center;margin:0 0 8px;font-size:32px;color:#ffd700;' +
      'text-shadow:0 0 20px rgba(255,215,0,0.8),0 0 40px rgba(255,215,0,0.4);', 'LEVEL UP!');
    modal.appendChild(header);

    /* character name */
    modal.appendChild(el('div', 'text-align:center;font-size:16px;margin-bottom:12px;color:#daa520;',
      characterId));

    /* level transition */
    modal.appendChild(el('div', 'text-align:center;font-size:20px;margin-bottom:16px;color:#fff;',
      'Level ' + oldLevel + ' \u2192 Level ' + newLevel));

    /* changes list */
    var changeList = changes || [];
    for (var i = 0; i < changeList.length; i++) {
      var ch = changeList[i];
      var row = el('div', 'background:rgba(60,50,35,0.7);border-left:3px solid #ffd700;' +
        'padding:8px 12px;margin-bottom:6px;border-radius:0 4px 4px 0;font-size:13px;');
      if (ch.type === 'hp') {
        row.textContent = '\u2764 HP increased by ' + ch.value;
        row.style.color = '#2ecc71';
      } else if (ch.type === 'feature') {
        row.textContent = '\u2728 New Feature: ' + ch.name;
        row.style.color = '#9b59b6';
      } else if (ch.type === 'spell_slot') {
        row.textContent = '\u2B50 New spell slot: Level ' + ch.level;
        row.style.color = '#3498db';
      } else {
        row.textContent = ch.description || ch.name || 'Improvement';
        row.style.color = '#e8d9c0';
      }
      modal.appendChild(row);
    }

    modal.appendChild(btn('Continue', 'display:block;margin:20px auto 0;background:#daa520;color:#1a1a1a;' +
      'padding:10px 40px;font-size:16px;', function () {
      modal.remove();
      delete this._panels.levelUp;
      if (onContinue) onContinue();
    }.bind(this)));

    this._overlay.appendChild(modal);
    this._panels.levelUp = modal;
  };

  /* ---------- LOCATION ENTRY ---------- */

  CampaignUI.prototype.renderLocationEntry = function (location, onEnter, onCancel) {
    if (this._panels.locEntry) this._panels.locEntry.remove();

    var modal = centeredModal('campaign-loc-entry', 420, 480);

    /* icon and name */
    var head = el('div', 'text-align:center;margin-bottom:12px;');
    head.appendChild(el('div', 'font-size:36px;', location.icon || '\uD83D\uDDFA'));
    head.appendChild(el('h2', 'margin:4px 0;font-size:20px;color:#ffd700;', location.name));
    modal.appendChild(head);

    /* description */
    if (location.description) {
      modal.appendChild(el('p', 'font-size:13px;color:#ccc;line-height:1.5;margin-bottom:12px;',
        location.description));
    }

    /* recommended level */
    if (location.recommendedLevel) {
      var atOrAbove = location.partyLevel >= location.recommendedLevel;
      var lvlColor = atOrAbove ? '#2ecc71' : '#e74c3c';
      modal.appendChild(el('div', 'font-size:13px;margin-bottom:8px;color:' + lvlColor + ';',
        'Recommended Level: ' + location.recommendedLevel));
    }

    /* known enemies */
    if (location.knownEnemies && location.knownEnemies.length > 0) {
      var eDiv = el('div', 'margin-bottom:8px;font-size:12px;');
      eDiv.appendChild(el('span', 'color:#aaa;', 'Known Enemies: '));
      eDiv.appendChild(el('span', 'color:#e74c3c;', location.knownEnemies.join(', ')));
      modal.appendChild(eDiv);
    }

    /* associated quest */
    if (location.quest) {
      modal.appendChild(el('div', 'font-size:12px;color:#daa520;margin-bottom:12px;',
        '\uD83D\uDCDC Quest: ' + location.quest));
    }

    /* buttons */
    var btns = el('div', 'display:flex;justify-content:center;gap:12px;margin-top:16px;');
    btns.appendChild(btn('Enter', 'background:#2e6b2e;color:#fff;padding:10px 32px;font-size:14px;',
      function () {
        modal.remove();
        delete this._panels.locEntry;
        if (onEnter) onEnter();
      }.bind(this)));
    btns.appendChild(btn('Back', 'background:#555;color:#ccc;padding:10px 32px;font-size:14px;',
      function () {
        modal.remove();
        delete this._panels.locEntry;
        if (onCancel) onCancel();
      }.bind(this)));
    modal.appendChild(btns);

    this._overlay.appendChild(modal);
    this._panels.locEntry = modal;
  };

  /* ---------- ENCOUNTER INTRO ---------- */

  CampaignUI.prototype.renderEncounterIntro = function (location, dmNarration, onBeginCombat) {
    if (this._panels.encounterIntro) this._panels.encounterIntro.remove();

    var overlay = el('div', 'position:absolute;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.88);z-index:300;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;font-family:Georgia,serif;color:#e8d9c0;');
    overlay.id = 'campaign-encounter-intro';

    /* location name */
    overlay.appendChild(el('h1', 'font-size:36px;color:#ffd700;margin:0 0 16px;' +
      'text-shadow:0 0 30px rgba(255,215,0,0.5);text-align:center;', location.name || 'Unknown'));

    /* DM narration */
    var narDiv = el('div', 'max-width:520px;font-size:15px;line-height:1.7;color:#ccc;' +
      'text-align:center;margin-bottom:24px;font-style:italic;opacity:0;' +
      'transition:opacity 1.2s ease-in;');
    narDiv.textContent = '"' + (dmNarration || 'You enter the darkness...') + '"';
    overlay.appendChild(narDiv);

    /* fade narration in */
    setTimeout(function () { narDiv.style.opacity = '1'; }, 100);

    /* Draw Weapons button (delayed appearance) */
    var fightBtn = btn('\u2694 Draw Weapons!', 'background:#8b0000;color:#ffd700;' +
      'padding:14px 40px;font-size:18px;opacity:0;transition:opacity 0.8s ease-in;',
      function () {
        overlay.remove();
        delete this._panels.encounterIntro;
        if (onBeginCombat) onBeginCombat();
      }.bind(this));
    overlay.appendChild(fightBtn);
    setTimeout(function () { fightBtn.style.opacity = '1'; }, 1500);

    this._overlay.appendChild(overlay);
    this._panels.encounterIntro = overlay;
  };

  /* ---------- ENCOUNTER RESULT ---------- */

  CampaignUI.prototype.renderEncounterResult = function (result, xpGained, goldGained, lootFound, onContinue) {
    if (this._panels.encounterResult) this._panels.encounterResult.remove();

    var modal = centeredModal('campaign-encounter-result', 440, 520);

    /* header */
    var isVictory = result && result.victory !== false;
    var headerText = isVictory ? 'Victory!' : 'Retreat...';
    var headerColor = isVictory ? '#ffd700' : '#e74c3c';
    modal.appendChild(el('h1', 'text-align:center;margin:0 0 16px;font-size:28px;color:' + headerColor + ';' +
      (isVictory ? 'text-shadow:0 0 20px rgba(255,215,0,0.6);' : ''), headerText));

    /* XP gained */
    if (xpGained) {
      var xpRow = el('div', 'margin-bottom:10px;');
      xpRow.appendChild(el('span', 'font-size:14px;color:#9b59b6;', '\u2B50 ' + xpGained + ' XP gained'));
      if (result && result.xpProgress !== undefined) {
        var xpOuter = el('div', 'width:100%;height:8px;background:#333;border-radius:4px;margin-top:4px;');
        xpOuter.appendChild(el('div', 'width:' + Math.min(100, result.xpProgress) + '%;height:100%;' +
          'background:#9b59b6;border-radius:4px;'));
        xpRow.appendChild(xpOuter);
      }
      modal.appendChild(xpRow);
    }

    /* gold found */
    if (goldGained) {
      modal.appendChild(el('div', 'margin-bottom:10px;font-size:14px;color:#ffd700;',
        '\uD83E\uDE99 ' + goldGained + ' gold found'));
    }

    /* loot found */
    var loot = lootFound || [];
    if (loot.length > 0) {
      modal.appendChild(el('div', 'margin-bottom:4px;font-size:13px;color:#aaa;', 'Loot:'));
      for (var i = 0; i < loot.length; i++) {
        modal.appendChild(el('div', 'margin-left:12px;margin-bottom:3px;font-size:13px;color:#e8d9c0;',
          (loot[i].icon || '\u2022') + ' ' + loot[i].name));
      }
    }

    /* character HP remaining */
    if (result && result.characters) {
      modal.appendChild(el('div', 'margin:12px 0 4px;font-size:13px;color:#aaa;', 'Party Status:'));
      for (var j = 0; j < result.characters.length; j++) {
        var ch = result.characters[j];
        var row = el('div', 'display:flex;align-items:center;gap:8px;margin-bottom:4px;');
        row.appendChild(el('span', 'font-size:12px;min-width:70px;', ch.name || ch.id));
        row.appendChild(hpBar(ch.hp, ch.maxHp, 100));
        row.appendChild(el('span', 'font-size:11px;color:#aaa;', ch.hp + '/' + ch.maxHp));
        modal.appendChild(row);
      }
    }

    modal.appendChild(btn('Continue', 'display:block;margin:20px auto 0;background:#daa520;color:#1a1a1a;' +
      'padding:10px 40px;font-size:16px;', function () {
      modal.remove();
      delete this._panels.encounterResult;
      if (onContinue) onContinue();
    }.bind(this)));

    this._overlay.appendChild(modal);
    this._panels.encounterResult = modal;
  };

  /* ---------- TRAVEL ANIMATION ---------- */

  CampaignUI.prototype.renderTravelAnimation = function (fromHex, toHex, onComplete) {
    if (this._panels.travel) this._panels.travel.remove();

    var overlay = el('div', 'position:absolute;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.7);z-index:280;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;font-family:Georgia,serif;color:#e8d9c0;');
    overlay.id = 'campaign-travel';

    var destName = (toHex && toHex.name) || 'destination';
    overlay.appendChild(el('div', 'font-size:20px;margin-bottom:16px;', 'Traveling to ' + destName + '...'));

    /* progress bar */
    var barOuter = el('div', 'width:260px;height:10px;background:#333;border-radius:5px;overflow:hidden;');
    var barInner = el('div', 'width:0%;height:100%;background:#daa520;border-radius:5px;' +
      'transition:width 1.8s ease-in-out;');
    barOuter.appendChild(barInner);
    overlay.appendChild(barOuter);

    /* random encounter hint */
    var encounterHint = el('div', 'font-size:12px;color:#777;margin-top:12px;font-style:italic;',
      'Rolling for encounters...');
    overlay.appendChild(encounterHint);

    this._overlay.appendChild(overlay);
    this._panels.travel = overlay;

    /* animate progress */
    setTimeout(function () { barInner.style.width = '100%'; }, 50);

    /* complete after animation */
    setTimeout(function () {
      overlay.remove();
      delete this._panels.travel;
      if (onComplete) onComplete();
    }, 2200);
  };

  /* ---------- CAMPAIGN TITLE SCREEN ---------- */

  CampaignUI.prototype.renderCampaignTitle = function (onNewGame, onContinue, hasSave) {
    if (this._panels.title) this._panels.title.remove();

    var overlay = el('div', 'position:absolute;top:0;left:0;right:0;bottom:0;' +
      'background:linear-gradient(180deg,#0a0a12 0%,#1a1020 50%,#2a1510 100%);' +
      'z-index:400;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'font-family:Georgia,serif;color:#e8d9c0;');
    overlay.id = 'campaign-title';

    /* dragon silhouette (simple SVG) */
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '120');
    svg.setAttribute('viewBox', '0 0 200 120');
    svg.style.cssText = 'margin-bottom:20px;opacity:0.6;';

    var path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d',
      'M100,10 L120,30 L150,25 L140,50 L170,55 L145,65 L160,80 L130,75 ' +
      'L125,100 L100,85 L75,100 L70,75 L40,80 L55,65 L30,55 L60,50 ' +
      'L50,25 L80,30 Z');
    path.setAttribute('fill', '#ff4500');
    path.setAttribute('opacity', '0.4');
    svg.appendChild(path);

    /* eye */
    var eye = document.createElementNS(svgNS, 'circle');
    eye.setAttribute('cx', '100');
    eye.setAttribute('cy', '50');
    eye.setAttribute('r', '4');
    eye.setAttribute('fill', '#ffd700');
    svg.appendChild(eye);

    overlay.appendChild(svg);

    /* title */
    overlay.appendChild(el('h1', 'font-size:36px;margin:0 0 8px;color:#ffd700;' +
      'text-shadow:0 0 30px rgba(255,215,0,0.5),0 2px 4px rgba(0,0,0,0.8);text-align:center;',
      "Dragon's Lair Campaign"));

    /* description */
    overlay.appendChild(el('p', 'font-size:14px;color:#999;max-width:400px;text-align:center;' +
      'line-height:1.5;margin:0 0 30px;',
      'A dark power stirs in the volcanic mountains. Gather your party, explore the realm, ' +
      'and confront the ancient dragon before its shadow consumes the land.'));

    /* buttons */
    var btnBox = el('div', 'display:flex;flex-direction:column;gap:12px;align-items:center;');

    btnBox.appendChild(btn('New Campaign', 'background:#8b0000;color:#ffd700;padding:14px 48px;' +
      'font-size:18px;min-width:220px;', function () {
      overlay.remove();
      delete this._panels.title;
      if (onNewGame) onNewGame();
    }.bind(this)));

    if (hasSave) {
      btnBox.appendChild(btn('Continue', 'background:#2e6b2e;color:#e8d9c0;padding:12px 48px;' +
        'font-size:16px;min-width:220px;', function () {
        overlay.remove();
        delete this._panels.title;
        if (onContinue) onContinue();
      }.bind(this)));
    } else {
      var disabled = btn('Continue', 'background:#333;color:#666;padding:12px 48px;' +
        'font-size:16px;min-width:220px;cursor:default;');
      disabled.disabled = true;
      btnBox.appendChild(disabled);
    }

    overlay.appendChild(btnBox);
    this._overlay.appendChild(overlay);
    this._panels.title = overlay;
  };

  /* ---------- CLEANUP ---------- */

  CampaignUI.prototype.cleanup = function () {
    var keys = Object.keys(this._panels);
    for (var i = 0; i < keys.length; i++) {
      if (this._panels[keys[i]] && this._panels[keys[i]].remove) {
        this._panels[keys[i]].remove();
      }
    }
    this._panels = {};
  };

  /* ========== PUBLIC API ========== */

  root.MJ.Dragon.Campaign.UI = new CampaignUI();

})(typeof window !== 'undefined' ? window : this);
