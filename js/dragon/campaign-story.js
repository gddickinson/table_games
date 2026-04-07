/**
 * campaign-story.js — Story arc, quests, NPC dialogue, and DM narration.
 * Exports under window.MJ.Dragon.Campaign.Story (IIFE module).
 * Dependencies (lazy): MJ.Dragon.Campaign.State
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  function S() { return root.MJ.Dragon.Campaign.State; }

  /* ================================================================
   *  STORY PHASES — the campaign progresses through these in order
   * ================================================================ */

  var STORY_PHASES = Object.freeze([
    {
      id: 1,
      key: 'the_call',
      title: 'The Call',
      description: 'The party gathers at Willowmere. The innkeeper describes ' +
        'troubles plaguing the region. Two starter quests are available — wolves ' +
        'in the Whispering Woods and ogres in Stormcrag Pass.'
    },
    {
      id: 2,
      key: 'rising_danger',
      title: 'Rising Danger',
      description: 'After clearing two locations the party earns its reputation. ' +
        'New quests unlock as rumours of undead and orcs reach Willowmere. ' +
        'Castle Ravenmoor and the wizard\'s crypt beckon.'
    },
    {
      id: 3,
      key: 'dark_secrets',
      title: 'Dark Secrets',
      description: 'After clearing Ravenmoor or the Crypt, the party learns a ' +
        'terrible truth — the dragon Scorchfang controls the Iron Tusk orc tribe. ' +
        'The attacks are not random; they are a campaign of conquest.'
    },
    {
      id: 4,
      key: 'war_drums',
      title: 'War Drums',
      description: 'The orc war camp quest becomes available. The party must ' +
        'strike at the Iron Tusk stronghold and defeat the chieftain before ' +
        'Scorchfang\'s army marches on Willowmere.'
    },
    {
      id: 5,
      key: 'the_dragons_lair',
      title: 'The Dragon\'s Lair',
      description: 'With the orc army broken, the path to Scorchfang\'s volcanic ' +
        'lair opens on the world map. The final quest awaits — slay the dragon ' +
        'or fall trying.'
    },
    {
      id: 6,
      key: 'victory',
      title: 'Victory',
      description: 'Scorchfang has been slain! The region is saved. The party ' +
        'returns to Willowmere as legendary heroes. The campaign is complete.'
    }
  ]);

  /* ================================================================
   *  QUESTS — keyed by unique quest id
   * ================================================================ */

  var QUESTS = Object.freeze({
    clear_woods: {
      id: 'clear_woods',
      name: 'Wolves of Whispering Woods',
      phase: 1,
      desc: 'Clear the wolves threatening travelers along the Whispering ' +
        'Woods road. Caravans have stopped running and Willowmere\'s ' +
        'supplies are dwindling.',
      location: 'whispering_woods',
      reward: { xp: 500, gold: 50 },
      prerequisite: null,
      optional: false
    },

    stormcrag_pass: {
      id: 'stormcrag_pass',
      name: 'Ogres of Stormcrag',
      phase: 1,
      desc: 'Defeat the ogres blocking the mountain pass. The eastern ' +
        'trade route has been severed and refugees cannot flee.',
      location: 'stormcrag_pass',
      reward: { xp: 800, gold: 75 },
      prerequisite: null,
      optional: false
    },

    haunted_castle: {
      id: 'haunted_castle',
      name: 'Ghosts of Ravenmoor',
      phase: 2,
      desc: 'Purge the undead from Castle Ravenmoor. The dead have risen ' +
        'and their malice seeps into the surrounding countryside.',
      location: 'haunted_castle',
      reward: { xp: 2000, gold: 200 },
      prerequisite: 'clear_woods|stormcrag_pass',
      optional: false
    },

    wizards_crypt: {
      id: 'wizards_crypt',
      name: 'Secrets of Aldric\'s Crypt',
      phase: 2,
      desc: 'Recover the arcane tome from the wizard\'s crypt. Strange ' +
        'lights pulse beneath the earth and the protective wards are failing.',
      location: 'wizards_crypt',
      reward: { xp: 2500, gold: 250 },
      prerequisite: 'clear_woods|stormcrag_pass',
      optional: false
    },

    orc_camp: {
      id: 'orc_camp',
      name: 'Iron Tusk Warband',
      phase: 4,
      desc: 'Destroy the orc war camp before they march on Willowmere. ' +
        'The chieftain must fall or the horde will be unstoppable.',
      location: 'orc_camp',
      reward: { xp: 3000, gold: 300 },
      prerequisite: 'haunted_castle|wizards_crypt',
      optional: false
    },

    dragon_lair: {
      id: 'dragon_lair',
      name: 'Scorchfang\'s Doom',
      phase: 5,
      desc: 'Slay the dragon Scorchfang in its volcanic lair. This is the ' +
        'final battle — end the threat once and for all.',
      location: 'dragon_lair',
      reward: { xp: 5000, gold: 1000 },
      prerequisite: 'orc_camp',
      optional: false
    },

    cursed_swamp: {
      id: 'cursed_swamp',
      name: 'The Hag\'s Bargain',
      phase: 2,
      desc: 'Deal with the hag lurking in the Cursed Swamp. Travelers ' +
        'vanish, livestock sicken, and strange lights dance over the mire.',
      location: 'cursed_swamp',
      reward: { xp: 1500, gold: 150 },
      prerequisite: null,
      optional: true
    }
  });

  /* ================================================================
   *  NPC DIALOGUE — keyed by NPC id, then by story phase
   * ================================================================ */

  var NPC_DIALOGUE = Object.freeze({
    innkeeper_gruff: {
      phase1: [
        'Welcome, adventurers! Dark times in Willowmere...',
        'Wolves in the Whispering Woods are attacking caravans. ' +
          'No supplies have come through in a fortnight.',
        'Ogres in Stormcrag Pass have cut off the mountain road. ' +
          'Refugees from the east can\'t get through.'
      ],
      phase2: [
        'You\'ve proven yourselves! But worse news — undead walk at ' +
          'Castle Ravenmoor.',
        'An old wizard\'s crypt has been disturbed. Strange lights at ' +
          'night... folk are afraid to leave their homes.',
        'There\'s work for brave souls, if you\'re willing.'
      ],
      phase3: [
        'The orcs... they serve a dragon. Scorchfang, they call it.',
        'The Iron Tusk tribe has a war camp to the east. They\'re ' +
          'massing for something big.',
        'If that dragon turns its gaze on Willowmere, we\'re finished.'
      ],
      phase4: [
        'War drums on the wind. The orcs are coming.',
        'You have to strike before they march. Hit the camp, take ' +
          'out the chieftain.',
        'Everything we\'ve built... it all depends on you now.'
      ],
      phase5: [
        'The path to the dragon\'s lair is open. May the gods protect you.',
        'You carry the hopes of every soul in Willowmere.',
        'Come back alive. That\'s all I ask.'
      ],
      phase6: [
        'Heroes! You\'ve done it! Drinks are on the house — forever!',
        'Willowmere will sing your names for a hundred years.',
        'Rest now. You\'ve earned it.'
      ]
    },

    blacksmith_hilda: {
      all: [
        'Fine steel, fair prices.',
        'Need something repaired?',
        'That dragon-scale armor would fetch a fortune...',
        'I\'ve been hammering blades since before you were born. ' +
          'I know good steel when I see it.',
        'The ogres in the pass broke three of my best swords. ' +
          'Make \'em pay for that, will you?'
      ],
      phase4: [
        'I\'ve been forging arrowheads day and night.',
        'If you\'re heading to the orc camp, take this whetstone. ' +
          'You\'ll need a sharp edge.'
      ],
      phase5: [
        'Dragon-slaying weapons? I\'ve read about them... let me ' +
          'see what I can do.',
        'Aim for the soft scales under the jaw. That\'s what the ' +
          'old tales say.'
      ]
    },

    herbalist_willow: {
      all: [
        'Healing herbs, fresh today.',
        'A potion of fire resistance? Smart, if you\'re heading north.',
        'Be careful in the swamps. The hag is ancient and cunning.',
        'Wolfsbane grows wild in the Whispering Woods — if the ' +
          'wolves haven\'t trampled it all.'
      ],
      phase2: [
        'The undead at Ravenmoor... holy water might help. ' +
          'I have a few vials left.',
        'Arcane wards need special components. I may have what you need.'
      ],
      phase5: [
        'Fire resistance potions — take them all. You\'ll need every drop.',
        'I\'ve gathered every healing herb within ten miles. ' +
          'It\'s all I can do.'
      ]
    },

    mysterious_traveler: {
      phase3: [
        'You seek the dragon? Foolish... but brave.',
        'Scorchfang has laired in these mountains for centuries. ' +
          'The orcs are merely its latest pawns.',
        'There is a weakness — but you must earn that knowledge.'
      ],
      phase5: [
        'The dragon\'s lair is warded with ancient magic. ' +
          'Tread carefully.',
        'Scorchfang hoards more than gold. Knowledge, artifacts, ' +
          'souls... all are currency to a wyrm.'
      ]
    }
  });

  /* ================================================================
   *  DM NARRATION — keyed by location + event
   * ================================================================ */

  var DM_NARRATION = Object.freeze({
    /* --- Whispering Woods --- */
    whispering_woods_intro:
      'The party follows a narrow trail into the Whispering Woods. ' +
      'Sunlight filters through ancient oaks, but an unnatural silence ' +
      'hangs in the air. Somewhere ahead, a wolf howls...',
    whispering_woods_victory:
      'The last wolf slinks into the underbrush, wounded and broken. ' +
      'The Whispering Woods grow quiet — a peaceful silence this time. ' +
      'The road is safe once more.',
    whispering_woods_defeat:
      'The pack is relentless. Teeth flash in the shadows as the party ' +
      'falls back, dragging their wounded. The woods have claimed another ' +
      'day from the travelers of Willowmere.',

    /* --- Stormcrag Pass --- */
    stormcrag_intro:
      'The mountain path narrows between towering cliffs. Wind howls ' +
      'through the pass, carrying the stench of something large and ' +
      'unwashed. Boulders litter the trail — and some of them are moving.',
    stormcrag_victory:
      'The last ogre crashes to the ground, shaking the mountain. ' +
      'Stormcrag Pass echoes with silence. The eastern road is open again, ' +
      'and refugees will finally reach safety.',
    stormcrag_defeat:
      'A hurled boulder shatters against the cliff wall, showering the ' +
      'party with stone. Outmatched and battered, the party retreats down ' +
      'the mountain. The ogres beat their chests in triumph.',

    /* --- Castle Ravenmoor --- */
    castle_intro:
      'Castle Ravenmoor looms against a bruised sky. Its towers lean at ' +
      'impossible angles, and a cold green light pulses from the highest ' +
      'window. The drawbridge hangs by a single chain, creaking in a wind ' +
      'that carries whispers of the dead.',
    castle_entrance:
      'The entrance hall reeks of decay. Shattered suits of armor line ' +
      'the walls, and the flagstones are slick with something dark. ' +
      'Bones rattle in the shadows — the dead are rising.',
    castle_great_hall:
      'The great hall\'s vaulted ceiling disappears into darkness. ' +
      'A long banquet table is set with rotting food and tarnished silver. ' +
      'At the far end, figures in rusted armor turn hollow eyes toward you.',
    castle_throne_room:
      'The throne room pulses with necrotic energy. A spectral figure ' +
      'hovers above the broken throne, its eyes burning with cold hatred. ' +
      'This is the source of the darkness — the wraith lord of Ravenmoor.',
    castle_victory:
      'The wraith shrieks and dissolves into motes of pale light. The ' +
      'green glow fades from the tower windows. Castle Ravenmoor stands ' +
      'silent at last — truly silent, for the first time in decades.',
    castle_defeat:
      'The necrotic cold is overwhelming. The party stumbles from the ' +
      'castle as the drawbridge chain finally snaps. Ravenmoor will not ' +
      'yield its dead so easily.',

    /* --- Wizard's Crypt --- */
    crypt_intro:
      'Stone steps descend into darkness. Arcane runes glow faintly ' +
      'along the walls, pulsing like a heartbeat. The air tastes of ozone ' +
      'and old magic. Somewhere below, something mechanical clicks and whirs.',
    crypt_entry_chamber:
      'The entry chamber is guarded by suits of armor that stand too ' +
      'still, too perfectly aligned. As you cross the threshold, runes ' +
      'flare and metal groans to life.',
    crypt_arcane_gallery:
      'The gallery stretches ahead, lined with glass cases holding ' +
      'artifacts that hum with power. Guardian constructs pace between ' +
      'the displays, their crystal eyes tracking your every move.',
    crypt_inner_sanctum:
      'The inner sanctum opens into a vast domed chamber. At its center, ' +
      'the arcane tome rests on a pedestal surrounded by crackling wards. ' +
      'Between you and it stands the wizard\'s final guardian — a massive ' +
      'flesh golem, stitched together from a dozen unfortunate souls.',
    crypt_victory:
      'The golem collapses in a heap of dead flesh. The wards around the ' +
      'tome flicker and die. As you take the book, knowledge floods your ' +
      'mind — including a terrible truth about the dragon Scorchfang.',
    crypt_defeat:
      'The golem\'s fist crashes down where you stood a heartbeat ago. ' +
      'The wards intensify, pushing you back. The wizard\'s secrets remain ' +
      'locked away — for now.',

    /* --- Orc Camp --- */
    orc_camp_intro:
      'War drums echo across the plains. The Iron Tusk camp sprawls ' +
      'below — hide tents, sharpened stakes, and dozens of orcs sharpening ' +
      'weapons around roaring fires. At the center, a massive tent flies ' +
      'a banner of a dragon skull.',
    orc_camp_battle:
      'The alarm horn blasts. Orcs pour from their tents, grabbing axes ' +
      'and spears. The chieftain emerges — a scarred, towering brute with ' +
      'tusks capped in iron. Behind him, the shaman begins to chant.',
    orc_camp_victory:
      'The chieftain falls with a final, defiant roar. The surviving orcs ' +
      'scatter into the wilderness. The war banner burns, and with it, ' +
      'Scorchfang\'s army. But the dragon itself still waits...',
    orc_camp_defeat:
      'The orcs are too many, too fierce. The party fights a desperate ' +
      'retreat as war horns sound across the camp. The Iron Tusk horde ' +
      'remains unbroken.',

    /* --- Dragon's Lair --- */
    dragon_lair_intro:
      'The cave mouth yawns like a wound in the mountainside. Heat ' +
      'shimmers from within, and the stench of sulfur is overwhelming. ' +
      'Gold glints in the darkness. A low rumble — breathing — shakes ' +
      'the ground beneath your feet.',
    dragon_lair_confrontation:
      'Scorchfang raises its massive head, molten eyes fixing on you. ' +
      '"Insects," it rumbles, smoke curling between fangs the size of ' +
      'greatswords. "You slew my orcs. How... irritating." The dragon ' +
      'unfurls its wings, filling the cavern with shadow.',
    dragon_lair_victory:
      'Scorchfang crashes to the cavern floor, its death throes shaking ' +
      'the mountain. Gold cascades like waterfalls as the hoard shifts. ' +
      'The dragon\'s fire gutters and dies, and a great silence falls. ' +
      'It is done. The realm is saved.',
    dragon_lair_defeat:
      'Fire engulfs the cavern. The party scrambles for the exit as ' +
      'Scorchfang\'s laughter echoes through the mountain. "Run, insects. ' +
      'Tell the world — this land is MINE."',

    /* --- Cursed Swamp --- */
    cursed_swamp_intro:
      'Mist clings to the brackish water like a living thing. Twisted ' +
      'trees claw at a sky that never seems to brighten. Will-o\'-wisps ' +
      'dance in the distance, luring the unwary deeper into the mire.',
    cursed_swamp_hag:
      'The hag\'s hut squats on stilts above the deepest pool. She grins ' +
      'with filed teeth as you approach. "Visitors! How delightful. Shall ' +
      'we make a deal... or shall we play a different game?"',
    cursed_swamp_victory:
      'The hag dissolves into black smoke, her cackle fading into the ' +
      'swamp. The mist begins to thin. Somewhere, a frog croaks — the ' +
      'first natural sound this swamp has heard in years.',
    cursed_swamp_defeat:
      'The swamp itself turns against you. Roots grasp at ankles, mist ' +
      'blinds, and the hag\'s laughter rings from every direction. You ' +
      'stumble free of the mire, cursing the foul place.',

    /* --- General / Willowmere --- */
    willowmere_intro:
      'The hamlet of Willowmere sits in a gentle valley, smoke rising ' +
      'from a dozen chimneys. The Weary Wyrm inn stands at the crossroads, ' +
      'its sign creaking in the breeze. Despite the peaceful appearance, ' +
      'worried faces peer from every window.',
    willowmere_celebration:
      'Willowmere erupts in celebration! Lanterns blaze, music fills the ' +
      'streets, and the innkeeper rolls out barrel after barrel. ' +
      '"To the heroes!" the crowd roars. For the first time in months, ' +
      'Willowmere knows peace.',
    campaign_intro:
      'The realm of Willowmere is under siege. Wolves prowl the western ' +
      'woods, ogres block the mountain passes, and darker things stir in ' +
      'ancient places. A band of adventurers gathers at the Weary Wyrm ' +
      'inn, answering the call for heroes. Their legend begins now.'
  });

  /* ================================================================
   *  HELPER: check if a prerequisite string is satisfied
   * ================================================================ */

  function _checkPrerequisite(prereqStr, completedQuests) {
    if (!prereqStr) return true;
    // "a|b" means either a OR b must be completed
    var parts = prereqStr.split('|');
    for (var i = 0; i < parts.length; i++) {
      if (completedQuests.indexOf(parts[i]) !== -1) return true;
    }
    return false;
  }

  /* ================================================================
   *  PUBLIC API
   * ================================================================ */

  /**
   * getQuest — returns quest definition by id.
   * @param {string} id  Quest identifier (e.g. 'clear_woods').
   * @returns {object|null}
   */
  function getQuest(id) {
    return QUESTS[id] || null;
  }

  /**
   * getAvailableQuests — returns quests available at the current story
   * phase given the list of already-completed quests.
   * @param {number} storyPhase  Current phase (1-6).
   * @param {string[]} completedQuests  Array of completed quest ids.
   * @returns {object[]}  Array of quest objects.
   */
  function getAvailableQuests(storyPhase, completedQuests) {
    completedQuests = completedQuests || [];
    var available = [];
    var keys = Object.keys(QUESTS);
    for (var i = 0; i < keys.length; i++) {
      var q = QUESTS[keys[i]];
      // Skip already completed
      if (completedQuests.indexOf(q.id) !== -1) continue;
      // Must be at or past the required phase
      if (q.phase > storyPhase) continue;
      // Check prerequisite
      if (!_checkPrerequisite(q.prerequisite, completedQuests)) continue;
      available.push(q);
    }
    return available;
  }

  /**
   * getNPCDialogue — returns dialogue lines for a given NPC and phase.
   * Falls back to 'all' dialogue if no phase-specific lines exist.
   * @param {string} npcId    NPC identifier (e.g. 'innkeeper_gruff').
   * @param {number} storyPhase  Current phase (1-6).
   * @returns {string[]}  Array of dialogue strings, or empty array.
   */
  function getNPCDialogue(npcId, storyPhase) {
    var npc = NPC_DIALOGUE[npcId];
    if (!npc) return [];
    var phaseKey = 'phase' + storyPhase;
    if (npc[phaseKey] && npc[phaseKey].length > 0) {
      return npc[phaseKey].slice();
    }
    if (npc.all && npc.all.length > 0) {
      return npc.all.slice();
    }
    return [];
  }

  /**
   * getDMNarration — returns DM narration text for a location event.
   * @param {string} locationId  Location identifier (e.g. 'whispering_woods').
   * @param {string} event  Event type (e.g. 'intro', 'victory', 'defeat').
   * @returns {string}  Narration text, or empty string.
   */
  function getDMNarration(locationId, event) {
    // Try location-specific key patterns
    var key = locationId + '_' + event;
    if (DM_NARRATION[key]) return DM_NARRATION[key];
    // Try shortened aliases (castle for haunted_castle, etc.)
    var aliases = {
      haunted_castle: 'castle',
      wizards_crypt: 'crypt',
      stormcrag_pass: 'stormcrag',
      dragon_lair: 'dragon_lair'
    };
    if (aliases[locationId]) {
      key = aliases[locationId] + '_' + event;
      if (DM_NARRATION[key]) return DM_NARRATION[key];
    }
    return '';
  }

  /**
   * getStoryPhaseDescription — returns title and description for a phase.
   * @param {number} phase  Phase number (1-6).
   * @returns {object|null}  { id, key, title, description } or null.
   */
  function getStoryPhaseDescription(phase) {
    for (var i = 0; i < STORY_PHASES.length; i++) {
      if (STORY_PHASES[i].id === phase) return STORY_PHASES[i];
    }
    return null;
  }

  /* ================================================================
   *  MODULE EXPORT
   * ================================================================ */

  root.MJ.Dragon.Campaign.Story = Object.freeze({
    STORY_PHASES:   STORY_PHASES,
    QUESTS:         QUESTS,
    NPC_DIALOGUE:   NPC_DIALOGUE,
    DM_NARRATION:   DM_NARRATION,

    getQuest:                 getQuest,
    getAvailableQuests:       getAvailableQuests,
    getNPCDialogue:           getNPCDialogue,
    getDMNarration:           getDMNarration,
    getStoryPhaseDescription: getStoryPhaseDescription
  });

})(typeof window !== 'undefined' ? window : this);
