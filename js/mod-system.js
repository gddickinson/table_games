/**
 * mod-system.js — Player-created custom content: rule variants, characters, campaigns
 * Provides a mod registry, browser UI, and import/export for sharing mods.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const STORAGE_KEY = 'mj_mods';
  const MOD_TYPES = ['rule_variant', 'character', 'campaign'];

  // ─── Built-in example mods ────────────────────────────────────────

  const EXAMPLE_MODS = [
    {
      id: 'mod_chaos',
      name: 'Chaos Mode',
      type: 'rule_variant',
      description: 'All scoring doubled, random dora every 10 turns',
      data: { scoringMultiplier: 2, randomDoraInterval: 10 },
      builtIn: true
    },
    {
      id: 'mod_speed_round',
      name: 'Speed Round',
      type: 'rule_variant',
      description: 'Reduced wall size and 5-second turn timer for fast games',
      data: { wallReduction: 0.5, turnTimerSeconds: 5 },
      builtIn: true
    },
    {
      id: 'mod_robot',
      name: 'R0B0T',
      type: 'character',
      description: 'A robotic AI that speaks in binary and plays purely by statistics',
      data: {
        name: 'R0B0T',
        avatar: '\uD83E\uDD16',
        playStyle: {
          riskTolerance: 0.5,
          claimFrequency: 0.5,
          handValuePreference: 0.5,
          defenseOrientation: 0.5
        },
        phrases: {
          game_start: ['INITIALIZING...', '01001101 01001010'],
          won: ['VICTORY.EXE', 'OPTIMAL OUTCOME ACHIEVED'],
          lost: ['RECALCULATING...', 'ERROR: DID NOT WIN']
        }
      },
      builtIn: true
    },
    {
      id: 'mod_ghost',
      name: 'The Ghost',
      type: 'character',
      description: 'A mysterious silent player who discards in eerie patterns',
      data: {
        name: 'The Ghost',
        avatar: '\uD83D\uDC7B',
        playStyle: {
          riskTolerance: 0.8,
          claimFrequency: 0.2,
          handValuePreference: 0.9,
          defenseOrientation: 0.3
        },
        phrases: {
          game_start: ['...', '(silence)'],
          won: ['(a chill fills the room)', '...boo.'],
          lost: ['(fades slightly)', '...']
        }
      },
      builtIn: true
    },
    {
      id: 'mod_dragon_quest',
      name: 'Dragon Quest',
      type: 'campaign',
      description: 'Win 3 matches collecting all dragon tiles to appease the Dragon King',
      data: {
        stages: [
          { name: 'Green Dragon Challenge', goal: 'Win with a green dragon set', opponent: 'Dragon Acolyte' },
          { name: 'Red Dragon Fury', goal: 'Win with a red dragon set', opponent: 'Dragon Guardian' },
          { name: 'White Dragon Finale', goal: 'Win with all three dragon sets', opponent: 'Dragon King' }
        ],
        rewards: { title: 'Dragon Master', bonusScore: 5000 }
      },
      builtIn: true
    }
  ];

  // ─── Mod Templates ────────────────────────────────────────────────

  const MOD_TEMPLATES = {
    rule_variant: {
      id: '',
      name: 'My Rule Variant',
      type: 'rule_variant',
      description: '',
      data: {
        scoringMultiplier: 1,
        randomDoraInterval: 0,
        wallReduction: 0,
        turnTimerSeconds: 0
      }
    },
    character: {
      id: '',
      name: 'My Character',
      type: 'character',
      description: '',
      data: {
        name: '',
        avatar: '\uD83C\uDFAD',
        playStyle: {
          riskTolerance: 0.5,
          claimFrequency: 0.5,
          handValuePreference: 0.5,
          defenseOrientation: 0.5
        },
        phrases: {
          game_start: ['Hello!'],
          won: ['I won!'],
          lost: ['Good game.']
        }
      }
    },
    campaign: {
      id: '',
      name: 'My Campaign',
      type: 'campaign',
      description: '',
      data: {
        stages: [{ name: 'Stage 1', goal: 'Win a match', opponent: 'Opponent' }],
        rewards: { title: 'Champion', bonusScore: 1000 }
      }
    }
  };

  // ─── ModSystem ────────────────────────────────────────────────────

  class ModSystem {
    constructor() {
      this.mods = {};
      this.enabledMods = new Set();
      this.overlay = null;
      this._loadFromStorage();
      this._registerBuiltIns();
    }

    // ── Public API ──────────────────────────────────────────────────

    registerMod(mod) {
      if (!mod || !mod.id || !mod.name || !mod.type) {
        console.warn('[ModSystem] Invalid mod — requires id, name, type');
        return false;
      }
      if (MOD_TYPES.indexOf(mod.type) === -1) {
        console.warn('[ModSystem] Unknown mod type: ' + mod.type);
        return false;
      }
      this.mods[mod.id] = Object.assign({}, mod, { builtIn: !!mod.builtIn });
      this._saveToStorage();
      return true;
    }

    getMods(type) {
      var result = [];
      var keys = Object.keys(this.mods);
      for (var i = 0; i < keys.length; i++) {
        var m = this.mods[keys[i]];
        if (!type || m.type === type) result.push(m);
      }
      return result;
    }

    enableMod(modId) {
      if (!this.mods[modId]) return false;
      this.enabledMods.add(modId);
      this._applyMod(this.mods[modId]);
      this._saveToStorage();
      return true;
    }

    disableMod(modId) {
      this.enabledMods.delete(modId);
      this._saveToStorage();
      return true;
    }

    isEnabled(modId) {
      return this.enabledMods.has(modId);
    }

    exportMod(modId) {
      var mod = this.mods[modId];
      if (!mod) return null;
      var exportable = Object.assign({}, mod);
      delete exportable.builtIn;
      return JSON.stringify(exportable, null, 2);
    }

    importMod(json) {
      try {
        var mod = typeof json === 'string' ? JSON.parse(json) : json;
        if (!mod.id) mod.id = 'mod_import_' + Date.now();
        mod.builtIn = false;
        return this.registerMod(mod);
      } catch (e) {
        console.warn('[ModSystem] Failed to import mod:', e);
        return false;
      }
    }

    createModTemplate(type) {
      var template = MOD_TEMPLATES[type];
      if (!template) return null;
      var copy = JSON.parse(JSON.stringify(template));
      copy.id = 'mod_custom_' + Date.now();
      return copy;
    }

    getEnabledMods() {
      var result = [];
      this.enabledMods.forEach(id => {
        if (this.mods[id]) result.push(this.mods[id]);
      });
      return result;
    }

    // ── UI ──────────────────────────────────────────────────────────

    buildModUI() {
      if (this.overlay) {
        this._refreshModList();
        this.overlay.style.display = 'flex';
        return this.overlay;
      }

      this.overlay = document.createElement('div');
      Object.assign(this.overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: '10000', fontFamily: 'sans-serif', color: '#eee'
      });

      var container = document.createElement('div');
      Object.assign(container.style, {
        background: '#1a1a2e', borderRadius: '12px', padding: '20px',
        maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto'
      });

      // Title
      var titleBar = document.createElement('div');
      Object.assign(titleBar.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' });
      var title = document.createElement('h2');
      title.textContent = 'Mod Browser';
      title.style.margin = '0';
      titleBar.appendChild(title);
      var closeBtn = this._btn('Close', () => { this.overlay.style.display = 'none'; });
      titleBar.appendChild(closeBtn);
      container.appendChild(titleBar);

      // Tabs
      var tabBar = document.createElement('div');
      Object.assign(tabBar.style, { display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' });
      this._activeTab = null;

      var allTab = this._btn('All', () => this._showTab(null, tabBar));
      allTab.style.borderColor = '#4fc3f7';
      tabBar.appendChild(allTab);
      MOD_TYPES.forEach(type => {
        var label = type.replace('_', ' ');
        label = label.charAt(0).toUpperCase() + label.slice(1);
        tabBar.appendChild(this._btn(label, () => this._showTab(type, tabBar)));
      });
      container.appendChild(tabBar);

      // Mod list
      this._modListEl = document.createElement('div');
      container.appendChild(this._modListEl);

      // Import / Create bar
      var actionBar = document.createElement('div');
      Object.assign(actionBar.style, { display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' });

      actionBar.appendChild(this._btn('Import from JSON', () => this._promptImport()));
      MOD_TYPES.forEach(type => {
        var label = type.replace('_', ' ');
        actionBar.appendChild(this._btn('New ' + label, () => this._createNew(type)));
      });
      container.appendChild(actionBar);

      this.overlay.appendChild(container);
      document.body.appendChild(this.overlay);
      this._refreshModList();
      return this.overlay;
    }

    // ── Internal ────────────────────────────────────────────────────

    _showTab(type, tabBar) {
      this._activeTab = type;
      if (tabBar) {
        var btns = tabBar.querySelectorAll('button');
        btns.forEach(b => { b.style.borderColor = '#555'; });
        // highlight first if null, else matching
        btns.forEach(b => {
          if ((!type && b.textContent === 'All') || (type && b.textContent.toLowerCase().replace(' ', '_') === type)) {
            b.style.borderColor = '#4fc3f7';
          }
        });
      }
      this._refreshModList();
    }

    _refreshModList() {
      if (!this._modListEl) return;
      this._modListEl.innerHTML = '';
      var mods = this.getMods(this._activeTab);
      if (mods.length === 0) {
        var empty = document.createElement('div');
        empty.style.color = '#999';
        empty.style.padding = '16px';
        empty.textContent = 'No mods found.';
        this._modListEl.appendChild(empty);
        return;
      }
      mods.forEach(mod => {
        var row = document.createElement('div');
        Object.assign(row.style, {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px', marginBottom: '6px', borderRadius: '8px',
          background: this.enabledMods.has(mod.id) ? '#1b3a2a' : '#16213e',
          border: '1px solid ' + (this.enabledMods.has(mod.id) ? '#2d8a4e' : '#333')
        });

        var info = document.createElement('div');
        var nameEl = document.createElement('div');
        nameEl.style.fontWeight = 'bold';
        nameEl.textContent = mod.name + (mod.builtIn ? ' (built-in)' : '');
        info.appendChild(nameEl);
        var desc = document.createElement('div');
        desc.style.fontSize = '12px';
        desc.style.color = '#aaa';
        desc.textContent = '[' + mod.type.replace('_', ' ') + '] ' + (mod.description || '');
        info.appendChild(desc);
        row.appendChild(info);

        var btns = document.createElement('div');
        Object.assign(btns.style, { display: 'flex', gap: '4px', flexShrink: '0' });

        if (this.enabledMods.has(mod.id)) {
          btns.appendChild(this._btn('Disable', () => { this.disableMod(mod.id); this._refreshModList(); }));
        } else {
          btns.appendChild(this._btn('Enable', () => { this.enableMod(mod.id); this._refreshModList(); }));
        }
        btns.appendChild(this._btn('Export', () => {
          var json = this.exportMod(mod.id);
          if (json) {
            try { navigator.clipboard.writeText(json); } catch (_e) { /* */ }
            alert('Mod JSON copied to clipboard:\n\n' + json);
          }
        }));
        if (!mod.builtIn) {
          btns.appendChild(this._btn('Delete', () => {
            this.disableMod(mod.id);
            delete this.mods[mod.id];
            this._saveToStorage();
            this._refreshModList();
          }));
        }
        row.appendChild(btns);
        this._modListEl.appendChild(row);
      });
    }

    _promptImport() {
      var json = prompt('Paste mod JSON:');
      if (json) {
        var ok = this.importMod(json);
        alert(ok ? 'Mod imported successfully!' : 'Failed to import mod. Check JSON format.');
        this._refreshModList();
      }
    }

    _createNew(type) {
      var template = this.createModTemplate(type);
      if (!template) return;
      var name = prompt('Enter a name for your new ' + type.replace('_', ' ') + ':');
      if (!name) return;
      template.name = name;
      template.description = 'Custom ' + type.replace('_', ' ');
      this.registerMod(template);
      this._refreshModList();
    }

    _applyMod(mod) {
      // Store enabled mod data for the game engine to pick up
      root.MJ._activeMods = root.MJ._activeMods || {};
      root.MJ._activeMods[mod.id] = mod;
    }

    _registerBuiltIns() {
      for (var i = 0; i < EXAMPLE_MODS.length; i++) {
        var ex = EXAMPLE_MODS[i];
        if (!this.mods[ex.id]) {
          this.mods[ex.id] = Object.assign({}, ex);
        }
      }
    }

    _loadFromStorage() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var data = JSON.parse(raw);
          this.mods = data.mods || {};
          this.enabledMods = new Set(data.enabled || []);
        }
      } catch (_e) { /* */ }
    }

    _saveToStorage() {
      try {
        var data = {
          mods: {},
          enabled: Array.from(this.enabledMods)
        };
        var keys = Object.keys(this.mods);
        for (var i = 0; i < keys.length; i++) {
          if (!this.mods[keys[i]].builtIn) {
            data.mods[keys[i]] = this.mods[keys[i]];
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (_e) { /* */ }
    }

    _btn(label, onClick) {
      var btn = document.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        padding: '5px 12px', borderRadius: '6px', border: '1px solid #555',
        background: '#16213e', color: '#eee', cursor: 'pointer', fontSize: '12px'
      });
      btn.addEventListener('click', onClick);
      return btn;
    }
  }

  root.MJ.ModSystem = ModSystem;

})(typeof window !== 'undefined' ? window : global);
