/**
 * procedural-characters.js — Generate unique AI opponents with randomized personalities
 * Uses seed-based RNG for reproducibility. Derives play style from Big Five traits.
 * Exports: root.MJ.ProceduralCharacters
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Data pools
  // ---------------------------------------------------------------------------

  const FIRST_NAMES = [
    'Akira', 'Yumi', 'Daisuke', 'Haruka', 'Takeshi',
    'Sora', 'Ren', 'Mika', 'Shin', 'Aoi',
    'Nao', 'Kyo', 'Jun', 'Riko', 'Toma'
  ];

  const LAST_NAMES = [
    'Tanaka', 'Sato', 'Yamamoto', 'Suzuki', 'Watanabe',
    'Ito', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida'
  ];

  const OCCUPATIONS = [
    'teacher', 'chef', 'musician', 'programmer', 'artist',
    'doctor', 'student', 'writer', 'architect', 'photographer',
    'librarian', 'mechanic', 'florist', 'pilot', 'baker'
  ];

  const CITIES = [
    'Tokyo', 'Osaka', 'Kyoto', 'Nagoya', 'Sapporo',
    'Fukuoka', 'Kobe', 'Sendai', 'Yokohama', 'Hiroshima'
  ];

  const INTERESTS = [
    'calligraphy', 'gardening', 'cooking', 'hiking', 'photography',
    'reading', 'fishing', 'painting', 'tea ceremony', 'origami',
    'cycling', 'chess', 'pottery', 'karaoke', 'anime',
    'bonsai', 'yoga', 'surfing', 'knitting', 'astronomy',
    'birdwatching', 'martial arts', 'video games', 'poetry', 'dancing',
    'woodworking', 'traveling', 'swimming', 'board games', 'meditation'
  ];

  const AVATAR_EMOJIS = [
    '\uD83D\uDC68', '\uD83D\uDC69', '\uD83E\uDDD3', '\uD83D\uDC74', '\uD83D\uDC75',
    '\uD83E\uDDD1', '\uD83D\uDE0E', '\uD83E\uDD13', '\uD83E\uDDD0', '\uD83D\uDE0A',
    '\uD83D\uDE04', '\uD83E\uDD14', '\uD83D\uDE0F', '\uD83E\uDDD2', '\uD83E\uDD29',
    '\uD83D\uDE36', '\uD83D\uDE24', '\uD83D\uDE0C', '\uD83D\uDE03', '\uD83E\uDD20'
  ];

  const PERSONALITY_DESCRIPTIONS = {
    high_openness: [
      'always experimenting with unconventional hand strategies',
      'fascinated by the beauty of rare yakuman patterns',
      'approaches each game as a creative puzzle'
    ],
    low_openness: [
      'sticks to proven strategies and time-tested methods',
      'believes in mastering the fundamentals above all',
      'prefers reliable play over flashy combinations'
    ],
    high_conscientiousness: [
      'meticulously tracks every discard and calculates tile efficiency',
      'never makes a careless discard',
      'known for disciplined, mathematically precise play'
    ],
    low_conscientiousness: [
      'plays by feel rather than strict calculation',
      'sometimes makes impulsive discards that pay off surprisingly well',
      'relies more on instinct than analysis'
    ],
    high_extraversion: [
      'loves the social atmosphere of mahjong parlors',
      'always chatting and joking between turns',
      'makes the table lively with running commentary'
    ],
    low_extraversion: [
      'quietly focuses on the tiles, speaking only when necessary',
      'prefers small home games over crowded parlors',
      'lets their play do the talking'
    ],
    high_agreeableness: [
      'gracious in both victory and defeat',
      'often helps newer players learn the ropes',
      'known for sportsmanship and fair play'
    ],
    low_agreeableness: [
      'fiercely competitive and never holds back',
      'not afraid to make risky calls that frustrate opponents',
      'plays to win, no apologies'
    ],
    high_neuroticism: [
      'tends to second-guess discards under pressure',
      'gets visibly flustered after dealing into a big hand',
      'emotional swings can affect their play for better or worse'
    ],
    low_neuroticism: [
      'unflappable even after the worst losses',
      'maintains composure no matter what the wall brings',
      'ice-cold under pressure'
    ]
  };

  const MAHJONG_RELATIONSHIPS = [
    'Learned mahjong from {relative} at age {learnAge}',
    'Discovered mahjong through {relative} and has been hooked ever since',
    'Started playing competitively {years} years ago',
    'Plays weekly at {place} with a regular group',
    'Has been studying mahjong strategy books for {years} years',
    'Fell in love with mahjong during a trip to {city}'
  ];

  // ---------------------------------------------------------------------------
  // Seeded PRNG (mulberry32)
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    var s = seed | 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededPick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function seededPickN(rng, arr, n) {
    var copy = arr.slice();
    var result = [];
    for (var i = 0; i < n && copy.length > 0; i++) {
      var idx = Math.floor(rng() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  function seededRange(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  function seededFloat(rng) {
    return parseFloat(rng().toFixed(2));
  }

  // ---------------------------------------------------------------------------
  // Play style derivation from Big Five
  // ---------------------------------------------------------------------------

  function generatePlayStyle(personality) {
    var O = personality.openness;
    var C = personality.conscientiousness;
    var E = personality.extraversion;
    var A = personality.agreeableness;
    var N = personality.neuroticism;

    return {
      // High openness → creative/unusual hands; low → efficient standard play
      handValuePreference: parseFloat((0.3 + O * 0.5 + (1 - C) * 0.2).toFixed(2)),
      // High conscientiousness → efficient tile selection
      efficiency: parseFloat((0.2 + C * 0.6 + (1 - N) * 0.2).toFixed(2)),
      // High extraversion → claims more tiles (chi, pon, kan)
      claimFrequency: parseFloat((0.15 + E * 0.5 + (1 - A) * 0.2).toFixed(2)),
      // Low agreeableness → more aggressive play
      aggression: parseFloat((0.1 + (1 - A) * 0.5 + E * 0.2 + N * 0.1).toFixed(2)),
      // High conscientiousness + low neuroticism → better defense
      defenseOrientation: parseFloat((0.2 + C * 0.4 + (1 - N) * 0.3 + A * 0.1).toFixed(2)),
      // Risk tolerance: openness and low neuroticism increase it
      riskTolerance: parseFloat((0.1 + O * 0.3 + (1 - N) * 0.3 + (1 - A) * 0.15).toFixed(2)),
      // Bluff frequency: extraversion and low agreeableness
      bluffFrequency: parseFloat((0.05 + E * 0.25 + (1 - A) * 0.25 + O * 0.1).toFixed(2)),
      // Tilt resistance: inverse of neuroticism
      tiltResistance: parseFloat((0.1 + (1 - N) * 0.7 + C * 0.2).toFixed(2))
    };
  }

  // ---------------------------------------------------------------------------
  // Phrase bank generation
  // ---------------------------------------------------------------------------

  function generatePhraseBanks(character) {
    var p = character.personality;
    var name = character.firstName;
    var phrases = {
      game_start: [],
      won: [],
      lost: [],
      riichi: [],
      claim: [],
      idle: [],
      tilt: [],
      compliment: []
    };

    // Game start
    if (p.extraversion > 0.6) {
      phrases.game_start.push("Let's go! I've been looking forward to this!");
      phrases.game_start.push('Alright everyone, prepare yourselves!');
      phrases.game_start.push("This is going to be fun! Who's ready?");
    } else {
      phrases.game_start.push('Shall we begin.');
      phrases.game_start.push('Good. Let us play.');
      phrases.game_start.push('Ready when you are.');
    }

    // Won
    if (p.neuroticism > 0.6) {
      phrases.won.push('Yes!! Finally! I was so worried that would fall apart!');
      phrases.won.push('Oh thank goodness, I actually won!');
      phrases.won.push('I cannot believe that worked out!');
    } else if (p.agreeableness > 0.6) {
      phrases.won.push('That was a good game, everyone.');
      phrases.won.push('I got lucky with those draws.');
      phrases.won.push('Well played, all of you.');
    } else {
      phrases.won.push('As I planned.');
      phrases.won.push('That hand was mine from the start.');
      phrases.won.push('Too easy.');
    }

    // Lost
    if (p.neuroticism > 0.6) {
      phrases.lost.push('No no no... I had that!');
      phrases.lost.push('This is so frustrating...');
      phrases.lost.push('I should have seen that coming...');
    } else if (p.agreeableness > 0.6) {
      phrases.lost.push('Nice hand! Well deserved.');
      phrases.lost.push('Good play, congratulations.');
      phrases.lost.push("That's how the tiles fall sometimes.");
    } else {
      phrases.lost.push("Tch. I'll get you next round.");
      phrases.lost.push('Enjoy it while it lasts.');
      phrases.lost.push('...Next game.');
    }

    // Riichi
    if (p.extraversion > 0.6) {
      phrases.riichi.push('RIICHI! Come on, give me that winning tile!');
      phrases.riichi.push("Riichi!! I'm feeling lucky!");
    } else {
      phrases.riichi.push('Riichi.');
      phrases.riichi.push('...Riichi.');
    }
    phrases.riichi.push('Declaring riichi.');

    // Claim
    if (p.extraversion > 0.6) {
      phrases.claim.push("I'll take that, thank you very much!");
      phrases.claim.push('Pon! Ha, perfect timing!');
    } else {
      phrases.claim.push('Pon.');
      phrases.claim.push("I'll claim that.");
    }
    phrases.claim.push('Mine.');

    // Idle
    if (p.openness > 0.6) {
      phrases.idle.push('I wonder what pattern the wall has in store...');
      phrases.idle.push('Every hand tells a different story.');
      phrases.idle.push('The beauty of mahjong is in its uncertainty.');
    } else {
      phrases.idle.push('Hmm, let me think...');
      phrases.idle.push('Interesting board state.');
      phrases.idle.push('Calculating...');
    }

    // Tilt (high neuroticism = more reactive)
    if (p.neuroticism > 0.5) {
      phrases.tilt.push("Everything is going wrong today...");
      phrases.tilt.push('Why do I keep getting these terrible draws?!');
      phrases.tilt.push('I cannot catch a break!');
    } else {
      phrases.tilt.push('Rough stretch. Stay focused.');
      phrases.tilt.push("Bad luck happens. Let's reset.");
      phrases.tilt.push('Patience.');
    }

    // Compliment
    if (p.agreeableness > 0.5) {
      phrases.compliment.push('That was a really smart discard.');
      phrases.compliment.push('Impressive hand reading!');
      phrases.compliment.push("You're getting better every game.");
    } else {
      phrases.compliment.push("Hmph. Not bad, I suppose.");
      phrases.compliment.push('Lucky draw.');
      phrases.compliment.push("Don't get cocky.");
    }

    return phrases;
  }

  // ---------------------------------------------------------------------------
  // Backstory generation
  // ---------------------------------------------------------------------------

  function generateBackstory(character, rng) {
    var p = character.personality;
    // Pick dominant trait
    var traits = [
      { key: 'openness', val: p.openness },
      { key: 'conscientiousness', val: p.conscientiousness },
      { key: 'extraversion', val: p.extraversion },
      { key: 'agreeableness', val: p.agreeableness },
      { key: 'neuroticism', val: p.neuroticism }
    ];
    traits.sort(function (a, b) { return b.val - a.val; });

    var top = traits[0];
    var descKey = (top.val > 0.5 ? 'high_' : 'low_') + top.key;
    var personalityDesc = seededPick(rng, PERSONALITY_DESCRIPTIONS[descKey] || ['a dedicated mahjong enthusiast']);

    // Mahjong relationship
    var relatives = ['a grandparent', 'a college friend', 'a neighbor', 'a coworker', 'a mentor'];
    var places = ['the local mahjong club', 'a friend\'s house', 'the community center', 'a downtown parlor'];
    var template = seededPick(rng, MAHJONG_RELATIONSHIPS);
    var relationship = template
      .replace('{relative}', seededPick(rng, relatives))
      .replace('{learnAge}', String(seededRange(rng, 8, 25)))
      .replace('{years}', String(seededRange(rng, 2, 30)))
      .replace('{place}', seededPick(rng, places))
      .replace('{city}', seededPick(rng, CITIES));

    return character.firstName + ' ' + character.lastName +
      ' is a ' + character.age + '-year-old ' + character.occupation +
      ' from ' + character.city + '. ' +
      capitalizeFirst(personalityDesc) + '. ' +
      relationship + '.';
  }

  function capitalizeFirst(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---------------------------------------------------------------------------
  // Speech style generation
  // ---------------------------------------------------------------------------

  function generateSpeechStyle(personality) {
    var parts = [];
    if (personality.extraversion > 0.7) {
      parts.push('Loud and enthusiastic');
      parts.push('uses lots of exclamation marks');
    } else if (personality.extraversion < 0.3) {
      parts.push('Quiet and measured');
      parts.push('speaks in short sentences');
    } else {
      parts.push('Conversational tone');
    }

    if (personality.openness > 0.7) {
      parts.push('makes poetic or philosophical observations');
    }
    if (personality.agreeableness < 0.3) {
      parts.push('blunt and occasionally sarcastic');
    } else if (personality.agreeableness > 0.7) {
      parts.push('warm and encouraging');
    }
    if (personality.neuroticism > 0.7) {
      parts.push('voice rises when stressed');
    }
    if (personality.conscientiousness > 0.7) {
      parts.push('precise word choice');
    }

    return parts.join('. ') + '.';
  }

  // ---------------------------------------------------------------------------
  // ProceduralCharacterGenerator class
  // ---------------------------------------------------------------------------

  class ProceduralCharacterGenerator {
    constructor() {}

    generate(seed) {
      var rng = mulberry32(seed);

      var firstName = seededPick(rng, FIRST_NAMES);
      var lastName = seededPick(rng, LAST_NAMES);
      var age = seededRange(rng, 18, 75);
      var occupation = seededPick(rng, OCCUPATIONS);
      var city = seededPick(rng, CITIES);
      var avatar = seededPick(rng, AVATAR_EMOJIS);

      var personality = {
        openness: seededFloat(rng),
        conscientiousness: seededFloat(rng),
        extraversion: seededFloat(rng),
        agreeableness: seededFloat(rng),
        neuroticism: seededFloat(rng)
      };

      var interestCount = seededRange(rng, 3, 5);
      var interests = seededPickN(rng, INTERESTS, interestCount);

      var character = {
        seed: seed,
        firstName: firstName,
        lastName: lastName,
        fullName: firstName + ' ' + lastName,
        age: age,
        occupation: occupation,
        city: city,
        avatar: avatar,
        personality: personality,
        interests: interests,
        playStyle: generatePlayStyle(personality),
        speechStyle: generateSpeechStyle(personality),
        backstory: '',
        phrases: {}
      };

      character.backstory = generateBackstory(character, rng);
      character.phrases = generatePhraseBanks(character);

      return character;
    }

    generatePhraseBanks(character) {
      return generatePhraseBanks(character);
    }

    generatePlayStyle(personality) {
      return generatePlayStyle(personality);
    }

    getProceduralOpponents(count, playerLevel) {
      playerLevel = playerLevel || 1;
      count = count || 3;
      var opponents = [];
      var baseSeed = playerLevel * 10000 + 42;

      for (var i = 0; i < count; i++) {
        var seed = baseSeed + i * 7919; // Use prime spacing for variety
        var character = this.generate(seed);

        // Scale difficulty to player level
        // Higher levels: boost conscientiousness and lower neuroticism
        var levelFactor = Math.min(playerLevel / 20, 1); // 0..1 over 20 levels
        character.personality.conscientiousness = clamp01(
          character.personality.conscientiousness + levelFactor * 0.3
        );
        character.personality.neuroticism = clamp01(
          character.personality.neuroticism - levelFactor * 0.2
        );
        // Recalculate derived stats
        character.playStyle = generatePlayStyle(character.personality);
        character.speechStyle = generateSpeechStyle(character.personality);
        character.phrases = generatePhraseBanks(character);

        // Add skill rating based on level
        character.skillRating = Math.round(800 + playerLevel * 50 + (character.personality.conscientiousness * 200));

        opponents.push(character);
      }

      return opponents;
    }

    buildCharacterCard(character) {
      if (typeof document === 'undefined') return null;

      var card = document.createElement('div');
      card.className = 'mj-char-card';
      card.style.cssText = 'background:#1e293b;color:#e2e8f0;border-radius:10px;padding:16px;max-width:300px;font-family:inherit;box-shadow:0 4px 12px rgba(0,0,0,0.3);';

      // Header: avatar + name
      var header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;';
      var avatarEl = document.createElement('span');
      avatarEl.style.cssText = 'font-size:32px;';
      avatarEl.textContent = character.avatar;
      var nameEl = document.createElement('div');
      nameEl.innerHTML = '<strong style="font-size:16px;">' + escapeHtml(character.fullName) + '</strong><br>' +
        '<span style="color:#94a3b8;font-size:12px;">' + escapeHtml(character.occupation) + ', ' + character.age + ' — ' + escapeHtml(character.city) + '</span>';
      header.appendChild(avatarEl);
      header.appendChild(nameEl);
      card.appendChild(header);

      // Personality bars
      var traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
      var traitLabels = ['OPN', 'CON', 'EXT', 'AGR', 'NEU'];
      var barsDiv = document.createElement('div');
      barsDiv.style.cssText = 'margin-bottom:10px;';
      for (var i = 0; i < traits.length; i++) {
        var val = character.personality[traits[i]];
        var barRow = document.createElement('div');
        barRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;font-size:11px;';
        var label = document.createElement('span');
        label.style.cssText = 'width:30px;color:#94a3b8;';
        label.textContent = traitLabels[i];
        var barBg = document.createElement('div');
        barBg.style.cssText = 'flex:1;height:6px;background:#334155;border-radius:3px;overflow:hidden;';
        var barFill = document.createElement('div');
        var hue = Math.round(120 * val); // green for high, red for low
        barFill.style.cssText = 'height:100%;width:' + Math.round(val * 100) + '%;background:hsl(' + hue + ',60%,50%);border-radius:3px;';
        barBg.appendChild(barFill);
        barRow.appendChild(label);
        barRow.appendChild(barBg);
        barsDiv.appendChild(barRow);
      }
      card.appendChild(barsDiv);

      // Interests
      var intDiv = document.createElement('div');
      intDiv.style.cssText = 'font-size:12px;color:#94a3b8;margin-bottom:8px;';
      intDiv.textContent = 'Interests: ' + character.interests.join(', ');
      card.appendChild(intDiv);

      // Backstory
      var storyDiv = document.createElement('div');
      storyDiv.style.cssText = 'font-size:12px;color:#cbd5e1;line-height:1.4;';
      storyDiv.textContent = character.backstory;
      card.appendChild(storyDiv);

      return card;
    }
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function escapeHtml(s) {
    if (typeof document !== 'undefined') {
      var div = document.createElement('div');
      div.appendChild(document.createTextNode(s));
      return div.innerHTML;
    }
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  root.MJ.ProceduralCharacters = Object.freeze({
    ProceduralCharacterGenerator: ProceduralCharacterGenerator,
    CITIES: CITIES,
    FIRST_NAMES: FIRST_NAMES,
    LAST_NAMES: LAST_NAMES,
    OCCUPATIONS: OCCUPATIONS,
    INTERESTS: INTERESTS,
    generatePlayStyle: generatePlayStyle
  });
  if (typeof console !== 'undefined') console.log('[Mahjong] ProceduralCharacters module loaded');
})(typeof window !== 'undefined' ? window : global);
