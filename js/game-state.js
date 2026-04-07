/**
 * game-state.js — Central game state management
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const { GAME_PHASES, SEAT_WINDS } = window.MJ.Constants;
  const Wall = window.MJ.Wall;
  const Player = window.MJ.Player;

  function create() {
    const players = [];
    for (let i = 0; i < 4; i++) {
      players.push(Player.create(i, i === 0)); // seat 0 = human
    }

    return {
      players,
      wall: null,
      phase: GAME_PHASES.WAITING,
      currentPlayerIndex: 0,
      roundWind: 'east',
      roundNumber: 1,
      dealerIndex: 0,
      log: [],
      doraIndicators: [],
      lastDiscard: null,
      lastDiscardPlayer: null,
      turnCount: 0,
      autoPlay: false,
      autoPlayTimer: null,
      winner: null,
      winResult: null,
      callbacks: {
        onStateChange: null,
        onLog: null,
        onTurnChange: null,
        onGameOver: null,
        onRoundOver: null,
        onPhaseChange: null
      }
    };
  }

  function getPlayers(state) {
    return state.players;
  }

  function getCurrentPlayer(state) {
    return state.players[state.currentPlayerIndex];
  }

  function getCurrentPlayerIndex(state) {
    return state.currentPlayerIndex;
  }

  function getPhase(state) {
    return state.phase;
  }

  function setPhase(state, phase) {
    const old = state.phase;
    state.phase = phase;
    if (state.callbacks.onPhaseChange) {
      state.callbacks.onPhaseChange(phase, old);
    }
  }

  function getWall(state) {
    return state.wall;
  }

  function getRoundWind(state) {
    return state.roundWind;
  }

  function nextTurn(state) {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 4;
    state.turnCount++;
    if (state.callbacks.onTurnChange) {
      state.callbacks.onTurnChange(state.currentPlayerIndex);
    }
  }

  function setCurrentPlayer(state, index) {
    state.currentPlayerIndex = index;
    if (state.callbacks.onTurnChange) {
      state.callbacks.onTurnChange(index);
    }
  }

  function isGameOver(state) {
    return state.phase === GAME_PHASES.GAME_OVER;
  }

  function getDiscardPool(state) {
    const all = [];
    for (const p of state.players) {
      all.push(...p.discards);
    }
    return all;
  }

  function getRoundNumber(state) {
    return state.roundNumber;
  }

  function getLog(state) {
    return state.log;
  }

  function addLog(state, message) {
    state.log.push(message);
    // Keep log manageable
    if (state.log.length > 200) {
      state.log.splice(0, 50);
    }
    if (state.callbacks.onLog) {
      state.callbacks.onLog(message);
    }
  }

  function onStateChange(state, callback) {
    state.callbacks.onStateChange = callback;
  }

  function onChange(state, event, callback) {
    state.callbacks[event] = callback;
  }

  function notifyChange(state) {
    if (state.callbacks.onStateChange) {
      state.callbacks.onStateChange(state);
    }
  }

  function getHumanPlayer(state) {
    return state.players.find(p => p.isHuman);
  }

  function isHumanTurn(state) {
    return getCurrentPlayer(state).isHuman;
  }

  window.MJ.GameState = Object.freeze({
    create, getPlayers, getCurrentPlayer, getCurrentPlayerIndex,
    getPhase, setPhase, getWall, getRoundWind,
    nextTurn, setCurrentPlayer, isGameOver,
    getDiscardPool, getRoundNumber, getLog, addLog,
    onStateChange, onChange, notifyChange,
    getHumanPlayer, isHumanTurn
  });

  console.log('[Mahjong] GameState module loaded');
})();
