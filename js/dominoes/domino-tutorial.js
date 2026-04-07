/**
 * domino-tutorial.js — Interactive Dominoes tutorial system.
 * Step-by-step guide for learning Dominoes basics.
 *
 * Exports: root.MJ.Dominoes.Tutorial
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Dominoes = root.MJ.Dominoes || {};

  var DOMINO_TUTORIAL_STEPS = [
    {
      title: 'Welcome to Dominoes!',
      content: 'Dominoes is a classic tile-matching game. Your goal is to match tiles end-to-end on a growing chain. Play all your tiles first to win!',
      highlight: null
    },
    {
      title: 'The Tiles',
      content: 'A standard set has 28 tiles. Each tile has two ends with 0 to 6 pips (dots). Every possible combination appears exactly once — from [0|0] (double blank) all the way up to [6|6].',
      highlight: null
    },
    {
      title: 'Dealing',
      content: 'Each player receives 7 tiles at the start. You can see your own tiles but not your opponents\'. The remaining tiles form the "boneyard" (in some variants, you draw from it).',
      highlight: '#domino-hand'
    },
    {
      title: 'Starting the Game',
      content: 'The player with the highest double goes first. That means [6|6] starts if anyone has it, then [5|5], and so on. If no one has a double, the player with the highest-value tile leads.',
      highlight: null
    },
    {
      title: 'Playing a Tile',
      content: 'On your turn, match one end of your tile to an open end of the chain. For example, if the chain end shows a 4, you can play any tile that has a 4 on one of its ends.',
      highlight: '#domino-board'
    },
    {
      title: 'Passing',
      content: 'If none of your tiles can match either open end of the chain, you must pass your turn. In draw variants, you draw from the boneyard until you can play or the boneyard is empty.',
      highlight: null
    },
    {
      title: 'Winning',
      content: 'The first player to play all their tiles wins the round! If no one can play (a "blocked" game), the player with the lowest total pip count on their remaining tiles wins.',
      highlight: null
    },
    {
      title: 'Strategy Tips',
      content: 'Play doubles early — they\'re harder to place later since both ends show the same number. Count which numbers have been played to anticipate what opponents hold. Try to block opponents by playing numbers they\'ve passed on.',
      highlight: null
    }
  ];

  // =========================================================================
  // DominoTutorial
  // =========================================================================

  class DominoTutorial {
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
      if (idx < 0 || idx >= DOMINO_TUTORIAL_STEPS.length) return;
      this.currentStep = idx;
      var step = DOMINO_TUTORIAL_STEPS[idx];

      if (!this.overlay) return;

      var titleEl = this.overlay.querySelector('.dom-tutorial-title');
      if (titleEl) titleEl.textContent = step.title;

      var contentEl = this.overlay.querySelector('.dom-tutorial-content');
      if (contentEl) contentEl.textContent = step.content;

      var counterEl = this.overlay.querySelector('.dom-tutorial-counter');
      if (counterEl) counterEl.textContent = 'Step ' + (idx + 1) + ' of ' + DOMINO_TUTORIAL_STEPS.length;

      var prevBtn = this.overlay.querySelector('.dom-tutorial-prev');
      if (prevBtn) prevBtn.disabled = idx === 0;

      var nextBtn = this.overlay.querySelector('.dom-tutorial-next');
      if (nextBtn) {
        nextBtn.textContent = idx === DOMINO_TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next \u2192';
      }

      this.clearHighlight();
      if (step.highlight) {
        var target = document.querySelector(step.highlight);
        if (target) {
          this.highlightEl = target;
          target.classList.add('dom-tutorial-highlight');
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }

    /**
     * Advance to the next step, or finish if on the last step.
     */
    next() {
      if (this.currentStep < DOMINO_TUTORIAL_STEPS.length - 1) {
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
        this.highlightEl.classList.remove('dom-tutorial-highlight');
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
      overlay.className = 'dom-tutorial-overlay';
      overlay.innerHTML =
        '<div class="dom-tutorial-panel">' +
          '<div class="dom-tutorial-header">' +
            '<span class="dom-tutorial-counter">Step 1 of ' + DOMINO_TUTORIAL_STEPS.length + '</span>' +
            '<button class="dom-tutorial-close" aria-label="Close tutorial">\u00d7</button>' +
          '</div>' +
          '<h3 class="dom-tutorial-title"></h3>' +
          '<p class="dom-tutorial-content"></p>' +
          '<div class="dom-tutorial-nav">' +
            '<button class="dom-tutorial-prev" disabled>\u2190 Back</button>' +
            '<button class="dom-tutorial-next">Next \u2192</button>' +
          '</div>' +
          '<button class="dom-tutorial-skip">Skip Tutorial</button>' +
        '</div>';

      var self = this;

      var closeBtn = overlay.querySelector('.dom-tutorial-close');
      if (closeBtn) closeBtn.addEventListener('click', function() { self.skip(); });

      var prevBtn = overlay.querySelector('.dom-tutorial-prev');
      if (prevBtn) prevBtn.addEventListener('click', function() { self.prev(); });

      var nextBtn = overlay.querySelector('.dom-tutorial-next');
      if (nextBtn) nextBtn.addEventListener('click', function() { self.next(); });

      var skipBtn = overlay.querySelector('.dom-tutorial-skip');
      if (skipBtn) skipBtn.addEventListener('click', function() { self.skip(); });

      var panel = overlay.querySelector('.dom-tutorial-panel');
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
    getTotalSteps() { return DOMINO_TUTORIAL_STEPS.length; }

    /** @returns {Array} */
    getSteps() { return DOMINO_TUTORIAL_STEPS.slice(); }
  }

  // =========================================================================
  // Export
  // =========================================================================

  root.MJ.Dominoes.Tutorial = Object.freeze({
    DominoTutorial: DominoTutorial,
    DOMINO_TUTORIAL_STEPS: DOMINO_TUTORIAL_STEPS
  });

  if (typeof console !== 'undefined') {
    console.log('[Dominoes] Tutorial module loaded');
  }
})(typeof window !== 'undefined' ? window : global);
