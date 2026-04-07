/**
 * llm-config.js — LLM API configuration panel
 * Provides UI for configuring API keys, models, and testing connections.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── Storage Keys ──

  const CONFIG_STORAGE_KEY = 'mj_llm_config';

  // ── Provider Presets ──

  const PROVIDERS = {
    anthropic: {
      name: 'Anthropic',
      apiUrl: 'https://api.anthropic.com/v1/messages',
      models: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
      defaultModel: 'claude-sonnet-4-20250514'
    },
    openai_compatible: {
      name: 'OpenAI-compatible',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      models: [],
      defaultModel: ''
    }
  };

  // ── LLMConfig Class ──

  class LLMConfig {
    constructor() {
      this._config = null;
    }

    /**
     * Get current configuration from localStorage
     * @returns {{ apiUrl: string, apiKey: string, model: string, enabled: boolean, provider: string }}
     */
    getConfig() {
      if (this._config) return { ...this._config };
      try {
        const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (raw) {
          this._config = JSON.parse(raw);
          return { ...this._config };
        }
      } catch (_) {
        // localStorage unavailable
      }
      return {
        apiUrl: PROVIDERS.anthropic.apiUrl,
        apiKey: '',
        model: PROVIDERS.anthropic.defaultModel,
        enabled: false,
        provider: 'anthropic'
      };
    }

    /**
     * Save configuration to localStorage
     * @param {object} config
     */
    saveConfig(config) {
      const sanitized = {
        apiUrl: config.apiUrl || '',
        apiKey: config.apiKey || '',
        model: config.model || '',
        enabled: !!(config.apiUrl && config.apiKey),
        provider: config.provider || 'anthropic'
      };
      this._config = sanitized;
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
      } catch (_) {
        // localStorage unavailable
      }
      return sanitized;
    }

    /**
     * Test API connection with a simple message
     * @param {object} config - { apiUrl, apiKey, model, provider }
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    async testConnection(config) {
      const provider = config.provider || 'anthropic';
      const apiUrl = config.apiUrl;
      const apiKey = config.apiKey;
      const model = config.model;

      if (!apiUrl || !apiKey) {
        return { success: false, error: 'API URL and API Key are required.' };
      }

      try {
        let requestBody, headers;

        if (provider === 'anthropic') {
          headers = {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          };
          requestBody = {
            model: model || 'claude-sonnet-4-20250514',
            max_tokens: 32,
            system: 'Respond with exactly: OK',
            messages: [{ role: 'user', content: 'Hello' }]
          };
        } else {
          headers = {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
          };
          requestBody = {
            model: model || 'gpt-4',
            max_tokens: 32,
            messages: [
              { role: 'system', content: 'Respond with exactly: OK' },
              { role: 'user', content: 'Hello' }
            ]
          };
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || errorData.message || response.statusText;
          return { success: false, error: 'API returned ' + response.status + ': ' + errorMsg };
        }

        const data = await response.json();

        // Verify we got a valid response
        if (provider === 'anthropic') {
          if (data.content && data.content.length > 0) {
            return { success: true };
          }
          return { success: false, error: 'Unexpected response format from Anthropic API.' };
        } else {
          if (data.choices && data.choices.length > 0) {
            return { success: true };
          }
          return { success: false, error: 'Unexpected response format from API.' };
        }
      } catch (err) {
        return { success: false, error: 'Connection failed: ' + (err.message || 'Unknown error') };
      }
    }

    /**
     * Build a DOM configuration panel
     * @returns {HTMLElement}
     */
    buildConfigUI() {
      const config = this.getConfig();
      const self = this;

      const container = document.createElement('div');
      container.className = 'llm-config-panel';
      container.style.cssText = 'padding:16px;font-family:sans-serif;max-width:480px;';

      // Title
      const title = document.createElement('h3');
      title.textContent = 'LLM API Configuration';
      title.style.cssText = 'margin:0 0 16px 0;font-size:18px;';
      container.appendChild(title);

      // Provider dropdown
      const providerGroup = createFieldGroup('API Provider');
      const providerSelect = document.createElement('select');
      providerSelect.style.cssText = fieldStyle();
      const anthropicOpt = document.createElement('option');
      anthropicOpt.value = 'anthropic';
      anthropicOpt.textContent = 'Anthropic';
      const openaiOpt = document.createElement('option');
      openaiOpt.value = 'openai_compatible';
      openaiOpt.textContent = 'OpenAI-compatible';
      providerSelect.appendChild(anthropicOpt);
      providerSelect.appendChild(openaiOpt);
      providerSelect.value = config.provider || 'anthropic';
      providerGroup.appendChild(providerSelect);
      container.appendChild(providerGroup);

      // API Key input
      const keyGroup = createFieldGroup('API Key');
      const keyInput = document.createElement('input');
      keyInput.type = 'password';
      keyInput.placeholder = 'Enter your API key...';
      keyInput.value = config.apiKey || '';
      keyInput.style.cssText = fieldStyle();
      keyGroup.appendChild(keyInput);
      container.appendChild(keyGroup);

      // Model selection
      const modelGroup = createFieldGroup('Model');
      const modelSelect = document.createElement('select');
      modelSelect.style.cssText = fieldStyle();
      const customModelInput = document.createElement('input');
      customModelInput.type = 'text';
      customModelInput.placeholder = 'Custom model name...';
      customModelInput.style.cssText = fieldStyle() + 'margin-top:4px;display:none;';

      function populateModels(provider) {
        modelSelect.innerHTML = '';
        const preset = PROVIDERS[provider];
        if (preset && preset.models.length > 0) {
          for (const m of preset.models) {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            modelSelect.appendChild(opt);
          }
        }
        const customOpt = document.createElement('option');
        customOpt.value = '__custom__';
        customOpt.textContent = 'Custom...';
        modelSelect.appendChild(customOpt);

        // Set current value
        if (config.model && preset && preset.models.includes(config.model)) {
          modelSelect.value = config.model;
          customModelInput.style.display = 'none';
        } else if (config.model && config.model !== '') {
          modelSelect.value = '__custom__';
          customModelInput.value = config.model;
          customModelInput.style.display = 'block';
        }
      }

      populateModels(providerSelect.value);

      modelSelect.addEventListener('change', function () {
        if (modelSelect.value === '__custom__') {
          customModelInput.style.display = 'block';
          customModelInput.focus();
        } else {
          customModelInput.style.display = 'none';
        }
      });

      modelGroup.appendChild(modelSelect);
      modelGroup.appendChild(customModelInput);
      container.appendChild(modelGroup);

      // API URL
      const urlGroup = createFieldGroup('API URL');
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.value = config.apiUrl || PROVIDERS.anthropic.apiUrl;
      urlInput.style.cssText = fieldStyle();
      urlGroup.appendChild(urlInput);
      container.appendChild(urlGroup);

      // Provider change handler
      providerSelect.addEventListener('change', function () {
        const p = PROVIDERS[providerSelect.value];
        if (p) {
          urlInput.value = p.apiUrl;
          populateModels(providerSelect.value);
        }
      });

      // Status indicator
      const statusDiv = document.createElement('div');
      statusDiv.style.cssText = 'margin:12px 0;padding:8px 12px;border-radius:4px;font-size:14px;';
      setStatus(statusDiv, config.enabled ? 'connected' : 'disconnected');
      container.appendChild(statusDiv);

      // Buttons
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;margin-top:12px;';

      const testBtn = document.createElement('button');
      testBtn.textContent = 'Test Connection';
      testBtn.style.cssText = buttonStyle('#4a90d9');
      testBtn.addEventListener('click', async function () {
        setStatus(statusDiv, 'testing');
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';

        const testConfig = {
          apiUrl: urlInput.value.trim(),
          apiKey: keyInput.value.trim(),
          model: modelSelect.value === '__custom__' ? customModelInput.value.trim() : modelSelect.value,
          provider: providerSelect.value
        };

        const result = await self.testConnection(testConfig);
        setStatus(statusDiv, result.success ? 'connected' : 'disconnected', result.error);
        testBtn.disabled = false;
        testBtn.textContent = 'Test Connection';
      });

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.style.cssText = buttonStyle('#4caf50');
      saveBtn.addEventListener('click', function () {
        const newConfig = {
          apiUrl: urlInput.value.trim(),
          apiKey: keyInput.value.trim(),
          model: modelSelect.value === '__custom__' ? customModelInput.value.trim() : modelSelect.value,
          provider: providerSelect.value
        };

        const saved = self.saveConfig(newConfig);
        setStatus(statusDiv, saved.enabled ? 'connected' : 'disconnected',
          saved.enabled ? 'Configuration saved.' : 'Saved, but API key is missing. LLM features disabled.');

        // Notify LLMTutor if available
        if (root.MJ.LLMTutor) {
          try {
            const tutor = root.MJ._tutorInstance;
            if (tutor && typeof tutor.setApiConfig === 'function') {
              tutor.setApiConfig(saved.apiUrl, saved.apiKey, saved.model);
            }
          } catch (_) {
            // Tutor not initialized yet
          }
        }
      });

      btnRow.appendChild(testBtn);
      btnRow.appendChild(saveBtn);
      container.appendChild(btnRow);

      return container;
    }
  }

  // ── UI Helper Functions ──

  function createFieldGroup(label) {
    const group = document.createElement('div');
    group.style.cssText = 'margin-bottom:12px;';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.cssText = 'display:block;margin-bottom:4px;font-size:13px;font-weight:600;color:#ccc;';
    group.appendChild(lbl);
    return group;
  }

  function fieldStyle() {
    return 'width:100%;padding:8px;border:1px solid #555;border-radius:4px;' +
      'background:#2a2a2a;color:#eee;font-size:14px;box-sizing:border-box;';
  }

  function buttonStyle(bg) {
    return 'padding:8px 16px;border:none;border-radius:4px;cursor:pointer;' +
      'font-size:14px;font-weight:600;color:#fff;background:' + bg + ';';
  }

  function setStatus(el, state, message) {
    const states = {
      connected: { bg: '#1b3a1b', border: '#4caf50', text: 'Connected', icon: '\u2713' },
      disconnected: { bg: '#3a1b1b', border: '#f44336', text: 'Disconnected', icon: '\u2717' },
      testing: { bg: '#3a3a1b', border: '#ffc107', text: 'Testing...', icon: '\u21BB' }
    };
    const s = states[state] || states.disconnected;
    el.style.background = s.bg;
    el.style.border = '1px solid ' + s.border;
    el.style.color = s.border;
    el.textContent = s.icon + ' ' + (message || s.text);
  }

  root.MJ.LLMConfig = Object.freeze({ LLMConfig });

  if (typeof console !== 'undefined') console.log('[Mahjong] LLMConfig module loaded');
})(typeof window !== 'undefined' ? window : global);
