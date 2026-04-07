/**
 * poker-tutorial.js — Interactive poker tutorial system.
 * Step-by-step guide for learning Texas Hold'em poker basics.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Poker = root.MJ.Poker || {};

  const POKER_TUTORIAL_STEPS = [
    {
      title: 'Welcome to Poker!',
      content: 'Texas Hold\'em is a card game where you make the best 5-card hand from your 2 hole cards and 5 community cards.',
      highlight: null
    },
    {
      title: 'Your Hole Cards',
      content: 'You receive 2 private cards. Only you can see them. The strength of these cards determines your starting strategy.',
      highlight: '#poker-player-cards'
    },
    {
      title: 'The Community Cards',
      content: '5 shared cards are dealt face-up in three stages: the Flop (3 cards), the Turn (1 card), and the River (1 card).',
      highlight: '#poker-community'
    },
    {
      title: 'Betting Actions',
      content: 'Each round you can: FOLD (give up), CHECK (pass if no bet), CALL (match the bet), RAISE (increase the bet), or go ALL-IN.',
      highlight: '#poker-controls'
    },
    {
      title: 'Hand Rankings',
      content: 'From weakest to strongest: High Card, Pair, Two Pair, Three of a Kind, Straight, Flush, Full House, Four of a Kind, Straight Flush, Royal Flush.',
      highlight: null
    },
    {
      title: 'Blinds',
      content: 'Two players post forced bets (blinds) each hand. The Small Blind is half the Big Blind. This ensures there\'s always something to play for.',
      highlight: null
    },
    {
      title: 'Position Matters',
      content: 'Acting last (on the Button) is a huge advantage \u2014 you see what everyone else does before deciding. The dealer button rotates each hand.',
      highlight: null
    },
    {
      title: 'Reading Your Opponents',
      content: 'Watch betting patterns! Mei plays tight (strong hands only). Kenji is aggressive (bets a lot). Yuki is balanced and hard to read.',
      highlight: null
    },
    {
      title: 'Pot Odds',
      content: 'Compare the cost to call vs the pot size. If the pot is 100 and you need to call 20, you\'re getting 5:1 odds. Call if your chance of winning is better than 1 in 6.',
      highlight: null
    },
    {
      title: 'Ready to Play!',
      content: 'Start with tight play \u2014 only play strong starting hands. Fold the rest. As you learn, you can play more hands in good positions. Good luck!',
      highlight: null
    }
  ];

  class PokerTutorial {
    constructor() {
      this.overlay = null;
      this.currentStep = 0;
      this.active = false;
      this.highlightEl = null;
    }

    /**
     * Start the tutorial from the beginning.
     */
    start() {
      this.active = true;
      this.currentStep = 0;
      this.buildOverlay();
      this.showStep(0);
    }

    /**
     * Show a specific tutorial step.
     * @param {number} idx - Step index to display.
     */
    showStep(idx) {
      if (idx < 0 || idx >= POKER_TUTORIAL_STEPS.length) return;
      this.currentStep = idx;
      const step = POKER_TUTORIAL_STEPS[idx];

      if (!this.overlay) return;

      // Update title
      const titleEl = this.overlay.querySelector('.poker-tutorial-title');
      if (titleEl) titleEl.textContent = step.title;

      // Update content
      const contentEl = this.overlay.querySelector('.poker-tutorial-content');
      if (contentEl) contentEl.textContent = step.content;

      // Update step counter
      const counterEl = this.overlay.querySelector('.poker-tutorial-counter');
      if (counterEl) counterEl.textContent = `Step ${idx + 1} of ${POKER_TUTORIAL_STEPS.length}`;

      // Update button states
      const prevBtn = this.overlay.querySelector('.poker-tutorial-prev');
      if (prevBtn) prevBtn.disabled = idx === 0;

      const nextBtn = this.overlay.querySelector('.poker-tutorial-next');
      if (nextBtn) {
        nextBtn.textContent = idx === POKER_TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next \u2192';
      }

      // Handle highlight
      this.clearHighlight();
      if (step.highlight) {
        const target = document.querySelector(step.highlight);
        if (target) {
          this.highlightEl = target;
          target.classList.add('poker-tutorial-highlight');
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }

    /**
     * Advance to the next step, or finish if on the last step.
     */
    next() {
      if (this.currentStep < POKER_TUTORIAL_STEPS.length - 1) {
        this.showStep(++this.currentStep);
      } else {
        this.skip();
      }
    }

    /**
     * Go back to the previous step.
     */
    prev() {
      if (this.currentStep > 0) {
        this.showStep(--this.currentStep);
      }
    }

    /**
     * Skip / close the tutorial entirely.
     */
    skip() {
      this.active = false;
      this.clearHighlight();
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
    }

    /**
     * Remove any active highlight from a DOM element.
     */
    clearHighlight() {
      if (this.highlightEl) {
        this.highlightEl.classList.remove('poker-tutorial-highlight');
        this.highlightEl = null;
      }
    }

    /**
     * Build and attach the tutorial overlay panel to the DOM.
     */
    buildOverlay() {
      // Remove existing overlay if present
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }

      const overlay = document.createElement('div');
      overlay.className = 'poker-tutorial-overlay';
      overlay.innerHTML = `
        <div class="poker-tutorial-panel">
          <div class="poker-tutorial-header">
            <span class="poker-tutorial-counter">Step 1 of ${POKER_TUTORIAL_STEPS.length}</span>
            <button class="poker-tutorial-close" aria-label="Close tutorial">\u00d7</button>
          </div>
          <h3 class="poker-tutorial-title"></h3>
          <p class="poker-tutorial-content"></p>
          <div class="poker-tutorial-nav">
            <button class="poker-tutorial-prev" disabled>\u2190 Back</button>
            <button class="poker-tutorial-next">Next \u2192</button>
          </div>
          <button class="poker-tutorial-skip">Skip Tutorial</button>
        </div>
      `;

      // Bind event listeners
      const closeBtn = overlay.querySelector('.poker-tutorial-close');
      if (closeBtn) closeBtn.addEventListener('click', () => this.skip());

      const prevBtn = overlay.querySelector('.poker-tutorial-prev');
      if (prevBtn) prevBtn.addEventListener('click', () => this.prev());

      const nextBtn = overlay.querySelector('.poker-tutorial-next');
      if (nextBtn) nextBtn.addEventListener('click', () => this.next());

      const skipBtn = overlay.querySelector('.poker-tutorial-skip');
      if (skipBtn) skipBtn.addEventListener('click', () => this.skip());

      // Prevent clicks on the panel from closing the overlay
      const panel = overlay.querySelector('.poker-tutorial-panel');
      if (panel) panel.addEventListener('click', (e) => e.stopPropagation());

      // Click on backdrop closes tutorial
      overlay.addEventListener('click', () => this.skip());

      document.body.appendChild(overlay);
      this.overlay = overlay;
    }

    /**
     * Check whether the tutorial is currently active.
     * @returns {boolean}
     */
    isActive() {
      return this.active;
    }

    /**
     * Get the current step index.
     * @returns {number}
     */
    getCurrentStep() {
      return this.currentStep;
    }

    /**
     * Get the total number of tutorial steps.
     * @returns {number}
     */
    getTotalSteps() {
      return POKER_TUTORIAL_STEPS.length;
    }

    /**
     * Get all tutorial step data (for external rendering if needed).
     * @returns {Array}
     */
    getSteps() {
      return POKER_TUTORIAL_STEPS.slice();
    }
  }

  root.MJ.Poker.Tutorial = Object.freeze({ PokerTutorial, POKER_TUTORIAL_STEPS });
  if (typeof console !== 'undefined') console.log('[Poker] Tutorial module loaded');
})(typeof window !== 'undefined' ? window : global);
