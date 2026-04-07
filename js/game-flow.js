/**
 * game-flow.js — Turn-by-turn game logic and flow control
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const { GAME_PHASES, MELD_TYPES, CLAIM_TYPES, AI_DELAY_MS, AUTO_PLAY_DELAY } = window.MJ.Constants;
  const Tile = window.MJ.Tile;
  const Wall = window.MJ.Wall;
  const Hand = window.MJ.Hand;
  const Player = window.MJ.Player;
  const AI = window.MJ.AI;
  const Scoring = window.MJ.Scoring;
  const GS = window.MJ.GameState;

  let discardResolver = null;
  let claimResolver = null;
  let replayRecorder = null;
  let gameLoopRunning = false;
  let gameLoopPaused = false;
  let speedMultiplier = 1.0;

  function setReplayRecorder(recorder) {
    replayRecorder = recorder;
  }

  function setSpeed(multiplier) {
    speedMultiplier = multiplier;
  }

  function startGame(state) {
    GS.addLog(state, '═══ New Game Started ═══');
    startRound(state);
  }

  function startRound(state) {
    // Reset players
    for (const p of state.players) {
      Player.reset(p);
    }

    // Build wall
    state.wall = Wall.create();

    // Read dora indicators from the wall
    if (window.MJ.Dora && window.MJ.Wall.getDoraIndicators) {
      state.doraIndicators = window.MJ.Wall.getDoraIndicators(state.wall);
    }

    state.lastDiscard = null;
    state.lastDiscardPlayer = null;
    state.winner = null;
    state.winResult = null;
    state.turnCount = 0;

    GS.addLog(state, `── Round ${state.roundNumber} (${state.roundWind} wind) ──`);

    // Deal 13 tiles to each player
    for (let round = 0; round < 13; round++) {
      for (let i = 0; i < 4; i++) {
        const tile = Wall.draw(state.wall);
        if (tile) Hand.addTile(state.players[i].hand, tile);
      }
    }

    // Sort human hand
    const human = GS.getHumanPlayer(state);
    if (human) {
      human.hand.concealed = Tile.sortTiles(human.hand.concealed);
    }

    // Dealer (east) starts
    state.currentPlayerIndex = state.dealerIndex;
    GS.setPhase(state, GAME_PHASES.DRAW);
    GS.notifyChange(state);

    GS.addLog(state, `${Wall.remaining(state.wall)} tiles remaining in wall`);
    startGameLoop(state);
  }

  async function startGameLoop(state) {
    if (gameLoopRunning) return;
    gameLoopRunning = true;

    while (gameLoopRunning && state.phase !== GAME_PHASES.GAME_OVER &&
           state.phase !== GAME_PHASES.ROUND_OVER) {
      if (gameLoopPaused) {
        await sleep(100);
        continue;
      }

      const player = GS.getCurrentPlayer(state);
      const delay = state.autoPlay ? AUTO_PLAY_DELAY : AI_DELAY_MS;

      try {
        if (state.phase === GAME_PHASES.DRAW) {
          await executeDraw(state);
        } else if (state.phase === GAME_PHASES.DISCARD) {
          if (player.isHuman && !state.autoPlay) {
            await waitForHumanDiscard(state);
          } else {
            await sleep(delay);
            await executeAIDiscard(state);
          }
        } else if (state.phase === GAME_PHASES.CLAIM) {
          await processClaims(state);
        } else {
          await sleep(100);
        }
      } catch (e) {
        console.error('Game loop error:', e);
        await sleep(500);
      }
    }
    gameLoopRunning = false;
  }

  function stopGameLoop() {
    gameLoopRunning = false;
    gameLoopPaused = false;
  }

  async function executeDraw(state) {
    if (Wall.isEmpty(state.wall)) {
      declareDraw(state);
      return;
    }

    const player = GS.getCurrentPlayer(state);
    const tile = Wall.draw(state.wall);

    if (!tile) {
      declareDraw(state);
      return;
    }

    Hand.addTile(player.hand, tile);
    const pIdx = state.currentPlayerIndex;
    const windLabel = Player.getWindLabel(player);

    if (player.isHuman) {
      player.hand.concealed = Tile.sortTiles(player.hand.concealed);
    }

    GS.addLog(state, `${windLabel} draws ${player.isHuman ? Tile.getName(tile) : 'a tile'}`);

    if (replayRecorder) replayRecorder.recordAction({type:'draw', player: state.currentPlayerIndex, tile: {suit: tile.suit, rank: tile.rank}, turn: state.turnCount});

    // Check for self-draw win
    if (Hand.isWinningHand(player.hand)) {
      if (player.isHuman && !state.autoPlay) {
        GS.setPhase(state, GAME_PHASES.DISCARD);
        GS.notifyChange(state);
        // Human can choose to declare or not via UI
        return;
      } else if (AI.shouldDeclareWin(player, state)) {
        declareWin(state, player, null, true);
        return;
      }
    }

    // Check for concealed kong
    if (!player.isHuman || state.autoPlay) {
      const kong = AI.shouldDeclareKong(player, state);
      if (kong) {
        await executeKongAction(state, player, kong);
        return;
      }
    }

    GS.setPhase(state, GAME_PHASES.DISCARD);
    GS.notifyChange(state);
  }

  async function waitForHumanDiscard(state) {
    const player = GS.getCurrentPlayer(state);
    GS.notifyChange(state);

    return new Promise((resolve) => {
      discardResolver = (tile) => {
        discardResolver = null;
        executeDiscard(state, tile);
        resolve();
      };
    });
  }

  function humanDiscard(tile) {
    if (discardResolver) {
      discardResolver(tile);
    }
  }

  function humanClaimDecision(decision) {
    if (claimResolver) {
      claimResolver(decision);
      claimResolver = null;
    }
  }

  async function executeAIDiscard(state) {
    const player = GS.getCurrentPlayer(state);
    const tile = AI.chooseDiscard(player, state);
    if (tile) {
      executeDiscard(state, tile);
    }
  }

  function executeDiscard(state, tile) {
    const player = GS.getCurrentPlayer(state);
    const windLabel = Player.getWindLabel(player);

    Hand.removeTile(player.hand, tile);
    Player.addDiscard(player, tile);

    state.lastDiscard = tile;
    state.lastDiscardPlayer = state.currentPlayerIndex;

    GS.addLog(state, `${windLabel} discards ${Tile.getName(tile)}`);
    if (window.MJ.Sound) window.MJ.Sound.play('PLACE');

    if (replayRecorder) replayRecorder.recordAction({type:'discard', player: state.currentPlayerIndex, tile: {suit: tile.suit, rank: tile.rank}, turn: state.turnCount});

    GS.setPhase(state, GAME_PHASES.CLAIM);
    GS.notifyChange(state);
  }

  async function processClaims(state) {
    const tile = state.lastDiscard;
    const discardIdx = state.lastDiscardPlayer;
    if (!tile) {
      advanceToNextPlayer(state);
      return;
    }

    const delay = state.autoPlay ? AUTO_PLAY_DELAY : AI_DELAY_MS;

    // Check for wins first (highest priority, any player)
    for (let i = 1; i <= 3; i++) {
      const pIdx = (discardIdx + i) % 4;
      const player = state.players[pIdx];
      if (Hand.isWinningHand(player.hand, tile)) {
        // Check furiten - cannot win by ron if furiten
        const furitenCheck = window.MJ.Furiten ? window.MJ.Furiten.checkFuriten(player, state) : null;
        if (furitenCheck && furitenCheck.isFuriten) {
          // Skip this player's win claim - they're furiten
          continue;
        }
        if (player.isHuman && !state.autoPlay) {
          const decision = await askHumanClaim(state, player, tile, [CLAIM_TYPES.WIN]);
          if (decision === CLAIM_TYPES.WIN) {
            declareWin(state, player, tile, false);
            return;
          }
        } else if (AI.shouldDeclareWin(player, state)) {
          await sleep(delay);
          declareWin(state, player, tile, false);
          return;
        }
      }
    }

    // Check for kong/pong (any player except discarder)
    for (let i = 1; i <= 3; i++) {
      const pIdx = (discardIdx + i) % 4;
      const player = state.players[pIdx];

      // Kong
      const kongs = Hand.findKongs(player.hand, tile);
      if (kongs.length > 0) {
        if (player.isHuman && !state.autoPlay) {
          const opts = [CLAIM_TYPES.KONG];
          if (Hand.findPongs(player.hand, tile).length > 0) opts.push(CLAIM_TYPES.PONG);
          opts.push(CLAIM_TYPES.NONE);
          const decision = await askHumanClaim(state, player, tile, opts);
          if (decision === CLAIM_TYPES.KONG) {
            removeFromDiscards(state);
            await executeKong(state, player, tile);
            return;
          } else if (decision === CLAIM_TYPES.PONG) {
            removeFromDiscards(state);
            await executePong(state, player, tile);
            return;
          }
        } else if (AI.shouldClaimKong(player, tile, state)) {
          await sleep(delay);
          removeFromDiscards(state);
          await executeKong(state, player, tile);
          return;
        }
      }

      // Pong
      const pongs = Hand.findPongs(player.hand, tile);
      if (pongs.length > 0) {
        if (player.isHuman && !state.autoPlay) {
          const decision = await askHumanClaim(state, player, tile,
            [CLAIM_TYPES.PONG, CLAIM_TYPES.NONE]);
          if (decision === CLAIM_TYPES.PONG) {
            removeFromDiscards(state);
            await executePong(state, player, tile);
            return;
          }
        } else if (AI.shouldClaimPong(player, tile, state)) {
          await sleep(delay);
          removeFromDiscards(state);
          await executePong(state, player, tile);
          return;
        }
      }
    }

    // Check for chow (only next player)
    const nextIdx = (discardIdx + 1) % 4;
    const nextPlayer = state.players[nextIdx];
    const chows = Hand.findChows(nextPlayer.hand, tile);
    if (chows.length > 0) {
      if (nextPlayer.isHuman && !state.autoPlay) {
        const decision = await askHumanClaim(state, nextPlayer, tile,
          [CLAIM_TYPES.CHOW, CLAIM_TYPES.NONE]);
        if (decision === CLAIM_TYPES.CHOW) {
          removeFromDiscards(state);
          await executeChow(state, nextPlayer, tile, chows[0]);
          return;
        }
      } else {
        const chowTiles = AI.shouldClaimChow(nextPlayer, tile, state);
        if (chowTiles) {
          await sleep(delay);
          removeFromDiscards(state);
          await executeChow(state, nextPlayer, tile, chowTiles);
          return;
        }
      }
    }

    // No claims — advance to next player
    advanceToNextPlayer(state);
  }

  function removeFromDiscards(state) {
    const player = state.players[state.lastDiscardPlayer];
    player.discards.pop();
  }

  async function askHumanClaim(state, player, tile, options) {
    GS.notifyChange(state);
    return new Promise((resolve) => {
      claimResolver = resolve;
      if (state.callbacks.onClaimPrompt) {
        state.callbacks.onClaimPrompt(tile, options);
      } else {
        // No claim prompt handler — auto pass
        claimResolver = null;
        resolve('none');
        return;
      }
      // Safety timeout: auto-pass after 15 seconds
      setTimeout(() => {
        if (claimResolver === resolve) {
          claimResolver = null;
          resolve('none');
        }
      }, 15000);
    });
  }

  function advanceToNextPlayer(state) {
    GS.nextTurn(state);
    GS.setPhase(state, GAME_PHASES.DRAW);
    GS.notifyChange(state);
  }

  async function executeChow(state, player, tile, chowTiles) {
    const windLabel = Player.getWindLabel(player);
    // Remove from hand (tiles that aren't the claimed tile)
    for (const t of chowTiles) {
      if (Tile.getId(t) !== Tile.getId(tile)) {
        Hand.removeTile(player.hand, t);
      }
    }
    const sortedChow = Tile.sortTiles(chowTiles);
    Hand.addMeld(player.hand, { type: MELD_TYPES.CHOW, tiles: sortedChow, open: true });

    GS.addLog(state, `${windLabel} claims Chow! ${sortedChow.map(t => Tile.getName(t)).join(', ')}`);
    if (window.MJ.Sound) window.MJ.Sound.play('CHOW');

    if (replayRecorder) replayRecorder.recordAction({type:'chow', player: player.seatIndex, tile: {suit: tile.suit, rank: tile.rank}, tiles: sortedChow.map(t => ({suit: t.suit, rank: t.rank})), turn: state.turnCount});

    state.currentPlayerIndex = player.seatIndex;
    GS.setPhase(state, GAME_PHASES.DISCARD);
    GS.notifyChange(state);
  }

  async function executePong(state, player, tile) {
    const windLabel = Player.getWindLabel(player);
    const matches = player.hand.concealed.filter(t => Tile.getId(t) === Tile.getId(tile));
    Hand.removeTile(player.hand, matches[0]);
    Hand.removeTile(player.hand, matches[1]);
    Hand.addMeld(player.hand, {
      type: MELD_TYPES.PONG, tiles: [matches[0], matches[1], tile], open: true
    });

    GS.addLog(state, `${windLabel} claims Pong! ${Tile.getName(tile)}`);
    if (window.MJ.Sound) window.MJ.Sound.play('PONG');

    if (replayRecorder) replayRecorder.recordAction({type:'pong', player: player.seatIndex, tile: {suit: tile.suit, rank: tile.rank}, turn: state.turnCount});

    state.currentPlayerIndex = player.seatIndex;
    GS.setPhase(state, GAME_PHASES.DISCARD);
    GS.notifyChange(state);
  }

  async function executeKong(state, player, tile) {
    const windLabel = Player.getWindLabel(player);
    const matches = player.hand.concealed.filter(t => Tile.getId(t) === Tile.getId(tile));
    for (const m of matches) Hand.removeTile(player.hand, m);
    Hand.addMeld(player.hand, {
      type: MELD_TYPES.KONG, tiles: [...matches, tile], open: true
    });

    GS.addLog(state, `${windLabel} claims Kong! ${Tile.getName(tile)}`);
    if (window.MJ.Sound) window.MJ.Sound.play('KONG');

    if (replayRecorder) replayRecorder.recordAction({type:'kong', player: player.seatIndex, tile: {suit: tile.suit, rank: tile.rank}, turn: state.turnCount});

    // Kong replacement draw
    const replacement = Wall.drawFromEnd(state.wall);
    if (replacement) {
      Hand.addTile(player.hand, replacement);
      GS.addLog(state, `${windLabel} draws replacement tile`);
    }
    state.currentPlayerIndex = player.seatIndex;
    GS.setPhase(state, GAME_PHASES.DISCARD);
    GS.notifyChange(state);
  }

  async function executeKongAction(state, player, kongTiles) {
    const windLabel = Player.getWindLabel(player);
    if (kongTiles.length === 1 && Hand.canPromoteToKong(player.hand, kongTiles[0])) {
      Hand.promoteToKong(player.hand, kongTiles[0]);
      GS.addLog(state, `${windLabel} promotes to Kong!`);
    } else if (kongTiles.length === 4) {
      for (const t of kongTiles) Hand.removeTile(player.hand, t);
      Hand.addMeld(player.hand, {
        type: MELD_TYPES.CONCEALED_KONG, tiles: kongTiles, open: false
      });
      GS.addLog(state, `${windLabel} declares concealed Kong!`);
    }
    // Replacement draw
    const replacement = Wall.drawFromEnd(state.wall);
    if (replacement) {
      Hand.addTile(player.hand, replacement);
    }
    GS.setPhase(state, GAME_PHASES.DISCARD);
    GS.notifyChange(state);
  }

  function declareWin(state, player, tile, selfDrawn) {
    const windLabel = Player.getWindLabel(player);
    if (tile && !selfDrawn) {
      Hand.addTile(player.hand, tile);
    }

    const decompositions = Hand.getWinningDecompositions(player.hand);

    const doraCount = (window.MJ.Dora && state.doraIndicators)
      ? window.MJ.Dora.countDora(player.hand, player.hand.melds, state.doraIndicators)
      : 0;

    const context = {
      seatWind: player.seatWind,
      roundWind: state.roundWind,
      selfDrawn,
      lastTile: tile || player.hand.drawnTile,
      concealed: player.hand.melds.every(m => !m.open),
      doraCount
    };

    let bestScore = { total: 0, breakdown: [] };
    for (const d of decompositions) {
      const score = Scoring.calculateScore(d, context);
      if (score.total > bestScore.total) bestScore = score;
    }

    Player.addScore(player, bestScore.total);
    state.winner = player;
    state.winResult = bestScore;

    if (replayRecorder) replayRecorder.recordAction({type:'win', player: player.seatIndex, tile: tile ? {suit: tile.suit, rank: tile.rank} : null, selfDrawn, score: bestScore.total, turn: state.turnCount});

    const method = selfDrawn ? 'self-draw' : 'discard';
    GS.addLog(state, `🏆 ${windLabel} wins by ${method}! ${bestScore.total} points`);
    GS.addLog(state, Scoring.getScoreBreakdown(bestScore));

    GS.setPhase(state, GAME_PHASES.ROUND_OVER);
    GS.notifyChange(state);
    stopGameLoop();

    if (state.callbacks.onRoundOver) {
      state.callbacks.onRoundOver(state);
    }
  }

  function declareDraw(state) {
    GS.addLog(state, '── Draw! Wall exhausted ──');
    GS.setPhase(state, GAME_PHASES.ROUND_OVER);
    GS.notifyChange(state);
    stopGameLoop();
    if (state.callbacks.onRoundOver) {
      state.callbacks.onRoundOver(state);
    }
  }

  function humanDeclareWin(state) {
    const player = GS.getHumanPlayer(state);
    if (player && Hand.isWinningHand(player.hand)) {
      declareWin(state, player, null, true);
      return true;
    }
    return false;
  }

  function humanDeclareKong(state) {
    const player = GS.getHumanPlayer(state);
    if (!player) return false;
    const kongs = Hand.findConcealedKongs(player.hand);
    if (kongs.length > 0) {
      executeKongAction(state, player, kongs[0]);
      return true;
    }
    for (const tile of player.hand.concealed) {
      if (Hand.canPromoteToKong(player.hand, tile)) {
        executeKongAction(state, player, [tile]);
        return true;
      }
    }
    return false;
  }

  function nextRound(state) {
    state.roundNumber++;
    state.dealerIndex = (state.dealerIndex + 1) % 4;
    // Update seat winds
    for (let i = 0; i < 4; i++) {
      const windIdx = (i - state.dealerIndex + 4) % 4;
      state.players[i].seatWind = ['east', 'south', 'west', 'north'][windIdx];
      state.players[i].isDealer = (i === state.dealerIndex);
    }
    if (state.roundNumber > 4 && state.roundWind === 'east') {
      state.roundWind = 'south';
    }
    startRound(state);
  }

  function runAutoPlay(state) {
    state.autoPlay = true;
    if (!gameLoopRunning) {
      startGameLoop(state);
    }
  }

  function stopAutoPlay(state) {
    state.autoPlay = false;
  }

  function isAutoPlaying(state) {
    return state.autoPlay;
  }

  function sleep(ms) {
    const adjusted = speedMultiplier > 0 ? ms / speedMultiplier : ms;
    return new Promise(resolve => setTimeout(resolve, adjusted));
  }

  window.MJ.GameFlow = Object.freeze({
    startGame, startRound, nextRound,
    humanDiscard, humanClaimDecision, humanDeclareWin, humanDeclareKong,
    runAutoPlay, stopAutoPlay, isAutoPlaying,
    stopGameLoop,
    setReplayRecorder, setSpeed
  });

  console.log('[Mahjong] GameFlow module loaded');
})();
