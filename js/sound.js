/**
 * sound.js — Sound effects using Web Audio API synthesis
 * Supports 'classic' (simple) and 'modern' (richer) sound packs
 * See interfaces.js for API documentation
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  let audioCtx = null;
  let muted = false;
  let volume = 0.3;
  let soundPack = 'modern';

  function init() {
    try {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('Web Audio not available');
    }
  }

  function ensureContext() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // ── Core tone player ─────────────────────────────────────────────

  function playTone(frequency, duration, type, gainLevel) {
    if (muted || !audioCtx) return;
    ensureContext();

    var now = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var level = (gainLevel !== undefined ? gainLevel : 1) * volume;

    osc.type = type || 'sine';
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  // ── Chord helper: play multiple notes simultaneously ──────────

  function playChord(frequencies, duration, type, stagger) {
    if (muted || !audioCtx) return;
    ensureContext();

    var now = audioCtx.currentTime;
    var offset = stagger || 0;
    var perNoteGain = 1 / Math.max(frequencies.length, 1);

    for (var i = 0; i < frequencies.length; i++) {
      var startTime = now + (i * offset);
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      var level = perNoteGain * volume;

      osc.type = type || 'sine';
      osc.frequency.value = frequencies[i];

      gain.gain.setValueAtTime(level, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    }
  }

  // ── Scheduled tone: play a note at an offset from now ─────────

  function scheduleTone(frequency, duration, type, delay, gainLevel) {
    if (muted || !audioCtx) return;
    ensureContext();

    var now = audioCtx.currentTime;
    var start = now + (delay || 0);
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var level = (gainLevel !== undefined ? gainLevel : 1) * volume;

    osc.type = type || 'sine';
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  // ── Classic sounds (simple, original style) ───────────────────

  var classicSounds = {
    DRAW: function () { playTone(800, 0.05, 'sine'); },
    DISCARD: function () { playTone(400, 0.08, 'triangle'); },
    PONG: function () {
      playTone(600, 0.1, 'square');
      setTimeout(function () { playTone(800, 0.1, 'square'); }, 100);
    },
    CHOW: function () {
      playTone(500, 0.1, 'sine');
      setTimeout(function () { playTone(650, 0.1, 'sine'); }, 80);
    },
    KONG: function () {
      playTone(400, 0.1, 'square');
      setTimeout(function () { playTone(600, 0.1, 'square'); }, 80);
      setTimeout(function () { playTone(800, 0.15, 'square'); }, 160);
    },
    WIN: function () {
      var notes = [523, 659, 784, 1047];
      notes.forEach(function (f, i) {
        setTimeout(function () { playTone(f, 0.2, 'sine'); }, i * 120);
      });
    },
    CLICK: function () { playTone(1000, 0.02, 'sine'); },
    TURN: function () { playTone(600, 0.03, 'sine'); },
    RIICHI: function () {
      var notes = [440, 554, 659, 880];
      notes.forEach(function (f, i) {
        setTimeout(function () { playTone(f, 0.15, 'sine'); }, i * 100);
      });
    },
    TSUMO: function () { playChord([523, 659, 784], 0.3, 'sine'); },
    RON: function () { playChord([440, 523, 660], 0.25, 'square'); },
    FLOWER: function () { playTone(1200, 0.15, 'sine'); },
    ACHIEVEMENT: function () {
      playTone(784, 0.1, 'sine');
      setTimeout(function () { playTone(988, 0.1, 'sine'); }, 100);
      setTimeout(function () { playTone(1175, 0.2, 'sine'); }, 200);
    },
    LESSON_COMPLETE: function () { playTone(880, 0.15, 'sine'); },
    PLACE: function() { playTone(200, 0.04, 'triangle'); }
  };

  // ── Modern sounds (richer, more expressive) ───────────────────

  var modernSounds = {
    DRAW: function () {
      playTone(880, 0.06, 'sine', 0.7);
      scheduleTone(1100, 0.03, 'sine', 0.02, 0.3);
    },

    DISCARD: function () {
      playTone(350, 0.1, 'triangle', 0.8);
      scheduleTone(280, 0.06, 'triangle', 0.04, 0.3);
    },

    CLICK: function () {
      playTone(1100, 0.02, 'sine', 0.6);
      scheduleTone(1400, 0.015, 'sine', 0.01, 0.3);
    },

    TURN: function () {
      playTone(660, 0.04, 'sine', 0.7);
      scheduleTone(770, 0.03, 'sine', 0.02, 0.35);
    },

    // Two-note with reverb-like decay layers
    PONG: function () {
      playTone(550, 0.15, 'square', 0.6);
      scheduleTone(550, 0.3, 'sine', 0, 0.2);
      scheduleTone(825, 0.18, 'square', 0.12, 0.6);
      scheduleTone(825, 0.35, 'sine', 0.12, 0.2);
    },

    CHOW: function () {
      scheduleTone(494, 0.12, 'sine', 0, 0.8);
      scheduleTone(587, 0.12, 'sine', 0.08, 0.8);
      scheduleTone(659, 0.18, 'sine', 0.16, 0.9);
    },

    // Three-note power chord with body
    KONG: function () {
      // Root
      playChord([330, 415], 0.15, 'square');
      scheduleTone(330, 0.3, 'sine', 0, 0.25);
      // Fifth
      scheduleTone(494, 0.15, 'square', 0.1, 0.7);
      scheduleTone(494, 0.3, 'sine', 0.1, 0.25);
      // Octave
      scheduleTone(660, 0.2, 'square', 0.2, 0.8);
      scheduleTone(660, 0.4, 'sine', 0.2, 0.3);
    },

    // Full triumphant sequence — ascending arpeggiated major chord with sustain
    WIN: function () {
      var notes = [523, 659, 784, 1047, 1319];
      for (var i = 0; i < notes.length; i++) {
        (function (idx) {
          var delay = idx * 0.1;
          var dur = 0.4 - (idx * 0.03);
          scheduleTone(notes[idx], dur, 'sine', delay, 0.7);
          scheduleTone(notes[idx], dur + 0.2, 'triangle', delay, 0.2);
        })(i);
      }
      // Final chord
      setTimeout(function () {
        playChord([523, 659, 784, 1047], 0.6, 'sine');
      }, 550);
    },

    // Dramatic 4-note ascending with tension build
    RIICHI: function () {
      var notes = [392, 494, 587, 784];
      for (var i = 0; i < notes.length; i++) {
        (function (idx) {
          var delay = idx * 0.12;
          var gain = 0.5 + (idx * 0.15);
          scheduleTone(notes[idx], 0.2, 'sawtooth', delay, gain * 0.5);
          scheduleTone(notes[idx], 0.25, 'sine', delay, gain * 0.5);
        })(i);
      }
      // Sustained final note
      scheduleTone(784, 0.5, 'sine', 0.48, 0.6);
      scheduleTone(588, 0.5, 'sine', 0.48, 0.3);
    },

    // Triumphant major chord — bright and full
    TSUMO: function () {
      // C major spread voicing
      playChord([262, 330, 392, 523, 659], 0.5, 'sine');
      // Sparkle layer
      scheduleTone(1047, 0.3, 'sine', 0.05, 0.3);
      scheduleTone(1319, 0.25, 'sine', 0.1, 0.2);
      // Body
      playChord([262, 330, 392], 0.7, 'triangle');
    },

    // Sharp minor chord — dramatic claim
    RON: function () {
      // A minor chord: A C E
      playChord([440, 523, 659], 0.3, 'square');
      // Darker layer underneath
      playChord([220, 262, 330], 0.4, 'triangle');
      // Sharp attack on top
      scheduleTone(880, 0.15, 'sawtooth', 0, 0.4);
    },

    // Gentle chime — light bell-like tones
    FLOWER: function () {
      scheduleTone(1319, 0.2, 'sine', 0, 0.6);
      scheduleTone(1568, 0.18, 'sine', 0.06, 0.4);
      scheduleTone(1976, 0.15, 'sine', 0.12, 0.3);
      scheduleTone(2637, 0.12, 'sine', 0.18, 0.2);
    },

    // Fanfare — triumphant announcement
    ACHIEVEMENT: function () {
      // Trumpet-like fanfare: G B D G
      scheduleTone(392, 0.12, 'square', 0, 0.5);
      scheduleTone(392, 0.15, 'sine', 0, 0.3);

      scheduleTone(494, 0.12, 'square', 0.13, 0.5);
      scheduleTone(494, 0.15, 'sine', 0.13, 0.3);

      scheduleTone(587, 0.12, 'square', 0.26, 0.5);
      scheduleTone(587, 0.15, 'sine', 0.26, 0.3);

      // Final major chord
      scheduleTone(784, 0.4, 'sine', 0.4, 0.6);
      scheduleTone(988, 0.35, 'sine', 0.4, 0.4);
      scheduleTone(1175, 0.3, 'sine', 0.4, 0.3);

      // Shimmer
      scheduleTone(1568, 0.2, 'sine', 0.45, 0.15);
    },

    // Tile clack — short percussive place sound
    PLACE: function () {
      playTone(180, 0.05, 'triangle', 0.8);
      scheduleTone(250, 0.03, 'triangle', 0.01, 0.4);
      scheduleTone(150, 0.03, 'square', 0.02, 0.2);
    },

    // Positive ding — warm completion signal
    LESSON_COMPLETE: function () {
      scheduleTone(784, 0.15, 'sine', 0, 0.7);
      scheduleTone(784, 0.2, 'triangle', 0, 0.25);

      scheduleTone(988, 0.15, 'sine', 0.12, 0.7);
      scheduleTone(988, 0.2, 'triangle', 0.12, 0.25);

      // Sustained resolution
      scheduleTone(1175, 0.35, 'sine', 0.24, 0.8);
      scheduleTone(1175, 0.5, 'triangle', 0.24, 0.3);
    }
  };

  // ── Sound pack management ─────────────────────────────────────

  function getSounds() {
    return soundPack === 'classic' ? classicSounds : modernSounds;
  }

  function setSoundPack(pack) {
    if (pack === 'classic' || pack === 'modern') {
      soundPack = pack;
    }
  }

  function getSoundPack() {
    return soundPack;
  }

  // ── Public API ────────────────────────────────────────────────

  function play(name) {
    var sounds = getSounds();
    var sound = sounds[name];
    if (sound) sound();
  }

  function setVolume(level) {
    volume = Math.max(0, Math.min(1, level));
  }

  function getVolume() {
    return volume;
  }

  function setMuted(m) {
    muted = m;
  }

  function isMuted() {
    return muted;
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  function getSoundNames() {
    return Object.keys(modernSounds);
  }

  root.MJ.Sound = Object.freeze({
    init: init,
    play: play,
    setVolume: setVolume,
    getVolume: getVolume,
    setMuted: setMuted,
    isMuted: isMuted,
    toggleMute: toggleMute,
    setSoundPack: setSoundPack,
    getSoundPack: getSoundPack,
    getSoundNames: getSoundNames,
    playChord: playChord,
    SOUNDS: modernSounds
  });

  if (typeof console !== 'undefined') console.log('[Mahjong] Sound module loaded');
})(typeof window !== 'undefined' ? window : global);
