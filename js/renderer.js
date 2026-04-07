/**
 * renderer.js — Board and UI rendering
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const { GAME_PHASES } = window.MJ.Constants;
  const Tile = window.MJ.Tile;
  const Wall = window.MJ.Wall;
  const Hand = window.MJ.Hand;
  const Player = window.MJ.Player;
  const GS = window.MJ.GameState;
  const TR = window.MJ.TileRenderer;

  let container = null;
  let elements = {};
  let lastRenderedState = null;

  function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) {
      container = document.body;
    }
    buildDOM();
    window.addEventListener('resize', updateLayout);
  }

  function buildDOM() {
    container.innerHTML = `
      <div id="game-board" class="game-board">
        <div id="top-bar" class="top-bar">
          <div class="game-info">
            <span id="round-info" class="round-info">Round 1 — East Wind</span>
            <span id="wall-count" class="wall-count">Tiles: 136</span>
            <span id="phase-info" class="phase-info"></span>
          </div>
          <div class="controls">
            <button id="btn-new-game" class="btn" title="New Game">New Game</button>
            <button id="btn-auto-play" class="btn" title="Toggle AI Auto-Play">Auto Play</button>
            <button id="btn-sort" class="btn" title="Sort Hand">Sort</button>
            <button id="btn-tutorial" class="btn" title="Tutorial">Tutorial</button>
            <button id="btn-help" class="btn" title="Help">?</button>
            <button id="btn-sound" class="btn btn-icon" title="Toggle Sound">🔊</button>
          </div>
        </div>

        <div id="play-area" class="play-area">
          <!-- Opponent areas -->
          <div id="player-top" class="player-area player-top">
            <div class="player-label"><span id="label-top">W (AI)</span><span id="score-top" class="score">0</span></div>
            <div id="hand-top" class="hand-row opponent-hand"></div>
            <div id="melds-top" class="meld-row"></div>
          </div>

          <div id="player-left" class="player-area player-left">
            <div class="player-label"><span id="label-left">N (AI)</span><span id="score-left" class="score">0</span></div>
            <div id="hand-left" class="hand-col opponent-hand"></div>
            <div id="melds-left" class="meld-row"></div>
          </div>

          <div id="player-right" class="player-area player-right">
            <div class="player-label"><span id="label-right">S (AI)</span><span id="score-right" class="score">0</span></div>
            <div id="hand-right" class="hand-col opponent-hand"></div>
            <div id="melds-right" class="meld-row"></div>
          </div>

          <!-- Center area with discards -->
          <div id="center-area" class="center-area">
            <div id="discard-pool" class="discard-pool">
              <div id="discards-0" class="discard-section"></div>
              <div id="discards-1" class="discard-section"></div>
              <div id="discards-2" class="discard-section"></div>
              <div id="discards-3" class="discard-section"></div>
            </div>
            <div id="turn-indicator" class="turn-indicator"></div>
          </div>

          <!-- Human player area -->
          <div id="player-bottom" class="player-area player-bottom">
            <div id="melds-bottom" class="meld-row"></div>
            <div id="hand-bottom" class="hand-row human-hand"></div>
            <div class="player-label">
              <span id="label-bottom">E (You)</span>
              <span id="score-bottom" class="score">0</span>
              <span id="shanten-info" class="shanten-info"></span>
            </div>
          </div>
        </div>

        <!-- Action buttons for human -->
        <div id="action-bar" class="action-bar hidden">
          <div id="action-buttons" class="action-buttons"></div>
        </div>

        <!-- Claim dialog -->
        <div id="claim-dialog" class="claim-dialog hidden">
          <div class="claim-content">
            <div id="claim-tile" class="claim-tile"></div>
            <div id="claim-text" class="claim-text">Claim this tile?</div>
            <div id="claim-buttons" class="claim-buttons"></div>
          </div>
        </div>

        <!-- Toast messages -->
        <div id="toast-container" class="toast-container"></div>

        <!-- Game log -->
        <div id="game-log" class="game-log">
          <div id="log-toggle" class="log-toggle">Game Log ▼</div>
          <div id="log-content" class="log-content"></div>
        </div>

        <!-- Win/Draw overlay -->
        <div id="overlay" class="overlay hidden">
          <div id="overlay-content" class="overlay-content"></div>
        </div>
      </div>
    `;

    cacheElements();
    setupLogToggle();
  }

  function cacheElements() {
    elements = {
      roundInfo: document.getElementById('round-info'),
      wallCount: document.getElementById('wall-count'),
      phaseInfo: document.getElementById('phase-info'),
      handTop: document.getElementById('hand-top'),
      handLeft: document.getElementById('hand-left'),
      handRight: document.getElementById('hand-right'),
      handBottom: document.getElementById('hand-bottom'),
      meldsTop: document.getElementById('melds-top'),
      meldsLeft: document.getElementById('melds-left'),
      meldsRight: document.getElementById('melds-right'),
      meldsBottom: document.getElementById('melds-bottom'),
      discards: [
        document.getElementById('discards-0'),
        document.getElementById('discards-1'),
        document.getElementById('discards-2'),
        document.getElementById('discards-3')
      ],
      turnIndicator: document.getElementById('turn-indicator'),
      actionBar: document.getElementById('action-bar'),
      actionButtons: document.getElementById('action-buttons'),
      claimDialog: document.getElementById('claim-dialog'),
      claimTile: document.getElementById('claim-tile'),
      claimText: document.getElementById('claim-text'),
      claimButtons: document.getElementById('claim-buttons'),
      toastContainer: document.getElementById('toast-container'),
      logContent: document.getElementById('log-content'),
      overlay: document.getElementById('overlay'),
      overlayContent: document.getElementById('overlay-content'),
      shantenInfo: document.getElementById('shanten-info'),
      labelTop: document.getElementById('label-top'),
      labelLeft: document.getElementById('label-left'),
      labelRight: document.getElementById('label-right'),
      labelBottom: document.getElementById('label-bottom'),
      scoreTop: document.getElementById('score-top'),
      scoreLeft: document.getElementById('score-left'),
      scoreRight: document.getElementById('score-right'),
      scoreBottom: document.getElementById('score-bottom')
    };
  }

  function setupLogToggle() {
    const toggle = document.getElementById('log-toggle');
    const content = document.getElementById('log-content');
    if (toggle) {
      toggle.addEventListener('click', () => {
        content.classList.toggle('expanded');
        toggle.textContent = content.classList.contains('expanded') ? 'Game Log ▲' : 'Game Log ▼';
      });
    }
  }

  // Map seat index to display position
  // Human (seat 0) = bottom, then clockwise
  function getPositionForSeat(seatIndex, humanSeat) {
    const offset = (seatIndex - humanSeat + 4) % 4;
    return ['bottom', 'right', 'top', 'left'][offset];
  }

  function renderBoard(state) {
    if (!elements.roundInfo) return;
    lastRenderedState = state;
    const humanSeat = 0;

    // Update info bar
    elements.roundInfo.textContent =
      `Round ${state.roundNumber} — ${capitalize(state.roundWind)} Wind`;
    elements.wallCount.textContent =
      `Tiles: ${state.wall ? Wall.remaining(state.wall) : 0}`;
    elements.phaseInfo.textContent = formatPhase(state.phase);

    // Render each player
    for (let i = 0; i < 4; i++) {
      const pos = getPositionForSeat(i, humanSeat);
      const player = state.players[i];
      renderPlayerArea(player, pos, state);
    }

    // Render discards
    renderDiscards(state);

    // Turn indicator + dora
    renderTurnIndicator(state);
    renderDoraIndicators(state);

    // Shanten, furiten, scoring preview for human
    renderShanten(state);

    // Hand path display
    renderHandPath(state);

    // Action bar
    renderActionBar(state);
  }

  const windKanji = { E: '東', S: '南', W: '西', N: '北' };

  function getAIName(seatIndex) {
    const names = { 1: 'Mei', 2: 'Kenji', 3: 'Yuki' };
    return names[seatIndex] || 'AI';
  }

  function renderPlayerArea(player, position, state) {
    const isHuman = player.isHuman;
    const handEl = elements[`hand${capitalize(position)}`];
    const meldsEl = elements[`melds${capitalize(position)}`];
    const labelEl = elements[`label${capitalize(position)}`];
    const scoreEl = elements[`score${capitalize(position)}`];

    if (!handEl) return;

    // Label and score
    const windLabel = Player.getWindLabel(player);
    const kanji = windKanji[windLabel] || '';
    const name = isHuman ? `${kanji}${windLabel} (You)` : `${kanji}${windLabel} (${getAIName(player.seatIndex)})`;
    const isCurrentTurn = state.currentPlayerIndex === player.seatIndex;
    labelEl.textContent = name;
    labelEl.classList.toggle('active-turn', isCurrentTurn);
    scoreEl.textContent = player.score;

    // Clear
    handEl.innerHTML = '';
    meldsEl.innerHTML = '';

    // Render hand tiles
    const concealed = isHuman ? player.hand.concealed : player.hand.concealed;
    for (let ti = 0; ti < concealed.length; ti++) {
      const tile = concealed[ti];
      const tileEl = TR.createTileElement(tile, {
        faceDown: !isHuman,
        clickable: isHuman && state.phase === GAME_PHASES.DISCARD && isCurrentTurn,
        highlighted: isHuman && player.hand.drawnTile &&
                     Tile.getId(tile) === Tile.getId(player.hand.drawnTile) &&
                     tile.uid === player.hand.drawnTile.uid
      });
      tileEl.style.animationDelay = `${ti * 30}ms`;
      handEl.appendChild(tileEl);
    }

    // Render melds
    for (const meld of player.hand.melds) {
      const meldEl = TR.createMeldElement(meld);
      meldsEl.appendChild(meldEl);
    }
  }

  function renderDiscards(state) {
    for (let i = 0; i < 4; i++) {
      const el = elements.discards[i];
      if (!el) continue;
      el.innerHTML = '';
      const discards = state.players[i].discards;
      for (const tile of discards) {
        const tileEl = TR.createDiscardElement(tile);
        el.appendChild(tileEl);
      }
    }
  }

  function renderTurnIndicator(state) {
    if (!elements.turnIndicator) return;
    const current = GS.getCurrentPlayer(state);
    const windLabel = Player.getWindLabel(current);
    const name = current.isHuman ? 'Your' : `${windLabel}'s`;
    elements.turnIndicator.textContent = `${name} turn`;
    elements.turnIndicator.className = `turn-indicator seat-${current.seatIndex}`;
  }

  function renderDoraIndicators(state) {
    // Show dora indicator tile(s) near the turn indicator
    const turnEl = elements.turnIndicator;
    if (!turnEl) return;
    let doraEl = document.getElementById('dora-indicators');
    if (!doraEl) {
      doraEl = document.createElement('div');
      doraEl.id = 'dora-indicators';
      doraEl.className = 'dora-indicators';
      doraEl.style.cssText = 'display:flex;gap:4px;justify-content:center;margin-top:4px;align-items:center;';
      turnEl.parentNode.insertBefore(doraEl, turnEl.nextSibling);
    }
    doraEl.innerHTML = '';
    const indicators = state.doraIndicators || (state.wall ? Wall.getDoraIndicators(state.wall) : []);
    if (indicators.length > 0) {
      const label = document.createElement('span');
      label.textContent = 'Dora: ';
      label.style.cssText = 'font-size:11px;color:#ccc;margin-right:4px;';
      doraEl.appendChild(label);
      for (const tile of indicators) {
        const tileEl = TR.createTileElement(tile, { small: true });
        tileEl.style.cssText = 'width:28px;height:38px;font-size:18px;display:inline-flex;align-items:center;justify-content:center;';
        doraEl.appendChild(tileEl);
      }
    }
  }

  function renderHandPath(state) {
    const human = GS.getHumanPlayer(state);
    if (!human || human.hand.concealed.length === 0) return;
    if (!window.MJ.HandPath) return;

    let pathEl = document.getElementById('hand-path-display');
    if (!pathEl) {
      pathEl = document.createElement('div');
      pathEl.id = 'hand-path-display';
      pathEl.className = 'hand-path-display';
      pathEl.style.cssText = 'font-size:11px;color:var(--accent,#4caf50);text-align:center;margin-top:2px;min-height:14px;';
      const playerBottom = document.getElementById('player-bottom');
      if (playerBottom) playerBottom.appendChild(pathEl);
    }

    try {
      const paths = window.MJ.HandPath.analyzePath(human, state);
      if (paths && paths.length > 0) {
        const topPaths = paths.slice(0, 2);
        pathEl.textContent = topPaths.map(p =>
          `${p.description || p.name || 'Path'}: ${p.shanten != null ? p.shanten + ' away' : ''} ${p.ukeire ? '(' + p.ukeire + ' tiles)' : ''}`
        ).join(' | ');
      } else {
        pathEl.textContent = '';
      }
    } catch (e) {
      pathEl.textContent = '';
    }
  }

  function renderShanten(state) {
    if (!elements.shantenInfo) return;
    const human = GS.getHumanPlayer(state);
    if (!human || human.hand.concealed.length === 0) {
      elements.shantenInfo.textContent = '';
      return;
    }
    const shanten = Hand.calculateShanten(human.hand);
    let text = '';
    let cls = 'shanten-info';

    if (shanten < 0) {
      text = '✓ WINNING HAND!';
      cls = 'shanten-info winning';
    } else if (shanten === 0) {
      text = '♦ Tenpai (ready!)';
      cls = 'shanten-info tenpai';
      // Scoring preview
      if (window.MJ.ScoringPreview) {
        try {
          const summary = window.MJ.ScoringPreview.getPreviewSummary(human, state);
          if (summary && summary !== 'Not tenpai') text += ' | ' + summary;
        } catch (e) {}
      }
    } else {
      text = `${shanten} away`;
    }

    // Furiten check
    if (window.MJ.Furiten) {
      try {
        const f = window.MJ.Furiten.checkFuriten(human, state);
        if (f && f.isFuriten) {
          text += ' | FURITEN!';
          cls += ' furiten';
        }
      } catch (e) {}
    }

    elements.shantenInfo.textContent = text;
    elements.shantenInfo.className = cls;
  }

  function renderActionBar(state) {
    if (!elements.actionBar) return;
    const human = GS.getHumanPlayer(state);
    if (!human) return;
    const isMyTurn = state.currentPlayerIndex === human.seatIndex;
    const isDiscard = state.phase === GAME_PHASES.DISCARD;

    elements.actionButtons.innerHTML = '';

    if (isMyTurn && isDiscard) {
      // Check for win
      if (Hand.isWinningHand(human.hand)) {
        addActionButton('Declare Win! 🏆', 'btn-win', () => {
          window.MJ.GameFlow.humanDeclareWin(state);
        });
      }
      // Check for kong
      const kongs = Hand.findConcealedKongs(human.hand);
      if (kongs.length > 0) {
        addActionButton('Declare Kong', 'btn-kong', () => {
          window.MJ.GameFlow.humanDeclareKong(state);
        });
      }

      // Tile sorting options
      addActionButton('By Suit', 'btn-sort-suit', () => {
        human.hand.concealed = Tile.sortTiles(human.hand.concealed);
        GS.notifyChange(state);
      });
      addActionButton('By Value', 'btn-sort-value', () => {
        human.hand.concealed = human.hand.concealed.slice().sort((a, b) => {
          if (a.rank !== b.rank) return a.rank - b.rank;
          const suitOrder = { characters: 0, bamboo: 1, circles: 2, wind: 3, dragon: 4, flower: 5 };
          return (suitOrder[a.suit] || 0) - (suitOrder[b.suit] || 0);
        });
        GS.notifyChange(state);
      });

      elements.actionBar.classList.remove('hidden');
    } else {
      elements.actionBar.classList.add('hidden');
    }
  }

  function addActionButton(text, cls, onClick) {
    const btn = document.createElement('button');
    btn.className = `btn action-btn ${cls}`;
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    elements.actionButtons.appendChild(btn);
  }

  function describeClaimMeld(opt, tile, state) {
    const tileName = Tile.getName(tile);
    const human = GS.getHumanPlayer(state);
    if (!human) return capitalize(opt);
    if (opt === 'pong') {
      return `Pong of ${tileName}`;
    } else if (opt === 'kong') {
      return `Kong of ${tileName}`;
    } else if (opt === 'chow') {
      const chows = Hand.findChows(human.hand, tile);
      if (chows.length > 0) {
        const sorted = Tile.sortTiles(chows[0]);
        return `Chow: ${sorted.map(t => Tile.getName(t)).join('-')}`;
      }
      return `Chow with ${tileName}`;
    } else if (opt === 'win') {
      return `Win with ${tileName}!`;
    }
    return capitalize(opt);
  }

  function showClaimDialog(tile, options, callback) {
    if (!elements.claimDialog) return;
    elements.claimTile.innerHTML = '';
    elements.claimTile.appendChild(TR.createTileElement(tile));

    // Show tile name next to the tile SVG
    const tileNameEl = document.createElement('div');
    tileNameEl.className = 'claim-tile-name';
    tileNameEl.textContent = Tile.getName(tile);
    tileNameEl.style.cssText = 'font-size:13px;color:#ccc;margin-top:4px;text-align:center;';
    elements.claimTile.appendChild(tileNameEl);

    // Get current state for meld descriptions
    const state = lastRenderedState;

    elements.claimText.textContent = 'Claim this tile?';
    elements.claimButtons.innerHTML = '';
    for (const opt of options) {
      if (opt === 'none') {
        const btn = document.createElement('button');
        btn.className = 'btn claim-btn pass-btn';
        btn.textContent = 'Pass';
        btn.addEventListener('click', () => {
          hideClaimDialog();
          callback('none');
        });
        elements.claimButtons.appendChild(btn);
      } else {
        const btn = document.createElement('button');
        btn.className = `btn claim-btn ${opt}-btn`;
        const meldDesc = state ? describeClaimMeld(opt, tile, state) : capitalize(opt);
        btn.textContent = meldDesc;
        btn.title = meldDesc;
        btn.addEventListener('click', () => {
          hideClaimDialog();
          callback(opt);
        });
        elements.claimButtons.appendChild(btn);
      }
    }

    elements.claimDialog.classList.remove('hidden');
  }

  function hideClaimDialog() {
    if (elements.claimDialog) {
      elements.claimDialog.classList.add('hidden');
    }
  }

  function showWinScreen(state, replayRecorder) {
    if (!elements.overlay) return;
    const winner = state.winner;
    const result = state.winResult;
    const isHuman = winner && winner.isHuman;

    let html = `<div class="win-screen">`;
    html += `<h2>${isHuman ? '🎉 You Win!' : `${Player.getWindLabel(winner)} Wins!`}</h2>`;

    if (result) {
      html += `<div class="score-total">${result.total} Points</div>`;
      html += `<div class="score-breakdown">`;
      for (const b of result.breakdown) {
        html += `<div class="score-line"><span>${b.name}</span><span>${b.points} pts</span></div>`;
      }
      html += `</div>`;
    }

    // Show winning hand
    if (winner) {
      html += `<div class="winning-hand">`;
      for (const tile of winner.hand.concealed) {
        html += TR.createTileElement(tile).outerHTML;
      }
      for (const meld of winner.hand.melds) {
        html += TR.createMeldElement(meld).outerHTML;
      }
      html += `</div>`;
    }

    // Post-round summary
    html += `<div class="post-round-summary" style="margin:12px 0;font-size:13px;color:#aaa;text-align:left;padding:8px 12px;background:rgba(0,0,0,0.2);border-radius:6px;">`;
    html += `<div style="font-weight:bold;margin-bottom:4px;color:#ccc;">Round Summary</div>`;
    html += `<div>Turns played: ${state.turnCount || '?'}</div>`;
    if (isHuman && result) {
      html += `<div>Best play: Winning hand with ${result.total} pts</div>`;
      if (result.breakdown && result.breakdown.length > 0) {
        const topScoring = result.breakdown.reduce((a, b) => a.points > b.points ? a : b);
        html += `<div>Top scoring element: ${topScoring.name} (${topScoring.points} pts)</div>`;
      }
    } else if (!isHuman && winner) {
      html += `<div>Opponent won — look for missed scoring opportunities</div>`;
      html += `<div>Worst play: Dealing into opponent's hand</div>`;
    }
    html += `</div>`;

    // Buttons row
    html += `<div style="display:flex;gap:8px;justify-content:center;margin-top:12px;">`;
    html += `<button id="btn-next-round" class="btn btn-large">Next Round</button>`;
    if (replayRecorder && window.MJ.Replay) {
      html += `<button id="btn-review-hand" class="btn btn-large">Review Hand</button>`;
    }
    html += `</div>`;
    html += `</div>`;

    elements.overlayContent.innerHTML = html;
    elements.overlay.classList.remove('hidden');

    document.getElementById('btn-next-round').addEventListener('click', () => {
      elements.overlay.classList.add('hidden');
      window.MJ.GameFlow.nextRound(state);
    });

    const reviewBtn = document.getElementById('btn-review-hand');
    if (reviewBtn && replayRecorder) {
      reviewBtn.addEventListener('click', () => {
        elements.overlay.classList.add('hidden');
        const recording = replayRecorder.getRecording();
        const metadata = replayRecorder.getMetadata();
        const viewer = new window.MJ.Replay.ReplayViewer(recording, metadata);
        const viewerUI = viewer.buildViewerUI();
        if (viewerUI) document.body.appendChild(viewerUI);
      });
    }
  }

  function showDrawScreen(state) {
    if (!elements.overlay) return;
    let html = `<div class="win-screen">`;
    html += `<h2>Draw — Wall Exhausted</h2>`;
    html += `<p>No one completed a winning hand.</p>`;
    html += `<button id="btn-next-round" class="btn btn-large">Next Round</button>`;
    html += `</div>`;

    elements.overlayContent.innerHTML = html;
    elements.overlay.classList.remove('hidden');

    document.getElementById('btn-next-round').addEventListener('click', () => {
      elements.overlay.classList.add('hidden');
      window.MJ.GameFlow.nextRound(state);
    });
  }

  function showMessage(text, duration = 2000) {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    elements.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function renderGameLog(state) {
    if (!elements.logContent) return;
    const log = GS.getLog(state);
    const recent = log.slice(-50);
    elements.logContent.innerHTML = recent.map(l => `<div class="log-line">${l}</div>`).join('');
    elements.logContent.scrollTop = elements.logContent.scrollHeight;
  }

  function updateLayout() {
    // Responsive adjustments handled by CSS
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatPhase(phase) {
    const map = {
      waiting: 'Waiting',
      dealing: 'Dealing...',
      draw: 'Drawing',
      discard: 'Discard Phase',
      claim: 'Checking Claims...',
      scoring: 'Scoring',
      game_over: 'Game Over',
      round_over: 'Round Over'
    };
    return map[phase] || phase;
  }

  window.MJ.Renderer = Object.freeze({
    init, renderBoard, showMessage, showClaimDialog, hideClaimDialog,
    showWinScreen, showDrawScreen, renderGameLog, updateLayout
  });

  console.log('[Mahjong] Renderer module loaded');
})();
