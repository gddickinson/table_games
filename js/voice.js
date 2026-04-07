(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // Character voice configuration
  const VOICE_PROFILES = {
    mei: {
      rate: 0.95,
      pitch: 1.1,
      preferredNames: ['Samantha', 'Karen', 'Fiona', 'Victoria', 'Female'],
      gender: 'female'
    },
    kenji: {
      rate: 1.15,
      pitch: 0.9,
      preferredNames: ['Daniel', 'Alex', 'James', 'Male', 'David'],
      gender: 'male'
    },
    yuki: {
      rate: 0.85,
      pitch: 0.95,
      preferredNames: ['Moira', 'Tessa', 'Veena', 'Female'],
      gender: 'female'
    },
    tutor: {
      rate: 1.0,
      pitch: 1.0,
      preferredNames: ['Samantha', 'Google', 'Default'],
      gender: 'neutral'
    }
  };

  const MAX_QUEUE_SIZE = 4;
  const MAX_TEXT_LENGTH = 200;

  /**
   * VoiceSystem - Web Speech API voice synthesis for character dialogue.
   * Each character gets a distinct voice with appropriate rate/pitch.
   */
  class VoiceSystem {
    constructor() {
      this.enabled = false;
      this.voices = {};
      this.rate = 1.0;
      this.volume = 0.7;
      this.speaking = false;
      this.queue = [];
      this._voicesLoaded = false;
      this._supported = false;
    }

    /**
     * Initialize the voice system. Must be called before speak().
     * Loads available voices and assigns them to characters.
     */
    init() {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        this._supported = false;
        return;
      }
      this._supported = true;

      const loadVoices = () => {
        const available = speechSynthesis.getVoices();
        if (available.length === 0) return;
        this._voicesLoaded = true;
        this.assignVoices(available);
      };

      speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }

    /**
     * Assign distinct voices to each character based on preferences.
     * Tries to match by preferred name keywords, then falls back to
     * gender-based filtering, and finally to whatever is available.
     */
    assignVoices(available) {
      if (!available || available.length === 0) return;

      const charIds = Object.keys(VOICE_PROFILES);
      const used = new Set();

      for (const charId of charIds) {
        const profile = VOICE_PROFILES[charId];
        let chosen = null;

        // First pass: try preferred names
        for (const pref of profile.preferredNames) {
          const match = available.find(
            v => v.name.includes(pref) && !used.has(v.name)
          );
          if (match) {
            chosen = match;
            break;
          }
        }

        // Second pass: try gender-based heuristic
        if (!chosen && profile.gender === 'female') {
          chosen = available.find(
            v => (v.name.includes('Female') || v.name.includes('woman')) && !used.has(v.name)
          );
        }
        if (!chosen && profile.gender === 'male') {
          chosen = available.find(
            v => (v.name.includes('Male') || v.name.includes('man')) && !used.has(v.name)
          );
        }

        // Fallback: pick first unused, or just the first available
        if (!chosen) {
          chosen = available.find(v => !used.has(v.name)) || available[0];
        }

        this.voices[charId] = chosen;
        if (chosen) used.add(chosen.name);
      }
    }

    /**
     * Speak text as a given character.
     * @param {string} characterId - mei, kenji, yuki, or tutor
     * @param {string} text - The text to speak
     */
    speak(characterId, text) {
      if (!this._supported || !this.enabled || !text) return;

      // Truncate very long text
      const cleanText = text.length > MAX_TEXT_LENGTH
        ? text.substring(0, MAX_TEXT_LENGTH) + '...'
        : text;

      // Enforce queue size limit
      if (this.queue.length >= MAX_QUEUE_SIZE) {
        this.queue.shift();
      }

      this.queue.push({ characterId: characterId, text: cleanText });
      this._processQueue();
    }

    /**
     * Process the next item in the speech queue.
     */
    _processQueue() {
      if (this.speaking || this.queue.length === 0) return;

      const item = this.queue.shift();
      this.speaking = true;

      const utterance = new SpeechSynthesisUtterance(item.text);
      const profile = VOICE_PROFILES[item.characterId] || VOICE_PROFILES.tutor;

      utterance.voice = this.voices[item.characterId] || this.voices.tutor || null;
      utterance.rate = profile.rate * this.rate;
      utterance.pitch = profile.pitch;
      utterance.volume = this.volume;

      utterance.onend = () => {
        this.speaking = false;
        this._processQueue();
      };

      utterance.onerror = () => {
        this.speaking = false;
        this._processQueue();
      };

      try {
        speechSynthesis.speak(utterance);
      } catch (e) {
        this.speaking = false;
        this._processQueue();
      }
    }

    /**
     * Enable or disable the voice system.
     * Cancels any in-progress speech when disabled.
     */
    setEnabled(enabled) {
      this.enabled = !!enabled;
      if (!this.enabled) {
        this.stop();
      }
    }

    /**
     * Set master volume (0.0 to 1.0).
     */
    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1, vol));
    }

    /**
     * Set global rate multiplier.
     */
    setRate(rate) {
      this.rate = Math.max(0.5, Math.min(2.0, rate));
    }

    /**
     * Check whether the voice system is enabled and supported.
     */
    isEnabled() {
      return this._supported && this.enabled;
    }

    /**
     * Check if voices have been loaded.
     */
    isReady() {
      return this._supported && this._voicesLoaded;
    }

    /**
     * Stop all speech and clear the queue.
     */
    stop() {
      this.queue = [];
      this.speaking = false;
      if (this._supported) {
        try {
          speechSynthesis.cancel();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    }

    /**
     * Get available character IDs.
     */
    getCharacterIds() {
      return Object.keys(VOICE_PROFILES);
    }

    /**
     * Get the assigned voice name for a character.
     */
    getVoiceName(characterId) {
      const voice = this.voices[characterId];
      return voice ? voice.name : 'none';
    }
  }

  root.MJ.Voice = Object.freeze({
    VoiceSystem: VoiceSystem,
    VOICE_PROFILES: VOICE_PROFILES,
    create: function() {
      return new VoiceSystem();
    }
  });

})(typeof window !== 'undefined' ? window : global);
