/**
 * constants.js — Game constants, tile definitions, and enumerations
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  window.MJ = window.MJ || {};

  const SUITS = Object.freeze({
    BAMBOO: 'bamboo',
    CIRCLES: 'circles',
    CHARACTERS: 'characters',
    WIND: 'wind',
    DRAGON: 'dragon',
    FLOWER: 'flower'
  });

  const WINDS = Object.freeze(['east', 'south', 'west', 'north']);
  const DRAGONS = Object.freeze(['red', 'green', 'white']);

  const GAME_PHASES = Object.freeze({
    WAITING: 'waiting',
    DEALING: 'dealing',
    DRAW: 'draw',
    DISCARD: 'discard',
    CLAIM: 'claim',
    SCORING: 'scoring',
    GAME_OVER: 'game_over',
    ROUND_OVER: 'round_over'
  });

  const MELD_TYPES = Object.freeze({
    CHOW: 'chow',
    PONG: 'pong',
    KONG: 'kong',
    CONCEALED_KONG: 'concealed_kong',
    PAIR: 'pair'
  });

  const CLAIM_TYPES = Object.freeze({
    NONE: 'none',
    CHOW: 'chow',
    PONG: 'pong',
    KONG: 'kong',
    WIN: 'win'
  });

  // All 34 unique tile definitions
  const TILE_DEFS = [];
  const SUITED = [SUITS.BAMBOO, SUITS.CIRCLES, SUITS.CHARACTERS];
  for (const suit of SUITED) {
    for (let rank = 1; rank <= 9; rank++) {
      TILE_DEFS.push({ suit, rank });
    }
  }
  for (let i = 0; i < WINDS.length; i++) {
    TILE_DEFS.push({ suit: SUITS.WIND, rank: i + 1 });
  }
  for (let i = 0; i < DRAGONS.length; i++) {
    TILE_DEFS.push({ suit: SUITS.DRAGON, rank: i + 1 });
  }
  // 8 flower tiles: 4 seasons + 4 plants (1 copy each, not in TILE_DEFS)
  const FLOWER_DEFS = [];
  for (let i = 1; i <= 8; i++) {
    FLOWER_DEFS.push({ suit: SUITS.FLOWER, rank: i });
  }
  Object.freeze(FLOWER_DEFS);
  Object.freeze(TILE_DEFS);

  // Unicode Mahjong tile characters (U+1F000 range)
  const TILE_SYMBOLS = {};
  // Characters (Man) 1-9: 🀇🀈🀉🀊🀋🀌🀍🀎🀏
  for (let i = 0; i < 9; i++) {
    TILE_SYMBOLS[`characters-${i + 1}`] = String.fromCodePoint(0x1F007 + i);
  }
  // Bamboo (Sou) 1-9: 🀐🀑🀒🀓🀔🀕🀖🀗🀘
  for (let i = 0; i < 9; i++) {
    TILE_SYMBOLS[`bamboo-${i + 1}`] = String.fromCodePoint(0x1F010 + i);
  }
  // Circles (Pin) 1-9: 🀙🀚🀛🀜🀝🀞🀟🀠🀡
  for (let i = 0; i < 9; i++) {
    TILE_SYMBOLS[`circles-${i + 1}`] = String.fromCodePoint(0x1F019 + i);
  }
  // Winds: 🀀🀁🀂🀃 (East South West North)
  const windCodes = [0x1F000, 0x1F001, 0x1F002, 0x1F003];
  for (let i = 0; i < 4; i++) {
    TILE_SYMBOLS[`wind-${i + 1}`] = String.fromCodePoint(windCodes[i]);
  }
  // Dragons: 🀄🀅🀆 (Red Green White)
  const dragonCodes = [0x1F004, 0x1F005, 0x1F006];
  for (let i = 0; i < 3; i++) {
    TILE_SYMBOLS[`dragon-${i + 1}`] = String.fromCodePoint(dragonCodes[i]);
  }
  // Flowers: 🀢🀣🀤🀥 (Plum Orchid Chrysanthemum Bamboo) 🀦🀧🀨🀩 (Spring Summer Autumn Winter)
  const flowerSymbols = ['🌸', '🌺', '🌼', '🎋', '🌱', '☀️', '🍂', '❄️'];
  for (let i = 0; i < 8; i++) {
    TILE_SYMBOLS[`flower-${i + 1}`] = flowerSymbols[i];
  }
  Object.freeze(TILE_SYMBOLS);

  // Human-readable names
  const TILE_NAMES = {};
  const suitNames = {
    bamboo: 'Bamboo', circles: 'Circles', characters: 'Characters'
  };
  const flowerNames = {
    1: 'Plum', 2: 'Orchid', 3: 'Chrysanthemum', 4: 'Bamboo Plant',
    5: 'Spring', 6: 'Summer', 7: 'Autumn', 8: 'Winter'
  };
  const windNames = { 1: 'East', 2: 'South', 3: 'West', 4: 'North' };
  const dragonNames = { 1: 'Red', 2: 'Green', 3: 'White' };
  for (const def of TILE_DEFS) {
    const id = `${def.suit}-${def.rank}`;
    if (def.suit === SUITS.WIND) {
      TILE_NAMES[id] = `${windNames[def.rank]} Wind`;
    } else if (def.suit === SUITS.DRAGON) {
      TILE_NAMES[id] = `${dragonNames[def.rank]} Dragon`;
    } else {
      TILE_NAMES[id] = `${def.rank} of ${suitNames[def.suit]}`;
    }
  }
  for (let i = 1; i <= 8; i++) {
    TILE_NAMES[`flower-${i}`] = `${flowerNames[i]} Flower`;
  }
  Object.freeze(TILE_NAMES);

  // Suit display labels for sorting headers
  const SUIT_ORDER = [
    SUITS.CHARACTERS, SUITS.BAMBOO, SUITS.CIRCLES, SUITS.WIND, SUITS.DRAGON, SUITS.FLOWER
  ];

  const AI_DELAY_MS = 600;
  const AUTO_PLAY_DELAY = 400;
  const ANIMATION_DURATION = 300;
  const TOAST_DURATION = 2000;

  window.MJ.Constants = Object.freeze({
    SUITS, WINDS, DRAGONS, GAME_PHASES, MELD_TYPES, CLAIM_TYPES,
    TILE_DEFS, FLOWER_DEFS, TILE_SYMBOLS, TILE_NAMES, SUIT_ORDER,
    SEAT_WINDS: WINDS,
    AI_DELAY_MS, AUTO_PLAY_DELAY, ANIMATION_DURATION, TOAST_DURATION
  });

  console.log('[Mahjong] Constants loaded');
})();
