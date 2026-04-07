/**
 * new-characters.js - Additional unlockable characters beyond Mei/Kenji/Yuki.
 *
 * Defines new characters that unlock at higher reputation levels, along with
 * a manager class for querying unlock status and building character select UI.
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // New character definitions
  // ---------------------------------------------------------------------------

  var NEW_CHARACTERS = {
    dragon_master: {
      id: 'dragon_master',
      name: 'Master Sato',
      fullName: 'Isamu Sato',
      age: 65,
      avatar: '\uD83D\uDC09', // dragon emoji
      unlockLevel: 10,
      occupation: 'Former Mahjong professional, 3-time national champion',
      backstory: "They call him the Dragon Master. He dominated the professional circuit for 20 years before retiring to teach. His style is legendary \u2014 impossible to read, devastating when he strikes. He doesn't play for fun. He plays for perfection.",
      playStyle: {
        riskTolerance: 0.6,
        claimFrequency: 0.5,
        handValuePreference: 0.9,
        defenseOrientation: 0.7,
        bluffFrequency: 0.4
      },
      speechStyle: 'Sparse and commanding. Speaks rarely but with authority. Never wastes words.',
      phrases: {
        game_start: [
          'Let us begin.',
          'Show me what you\'ve learned.',
          'The table awaits.'
        ],
        won: [
          'As expected.',
          'The dragon stirs.',
          'Precision.'
        ],
        lost: [
          '...Interesting.',
          'You have grown.',
          'A worthy opponent.'
        ],
        riichi: [
          'Riichi.',
          'The dragon strikes.',
          'Prepare yourself.'
        ],
        claim: [
          'Mine.',
          'I\'ll take that.',
          'Claimed.'
        ],
        idle: [
          'True mastery is knowing when not to act.',
          'The tiles speak to those who listen in silence.',
          'Watch. Wait. Strike.',
          'Every discard tells a story.'
        ],
        react_to_win: [
          'Well played.',
          'You earned that.',
          'Hm.'
        ],
        react_to_riichi: [
          'Bold.',
          'So you declare.',
          'Interesting timing.'
        ]
      }
    },

    student: {
      id: 'student',
      name: 'Hana',
      fullName: 'Hana Kimura',
      age: 19,
      avatar: '\uD83C\uDF93', // graduation cap emoji
      unlockLevel: 5,
      occupation: 'University student studying game theory',
      backstory: "Hana discovered Mahjong through her game theory class and became obsessed. She approaches each game as a mathematical puzzle, calculating probabilities in her head. She's enthusiastic but inexperienced \u2014 she knows the theory but is still developing the instinct.",
      playStyle: {
        riskTolerance: 0.5,
        claimFrequency: 0.6,
        handValuePreference: 0.4,
        defenseOrientation: 0.5,
        bluffFrequency: 0.2
      },
      speechStyle: 'Enthusiastic and nerdy. Quotes probability. Gets excited about interesting tile distributions.',
      phrases: {
        game_start: [
          'The expected value of fun: very high!',
          'Probability of me winning: calculating...',
          'Let\'s gather some data!'
        ],
        won: [
          'The math was on my side!',
          'My model predicted this!',
          'Statistically significant victory!'
        ],
        lost: [
          'Back to the drawing board...',
          'Need more training data.',
          'Variance is cruel sometimes.'
        ],
        riichi: [
          'The probability distribution says: now!',
          'Riichi! My calculations are complete!',
          'EV-positive declaration!'
        ],
        claim: [
          'Ooh, I needed that one!',
          'That fits my model perfectly!',
          'Probability confirmed!'
        ],
        idle: [
          'Did you know the probability of a specific hand is approximately 1 in 4.7 million?',
          'I\'m writing a paper on tile efficiency. Can I cite our games?',
          'The tile distribution this round is fascinating...',
          'I wonder what the Nash equilibrium of Mahjong looks like.'
        ],
        react_to_win: [
          'Wow, what was your strategy there?',
          'Impressive! Can I analyze that hand later?',
          'The data supports your skill!'
        ],
        react_to_riichi: [
          'Oh no, let me recalculate...',
          'Adjusting my probability model!',
          'Interesting! The tension increases!'
        ]
      }
    },

    traveler: {
      id: 'traveler',
      name: 'Marco',
      fullName: 'Marco Chen',
      age: 42,
      avatar: '\uD83C\uDF0D', // globe emoji
      unlockLevel: 8,
      occupation: 'Travel writer and cultural journalist',
      backstory: "Marco has played Mahjong in 30 countries. Hong Kong rooftops, Tokyo parlors, Singapore hawker centers, San Francisco Chinatown. Each place taught him a different style. He adapts his play to whoever he's facing \u2014 a chameleon at the table.",
      playStyle: {
        riskTolerance: 0.5,
        claimFrequency: 0.5,
        handValuePreference: 0.5,
        defenseOrientation: 0.5,
        bluffFrequency: 0.5
      },
      speechStyle: 'Worldly and storytelling. Every game reminds him of somewhere. Warm and curious.',
      phrases: {
        game_start: [
          'This reminds me of a game in Taipei...',
          'Shall we?',
          'Another city, another table. Let\'s play.'
        ],
        won: [
          'In Macau, they\'d call that a clean sweep.',
          'The tiles traveled well today.',
          'As they say in Shanghai: smooth sailing!'
        ],
        lost: [
          'As they say in Hong Kong: the table turns.',
          'You play like someone I met in Kyoto.',
          'Every loss is a lesson. I learned that in Seoul.'
        ],
        riichi: [
          'Riichi! They play this move differently in Osaka.',
          'As they declare in the Tokyo parlors: riichi!',
          'Going all in \u2014 Macau style.'
        ],
        claim: [
          'Just like a market find in Bangkok!',
          'I\'ll claim that \u2014 finder\'s keepers.',
          'That tile has traveled far to reach me.'
        ],
        idle: [
          'Have you ever played on a rooftop in Kowloon? The city lights look like tiles from up there.',
          'In Singapore, they play with 20-second timers. Intense.',
          'A friend in Manila taught me that the best defense is knowing your opponents\' tells.',
          'The most beautiful Mahjong set I\'ve seen was carved from bone in a village outside Chengdu.',
          'In Taipei, there\'s a 24-hour parlor where the tea never stops flowing.'
        ],
        react_to_win: [
          'Beautiful! That hand reminded me of a game in Yokohama.',
          'Well done! Respect.',
          'You would do well in the Hong Kong circuit.'
        ],
        react_to_riichi: [
          'The tension! This feels like a Macau final.',
          'Bold move. Reminds me of a player in Osaka.',
          'Here we go \u2014 this is what makes the game great.'
        ]
      }
    }
  };

  // ---------------------------------------------------------------------------
  // NewCharacterManager class
  // ---------------------------------------------------------------------------

  function NewCharacterManager() {
    this.characters = NEW_CHARACTERS;
    this._equipped = null;
    this._loadEquipped();
  }

  /** @private */
  NewCharacterManager.prototype._loadEquipped = function() {
    try {
      this._equipped = JSON.parse(localStorage.getItem('mj_equipped_chars')) || {};
    } catch (e) {
      this._equipped = {};
    }
  };

  /** @private */
  NewCharacterManager.prototype._saveEquipped = function() {
    try {
      localStorage.setItem('mj_equipped_chars', JSON.stringify(this._equipped));
    } catch (e) {
      // storage unavailable
    }
  };

  /**
   * Get all characters available at the given player level.
   * @param {number} playerLevel
   * @returns {Array} Array of character objects that are unlocked
   */
  NewCharacterManager.prototype.getAvailableCharacters = function(playerLevel) {
    var available = [];
    for (var id in this.characters) {
      if (!this.characters.hasOwnProperty(id)) continue;
      if (this.characters[id].unlockLevel <= playerLevel) {
        available.push(this.characters[id]);
      }
    }
    return available;
  };

  /**
   * Get full character data by id.
   * @param {string} id
   * @returns {object|null}
   */
  NewCharacterManager.prototype.getCharacterInfo = function(id) {
    return this.characters[id] || null;
  };

  /**
   * Check if a character is unlocked at a given player level.
   * @param {string} id
   * @param {number} playerLevel
   * @returns {boolean}
   */
  NewCharacterManager.prototype.isUnlocked = function(id, playerLevel) {
    var char = this.characters[id];
    if (!char) return false;
    return playerLevel >= char.unlockLevel;
  };

  /**
   * Get all characters including locked ones (for preview/teaser UI).
   * @returns {Array} Array of all character objects
   */
  NewCharacterManager.prototype.getAllCharacters = function() {
    var all = [];
    for (var id in this.characters) {
      if (this.characters.hasOwnProperty(id)) {
        all.push(this.characters[id]);
      }
    }
    // Sort by unlock level
    all.sort(function(a, b) { return a.unlockLevel - b.unlockLevel; });
    return all;
  };

  /**
   * Get a random phrase for a character in a given context.
   * @param {string} charId
   * @param {string} context - e.g., 'game_start', 'won', 'lost', 'idle'
   * @returns {string|null}
   */
  NewCharacterManager.prototype.getPhrase = function(charId, context) {
    var char = this.characters[charId];
    if (!char || !char.phrases || !char.phrases[context]) return null;
    var pool = char.phrases[context];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  /**
   * Build character selection UI cards.
   * @param {number} playerLevel - current player level for unlock checks
   * @returns {HTMLElement} Container div with character cards
   */
  NewCharacterManager.prototype.buildCharacterSelectUI = function(playerLevel) {
    var container = document.createElement('div');
    container.className = 'new-character-select';
    container.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;padding:16px;justify-content:center;';

    var allChars = this.getAllCharacters();
    var self = this;

    for (var i = 0; i < allChars.length; i++) {
      var char = allChars[i];
      var unlocked = playerLevel >= char.unlockLevel;
      var card = document.createElement('div');
      card.className = 'character-card' + (unlocked ? ' unlocked' : ' locked');
      card.style.cssText = 'width:240px;border:2px solid ' + (unlocked ? '#4a7c59' : '#666') +
        ';border-radius:12px;padding:16px;background:' + (unlocked ? '#1a2a1a' : '#1a1a1a') +
        ';opacity:' + (unlocked ? '1' : '0.7') + ';transition:all 0.3s;cursor:' +
        (unlocked ? 'pointer' : 'default') + ';';

      // Avatar
      var avatarDiv = document.createElement('div');
      avatarDiv.style.cssText = 'font-size:48px;text-align:center;margin-bottom:8px;' +
        (unlocked ? '' : 'filter:grayscale(1);');
      avatarDiv.textContent = char.avatar;
      card.appendChild(avatarDiv);

      // Name
      var nameDiv = document.createElement('div');
      nameDiv.style.cssText = 'font-size:18px;font-weight:bold;text-align:center;color:' +
        (unlocked ? '#e0d0b0' : '#888') + ';margin-bottom:4px;';
      nameDiv.textContent = char.name;
      card.appendChild(nameDiv);

      // Occupation
      var occDiv = document.createElement('div');
      occDiv.style.cssText = 'font-size:12px;color:#999;text-align:center;margin-bottom:8px;font-style:italic;';
      occDiv.textContent = unlocked ? char.occupation : 'Unlocks at level ' + char.unlockLevel;
      card.appendChild(occDiv);

      // Backstory (truncated for locked)
      var storyDiv = document.createElement('div');
      storyDiv.style.cssText = 'font-size:13px;color:#bbb;line-height:1.4;margin-bottom:12px;';
      if (unlocked) {
        storyDiv.textContent = char.backstory;
      } else {
        storyDiv.textContent = char.backstory.substring(0, 60) + '...';
      }
      card.appendChild(storyDiv);

      // Play style preview (only when unlocked)
      if (unlocked) {
        var styleDiv = document.createElement('div');
        styleDiv.style.cssText = 'margin-top:8px;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;';
        var styleLabel = document.createElement('div');
        styleLabel.style.cssText = 'font-size:11px;color:#888;margin-bottom:4px;text-transform:uppercase;';
        styleLabel.textContent = 'Play Style';
        styleDiv.appendChild(styleLabel);

        var traits = [
          { label: 'Risk', value: char.playStyle.riskTolerance },
          { label: 'Aggression', value: char.playStyle.claimFrequency },
          { label: 'Hand Value', value: char.playStyle.handValuePreference },
          { label: 'Defense', value: char.playStyle.defenseOrientation }
        ];

        for (var t = 0; t < traits.length; t++) {
          var traitRow = document.createElement('div');
          traitRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;';

          var traitLabel = document.createElement('span');
          traitLabel.style.cssText = 'font-size:11px;color:#aaa;width:70px;';
          traitLabel.textContent = traits[t].label;

          var barBg = document.createElement('div');
          barBg.style.cssText = 'flex:1;height:6px;background:#333;border-radius:3px;overflow:hidden;';
          var barFill = document.createElement('div');
          barFill.style.cssText = 'height:100%;width:' + (traits[t].value * 100) +
            '%;background:linear-gradient(90deg,#4a7c59,#7cb342);border-radius:3px;';
          barBg.appendChild(barFill);

          traitRow.appendChild(traitLabel);
          traitRow.appendChild(barBg);
          styleDiv.appendChild(traitRow);
        }
        card.appendChild(styleDiv);
      }

      // Lock indicator for locked characters
      if (!unlocked) {
        var lockDiv = document.createElement('div');
        lockDiv.style.cssText = 'text-align:center;margin-top:8px;font-size:24px;';
        lockDiv.textContent = '\uD83D\uDD12'; // lock emoji
        card.appendChild(lockDiv);

        var reqDiv = document.createElement('div');
        reqDiv.style.cssText = 'text-align:center;font-size:12px;color:#cc8844;margin-top:4px;';
        reqDiv.textContent = 'Reach level ' + char.unlockLevel + ' to unlock';
        card.appendChild(reqDiv);
      }

      // Select button for unlocked
      if (unlocked) {
        var btn = document.createElement('button');
        btn.style.cssText = 'width:100%;margin-top:12px;padding:8px;border:none;border-radius:6px;' +
          'background:#4a7c59;color:#fff;font-size:14px;cursor:pointer;';
        btn.textContent = 'Select ' + char.name;
        btn.setAttribute('data-char-id', char.id);
        btn.addEventListener('click', function(e) {
          var charId = e.target.getAttribute('data-char-id');
          var evt = new CustomEvent('character-selected', { detail: { characterId: charId } });
          container.dispatchEvent(evt);
        });
        card.appendChild(btn);
      }

      container.appendChild(card);
    }

    return container;
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  root.MJ.NewCharacters = NewCharacterManager;
  root.MJ.NEW_CHARACTER_DATA = NEW_CHARACTERS;

})(typeof window !== 'undefined' ? window : global);
