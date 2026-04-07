(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // Pentatonic and modal scales for each mood (frequencies in Hz)
  const SCALES = {
    calm:          [261.6, 293.7, 329.6, 392.0, 440.0, 523.3],
    tense:         [261.6, 293.7, 311.1, 392.0, 415.3, 523.3],
    victory:       [261.6, 329.6, 392.0, 523.3, 659.3, 784.0],
    contemplative: [220.0, 261.6, 293.7, 329.6, 440.0, 523.3]
  };

  // Timing configuration per mood (ms)
  const MOOD_TIMING = {
    calm:          { interval: 3000, variance: 2000, noteDur: 2.0, droneFade: 4.0 },
    tense:         { interval: 1800, variance: 1200, noteDur: 1.2, droneFade: 2.0 },
    victory:       { interval: 1200, variance: 800,  noteDur: 1.0, droneFade: 3.0 },
    contemplative: { interval: 3500, variance: 2500, noteDur: 2.5, droneFade: 5.0 }
  };

  // How long victory mood plays before reverting (ms)
  const VICTORY_DURATION = 6000;

  /**
   * MusicSystem - Procedural ambient music using Web Audio API.
   * Generates mood-appropriate tones with no audio files required.
   */
  class MusicSystem {
    constructor() {
      this.ctx = null;
      this.playing = false;
      this.volume = 0.15;
      this.mood = 'calm';
      this._prevMood = 'calm';
      this._timeoutId = null;
      this._droneOsc = null;
      this._droneGain = null;
      this._masterGain = null;
      this._nodes = [];
      this._victoryTimer = null;
    }

    /**
     * Initialize the audio context. Call on user gesture for best results.
     */
    init() {
      if (this.ctx) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this._masterGain = this.ctx.createGain();
        this._masterGain.gain.value = this.volume;
        this._masterGain.connect(this.ctx.destination);
      } catch (e) {
        this.ctx = null;
      }
    }

    /**
     * Start playing ambient music.
     * @param {string} [mood='calm'] - calm, tense, victory, contemplative
     */
    start(mood) {
      if (!this.ctx) this.init();
      if (!this.ctx || this.playing) return;

      this.mood = mood || 'calm';
      this.playing = true;

      // Resume context if suspended (autoplay policy)
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this._startDrone();
      this._scheduleNote();
    }

    /**
     * Stop all music and clean up.
     */
    stop() {
      this.playing = false;

      if (this._timeoutId) {
        clearTimeout(this._timeoutId);
        this._timeoutId = null;
      }
      if (this._victoryTimer) {
        clearTimeout(this._victoryTimer);
        this._victoryTimer = null;
      }

      this._stopDrone();

      for (var i = 0; i < this._nodes.length; i++) {
        try { this._nodes[i].stop(); } catch (e) {}
      }
      this._nodes = [];
    }

    /**
     * Transition to a new mood. If victory, automatically revert after a few seconds.
     * @param {string} mood
     */
    setMood(mood) {
      if (!SCALES[mood]) return;

      this._prevMood = this.mood;
      this.mood = mood;

      // Restart drone with new root
      if (this.playing) {
        this._stopDrone();
        this._startDrone();
      }

      // Victory is temporary
      if (mood === 'victory') {
        if (this._victoryTimer) clearTimeout(this._victoryTimer);
        this._victoryTimer = setTimeout(() => {
          if (this.mood === 'victory') {
            this.setMood(this._prevMood === 'victory' ? 'calm' : this._prevMood);
          }
          this._victoryTimer = null;
        }, VICTORY_DURATION);
      }
    }

    /**
     * Set master volume (0.0 to 0.3 range for safety).
     */
    setVolume(vol) {
      this.volume = Math.max(0, Math.min(0.3, vol));
      if (this._masterGain) {
        this._masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
      }
    }

    /**
     * Convenience: trigger tense mood (e.g., riichi declaration).
     */
    onRiichi() {
      this.setMood('tense');
    }

    /**
     * Convenience: trigger victory mood (e.g., someone wins).
     */
    onWin() {
      this.setMood('victory');
    }

    /**
     * Convenience: slightly tense mood (e.g., tenpai).
     */
    onTenpai() {
      if (this.mood === 'calm' || this.mood === 'contemplative') {
        this.setMood('tense');
      }
    }

    /**
     * Schedule the next melodic note based on current mood timing.
     */
    _scheduleNote() {
      if (!this.playing) return;

      var timing = MOOD_TIMING[this.mood] || MOOD_TIMING.calm;
      var delay = timing.interval + Math.random() * timing.variance;

      this._timeoutId = setTimeout(() => {
        if (!this.playing) return;

        var scale = SCALES[this.mood] || SCALES.calm;
        var freq = scale[Math.floor(Math.random() * scale.length)];
        var dur = timing.noteDur + Math.random() * 1.0;

        // Main pad note
        this._playPad(freq, dur, 0.5);

        // Occasional higher octave sparkle
        if (Math.random() < 0.3) {
          setTimeout(() => {
            if (this.playing) {
              this._playPad(freq * 2, dur * 0.4, 0.2);
            }
          }, 400 + Math.random() * 400);
        }

        // Occasional harmony note (fifth above)
        if (Math.random() < 0.2) {
          setTimeout(() => {
            if (this.playing) {
              this._playPad(freq * 1.5, dur * 0.6, 0.15);
            }
          }, 200 + Math.random() * 300);
        }

        this._scheduleNote();
      }, delay);
    }

    /**
     * Play a single gentle pad tone.
     */
    _playPad(freq, duration, relativeVol) {
      if (!this.ctx || !this._masterGain) return;

      var now = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      // Soft attack and release envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(relativeVol, now + 0.3);
      gain.gain.setValueAtTime(relativeVol, now + duration * 0.6);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      osc.connect(gain);
      gain.connect(this._masterGain);

      osc.start(now);
      osc.stop(now + duration + 0.05);

      this._nodes.push(osc);

      // Prune old nodes to avoid buildup
      if (this._nodes.length > 20) {
        this._nodes = this._nodes.slice(-10);
      }
    }

    /**
     * Start a low bass drone on the root note of the current scale.
     */
    _startDrone() {
      if (!this.ctx || !this._masterGain) return;

      var scale = SCALES[this.mood] || SCALES.calm;
      var rootFreq = scale[0] / 2;
      var timing = MOOD_TIMING[this.mood] || MOOD_TIMING.calm;

      this._droneOsc = this.ctx.createOscillator();
      this._droneGain = this.ctx.createGain();

      this._droneOsc.type = 'sine';
      this._droneOsc.frequency.value = rootFreq;

      // Fade in slowly
      this._droneGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this._droneGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + timing.droneFade);

      this._droneOsc.connect(this._droneGain);
      this._droneGain.connect(this._masterGain);
      this._droneOsc.start();
    }

    /**
     * Fade out and stop the bass drone.
     */
    _stopDrone() {
      if (this._droneOsc && this._droneGain && this.ctx) {
        try {
          this._droneGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
          this._droneOsc.stop(this.ctx.currentTime + 0.6);
        } catch (e) {}
      }
      this._droneOsc = null;
      this._droneGain = null;
    }

    /**
     * Check if music is currently playing.
     */
    isPlaying() {
      return this.playing;
    }

    /**
     * Get the current mood.
     */
    getMood() {
      return this.mood;
    }

    /**
     * Get available moods.
     */
    getMoods() {
      return Object.keys(SCALES);
    }
  }

  root.MJ.Music = Object.freeze({
    MusicSystem: MusicSystem,
    SCALES: SCALES,
    create: function() {
      return new MusicSystem();
    }
  });

})(typeof window !== 'undefined' ? window : global);
