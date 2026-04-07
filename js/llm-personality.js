/*  llm-personality.js — Full LLM-driven character conversations
 *  When an API key is configured, generates genuinely freeform character dialogue
 *  using the personality system's rich character data.
 *  Exports: root.MJ.LLMPersonality
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};

  // ── Constants ──

  var MAX_CALLS_PER_SESSION = 20;
  var COOLDOWN_MS = 30000; // 30 seconds between LLM calls
  var ESTIMATED_INPUT_TOKENS_PER_CALL = 450;
  var ESTIMATED_OUTPUT_TOKENS_PER_CALL = 80;
  var QUEUE_TIMEOUT_MS = 15000; // abort if LLM takes longer than 15s

  // Triggers that warrant an LLM call
  var LLM_WORTHY_TRIGGERS = [
    'idle', 'big_win', 'big_score', 'deal_in', 'story_moment',
    'player_question', 'milestone', 'game_end_dramatic',
    'losing_streak', 'winning_streak', 'relationship_up'
  ];

  // ── Fallback response banks (used when LLM unavailable) ──

  var FALLBACK_BANKS = {
    mei: {
      idle: [
        'The tiles have a rhythm today, don\'t they?',
        'I was just thinking about grandma\'s garden...',
        'Mochi would be napping right about now.',
        'Data patterns and tile patterns — they really are the same.',
        'Have you tried the new tea place by the station?'
      ],
      big_win: [
        'That was... incredible! The tiles aligned perfectly!',
        'Grandma, are you watching from somewhere?',
        'I can barely believe that hand came together!'
      ],
      deal_in: [
        'Oh no... I should have seen that coming.',
        'That stings. I need to refocus.',
        'Back to basics. Read the discards, Mei.'
      ],
      story_moment: [
        'This reminds me of something important...',
        'Some moments at the table stay with you forever.'
      ],
      player_question: [
        'Hmm, that\'s a good question. Let me think...',
        'You always ask the most interesting things.',
        'I\'d need to think about that more carefully.'
      ],
      default: [
        'The tiles tell a story if you listen.',
        'Patience is its own reward.',
        'My grandmother would be proud.'
      ]
    },
    kenji: {
      idle: [
        'Man, I should be prepping broth right now but this is way more fun.',
        'Rex chewed through ANOTHER leash yesterday. Third one this month!',
        'You ever play poker? Different vibe but same rush.',
        'My tonkotsu takes twelve hours. Twelve! Worth every minute though.',
        'I\'ve been thinking about adding a spicy miso to the menu.'
      ],
      big_win: [
        'BOOM! Did you SEE that?! That\'s what I\'m talking about!',
        'Nobody beats the King! NOBODY!',
        'Write that one down — that was LEGENDARY!'
      ],
      deal_in: [
        'WHAT?! How did I not see—okay. OKAY. Deep breaths.',
        'The tiles are RIGGED. I\'m calling it.',
        'That was... ugh. Just deal the next hand.'
      ],
      story_moment: [
        'Real talk for a second...',
        'You know, moments like this are why I keep playing.'
      ],
      player_question: [
        'Oh, you wanna know? Pull up a chair.',
        'Ha! Funny you should ask that.',
        'Short answer or long answer? Who am I kidding — long answer.'
      ],
      default: [
        'All in!',
        'Fortune favors the bold!',
        'Just like a good broth — you gotta commit.'
      ]
    },
    yuki: {
      idle: [
        'The chrysanthemums bloomed early this year. A sign, perhaps.',
        'I was rereading Bashō this morning. Such clarity in so few words.',
        'Takeshi used to hum during games. I catch myself doing it now.',
        'Tea tastes different when you drink it alone.',
        'My students would be surprised to see me here. Or perhaps not.'
      ],
      big_win: [
        'Oh my... Takeshi, did you arrange that from wherever you are?',
        'What an unexpected gift from the tiles.',
        'A hand like that deserves a moment of silence.'
      ],
      deal_in: [
        'The river flows where it will. I accept it.',
        'Even losses carry lessons, if we listen.',
        'Takeshi lost more gracefully than I do. I\'m still learning.'
      ],
      story_moment: [
        'Let me tell you something I\'ve been thinking about...',
        'Some stories only reveal themselves at the right moment.'
      ],
      player_question: [
        'What a thoughtful question. Let me consider...',
        'You remind me of my best students — always curious.',
        'Hmm. Takeshi would have had a better answer than mine.'
      ],
      default: [
        'In every hand, a lesson.',
        'The tiles are honest — it\'s we who deceive ourselves.',
        'Takeshi would have played it differently.'
      ]
    }
  };

  // ── Helper: build the system prompt ──

  function buildSystemPrompt(characterId, trigger, gameState, chatHistory) {
    var Personality = root.MJ.Personality;
    var CharRelations = root.MJ.CharacterRelations;
    if (!Personality || !Personality.CHARACTERS) return null;

    var charData = Personality.CHARACTERS[characterId];
    if (!charData) return null;

    // Build personality engine for memory access
    var engine = new Personality.PersonalityEngine(characterId);
    var memory = engine.getMemory();
    var memSummary = memory.getMemorySummary();
    var dominantEmotion = memory.getDominantEmotion();
    var emotions = memSummary.emotions;
    var dominantIntensity = emotions[dominantEmotion]
      ? emotions[dominantEmotion].toFixed(2)
      : '0.00';

    // Recent memories
    var recentMemories = memSummary.recentMemories;
    var memoryLines = '';
    for (var i = 0; i < recentMemories.length; i++) {
      memoryLines += '- ' + recentMemories[i].content +
        ' (' + recentMemories[i].emotion + ')\n';
    }
    if (!memoryLines) memoryLines = '- (No recent memories)\n';

    // Trigger description
    var triggerDescriptions = {
      idle: 'is chatting between hands',
      big_win: 'just won a big hand',
      big_score: 'just scored an impressive hand',
      deal_in: 'just dealt into someone\'s winning hand',
      story_moment: 'triggered a narrative moment',
      player_question: 'asked you a question',
      milestone: 'reached a game milestone',
      game_end_dramatic: 'finished a dramatic game',
      losing_streak: 'is on a losing streak',
      winning_streak: 'is on a winning streak',
      relationship_up: 'just deepened your relationship',
      game_start: 'just sat down to play',
      won: 'just won a hand',
      lost: 'just lost a hand',
      opponent_riichi: 'declared riichi'
    };
    var triggerDesc = triggerDescriptions[trigger] || trigger;

    // Game state summary
    var stateStr = 'Unknown state';
    if (gameState) {
      var parts = [];
      if (gameState.round) parts.push('Round: ' + gameState.round);
      if (gameState.honba !== undefined) parts.push('Honba: ' + gameState.honba);
      if (gameState.tilesRemaining !== undefined) parts.push('Tiles remaining: ' + gameState.tilesRemaining);
      if (gameState.playerScore !== undefined) parts.push('Player score: ' + gameState.playerScore);
      if (gameState.characterScore !== undefined) parts.push(charData.name + '\'s score: ' + gameState.characterScore);
      if (gameState.shanten !== undefined) parts.push('Shanten: ' + gameState.shanten);
      if (gameState.isRiichi) parts.push('Player is in riichi');
      if (gameState.isTenpai) parts.push(charData.name + ' is tenpai');
      if (parts.length > 0) stateStr = parts.join('. ');
    }

    // Relationship descriptions with other characters
    var relationshipDesc = '';
    if (CharRelations && CharRelations.RELATIONSHIPS) {
      var allCharIds = Object.keys(Personality.CHARACTERS);
      for (var j = 0; j < allCharIds.length; j++) {
        var otherId = allCharIds[j];
        if (otherId === characterId) continue;
        var otherChar = Personality.CHARACTERS[otherId];
        // Try both key orderings
        var key1 = characterId + '-' + otherId;
        var key2 = otherId + '-' + characterId;
        var rel = CharRelations.RELATIONSHIPS[key1] || CharRelations.RELATIONSHIPS[key2];
        if (rel) {
          relationshipDesc += '  - ' + otherChar.name + ': ' + rel.description + '\n';
        }
      }
    }
    if (!relationshipDesc) {
      relationshipDesc = '  - (Other players at the table)\n';
    }

    // Chat history context
    var historyStr = '';
    if (chatHistory && chatHistory.length > 0) {
      var recent = chatHistory.slice(-6);
      for (var h = 0; h < recent.length; h++) {
        var entry = recent[h];
        historyStr += (entry.speaker || 'Someone') + ': ' + entry.text + '\n';
      }
    }

    // Assemble the system prompt
    var prompt =
      'You are ' + charData.fullName + ', ' + charData.age + ' years old. ' +
      charData.occupation + '. ' + charData.backstory + '\n\n' +

      'Personality: ' + charData.speechStyle + '\n' +
      'Current emotion: ' + dominantEmotion + ' (intensity: ' + dominantIntensity + ')\n' +
      'Relationship with player: Level ' + engine.relationshipLevel +
      '/5 (' + engine.gamesPlayed + ' games)\n\n' +

      'Recent memories:\n' + memoryLines + '\n' +

      'The player just: ' + triggerDesc + '\n' +
      'Game state: ' + stateStr + '\n';

    if (historyStr) {
      prompt += '\nRecent conversation:\n' + historyStr + '\n';
    }

    prompt +=
      '\nRespond in character. Be brief (1-3 sentences). You can talk about:\n' +
      '- The game (tiles, strategy, scoring)\n' +
      '- Your life (' + charData.interests.join(', ') + ')\n' +
      '- Philosophy, humor, personal stories\n' +
      '- Your relationship with the player\n' +
      '- Other characters:\n' + relationshipDesc + '\n' +
      'Stay in character. ' + charData.name + ' speaks like: ' + charData.speechStyle;

    return prompt;
  }

  // ── Helper: make the API call ──

  function callLLMAPI(systemPrompt, userMessage, config) {
    var provider = config.provider || 'anthropic';
    var apiUrl = config.apiUrl;
    var apiKey = config.apiKey;
    var model = config.model;

    var requestBody, headers;

    if (provider === 'anthropic') {
      headers = {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      };
      requestBody = {
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      };
    } else {
      // OpenAI-compatible format
      headers = {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      };
      requestBody = {
        model: model || 'gpt-4',
        max_tokens: 150,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      };
    }

    return fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    }).then(function (response) {
      if (!response.ok) {
        return response.json().catch(function () { return {}; }).then(function (err) {
          throw new Error('API ' + response.status + ': ' + (err.error && err.error.message || response.statusText));
        });
      }
      return response.json();
    }).then(function (data) {
      if (provider === 'anthropic') {
        if (data.content && data.content.length > 0) {
          return data.content[0].text || '';
        }
        return '';
      } else {
        if (data.choices && data.choices.length > 0) {
          return data.choices[0].message.content || '';
        }
        return '';
      }
    });
  }

  // ── LLMPersonality Class ──

  class LLMPersonality {
    constructor() {
      this._callCount = 0;
      this._lastCallTime = 0;
      this._queue = [];
      this._processing = false;
      this._budget = {
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUSD: 0
      };
      this._typingCallbacks = [];
    }

    /**
     * Generate a response for a character using the LLM.
     * Returns a Promise that resolves with the response text.
     * Falls back to scripted banks if LLM is unavailable.
     *
     * @param {string} characterId - mei, kenji, or yuki
     * @param {string} trigger - event type (idle, big_win, deal_in, etc.)
     * @param {object} [gameState] - current game state summary
     * @param {Array} [chatHistory] - recent chat [{speaker, text}]
     * @returns {Promise<string>}
     */
    generateResponse(characterId, trigger, gameState, chatHistory) {
      var self = this;

      // Check if LLM is available and appropriate
      if (!this.shouldCallLLM(trigger)) {
        return Promise.resolve(this.getFallbackResponse(characterId, trigger));
      }

      var config = this._getConfig();
      if (!config || !config.enabled || !config.apiKey) {
        return Promise.resolve(this.getFallbackResponse(characterId, trigger));
      }

      // Build system prompt
      var systemPrompt = buildSystemPrompt(characterId, trigger, gameState, chatHistory);
      if (!systemPrompt) {
        return Promise.resolve(this.getFallbackResponse(characterId, trigger));
      }

      // Build user message based on trigger
      var userMessage = this._buildUserMessage(trigger, gameState);

      // Enqueue the request (non-blocking)
      return new Promise(function (resolve) {
        self._enqueue({
          characterId: characterId,
          trigger: trigger,
          systemPrompt: systemPrompt,
          userMessage: userMessage,
          config: config,
          resolve: resolve,
          timestamp: Date.now()
        });
      });
    }

    /**
     * Determine whether the LLM should be called for this trigger.
     * Rate limiting: max 20 calls per session, 30s cooldown.
     *
     * @param {string} trigger
     * @returns {boolean}
     */
    shouldCallLLM(trigger) {
      // Check session call limit
      if (this._callCount >= MAX_CALLS_PER_SESSION) {
        return false;
      }

      // Check cooldown
      var now = Date.now();
      if (now - this._lastCallTime < COOLDOWN_MS) {
        return false;
      }

      // Only call for worthy triggers
      if (LLM_WORTHY_TRIGGERS.indexOf(trigger) === -1) {
        return false;
      }

      // Check config
      var config = this._getConfig();
      if (!config || !config.enabled || !config.apiKey) {
        return false;
      }

      return true;
    }

    /**
     * Get a fallback scripted response when LLM is unavailable.
     *
     * @param {string} characterId
     * @param {string} trigger
     * @returns {string}
     */
    getFallbackResponse(characterId, trigger) {
      // Try personality system's scripted banks first
      var Personality = root.MJ.Personality;
      if (Personality && Personality.pickMessage) {
        var engine = new Personality.PersonalityEngine(characterId);
        var emotion = engine.getMemory().getDominantEmotion();
        var msg = Personality.pickMessage(characterId, trigger, emotion);
        if (msg) return msg;
      }

      // Local fallback banks
      var charBank = FALLBACK_BANKS[characterId] || FALLBACK_BANKS.mei;
      var triggerBank = charBank[trigger];
      if (triggerBank && triggerBank.length > 0) {
        return triggerBank[Math.floor(Math.random() * triggerBank.length)];
      }

      // Default fallback
      var defaults = charBank.default || ['...'];
      return defaults[Math.floor(Math.random() * defaults.length)];
    }

    /**
     * Get current budget tracking data.
     * @returns {{ inputTokens: number, outputTokens: number, estimatedCostUSD: number, callCount: number }}
     */
    getBudget() {
      return {
        inputTokens: this._budget.inputTokens,
        outputTokens: this._budget.outputTokens,
        estimatedCostUSD: this._budget.estimatedCostUSD,
        callCount: this._callCount
      };
    }

    /**
     * Reset session call count and budget tracking.
     */
    resetSession() {
      this._callCount = 0;
      this._lastCallTime = 0;
      this._budget = { inputTokens: 0, outputTokens: 0, estimatedCostUSD: 0 };
      this._queue = [];
      this._processing = false;
    }

    /**
     * Register a callback for typing indicator events.
     * Callback receives { characterId, isTyping }.
     *
     * @param {function} callback
     */
    onTypingState(callback) {
      if (typeof callback === 'function') {
        this._typingCallbacks.push(callback);
      }
    }

    /**
     * Remove a typing state callback.
     * @param {function} callback
     */
    offTypingState(callback) {
      this._typingCallbacks = this._typingCallbacks.filter(function (cb) {
        return cb !== callback;
      });
    }

    /**
     * Get remaining LLM calls for this session.
     * @returns {number}
     */
    getRemainingCalls() {
      return Math.max(0, MAX_CALLS_PER_SESSION - this._callCount);
    }

    /**
     * Get seconds until cooldown expires.
     * @returns {number}
     */
    getCooldownRemaining() {
      var elapsed = Date.now() - this._lastCallTime;
      if (elapsed >= COOLDOWN_MS) return 0;
      return Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    }

    // ── Private: queue system ──

    _enqueue(request) {
      this._queue.push(request);
      if (!this._processing) {
        this._processQueue();
      }
    }

    _processQueue() {
      if (this._queue.length === 0) {
        this._processing = false;
        return;
      }

      this._processing = true;
      var self = this;
      var request = this._queue.shift();

      // Check if request is stale
      if (Date.now() - request.timestamp > QUEUE_TIMEOUT_MS) {
        request.resolve(self.getFallbackResponse(request.characterId, request.trigger));
        self._processQueue();
        return;
      }

      // Show typing indicator
      self._emitTyping(request.characterId, true);

      // Track budget
      self._callCount++;
      self._lastCallTime = Date.now();
      self._budget.inputTokens += ESTIMATED_INPUT_TOKENS_PER_CALL;

      // Set a timeout for the API call
      var timedOut = false;
      var timeoutId = setTimeout(function () {
        timedOut = true;
        self._emitTyping(request.characterId, false);
        request.resolve(self.getFallbackResponse(request.characterId, request.trigger));
        self._processQueue();
      }, QUEUE_TIMEOUT_MS);

      callLLMAPI(request.systemPrompt, request.userMessage, request.config)
        .then(function (text) {
          if (timedOut) return;
          clearTimeout(timeoutId);

          // Track output tokens
          self._budget.outputTokens += ESTIMATED_OUTPUT_TOKENS_PER_CALL;
          self._updateCostEstimate(request.config);

          // Clean up the response
          var cleaned = self._cleanResponse(text, request.characterId);

          self._emitTyping(request.characterId, false);
          request.resolve(cleaned || self.getFallbackResponse(request.characterId, request.trigger));
          self._processQueue();
        })
        .catch(function () {
          if (timedOut) return;
          clearTimeout(timeoutId);

          self._emitTyping(request.characterId, false);
          request.resolve(self.getFallbackResponse(request.characterId, request.trigger));
          self._processQueue();
        });
    }

    _emitTyping(characterId, isTyping) {
      var event = { characterId: characterId, isTyping: isTyping };
      for (var i = 0; i < this._typingCallbacks.length; i++) {
        try {
          this._typingCallbacks[i](event);
        } catch (e) { /* ignore callback errors */ }
      }
    }

    _getConfig() {
      if (root.MJ.LLMConfig) {
        var configManager = new root.MJ.LLMConfig.LLMConfig();
        return configManager.getConfig();
      }
      return null;
    }

    _buildUserMessage(trigger, gameState) {
      var messages = {
        idle: 'Say something in character — a passing thought, an anecdote, or a comment about the game.',
        big_win: 'React to winning a huge hand! Be excited or dramatic in character.',
        big_score: 'React to an impressive scoring hand.',
        deal_in: 'React to dealing into someone\'s winning hand. Stay in character.',
        story_moment: 'Share a personal story or memory relevant to this moment in the game.',
        player_question: 'The player is talking to you. Respond warmly and in character.',
        milestone: 'A game milestone was reached. Comment on it in character.',
        game_end_dramatic: 'The game ended dramatically. React and reflect in character.',
        losing_streak: 'You\'ve been losing. React to the streak in character.',
        winning_streak: 'You\'ve been winning. React to the streak in character.',
        relationship_up: 'Your friendship with the player just deepened. Acknowledge it warmly.'
      };

      var base = messages[trigger] || 'Respond naturally in character.';

      if (gameState && gameState.contextNote) {
        base += ' Context: ' + gameState.contextNote;
      }

      return base;
    }

    _cleanResponse(text, characterId) {
      if (!text) return '';

      // Remove any quotation marks wrapping the entire response
      var cleaned = text.trim();
      if ((cleaned.charAt(0) === '"' && cleaned.charAt(cleaned.length - 1) === '"') ||
          (cleaned.charAt(0) === '\u201C' && cleaned.charAt(cleaned.length - 1) === '\u201D')) {
        cleaned = cleaned.substring(1, cleaned.length - 1).trim();
      }

      // Remove character name prefix if the LLM added it
      var Personality = root.MJ.Personality;
      if (Personality && Personality.CHARACTERS && Personality.CHARACTERS[characterId]) {
        var name = Personality.CHARACTERS[characterId].name;
        var prefixPattern = new RegExp('^' + name + '\\s*:\\s*', 'i');
        cleaned = cleaned.replace(prefixPattern, '');
      }

      // Truncate if excessively long (keep to ~3 sentences)
      if (cleaned.length > 300) {
        var sentences = cleaned.match(/[^.!?]+[.!?]+/g);
        if (sentences && sentences.length > 3) {
          cleaned = sentences.slice(0, 3).join('').trim();
        } else {
          cleaned = cleaned.substring(0, 297) + '...';
        }
      }

      return cleaned;
    }

    _updateCostEstimate(config) {
      // Rough cost estimates per 1K tokens (in USD)
      var provider = config.provider || 'anthropic';
      var inputCostPer1K, outputCostPer1K;

      if (provider === 'anthropic') {
        // Sonnet-level pricing estimate
        inputCostPer1K = 0.003;
        outputCostPer1K = 0.015;
      } else {
        // OpenAI GPT-4 level estimate
        inputCostPer1K = 0.03;
        outputCostPer1K = 0.06;
      }

      this._budget.estimatedCostUSD =
        (this._budget.inputTokens / 1000) * inputCostPer1K +
        (this._budget.outputTokens / 1000) * outputCostPer1K;
    }
  }

  // ── Public API ──

  root.MJ.LLMPersonality = Object.freeze({
    LLMPersonality: LLMPersonality,
    FALLBACK_BANKS: FALLBACK_BANKS,
    MAX_CALLS_PER_SESSION: MAX_CALLS_PER_SESSION,
    COOLDOWN_MS: COOLDOWN_MS,
    create: function () {
      return new LLMPersonality();
    }
  });

})(typeof window !== 'undefined' ? window : global);
