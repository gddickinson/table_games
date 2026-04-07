/**
 * input-handler.js — Human player input handling
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const { GAME_PHASES, CLAIM_TYPES } = window.MJ.Constants;
  const Tile = window.MJ.Tile;
  const GS = window.MJ.GameState;
  const TR = window.MJ.TileRenderer;
  const Renderer = window.MJ.Renderer;
  const GameFlow = window.MJ.GameFlow;

  let state = null;
  let enabled = false;
  let selectedTile = null;
  let boundHandlers = {};

  function init(gameState) {
    state = gameState;
    enabled = true;
    bindEvents();

    // Set up claim prompt callback
    state.callbacks.onClaimPrompt = (tile, options) => {
      Renderer.showClaimDialog(tile, options, (decision) => {
        GameFlow.humanClaimDecision(decision);
      });
    };
  }

  function bindEvents() {
    // Click on tiles in hand
    boundHandlers.handClick = (e) => {
      if (!enabled || state.autoPlay) return;
      const tileEl = e.target.closest('.mj-tile.clickable');
      if (!tileEl) return;

      const human = GS.getHumanPlayer(state);
      if (!human) return;
      if (state.currentPlayerIndex !== human.seatIndex) return;
      if (state.phase !== GAME_PHASES.DISCARD) return;

      const tileData = TR.getTileFromElement(tileEl);
      if (!tileData) return;

      // Find actual tile in hand
      const handTile = human.hand.concealed.find(t =>
        t.uid === tileData.uid
      );
      if (!handTile) return;

      if (selectedTile && selectedTile.uid === handTile.uid) {
        // Double click / confirm — discard this tile
        discardTile(handTile);
      } else {
        // Select tile
        selectTile(handTile, tileEl);
      }
    };

    // Double-click for quick discard
    boundHandlers.handDblClick = (e) => {
      if (!enabled || state.autoPlay) return;
      const tileEl = e.target.closest('.mj-tile.clickable');
      if (!tileEl) return;

      const tileData = TR.getTileFromElement(tileEl);
      if (!tileData) return;

      const human = GS.getHumanPlayer(state);
      if (!human) return;

      const handTile = human.hand.concealed.find(t => t.uid === tileData.uid);
      if (handTile) {
        discardTile(handTile);
      }
    };

    // Keyboard shortcuts
    boundHandlers.keydown = (e) => {
      if (!enabled) return;
      handleKeyboard(e);
    };

    // Touch event handling for mobile tile selection
    let touchHandled = false;
    let longPressTimer = null;

    boundHandlers.handTouchStart = (e) => {
      if (!enabled || state.autoPlay) return;
      const tileEl = e.target.closest('.mj-tile.clickable');
      if (!tileEl) return;

      // Mark that a touch event is being handled to prevent double-fire
      touchHandled = true;
      e.preventDefault();

      // Start long-press timer for tile info tooltip
      longPressTimer = setTimeout(() => {
        // Show tile info tooltip instead of selecting
        const tileData = TR.getTileFromElement(tileEl);
        if (tileData && window.MJ.Renderer) {
          window.MJ.Renderer.showMessage(window.MJ.Tile.getName(tileData));
        }
        longPressTimer = null;
      }, 500);

      const human = GS.getHumanPlayer(state);
      if (!human) return;
      if (state.currentPlayerIndex !== human.seatIndex) return;
      if (state.phase !== GAME_PHASES.DISCARD) return;

      const tileData = TR.getTileFromElement(tileEl);
      if (!tileData) return;

      const handTile = human.hand.concealed.find(t =>
        t.uid === tileData.uid
      );
      if (!handTile) return;

      if (selectedTile && selectedTile.uid === handTile.uid) {
        // Second tap on same tile — discard
        discardTile(handTile);
      } else {
        // First tap — select
        selectTile(handTile, tileEl);
      }
    };

    // Clear long-press on touch move (prevents accidental info popups while scrolling)
    boundHandlers.handTouchMove = (e) => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    };

    boundHandlers.handTouchEnd = (e) => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      if (touchHandled) {
        // Prevent the synthesized click event from firing after touch
        e.preventDefault();
        // Reset after a short delay to allow future click events on non-touch
        setTimeout(() => { touchHandled = false; }, 300);
      }
    };

    // Wrap the original click handler to skip if touch already handled
    const originalHandClick = boundHandlers.handClick;
    boundHandlers.handClick = (e) => {
      if (touchHandled) return;
      originalHandClick(e);
    };

    const handBottom = document.getElementById('hand-bottom');
    if (handBottom) {
      handBottom.addEventListener('touchstart', boundHandlers.handTouchStart, { passive: false });
      handBottom.addEventListener('touchmove', boundHandlers.handTouchMove, { passive: false });
      handBottom.addEventListener('touchend', boundHandlers.handTouchEnd, { passive: false });
      handBottom.addEventListener('click', boundHandlers.handClick);
      handBottom.addEventListener('dblclick', boundHandlers.handDblClick);
    }
    document.addEventListener('keydown', boundHandlers.keydown);
  }

  function selectTile(tile, element) {
    // Deselect previous
    const prev = document.querySelector('.mj-tile.selected');
    if (prev) prev.classList.remove('selected');

    selectedTile = tile;
    if (element) {
      element.classList.add('selected');
    }
  }

  function discardTile(tile) {
    selectedTile = null;
    GameFlow.humanDiscard(tile);
  }

  function handleKeyboard(e) {
    const human = GS.getHumanPlayer(state);
    if (!human) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        // Confirm discard of selected tile
        if (selectedTile && state.phase === GAME_PHASES.DISCARD) {
          e.preventDefault();
          discardTile(selectedTile);
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        navigateHand(-1);
        break;

      case 'ArrowRight':
        e.preventDefault();
        navigateHand(1);
        break;

      case 's':
      case 'S':
        // Sort hand
        human.hand.concealed = Tile.sortTiles(human.hand.concealed);
        GS.notifyChange(state);
        break;

      case 'w':
      case 'W':
        // Declare win
        if (state.phase === GAME_PHASES.DISCARD &&
            state.currentPlayerIndex === human.seatIndex) {
          GameFlow.humanDeclareWin(state);
        }
        break;

      case 'a':
      case 'A':
        // Toggle auto play
        if (GameFlow.isAutoPlaying(state)) {
          GameFlow.stopAutoPlay(state);
          Renderer.showMessage('Auto-play stopped');
        } else {
          GameFlow.runAutoPlay(state);
          Renderer.showMessage('Auto-play started');
        }
        GS.notifyChange(state);
        break;

      case '?':
      case 'h':
      case 'H':
        // Show help
        if (window.MJ.Tutorial) {
          window.MJ.Tutorial.showHelp();
        }
        break;

      case 'Escape':
        // Close overlays
        selectedTile = null;
        if (window.MJ.Tutorial) {
          window.MJ.Tutorial.hideHelp();
        }
        const overlay = document.getElementById('overlay');
        if (overlay && !overlay.classList.contains('hidden') && !state.winner) {
          overlay.classList.add('hidden');
        }
        GS.notifyChange(state);
        break;

      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9':
        // Quick select by position
        selectByIndex(parseInt(e.key) - 1);
        break;

      case '0':
        selectByIndex(9);
        break;
    }
  }

  function navigateHand(direction) {
    const human = GS.getHumanPlayer(state);
    if (!human) return;
    const tiles = human.hand.concealed;
    if (tiles.length === 0) return;

    let idx = 0;
    if (selectedTile) {
      idx = tiles.findIndex(t => t.uid === selectedTile.uid);
      idx = (idx + direction + tiles.length) % tiles.length;
    }

    const handEl = document.getElementById('hand-bottom');
    const tileEls = handEl ? handEl.querySelectorAll('.mj-tile') : [];
    selectTile(tiles[idx], tileEls[idx]);
  }

  function selectByIndex(index) {
    const human = GS.getHumanPlayer(state);
    if (!human) return;
    const tiles = human.hand.concealed;
    if (index >= tiles.length) return;

    const handEl = document.getElementById('hand-bottom');
    const tileEls = handEl ? handEl.querySelectorAll('.mj-tile') : [];
    selectTile(tiles[index], tileEls[index]);
  }

  function enable() {
    enabled = true;
  }

  function disable() {
    enabled = false;
    selectedTile = null;
  }

  function destroy() {
    const handBottom = document.getElementById('hand-bottom');
    if (handBottom) {
      handBottom.removeEventListener('touchstart', boundHandlers.handTouchStart);
      handBottom.removeEventListener('touchmove', boundHandlers.handTouchMove);
      handBottom.removeEventListener('touchend', boundHandlers.handTouchEnd);
      handBottom.removeEventListener('click', boundHandlers.handClick);
      handBottom.removeEventListener('dblclick', boundHandlers.handDblClick);
    }
    document.removeEventListener('keydown', boundHandlers.keydown);
    boundHandlers = {};
    enabled = false;
  }

  window.MJ.InputHandler = Object.freeze({
    init, enable, disable, destroy
  });

  console.log('[Mahjong] InputHandler module loaded');
})();
