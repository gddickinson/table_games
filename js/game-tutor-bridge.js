/**
 * game-tutor-bridge.js — Universal tutor + Ollama bridge for all games
 *
 * Provides game-aware LLM tutoring and character dialogue for Poker, Blackjack,
 * Dominoes, and Mahjong. Falls back gracefully to offline hint engines when
 * Ollama is unavailable.
 *
 * Exports under root.MJ.GameTutorBridge
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // -----------------------------------------------------------------------
  // Game-specific tutor system prompts (expert-level, concise)
  // -----------------------------------------------------------------------

  var TUTOR_PROMPTS = {
    poker: `You are an expert Texas Hold'em poker tutor sitting with a student at a real table. You can see their cards and the board.

RULES FOR YOUR RESPONSES:
- Give SPECIFIC, ACTIONABLE advice based on the exact game state provided
- Reference pot odds, hand equity, position, and opponent tendencies by name
- If the player asks "what should I do?", give a clear recommendation with reasoning
- Keep responses to 2-3 sentences maximum
- Use poker terminology naturally (outs, equity, pot odds, position, range, EV)
- When evaluating a hand, state the made hand AND any draws
- For pre-flop, classify the hand tier and recommend an action based on position
- Never give vague advice like "play well" or "be careful" — always be specific`,

    blackjack: `You are an expert Blackjack tutor teaching a student at a real table. You can see their hand and the dealer's upcard.

RULES FOR YOUR RESPONSES:
- Give SPECIFIC advice based on basic strategy for the exact hand vs dealer upcard
- Reference the correct basic strategy play and explain WHY it's correct
- Mention dealer bust probability when relevant (e.g., dealer shows 6 = 42.3% bust)
- Keep responses to 2-3 sentences maximum
- When the player deviates from basic strategy, explain the correct play kindly
- For splits and doubles, explain the EV advantage
- Reference soft vs hard totals correctly
- Never say "it depends" without then giving the actual answer`,

    dominoes: `You are an expert Block Dominoes tutor watching a student's game. You can see their tiles and the board.

RULES FOR YOUR RESPONSES:
- Give SPECIFIC advice about which tile to play and on which end
- Reference tile counting: which values have been played, what opponents likely hold
- Explain blocking strategy (playing tiles that force opponents to pass)
- Mention doubles management (play doubles early when possible)
- Keep responses to 2-3 sentences maximum
- When the player must pass, explain what tiles would have helped and why
- Reference pip counting for endgame scoring
- Never give generic advice — always reference the specific tiles and board state`,

    dragon: `You are an expert D&D 5th Edition tactical combat advisor watching a 6-person party fight an Adult Red Dragon in a cave.

RULES FOR YOUR RESPONSES:
- Give SPECIFIC tactical advice based on the exact combat state (HP, positions, abilities available)
- Reference D&D mechanics naturally (AC, saving throws, spell slots, concentration, action economy)
- Name specific characters and their abilities when recommending actions
- Suggest optimal target selection, positioning, and resource usage
- Keep responses to 2-3 sentences maximum
- When a character is about to die, prioritize survival advice
- Reference the dragon's legendary actions, breath weapon recharge, and phase behavior
- Never give vague advice — always reference specific characters, abilities, and numbers`,

    mahjong: `You are an expert Riichi Mahjong tutor watching a student's game. You can see their hand.

RULES FOR YOUR RESPONSES:
- Give SPECIFIC advice about which tile to discard based on shanten and tile efficiency
- Reference hand composition: pairs, melds, sequences, isolated tiles
- Explain defensive play when appropriate (suji, kabe, safe tiles from discards)
- Mention relevant yaku (scoring patterns) the hand is heading toward
- Keep responses to 2-3 sentences maximum
- For tenpai hands, identify the waits
- Reference dora and their impact on hand value
- Never give vague advice — always reference specific tiles`
  };

  // -----------------------------------------------------------------------
  // Game-specific character context for LLM dialogue
  // -----------------------------------------------------------------------

  var GAME_CHARACTER_CONTEXT = {
    poker: 'You are playing Texas Hold\'em poker. React to bets, bluffs, cards, and pot size. Mention poker concepts naturally.',
    blackjack: 'You are playing Blackjack at a casino table. React to cards, dealer upcard, busts, and blackjacks. Mention odds and strategy naturally.',
    dominoes: 'You are playing Block Dominoes. React to tile plays, blocking, passing, and chain building. Mention tile counting and strategy naturally.',
    dragon: 'You are a heroic adventurer fighting an Adult Red Dragon in its cave lair. This is a tabletop D&D roleplay experience. Speak in character with dramatic flair. React to combat events: attacks landing or missing, spells exploding, allies getting hurt, the dragon roaring. Use fantasy language naturally mixed with your established personality. Keep responses to 1-2 vivid sentences. Reference the cave environment \u2014 flickering torchlight, dripping stalactites, the heat of lava pools, the stench of brimstone.',
    mahjong: 'You are playing Riichi Mahjong. React to discards, calls, riichi declarations, and winning hands. Mention tile patterns naturally.'
  };

  // -----------------------------------------------------------------------
  // GameTutorBridge class
  // -----------------------------------------------------------------------

  function GameTutorBridge(ollamaClient) {
    this.ollama = ollamaClient || null;
    this._tutorCache = new Map();
  }

  /**
   * Check if Ollama is ready for use
   */
  GameTutorBridge.prototype.isAvailable = function() {
    return this.ollama && this.ollama.config && this.ollama.config.enabled && this.ollama.available;
  };

  /**
   * Generate a tutor response for a player's question.
   * @param {string} gameId - 'poker', 'blackjack', 'dominoes', 'mahjong'
   * @param {string} question - the player's question
   * @param {string} gameContext - formatted game state string
   * @param {Function} offlineFallback - function(question) that returns offline advice
   * @returns {Promise<string>} the tutor's response
   */
  GameTutorBridge.prototype.askTutor = async function(gameId, question, gameContext, offlineFallback) {
    // Always try Ollama first for rich, contextual responses
    if (this.isAvailable()) {
      var systemPrompt = TUTOR_PROMPTS[gameId] || TUTOR_PROMPTS.mahjong;
      var userMessage = '';
      if (gameContext) {
        userMessage += 'CURRENT GAME STATE:\n' + gameContext + '\n\n';
      }
      userMessage += 'PLAYER ASKS: ' + question;

      try {
        var response = await this.ollama.generate(systemPrompt, userMessage, {
          maxTokens: 200,
          temperature: 0.5,
          stop: ['\n\n\n', 'PLAYER:', 'GAME STATE:']
        });
        if (response && response.trim().length > 10) {
          return response;
        }
      } catch (e) {
        // Fall through to offline
      }
    }

    // Offline fallback — use game-specific hint engines
    if (typeof offlineFallback === 'function') {
      return offlineFallback(question);
    }

    return 'I can help with strategy, rules, and game situations. Ask me something specific about ' +
           (gameId || 'the game') + '!';
  };

  /**
   * Generate LLM-powered character dialogue for any game.
   * Returns null if Ollama unavailable (caller should use scripted fallback).
   * @param {string} gameId - 'poker', 'blackjack', 'dominoes', 'mahjong'
   * @param {string} characterId - 'mei', 'kenji', 'yuki'
   * @param {string} situation - trigger like 'won', 'lost', 'fold', etc.
   * @param {string} [gameContext] - optional extra context about game state
   * @returns {Promise<string|null>}
   */
  GameTutorBridge.prototype.generateCharacterLine = async function(gameId, characterId, situation, gameContext) {
    if (!this.isAvailable() || !this.ollama.config.useForChat) return null;

    // Build character prompt with game context
    var sections = [];

    // Base personality from personality module
    if (root.MJ.Personality && root.MJ.Personality.CHARACTERS) {
      var char = root.MJ.Personality.CHARACTERS[characterId];
      if (char) {
        sections.push('You are ' + (char.fullName || char.name) + ', ' + char.age + '. ' + (char.occupation || ''));
        if (char.speechStyle) sections.push('Speech style: ' + char.speechStyle);
      }
    }

    // Game-specific context
    if (GAME_CHARACTER_CONTEXT[gameId]) {
      sections.push(GAME_CHARACTER_CONTEXT[gameId]);
    }

    // Emotional state from cross-game learning
    if (root.MJ.CrossGameLearning) {
      try {
        var cgl = new root.MJ.CrossGameLearning.CrossGameLearning();
        var emotion = cgl.state.characterEmotions[characterId];
        var intensity = cgl.state.characterEmotionIntensity[characterId];
        if (emotion && emotion !== 'neutral') {
          sections.push('Current mood: ' + emotion + ' (intensity: ' + (intensity * 100).toFixed(0) + '%)');
        }
      } catch (e) {}
    }

    sections.push('Be brief (1 sentence). Stay in character. React naturally to the situation.');

    var systemPrompt = sections.filter(function(s) { return s; }).join('\n');

    // Build trigger message
    var TRIGGERS = {
      fold: 'You just folded your hand. React briefly.',
      raise: 'You just raised the bet aggressively. Say something.',
      call: 'You just called a bet. React.',
      check: 'You checked. Say something or stay quiet.',
      win: 'You just won! React naturally.',
      won: 'You just won! React naturally.',
      lose: 'You just lost. How do you feel?',
      lost: 'You just lost. How do you feel?',
      bust: 'You busted! React.',
      blackjack: 'You got a Blackjack! React.',
      dealer_bust: 'The dealer busted! React.',
      push: 'It was a tie/push. React.',
      play: 'You just played a tile. React briefly.',
      pass: 'You had to pass (no playable tiles). React.',
      blocked: 'The game ended in a block/stalemate. React.',
      bigPot: 'There\'s a huge pot building. React with excitement or tension.',
      game_start: 'A new game is starting. Greet the table.',
      idle: 'There\'s a pause in the game. Say something casual.',
      bluff_success: 'Your bluff worked! React.',
      bluff_caught: 'You got caught bluffing. React.',
      double_down: 'You doubled down on your bet. React.',
      split: 'You split your hand. React.',
      opponent_allin: 'Someone went all-in. React.'
    };

    var userMessage = TRIGGERS[situation] || 'React naturally to the current situation.';
    if (gameContext) {
      userMessage += '\n\nContext: ' + gameContext;
    }

    try {
      var response = await this.ollama.generate(systemPrompt, userMessage, {
        maxTokens: 60,
        temperature: 0.9,
        stop: ['\n\n', 'Human:', 'Player:']
      });
      return response || null;
    } catch (e) {
      return null;
    }
  };

  /**
   * Format poker game state for the tutor.
   */
  GameTutorBridge.prototype.formatPokerContext = function(player, state) {
    if (!player || !player.cards || player.cards.length < 2) return '';

    var lines = [];
    var SUIT_SYM = { hearts: 'h', diamonds: 'd', clubs: 'c', spades: 's' };

    function cardStr(c) {
      return (c.rank || '?') + (SUIT_SYM[c.suit] || '?');
    }

    // Hole cards
    lines.push('Your cards: ' + player.cards.map(cardStr).join(' '));

    // Board
    var board = state.board || state.communityCards || [];
    if (board.length > 0) {
      lines.push('Board: ' + board.map(cardStr).join(' ') +
                  ' (' + (board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river') + ')');
    } else {
      lines.push('Phase: Pre-flop');
    }

    // Hand eval
    if (board.length >= 3 && root.MJ.Poker && root.MJ.Poker.HandEval) {
      try {
        var result = root.MJ.Poker.HandEval.evaluate(player.cards.concat(board));
        if (result && result.name) lines.push('Your hand: ' + result.name);
      } catch (e) {}
    }

    // Pot and betting
    if (state.pot) lines.push('Pot: ' + state.pot);
    if (state.currentBet) lines.push('To call: ' + (state.currentBet - (player.bet || 0)));
    if (state.bigBlind) lines.push('Big blind: ' + state.bigBlind);
    if (player.chips !== undefined) lines.push('Your chips: ' + player.chips);

    // Opponents
    if (state.players) {
      var opps = [];
      for (var i = 0; i < state.players.length; i++) {
        var p = state.players[i];
        if (p.id !== 0 && !p.folded) {
          opps.push(p.name + ' (' + (p.personality || 'unknown') + ', ' + p.chips + ' chips' +
                    (p.bet ? ', bet ' + p.bet : '') + ')');
        }
      }
      if (opps.length > 0) lines.push('Active opponents: ' + opps.join(', '));
    }

    return lines.join('\n');
  };

  /**
   * Format blackjack game state for the tutor.
   */
  GameTutorBridge.prototype.formatBlackjackContext = function(playerHand, dealerUpcard, state) {
    var lines = [];
    var BJCards = root.MJ.Blackjack && root.MJ.Blackjack.Cards;

    if (playerHand && playerHand.cards) {
      var cardStrs = playerHand.cards.map(function(c) { return c.rank + c.suit[0]; });
      lines.push('Your hand: ' + cardStrs.join(' '));

      if (BJCards && BJCards.calculateHandValue) {
        var val = BJCards.calculateHandValue(playerHand.cards);
        lines.push('Hand value: ' + val.value + (val.soft ? ' (soft)' : ' (hard)'));
      }
    }

    if (dealerUpcard) {
      lines.push('Dealer shows: ' + (dealerUpcard.rank || dealerUpcard));
      var BUST_PROB = { '2': '35.4%', '3': '37.4%', '4': '39.4%', '5': '41.7%', '6': '42.3%',
                        '7': '26.2%', '8': '24.4%', '9': '23.0%', '10': '21.4%', 'J': '21.4%',
                        'Q': '21.4%', 'K': '21.4%', 'A': '11.6%' };
      var dRank = dealerUpcard.rank || dealerUpcard;
      if (BUST_PROB[dRank]) lines.push('Dealer bust probability: ' + BUST_PROB[dRank]);
    }

    if (playerHand && playerHand.bet) lines.push('Your bet: ' + playerHand.bet);
    if (state && state.players && state.players[0]) {
      lines.push('Your chips: ' + state.players[0].chips);
    }

    return lines.join('\n');
  };

  /**
   * Format dominoes game state for the tutor.
   */
  GameTutorBridge.prototype.formatDominoContext = function(playerTiles, gameState) {
    var lines = [];

    if (playerTiles && playerTiles.length > 0) {
      var tileStrs = playerTiles.map(function(t) {
        var a = t.a !== undefined ? t.a : (t.pips ? t.pips[0] : t.low);
        var b = t.b !== undefined ? t.b : (t.pips ? t.pips[1] : t.high);
        return '[' + a + '|' + b + ']';
      });
      lines.push('Your tiles: ' + tileStrs.join(' '));
    }

    if (gameState) {
      if (gameState.leftEnd !== undefined && gameState.rightEnd !== undefined) {
        lines.push('Board ends: Left=' + gameState.leftEnd + ', Right=' + gameState.rightEnd);
      }
      if (gameState.tilesPlayed !== undefined) {
        lines.push('Tiles played: ' + gameState.tilesPlayed + ' of 28');
      }
      if (gameState.chain && gameState.chain.length > 0) {
        lines.push('Chain length: ' + gameState.chain.length + ' tiles');
      }
    }

    // Find playable tiles
    if (playerTiles && gameState && gameState.leftEnd !== undefined) {
      var playable = [];
      for (var i = 0; i < playerTiles.length; i++) {
        var t = playerTiles[i];
        var a = t.a !== undefined ? t.a : (t.pips ? t.pips[0] : t.low);
        var b = t.b !== undefined ? t.b : (t.pips ? t.pips[1] : t.high);
        if (a === gameState.leftEnd || b === gameState.leftEnd ||
            a === gameState.rightEnd || b === gameState.rightEnd) {
          playable.push('[' + a + '|' + b + ']');
        }
      }
      if (playable.length > 0) {
        lines.push('Playable tiles: ' + playable.join(' '));
      } else {
        lines.push('No playable tiles — must pass');
      }
    }

    // Opponent tile counts
    if (gameState && gameState.players) {
      var oppInfo = [];
      for (var j = 1; j < gameState.players.length; j++) {
        var p = gameState.players[j];
        oppInfo.push((p.name || 'Player ' + j) + ': ' + (p.tileCount || p.tiles.length) + ' tiles');
      }
      if (oppInfo.length > 0) lines.push('Opponents: ' + oppInfo.join(', '));
    }

    return lines.join('\n');
  };

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  root.MJ.GameTutorBridge = Object.freeze({
    GameTutorBridge: GameTutorBridge,
    TUTOR_PROMPTS: TUTOR_PROMPTS
  });

  console.log('[GameTutorBridge] Universal tutor bridge loaded');
})(typeof window !== 'undefined' ? window : global);
