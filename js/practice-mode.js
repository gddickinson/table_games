/**
 * practice-mode.js — Practice puzzles for learning Mahjong
 * Provides structured puzzles in three categories: Best Discard, Identify Waits, Claim or Pass.
 * Uses AIEngine for answer verification.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  const Tile = () => root.MJ.Tile;
  const Hand = () => root.MJ.Hand;
  const AIE = () => root.MJ.AIEngine;

  // ── Puzzle Definitions ──

  const BEST_DISCARD_PUZZLES = [
    // Easy: isolated honor tile is the obvious discard
    {
      id: 'bd_01',
      type: 'best_discard',
      difficulty: 'easy',
      title: 'Discard the Lonely Honor',
      hand: [
        { suit: 'bamboo', rank: 1 }, { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 },
        { suit: 'circles', rank: 4 }, { suit: 'circles', rank: 5 }, { suit: 'circles', rank: 6 },
        { suit: 'characters', rank: 7 }, { suit: 'characters', rank: 8 },
        { suit: 'characters', rank: 2 }, { suit: 'characters', rank: 3 },
        { suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 5 },
        { suit: 'wind', rank: 3 }
      ],
      melds: [],
      seatWind: 'east',
      roundWind: 'east',
      correctTile: { suit: 'wind', rank: 3 },
      explanation: 'The West Wind is completely isolated with no copies or connections. Every other tile contributes to a pair, sequence, or partial sequence. Discard the lonely honor.'
    },
    // Easy: isolated terminal vs connected tiles
    {
      id: 'bd_02',
      type: 'best_discard',
      difficulty: 'easy',
      title: 'Terminal Island',
      hand: [
        { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 }, { suit: 'bamboo', rank: 4 },
        { suit: 'circles', rank: 3 }, { suit: 'circles', rank: 4 }, { suit: 'circles', rank: 5 },
        { suit: 'characters', rank: 6 }, { suit: 'characters', rank: 7 },
        { suit: 'characters', rank: 3 }, { suit: 'characters', rank: 3 },
        { suit: 'bamboo', rank: 7 }, { suit: 'bamboo', rank: 8 },
        { suit: 'dragon', rank: 1 }
      ],
      melds: [],
      seatWind: 'south',
      roundWind: 'east',
      correctTile: { suit: 'dragon', rank: 1 },
      explanation: 'The Red Dragon has no partner and cannot form a sequence. All other tiles are part of complete or near-complete groups. Discard the isolated honor for maximum efficiency.'
    },
    // Medium: choose between two partial sequences
    {
      id: 'bd_03',
      type: 'best_discard',
      difficulty: 'medium',
      title: 'Edge vs Middle Wait',
      hand: [
        { suit: 'bamboo', rank: 1 }, { suit: 'bamboo', rank: 2 },
        { suit: 'circles', rank: 4 }, { suit: 'circles', rank: 5 }, { suit: 'circles', rank: 6 },
        { suit: 'characters', rank: 5 }, { suit: 'characters', rank: 6 }, { suit: 'characters', rank: 7 },
        { suit: 'bamboo', rank: 6 }, { suit: 'bamboo', rank: 6 },
        { suit: 'circles', rank: 8 }, { suit: 'circles', rank: 9 },
        { suit: 'characters', rank: 2 }
      ],
      melds: [],
      seatWind: 'east',
      roundWind: 'east',
      correctTile: { suit: 'circles', rank: 8 },
      explanation: 'The 8-9 Circles is an edge wait (only 7 completes it), while 1-2 Bamboo can be completed by 3 Bamboo. Edge waits are less flexible. Additionally, the isolated 2 Characters can connect with 1 or 3. Discard from the edge wait to maximize acceptance.'
    },
    // Medium: sacrifice a pair for better shape
    {
      id: 'bd_04',
      type: 'best_discard',
      difficulty: 'medium',
      title: 'Break the Weak Pair',
      hand: [
        { suit: 'circles', rank: 2 }, { suit: 'circles', rank: 3 }, { suit: 'circles', rank: 4 },
        { suit: 'bamboo', rank: 3 }, { suit: 'bamboo', rank: 4 }, { suit: 'bamboo', rank: 5 },
        { suit: 'characters', rank: 6 }, { suit: 'characters', rank: 7 },
        { suit: 'characters', rank: 9 }, { suit: 'characters', rank: 9 },
        { suit: 'wind', rank: 1 }, { suit: 'wind', rank: 1 },
        { suit: 'bamboo', rank: 7 }
      ],
      melds: [],
      seatWind: 'south',
      roundWind: 'east',
      correctTile: { suit: 'characters', rank: 9 },
      explanation: 'You have two pairs (9 Characters and East Wind) but only need one. The 9 Characters pair is a terminal that cannot extend into sequences, while East Wind is the round wind and has scoring value if upgraded to a pong. Discard 9 Characters to keep better options open.'
    },
    // Hard: balance efficiency vs hand value
    {
      id: 'bd_05',
      type: 'best_discard',
      difficulty: 'hard',
      title: 'Efficiency vs Value',
      hand: [
        { suit: 'bamboo', rank: 1 }, { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 },
        { suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 6 }, { suit: 'bamboo', rank: 7 },
        { suit: 'bamboo', rank: 8 }, { suit: 'bamboo', rank: 9 },
        { suit: 'circles', rank: 3 }, { suit: 'circles', rank: 4 },
        { suit: 'bamboo', rank: 4 }, { suit: 'bamboo', rank: 4 },
        { suit: 'dragon', rank: 2 }
      ],
      melds: [],
      seatWind: 'west',
      roundWind: 'east',
      correctTile: { suit: 'dragon', rank: 2 },
      explanation: 'You are close to a flush in Bamboo (10 of 13 tiles). Discarding the Green Dragon removes the only non-Bamboo honor tile. The 3-4 Circles partial should also go eventually, but the dragon is least useful. Pursuing the flush gives a massive scoring bonus.'
    }
  ];

  const IDENTIFY_WAITS_PUZZLES = [
    // Single wait (tanki)
    {
      id: 'iw_01',
      type: 'identify_waits',
      difficulty: 'easy',
      title: 'Single Pair Wait',
      hand: [
        { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 }, { suit: 'bamboo', rank: 4 },
        { suit: 'circles', rank: 5 }, { suit: 'circles', rank: 6 }, { suit: 'circles', rank: 7 },
        { suit: 'characters', rank: 1 }, { suit: 'characters', rank: 2 }, { suit: 'characters', rank: 3 },
        { suit: 'dragon', rank: 1 }, { suit: 'dragon', rank: 1 }, { suit: 'dragon', rank: 1 },
        { suit: 'wind', rank: 2 }
      ],
      melds: [],
      correctWaits: [{ suit: 'wind', rank: 2 }],
      explanation: 'You have four complete sets (three chows and a dragon pong). You need a pair to win, so you are waiting on a second South Wind (tanki / pair wait).'
    },
    // Two-sided wait (ryanmen)
    {
      id: 'iw_02',
      type: 'identify_waits',
      difficulty: 'easy',
      title: 'Classic Two-Sided Wait',
      hand: [
        { suit: 'bamboo', rank: 1 }, { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 },
        { suit: 'circles', rank: 4 }, { suit: 'circles', rank: 5 }, { suit: 'circles', rank: 6 },
        { suit: 'characters', rank: 7 }, { suit: 'characters', rank: 8 }, { suit: 'characters', rank: 9 },
        { suit: 'dragon', rank: 3 }, { suit: 'dragon', rank: 3 },
        { suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 6 }
      ],
      melds: [],
      correctWaits: [{ suit: 'bamboo', rank: 4 }, { suit: 'bamboo', rank: 7 }],
      explanation: 'Three complete chows, a White Dragon pair, and 5-6 Bamboo waiting on either side. This is a ryanmen (two-sided) wait: 4 Bamboo or 7 Bamboo completes the hand.'
    },
    // Middle wait (kanchan)
    {
      id: 'iw_03',
      type: 'identify_waits',
      difficulty: 'medium',
      title: 'Closed Middle Wait',
      hand: [
        { suit: 'circles', rank: 1 }, { suit: 'circles', rank: 2 }, { suit: 'circles', rank: 3 },
        { suit: 'bamboo', rank: 4 }, { suit: 'bamboo', rank: 4 }, { suit: 'bamboo', rank: 4 },
        { suit: 'characters', rank: 6 }, { suit: 'characters', rank: 6 },
        { suit: 'wind', rank: 1 }, { suit: 'wind', rank: 1 }, { suit: 'wind', rank: 1 },
        { suit: 'circles', rank: 5 }, { suit: 'circles', rank: 7 }
      ],
      melds: [],
      correctWaits: [{ suit: 'circles', rank: 6 }],
      explanation: 'You have three complete sets (1-2-3 Circles chow, 4 Bamboo pong, East Wind pong), a 6 Characters pair, and 5-7 Circles needing the middle tile. Waiting on 6 Circles (kanchan wait).'
    },
    // Multiple waits from different decompositions
    {
      id: 'iw_04',
      type: 'identify_waits',
      difficulty: 'hard',
      title: 'Multiple Wait Patterns',
      hand: [
        { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 }, { suit: 'bamboo', rank: 4 },
        { suit: 'bamboo', rank: 4 }, { suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 6 },
        { suit: 'circles', rank: 7 }, { suit: 'circles', rank: 8 }, { suit: 'circles', rank: 9 },
        { suit: 'characters', rank: 3 }, { suit: 'characters', rank: 3 },
        { suit: 'characters', rank: 5 }, { suit: 'characters', rank: 6 }
      ],
      melds: [],
      correctWaits: [{ suit: 'characters', rank: 4 }, { suit: 'characters', rank: 7 }],
      explanation: 'Three complete sets (2-3-4 Bamboo, 4-5-6 Bamboo, 7-8-9 Circles), a 3 Characters pair, and 5-6 Characters forming a two-sided wait. Waiting on 4 Characters or 7 Characters.'
    },
    // Complex: hand can decompose multiple ways
    {
      id: 'iw_05',
      type: 'identify_waits',
      difficulty: 'hard',
      title: 'Flexible Tenpai',
      hand: [
        { suit: 'circles', rank: 1 }, { suit: 'circles', rank: 2 }, { suit: 'circles', rank: 3 },
        { suit: 'circles', rank: 3 }, { suit: 'circles', rank: 4 }, { suit: 'circles', rank: 5 },
        { suit: 'circles', rank: 5 }, { suit: 'circles', rank: 6 }, { suit: 'circles', rank: 7 },
        { suit: 'bamboo', rank: 8 }, { suit: 'bamboo', rank: 8 }, { suit: 'bamboo', rank: 8 },
        { suit: 'circles', rank: 2 }
      ],
      melds: [],
      correctWaits: [{ suit: 'circles', rank: 2 }, { suit: 'circles', rank: 5 }, { suit: 'circles', rank: 8 }],
      explanation: 'This hand can decompose multiple ways. With 8 Bamboo pong locked in, the Circles tiles form overlapping sequences. Drawing 2, 5, or 8 Circles each allows a valid 4-set-plus-pair decomposition.'
    }
  ];

  const CLAIM_OR_PASS_PUZZLES = [
    // Good pong claim — dragon pong for guaranteed value
    {
      id: 'cp_01',
      type: 'claim_or_pass',
      difficulty: 'easy',
      title: 'Dragon Pong Opportunity',
      hand: [
        { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 }, { suit: 'bamboo', rank: 4 },
        { suit: 'circles', rank: 5 }, { suit: 'circles', rank: 6 },
        { suit: 'characters', rank: 7 }, { suit: 'characters', rank: 8 },
        { suit: 'characters', rank: 3 }, { suit: 'characters', rank: 3 },
        { suit: 'dragon', rank: 1 }, { suit: 'dragon', rank: 1 },
        { suit: 'bamboo', rank: 6 }, { suit: 'bamboo', rank: 7 }
      ],
      melds: [],
      offeredTile: { suit: 'dragon', rank: 1 },
      claimType: 'pong',
      correctAnswer: true,
      explanation: 'Always claim dragon pongs! Red Dragon pong gives 10 guaranteed points. Your hand is already well-structured with partial sequences, so opening it up is worth the trade-off.'
    },
    // Bad chow claim — kills hand value
    {
      id: 'cp_02',
      type: 'claim_or_pass',
      difficulty: 'medium',
      title: 'Chow That Kills Value',
      hand: [
        { suit: 'bamboo', rank: 1 }, { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 },
        { suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 6 }, { suit: 'bamboo', rank: 7 },
        { suit: 'bamboo', rank: 8 }, { suit: 'bamboo', rank: 9 },
        { suit: 'bamboo', rank: 4 }, { suit: 'bamboo', rank: 4 },
        { suit: 'circles', rank: 3 }, { suit: 'circles', rank: 4 },
        { suit: 'characters', rank: 2 }
      ],
      melds: [],
      offeredTile: { suit: 'characters', rank: 3 },
      claimType: 'chow',
      correctAnswer: false,
      explanation: 'Pass! You are close to a Pure One Suit (Qing Yi Se, 50 points) in Bamboo. Claiming this chow opens your hand and adds non-Bamboo tiles, destroying your flush potential. The value loss far outweighs the shanten improvement.'
    },
    // Good pong claim — improves shanten significantly
    {
      id: 'cp_03',
      type: 'claim_or_pass',
      difficulty: 'easy',
      title: 'Pong to Tenpai',
      hand: [
        { suit: 'circles', rank: 1 }, { suit: 'circles', rank: 2 }, { suit: 'circles', rank: 3 },
        { suit: 'bamboo', rank: 4 }, { suit: 'bamboo', rank: 5 }, { suit: 'bamboo', rank: 6 },
        { suit: 'characters', rank: 7 }, { suit: 'characters', rank: 8 },
        { suit: 'wind', rank: 1 }, { suit: 'wind', rank: 1 },
        { suit: 'characters', rank: 2 }, { suit: 'characters', rank: 2 },
        { suit: 'dragon', rank: 3 }
      ],
      melds: [],
      offeredTile: { suit: 'characters', rank: 2 },
      claimType: 'pong',
      correctAnswer: true,
      explanation: 'Claiming this pong gets you very close to tenpai. You already have two complete chows. The 2 Characters pong plus your remaining tiles give you a strong position. The East Wind pair can serve as your winning pair.'
    },
    // Bad pong — hand is already strong concealed
    {
      id: 'cp_04',
      type: 'claim_or_pass',
      difficulty: 'hard',
      title: 'Keep It Concealed',
      hand: [
        { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 3 }, { suit: 'bamboo', rank: 4 },
        { suit: 'circles', rank: 3 }, { suit: 'circles', rank: 4 }, { suit: 'circles', rank: 5 },
        { suit: 'characters', rank: 6 }, { suit: 'characters', rank: 7 }, { suit: 'characters', rank: 8 },
        { suit: 'dragon', rank: 2 }, { suit: 'dragon', rank: 2 },
        { suit: 'wind', rank: 4 }, { suit: 'wind', rank: 4 }
      ],
      melds: [],
      offeredTile: { suit: 'wind', rank: 4 },
      claimType: 'pong',
      correctAnswer: false,
      explanation: 'Pass! Your hand is already tenpai and fully concealed. Opening it with a pong loses the Fully Concealed bonus (5 pts) and Riichi eligibility (10 pts). You are waiting for either Green Dragon or North Wind to complete your pair. Stay closed for maximum value.'
    },
    // Marginal chow — worth it because hand is weak otherwise
    {
      id: 'cp_05',
      type: 'claim_or_pass',
      difficulty: 'medium',
      title: 'Chow to Rescue a Weak Hand',
      hand: [
        { suit: 'circles', rank: 1 }, { suit: 'circles', rank: 3 },
        { suit: 'bamboo', rank: 2 }, { suit: 'bamboo', rank: 5 },
        { suit: 'characters', rank: 4 }, { suit: 'characters', rank: 6 },
        { suit: 'wind', rank: 2 }, { suit: 'wind', rank: 3 },
        { suit: 'dragon', rank: 1 }, { suit: 'dragon', rank: 3 },
        { suit: 'characters', rank: 8 }, { suit: 'characters', rank: 9 },
        { suit: 'bamboo', rank: 7 }
      ],
      melds: [],
      offeredTile: { suit: 'characters', rank: 7 },
      claimType: 'chow',
      correctAnswer: true,
      explanation: 'Your hand is very disconnected (high shanten). Claiming the 7 Characters to form a 7-8-9 chow is one of the few ways to make progress. When your hand is this far from winning, any meld improvement helps.'
    }
  ];

  const ALL_PUZZLES = [
    ...BEST_DISCARD_PUZZLES,
    ...IDENTIFY_WAITS_PUZZLES,
    ...CLAIM_OR_PASS_PUZZLES
  ];

  // ── Helper Functions ──

  function buildHandFromDef(tileDefs) {
    const T = Tile();
    const hand = Hand().create();
    for (const def of tileDefs) {
      hand.concealed.push(T.create(def.suit, def.rank));
    }
    return hand;
  }

  function tileDefToId(def) {
    return def.suit + '-' + def.rank;
  }

  function tileDefsMatch(a, b) {
    return a.suit === b.suit && a.rank === b.rank;
  }

  function tileDefSetEquals(setA, setB) {
    if (setA.length !== setB.length) return false;
    const idsA = setA.map(tileDefToId).sort();
    const idsB = setB.map(tileDefToId).sort();
    return idsA.every((id, i) => id === idsB[i]);
  }

  function tileDefInSet(def, set) {
    return set.some(s => tileDefsMatch(def, s));
  }

  // ── Storage Keys ──

  const STORAGE_KEY = 'mj_practice_progress';

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (_) {
      // localStorage unavailable
    }
  }

  // ── PracticeMode Class ──

  class PracticeMode {
    constructor() {
      this.progress = loadProgress();
    }

    /**
     * Returns all puzzles grouped by category
     */
    getPuzzles() {
      return {
        best_discard: BEST_DISCARD_PUZZLES.map(p => this._enrichPuzzle(p)),
        identify_waits: IDENTIFY_WAITS_PUZZLES.map(p => this._enrichPuzzle(p)),
        claim_or_pass: CLAIM_OR_PASS_PUZZLES.map(p => this._enrichPuzzle(p))
      };
    }

    _enrichPuzzle(puzzle) {
      return {
        ...puzzle,
        completed: !!this.progress[puzzle.id]
      };
    }

    /**
     * Returns puzzle data for a specific puzzle, ready for display
     */
    startPuzzle(puzzleId) {
      const puzzle = ALL_PUZZLES.find(p => p.id === puzzleId);
      if (!puzzle) return null;

      const hand = buildHandFromDef(puzzle.hand);
      const T = Tile();

      const result = {
        id: puzzle.id,
        type: puzzle.type,
        difficulty: puzzle.difficulty,
        title: puzzle.title,
        hand: hand,
        handDisplay: hand.concealed.map(t => ({ tile: t, name: T.getName(t), display: T.getDisplay(t) })),
        melds: puzzle.melds,
        completed: !!this.progress[puzzle.id]
      };

      if (puzzle.type === 'best_discard') {
        result.seatWind = puzzle.seatWind;
        result.roundWind = puzzle.roundWind;
        result.prompt = 'Which tile should you discard?';
      } else if (puzzle.type === 'identify_waits') {
        result.prompt = 'Which tiles complete this tenpai hand? Select all waiting tiles.';
      } else if (puzzle.type === 'claim_or_pass') {
        result.offeredTile = T.create(puzzle.offeredTile.suit, puzzle.offeredTile.rank);
        result.offeredTileName = T.getName(result.offeredTile);
        result.offeredTileDisplay = T.getDisplay(result.offeredTile);
        result.claimType = puzzle.claimType;
        result.prompt = `An opponent discards ${result.offeredTileName}. Should you claim it for a ${puzzle.claimType}?`;
      }

      return result;
    }

    /**
     * Validates the player's answer against the correct answer and AI verification
     * @param {string} puzzleId
     * @param {any} answer - For best_discard: {suit, rank}; identify_waits: [{suit,rank}...]; claim_or_pass: boolean
     * @returns {{ correct: boolean, explanation: string, optimalAnswer: any }}
     */
    checkAnswer(puzzleId, answer) {
      const puzzle = ALL_PUZZLES.find(p => p.id === puzzleId);
      if (!puzzle) return { correct: false, explanation: 'Unknown puzzle.', optimalAnswer: null };

      if (puzzle.type === 'best_discard') {
        return this._checkBestDiscard(puzzle, answer);
      } else if (puzzle.type === 'identify_waits') {
        return this._checkIdentifyWaits(puzzle, answer);
      } else if (puzzle.type === 'claim_or_pass') {
        return this._checkClaimOrPass(puzzle, answer);
      }

      return { correct: false, explanation: 'Unknown puzzle type.', optimalAnswer: null };
    }

    _checkBestDiscard(puzzle, answer) {
      const hand = buildHandFromDef(puzzle.hand);
      const T = Tile();
      const AI = AIE();

      // Build a minimal state and player for AIEngine
      const player = {
        seatIndex: 0,
        seatWind: puzzle.seatWind,
        hand: hand
      };
      const state = {
        roundWind: puzzle.roundWind,
        turnCount: 8,
        players: [
          { hand: hand, discards: [], seatWind: puzzle.seatWind, seatIndex: 0 },
          { hand: Hand().create(), discards: [], seatWind: 'south', seatIndex: 1 },
          { hand: Hand().create(), discards: [], seatWind: 'west', seatIndex: 2 },
          { hand: Hand().create(), discards: [], seatWind: 'north', seatIndex: 3 }
        ]
      };

      // Use AIEngine to find the optimal discard
      const engine = new AI.AIEngine();
      const aiChoice = engine.selectDiscard(player, state);
      const aiChoiceDef = aiChoice ? { suit: aiChoice.suit, rank: aiChoice.rank } : puzzle.correctTile;

      // Check if the player's answer matches either the puzzle answer or AI answer
      const matchesPuzzle = tileDefsMatch(answer, puzzle.correctTile);
      const matchesAI = aiChoice ? tileDefsMatch(answer, aiChoiceDef) : false;
      const correct = matchesPuzzle || matchesAI;

      const optimalName = T.getName(T.create(puzzle.correctTile.suit, puzzle.correctTile.rank));

      return {
        correct,
        explanation: correct
          ? 'Correct! ' + puzzle.explanation
          : `Not quite. The best discard is ${optimalName}. ${puzzle.explanation}`,
        optimalAnswer: puzzle.correctTile
      };
    }

    _checkIdentifyWaits(puzzle, answer) {
      const hand = buildHandFromDef(puzzle.hand);
      const T = Tile();
      const AI = AIE();

      // Use calcUkeire to find all actual waiting tiles
      const compact = AI.handToCompact(hand);
      const meldCount = puzzle.melds.length;
      const tracker = new AI.TileTracker();
      const ukeire = AI.calcUkeire(new Uint8Array(compact), meldCount, tracker);

      // Convert ukeire tiles to tile defs
      const computedWaits = ukeire.tiles.map(t => AI.indexToTileDef(t.idx));

      // Use puzzle-defined waits as the authoritative answer,
      // but also accept computed waits
      const expectedWaits = puzzle.correctWaits;

      // Check if the player's answer matches
      const answerSet = Array.isArray(answer) ? answer : [answer];
      const matchesExpected = tileDefSetEquals(answerSet, expectedWaits);
      const matchesComputed = computedWaits.length > 0 && tileDefSetEquals(answerSet, computedWaits);
      const correct = matchesExpected || matchesComputed;

      const waitNames = expectedWaits.map(w => T.getName(T.create(w.suit, w.rank)));

      return {
        correct,
        explanation: correct
          ? 'Correct! ' + puzzle.explanation
          : `The waiting tiles are: ${waitNames.join(', ')}. ${puzzle.explanation}`,
        optimalAnswer: expectedWaits
      };
    }

    _checkClaimOrPass(puzzle, answer) {
      const hand = buildHandFromDef(puzzle.hand);
      const T = Tile();
      const AI = AIE();
      const offeredTile = T.create(puzzle.offeredTile.suit, puzzle.offeredTile.rank);

      // Use AIEngine to verify
      const player = {
        seatIndex: 0,
        seatWind: 'east',
        hand: hand
      };
      const state = {
        roundWind: 'east',
        turnCount: 8,
        players: [
          { hand: hand, discards: [], seatWind: 'east', seatIndex: 0 },
          { hand: Hand().create(), discards: [], seatWind: 'south', seatIndex: 1 },
          { hand: Hand().create(), discards: [], seatWind: 'west', seatIndex: 2 },
          { hand: Hand().create(), discards: [], seatWind: 'north', seatIndex: 3 }
        ]
      };

      const engine = new AI.AIEngine();
      const aiWouldClaim = engine.shouldClaimMeld(player, offeredTile, puzzle.claimType, state);

      // Correct if matches either puzzle answer or AI answer
      const correct = (answer === puzzle.correctAnswer) || (answer === aiWouldClaim);

      return {
        correct,
        explanation: correct
          ? 'Correct! ' + puzzle.explanation
          : `The best play is to ${puzzle.correctAnswer ? 'CLAIM' : 'PASS'}. ${puzzle.explanation}`,
        optimalAnswer: puzzle.correctAnswer
      };
    }

    /**
     * Returns completion stats
     */
    getProgress() {
      this.progress = loadProgress();
      const total = ALL_PUZZLES.length;
      const completed = ALL_PUZZLES.filter(p => this.progress[p.id]).length;

      const byCategory = {
        best_discard: {
          total: BEST_DISCARD_PUZZLES.length,
          completed: BEST_DISCARD_PUZZLES.filter(p => this.progress[p.id]).length
        },
        identify_waits: {
          total: IDENTIFY_WAITS_PUZZLES.length,
          completed: IDENTIFY_WAITS_PUZZLES.filter(p => this.progress[p.id]).length
        },
        claim_or_pass: {
          total: CLAIM_OR_PASS_PUZZLES.length,
          completed: CLAIM_OR_PASS_PUZZLES.filter(p => this.progress[p.id]).length
        }
      };

      return {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        byCategory
      };
    }

    /**
     * Mark a puzzle as completed and persist
     */
    markComplete(puzzleId) {
      this.progress[puzzleId] = { completedAt: Date.now() };
      saveProgress(this.progress);
    }

    /**
     * Reset all progress
     */
    resetProgress() {
      this.progress = {};
      saveProgress(this.progress);
    }
  }

  root.MJ.PracticeMode = Object.freeze({ PracticeMode });

  if (typeof console !== 'undefined') console.log('[Mahjong] PracticeMode module loaded');
})(typeof window !== 'undefined' ? window : global);
