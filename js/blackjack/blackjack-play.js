/**
 * blackjack-play.js - Playable Blackjack game with UI
 * Full-screen overlay with semicircular table layout.
 * Connects BlackjackEngine + BlackjackAI + Dialogue + session tracking.
 * Exports under root.MJ.Blackjack.Play
 */
(function(exports) {
    'use strict';
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Blackjack = root.MJ.Blackjack || {};

    // Lazy accessors
    var Engine   = function() { return root.MJ.Blackjack.Engine; };
    var BJAI     = function() { return root.MJ.Blackjack.AI; };
    var BJCards  = function() { return root.MJ.Blackjack.Cards; };
    var Dialogue = function() { return root.MJ.Blackjack.Dialogue; };
    var TutorBridge = function() { return root.MJ.GameTutorBridge; };
    var BJHints  = function() { return root.MJ.Blackjack.Hints; };

    // Card display helpers (reuse poker style)
    var SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
    var SUIT_COLORS  = { hearts: '#e74c3c', diamonds: '#3498db', clubs: '#2ecc71', spades: '#ecf0f1' };

    function cardHTML(card, faceDown) {
        if (!card) return '<span class="bj-card empty"></span>';
        if (faceDown) {
            return '<span class="bj-card facedown" style="display:inline-block;width:48px;height:68px;' +
                'background:linear-gradient(135deg,#8b0000,#a52a2a);border:2px solid #cd5c5c;border-radius:6px;' +
                'margin:2px;text-align:center;line-height:68px;color:#f08080;font-size:20px;">\u2605</span>';
        }
        var suit = SUIT_SYMBOLS[card.suit] || '?';
        var color = SUIT_COLORS[card.suit] || '#fff';
        var rank = card.rank || '?';
        return '<span class="bj-card" style="display:inline-block;width:48px;height:68px;' +
            'background:linear-gradient(135deg,#f5f5f0,#e0ddd5);border:2px solid #999;border-radius:6px;' +
            'margin:2px;text-align:center;padding-top:4px;box-sizing:border-box;line-height:1.2;">' +
            '<span style="display:block;font-size:16px;font-weight:bold;color:#222;">' + rank + '</span>' +
            '<span style="display:block;font-size:22px;color:' + color + ';">' + suit + '</span></span>';
    }

    // -----------------------------------------------------------------------
    // BlackjackGameManager
    // -----------------------------------------------------------------------

    function BlackjackGameManager() {
        this.engine = null;
        this.overlay = null;
        this.running = false;
        this.sharedSystems = null;
        this.handCount = 0;
        this.currentBet = 10;
        this._boundHandleKey = null;
        this._nextHandTimer = null;
        this._sessionStats = { handsPlayed: 0, handsWon: 0, handsLost: 0, blackjacks: 0, pushes: 0, biggestWin: 0 };
    }

    /**
     * Initialize with shared systems from the main game.
     */
    BlackjackGameManager.prototype.init = function(sharedSystems) {
        this.sharedSystems = sharedSystems || {};

        // Initialize tutor bridge for LLM-powered tutoring and dialogue
        var TB = TutorBridge();
        if (TB && TB.GameTutorBridge && sharedSystems.ollamaClient) {
            this._tutorBridge = new TB.GameTutorBridge(sharedSystems.ollamaClient);
        }
    };

    /**
     * Play a sound effect through the shared sound system.
     */
    BlackjackGameManager.prototype.playSound = function(name) {
        try {
            if (this.sharedSystems && this.sharedSystems.sound) {
                this.sharedSystems.sound.play(name);
            }
        } catch(e) { /* sound not critical */ }
    };

    /**
     * Start the blackjack game.
     */
    BlackjackGameManager.prototype.start = function() {
        if (this.running) return;
        this.running = true;
        this.handCount = 0;
        this.currentBet = 10;
        this._sessionStats = { handsPlayed: 0, handsWon: 0, handsLost: 0, blackjacks: 0, pushes: 0, biggestWin: 0 };

        var eng = Engine();
        if (eng && eng.BlackjackEngine) {
            this.engine = new eng.BlackjackEngine();
            this.engine.init({ buyIn: 1000, playerCount: 4 });

            var self = this;
            this.engine.onStateChange(function(state) {
                self._renderState(state);
            });
            this.engine.onActionNeeded(function(actions) {
                self._showControls(actions);
            });
            this.engine.onRoundEnd(function(results) {
                self._onHandEnd(results);
            });
        }

        this._createOverlay();
        this._showBettingUI();
    };

    /**
     * Stop the blackjack game and remove overlay.
     */
    BlackjackGameManager.prototype.stop = function() {
        this.running = false;
        if (this._nextHandTimer) {
            clearTimeout(this._nextHandTimer);
            this._nextHandTimer = null;
        }
        if (this._boundHandleKey) {
            document.removeEventListener('keydown', this._boundHandleKey);
            this._boundHandleKey = null;
        }
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    };

    /**
     * Create full-screen blackjack overlay.
     */
    BlackjackGameManager.prototype._createOverlay = function() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'blackjack-game';
        this.overlay.style.cssText = 'position:fixed;inset:0;background:#1a2a1a;z-index:500;' +
            'display:flex;flex-direction:column;font-family:"Segoe UI",Arial,sans-serif;';

        // Top bar
        var topBar = document.createElement('div');
        topBar.style.cssText = 'padding:8px 16px;background:rgba(0,0,0,0.3);display:flex;' +
            'justify-content:space-between;align-items:center;flex-shrink:0;';
        topBar.innerHTML =
            '<span style="color:#e8b830;font-weight:bold;font-size:16px;">Blackjack</span>' +
            '<div>' +
                '<span id="bj-hand-count" style="color:#aaa;font-size:13px;margin-right:16px;">Hand #0</span>' +
                '<span id="bj-chips" style="color:#4ade80;font-size:13px;margin-right:16px;">Chips: 1000</span>' +
                '<button id="bj-back" style="padding:4px 12px;background:rgba(255,255,255,0.1);' +
                    'border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#e0e0e0;cursor:pointer;' +
                    'font-size:13px;">Back</button>' +
            '</div>';
        this.overlay.appendChild(topBar);

        // Game area
        var gameArea = document.createElement('div');
        gameArea.id = 'bj-game-area';
        gameArea.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;' +
            'justify-content:center;overflow:hidden;position:relative;';
        this.overlay.appendChild(gameArea);

        // Controls area
        var controlsArea = document.createElement('div');
        controlsArea.id = 'bj-controls';
        controlsArea.style.cssText = 'padding:12px 16px;background:rgba(0,0,0,0.4);flex-shrink:0;' +
            'display:flex;justify-content:center;align-items:center;gap:12px;min-height:56px;';
        this.overlay.appendChild(controlsArea);

        // Chat panel for character dialogue
        var chatPanel = document.createElement('div');
        chatPanel.id = 'bj-chat';
        chatPanel.style.cssText = 'position:fixed;bottom:60px;left:0;width:260px;max-height:180px;' +
            'background:rgba(0,0,0,0.8);border-right:1px solid rgba(255,255,255,0.1);' +
            'border-top:1px solid rgba(255,255,255,0.1);z-index:501;overflow-y:auto;padding:8px;' +
            'font-size:12px;border-top-right-radius:8px;';
        this.overlay.appendChild(chatPanel);

        // Tutor chat input area
        var tutorArea = document.createElement('div');
        tutorArea.id = 'bj-tutor-input';
        tutorArea.style.cssText = 'position:fixed;bottom:0;left:0;width:260px;z-index:502;' +
            'background:rgba(0,0,0,0.9);border-right:1px solid rgba(255,255,255,0.1);' +
            'padding:6px 8px;display:flex;gap:4px;';
        tutorArea.innerHTML =
            '<input id="bj-ask-input" type="text" placeholder="Ask the tutor..." ' +
            'style="flex:1;padding:5px 8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);' +
            'border-radius:4px;color:#e0e0e0;font-size:12px;outline:none;" />' +
            '<button id="bj-ask-btn" style="padding:5px 10px;background:#e8b830;border:none;border-radius:4px;' +
            'color:#1a1a1a;font-weight:bold;font-size:11px;cursor:pointer;">Ask</button>';
        this.overlay.appendChild(tutorArea);

        document.body.appendChild(this.overlay);

        var self = this;
        document.getElementById('bj-back').addEventListener('click', function() {
            self.stop();
        });

        // Wire up tutor chat
        var askInput = document.getElementById('bj-ask-input');
        var askBtn = document.getElementById('bj-ask-btn');
        if (askInput && askBtn) {
            var handleAsk = function() {
                var q = askInput.value.trim();
                if (!q) return;
                askInput.value = '';
                self._addChatLine('You', q);
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
    };

    /**
     * Handle keyboard shortcuts.
     */
    BlackjackGameManager.prototype._handleKeyboard = function(e) {
        if (!this.running) return;
        switch (e.key.toLowerCase()) {
            case 'h': this._doAction('hit'); break;
            case 's': this._doAction('stand'); break;
            case 'd': this._doAction('double'); break;
            case 'p': this._doAction('split'); break;
            case 'escape': this.stop(); break;
        }
    };

    /**
     * Execute a player action on the engine.
     */
    BlackjackGameManager.prototype._doAction = function(action) {
        if (!this.engine) return;
        var eng = Engine();
        var idx = this.engine.currentPlayerIndex;
        var p = this.engine.players[idx];
        if (!p || !p.isHuman) return;

        switch (action) {
            case 'hit': this.engine.hit(idx); break;
            case 'stand': this.engine.stand(idx); break;
            case 'double': this.engine.doubleDown(idx); break;
            case 'split': this.engine.split(idx); break;
        }
    };

    /**
     * Show the betting UI before a hand starts.
     */
    BlackjackGameManager.prototype._showBettingUI = function() {
        var controls = document.getElementById('bj-controls');
        if (!controls) return;

        var self = this;
        var chips = [5, 25, 100];
        var bet = this.currentBet;

        var html = '<div style="display:flex;align-items:center;gap:12px;">' +
            '<span style="color:#ccc;font-size:14px;">Bet:</span>' +
            '<span id="bj-bet-display" style="color:#e8b830;font-size:20px;font-weight:bold;min-width:60px;text-align:center;">' + bet + '</span>';

        for (var i = 0; i < chips.length; i++) {
            var chipColors = { 5: '#e74c3c', 25: '#27ae60', 100: '#2c3e50' };
            html += '<button class="bj-chip-btn" data-value="' + chips[i] + '" style="width:44px;height:44px;' +
                'border-radius:50%;background:' + chipColors[chips[i]] + ';border:3px solid #e8b830;' +
                'color:#fff;font-weight:bold;font-size:13px;cursor:pointer;">' + chips[i] + '</button>';
        }

        html += '<button id="bj-clear-bet" style="padding:6px 12px;background:rgba(255,255,255,0.1);' +
            'border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#e0e0e0;cursor:pointer;">Clear</button>';
        html += '<button id="bj-deal-btn" style="padding:8px 24px;background:#27ae60;' +
            'border:none;border-radius:6px;color:#fff;font-weight:bold;font-size:15px;cursor:pointer;">DEAL</button>';
        html += '</div>';

        controls.innerHTML = html;

        // Chip click handlers
        var chipBtns = controls.querySelectorAll('.bj-chip-btn');
        for (var i = 0; i < chipBtns.length; i++) {
            chipBtns[i].addEventListener('click', function() {
                var val = parseInt(this.getAttribute('data-value'), 10);
                bet += val;
                var playerChips = self.engine ? self.engine.players[0].chips : 1000;
                if (bet > playerChips) bet = playerChips;
                document.getElementById('bj-bet-display').textContent = bet;
            });
        }

        document.getElementById('bj-clear-bet').addEventListener('click', function() {
            bet = 0;
            document.getElementById('bj-bet-display').textContent = bet;
        });

        document.getElementById('bj-deal-btn').addEventListener('click', function() {
            if (bet <= 0) return;
            self.currentBet = bet;
            self._dealHand();
        });

        // Render an empty table
        this._renderEmptyTable();
    };

    /**
     * Deal a new hand with current bets.
     */
    BlackjackGameManager.prototype._dealHand = function() {
        if (!this.engine) return;
        this.handCount++;

        // AI decides bets
        var ai = BJAI();
        var bets = [this.currentBet];
        for (var i = 1; i < this.engine.players.length; i++) {
            var p = this.engine.players[i];
            if (ai && ai.decideBet) {
                bets.push(ai.decideBet(p.personality, 10));
            } else {
                bets.push(10);
            }
        }

        this._addChatLine(null, 'Hand #' + this.handCount + ' - Cards are dealt.');

        // Show character start dialogue (LLM-powered or scripted)
        var dlg = Dialogue();
        if (this._tutorBridge || dlg) {
            for (var i = 1; i < this.engine.players.length; i++) {
                var p = this.engine.players[i];
                if (p.personality) {
                    this._triggerLLMDialogue(p, 'game_start');
                    var line = null; // handled by _triggerLLMDialogue
                    if (line) this._addChatLine(p.name, line);
                }
            }
        }

        this.engine.start(bets);
    };

    /**
     * Show player action controls.
     */
    BlackjackGameManager.prototype._showControls = function(actions) {
        var controls = document.getElementById('bj-controls');
        if (!controls) return;

        var self = this;
        var html = '<div style="display:flex;gap:12px;">';

        var btnStyle = 'padding:8px 20px;border:none;border-radius:6px;color:#fff;font-weight:bold;font-size:14px;cursor:pointer;';

        if (actions.indexOf('hit') !== -1) {
            html += '<button id="bj-hit" style="' + btnStyle + 'background:#e67e22;">Hit (H)</button>';
        }
        if (actions.indexOf('stand') !== -1) {
            html += '<button id="bj-stand" style="' + btnStyle + 'background:#3498db;">Stand (S)</button>';
        }
        if (actions.indexOf('double') !== -1) {
            html += '<button id="bj-double" style="' + btnStyle + 'background:#9b59b6;">Double (D)</button>';
        }
        if (actions.indexOf('split') !== -1) {
            html += '<button id="bj-split" style="' + btnStyle + 'background:#1abc9c;">Split (P)</button>';
        }

        html += '</div>';
        controls.innerHTML = html;

        if (document.getElementById('bj-hit')) {
            document.getElementById('bj-hit').addEventListener('click', function() { self._doAction('hit'); });
        }
        if (document.getElementById('bj-stand')) {
            document.getElementById('bj-stand').addEventListener('click', function() { self._doAction('stand'); });
        }
        if (document.getElementById('bj-double')) {
            document.getElementById('bj-double').addEventListener('click', function() { self._doAction('double'); });
        }
        if (document.getElementById('bj-split')) {
            document.getElementById('bj-split').addEventListener('click', function() { self._doAction('split'); });
        }
    };

    /**
     * Render an empty table before dealing.
     */
    BlackjackGameManager.prototype._renderEmptyTable = function() {
        var area = document.getElementById('bj-game-area');
        if (!area) return;

        var html = '<div style="text-align:center;margin-bottom:40px;">' +
            '<div style="color:#aaa;font-size:14px;margin-bottom:8px;">DEALER</div>' +
            '<div style="display:flex;justify-content:center;gap:4px;">' +
            cardHTML(null) + cardHTML(null) + '</div></div>';

        html += '<div style="display:flex;justify-content:center;gap:60px;margin-top:40px;">';
        var names = this.engine ? this.engine.players.map(function(p) { return p.name; }) : ['You', 'Mei', 'Kenji', 'Yuki'];
        for (var i = 0; i < names.length; i++) {
            var isHuman = i === 0;
            var nameColor = isHuman ? '#4ade80' : '#aaa';
            html += '<div style="text-align:center;">' +
                '<div style="color:' + nameColor + ';font-size:13px;margin-bottom:6px;">' + names[i] + '</div>' +
                '<div style="display:flex;justify-content:center;gap:4px;">' +
                cardHTML(null) + cardHTML(null) + '</div></div>';
        }
        html += '</div>';

        area.innerHTML = html;
    };

    /**
     * Render the current game state.
     */
    BlackjackGameManager.prototype._renderState = function(state) {
        var area = document.getElementById('bj-game-area');
        if (!area) return;

        var cards = BJCards();
        var phase = state.phase;
        var showDealerHole = (phase === 'dealer_turn' || phase === 'settling' || phase === 'hand_over');

        // Update header info
        var handCountEl = document.getElementById('bj-hand-count');
        if (handCountEl) handCountEl.textContent = 'Hand #' + this.handCount;

        var chipsEl = document.getElementById('bj-chips');
        if (chipsEl && state.players[0]) chipsEl.textContent = 'Chips: ' + state.players[0].chips;

        // Dealer
        var html = '<div style="text-align:center;margin-bottom:30px;">';
        html += '<div style="color:#aaa;font-size:14px;margin-bottom:8px;">DEALER</div>';
        html += '<div style="display:flex;justify-content:center;gap:4px;">';
        for (var d = 0; d < state.dealer.cards.length; d++) {
            if (d === 1 && !showDealerHole) {
                html += cardHTML(state.dealer.cards[d], true);
            } else {
                html += cardHTML(state.dealer.cards[d], false);
            }
        }
        html += '</div>';
        if (showDealerHole && state.dealer.cards.length > 0) {
            var dVal = cards.calculateHandValue(state.dealer.cards);
            var dColor = state.dealer.busted ? '#e74c3c' : '#e8b830';
            html += '<div style="color:' + dColor + ';font-size:16px;font-weight:bold;margin-top:4px;">' +
                (state.dealer.busted ? 'BUST' : dVal.value) + '</div>';
        }
        html += '</div>';

        // Players in semicircular layout
        html += '<div style="display:flex;justify-content:center;gap:40px;flex-wrap:wrap;margin-top:20px;">';
        for (var i = 0; i < state.players.length; i++) {
            var p = state.players[i];
            var isActive = (phase === 'player_turn' && i === state.currentPlayerIndex);
            var borderColor = isActive ? '#e8b830' : 'rgba(255,255,255,0.1)';
            var isHuman = p.isHuman;
            var nameColor = isHuman ? '#4ade80' : '#ccc';

            html += '<div style="text-align:center;padding:12px;border:2px solid ' + borderColor + ';' +
                'border-radius:12px;min-width:120px;background:rgba(0,0,0,0.2);">';
            html += '<div style="color:' + nameColor + ';font-size:13px;font-weight:bold;margin-bottom:4px;">' +
                p.name + '</div>';
            html += '<div style="color:#888;font-size:11px;margin-bottom:6px;">Chips: ' + p.chips + '</div>';

            // Render each hand (supports splits)
            for (var h = 0; h < p.hands.length; h++) {
                var hand = p.hands[h];
                var isActiveHand = (isActive && h === p.activeHandIndex);

                if (p.hands.length > 1) {
                    html += '<div style="font-size:10px;color:#888;margin-top:4px;">Hand ' + (h + 1) + '</div>';
                }

                html += '<div style="display:flex;justify-content:center;gap:2px;' +
                    (isActiveHand ? 'box-shadow:0 0 8px rgba(232,184,48,0.5);' : '') + '">';
                for (var c = 0; c < hand.cards.length; c++) {
                    html += cardHTML(hand.cards[c], false);
                }
                html += '</div>';

                if (hand.cards.length > 0) {
                    var hVal = cards.calculateHandValue(hand.cards);
                    var valText = hVal.value + (hVal.soft ? ' (soft)' : '');
                    var valColor = '#e8b830';
                    if (hand.busted) { valText = 'BUST'; valColor = '#e74c3c'; }
                    else if (hand.isBlackjack) { valText = 'BLACKJACK!'; valColor = '#f1c40f'; }
                    html += '<div style="color:' + valColor + ';font-size:13px;font-weight:bold;margin-top:2px;">' + valText + '</div>';
                }

                if (hand.bet > 0) {
                    html += '<div style="color:#aaa;font-size:11px;">Bet: ' + hand.bet + '</div>';
                }

                // Show result
                if (hand.result) {
                    var resColor = { win: '#4ade80', blackjack: '#f1c40f', push: '#aaa', lose: '#e74c3c' };
                    var resLabel = { win: 'WIN +' + hand.payout, blackjack: 'BLACKJACK! +' + hand.payout,
                        push: 'PUSH', lose: 'LOSE' };
                    html += '<div style="color:' + (resColor[hand.result] || '#aaa') + ';font-size:12px;font-weight:bold;margin-top:2px;">' +
                        (resLabel[hand.result] || hand.result) + '</div>';
                }
            }

            html += '</div>';
        }
        html += '</div>';

        area.innerHTML = html;
    };

    /**
     * Handle end of a hand: show results, dialogue, track stats.
     */
    BlackjackGameManager.prototype._onHandEnd = function(results) {
        if (!results || !results.results) return;

        var dlg = Dialogue();
        var humanResults = [];

        for (var i = 0; i < results.results.length; i++) {
            var r = results.results[i];
            if (r.playerId === 0) {
                humanResults.push(r);
            }

            // Show AI dialogue (LLM-powered or scripted)
            var player = this.engine.players[r.playerId];
            if (player && player.personality) {
                var situation = null;
                if (r.result === 'blackjack') situation = 'blackjack';
                else if (r.result === 'win' && results.dealerBusted) situation = 'dealer_bust';
                else if (r.result === 'win') situation = 'win';
                else if (r.result === 'lose') situation = r.playerValue > 21 ? 'bust' : 'lose';
                else if (r.result === 'push') situation = 'push';

                if (situation) {
                    this._triggerLLMDialogue(player, situation);
                }
            }
        }

        // Track session stats
        for (var j = 0; j < humanResults.length; j++) {
            this._sessionStats.handsPlayed++;
            if (humanResults[j].result === 'win') this._sessionStats.handsWon++;
            else if (humanResults[j].result === 'blackjack') { this._sessionStats.handsWon++; this._sessionStats.blackjacks++; }
            else if (humanResults[j].result === 'lose') this._sessionStats.handsLost++;
            else if (humanResults[j].result === 'push') this._sessionStats.pushes++;
            if (humanResults[j].payout > this._sessionStats.biggestWin) {
                this._sessionStats.biggestWin = humanResults[j].payout;
            }
        }

        // Determine human outcome flags for integrations
        var humanWon = false;
        var humanBlackjack = false;
        var humanBusted = false;
        var humanDoubled = false;
        for (var k = 0; k < humanResults.length; k++) {
            if (humanResults[k].result === 'win' || humanResults[k].result === 'blackjack') humanWon = true;
            if (humanResults[k].result === 'blackjack') humanBlackjack = true;
            if (humanResults[k].playerValue > 21) humanBusted = true;
            if (humanResults[k].doubled) humanDoubled = true;
        }

        // Award coins
        if (this.sharedSystems && this.sharedSystems.economy) {
            try {
                var eco = this.sharedSystems.economy;
                if (eco.addCoins) {
                    eco.addCoins(1, 'blackjack_play');
                    if (humanWon) eco.addCoins(3, 'blackjack_win');
                    if (humanBlackjack) eco.addCoins(5, 'blackjack_natural');
                }
            } catch(e) {}
        }

        // Award XP via world manager
        if (this.sharedSystems && this.sharedSystems.worldManager) {
            try {
                var wm = this.sharedSystems.worldManager;
                if (wm.reputation && wm.reputation.addXP) {
                    wm.reputation.addXP(2, 'blackjack_play');
                    if (humanWon) wm.reputation.addXP(5, 'blackjack_win');
                }
            } catch(e) {}
        }

        // Character dialogue on results
        if (this.sharedSystems && this.sharedSystems.sound) {
            try {
                if (humanWon) this.sharedSystems.sound.play('WIN');
                else this.sharedSystems.sound.play('DISCARD');
            } catch(e) {}
        }

        // Record result for learning system
        this._recordResult(humanWon, humanBlackjack, humanBusted, humanDoubled);

        // Auto-deal next hand after delay
        var self = this;
        var controls = document.getElementById('bj-controls');
        if (controls) {
            controls.innerHTML = '<button id="bj-next-hand" style="padding:8px 24px;background:#27ae60;' +
                'border:none;border-radius:6px;color:#fff;font-weight:bold;font-size:15px;cursor:pointer;">Next Hand</button>' +
                '<span style="color:#888;font-size:12px;margin-left:12px;">' +
                'W:' + this._sessionStats.handsWon + ' L:' + this._sessionStats.handsLost +
                ' P:' + this._sessionStats.pushes + ' BJ:' + this._sessionStats.blackjacks + '</span>';

            document.getElementById('bj-next-hand').addEventListener('click', function() {
                self._showBettingUI();
            });
        }

        this._nextHandTimer = setTimeout(function() {
            if (self.running) self._showBettingUI();
        }, 8000);
    };

    /**
     * Simple Blackjack learning — track outcomes and adjust hit/stand thresholds.
     */
    BlackjackGameManager.prototype._recordResult = function(won, blackjack, busted, doubled) {
        try {
            var key = 'mj_blackjack_learning';
            var data = JSON.parse(localStorage.getItem(key) || '{}');
            data.handsPlayed = (data.handsPlayed || 0) + 1;
            data.wins = (data.wins || 0) + (won ? 1 : 0);
            data.blackjacks = (data.blackjacks || 0) + (blackjack ? 1 : 0);
            data.busts = (data.busts || 0) + (busted ? 1 : 0);
            data.doubles = (data.doubles || 0) + (doubled ? 1 : 0);
            data.winRate = data.wins / data.handsPlayed;
            localStorage.setItem(key, JSON.stringify(data));
        } catch(e) {}
    };

    /**
     * Handle a tutor question from the chat input.
     */
    BlackjackGameManager.prototype._handleTutorQuestion = async function(question) {
        this._addChatLine('Tutor', '...');

        var state = this.engine ? { players: this.engine.players, dealer: this.engine.dealer, phase: this.engine.phase } : {};
        var playerHand = null;
        var dealerUpcard = null;

        if (this.engine && this.engine.players && this.engine.players[0]) {
            var p = this.engine.players[0];
            if (p.hands && p.hands[p.activeHandIndex || 0]) {
                playerHand = p.hands[p.activeHandIndex || 0];
            }
        }
        if (this.engine && this.engine.dealer && this.engine.dealer.cards && this.engine.dealer.cards.length > 0) {
            dealerUpcard = this.engine.dealer.cards[0];
        }

        var gameContext = '';
        if (this._tutorBridge) {
            gameContext = this._tutorBridge.formatBlackjackContext(playerHand, dealerUpcard, state);
        }

        // Offline fallback using hints engine
        var offlineFallback = function(q) {
            var hints = BJHints();
            if (hints && hints.getHint && playerHand && dealerUpcard) {
                var hint = hints.getHint(playerHand, dealerUpcard, state);
                if (hint && hint.reason) return hint.reason;
            }
            var ql = (q || '').toLowerCase();
            if (ql.indexOf('basic strategy') !== -1 || ql.indexOf('what should') !== -1) {
                return 'Basic strategy tells you the mathematically optimal play for every hand vs dealer upcard. With a hard 16 vs dealer 10, hit. With soft 17, always hit. Never take insurance.';
            }
            if (ql.indexOf('count') !== -1) {
                return 'Card counting assigns +1 to 2-6, 0 to 7-9, and -1 to 10-A. A positive running count means more high cards remain, favoring the player.';
            }
            if (ql.indexOf('split') !== -1) {
                return 'Always split Aces and 8s. Never split 10s or 5s. Split 2s/3s/6s/7s vs dealer 2-7.';
            }
            if (ql.indexOf('double') !== -1) {
                return 'Double on 11 always. Double on 10 vs dealer 2-9. Double on 9 vs dealer 3-6. Double soft 13-17 vs dealer 5-6.';
            }
            return 'I can help with basic strategy, card counting, splitting, doubling, and specific hand decisions. Ask me something specific!';
        };

        var response;
        if (this._tutorBridge) {
            response = await this._tutorBridge.askTutor('blackjack', question, gameContext, offlineFallback);
        } else {
            response = offlineFallback(question);
        }

        // Replace "..." with the response
        var chat = document.getElementById('bj-chat');
        if (chat && chat.lastChild) {
            chat.removeChild(chat.lastChild);
        }
        this._addChatLine('Tutor', response);
    };

    /**
     * Try to generate LLM character dialogue, falling back to scripted.
     */
    BlackjackGameManager.prototype._triggerLLMDialogue = function(player, situation) {
        if (!player || !player.personality) return;
        var dlg = Dialogue();
        var self = this;

        if (this._tutorBridge && this._tutorBridge.isAvailable()) {
            var charId = player.personality;
            this._tutorBridge.generateCharacterLine('blackjack', charId, situation)
                .then(function(llmLine) {
                    if (llmLine) {
                        self._addChatLine(player.name, llmLine);
                    } else if (dlg && dlg.getDialogue) {
                        var line = dlg.getDialogue(charId, situation);
                        if (line) self._addChatLine(player.name, line);
                    }
                });
        } else if (dlg && dlg.getDialogue) {
            var line = dlg.getDialogue(player.personality, situation);
            if (line) this._addChatLine(player.name, line);
        }
    };

    /**
     * Add a chat line to the dialogue panel.
     */
    BlackjackGameManager.prototype._addChatLine = function(name, text) {
        var chat = document.getElementById('bj-chat');
        if (!chat) return;

        var line = document.createElement('div');
        line.style.cssText = 'margin-bottom:4px;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.05);';
        if (name) {
            var nameColors = { Mei: '#3498db', Kenji: '#e74c3c', Yuki: '#9b59b6' };
            line.innerHTML = '<span style="color:' + (nameColors[name] || '#aaa') + ';font-weight:bold;">' +
                name + ':</span> <span style="color:#ddd;">' + text + '</span>';
        } else {
            line.innerHTML = '<span style="color:#888;font-style:italic;">' + text + '</span>';
        }
        chat.appendChild(line);
        chat.scrollTop = chat.scrollHeight;
    };

    // Export
    root.MJ.Blackjack.Play = {
        BlackjackGameManager: BlackjackGameManager
    };

})(typeof window !== 'undefined' ? window : global);
