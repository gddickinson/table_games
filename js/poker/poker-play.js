/**
 * poker-play.js — Playable poker game loop.
 * Connects PokerEngine + PokerAIv2 + PokerLearningSystem + Renderer + Personalities.
 * Creates a full-screen overlay where the human plays Texas Hold'em against AI characters.
 * Exports under root.MJ.Poker.Play
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Poker = root.MJ.Poker || {};

  // Lazy accessors for sibling modules (loaded order may vary)
  var Engine  = function() { return root.MJ.Poker.Engine; };
  var AIv2    = function() { return root.MJ.Poker.AIv2; };
  var Learning = function() { return root.MJ.Poker.Learning; };
  var Cards   = function() { return root.MJ.Poker.Cards; };
  var HE      = function() { return root.MJ.Poker.HandEval; };
  var TutorBridge = function() { return root.MJ.GameTutorBridge; };
  var PokerTutor = function() { return root.MJ.Poker && root.MJ.Poker.Tutor; };

  // === Poker dialogue lines by personality and situation ===
  var DIALOGUE = {
    mei: {
      fold: ['I will pass on this one.', 'Not my hand.', 'I fold... for now.'],
      raise: ['I believe in my cards.', 'Let me raise.', 'I have a good feeling.'],
      call: ['I will stay in.', 'That seems fair.', 'Call.'],
      check: ['Check.', 'I will wait and see.'],
      win: ['Thank you for the game!', 'A fortunate hand.', 'I am grateful.'],
      lose: ['Well played.', 'Next time, perhaps.', 'You earned that.'],
      bluff: ['...', 'Hmm, interesting.', 'I wonder...'],
      bigPot: ['This is getting exciting!', 'High stakes indeed.']
    },
    kenji: {
      fold: ['Tch. Fine.', 'Whatever.', 'Not worth it.'],
      raise: ['Let\'s go! Raising!', 'You scared?', 'Put up or shut up!'],
      call: ['I\'ll call that.', 'Alright, let\'s see.', 'I\'m in.'],
      check: ['Check.', 'Your move.'],
      win: ['Ha! Too easy!', 'Read \'em and weep!', 'That\'s how it\'s done!'],
      lose: ['Lucky...', 'No way!', 'Next hand is mine.'],
      bluff: ['You don\'t have it.', 'I can see right through you.'],
      bigPot: ['Now we\'re talking!', 'This is what I live for!']
    },
    yuki: {
      fold: ['Folding here.', 'I\'ll sit this out.', 'Not the right spot.'],
      raise: ['Raising.', 'I think I have the edge.', 'Let me apply some pressure.'],
      call: ['Calling.', 'I\'ll see it.', 'Reasonable price.'],
      check: ['Check.', 'Passing to you.'],
      win: ['Nice!', 'That worked out well.', 'Good result.'],
      lose: ['Hmm, well played.', 'Interesting line.', 'I see.'],
      bluff: ['Something feels off...', 'Hmm.'],
      bigPot: ['Big pot forming.', 'Stakes are rising.']
    }
  };

  function randomLine(personality, situation) {
    var lines = DIALOGUE[personality] && DIALOGUE[personality][situation];
    if (!lines || lines.length === 0) return null;
    return lines[Math.floor(Math.random() * lines.length)];
  }

  // === Card display helpers ===
  var SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
  var SUIT_COLORS  = { hearts: '#e74c3c', diamonds: '#3498db', clubs: '#2ecc71', spades: '#ecf0f1' };

  function cardHTML(card, faceDown) {
    if (!card) return '<span class="poker-card empty"></span>';
    if (faceDown) {
      return '<span class="poker-card facedown" style="display:inline-block;width:48px;height:68px;' +
        'background:linear-gradient(135deg,#1a237e,#283593);border:2px solid #5c6bc0;border-radius:6px;' +
        'margin:2px;text-align:center;line-height:68px;color:#7986cb;font-size:20px;">\u2605</span>';
    }
    var suit = SUIT_SYMBOLS[card.suit] || '?';
    var color = SUIT_COLORS[card.suit] || '#fff';
    var rank = card.rank === '10' ? '10' : (card.rank || '?');
    return '<span class="poker-card" style="display:inline-block;width:48px;height:68px;' +
      'background:linear-gradient(135deg,#f5f5f0,#e0ddd5);border:2px solid #999;border-radius:6px;' +
      'margin:2px;text-align:center;padding-top:4px;box-sizing:border-box;line-height:1.2;">' +
      '<span style="display:block;font-size:16px;font-weight:bold;color:#222;">' + rank + '</span>' +
      '<span style="display:block;font-size:22px;color:' + color + ';">' + suit + '</span></span>';
  }

  // === PokerGameManager ===
  class PokerGameManager {
    constructor() {
      this.engine = null;
      this.ai = null;
      this.learning = null;
      this.sharedSystems = null;
      this.overlay = null;
      this.running = false;
      this.handCount = 0;
      this.playerChips = 1000;
      this._boundHandleKey = null;
      this._handResult = null;
      this._nextHandTimer = null;
      this._dealerIndex = 0;
      this._showdownInProgress = false;
      this._lastPhase = null;
    }

    /**
     * Play a sound effect through the shared sound system.
     */
    playSound(name) {
      try { if (this.sharedSystems && this.sharedSystems.sound) this.sharedSystems.sound.play(name); } catch(e) {}
    }

    /**
     * Promise-based sleep for async sequences.
     */
    sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

    /**
     * Initialize with shared systems from the main game.
     * @param {Object} sharedSystems - {personalities, economy, worldManager, conversation, sound}
     */
    init(sharedSystems) {
      this.sharedSystems = sharedSystems || {};

      var ai = AIv2();
      var learn = Learning();

      if (ai && ai.PokerAIv2) {
        this.ai = new ai.PokerAIv2();
      }
      if (learn && learn.PokerLearningSystem) {
        this.learning = new learn.PokerLearningSystem();
      }

      // Initialize tutor bridge for LLM-powered tutoring and dialogue
      var TB = TutorBridge();
      if (TB && TB.GameTutorBridge && sharedSystems.ollamaClient) {
        this._tutorBridge = new TB.GameTutorBridge(sharedSystems.ollamaClient);
      }

      // Initialize poker-specific tutor for offline fallback
      var PT = PokerTutor();
      if (PT && PT.PokerTutor) {
        this._pokerTutor = new PT.PokerTutor();
      }
    }

    /**
     * Start the poker game: create overlay, initialize engine, deal first hand.
     */
    start() {
      if (this.running) return;
      this.running = true;
      this.handCount = 0;

      // Initialize engine
      var eng = Engine();
      if (eng && eng.PokerEngine) {
        this.engine = new eng.PokerEngine();
        this.engine.init(null, {
          buyIn: this.playerChips,
          smallBlind: 5,
          bigBlind: 10,
          playerCount: 4
        });

        var self = this;
        this.engine.onStateChange(function(state) {
          self._renderState(state);
        });
        this.engine.onActionNeeded(function(validActions) {
          self._showControls(validActions);
        });
        this.engine.onRoundEnd(function(results) {
          self._onHandEnd(results);
        });
      }

      this.createOverlay();
      this.startNewHand();
    }

    /**
     * Stop the poker game, run final learning update, and remove overlay.
     */
    stop() {
      this.running = false;

      // Cancel any pending next-hand timer
      if (this._nextHandTimer) {
        clearTimeout(this._nextHandTimer);
        this._nextHandTimer = null;
      }

      // Final learning update
      if (this.learning) {
        var result = this.learning.updateWeights();
        if (result) {
          console.log('[Poker] Final learning update:', result);
        }
      }

      // Clean up
      if (this._boundHandleKey) {
        document.removeEventListener('keydown', this._boundHandleKey);
        this._boundHandleKey = null;
      }
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
    }

    /**
     * Create full-screen poker overlay on top of the Mahjong game.
     */
    createOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.id = 'poker-game';
      this.overlay.style.cssText = 'position:fixed;inset:0;background:#1a3a20;z-index:500;' +
        'display:flex;flex-direction:column;font-family:"Segoe UI",Arial,sans-serif;';

      // Top bar
      var topBar = document.createElement('div');
      topBar.style.cssText = 'padding:8px 16px;background:rgba(0,0,0,0.3);display:flex;' +
        'justify-content:space-between;align-items:center;flex-shrink:0;';
      topBar.innerHTML =
        '<span style="color:#e8b830;font-weight:bold;font-size:16px;">Texas Hold\'em</span>' +
        '<div>' +
          '<span id="poker-hand-count" style="color:#aaa;font-size:13px;margin-right:16px;">Hand #0</span>' +
          '<span id="poker-chips" style="color:#4ade80;font-size:13px;margin-right:16px;">Chips: 1000</span>' +
          '<span id="poker-epoch" style="color:#8888cc;font-size:12px;margin-right:16px;"></span>' +
          '<button id="poker-back" style="padding:4px 12px;background:rgba(255,255,255,0.1);' +
            'border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#e0e0e0;cursor:pointer;' +
            'font-size:13px;">Back to Mahjong</button>' +
        '</div>';
      this.overlay.appendChild(topBar);

      // Game area
      var gameArea = document.createElement('div');
      gameArea.id = 'poker-game-area';
      gameArea.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;' +
        'justify-content:center;overflow:hidden;position:relative;';
      this.overlay.appendChild(gameArea);

      // Controls area
      var controlsArea = document.createElement('div');
      controlsArea.id = 'poker-controls';
      controlsArea.style.cssText = 'padding:12px 16px;background:rgba(0,0,0,0.4);flex-shrink:0;' +
        'display:flex;justify-content:center;align-items:center;gap:12px;min-height:56px;';
      this.overlay.appendChild(controlsArea);

      // Chat panel
      var chatPanel = document.createElement('div');
      chatPanel.id = 'poker-chat';
      chatPanel.style.cssText = 'position:fixed;bottom:60px;left:0;width:260px;max-height:180px;' +
        'background:rgba(0,0,0,0.8);border-right:1px solid rgba(255,255,255,0.1);' +
        'border-top:1px solid rgba(255,255,255,0.1);z-index:501;overflow-y:auto;padding:8px;' +
        'font-size:12px;border-top-right-radius:8px;';
      this.overlay.appendChild(chatPanel);

      // Tutor chat input area
      var tutorArea = document.createElement('div');
      tutorArea.id = 'poker-tutor-input';
      tutorArea.style.cssText = 'position:fixed;bottom:0;left:0;width:260px;z-index:502;' +
        'background:rgba(0,0,0,0.9);border-right:1px solid rgba(255,255,255,0.1);' +
        'padding:6px 8px;display:flex;gap:4px;';
      tutorArea.innerHTML =
        '<input id="poker-ask-input" type="text" placeholder="Ask the tutor..." ' +
        'style="flex:1;padding:5px 8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);' +
        'border-radius:4px;color:#e0e0e0;font-size:12px;outline:none;" />' +
        '<button id="poker-ask-btn" style="padding:5px 10px;background:#e8b830;border:none;border-radius:4px;' +
        'color:#1a1a1a;font-weight:bold;font-size:11px;cursor:pointer;">Ask</button>';
      this.overlay.appendChild(tutorArea);

      document.body.appendChild(this.overlay);

      var self = this;
      document.getElementById('poker-back').addEventListener('click', function() {
        self.stop();
      });

      // Wire up tutor chat
      var askInput = document.getElementById('poker-ask-input');
      var askBtn = document.getElementById('poker-ask-btn');
      if (askInput && askBtn) {
        var handleAsk = function() {
          var q = askInput.value.trim();
          if (!q) return;
          askInput.value = '';
          self.addPokerChat('You', q);
          self._handleTutorQuestion(q);
        };
        askBtn.addEventListener('click', handleAsk);
        askInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { e.preventDefault(); handleAsk(); }
        });
      }

      // Keyboard shortcuts
      this._boundHandleKey = function(e) { self._handleKeyboard(e); };
      document.addEventListener('keydown', this._boundHandleKey);
    }

    /**
     * Start a new hand of poker.
     */
    startNewHand() {
      if (!this.running) return;
      this.handCount++;
      this._handResult = null;
      this._nextHandTimer = null;

      // Rotate dealer button each hand
      if (this.engine && this.engine.players) {
        var numPlayers = this.engine.players.length;
        this._dealerIndex = (this._dealerIndex) % numPlayers;
        for (var d = 0; d < numPlayers; d++) {
          this.engine.players[d].isDealer = (d === this._dealerIndex);
        }
        this._dealerIndex = (this._dealerIndex + 1) % numPlayers;
      }

      // Reset hand-level state on the engine (bets, folded, new deck) while keeping chip totals
      if (this.engine && typeof this.engine.resetHand === 'function') {
        this.engine.resetHand();
      }

      if (this.ai) {
        this.ai.startNewHand();
      }

      // Clear controls area for new hand
      var controlsArea = document.getElementById('poker-controls');
      if (controlsArea) controlsArea.innerHTML = '';

      // Wire up AI v2 for the engine's AI decisions
      var self = this;
      if (this.engine) {
        // Override AI act to use our AIv2
        this.engine._aiAct = function(playerIndex) {
          var p = self.engine.players[playerIndex];
          var state = self.engine.getState();
          var action;

          if (self.ai) {
            action = self.ai.decideAction(p, state, p.personality);
            // Record AI action for opponent modeling
            self.ai.recordAction(p.id, action.type, state.phase);
            // Trigger dialogue and sound
            self._triggerDialogue(p, action, state);
            if (action.type === 'fold') self.playSound('CLICK');
            else if (action.type === 'allin') self.playSound('KONG');
            else if (action.type === 'raise') self.playSound('PLACE');
            else if (action.type === 'call' || action.type === 'check') self.playSound('PLACE');
          } else {
            // Fallback
            var callAmt = self.engine.currentBet - p.bet;
            if (callAmt <= 0) action = { type: 'check' };
            else if (callAmt <= p.chips * 0.1) action = { type: 'call' };
            else action = { type: 'fold' };
          }

          self.engine.handlePlayerAction(action);
        };

        this.engine.start();
        this.playSound('DRAW');
      }

      this._lastPhase = 'pre_flop';
      this._updateTopBar();
    }

    /**
     * Render the current game state to the overlay.
     */
    _renderState(state) {
      var area = document.getElementById('poker-game-area');
      if (!area) return;

      var html = '';

      // Phase banner
      var phaseNames = {
        pre_flop: 'Pre-Flop', flop: 'Flop', turn: 'Turn',
        river: 'River', showdown: 'Showdown', hand_over: 'Hand Over'
      };
      var phaseName = phaseNames[state.phase] || state.phase;

      // Play sound when community cards are revealed (phase transitions)
      if (this._lastPhase && this._lastPhase !== state.phase) {
        if (state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') {
          this.playSound('DISCARD');
        }
        this._lastPhase = state.phase;
      }

      html += '<div style="color:#e8b830;font-size:14px;margin-bottom:8px;letter-spacing:1px;">' +
        phaseName.toUpperCase() + '</div>';

      // Opponent seats (top row)
      html += '<div style="display:flex;gap:24px;margin-bottom:16px;">';
      for (var i = 1; i < state.players.length; i++) {
        var p = state.players[i];
        var isActive = (state.currentPlayerIndex === i && !p.folded);
        var borderColor = p.folded ? '#555' : (isActive ? '#e8b830' : '#4a7c59');
        var opacity = p.folded ? '0.5' : '1';

        html += '<div data-player-id="' + p.id + '" style="text-align:center;opacity:' + opacity + ';border:2px solid ' +
          borderColor + ';border-radius:10px;padding:10px 14px;background:rgba(0,0,0,0.3);' +
          'min-width:110px;">';
        html += '<div style="color:#ccc;font-weight:bold;font-size:13px;">' + p.name;
        if (p.isDealer) html += ' <span style="color:#e8b830;">(D)</span>';
        html += '</div>';
        html += '<div style="color:#4ade80;font-size:12px;">' + p.chips + ' chips</div>';

        // Show cards face-down during play; at showdown, start face-down for dramatic reveal
        var showCards = (state.phase === 'hand_over') && !p.folded;
        html += '<div class="poker-card-container" style="margin:4px 0;">';
        if (p.cards && p.cards.length > 0) {
          var cardDelay0 = (i * 2) * 100;
          var cardDelay1 = (i * 2 + 1) * 100;
          html += '<span style="display:inline-block;animation:dealIn 0.3s ease-out backwards;animation-delay:' + cardDelay0 + 'ms;">' + cardHTML(p.cards[0], !showCards) + '</span>';
          html += '<span style="display:inline-block;animation:dealIn 0.3s ease-out backwards;animation-delay:' + cardDelay1 + 'ms;">' + cardHTML(p.cards[1], !showCards) + '</span>';
        }
        html += '</div>';

        if (p.lastAction) {
          html += '<div style="color:#aaa;font-size:11px;margin-top:2px;">' + p.lastAction + '</div>';
        }
        if (p.bet > 0) {
          html += '<div style="color:#f0c040;font-size:11px;">Bet: ' + p.bet + '</div>';
        }
        html += '</div>';
      }
      html += '</div>';

      // Community cards
      html += '<div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:12px 20px;' +
        'margin-bottom:12px;text-align:center;">';
      html += '<div style="color:#aaa;font-size:11px;margin-bottom:4px;">Community Cards</div>';
      html += '<div>';
      for (var c = 0; c < 5; c++) {
        if (c < state.communityCards.length) {
          html += '<span style="display:inline-block;animation:flipReveal 0.4s ease-out backwards;animation-delay:' + (c * 150) + 'ms;">' + cardHTML(state.communityCards[c], false) + '</span>';
        } else {
          html += '<span style="display:inline-block;width:48px;height:68px;background:rgba(255,255,255,0.05);' +
            'border:2px dashed rgba(255,255,255,0.15);border-radius:6px;margin:2px;"></span>';
        }
      }
      html += '</div>';
      html += '<div style="color:#e8b830;font-size:16px;font-weight:bold;margin-top:6px;">Pot: ' +
        state.pot + '</div>';
      html += '</div>';

      // Human player (seat 0)
      var human = state.players[0];
      if (human) {
        var humanActive = (state.currentPlayerIndex === 0 && !human.folded);
        var humanBorder = human.folded ? '#555' : (humanActive ? '#e8b830' : '#4a7c59');
        html += '<div style="text-align:center;border:2px solid ' + humanBorder +
          ';border-radius:10px;padding:10px 20px;background:rgba(0,0,0,0.3);">';
        html += '<div style="color:#fff;font-weight:bold;font-size:14px;">You';
        if (human.isDealer) html += ' <span style="color:#e8b830;">(D)</span>';
        html += '</div>';
        html += '<div style="color:#4ade80;font-size:13px;">' + human.chips + ' chips</div>';
        html += '<div style="margin:6px 0;">';
        if (human.cards && human.cards.length > 0) {
          html += '<span style="display:inline-block;animation:dealIn 0.3s ease-out backwards;animation-delay:0ms;">' + cardHTML(human.cards[0], false) + '</span>';
          html += '<span style="display:inline-block;animation:dealIn 0.3s ease-out backwards;animation-delay:100ms;">' + cardHTML(human.cards[1], false) + '</span>';
        }
        html += '</div>';
        if (human.lastAction) {
          html += '<div style="color:#aaa;font-size:12px;">' + human.lastAction + '</div>';
        }
        if (human.bet > 0) {
          html += '<div style="color:#f0c040;font-size:12px;">Bet: ' + human.bet + '</div>';
        }
        html += '</div>';
      }

      area.innerHTML = html;

      // Trigger dramatic showdown reveal when entering showdown phase
      if (state.phase === 'showdown' && !this._showdownInProgress) {
        this.showShowdown(state);
      }
    }

    /**
     * Show action buttons for the human player.
     */
    _showControls(validActions) {
      var controlsArea = document.getElementById('poker-controls');
      if (!controlsArea) return;

      var actions = validActions.actions;
      var callAmt = validActions.callAmount;
      var minRaise = validActions.minRaise;
      var maxRaise = validActions.maxRaise;
      var pot = validActions.pot;

      var html = '';

      // Fold button
      if (actions.indexOf('fold') !== -1) {
        html += '<button class="poker-btn" data-action="fold" style="' + this._btnStyle('#c0392b') +
          '">Fold <span style="font-size:10px;opacity:0.7;">(F)</span></button>';
      }

      // Check button
      if (actions.indexOf('check') !== -1) {
        html += '<button class="poker-btn" data-action="check" style="' + this._btnStyle('#27ae60') +
          '">Check <span style="font-size:10px;opacity:0.7;">(C)</span></button>';
      }

      // Call button
      if (actions.indexOf('call') !== -1) {
        html += '<button class="poker-btn" data-action="call" style="' + this._btnStyle('#2980b9') +
          '">Call ' + callAmt + ' <span style="font-size:10px;opacity:0.7;">(C)</span></button>';
      }

      // Raise controls
      if (actions.indexOf('raise') !== -1) {
        // Preset raise amounts
        var halfPot = Math.max(minRaise, Math.floor(pot * 0.5));
        var fullPot = Math.max(minRaise, pot);
        var twoPot = Math.min(maxRaise, pot * 2);

        html += '<div style="display:flex;gap:6px;align-items:center;">';
        html += '<button class="poker-btn" data-action="raise" data-amount="' + minRaise +
          '" style="' + this._btnStyle('#8e44ad') + '">Min Raise ' + minRaise + '</button>';
        if (halfPot > minRaise && halfPot < maxRaise) {
          html += '<button class="poker-btn" data-action="raise" data-amount="' + halfPot +
            '" style="' + this._btnStyle('#8e44ad') + '">1/2 Pot</button>';
        }
        if (fullPot > minRaise && fullPot < maxRaise) {
          html += '<button class="poker-btn" data-action="raise" data-amount="' + fullPot +
            '" style="' + this._btnStyle('#8e44ad') + '">Pot</button>';
        }
        html += '<button class="poker-btn" data-action="raise" data-amount="' + maxRaise +
          '" style="' + this._btnStyle('#8e44ad') + '">2x Pot</button>';
        html += '</div>';
      }

      // All-in button
      if (actions.indexOf('allin') !== -1) {
        html += '<button class="poker-btn" data-action="allin" style="' + this._btnStyle('#d35400') +
          '">All-In <span style="font-size:10px;opacity:0.7;">(A)</span></button>';
      }

      controlsArea.innerHTML = html;

      // Wire up button clicks
      var self = this;
      var buttons = controlsArea.querySelectorAll('.poker-btn');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function() {
          var action = this.getAttribute('data-action');
          var amount = this.getAttribute('data-amount');
          self._handleHumanAction(action, amount ? parseInt(amount, 10) : undefined);
        });
      }
    }

    /**
     * Handle a human player action.
     */
    _handleHumanAction(actionType, amount) {
      if (!this.engine || !this.engine._waitingForHuman) return;

      var action = { type: actionType };
      if (amount !== undefined) action.amount = amount;

      // Play sound for human action
      if (actionType === 'fold') {
        this.playSound('CLICK');
      } else if (actionType === 'raise') {
        this.playSound('PLACE');
      } else if (actionType === 'allin') {
        this.playSound('KONG');
      } else if (actionType === 'call' || actionType === 'check') {
        this.playSound('PLACE');
      }

      // Record to AI opponent model (player 0 = human)
      if (this.ai) {
        var state = this.engine.getState();
        this.ai.recordAction(0, actionType, state.phase);
      }

      // Clear controls
      var controlsArea = document.getElementById('poker-controls');
      if (controlsArea) controlsArea.innerHTML = '';

      this.engine.handlePlayerAction(action);
    }

    /**
     * Handle keyboard shortcuts for actions.
     */
    _handleKeyboard(e) {
      if (!this.running || !this.engine || !this.engine._waitingForHuman) return;

      var key = e.key.toLowerCase();
      if (key === 'f') {
        this._handleHumanAction('fold');
      } else if (key === 'c') {
        // Check if possible, otherwise call
        var state = this.engine.getState();
        var va = state.validActions;
        if (va && va.actions.indexOf('check') !== -1) {
          this._handleHumanAction('check');
        } else if (va && va.actions.indexOf('call') !== -1) {
          this._handleHumanAction('call');
        }
      } else if (key === 'a') {
        this._handleHumanAction('allin');
      }
    }

    /**
     * Called when a hand ends. Record results and start next hand.
     */
    _onHandEnd(results) {
      var self = this;

      // Determine if human won
      var humanWon = false;
      var humanProfit = 0;
      if (results.winners) {
        for (var i = 0; i < results.winners.length; i++) {
          if (results.winners[i].player && results.winners[i].player.isHuman) {
            humanWon = true;
            humanProfit = results.winners[i].amount;
          }
        }
      }

      // Calculate human's net profit (winnings minus what they put in)
      var humanPlayer = this.engine ? this.engine.players[0] : null;
      var invested = humanPlayer ? humanPlayer.totalBetThisHand : 0;
      var netProfit = humanWon ? (humanProfit - invested) : -invested;
      var wentToShowdown = results.showdownHands && results.showdownHands.length > 0;

      // Record to learning system
      if (this.learning) {
        this.learning.recordHandResult({
          won: humanWon,
          profit: netProfit,
          bluffAttempted: false, // TODO: track human bluffs
          bluffSucceeded: false,
          wentToShowdown: wentToShowdown,
          showdownWon: humanWon && wentToShowdown,
          handStrength: 0,
          position: 'unknown',
          phase: this.engine ? this.engine.phase : 'hand_over'
        });

        // Persist opponent profiles from AI
        if (this.ai && this.ai.opponentModel) {
          var profiles = this.ai.opponentModel.profiles;
          for (var pid in profiles) {
            if (profiles.hasOwnProperty(pid)) {
              this.learning.saveOpponentProfile(pid, profiles[pid]);
            }
          }
        }

        // Run learning update every 15 hands
        if (this.handCount > 0 && this.handCount % 15 === 0) {
          var update = this.learning.updateWeights();
          if (update) {
            console.log('[Poker] Learning epoch ' + update.epoch + ':', update);
            this.addPokerChat('System', 'AI adapting... (epoch ' + update.epoch + ')');
            this.playSound('ACHIEVEMENT');
          }
        }
      }

      // Update player chips tracking
      if (humanPlayer) {
        this.playerChips = humanPlayer.chips;
      }

      // Play win sound
      this.playSound('WIN');

      // Show result dialogue
      this._showHandResult(results, humanWon);

      // Update top bar with current state
      this._updateTopBar();

      // Show brief result in controls area, then auto-deal next hand
      var controlsArea = document.getElementById('poker-controls');
      if (!controlsArea) return;

      // Check for bust
      if (humanPlayer && humanPlayer.chips <= 0) {
        this._showRebuy();
        return;
      }

      // Show countdown message in controls
      controlsArea.innerHTML =
        '<div style="color:#aaa;font-size:14px;">Next hand in 2s...</div>';

      // Auto-deal next hand after 2.5 seconds
      this._nextHandTimer = setTimeout(function() {
        if (!self.running) return;

        // Learning update every 15 hands
        if (self.handCount % 15 === 0 && self.learning) {
          var result = self.learning.updateWeights();
          self._showAdaptingToast(result);
        }

        self.startNewHand();
      }, 2500);
    }

    /**
     * Show rebuy UI when player is busted.
     */
    _showRebuy() {
      var self = this;
      var controlsArea = document.getElementById('poker-controls');
      if (!controlsArea) return;

      controlsArea.innerHTML =
        '<div style="color:#e74c3c;font-size:16px;font-weight:bold;margin-right:16px;">Busted!</div>' +
        '<button class="poker-btn" id="poker-rebuy" style="' + this._btnStyle('#2980b9') +
        '">Rebuy (1000 chips)</button>' +
        '<button class="poker-btn" id="poker-quit" style="' + this._btnStyle('#c0392b') +
        '">Quit</button>';
      document.getElementById('poker-rebuy').addEventListener('click', function() {
        if (self.engine && self.engine.players[0]) {
          self.engine.players[0].chips = 1000;
          self.playerChips = 1000;
        }
        self._updateTopBar();
        self.startNewHand();
      });
      document.getElementById('poker-quit').addEventListener('click', function() {
        self.stop();
      });
    }

    /**
     * Show a brief "AI adapting..." toast message.
     */
    _showAdaptingToast(result) {
      var epochLabel = (result && result.epoch) ? result.epoch : '?';
      this.addPokerChat('System', 'AI adapting... (epoch ' + epochLabel + ')');

      // Show a visual toast over the game area
      var area = document.getElementById('poker-game-area');
      if (!area) return;
      var toast = document.createElement('div');
      toast.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);' +
        'background:rgba(100,80,200,0.9);color:#fff;padding:8px 20px;border-radius:8px;' +
        'font-size:13px;font-weight:bold;z-index:10;transition:opacity 0.5s;';
      toast.textContent = 'AI adapting... (epoch ' + epochLabel + ')';
      area.appendChild(toast);
      setTimeout(function() {
        toast.style.opacity = '0';
        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 600);
      }, 2000);
    }

    /**
     * Display hand result with winner info and dialogue.
     */
    _showHandResult(results, humanWon) {
      if (!results.winners || results.winners.length === 0) return;

      for (var i = 0; i < results.winners.length; i++) {
        var w = results.winners[i];
        var name = w.player ? w.player.name : 'Unknown';
        var handDesc = w.hand ? w.hand.name : 'other players folded';
        var amt = w.amount || 0;
        this.addPokerChat(name, 'Wins ' + amt + ' with ' + handDesc + '!');
      }

      // Winner/loser dialogue (LLM-powered or scripted)
      var self = this;
      for (var i = 0; i < results.winners.length; i++) {
        var w = results.winners[i];
        if (w.player && w.player.personality) {
          if (this._tutorBridge && this._tutorBridge.isAvailable()) {
            (function(player, amt) {
              self._tutorBridge.generateCharacterLine('poker', player.personality, 'win', 'Won ' + amt + ' chips')
                .then(function(llmLine) {
                  self.addPokerChat(player.name, llmLine || randomLine(player.personality, 'win') || 'Nice!');
                });
            })(w.player, w.amount);
          } else {
            var line = randomLine(w.player.personality, 'win');
            if (line) this.addPokerChat(w.player.name, line);
          }
        }
      }

      // Losers react
      if (this.engine) {
        for (var i = 0; i < this.engine.players.length; i++) {
          var p = this.engine.players[i];
          if (p.personality && !p.folded) {
            var isWinner = results.winners.some(function(w) {
              return w.player && w.player.id === p.id;
            });
            if (!isWinner && Math.random() < 0.4) {
              if (this._tutorBridge && this._tutorBridge.isAvailable()) {
                (function(player) {
                  self._tutorBridge.generateCharacterLine('poker', player.personality, 'lose')
                    .then(function(llmLine) {
                      self.addPokerChat(player.name, llmLine || randomLine(player.personality, 'lose') || 'Hmm.');
                    });
                })(p);
              } else {
                var loseLine = randomLine(p.personality, 'lose');
                if (loseLine) this.addPokerChat(p.name, loseLine);
              }
            }
          }
        }
      }
    }

    /**
     * Handle a tutor question from the chat input.
     */
    async _handleTutorQuestion(question) {
      this.addPokerChat('Tutor', '...');

      var player = this.engine ? this.engine.players[0] : null;
      var state = this.engine ? this.engine.getState() : {};

      // Build game context for LLM
      var gameContext = '';
      if (this._tutorBridge) {
        gameContext = this._tutorBridge.formatPokerContext(player, state);
      }

      // Offline fallback using poker tutor
      var self = this;
      var offlineFallback = function(q) {
        if (self._pokerTutor && player) {
          // Try Q&A first, then general advice
          var answer = self._pokerTutor.answerQuestion(q, player, state);
          if (answer && answer.indexOf('I can help') === -1) return answer;
          return self._pokerTutor.getAdvice(player, state) || 'Ask me about pot odds, hand rankings, bluffing, or opponent tips!';
        }
        return 'Ask me about pot odds, hand rankings, bluffing, position, or opponent strategies!';
      };

      var response;
      if (this._tutorBridge) {
        response = await this._tutorBridge.askTutor('poker', question, gameContext, offlineFallback);
      } else {
        response = offlineFallback(question);
      }

      // Replace the "..." with the actual response
      var chat = document.getElementById('poker-chat');
      if (chat && chat.lastChild) {
        chat.removeChild(chat.lastChild);
      }
      this.addPokerChat('Tutor', response);
    }

    /**
     * Trigger AI dialogue when an AI player acts.
     */
    _triggerDialogue(player, action, state) {
      if (!player.personality) return;

      // Only speak sometimes (30% chance), more on big actions
      var speakChance = 0.2;
      if (action.type === 'raise' || action.type === 'allin') speakChance = 0.5;
      if (action.type === 'fold') speakChance = 0.15;
      if (Math.random() > speakChance) return;

      var situation = action.type;
      if (situation === 'allin') situation = 'raise';

      // Big pot dialogue
      if (state.pot > state.bigBlind * 20 && Math.random() < 0.3) {
        situation = 'bigPot';
      }

      // Try LLM-powered dialogue first
      var self = this;
      if (this._tutorBridge && this._tutorBridge.isAvailable()) {
        var charId = player.personality;
        var context = 'Pot: ' + state.pot + ', Action: ' + action.type +
                      (action.amount ? ' ' + action.amount : '');
        this._tutorBridge.generateCharacterLine('poker', charId, situation, context)
          .then(function(llmLine) {
            if (llmLine) {
              self.addPokerChat(player.name, llmLine);
            } else {
              var line = randomLine(player.personality, situation);
              if (line) self.addPokerChat(player.name, line);
            }
          });
        return;
      }

      // Scripted fallback
      var line = randomLine(player.personality, situation);
      if (line) {
        this.addPokerChat(player.name, line);
      }
    }

    /**
     * Reveal a single player's cards in the UI with flip animation.
     */
    revealPlayerCards(playerId) {
      var area = document.getElementById('poker-game-area');
      if (!area) return;
      var seatEl = area.querySelector('[data-player-id="' + playerId + '"]');
      if (!seatEl) return;
      var cardContainer = seatEl.querySelector('.poker-card-container');
      if (!cardContainer) return;

      // Find this player's actual cards from engine
      var player = null;
      if (this.engine) {
        for (var i = 0; i < this.engine.players.length; i++) {
          if (this.engine.players[i].id === playerId) {
            player = this.engine.players[i];
            break;
          }
        }
      }
      if (!player || !player.cards || player.cards.length < 2) return;

      cardContainer.innerHTML =
        '<span style="display:inline-block;animation:flipReveal 0.4s ease-out backwards;animation-delay:0ms;">' +
        cardHTML(player.cards[0], false) + '</span>' +
        '<span style="display:inline-block;animation:flipReveal 0.4s ease-out backwards;animation-delay:150ms;">' +
        cardHTML(player.cards[1], false) + '</span>';
    }

    /**
     * Dramatic showdown: reveal opponent cards one player at a time.
     */
    async showShowdown(state) {
      if (this._showdownInProgress) return;
      this._showdownInProgress = true;

      var players = state.players;
      var he = HE();

      for (var i = 0; i < players.length; i++) {
        var p = players[i];
        if (p.id === 0 || p.folded) continue; // skip human and folded players

        await this.sleep(800);

        // Reveal this player's cards with animation
        this.revealPlayerCards(p.id);
        this.playSound('DISCARD');

        // Evaluate and announce their hand
        var handName = 'a hand';
        if (he && he.evaluateHand && p.cards && state.communityCards) {
          try {
            var allCards = p.cards.concat(state.communityCards);
            var result = he.evaluateHand(allCards);
            if (result && result.name) handName = result.name;
          } catch(e) {}
        }
        this.addPokerChat(p.name, 'reveals: ' + handName);
      }

      await this.sleep(500);
      this.playSound('WIN');
      this._showdownInProgress = false;
    }

    /**
     * Add a chat message to the poker chat panel.
     */
    addPokerChat(speaker, text) {
      var chat = document.getElementById('poker-chat');
      if (!chat) return;
      var msg = document.createElement('div');
      msg.style.cssText = 'padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:#aaa;';
      msg.innerHTML = '<strong style="color:#e8b830;">' + speaker + ':</strong> ' + text;
      chat.appendChild(msg);
      chat.scrollTop = chat.scrollHeight;

      // Keep chat trimmed
      while (chat.children.length > 50) {
        chat.removeChild(chat.firstChild);
      }
    }

    /**
     * Update the top bar stats.
     */
    _updateTopBar() {
      var handEl = document.getElementById('poker-hand-count');
      var chipsEl = document.getElementById('poker-chips');
      var epochEl = document.getElementById('poker-epoch');
      if (handEl) handEl.textContent = 'Hand #' + this.handCount;
      if (chipsEl) chipsEl.textContent = 'Chips: ' + this.playerChips;
      if (epochEl && this.learning) {
        var stats = this.learning.getStats();
        epochEl.textContent = 'Epoch: ' + stats.epoch + ' | LR: ' + stats.learningRate.toFixed(4);
      }
    }

    /**
     * Generate consistent button styles.
     */
    _btnStyle(color) {
      return 'padding:8px 16px;background:' + color + ';border:none;border-radius:6px;' +
        'color:#fff;cursor:pointer;font-size:14px;font-weight:bold;transition:opacity 0.15s;';
    }
  }

  // === Export ===
  root.MJ.Poker.Play = Object.freeze({ PokerGameManager: PokerGameManager });

  if (typeof console !== 'undefined') console.log('[Poker] Play module loaded');
})(typeof window !== 'undefined' ? window : global);
