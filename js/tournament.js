/**
 * tournament.js — 8-player elimination tournament system with AI bracket management
 * Exports: root.MJ.Tournament
 */
(function (exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── Constants ────────────────────────────────────────────────────

  var STORAGE_KEY = 'mj_tournament_history';
  var XP_TOURNAMENT_WIN = 50;

  // ── Challenger pool ──────────────────────────────────────────────
  // Simpler AI characters: name + description + play style weights

  var CHALLENGER_POOL = [
    {
      id: 'hiro',
      name: 'Hiro',
      description: 'Aggressive speedster who races for quick wins',
      quote: 'Speed is everything. Hesitate and you lose.',
      style: { aggression: 0.9, defense: 0.2, speed: 0.95, patience: 0.1 }
    },
    {
      id: 'sakura',
      name: 'Sakura',
      description: 'Defensive expert who waits for the perfect moment',
      quote: 'Patience is a weapon sharper than any blade.',
      style: { aggression: 0.2, defense: 0.95, speed: 0.3, patience: 0.9 }
    },
    {
      id: 'ryu',
      name: 'Ryu',
      description: 'Balanced veteran who adapts to any opponent',
      quote: 'True mastery is knowing when to strike and when to wait.',
      style: { aggression: 0.6, defense: 0.6, speed: 0.5, patience: 0.6 }
    },
    {
      id: 'akiko',
      name: 'Akiko',
      description: 'Risk-taker who goes all-in on big hands',
      quote: 'Why settle for small wins when glory awaits?',
      style: { aggression: 0.8, defense: 0.3, speed: 0.4, patience: 0.7 }
    },
    {
      id: 'taro',
      name: 'Taro',
      description: 'Methodical thinker who calculates every discard',
      quote: 'Every tile tells a story if you listen carefully.',
      style: { aggression: 0.4, defense: 0.7, speed: 0.3, patience: 0.85 }
    },
    {
      id: 'naomi',
      name: 'Naomi',
      description: 'Unpredictable wildcard with unorthodox strategies',
      quote: 'If even I do not know my next move, how can you?',
      style: { aggression: 0.7, defense: 0.4, speed: 0.6, patience: 0.3 }
    },
    {
      id: 'koji',
      name: 'Koji',
      description: 'Calm analyst who reads opponents like open books',
      quote: 'Your discards reveal more than you realize.',
      style: { aggression: 0.5, defense: 0.8, speed: 0.4, patience: 0.75 }
    },
    {
      id: 'rin',
      name: 'Rin',
      description: 'Young prodigy who plays with fearless intuition',
      quote: 'Thinking too hard only slows you down!',
      style: { aggression: 0.75, defense: 0.35, speed: 0.85, patience: 0.2 }
    }
  ];

  // Known main AI characters (referenced by characterId)
  var KNOWN_AI = [
    { characterId: 'mei', name: 'Mei', type: 'ai' },
    { characterId: 'kenji', name: 'Kenji', type: 'ai' },
    { characterId: 'yuki', name: 'Yuki', type: 'ai' }
  ];

  // ── Utility helpers ──────────────────────────────────────────────

  function generateId() {
    return 'trn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function pickRandom(arr, count) {
    var shuffled = shuffleArray(arr);
    return shuffled.slice(0, count);
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { tournaments: [], totalWins: 0, totalPlayed: 0 };
    } catch (e) {
      return { tournaments: [], totalWins: 0, totalPlayed: 0 };
    }
  }

  function saveHistory(history) {
    try {
      // Keep only the last 50 tournament records
      if (history.tournaments.length > 50) {
        history.tournaments = history.tournaments.slice(-50);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      // localStorage full or unavailable; silently fail
    }
  }

  // ── Match class ──────────────────────────────────────────────────

  /**
   * Represents a single match in the bracket.
   * A match holds references to two player slots and a result.
   */
  function Match(id, round, position) {
    this.id = id;
    this.round = round;
    this.position = position;
    this.player1 = null;  // {id, name, type, characterId?, style?}
    this.player2 = null;
    this.winnerId = null;
    this.loserId = null;
    this.scores = {};     // playerId -> cumulative score across rounds
    this.roundResults = []; // per-round results
    this.played = false;
  }

  Match.prototype.isReady = function () {
    return this.player1 !== null && this.player2 !== null && !this.played;
  };

  Match.prototype.getWinner = function () {
    if (!this.played) return null;
    if (this.winnerId === this.player1.id) return this.player1;
    if (this.winnerId === this.player2.id) return this.player2;
    return null;
  };

  Match.prototype.getLoser = function () {
    if (!this.played) return null;
    if (this.loserId === this.player1.id) return this.player1;
    if (this.loserId === this.player2.id) return this.player2;
    return null;
  };

  // ── Bracket class ────────────────────────────────────────────────

  /**
   * Manages the tree of matches for single elimination.
   * For 8 players: 3 rounds — quarterfinals (4 matches), semifinals (2), final (1).
   */
  function Bracket(players) {
    this.players = players.slice();
    this.rounds = [];
    this.matches = {};
    this.champion = null;
    this.eliminated = [];
    this._buildSingleElimination();
  }

  Bracket.prototype._buildSingleElimination = function () {
    var numPlayers = this.players.length;
    // Ensure power of 2 (pad with byes if needed, though default is 8)
    var numRounds = Math.ceil(Math.log2(numPlayers));
    var bracketSize = Math.pow(2, numRounds);
    var matchId = 0;

    // Seed players (shuffle for random seeding)
    var seeded = shuffleArray(this.players);

    // Build rounds from first to last
    for (var r = 0; r < numRounds; r++) {
      var matchesInRound = Math.pow(2, numRounds - 1 - r);
      var round = [];
      for (var m = 0; m < matchesInRound; m++) {
        var match = new Match(matchId++, r, m);
        round.push(match);
        this.matches[match.id] = match;
      }
      this.rounds.push(round);
    }

    // Assign players to first round
    var firstRound = this.rounds[0];
    for (var i = 0; i < firstRound.length; i++) {
      var p1Index = i * 2;
      var p2Index = i * 2 + 1;
      firstRound[i].player1 = p1Index < seeded.length ? seeded[p1Index] : null;
      firstRound[i].player2 = p2Index < seeded.length ? seeded[p2Index] : null;

      // Handle byes (if a player has no opponent, auto-advance)
      if (firstRound[i].player1 && !firstRound[i].player2) {
        this._autoAdvance(firstRound[i], firstRound[i].player1);
      } else if (!firstRound[i].player1 && firstRound[i].player2) {
        this._autoAdvance(firstRound[i], firstRound[i].player2);
      }
    }
  };

  Bracket.prototype._autoAdvance = function (match, player) {
    match.winnerId = player.id;
    match.played = true;
    this._advanceWinner(match);
  };

  Bracket.prototype._advanceWinner = function (match) {
    var winner = match.getWinner();
    if (!winner) return;

    var nextRoundIndex = match.round + 1;
    if (nextRoundIndex >= this.rounds.length) {
      // This was the final — we have a champion
      this.champion = winner;
      return;
    }

    var nextMatchPos = Math.floor(match.position / 2);
    var nextMatch = this.rounds[nextRoundIndex][nextMatchPos];
    if (match.position % 2 === 0) {
      nextMatch.player1 = winner;
    } else {
      nextMatch.player2 = winner;
    }
  };

  Bracket.prototype.recordMatchResult = function (matchId, winnerId) {
    var match = this.matches[matchId];
    if (!match || match.played) return false;

    match.winnerId = winnerId;
    match.loserId = (winnerId === match.player1.id) ? match.player2.id : match.player1.id;
    match.played = true;

    // Track eliminated player
    var loser = match.getLoser();
    if (loser) {
      this.eliminated.push(loser);
    }

    this._advanceWinner(match);
    return true;
  };

  Bracket.prototype.getCurrentMatch = function () {
    for (var r = 0; r < this.rounds.length; r++) {
      for (var m = 0; m < this.rounds[r].length; m++) {
        var match = this.rounds[r][m];
        if (match.isReady()) {
          return match;
        }
      }
    }
    return null;
  };

  Bracket.prototype.getRoundName = function (roundIndex) {
    var total = this.rounds.length;
    if (roundIndex === total - 1) return 'Final';
    if (roundIndex === total - 2) return 'Semifinal';
    if (roundIndex === total - 3) return 'Quarterfinal';
    return 'Round ' + (roundIndex + 1);
  };

  Bracket.prototype.getDisplay = function () {
    var display = {
      rounds: [],
      champion: this.champion,
      eliminated: this.eliminated.slice()
    };

    for (var r = 0; r < this.rounds.length; r++) {
      var roundData = {
        name: this.getRoundName(r),
        matches: []
      };
      for (var m = 0; m < this.rounds[r].length; m++) {
        var match = this.rounds[r][m];
        roundData.matches.push({
          id: match.id,
          player1: match.player1 ? { id: match.player1.id, name: match.player1.name } : null,
          player2: match.player2 ? { id: match.player2.id, name: match.player2.name } : null,
          winnerId: match.winnerId,
          played: match.played,
          scores: Object.assign({}, match.scores),
          ready: match.isReady()
        });
      }
      display.rounds.push(roundData);
    }

    return display;
  };

  // ── TournamentManager class ──────────────────────────────────────

  function TournamentManager() {
    this.tournament = null;
    this.bracket = null;
    this.history = loadHistory();
  }

  /**
   * Create a new tournament.
   * @param {Object} config
   * @param {Array}  config.players — [{name, type:'human'|'ai', characterId?}]
   * @param {string} config.format — 'single_elimination' | 'round_robin'
   * @param {number} config.roundsPerMatch — rounds per match (default 4)
   */
  TournamentManager.prototype.createTournament = function (config) {
    config = config || {};
    var format = config.format || 'single_elimination';
    var roundsPerMatch = config.roundsPerMatch || 4;
    var players = config.players || null;

    if (!players) {
      players = this._buildDefaultPlayers();
    }

    // Ensure every player has an id
    for (var i = 0; i < players.length; i++) {
      if (!players[i].id) {
        players[i].id = players[i].characterId || players[i].name.toLowerCase() + '_' + i;
      }
    }

    this.tournament = {
      id: generateId(),
      format: format,
      roundsPerMatch: roundsPerMatch,
      players: players,
      startedAt: Date.now(),
      finishedAt: null,
      champion: null,
      status: 'in_progress'
    };

    if (format === 'single_elimination') {
      this.bracket = new Bracket(players);
    } else if (format === 'round_robin') {
      this.bracket = this._buildRoundRobin(players);
    }

    return this.tournament;
  };

  /**
   * Build the default 8-player roster:
   * 1 human + 3 known AI (Mei/Kenji/Yuki) + 4 random challengers
   */
  TournamentManager.prototype._buildDefaultPlayers = function () {
    var players = [];

    // Human player
    players.push({
      id: 'human',
      name: 'You',
      type: 'human',
      characterId: null
    });

    // 3 known AI
    for (var i = 0; i < KNOWN_AI.length; i++) {
      players.push({
        id: KNOWN_AI[i].characterId,
        name: KNOWN_AI[i].name,
        type: 'ai',
        characterId: KNOWN_AI[i].characterId
      });
    }

    // 4 random challengers from the pool
    var challengers = pickRandom(CHALLENGER_POOL, 4);
    for (var c = 0; c < challengers.length; c++) {
      players.push({
        id: challengers[c].id,
        name: challengers[c].name,
        type: 'ai',
        characterId: challengers[c].id,
        style: challengers[c].style,
        description: challengers[c].description,
        quote: challengers[c].quote
      });
    }

    return players;
  };

  /**
   * Build a simple round-robin structure (all players play each other).
   * Returns a bracket-like object with all pairings.
   */
  TournamentManager.prototype._buildRoundRobin = function (players) {
    var matches = {};
    var rounds = [];
    var matchId = 0;

    // Generate all pairings
    var pairings = [];
    for (var i = 0; i < players.length; i++) {
      for (var j = i + 1; j < players.length; j++) {
        var match = new Match(matchId++, 0, pairings.length);
        match.player1 = players[i];
        match.player2 = players[j];
        pairings.push(match);
        matches[match.id] = match;
      }
    }

    // Group into rounds of floor(n/2) matches
    var perRound = Math.floor(players.length / 2);
    for (var r = 0; r < pairings.length; r += perRound) {
      var roundSlice = pairings.slice(r, r + perRound);
      for (var k = 0; k < roundSlice.length; k++) {
        roundSlice[k].round = rounds.length;
      }
      rounds.push(roundSlice);
    }

    // Wins tracker
    var wins = {};
    for (var p = 0; p < players.length; p++) {
      wins[players[p].id] = 0;
    }

    return {
      players: players,
      rounds: rounds,
      matches: matches,
      champion: null,
      eliminated: [],
      wins: wins,

      getCurrentMatch: function () {
        for (var r = 0; r < this.rounds.length; r++) {
          for (var m = 0; m < this.rounds[r].length; m++) {
            if (this.rounds[r][m].isReady()) {
              return this.rounds[r][m];
            }
          }
        }
        return null;
      },

      recordMatchResult: function (matchId, winnerId) {
        var match = this.matches[matchId];
        if (!match || match.played) return false;
        match.winnerId = winnerId;
        match.loserId = (winnerId === match.player1.id) ? match.player2.id : match.player1.id;
        match.played = true;
        this.wins[winnerId] = (this.wins[winnerId] || 0) + 1;

        // Check if all matches are done
        var allDone = true;
        var keys = Object.keys(this.matches);
        for (var i = 0; i < keys.length; i++) {
          if (!this.matches[keys[i]].played) { allDone = false; break; }
        }
        if (allDone) {
          // Find champion by most wins
          var best = null;
          var bestWins = -1;
          var wKeys = Object.keys(this.wins);
          for (var w = 0; w < wKeys.length; w++) {
            if (this.wins[wKeys[w]] > bestWins) {
              bestWins = this.wins[wKeys[w]];
              best = wKeys[w];
            }
          }
          for (var pl = 0; pl < this.players.length; pl++) {
            if (this.players[pl].id === best) {
              this.champion = this.players[pl];
              break;
            }
          }
        }
        return true;
      },

      getRoundName: function (roundIndex) {
        return 'Round ' + (roundIndex + 1);
      },

      getDisplay: function () {
        var display = { rounds: [], champion: this.champion, eliminated: [] };
        for (var r = 0; r < this.rounds.length; r++) {
          var roundData = { name: this.getRoundName(r), matches: [] };
          for (var m = 0; m < this.rounds[r].length; m++) {
            var match = this.rounds[r][m];
            roundData.matches.push({
              id: match.id,
              player1: match.player1 ? { id: match.player1.id, name: match.player1.name } : null,
              player2: match.player2 ? { id: match.player2.id, name: match.player2.name } : null,
              winnerId: match.winnerId,
              played: match.played,
              scores: Object.assign({}, match.scores),
              ready: match.isReady()
            });
          }
          display.rounds.push(roundData);
        }
        return display;
      }
    };
  };

  /**
   * Get the current match to be played.
   */
  TournamentManager.prototype.getCurrentMatch = function () {
    if (!this.bracket) return null;
    return this.bracket.getCurrentMatch();
  };

  /**
   * Record the result of a match and advance the bracket.
   * @param {string} winnerId — the id of the winning player
   */
  TournamentManager.prototype.recordMatchResult = function (winnerId) {
    if (!this.bracket) return false;

    var current = this.bracket.getCurrentMatch();
    if (!current) return false;

    var result;
    if (typeof this.bracket.recordMatchResult === 'function') {
      result = this.bracket.recordMatchResult(current.id, winnerId);
    } else {
      return false;
    }

    // Check for tournament completion
    if (this.bracket.champion) {
      this.tournament.champion = this.bracket.champion;
      this.tournament.finishedAt = Date.now();
      this.tournament.status = 'completed';
      this._recordToHistory();
    }

    return result;
  };

  /**
   * Record finished tournament to persistent history.
   */
  TournamentManager.prototype._recordToHistory = function () {
    var entry = {
      id: this.tournament.id,
      format: this.tournament.format,
      playerCount: this.tournament.players.length,
      champion: this.tournament.champion
        ? { id: this.tournament.champion.id, name: this.tournament.champion.name }
        : null,
      startedAt: this.tournament.startedAt,
      finishedAt: this.tournament.finishedAt,
      humanWon: this.tournament.champion && this.tournament.champion.id === 'human'
    };

    this.history.tournaments.push(entry);
    this.history.totalPlayed++;
    if (entry.humanWon) {
      this.history.totalWins++;
    }
    saveHistory(this.history);
  };

  /**
   * Get the XP bonus for winning (50 XP).
   * Returns 0 if the human did not win.
   */
  TournamentManager.prototype.getWinXP = function () {
    if (this.tournament && this.tournament.champion && this.tournament.champion.id === 'human') {
      return XP_TOURNAMENT_WIN;
    }
    return 0;
  };

  /**
   * Return bracket display data for rendering.
   */
  TournamentManager.prototype.getBracketDisplay = function () {
    if (!this.bracket) return null;
    if (typeof this.bracket.getDisplay === 'function') {
      return this.bracket.getDisplay();
    }
    return null;
  };

  /**
   * Get the opponent info for the current match (for cutscene display).
   */
  TournamentManager.prototype.getOpponentInfo = function () {
    var match = this.getCurrentMatch();
    if (!match) return null;

    // Determine which player is the opponent (not human)
    var opponent = null;
    if (match.player1 && match.player1.type !== 'human') {
      opponent = match.player1;
    }
    if (match.player2 && match.player2.type !== 'human') {
      opponent = match.player2;
    }
    if (!opponent) return null;

    // Look up in challenger pool for extra info
    var poolEntry = null;
    for (var i = 0; i < CHALLENGER_POOL.length; i++) {
      if (CHALLENGER_POOL[i].id === opponent.id || CHALLENGER_POOL[i].id === opponent.characterId) {
        poolEntry = CHALLENGER_POOL[i];
        break;
      }
    }

    return {
      id: opponent.id,
      name: opponent.name,
      type: opponent.type,
      characterId: opponent.characterId || null,
      description: opponent.description || (poolEntry ? poolEntry.description : 'A skilled opponent.'),
      quote: opponent.quote || (poolEntry ? poolEntry.quote : 'Let us play.'),
      style: opponent.style || (poolEntry ? poolEntry.style : null)
    };
  };

  /**
   * Return overall tournament status.
   */
  TournamentManager.prototype.getStatus = function () {
    if (!this.tournament || !this.bracket) {
      return { round: 0, matchesRemaining: 0, eliminated: [], champion: null };
    }

    var currentMatch = this.getCurrentMatch();
    var currentRound = currentMatch ? currentMatch.round : -1;

    // Count remaining unplayed matches
    var remaining = 0;
    var keys = Object.keys(this.bracket.matches);
    for (var i = 0; i < keys.length; i++) {
      if (!this.bracket.matches[keys[i]].played) {
        remaining++;
      }
    }

    return {
      round: currentRound,
      matchesRemaining: remaining,
      eliminated: this.bracket.eliminated ? this.bracket.eliminated.map(function (p) {
        return { id: p.id, name: p.name };
      }) : [],
      champion: this.bracket.champion
        ? { id: this.bracket.champion.id, name: this.bracket.champion.name }
        : null
    };
  };

  /**
   * Get tournament history from localStorage.
   */
  TournamentManager.prototype.getHistory = function () {
    return this.history;
  };

  // ── DOM rendering ────────────────────────────────────────────────

  /**
   * Build full bracket UI into a container element.
   * @param {HTMLElement} container — parent to render into
   * @param {Function}    onPlayMatch — callback when "Play Next Match" is clicked
   */
  TournamentManager.prototype.buildBracketUI = function (container, onPlayMatch) {
    if (!container || !this.bracket) return;

    var display = this.getBracketDisplay();
    if (!display) return;

    // Clear container
    container.innerHTML = '';

    var wrapper = document.createElement('div');
    wrapper.className = 'tournament-bracket';
    wrapper.style.cssText = 'display:flex; gap:32px; align-items:flex-start; padding:24px; overflow-x:auto; font-family:sans-serif;';

    var self = this;

    for (var r = 0; r < display.rounds.length; r++) {
      var roundDiv = document.createElement('div');
      roundDiv.className = 'bracket-round';
      roundDiv.style.cssText = 'display:flex; flex-direction:column; gap:16px; min-width:200px;';

      var roundTitle = document.createElement('div');
      roundTitle.className = 'bracket-round-title';
      roundTitle.style.cssText = 'font-weight:bold; text-align:center; margin-bottom:8px; font-size:14px; text-transform:uppercase; letter-spacing:1px; color:#666;';
      roundTitle.textContent = display.rounds[r].name;
      roundDiv.appendChild(roundTitle);

      // Vertically space matches to align with bracket lines
      var spacer = Math.pow(2, r);

      for (var m = 0; m < display.rounds[r].matches.length; m++) {
        var matchData = display.rounds[r].matches[m];
        var matchDiv = this._buildMatchCard(matchData, display);
        matchDiv.style.marginTop = (m === 0 ? (spacer - 1) * 24 : (spacer * 2 - 1) * 16) + 'px';
        roundDiv.appendChild(matchDiv);
      }

      wrapper.appendChild(roundDiv);

      // Add connector lines between rounds (except after last)
      if (r < display.rounds.length - 1) {
        var connectorDiv = document.createElement('div');
        connectorDiv.className = 'bracket-connectors';
        connectorDiv.style.cssText = 'display:flex; flex-direction:column; justify-content:center; width:24px;';
        for (var c = 0; c < display.rounds[r].matches.length / 2; c++) {
          var line = document.createElement('div');
          line.style.cssText = 'border-right:2px solid #888; border-top:2px solid #888; border-bottom:2px solid #888; height:' + (spacer * 48) + 'px; width:16px; margin:8px 0;';
          connectorDiv.appendChild(line);
        }
        wrapper.appendChild(connectorDiv);
      }
    }

    container.appendChild(wrapper);

    // Champion display
    if (display.champion) {
      var champDiv = document.createElement('div');
      champDiv.className = 'tournament-champion';
      champDiv.style.cssText = 'text-align:center; margin-top:24px; padding:16px; background:#ffd700; border-radius:8px; font-size:18px; font-weight:bold;';
      champDiv.textContent = 'Champion: ' + display.champion.name + '!';
      container.appendChild(champDiv);
    }

    // "Play Next Match" button
    var nextMatch = this.getCurrentMatch();
    if (nextMatch) {
      var btnContainer = document.createElement('div');
      btnContainer.style.cssText = 'text-align:center; margin-top:20px;';

      var btn = document.createElement('button');
      btn.className = 'tournament-play-btn';
      btn.style.cssText = 'padding:12px 32px; font-size:16px; font-weight:bold; background:#e74c3c; color:white; border:none; border-radius:6px; cursor:pointer;';
      btn.textContent = 'Play Next Match';
      btn.addEventListener('click', function () {
        if (typeof onPlayMatch === 'function') {
          onPlayMatch(self.getCurrentMatch());
        }
      });
      btnContainer.appendChild(btn);
      container.appendChild(btnContainer);
    }

    // Cutscene: opponent info
    if (nextMatch) {
      var info = this.getOpponentInfo();
      if (info) {
        var cutscene = document.createElement('div');
        cutscene.className = 'tournament-cutscene';
        cutscene.style.cssText = 'margin-top:24px; padding:20px; background:#1a1a2e; color:#eee; border-radius:10px; max-width:400px; margin-left:auto; margin-right:auto;';

        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:22px; font-weight:bold; margin-bottom:8px; color:#f0c040;';
        nameEl.textContent = 'Next Opponent: ' + info.name;
        cutscene.appendChild(nameEl);

        var descEl = document.createElement('div');
        descEl.style.cssText = 'font-size:14px; margin-bottom:12px; color:#aaa;';
        descEl.textContent = info.description;
        cutscene.appendChild(descEl);

        var quoteEl = document.createElement('div');
        quoteEl.style.cssText = 'font-style:italic; font-size:15px; color:#ccc; border-left:3px solid #f0c040; padding-left:12px;';
        quoteEl.textContent = '"' + info.quote + '"';
        cutscene.appendChild(quoteEl);

        if (info.style) {
          var styleEl = document.createElement('div');
          styleEl.style.cssText = 'margin-top:12px; font-size:12px; color:#888;';
          var traits = [];
          if (info.style.aggression > 0.7) traits.push('Aggressive');
          if (info.style.defense > 0.7) traits.push('Defensive');
          if (info.style.speed > 0.7) traits.push('Fast');
          if (info.style.patience > 0.7) traits.push('Patient');
          if (traits.length === 0) traits.push('Balanced');
          styleEl.textContent = 'Play Style: ' + traits.join(', ');
          cutscene.appendChild(styleEl);
        }

        container.appendChild(cutscene);
      }
    }
  };

  /**
   * Build a single match card for the bracket UI.
   */
  TournamentManager.prototype._buildMatchCard = function (matchData, display) {
    var card = document.createElement('div');
    card.className = 'bracket-match';
    card.style.cssText = 'border:1px solid #ccc; border-radius:6px; overflow:hidden; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.1);';

    var p1 = this._buildPlayerSlot(matchData.player1, matchData.winnerId, matchData.played);
    var divider = document.createElement('div');
    divider.style.cssText = 'height:1px; background:#ddd;';
    var p2 = this._buildPlayerSlot(matchData.player2, matchData.winnerId, matchData.played);

    card.appendChild(p1);
    card.appendChild(divider);
    card.appendChild(p2);

    if (matchData.ready) {
      card.style.borderColor = '#e74c3c';
      card.style.boxShadow = '0 0 6px rgba(231,76,60,0.3)';
    }

    return card;
  };

  /**
   * Build a single player slot within a match card.
   */
  TournamentManager.prototype._buildPlayerSlot = function (player, winnerId, played) {
    var slot = document.createElement('div');
    slot.style.cssText = 'padding:8px 12px; font-size:13px; display:flex; justify-content:space-between; align-items:center; min-width:160px;';

    var nameSpan = document.createElement('span');
    if (player) {
      nameSpan.textContent = player.name;
      if (played && player.id === winnerId) {
        slot.style.background = '#d4edda';
        nameSpan.style.fontWeight = 'bold';
      } else if (played) {
        slot.style.background = '#f8f8f8';
        nameSpan.style.color = '#999';
      }
    } else {
      nameSpan.textContent = 'TBD';
      nameSpan.style.color = '#bbb';
      nameSpan.style.fontStyle = 'italic';
    }

    slot.appendChild(nameSpan);
    return slot;
  };

  // ── Export ────────────────────────────────────────────────────────

  root.MJ.Tournament = {
    TournamentManager: TournamentManager,
    Bracket: Bracket,
    Match: Match,
    CHALLENGER_POOL: CHALLENGER_POOL,
    XP_TOURNAMENT_WIN: XP_TOURNAMENT_WIN
  };

})(typeof window !== 'undefined' ? window : global);
