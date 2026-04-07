/**
 * venues.js — Visual theme/venue system for Mahjong
 * Different table environments unlocked via reputation level
 * Exports: root.MJ.Venues
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── Venue definitions ──────────────────────────────────────────

  var VENUES = {
    home: {
      name: 'Home Table',
      description: 'Your cozy living room. Where it all begins.',
      unlockLevel: 1,
      theme: {
        tableBg: 'radial-gradient(ellipse at center, #246b3f 0%, #1a4a2e 45%, #0d3018 100%)',
        tableTexture: true,
        tileStyle: 'standard',
        ambiance: 'calm',
        panelBg: 'rgba(15, 53, 32, 0.92)'
      }
    },
    cafe: {
      name: 'Sakura Caf\u00e9',
      description: 'A warm caf\u00e9 with cherry blossom decor.',
      unlockLevel: 3,
      theme: {
        tableBg: 'radial-gradient(ellipse at center, #5c3d2e 0%, #3d2b1f 50%, #2a1c12 100%)',
        tableTexture: true,
        tileStyle: 'warm',
        ambiance: 'contemplative',
        panelBg: 'rgba(60, 40, 25, 0.92)',
        accentColor: '#e8a0b0'
      }
    },
    tournament_hall: {
      name: 'Tournament Hall',
      description: 'Professional competition venue. Serious players only.',
      unlockLevel: 8,
      theme: {
        tableBg: 'radial-gradient(ellipse at center, #1a2744 0%, #0f1a30 50%, #080e1a 100%)',
        tableTexture: true,
        tileStyle: 'crisp',
        ambiance: 'tense',
        panelBg: 'rgba(15, 25, 50, 0.92)',
        accentColor: '#6bb8ff'
      }
    },
    rooftop: {
      name: 'Midnight Rooftop',
      description: 'City lights twinkle below. For masters.',
      unlockLevel: 15,
      theme: {
        tableBg: 'radial-gradient(ellipse at center, #1a1a2e 0%, #16162a 50%, #0a0a15 100%)',
        tableTexture: false,
        tileStyle: 'premium',
        ambiance: 'contemplative',
        panelBg: 'rgba(15, 15, 30, 0.92)',
        accentColor: '#c8a0ff'
      }
    },
    garden: {
      name: 'Zen Garden',
      description: 'Under ancient maples. Yuki\'s favorite place.',
      unlockLevel: 12,
      theme: {
        tableBg: 'radial-gradient(ellipse at center, #2a4a2e 0%, #1a3a1e 50%, #0d2510 100%)',
        tableTexture: true,
        tileStyle: 'natural',
        ambiance: 'calm',
        panelBg: 'rgba(20, 50, 25, 0.92)',
        accentColor: '#a0d8a0'
      }
    }
  };

  // ── Tile style CSS overrides per venue ─────────────────────────

  var TILE_STYLES = {
    standard: {
      tileBackground: '#f5f0e1',
      tileBorder: '#c8b890',
      tileShadow: '0 2px 4px rgba(0,0,0,0.3)'
    },
    warm: {
      tileBackground: '#f8f0d8',
      tileBorder: '#d4b88c',
      tileShadow: '0 2px 4px rgba(80,40,0,0.25)'
    },
    crisp: {
      tileBackground: '#f0f0f0',
      tileBorder: '#b0b8c8',
      tileShadow: '0 2px 6px rgba(0,0,0,0.4)'
    },
    premium: {
      tileBackground: '#f2edd8',
      tileBorder: '#a898c0',
      tileShadow: '0 2px 8px rgba(100,60,180,0.2)'
    },
    natural: {
      tileBackground: '#f0ece0',
      tileBorder: '#a8c0a0',
      tileShadow: '0 2px 4px rgba(0,40,0,0.2)'
    }
  };

  // ── Default CSS custom properties ──────────────────────────────

  var DEFAULT_CSS_VARS = {
    '--panel-bg': 'rgba(15, 53, 32, 0.92)',
    '--accent': '#4fc3f7',
    '--tile-bg': '#f5f0e1',
    '--tile-border': '#c8b890',
    '--tile-shadow': '0 2px 4px rgba(0,0,0,0.3)'
  };

  // ── VenueManager class ─────────────────────────────────────────

  class VenueManager {
    constructor() {
      this.currentVenue = 'home';
      this._loadSaved();
    }

    _loadSaved() {
      try {
        var saved = localStorage.getItem('mj_venue');
        if (saved && VENUES[saved]) {
          this.currentVenue = saved;
        }
      } catch (e) {
        // localStorage unavailable
      }
    }

    _persist() {
      try {
        localStorage.setItem('mj_venue', this.currentVenue);
      } catch (e) {
        // localStorage unavailable
      }
    }

    /** Switch to a venue by id. Returns true on success. */
    setVenue(venueId) {
      if (!VENUES[venueId]) return false;
      this.currentVenue = venueId;
      this._persist();
      this.applyTheme(VENUES[venueId].theme);
      return true;
    }

    /** Apply a theme object to the current document. */
    applyTheme(theme) {
      if (typeof document === 'undefined') return;

      var rootEl = document.documentElement;
      var board = document.querySelector('.game-board');

      // Table background
      if (board) {
        board.style.background = theme.tableBg;
        board.classList.toggle('textured', !!theme.tableTexture);
      }

      // Panel background
      if (theme.panelBg) {
        rootEl.style.setProperty('--panel-bg', theme.panelBg);
      }

      // Accent color
      if (theme.accentColor) {
        rootEl.style.setProperty('--accent', theme.accentColor);
      }

      // Tile style overrides
      var tileStyle = TILE_STYLES[theme.tileStyle] || TILE_STYLES.standard;
      rootEl.style.setProperty('--tile-bg', tileStyle.tileBackground);
      rootEl.style.setProperty('--tile-border', tileStyle.tileBorder);
      rootEl.style.setProperty('--tile-shadow', tileStyle.tileShadow);
    }

    /** Reset all CSS properties to defaults. */
    resetTheme() {
      if (typeof document === 'undefined') return;
      var rootEl = document.documentElement;
      Object.keys(DEFAULT_CSS_VARS).forEach(function(key) {
        rootEl.style.setProperty(key, DEFAULT_CSS_VARS[key]);
      });
    }

    /** Get list of venues available at a given player level. */
    getAvailableVenues(playerLevel) {
      var self = this;
      return Object.keys(VENUES).map(function(id) {
        var v = VENUES[id];
        return {
          id: id,
          name: v.name,
          description: v.description,
          unlockLevel: v.unlockLevel,
          unlocked: v.unlockLevel <= playerLevel,
          current: id === self.currentVenue
        };
      }).sort(function(a, b) {
        return a.unlockLevel - b.unlockLevel;
      });
    }

    /** Get all venues including locked ones, for display purposes. */
    getAllVenues() {
      return Object.keys(VENUES).map(function(id) {
        var v = VENUES[id];
        return { id: id, name: v.name, description: v.description, unlockLevel: v.unlockLevel };
      });
    }

    /** Get the current venue object. */
    getCurrentVenue() {
      return VENUES[this.currentVenue] || VENUES.home;
    }

    /** Get the current venue id string. */
    getCurrentId() {
      return this.currentVenue;
    }

    /** Build a DOM element with clickable venue cards. */
    buildVenueSelectorUI(playerLevel) {
      if (typeof document === 'undefined') return null;

      var self = this;
      var container = document.createElement('div');
      container.className = 'venue-selector';
      container.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;padding:12px;';

      var venues = this.getAvailableVenues(playerLevel);
      venues.forEach(function(v) {
        var card = document.createElement('div');
        card.className = 'venue-card' + (v.current ? ' venue-active' : '') + (!v.unlocked ? ' venue-locked' : '');
        card.style.cssText = 'flex:1 1 200px;max-width:260px;padding:14px;border-radius:8px;cursor:' +
          (v.unlocked ? 'pointer' : 'not-allowed') + ';border:2px solid ' +
          (v.current ? 'var(--accent, #4fc3f7)' : 'rgba(255,255,255,0.1)') +
          ';background:rgba(0,0,0,0.3);transition:border-color 0.2s;opacity:' +
          (v.unlocked ? '1' : '0.5') + ';';

        var title = document.createElement('div');
        title.style.cssText = 'font-weight:bold;font-size:14px;color:#fff;margin-bottom:4px;';
        title.textContent = v.name;

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:6px;';
        desc.textContent = v.description;

        var status = document.createElement('div');
        status.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.4);';
        if (!v.unlocked) {
          status.textContent = 'Unlocks at level ' + v.unlockLevel;
        } else if (v.current) {
          status.textContent = 'Currently selected';
          status.style.color = 'var(--accent, #4fc3f7)';
        } else {
          status.textContent = 'Click to select';
        }

        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(status);

        if (v.unlocked) {
          card.addEventListener('click', function() {
            self.setVenue(v.id);
            // Refresh the selector to update active states
            var parent = container.parentNode;
            if (parent) {
              var newUI = self.buildVenueSelectorUI(playerLevel);
              parent.replaceChild(newUI, container);
            }
          });
        }

        container.appendChild(card);
      });

      return container;
    }
  }

  // ── Export ──────────────────────────────────────────────────────

  root.MJ.Venues = {
    VENUES: VENUES,
    TILE_STYLES: TILE_STYLES,
    VenueManager: VenueManager
  };

})(typeof window !== 'undefined' ? window : global);
