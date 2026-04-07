/**
 * blackjack-tutorial.js — Interactive Blackjack tutorial system.
 * Step-by-step guide for learning Blackjack basics.
 *
 * Exports: root.MJ.Blackjack.Tutorial
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Blackjack = root.MJ.Blackjack || {};

  var BLACKJACK_TUTORIAL_STEPS = [
    {
      title: 'Welcome to Blackjack!',
      content: 'The goal is simple: beat the dealer by getting a hand value closer to 21 without going over. Go over 21 and you bust — instant loss!',
      highlight: null
    },
    {
      title: 'Card Values',
      content: 'Number cards (2-10) are worth their face value. Face cards (Jack, Queen, King) are all worth 10. Aces are special — they count as 1 or 11, whichever helps your hand more.',
      highlight: null
    },
    {
      title: 'The Deal',
      content: 'You receive 2 cards face up so everyone can see them. The dealer gets 1 card face up and 1 card face down (the "hole card"). Your decisions are based on what you can see.',
      highlight: '#blackjack-table'
    },
    {
      title: 'Hit',
      content: 'Choose "Hit" to take another card. This increases your total but risks going over 21 (busting). You can hit as many times as you want — just don\'t bust!',
      highlight: '#blackjack-controls'
    },
    {
      title: 'Stand',
      content: 'Choose "Stand" to keep your current total and end your turn. The dealer then plays their hand. Stand when you\'re happy with your total or the risk of busting is too high.',
      highlight: '#blackjack-controls'
    },
    {
      title: 'Double Down',
      content: 'Double your original bet and receive exactly one more card — no more, no less. Best used when you have a strong total (like 10 or 11) and the dealer shows a weak card.',
      highlight: null
    },
    {
      title: 'Split',
      content: 'If your first two cards are a pair (e.g., two 8s), you can split them into two separate hands. Each hand gets a new second card and you play them independently.',
      highlight: null
    },
    {
      title: 'Dealer Rules',
      content: 'The dealer has no choices — they follow strict rules. The dealer MUST hit on 16 or below and MUST stand on 17 or above. This predictability is your advantage!',
      highlight: null
    },
    {
      title: 'Winning & Payouts',
      content: 'Beat the dealer\'s total without busting and you win even money (1:1). A "Blackjack" — an Ace plus a 10-value card dealt as your first two cards — pays 3:2. If you and the dealer tie, it\'s a push (your bet is returned).',
      highlight: null
    },
    {
      title: 'Strategy Tips',
      content: 'Always stand on hard 17 or higher. Always split Aces and 8s. Never split 10s or 5s. Never take insurance — it\'s a sucker bet. Double down on 11 when the dealer shows 2-10. These basic rules will greatly improve your odds!',
      highlight: null
    }
  ];

  // =========================================================================
  // BlackjackTutorial
  // =========================================================================

  class BlackjackTutorial {
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
      if (idx < 0 || idx >= BLACKJACK_TUTORIAL_STEPS.length) return;
      this.currentStep = idx;
      var step = BLACKJACK_TUTORIAL_STEPS[idx];

      if (!this.overlay) return;

      var titleEl = this.overlay.querySelector('.bj-tutorial-title');
      if (titleEl) titleEl.textContent = step.title;

      var contentEl = this.overlay.querySelector('.bj-tutorial-content');
      if (contentEl) contentEl.textContent = step.content;

      var counterEl = this.overlay.querySelector('.bj-tutorial-counter');
      if (counterEl) counterEl.textContent = 'Step ' + (idx + 1) + ' of ' + BLACKJACK_TUTORIAL_STEPS.length;

      var prevBtn = this.overlay.querySelector('.bj-tutorial-prev');
      if (prevBtn) prevBtn.disabled = idx === 0;

      var nextBtn = this.overlay.querySelector('.bj-tutorial-next');
      if (nextBtn) {
        nextBtn.textContent = idx === BLACKJACK_TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next \u2192';
      }

      this.clearHighlight();
      if (step.highlight) {
        var target = document.querySelector(step.highlight);
        if (target) {
          this.highlightEl = target;
          target.classList.add('bj-tutorial-highlight');
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }

    /**
     * Advance to the next step, or finish if on the last step.
     */
    next() {
      if (this.currentStep < BLACKJACK_TUTORIAL_STEPS.length - 1) {
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
        this.highlightEl.classList.remove('bj-tutorial-highlight');
        this.highlightEl = null;
      }
    }

    /**
     * Build and attach the tutorial overlay panel to the DOM.
     */
    buildOverlay() {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }

      var overlay = document.createElement('div');
      overlay.className = 'bj-tutorial-overlay';
      overlay.innerHTML =
        '<div class="bj-tutorial-panel">' +
          '<div class="bj-tutorial-header">' +
            '<span class="bj-tutorial-counter">Step 1 of ' + BLACKJACK_TUTORIAL_STEPS.length + '</span>' +
            '<button class="bj-tutorial-close" aria-label="Close tutorial">\u00d7</button>' +
          '</div>' +
          '<h3 class="bj-tutorial-title"></h3>' +
          '<p class="bj-tutorial-content"></p>' +
          '<div class="bj-tutorial-nav">' +
            '<button class="bj-tutorial-prev" disabled>\u2190 Back</button>' +
            '<button class="bj-tutorial-next">Next \u2192</button>' +
          '</div>' +
          '<button class="bj-tutorial-skip">Skip Tutorial</button>' +
        '</div>';

      var self = this;

      var closeBtn = overlay.querySelector('.bj-tutorial-close');
      if (closeBtn) closeBtn.addEventListener('click', function() { self.skip(); });

      var prevBtn = overlay.querySelector('.bj-tutorial-prev');
      if (prevBtn) prevBtn.addEventListener('click', function() { self.prev(); });

      var nextBtn = overlay.querySelector('.bj-tutorial-next');
      if (nextBtn) nextBtn.addEventListener('click', function() { self.next(); });

      var skipBtn = overlay.querySelector('.bj-tutorial-skip');
      if (skipBtn) skipBtn.addEventListener('click', function() { self.skip(); });

      var panel = overlay.querySelector('.bj-tutorial-panel');
      if (panel) panel.addEventListener('click', function(e) { e.stopPropagation(); });

      overlay.addEventListener('click', function() { self.skip(); });

      document.body.appendChild(overlay);
      this.overlay = overlay;
    }

    /** @returns {boolean} */
    isActive() { return this.active; }

    /** @returns {number} */
    getCurrentStep() { return this.currentStep; }

    /** @returns {number} */
    getTotalSteps() { return BLACKJACK_TUTORIAL_STEPS.length; }

    /** @returns {Array} */
    getSteps() { return BLACKJACK_TUTORIAL_STEPS.slice(); }
  }

  // =========================================================================
  // Export
  // =========================================================================

  root.MJ.Blackjack.Tutorial = Object.freeze({
    BlackjackTutorial: BlackjackTutorial,
    BLACKJACK_TUTORIAL_STEPS: BLACKJACK_TUTORIAL_STEPS
  });

  if (typeof console !== 'undefined') {
    console.log('[Blackjack] Tutorial module loaded');
  }
})(typeof window !== 'undefined' ? window : global);
