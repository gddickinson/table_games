/**
 * llm-players.js — AI players that converse while playing
 * Each player has a personality and comments on the game.
 * Works offline with scripted dialogue or online with LLM API.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  const Tile = () => root.MJ.Tile;

  const PERSONALITIES = {
    south: {
      name: 'Mei', style: 'Cautious and analytical',
      avatar: '👩', traits: ['defensive', 'observant', 'strategic'],
      phrases: {
        game_start: ['Let\'s have a good game!', 'May the tiles be with us.', 'I\'m feeling lucky today!'],
        drew_good: ['Oh, that\'s useful.', 'Nice draw.', 'This is coming together...'],
        drew_bad: ['Hmm, not what I needed.', 'Well, can\'t win them all.'],
        discard: ['I\'ll let this one go.', 'Don\'t need this.', 'Bye bye, little tile.'],
        pong: ['Pong! Sorry, I need that.', 'That\'s mine!', 'Pong — thank you!'],
        chow: ['I\'ll take that sequence.', 'Chow!'],
        riichi: ['Riichi! I\'m ready!', 'Going all in!', 'Watch out — Riichi!'],
        win: ['Tsumo!', 'That\'s the one!', 'Finally!'],
        someone_wins: ['Well played!', 'Good hand!', 'Congratulations!'],
        someone_riichi: ['Careful everyone...', 'Time to play safe.', 'Danger zone!'],
        thinking: ['Hmm, let me think...', 'Interesting position...', 'Decisions, decisions...'],
        taunt: ['That was a bold discard!', 'Are you sure about that one?', 'Ooh, living dangerously!'],
        encourage: ['You\'re doing well!', 'Good strategy!', 'Nice hand shape!'],
        teach: ['Remember, middle tiles are more versatile!', 'Keep an eye on the discard pool!', 'Sometimes folding is the winning move.']
      }
    },
    west: {
      name: 'Kenji', style: 'Aggressive and talkative',
      avatar: '👨', traits: ['aggressive', 'confident', 'chatty'],
      phrases: {
        game_start: ['Let\'s GO!', 'Bring it on!', 'Who\'s ready to lose?'],
        drew_good: ['Yes! Come to papa!', 'That\'s what I\'m talking about!', 'Perfect!'],
        drew_bad: ['Ugh.', 'Really? That tile?', 'The wall hates me.'],
        discard: ['Take this!', 'Here, have it.', 'Didn\'t want it anyway.'],
        pong: ['PONG! Ha!', 'Mine now!', 'Thank you very much!'],
        chow: ['Chow! Building something big here!', 'I\'ll take it!'],
        riichi: ['RIICHI! Come at me!', 'I\'m ALL IN!', 'Who dares challenge me?'],
        win: ['BOOM! That\'s a WIN!', 'Read \'em and weep!', 'Victory is MINE!'],
        someone_wins: ['Aw man!', 'Lucky...', 'I\'ll get you next time!'],
        someone_riichi: ['Pff, Riichi? I\'m not scared.', 'Challenge accepted!', 'Bring it!'],
        thinking: ['Hmm...', 'Bold move or safe play...', 'Choices, choices...'],
        taunt: ['That\'s what you\'re going with?', 'Bold strategy there!', 'Risky~'],
        encourage: ['Not bad!', 'You\'ve got potential!', 'Decent play!'],
        teach: ['Pro tip: don\'t be afraid to claim pongs!', 'Dragon pongs are free points!', 'Attack is the best defense!']
      }
    },
    north: {
      name: 'Yuki', style: 'Calm and wise',
      avatar: '👵', traits: ['balanced', 'wise', 'patient'],
      phrases: {
        game_start: ['May this be an instructive game.', 'Patience wins in Mahjong.', 'The tiles reveal themselves in time.'],
        drew_good: ['Ah, harmony.', 'The wall provides.', 'Excellent.'],
        drew_bad: ['The path changes.', 'Adaptability is key.', 'No matter.'],
        discard: ['This tile has served its purpose.', 'Release what doesn\'t serve you.'],
        pong: ['Pong. The pattern demands it.', 'This was meant to be.'],
        chow: ['A sequence emerges.', 'Order from chaos.'],
        riichi: ['Riichi. The hand speaks.', 'All is aligned.'],
        win: ['And so it concludes.', 'The hand reveals its truth.', 'Tsumo.'],
        someone_wins: ['Beautifully played.', 'A worthy hand.', 'The tiles chose well.'],
        someone_riichi: ['The winds shift. Stay aware.', 'Respect the declaration.', 'Tread carefully.'],
        thinking: ['Patience...', 'In every hand, a lesson.', 'The discard speaks volumes.'],
        taunt: ['An interesting choice...', 'Hmm, unconventional.', 'Curious.'],
        encourage: ['You read the table well.', 'Your instincts improve.', 'Wise discard.'],
        teach: ['Study the discards — they tell the story.', 'A concealed hand is a patient hand.', 'Defense and offense are two sides of one coin.']
      }
    }
  };

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  class ConversationalPlayer {
    constructor(seatWind) {
      this.personality = PERSONALITIES[seatWind] || PERSONALITIES.south;
      this.messages = [];
      this.lastEventTurn = -1;
      this.chattiness = 0.3; // probability of commenting on any given event
      this.enabled = true;
    }

    setChattiness(level) { this.chattiness = Math.max(0, Math.min(1, level)); }
    setEnabled(enabled) { this.enabled = enabled; }

    /** Generate a comment based on a game event */
    comment(event, data) {
      if (!this.enabled) return null;
      // Don't spam every turn
      if (data && data.turn && data.turn === this.lastEventTurn && event !== 'win' && event !== 'riichi') return null;
      if (data && data.turn) this.lastEventTurn = data.turn;

      // Some events always trigger, others are probabilistic
      const alwaysTrigger = ['win', 'riichi', 'game_start', 'someone_wins', 'someone_riichi'];
      if (!alwaysTrigger.includes(event) && Math.random() > this.chattiness) return null;

      const phrases = this.personality.phrases[event];
      if (!phrases || phrases.length === 0) return null;

      const msg = {
        speaker: this.personality.name,
        avatar: this.personality.avatar,
        text: pick(phrases),
        event,
        timestamp: Date.now()
      };

      // Add context-specific embellishments
      if (event === 'pong' && data && data.tile) {
        msg.text += ` (${Tile().getName(data.tile)})`;
      }
      if (event === 'win' && data && data.score) {
        msg.text += ` ${data.score} points!`;
      }
      if (event === 'taunt' && data && data.tile) {
        msg.text = msg.text.replace('that one', Tile().getName(data.tile));
      }

      this.messages.push(msg);
      // Keep message history manageable
      if (this.messages.length > 100) this.messages.splice(0, 50);

      return msg;
    }

    /** Teaching comment for the human player */
    teachingComment(player, state) {
      if (!this.enabled || Math.random() > 0.15) return null;
      const phrases = this.personality.phrases.teach;
      if (!phrases) return null;
      return {
        speaker: this.personality.name,
        avatar: this.personality.avatar,
        text: pick(phrases),
        event: 'teach',
        timestamp: Date.now()
      };
    }

    getMessages() { return [...this.messages]; }
    clearMessages() { this.messages = []; }
  }

  class ConversationManager {
    constructor() {
      this.players = {};
      this.allMessages = [];
      this.onMessage = null;
    }

    init() {
      this.players.south = new ConversationalPlayer('south');
      this.players.west = new ConversationalPlayer('west');
      this.players.north = new ConversationalPlayer('north');
    }

    setChattiness(level) {
      for (const p of Object.values(this.players)) p.setChattiness(level);
    }

    setEnabled(enabled) {
      for (const p of Object.values(this.players)) p.setEnabled(enabled);
    }

    /** Broadcast an event to all AI players, collect comments */
    broadcast(event, data) {
      const messages = [];
      for (const [wind, player] of Object.entries(this.players)) {
        // Don't comment on own actions unless it's a trigger event
        if (data && data.seatWind === wind &&
            !['win', 'riichi', 'pong', 'chow', 'drew_good', 'drew_bad', 'discard'].includes(event)) continue;
        const msg = player.comment(event, data);
        if (msg) {
          messages.push(msg);
          this.allMessages.push(msg);
        }
      }
      // Notify UI
      for (const msg of messages) {
        if (this.onMessage) this.onMessage(msg);
      }
      // Keep history manageable
      if (this.allMessages.length > 200) this.allMessages.splice(0, 100);
      return messages;
    }

    /** Get a teaching comment from a random AI */
    getTeachingComment(player, state) {
      const winds = Object.keys(this.players);
      const wind = winds[Math.floor(Math.random() * winds.length)];
      return this.players[wind].teachingComment(player, state);
    }

    getRecentMessages(count) {
      return this.allMessages.slice(-count);
    }

    getAllMessages() { return [...this.allMessages]; }
    clearAll() { this.allMessages = []; for (const p of Object.values(this.players)) p.clearMessages(); }
  }

  root.MJ.LLMPlayers = Object.freeze({
    ConversationalPlayer, ConversationManager, PERSONALITIES
  });
  if (typeof console !== 'undefined') console.log('[Mahjong] LLMPlayers module loaded');
})(typeof window !== 'undefined' ? window : global);
