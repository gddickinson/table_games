/*  character-relations.js — Relationships between AI characters that affect table dynamics
 *  Exports: root.MJ.CharacterRelations
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // RELATIONSHIPS — predefined dynamics between every character pair
  // ---------------------------------------------------------------------------
  var RELATIONSHIPS = {
    'kenji-mei': {
      type: 'friendly_rivalry',
      description: "Mei finds Kenji exhausting but entertaining. Kenji respects Mei's precision.",
      dynamics: {
        mei_about_kenji: [
          'There he goes again...',
          'Kenji, please think before you discard.',
          'I have to admit, that was a good play, Kenji.',
          'Your ramen is better than your Mahjong.',
          'Kenji, volume is not a strategy.',
          "If you spent half the energy on defense that you spend on trash talk, you'd be unstoppable.",
          'Even my cat Mochi shows more restraint than you.',
          "Okay, that claim was actually impressive. Don't let it go to your head.",
          "Kenji's enthusiasm is... infectious. Like a cold.",
          "I'm keeping a tally of your deal-ins, Kenji. It's not pretty."
        ],
        kenji_about_mei: [
          "Mei's too careful! Live a little!",
          "Okay, THAT was smart. I'll give you that.",
          'My ramen shop makes more than your salary and I still play faster than you.',
          "If Mei wins this hand I'll eat my headband.",
          "Mei is doing that thing where she quietly wins while nobody's looking.",
          'How does she always know which tile to hold?!',
          "Data analyst brain strikes again. She probably calculated the odds of that draw.",
          'Mei, you play Mahjong like you park a car. Perfectly and boringly.',
          "Fine, Mei. You win THIS time. But the war isn't over.",
          "She's smiling. That means she's close to winning. DANGER!"
        ]
      }
    },
    'mei-yuki': {
      type: 'mentorship',
      description: "Yuki reminds Mei of her grandmother. Mei absorbs Yuki's wisdom.",
      dynamics: {
        mei_about_yuki: [
          'Yuki-san, that was beautiful.',
          'You remind me of my grandmother.',
          "I'm learning so much watching you play.",
          'How did you read that so perfectly?',
          'Yuki-san sees patterns I completely miss.',
          'My grandmother would have loved to play with you, Yuki-san.',
          "When Yuki-san discards, it's always deliberate. There are no accidents in her game.",
          "I want to play like you when I'm older. With that kind of calm certainty.",
          'Yuki-san, what were you thinking on that last draw? I want to understand your process.',
          'Sitting across from Yuki-san feels like sitting in my grandmother\'s kitchen. Warm and safe.'
        ],
        yuki_about_mei: [
          "You have your grandmother's patience, Mei.",
          "Very good. You're growing.",
          'Mei, try this -- discard the isolation, keep the connection.',
          'She reminds me of myself at her age. Full of careful fire.',
          'Mei, your defense is excellent. Now learn when to abandon it.',
          "Trust the draw, Mei. You've done the preparation. Let the tiles meet you halfway.",
          'Your grandmother taught you well. The foundation is solid.',
          "Mei sees the numbers. One day she'll also see the poetry.",
          'Patience is your strength, Mei. But sometimes the hand demands boldness.',
          'I see her calculating after every discard. That discipline will serve her for decades.'
        ]
      }
    },
    'kenji-yuki': {
      type: 'respectful_tension',
      description: "Kenji secretly admires Yuki's calm. Yuki sees Kenji's potential beneath the bluster.",
      dynamics: {
        kenji_about_yuki: [
          'How does she DO that?!',
          'Yuki-san, teach me your secrets!',
          'I bet Takeshi was even more intense than me.',
          'Okay, I bow to the master. This time.',
          "Yuki-san just won without raising her voice. I didn't even know that was possible.",
          "She's been playing longer than I've been alive. That's terrifying.",
          'One day I will beat Yuki-san and it will be the greatest day of my life.',
          "Yuki-san's poker face makes my actual poker face look like a billboard.",
          "I made her smile! That means either I played well or I'm about to lose spectacularly.",
          'If Yuki-san opened a Mahjong parlor, I would literally move next door.'
        ],
        yuki_about_kenji: [
          'Kenji, your energy is admirable. Channel it.',
          'Takeshi was like you once. Then he learned patience.',
          'The broth needs time, Kenji. So does the hand.',
          'Beneath all that noise, there is a real player.',
          "Kenji reminds me of a bonfire. Bright and warm, but sometimes singeing those nearby.",
          'He plays from the heart. The head will catch up eventually.',
          'Your instincts are sharp, Kenji. Stop drowning them out with impulse.',
          "Takeshi would have arm-wrestled you, then taught you three new yaku over ramen.",
          "When Kenji is quiet, that's when he's most dangerous. Which is rare.",
          "I see how he watches the discards when he thinks nobody's looking. He understands more than he lets on."
        ]
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Trigger-specific comment pools — for more contextual banter
  // ---------------------------------------------------------------------------
  var TRIGGER_COMMENTS = {
    'kenji-mei': {
      win: {
        mei_about_kenji: [
          'Did Kenji just win with that mess of a hand?',
          "Kenji wins on pure chaos energy. It shouldn't work, but here we are."
        ],
        kenji_about_mei: [
          'Mei wins AGAIN? Come on!',
          'Her hands are always so clean. It drives me crazy.'
        ]
      },
      riichi: {
        mei_about_kenji: [
          'Kenji declaring riichi? What a surprise. Said nobody ever.',
          'Here comes the riichi. Like clockwork.'
        ],
        kenji_about_mei: [
          "Mei declared riichi? Okay, NOW I'm worried.",
          'When Mei goes riichi, she means business. Everyone take cover.'
        ]
      },
      deal_in: {
        mei_about_kenji: [
          'Kenji... that tile was obviously dangerous.',
          'I tried to warn you with my eyes, Kenji.'
        ],
        kenji_about_mei: [
          'Wait, MEI dealt in?! Is the world ending?',
          "Even Mei makes mistakes! I feel so much better about myself."
        ]
      }
    },
    'mei-yuki': {
      win: {
        mei_about_yuki: [
          "Yuki-san's hand was a work of art.",
          'Beautiful. Just beautiful, Yuki-san.'
        ],
        yuki_about_mei: [
          'Well done, Mei. Your grandmother is smiling.',
          'A clean victory. You earned it.'
        ]
      },
      riichi: {
        mei_about_yuki: [
          'When Yuki-san declares riichi, the tiles themselves pay attention.',
          'Yuki-san in riichi is serene confidence personified.'
        ],
        yuki_about_mei: [
          'Mei has declared her intent. The careful player strikes.',
          'Good timing, Mei. Trust your read.'
        ]
      },
      deal_in: {
        mei_about_yuki: [
          "Even masters have off moments. It's okay, Yuki-san.",
          'That was unusual for Yuki-san. She must have been thinking about something else.'
        ],
        yuki_about_mei: [
          'A lesson, Mei. Not a failure. Review the discards later.',
          "It happens to all of us. The tiles don't judge."
        ]
      }
    },
    'kenji-yuki': {
      win: {
        kenji_about_yuki: [
          "She did it again! Yuki-san is a machine!",
          "I can't even be mad. That hand was perfection."
        ],
        yuki_about_kenji: [
          'Kenji wins! His face alone was worth the loss.',
          'See, Kenji? When you focus, wonderful things happen.'
        ]
      },
      riichi: {
        kenji_about_yuki: [
          'Yuki-san riichi... okay, everyone play safe. Except me.',
          "When she declares riichi I get actual goosebumps."
        ],
        yuki_about_kenji: [
          'Kenji and riichi go together like tea and morning.',
          "Bold, Kenji. Let's see if the wall agrees."
        ]
      },
      deal_in: {
        kenji_about_yuki: [
          'Yuki-san dealt in?! Someone check if the sky is falling!',
          "If even Yuki-san can deal in, there's hope for all of us."
        ],
        yuki_about_kenji: [
          'Kenji, consider the river before you leap in.',
          'Impulsive. But you already knew that, didn\'t you?'
        ]
      }
    }
  };

  // ---------------------------------------------------------------------------
  // CharacterRelationships
  // ---------------------------------------------------------------------------
  class CharacterRelationships {
    constructor() {
      this.recentInteractions = []; // track to avoid repetition
    }

    // -----------------------------------------------------------------------
    // getInteraction — generate a comment from one character about another
    // -----------------------------------------------------------------------
    getInteraction(fromCharId, toCharId, trigger, data) {
      var key = [fromCharId, toCharId].sort().join('-');
      var rel = RELATIONSHIPS[key];
      if (!rel) return null;

      var dynamicKey = fromCharId + '_about_' + toCharId;

      // Try trigger-specific comments first (more contextual)
      var triggerPool = TRIGGER_COMMENTS[key];
      if (triggerPool && triggerPool[trigger] && triggerPool[trigger][dynamicKey]) {
        var specific = triggerPool[trigger][dynamicKey];
        if (specific.length > 0 && this.shouldSpeak(trigger, 'specific')) {
          return this.pickUnique(specific);
        }
      }

      // Fall back to general relationship comments
      var comments = rel.dynamics[dynamicKey];
      if (!comments || comments.length === 0) return null;

      if (this.shouldSpeak(trigger, 'general')) {
        return this.pickUnique(comments);
      }

      return null;
    }

    // -----------------------------------------------------------------------
    // shouldSpeak — probability gate based on trigger type
    // -----------------------------------------------------------------------
    shouldSpeak(trigger, pool) {
      var chances = {
        win:       pool === 'specific' ? 0.6 : 0.4,
        claim:     pool === 'specific' ? 0.3 : 0.2,
        riichi:    pool === 'specific' ? 0.5 : 0.3,
        deal_in:   pool === 'specific' ? 0.5 : 0.3,
        idle:      pool === 'specific' ? 0.2 : 0.12,
        round_end: pool === 'specific' ? 0.3 : 0.2,
        big_win:   pool === 'specific' ? 0.7 : 0.5
      };
      var chance = chances[trigger] || 0.15;
      return Math.random() < chance;
    }

    // -----------------------------------------------------------------------
    // generateBanter — produce a back-and-forth exchange between two characters
    // -----------------------------------------------------------------------
    generateBanter() {
      var pairs = Object.keys(RELATIONSHIPS);
      var pair = pairs[Math.floor(Math.random() * pairs.length)];
      var parts = pair.split('-');
      var char1 = parts[0];
      var char2 = parts[1];
      var rel = RELATIONSHIPS[pair];

      var from1 = this.pick(rel.dynamics[char1 + '_about_' + char2] || []);
      var from2 = this.pick(rel.dynamics[char2 + '_about_' + char1] || []);

      if (from1 && from2) {
        return [
          { speaker: char1, text: from1 },
          { speaker: char2, text: from2 }
        ];
      }
      return null;
    }

    // -----------------------------------------------------------------------
    // getRelationshipInfo — return metadata about a pair
    // -----------------------------------------------------------------------
    getRelationshipInfo(char1, char2) {
      var key = [char1, char2].sort().join('-');
      var rel = RELATIONSHIPS[key];
      if (!rel) return null;
      return {
        type: rel.type,
        description: rel.description
      };
    }

    // -----------------------------------------------------------------------
    // getAllRelationships — return all relationship data for display
    // -----------------------------------------------------------------------
    getAllRelationships() {
      var result = [];
      for (var key in RELATIONSHIPS) {
        if (!RELATIONSHIPS.hasOwnProperty(key)) continue;
        var parts = key.split('-');
        result.push({
          characters: parts,
          type: RELATIONSHIPS[key].type,
          description: RELATIONSHIPS[key].description
        });
      }
      return result;
    }

    // -----------------------------------------------------------------------
    // Utility
    // -----------------------------------------------------------------------
    pick(arr) {
      if (!arr || arr.length === 0) return null;
      return arr[Math.floor(Math.random() * arr.length)];
    }

    pickUnique(arr) {
      if (!arr || arr.length === 0) return null;
      // Avoid repeating the last few comments
      var available = arr.filter(function(c) {
        return this.recentInteractions.indexOf(c) === -1;
      }.bind(this));
      if (available.length === 0) {
        this.recentInteractions = [];
        available = arr;
      }
      var choice = available[Math.floor(Math.random() * available.length)];
      this.recentInteractions.push(choice);
      if (this.recentInteractions.length > 15) {
        this.recentInteractions = this.recentInteractions.slice(-10);
      }
      return choice;
    }
  }

  // Public API
  root.MJ.CharacterRelations = CharacterRelationships;

})(typeof window !== 'undefined' ? window : global);
