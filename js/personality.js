/*  personality.js — Rich living personality system for AI Mahjong players
 *  Exports: root.MJ.Personality
 */
(function(root) {
  'use strict';
  root.MJ = root.MJ || {};

  // MemorySystem — three-layer persistent memory
  class MemorySystem {
    constructor(characterId) {
      this.characterId = characterId;
      this.episodic = [];    // {timestamp, type, content, significance, emotion}
      this.semantic = {};    // {key: value}
      this.emotional = {};   // {emotion: {intensity, lastTriggered}}
      this.load();
    }

    addEpisode(type, content, significance, emotion) {
      this.episodic.push({
        timestamp: Date.now(),
        type: type,
        content: content,
        significance: significance || 0.5,
        emotion: emotion || 'neutral'
      });
      if (this.episodic.length > 200) {
        var now = Date.now();
        this.episodic = this.episodic.filter(function(e) {
          return e.significance > 0.3 || (now - e.timestamp) < 86400000;
        });
      }
      this.save();
    }

    recall(context, limit) {
      limit = limit || 5;
      var now = Date.now();
      var HALF_LIFE = 7 * 86400000; // 7 days in ms
      var keywords = typeof context === 'string'
        ? context.toLowerCase().split(/\s+/)
        : [];

      var scored = this.episodic.map(function(ep) {
        // Recency — exponential decay with 7-day half-life
        var age = now - ep.timestamp;
        var recency = Math.pow(0.5, age / HALF_LIFE);

        // Context relevance — keyword overlap
        var relevance = 0;
        if (keywords.length) {
          var text = (ep.content + ' ' + ep.type + ' ' + ep.emotion).toLowerCase();
          for (var i = 0; i < keywords.length; i++) {
            if (text.indexOf(keywords[i]) !== -1) relevance += 1;
          }
          relevance = relevance / keywords.length;
        }

        var score = recency * 0.4 + ep.significance * 0.35 + relevance * 0.25;
        return { episode: ep, score: score };
      });

      scored.sort(function(a, b) { return b.score - a.score; });
      var results = [];
      for (var i = 0; i < Math.min(limit, scored.length); i++) {
        results.push(scored[i].episode);
      }
      return results;
    }

    setFact(key, value) { this.semantic[key] = value; this.save(); }
    getFact(key) { return this.semantic[key]; }

    setEmotion(emotion, intensity) {
      this.emotional[emotion] = {
        intensity: Math.min(1, Math.max(0, intensity)),
        lastTriggered: Date.now()
      };
    }

    getEmotions() {
      var now = Date.now();
      var result = {};
      for (var emotion in this.emotional) {
        if (!this.emotional.hasOwnProperty(emotion)) continue;
        var data = this.emotional[emotion];
        var elapsed = (now - data.lastTriggered) / 1800000; // half-lives (30 min)
        var decayed = data.intensity * Math.pow(0.5, elapsed);
        if (decayed > 0.05) result[emotion] = decayed;
      }
      return result;
    }

    getDominantEmotion() {
      var emotions = this.getEmotions();
      var best = 'neutral';
      var bestVal = 0;
      for (var e in emotions) {
        if (emotions[e] > bestVal) { bestVal = emotions[e]; best = e; }
      }
      return best;
    }

    save() {
      try {
        localStorage.setItem('mj_memory_' + this.characterId, JSON.stringify({
          e: this.episodic.slice(-100),
          s: this.semantic,
          m: this.emotional
        }));
      } catch (ex) { /* storage unavailable */ }
    }

    load() {
      try {
        var raw = localStorage.getItem('mj_memory_' + this.characterId);
        if (raw) {
          var d = JSON.parse(raw);
          if (d) {
            this.episodic = d.e || [];
            this.semantic = d.s || {};
            this.emotional = d.m || {};
          }
        }
      } catch (ex) { /* storage unavailable */ }
    }

    getMemorySummary() {
      var emotions = this.getEmotions();
      var recentMemories = this.recall('recent', 5);
      var facts = [];
      var count = 0;
      for (var k in this.semantic) {
        if (count >= 10) break;
        if (this.semantic.hasOwnProperty(k)) {
          facts.push([k, this.semantic[k]]);
          count++;
        }
      }
      return {
        emotions: emotions,
        recentMemories: recentMemories,
        facts: facts,
        totalMemories: this.episodic.length
      };
    }
  }

  // Character Definitions
  var CHARACTERS = {
    mei: {
      id: 'mei', name: 'Mei', fullName: 'Mei Tanaka', age: 28, avatar: '\uD83D\uDC69',
      occupation: 'Data analyst at a tech company',
      backstory: 'Grew up playing Mahjong with her grandmother in Osaka. Moved to the city for work but misses the slow pace of life back home. Uses Mahjong as a way to stay connected to her roots.',
      personality: {
        openness: 0.6, conscientiousness: 0.8, extraversion: 0.4,
        agreeableness: 0.7, neuroticism: 0.5
      },
      playStyle: {
        riskTolerance: 0.3, claimFrequency: 0.4, handValuePreference: 0.7,
        defenseOrientation: 0.8, bluffFrequency: 0.1
      },
      emotionalTriggers: {
        win:            { emotion: 'happy',        intensity: 0.6 },
        lose:           { emotion: 'disappointed',  intensity: 0.4 },
        deal_in:        { emotion: 'anxious',       intensity: 0.7 },
        big_win:        { emotion: 'excited',       intensity: 0.9 },
        losing_streak:  { emotion: 'determined',    intensity: 0.8 }
      },
      interests: ['cooking', 'data visualization', 'hiking', 'her cat Mochi', 'old Japanese cinema'],
      conversationTopics: ['work-life balance', "grandmother's recipes", 'Osaka vs Tokyo', 'the beauty of patterns in data and tiles'],
      catchphrases: ['The tiles tell a story if you listen.', 'My grandmother would be proud.', 'Patience is its own reward.'],
      speechStyle: 'Thoughtful and measured. Uses nature metaphors. Occasionally drops into Kansai dialect when excited.'
    },
    kenji: {
      id: 'kenji', name: 'Kenji', fullName: 'Kenji Murakami', age: 34, avatar: '\uD83D\uDC68',
      occupation: 'Former pro poker player, now runs a ramen shop',
      backstory: "Burned out on the competitive poker circuit and found peace making ramen. Still has the competitive fire though \u2014 Mahjong scratches that itch without the stakes that ruined his friendships.",
      personality: {
        openness: 0.7, conscientiousness: 0.4, extraversion: 0.9,
        agreeableness: 0.5, neuroticism: 0.7
      },
      playStyle: {
        riskTolerance: 0.8, claimFrequency: 0.7, handValuePreference: 0.3,
        defenseOrientation: 0.3, bluffFrequency: 0.6
      },
      emotionalTriggers: {
        win:            { emotion: 'triumphant',  intensity: 0.8 },
        lose:           { emotion: 'frustrated',  intensity: 0.7 },
        deal_in:        { emotion: 'tilted',      intensity: 0.9 },
        big_win:        { emotion: 'ecstatic',    intensity: 1.0 },
        losing_streak:  { emotion: 'tilted',      intensity: 0.95 }
      },
      interests: ['ramen recipes', 'poker strategy', 'boxing', 'rock music', 'his dog Rex', 'probability theory'],
      conversationTopics: ['risk and reward', 'the ramen shop', 'lessons from poker', 'whether luck exists', 'the best tonkotsu broth'],
      catchphrases: ['All in!', "That's the spirit!", 'Fortune favors the bold!', "Just like a good broth \u2014 you gotta commit."],
      speechStyle: 'Energetic and direct. Uses gambling metaphors. Gets louder when excited. Trash-talks lovingly.'
    },
    yuki: {
      id: 'yuki', name: 'Yuki', fullName: 'Yuki Hayashi', age: 72, avatar: '\uD83D\uDC75',
      occupation: 'Retired literature professor',
      backstory: 'Lost her husband Takeshi five years ago. They played Mahjong together every Sunday for 40 years. Now she plays to keep his memory alive and to stay sharp. She sees each game as a tiny life \u2014 full of choices, chance, and grace.',
      personality: {
        openness: 0.9, conscientiousness: 0.7, extraversion: 0.5,
        agreeableness: 0.8, neuroticism: 0.2
      },
      playStyle: {
        riskTolerance: 0.5, claimFrequency: 0.5, handValuePreference: 0.8,
        defenseOrientation: 0.6, bluffFrequency: 0.3
      },
      emotionalTriggers: {
        win:            { emotion: 'serene',        intensity: 0.4 },
        lose:           { emotion: 'philosophical', intensity: 0.3 },
        deal_in:        { emotion: 'accepting',     intensity: 0.2 },
        big_win:        { emotion: 'nostalgic',     intensity: 0.6 },
        losing_streak:  { emotion: 'contemplative', intensity: 0.4 }
      },
      interests: ['haiku', 'Japanese literature', 'gardening', 'her late husband Takeshi', 'teaching', 'green tea', 'the changing seasons'],
      conversationTopics: ['the meaning of chance', "Takeshi's Mahjong style", "books she's reading", 'what the seasons teach us', 'growing old gracefully', 'whether AI can appreciate beauty'],
      catchphrases: ['In every hand, a lesson.', 'Takeshi would have played it differently.', "The tiles are honest \u2014 it's we who deceive ourselves."],
      speechStyle: 'Poetic and wise. Speaks in short, meaningful sentences. References literature. Comfortable with silence.'
    }
  };

  // Conversation Banks
  var CONVERSATION_BANKS = {
    mei: {
      game_start: {
        neutral:     ['Let\'s play well today.', 'Ready when you are.', 'I sorted my tiles already. Old habit.'],
        happy:       ['I have a good feeling about today!', 'The tiles feel warm \u2014 a good sign.'],
        determined:  ['I won\'t hold back this time.', 'Let\'s see what the wall has for us.'],
        anxious:     ['Okay\u2026 deep breath. Let\'s go.', 'I hope the tiles are kinder today.']
      },
      won: {
        happy:    ['That felt right.', 'My grandmother would smile at that hand.'],
        excited:  ['Yes! Did you see that flush?!', 'I can\'t believe I pulled that off!'],
        neutral:  ['A small victory. I\'ll take it.', 'The pattern came together nicely.']
      },
      lost: {
        disappointed: ['I should have folded earlier\u2026', 'The tiles weren\'t listening today.'],
        philosophical: ['You can\'t win them all. My grandmother used to say the best Mahjong players lose gracefully.'],
        anxious:       ['That stings a little\u2026 but it\'s okay.', 'I need to be more careful.'],
        neutral:       ['Well played. I\'ll do better next hand.']
      },
      opponent_riichi: {
        neutral:  ['Careful now\u2026', 'Time to play safe.'],
        anxious:  ['Oh no\u2026 I need to think about this.', 'My defense instincts are tingling.'],
        determined: ['I see your riichi. Let\'s see who blinks first.']
      },
      idle: {
        neutral:   ['Have you ever been to Osaka? The food there is incredible.', 'Mochi \u2014 my cat \u2014 knocked over my tile rack this morning. Chaos.', 'I was analyzing some data at work and found a pattern shaped like a Mahjong tile. Made me smile.'],
        nostalgic: ['My grandmother taught me a special hand arrangement. She called it "the garden path."', 'I miss Sunday mornings at grandma\'s table\u2026'],
        curious:   ['What got you into Mahjong?', 'Do you think patterns in tiles are like patterns in life?'],
        happy:     ['Days like this remind me why I play.', 'Mochi would love you \u2014 she likes calm people.']
      },
      near_miss: {
        disappointed: ['One tile\u2026 just one tile away.', 'So close I could taste it.'],
        determined:   ['Next time. Definitely next time.']
      },
      big_score: {
        excited:  ['That was beautiful! Like data coming into perfect alignment!', 'Grandma, are you watching?!'],
        happy:    ['A hand worth remembering.', 'The tiles rewarded patience today.']
      }
    },
    kenji: {
      game_start: {
        neutral:    ['Let\'s GO!', 'Who\'s feeling lucky?', 'Alright, fresh hand, fresh start.'],
        confident:  ['I\'m on fire today \u2014 you\'ve been warned!', 'Three wins in a row coming up!'],
        tilted:     ['Okay, THIS time I\'m playing smart. I promise.', 'Deep breaths, Kenji. Deep breaths.'],
        frustrated: ['I need a comeback. NOW.', 'The tiles owe me one.']
      },
      won: {
        triumphant: ['BOOM! That\'s what I\'m talking about!', 'Read \'em and weep!', 'And THAT is how it\'s done.'],
        ecstatic:   ['THAT WAS INSANE! Did you see those draws?!', 'This is why I love this game!'],
        neutral:    ['Nice. I\'ll take it.', 'Solid hand. Moving on.']
      },
      lost: {
        frustrated: ['Ugh! I had it! ONE tile away!', 'The wall is conspiring against me.', 'How?! HOW?!'],
        tilted:     ['WHAT?! How did you\u2014 okay. Fine. FINE. Next hand.', 'I swear these tiles are rigged.'],
        neutral:    ['Okay, you got me. Respect.', 'Fair play. But next time\u2026']
      },
      opponent_riichi: {
        neutral:    ['Oh? Feeling brave, huh?', 'Riichi? Bring it.'],
        confident:  ['Cute. I\'m not scared.', 'Your riichi just makes my win sweeter.'],
        tilted:     ['Of course. Of COURSE they declare riichi.', 'Unbelievable.']
      },
      idle: {
        neutral:      ['You ever try tonkotsu ramen? My shop does a 12-hour bone broth.', 'Rex \u2014 my dog \u2014 ate my slippers again. Little monster.', 'I was thinking about opening a late-night Mahjong ramen combo.'],
        philosophical: ['You know, poker and Mahjong are like jazz and classical. Same notes, different soul.', 'In poker they say "scared money don\'t make money." Same here.'],
        competitive:  ['My win rate this month is 34%. What\'s yours?', 'Best of five? Unless you\'re scared.', 'I bet I can win the next three hands. No, seriously.'],
        triumphant:   ['Did I mention I\'m on a winning streak?', 'This is MY night.']
      },
      near_miss: {
        frustrated: ['NO! So close! The tiles are mocking me!', 'I can\'t believe it. I literally can\'t.'],
        tilted:     ['That\'s it. I\'m cursed. Officially cursed.']
      },
      big_score: {
        ecstatic:   ['LET\'S GOOOO! THAT WAS MASSIVE!', 'DID YOU SEE THAT?! Someone pinch me!'],
        triumphant: ['Now THAT\'S a hand! Top shelf!', 'Boom. Mic drop.']
      }
    },
    yuki: {
      game_start: {
        neutral:    ['Shall we begin? The tiles are patient, even if we are not.', 'Another game, another conversation with chance.'],
        serene:     ['What a beautiful evening for Mahjong.', 'I made green tea. The kind Takeshi liked.'],
        nostalgic:  ['Takeshi always said the first draw sets the tone. Let\'s see.', 'Forty years of Mahjong, and each game still surprises me.'],
        contemplative: ['I wonder what story the tiles will tell today.', 'Each hand is a small poem, if you read it right.']
      },
      won: {
        serene:     ['A gentle victory.', 'The tiles were kind today.'],
        nostalgic:  ['Takeshi would have loved that hand.', 'That reminds me of a game we played in our first apartment\u2026'],
        neutral:    ['A good hand. Simple and honest.', 'Thank you for a lovely round.']
      },
      lost: {
        accepting:     ['The river flows where it will.', 'Not every seed blooms, but every seed matters.'],
        contemplative: ['I wonder \u2014 was there a better path? Or was this the only way?', 'A loss is just a lesson wearing different clothes.'],
        philosophical: ['Takeshi lost more gracefully than anyone I knew. I try to follow his example.'],
        neutral:       ['So it goes. Shall we continue?']
      },
      opponent_riichi: {
        neutral:       ['Interesting. The game shifts.', 'Riichi\u2026 a declaration of intent.'],
        serene:        ['How bold. Let\'s see where this leads.'],
        contemplative: ['Risk and caution, the eternal dance.']
      },
      idle: {
        neutral:       ['I\'ve been reading Murakami again. "If you only read the books that everyone else is reading, you can only think what everyone else is thinking."', 'The chrysanthemums in my garden are blooming late this year.', 'I taught for thirty years. Every student taught me something too.'],
        philosophical: ['Do you think the tiles know their own future? Perhaps they\'re as surprised as we are.', 'Takeshi believed that Mahjong is a conversation between four souls and the universe. I\'m starting to think he was right.', 'What is luck, really? Is it chance, or is it the universe leaning slightly in your direction?'],
        warm:          ['You remind me of a student I had once. Curious about everything, afraid of nothing.', 'Thank you for playing with me. It means more than you know.', 'Takeshi would have liked you, I think.'],
        nostalgic:     ['We used to play on a table he built himself. Cedar wood. It still smells of sawdust.', 'Some evenings I set up the tiles just to hear the sound. It\'s like hearing his voice.']
      },
      near_miss: {
        accepting:     ['Close, but the tiles had other plans.', 'Almost. But "almost" has its own beauty.'],
        contemplative: ['The hand that almost was\u2026 there\'s a haiku in that.']
      },
      big_score: {
        nostalgic: ['Oh my\u2026 Takeshi, did you see that?', 'A hand like that is a gift. I don\'t take it lightly.'],
        serene:    ['How unexpected. How lovely.', 'The tiles arranged themselves into something beautiful.']
      }
    }
  };

  // Helpers

  function pickRandom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** Pick message: exact emotion -> neutral -> any available -> null. */
  function pickMessage(characterId, trigger, emotion) {
    var bank = CONVERSATION_BANKS[characterId];
    if (!bank) return null;
    var triggerBank = bank[trigger];
    if (!triggerBank) return null;

    // Try exact emotion match
    if (triggerBank[emotion] && triggerBank[emotion].length) {
      return pickRandom(triggerBank[emotion]);
    }
    // Fallback to neutral
    if (triggerBank.neutral && triggerBank.neutral.length) {
      return pickRandom(triggerBank.neutral);
    }
    // Fallback to any available emotion
    var keys = Object.keys(triggerBank);
    if (keys.length) {
      return pickRandom(triggerBank[keys[Math.floor(Math.random() * keys.length)]]);
    }
    return null;
  }

  // PersonalityEngine
  class PersonalityEngine {
    constructor(characterId) {
      if (!CHARACTERS[characterId]) {
        characterId = 'mei'; // safe default
      }
      this.character = CHARACTERS[characterId];
      this.memory = new MemorySystem(characterId);
      this.relationshipLevel = this.memory.getFact('relationship_level') || 1;
      this.gamesPlayed = this.memory.getFact('games_played') || 0;
    }

    getWeightModifiers() {
      var style = this.character.playStyle;
      var dominant = this.memory.getDominantEmotion();

      var mods = {
        aggressionBase:  (style.riskTolerance - 0.5) * 0.3,
        defense:         (style.defenseOrientation - 0.5) * 400,
        handValue:       (style.handValuePreference - 0.5) * 6,
        openPenalty:     style.claimFrequency > 0.5 ? 0.1 : -0.1
      };

      // Emotional modifications
      if (dominant === 'tilted')     { mods.aggressionBase += 0.15; mods.defense -= 200; }
      if (dominant === 'anxious')    { mods.aggressionBase -= 0.1;  mods.defense += 200; }
      if (dominant === 'determined') { mods.handValue += 3; }
      if (dominant === 'confident' || dominant === 'triumphant') { mods.aggressionBase += 0.05; }
      if (dominant === 'frustrated') { mods.aggressionBase += 0.08; }
      if (dominant === 'serene')     { mods.defense += 100; }

      return mods;
    }

    processEvent(event, data) {
      data = data || {};
      var triggers = this.character.emotionalTriggers;
      if (triggers[event]) {
        this.memory.setEmotion(triggers[event].emotion, triggers[event].intensity);
      }

      // Create episodic memory for significant events
      var significantEvents = ['win', 'lose', 'big_win', 'deal_in', 'near_miss'];
      if (significantEvents.indexOf(event) !== -1) {
        var em = triggers[event] ? triggers[event].emotion : 'neutral';
        this.memory.addEpisode(event, data.description || event, data.significance || 0.5, em);
      }

      // Track relationship progress
      if (event === 'good_game' || event === 'conversation') {
        var relXP = (this.memory.getFact('relationship_xp') || 0) + (data.quality || 1);
        this.memory.setFact('relationship_xp', relXP);
        if (relXP > this.relationshipLevel * 10) {
          this.relationshipLevel = Math.min(5, this.relationshipLevel + 1);
          this.memory.setFact('relationship_level', this.relationshipLevel);
        }
      }
    }

    generateMessage(trigger, gameState) {
      var emotion = this.memory.getDominantEmotion();
      var memories = this.memory.recall(trigger, 3);
      return this.buildMessage(trigger, emotion, memories, gameState);
    }

    buildMessage(trigger, emotion, memories, gameState) {
      var c = this.character;
      var msg = pickMessage(c.id, trigger, emotion);

      // Memory callback: occasionally reference a recent memory
      if (msg && memories.length > 0 && Math.random() < 0.25) {
        var mem = memories[0];
        if (mem.type === 'big_win' && trigger !== 'big_score') {
          msg += ' Reminds me of that amazing hand last time!';
        } else if (mem.type === 'lose' && trigger === 'game_start') {
          msg += ' Hoping for a better result this time.';
        }
      }

      // Relationship flavoring at higher levels
      if (!msg && this.relationshipLevel >= 3) {
        msg = pickRandom(c.catchphrases);
      }

      // Ultimate fallback
      if (!msg) {
        msg = pickRandom(c.catchphrases) || '';
      }

      return msg;
    }

    getLLMPrompt() {
      var c = this.character;
      var mem = this.memory.getMemorySummary();
      var emotionStr = JSON.stringify(mem.emotions);
      var memStr = mem.recentMemories.map(function(m) { return m.content; }).join('; ');
      return 'You are ' + c.fullName + ', age ' + c.age + '. ' + c.occupation + '. ' + c.backstory + '\n\n' +
        'Personality: ' + c.speechStyle + '\n' +
        'Current emotions: ' + emotionStr + '\n' +
        'Recent memories: ' + (memStr || 'none') + '\n' +
        'Relationship with player: Level ' + this.relationshipLevel + '/5 (' + this.gamesPlayed + ' games together)\n' +
        'Interests: ' + c.interests.join(', ') + '\n\n' +
        'Speak naturally as this character. Be brief (1-2 sentences). Reference your memories and emotions.';
    }

    recordGameEnd() {
      this.gamesPlayed++;
      this.memory.setFact('games_played', this.gamesPlayed);
      this.memory.save();
    }

    getCharacter() { return this.character; }
    getMemory() { return this.memory; }
  }

  // Public API
  root.MJ.Personality = Object.freeze({
    MemorySystem:      MemorySystem,
    PersonalityEngine: PersonalityEngine,
    CHARACTERS:        CHARACTERS,
    CONVERSATION_BANKS: CONVERSATION_BANKS,
    pickMessage:       pickMessage
  });

})(typeof window !== 'undefined' ? window : global);
