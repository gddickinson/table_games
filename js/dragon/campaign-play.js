/**
 * campaign-play.js — Top-level campaign orchestrator / state machine.
 * Manages: TITLE -> HAMLET -> WORLD_MAP -> TRAVEL -> ENCOUNTER_INTRO ->
 *          COMBAT -> ENCOUNTER_RESULT -> WORLD_MAP (loop) -> VICTORY
 * Exports under window.MJ.Dragon.Campaign.Manager (IIFE module).
 * Dependencies (lazy): MJ.Dragon.Campaign.State, .Locations, .Story,
 *   .Bestiary, .Loot, .WorldRenderer, .Hamlet; MJ.Dragon.Play,
 *   MJ.Dragon.Map, MJ.GameTutorBridge
 */
(function (exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  /* ---- lazy accessors ---- */
  function CState()    { return root.MJ.Dragon.Campaign.State; }
  function Locs()      { return root.MJ.Dragon.Campaign.Locations; }
  function Story()     { return root.MJ.Dragon.Campaign.Story; }
  function Best()      { return root.MJ.Dragon.Campaign.Bestiary; }
  function Loot()      { return root.MJ.Dragon.Campaign.Loot; }
  function WR()        { return root.MJ.Dragon.Campaign.WorldRenderer; }
  function Hamlet()    { return root.MJ.Dragon.Campaign.Hamlet; }
  function DPlay()     { return root.MJ.Dragon.Play; }
  function TB()        { return root.MJ.GameTutorBridge; }

  /* ---- tiny DOM helper (matches dragon-play.js) ---- */
  function el(tag, css, html) {
    var d = document.createElement(tag);
    if (css) d.style.cssText = css;
    if (html) d.innerHTML = html;
    return d;
  }

  /* ==================================================================
   *  CampaignManager class
   * ================================================================== */

  class CampaignManager {

    constructor() {
      this.state            = null;   // CampaignState instance
      this.worldRenderer    = null;
      this.hamletRenderer   = null;
      this.hamletScene      = null;
      this.overlay          = null;
      this.running          = false;
      this.currentScene     = null;   // 'title' | 'hamlet' | 'world_map' | 'encounter' | 'victory'
      this._battleManager   = null;   // DragonGameManager for combat
      this._currentEncounterIndex = 0; // tracks dungeon room progression
      this.sharedSystems    = null;
      this._tutorBridge     = null;
    }

    /* ---------- helpers (match dragon-play.js) ---------- */

    sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    playSound(n) {
      try {
        if (this.sharedSystems && this.sharedSystems.sound)
          this.sharedSystems.sound.play(n);
      } catch (e) { /* swallow */ }
    }

    addDMLog(text) {
      var log = document.getElementById('campaign-dm-log');
      if (!log) return;
      var line = el('div', 'padding:3px 0;color:#c8b070;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.05);');
      line.textContent = text;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
    }

    /* ---------- init ---------- */

    init(sharedSystems) {
      this.sharedSystems = sharedSystems || {};
      var tb = TB();
      if (tb && tb.GameTutorBridge && sharedSystems.ollamaClient) {
        this._tutorBridge = new tb.GameTutorBridge(sharedSystems.ollamaClient);
      }
    }

    /* ---------- start ---------- */

    start() {
      if (this.running) return;
      this.createOverlay();
      this.showTitleScreen();
    }

    /* ---------- createOverlay ---------- */

    createOverlay() {
      var self = this;
      this.overlay = el('div',
        'position:fixed;inset:0;z-index:500;' +
        'background:linear-gradient(180deg,#1a0a0a 0%,#2d1520 40%,#0d0d1a 100%);' +
        'display:flex;flex-direction:column;font-family:"Segoe UI",Arial,sans-serif;');
      this.overlay.id = 'campaign-overlay';

      /* -- Top bar: campaign HUD -- */
      var top = el('div',
        'height:50px;padding:8px 16px;background:rgba(0,0,0,0.4);' +
        'display:flex;justify-content:space-between;align-items:center;flex-shrink:0;' +
        'border-bottom:1px solid rgba(232,184,48,0.2);');
      top.id = 'campaign-top-bar';
      top.innerHTML =
        '<div id="campaign-hud-left" style="display:flex;gap:16px;align-items:center;color:#e0e0e0;font-size:13px;">' +
          '<span style="color:#e8b830;font-weight:bold;font-size:16px;">Dragon\'s Lair</span>' +
          '<span id="campaign-hud-level">Lv 5</span>' +
          '<span id="campaign-hud-gold" style="color:#ffd700;">50 gp</span>' +
          '<span id="campaign-hud-xp" style="color:#88aaff;">0 XP</span>' +
          '<span id="campaign-hud-quest" style="color:#aaa;font-style:italic;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>' +
        '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
          '<button id="campaign-btn-inventory" style="padding:4px 10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#e0e0e0;cursor:pointer;font-size:12px;">Inventory</button>' +
          '<button id="campaign-btn-quests" style="padding:4px 10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#e0e0e0;cursor:pointer;font-size:12px;">Quest Log</button>' +
          '<button id="campaign-btn-party" style="padding:4px 10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#e0e0e0;cursor:pointer;font-size:12px;">Party</button>' +
          '<button id="campaign-btn-back" style="padding:4px 12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#e0e0e0;cursor:pointer;font-size:13px;">Back</button>' +
        '</div>';
      this.overlay.appendChild(top);

      /* -- Main row -- */
      var main = el('div', 'flex:1;display:flex;overflow:hidden;position:relative;');

      /* Left: DM log */
      var left = el('div',
        'width:260px;flex-shrink:0;display:flex;flex-direction:column;' +
        'background:rgba(0,0,0,0.5);border-right:1px solid rgba(255,255,255,0.1);');
      left.appendChild(el('div',
        'padding:8px 10px;color:#e8b830;font-size:12px;font-weight:bold;' +
        'border-bottom:1px solid rgba(255,255,255,0.1);', 'DM Log'));
      var log = el('div', 'flex:1;overflow-y:auto;padding:8px;font-size:12px;');
      log.id = 'campaign-dm-log';
      left.appendChild(log);
      main.appendChild(left);

      /* Center: game area */
      var ga = el('div',
        'flex:1;display:flex;flex-direction:column;align-items:center;' +
        'justify-content:center;overflow:hidden;position:relative;');
      ga.id = 'campaign-game-area';
      main.appendChild(ga);

      this.overlay.appendChild(main);

      /* -- Bottom: tutor chat -- */
      var ti = el('div',
        'position:fixed;bottom:0;left:0;width:260px;z-index:502;' +
        'background:rgba(0,0,0,0.9);border-right:1px solid rgba(255,255,255,0.1);' +
        'border-top:1px solid rgba(255,255,255,0.1);padding:6px 8px;display:flex;gap:4px;',
        '<input id="campaign-ask-input" type="text" placeholder="Ask the DM..." ' +
          'style="flex:1;padding:5px 8px;background:rgba(255,255,255,0.1);' +
          'border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#e0e0e0;' +
          'font-size:12px;outline:none;" />' +
        '<button id="campaign-ask-btn" style="padding:5px 10px;background:#e8b830;' +
          'border:none;border-radius:4px;color:#1a1a1a;font-weight:bold;font-size:11px;' +
          'cursor:pointer;">Ask</button>');
      this.overlay.appendChild(ti);

      document.body.appendChild(this.overlay);

      /* -- Wire events -- */
      document.getElementById('campaign-btn-back').addEventListener('click', function () { self.stop(); });
      document.getElementById('campaign-btn-inventory').addEventListener('click', function () { self._showInventoryPanel(); });
      document.getElementById('campaign-btn-quests').addEventListener('click', function () { self._showSimpleQuestBoard(); });
      document.getElementById('campaign-btn-party').addEventListener('click', function () { self._showPartyPanel(); });

      var ai = document.getElementById('campaign-ask-input');
      var ab = document.getElementById('campaign-ask-btn');
      if (ai && ab) {
        var ask = function () {
          var q = ai.value.trim(); if (!q) return;
          ai.value = '';
          self.addDMLog('You: ' + q);
          self._handleTutorQuestion(q);
        };
        ab.addEventListener('click', ask);
        ai.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(); });
      }
    }

    /* ---------- showTitleScreen ---------- */

    showTitleScreen() {
      this.currentScene = 'title';
      this.running = true;
      var area = document.getElementById('campaign-game-area');
      if (!area) return;

      var hasSave = false;
      try {
        var cs = CState();
        if (cs) {
          var tmp = cs.create();
          hasSave = tmp.load();
        }
      } catch (e) { /* no save */ }

      var html =
        '<div style="text-align:center;padding:60px 20px;max-width:600px;">' +
          '<div style="font-size:72px;line-height:1;margin-bottom:12px;color:#e8b830;' +
            'text-shadow:0 0 40px rgba(232,184,48,0.4),0 4px 12px rgba(0,0,0,0.6);">' +
            '\uD83D\uDC09</div>' +
          '<h1 style="color:#e8b830;font-size:36px;margin:0 0 8px;font-family:Georgia,serif;' +
            'text-shadow:0 2px 8px rgba(0,0,0,0.5);">Dragon\'s Lair</h1>' +
          '<p style="color:#b8956a;font-size:16px;font-style:italic;margin:0 0 32px;">' +
            'A Campaign of Sword &amp; Sorcery</p>' +
          '<div style="margin-bottom:24px;">' +
            '<pre style="color:#665533;font-size:10px;line-height:1.2;font-family:monospace;margin:0 auto;display:inline-block;text-align:left;">' +
              '        /\\    /\\\n' +
              '       /  \\__/  \\\n' +
              '      /  (o)(o)  \\\n' +
              '     /     <>     \\\n' +
              '    /  \\_______/  \\\n' +
              '   /_______________\\\n' +
              '     |||       |||\n' +
            '</pre>' +
          '</div>' +
          '<p style="color:#888;font-size:13px;max-width:420px;margin:0 auto 32px;line-height:1.5;">' +
            'Guide a party of six heroes through the wilderness, clear dungeons, ' +
            'and face the dragon Scorchfang in his lair.</p>' +
          '<div style="display:flex;flex-direction:column;gap:12px;align-items:center;">' +
            '<button id="campaign-new-btn" style="padding:14px 48px;' +
              'background:linear-gradient(135deg,#e8b830,#c49020);border:none;' +
              'border-radius:8px;color:#1a1a1a;font-weight:bold;font-size:16px;' +
              'cursor:pointer;box-shadow:0 4px 16px rgba(232,184,48,0.3);' +
              'transition:transform 0.1s;">New Campaign</button>' +
            (hasSave
              ? '<button id="campaign-continue-btn" style="padding:12px 40px;' +
                'background:rgba(255,255,255,0.08);border:1px solid rgba(232,184,48,0.4);' +
                'border-radius:8px;color:#e8b830;font-size:14px;cursor:pointer;' +
                'transition:transform 0.1s;">Continue Campaign</button>'
              : '') +
          '</div>' +
        '</div>';
      area.innerHTML = html;

      var self = this;
      document.getElementById('campaign-new-btn').addEventListener('click', function () {
        self.playSound('PLACE');
        var cs = CState();
        if (cs) { self.state = cs.CampaignState ? new cs.CampaignState() : cs.create ? cs.create() : null; if (self.state && self.state.newCampaign) self.state.newCampaign(); }
        self.updateHUD();
        self.showHamlet();
      });

      var contBtn = document.getElementById('campaign-continue-btn');
      if (contBtn) {
        contBtn.addEventListener('click', function () {
          self.playSound('PLACE');
          var cs = CState();
          if (cs) { self.state = cs.CampaignState ? new cs.CampaignState() : null; }
          self.updateHUD();
          var loc = self.state ? self.state.getCurrentLocation() : 'willowmere';
          if (loc === 'willowmere') { self.showHamlet(); }
          else { self.showWorldMap(); }
        });
      }
    }

    /* ---------- showHamlet ---------- */

    showHamlet() {
      this.currentScene = 'hamlet';
      if (this.state) this.state.setCurrentLocation('willowmere');
      this.updateHUD();
      this.addDMLog('The party arrives at Willowmere.');

      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      area.innerHTML = ''; // Clear previous scene
      var self = this;

      /* Try rich HamletScene if available */
      var hm = Hamlet();
      if (hm && hm.HamletScene) {
        try {
          this.hamletScene = new hm.HamletScene();
          this.hamletScene.init({
            container: area,
            campaignState: this.state,
            loot: Loot(),
            story: Story(),
            onLeave: function () { self.showWorldMap(); }
          });
          this.hamletScene.render();
          return;
        } catch (e) {
          console.warn('[Campaign] HamletScene failed, using fallback:', e);
        }
      }

      /* Fallback: simple DOM hamlet */
      var ga = area;
      var gold = this.state ? this.state.getGold() : 0;

      /* Try canvas HamletRenderer for a visual hamlet above the buttons */
      var hr = root.MJ.Dragon.Campaign.HamletRenderer;
      if (hr && hr.HamletRenderer) {
        try {
          var canvasDiv = document.createElement('div');
          canvasDiv.style.cssText = 'width:100%;max-width:800px;margin:0 auto 16px;';
          if (!this.hamletRenderer) {
            this.hamletRenderer = hr.create ? hr.create() : new hr.HamletRenderer();
            this.hamletRenderer.init(canvasDiv);
          }
          this.hamletRenderer.render({}, null);
          ga.appendChild(canvasDiv);
        } catch (e) {
          console.warn('[Campaign] HamletRenderer canvas failed:', e);
        }
      }

      var html =
        '<div style="text-align:center;padding:40px 20px;max-width:500px;">' +
          '<h2 style="color:#e8b830;font-size:24px;margin:0 0 6px;">Willowmere</h2>' +
          '<p style="color:#aaa;font-size:13px;margin:0 0 24px;">' +
            'A peaceful hamlet at the crossroads. The Weary Wyrm inn beckons.</p>' +
          '<div style="color:#ffd700;font-size:14px;margin-bottom:20px;">' +
            'Gold: ' + gold + ' gp</div>' +
          '<div style="display:flex;flex-direction:column;gap:10px;align-items:center;">' +
            '<button id="hamlet-rest-btn" style="padding:10px 36px;' +
              'background:rgba(72,180,72,0.2);border:1px solid rgba(72,180,72,0.5);' +
              'border-radius:6px;color:#4ade80;font-size:14px;cursor:pointer;width:220px;">' +
              'Rest at Inn (5 gp)</button>' +
            '<button id="hamlet-shop-btn" style="padding:10px 36px;' +
              'background:rgba(180,140,60,0.2);border:1px solid rgba(180,140,60,0.5);' +
              'border-radius:6px;color:#e8b830;font-size:14px;cursor:pointer;width:220px;">' +
              'Shop</button>' +
            '<button id="hamlet-quest-btn" style="padding:10px 36px;' +
              'background:rgba(100,120,200,0.2);border:1px solid rgba(100,120,200,0.5);' +
              'border-radius:6px;color:#88aaff;font-size:14px;cursor:pointer;width:220px;">' +
              'Quest Board</button>' +
            '<button id="hamlet-leave-btn" style="padding:10px 36px;margin-top:8px;' +
              'background:rgba(200,100,60,0.2);border:1px solid rgba(200,100,60,0.5);' +
              'border-radius:6px;color:#f0a070;font-size:14px;cursor:pointer;width:220px;">' +
              'Leave Town</button>' +
          '</div>' +
        '</div>';
      var hamletContentDiv = document.createElement('div');
      hamletContentDiv.innerHTML = html;
      area.appendChild(hamletContentDiv);

      document.getElementById('hamlet-rest-btn').addEventListener('click', function () {
        if (!self.state) {
          self.addDMLog('No campaign state. Cannot rest.');
          return;
        }
        if (self.state.getGold() < 5) {
          self.addDMLog('Not enough gold to rest. Need 5 gp.');
          return;
        }
        // In the Rest button handler, add NPC dialogue
        self._talkToNPC('innkeeper_gruff');
        self.state.spendGold(5);
        if (typeof self.state.healParty === 'function') {
          self.state.healParty();
        } else {
          /* Manual heal: restore all party members to max HP */
          var party = self.state.getPartyState ? self.state.getPartyState() : null;
          if (party && party.characters) {
            for (var ci = 0; ci < party.characters.length; ci++) {
              var ch = party.characters[ci];
              if (ch.id && typeof ch.maxHp === 'number') {
                self.state.updateCharacterHP(ch.id, ch.maxHp);
              }
            }
          }
        }
        self.state.save();
        self.addDMLog('The party rests and heals at the inn. (-5 gp)');
        self.playSound('PLACE');
        self.updateHUD();
        self.showHamlet();
      });

      document.getElementById('hamlet-shop-btn').addEventListener('click', function () {
        self.playSound('PLACE');
        self._talkToNPC('blacksmith_hilda');
        self._showSimpleShop();
      });

      document.getElementById('hamlet-quest-btn').addEventListener('click', function () {
        self.playSound('PLACE');
        self._talkToNPC('herbalist_willow');
        self._showSimpleQuestBoard();
      });

      document.getElementById('hamlet-leave-btn').addEventListener('click', function () {
        self.playSound('PLACE');
        self.showWorldMap();
      });
    }

    /* ---------- showWorldMap ---------- */

    showWorldMap() {
      this.currentScene = 'world_map';
      this.updateHUD();
      this.addDMLog('The party surveys the region.');

      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      area.innerHTML = ''; // Clear previous scene
      var self = this;

      var wr = WR();
      var world = root.MJ.Dragon.Campaign.World;

      if (wr && wr.WorldMapRenderer && world) {
        // Use canvas hex renderer
        try {
          area.innerHTML = '';
          if (!this.worldRenderer) {
            this.worldRenderer = wr.create ? wr.create() : new wr.WorldMapRenderer();
            this.worldRenderer.init(area);
          }
          var partyHex = this.state ? this.state.getCurrentLocation() : 'willowmere';
          var partyPos = world.getLocationHex ? world.getLocationHex(partyHex) : { q: 5, r: 4 };
          var locations = root.MJ.Dragon.Campaign.Locations;
          var visited = this.state ? this.state.getVisitedLocations() : [];
          this.worldRenderer.render(world, partyPos, locations, visited);

          // Add click handler for hex interaction
          var canvas = area.querySelector('canvas');
          if (canvas) {
            canvas.addEventListener('click', function(e) {
              var rect = canvas.getBoundingClientRect();
              var x = e.clientX - rect.left, y = e.clientY - rect.top;
              var hex = self.worldRenderer.getCellFromClick(x, y);
              if (hex && world.getHex) {
                var hexData = world.getHex(hex.q, hex.r);
                if (hexData && hexData.locationId) {
                  self._handleLocationClick(hexData.locationId);
                }
              }
            });
          }
        } catch (e) {
          console.warn('[Campaign] Canvas WorldMapRenderer failed, using fallback:', e);
        }
      }

      // Always show the text-based location list as well (for reliability)
      this._showWorldMapList(area);

      // Party banter after a short delay
      var self2 = self;
      setTimeout(function() { self2._partyBanter(); }, 2000);
    }

    /** Handle a location click from the hex map or the text list. */
    _handleLocationClick(locationId) {
      // Party banter during travel
      this._partyBanter();

      // Check for random encounter while traveling
      var enc = this._checkRandomEncounter();
      if (enc) {
        this._startRandomEncounter(enc, locationId);
        return;
      }
      this.playSound('PLACE');
      if (locationId === 'willowmere') { this.showHamlet(); }
      else { this.showLocationEntry(locationId); }
    }

    /** Render the text-based world map location list. */
    _showWorldMapList(area) {
      var self = this;
      var locs = Locs();
      var allLocs = locs ? locs.ALL_LOCATIONS || Object.keys(locs.LOCATIONS || {}) : [];
      var storyPhaseIdx = this.state ? this.state.getStoryPhase() : 'act1_arrival';
      var completedQuests = this.state ? this.state.getCompletedQuests() : [];
      var visited = this.state ? this.state.getVisitedLocations() : [];

      var listDiv = document.createElement('div');
      listDiv.style.cssText = 'text-align:center;padding:30px 20px;max-width:560px;width:100%;';

      var html =
          '<h2 style="color:#e8b830;font-size:22px;margin:0 0 16px;">World Map</h2>' +
          '<div style="display:flex;flex-direction:column;gap:8px;align-items:stretch;">';

      for (var i = 0; i < allLocs.length; i++) {
        var locId = typeof allLocs[i] === 'string' ? allLocs[i] : allLocs[i].id;
        var loc = locs ? locs.getLocation(locId) : null;
        if (!loc) continue;

        var isWillowmere = locId === 'willowmere';
        var unlocked = isWillowmere || (locs.isLocationUnlocked ? locs.isLocationUnlocked(locId, completedQuests) : true);
        var hasVisited = visited.indexOf(locId) !== -1;
        var icon = loc.icon || '\u2694';
        var recLvl = loc.recommendedLevel ? ' (Lv ' + loc.recommendedLevel + ')' : '';
        var statusColor = hasVisited && !isWillowmere ? '#4ade80' : (unlocked ? '#e0e0e0' : '#555');
        var statusTag = hasVisited && !isWillowmere ? ' [cleared]' : '';

        html +=
          '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;' +
            'background:rgba(0,0,0,0.3);border:1px solid ' + (unlocked ? 'rgba(232,184,48,0.25)' : 'rgba(255,255,255,0.08)') + ';' +
            'border-radius:6px;' + (unlocked ? '' : 'opacity:0.5;') + '">' +
            '<span style="font-size:22px;">' + icon + '</span>' +
            '<div style="flex:1;text-align:left;">' +
              '<div style="color:' + statusColor + ';font-weight:bold;font-size:13px;">' +
                loc.name + recLvl + statusTag + '</div>' +
              '<div style="color:#777;font-size:11px;margin-top:2px;">' +
                (loc.description || '').substring(0, 80) + '</div>' +
            '</div>' +
            (unlocked
              ? '<button class="campaign-loc-btn" data-loc-id="' + locId + '" style="' +
                'padding:6px 14px;background:rgba(232,184,48,0.15);border:1px solid rgba(232,184,48,0.4);' +
                'border-radius:5px;color:#e8b830;font-size:12px;cursor:pointer;flex-shrink:0;">' +
                (isWillowmere ? 'Enter' : 'Explore') + '</button>'
              : '<span style="color:#555;font-size:11px;flex-shrink:0;">Locked</span>') +
          '</div>';
      }

      html += '</div>';

      // Make Camp button
      html += '<div style="margin-top:16px;">' +
        '<button id="campaign-camp-btn" style="padding:10px 24px;background:rgba(45,90,39,0.3);' +
        'border:1px solid #52b788;border-radius:8px;color:#52b788;font-size:13px;cursor:pointer;">' +
        '\uD83D\uDD25 Make Camp</button></div>';

      listDiv.innerHTML = html;
      area.appendChild(listDiv);

      listDiv.querySelectorAll('.campaign-loc-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var lid = this.getAttribute('data-loc-id');
          self._handleLocationClick(lid);
        });
      });

      var campBtn = document.getElementById('campaign-camp-btn');
      if (campBtn) {
        campBtn.addEventListener('click', function () {
          self.playSound('PLACE');
          self._showCampScene();
        });
      }
    }

    /* ---------- showLocationEntry ---------- */

    showLocationEntry(locationId) {
      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      var self = this;

      var locs = Locs();
      var loc = locs ? locs.getLocation(locationId) : null;
      if (!loc) { this.addDMLog('Unknown location.'); return; }

      var story = Story();
      var questInfo = '';
      if (loc.questId && story) {
        var q = story.getQuest(loc.questId);
        if (q) questInfo = '<p style="color:#88aaff;font-size:12px;margin:8px 0 0;">Quest: ' + q.name + '</p>';
      }

      var html =
        '<div style="text-align:center;padding:40px 24px;max-width:460px;' +
          'background:rgba(0,0,0,0.5);border:1px solid rgba(232,184,48,0.3);' +
          'border-radius:10px;">' +
          '<div style="font-size:48px;margin-bottom:8px;">' + (loc.icon || '\u2694') + '</div>' +
          '<h2 style="color:#e8b830;font-size:22px;margin:0 0 6px;">' + loc.name + '</h2>' +
          (loc.recommendedLevel
            ? '<p style="color:#aaa;font-size:12px;margin:0 0 12px;">Recommended Level: ' + loc.recommendedLevel + '</p>'
            : '') +
          '<p style="color:#bbb;font-size:13px;line-height:1.5;margin:0 0 8px;">' + (loc.description || '') + '</p>' +
          questInfo +
          '<div style="display:flex;gap:12px;justify-content:center;margin-top:24px;">' +
            '<button id="loc-enter-btn" style="padding:10px 32px;' +
              'background:linear-gradient(135deg,#e8b830,#c49020);border:none;' +
              'border-radius:6px;color:#1a1a1a;font-weight:bold;font-size:14px;cursor:pointer;">' +
              'Enter</button>' +
            '<button id="loc-back-btn" style="padding:10px 32px;' +
              'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);' +
              'border-radius:6px;color:#e0e0e0;font-size:14px;cursor:pointer;">' +
              'Back</button>' +
          '</div>' +
        '</div>';
      area.innerHTML = html;

      document.getElementById('loc-enter-btn').addEventListener('click', function () {
        self.playSound('KONG');
        self._currentEncounterIndex = 0; // reset dungeon room index on fresh entry
        self.startEncounter(locationId);
      });
      document.getElementById('loc-back-btn').addEventListener('click', function () {
        self.playSound('PLACE');
        self.showWorldMap();
      });
    }

    /* ---------- startEncounter (async) ---------- */

    async startEncounter(locationId) {
      console.log('[Campaign] Starting encounter at:', locationId);
      this.currentScene = 'encounter';
      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      var self = this;

      /* 1. Location data */
      var locs = Locs();
      var loc = locs ? locs.getLocation(locationId) : null;
      if (!loc) { this.addDMLog('Cannot find location.'); this.showWorldMap(); return; }

      if (this.state) this.state.setCurrentLocation(locationId);
      this.updateHUD();

      /* 1b. Dungeon room info */
      var encounterIdx = this._currentEncounterIndex || 0;
      var encounterData = (loc.encounters && loc.encounters.length > encounterIdx)
        ? loc.encounters[encounterIdx] : null;
      var roomName = encounterData ? encounterData.name : null;

      /* 2. Show encounter intro (DM narration) */
      var story = Story();
      var narration = story ? story.getDMNarration(locationId, 'intro') : '';
      if (!narration) narration = 'The party approaches ' + loc.name + '. Danger awaits...';
      if (roomName && encounterIdx > 0) {
        narration = 'The party advances deeper into ' + loc.name + '... Room: ' + roomName;
      } else if (roomName) {
        narration = 'The party enters ' + loc.name + ' - ' + roomName + '. Danger awaits...';
      }

      area.innerHTML =
        '<div style="text-align:center;padding:50px 24px;max-width:500px;">' +
          '<div style="font-size:48px;margin-bottom:12px;">' + (loc.icon || '\u2694') + '</div>' +
          '<h2 style="color:#e8b830;font-size:22px;margin:0 0 16px;">' + loc.name + '</h2>' +
          '<p id="encounter-narration" style="color:#c8b070;font-size:14px;line-height:1.6;' +
            'margin:0 0 28px;font-style:italic;">' + narration + '</p>' +
          '<button id="encounter-fight-btn" style="padding:14px 48px;' +
            'background:linear-gradient(135deg,#c04040,#a02020);border:none;' +
            'border-radius:8px;color:#fff;font-weight:bold;font-size:16px;cursor:pointer;' +
            'box-shadow:0 4px 16px rgba(200,60,60,0.3);">Draw Weapons!</button>' +
        '</div>';

      this.addDMLog(narration);

      /* 3. Wait for "Draw Weapons!" click */
      await new Promise(function (resolve) {
        var btn = document.getElementById('encounter-fight-btn');
        if (btn) btn.addEventListener('click', resolve);
      });

      this.playSound('KONG');

      /* 3b. Stealth option for non-boss encounters */
      var isBoss = loc && (loc.type === 'boss_lair' || locationId === 'dragon_lair');
      if (!isBoss) {
        var stealthChoice = await this._offerStealthApproach();
        if (stealthChoice === 'stealth') {
          var Rules = root.MJ.Dragon.Rules;
          var stealthRoll = Rules ? Rules.rollD20() + 4 : Math.floor(Math.random() * 20) + 5;
          this.addDMLog('\uD83E\uDD2B Riku scouts ahead... Stealth check: ' + stealthRoll);
          if (stealthRoll >= 14) {
            this.addDMLog('\u2705 The party sneaks into position! Surprise round!');
            this._surpriseRound = true;
          } else {
            this.addDMLog('\u274C Alert! The enemies spot you approaching!');
            this._surpriseRound = false;
          }
        }
      }

      /* 4. Swap active map if location maps available */
      var locMaps = root.MJ.Dragon.Campaign.LocationMaps;
      if (locMaps) {
        var mapId = loc.mapId || locationId;
        if (locMaps.createCompatibleMapObject) {
          try { root.MJ.Dragon.Map = locMaps.createCompatibleMapObject(mapId); }
          catch(e) { console.warn('[Campaign] Map swap failed for', mapId, e); }
        } else if (locMaps.setActiveMap) {
          locMaps.setActiveMap(mapId);
        }
      }

      /* 5. Get enemy instances (use encounter index for dungeons) */
      var bestiary = Best();
      var enemies = [];
      try {
        // For dungeons, use the specific encounter's enemy list
        if (encounterData && encounterData.enemies) {
          var monsterIds = encounterData.enemies;
          if (bestiary && typeof bestiary.getMonster === 'function') {
            for (var mi = 0; mi < monsterIds.length; mi++) {
              var mon = (bestiary.getMonsters ? bestiary.getMonsters(monsterIds[mi]) : null) ||
                        bestiary.getMonster(monsterIds[mi]);
              if (mon) enemies.push(mon);
            }
          } else if (bestiary && typeof bestiary.getEncounterEnemies === 'function') {
            enemies = bestiary.getEncounterEnemies(locationId, encounterIdx) || [];
          }
        } else if (bestiary && typeof bestiary.getEncounterEnemies === 'function') {
          enemies = bestiary.getEncounterEnemies(locationId) || [];
        } else if (bestiary && typeof bestiary.getMonsters === 'function') {
          /* Fallback: manually create monster instances from location data */
          var fallbackIds = loc.enemies || loc.monsters || [];
          for (var fi = 0; fi < fallbackIds.length; fi++) {
            var fmon = bestiary.getMonsters(fallbackIds[fi]) || bestiary.getMonster(fallbackIds[fi]);
            if (fmon) enemies.push(fmon);
          }
        }
      } catch (e) {
        console.warn('[Campaign] Failed to get enemies for', locationId, e);
      }

      /* 6. Create battle manager (DragonGameManager) */
      var dp = DPlay();
      if (!dp || !dp.DragonGameManager) {
        this.addDMLog('Combat system not loaded. Simulating victory...');
        await this.sleep(1000);
        this.onEncounterComplete({ victory: true, enemiesDefeated: enemies.length }, locationId);
        return;
      }

      this._battleManager = new dp.DragonGameManager();
      this._battleManager.init(this.sharedSystems);

      /* 7. Start combat — prefer campaign-aware init if available */
      if (typeof this._battleManager.initCombatFromCampaign === 'function') {
        this._battleManager.initCombatFromCampaign({
          partyState: this.state ? this.state.getPartyState() : null,
          enemies: enemies,
          onComplete: function (result) { self.onEncounterComplete(result, locationId); }
        });
      } else {
        /* Regular start — will show its own overlay inside dragon-game-area or its own overlay */
        area.innerHTML = '';
        this._battleManager.start();

        /* After battle manager start(), auto-select character and enable auto-play */
        setTimeout(function() {
          var autoToggle = document.getElementById('dragon-autoplay-toggle');
          if (autoToggle && !autoToggle.checked) autoToggle.click();
          var charBtns = document.querySelectorAll('.dragon-char-btn');
          if (charBtns.length > 0) charBtns[0].click();
        }, 500);

        /* We monitor for stop — poll for completion */
        this._pollBattleCompletion(locationId);
      }
    }

    _offerStealthApproach() {
      return new Promise(function(resolve) {
        var ga = document.getElementById('campaign-game-area');
        if (!ga) { resolve('charge'); return; }

        var panel = document.createElement('div');
        panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
          'background:rgba(0,0,0,0.95);border:2px solid #e8b830;border-radius:16px;padding:24px;' +
          'text-align:center;z-index:50;max-width:400px;';
        panel.innerHTML = '<h3 style="color:#e8b830;margin-bottom:12px;">Approach</h3>' +
          '<p style="color:#aaa;font-size:13px;margin-bottom:16px;">How does the party approach?</p>' +
          '<div style="display:flex;gap:12px;justify-content:center;">' +
            '<button id="approach-charge" style="padding:10px 24px;background:#8b0000;' +
              'border:1px solid #e74c3c;border-radius:8px;color:#fff;cursor:pointer;' +
              'font-weight:bold;">\u2694 Charge!</button>' +
            '<button id="approach-stealth" style="padding:10px 24px;background:#1a4a2e;' +
              'border:1px solid #52b788;border-radius:8px;color:#fff;cursor:pointer;' +
              'font-weight:bold;">\uD83E\uDD2B Sneak</button>' +
          '</div>';
        ga.appendChild(panel);

        document.getElementById('approach-charge').addEventListener('click', function() {
          panel.remove(); resolve('charge');
        });
        document.getElementById('approach-stealth').addEventListener('click', function() {
          panel.remove(); resolve('stealth');
        });
      });
    }

    _pollBattleCompletion(locationId) {
      var self = this;
      var check = setInterval(function () {
        /* Check if battle manager stopped OR if the battle overlay was removed */
        var battleOverlayGone = !document.getElementById('dragon-game');
        var managerStopped = !self._battleManager || !self._battleManager.running;
        if (managerStopped || (battleOverlayGone && self._battleManager)) {
          clearInterval(check);
          var result = { victory: true, enemiesDefeated: 0 };
          if (self._battleManager && self._battleManager.engine) {
            var st = self._battleManager.engine.getState ? self._battleManager.engine.getState() : null;
            if (st) {
              result.victory = st.winner === 'party' || !st.winner;
              result.enemiesDefeated = st.enemiesDefeated || 0;
            }
          }
          self._battleManager = null;
          self.onEncounterComplete(result, locationId);
        }
      }, 500);
    }

    /* ---------- onEncounterComplete ---------- */

    onEncounterComplete(result, locationId) {
      this.currentScene = 'encounter';
      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      var self = this;

      /* Remove battle overlay if still present */
      var dragonOverlay = document.getElementById('dragon-game');
      if (dragonOverlay && dragonOverlay !== this.overlay) {
        dragonOverlay.remove();
      }

      var victory = result && result.victory;
      var locs = Locs();
      var loc = locs ? locs.getLocation(locationId) : null;
      var story = Story();

      /* 1. Award XP */
      var xpGain = 0;
      var leveledUp = false;
      var newLevel = this.state ? this.state.getLevel() : 5;
      if (victory && this.state) {
        var quest = loc && loc.questId && story ? story.getQuest(loc.questId) : null;
        xpGain = quest && quest.reward ? quest.reward.xp : 300;
        var xpResult = this.state.addXP(xpGain);
        leveledUp = xpResult.leveledUp;
        newLevel = xpResult.newLevel;
        if (xpResult && xpResult.leveledUp) {
          this.addDMLog('LEVEL UP! The party reaches level ' + xpResult.newLevel + '!');
          this.playSound('ACHIEVEMENT');
          // Apply level-up to all characters
          var prog = root.MJ.Dragon.Campaign.Progression;
          if (prog) {
            var chars = root.MJ.Dragon.Characters;
            var ids = chars ? chars.CHARACTER_IDS : [];
            for (var i = 0; i < ids.length; i++) {
              var charState = this.state.getCharacterState(ids[i]);
              if (charState && prog.applyLevelUp) {
                var className = charState.class || charState.className || '';
                prog.applyLevelUp(charState, className);
                var summary = prog.getLevelUpSummary ? prog.getLevelUpSummary(className, xpResult.newLevel) : '';
                if (summary) this.addDMLog(ids[i] + ': ' + summary);
              }
            }
          }
          // Show level-up notification
          this._showLevelUpNotification(xpResult.newLevel);
        }
      }

      /* 2. Award gold and loot */
      var goldGain = 0;
      var lootItems = [];
      if (victory && this.state) {
        var quest2 = loc && loc.questId && story ? story.getQuest(loc.questId) : null;
        goldGain = quest2 && quest2.reward ? quest2.reward.gold : 25;
        this.state.addGold(goldGain);

        var loot = Loot();
        if (loot && loot.rollLoot && loc && loc.lootTable) {
          lootItems = loot.rollLoot(loc.lootTable);
          for (var li = 0; li < lootItems.length; li++) {
            this.state.addItem(lootItems[li].id || lootItems[li]);
          }
        }
      }

      /* 3. Update party HP */
      if (this.state && this._battleManager && this._battleManager.engine) {
        var engineState = this._battleManager.engine.getState ? this._battleManager.engine.getState() : null;
        if (engineState && engineState.characters) {
          for (var ci = 0; ci < engineState.characters.length; ci++) {
            var ch = engineState.characters[ci];
            if (ch.id && typeof ch.hp === 'number') {
              this.state.updateCharacterHP(ch.id, ch.hp);
            }
          }
        }
      }

      /* 3b. Multi-room dungeon progression */
      if (victory && loc && (loc.type === 'dungeon' || (loc.encounters && loc.encounters.length > 1))) {
        var encIdx = this._currentEncounterIndex || 0;
        if (loc.encounters.length > encIdx + 1) {
          // More rooms remain — advance deeper
          this._currentEncounterIndex = encIdx + 1;
          this.addDMLog('The party advances deeper into ' + loc.name + '...');
          this._battleManager = null;
          if (this.state) this.state.save();
          this.updateHUD();
          var dungeonSelf = this;
          setTimeout(function() { dungeonSelf.startEncounter(locationId); }, 2000);
          return;
        }
        // Final room cleared — fall through to mark complete
        this._currentEncounterIndex = 0;
      }

      /* 4. Mark location visited and quest complete */
      if (victory && this.state) {
        this.state.visitLocation(locationId);
        if (loc && loc.questId) {
          this.state.completeQuest(loc.questId);
          this.addDMLog('Quest complete: ' + (loc.questId));
        }
      }

      /* 5. Advance story phase if conditions met */
      if (victory && this.state && story && story.getAvailableQuests) {
        var phase = this.state.getStoryPhase();
        var completed = this.state.getCompletedQuests();
        var available = story.getAvailableQuests(phase, completed);
        /* If no more quests available for current phase, advance */
        if (available.length === 0) {
          this.state.advanceStoryPhase();
          var newPhase = this.state.getStoryPhase();
          this.addDMLog('Story advances: ' + newPhase);
        }
      }

      /* 6. Save */
      if (this.state) this.state.save();
      this._battleManager = null;

      /* 7. Check victory condition */
      var dragonDefeated = this.state && this.state.isQuestComplete('dragon_lair');

      /* 8. Narration */
      var narr = victory
        ? (story ? story.getDMNarration(locationId, 'victory') : 'The enemies are vanquished!')
        : (story ? story.getDMNarration(locationId, 'defeat') : 'The party falls back, battered and bruised.');
      if (!narr) narr = victory ? 'Victory!' : 'The party retreats.';
      this.addDMLog(narr);

      /* 9. Show result screen */
      var lootHtml = '';
      if (lootItems.length > 0) {
        lootHtml = '<div style="margin-top:12px;"><span style="color:#e8b830;font-size:12px;">Loot: </span>';
        for (var lt = 0; lt < lootItems.length; lt++) {
          var itemName = lootItems[lt].name || lootItems[lt].id || lootItems[lt];
          lootHtml += '<span style="color:#ccc;font-size:12px;">' + itemName + (lt < lootItems.length - 1 ? ', ' : '') + '</span>';
        }
        lootHtml += '</div>';
      }

      area.innerHTML =
        '<div style="text-align:center;padding:40px 24px;max-width:480px;">' +
          '<h2 style="color:' + (victory ? '#4ade80' : '#f06050') + ';font-size:28px;margin:0 0 12px;">' +
            (victory ? 'Victory!' : 'Defeat') + '</h2>' +
          '<p style="color:#bbb;font-size:14px;font-style:italic;margin:0 0 20px;">' + narr + '</p>' +
          (victory
            ? '<div style="color:#e0e0e0;font-size:13px;line-height:1.8;">' +
                '<div>XP gained: <span style="color:#88aaff;">+' + xpGain + '</span></div>' +
                '<div>Gold earned: <span style="color:#ffd700;">+' + goldGain + ' gp</span></div>' +
                lootHtml +
              '</div>'
            : '') +
          (leveledUp
            ? '<div style="margin-top:16px;padding:12px;background:rgba(232,184,48,0.15);' +
              'border:1px solid rgba(232,184,48,0.4);border-radius:6px;">' +
              '<span style="color:#e8b830;font-weight:bold;font-size:16px;">' +
              'Level Up! Party is now level ' + newLevel + '!</span></div>'
            : '') +
          '<div style="margin-top:28px;">' +
            '<button id="encounter-continue-btn" style="padding:12px 40px;' +
              'background:linear-gradient(135deg,#e8b830,#c49020);border:none;' +
              'border-radius:8px;color:#1a1a1a;font-weight:bold;font-size:15px;cursor:pointer;">' +
              'Continue</button>' +
          '</div>' +
        '</div>';

      document.getElementById('encounter-continue-btn').addEventListener('click', function () {
        self.playSound('PLACE');
        if (dragonDefeated) { self.showVictoryScreen(); }
        else { self.showWorldMap(); }
      });

      this.updateHUD();
    }

    /* ---------- showVictoryScreen ---------- */

    showVictoryScreen() {
      this.currentScene = 'victory';
      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      var self = this;

      var level = this.state ? this.state.getLevel() : 5;
      var gold = this.state ? this.state.getGold() : 0;
      var xp = this.state ? this.state.getXP() : 0;
      var completed = this.state ? this.state.getCompletedQuests() : [];
      var visited = this.state ? this.state.getVisitedLocations() : [];

      this.addDMLog('The dragon Scorchfang has been slain! The realm is saved!');

      area.innerHTML =
        '<div style="text-align:center;padding:50px 24px;max-width:520px;">' +
          '<div style="font-size:64px;margin-bottom:8px;">\uD83D\uDC09\u2694\uFE0F</div>' +
          '<h1 style="color:#e8b830;font-size:32px;margin:0 0 6px;font-family:Georgia,serif;' +
            'text-shadow:0 0 20px rgba(232,184,48,0.4);">Campaign Complete!</h1>' +
          '<p style="color:#b8956a;font-size:15px;font-style:italic;margin:0 0 28px;">' +
            'Scorchfang has been slain. The realm is free.</p>' +
          '<div style="background:rgba(0,0,0,0.4);border:1px solid rgba(232,184,48,0.25);' +
            'border-radius:8px;padding:20px;text-align:left;color:#ccc;font-size:13px;line-height:2;">' +
            '<div>Final Level: <span style="color:#e8b830;font-weight:bold;">' + level + '</span></div>' +
            '<div>Total XP: <span style="color:#88aaff;">' + xp + '</span></div>' +
            '<div>Gold Earned: <span style="color:#ffd700;">' + gold + ' gp</span></div>' +
            '<div>Encounters Cleared: <span style="color:#4ade80;">' + (visited.length - 1) + '</span></div>' +
            '<div>Quests Completed: <span style="color:#4ade80;">' + completed.length + '</span></div>' +
          '</div>' +
          '<div style="display:flex;gap:12px;justify-content:center;margin-top:28px;">' +
            '<button id="victory-replay-btn" style="padding:12px 36px;' +
              'background:linear-gradient(135deg,#e8b830,#c49020);border:none;border-radius:8px;' +
              'color:#1a1a1a;font-weight:bold;font-size:15px;cursor:pointer;">Play Again</button>' +
            '<button id="victory-back-btn" style="padding:12px 36px;' +
              'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);' +
              'border-radius:8px;color:#e0e0e0;font-size:15px;cursor:pointer;">Back to Games</button>' +
          '</div>' +
        '</div>';

      document.getElementById('victory-replay-btn').addEventListener('click', function () {
        self.playSound('PLACE');
        self.showTitleScreen();
      });
      document.getElementById('victory-back-btn').addEventListener('click', function () {
        self.stop();
      });
    }

    /* ---------- stop ---------- */

    stop() {
      if (this.state) this.state.save();
      this.running = false;
      this.currentScene = null;
      if (this._battleManager) {
        try { this._battleManager.stop(); } catch (e) { /* swallow */ }
        this._battleManager = null;
      }
      if (this.overlay) { this.overlay.remove(); this.overlay = null; }
      /* Return to intro screen */
      if (root.MJ.IntroScreen) {
        root.MJ.IntroScreen.show({
          onSelect: function (id) { if (root.MJ.Main) root.MJ.Main.startFromIntro(id); }
        });
      }
    }

    /* ---------- updateHUD ---------- */

    updateHUD() {
      if (!this.state) return;
      var lvl = document.getElementById('campaign-hud-level');
      var gld = document.getElementById('campaign-hud-gold');
      var xp  = document.getElementById('campaign-hud-xp');
      var qst = document.getElementById('campaign-hud-quest');
      if (lvl) lvl.textContent = 'Lv ' + this.state.getLevel();
      if (gld) gld.textContent = this.state.getGold() + ' gp';
      if (xp)  xp.textContent  = this.state.getXP() + ' XP';
      if (qst) {
        var story = Story();
        var phase = this.state.getStoryPhase();
        var desc = story && story.getStoryPhaseDescription ? story.getStoryPhaseDescription(phase) : null;
        qst.textContent = desc ? desc.title : '';
      }
    }

    /* ---------- _showSimpleShop ---------- */

    _showSimpleShop() {
      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      var self = this;

      var loot = Loot();
      var shops = ['smithShop', 'herbShop', 'specialShop'];
      var gold = this.state ? this.state.getGold() : 0;

      var html =
        '<div style="text-align:center;padding:30px 20px;max-width:540px;width:100%;overflow-y:auto;max-height:100%;">' +
          '<h2 style="color:#e8b830;font-size:20px;margin:0 0 4px;">Willowmere Shops</h2>' +
          '<p id="shop-gold-display" style="color:#ffd700;font-size:13px;margin:0 0 16px;">Gold: ' + gold + ' gp</p>';

      var hasAnyShop = false;
      for (var s = 0; s < shops.length; s++) {
        var shopData = null;
        try { shopData = loot ? loot.getShopInventory(shops[s]) : null; } catch (e) { /* skip */ }
        if (!shopData) continue;
        hasAnyShop = true;

        html += '<div style="margin-bottom:16px;text-align:left;">' +
          '<h3 style="color:#c8b070;font-size:14px;margin:0 0 6px;">' + (shopData.name || shops[s]) + '</h3>' +
          '<p style="color:#777;font-size:11px;margin:0 0 8px;">' + (shopData.description || '') + '</p>';

        var items = shopData.items || [];
        for (var it = 0; it < items.length; it++) {
          var item = items[it].item || items[it];
          var price = items[it].price || item.price || 0;
          html +=
            '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;' +
              'background:rgba(0,0,0,0.3);border-radius:4px;margin-bottom:4px;">' +
              '<div style="flex:1;color:#ccc;font-size:12px;">' + (item.name || item.id) +
                '<span style="color:#777;font-size:11px;margin-left:6px;">' +
                  (item.description ? item.description.substring(0, 60) : '') + '</span></div>' +
              '<span style="color:#ffd700;font-size:12px;flex-shrink:0;">' + price + ' gp</span>' +
              '<button class="shop-buy-btn" data-item-id="' + (item.id || '') + '" data-price="' + price + '" ' +
                'style="padding:3px 10px;background:rgba(72,180,72,0.2);border:1px solid rgba(72,180,72,0.4);' +
                'border-radius:4px;color:#4ade80;font-size:11px;cursor:pointer;flex-shrink:0;">Buy</button>' +
            '</div>';
        }
        html += '</div>';
      }

      if (!hasAnyShop) {
        html += '<p style="color:#777;font-size:13px;">The shops are closed or have no wares.</p>';
      }

      html += '<button id="shop-back-btn" style="padding:8px 28px;margin-top:12px;' +
        'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);' +
        'border-radius:6px;color:#e0e0e0;font-size:13px;cursor:pointer;">Back</button></div>';
      area.innerHTML = html;

      area.querySelectorAll('.shop-buy-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var itemId = this.getAttribute('data-item-id');
          var price = parseInt(this.getAttribute('data-price'), 10) || 0;
          if (!self.state) return;
          if (self.state.getGold() < price) {
            self.addDMLog('Not enough gold.');
            return;
          }
          self.state.spendGold(price);
          self.state.addItem(itemId);
          self.state.save();
          self.addDMLog('Purchased: ' + itemId + ' (-' + price + ' gp)');
          self.playSound('PLACE');
          self.updateHUD();
          var gd = document.getElementById('shop-gold-display');
          if (gd) gd.textContent = 'Gold: ' + self.state.getGold() + ' gp';
        });
      });

      document.getElementById('shop-back-btn').addEventListener('click', function () {
        self.playSound('PLACE');
        self.showHamlet();
      });
    }

    /* ---------- _showSimpleQuestBoard ---------- */

    _showSimpleQuestBoard() {
      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      var self = this;

      var story = Story();
      var phase = this.state ? this.state.getStoryPhase() : 'act1_arrival';
      var completed = this.state ? this.state.getCompletedQuests() : [];
      var available = story && story.getAvailableQuests ? story.getAvailableQuests(phase, completed) : [];

      var html =
        '<div style="text-align:center;padding:30px 20px;max-width:500px;width:100%;overflow-y:auto;max-height:100%;">' +
          '<h2 style="color:#e8b830;font-size:20px;margin:0 0 16px;">Quest Board</h2>';

      if (available.length > 0) {
        html += '<h3 style="color:#88aaff;font-size:14px;margin:0 0 8px;text-align:left;">Available Quests</h3>';
        for (var a = 0; a < available.length; a++) {
          var q = available[a];
          html +=
            '<div style="text-align:left;padding:10px 12px;background:rgba(0,0,0,0.3);' +
              'border:1px solid rgba(100,120,200,0.3);border-radius:6px;margin-bottom:8px;">' +
              '<div style="color:#88aaff;font-weight:bold;font-size:13px;">' + (q.name || q.id) + '</div>' +
              '<div style="color:#999;font-size:11px;margin-top:4px;">' + (q.desc || '') + '</div>' +
              (q.reward ? '<div style="color:#e8b830;font-size:11px;margin-top:4px;">Reward: ' +
                (q.reward.xp || 0) + ' XP, ' + (q.reward.gold || 0) + ' gp</div>' : '') +
            '</div>';
        }
      } else {
        html += '<p style="color:#777;font-size:13px;">No new quests available at this time.</p>';
      }

      if (completed.length > 0) {
        html += '<h3 style="color:#4ade80;font-size:14px;margin:16px 0 8px;text-align:left;">Completed Quests</h3>';
        for (var c = 0; c < completed.length; c++) {
          var cq = story ? story.getQuest(completed[c]) : null;
          html +=
            '<div style="text-align:left;padding:8px 12px;background:rgba(0,0,0,0.2);' +
              'border-radius:4px;margin-bottom:4px;color:#4ade80;font-size:12px;opacity:0.7;">' +
              '\u2714 ' + (cq ? cq.name : completed[c]) +
            '</div>';
        }
      }

      html += '<button id="quest-back-btn" style="padding:8px 28px;margin-top:16px;' +
        'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);' +
        'border-radius:6px;color:#e0e0e0;font-size:13px;cursor:pointer;">Back</button></div>';
      area.innerHTML = html;

      document.getElementById('quest-back-btn').addEventListener('click', function () {
        self.playSound('PLACE');
        if (self.currentScene === 'hamlet' || self.state.getCurrentLocation() === 'willowmere') {
          self.showHamlet();
        } else {
          self.showWorldMap();
        }
      });
    }

    /* ---------- _showInventoryPanel ---------- */

    _showInventoryPanel() {
      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      var self = this;

      var inv = this.state ? this.state.getInventory() : [];
      var loot = Loot();

      var html =
        '<div style="text-align:center;padding:30px 20px;max-width:560px;width:100%;overflow-y:auto;max-height:100%;">' +
          '<h2 style="color:#e8b830;font-size:20px;margin:0 0 16px;">Inventory</h2>';

      if (inv.length === 0) {
        html += '<p style="color:#777;font-size:13px;">The party carries no items.</p>';
      } else {
        for (var i = 0; i < inv.length; i++) {
          var item = loot ? loot.getItem(inv[i]) : null;
          var cat = item ? item.category : '';
          var isEquippable = (cat === 'weapon' || cat === 'armor');
          var isUsable = (cat === 'potion' || cat === 'scroll' || (item && item.consumable));

          html +=
            '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;' +
              'background:rgba(0,0,0,0.3);border-radius:6px;margin-bottom:6px;">' +
              '<div style="flex:1;text-align:left;">' +
                '<div style="color:#ccc;font-size:12px;font-weight:bold;">' + (item ? item.name : inv[i]) + '</div>' +
                (item && item.description
                  ? '<div style="color:#777;font-size:10px;margin-top:2px;">' + item.description.substring(0, 80) + '</div>'
                  : '') +
                (item && item.damage ? '<div style="color:#e07050;font-size:10px;margin-top:2px;">Dmg: ' + item.damage + '</div>' : '') +
                (item && item.ac ? '<div style="color:#50a0e0;font-size:10px;margin-top:2px;">AC: ' + item.ac + '</div>' : '') +
              '</div>' +
              '<div style="display:flex;gap:4px;">';

          if (isEquippable) {
            html += '<button class="inv-equip-btn" data-item="' + inv[i] + '" data-slot="' + cat + '" ' +
              'style="padding:4px 10px;background:rgba(100,150,255,0.2);border:1px solid rgba(100,150,255,0.4);' +
              'border-radius:4px;color:#88aaff;font-size:10px;cursor:pointer;white-space:nowrap;">Equip</button>';
          }
          if (isUsable) {
            html += '<button class="inv-use-btn" data-item="' + inv[i] + '" ' +
              'style="padding:4px 10px;background:rgba(100,255,100,0.2);border:1px solid rgba(100,255,100,0.4);' +
              'border-radius:4px;color:#80e080;font-size:10px;cursor:pointer;white-space:nowrap;">Use</button>';
          }

          html += '</div></div>';
        }
      }

      html += '<button id="inv-back-btn" style="padding:8px 28px;margin-top:16px;' +
        'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);' +
        'border-radius:6px;color:#e0e0e0;font-size:13px;cursor:pointer;">Back</button></div>';
      area.innerHTML = html;

      // Wire up Equip buttons — show character picker
      var equipBtns = area.querySelectorAll('.inv-equip-btn');
      for (var e = 0; e < equipBtns.length; e++) {
        equipBtns[e].addEventListener('click', function () {
          var itemId = this.getAttribute('data-item');
          var slot = this.getAttribute('data-slot');
          self._showEquipPicker(itemId, slot);
        });
      }

      // Wire up Use buttons — apply to first character that benefits
      var useBtns = area.querySelectorAll('.inv-use-btn');
      for (var u = 0; u < useBtns.length; u++) {
        useBtns[u].addEventListener('click', function () {
          var itemId = this.getAttribute('data-item');
          self._useItem(itemId);
        });
      }

      document.getElementById('inv-back-btn').addEventListener('click', function () {
        self.playSound('PLACE');
        self._restoreCurrentScene();
      });
    }

    _showEquipPicker(itemId, slot) {
      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      var self = this;
      var chars = root.MJ.Dragon.Characters;
      var ids = chars ? chars.CHARACTER_IDS : ['kenji','mei','yuki','riku','tomoe','sora'];
      var charData = chars ? chars.CHARACTERS : {};

      var html = '<div style="text-align:center;padding:30px 20px;max-width:400px;width:100%;">';
      html += '<h3 style="color:#88aaff;font-size:16px;margin:0 0 12px;">Equip to whom?</h3>';

      for (var i = 0; i < ids.length; i++) {
        var c = charData[ids[i]] || {};
        html += '<button class="equip-char-btn" data-char="' + ids[i] + '" style="display:block;width:100%;' +
          'padding:8px 12px;margin-bottom:6px;background:rgba(0,0,0,0.3);border:1px solid ' + (c.color||'#888') + ';' +
          'border-radius:6px;color:#e0e0e0;font-size:13px;cursor:pointer;text-align:left;">' +
          '<span style="margin-right:8px;">' + (c.avatar||'?') + '</span>' + (c.name||ids[i]) + '</button>';
      }

      html += '<button id="equip-cancel" style="padding:8px 28px;margin-top:12px;' +
        'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);' +
        'border-radius:6px;color:#e0e0e0;font-size:13px;cursor:pointer;">Cancel</button></div>';
      area.innerHTML = html;

      var charBtns = area.querySelectorAll('.equip-char-btn');
      for (var b = 0; b < charBtns.length; b++) {
        charBtns[b].addEventListener('click', function () {
          var charId = this.getAttribute('data-char');
          if (self.state && self.state.equipItem) {
            self.state.equipItem(charId, slot, itemId);
          }
          self.playSound('PLACE');
          self._showInventoryPanel();
        });
      }

      document.getElementById('equip-cancel').addEventListener('click', function () {
        self.playSound('PLACE');
        self._showInventoryPanel();
      });
    }

    _useItem(itemId) {
      var loot = Loot();
      var item = loot ? loot.getItem(itemId) : null;
      if (!item) return;

      // For potions, heal the most damaged party member
      if (item.category === 'potion' && this.state) {
        var party = this.state.getPartyState();
        var chars = party.characters || [];
        var mostDamaged = null;
        var biggestGap = 0;
        for (var i = 0; i < chars.length; i++) {
          var gap = (chars[i].maxHp || 0) - (chars[i].hp || 0);
          if (gap > biggestGap) { biggestGap = gap; mostDamaged = chars[i]; }
        }
        if (mostDamaged && biggestGap > 0 && item.healAmount) {
          var newHp = Math.min(mostDamaged.maxHp, mostDamaged.hp + (item.healAmount || 0));
          this.state.updateCharacterHP(mostDamaged.id, newHp);
          // Remove consumed item from inventory
          if (this.state.removeItem) { this.state.removeItem(itemId); }
        }
      }

      this.playSound('PLACE');
      this._showInventoryPanel();
    }

    /* ---------- _showPartyPanel ---------- */

    _showPartyPanel() {
      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      var self = this;
      var chars = root.MJ.Dragon.Characters;
      var ids = chars ? chars.CHARACTER_IDS : ['kenji','mei','yuki','riku','tomoe','sora'];
      var charData = chars ? chars.CHARACTERS : {};

      var html = '<div style="max-width:700px;margin:20px auto;padding:20px;overflow-y:auto;max-height:100%;">';
      html += '<h3 style="color:#e8b830;text-align:center;margin-bottom:16px;">Party</h3>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';

      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var c = charData[id] || {};
        var state = this.state && this.state.getCharacterState ? this.state.getCharacterState(id) : null;
        var hp = state ? state.hp : (c.hp || '?');
        var maxHp = state ? state.maxHp : (c.hp || '?');
        var equip = state ? state.equipment : {};

        html += '<div style="background:rgba(0,0,0,0.3);border:2px solid ' + (c.color || '#888') + ';border-radius:10px;padding:12px;">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
        html += '<span style="font-size:28px;">' + (c.avatar || '?') + '</span>';
        html += '<div><div style="color:' + (c.color||'#888') + ';font-weight:bold;">' + (c.name||id) + '</div>';
        html += '<div style="color:#aaa;font-size:11px;">' + (c.race||'') + ' ' + (c['class']||'') + ' Lv ' + (this.state ? this.state.getLevel() : 5) + '</div></div></div>';

        // HP bar
        var hpPct = maxHp > 0 ? Math.round(hp / maxHp * 100) : 100;
        var hpColor = hpPct > 60 ? '#4ade80' : hpPct > 30 ? '#e8b830' : '#e74c3c';
        html += '<div style="background:rgba(0,0,0,0.3);border-radius:4px;height:8px;margin-bottom:8px;"><div style="background:' + hpColor + ';height:100%;border-radius:4px;width:' + hpPct + '%;"></div></div>';
        html += '<div style="color:#ccc;font-size:11px;">HP: ' + hp + '/' + maxHp + ' | AC: ' + (c.ac || '?') + '</div>';

        // Stats
        if (c.stats) {
          html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-top:6px;font-size:10px;color:#888;">';
          var statNames = ['STR','DEX','CON','INT','WIS','CHA'];
          var statKeys = ['str','dex','con','int','wis','cha'];
          for (var s = 0; s < 6; s++) {
            var val = c.stats[statKeys[s]] || 10;
            var mod = Math.floor((val - 10) / 2);
            html += '<div>' + statNames[s] + ': ' + val + ' (' + (mod >= 0 ? '+' : '') + mod + ')</div>';
          }
          html += '</div>';
        }

        // Equipment
        if (equip && Object.keys(equip).length > 0) {
          var equipNames = [];
          var loot = Loot();
          for (var slot in equip) {
            if (equip[slot]) {
              var eItem = loot ? loot.getItem(equip[slot]) : null;
              equipNames.push(eItem ? eItem.name : equip[slot]);
            }
          }
          if (equipNames.length > 0) {
            html += '<div style="margin-top:6px;font-size:10px;color:#daa520;">Equipped: ' + equipNames.join(', ') + '</div>';
          }
        }

        html += '</div>';
      }

      html += '</div>';
      html += '<button id="party-back-btn" style="display:block;margin:16px auto;padding:8px 24px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#e0e0e0;cursor:pointer;">Close</button>';
      html += '</div>';

      area.innerHTML = html;
      document.getElementById('party-back-btn').addEventListener('click', function () {
        self.playSound('PLACE');
        self._restoreCurrentScene();
      });
    }

    /* ---------- _restoreCurrentScene ---------- */

    _restoreCurrentScene() {
      switch (this.currentScene) {
        case 'hamlet':     this.showHamlet();    break;
        case 'world_map':  this.showWorldMap();  break;
        case 'title':      this.showTitleScreen(); break;
        case 'victory':    this.showVictoryScreen(); break;
        default:           this.showWorldMap();  break;
      }
    }

    /* ---------- _talkToNPC ---------- */

    async _talkToNPC(npcId) {
      var story = Story();
      var scriptedLines = story ? story.getNPCDialogue(npcId, this.state ? this.state.getStoryPhase() : 1) : ['Welcome, adventurer.'];

      var npcLine = '';

      // Try LLM first
      if (this._tutorBridge && this._tutorBridge.isAvailable()) {
        var npcNames = { innkeeper_gruff: 'Gruff the Innkeeper', blacksmith_hilda: 'Hilda the Blacksmith', herbalist_willow: 'Willow the Herbalist' };
        var npcName = npcNames[npcId] || npcId;
        var context = 'Story phase: ' + (this.state ? this.state.getStoryPhase() : 1) + '. ';
        context += 'Completed quests: ' + (this.state ? this.state.getCompletedQuests().join(', ') || 'none' : 'none') + '. ';
        context += 'Party level: ' + (this.state ? this.state.getLevel() : 5) + '. ';
        context += 'Gold: ' + (this.state ? this.state.getGold() : 50) + '.';

        var prompt = 'You are ' + npcName + ', a character in a fantasy village called Willowmere. ' +
          'The village is threatened by wolves, ogres, undead, and a dragon named Scorchfang. ' +
          'Speak in character as a medieval fantasy NPC. Be helpful but colorful. ' +
          'Give hints about quests and dangers. Keep response to 2-3 sentences.';

        try {
          var response = await this._tutorBridge.ollama.generate(prompt,
            'A party of adventurers visits you. ' + context + ' Greet them and share what you know.',
            { maxTokens: 100, temperature: 0.8 });
          if (response) {
            npcLine = response;
          }
        } catch(e) {}
      }

      // Scripted fallback
      if (!npcLine) {
        var line = Array.isArray(scriptedLines) ? scriptedLines[Math.floor(Math.random() * scriptedLines.length)] : scriptedLines;
        npcLine = line;
      }

      // Show dialogue choices panel
      this._showDialogueChoices(npcId, npcLine);
    }

    /* ---------- _showLevelUpNotification ---------- */

    _showLevelUpNotification(newLevel) {
      var ga = document.getElementById('campaign-game-area');
      if (!ga) return;
      var notif = document.createElement('div');
      notif.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'background:rgba(0,0,0,0.9);border:2px solid #e8b830;border-radius:16px;padding:30px 50px;' +
        'text-align:center;z-index:100;animation:fadeIn 0.5s;';
      notif.innerHTML = '<div style="font-size:28px;color:#e8b830;font-weight:bold;text-shadow:0 0 20px rgba(232,184,48,0.5);">LEVEL UP!</div>' +
        '<div style="font-size:18px;color:#4ade80;margin-top:8px;">Party reaches Level ' + newLevel + '</div>' +
        '<div style="color:#aaa;margin-top:12px;font-size:13px;">New abilities and power unlocked!</div>' +
        '<button onclick="this.parentElement.remove()" style="margin-top:16px;padding:8px 24px;background:#e8b830;border:none;border-radius:6px;color:#1a1a1a;font-weight:bold;cursor:pointer;">Continue</button>';
      ga.appendChild(notif);
    }

    /* ---------- _handleTutorQuestion ---------- */

    _handleTutorQuestion(question) {
      var self = this;
      if (this._tutorBridge && typeof this._tutorBridge.ask === 'function') {
        this._tutorBridge.ask(question).then(function (answer) {
          self.addDMLog('DM: ' + (answer || 'The spirits are silent.'));
        }).catch(function () {
          self.addDMLog('DM: (could not reach the oracle)');
        });
      } else {
        this.addDMLog('DM: The oracle is not available right now.');
      }
    }

    /* ---------- _checkRandomEncounter ---------- */

    /** 15% chance of a random wilderness encounter when traveling. */
    _checkRandomEncounter() {
      if (Math.random() < 0.15) {
        var encounters = [
          { enemies: ['wolf', 'wolf', 'dire_wolf'], name: 'Wolf Pack' },
          { enemies: ['bandit', 'bandit', 'bandit_captain'], name: 'Bandit Ambush' },
          { enemies: ['orc_warrior', 'orc_warrior'], name: 'Orc Patrol' },
          { enemies: ['giant_spider', 'giant_spider', 'giant_spider'], name: 'Spider Nest' }
        ];
        var enc = encounters[Math.floor(Math.random() * encounters.length)];
        this.addDMLog('Random encounter: ' + enc.name + '!');
        return enc;
      }
      return null;
    }

    /** Start a random encounter, then continue to the destination. */
    async _startRandomEncounter(enc, destinationLocationId) {
      this.currentScene = 'encounter';
      var area = document.getElementById('campaign-game-area');
      if (!area) return;
      var self = this;

      area.innerHTML =
        '<div style="text-align:center;padding:50px 24px;max-width:500px;">' +
          '<div style="font-size:48px;margin-bottom:12px;">\u2694\uFE0F</div>' +
          '<h2 style="color:#f06050;font-size:22px;margin:0 0 16px;">' + enc.name + '</h2>' +
          '<p style="color:#c8b070;font-size:14px;line-height:1.6;margin:0 0 28px;font-style:italic;">' +
            'While traveling, the party is ambushed!</p>' +
          '<button id="random-enc-fight-btn" style="padding:14px 48px;' +
            'background:linear-gradient(135deg,#c04040,#a02020);border:none;' +
            'border-radius:8px;color:#fff;font-weight:bold;font-size:16px;cursor:pointer;' +
            'box-shadow:0 4px 16px rgba(200,60,60,0.3);">Draw Weapons!</button>' +
        '</div>';

      await new Promise(function (resolve) {
        var btn = document.getElementById('random-enc-fight-btn');
        if (btn) btn.addEventListener('click', resolve);
      });

      this.playSound('KONG');

      /* Get enemy instances from bestiary */
      var bestiary = Best();
      var enemies = [];
      if (bestiary && enc.enemies) {
        for (var i = 0; i < enc.enemies.length; i++) {
          var mon = (bestiary.getMonster ? bestiary.getMonster(enc.enemies[i]) : null) ||
                    (bestiary.getMonsters ? bestiary.getMonsters(enc.enemies[i]) : null);
          if (mon) enemies.push(mon);
        }
      }

      /* Start combat */
      var dp = DPlay();
      if (!dp || !dp.DragonGameManager) {
        this.addDMLog('Combat system not loaded. The ambushers flee...');
        await this.sleep(1000);
        // Continue to destination
        if (destinationLocationId === 'willowmere') { this.showHamlet(); }
        else { this.showLocationEntry(destinationLocationId); }
        return;
      }

      this._battleManager = new dp.DragonGameManager();
      this._battleManager.init(this.sharedSystems);

      if (typeof this._battleManager.initCombatFromCampaign === 'function') {
        this._battleManager.initCombatFromCampaign({
          partyState: this.state ? this.state.getPartyState() : null,
          enemies: enemies,
          onComplete: function (result) {
            self._battleManager = null;
            var victory = result && result.victory;
            if (victory) {
              self.addDMLog('The ' + enc.name + ' is defeated! The party presses on.');
              if (self.state) { self.state.addXP(100); self.state.save(); }
            } else {
              self.addDMLog('The party retreats from the ambush.');
            }
            self.updateHUD();
            // Continue to destination regardless
            if (destinationLocationId === 'willowmere') { self.showHamlet(); }
            else { self.showLocationEntry(destinationLocationId); }
          }
        });
      } else {
        // Simulate victory and continue
        this.addDMLog('The ' + enc.name + ' is scattered!');
        await this.sleep(1500);
        this._battleManager = null;
        if (destinationLocationId === 'willowmere') { this.showHamlet(); }
        else { this.showLocationEntry(destinationLocationId); }
      }
    }

    /* ---------- _showDialogueChoices ---------- */

    async _showDialogueChoices(npcId, npcLine) {
      var ga = document.getElementById('campaign-game-area');
      if (!ga) return;
      var self = this;

      // Generate choices via LLM or scripted
      var choices = this._getDialogueChoices(npcId);

      var panel = document.createElement('div');
      panel.style.cssText = 'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);' +
        'background:rgba(0,0,0,0.95);border:2px solid #e8b830;border-radius:12px;padding:16px 20px;' +
        'max-width:500px;width:90%;z-index:50;';

      var npcNames = { innkeeper_gruff:'Gruff', blacksmith_hilda:'Hilda', herbalist_willow:'Willow', quest_giver:'Old Theron' };
      panel.innerHTML = '<div style="color:#e8b830;font-weight:bold;margin-bottom:8px;">' + (npcNames[npcId]||npcId) + '</div>' +
        '<div style="color:#ccc;margin-bottom:12px;font-size:13px;">' + npcLine + '</div>' +
        '<div id="dialogue-choices" style="display:flex;flex-direction:column;gap:6px;"></div>';

      var choiceDiv = panel.querySelector('#dialogue-choices');
      for (var i = 0; i < choices.length; i++) {
        var btn = document.createElement('button');
        btn.style.cssText = 'padding:8px 12px;background:rgba(232,184,48,0.1);border:1px solid rgba(232,184,48,0.3);' +
          'border-radius:6px;color:#e0e0e0;cursor:pointer;text-align:left;font-size:12px;';
        btn.textContent = choices[i].text;
        btn.dataset.idx = String(i);
        btn.addEventListener('click', function() {
          var idx = parseInt(this.dataset.idx);
          panel.remove();
          self._handleDialogueChoice(npcId, choices[idx]);
        });
        choiceDiv.appendChild(btn);
      }
      ga.appendChild(panel);
    }

    _getDialogueChoices(npcId) {
      // Scripted choices per NPC
      var choices = {
        innkeeper_gruff: [
          { text: '"Tell me about the dangers nearby." (Ask about quests)', effect: 'quest_info', disposition: 1 },
          { text: '"Just a room for the night, thanks." (Polite)', effect: 'rest', disposition: 1 },
          { text: '"Your ale better be worth the coin." (Rude)', effect: 'none', disposition: -1 }
        ],
        blacksmith_hilda: [
          { text: '"Show me your finest weapons." (Browse shop)', effect: 'shop', disposition: 0 },
          { text: '"Can you forge something special for us?" (Request custom)', effect: 'custom_hint', disposition: 1 },
          { text: '"We need gear for fighting a dragon." (Mention dragon)', effect: 'dragon_hint', disposition: 2 }
        ],
        herbalist_willow: [
          { text: '"What potions do you recommend?" (Browse)', effect: 'shop', disposition: 0 },
          { text: '"Tell me about the swamp." (Ask about Cursed Swamp)', effect: 'swamp_info', disposition: 1 },
          { text: '"Do you know any healing magic?" (Ask for help)', effect: 'free_potion', disposition: 1 }
        ]
      };
      return choices[npcId] || [
        { text: '"Thank you." (Polite)', effect: 'none', disposition: 1 },
        { text: '"Tell me more." (Curious)', effect: 'more_info', disposition: 0 },
        { text: '"I must go." (Leave)', effect: 'leave', disposition: 0 }
      ];
    }

    async _handleDialogueChoice(npcId, choice) {
      // Apply disposition
      if (this.state && this.state.setFlag) {
        var dispKey = 'npc_' + npcId + '_disposition';
        var current = this.state.getFlag(dispKey) || 0;
        this.state.setFlag(dispKey, current + (choice.disposition || 0));
      }

      // Handle effects
      switch (choice.effect) {
        case 'quest_info':
          this.addDMLog('Gruff leans in conspiratorially and shares what he knows...');
          this._showSimpleQuestBoard(); break;
        case 'shop':
          this._showSimpleShop(); break;
        case 'rest':
          // Rest logic
          if (this.state && this.state.getGold() >= 5) {
            this.state.spendGold(5); if (this.state.healParty) this.state.healParty();
            this.addDMLog('The party rests and heals at the inn. (-5 gp)');
          }
          this.showHamlet(); break;
        case 'dragon_hint':
          this.addDMLog('Hilda: "A dragon, ye say? I\'ve got some fire-resistant alloys... Come back when ye\'ve got the gold."');
          break;
        case 'custom_hint':
          this.addDMLog('Hilda: "Bring me orc steel from the Iron Tusk camp, and I\'ll forge ye something special."');
          break;
        case 'swamp_info':
          this.addDMLog('Willow: "The Cursed Swamp holds a hag of ancient power. But she guards rare herbs worth a fortune."');
          break;
        case 'free_potion':
          if (this.state) { this.state.addItem('potion_healing'); this.addDMLog('Willow gives you a healing potion! "First one\'s free."'); }
          break;
        default:
          this.addDMLog('The conversation ends.');
          break;
      }
    }

    /* ---------- _partyBanter ---------- */

    async _partyBanter() {
      var banterLines = {
        kenji_yuki: [
          { speaker: 'Kenji', line: 'Hey Yuki, got any spells that make the walking easier?' },
          { speaker: 'Yuki', line: 'I have a spell that makes you silent. Shall I cast it?' }
        ],
        riku_tomoe: [
          { speaker: 'Riku', line: 'So, Tomoe... ever think about, y\'know, NOT wearing 60 pounds of armor?' },
          { speaker: 'Tomoe', line: 'My oath requires it. Besides, it builds character.' }
        ],
        mei_sora: [
          { speaker: 'Mei', line: 'The probability of encountering hostiles in this terrain is approximately 15%.' },
          { speaker: 'Sora', line: '...I just look at the tracks. Same answer, less math.' }
        ],
        kenji_riku: [
          { speaker: 'Kenji', line: 'You ever fight anything head-on, kid?' },
          { speaker: 'Riku', line: 'Why would I? That\'s what YOU\'RE for.' }
        ],
        yuki_tomoe: [
          { speaker: 'Yuki', line: 'Tell me of your oath, Tomoe. What drives such devotion?' },
          { speaker: 'Tomoe', line: 'A dragon burned my village. My oath is my answer.' }
        ],
        mei_kenji: [
          { speaker: 'Mei', line: 'Kenji, your reckless attacks reduce your expected survival by 23%.' },
          { speaker: 'Kenji', line: 'Yeah, but they increase my FUN by 100%!' }
        ],
        sora_all: [
          { speaker: 'Sora', line: 'Tracks ahead. Something large passed this way recently.' },
          { speaker: 'Kenji', line: 'FINALLY! Something to hit!' }
        ],
        riku_mei: [
          { speaker: 'Riku', line: 'So Mei, if I pray hard enough, will your god heal my wallet too?' },
          { speaker: 'Mei', line: 'The divine works in mysterious ways. Your wallet is beyond even holy intervention.' }
        ]
      };

      var keys = Object.keys(banterLines);
      var pair = banterLines[keys[Math.floor(Math.random() * keys.length)]];

      // Try LLM banter if available
      if (this._tutorBridge && this._tutorBridge.isAvailable()) {
        try {
          var prompt = 'You are narrating party banter between D&D adventurers traveling through wilderness. ' +
            'Write a brief 2-line exchange between two party members. Keep it witty, in-character, and fun. ' +
            'Characters: Kenji (loud barbarian), Mei (analytical cleric), Yuki (wise wizard), Riku (sarcastic rogue), Tomoe (noble paladin), Sora (quiet ranger).';
          var response = await this._tutorBridge.ollama.generate(prompt, 'The party walks along the road. Generate a brief funny exchange.', { maxTokens: 80, temperature: 0.9 });
          if (response) { this.addDMLog('\uD83D\uDDE3 ' + response); return; }
        } catch(e) {}
      }

      // Scripted fallback
      for (var i = 0; i < pair.length; i++) {
        this.addDMLog(pair[i].speaker + ': "' + pair[i].line + '"');
      }
    }

    /* ---------- _showCampScene ---------- */

    async _showCampScene() {
      var ga = document.getElementById('campaign-game-area');
      if (!ga) return;
      var self = this;

      var html = '<div style="max-width:600px;margin:40px auto;text-align:center;padding:20px;">';
      html += '<div style="font-size:48px;margin-bottom:12px;">\uD83D\uDD25</div>';
      html += '<h3 style="color:#e8b830;">Make Camp</h3>';
      html += '<p style="color:#aaa;font-size:13px;">The party sets up camp in the wilderness. A small fire crackles as night falls.</p>';
      html += '<div style="margin:16px 0;display:flex;flex-direction:column;gap:8px;max-width:300px;margin:16px auto;">';
      html += '<button id="camp-rest" style="padding:10px;background:#2d5a27;border:1px solid #52b788;border-radius:8px;color:#e0e0e0;cursor:pointer;">Rest (Free, heals 50% HP, 10% ambush risk)</button>';
      html += '<button id="camp-talk" style="padding:10px;background:#5c4a1a;border:1px solid #e8b830;border-radius:8px;color:#e0e0e0;cursor:pointer;">Talk around the campfire</button>';
      html += '<button id="camp-leave" style="padding:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#e0e0e0;cursor:pointer;">Break camp and continue</button>';
      html += '</div></div>';
      ga.innerHTML = html;

      document.getElementById('camp-rest').addEventListener('click', async function() {
        // 10% chance of night ambush
        if (Math.random() < 0.10) {
          self.addDMLog('\u26A0 AMBUSH! Enemies attack during the night!');
          self.playSound('KONG');
          var enc = { enemies: ['wolf','wolf','dire_wolf'], name: 'Night Ambush!' };
          await self._startRandomEncounter(enc, self.state ? self.state.getCurrentLocation() : 'willowmere');
        } else {
          // Heal 50% HP
          if (self.state && self.state.getPartyState) {
            var ps = self.state.getPartyState();
            if (ps && ps.characters) {
              ps.characters.forEach(function(c) {
                var heal = Math.floor((c.maxHp || c.hp) * 0.5);
                if (self.state.updateCharacterHP) {
                  self.state.updateCharacterHP(c.id, Math.min(c.hp + heal, c.maxHp || c.hp));
                }
              });
            }
          }
          self.addDMLog('\uD83C\uDF19 The party rests through the night. HP partially restored.');
          self.playSound('ACHIEVEMENT');
        }
        self._showCampScene();
      });

      document.getElementById('camp-talk').addEventListener('click', function() {
        self._partyBanter();
        self._partyBanter(); // Two exchanges
      });

      document.getElementById('camp-leave').addEventListener('click', function() {
        self.showWorldMap();
      });
    }

  } /* end CampaignManager */

  /* ==================================================================
   *  Export
   * ================================================================== */

  root.MJ.Dragon.Campaign.Manager = Object.freeze({
    CampaignManager: CampaignManager
  });

})(typeof window !== 'undefined' ? window : this);
