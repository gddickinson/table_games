/*  story-scenes.js — Full-screen illustrated story scenes for narrative moments
 *  Renders cinematic scenes with character portraits, typewriter dialogue,
 *  player choices, and celebration effects.
 *  Exports: root.MJ.StoryScenes
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};

  // ── Scene background gradients by mood ──

  var SCENE_BACKGROUNDS = {
    emotional:    'linear-gradient(135deg, #5c3a1e 0%, #c8874a 40%, #e8a85c 70%, #5c3a1e 100%)',
    dramatic:     'linear-gradient(135deg, #1a0000 0%, #4a0e0e 35%, #8b1a1a 60%, #1a0000 100%)',
    peaceful:     'linear-gradient(135deg, #1a3a2a 0%, #3a7a5a 40%, #5aaa8a 70%, #2a5a6a 100%)',
    celebratory:  'linear-gradient(135deg, #3a2a00 0%, #8a6a10 30%, #d4a820 50%, #8a6a10 70%, #3a2a00 100%)',
    nostalgic:    'linear-gradient(135deg, #3a2e20 0%, #7a6a50 40%, #a89878 60%, #5a4e3a 100%)'
  };

  // Map common mood keywords to background styles
  var MOOD_TO_BACKGROUND = {
    happy: 'celebratory', excited: 'celebratory', triumphant: 'celebratory',
    ecstatic: 'celebratory', grateful: 'celebratory',
    sad: 'emotional', disappointed: 'emotional', worried: 'emotional',
    warm: 'emotional', touched: 'emotional',
    angry: 'dramatic', tilted: 'dramatic', frustrated: 'dramatic',
    tense: 'dramatic', distracted: 'dramatic',
    serene: 'peaceful', calm: 'peaceful', accepting: 'peaceful',
    contemplative: 'peaceful',
    nostalgic: 'nostalgic', philosophical: 'nostalgic', wistful: 'nostalgic',
    neutral: 'peaceful'
  };

  // ── CSS injection (once) ──

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    var css =
      '.mj-scene-overlay {' +
        'position: fixed; top: 0; left: 0; width: 100%; height: 100%;' +
        'z-index: 10000; display: flex; align-items: center; justify-content: center;' +
        'background: rgba(0,0,0,0.85); opacity: 0; transition: opacity 0.5s ease;' +
        'font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;' +
      '}' +
      '.mj-scene-overlay.active { opacity: 1; }' +
      '.mj-scene-container {' +
        'display: flex; align-items: center; max-width: 900px; width: 90%;' +
        'min-height: 300px; border-radius: 16px; overflow: hidden;' +
        'box-shadow: 0 20px 60px rgba(0,0,0,0.6); position: relative;' +
      '}' +
      '.mj-scene-portrait {' +
        'flex: 0 0 160px; display: flex; align-items: center; justify-content: center;' +
        'padding: 20px; min-height: 280px;' +
      '}' +
      '.mj-scene-portrait-right {' +
        'flex: 0 0 140px; display: flex; align-items: center; justify-content: center;' +
        'padding: 16px;' +
      '}' +
      '.mj-scene-content {' +
        'flex: 1; padding: 32px 36px; color: #f0e8d8; position: relative;' +
      '}' +
      '.mj-scene-speaker {' +
        'font-size: 14px; text-transform: uppercase; letter-spacing: 2px;' +
        'color: #d4a860; margin-bottom: 12px; font-weight: 600;' +
      '}' +
      '.mj-scene-text {' +
        'font-size: 18px; line-height: 1.7; min-height: 60px;' +
        'text-shadow: 0 1px 3px rgba(0,0,0,0.4);' +
      '}' +
      '.mj-scene-text .cursor {' +
        'display: inline-block; width: 2px; height: 1em; background: #d4a860;' +
        'margin-left: 2px; animation: mj-blink 0.8s infinite;' +
      '}' +
      '@keyframes mj-blink { 0%,50% { opacity: 1; } 51%,100% { opacity: 0; } }' +
      '.mj-scene-choices {' +
        'margin-top: 24px; display: flex; flex-direction: column; gap: 10px;' +
      '}' +
      '.mj-scene-choice-btn {' +
        'background: rgba(212,168,96,0.15); border: 1px solid rgba(212,168,96,0.4);' +
        'color: #f0e8d8; padding: 10px 18px; border-radius: 8px; cursor: pointer;' +
        'font-size: 15px; text-align: left; transition: all 0.2s ease;' +
      '}' +
      '.mj-scene-choice-btn:hover {' +
        'background: rgba(212,168,96,0.3); border-color: #d4a860;' +
        'transform: translateX(4px);' +
      '}' +
      '.mj-scene-continue {' +
        'margin-top: 24px; background: none; border: 1px solid rgba(240,232,216,0.3);' +
        'color: #f0e8d8; padding: 8px 24px; border-radius: 6px; cursor: pointer;' +
        'font-size: 14px; transition: all 0.2s; opacity: 0;' +
      '}' +
      '.mj-scene-continue.visible { opacity: 1; }' +
      '.mj-scene-continue:hover { background: rgba(240,232,216,0.1); border-color: #f0e8d8; }' +
      '.mj-confetti-particle {' +
        'position: fixed; z-index: 10001; pointer-events: none;' +
        'width: 8px; height: 8px; border-radius: 2px;' +
      '}' +
      '@keyframes mj-confetti-fall {' +
        '0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }' +
        '100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }' +
      '}';

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── StoryScene Class ──

  class StoryScene {
    constructor() {
      this._overlay = null;
      this._isActive = false;
      this._typewriterTimer = null;
      this._autoAdvanceTimer = null;
      this._currentResolve = null;
      this._portraitRenderer = null;
    }

    /**
     * Show a full-screen story scene.
     *
     * @param {object} sceneData
     * @param {string} sceneData.type - 'narrative', 'dialogue', 'choice', 'celebration'
     * @param {string} [sceneData.character] - character ID for portrait
     * @param {string} [sceneData.emotion] - emotion for portrait rendering
     * @param {string} [sceneData.speaker] - display name above text
     * @param {string|string[]} sceneData.text - dialogue text (array for multi-step)
     * @param {string} [sceneData.mood] - mood for background gradient
     * @param {Array} [sceneData.choices] - [{label, response, effect}] for choice scenes
     * @param {object} [sceneData.dialogue] - for dialogue type: [{character, emotion, speaker, text}]
     * @param {boolean} [sceneData.autoAdvance] - auto-advance after text completes
     * @param {number} [sceneData.autoAdvanceDelay] - ms to wait after text (default 3000)
     * @returns {Promise<{choice?: number, choiceLabel?: string}>}
     */
    showScene(sceneData) {
      var self = this;
      injectStyles();

      return new Promise(function (resolve) {
        self._currentResolve = resolve;

        // Set music mood if available
        if (sceneData.mood && root.MJ.Music) {
          var moodMap = {
            excited: 'victory', triumphant: 'victory', celebratory: 'victory',
            ecstatic: 'victory', grateful: 'victory',
            tense: 'tense', dramatic: 'tense', angry: 'tense',
            frustrated: 'tense', worried: 'tense',
            calm: 'calm', peaceful: 'calm', serene: 'calm',
            nostalgic: 'contemplative', philosophical: 'contemplative',
            contemplative: 'contemplative', sad: 'contemplative'
          };
          var musicMood = moodMap[sceneData.mood];
          if (musicMood) {
            try {
              var musicSystem = root.MJ.Music.create ? root.MJ.Music.create() : null;
              if (musicSystem && musicSystem.setMood) musicSystem.setMood(musicMood);
            } catch (e) { /* music not initialized */ }
          }
        }

        // Route to scene type handler
        var type = sceneData.type || 'narrative';
        if (type === 'dialogue') {
          self._showDialogueScene(sceneData, resolve);
        } else if (type === 'choice') {
          self._showChoiceScene(sceneData, resolve);
        } else if (type === 'celebration') {
          self._showCelebrationScene(sceneData, resolve);
        } else {
          self._showNarrativeScene(sceneData, resolve);
        }
      });
    }

    /**
     * Play CSS confetti particle effect for celebrations.
     * @param {number} [count=40] - number of particles
     */
    playConfetti(count) {
      count = count || 40;
      var colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#ff9ff3', '#54a0ff'];

      for (var i = 0; i < count; i++) {
        var particle = document.createElement('div');
        particle.className = 'mj-confetti-particle';
        particle.style.left = (Math.random() * 100) + 'vw';
        particle.style.top = '-20px';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.width = (4 + Math.random() * 8) + 'px';
        particle.style.height = (4 + Math.random() * 8) + 'px';
        particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        particle.style.animation = 'mj-confetti-fall ' + (2 + Math.random() * 3) + 's ease-out ' + (Math.random() * 1.5) + 's forwards';

        document.body.appendChild(particle);

        // Clean up particle after animation
        (function (el) {
          setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
          }, 6000);
        })(particle);
      }
    }

    /**
     * Typewriter effect: reveal text letter-by-letter.
     * @param {HTMLElement} element - target element
     * @param {string} text - text to reveal
     * @param {number} [speed=35] - ms per character
     * @returns {Promise<void>} resolves when complete
     */
    typewriterEffect(element, text, speed) {
      var self = this;
      speed = speed || 35;

      return new Promise(function (resolve) {
        element.textContent = '';
        var cursor = document.createElement('span');
        cursor.className = 'cursor';
        element.appendChild(cursor);

        var idx = 0;
        var textNode = document.createTextNode('');
        element.insertBefore(textNode, cursor);

        function tick() {
          if (idx < text.length) {
            textNode.textContent += text.charAt(idx);
            idx++;
            self._typewriterTimer = setTimeout(tick, speed);
          } else {
            // Remove cursor after a brief pause
            setTimeout(function () {
              if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
              resolve();
            }, 500);
          }
        }

        self._typewriterTimer = setTimeout(tick, speed);
      });
    }

    /**
     * Check if a scene is currently active.
     * @returns {boolean}
     */
    isActive() {
      return this._isActive;
    }

    /**
     * Force-close the current scene.
     */
    close() {
      this._cleanup();
      if (this._currentResolve) {
        this._currentResolve({});
        this._currentResolve = null;
      }
    }

    // ── Private: scene type renderers ──

    _showNarrativeScene(sceneData, resolve) {
      var self = this;
      var overlay = this._createOverlay(sceneData.mood);
      var container = this._createContainer(sceneData.mood);

      // Portrait
      if (sceneData.character) {
        var portraitWrap = document.createElement('div');
        portraitWrap.className = 'mj-scene-portrait';
        var portrait = this._renderPortrait(sceneData.character, sceneData.emotion || 'neutral', 120);
        if (portrait) portraitWrap.appendChild(portrait);
        container.appendChild(portraitWrap);
      }

      // Content area
      var content = document.createElement('div');
      content.className = 'mj-scene-content';

      if (sceneData.speaker) {
        var speaker = document.createElement('div');
        speaker.className = 'mj-scene-speaker';
        speaker.textContent = sceneData.speaker;
        content.appendChild(speaker);
      }

      var textEl = document.createElement('div');
      textEl.className = 'mj-scene-text';
      content.appendChild(textEl);

      // Continue button
      var continueBtn = document.createElement('button');
      continueBtn.className = 'mj-scene-continue';
      continueBtn.textContent = 'Continue \u25B6';
      content.appendChild(continueBtn);

      container.appendChild(content);
      overlay.appendChild(container);

      this._show(overlay);

      // Handle text (single string or array of strings)
      var textLines = Array.isArray(sceneData.text) ? sceneData.text : [sceneData.text];
      var lineIdx = 0;

      function showNextLine() {
        if (lineIdx >= textLines.length) {
          self._cleanup();
          resolve({});
          return;
        }

        continueBtn.classList.remove('visible');
        self.typewriterEffect(textEl, textLines[lineIdx], 35).then(function () {
          lineIdx++;
          if (lineIdx >= textLines.length) {
            // Last line
            if (sceneData.autoAdvance) {
              self._autoAdvanceTimer = setTimeout(function () {
                self._cleanup();
                resolve({});
              }, sceneData.autoAdvanceDelay || 3000);
            } else {
              continueBtn.textContent = 'Close \u2715';
              continueBtn.classList.add('visible');
            }
          } else {
            continueBtn.classList.add('visible');
          }
        });
      }

      continueBtn.addEventListener('click', function () {
        if (self._autoAdvanceTimer) {
          clearTimeout(self._autoAdvanceTimer);
          self._autoAdvanceTimer = null;
        }
        showNextLine();
      });

      // Also allow clicking overlay background to skip to next
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          if (self._typewriterTimer) {
            // Skip typewriter, show full text immediately
            clearTimeout(self._typewriterTimer);
            self._typewriterTimer = null;
            textEl.textContent = textLines[lineIdx - 1] || textLines[lineIdx] || '';
            continueBtn.classList.add('visible');
          }
        }
      });

      showNextLine();
    }

    _showDialogueScene(sceneData, resolve) {
      var self = this;
      var exchanges = sceneData.dialogue || [];
      if (exchanges.length === 0) {
        resolve({});
        return;
      }

      var overlay = this._createOverlay(sceneData.mood);
      var container = this._createContainer(sceneData.mood);
      container.style.flexDirection = 'column';
      container.style.padding = '24px';

      // Dialogue area with two portrait slots
      var dialogueArea = document.createElement('div');
      dialogueArea.style.cssText = 'display:flex; align-items:center; width:100%; min-height:200px;';

      var leftPortrait = document.createElement('div');
      leftPortrait.className = 'mj-scene-portrait';
      dialogueArea.appendChild(leftPortrait);

      var centerContent = document.createElement('div');
      centerContent.className = 'mj-scene-content';
      centerContent.style.textAlign = 'center';

      var speakerEl = document.createElement('div');
      speakerEl.className = 'mj-scene-speaker';
      centerContent.appendChild(speakerEl);

      var textEl = document.createElement('div');
      textEl.className = 'mj-scene-text';
      centerContent.appendChild(textEl);

      dialogueArea.appendChild(centerContent);

      var rightPortrait = document.createElement('div');
      rightPortrait.className = 'mj-scene-portrait-right';
      dialogueArea.appendChild(rightPortrait);

      container.appendChild(dialogueArea);

      // Continue button
      var continueBtn = document.createElement('button');
      continueBtn.className = 'mj-scene-continue';
      continueBtn.textContent = 'Continue \u25B6';
      continueBtn.style.alignSelf = 'center';
      container.appendChild(continueBtn);

      overlay.appendChild(container);
      this._show(overlay);

      var exchangeIdx = 0;

      function showNextExchange() {
        if (exchangeIdx >= exchanges.length) {
          self._cleanup();
          resolve({});
          return;
        }

        var exchange = exchanges[exchangeIdx];
        continueBtn.classList.remove('visible');

        // Update portraits
        leftPortrait.innerHTML = '';
        rightPortrait.innerHTML = '';

        var portrait = self._renderPortrait(exchange.character, exchange.emotion || 'neutral', 100);
        if (portrait) {
          // Put active speaker on left, dim the right side
          leftPortrait.appendChild(portrait);
          leftPortrait.style.opacity = '1';
          rightPortrait.style.opacity = '0.3';
        }

        // Show second character if present
        if (exchange.otherCharacter) {
          var otherPortrait = self._renderPortrait(exchange.otherCharacter, 'neutral', 80);
          if (otherPortrait) {
            rightPortrait.appendChild(otherPortrait);
            rightPortrait.style.opacity = '0.5';
          }
        }

        speakerEl.textContent = exchange.speaker || '';

        self.typewriterEffect(textEl, exchange.text, 30).then(function () {
          exchangeIdx++;
          if (exchangeIdx >= exchanges.length) {
            continueBtn.textContent = 'Close \u2715';
          }
          continueBtn.classList.add('visible');
        });
      }

      continueBtn.addEventListener('click', showNextExchange);
      showNextExchange();
    }

    _showChoiceScene(sceneData, resolve) {
      var self = this;
      var overlay = this._createOverlay(sceneData.mood);
      var container = this._createContainer(sceneData.mood);

      // Portrait
      if (sceneData.character) {
        var portraitWrap = document.createElement('div');
        portraitWrap.className = 'mj-scene-portrait';
        var portrait = this._renderPortrait(sceneData.character, sceneData.emotion || 'neutral', 120);
        if (portrait) portraitWrap.appendChild(portrait);
        container.appendChild(portraitWrap);
      }

      // Content
      var content = document.createElement('div');
      content.className = 'mj-scene-content';

      if (sceneData.speaker) {
        var speaker = document.createElement('div');
        speaker.className = 'mj-scene-speaker';
        speaker.textContent = sceneData.speaker;
        content.appendChild(speaker);
      }

      var textEl = document.createElement('div');
      textEl.className = 'mj-scene-text';
      content.appendChild(textEl);

      // Choices container (hidden until text completes)
      var choicesDiv = document.createElement('div');
      choicesDiv.className = 'mj-scene-choices';
      choicesDiv.style.display = 'none';
      content.appendChild(choicesDiv);

      container.appendChild(content);
      overlay.appendChild(container);

      this._show(overlay);

      var promptText = Array.isArray(sceneData.text) ? sceneData.text.join(' ') : (sceneData.text || '');
      var choices = sceneData.choices || [];

      self.typewriterEffect(textEl, promptText, 35).then(function () {
        // Show choices
        choicesDiv.style.display = 'flex';

        for (var i = 0; i < choices.length; i++) {
          (function (index, choice) {
            var btn = document.createElement('button');
            btn.className = 'mj-scene-choice-btn';
            btn.textContent = choice.label;
            btn.addEventListener('click', function () {
              // If choice has a response, show it before closing
              if (choice.response) {
                choicesDiv.style.display = 'none';
                self.typewriterEffect(textEl, choice.response, 30).then(function () {
                  setTimeout(function () {
                    self._cleanup();
                    resolve({
                      choice: index,
                      choiceLabel: choice.label,
                      effect: choice.effect || null,
                      relationshipBonus: choice.relationshipBonus || 0
                    });
                  }, 1500);
                });
              } else {
                self._cleanup();
                resolve({
                  choice: index,
                  choiceLabel: choice.label,
                  effect: choice.effect || null,
                  relationshipBonus: choice.relationshipBonus || 0
                });
              }
            });
            choicesDiv.appendChild(btn);
          })(i, choices[i]);
        }
      });
    }

    _showCelebrationScene(sceneData, resolve) {
      var self = this;
      var overlay = this._createOverlay('celebratory');
      var container = this._createContainer('celebratory');

      // Portrait
      if (sceneData.character) {
        var portraitWrap = document.createElement('div');
        portraitWrap.className = 'mj-scene-portrait';
        var portrait = this._renderPortrait(sceneData.character, sceneData.emotion || 'excited', 120);
        if (portrait) portraitWrap.appendChild(portrait);
        container.appendChild(portraitWrap);
      }

      // Content
      var content = document.createElement('div');
      content.className = 'mj-scene-content';

      if (sceneData.speaker) {
        var speaker = document.createElement('div');
        speaker.className = 'mj-scene-speaker';
        speaker.textContent = '\u2728 ' + sceneData.speaker + ' \u2728';
        content.appendChild(speaker);
      }

      var textEl = document.createElement('div');
      textEl.className = 'mj-scene-text';
      content.appendChild(textEl);

      var continueBtn = document.createElement('button');
      continueBtn.className = 'mj-scene-continue';
      continueBtn.textContent = 'Celebrate! \u2728';
      content.appendChild(continueBtn);

      container.appendChild(content);
      overlay.appendChild(container);

      this._show(overlay);

      // Launch confetti
      self.playConfetti(50);

      var celebText = Array.isArray(sceneData.text) ? sceneData.text.join(' ') : (sceneData.text || 'Congratulations!');

      self.typewriterEffect(textEl, celebText, 25).then(function () {
        continueBtn.classList.add('visible');
        // Second wave of confetti
        self.playConfetti(30);
      });

      continueBtn.addEventListener('click', function () {
        self._cleanup();
        resolve({});
      });

      // Auto-close after 10 seconds
      self._autoAdvanceTimer = setTimeout(function () {
        if (self._isActive) {
          self._cleanup();
          resolve({});
        }
      }, 10000);
    }

    // ── Private: DOM helpers ──

    _createOverlay(mood) {
      var overlay = document.createElement('div');
      overlay.className = 'mj-scene-overlay';
      return overlay;
    }

    _createContainer(mood) {
      var container = document.createElement('div');
      container.className = 'mj-scene-container';

      var bgKey = MOOD_TO_BACKGROUND[mood] || 'peaceful';
      container.style.background = SCENE_BACKGROUNDS[bgKey] || SCENE_BACKGROUNDS.peaceful;

      return container;
    }

    _renderPortrait(characterId, emotion, size) {
      if (!this._portraitRenderer) {
        if (root.MJ.Portraits && root.MJ.Portraits.create) {
          this._portraitRenderer = root.MJ.Portraits.create();
        }
      }
      if (this._portraitRenderer) {
        return this._portraitRenderer.render(characterId, emotion, size || 120);
      }
      // Fallback: text placeholder
      var Personality = root.MJ.Personality;
      if (Personality && Personality.CHARACTERS && Personality.CHARACTERS[characterId]) {
        var placeholder = document.createElement('div');
        placeholder.style.cssText = 'width:' + (size || 120) + 'px;height:' + (size || 120) + 'px;' +
          'border-radius:50%;background:rgba(255,255,255,0.1);display:flex;' +
          'align-items:center;justify-content:center;font-size:48px;';
        placeholder.textContent = Personality.CHARACTERS[characterId].avatar;
        return placeholder;
      }
      return null;
    }

    _show(overlay) {
      this._isActive = true;
      this._overlay = overlay;
      document.body.appendChild(overlay);
      // Trigger CSS transition
      requestAnimationFrame(function () {
        overlay.classList.add('active');
      });
    }

    _cleanup() {
      this._isActive = false;

      if (this._typewriterTimer) {
        clearTimeout(this._typewriterTimer);
        this._typewriterTimer = null;
      }
      if (this._autoAdvanceTimer) {
        clearTimeout(this._autoAdvanceTimer);
        this._autoAdvanceTimer = null;
      }
      if (this._overlay) {
        var overlay = this._overlay;
        overlay.classList.remove('active');
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 500);
        this._overlay = null;
      }
    }
  }

  // ── Public API ──

  root.MJ.StoryScenes = Object.freeze({
    StoryScene: StoryScene,
    SCENE_BACKGROUNDS: SCENE_BACKGROUNDS,
    MOOD_TO_BACKGROUND: MOOD_TO_BACKGROUND,
    create: function () {
      return new StoryScene();
    }
  });

})(typeof window !== 'undefined' ? window : global);
