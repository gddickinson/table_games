/**
 * poker-renderer.js - DOM-based poker table renderer
 * Exports under root.MJ.Poker.Renderer
 */
(function(exports) {
    const root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Poker = root.MJ.Poker || {};

    var Cards = root.MJ.Poker.Cards;
    var ENGINE = root.MJ.Poker.Engine;

    var CSS_INJECTED = false;

    var POKER_CSS = [
        '.poker-table-wrap { position: relative; width: 100%; max-width: 900px; margin: 0 auto; font-family: "Segoe UI", Arial, sans-serif; }',
        '.poker-felt { position: relative; width: 100%; height: 500px; background: radial-gradient(ellipse at center, #1a7a3a 0%, #145a2a 60%, #0e3d1c 100%); border-radius: 200px / 160px; border: 12px solid #5c3a1e; box-shadow: 0 0 30px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3); overflow: visible; }',
        '.poker-community { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; gap: 8px; z-index: 10; }',
        '.poker-pot { position: absolute; top: 35%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.5); color: #ffd700; font-size: 16px; font-weight: bold; padding: 4px 16px; border-radius: 12px; z-index: 10; }',
        '.poker-phase { position: absolute; top: 26%; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.6); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; z-index: 10; }',
        '.poker-player { position: absolute; width: 160px; text-align: center; z-index: 15; transition: all 0.3s ease; }',
        '.poker-player.active { filter: drop-shadow(0 0 8px #ffd700); }',
        '.poker-player.folded { opacity: 0.4; }',
        '.poker-player-info { background: rgba(0,0,0,0.7); border-radius: 8px; padding: 6px 10px; color: #fff; font-size: 12px; }',
        '.poker-player-name { font-weight: bold; font-size: 14px; margin-bottom: 2px; }',
        '.poker-player-chips { color: #ffd700; }',
        '.poker-player-action { color: #aaf; font-style: italic; font-size: 11px; min-height: 14px; }',
        '.poker-player-bet { position: absolute; background: rgba(0,0,0,0.5); color: #ffd700; font-size: 11px; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }',
        '.poker-dealer-btn { display: inline-block; background: #fff; color: #333; font-weight: bold; font-size: 10px; width: 20px; height: 20px; line-height: 20px; border-radius: 50%; margin-left: 4px; vertical-align: middle; }',
        '.poker-cards { display: flex; gap: 3px; justify-content: center; margin-top: 4px; }',
        '.poker-card { width: 44px; height: 62px; border-radius: 4px; background: #fff; border: 1px solid #999; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; line-height: 1.1; box-shadow: 1px 1px 3px rgba(0,0,0,0.3); position: relative; }',
        '.poker-card.red { color: #d00; }',
        '.poker-card.black { color: #222; }',
        '.poker-card.facedown { background: linear-gradient(135deg, #1a3a8a 25%, #2244aa 25%, #2244aa 50%, #1a3a8a 50%, #1a3a8a 75%, #2244aa 75%); background-size: 8px 8px; border-color: #0a1a4a; }',
        '.poker-card .rank { font-size: 15px; }',
        '.poker-card .suit { font-size: 18px; margin-top: -2px; }',
        '.poker-community .poker-card { width: 54px; height: 76px; font-size: 15px; }',
        '.poker-community .poker-card .rank { font-size: 18px; }',
        '.poker-community .poker-card .suit { font-size: 22px; }',
        '.poker-controls { display: flex; gap: 8px; align-items: center; justify-content: center; padding: 16px; flex-wrap: wrap; }',
        '.poker-controls button { padding: 10px 20px; font-size: 14px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; text-transform: uppercase; letter-spacing: 0.5px; }',
        '.poker-controls button:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }',
        '.poker-controls button:active { transform: translateY(0); }',
        '.poker-controls button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }',
        '.poker-btn-fold { background: #c0392b; color: #fff; }',
        '.poker-btn-check { background: #27ae60; color: #fff; }',
        '.poker-btn-call { background: #2980b9; color: #fff; }',
        '.poker-btn-raise { background: #e67e22; color: #fff; }',
        '.poker-btn-allin { background: #8e44ad; color: #fff; }',
        '.poker-raise-slider { display: flex; align-items: center; gap: 8px; }',
        '.poker-raise-slider input[type=range] { width: 140px; }',
        '.poker-raise-slider .raise-amount { color: #ffd700; font-weight: bold; min-width: 50px; text-align: center; }',
        '.poker-hand-result { position: absolute; top: 42%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); color: #ffd700; font-size: 18px; font-weight: bold; padding: 12px 24px; border-radius: 10px; z-index: 20; text-align: center; animation: poker-fadein 0.3s ease; }',
        '.poker-hand-result .winner-hand { font-size: 13px; color: #aaa; margin-top: 4px; }',
        '@keyframes poker-fadein { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }',
        '.poker-new-hand-btn { display: block; margin: 8px auto; padding: 10px 30px; font-size: 15px; background: #27ae60; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }',
        '.poker-new-hand-btn:hover { background: #2ecc71; }'
    ].join('\n');

    /**
     * Inject CSS into the document head.
     */
    function injectCSS() {
        if (CSS_INJECTED) return;
        if (typeof document === 'undefined') return;
        var style = document.createElement('style');
        style.textContent = POKER_CSS;
        document.head.appendChild(style);
        CSS_INJECTED = true;
    }

    // Player positions around the table (relative to felt, in percentages)
    // Index 0 = bottom center (human), then clockwise
    var PLAYER_POSITIONS = {
        2: [
            { left: '50%', top: '90%', betLeft: '50%', betTop: '75%', tx: '-50%', ty: '0' },
            { left: '50%', top: '-10%', betLeft: '50%', betTop: '18%', tx: '-50%', ty: '-100%' }
        ],
        3: [
            { left: '50%', top: '90%', betLeft: '50%', betTop: '72%', tx: '-50%', ty: '0' },
            { left: '-5%', top: '25%', betLeft: '18%', betTop: '42%', tx: '0', ty: '-50%' },
            { left: '105%', top: '25%', betLeft: '82%', betTop: '42%', tx: '-100%', ty: '-50%' }
        ],
        4: [
            { left: '50%', top: '92%', betLeft: '50%', betTop: '72%', tx: '-50%', ty: '0' },
            { left: '-5%', top: '40%', betLeft: '20%', betTop: '48%', tx: '0', ty: '-50%' },
            { left: '50%', top: '-12%', betLeft: '50%', betTop: '18%', tx: '-50%', ty: '-100%' },
            { left: '105%', top: '40%', betLeft: '80%', betTop: '48%', tx: '-100%', ty: '-50%' }
        ],
        5: [
            { left: '50%', top: '92%', betLeft: '50%', betTop: '72%', tx: '-50%', ty: '0' },
            { left: '-2%', top: '55%', betLeft: '18%', betTop: '55%', tx: '0', ty: '-50%' },
            { left: '15%', top: '-5%', betLeft: '28%', betTop: '18%', tx: '-50%', ty: '-100%' },
            { left: '85%', top: '-5%', betLeft: '72%', betTop: '18%', tx: '-50%', ty: '-100%' },
            { left: '102%', top: '55%', betLeft: '82%', betTop: '55%', tx: '-100%', ty: '-50%' }
        ],
        6: [
            { left: '50%', top: '92%', betLeft: '50%', betTop: '72%', tx: '-50%', ty: '0' },
            { left: '-2%', top: '60%', betLeft: '16%', betTop: '58%', tx: '0', ty: '-50%' },
            { left: '5%', top: '0%', betLeft: '22%', betTop: '22%', tx: '0', ty: '-100%' },
            { left: '50%', top: '-12%', betLeft: '50%', betTop: '15%', tx: '-50%', ty: '-100%' },
            { left: '95%', top: '0%', betLeft: '78%', betTop: '22%', tx: '-100%', ty: '-100%' },
            { left: '102%', top: '60%', betLeft: '84%', betTop: '58%', tx: '-100%', ty: '-50%' }
        ]
    };

    /**
     * PokerRenderer class.
     */
    function PokerRenderer() {
        this.container = null;
        this.feltEl = null;
        this.controlsEl = null;
        this.engine = null;
        this._onAction = null;
        this._resultEl = null;
    }

    /**
     * Initialize the renderer.
     * @param {HTMLElement} container
     */
    PokerRenderer.prototype.init = function(container) {
        injectCSS();
        this.container = container;
        this.container.innerHTML = '';

        var wrap = document.createElement('div');
        wrap.className = 'poker-table-wrap';

        this.feltEl = document.createElement('div');
        this.feltEl.className = 'poker-felt';

        this.controlsEl = document.createElement('div');
        this.controlsEl.className = 'poker-controls';

        wrap.appendChild(this.feltEl);
        wrap.appendChild(this.controlsEl);
        this.container.appendChild(wrap);
    };

    /**
     * Bind the engine for callbacks.
     */
    PokerRenderer.prototype.bindEngine = function(engine) {
        this.engine = engine;
        var self = this;

        engine.onStateChange(function(state) {
            self.renderState(state);
        });

        engine.onActionNeeded(function(validActions) {
            self._showControls(validActions);
        });

        engine.onRoundEnd(function(results) {
            self._showResult(results);
        });
    };

    /**
     * Render a card element.
     * @param {Card|null} card - null for face-down
     * @param {boolean} faceDown
     * @returns {HTMLElement}
     */
    PokerRenderer.prototype._renderCard = function(card, faceDown) {
        var el = document.createElement('div');
        el.className = 'poker-card';

        if (faceDown || !card) {
            el.classList.add('facedown');
            return el;
        }

        var color = Cards.getCardColor(card);
        el.classList.add(color);

        var rankEl = document.createElement('div');
        rankEl.className = 'rank';
        rankEl.textContent = card.rank;

        var suitEl = document.createElement('div');
        suitEl.className = 'suit';
        suitEl.textContent = Cards.CARD_SYMBOLS[card.suit];

        el.appendChild(rankEl);
        el.appendChild(suitEl);

        return el;
    };

    /**
     * Full render from game state.
     * @param {Object} state
     */
    PokerRenderer.prototype.renderState = function(state) {
        if (!this.feltEl) return;

        this.feltEl.innerHTML = '';

        var numPlayers = state.players.length;
        var positions = PLAYER_POSITIONS[numPlayers] || PLAYER_POSITIONS[4];

        // Phase label
        var phaseEl = document.createElement('div');
        phaseEl.className = 'poker-phase';
        phaseEl.textContent = this._phaseName(state.phase) + (state.handNumber ? ' - Hand #' + state.handNumber : '');
        this.feltEl.appendChild(phaseEl);

        // Pot
        if (state.pot > 0) {
            var potEl = document.createElement('div');
            potEl.className = 'poker-pot';
            potEl.textContent = 'Pot: ' + state.pot;
            this.feltEl.appendChild(potEl);
        }

        // Community cards
        var commEl = document.createElement('div');
        commEl.className = 'poker-community';
        for (var c = 0; c < state.communityCards.length; c++) {
            commEl.appendChild(this._renderCard(state.communityCards[c], false));
        }
        // Placeholder slots for unrevealed community cards
        for (var c = state.communityCards.length; c < 5; c++) {
            var placeholder = document.createElement('div');
            placeholder.className = 'poker-card facedown';
            placeholder.style.opacity = '0.2';
            commEl.appendChild(placeholder);
        }
        this.feltEl.appendChild(commEl);

        // Players
        for (var i = 0; i < state.players.length; i++) {
            var p = state.players[i];
            var pos = positions[i] || positions[0];

            var playerEl = document.createElement('div');
            playerEl.className = 'poker-player';
            if (i === state.currentPlayerIndex && state.phase !== 'hand_over' && state.phase !== 'showdown') {
                playerEl.classList.add('active');
            }
            if (p.folded) {
                playerEl.classList.add('folded');
            }

            playerEl.style.left = pos.left;
            playerEl.style.top = pos.top;
            playerEl.style.transform = 'translate(' + pos.tx + ', ' + pos.ty + ')';

            // Cards
            var cardsEl = document.createElement('div');
            cardsEl.className = 'poker-cards';

            var showCards = p.isHuman || state.phase === 'showdown' || state.phase === 'hand_over';

            for (var j = 0; j < p.cards.length; j++) {
                cardsEl.appendChild(this._renderCard(p.cards[j], !showCards && !p.folded));
            }
            playerEl.appendChild(cardsEl);

            // Info
            var infoEl = document.createElement('div');
            infoEl.className = 'poker-player-info';

            var nameEl = document.createElement('div');
            nameEl.className = 'poker-player-name';
            nameEl.textContent = p.name;
            if (p.isDealer) {
                var btn = document.createElement('span');
                btn.className = 'poker-dealer-btn';
                btn.textContent = 'D';
                nameEl.appendChild(btn);
            }
            infoEl.appendChild(nameEl);

            var chipsEl = document.createElement('div');
            chipsEl.className = 'poker-player-chips';
            chipsEl.textContent = '$' + p.chips;
            if (p.allIn) chipsEl.textContent += ' (ALL IN)';
            infoEl.appendChild(chipsEl);

            var actionEl = document.createElement('div');
            actionEl.className = 'poker-player-action';
            actionEl.textContent = p.lastAction || '';
            infoEl.appendChild(actionEl);

            playerEl.appendChild(infoEl);

            // Bet display
            if (p.bet > 0) {
                var betEl = document.createElement('div');
                betEl.className = 'poker-player-bet';
                betEl.textContent = '$' + p.bet;
                betEl.style.left = pos.betLeft;
                betEl.style.top = pos.betTop;
                betEl.style.transform = 'translate(-50%, -50%)';
                this.feltEl.appendChild(betEl);
            }

            this.feltEl.appendChild(playerEl);
        }

        // Hide controls if not waiting for human
        if (!state.waitingForHuman) {
            this.controlsEl.innerHTML = '';
        }
    };

    /**
     * Show human player controls.
     */
    PokerRenderer.prototype._showControls = function(validActions) {
        this.controlsEl.innerHTML = '';
        var self = this;
        var actions = validActions.actions;

        // Fold button
        if (actions.indexOf('fold') !== -1) {
            var foldBtn = document.createElement('button');
            foldBtn.className = 'poker-btn-fold';
            foldBtn.textContent = 'Fold';
            foldBtn.addEventListener('click', function() {
                self._doAction({ type: 'fold' });
            });
            this.controlsEl.appendChild(foldBtn);
        }

        // Check button
        if (actions.indexOf('check') !== -1) {
            var checkBtn = document.createElement('button');
            checkBtn.className = 'poker-btn-check';
            checkBtn.textContent = 'Check';
            checkBtn.addEventListener('click', function() {
                self._doAction({ type: 'check' });
            });
            this.controlsEl.appendChild(checkBtn);
        }

        // Call button
        if (actions.indexOf('call') !== -1) {
            var callBtn = document.createElement('button');
            callBtn.className = 'poker-btn-call';
            callBtn.textContent = 'Call $' + validActions.callAmount;
            callBtn.addEventListener('click', function() {
                self._doAction({ type: 'call' });
            });
            this.controlsEl.appendChild(callBtn);
        }

        // Raise with slider
        if (actions.indexOf('raise') !== -1) {
            var raiseWrap = document.createElement('div');
            raiseWrap.className = 'poker-raise-slider';

            var slider = document.createElement('input');
            slider.type = 'range';
            slider.min = validActions.minRaise;
            slider.max = validActions.maxRaise;
            slider.value = validActions.minRaise;
            slider.step = Math.max(1, Math.floor((validActions.maxRaise - validActions.minRaise) / 20));

            var amountLabel = document.createElement('span');
            amountLabel.className = 'raise-amount';
            amountLabel.textContent = '$' + slider.value;

            slider.addEventListener('input', function() {
                amountLabel.textContent = '$' + slider.value;
            });

            var raiseBtn = document.createElement('button');
            raiseBtn.className = 'poker-btn-raise';
            raiseBtn.textContent = 'Raise';
            raiseBtn.addEventListener('click', function() {
                self._doAction({ type: 'raise', amount: parseInt(slider.value) });
            });

            raiseWrap.appendChild(slider);
            raiseWrap.appendChild(amountLabel);
            raiseWrap.appendChild(raiseBtn);
            this.controlsEl.appendChild(raiseWrap);
        }

        // All-in button
        if (actions.indexOf('allin') !== -1) {
            var allInBtn = document.createElement('button');
            allInBtn.className = 'poker-btn-allin';
            allInBtn.textContent = 'All In';
            allInBtn.addEventListener('click', function() {
                self._doAction({ type: 'allin' });
            });
            this.controlsEl.appendChild(allInBtn);
        }
    };

    /**
     * Send action to engine.
     */
    PokerRenderer.prototype._doAction = function(action) {
        this.controlsEl.innerHTML = '';
        if (this.engine) {
            this.engine.handlePlayerAction(action);
        }
        if (this._onAction) {
            this._onAction(action);
        }
    };

    /**
     * Set a custom action handler.
     */
    PokerRenderer.prototype.onAction = function(callback) {
        this._onAction = callback;
    };

    /**
     * Show hand result overlay.
     */
    PokerRenderer.prototype._showResult = function(results) {
        // Remove previous result
        if (this._resultEl && this._resultEl.parentNode) {
            this._resultEl.parentNode.removeChild(this._resultEl);
        }

        var el = document.createElement('div');
        el.className = 'poker-hand-result';

        if (results.winners && results.winners.length > 0) {
            var lines = [];
            for (var i = 0; i < results.winners.length; i++) {
                var w = results.winners[i];
                var text = w.player.name + ' wins $' + w.amount;
                if (w.hand) text += ' with ' + w.hand.name;
                lines.push(text);
            }
            el.innerHTML = lines.join('<br>');
        } else {
            el.textContent = 'Hand over';
        }

        this.feltEl.appendChild(el);
        this._resultEl = el;

        // New hand button
        var self = this;
        var btn = document.createElement('button');
        btn.className = 'poker-new-hand-btn';
        btn.textContent = 'Deal Next Hand';
        btn.addEventListener('click', function() {
            if (self._resultEl && self._resultEl.parentNode) {
                self._resultEl.parentNode.removeChild(self._resultEl);
            }
            if (self.engine) {
                self.engine.start();
            }
        });
        this.controlsEl.innerHTML = '';
        this.controlsEl.appendChild(btn);
    };

    /**
     * Show winner highlight.
     */
    PokerRenderer.prototype.showWinner = function(winner, hand) {
        // This is handled by _showResult; available for external use
        var el = document.createElement('div');
        el.className = 'poker-hand-result';
        el.innerHTML = winner.name + ' wins!';
        if (hand) {
            el.innerHTML += '<div class="winner-hand">' + hand.name + '</div>';
        }
        this.feltEl.appendChild(el);
    };

    /**
     * Animate dealing cards (placeholder - adds class for CSS animation).
     */
    PokerRenderer.prototype.animateDeal = function() {
        // Animation is handled via CSS transitions on render
    };

    /**
     * Animate chips moving to pot (placeholder).
     */
    PokerRenderer.prototype.animateChips = function(from, to) {
        // Animation is handled via CSS transitions on render
    };

    /**
     * Reveal hands at showdown.
     */
    PokerRenderer.prototype.showdownReveal = function(players) {
        // Handled by renderState when phase is SHOWDOWN
    };

    /**
     * Get human-readable phase name.
     */
    PokerRenderer.prototype._phaseName = function(phase) {
        var names = {
            'waiting': 'Waiting',
            'pre_flop': 'Pre-Flop',
            'flop': 'Flop',
            'turn': 'Turn',
            'river': 'River',
            'showdown': 'Showdown',
            'hand_over': 'Hand Over'
        };
        return names[phase] || phase;
    };

    // Export
    root.MJ.Poker.Renderer = {
        PokerRenderer: PokerRenderer,
        injectCSS: injectCSS
    };

})(typeof window !== 'undefined' ? window : global);
