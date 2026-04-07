/**
 * ollama-integration.js — Connect to locally installed Ollama for AI-powered characters
 *
 * Ollama runs LLMs locally (llama3, mistral, gemma, etc.) with an OpenAI-compatible API.
 * This module enables characters to have genuine LLM-driven conversations and decisions
 * without any cloud API costs.
 *
 * Setup: Install Ollama (https://ollama.com), run `ollama pull llama3`, then it's ready.
 * Default endpoint: http://localhost:11434
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const DEFAULT_URL = 'http://localhost:11434';
  const STORAGE_KEY = 'mj_ollama_config';

  class OllamaClient {
    constructor() {
      this.load();
      this.available = false;
      this.lastCheck = 0;
      this.responseCache = new Map();
      this.callCount = 0;
      this.totalTokens = 0;
    }

    load() {
      try {
        const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (d) { this.config = d; return; }
      } catch (e) {}
      this.config = {
        url: DEFAULT_URL,
        model: 'llama3.2',
        enabled: false,
        maxTokens: 150,
        temperature: 0.8,
        useForChat: true,        // power character conversations
        useForDecisions: false,  // let LLM influence game decisions (experimental)
        contextWindow: 4096,
        timeout: 10000           // 10 second timeout per request
      };
    }

    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config)); } catch (e) {}
    }

    /**
     * Check if Ollama is running and responsive
     */
    async checkConnection() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch(this.config.url + '/api/tags', {
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (resp.ok) {
          const data = await resp.json();
          this.available = true;
          this.installedModels = (data.models || []).map(m => m.name || m.model);
          return { connected: true, models: this.installedModels };
        }
        this.available = false;
        return { connected: false, error: 'Server responded but not OK' };
      } catch (e) {
        this.available = false;
        return { connected: false, error: e.name === 'AbortError' ? 'Timeout — is Ollama running?' : e.message };
      }
    }

    /**
     * Generate a response from the local LLM
     * @param {string} systemPrompt - character personality and cognitive state
     * @param {string} userMessage - the conversation input
     * @param {Object} options - {temperature, maxTokens, stop}
     */
    async generate(systemPrompt, userMessage, options) {
      if (!this.config.enabled || !this.available) return null;

      // Simple cache for identical prompts (saves compute on tutor Q&A)
      // Skip cache for short character dialogue to keep it varied
      const cacheKey = systemPrompt.slice(-100) + '|' + userMessage;
      const isShortDialogue = (options?.maxTokens || this.config.maxTokens) <= 60;
      if (!isShortDialogue && this.responseCache.has(cacheKey)) return this.responseCache.get(cacheKey);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);

        const resp = await fetch(this.config.url + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            stream: false,
            options: {
              temperature: options?.temperature || this.config.temperature,
              num_predict: options?.maxTokens || this.config.maxTokens,
              stop: options?.stop || ['\n\n', 'Human:', 'Player:']
            }
          })
        });

        clearTimeout(timeout);

        if (!resp.ok) return null;
        const data = await resp.json();
        const reply = data.message?.content || '';

        this.callCount++;
        this.totalTokens += (data.eval_count || 0);

        // Clean and cache
        const cleaned = this.cleanResponse(reply);
        this.responseCache.set(cacheKey, cleaned);
        if (this.responseCache.size > 100) {
          const first = this.responseCache.keys().next().value;
          this.responseCache.delete(first);
        }

        return cleaned;
      } catch (e) {
        return null;
      }
    }

    /**
     * Generate a character message using their full cognitive state
     */
    async generateCharacterMessage(characterId, trigger, gameState) {
      if (!this.config.enabled || !this.config.useForChat) return null;

      // Build rich system prompt from personality + cognition
      const systemPrompt = this.buildCharacterPrompt(characterId, gameState);
      const userMessage = this.buildTriggerMessage(trigger, gameState);

      return this.generate(systemPrompt, userMessage, { maxTokens: 100 });
    }

    /**
     * Let the LLM influence a game decision (experimental)
     */
    async getDecisionGuidance(characterId, gameId, situation) {
      if (!this.config.enabled || !this.config.useForDecisions) return null;

      const prompt = `You are playing ${gameId}. Your personality: ${this.getPersonalityBrief(characterId)}.

Current situation: ${situation}

What action do you take? Reply with ONLY one word: fold, call, raise, hit, stand, double, split, play, or pass.`;

      const response = await this.generate(
        'You are a game AI. Reply with a single action word only.',
        prompt,
        { maxTokens: 10, temperature: 0.3 }
      );

      if (!response) return null;
      const action = response.toLowerCase().trim().split(/\s+/)[0];
      const validActions = ['fold', 'call', 'raise', 'check', 'allin', 'hit', 'stand', 'double', 'split', 'play', 'pass'];
      return validActions.includes(action) ? action : null;
    }

    /**
     * Build a full character prompt including personality, cognition, and memories
     */
    buildCharacterPrompt(characterId, gameState) {
      const sections = [];

      // Base personality
      if (root.MJ.Personality && root.MJ.Personality.CHARACTERS) {
        const char = root.MJ.Personality.CHARACTERS[characterId];
        if (char) {
          sections.push(`You are ${char.fullName || char.name}, ${char.age}. ${char.occupation || ''}`);
          sections.push(char.backstory || '');
          sections.push(`Speech style: ${char.speechStyle || 'Natural'}`);
        }
      }

      // Cognitive state (beliefs, lessons, memories)
      if (root.MJ.CharacterCognition) {
        try {
          const cog = new root.MJ.CharacterCognition.CharacterCognition(characterId);
          const cogPrompt = cog.buildCognitivePrompt();
          if (cogPrompt) sections.push(cogPrompt);
        } catch (e) {}
      }

      // Emotional state
      if (root.MJ.CrossGameLearning) {
        try {
          const cgl = new root.MJ.CrossGameLearning.CrossGameLearning();
          const emotion = cgl.state.characterEmotions[characterId];
          const intensity = cgl.state.characterEmotionIntensity[characterId];
          if (emotion && emotion !== 'neutral') {
            sections.push(`Current emotion: ${emotion} (intensity: ${(intensity * 100).toFixed(0)}%)`);
          }
        } catch (e) {}
      }

      sections.push('Be brief (1-2 sentences). Stay in character. You can talk about the game, life, philosophy, or anything natural.');

      return sections.filter(s => s).join('\n\n');
    }

    buildTriggerMessage(trigger, gameState) {
      const messages = {
        game_start: 'A new game is starting. Say something to greet the other players.',
        won: 'You just won this round! React naturally.',
        lost: 'You just lost this round. How do you feel?',
        big_win: 'Someone won with an amazing hand! React.',
        idle: 'There\'s a pause in the game. Say something — about the game, life, anything.',
        opponent_action: 'An opponent just made an interesting play. Comment on it.',
        thinking: 'It\'s your turn to think about what to do. Think out loud briefly.',
        bluff_success: 'Your bluff worked! They folded. React.',
        bluff_caught: 'You got caught bluffing. React.',
        round_end: 'The round just ended. Share a thought or observation.'
      };
      return messages[trigger] || 'Say something natural and in character.';
    }

    getPersonalityBrief(characterId) {
      const briefs = {
        mei: 'Cautious data analyst, plays tight, loves patterns and statistics',
        kenji: 'Aggressive ex-poker pro, emotional, trash-talks lovingly, runs a ramen shop',
        yuki: 'Wise retired professor, calm and philosophical, plays to honor late husband Takeshi'
      };
      return briefs[characterId] || 'A thoughtful game player';
    }

    cleanResponse(text) {
      if (!text) return '';
      // Remove common LLM artifacts
      let cleaned = text.trim();
      // Remove wrapping quotes
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
          (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1);
      }
      // Remove character name prefix if present
      cleaned = cleaned.replace(/^(Mei|Kenji|Yuki|I):\s*/i, '');
      // Truncate to 2 sentences max
      const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim());
      if (sentences.length > 2) cleaned = sentences.slice(0, 2).join('. ') + '.';
      return cleaned.trim();
    }

    // === Settings UI ===
    buildSettingsUI() {
      const el = document.createElement('div');
      el.style.cssText = 'padding:12px;';

      el.innerHTML = `
        <h4 style="color:var(--accent,#e8b830);margin:0 0 8px;">Ollama (Local LLM)</h4>
        <div style="font-size:12px;color:var(--text-secondary,#aaa);margin-bottom:10px;">
          Run AI models locally — no API costs. Install from <a href="https://ollama.com" target="_blank" style="color:#6bb8ff;">ollama.com</a>
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-size:12px;color:#ccc;">Server URL</label>
          <input id="ollama-url" type="text" value="${this.config.url}" style="width:100%;padding:4px 8px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#e0e0e0;font-size:12px;" />
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-size:12px;color:#ccc;">Model</label>
          <select id="ollama-model" style="width:100%;padding:4px 8px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#e0e0e0;font-size:12px;">
            <option value="llama3.2" ${this.config.model==='llama3.2'?'selected':''}>Llama 3.2 (3B) — Fast</option>
            <option value="llama3" ${this.config.model==='llama3'?'selected':''}>Llama 3 (8B)</option>
            <option value="llama3:70b" ${this.config.model==='llama3:70b'?'selected':''}>Llama 3 (70B)</option>
            <option value="mistral" ${this.config.model==='mistral'?'selected':''}>Mistral (7B)</option>
            <option value="gemma2" ${this.config.model==='gemma2'?'selected':''}>Gemma 2 (9B)</option>
            <option value="phi3" ${this.config.model==='phi3'?'selected':''}>Phi-3 (3.8B)</option>
            <option value="qwen2" ${this.config.model==='qwen2'?'selected':''}>Qwen 2 (7B)</option>
          </select>
        </div>
        <div style="margin-bottom:8px;display:flex;gap:12px;">
          <label style="font-size:12px;color:#ccc;display:flex;align-items:center;gap:4px;">
            <input type="checkbox" id="ollama-enabled" ${this.config.enabled?'checked':''} /> Enable
          </label>
          <label style="font-size:12px;color:#ccc;display:flex;align-items:center;gap:4px;">
            <input type="checkbox" id="ollama-chat" ${this.config.useForChat?'checked':''} /> Power chat
          </label>
          <label style="font-size:12px;color:#ccc;display:flex;align-items:center;gap:4px;">
            <input type="checkbox" id="ollama-decisions" ${this.config.useForDecisions?'checked':''} /> Influence play
          </label>
        </div>
        <div style="display:flex;gap:6px;">
          <button id="ollama-test" class="btn btn-sm">Test Connection</button>
          <button id="ollama-save" class="btn btn-sm btn-primary">Save</button>
        </div>
        <div id="ollama-status" style="font-size:11px;margin-top:6px;color:var(--text-secondary,#aaa);"></div>
        <div style="font-size:10px;color:#666;margin-top:6px;">
          Calls: ${this.callCount} | Tokens: ${this.totalTokens}
        </div>
      `;

      // Wire up after DOM insertion
      setTimeout(() => {
        const saveBtn = document.getElementById('ollama-save');
        const testBtn = document.getElementById('ollama-test');
        const statusEl = document.getElementById('ollama-status');

        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            this.config.url = document.getElementById('ollama-url')?.value || DEFAULT_URL;
            this.config.model = document.getElementById('ollama-model')?.value || 'llama3';
            this.config.enabled = document.getElementById('ollama-enabled')?.checked || false;
            this.config.useForChat = document.getElementById('ollama-chat')?.checked || false;
            this.config.useForDecisions = document.getElementById('ollama-decisions')?.checked || false;
            this.save();
            if (statusEl) { statusEl.textContent = 'Saved!'; statusEl.style.color = '#4ade80'; }
          });
        }

        if (testBtn) {
          testBtn.addEventListener('click', async () => {
            if (statusEl) { statusEl.textContent = 'Testing...'; statusEl.style.color = '#e8b830'; }
            this.config.url = document.getElementById('ollama-url')?.value || DEFAULT_URL;
            const result = await this.checkConnection();
            if (result.connected) {
              statusEl.textContent = `Connected! Models: ${result.models.join(', ')}`;
              statusEl.style.color = '#4ade80';
            } else {
              statusEl.textContent = `Failed: ${result.error}`;
              statusEl.style.color = '#ef4444';
            }
          });
        }
      }, 0);

      return el;
    }

    getStats() {
      return {
        enabled: this.config.enabled,
        available: this.available,
        model: this.config.model,
        url: this.config.url,
        calls: this.callCount,
        tokens: this.totalTokens,
        cacheSize: this.responseCache.size,
        useForChat: this.config.useForChat,
        useForDecisions: this.config.useForDecisions
      };
    }
  }

  root.MJ.Ollama = Object.freeze({ OllamaClient });

  if (typeof console !== 'undefined') console.log('[Ollama] Integration module loaded');
})(typeof window !== 'undefined' ? window : global);
