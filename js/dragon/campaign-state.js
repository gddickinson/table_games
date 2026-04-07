/**
 * campaign-state.js — Persistent party state management across encounters.
 * Exports under window.MJ.Dragon.Campaign.State (IIFE module).
 * Dependencies (lazy): MJ.Dragon.Characters
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  function C() { return root.MJ.Dragon.Characters; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var STORAGE_KEY = 'mj_dragon_campaign';

  var CHARACTER_IDS = ['kenji', 'mei', 'yuki', 'riku', 'tomoe', 'sora'];

  var XP_THRESHOLDS = Object.freeze({
    5: 0,
    6: 6500,
    7: 14000,
    8: 23000,
    9: 34000,
    10: 48000
  });

  var STORY_PHASES = Object.freeze([
    'act1_arrival',
    'act1_investigation',
    'act2_rising',
    'act2_confrontation',
    'act3_climax',
    'act3_resolution'
  ]);

  /* ---------- default character state at level 5 ---------- */

  var DEFAULT_SPELL_SLOTS = Object.freeze({
    cleric:  { 1: 4, 2: 3, 3: 2 },
    wizard:  { 1: 4, 2: 3, 3: 2 },
    paladin: { 1: 4, 2: 2 },
    ranger:  { 1: 4, 2: 2 }
  });

  function defaultMaxHP(id) {
    var map = { kenji: 55, mei: 38, yuki: 28, riku: 38, tomoe: 44, sora: 42 };
    return map[id] || 40;
  }

  function defaultCharacterState(id) {
    var maxHp = defaultMaxHP(id);
    var className = classForId(id);
    var slots = DEFAULT_SPELL_SLOTS[className];
    return {
      id: id,
      hp: maxHp,
      maxHp: maxHp,
      spellSlots: slots ? clone(slots) : null,
      maxSpellSlots: slots ? clone(slots) : null,
      conditions: [],
      equipment: {
        weapon: null,
        armor: null,
        accessory: null
      }
    };
  }

  function classForId(id) {
    var map = {
      kenji: 'barbarian',
      mei: 'cleric',
      yuki: 'wizard',
      riku: 'rogue',
      tomoe: 'paladin',
      sora: 'ranger'
    };
    return map[id] || 'fighter';
  }

  /* ---------- CampaignState class ---------- */

  function CampaignState() {
    this._state = null;
    this.load();
    if (!this._state) {
      this.newCampaign();
    }
  }

  /* ---- persistence ---- */

  CampaignState.prototype.save = function () {
    try {
      var json = JSON.stringify(this._state);
      localStorage.setItem(STORAGE_KEY, json);
      return true;
    } catch (e) {
      console.warn('[CampaignState] save failed:', e);
      return false;
    }
  };

  CampaignState.prototype.load = function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this._state = JSON.parse(raw);
        return true;
      }
    } catch (e) {
      console.warn('[CampaignState] load failed:', e);
    }
    this._state = null;
    return false;
  };

  /* ---- campaign lifecycle ---- */

  CampaignState.prototype.newCampaign = function () {
    var characters = [];
    for (var i = 0; i < CHARACTER_IDS.length; i++) {
      characters.push(defaultCharacterState(CHARACTER_IDS[i]));
    }

    this._state = {
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      level: 5,
      xp: 0,
      gold: 50,
      characters: characters,
      inventory: [],
      completedQuests: [],
      visitedLocations: ['willowmere'],
      currentLocation: 'willowmere',
      storyPhaseIndex: 0,
      flags: {}
    };

    this.save();
    return clone(this._state);
  };

  /* ---- party state ---- */

  CampaignState.prototype.getPartyState = function () {
    return clone({
      characters: this._state.characters
    });
  };

  CampaignState.prototype.getCharacterState = function (id) {
    for (var i = 0; i < this._state.characters.length; i++) {
      if (this._state.characters[i].id === id) {
        return clone(this._state.characters[i]);
      }
    }
    return null;
  };

  CampaignState.prototype._findCharacter = function (id) {
    for (var i = 0; i < this._state.characters.length; i++) {
      if (this._state.characters[i].id === id) {
        return this._state.characters[i];
      }
    }
    return null;
  };

  /* ---- HP management ---- */

  CampaignState.prototype.updateCharacterHP = function (id, hp) {
    var ch = this._findCharacter(id);
    if (!ch) { return false; }
    ch.hp = Math.max(0, Math.min(hp, ch.maxHp));
    this._touch();
    return true;
  };

  CampaignState.prototype.healParty = function () {
    for (var i = 0; i < this._state.characters.length; i++) {
      var ch = this._state.characters[i];
      ch.hp = ch.maxHp;
      ch.conditions = [];
      if (ch.maxSpellSlots) {
        ch.spellSlots = clone(ch.maxSpellSlots);
      }
    }
    this._touch();
    return true;
  };

  /* ---- XP / Level ---- */

  CampaignState.prototype.addXP = function (amount) {
    this._state.xp += amount;
    var oldLevel = this._state.level;
    var newLevel = this._computeLevel();
    var leveledUp = newLevel > oldLevel;
    if (leveledUp) {
      this._state.level = newLevel;
    }
    this._touch();
    return { leveledUp: leveledUp, newLevel: this._state.level };
  };

  CampaignState.prototype.getXP = function () {
    return this._state.xp;
  };

  CampaignState.prototype.getLevel = function () {
    return this._state.level;
  };

  CampaignState.prototype._computeLevel = function () {
    var xp = this._state.xp;
    var level = 5;
    var levels = [5, 6, 7, 8, 9, 10];
    for (var i = 0; i < levels.length; i++) {
      if (xp >= XP_THRESHOLDS[levels[i]]) {
        level = levels[i];
      }
    }
    return level;
  };

  /* ---- Gold ---- */

  CampaignState.prototype.addGold = function (amount) {
    this._state.gold += amount;
    this._touch();
    return this._state.gold;
  };

  CampaignState.prototype.spendGold = function (amount) {
    if (this._state.gold < amount) { return false; }
    this._state.gold -= amount;
    this._touch();
    return this._state.gold;
  };

  CampaignState.prototype.getGold = function () {
    return this._state.gold;
  };

  /* ---- Inventory ---- */

  CampaignState.prototype.addItem = function (itemId) {
    this._state.inventory.push(itemId);
    this._touch();
    return this._state.inventory.length;
  };

  CampaignState.prototype.removeItem = function (itemId) {
    var idx = this._state.inventory.indexOf(itemId);
    if (idx === -1) { return false; }
    this._state.inventory.splice(idx, 1);
    this._touch();
    return true;
  };

  CampaignState.prototype.getInventory = function () {
    return this._state.inventory.slice();
  };

  /* ---- Equipment ---- */

  CampaignState.prototype.equipItem = function (characterId, slot, itemId) {
    var ch = this._findCharacter(characterId);
    if (!ch) { return false; }
    if (!ch.equipment) {
      ch.equipment = { weapon: null, armor: null, accessory: null };
    }
    if (!(slot in ch.equipment) && slot !== 'weapon' && slot !== 'armor' && slot !== 'accessory') {
      return false;
    }
    var prevItem = ch.equipment[slot];
    ch.equipment[slot] = itemId;

    /* return old item to inventory if any */
    if (prevItem) {
      this._state.inventory.push(prevItem);
    }

    /* remove new item from inventory */
    var invIdx = this._state.inventory.indexOf(itemId);
    if (invIdx !== -1) {
      this._state.inventory.splice(invIdx, 1);
    }

    this._touch();
    return true;
  };

  CampaignState.prototype.getEquipment = function (characterId) {
    var ch = this._findCharacter(characterId);
    if (!ch) { return null; }
    return clone(ch.equipment || { weapon: null, armor: null, accessory: null });
  };

  /* ---- Quests ---- */

  CampaignState.prototype.completeQuest = function (questId) {
    if (this._state.completedQuests.indexOf(questId) === -1) {
      this._state.completedQuests.push(questId);
      this._touch();
    }
    return true;
  };

  CampaignState.prototype.isQuestComplete = function (questId) {
    return this._state.completedQuests.indexOf(questId) !== -1;
  };

  CampaignState.prototype.getCompletedQuests = function () {
    return this._state.completedQuests.slice();
  };

  /* ---- Locations ---- */

  CampaignState.prototype.visitLocation = function (locationId) {
    if (this._state.visitedLocations.indexOf(locationId) === -1) {
      this._state.visitedLocations.push(locationId);
    }
    this._touch();
    return true;
  };

  CampaignState.prototype.hasVisited = function (locationId) {
    return this._state.visitedLocations.indexOf(locationId) !== -1;
  };

  CampaignState.prototype.getVisitedLocations = function () {
    return this._state.visitedLocations.slice();
  };

  CampaignState.prototype.setCurrentLocation = function (locationId) {
    this._state.currentLocation = locationId;
    this.visitLocation(locationId);
    return true;
  };

  CampaignState.prototype.getCurrentLocation = function () {
    return this._state.currentLocation;
  };

  /* ---- Story flags ---- */

  CampaignState.prototype.setFlag = function (key, value) {
    this._state.flags[key] = value;
    this._touch();
    return true;
  };

  CampaignState.prototype.getFlag = function (key) {
    return this._state.flags.hasOwnProperty(key) ? this._state.flags[key] : undefined;
  };

  /* ---- Story phases ---- */

  CampaignState.prototype.getStoryPhase = function () {
    var idx = this._state.storyPhaseIndex || 0;
    return STORY_PHASES[idx] || STORY_PHASES[STORY_PHASES.length - 1];
  };

  CampaignState.prototype.advanceStoryPhase = function () {
    var idx = this._state.storyPhaseIndex || 0;
    if (idx < STORY_PHASES.length - 1) {
      this._state.storyPhaseIndex = idx + 1;
      this._touch();
      return STORY_PHASES[this._state.storyPhaseIndex];
    }
    return STORY_PHASES[idx];
  };

  /* ---- internal helpers ---- */

  CampaignState.prototype._touch = function () {
    this._state.updatedAt = Date.now();
    this.save();
  };

  /* ---------- Export ---------- */

  root.MJ.Dragon.Campaign.State = Object.freeze({
    CampaignState: CampaignState,
    XP_THRESHOLDS: XP_THRESHOLDS,
    STORY_PHASES: STORY_PHASES,
    CHARACTER_IDS: CHARACTER_IDS,

    create: function () {
      return new CampaignState();
    }
  });

})(typeof window !== 'undefined' ? window : this);
