/**
 * time-system.js - Real-time awareness system for the Mahjong game.
 *
 * Adjusts ambiance, lighting, character dialogue, and special events
 * based on the actual time of day, day of week, and season. Updates
 * automatically every 30 minutes to keep the atmosphere fresh.
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Time-of-day character dialogue lines
  // ---------------------------------------------------------------------------

  var CHARACTER_TIME_DIALOGUE = {
    yuki: {
      morning:   'The morning light is kind to the tiles.',
      afternoon: 'An afternoon game clears the mind, like a walk in the garden.',
      evening:   'Evening is when the tiles feel most alive.',
      night:     'The city sleeps, but the tiles are awake.',
      weekend:   'Weekends remind me of long sessions with Takeshi.'
    },
    kenji: {
      morning:   'Coffee first, then Mahjong!',
      afternoon: 'Lunch rush is over. Time to deal!',
      evening:   'Evening games and ramen — perfect combo.',
      night:     'Late night sessions are the BEST.',
      weekend:   'Weekend Mahjong hits different!'
    },
    mei: {
      morning:   'Early bird gets the winning hand.',
      afternoon: 'Afternoon data shows players make bolder calls now.',
      evening:   'The evening light makes the tiles look warmer.',
      night:     'I should sleep, but... one more round.',
      weekend:   'Finally, no work emails interrupting.'
    },
    hana: {
      morning:   'Good morning! I reviewed my notes from last night.',
      afternoon: 'Post-lunch games are my favorite study break.',
      evening:   'The campus is quiet now. Perfect focus time.',
      night:     'Pulling an all-nighter... but for Mahjong, not homework.',
      weekend:   'No lectures today! Let us play all day.'
    }
  };

  // ---------------------------------------------------------------------------
  // Season boundaries (month-based, Northern Hemisphere)
  // ---------------------------------------------------------------------------

  var SEASON_MAP = {
    0: 'winter',   1: 'winter',   2: 'spring',
    3: 'spring',   4: 'spring',   5: 'summer',
    6: 'summer',   7: 'summer',   8: 'autumn',
    9: 'autumn',  10: 'autumn',  11: 'winter'
  };

  // ---------------------------------------------------------------------------
  // TimeSystem class
  // ---------------------------------------------------------------------------

  class TimeSystem {
    constructor() {
      this._updateInterval = null;
      this._lastApplied = null;
      this.init();
    }

    /** Initialise: apply effects immediately and schedule updates. */
    init() {
      this.applyTimeEffects();
      this._scheduleUpdates();
    }

    // ── Core time queries ───────────────────────────────────────────────

    /** Returns 'morning' | 'afternoon' | 'evening' | 'night'. */
    getTimeOfDay() {
      var h = new Date().getHours();
      if (h >= 5 && h < 12) return 'morning';
      if (h >= 12 && h < 17) return 'afternoon';
      if (h >= 17 && h < 21) return 'evening';
      return 'night';
    }

    /** Friendly greeting based on current time. */
    getGreeting() {
      var tod = this.getTimeOfDay();
      if (tod === 'morning')   return 'Good morning!';
      if (tod === 'afternoon') return 'Good afternoon!';
      if (tod === 'evening')   return 'Good evening!';
      return 'Good night!';
    }

    /** Returns 'weekday' | 'weekend'. */
    getDayType() {
      var day = new Date().getDay();
      return (day === 0 || day === 6) ? 'weekend' : 'weekday';
    }

    /** Returns 'spring' | 'summer' | 'autumn' | 'winter'. */
    getSeasonName() {
      return SEASON_MAP[new Date().getMonth()];
    }

    // ── Ambiance ────────────────────────────────────────────────────────

    /**
     * Returns an ambiance descriptor based on current time.
     * @returns {{lighting: number, musicMood: string, tileWarmth: number}}
     */
    getAmbiance() {
      var tod = this.getTimeOfDay();
      switch (tod) {
        case 'morning':
          return { lighting: 1.0,  musicMood: 'bright',    tileWarmth: 0.3 };
        case 'afternoon':
          return { lighting: 0.95, musicMood: 'calm',      tileWarmth: 0.4 };
        case 'evening':
          return { lighting: 0.85, musicMood: 'warm',      tileWarmth: 0.7 };
        case 'night':
        default:
          return { lighting: 0.7,  musicMood: 'mellow',    tileWarmth: 0.5 };
      }
    }

    // ── CSS time-of-day effects ─────────────────────────────────────────

    /** Apply CSS custom-property adjustments for time-of-day lighting. */
    applyTimeEffects() {
      if (typeof document === 'undefined') return;

      var amb = this.getAmbiance();
      var tod = this.getTimeOfDay();
      var docStyle = document.documentElement.style;

      // Brightness overlay (0 = fully bright, higher = dimmer)
      var dimAmount = 1 - amb.lighting;
      docStyle.setProperty('--mj-time-dim', dimAmount.toFixed(2));

      // Warm tint strength
      docStyle.setProperty('--mj-time-warmth', amb.tileWarmth.toFixed(2));

      // Overlay colour: warm amber for evening, cool blue for night, none otherwise
      var overlayColor = 'transparent';
      if (tod === 'evening') {
        overlayColor = 'rgba(255, 180, 80, ' + (dimAmount * 0.4).toFixed(3) + ')';
      } else if (tod === 'night') {
        overlayColor = 'rgba(30, 30, 80, ' + (dimAmount * 0.5).toFixed(3) + ')';
      }
      docStyle.setProperty('--mj-time-overlay', overlayColor);

      // Season hint
      docStyle.setProperty('--mj-season', this.getSeasonName());

      this._lastApplied = Date.now();
    }

    // ── Character dialogue ──────────────────────────────────────────────

    /**
     * Return a time-appropriate line for the given character.
     * Weekend lines take priority on weekends; otherwise use time-of-day.
     */
    getCharacterTimeComment(characterId) {
      var lines = CHARACTER_TIME_DIALOGUE[characterId];
      if (!lines) return '';

      if (this.getDayType() === 'weekend' && lines.weekend) {
        return lines.weekend;
      }
      return lines[this.getTimeOfDay()] || '';
    }

    // ── Special timed events ────────────────────────────────────────────

    /**
     * Returns a special event object if the current time qualifies, or null.
     * @returns {null|{id: string, title: string, description: string, bonus: object}}
     */
    getTimeSensitiveEvent() {
      var h = new Date().getHours();

      // Midnight bonus: 12 AM - 1 AM  =>  double XP
      if (h === 0) {
        return {
          id: 'midnight_bonus',
          title: 'Midnight Mahjong',
          description: 'The witching hour! Double XP for all games played now.',
          bonus: { xpMultiplier: 2, coinMultiplier: 1 }
        };
      }

      // Lunch break bonus: 12 PM - 1 PM
      if (h === 12) {
        return {
          id: 'lunch_break',
          title: 'Lunch Break Bonus',
          description: 'Quick game on your break? Bonus coins for speedy wins!',
          bonus: { xpMultiplier: 1, coinMultiplier: 1.5 }
        };
      }

      // Golden hour: 5 PM - 6 PM  =>  prettier lighting and slight XP boost
      if (h === 17) {
        return {
          id: 'golden_hour',
          title: 'Golden Hour',
          description: 'The golden light graces the tiles. Everything looks beautiful.',
          bonus: { xpMultiplier: 1.25, coinMultiplier: 1, lightingOverride: 0.92 }
        };
      }

      return null;
    }

    // ── Internal scheduling ─────────────────────────────────────────────

    /** Schedule CSS re-application every 30 minutes. */
    _scheduleUpdates() {
      var self = this;
      if (this._updateInterval) clearInterval(this._updateInterval);
      this._updateInterval = setInterval(function() {
        self.applyTimeEffects();
      }, 30 * 60 * 1000);
    }

    /** Tear down the interval (useful for tests). */
    destroy() {
      if (this._updateInterval) {
        clearInterval(this._updateInterval);
        this._updateInterval = null;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  root.MJ.TimeSystem = TimeSystem;

})(typeof exports !== 'undefined' ? exports : this);
