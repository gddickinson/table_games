// story-arcs.js — Extended narrative system with multi-session story arcs
// Provides compelling multi-part stories that unfold over dozens of games,
// deepening character relationships and rewarding long-term play.

(function (root) {
  'use strict';

  const STORAGE_KEY = 'mahjong_story_arcs';

  // ---------------------------------------------------------------------------
  // Arc Definitions
  // ---------------------------------------------------------------------------

  const ARC_DEFINITIONS = {

    // ── Kenji's Ramen Crisis ──────────────────────────────────────────────
    kenjis_ramen_crisis: {
      id: 'kenjis_ramen_crisis',
      title: "Kenji's Ramen Crisis",
      character: 'kenji',
      trigger: { minRelationship: 3, minGames: 20 },
      parts: [
        {
          id: 'rent_hike',
          title: 'Trouble Brewing',
          text: [
            "Kenji stares at his tiles without really seeing them.",
            "\"Hey... you know my ramen shop, right? Landlord just told me he's raising the rent. By a lot.\"",
            "He rubs the back of his neck. \"I've been running that place for twelve years. My old man started it. I can't just... let it go.\"",
            "He forces a grin. \"Anyway. Enough about that. Let's play.\""
          ],
          mood: 'worried',
          effect: null
        },
        {
          id: 'distracted',
          title: 'Off His Game',
          gamesUntil: 5,
          text: [
            "Kenji miscounts his tiles twice in the first hand.",
            "\"Sorry, sorry. I've been crunching numbers all week. Cutting costs everywhere — using cheaper noodles, shorter hours...\"",
            "He discards a tile he clearly needed. \"Damn. See? Can't focus.\"",
            "\"The regulars can taste the difference. Foot traffic is down. It's a spiral, you know?\""
          ],
          mood: 'distracted',
          effect: { type: 'personality_mod', target: 'kenji', stat: 'tiltThreshold', delta: -0.15, temporary: true }
        },
        {
          id: 'idea',
          title: 'A Wild Idea',
          gamesUntil: 10,
          text: [
            "Kenji slams a tile down with unexpected energy.",
            "\"I've got it. What if I host a Mahjong night at the shop? Every Friday.\"",
            "\"Think about it — people come for the game, stay for the ramen. Two birds, one stone!\"",
            "He's practically bouncing in his seat. \"I just need to move some tables around. Maybe get a couple extra sets of tiles.\"",
            "\"Would you come? I mean... it wouldn't be the same without you there.\""
          ],
          mood: 'excited',
          choices: [
            { label: "I'll be there every Friday.", response: "\"Yes! That's what I'm talking about! First bowl's always on the house for you.\"", relationshipBonus: 1 },
            { label: "Sounds fun — I'll try to make it.", response: "\"Even once in a while would mean a lot. Thanks for believing in this.\"", relationshipBonus: 0 }
          ],
          effect: null
        },
        {
          id: 'success',
          title: 'Friday Night Mahjong',
          gamesUntil: 15,
          text: [
            "Kenji is beaming when you sit down.",
            "\"Three Fridays in a row — packed house! People are coming from two neighborhoods over!\"",
            "\"Old Mrs. Tanaka told me my father would be proud. I almost lost it right there in the kitchen.\"",
            "He slides a laminated card across the table. \"Special recipe — my dad's original broth. I've never written it down for anyone before.\"",
            "\"You helped me remember why I do this. Not just the ramen — all of it. Connecting with people.\""
          ],
          mood: 'grateful',
          effect: null,
          reward: { type: 'flavor', item: 'kenjis_secret_recipe', description: "Kenji's father's original ramen recipe — handwritten and laminated" }
        }
      ],
      resolution: {
        text: "Kenji's shop is thriving. He plays with renewed focus and a lighter heart.",
        effect: { type: 'personality_mod', target: 'kenji', stat: 'defensiveRatio', delta: 0.08, permanent: true },
        title: null
      }
    },

    // ── Mei's Grandmother's Tiles ─────────────────────────────────────────
    meis_grandmothers_tiles: {
      id: 'meis_grandmothers_tiles',
      title: "Mei's Grandmother's Tiles",
      character: 'mei',
      trigger: { minRelationship: 4, minGames: 30 },
      parts: [
        {
          id: 'discovery',
          title: 'A Box in the Attic',
          text: [
            "Mei arrives with a small wooden box tucked under her arm.",
            "\"I was cleaning out my grandmother's storage unit this weekend. Found these.\"",
            "She opens the box carefully. Inside, a set of Mahjong tiles — ivory and bamboo, clearly decades old.",
            "\"Grandma taught me to play when I was seven. I didn't even know she had her own set.\""
          ],
          mood: 'nostalgic',
          effect: null
        },
        {
          id: 'emotional',
          title: 'Worn Smooth by Time',
          gamesUntil: 5,
          text: [
            "Mei has brought the old tiles again. She runs her thumb over a bamboo tile.",
            "\"Feel how smooth they are. Decades of hands holding them.\"",
            "Her eyes glisten. \"Grandma used to say every tile carries the luck of everyone who touched it.\"",
            "\"She'd play every Sunday with her friends. Four women who survived a war together. They played until...\"",
            "She pauses. \"Until there weren't four of them anymore.\""
          ],
          mood: 'emotional',
          effect: null
        },
        {
          id: 'philosophy',
          title: 'Across Time',
          gamesUntil: 8,
          text: [
            "Mei is quiet for a long moment before the game starts.",
            "\"Do you think Mahjong connects people across time?\"",
            "\"These same tiles — the same patterns, the same decisions — people have been making them for centuries.\"",
            "\"When I hold my grandmother's tiles, I feel like she's still at the table somehow.\"",
            "\"Maybe that's silly.\""
          ],
          mood: 'reflective',
          choices: [
            { label: "It's not silly at all. She's here through you.", response: "Mei smiles — really smiles. \"Thank you. I needed someone to say that.\"", relationshipBonus: 1 },
            { label: "The game carries memory. That's its power.", response: "\"Its power...\" She nods slowly. \"Yes. That's exactly right.\"", relationshipBonus: 1 }
          ],
          effect: null
        },
        {
          id: 'tradition',
          title: 'Passing It On',
          gamesUntil: 12,
          text: [
            "Mei seems lighter today. There's a new energy in how she plays.",
            "\"My niece Hana is eight. I taught her the basics last weekend.\"",
            "\"She kept calling the East wind tile 'the pointy one.' Made me laugh so hard.\"",
            "\"I'm going to give her Grandma's set when she's ready. Keep it in the family.\"",
            "\"But first — I'm going to win enough games with them to add my own luck to those tiles.\""
          ],
          mood: 'determined',
          effect: null
        }
      ],
      resolution: {
        text: "Mei plays with quiet fire now — honoring her grandmother's memory through bold play.",
        effect: { type: 'personality_mod', target: 'mei', stat: 'aggressionLevel', delta: 0.06, permanent: true },
        title: null
      }
    },

    // ── Yuki's Final Lesson ───────────────────────────────────────────────
    yukis_final_lesson: {
      id: 'yukis_final_lesson',
      title: "Yuki's Final Lesson",
      character: 'yuki',
      trigger: { minRelationship: 5, minGames: 50 },
      parts: [
        {
          id: 'reflection',
          title: 'What We Leave Behind',
          text: [
            "Yuki pours tea with her usual precision before speaking.",
            "\"I've been thinking lately about what we leave behind.\"",
            "\"Takeshi — my late husband — he left his strategies. His way of reading the table.\"",
            "\"I've kept them alive through my play. But memories fade. Even mine.\""
          ],
          mood: 'contemplative',
          effect: null
        },
        {
          id: 'teaching',
          title: 'Deliberate Lessons',
          gamesUntil: 7,
          text: [
            "Yuki pauses mid-game to explain her discard choice in unusual detail.",
            "\"Takeshi called this the 'patient river' — you build your discards to tell a false story.\"",
            "\"I haven't taught this to anyone before. Most people just want to win.\"",
            "\"But you... you want to understand. That's rare, and it matters.\""
          ],
          mood: 'teaching',
          effect: null
        },
        {
          id: 'book',
          title: 'The Manuscript',
          gamesUntil: 14,
          text: [
            "Yuki sets a stack of handwritten pages on the table.",
            "\"I've been writing a book. About Mahjong, about life, about Takeshi.\"",
            "\"Thirty years of play distilled into... well, it's not done yet.\"",
            "\"Each chapter is a principle. 'Read the Silence.' 'The Discard Speaks.' 'Patience is not Passivity.'\"",
            "\"I thought I was writing it for Takeshi's memory. But I think I'm writing it for anyone who will listen.\""
          ],
          mood: 'vulnerable',
          effect: null
        },
        {
          id: 'final_chapter',
          title: 'The Final Chapter',
          gamesUntil: 20,
          text: [
            "Yuki slides a single page across the table. The handwriting is elegant.",
            "\"The final chapter. I'd like you to read it.\"",
            "",
            "It reads: \"Mahjong is not about the tiles. It is about the spaces between — the pause before a discard, the breath before a call. In those silences, we find each other. Every game is a conversation. Every hand is a story told four ways at once. And when the tiles are put away, what remains is not who won, but that we sat together, and for a little while, the world was the size of a table.\"",
            "",
            "Yuki watches you read, then nods once. \"It took me sixty years to write that paragraph.\""
          ],
          mood: 'profound',
          choices: [
            { label: "It's beautiful, Yuki. Takeshi would be proud.", response: "Her eyes shine. \"He would have said it needed editing. But yes... I think he would.\"", relationshipBonus: 1 },
            { label: "Thank you for sharing this with me.", response: "\"Thank you for being someone worth sharing it with.\"", relationshipBonus: 1 }
          ],
          effect: null
        },
        {
          id: 'successor',
          title: "Yuki's Gratitude",
          gamesUntil: 25,
          text: [
            "Yuki arrives with a small wrapped package.",
            "\"The book is finished. The publisher was... enthusiastic.\" A rare full smile.",
            "\"But I didn't come to talk about that.\"",
            "She places the package in front of you. Inside is a single tile — a White Dragon, old and smooth.",
            "\"Takeshi's lucky tile. He carried it everywhere. I want you to have it.\"",
            "\"You gave me a reason to complete the book. Not just the writing — the living. The playing.\"",
            "\"You are my heir in all the ways that matter.\""
          ],
          mood: 'warm',
          effect: null,
          reward: { type: 'flavor', item: 'takeshis_white_dragon', description: "Takeshi's lucky White Dragon tile — smooth from decades of being carried" }
        }
      ],
      resolution: {
        text: "Yuki declares you her spiritual successor. The book is dedicated to 'my final student.'",
        effect: null,
        title: "Yuki's Heir"
      }
    },

    // ── The Group Tournament ──────────────────────────────────────────────
    group_tournament: {
      id: 'group_tournament',
      title: 'The Group Tournament',
      character: 'all',
      trigger: { allRelationships: 3, minGames: 25 },
      parts: [
        {
          id: 'suggestion',
          title: 'A Bold Proposal',
          text: [
            "Kenji slaps the table after a particularly good round.",
            "\"We should enter the district tournament! The four of us — as a team!\"",
            "Mei raises an eyebrow. \"You're serious?\"",
            "\"Dead serious. We've got the skills. Yuki's got the strategy. Mei's got the instincts. Our friend here\" — he points at you — \"has the heart.\"",
            "Yuki sips her tea. \"And what do you bring, Kenji?\"",
            "\"Enthusiasm! And snacks!\"",
            "Even Yuki laughs."
          ],
          mood: 'excited',
          choices: [
            { label: "Let's do it!", response: "\"THAT'S the spirit! Team Mahjong, let's GO!\" Kenji is already planning.", relationshipBonus: 0 },
            { label: "We'd need to practice seriously.", response: "\"Exactly right,\" Yuki says. \"Discipline first, glory later.\"", relationshipBonus: 0 }
          ],
          effect: null
        },
        {
          id: 'practice',
          title: 'Training Arc',
          gamesUntil: 5,
          text: [
            "The group has been meeting twice a week to practice.",
            "Yuki runs drills — speed reading discards, defensive formations, signaling partners.",
            "Kenji takes copious notes (mostly doodles of ramen bowls, but some legitimate strategy).",
            "Mei has memorized every player in the tournament bracket. \"Know your enemy,\" she says coolly.",
            "\"You know,\" Kenji says during a break, \"even if we lose, this is already the most fun I've had in years.\""
          ],
          mood: 'determined',
          effect: null
        },
        {
          id: 'tournament_day',
          title: 'Tournament Day',
          gamesUntil: 10,
          text: [
            "The community center is buzzing. Thirty-two teams. Banners everywhere.",
            "Kenji brought matching headbands. They're ridiculous. Everyone wears them.",
            "\"Round one — table seven,\" Mei announces, checking the bracket board.",
            "Yuki adjusts her headband. \"Remember: read the table, trust your partner, and—\"",
            "\"—and have fun!\" Kenji finishes.",
            "Yuki sighs. \"I was going to say 'play with honor.' But yes. Fun too.\"",
            "",
            "The first tile is drawn. The tournament begins."
          ],
          mood: 'tense',
          effect: { type: 'special_game', mode: 'tournament_round', rounds: 3 }
        },
        {
          id: 'celebration',
          title: 'What Really Matters',
          gamesUntil: 13,
          text: [
            "The tournament is over. Win or lose, the four of you find a quiet corner.",
            "Kenji has already ordered enough food for eight people.",
            "",
            "Kenji raises his glass. \"To the best team I've ever been on.\"",
            "Mei: \"I never thought I'd say this, but... you all made me better. Not just at Mahjong.\"",
            "Yuki: \"Takeshi always said the best games aren't the ones you win. They're the ones you remember.\"",
            "She looks around the table. \"I will remember this.\"",
            "",
            "Kenji pulls out his phone. \"Group photo! Everyone squeeze in!\"",
            "The camera clicks. Four smiling faces. One ridiculous headband per person."
          ],
          mood: 'warm',
          effect: null,
          reward: { type: 'photo', item: 'tournament_group_photo', description: 'Group photo from the district tournament — matching headbands and all' }
        }
      ],
      resolution: {
        text: "The group is closer than ever. A framed tournament photo hangs in Kenji's ramen shop.",
        effect: { type: 'relationship_bonus', delta: 1, target: 'all' },
        title: null
      }
    }
  };

  // ---------------------------------------------------------------------------
  // StoryArcManager
  // ---------------------------------------------------------------------------

  class StoryArcManager {
    constructor() {
      this.state = this._load();
    }

    // ── Persistence ────────────────────────────────────────────────────────

    _load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (_) { /* corrupted data — start fresh */ }
      return { active: {}, completed: {}, seen: {} };
    }

    _save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (_) { /* storage full — silent fail */ }
    }

    // ── Public API ─────────────────────────────────────────────────────────

    /** Return all in-progress arc states keyed by arc id. */
    getActiveArcs() {
      return Object.assign({}, this.state.active);
    }

    /** Return completed arc records keyed by arc id. */
    getCompletedArcs() {
      return Object.assign({}, this.state.completed);
    }

    /**
     * Check whether any new arcs should begin.
     * @param {object} gameData  — must include { totalGames }
     * @param {object} relationships — { kenji: n, mei: n, yuki: n }
     * @returns {Array} Newly triggered arc ids (may be empty).
     */
    checkTriggers(gameData, relationships) {
      const triggered = [];
      const totalGames = (gameData && gameData.totalGames) || 0;

      for (const [arcId, def] of Object.entries(ARC_DEFINITIONS)) {
        // Skip if already active or completed or seen
        if (this.state.active[arcId] || this.state.completed[arcId]) continue;

        const trig = def.trigger;
        let eligible = true;

        // Check per-character relationship
        if (trig.minRelationship != null && def.character !== 'all') {
          const rel = (relationships && relationships[def.character]) || 0;
          if (rel < trig.minRelationship) eligible = false;
        }

        // Check all-relationships threshold
        if (trig.allRelationships != null) {
          const chars = ['kenji', 'mei', 'yuki'];
          for (const c of chars) {
            if (((relationships && relationships[c]) || 0) < trig.allRelationships) {
              eligible = false;
              break;
            }
          }
        }

        // Check minimum games
        if (trig.minGames != null && totalGames < trig.minGames) {
          eligible = false;
        }

        if (eligible) {
          this.state.active[arcId] = {
            arcId: arcId,
            currentPartIndex: 0,
            startedAt: Date.now(),
            gameAtLastAdvance: totalGames,
            choicesMade: {}
          };
          triggered.push(arcId);
        }
      }

      if (triggered.length > 0) this._save();
      return triggered;
    }

    /**
     * Get the current scene for an active arc.
     * @param {string} arcId
     * @returns {object|null} { arcTitle, part, partIndex, totalParts, isResolution }
     */
    getCurrentScene(arcId) {
      const active = this.state.active[arcId];
      if (!active) return null;

      const def = ARC_DEFINITIONS[arcId];
      if (!def) return null;

      if (active.currentPartIndex >= def.parts.length) {
        // Resolution scene
        return {
          arcTitle: def.title,
          part: def.resolution,
          partIndex: active.currentPartIndex,
          totalParts: def.parts.length,
          isResolution: true
        };
      }

      return {
        arcTitle: def.title,
        part: def.parts[active.currentPartIndex],
        partIndex: active.currentPartIndex,
        totalParts: def.parts.length,
        isResolution: false
      };
    }

    /**
     * Check if a part is ready to advance (enough games have elapsed).
     * @param {string} arcId
     * @param {number} totalGames
     * @returns {boolean}
     */
    isPartReady(arcId, totalGames) {
      const active = this.state.active[arcId];
      if (!active) return false;

      const def = ARC_DEFINITIONS[arcId];
      if (!def) return false;

      const partIndex = active.currentPartIndex;
      if (partIndex >= def.parts.length) return true; // resolution ready

      const part = def.parts[partIndex];
      if (part.gamesUntil == null) return true; // first part, always ready
      const gamesElapsed = totalGames - (active.gameAtLastAdvance || 0);
      return gamesElapsed >= part.gamesUntil;
    }

    /**
     * Record a choice the player made for the current part.
     * @param {string} arcId
     * @param {number} choiceIndex
     * @returns {object|null} The chosen option, or null.
     */
    makeChoice(arcId, choiceIndex) {
      const active = this.state.active[arcId];
      if (!active) return null;

      const def = ARC_DEFINITIONS[arcId];
      if (!def) return null;

      const part = def.parts[active.currentPartIndex];
      if (!part || !part.choices || !part.choices[choiceIndex]) return null;

      const choice = part.choices[choiceIndex];
      active.choicesMade[part.id] = choiceIndex;
      this._save();
      return choice;
    }

    /**
     * Advance an active arc to the next part.
     * @param {string} arcId
     * @param {number} [totalGames] — current game count for pacing
     * @returns {object|null} The new current scene, or null if arc completed.
     */
    advanceArc(arcId, totalGames) {
      const active = this.state.active[arcId];
      if (!active) return null;

      const def = ARC_DEFINITIONS[arcId];
      if (!def) return null;

      active.currentPartIndex += 1;
      active.gameAtLastAdvance = totalGames || active.gameAtLastAdvance;

      // Check if arc is now complete (past all parts + resolution viewed)
      if (active.currentPartIndex > def.parts.length) {
        this.state.completed[arcId] = {
          arcId: arcId,
          completedAt: Date.now(),
          choicesMade: active.choicesMade,
          resolution: def.resolution
        };
        delete this.state.active[arcId];
        this._save();
        return null; // arc done
      }

      this._save();
      return this.getCurrentScene(arcId);
    }

    /**
     * Get the arc definition (read-only) for inspection.
     * @param {string} arcId
     * @returns {object|null}
     */
    getArcDefinition(arcId) {
      return ARC_DEFINITIONS[arcId] || null;
    }

    /** List all arc definition ids. */
    getAllArcIds() {
      return Object.keys(ARC_DEFINITIONS);
    }

    /** Reset all story progress (for testing or new-game). */
    reset() {
      this.state = { active: {}, completed: {}, seen: {} };
      this._save();
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  root.MJ = root.MJ || {};
  root.MJ.StoryArcs = {
    Manager: StoryArcManager,
    ARC_DEFINITIONS: ARC_DEFINITIONS
  };

})(typeof window !== 'undefined' ? window : globalThis);
