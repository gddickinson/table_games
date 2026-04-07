/**
 * character-aging.js - Characters that evolve permanently over hundreds of games.
 *
 * Tracks long-term milestone arcs for each AI character. As the player
 * accumulates games with a character, life events trigger: graduations,
 * career changes, personal growth, and philosophical reflections.
 * State persists across sessions via localStorage.
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Aging milestone definitions
  // ---------------------------------------------------------------------------

  var AGING_MILESTONES = {
    hana: [
      {
        games: 30,
        event: 'graduation',
        title: 'Hana Graduates',
        message: "I did it! I graduated! My thesis on game theory and Mahjong got an A+. Professor said it was 'surprisingly practical.' Now... job hunting.",
        traitChanges: { occupation: 'Junior data scientist' },
        dialogueShift: 'professional'
      },
      {
        games: 80,
        event: 'first_job',
        title: "Hana's New Job",
        message: "I got hired! Data science at a gaming company. They were impressed that I could calculate tile efficiency in my head. Who says Mahjong isn't practical?",
        traitChanges: { occupation: 'Data scientist at a gaming company' },
        dialogueShift: null
      },
      {
        games: 150,
        event: 'promotion',
        title: 'Hana Leads a Team',
        message: "They promoted me to lead! I manage a team now. Turns out, reading people at the Mahjong table translates to reading a room in meetings.",
        traitChanges: { confidence: 0.8 },
        dialogueShift: 'leader'
      },
      {
        games: 220,
        event: 'startup',
        title: 'Hana Goes Independent',
        message: "I left the company. Starting my own analytics consultancy. Scary? Sure. But every riichi declaration is a leap of faith, and I have never backed down from one.",
        traitChanges: { occupation: 'Founder & consultant', boldness: 0.9 },
        dialogueShift: null
      }
    ],

    kenji: [
      {
        games: 50,
        event: 'shop_success',
        title: 'Ramen Shop Expansion',
        message: "The Mahjong nights worked! We're so busy I'm hiring help. Turns out, people love eating ramen while losing at tiles.",
        traitChanges: { stress: -0.2 },
        dialogueShift: null
      },
      {
        games: 120,
        event: 'cookbook',
        title: "Kenji's Cookbook",
        message: "I'm writing a cookbook. 'Ramen, Risk, and Riichi: Life Lessons from the Table.' Mei says the title is too long. She's probably right.",
        traitChanges: {},
        dialogueShift: 'reflective'
      },
      {
        games: 200,
        event: 'peace',
        title: 'Finding Balance',
        message: "You know what? I don't need to win every hand anymore. I don't need to win every argument. The ramen is good, the tiles are good, the friends are good. That's enough.",
        traitChanges: { riskTolerance: 0.5, tiltReduction: 0.5 },
        dialogueShift: 'calm'
      },
      {
        games: 280,
        event: 'mentor',
        title: 'Kenji the Mentor',
        message: "A kid from the neighbourhood started hanging around the shop. Reminds me of myself at that age — angry, competitive, hungry. I taught him to make broth. Next week, I will teach him to read discards.",
        traitChanges: { patience: 0.9 },
        dialogueShift: null
      }
    ],

    mei: [
      {
        games: 40,
        event: 'confidence',
        title: 'Mei Speaks Up',
        message: "I presented at a conference today. About data patterns in decision-making. A year ago I would have been terrified. But if I can read a Mahjong table, I can read a room.",
        traitChanges: { extraversion: 0.5 },
        dialogueShift: null
      },
      {
        games: 100,
        event: 'osaka_visit',
        title: 'Return to Osaka',
        message: "I went home to Osaka last weekend. Played Mahjong at grandmother's old table. Mochi sat in my lap the whole time. Some things don't change. I'm glad.",
        traitChanges: {},
        dialogueShift: 'nostalgic'
      },
      {
        games: 180,
        event: 'teaching',
        title: 'Mei Becomes a Teacher',
        message: "I started teaching Mahjong to beginners at the community center. My grandmother would be so proud. Each new player is a new pattern in the data of life.",
        traitChanges: { role: 'teacher' },
        dialogueShift: 'warm'
      },
      {
        games: 260,
        event: 'research',
        title: "Mei's Research Paper",
        message: "My paper on cognitive pattern recognition in tile games was published. Grandmother always said Mahjong makes you smarter. Now I have the data to prove it.",
        traitChanges: { academicStatus: 'published researcher' },
        dialogueShift: null
      }
    ],

    yuki: [
      {
        games: 60,
        event: 'book_published',
        title: "Yuki's Book",
        message: "The publisher called. 'Tiles of Time: A Life in Mahjong' will be published in spring. Takeshi, I finished it. Our book.",
        traitChanges: {},
        dialogueShift: null
      },
      {
        games: 130,
        event: 'book_success',
        title: 'A Bestseller',
        message: "The book is a bestseller. Young people are writing to me. They want to learn Mahjong. They want to understand the philosophy. Takeshi, you would laugh. 'Our little hobby,' you'd say.",
        traitChanges: { fame: true },
        dialogueShift: 'public'
      },
      {
        games: 250,
        event: 'legacy',
        title: "Yuki's Legacy",
        message: "I am 74 now. The table has seen a thousand hands. Each one a conversation with chance. I don't know how many more games I have. But I know this: every tile placed with intention is a prayer, and every hand completed is a poem. Thank you for playing with me.",
        traitChanges: { wisdom: 1.0 },
        dialogueShift: 'sage'
      },
      {
        games: 320,
        event: 'garden',
        title: "Yuki's Garden",
        message: "I planted a cherry tree in the garden today. It will take years to bloom. That is fine. Patience is the first lesson of Mahjong, and the last lesson of life.",
        traitChanges: { serenity: 1.0 },
        dialogueShift: null
      }
    ]
  };

  // ---------------------------------------------------------------------------
  // Default character descriptions (base, before aging)
  // ---------------------------------------------------------------------------

  var BASE_DESCRIPTIONS = {
    hana:  'A bright university student studying game theory and probability.',
    kenji: 'A passionate ramen shop owner who plays Mahjong to draw customers.',
    mei:   'A quiet data analyst from Osaka who finds comfort in patterns.',
    yuki:  'A retired widow carrying decades of Mahjong wisdom.'
  };

  // ---------------------------------------------------------------------------
  // CharacterAging class
  // ---------------------------------------------------------------------------

  class CharacterAging {
    constructor() {
      this.load();
    }

    // ── Persistence ─────────────────────────────────────────────────────

    load() {
      try {
        this.state = JSON.parse(localStorage.getItem('mj_aging')) || {};
      } catch (e) {
        this.state = {};
      }
    }

    save() {
      try {
        localStorage.setItem('mj_aging', JSON.stringify(this.state));
      } catch (e) { /* storage full or unavailable */ }
    }

    // ── Game recording ──────────────────────────────────────────────────

    /**
     * Record one or more completed games for a character.
     * Returns an array of newly-triggered milestones (may be empty).
     */
    recordGames(characterId, count) {
      if (!characterId || count <= 0) return [];
      this._ensureState(characterId);
      this.state[characterId].totalGames += count;
      this.save();
      return this.checkMilestones(characterId);
    }

    // ── Milestone evaluation ────────────────────────────────────────────

    /**
     * Check whether any milestones should fire for the given character.
     * Returns array of milestone objects that just triggered.
     */
    checkMilestones(characterId) {
      var milestones = AGING_MILESTONES[characterId] || [];
      var s = this.state[characterId];
      if (!s) return [];

      var triggered = [];

      for (var i = 0; i < milestones.length; i++) {
        var m = milestones[i];
        if (s.totalGames >= m.games && s.triggeredMilestones.indexOf(m.event) === -1) {
          s.triggeredMilestones.push(m.event);
          // Apply trait changes
          if (m.traitChanges) {
            var keys = Object.keys(m.traitChanges);
            for (var k = 0; k < keys.length; k++) {
              s.traitOverrides[keys[k]] = m.traitChanges[keys[k]];
            }
          }
          // Apply dialogue shift
          if (m.dialogueShift) {
            s.currentDialogueMode = m.dialogueShift;
          }
          triggered.push(m);
        }
      }

      if (triggered.length > 0) this.save();
      return triggered;
    }

    // ── Queries ─────────────────────────────────────────────────────────

    /**
     * Returns a modified character description reflecting milestones reached.
     */
    getCharacterAge(characterId) {
      var s = this.state[characterId];
      if (!s || s.triggeredMilestones.length === 0) {
        return BASE_DESCRIPTIONS[characterId] || 'A Mahjong player.';
      }

      var milestones = AGING_MILESTONES[characterId] || [];
      // Find the latest triggered milestone (by game count)
      var latest = null;
      for (var i = milestones.length - 1; i >= 0; i--) {
        if (s.triggeredMilestones.indexOf(milestones[i].event) !== -1) {
          latest = milestones[i];
          break;
        }
      }

      if (!latest) return BASE_DESCRIPTIONS[characterId] || 'A Mahjong player.';

      var base = BASE_DESCRIPTIONS[characterId] || '';
      var occupation = s.traitOverrides.occupation;
      if (occupation) {
        base = occupation + '. ' + latest.title + '.';
      } else {
        base = base + ' ' + latest.title + '.';
      }

      return base;
    }

    /**
     * Returns the current dialogue mode for a character.
     */
    getCurrentDialogueMode(characterId) {
      return (this.state[characterId] && this.state[characterId].currentDialogueMode) || 'default';
    }

    /**
     * Returns the total number of games recorded for a character.
     */
    getTotalGames(characterId) {
      return (this.state[characterId] && this.state[characterId].totalGames) || 0;
    }

    /**
     * Returns a list of triggered milestone events for a character.
     */
    getTriggeredMilestones(characterId) {
      return (this.state[characterId] && this.state[characterId].triggeredMilestones) || [];
    }

    /**
     * Returns a summary of all characters' aging state.
     * @returns {Object} characterId -> { totalGames, milestonesReached, currentMode, traitOverrides }
     */
    getAgingSummary() {
      var summary = {};
      var ids = Object.keys(AGING_MILESTONES);

      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var s = this.state[id];
        var allMilestones = AGING_MILESTONES[id] || [];
        if (s) {
          summary[id] = {
            totalGames: s.totalGames,
            milestonesReached: s.triggeredMilestones.length,
            milestonesTotal: allMilestones.length,
            currentMode: s.currentDialogueMode,
            traitOverrides: Object.assign({}, s.traitOverrides)
          };
        } else {
          summary[id] = {
            totalGames: 0,
            milestonesReached: 0,
            milestonesTotal: allMilestones.length,
            currentMode: 'default',
            traitOverrides: {}
          };
        }
      }

      return summary;
    }

    /**
     * Return the next upcoming milestone for a character, or null if all done.
     */
    getNextMilestone(characterId) {
      var milestones = AGING_MILESTONES[characterId] || [];
      var s = this.state[characterId];
      if (!s) {
        return milestones.length > 0 ? milestones[0] : null;
      }

      for (var i = 0; i < milestones.length; i++) {
        if (s.triggeredMilestones.indexOf(milestones[i].event) === -1) {
          return {
            event: milestones[i].event,
            title: milestones[i].title,
            gamesNeeded: milestones[i].games,
            gamesRemaining: Math.max(0, milestones[i].games - s.totalGames)
          };
        }
      }

      return null;
    }

    /**
     * Reset all aging data (for testing or new-game-plus).
     */
    reset() {
      this.state = {};
      this.save();
    }

    /**
     * Reset a single character's aging data.
     */
    resetCharacter(characterId) {
      delete this.state[characterId];
      this.save();
    }

    // ── Internal ────────────────────────────────────────────────────────

    _ensureState(characterId) {
      if (!this.state[characterId]) {
        this.state[characterId] = {
          totalGames: 0,
          triggeredMilestones: [],
          currentDialogueMode: 'default',
          traitOverrides: {}
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  root.MJ.CharacterAging = CharacterAging;

})(typeof exports !== 'undefined' ? exports : this);
