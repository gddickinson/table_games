/**
 * campaign-hamlet.js — Willowmere hamlet scene manager.
 * Manages NPC interactions, shops, quests, dialogue, and resting.
 * Exports under window.MJ.Dragon.Campaign.Hamlet (IIFE module).
 * Dependencies (lazy): Campaign.State, Campaign.Loot, Campaign.Story,
 *                       Campaign.HamletRenderer
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  /* ---------- lazy accessors ---------- */

  function Loot()  { return root.MJ.Dragon.Campaign.Loot; }
  function Story() { return root.MJ.Dragon.Campaign.Story; }
  function HR()    { return root.MJ.Dragon.Campaign.HamletRenderer; }

  /* ---------- constants ---------- */

  var REST_COST = 5;

  var SHOP_MAP = {
    smithy:   'smithShop',
    herbshop: 'herbShop',
    merchant: 'specialShop'
  };

  /* ---------- NPC definitions ---------- */

  var NPC_DEFS = [
    {
      id: 'innkeeper_gruff',
      name: 'Gruff',
      title: 'Innkeeper',
      icon: '\uD83C\uDF7A',          // beer mug
      building: 'inn',
      x: 180, y: 260
    },
    {
      id: 'blacksmith_hilda',
      name: 'Hilda',
      title: 'Blacksmith',
      icon: '\uD83D\uDD28',          // hammer
      building: 'smithy',
      x: 560, y: 240
    },
    {
      id: 'herbalist_willow',
      name: 'Willow',
      title: 'Herbalist',
      icon: '\uD83C\uDF3F',          // herb
      building: 'herbshop',
      x: 100, y: 200
    },
    {
      id: 'old_theron',
      name: 'Old Theron',
      title: 'Quest Giver',
      icon: '\uD83D\uDCDC',          // scroll
      building: 'questboard',
      x: 390, y: 320
    },
    {
      id: 'mysterious_traveler',
      name: 'Traveling Merchant',
      title: 'Merchant',
      icon: '\uD83D\uDC8E',          // gem
      building: 'merchant',
      x: 640, y: 340,
      unlockPhase: 3
    }
  ];

  /* ================================================================
   *  HamletScene class
   * ================================================================ */

  function HamletScene() {
    this.container = null;
    this.campaignState = null;
    this.loot = null;
    this.story = null;
    this.renderer = null;
    this._leaveCallback = null;
    this._activePanel = null;
    this._overlay = null;
    this._dialogueIndex = 0;
    this._highlightBuilding = null;
    this._animFrame = null;
  }

  var P = HamletScene.prototype;

  /* ---------- init / start ---------- */

  P.init = function (container, campaignState, loot, story) {
    this.container = container;
    this.campaignState = campaignState;
    this.loot = loot || Loot();
    this.story = story || Story();
    this.renderer = null;
    this._leaveCallback = null;
    this._activePanel = null;
    this._overlay = null;
    this._dialogueIndex = 0;
    this._highlightBuilding = null;
    return this;
  };

  P.start = function () {
    if (!this.container) return;
    this.container.innerHTML = '';

    /* create canvas wrapper */
    var canvasWrap = document.createElement('div');
    canvasWrap.className = 'hamlet-canvas-wrap';
    canvasWrap.style.cssText = 'position:relative;width:800px;height:500px;margin:0 auto;';
    this.container.appendChild(canvasWrap);

    /* init renderer */
    var RendererCls = HR();
    if (RendererCls && RendererCls.create) {
      this.renderer = RendererCls.create();
      this.renderer.init(canvasWrap);
    }

    /* status bar */
    var bar = document.createElement('div');
    bar.className = 'hamlet-bar';
    bar.style.cssText = 'text-align:center;padding:8px;font-family:serif;' +
      'background:#1a1209;color:#ddd;border-top:2px solid #5a4a2a;';
    this._statusBar = bar;
    this.container.appendChild(bar);
    this._updateStatusBar();

    /* leave button */
    var leaveBtn = document.createElement('button');
    leaveBtn.textContent = 'Leave Willowmere';
    leaveBtn.className = 'hamlet-leave-btn';
    leaveBtn.style.cssText = 'display:block;margin:8px auto;padding:8px 24px;' +
      'font-size:14px;cursor:pointer;background:#4a3520;color:#eee;border:1px solid #8a7a5a;' +
      'border-radius:4px;font-family:serif;';
    var self = this;
    leaveBtn.addEventListener('click', function () { self.leaveHamlet(); });
    this.container.appendChild(leaveBtn);

    /* wire canvas click / hover */
    this._wireCanvasEvents(canvasWrap);

    /* initial render */
    this._renderHamlet();
    this._startAnimLoop();
  };

  /* ---------- NPC definitions ---------- */

  P.getNPCs = function () {
    var phase = this._getStoryPhase();
    var npcs = [];
    for (var i = 0; i < NPC_DEFS.length; i++) {
      var def = NPC_DEFS[i];
      if (def.unlockPhase && phase < def.unlockPhase) continue;
      npcs.push({
        id: def.id,
        name: def.name,
        title: def.title,
        icon: def.icon,
        building: def.building,
        x: def.x,
        y: def.y
      });
    }
    return npcs;
  };

  /* ---------- enter building ---------- */

  P.enterBuilding = function (buildingId) {
    this._closePanelIfOpen();
    switch (buildingId) {
      case 'inn':
        this._showInnPanel();
        break;
      case 'smithy':
        this.showShop('smithy');
        break;
      case 'herbshop':
        this.showShop('herbshop');
        break;
      case 'questboard':
        this.showQuestBoard();
        break;
      case 'merchant':
        this.showShop('merchant');
        break;
      default:
        break;
    }
  };

  /* ---------- rest ---------- */

  P.rest = function () {
    if (!this.campaignState) return false;
    var gold = this.campaignState.getGold();
    if (gold < REST_COST) return false;
    this.campaignState.spendGold(REST_COST);
    this.campaignState.healParty();
    this._updateStatusBar();
    return true;
  };

  /* ---------- shop ---------- */

  P.showShop = function (shopId) {
    this._closePanelIfOpen();
    var lootMod = this.loot || Loot();
    if (!lootMod) return;

    var lootKey = SHOP_MAP[shopId] || shopId;
    var shopData = lootMod.getShopInventory(lootKey);
    if (!shopData) return;

    /* check unlock for special shop */
    if (shopData.unlockCondition) {
      var phase = this._getStoryPhase();
      var requiredPhase = parseInt(shopData.unlockCondition.replace('story_phase_', ''), 10);
      if (phase < requiredPhase) return;
    }

    var self = this;
    var overlay = this._createOverlay();
    var panel = document.createElement('div');
    panel.className = 'hamlet-shop-panel';
    panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'width:520px;max-height:440px;overflow-y:auto;background:#1e1510;color:#ddd;' +
      'border:2px solid #8a7a5a;border-radius:8px;padding:20px;font-family:serif;' +
      'box-shadow:0 4px 24px rgba(0,0,0,0.6);';

    /* header */
    var h = document.createElement('h2');
    h.style.cssText = 'margin:0 0 4px;color:#f0d080;font-size:20px;';
    h.textContent = shopData.name;
    panel.appendChild(h);

    var desc = document.createElement('p');
    desc.style.cssText = 'margin:0 0 12px;font-size:13px;color:#aaa;font-style:italic;';
    desc.textContent = shopData.description;
    panel.appendChild(desc);

    /* gold display */
    var goldDiv = document.createElement('div');
    goldDiv.className = 'hamlet-shop-gold';
    goldDiv.style.cssText = 'text-align:right;margin-bottom:8px;color:#ffd700;font-size:15px;';
    goldDiv.textContent = 'Gold: ' + this.campaignState.getGold();
    panel.appendChild(goldDiv);

    /* items list */
    var items = shopData.items;
    for (var i = 0; i < items.length; i++) {
      panel.appendChild(this._buildShopRow(items[i], goldDiv));
    }

    /* inventory sell section */
    panel.appendChild(this._buildSellSection(goldDiv));

    /* close button */
    var closeBtn = this._makeCloseButton(overlay);
    panel.appendChild(closeBtn);

    overlay.appendChild(panel);
    this._activePanel = overlay;
  };

  P._buildShopRow = function (entry, goldDiv) {
    var self = this;
    var item = entry.item;
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
      'padding:6px 0;border-bottom:1px solid #3a3020;';

    var info = document.createElement('div');
    info.style.cssText = 'flex:1;';
    var nameSpan = document.createElement('strong');
    nameSpan.textContent = item.name;
    nameSpan.style.color = '#e0c070';
    info.appendChild(nameSpan);

    if (item.description) {
      var descSpan = document.createElement('div');
      descSpan.style.cssText = 'font-size:11px;color:#999;margin-top:2px;';
      descSpan.textContent = item.description;
      info.appendChild(descSpan);
    }

    /* stat bonuses summary */
    var stats = this._itemStatSummary(item);
    if (stats) {
      var statSpan = document.createElement('div');
      statSpan.style.cssText = 'font-size:11px;color:#8abf8a;margin-top:1px;';
      statSpan.textContent = stats;
      info.appendChild(statSpan);
    }

    row.appendChild(info);

    /* price + buy button */
    var priceSpan = document.createElement('span');
    priceSpan.style.cssText = 'color:#ffd700;margin-right:8px;min-width:50px;text-align:right;';
    priceSpan.textContent = entry.price + 'g';
    row.appendChild(priceSpan);

    var buyBtn = document.createElement('button');
    buyBtn.textContent = 'Buy';
    buyBtn.style.cssText = 'padding:3px 12px;cursor:pointer;background:#4a6a2a;color:#fff;' +
      'border:1px solid #6a8a4a;border-radius:3px;font-family:serif;font-size:12px;';

    var canAfford = this.campaignState.getGold() >= entry.price;
    if (!canAfford) {
      buyBtn.disabled = true;
      buyBtn.style.opacity = '0.4';
      buyBtn.style.cursor = 'default';
    }

    buyBtn.addEventListener('click', function () {
      var result = self.campaignState.spendGold(entry.price);
      if (result === false) return;
      self.campaignState.addItem(item.id);
      goldDiv.textContent = 'Gold: ' + self.campaignState.getGold();
      self._updateStatusBar();
    });

    row.appendChild(buyBtn);
    return row;
  };

  P._buildSellSection = function (goldDiv) {
    var self = this;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:12px;padding-top:8px;border-top:2px solid #5a4a2a;';

    var title = document.createElement('h3');
    title.textContent = 'Sell Items';
    title.style.cssText = 'margin:0 0 6px;color:#c0a060;font-size:15px;';
    wrap.appendChild(title);

    var inventory = this.campaignState.getInventory();
    var lootMod = this.loot || Loot();

    if (inventory.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'font-size:12px;color:#777;font-style:italic;';
      empty.textContent = 'No items to sell.';
      wrap.appendChild(empty);
      return wrap;
    }

    for (var i = 0; i < inventory.length; i++) {
      var item = lootMod.getItem(inventory[i]);
      if (!item) continue;
      var sellPrice = Math.floor(item.price / 2);
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
        'padding:4px 0;border-bottom:1px solid #2a2015;';

      var label = document.createElement('span');
      label.textContent = item.name;
      label.style.color = '#ccc';
      row.appendChild(label);

      var sellSpan = document.createElement('span');
      sellSpan.style.cssText = 'color:#ffd700;margin-right:8px;';
      sellSpan.textContent = sellPrice + 'g';
      row.appendChild(sellSpan);

      var sellBtn = document.createElement('button');
      sellBtn.textContent = 'Sell';
      sellBtn.style.cssText = 'padding:3px 12px;cursor:pointer;background:#6a3a2a;color:#fff;' +
        'border:1px solid #8a5a4a;border-radius:3px;font-family:serif;font-size:12px;';
      (function (itemId, price) {
        sellBtn.addEventListener('click', function () {
          self.campaignState.removeItem(itemId);
          self.campaignState.addGold(price);
          goldDiv.textContent = 'Gold: ' + self.campaignState.getGold();
          self._updateStatusBar();
        });
      })(item.id, sellPrice);

      row.appendChild(sellBtn);
      wrap.appendChild(row);
    }

    return wrap;
  };

  P._itemStatSummary = function (item) {
    var parts = [];
    if (item.category === 'weapon') {
      parts.push(item.damage + ' ' + (item.damageType || ''));
      if (item.bonus) parts.push('+' + item.bonus + ' to hit');
      if (item.extraDamage) parts.push('+' + item.extraDamage + ' ' + (item.extraDamageType || ''));
    }
    if (item.category === 'armor') {
      parts.push('AC ' + item.ac);
      if (item.bonus) parts.push('+' + item.bonus);
    }
    if (item.category === 'potion' && item.effect) {
      parts.push(item.effect.type === 'heal' ? ('Heals ' + item.effect.healing) : item.effect.type);
    }
    if (item.category === 'scroll' && item.spellEffect) {
      parts.push(item.spellEffect);
    }
    return parts.length ? parts.join(' | ') : '';
  };

  /* ---------- quest board ---------- */

  P.showQuestBoard = function () {
    this._closePanelIfOpen();
    var self = this;
    var storyMod = this.story || Story();
    if (!storyMod) return;

    var phase = this._getStoryPhase();
    var completed = this.campaignState.getCompletedQuests();
    var available = storyMod.getAvailableQuests(phase, completed);
    var allQuests = storyMod.QUESTS;

    var overlay = this._createOverlay();
    var panel = document.createElement('div');
    panel.className = 'hamlet-quest-panel';
    panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'width:500px;max-height:440px;overflow-y:auto;background:#1e1510;color:#ddd;' +
      'border:2px solid #8a7a5a;border-radius:8px;padding:20px;font-family:serif;' +
      'box-shadow:0 4px 24px rgba(0,0,0,0.6);';

    var h = document.createElement('h2');
    h.style.cssText = 'margin:0 0 12px;color:#f0d080;font-size:20px;';
    h.textContent = 'Quest Board';
    panel.appendChild(h);

    /* completed quests */
    for (var i = 0; i < completed.length; i++) {
      var cq = allQuests[completed[i]];
      if (!cq) continue;
      var row = document.createElement('div');
      row.style.cssText = 'padding:6px 0;border-bottom:1px solid #2a2015;opacity:0.5;';
      row.innerHTML = '<span style="color:#6a6;">\u2713</span> ' +
        '<strong style="color:#888;">' + cq.name + '</strong>' +
        '<div style="font-size:11px;color:#666;margin-top:2px;">Completed</div>';
      panel.appendChild(row);
    }

    /* available quests */
    for (var j = 0; j < available.length; j++) {
      panel.appendChild(this._buildQuestRow(available[j], overlay));
    }

    /* locked quests (future phases) */
    var keys = Object.keys(allQuests);
    for (var k = 0; k < keys.length; k++) {
      var q = allQuests[keys[k]];
      if (completed.indexOf(q.id) !== -1) continue;
      var isAvailable = false;
      for (var m = 0; m < available.length; m++) {
        if (available[m].id === q.id) { isAvailable = true; break; }
      }
      if (isAvailable) continue;
      var locked = document.createElement('div');
      locked.style.cssText = 'padding:6px 0;border-bottom:1px solid #2a2015;opacity:0.4;';
      locked.innerHTML = '<strong style="color:#777;">???</strong>' +
        '<div style="font-size:11px;color:#555;margin-top:2px;">' +
        'Complete earlier quests to learn more.</div>';
      panel.appendChild(locked);
    }

    panel.appendChild(this._makeCloseButton(overlay));
    overlay.appendChild(panel);
    this._activePanel = overlay;
  };

  P._buildQuestRow = function (quest, overlay) {
    var self = this;
    var row = document.createElement('div');
    row.style.cssText = 'padding:8px 0;border-bottom:1px solid #3a3020;cursor:pointer;';
    row.addEventListener('mouseenter', function () { row.style.background = '#2a2015'; });
    row.addEventListener('mouseleave', function () { row.style.background = 'none'; });

    var name = document.createElement('strong');
    name.style.color = '#e0c070';
    name.textContent = quest.name;
    row.appendChild(name);

    var meta = document.createElement('div');
    meta.style.cssText = 'font-size:11px;color:#aaa;margin-top:2px;';
    meta.textContent = 'Recommended Lv. ' + (quest.phase + 4) +
      ' | Reward: ' + quest.reward.xp + ' XP, ' + quest.reward.gold + 'g';
    row.appendChild(meta);

    /* click for full description */
    row.addEventListener('click', function () {
      self._showQuestDetail(quest, overlay);
    });

    return row;
  };

  P._showQuestDetail = function (quest, overlay) {
    /* clear overlay children except background */
    while (overlay.childNodes.length > 0) {
      overlay.removeChild(overlay.lastChild);
    }

    var self = this;
    var detail = document.createElement('div');
    detail.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'width:460px;background:#1e1510;color:#ddd;border:2px solid #8a7a5a;border-radius:8px;' +
      'padding:24px;font-family:serif;box-shadow:0 4px 24px rgba(0,0,0,0.6);';

    var h = document.createElement('h2');
    h.style.cssText = 'margin:0 0 8px;color:#f0d080;font-size:18px;';
    h.textContent = quest.name;
    detail.appendChild(h);

    var desc = document.createElement('p');
    desc.style.cssText = 'margin:0 0 12px;line-height:1.5;font-size:14px;color:#ccc;';
    desc.textContent = quest.desc;
    detail.appendChild(desc);

    var reward = document.createElement('div');
    reward.style.cssText = 'margin-bottom:16px;font-size:13px;color:#aaa;';
    reward.textContent = 'Reward: ' + quest.reward.xp + ' XP, ' + quest.reward.gold + ' gold';
    detail.appendChild(reward);

    /* accept button */
    var acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'Accept Quest';
    acceptBtn.style.cssText = 'padding:8px 24px;cursor:pointer;background:#4a6a2a;color:#fff;' +
      'border:1px solid #6a8a4a;border-radius:4px;font-family:serif;font-size:14px;' +
      'margin-right:8px;';
    acceptBtn.addEventListener('click', function () {
      self.campaignState.setFlag('active_quest', quest.id);
      self._closePanelIfOpen();
    });
    detail.appendChild(acceptBtn);

    /* back button */
    var backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.style.cssText = 'padding:8px 24px;cursor:pointer;background:#5a4a2a;color:#ddd;' +
      'border:1px solid #8a7a5a;border-radius:4px;font-family:serif;font-size:14px;';
    backBtn.addEventListener('click', function () {
      self._closePanelIfOpen();
      self.showQuestBoard();
    });
    detail.appendChild(backBtn);

    overlay.appendChild(detail);
  };

  /* ---------- dialogue ---------- */

  P.showDialogue = function (npcId) {
    this._closePanelIfOpen();
    var storyMod = this.story || Story();
    if (!storyMod) return;

    var npcDef = null;
    for (var i = 0; i < NPC_DEFS.length; i++) {
      if (NPC_DEFS[i].id === npcId) { npcDef = NPC_DEFS[i]; break; }
    }
    if (!npcDef) return;

    var phase = this._getStoryPhase();
    var lines = storyMod.getNPCDialogue(npcId, phase);
    if (!lines || lines.length === 0) {
      lines = ['...'];
    }

    var self = this;
    var idx = 0;

    var overlay = this._createOverlay();
    var panel = document.createElement('div');
    panel.className = 'hamlet-dialogue-panel';
    panel.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);' +
      'width:560px;background:#1e1510;color:#ddd;border:2px solid #8a7a5a;border-radius:8px;' +
      'padding:20px;font-family:serif;box-shadow:0 4px 24px rgba(0,0,0,0.6);';

    /* NPC portrait row */
    var portrait = document.createElement('div');
    portrait.style.cssText = 'display:flex;align-items:center;margin-bottom:10px;';

    var iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size:36px;margin-right:12px;';
    iconSpan.textContent = npcDef.icon;
    portrait.appendChild(iconSpan);

    var nameSpan = document.createElement('div');
    var nameLabel = document.createElement('strong');
    nameLabel.style.cssText = 'color:#f0d080;font-size:16px;';
    nameLabel.textContent = npcDef.name;
    nameSpan.appendChild(nameLabel);
    var titleLabel = document.createElement('div');
    titleLabel.style.cssText = 'font-size:11px;color:#999;';
    titleLabel.textContent = npcDef.title;
    nameSpan.appendChild(titleLabel);
    portrait.appendChild(nameSpan);
    panel.appendChild(portrait);

    /* dialogue text */
    var textDiv = document.createElement('div');
    textDiv.style.cssText = 'margin-bottom:14px;font-size:14px;line-height:1.6;color:#ddd;' +
      'min-height:48px;';
    textDiv.textContent = lines[idx];
    panel.appendChild(textDiv);

    /* buttons */
    var btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

    var nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.style.cssText = 'padding:6px 20px;cursor:pointer;background:#4a6a2a;color:#fff;' +
      'border:1px solid #6a8a4a;border-radius:4px;font-family:serif;font-size:13px;';
    nextBtn.addEventListener('click', function () {
      idx++;
      if (idx < lines.length) {
        textDiv.textContent = lines[idx];
        if (idx >= lines.length - 1) {
          nextBtn.style.display = 'none';
        }
      }
    });
    if (lines.length <= 1) nextBtn.style.display = 'none';
    btnWrap.appendChild(nextBtn);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'padding:6px 20px;cursor:pointer;background:#5a4a2a;color:#ddd;' +
      'border:1px solid #8a7a5a;border-radius:4px;font-family:serif;font-size:13px;';
    closeBtn.addEventListener('click', function () {
      self._closePanelIfOpen();
    });
    btnWrap.appendChild(closeBtn);

    panel.appendChild(btnWrap);
    overlay.appendChild(panel);
    this._activePanel = overlay;
  };

  /* ---------- inn panel ---------- */

  P._showInnPanel = function () {
    var self = this;
    var npcDef = NPC_DEFS[0]; // Gruff

    var overlay = this._createOverlay();
    var panel = document.createElement('div');
    panel.className = 'hamlet-inn-panel';
    panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'width:420px;background:#1e1510;color:#ddd;border:2px solid #8a7a5a;border-radius:8px;' +
      'padding:24px;font-family:serif;box-shadow:0 4px 24px rgba(0,0,0,0.6);';

    var h = document.createElement('h2');
    h.style.cssText = 'margin:0 0 8px;color:#f0d080;font-size:20px;';
    h.textContent = 'The Wandering Wyvern';
    panel.appendChild(h);

    var desc = document.createElement('p');
    desc.style.cssText = 'font-size:13px;color:#aaa;margin:0 0 16px;font-style:italic;';
    desc.textContent = 'Warm hearth, strong ale, and a bed to rest your weary bones.';
    panel.appendChild(desc);

    /* talk to innkeeper */
    var talkBtn = document.createElement('button');
    talkBtn.textContent = npcDef.icon + ' Talk to ' + npcDef.name;
    talkBtn.style.cssText = 'display:block;width:100%;padding:10px;cursor:pointer;' +
      'background:#3a3020;color:#e0c070;border:1px solid #5a4a2a;border-radius:4px;' +
      'font-family:serif;font-size:14px;margin-bottom:8px;text-align:left;';
    talkBtn.addEventListener('click', function () {
      self._closePanelIfOpen();
      self.showDialogue('innkeeper_gruff');
    });
    panel.appendChild(talkBtn);

    /* rest option */
    var gold = this.campaignState.getGold();
    var restBtn = document.createElement('button');
    restBtn.textContent = 'Rest (Full Heal) \u2014 ' + REST_COST + ' gold';
    restBtn.style.cssText = 'display:block;width:100%;padding:10px;cursor:pointer;' +
      'background:#2a4a3a;color:#aaffaa;border:1px solid #4a6a4a;border-radius:4px;' +
      'font-family:serif;font-size:14px;margin-bottom:8px;text-align:left;';

    if (gold < REST_COST) {
      restBtn.disabled = true;
      restBtn.style.opacity = '0.4';
      restBtn.style.cursor = 'default';
    }

    restBtn.addEventListener('click', function () {
      if (self.rest()) {
        restBtn.textContent = 'Rested! Party fully healed.';
        restBtn.disabled = true;
        restBtn.style.opacity = '0.6';
      }
    });
    panel.appendChild(restBtn);

    panel.appendChild(this._makeCloseButton(overlay));
    overlay.appendChild(panel);
    this._activePanel = overlay;
  };

  /* ---------- leave hamlet ---------- */

  P.leaveHamlet = function () {
    this._stopAnimLoop();
    if (typeof this._leaveCallback === 'function') {
      this._leaveCallback();
    }
  };

  P.onLeave = function (callback) {
    this._leaveCallback = callback;
  };

  /* ---------- internal helpers ---------- */

  P._getStoryPhase = function () {
    if (!this.campaignState) return 1;
    var phaseStr = this.campaignState.getStoryPhase();
    /* campaign-state returns keys like 'act1_arrival' etc. — map to numeric */
    var storyMod = this.story || Story();
    if (storyMod && storyMod.STORY_PHASES) {
      var phases = storyMod.STORY_PHASES;
      for (var i = 0; i < phases.length; i++) {
        if (phases[i].id) return phases[i].id;
      }
    }
    /* fallback: parse from storyPhaseIndex */
    var idx = this.campaignState._state
      ? (this.campaignState._state.storyPhaseIndex || 0) : 0;
    return idx + 1;
  };

  P._createOverlay = function () {
    var overlay = document.createElement('div');
    overlay.className = 'hamlet-overlay';
    overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,0.55);z-index:10;';
    var canvasWrap = this.container.querySelector('.hamlet-canvas-wrap');
    if (canvasWrap) {
      canvasWrap.appendChild(overlay);
    } else {
      this.container.appendChild(overlay);
    }
    return overlay;
  };

  P._closePanelIfOpen = function () {
    if (this._activePanel && this._activePanel.parentNode) {
      this._activePanel.parentNode.removeChild(this._activePanel);
    }
    this._activePanel = null;
  };

  P._makeCloseButton = function (overlay) {
    var self = this;
    var btn = document.createElement('button');
    btn.textContent = 'Close';
    btn.style.cssText = 'display:block;margin:14px auto 0;padding:6px 24px;cursor:pointer;' +
      'background:#5a4a2a;color:#ddd;border:1px solid #8a7a5a;border-radius:4px;' +
      'font-family:serif;font-size:13px;';
    btn.addEventListener('click', function () {
      self._closePanelIfOpen();
    });
    return btn;
  };

  P._updateStatusBar = function () {
    if (!this._statusBar || !this.campaignState) return;
    var gold = this.campaignState.getGold();
    var level = this.campaignState.getLevel();
    var phase = this._getStoryPhase();
    this._statusBar.textContent =
      'Willowmere | Level ' + level + ' | Gold: ' + gold + ' | Story Phase: ' + phase;
  };

  P._wireCanvasEvents = function (canvasWrap) {
    var self = this;
    var canvas = canvasWrap.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('mousemove', function (e) {
      if (!self.renderer) return;
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var hit = self.renderer.getCellFromClick(x, y);
      self._highlightBuilding = hit ? hit.id : null;
      canvas.style.cursor = hit ? 'pointer' : 'default';
    });

    canvas.addEventListener('click', function (e) {
      if (!self.renderer) return;
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var hit = self.renderer.getCellFromClick(x, y);
      if (!hit) return;

      if (hit.type === 'building') {
        self.enterBuilding(hit.id);
      } else if (hit.type === 'npc') {
        self.showDialogue(hit.id);
      }
    });
  };

  P._renderHamlet = function () {
    if (!this.renderer) return;
    var state = {
      npcs: this.getNPCs(),
      gold: this.campaignState ? this.campaignState.getGold() : 0,
      phase: this._getStoryPhase()
    };
    this.renderer.render(state, this._highlightBuilding);
  };

  P._startAnimLoop = function () {
    var self = this;
    function loop() {
      self._renderHamlet();
      self._animFrame = requestAnimationFrame(loop);
    }
    this._animFrame = requestAnimationFrame(loop);
  };

  P._stopAnimLoop = function () {
    if (this._animFrame) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
  };

  /* ================================================================
   *  MODULE EXPORT
   * ================================================================ */

  root.MJ.Dragon.Campaign.Hamlet = Object.freeze({
    HamletScene: HamletScene,
    NPC_DEFS: NPC_DEFS,
    REST_COST: REST_COST,

    create: function () {
      return new HamletScene();
    }
  });

})(typeof window !== 'undefined' ? window : this);
