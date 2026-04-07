/*  music-advanced.js — Enhanced procedural music with composition and game-reactive dynamics
 *  Proper melodic phrases, chord progressions, modular layers, and game event triggers.
 *  Exports: root.MJ.AdvancedMusic
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};

  // ── Musical data ──

  // Base frequencies for notes (octave 4)
  var NOTE_FREQ = {
    C: 261.63, Db: 277.18, D: 293.66, Eb: 311.13, E: 329.63,
    F: 349.23, Gb: 369.99, G: 392.00, Ab: 415.30, A: 440.00,
    Bb: 466.16, B: 493.88
  };

  // Melodic motifs per mood (intervals relative to scale root, in semitones)
  var MOTIFS = {
    calm: [
      [0, 2, 4, 7, 4, 2],          // gentle ascending/descending
      [7, 5, 4, 2, 0],              // descending pentatonic
      [0, 4, 7, 12, 7],             // arpeggio up and back
      [2, 4, 7, 4, 2, 0]            // wave shape
    ],
    tense: [
      [0, 1, 3, 1, 0],              // chromatic tension
      [0, 3, 6, 3],                  // diminished feel
      [7, 6, 3, 1, 0],              // descending minor
      [0, 1, 0, 3, 0, 1]            // nervous oscillation
    ],
    victory: [
      [0, 4, 7, 12],                // triumphant arpeggio
      [7, 9, 12, 16, 12],           // soaring ascent
      [0, 2, 4, 5, 7, 9, 11, 12],  // full major scale run
      [12, 11, 9, 7, 12]            // heroic phrase
    ],
    contemplative: [
      [0, 2, 5, 7, 5, 2],           // pentatonic meditation
      [7, 5, 2, 0, -5],             // descending reflection
      [0, 5, 7, 0, 5],              // sparse intervals
      [2, 0, -3, 0, 2, 5]           // gentle wandering
    ]
  };

  // Chord progressions (as arrays of semitone offsets from root for each chord)
  var PROGRESSIONS = {
    major:  [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],   // I-IV-V-I
    minor:  [[0, 3, 7], [5, 8, 12], [10, 14, 17], [3, 7, 10]],  // i-iv-VII-III
    calm:   [[0, 4, 7], [5, 9, 12], [2, 5, 9], [0, 4, 7]],      // I-IV-ii-I
    tense:  [[0, 3, 7], [1, 4, 8], [3, 6, 10], [0, 3, 7]]       // i-bII-biv-i (phrygian feel)
  };

  // Scale roots per mood
  var MOOD_ROOTS = {
    calm: NOTE_FREQ.C,
    tense: NOTE_FREQ.Eb,
    victory: NOTE_FREQ.G,
    contemplative: NOTE_FREQ.A / 2 // lower A
  };

  // Timing per mood
  var MOOD_TIMING = {
    calm:          { bpm: 60,  noteDur: 1.8, padDur: 4.0, interval: 2500, density: 0.4 },
    tense:         { bpm: 80,  noteDur: 0.8, padDur: 2.0, interval: 1500, density: 0.7 },
    victory:       { bpm: 100, noteDur: 0.6, padDur: 2.5, interval: 1000, density: 0.9 },
    contemplative: { bpm: 50,  noteDur: 2.2, padDur: 5.0, interval: 3200, density: 0.3 }
  };

  // Crossfade duration in seconds
  var CROSSFADE_TIME = 2.0;

  // ── Helper functions ──

  function semitonesToFreq(rootFreq, semitones) {
    return rootFreq * Math.pow(2, semitones / 12);
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Motif transformations
  function transposeMotif(motif, semitones) {
    return motif.map(function (n) { return n + semitones; });
  }

  function invertMotif(motif) {
    var first = motif[0];
    return motif.map(function (n) { return first - (n - first); });
  }

  function retrogradeMotif(motif) {
    return motif.slice().reverse();
  }

  function transformMotif(motif) {
    var transforms = [
      function (m) { return m; },                         // original
      function (m) { return transposeMotif(m, 5); },      // up a fourth
      function (m) { return transposeMotif(m, 7); },      // up a fifth
      function (m) { return transposeMotif(m, -12); },    // down an octave
      function (m) { return invertMotif(m); },             // inversion
      function (m) { return retrogradeMotif(m); }          // retrograde
    ];
    return pickRandom(transforms)(motif);
  }

  // ── AdvancedMusic Class ──

  class AdvancedMusic {
    constructor() {
      this.ctx = null;
      this.playing = false;
      this.mood = 'calm';
      this._targetMood = 'calm';
      this.volume = 0.15;
      this._intensity = 0.3;
      this._masterGain = null;

      // Layer system
      this._layers = {
        bass:    { enabled: true, gain: null, generator: null, timer: null },
        pad:     { enabled: true, gain: null, generator: null, timer: null },
        melody:  { enabled: true, gain: null, generator: null, timer: null },
        sparkle: { enabled: true, gain: null, generator: null, timer: null }
      };

      this._nodes = [];
      this._motifIndex = 0;
      this._chordIndex = 0;
      this._crossfadeTimer = null;
      this._crossfading = false;
    }

    /**
     * Initialize the audio context. Call on user gesture.
     */
    init() {
      if (this.ctx) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this._masterGain = this.ctx.createGain();
        this._masterGain.gain.value = this.volume;
        this._masterGain.connect(this.ctx.destination);

        // Create gain nodes for each layer
        var self = this;
        Object.keys(this._layers).forEach(function (name) {
          var layer = self._layers[name];
          layer.gain = self.ctx.createGain();
          layer.gain.connect(self._masterGain);
          self._updateLayerVolume(name);
        });
      } catch (e) {
        this.ctx = null;
      }
    }

    /**
     * Start playing music.
     * @param {string} [mood='calm']
     */
    start(mood) {
      if (!this.ctx) this.init();
      if (!this.ctx || this.playing) return;

      this.mood = mood || 'calm';
      this._targetMood = this.mood;
      this.playing = true;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this._startAllLayers();
    }

    /**
     * Stop all music and clean up.
     */
    stop() {
      this.playing = false;
      this._stopAllLayers();

      for (var i = 0; i < this._nodes.length; i++) {
        try { this._nodes[i].stop(); } catch (e) {}
      }
      this._nodes = [];

      if (this._crossfadeTimer) {
        clearTimeout(this._crossfadeTimer);
        this._crossfadeTimer = null;
      }
    }

    /**
     * Transition to a new mood with crossfade.
     * @param {string} mood
     */
    setMood(mood) {
      if (!MOOD_TIMING[mood]) return;
      if (mood === this.mood && !this._crossfading) return;

      this._targetMood = mood;

      if (!this.playing) {
        this.mood = mood;
        return;
      }

      this._crossfadeTo(mood);
    }

    /**
     * Set music intensity (0.0 to 1.0).
     * Controls note density and layer volumes.
     * @param {number} level
     */
    setIntensity(level) {
      this._intensity = Math.max(0, Math.min(1, level));
      this._updateAllLayerVolumes();
    }

    /**
     * Set master volume (0.0 to 0.3 for safety).
     * @param {number} vol
     */
    setVolume(vol) {
      this.volume = Math.max(0, Math.min(0.3, vol));
      if (this._masterGain && this.ctx) {
        this._masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
      }
    }

    /**
     * Add a custom layer with a generator function.
     * @param {string} name
     * @param {function} generator - receives (ctx, layerGain, mood, intensity)
     */
    addLayer(name, generator) {
      if (this._layers[name]) return; // don't overwrite built-ins

      var layer = { enabled: true, gain: null, generator: generator, timer: null };

      if (this.ctx) {
        layer.gain = this.ctx.createGain();
        layer.gain.connect(this._masterGain);
        layer.gain.gain.value = 0.3;
      }

      this._layers[name] = layer;
    }

    /**
     * Enable or disable a named layer.
     * @param {string} name
     * @param {boolean} enabled
     */
    setLayerEnabled(name, enabled) {
      var layer = this._layers[name];
      if (!layer) return;

      layer.enabled = !!enabled;
      if (layer.gain && this.ctx) {
        var target = enabled ? this._getLayerBaseVolume(name) : 0;
        layer.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.3);
      }

      if (!enabled && layer.timer) {
        clearTimeout(layer.timer);
        layer.timer = null;
      } else if (enabled && this.playing && !layer.timer) {
        this._startLayer(name);
      }
    }

    /**
     * Get count of currently active (enabled) layers.
     * @returns {number}
     */
    getActiveLayerCount() {
      var count = 0;
      for (var name in this._layers) {
        if (this._layers[name].enabled) count++;
      }
      return count;
    }

    // ── Game-reactive triggers ──

    /**
     * Player's shanten decreased (closer to tenpai).
     */
    onShantenDecrease() {
      this.setIntensity(Math.min(1, this._intensity + 0.1));
    }

    /**
     * Opponent declared riichi.
     */
    onRiichi() {
      this.setMood('tense');
      this._playTensionMotif();
    }

    /**
     * Player reached tenpai.
     */
    onTenpai() {
      this.setIntensity(Math.min(1, this._intensity + 0.15));
      this._playHopefulPhrase();
    }

    /**
     * Someone won the hand.
     */
    onWin() {
      this.setMood('victory');
      this._playTriumphChord();
      // Revert to calm after 6 seconds
      var self = this;
      setTimeout(function () {
        if (self.mood === 'victory' && self.playing) {
          self.setMood('calm');
          self.setIntensity(0.3);
        }
      }, 6000);
    }

    /**
     * Player dealt in (lost by discard).
     */
    onDealIn() {
      this._playDescendingMinor();
      this.setIntensity(Math.max(0, this._intensity - 0.2));
    }

    /**
     * Wall is running low on tiles.
     */
    onWallLow() {
      // Subtly increase tempo by raising intensity
      this.setIntensity(Math.min(1, this._intensity + 0.05));
    }

    /**
     * Return to calm state (e.g., new hand starting).
     */
    onNewHand() {
      this.setMood('calm');
      this.setIntensity(0.3);
    }

    // ── Private: layer management ──

    _startAllLayers() {
      for (var name in this._layers) {
        if (this._layers[name].enabled) {
          this._startLayer(name);
        }
      }
    }

    _stopAllLayers() {
      for (var name in this._layers) {
        var layer = this._layers[name];
        if (layer.timer) {
          clearTimeout(layer.timer);
          layer.timer = null;
        }
      }
    }

    _startLayer(name) {
      var self = this;
      var layer = this._layers[name];
      if (!layer || !layer.enabled) return;

      // Custom generator layers
      if (layer.generator) {
        layer.generator(this.ctx, layer.gain, this.mood, this._intensity);
        return;
      }

      // Built-in layer schedulers
      switch (name) {
        case 'bass':    this._scheduleBass(); break;
        case 'pad':     this._schedulePad(); break;
        case 'melody':  this._scheduleMelody(); break;
        case 'sparkle': this._scheduleSparkle(); break;
      }
    }

    _updateAllLayerVolumes() {
      for (var name in this._layers) {
        this._updateLayerVolume(name);
      }
    }

    _updateLayerVolume(name) {
      var layer = this._layers[name];
      if (!layer || !layer.gain || !this.ctx) return;

      var target = layer.enabled ? this._getLayerBaseVolume(name) : 0;
      layer.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.2);
    }

    _getLayerBaseVolume(name) {
      var intensity = this._intensity;
      switch (name) {
        case 'bass':    return 0.25 + intensity * 0.15;  // always present
        case 'pad':     return intensity < 0.1 ? 0.3 : 0.2 + intensity * 0.2;
        case 'melody':  return intensity < 0.3 ? 0 : (intensity - 0.3) * 0.7;
        case 'sparkle': return intensity < 0.6 ? 0 : (intensity - 0.6) * 0.8;
        default:        return 0.3;
      }
    }

    // ── Private: layer schedulers ──

    _scheduleBass() {
      if (!this.playing || !this._layers.bass.enabled) return;

      var self = this;
      var rootFreq = (MOOD_ROOTS[this.mood] || MOOD_ROOTS.calm) / 2;
      var timing = MOOD_TIMING[this.mood] || MOOD_TIMING.calm;

      // Play bass drone note
      this._playTone(rootFreq, timing.padDur * 1.5, 'sine', this._layers.bass.gain, 0.6);

      // Occasionally play the fifth
      if (Math.random() < 0.3) {
        var fifth = rootFreq * 1.5;
        setTimeout(function () {
          if (self.playing) {
            self._playTone(fifth, timing.padDur, 'sine', self._layers.bass.gain, 0.3);
          }
        }, timing.padDur * 500);
      }

      var interval = timing.padDur * 1200 + Math.random() * 1000;
      this._layers.bass.timer = setTimeout(function () {
        self._scheduleBass();
      }, interval);
    }

    _schedulePad() {
      if (!this.playing || !this._layers.pad.enabled) return;

      var self = this;
      var rootFreq = MOOD_ROOTS[this.mood] || MOOD_ROOTS.calm;
      var timing = MOOD_TIMING[this.mood] || MOOD_TIMING.calm;

      // Play chord from progression
      var progressionKey = (this.mood === 'tense') ? 'tense' :
                           (this.mood === 'victory') ? 'major' :
                           (this.mood === 'contemplative') ? 'minor' : 'calm';
      var progression = PROGRESSIONS[progressionKey];
      var chord = progression[this._chordIndex % progression.length];
      this._chordIndex++;

      for (var i = 0; i < chord.length; i++) {
        var freq = semitonesToFreq(rootFreq, chord[i]);
        this._playTone(freq, timing.padDur, 'sine', this._layers.pad.gain, 0.35);
      }

      var interval = timing.padDur * 900 + Math.random() * 600;
      this._layers.pad.timer = setTimeout(function () {
        self._schedulePad();
      }, interval);
    }

    _scheduleMelody() {
      if (!this.playing || !this._layers.melody.enabled) return;
      if (this._intensity < 0.3) {
        // Too quiet for melody — check again later
        var self = this;
        this._layers.melody.timer = setTimeout(function () {
          self._scheduleMelody();
        }, 3000);
        return;
      }

      var self = this;
      var rootFreq = MOOD_ROOTS[this.mood] || MOOD_ROOTS.calm;
      var timing = MOOD_TIMING[this.mood] || MOOD_TIMING.calm;

      // Pick and transform a motif
      var moodMotifs = MOTIFS[this.mood] || MOTIFS.calm;
      var motif = pickRandom(moodMotifs);
      motif = transformMotif(motif);

      // Play motif notes in sequence
      var noteSpacing = (60 / timing.bpm) * 1000; // ms per beat
      for (var n = 0; n < motif.length; n++) {
        (function (noteIdx, semitone) {
          setTimeout(function () {
            if (!self.playing) return;
            var freq = semitonesToFreq(rootFreq, semitone);
            self._playTone(freq, timing.noteDur, 'triangle', self._layers.melody.gain, 0.5);
          }, noteIdx * noteSpacing);
        })(n, motif[n]);
      }

      // Schedule next motif after this one finishes plus a pause
      var motifDuration = motif.length * noteSpacing;
      var pauseAfter = timing.interval + Math.random() * timing.interval;
      this._layers.melody.timer = setTimeout(function () {
        self._scheduleMelody();
      }, motifDuration + pauseAfter);
    }

    _scheduleSparkle() {
      if (!this.playing || !this._layers.sparkle.enabled) return;
      if (this._intensity < 0.6) {
        var self = this;
        this._layers.sparkle.timer = setTimeout(function () {
          self._scheduleSparkle();
        }, 4000);
        return;
      }

      var self = this;
      var rootFreq = (MOOD_ROOTS[this.mood] || MOOD_ROOTS.calm) * 2; // high register
      var timing = MOOD_TIMING[this.mood] || MOOD_TIMING.calm;

      // High register accent note
      var scale = [0, 2, 4, 5, 7, 9, 11, 12, 14];
      var semitone = pickRandom(scale);
      var freq = semitonesToFreq(rootFreq, semitone);

      this._playTone(freq, timing.noteDur * 0.4, 'sine', this._layers.sparkle.gain, 0.25);

      var interval = 1500 + Math.random() * 3000;
      this._layers.sparkle.timer = setTimeout(function () {
        self._scheduleSparkle();
      }, interval);
    }

    // ── Private: special game-reactive phrases ──

    _playTensionMotif() {
      if (!this.ctx || !this._masterGain) return;
      var rootFreq = MOOD_ROOTS.tense;
      var self = this;
      // Ominous: root, minor second, root
      var notes = [0, 1, 0, -1, 0];
      notes.forEach(function (semi, i) {
        setTimeout(function () {
          if (!self.playing) return;
          var freq = semitonesToFreq(rootFreq, semi);
          self._playTone(freq, 0.6, 'triangle', self._masterGain, 0.3);
        }, i * 300);
      });
    }

    _playHopefulPhrase() {
      if (!this.ctx || !this._masterGain) return;
      var rootFreq = MOOD_ROOTS.calm;
      var self = this;
      // Ascending: root, third, fifth, octave
      var notes = [0, 4, 7, 12];
      notes.forEach(function (semi, i) {
        setTimeout(function () {
          if (!self.playing) return;
          var freq = semitonesToFreq(rootFreq, semi);
          self._playTone(freq, 0.8, 'triangle', self._masterGain, 0.35);
        }, i * 250);
      });
    }

    _playTriumphChord() {
      if (!this.ctx || !this._masterGain) return;
      var rootFreq = MOOD_ROOTS.victory;
      var self = this;
      // Big major chord with octave doubling
      var chord = [0, 4, 7, 12, 16];
      chord.forEach(function (semi) {
        var freq = semitonesToFreq(rootFreq, semi);
        self._playTone(freq, 2.5, 'sine', self._masterGain, 0.25);
      });
    }

    _playDescendingMinor() {
      if (!this.ctx || !this._masterGain) return;
      var rootFreq = MOOD_ROOTS.tense;
      var self = this;
      // Descending minor phrase
      var notes = [12, 10, 7, 3, 0];
      notes.forEach(function (semi, i) {
        setTimeout(function () {
          if (!self.playing) return;
          var freq = semitonesToFreq(rootFreq, semi);
          self._playTone(freq, 1.0, 'triangle', self._masterGain, 0.3);
        }, i * 350);
      });
    }

    // ── Private: crossfade ──

    _crossfadeTo(newMood) {
      var self = this;
      this._crossfading = true;

      // Fade out current layers
      for (var name in this._layers) {
        var layer = this._layers[name];
        if (layer.gain && this.ctx) {
          layer.gain.gain.setTargetAtTime(0, this.ctx.currentTime, CROSSFADE_TIME / 3);
        }
      }

      // After crossfade, switch mood and restart
      if (this._crossfadeTimer) clearTimeout(this._crossfadeTimer);
      this._crossfadeTimer = setTimeout(function () {
        self.mood = newMood;
        self._chordIndex = 0;
        self._motifIndex = 0;

        // Stop old layer timers
        self._stopAllLayers();

        // Restore volumes and restart
        self._updateAllLayerVolumes();
        if (self.playing) {
          self._startAllLayers();
        }

        self._crossfading = false;
        self._crossfadeTimer = null;
      }, CROSSFADE_TIME * 1000);
    }

    // ── Private: core tone generator ──

    _playTone(freq, duration, waveform, destinationNode, relativeVol) {
      if (!this.ctx || !destinationNode) return;

      var now = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();

      osc.type = waveform || 'sine';
      osc.frequency.value = freq;

      // Soft envelope
      var attackTime = Math.min(0.15, duration * 0.15);
      var releaseStart = duration * 0.65;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(relativeVol || 0.3, now + attackTime);
      gain.gain.setValueAtTime(relativeVol || 0.3, now + releaseStart);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      osc.connect(gain);
      gain.connect(destinationNode);

      osc.start(now);
      osc.stop(now + duration + 0.05);

      this._nodes.push(osc);

      // Prune old nodes
      if (this._nodes.length > 30) {
        this._nodes = this._nodes.slice(-15);
      }
    }

    // ── Query methods ──

    /** @returns {boolean} */
    isPlaying() { return this.playing; }

    /** @returns {string} */
    getMood() { return this.mood; }

    /** @returns {number} */
    getIntensity() { return this._intensity; }

    /** @returns {string[]} */
    getMoods() { return Object.keys(MOOD_TIMING); }

    /** @returns {string[]} */
    getLayerNames() { return Object.keys(this._layers); }

    /** @param {string} name  @returns {boolean} */
    isLayerEnabled(name) {
      return !!(this._layers[name] && this._layers[name].enabled);
    }
  }

  // ── Public API ──

  root.MJ.AdvancedMusic = Object.freeze({
    AdvancedMusic: AdvancedMusic,
    MOTIFS: MOTIFS,
    PROGRESSIONS: PROGRESSIONS,
    MOOD_ROOTS: MOOD_ROOTS,
    create: function () {
      return new AdvancedMusic();
    }
  });

})(typeof window !== 'undefined' ? window : global);
