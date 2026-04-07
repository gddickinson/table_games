/**
 * player.js — Player state management
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const { SEAT_WINDS } = window.MJ.Constants;
  const Hand = window.MJ.Hand;

  function create(seatIndex, isHuman) {
    return {
      seatIndex,
      isHuman,
      hand: Hand.create(),
      discards: [],
      score: 0,
      seatWind: SEAT_WINDS[seatIndex],
      isDealer: seatIndex === 0,
      riichi: false,
      riichiTurn: -1,         // turn when riichi was declared
      flowerTiles: [],        // bonus flower tiles drawn
      turnsSinceLastClaim: 0,
      tedashi: [],            // true=from hand, false=tsumogiri (per discard)
      lastDrawnTile: null     // for tsumogiri detection
    };
  }

  function getSeatWind(player) {
    return player.seatWind;
  }

  function getDiscards(player) {
    return player.discards;
  }

  function addDiscard(player, tile) {
    player.discards.push(tile);
  }

  function getHand(player) {
    return player.hand;
  }

  function getScore(player) {
    return player.score;
  }

  function setScore(player, score) {
    player.score = score;
  }

  function addScore(player, points) {
    player.score += points;
  }

  function isDealer(player) {
    return player.isDealer;
  }

  function reset(player) {
    player.hand = Hand.create();
    player.discards = [];
    player.turnsSinceLastClaim = 0;
    player.riichi = false;
    player.riichiTurn = -1;
    player.flowerTiles = [];
    player.tedashi = [];
    player.lastDrawnTile = null;
  }

  function getSeatName(player) {
    const names = ['East (You)', 'South (AI)', 'West (AI)', 'North (AI)'];
    const aiNames = ['East (AI)', 'South (AI)', 'West (AI)', 'North (AI)'];
    return player.isHuman ? names[player.seatIndex] : aiNames[player.seatIndex];
  }

  function getWindLabel(player) {
    const labels = { east: 'E', south: 'S', west: 'W', north: 'N' };
    return labels[player.seatWind] || '?';
  }

  window.MJ.Player = Object.freeze({
    create, getSeatWind, getDiscards, addDiscard,
    getHand, getScore, setScore, addScore,
    isDealer, reset, getSeatName, getWindLabel
  });

  console.log('[Mahjong] Player module loaded');
})();
