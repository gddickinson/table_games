/**
 * tutorial.js — Tutorial and help system
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';

  let tutorialOverlay = null;
  let helpOverlay = null;
  let currentStep = 0;
  let active = false;

  const TUTORIAL_STEPS = [
    {
      title: 'Welcome to Mahjong!',
      content: `
        <p>Mahjong is a classic Chinese tile game for <strong>4 players</strong>.
        You play as the <strong>human seat (bottom)</strong>, and three AI opponents fill the other seats.</p>
        <p>The goal is to be the first to complete a <strong>winning hand</strong> of 14 tiles.</p>
        <p>Let's learn how to play!</p>
      `,
      highlight: null
    },
    {
      title: 'The Tiles',
      content: `
        <p>There are <strong>136 tiles</strong> in total — 4 copies each of 34 unique tiles:</p>
        <div class="tutorial-tiles">
          <div class="tile-group">
            <h4>🀇 Characters (萬) 1-9</h4>
            <p>Red-labeled number tiles representing "ten thousands"</p>
          </div>
          <div class="tile-group">
            <h4>🀐 Bamboo (竹) 1-9</h4>
            <p>Green-labeled tiles depicting bamboo sticks</p>
          </div>
          <div class="tile-group">
            <h4>🀙 Circles (筒) 1-9</h4>
            <p>Blue-labeled tiles showing circular coins</p>
          </div>
          <div class="tile-group">
            <h4>🀀 Winds — East, South, West, North</h4>
            <p>Four wind tiles, each appearing 4 times</p>
          </div>
          <div class="tile-group">
            <h4>🀄 Dragons — Red (中), Green (發), White (白)</h4>
            <p>Three dragon tiles with special scoring power</p>
          </div>
        </div>
      `,
      highlight: null
    },
    {
      title: 'Winning Hand Structure',
      content: `
        <p>A winning hand has <strong>14 tiles</strong> arranged as:</p>
        <div class="tutorial-formula">
          <span class="formula-part">4 Melds</span>
          <span class="formula-plus">+</span>
          <span class="formula-part">1 Pair</span>
          <span class="formula-equals">=</span>
          <span class="formula-part">Win!</span>
        </div>
        <p><strong>Melds</strong> (groups of 3) come in two types:</p>
        <ul>
          <li><strong>Chow</strong> — 3 consecutive tiles of the same suit (e.g., 🀇🀈🀉)</li>
          <li><strong>Pong</strong> — 3 identical tiles (e.g., 🀄🀄🀄)</li>
        </ul>
        <p>A <strong>Kong</strong> (4 identical tiles) counts as a special meld and earns bonus points.</p>
        <p>A <strong>Pair</strong> is 2 identical tiles (e.g., 🀀🀀).</p>
      `,
      highlight: null
    },
    {
      title: 'Game Flow',
      content: `
        <p>Each turn follows this pattern:</p>
        <ol>
          <li><strong>Draw</strong> — Take one tile from the wall</li>
          <li><strong>Check</strong> — Do you have a winning hand? Any kongs to declare?</li>
          <li><strong>Discard</strong> — Choose one tile to throw away</li>
          <li><strong>Claims</strong> — Other players may claim your discard</li>
        </ol>
        <p>Play continues counter-clockwise (East → South → West → North).</p>
        <p>The round ends when someone wins or the wall runs out of tiles.</p>
      `,
      highlight: null
    },
    {
      title: 'Claiming Discards',
      content: `
        <p>When another player discards, you may <strong>claim</strong> it:</p>
        <ul>
          <li><strong>Win</strong> — If the tile completes your winning hand (highest priority)</li>
          <li><strong>Kong</strong> — If you have 3 of that tile in your hand</li>
          <li><strong>Pong</strong> — If you have 2 of that tile (claim from any player)</li>
          <li><strong>Chow</strong> — If it completes a sequence (only from the player to your left)</li>
        </ul>
        <p>A <strong>claim dialog</strong> will appear when you can claim. Click the action or "Pass".</p>
        <p>⚠️ Claimed melds become <strong>open</strong> (visible to all), which may reduce your score.</p>
      `,
      highlight: '.claim-dialog'
    },
    {
      title: 'Controls — Mouse',
      content: `
        <p>Your tiles appear at the <strong>bottom</strong> of the screen:</p>
        <ul>
          <li><strong>Click once</strong> on a tile to select it (it lifts up)</li>
          <li><strong>Click again</strong> (or click another selected tile) to discard it</li>
          <li><strong>Double-click</strong> a tile for instant discard</li>
        </ul>
        <p>When a claim dialog appears, click the action button you want.</p>
        <p>The <strong>most recently drawn tile</strong> is highlighted with a glow.</p>
      `,
      highlight: '#hand-bottom'
    },
    {
      title: 'Controls — Keyboard',
      content: `
        <table class="controls-table">
          <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>Navigate through your tiles</td></tr>
          <tr><td><kbd>Enter</kbd> / <kbd>Space</kbd></td><td>Discard selected tile</td></tr>
          <tr><td><kbd>1</kbd>–<kbd>0</kbd></td><td>Quick-select tile by position</td></tr>
          <tr><td><kbd>S</kbd></td><td>Sort your hand</td></tr>
          <tr><td><kbd>W</kbd></td><td>Declare win (when available)</td></tr>
          <tr><td><kbd>A</kbd></td><td>Toggle auto-play (AI plays for you)</td></tr>
          <tr><td><kbd>H</kbd> / <kbd>?</kbd></td><td>Show help</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Close dialogs / deselect</td></tr>
        </table>
      `,
      highlight: null
    },
    {
      title: 'Scoring Basics',
      content: `
        <p>Points are awarded based on the patterns in your winning hand:</p>
        <table class="scoring-table">
          <tr><td>Chicken Hand (basic win)</td><td>1 pt</td></tr>
          <tr><td>All Sequences (Ping Hu)</td><td>5 pts</td></tr>
          <tr><td>Self Drawn (Zi Mo)</td><td>5 pts</td></tr>
          <tr><td>Fully Concealed</td><td>5 pts</td></tr>
          <tr><td>Dragon Pong</td><td>10 pts each</td></tr>
          <tr><td>Wind Pong (seat/round)</td><td>10 pts each</td></tr>
          <tr><td>Mixed One Suit</td><td>25 pts</td></tr>
          <tr><td>All Triplets</td><td>30 pts</td></tr>
          <tr><td>Pure One Suit</td><td>50 pts</td></tr>
          <tr><td>All Honors</td><td>80 pts</td></tr>
          <tr><td>Big Three Dragons</td><td>88 pts</td></tr>
        </table>
      `,
      highlight: null
    },
    {
      title: 'The Board Layout',
      content: `
        <p>Here's what you see on screen:</p>
        <ul>
          <li><strong>Top bar</strong> — Round info, wall count, and control buttons</li>
          <li><strong>Top/Left/Right</strong> — AI opponents' face-down tiles and open melds</li>
          <li><strong>Center</strong> — Discard pool (tiles thrown by each player)</li>
          <li><strong>Bottom</strong> — Your hand (face-up) and melds</li>
          <li><strong>Status bar</strong> — Shows how close you are to winning (shanten count)</li>
          <li><strong>Game Log</strong> — Click to expand; shows all game actions</li>
        </ul>
      `,
      highlight: '#play-area'
    },
    {
      title: 'Strategy Tips',
      content: `
        <ul>
          <li>🎯 <strong>Focus on one or two suits</strong> — going for a "flush" scores big</li>
          <li>🔒 <strong>Keep your hand concealed</strong> — fewer claims = higher score potential</li>
          <li>👀 <strong>Watch the discards</strong> — if 3 of a tile are out, no one can pong/kong it</li>
          <li>⚡ <strong>Claim pongs over chows</strong> — pongs are more flexible and score more</li>
          <li>🐉 <strong>Value dragon pairs</strong> — dragon pongs are easy bonus points</li>
          <li>🎲 <strong>Discard isolated honor tiles early</strong> — they can't form sequences</li>
          <li>🛡️ <strong>In late game, play safe</strong> — discard tiles others have already thrown</li>
        </ul>
      `,
      highlight: null
    },
    {
      title: 'Ready to Play!',
      content: `
        <p>You now know the basics of Mahjong! Here's a quick summary:</p>
        <ol>
          <li>Draw a tile each turn, then discard one</li>
          <li>Build 4 melds + 1 pair to win</li>
          <li>Claim opponents' discards to speed up your hand</li>
          <li>Aim for scoring patterns for more points</li>
        </ol>
        <p>Use <strong>Auto Play (A key)</strong> to watch the AI play, or jump right in!</p>
        <p>Press <strong>H</strong> or <strong>?</strong> anytime for a quick reference.</p>
        <p><em>Good luck and have fun!</em> 🀄</p>
      `,
      highlight: null
    }
  ];

  const HELP_SECTIONS = [
    {
      title: 'Quick Controls',
      content: `Click tile → select → click again or Enter to discard.
Arrow keys to navigate. S to sort. W to declare win.
A for auto-play. H/? for this help.`
    },
    {
      title: 'Melds',
      content: `Chow = 3 in sequence (same suit). Pong = 3 identical.
Kong = 4 identical. Pair = 2 identical.
Win = 4 melds + 1 pair.`
    },
    {
      title: 'Claiming Priority',
      content: `Win > Kong > Pong > Chow.
Chow only from the player on your left.
Pong/Kong from any player.`
    },
    {
      title: 'Shanten Count',
      content: `Shows below your hand:
"2 away" = need 2 more useful tiles.
"Tenpai" = one tile from winning!
"WINNING HAND" = declare win!`
    }
  ];

  function init() {
    createTutorialOverlay();
    createHelpOverlay();
  }

  function createTutorialOverlay() {
    tutorialOverlay = document.createElement('div');
    tutorialOverlay.id = 'tutorial-overlay';
    tutorialOverlay.className = 'tutorial-overlay hidden';
    tutorialOverlay.innerHTML = `
      <div class="tutorial-panel">
        <div class="tutorial-header">
          <span id="tutorial-step-counter" class="step-counter">1 / ${TUTORIAL_STEPS.length}</span>
          <button id="tutorial-close" class="btn btn-sm">✕</button>
        </div>
        <h3 id="tutorial-title"></h3>
        <div id="tutorial-content" class="tutorial-body"></div>
        <div class="tutorial-nav">
          <button id="tutorial-prev" class="btn">← Previous</button>
          <button id="tutorial-skip" class="btn">Skip Tutorial</button>
          <button id="tutorial-next" class="btn btn-primary">Next →</button>
        </div>
      </div>
    `;
    document.body.appendChild(tutorialOverlay);

    document.getElementById('tutorial-prev').addEventListener('click', prevStep);
    document.getElementById('tutorial-next').addEventListener('click', nextStep);
    document.getElementById('tutorial-skip').addEventListener('click', skip);
    document.getElementById('tutorial-close').addEventListener('click', skip);
  }

  function createHelpOverlay() {
    helpOverlay = document.createElement('div');
    helpOverlay.id = 'help-overlay';
    helpOverlay.className = 'help-overlay hidden';

    let html = `<div class="help-panel">`;
    html += `<div class="help-header"><h3>Mahjong Quick Reference</h3>`;
    html += `<button id="help-close" class="btn btn-sm">✕</button></div>`;
    for (const section of HELP_SECTIONS) {
      html += `<div class="help-section">`;
      html += `<h4>${section.title}</h4>`;
      html += `<pre>${section.content}</pre>`;
      html += `</div>`;
    }
    html += `<div class="help-footer">`;
    html += `<button id="help-tutorial-btn" class="btn">Full Tutorial</button>`;
    html += `<button id="help-close-btn" class="btn">Close (Esc)</button>`;
    html += `</div></div>`;

    helpOverlay.innerHTML = html;
    document.body.appendChild(helpOverlay);

    document.getElementById('help-close').addEventListener('click', hideHelp);
    document.getElementById('help-close-btn').addEventListener('click', hideHelp);
    document.getElementById('help-tutorial-btn').addEventListener('click', () => {
      hideHelp();
      start();
    });
  }

  function start() {
    active = true;
    currentStep = 0;
    showStep(0);
    tutorialOverlay.classList.remove('hidden');
  }

  function showStep(index) {
    currentStep = index;
    const step = TUTORIAL_STEPS[index];
    if (!step) return;

    document.getElementById('tutorial-title').textContent = step.title;
    document.getElementById('tutorial-content').innerHTML = step.content;
    document.getElementById('tutorial-step-counter').textContent =
      `${index + 1} / ${TUTORIAL_STEPS.length}`;

    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === TUTORIAL_STEPS.length - 1 ? 'Finish ✓' : 'Next →';

    // Highlight element if specified
    clearHighlights();
    if (step.highlight) {
      highlightElement(step.highlight);
    }
  }

  function nextStep() {
    if (currentStep >= TUTORIAL_STEPS.length - 1) {
      skip();
      return;
    }
    showStep(currentStep + 1);
  }

  function prevStep() {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  }

  function skip() {
    active = false;
    clearHighlights();
    tutorialOverlay.classList.add('hidden');
  }

  function isActive() {
    return active;
  }

  function showHelp() {
    helpOverlay.classList.remove('hidden');
  }

  function hideHelp() {
    helpOverlay.classList.add('hidden');
  }

  function highlightElement(selector) {
    const el = document.querySelector(selector);
    if (el) {
      el.classList.add('tutorial-highlight');
    }
  }

  function clearHighlights() {
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  }

  window.MJ.Tutorial = Object.freeze({
    init, start, showStep, nextStep, prevStep, skip, isActive,
    showHelp, hideHelp, highlightElement,
    TUTORIAL_STEPS, HELP_SECTIONS
  });

  console.log('[Mahjong] Tutorial module loaded');
})();
