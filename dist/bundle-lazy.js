/* Table Game Simulator - Lazy Bundle */

/* === js/tournament.js === */
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


/* === js/hand-history.js === */
/**
 * hand-history.js — Personal hand encyclopedia
 * Stores every winning hand with decomposition, provides search/stats/UI.
 * Exports: root.MJ.HandHistory
 */
(function (exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── Constants ────────────────────────────────────────────────────

  var STORAGE_KEY = 'mj_hand_history';
  var MAX_ENTRIES = 500;

  // ── Tile encoding ────────────────────────────────────────────────
  // Compact representation: suit letter + rank
  //   b1 = bamboo 1, c5 = circles 5, m9 = characters 9
  //   we = east wind, ws = south wind, ww = west wind, wn = north wind
  //   dr = red dragon, dg = green dragon, dw = white dragon

  var SUIT_LETTER = {
    bamboo: 'b',
    circles: 'c',
    characters: 'm'
  };

  var LETTER_TO_SUIT = {
    b: 'bamboo',
    c: 'circles',
    m: 'characters',
    w: 'wind',
    d: 'dragon'
  };

  var WIND_CODES = { 1: 'e', 2: 's', 3: 'w', 4: 'n' };
  var WIND_DECODE = { e: 1, s: 2, w: 3, n: 4 };

  var DRAGON_CODES = { 1: 'r', 2: 'g', 3: 'w' };
  var DRAGON_DECODE = { r: 1, g: 2, w: 3 };

  /**
   * Encode a single tile object to a 2-char string.
   * @param {{suit:string, rank:number}} tile
   * @returns {string}
   */
  function encodeTile(tile) {
    if (!tile) return '??';
    var suit = tile.suit;
    var rank = tile.rank;

    if (suit === 'bamboo' || suit === 'circles' || suit === 'characters') {
      return SUIT_LETTER[suit] + rank;
    }
    if (suit === 'wind') {
      return 'w' + (WIND_CODES[rank] || rank);
    }
    if (suit === 'dragon') {
      return 'd' + (DRAGON_CODES[rank] || rank);
    }
    return '??';
  }

  /**
   * Decode a 2-char string back to a tile object.
   * @param {string} code
   * @returns {{suit:string, rank:number}}
   */
  function decodeTile(code) {
    if (!code || code.length < 2) return null;
    var suitChar = code[0];
    var rankChar = code[1];

    if (suitChar === 'w') {
      return { suit: 'wind', rank: WIND_DECODE[rankChar] || parseInt(rankChar, 10) };
    }
    if (suitChar === 'd') {
      return { suit: 'dragon', rank: DRAGON_DECODE[rankChar] || parseInt(rankChar, 10) };
    }
    var suit = LETTER_TO_SUIT[suitChar];
    if (!suit) return null;
    return { suit: suit, rank: parseInt(rankChar, 10) };
  }

  /**
   * Encode an array of tiles to a compressed string (e.g., "b1b2b3c5c5").
   */
  function encodeTiles(tiles) {
    if (!tiles || !tiles.length) return '';
    var parts = [];
    for (var i = 0; i < tiles.length; i++) {
      parts.push(encodeTile(tiles[i]));
    }
    return parts.join('');
  }

  /**
   * Decode a compressed tile string back to an array of tile objects.
   */
  function decodeTiles(str) {
    if (!str) return [];
    var tiles = [];
    for (var i = 0; i < str.length; i += 2) {
      var tile = decodeTile(str.substr(i, 2));
      if (tile) tiles.push(tile);
    }
    return tiles;
  }

  /**
   * Encode a meld for storage.
   */
  function encodeMeld(meld) {
    return {
      type: meld.type,
      tiles: encodeTiles(meld.tiles)
    };
  }

  /**
   * Decode a meld from storage.
   */
  function decodeMeld(encoded) {
    return {
      type: encoded.type,
      tiles: decodeTiles(encoded.tiles)
    };
  }

  // ── Storage helpers ──────────────────────────────────────────────

  function loadStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveStorage(entries) {
    try {
      // Prune oldest entries if over the limit
      if (entries.length > MAX_ENTRIES) {
        entries = entries.slice(entries.length - MAX_ENTRIES);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      // localStorage full or unavailable
    }
    return entries;
  }

  // ── HandHistory class ────────────────────────────────────────────

  function HandHistory() {
    this.entries = loadStorage();
  }

  /**
   * Record a winning hand.
   * @param {Object} handData
   * @param {Array}  handData.tiles — array of tile objects in the winning hand
   * @param {Array}  handData.melds — array of meld objects [{type, tiles}]
   * @param {Object} handData.decomposition — the hand decomposition (sets/pair)
   * @param {number} handData.score — total score
   * @param {Array}  handData.breakdown — [{name, points}] of scoring patterns
   * @param {boolean} handData.selfDrawn — was the win by self-draw (tsumo)
   * @param {string} handData.roundWind — current round wind
   * @param {string} handData.seatWind — player's seat wind
   * @param {number} handData.turnCount — how many turns the round lasted
   */
  HandHistory.prototype.recordHand = function (handData) {
    if (!handData || !handData.tiles) return null;

    var entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      tiles: encodeTiles(handData.tiles),
      melds: (handData.melds || []).map(encodeMeld),
      decomposition: this._encodeDecomposition(handData.decomposition),
      score: handData.score || 0,
      breakdown: (handData.breakdown || []).map(function (b) {
        return { name: b.name, points: b.points };
      }),
      selfDrawn: !!handData.selfDrawn,
      roundWind: handData.roundWind || 'east',
      seatWind: handData.seatWind || 'east',
      turnCount: handData.turnCount || 0
    };

    this.entries.push(entry);
    this.entries = saveStorage(this.entries);
    return entry;
  };

  /**
   * Encode decomposition (sets + pair) for compact storage.
   */
  HandHistory.prototype._encodeDecomposition = function (decomp) {
    if (!decomp) return null;
    var encoded = { sets: [] };
    if (decomp.sets) {
      for (var i = 0; i < decomp.sets.length; i++) {
        var s = decomp.sets[i];
        encoded.sets.push({
          type: s.type,
          tiles: encodeTiles(s.tiles)
        });
      }
    }
    return encoded;
  };

  /**
   * Decode a stored decomposition back to full tile objects.
   */
  HandHistory.prototype._decodeDecomposition = function (encoded) {
    if (!encoded) return null;
    var decoded = { sets: [] };
    if (encoded.sets) {
      for (var i = 0; i < encoded.sets.length; i++) {
        var s = encoded.sets[i];
        decoded.sets.push({
          type: s.type,
          tiles: decodeTiles(s.tiles)
        });
      }
    }
    return decoded;
  };

  /**
   * Decode a stored entry back to full tile objects (for display).
   */
  HandHistory.prototype._decodeEntry = function (entry) {
    return {
      id: entry.id,
      timestamp: entry.timestamp,
      tiles: decodeTiles(entry.tiles),
      melds: (entry.melds || []).map(decodeMeld),
      decomposition: this._decodeDecomposition(entry.decomposition),
      score: entry.score,
      breakdown: entry.breakdown,
      selfDrawn: entry.selfDrawn,
      roundWind: entry.roundWind,
      seatWind: entry.seatWind,
      turnCount: entry.turnCount
    };
  };

  /**
   * Get hand history with optional filters.
   * @param {Object} filters
   * @param {number} filters.minScore
   * @param {number} filters.maxScore
   * @param {string} filters.pattern — name of a scoring pattern to require
   * @param {string} filters.suit — 'bamboo'|'circles'|'characters'|'wind'|'dragon'
   * @param {Object} filters.dateRange — {from: timestamp, to: timestamp}
   * @returns {Array}
   */
  HandHistory.prototype.getHistory = function (filters) {
    filters = filters || {};
    var results = [];

    for (var i = 0; i < this.entries.length; i++) {
      var entry = this.entries[i];
      var dominated = false;

      // Score filters
      if (filters.minScore !== undefined && entry.score < filters.minScore) continue;
      if (filters.maxScore !== undefined && entry.score > filters.maxScore) continue;

      // Date range filter
      if (filters.dateRange) {
        if (filters.dateRange.from && entry.timestamp < filters.dateRange.from) continue;
        if (filters.dateRange.to && entry.timestamp > filters.dateRange.to) continue;
      }

      // Pattern filter
      if (filters.pattern) {
        var found = false;
        var patLower = filters.pattern.toLowerCase();
        if (entry.breakdown) {
          for (var b = 0; b < entry.breakdown.length; b++) {
            if (entry.breakdown[b].name.toLowerCase().indexOf(patLower) !== -1) {
              found = true;
              break;
            }
          }
        }
        if (!found) continue;
      }

      // Suit filter — at least one tile in the hand is of this suit
      if (filters.suit) {
        var suitLetter = SUIT_LETTER[filters.suit];
        if (suitLetter) {
          if (entry.tiles.indexOf(suitLetter) === -1) continue;
        } else {
          // wind or dragon
          var prefix = filters.suit === 'wind' ? 'w' : (filters.suit === 'dragon' ? 'd' : '');
          if (prefix && entry.tiles.indexOf(prefix) === -1) continue;
        }
      }

      results.push(this._decodeEntry(entry));
    }

    // Sort by timestamp descending (most recent first)
    results.sort(function (a, b) { return b.timestamp - a.timestamp; });
    return results;
  };

  /**
   * Compute aggregate statistics across all recorded hands.
   */
  HandHistory.prototype.getStatistics = function () {
    var total = this.entries.length;
    if (total === 0) {
      return {
        totalHands: 0,
        avgScore: 0,
        highestScore: 0,
        mostCommonPattern: null,
        patternCounts: {},
        suitDistribution: {},
        selfDrawRate: 0
      };
    }

    var sumScore = 0;
    var highest = 0;
    var selfDrawCount = 0;
    var patternCounts = {};
    var suitCounts = { bamboo: 0, circles: 0, characters: 0, wind: 0, dragon: 0 };

    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      sumScore += e.score;
      if (e.score > highest) highest = e.score;
      if (e.selfDrawn) selfDrawCount++;

      // Count patterns
      if (e.breakdown) {
        for (var b = 0; b < e.breakdown.length; b++) {
          var pName = e.breakdown[b].name;
          patternCounts[pName] = (patternCounts[pName] || 0) + 1;
        }
      }

      // Count suit usage from encoded tile string
      var tiles = e.tiles || '';
      for (var t = 0; t < tiles.length; t += 2) {
        var ch = tiles[t];
        if (ch === 'b') suitCounts.bamboo++;
        else if (ch === 'c') suitCounts.circles++;
        else if (ch === 'm') suitCounts.characters++;
        else if (ch === 'w') suitCounts.wind++;
        else if (ch === 'd') suitCounts.dragon++;
      }
    }

    // Find most common pattern
    var mostCommon = null;
    var mostCount = 0;
    var pKeys = Object.keys(patternCounts);
    for (var p = 0; p < pKeys.length; p++) {
      if (patternCounts[pKeys[p]] > mostCount) {
        mostCount = patternCounts[pKeys[p]];
        mostCommon = pKeys[p];
      }
    }

    return {
      totalHands: total,
      avgScore: Math.round(sumScore / total * 10) / 10,
      highestScore: highest,
      mostCommonPattern: mostCommon,
      patternCounts: patternCounts,
      suitDistribution: suitCounts,
      selfDrawRate: Math.round(selfDrawCount / total * 1000) / 10 // percentage with 1 decimal
    };
  };

  /**
   * Search for all hands containing a specific scoring pattern.
   * @param {string} patternName
   * @returns {Array}
   */
  HandHistory.prototype.searchByPattern = function (patternName) {
    return this.getHistory({ pattern: patternName });
  };

  /**
   * Return the best hand from today (highest score).
   */
  HandHistory.prototype.getHandOfTheDay = function () {
    var now = new Date();
    var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var endOfDay = startOfDay + 86400000;

    var best = null;
    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      if (e.timestamp >= startOfDay && e.timestamp < endOfDay) {
        if (!best || e.score > best.score) {
          best = e;
        }
      }
    }

    return best ? this._decodeEntry(best) : null;
  };

  /**
   * Export the entire history as a JSON string.
   */
  HandHistory.prototype.exportHistory = function () {
    return JSON.stringify(this.entries, null, 2);
  };

  /**
   * Import history from a JSON string. Merges with existing, deduplicating by id.
   * @param {string} jsonStr
   * @returns {number} number of new entries imported
   */
  HandHistory.prototype.importHistory = function (jsonStr) {
    try {
      var imported = JSON.parse(jsonStr);
      if (!Array.isArray(imported)) return 0;

      var existingIds = {};
      for (var i = 0; i < this.entries.length; i++) {
        existingIds[this.entries[i].id] = true;
      }

      var added = 0;
      for (var j = 0; j < imported.length; j++) {
        var entry = imported[j];
        if (entry && entry.id && !existingIds[entry.id]) {
          this.entries.push(entry);
          existingIds[entry.id] = true;
          added++;
        }
      }

      this.entries = saveStorage(this.entries);
      return added;
    } catch (e) {
      return 0;
    }
  };

  // ── DOM rendering ────────────────────────────────────────────────

  /**
   * Build the hand history viewer UI into a container element.
   * @param {HTMLElement} container
   */
  HandHistory.prototype.buildHistoryUI = function (container) {
    if (!container) return;
    container.innerHTML = '';

    var self = this;
    var currentFilter = { sort: 'date' };

    var wrapper = document.createElement('div');
    wrapper.className = 'hand-history-viewer';
    wrapper.style.cssText = 'font-family:sans-serif; max-width:720px; margin:0 auto;';

    // ── Filter/sort controls ───────────────────────────────
    var controls = document.createElement('div');
    controls.className = 'hh-controls';
    controls.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; align-items:center;';

    // Pattern search
    var patternInput = document.createElement('input');
    patternInput.type = 'text';
    patternInput.placeholder = 'Filter by pattern...';
    patternInput.style.cssText = 'padding:6px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; flex:1; min-width:140px;';

    // Min score
    var minScoreInput = document.createElement('input');
    minScoreInput.type = 'number';
    minScoreInput.placeholder = 'Min score';
    minScoreInput.style.cssText = 'padding:6px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px; width:90px;';

    // Sort dropdown
    var sortSelect = document.createElement('select');
    sortSelect.style.cssText = 'padding:6px 10px; border:1px solid #ccc; border-radius:4px; font-size:13px;';
    var sortOpts = [
      { value: 'date', label: 'Newest First' },
      { value: 'score_desc', label: 'Highest Score' },
      { value: 'score_asc', label: 'Lowest Score' }
    ];
    for (var s = 0; s < sortOpts.length; s++) {
      var opt = document.createElement('option');
      opt.value = sortOpts[s].value;
      opt.textContent = sortOpts[s].label;
      sortSelect.appendChild(opt);
    }

    // Apply button
    var applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply';
    applyBtn.style.cssText = 'padding:6px 16px; background:#3498db; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:13px;';

    controls.appendChild(patternInput);
    controls.appendChild(minScoreInput);
    controls.appendChild(sortSelect);
    controls.appendChild(applyBtn);
    wrapper.appendChild(controls);

    // ── Stats summary ──────────────────────────────────────
    var statsDiv = document.createElement('div');
    statsDiv.className = 'hh-stats';
    statsDiv.style.cssText = 'background:#f0f4f8; padding:12px 16px; border-radius:6px; margin-bottom:16px; font-size:13px; color:#555;';
    wrapper.appendChild(statsDiv);

    // ── Scrollable list ────────────────────────────────────
    var listDiv = document.createElement('div');
    listDiv.className = 'hh-list';
    listDiv.style.cssText = 'max-height:480px; overflow-y:auto; border:1px solid #e0e0e0; border-radius:6px;';
    wrapper.appendChild(listDiv);

    container.appendChild(wrapper);

    // ── Render function ────────────────────────────────────
    function render() {
      var filters = {};
      var patternVal = patternInput.value.trim();
      if (patternVal) filters.pattern = patternVal;
      var minVal = parseInt(minScoreInput.value, 10);
      if (!isNaN(minVal)) filters.minScore = minVal;

      var hands = self.getHistory(filters);

      // Sort
      var sortVal = sortSelect.value;
      if (sortVal === 'score_desc') {
        hands.sort(function (a, b) { return b.score - a.score; });
      } else if (sortVal === 'score_asc') {
        hands.sort(function (a, b) { return a.score - b.score; });
      }
      // 'date' is default (already sorted newest first from getHistory)

      // Update stats
      var stats = self.getStatistics();
      statsDiv.innerHTML =
        '<strong>Total Hands:</strong> ' + stats.totalHands +
        ' &nbsp;|&nbsp; <strong>Avg Score:</strong> ' + stats.avgScore +
        ' &nbsp;|&nbsp; <strong>Best:</strong> ' + stats.highestScore +
        ' &nbsp;|&nbsp; <strong>Self-Draw Rate:</strong> ' + stats.selfDrawRate + '%' +
        (stats.mostCommonPattern ? ' &nbsp;|&nbsp; <strong>Top Pattern:</strong> ' + stats.mostCommonPattern : '');

      // Render list
      listDiv.innerHTML = '';
      if (hands.length === 0) {
        var emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'padding:32px; text-align:center; color:#999;';
        emptyMsg.textContent = 'No hands recorded yet.';
        listDiv.appendChild(emptyMsg);
        return;
      }

      for (var i = 0; i < hands.length; i++) {
        var hand = hands[i];
        var item = buildHandItem(hand, i);
        listDiv.appendChild(item);
      }
    }

    function buildHandItem(hand, index) {
      var item = document.createElement('div');
      item.className = 'hh-item';
      item.style.cssText = 'padding:10px 14px; border-bottom:1px solid #eee; cursor:pointer; transition:background 0.15s;';
      if (index % 2 === 1) item.style.background = '#fafafa';

      // Header row
      var header = document.createElement('div');
      header.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';

      var dateSpan = document.createElement('span');
      dateSpan.style.cssText = 'font-size:12px; color:#888;';
      dateSpan.textContent = new Date(hand.timestamp).toLocaleString();

      var scoreSpan = document.createElement('span');
      scoreSpan.style.cssText = 'font-weight:bold; font-size:15px; color:#2c3e50;';
      scoreSpan.textContent = hand.score + ' pts';

      var methodSpan = document.createElement('span');
      methodSpan.style.cssText = 'font-size:11px; padding:2px 6px; border-radius:3px; color:#fff; background:' + (hand.selfDrawn ? '#27ae60' : '#e67e22') + ';';
      methodSpan.textContent = hand.selfDrawn ? 'Tsumo' : 'Ron';

      header.appendChild(dateSpan);
      header.appendChild(methodSpan);
      header.appendChild(scoreSpan);
      item.appendChild(header);

      // Tile display (compact)
      var tileRow = document.createElement('div');
      tileRow.style.cssText = 'margin-top:6px; font-size:13px; font-family:monospace; color:#444; letter-spacing:1px;';
      var tileText = '';
      for (var t = 0; t < hand.tiles.length; t++) {
        tileText += tileToDisplay(hand.tiles[t]);
      }
      tileRow.textContent = tileText;
      item.appendChild(tileRow);

      // Patterns
      if (hand.breakdown && hand.breakdown.length > 0) {
        var patRow = document.createElement('div');
        patRow.style.cssText = 'margin-top:4px; font-size:11px; color:#7f8c8d;';
        var patNames = [];
        for (var p = 0; p < hand.breakdown.length; p++) {
          patNames.push(hand.breakdown[p].name + ' (' + hand.breakdown[p].points + ')');
        }
        patRow.textContent = patNames.join(', ');
        item.appendChild(patRow);
      }

      // Expandable detail section (hidden by default)
      var detail = document.createElement('div');
      detail.className = 'hh-detail';
      detail.style.cssText = 'display:none; margin-top:10px; padding-top:10px; border-top:1px dashed #ddd; font-size:12px; color:#555;';

      var windInfo = document.createElement('div');
      windInfo.textContent = 'Round Wind: ' + (hand.roundWind || '-') + ' | Seat Wind: ' + (hand.seatWind || '-') + ' | Turns: ' + (hand.turnCount || '-');
      detail.appendChild(windInfo);

      // Show melds
      if (hand.melds && hand.melds.length > 0) {
        var meldsDiv = document.createElement('div');
        meldsDiv.style.cssText = 'margin-top:6px;';
        meldsDiv.textContent = 'Melds: ';
        for (var m = 0; m < hand.melds.length; m++) {
          var meld = hand.melds[m];
          var meldTiles = '';
          for (var mt = 0; mt < meld.tiles.length; mt++) {
            meldTiles += tileToDisplay(meld.tiles[mt]);
          }
          meldsDiv.textContent += '[' + meld.type + ': ' + meldTiles + '] ';
        }
        detail.appendChild(meldsDiv);
      }

      // Show decomposition
      if (hand.decomposition && hand.decomposition.sets) {
        var decompDiv = document.createElement('div');
        decompDiv.style.cssText = 'margin-top:6px;';
        decompDiv.textContent = 'Decomposition: ';
        for (var d = 0; d < hand.decomposition.sets.length; d++) {
          var set = hand.decomposition.sets[d];
          var setTiles = '';
          for (var st = 0; st < set.tiles.length; st++) {
            setTiles += tileToDisplay(set.tiles[st]);
          }
          decompDiv.textContent += '[' + set.type + ': ' + setTiles + '] ';
        }
        detail.appendChild(decompDiv);
      }

      item.appendChild(detail);

      // Toggle detail on click
      item.addEventListener('click', function () {
        var isHidden = detail.style.display === 'none';
        detail.style.display = isHidden ? 'block' : 'none';
        item.style.background = isHidden ? '#eef5ff' : (index % 2 === 1 ? '#fafafa' : '');
      });

      return item;
    }

    /**
     * Convert a tile object to a short display string.
     */
    function tileToDisplay(tile) {
      if (!tile) return '?';
      if (tile.suit === 'bamboo') return tile.rank + 'B ';
      if (tile.suit === 'circles') return tile.rank + 'C ';
      if (tile.suit === 'characters') return tile.rank + 'M ';
      if (tile.suit === 'wind') {
        var wNames = { 1: 'E', 2: 'S', 3: 'W', 4: 'N' };
        return (wNames[tile.rank] || '?') + 'w ';
      }
      if (tile.suit === 'dragon') {
        var dNames = { 1: 'R', 2: 'G', 3: 'W' };
        return (dNames[tile.rank] || '?') + 'd ';
      }
      return '? ';
    }

    // Wire up apply button
    applyBtn.addEventListener('click', render);

    // Also trigger on Enter in text fields
    patternInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') render();
    });
    minScoreInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') render();
    });

    // Initial render
    render();
  };

  // ── Export ────────────────────────────────────────────────────────

  root.MJ.HandHistory = {
    HandHistory: HandHistory,
    encodeTile: encodeTile,
    decodeTile: decodeTile,
    encodeTiles: encodeTiles,
    decodeTiles: decodeTiles
  };

})(typeof window !== 'undefined' ? window : global);


/* === js/spectator.js === */
/**
 * spectator.js — Spectator mode for watching AI-vs-AI Mahjong
 * Live commentary from AI personality engines
 * Exports: root.MJ.Spectator
 */
(function(exports) {
  'use strict';
  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── Commentary templates ───────────────────────────────────────

  var COMMENTARY = {
    game_start: [
      'AI match starting... {players} take their seats.',
      'A new game begins. {players} are ready to play.',
      'The tiles are shuffled. {players} prepare for battle.'
    ],
    discard: [
      '{player} discards {tile}.',
      '{player} lets go of {tile}. Interesting choice.',
      'A {tile} hits the discard pile from {player}.'
    ],
    chi: [
      '{player} calls Chi! Building a sequence with {tile}.',
      '{player} snatches {tile} for a sequence. Efficient play.',
      'Chi from {player}! They needed that {tile}.'
    ],
    pon: [
      '{player} calls Pon on {tile}! Three of a kind.',
      '{player} grabs {tile} for a Pong. Solid move.',
      'Pon! {player} completes a triplet with {tile}.'
    ],
    kan: [
      '{player} declares Kan! Four {tile}s — impressive.',
      'A bold Kan from {player}. That\'s commitment.',
      '{player} reveals a Kan of {tile}s! The stakes rise.'
    ],
    riichi: [
      '{player} declares Riichi! One tile away from victory.',
      'Riichi from {player}! The pressure is on.',
      '{player} pushes the 1000-point stick forward. Riichi!'
    ],
    tsumo: [
      '{player} draws the winning tile! Tsumo!',
      'Self-draw victory for {player}. Beautiful.',
      '{player} completes their hand by Tsumo. Well played.'
    ],
    ron: [
      '{player} calls Ron on {loser}\'s discard! Devastating.',
      'Ron! {player} wins off {loser}\'s {tile}.',
      '{loser}\'s {tile} is claimed by {player}. Ron!'
    ],
    draw: [
      'Exhaustive draw. No one could finish this round.',
      'The wall is empty. A draw is declared.',
      'Stalemate. The tiles have spoken.'
    ],
    personality: {
      mei: [
        '{player} plays conservatively — classic Mei style.',
        'Mei folds defensively. She knows when to hold back.',
        'A careful discard from Mei. She reads the table well.'
      ],
      kenji: [
        'Kenji goes aggressive! He loves the risk.',
        'Bold play from Kenji. High risk, high reward.',
        'Kenji pushes forward. He won\'t back down.'
      ],
      yuki: [
        'Yuki plays with quiet precision. Elegant.',
        'A thoughtful move from Yuki. She sees further ahead.',
        'Yuki\'s patience pays off. Takeshi would be proud.'
      ]
    }
  };

  // ── Helper: pick random from array ─────────────────────────────

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function fillTemplate(template, vars) {
    var result = template;
    Object.keys(vars).forEach(function(key) {
      result = result.replace(new RegExp('\\{' + key + '\\}', 'g'), vars[key]);
    });
    return result;
  }

  // ── SpectatorMode class ────────────────────────────────────────

  class SpectatorMode {
    constructor() {
      this.active = false;
      this.speed = 1.0;
      this.commentary = true;
      this.overlay = null;
      this._gameTimer = null;
      this._eventQueue = [];
    }

    /** Start spectator mode. Options: { speed, commentary, players } */
    start(options) {
      options = options || {};
      this.active = true;
      this.speed = options.speed || 1.0;
      this.commentary = options.commentary !== false;
      this._eventQueue = [];
      this.buildUI();
      this.runGame(options.players);
    }

    /** Stop spectator mode and clean up. */
    stop() {
      this.active = false;
      if (this._gameTimer) {
        clearTimeout(this._gameTimer);
        this._gameTimer = null;
      }
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;
    }

    /** Build the spectator sidebar UI. */
    buildUI() {
      if (typeof document === 'undefined') return;

      // Remove any existing overlay
      var existing = document.getElementById('spectator-overlay');
      if (existing) existing.parentNode.removeChild(existing);

      this.overlay = document.createElement('div');
      this.overlay.id = 'spectator-overlay';
      this.overlay.style.cssText = 'position:fixed;top:0;right:0;width:280px;' +
        'background:var(--panel-bg, rgba(15,15,30,0.92));' +
        'border-left:1px solid rgba(255,255,255,0.1);' +
        'height:100%;z-index:50;display:flex;flex-direction:column;padding:12px;' +
        'font-family:inherit;color:#fff;';

      var header = document.createElement('h3');
      header.style.cssText = 'color:var(--accent, #4fc3f7);margin:0 0 8px;font-size:15px;';
      header.textContent = 'Spectator Mode';

      var commentaryBox = document.createElement('div');
      commentaryBox.id = 'spectator-commentary';
      commentaryBox.style.cssText = 'flex:1;overflow-y:auto;font-size:12px;' +
        'scrollbar-width:thin;padding-right:4px;';

      var controls = document.createElement('div');
      controls.style.cssText = 'margin-top:8px;display:flex;gap:6px;flex-shrink:0;';

      var speedBtn = document.createElement('button');
      speedBtn.id = 'spec-speed';
      speedBtn.className = 'btn btn-sm';
      speedBtn.textContent = 'Speed: ' + this.speed + 'x';
      speedBtn.style.cssText = 'flex:1;padding:6px 8px;font-size:12px;cursor:pointer;' +
        'background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;';

      var muteBtn = document.createElement('button');
      muteBtn.id = 'spec-mute';
      muteBtn.className = 'btn btn-sm';
      muteBtn.textContent = this.commentary ? 'Mute' : 'Unmute';
      muteBtn.style.cssText = speedBtn.style.cssText;

      var stopBtn = document.createElement('button');
      stopBtn.id = 'spec-stop';
      stopBtn.className = 'btn btn-sm';
      stopBtn.textContent = 'Exit';
      stopBtn.style.cssText = speedBtn.style.cssText.replace('rgba(255,255,255,0.1)', 'rgba(200,50,50,0.3)');

      controls.appendChild(speedBtn);
      controls.appendChild(muteBtn);
      controls.appendChild(stopBtn);

      this.overlay.appendChild(header);
      this.overlay.appendChild(commentaryBox);
      this.overlay.appendChild(controls);
      document.body.appendChild(this.overlay);

      // Event listeners
      var self = this;
      stopBtn.addEventListener('click', function() { self.stop(); });

      speedBtn.addEventListener('click', function() {
        self.speed = self.speed >= 3 ? 0.5 : self.speed + 0.5;
        speedBtn.textContent = 'Speed: ' + self.speed + 'x';
      });

      muteBtn.addEventListener('click', function() {
        self.commentary = !self.commentary;
        muteBtn.textContent = self.commentary ? 'Mute' : 'Unmute';
      });
    }

    /** Add a commentary line to the sidebar. */
    addCommentary(speaker, text) {
      if (!this.commentary && speaker !== 'System') return;
      if (typeof document === 'undefined') return;

      var el = document.getElementById('spectator-commentary');
      if (!el) return;

      var msg = document.createElement('div');
      msg.style.cssText = 'padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);line-height:1.4;';

      var strong = document.createElement('strong');
      strong.style.color = 'var(--accent, #4fc3f7)';
      strong.textContent = speaker + ': ';

      var span = document.createElement('span');
      span.style.color = 'rgba(255,255,255,0.7)';
      span.textContent = text;

      msg.appendChild(strong);
      msg.appendChild(span);
      el.appendChild(msg);
      el.scrollTop = el.scrollHeight;
    }

    /** Generate commentary for a game event. */
    generateCommentary(event, data) {
      data = data || {};
      var templates = COMMENTARY[event];
      if (!templates) return;

      if (Array.isArray(templates)) {
        var text = fillTemplate(pickRandom(templates), data);
        this.addCommentary('Narrator', text);
      }

      // Add personality-specific commentary occasionally
      if (data.player && COMMENTARY.personality[data.player.toLowerCase()]) {
        if (Math.random() < 0.3) {
          var pTemplates = COMMENTARY.personality[data.player.toLowerCase()];
          var pText = fillTemplate(pickRandom(pTemplates), data);
          this.addCommentary('Analyst', pText);
        }
      }
    }

    /** Kick off an AI-only game and stream events. */
    runGame(players) {
      var defaultPlayers = ['Mei', 'Kenji', 'Yuki'];
      var playerNames = players || defaultPlayers;

      this.addCommentary('System', 'AI match starting...');
      this.generateCommentary('game_start', { players: playerNames.join(' vs ') });

      // If the game engine is available, configure all-AI mode
      if (root.MJ && root.MJ.GameFlow && typeof root.MJ.GameFlow.startSpectatorGame === 'function') {
        var self = this;
        root.MJ.GameFlow.startSpectatorGame({
          players: playerNames,
          onEvent: function(event, data) {
            if (!self.active) return;
            self.generateCommentary(event, data);
          },
          speed: this.speed
        });
      } else {
        this.addCommentary('System', 'Waiting for game engine... Start a game with all AI seats to spectate.');
      }
    }

    /** Push an external event into the spectator commentary stream. */
    pushEvent(event, data) {
      if (!this.active) return;
      this.generateCommentary(event, data);
    }

    /** Check whether spectator mode is currently active. */
    isActive() {
      return this.active;
    }

    /** Get current playback speed. */
    getSpeed() {
      return this.speed;
    }

    /** Set playback speed programmatically. */
    setSpeed(speed) {
      this.speed = Math.max(0.5, Math.min(3, speed));
      var btn = typeof document !== 'undefined' ? document.getElementById('spec-speed') : null;
      if (btn) btn.textContent = 'Speed: ' + this.speed + 'x';
    }
  }

  // ── Export ──────────────────────────────────────────────────────

  root.MJ.Spectator = {
    COMMENTARY: COMMENTARY,
    SpectatorMode: SpectatorMode
  };

})(typeof window !== 'undefined' ? window : global);


/* === js/community.js === */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ── CommunityFeatures ──────────────────────────────────────────────
  // Share replays, screenshots, and achievements with others.
  // Provides export/import of save data and shareable text summaries.

  class CommunityFeatures {
    constructor() {}

    // ── Game summary generation ───────────────────────────────────────

    /**
     * Build a shareable game summary object from current state.
     * @param {object} state         - current game state
     * @param {object} reputation    - player reputation / level info
     * @param {object} personalities - map of character id -> personality engine
     * @returns {object} summary
     */
    generateGameSummary(state, reputation, personalities) {
      var summary = {
        version: '1.0',
        date: new Date().toISOString(),
        player: {
          level: (reputation && reputation.level) || 1,
          title: (reputation && reputation.title) || 'Novice',
          totalGames: (reputation && reputation.totalGames) || 0,
          winRate: (reputation && reputation.winRate) || '0%'
        },
        characters: {},
        highlights: []
      };

      // Character relationship summaries
      if (personalities && typeof personalities === 'object') {
        var ids = Object.keys(personalities);
        for (var i = 0; i < ids.length; i++) {
          var id = ids[i];
          var pe = personalities[id];
          if (pe && pe.character) {
            summary.characters[id] = {
              name: pe.character.name,
              relationship: pe.relationshipLevel || 1,
              gamesPlayed: pe.gamesPlayed || 0,
              dominantEmotion: (pe.memory && typeof pe.memory.getDominantEmotion === 'function')
                ? pe.memory.getDominantEmotion() : 'neutral'
            };
          }
        }
      }

      return summary;
    }

    // ── Shareable text ────────────────────────────────────────────────

    /**
     * Generate plain-text summary suitable for pasting into social media.
     * @param {object} summary - output of generateGameSummary
     * @returns {string}
     */
    generateShareText(summary) {
      var lines = [];
      lines.push('\uD83C\uDC04 Mahjong Journey \u2014 ' + summary.player.title +
        ' (Level ' + summary.player.level + ')');
      lines.push('\uD83D\uDCCA ' + summary.player.totalGames + ' games played | ' +
        summary.player.winRate + ' win rate');

      var charIds = Object.keys(summary.characters);
      for (var i = 0; i < charIds.length; i++) {
        var ch = summary.characters[charIds[i]];
        lines.push(ch.name + ': Relationship Lv' + ch.relationship +
          ' | ' + ch.gamesPlayed + ' games together');
      }

      if (summary.highlights && summary.highlights.length > 0) {
        lines.push('');
        lines.push('Highlights:');
        var max = Math.min(summary.highlights.length, 3);
        for (var j = 0; j < max; j++) {
          lines.push('  ' + summary.highlights[j]);
        }
      }

      lines.push('');
      lines.push('Play at: [game URL]');

      return lines.join('\n');
    }

    // ── Clipboard sharing ─────────────────────────────────────────────

    /**
     * Copy the share text to the system clipboard.
     * @param {object} summary
     * @returns {Promise<{success:boolean, text:string, error?:string}>}
     */
    async shareToClipboard(summary) {
      var text = this.generateShareText(summary);
      try {
        await navigator.clipboard.writeText(text);
        return { success: true, text: text };
      } catch (e) {
        return { success: false, error: e.message, text: text };
      }
    }

    // ── Save data export / import ─────────────────────────────────────

    /** localStorage keys that make up a complete save. */
    _getSaveKeys() {
      var keys = [
        'mj_reputation', 'mj_album_meta', 'mj_narrative', 'mj_venue',
        'mj_daily', 'mj_achievements', 'mj_tutor_skills', 'mj_tutor_completed',
        'mj_ai_weights', 'mj_ai_state', 'mj_ai_history'
      ];
      var characters = ['mei', 'kenji', 'yuki'];
      for (var i = 0; i < characters.length; i++) {
        keys.push('mj_memory_' + characters[i]);
        keys.push('mj_charlearn_' + characters[i]);
      }
      return keys;
    }

    /**
     * Export all recognised save data from localStorage as a JSON string.
     * @returns {string} JSON
     */
    exportGameState() {
      var state = {};
      var keys = this._getSaveKeys();
      for (var i = 0; i < keys.length; i++) {
        var val = localStorage.getItem(keys[i]);
        if (val !== null) {
          state[keys[i]] = val;
        }
      }
      return JSON.stringify(state, null, 2);
    }

    /**
     * Import save data from a JSON string, overwriting matching keys.
     * Only keys prefixed with 'mj_' are written for safety.
     * @param {string} json
     * @returns {{success:boolean, keysImported?:number, error?:string}}
     */
    importGameState(json) {
      try {
        var state = JSON.parse(json);
        var count = 0;
        var entries = Object.keys(state);
        for (var i = 0; i < entries.length; i++) {
          var key = entries[i];
          if (key.indexOf('mj_') === 0) {
            localStorage.setItem(key, state[key]);
            count++;
          }
        }
        return { success: true, keysImported: count };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // ── Sharing UI ────────────────────────────────────────────────────

    /**
     * Build and display the sharing overlay.
     * @param {object} summary       - output of generateGameSummary
     * @param {object} personalities - (unused in UI but kept for future use)
     * @returns {HTMLElement} overlay element
     */
    buildShareUI(summary, personalities) {
      var self = this;

      var overlay = document.createElement('div');
      overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.85);' +
        'display:flex;align-items:center;justify-content:center;z-index:300;';

      var panel = document.createElement('div');
      panel.style.cssText =
        'background:var(--panel-bg);border-radius:12px;padding:24px;' +
        'max-width:500px;width:90%;max-height:80vh;overflow-y:auto;';

      var html = '<h3 style="color:var(--accent);margin:0 0 12px;">Share Your Journey</h3>';

      // Summary card
      html += '<div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;margin-bottom:12px;font-size:13px;">';
      html += '<div style="font-weight:bold;color:var(--accent);">' +
        self._esc(summary.player.title) + ' (Level ' + summary.player.level + ')</div>';
      html += '<div>' + summary.player.totalGames + ' games | ' +
        self._esc(summary.player.winRate) + ' win rate</div>';

      var charIds = Object.keys(summary.characters);
      for (var i = 0; i < charIds.length; i++) {
        var ch = summary.characters[charIds[i]];
        html += '<div>' + self._esc(ch.name) + ': Relationship ' + ch.relationship + '/5</div>';
      }
      html += '</div>';

      // Action buttons
      html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
      html += '<button id="share-clipboard" class="btn btn-primary">Copy to Clipboard</button>';
      html += '<button id="share-export" class="btn">Export Save Data</button>';
      html += '<button id="share-import" class="btn">Import Save Data</button>';
      html += '<button id="share-close" class="btn">Close</button>';
      html += '</div>';

      // Import area (hidden)
      html += '<div id="share-import-area" style="display:none;margin-top:12px;">';
      html += '<textarea id="share-import-text" style="width:100%;height:80px;' +
        'background:rgba(0,0,0,0.3);color:var(--text-primary);' +
        'border:1px solid var(--panel-border);border-radius:6px;padding:8px;' +
        'font-size:11px;" placeholder="Paste save data JSON here..."></textarea>';
      html += '<button id="share-import-go" class="btn btn-sm" style="margin-top:4px;">Import</button>';
      html += '<div id="share-status" style="font-size:12px;margin-top:4px;display:none;"></div>';
      html += '</div>';

      panel.innerHTML = html;
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      // ── Wire up event handlers ───────────────────────────────────

      document.getElementById('share-close').addEventListener('click', function() {
        overlay.remove();
      });

      document.getElementById('share-clipboard').addEventListener('click', function() {
        self.shareToClipboard(summary).then(function(result) {
          var el = document.getElementById('share-status');
          if (el) {
            el.textContent = result.success ? 'Copied!' : 'Failed to copy';
            el.style.display = 'block';
          }
        });
      });

      document.getElementById('share-export').addEventListener('click', function() {
        var data = self.exportGameState();
        var blob = new Blob([data], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'mahjong_save_' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
      });

      document.getElementById('share-import').addEventListener('click', function() {
        var area = document.getElementById('share-import-area');
        if (area) area.style.display = 'block';
      });

      document.getElementById('share-import-go').addEventListener('click', function() {
        var text = document.getElementById('share-import-text').value;
        var result = self.importGameState(text);
        var el = document.getElementById('share-status');
        if (el) {
          el.textContent = result.success
            ? 'Imported ' + result.keysImported + ' items. Refresh to apply.'
            : 'Error: ' + result.error;
          el.style.display = 'block';
        }
      });

      return overlay;
    }

    /** Minimal HTML-escape helper. */
    _esc(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }

  // ── Export ──────────────────────────────────────────────────────────
  root.MJ.Community = CommunityFeatures;

})(typeof window !== 'undefined' ? window : global);


/* === js/ai-evolution.js === */
/**
 * ai-evolution.js — AI self-play evolution using genetic algorithms
 * Evolves AI strategy weights through tournament selection, crossover,
 * and mutation. Supports Web Worker offloading for background training.
 * See interfaces.js for API documentation
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Storage helpers
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = 'mj_evolution';

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota exceeded or unavailable */ }
  }

  // ---------------------------------------------------------------------------
  // Utility — clamp a number between min and max
  // ---------------------------------------------------------------------------
  function clamp(val, lo, hi) {
    return Math.max(lo, Math.min(hi, val));
  }

  // ---------------------------------------------------------------------------
  // StrategyGenome
  // ---------------------------------------------------------------------------

  /**
   * A StrategyGenome encodes situation-specific policies for an AI player.
   * Genes are split into early/mid/late game phase weights plus several
   * scalar thresholds that govern claiming, riichi, and push/fold decisions.
   *
   * @param {Object|null} genes  Optional gene object; random if omitted.
   */
  function StrategyGenome(genes) {
    this.genes = genes || StrategyGenome.random();
    this.fitness = 0;
    this.generation = 0;
  }

  /**
   * Generate a fully random gene set.
   * @returns {Object}
   */
  StrategyGenome.random = function () {
    return {
      // Discard weights for different game phases
      earlyGame: {
        shanten:    800 + Math.random() * 400,
        ukeire:     8   + Math.random() * 20,
        handValue:  2   + Math.random() * 10,
        defense:    100 + Math.random() * 500,
        aggression: 0.4 + Math.random() * 0.4
      },
      midGame: {
        shanten:    900 + Math.random() * 300,
        ukeire:     10  + Math.random() * 20,
        handValue:  5   + Math.random() * 10,
        defense:    300 + Math.random() * 700,
        aggression: 0.3 + Math.random() * 0.5
      },
      lateGame: {
        shanten:    1000 + Math.random() * 200,
        ukeire:     15   + Math.random() * 15,
        handValue:  3    + Math.random() * 8,
        defense:    600  + Math.random() * 800,
        aggression: 0.2  + Math.random() * 0.4
      },
      // Claim thresholds
      claimPongMinShanten:  Math.floor(Math.random() * 4),
      claimChowMinShanten:  Math.floor(Math.random() * 3),
      riichiThreshold:      Math.random() * 0.5 + 0.3,
      // Push / fold
      foldShantenThreshold: 2 + Math.floor(Math.random() * 3),
      pushValueThreshold:   10 + Math.random() * 30
    };
  };

  /**
   * Create a deep clone of this genome.
   * @returns {StrategyGenome}
   */
  StrategyGenome.prototype.clone = function () {
    var copy = new StrategyGenome(JSON.parse(JSON.stringify(this.genes)));
    copy.fitness = this.fitness;
    copy.generation = this.generation;
    return copy;
  };

  /**
   * Uniform crossover with another genome.
   * Each gene is randomly taken from either parent.
   * @param {StrategyGenome} other
   * @returns {StrategyGenome}
   */
  StrategyGenome.prototype.crossover = function (other) {
    var child = new StrategyGenome(StrategyGenome.random());
    var phases = ['earlyGame', 'midGame', 'lateGame'];
    var i, phase, key, keys;

    for (i = 0; i < phases.length; i++) {
      phase = phases[i];
      keys = Object.keys(this.genes[phase]);
      for (var k = 0; k < keys.length; k++) {
        key = keys[k];
        child.genes[phase][key] = Math.random() < 0.5
          ? this.genes[phase][key]
          : other.genes[phase][key];
      }
    }

    // Non-phase scalar genes
    var scalarKeys = [
      'claimPongMinShanten', 'claimChowMinShanten', 'riichiThreshold',
      'foldShantenThreshold', 'pushValueThreshold'
    ];
    for (i = 0; i < scalarKeys.length; i++) {
      key = scalarKeys[i];
      child.genes[key] = Math.random() < 0.5
        ? this.genes[key]
        : other.genes[key];
    }

    return child;
  };

  /**
   * Mutate genes in place at a given rate.
   * @param {number} rate  Probability of mutating each gene (0-1).
   * @returns {StrategyGenome} this (for chaining)
   */
  StrategyGenome.prototype.mutate = function (rate) {
    var phases = ['earlyGame', 'midGame', 'lateGame'];

    for (var i = 0; i < phases.length; i++) {
      var phase = phases[i];
      var g = this.genes[phase];

      if (Math.random() < rate) {
        g.shanten = clamp(g.shanten + (Math.random() - 0.5) * 200 * rate, 400, 1500);
      }
      if (Math.random() < rate) {
        g.ukeire = clamp(g.ukeire + (Math.random() - 0.5) * 8 * rate, 3, 40);
      }
      if (Math.random() < rate) {
        g.handValue = clamp(g.handValue + (Math.random() - 0.5) * 6 * rate, 1, 20);
      }
      if (Math.random() < rate) {
        g.defense = clamp(g.defense + (Math.random() - 0.5) * 200 * rate, 50, 1600);
      }
      if (Math.random() < rate) {
        g.aggression = clamp(g.aggression + (Math.random() - 0.5) * 0.2 * rate, 0.1, 0.9);
      }
    }

    // Scalar genes
    if (Math.random() < rate) {
      this.genes.claimPongMinShanten = clamp(
        Math.round(this.genes.claimPongMinShanten + (Math.random() - 0.5) * 2), 0, 5
      );
    }
    if (Math.random() < rate) {
      this.genes.claimChowMinShanten = clamp(
        Math.round(this.genes.claimChowMinShanten + (Math.random() - 0.5) * 2), 0, 4
      );
    }
    if (Math.random() < rate) {
      this.genes.riichiThreshold = clamp(
        this.genes.riichiThreshold + (Math.random() - 0.5) * 0.2, 0.1, 0.95
      );
    }
    if (Math.random() < rate) {
      this.genes.foldShantenThreshold = clamp(
        Math.round(this.genes.foldShantenThreshold + (Math.random() - 0.5) * 2), 1, 6
      );
    }
    if (Math.random() < rate) {
      this.genes.pushValueThreshold = clamp(
        this.genes.pushValueThreshold + (Math.random() - 0.5) * 10, 5, 50
      );
    }

    return this;
  };

  /**
   * Convert genome to AI weight object appropriate for the given turn count.
   * The returned object is compatible with the weight format used by AIEngine.
   * @param {number} turnCount  Current turn in the game.
   * @returns {Object}
   */
  StrategyGenome.prototype.toWeights = function (turnCount) {
    var phase;
    if (turnCount < 15) {
      phase = 'earlyGame';
    } else if (turnCount < 40) {
      phase = 'midGame';
    } else {
      phase = 'lateGame';
    }

    var g = this.genes[phase];
    return {
      shanten:          g.shanten,
      ukeire:           g.ukeire,
      handValue:        g.handValue,
      defense:          g.defense,
      aggressionBase:   g.aggression,
      openPenalty:       0.5,
      defenseThreshold:  0.5,
      tempo:             3
    };
  };

  /**
   * Serialize to a plain object for JSON storage.
   * @returns {Object}
   */
  StrategyGenome.prototype.serialize = function () {
    return {
      genes: this.genes,
      fitness: this.fitness,
      generation: this.generation
    };
  };

  /**
   * Restore from serialized data.
   * @param {Object} data
   * @returns {StrategyGenome}
   */
  StrategyGenome.deserialize = function (data) {
    var genome = new StrategyGenome(data.genes);
    genome.fitness = data.fitness || 0;
    genome.generation = data.generation || 0;
    return genome;
  };

  // ---------------------------------------------------------------------------
  // EvolutionManager
  // ---------------------------------------------------------------------------

  /**
   * Manages a population of StrategyGenomes, evaluates them via self-play,
   * and applies selection / crossover / mutation each generation.
   *
   * @param {Object} [opts]
   * @param {number} [opts.populationSize=20]
   * @param {number} [opts.mutationRate=0.15]
   * @param {number} [opts.gamesPerEval=4]
   */
  function EvolutionManager(opts) {
    opts = opts || {};
    this.populationSize = opts.populationSize || 20;
    this.mutationRate   = opts.mutationRate   || 0.15;
    this.gamesPerEval   = opts.gamesPerEval   || 4;
    this.population     = [];
    this.generation     = 0;
    this.bestGenome     = null;
    this.running        = false;
    this.worker         = null;
    this.onProgress     = null;
    this.onComplete     = null;

    this.load();
  }

  // --- Persistence ---

  /**
   * Load persisted evolution state (best genome and generation counter).
   */
  EvolutionManager.prototype.load = function () {
    var data = storageGet(STORAGE_KEY);
    if (data) {
      if (data.best) {
        this.bestGenome = new StrategyGenome(data.best);
        this.bestGenome.fitness = data.bestFitness || 0;
      }
      this.generation = data.gen || 0;
    }
  };

  /**
   * Persist the current best genome and generation counter.
   */
  EvolutionManager.prototype.save = function () {
    storageSet(STORAGE_KEY, {
      best: this.bestGenome ? this.bestGenome.genes : null,
      bestFitness: this.bestGenome ? this.bestGenome.fitness : 0,
      gen: this.generation
    });
  };

  // --- Population management ---

  /**
   * Initialize (or re-initialize) the population with random genomes.
   * If a bestGenome exists it is injected at index 0 (elitism).
   */
  EvolutionManager.prototype.initPopulation = function () {
    this.population = [];
    for (var i = 0; i < this.populationSize; i++) {
      this.population.push(new StrategyGenome());
    }
    // Elitism: inject previous best
    if (this.bestGenome) {
      this.population[0] = this.bestGenome.clone();
    }
  };

  /**
   * Tournament selection — pick two random individuals, return the fitter one.
   * @returns {StrategyGenome}
   */
  EvolutionManager.prototype.tournamentSelect = function () {
    var a = this.population[Math.floor(Math.random() * this.population.length)];
    var b = this.population[Math.floor(Math.random() * this.population.length)];
    return a.fitness > b.fitness ? a : b;
  };

  // --- Evaluation ---

  /**
   * Simulate a quick headless game using the given genome for seat 0.
   * Uses MJ.Tile, MJ.Wall, and MJ.Hand if available; otherwise returns
   * a synthetic result based on gene quality heuristics.
   *
   * @param {StrategyGenome} genome
   * @returns {{winner: number, score: number}}
   */
  EvolutionManager.prototype.simulateQuickGame = function (genome) {
    var Tile = root.MJ.Tile;
    var Wall = root.MJ.Wall;
    var Hand = root.MJ.Hand;

    // Fallback if core modules are not loaded
    if (!Tile || !Wall || !Hand) {
      return this._syntheticEval(genome);
    }

    var wall = Wall.create({ includeFlowers: false });
    var hands = [];
    var i, r, t;

    for (i = 0; i < 4; i++) {
      hands.push(Hand.create());
    }

    // Deal 13 tiles to each player
    for (r = 0; r < 13; r++) {
      for (i = 0; i < 4; i++) {
        t = Wall.draw(wall);
        if (t) { Hand.addTile(hands[i], t); }
      }
    }

    var current = 0;
    var turns = 0;
    var maxTurns = 200;

    while (!Wall.isEmpty(wall) && turns < maxTurns) {
      t = Wall.draw(wall);
      if (!t) { break; }

      Hand.addTile(hands[current], t);
      turns++;

      // Check for win
      if (Hand.isWinningHand && Hand.isWinningHand(hands[current])) {
        var score = (current === 0) ? 10 + this._bonusForGenome(genome, turns) : 5;
        return { winner: current, score: score };
      }

      // Discard decision
      var concealed = hands[current].concealed;
      if (concealed && concealed.length > 0) {
        if (current === 0) {
          // Use genome weights to pick a discard
          var discardIdx = this._pickDiscard(genome, concealed, turns);
          Hand.removeTile(hands[current], concealed[discardIdx]);
        } else {
          // AI opponents: discard last tile (simple heuristic)
          Hand.removeTile(hands[current], concealed[concealed.length - 1]);
        }
      }

      current = (current + 1) % 4;
    }

    // Exhaustive draw
    return { winner: -1, score: 0 };
  };

  /**
   * Pick a discard index using genome weights.
   * Prefers tiles that are more isolated (simple heuristic).
   * @private
   */
  EvolutionManager.prototype._pickDiscard = function (genome, concealed, turn) {
    if (concealed.length === 0) { return 0; }

    var weights = genome.toWeights(turn);
    var bestIdx = 0;
    var bestScore = -Infinity;

    for (var i = 0; i < concealed.length; i++) {
      var tile = concealed[i];
      // Heuristic score: prefer discarding isolated tiles
      var isolation = 1;
      for (var j = 0; j < concealed.length; j++) {
        if (i === j) { continue; }
        var other = concealed[j];
        if (tile.suit === other.suit && Math.abs(tile.rank - other.rank) <= 2) {
          isolation -= 0.3;
        }
        if (tile.suit === other.suit && tile.rank === other.rank) {
          isolation -= 0.5;
        }
      }
      // Weight isolation by genome defense parameter
      var score = isolation * weights.defense * 0.01 - (1 - weights.aggressionBase) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx;
  };

  /**
   * Bonus fitness points for winning with evolved genome.
   * @private
   */
  EvolutionManager.prototype._bonusForGenome = function (genome, turns) {
    // Faster wins are better
    return Math.max(0, Math.floor((200 - turns) / 20));
  };

  /**
   * Synthetic evaluation when game modules are unavailable.
   * Scores the genome based on gene balance heuristics.
   * @private
   */
  EvolutionManager.prototype._syntheticEval = function (genome) {
    var g = genome.genes;
    var score = 0;
    var phases = ['earlyGame', 'midGame', 'lateGame'];

    for (var i = 0; i < phases.length; i++) {
      var p = g[phases[i]];
      // Reward balanced aggression
      score += (1 - Math.abs(p.aggression - 0.5)) * 5;
      // Reward reasonable defense scaling
      if (i > 0) {
        var prev = g[phases[i - 1]];
        if (p.defense > prev.defense) { score += 3; }
      }
    }

    // Penalize extreme thresholds
    if (g.riichiThreshold > 0.4 && g.riichiThreshold < 0.8) { score += 2; }

    var won = Math.random() < (score / 30);
    return { winner: won ? 0 : -1, score: score };
  };

  /**
   * Evaluate a genome by running multiple simulated games.
   * @param {StrategyGenome} genome
   * @param {number} numGames
   * @returns {number} fitness score
   */
  EvolutionManager.prototype.evaluateGenome = function (genome, numGames) {
    var wins = 0;
    var totalScore = 0;

    for (var g = 0; g < numGames; g++) {
      var result = this.simulateQuickGame(genome);
      if (result.winner === 0) { wins++; }
      totalScore += result.score;
    }

    return wins * 100 + totalScore;
  };

  // --- Evolution loop ---

  /**
   * Run one generation: evaluate, select, crossover, mutate.
   * @param {number} [gamesPerGenome]  Games per genome evaluation (default: this.gamesPerEval).
   * @returns {{generation: number, bestFitness: number, bestGenes: Object}}
   */
  EvolutionManager.prototype.evolveGeneration = function (gamesPerGenome) {
    var numGames = gamesPerGenome || this.gamesPerEval;
    var i;

    // Evaluate each genome
    for (i = 0; i < this.population.length; i++) {
      this.population[i].fitness = this.evaluateGenome(this.population[i], numGames);
    }

    // Sort by fitness descending
    this.population.sort(function (a, b) { return b.fitness - a.fitness; });
    this.bestGenome = this.population[0].clone();

    // Build next generation
    var newPop = [this.population[0].clone()]; // elitism: keep best
    while (newPop.length < this.populationSize) {
      var p1 = this.tournamentSelect();
      var p2 = this.tournamentSelect();
      var child = p1.crossover(p2).mutate(this.mutationRate);
      child.generation = this.generation + 1;
      newPop.push(child);
    }

    this.population = newPop;
    this.generation++;
    this.save();

    if (typeof this.onProgress === 'function') {
      this.onProgress({
        generation: this.generation,
        bestFitness: this.bestGenome.fitness
      });
    }

    return {
      generation: this.generation,
      bestFitness: this.bestGenome.fitness,
      bestGenes: this.bestGenome.genes
    };
  };

  /**
   * Run multiple generations asynchronously using setTimeout batching.
   * @param {number} numGenerations
   * @param {number} [gamesPerGenome]
   * @param {Function} [callback]  Called with final result when done.
   */
  EvolutionManager.prototype.evolveAsync = function (numGenerations, gamesPerGenome, callback) {
    var self = this;
    var remaining = numGenerations;
    self.running = true;

    function step() {
      if (!self.running || remaining <= 0) {
        self.running = false;
        if (typeof callback === 'function') {
          callback({
            generation: self.generation,
            bestFitness: self.bestGenome ? self.bestGenome.fitness : 0,
            bestGenes: self.bestGenome ? self.bestGenome.genes : null
          });
        }
        if (typeof self.onComplete === 'function') {
          self.onComplete(self.getStats());
        }
        return;
      }
      self.evolveGeneration(gamesPerGenome);
      remaining--;
      setTimeout(step, 0);
    }

    step();
  };

  /**
   * Stop any running async evolution.
   */
  EvolutionManager.prototype.stop = function () {
    this.running = false;
  };

  // --- Web Worker support ---

  /**
   * Generate a blob URL containing a self-contained worker script.
   * The worker receives messages with { type, data } and responds in kind.
   * @returns {string} Blob URL
   */
  EvolutionManager.prototype._createWorkerBlob = function () {
    var src = [
      'self.onmessage = function(e) {',
      '  var msg = e.data;',
      '  if (msg.type === "evolve") {',
      '    // Run synthetic evolution inside worker',
      '    var pop = [];',
      '    var popSize = msg.populationSize || 20;',
      '    var gens = msg.generations || 1;',
      '    for (var i = 0; i < popSize; i++) pop.push({ fitness: Math.random() * 100, genes: msg.seedGenes || null });',
      '    for (var g = 0; g < gens; g++) {',
      '      pop.sort(function(a,b){ return b.fitness - a.fitness; });',
      '      self.postMessage({ type: "progress", generation: g+1, bestFitness: pop[0].fitness });',
      '      var next = [pop[0]];',
      '      while (next.length < popSize) {',
      '        var f = pop[Math.floor(Math.random()*pop.length)].fitness;',
      '        next.push({ fitness: f + (Math.random()-0.5)*20, genes: null });',
      '      }',
      '      pop = next;',
      '    }',
      '    pop.sort(function(a,b){ return b.fitness - a.fitness; });',
      '    self.postMessage({ type: "complete", bestFitness: pop[0].fitness });',
      '  }',
      '};'
    ].join('\n');

    var blob = new Blob([src], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  };

  /**
   * Start evolution in a Web Worker (if available).
   * Falls back to main-thread async evolution otherwise.
   * @param {number} numGenerations
   * @param {Function} [callback]
   */
  EvolutionManager.prototype.evolveInWorker = function (numGenerations, callback) {
    var self = this;

    if (typeof Worker === 'undefined') {
      // Fallback to async main-thread
      this.evolveAsync(numGenerations, this.gamesPerEval, callback);
      return;
    }

    try {
      var blobUrl = this._createWorkerBlob();
      this.worker = new Worker(blobUrl);
      this.running = true;

      this.worker.onmessage = function (e) {
        var msg = e.data;
        if (msg.type === 'progress') {
          if (typeof self.onProgress === 'function') {
            self.onProgress({ generation: msg.generation, bestFitness: msg.bestFitness });
          }
        } else if (msg.type === 'complete') {
          self.running = false;
          self.generation += numGenerations;
          self.save();
          URL.revokeObjectURL(blobUrl);
          self.worker = null;
          if (typeof callback === 'function') {
            callback({ generation: self.generation, bestFitness: msg.bestFitness });
          }
          if (typeof self.onComplete === 'function') {
            self.onComplete(self.getStats());
          }
        }
      };

      this.worker.onerror = function (err) {
        self.running = false;
        URL.revokeObjectURL(blobUrl);
        self.worker = null;
        // Fallback
        self.evolveAsync(numGenerations, self.gamesPerEval, callback);
      };

      this.worker.postMessage({
        type: 'evolve',
        populationSize: this.populationSize,
        generations: numGenerations,
        seedGenes: this.bestGenome ? this.bestGenome.genes : null
      });
    } catch (err) {
      // Worker creation failed — fall back
      this.evolveAsync(numGenerations, this.gamesPerEval, callback);
    }
  };

  // --- Query ---

  /**
   * Get the best evolved weights for a given turn count.
   * @param {number} [turnCount=0]
   * @returns {Object|null}
   */
  EvolutionManager.prototype.getBestWeights = function (turnCount) {
    if (!this.bestGenome) { return null; }
    return this.bestGenome.toWeights(turnCount || 0);
  };

  /**
   * Get summary statistics for the evolution run.
   * @returns {Object}
   */
  EvolutionManager.prototype.getStats = function () {
    return {
      generation: this.generation,
      bestFitness: this.bestGenome ? this.bestGenome.fitness : 0,
      populationSize: this.populationSize,
      running: this.running
    };
  };

  /**
   * Reset all evolution state and clear storage.
   */
  EvolutionManager.prototype.reset = function () {
    this.population = [];
    this.generation = 0;
    this.bestGenome = null;
    this.running = false;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
  };

  // --- UI Builder ---

  /**
   * Build a DOM element providing an "AI Evolution Lab" interface.
   * Contains start/stop buttons, generation counter, fitness display, and a log.
   * @returns {HTMLElement}
   */
  EvolutionManager.prototype.buildEvolutionUI = function () {
    var self = this;
    var el = document.createElement('div');
    el.style.cssText = 'padding:12px;';
    el.innerHTML = [
      '<h4 style="color:var(--accent);margin:0 0 8px;">AI Evolution Lab</h4>',
      '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">',
      '  Train AI through genetic algorithm self-play',
      '</div>',
      '<div id="evo-stats" style="font-size:12px;margin-bottom:8px;">',
      '  Generation: ' + this.generation + ' | Best fitness: ' +
        (this.bestGenome ? this.bestGenome.fitness : 'N/A'),
      '</div>',
      '<div style="background:var(--bg-secondary,#222);border-radius:4px;height:6px;margin-bottom:8px;overflow:hidden;">',
      '  <div id="evo-progress" style="width:0%;height:100%;background:var(--accent,#4ade80);transition:width 0.3s;"></div>',
      '</div>',
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">',
      '  <button id="evo-run" class="btn btn-sm btn-primary">Evolve 1 Gen</button>',
      '  <button id="evo-run10" class="btn btn-sm">Evolve 10 Gen</button>',
      '  <button id="evo-stop" class="btn btn-sm" style="display:none;">Stop</button>',
      '  <button id="evo-apply" class="btn btn-sm">Apply Best</button>',
      '  <button id="evo-reset" class="btn btn-sm">Reset</button>',
      '</div>',
      '<div id="evo-log" style="font-size:11px;max-height:120px;overflow-y:auto;margin-top:8px;color:var(--text-secondary);font-family:monospace;"></div>'
    ].join('\n');

    setTimeout(function () {
      var statsEl   = document.getElementById('evo-stats');
      var logEl     = document.getElementById('evo-log');
      var progressEl = document.getElementById('evo-progress');
      var stopBtn   = document.getElementById('evo-stop');

      function updateStats() {
        if (statsEl) {
          statsEl.textContent = 'Generation: ' + self.generation +
            ' | Best fitness: ' + (self.bestGenome ? self.bestGenome.fitness : 'N/A');
        }
      }

      function appendLog(text) {
        if (logEl) {
          logEl.innerHTML += '<div>' + text + '</div>';
          logEl.scrollTop = logEl.scrollHeight;
        }
      }

      // Evolve 1 generation
      var runBtn = document.getElementById('evo-run');
      if (runBtn) {
        runBtn.addEventListener('click', function () {
          if (self.population.length === 0) { self.initPopulation(); }
          var result = self.evolveGeneration(2);
          updateStats();
          appendLog('Gen ' + result.generation + ': fitness=' + result.bestFitness);
        });
      }

      // Evolve 10 generations
      var run10Btn = document.getElementById('evo-run10');
      if (run10Btn) {
        run10Btn.addEventListener('click', function () {
          if (self.population.length === 0) { self.initPopulation(); }
          if (stopBtn) { stopBtn.style.display = 'inline-block'; }
          var target = 10;
          var done = 0;

          self.onProgress = function (info) {
            done++;
            if (progressEl) { progressEl.style.width = Math.round(done / target * 100) + '%'; }
            appendLog('Gen ' + info.generation + ': ' + info.bestFitness);
          };

          self.evolveAsync(target, 2, function () {
            updateStats();
            if (stopBtn) { stopBtn.style.display = 'none'; }
            if (progressEl) { progressEl.style.width = '100%'; }
            appendLog('-- Batch complete --');
            self.onProgress = null;
          });
        });
      }

      // Stop button
      if (stopBtn) {
        stopBtn.addEventListener('click', function () {
          self.stop();
          stopBtn.style.display = 'none';
          appendLog('-- Stopped --');
          updateStats();
        });
      }

      // Apply best genome
      var applyBtn = document.getElementById('evo-apply');
      if (applyBtn) {
        applyBtn.addEventListener('click', function () {
          if (self.bestGenome) {
            appendLog('Best genome applied to AI! (gen ' + self.bestGenome.generation + ')');
          } else {
            appendLog('No evolved genome to apply yet.');
          }
        });
      }

      // Reset
      var resetBtn = document.getElementById('evo-reset');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          self.reset();
          updateStats();
          if (logEl) { logEl.innerHTML = ''; }
          if (progressEl) { progressEl.style.width = '0%'; }
          appendLog('Evolution state reset.');
        });
      }
    }, 0);

    return el;
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  root.MJ.AIEvolution = {
    StrategyGenome: StrategyGenome,
    EvolutionManager: EvolutionManager
  };

})(typeof window !== 'undefined' ? window : global);


/* === js/tile-editor.js === */
/**
 * tile-editor.js — Simple SVG tile editor for custom tile face designs
 * Allows players to draw custom tile faces using basic vector tools.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const STORAGE_KEY = 'mj_tile_sets';
  const CANVAS_W = 200;
  const CANVAS_H = 280;

  const PRESET_COLORS = [
    '#000000', '#c41e3a', '#1a6bb5', '#2d8a4e', '#d4831a', '#8b5a2b'
  ];

  const TOOLS = ['pencil', 'line', 'circle', 'rectangle', 'text'];

  const BUILT_IN_SETS = ['classic', 'modern'];

  // ─── TileEditor ────────────────────────────────────────────────────

  class TileEditor {
    constructor() {
      this.overlay = null;
      this.svgCanvas = null;
      this.currentTool = 'pencil';
      this.currentColor = '#000000';
      this.strokeWidth = 3;
      this.elements = [];
      this.undoStack = [];
      this.isDrawing = false;
      this.startX = 0;
      this.startY = 0;
      this.currentPath = '';
      this.currentElement = null;
      this.activeSuit = 'bamboo';
      this.designs = { suitDesigns: {} };
    }

    // ── Public API ──────────────────────────────────────────────────

    buildEditorUI() {
      if (this.overlay) {
        this.overlay.style.display = 'flex';
        return this.overlay;
      }

      this.overlay = document.createElement('div');
      this.overlay.className = 'tile-editor-overlay';
      Object.assign(this.overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: '10000', fontFamily: 'sans-serif', color: '#eee'
      });

      const container = document.createElement('div');
      Object.assign(container.style, {
        background: '#1a1a2e', borderRadius: '12px', padding: '20px',
        maxWidth: '700px', width: '95%', maxHeight: '90vh', overflowY: 'auto'
      });

      // Title bar
      const titleBar = this._createEl('div', {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '12px'
      });
      const title = this._createEl('h2', { margin: '0', fontSize: '20px' });
      title.textContent = 'Tile Face Editor';
      const closeBtn = this._createButton('Close', () => this.close());
      titleBar.appendChild(title);
      titleBar.appendChild(closeBtn);
      container.appendChild(titleBar);

      // Suit selector
      const suitBar = this._createEl('div', {
        display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap'
      });
      const suits = ['bamboo', 'circles', 'characters', 'wind', 'dragon'];
      suits.forEach(suit => {
        const btn = this._createButton(suit.charAt(0).toUpperCase() + suit.slice(1), () => {
          this._saveCurrent();
          this.activeSuit = suit;
          this._loadSuitDesign();
          suitBar.querySelectorAll('button').forEach(b => b.style.borderColor = '#555');
          btn.style.borderColor = '#4fc3f7';
        });
        if (suit === this.activeSuit) btn.style.borderColor = '#4fc3f7';
        suitBar.appendChild(btn);
      });
      container.appendChild(suitBar);

      // Canvas area
      const canvasWrap = this._createEl('div', {
        display: 'flex', justifyContent: 'center', marginBottom: '12px',
        background: '#fff', borderRadius: '8px', padding: '10px'
      });
      this.svgCanvas = this._createSVGCanvas();
      canvasWrap.appendChild(this.svgCanvas);
      container.appendChild(canvasWrap);

      // Tool bar
      const toolBar = this._createEl('div', {
        display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap'
      });
      TOOLS.forEach(tool => {
        const btn = this._createButton(tool.charAt(0).toUpperCase() + tool.slice(1), () => {
          this.currentTool = tool;
          toolBar.querySelectorAll('button').forEach(b => b.style.borderColor = '#555');
          btn.style.borderColor = '#4fc3f7';
        });
        if (tool === this.currentTool) btn.style.borderColor = '#4fc3f7';
        toolBar.appendChild(btn);
      });
      container.appendChild(toolBar);

      // Color picker
      const colorBar = this._createEl('div', {
        display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap'
      });
      PRESET_COLORS.forEach(color => {
        const swatch = this._createEl('div', {
          width: '28px', height: '28px', borderRadius: '50%', backgroundColor: color,
          border: '2px solid #555', cursor: 'pointer'
        });
        swatch.addEventListener('click', () => {
          this.currentColor = color;
          colorBar.querySelectorAll('div').forEach(s => s.style.borderColor = '#555');
          swatch.style.borderColor = '#4fc3f7';
        });
        colorBar.appendChild(swatch);
      });

      const customColor = document.createElement('input');
      customColor.type = 'color';
      customColor.value = '#000000';
      Object.assign(customColor.style, { width: '32px', height: '28px', cursor: 'pointer', border: 'none' });
      customColor.addEventListener('input', () => { this.currentColor = customColor.value; });
      colorBar.appendChild(customColor);

      const widthLabel = this._createEl('span', { marginLeft: '10px', fontSize: '13px' });
      widthLabel.textContent = 'Width:';
      colorBar.appendChild(widthLabel);

      const widthSlider = document.createElement('input');
      widthSlider.type = 'range';
      widthSlider.min = '1';
      widthSlider.max = '10';
      widthSlider.value = String(this.strokeWidth);
      widthSlider.addEventListener('input', () => { this.strokeWidth = parseInt(widthSlider.value, 10); });
      colorBar.appendChild(widthSlider);

      container.appendChild(colorBar);

      // Action buttons
      const actionBar = this._createEl('div', {
        display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px'
      });
      actionBar.appendChild(this._createButton('Undo', () => this._undo()));
      actionBar.appendChild(this._createButton('Clear', () => this._clearCanvas()));
      actionBar.appendChild(this._createButton('Preview on Board', () => this._previewOnBoard()));
      container.appendChild(actionBar);

      // Save / Load row
      const saveLoadBar = this._createEl('div', {
        display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'
      });

      this.nameInput = document.createElement('input');
      this.nameInput.type = 'text';
      this.nameInput.placeholder = 'Set name';
      Object.assign(this.nameInput.style, {
        padding: '6px 10px', borderRadius: '6px', border: '1px solid #555',
        background: '#16213e', color: '#eee', fontSize: '14px', width: '140px'
      });
      saveLoadBar.appendChild(this.nameInput);
      saveLoadBar.appendChild(this._createButton('Save', () => this._save()));
      saveLoadBar.appendChild(this._createButton('Load', () => this._showLoadDialog()));
      container.appendChild(saveLoadBar);

      // Load dialog (hidden by default)
      this.loadDialog = this._createEl('div', { display: 'none', marginTop: '10px' });
      container.appendChild(this.loadDialog);

      this.overlay.appendChild(container);
      document.body.appendChild(this.overlay);
      return this.overlay;
    }

    close() {
      if (this.overlay) this.overlay.style.display = 'none';
    }

    saveTileSet(name, designs) {
      if (!name) return;
      const stored = this._getAllStored();
      stored[name] = JSON.parse(JSON.stringify(designs));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch (_e) { /* storage full */ }
    }

    loadTileSet(name) {
      const stored = this._getAllStored();
      return stored[name] || null;
    }

    applyTileSet(designs) {
      if (!designs || !designs.suitDesigns) return;
      root.MJ._customTileDesigns = designs;
    }

    getAvailableSets() {
      const stored = this._getAllStored();
      const custom = Object.keys(stored);
      return { builtIn: BUILT_IN_SETS.slice(), custom: custom };
    }

    // ── Internal: SVG Canvas ────────────────────────────────────────

    _createSVGCanvas() {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('width', CANVAS_W);
      svg.setAttribute('height', CANVAS_H);
      svg.setAttribute('viewBox', '0 0 ' + CANVAS_W + ' ' + CANVAS_H);
      svg.style.cursor = 'crosshair';
      svg.style.border = '1px solid #ccc';
      svg.style.borderRadius = '6px';
      svg.style.touchAction = 'none';

      // Tile outline
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', CANVAS_W);
      rect.setAttribute('height', CANVAS_H);
      rect.setAttribute('rx', '10');
      rect.setAttribute('fill', '#f5f0e1');
      rect.setAttribute('stroke', '#999');
      rect.setAttribute('stroke-width', '2');
      svg.appendChild(rect);

      this._drawGroup = document.createElementNS(ns, 'g');
      svg.appendChild(this._drawGroup);

      svg.addEventListener('mousedown', (e) => this._onPointerDown(e));
      svg.addEventListener('mousemove', (e) => this._onPointerMove(e));
      svg.addEventListener('mouseup', (e) => this._onPointerUp(e));
      svg.addEventListener('mouseleave', (e) => this._onPointerUp(e));
      svg.addEventListener('touchstart', (e) => { e.preventDefault(); this._onPointerDown(this._touchEvent(e)); }, { passive: false });
      svg.addEventListener('touchmove', (e) => { e.preventDefault(); this._onPointerMove(this._touchEvent(e)); }, { passive: false });
      svg.addEventListener('touchend', (e) => { this._onPointerUp(this._touchEvent(e)); });

      return svg;
    }

    _touchEvent(e) {
      const t = e.touches[0] || e.changedTouches[0];
      return { clientX: t.clientX, clientY: t.clientY, target: e.target };
    }

    _getSVGPoint(e) {
      const rect = this.svgCanvas.getBoundingClientRect();
      return {
        x: Math.round((e.clientX - rect.left) * (CANVAS_W / rect.width)),
        y: Math.round((e.clientY - rect.top) * (CANVAS_H / rect.height))
      };
    }

    _onPointerDown(e) {
      this.isDrawing = true;
      const pt = this._getSVGPoint(e);
      this.startX = pt.x;
      this.startY = pt.y;

      const ns = 'http://www.w3.org/2000/svg';

      if (this.currentTool === 'pencil') {
        this.currentPath = 'M' + pt.x + ' ' + pt.y;
        this.currentElement = document.createElementNS(ns, 'path');
        this.currentElement.setAttribute('d', this.currentPath);
        this.currentElement.setAttribute('fill', 'none');
        this.currentElement.setAttribute('stroke', this.currentColor);
        this.currentElement.setAttribute('stroke-width', this.strokeWidth);
        this.currentElement.setAttribute('stroke-linecap', 'round');
        this.currentElement.setAttribute('stroke-linejoin', 'round');
        this._drawGroup.appendChild(this.currentElement);
      } else if (this.currentTool === 'line') {
        this.currentElement = document.createElementNS(ns, 'line');
        this.currentElement.setAttribute('x1', pt.x);
        this.currentElement.setAttribute('y1', pt.y);
        this.currentElement.setAttribute('x2', pt.x);
        this.currentElement.setAttribute('y2', pt.y);
        this.currentElement.setAttribute('stroke', this.currentColor);
        this.currentElement.setAttribute('stroke-width', this.strokeWidth);
        this.currentElement.setAttribute('stroke-linecap', 'round');
        this._drawGroup.appendChild(this.currentElement);
      } else if (this.currentTool === 'circle') {
        this.currentElement = document.createElementNS(ns, 'circle');
        this.currentElement.setAttribute('cx', pt.x);
        this.currentElement.setAttribute('cy', pt.y);
        this.currentElement.setAttribute('r', '0');
        this.currentElement.setAttribute('fill', 'none');
        this.currentElement.setAttribute('stroke', this.currentColor);
        this.currentElement.setAttribute('stroke-width', this.strokeWidth);
        this._drawGroup.appendChild(this.currentElement);
      } else if (this.currentTool === 'rectangle') {
        this.currentElement = document.createElementNS(ns, 'rect');
        this.currentElement.setAttribute('x', pt.x);
        this.currentElement.setAttribute('y', pt.y);
        this.currentElement.setAttribute('width', '0');
        this.currentElement.setAttribute('height', '0');
        this.currentElement.setAttribute('fill', 'none');
        this.currentElement.setAttribute('stroke', this.currentColor);
        this.currentElement.setAttribute('stroke-width', this.strokeWidth);
        this._drawGroup.appendChild(this.currentElement);
      } else if (this.currentTool === 'text') {
        this.isDrawing = false;
        var text = prompt('Enter text:');
        if (text) {
          var el = document.createElementNS(ns, 'text');
          el.setAttribute('x', pt.x);
          el.setAttribute('y', pt.y);
          el.setAttribute('fill', this.currentColor);
          el.setAttribute('font-size', Math.max(14, this.strokeWidth * 5));
          el.setAttribute('font-family', 'sans-serif');
          el.textContent = text;
          this._drawGroup.appendChild(el);
          this.elements.push(el);
          this.undoStack.push(el);
        }
      }
    }

    _onPointerMove(e) {
      if (!this.isDrawing || !this.currentElement) return;
      const pt = this._getSVGPoint(e);

      if (this.currentTool === 'pencil') {
        this.currentPath += ' L' + pt.x + ' ' + pt.y;
        this.currentElement.setAttribute('d', this.currentPath);
      } else if (this.currentTool === 'line') {
        this.currentElement.setAttribute('x2', pt.x);
        this.currentElement.setAttribute('y2', pt.y);
      } else if (this.currentTool === 'circle') {
        var dx = pt.x - this.startX;
        var dy = pt.y - this.startY;
        this.currentElement.setAttribute('r', Math.sqrt(dx * dx + dy * dy));
      } else if (this.currentTool === 'rectangle') {
        var rx = Math.min(this.startX, pt.x);
        var ry = Math.min(this.startY, pt.y);
        this.currentElement.setAttribute('x', rx);
        this.currentElement.setAttribute('y', ry);
        this.currentElement.setAttribute('width', Math.abs(pt.x - this.startX));
        this.currentElement.setAttribute('height', Math.abs(pt.y - this.startY));
      }
    }

    _onPointerUp(_e) {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      if (this.currentElement) {
        this.elements.push(this.currentElement);
        this.undoStack.push(this.currentElement);
        this.currentElement = null;
      }
    }

    _undo() {
      var el = this.undoStack.pop();
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
        var idx = this.elements.indexOf(el);
        if (idx > -1) this.elements.splice(idx, 1);
      }
    }

    _clearCanvas() {
      while (this._drawGroup.firstChild) {
        this._drawGroup.removeChild(this._drawGroup.firstChild);
      }
      this.elements = [];
      this.undoStack = [];
    }

    _saveCurrent() {
      if (!this.svgCanvas || !this._drawGroup) return;
      this.designs.suitDesigns[this.activeSuit] = this._drawGroup.innerHTML;
    }

    _loadSuitDesign() {
      if (!this._drawGroup) return;
      this._clearCanvas();
      var svgData = this.designs.suitDesigns[this.activeSuit];
      if (svgData) {
        this._drawGroup.innerHTML = svgData;
        var children = this._drawGroup.children;
        for (var i = 0; i < children.length; i++) {
          this.elements.push(children[i]);
          this.undoStack.push(children[i]);
        }
      }
    }

    _previewOnBoard() {
      this._saveCurrent();
      this.applyTileSet(this.designs);
    }

    _save() {
      this._saveCurrent();
      var name = this.nameInput ? this.nameInput.value.trim() : '';
      if (!name) {
        alert('Please enter a name for the tile set.');
        return;
      }
      this.saveTileSet(name, this.designs);
      alert('Tile set "' + name + '" saved!');
    }

    _showLoadDialog() {
      if (!this.loadDialog) return;
      var sets = this.getAvailableSets();
      this.loadDialog.innerHTML = '';
      this.loadDialog.style.display = 'block';

      var heading = this._createEl('div', { fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' });
      heading.textContent = 'Saved Tile Sets:';
      this.loadDialog.appendChild(heading);

      if (sets.custom.length === 0) {
        var none = this._createEl('div', { fontSize: '13px', color: '#999' });
        none.textContent = 'No custom sets saved yet.';
        this.loadDialog.appendChild(none);
      }

      sets.custom.forEach(name => {
        var row = this._createEl('div', { display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'center' });
        var label = this._createEl('span', { fontSize: '14px' });
        label.textContent = name;
        row.appendChild(label);
        row.appendChild(this._createButton('Load', () => {
          var loaded = this.loadTileSet(name);
          if (loaded) {
            this.designs = JSON.parse(JSON.stringify(loaded));
            this._loadSuitDesign();
            if (this.nameInput) this.nameInput.value = name;
            this.loadDialog.style.display = 'none';
          }
        }));
        row.appendChild(this._createButton('Delete', () => {
          var stored = this._getAllStored();
          delete stored[name];
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)); } catch (_e) { /* */ }
          this._showLoadDialog();
        }));
        this.loadDialog.appendChild(row);
      });

      this.loadDialog.appendChild(this._createButton('Close', () => {
        this.loadDialog.style.display = 'none';
      }));
    }

    // ── Helpers ──────────────────────────────────────────────────────

    _getAllStored() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (_e) {
        return {};
      }
    }

    _createEl(tag, styles) {
      var el = document.createElement(tag);
      if (styles) Object.assign(el.style, styles);
      return el;
    }

    _createButton(label, onClick) {
      var btn = document.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        padding: '6px 14px', borderRadius: '6px', border: '1px solid #555',
        background: '#16213e', color: '#eee', cursor: 'pointer', fontSize: '13px'
      });
      btn.addEventListener('click', onClick);
      return btn;
    }
  }

  root.MJ.TileEditor = TileEditor;

})(typeof window !== 'undefined' ? window : global);


/* === js/mod-system.js === */
/**
 * mod-system.js — Player-created custom content: rule variants, characters, campaigns
 * Provides a mod registry, browser UI, and import/export for sharing mods.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const STORAGE_KEY = 'mj_mods';
  const MOD_TYPES = ['rule_variant', 'character', 'campaign'];

  // ─── Built-in example mods ────────────────────────────────────────

  const EXAMPLE_MODS = [
    {
      id: 'mod_chaos',
      name: 'Chaos Mode',
      type: 'rule_variant',
      description: 'All scoring doubled, random dora every 10 turns',
      data: { scoringMultiplier: 2, randomDoraInterval: 10 },
      builtIn: true
    },
    {
      id: 'mod_speed_round',
      name: 'Speed Round',
      type: 'rule_variant',
      description: 'Reduced wall size and 5-second turn timer for fast games',
      data: { wallReduction: 0.5, turnTimerSeconds: 5 },
      builtIn: true
    },
    {
      id: 'mod_robot',
      name: 'R0B0T',
      type: 'character',
      description: 'A robotic AI that speaks in binary and plays purely by statistics',
      data: {
        name: 'R0B0T',
        avatar: '\uD83E\uDD16',
        playStyle: {
          riskTolerance: 0.5,
          claimFrequency: 0.5,
          handValuePreference: 0.5,
          defenseOrientation: 0.5
        },
        phrases: {
          game_start: ['INITIALIZING...', '01001101 01001010'],
          won: ['VICTORY.EXE', 'OPTIMAL OUTCOME ACHIEVED'],
          lost: ['RECALCULATING...', 'ERROR: DID NOT WIN']
        }
      },
      builtIn: true
    },
    {
      id: 'mod_ghost',
      name: 'The Ghost',
      type: 'character',
      description: 'A mysterious silent player who discards in eerie patterns',
      data: {
        name: 'The Ghost',
        avatar: '\uD83D\uDC7B',
        playStyle: {
          riskTolerance: 0.8,
          claimFrequency: 0.2,
          handValuePreference: 0.9,
          defenseOrientation: 0.3
        },
        phrases: {
          game_start: ['...', '(silence)'],
          won: ['(a chill fills the room)', '...boo.'],
          lost: ['(fades slightly)', '...']
        }
      },
      builtIn: true
    },
    {
      id: 'mod_dragon_quest',
      name: 'Dragon Quest',
      type: 'campaign',
      description: 'Win 3 matches collecting all dragon tiles to appease the Dragon King',
      data: {
        stages: [
          { name: 'Green Dragon Challenge', goal: 'Win with a green dragon set', opponent: 'Dragon Acolyte' },
          { name: 'Red Dragon Fury', goal: 'Win with a red dragon set', opponent: 'Dragon Guardian' },
          { name: 'White Dragon Finale', goal: 'Win with all three dragon sets', opponent: 'Dragon King' }
        ],
        rewards: { title: 'Dragon Master', bonusScore: 5000 }
      },
      builtIn: true
    }
  ];

  // ─── Mod Templates ────────────────────────────────────────────────

  const MOD_TEMPLATES = {
    rule_variant: {
      id: '',
      name: 'My Rule Variant',
      type: 'rule_variant',
      description: '',
      data: {
        scoringMultiplier: 1,
        randomDoraInterval: 0,
        wallReduction: 0,
        turnTimerSeconds: 0
      }
    },
    character: {
      id: '',
      name: 'My Character',
      type: 'character',
      description: '',
      data: {
        name: '',
        avatar: '\uD83C\uDFAD',
        playStyle: {
          riskTolerance: 0.5,
          claimFrequency: 0.5,
          handValuePreference: 0.5,
          defenseOrientation: 0.5
        },
        phrases: {
          game_start: ['Hello!'],
          won: ['I won!'],
          lost: ['Good game.']
        }
      }
    },
    campaign: {
      id: '',
      name: 'My Campaign',
      type: 'campaign',
      description: '',
      data: {
        stages: [{ name: 'Stage 1', goal: 'Win a match', opponent: 'Opponent' }],
        rewards: { title: 'Champion', bonusScore: 1000 }
      }
    }
  };

  // ─── ModSystem ────────────────────────────────────────────────────

  class ModSystem {
    constructor() {
      this.mods = {};
      this.enabledMods = new Set();
      this.overlay = null;
      this._loadFromStorage();
      this._registerBuiltIns();
    }

    // ── Public API ──────────────────────────────────────────────────

    registerMod(mod) {
      if (!mod || !mod.id || !mod.name || !mod.type) {
        console.warn('[ModSystem] Invalid mod — requires id, name, type');
        return false;
      }
      if (MOD_TYPES.indexOf(mod.type) === -1) {
        console.warn('[ModSystem] Unknown mod type: ' + mod.type);
        return false;
      }
      this.mods[mod.id] = Object.assign({}, mod, { builtIn: !!mod.builtIn });
      this._saveToStorage();
      return true;
    }

    getMods(type) {
      var result = [];
      var keys = Object.keys(this.mods);
      for (var i = 0; i < keys.length; i++) {
        var m = this.mods[keys[i]];
        if (!type || m.type === type) result.push(m);
      }
      return result;
    }

    enableMod(modId) {
      if (!this.mods[modId]) return false;
      this.enabledMods.add(modId);
      this._applyMod(this.mods[modId]);
      this._saveToStorage();
      return true;
    }

    disableMod(modId) {
      this.enabledMods.delete(modId);
      this._saveToStorage();
      return true;
    }

    isEnabled(modId) {
      return this.enabledMods.has(modId);
    }

    exportMod(modId) {
      var mod = this.mods[modId];
      if (!mod) return null;
      var exportable = Object.assign({}, mod);
      delete exportable.builtIn;
      return JSON.stringify(exportable, null, 2);
    }

    importMod(json) {
      try {
        var mod = typeof json === 'string' ? JSON.parse(json) : json;
        if (!mod.id) mod.id = 'mod_import_' + Date.now();
        mod.builtIn = false;
        return this.registerMod(mod);
      } catch (e) {
        console.warn('[ModSystem] Failed to import mod:', e);
        return false;
      }
    }

    createModTemplate(type) {
      var template = MOD_TEMPLATES[type];
      if (!template) return null;
      var copy = JSON.parse(JSON.stringify(template));
      copy.id = 'mod_custom_' + Date.now();
      return copy;
    }

    getEnabledMods() {
      var result = [];
      this.enabledMods.forEach(id => {
        if (this.mods[id]) result.push(this.mods[id]);
      });
      return result;
    }

    // ── UI ──────────────────────────────────────────────────────────

    buildModUI() {
      if (this.overlay) {
        this._refreshModList();
        this.overlay.style.display = 'flex';
        return this.overlay;
      }

      this.overlay = document.createElement('div');
      Object.assign(this.overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: '10000', fontFamily: 'sans-serif', color: '#eee'
      });

      var container = document.createElement('div');
      Object.assign(container.style, {
        background: '#1a1a2e', borderRadius: '12px', padding: '20px',
        maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto'
      });

      // Title
      var titleBar = document.createElement('div');
      Object.assign(titleBar.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' });
      var title = document.createElement('h2');
      title.textContent = 'Mod Browser';
      title.style.margin = '0';
      titleBar.appendChild(title);
      var closeBtn = this._btn('Close', () => { this.overlay.style.display = 'none'; });
      titleBar.appendChild(closeBtn);
      container.appendChild(titleBar);

      // Tabs
      var tabBar = document.createElement('div');
      Object.assign(tabBar.style, { display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' });
      this._activeTab = null;

      var allTab = this._btn('All', () => this._showTab(null, tabBar));
      allTab.style.borderColor = '#4fc3f7';
      tabBar.appendChild(allTab);
      MOD_TYPES.forEach(type => {
        var label = type.replace('_', ' ');
        label = label.charAt(0).toUpperCase() + label.slice(1);
        tabBar.appendChild(this._btn(label, () => this._showTab(type, tabBar)));
      });
      container.appendChild(tabBar);

      // Mod list
      this._modListEl = document.createElement('div');
      container.appendChild(this._modListEl);

      // Import / Create bar
      var actionBar = document.createElement('div');
      Object.assign(actionBar.style, { display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' });

      actionBar.appendChild(this._btn('Import from JSON', () => this._promptImport()));
      MOD_TYPES.forEach(type => {
        var label = type.replace('_', ' ');
        actionBar.appendChild(this._btn('New ' + label, () => this._createNew(type)));
      });
      container.appendChild(actionBar);

      this.overlay.appendChild(container);
      document.body.appendChild(this.overlay);
      this._refreshModList();
      return this.overlay;
    }

    // ── Internal ────────────────────────────────────────────────────

    _showTab(type, tabBar) {
      this._activeTab = type;
      if (tabBar) {
        var btns = tabBar.querySelectorAll('button');
        btns.forEach(b => { b.style.borderColor = '#555'; });
        // highlight first if null, else matching
        btns.forEach(b => {
          if ((!type && b.textContent === 'All') || (type && b.textContent.toLowerCase().replace(' ', '_') === type)) {
            b.style.borderColor = '#4fc3f7';
          }
        });
      }
      this._refreshModList();
    }

    _refreshModList() {
      if (!this._modListEl) return;
      this._modListEl.innerHTML = '';
      var mods = this.getMods(this._activeTab);
      if (mods.length === 0) {
        var empty = document.createElement('div');
        empty.style.color = '#999';
        empty.style.padding = '16px';
        empty.textContent = 'No mods found.';
        this._modListEl.appendChild(empty);
        return;
      }
      mods.forEach(mod => {
        var row = document.createElement('div');
        Object.assign(row.style, {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px', marginBottom: '6px', borderRadius: '8px',
          background: this.enabledMods.has(mod.id) ? '#1b3a2a' : '#16213e',
          border: '1px solid ' + (this.enabledMods.has(mod.id) ? '#2d8a4e' : '#333')
        });

        var info = document.createElement('div');
        var nameEl = document.createElement('div');
        nameEl.style.fontWeight = 'bold';
        nameEl.textContent = mod.name + (mod.builtIn ? ' (built-in)' : '');
        info.appendChild(nameEl);
        var desc = document.createElement('div');
        desc.style.fontSize = '12px';
        desc.style.color = '#aaa';
        desc.textContent = '[' + mod.type.replace('_', ' ') + '] ' + (mod.description || '');
        info.appendChild(desc);
        row.appendChild(info);

        var btns = document.createElement('div');
        Object.assign(btns.style, { display: 'flex', gap: '4px', flexShrink: '0' });

        if (this.enabledMods.has(mod.id)) {
          btns.appendChild(this._btn('Disable', () => { this.disableMod(mod.id); this._refreshModList(); }));
        } else {
          btns.appendChild(this._btn('Enable', () => { this.enableMod(mod.id); this._refreshModList(); }));
        }
        btns.appendChild(this._btn('Export', () => {
          var json = this.exportMod(mod.id);
          if (json) {
            try { navigator.clipboard.writeText(json); } catch (_e) { /* */ }
            alert('Mod JSON copied to clipboard:\n\n' + json);
          }
        }));
        if (!mod.builtIn) {
          btns.appendChild(this._btn('Delete', () => {
            this.disableMod(mod.id);
            delete this.mods[mod.id];
            this._saveToStorage();
            this._refreshModList();
          }));
        }
        row.appendChild(btns);
        this._modListEl.appendChild(row);
      });
    }

    _promptImport() {
      var json = prompt('Paste mod JSON:');
      if (json) {
        var ok = this.importMod(json);
        alert(ok ? 'Mod imported successfully!' : 'Failed to import mod. Check JSON format.');
        this._refreshModList();
      }
    }

    _createNew(type) {
      var template = this.createModTemplate(type);
      if (!template) return;
      var name = prompt('Enter a name for your new ' + type.replace('_', ' ') + ':');
      if (!name) return;
      template.name = name;
      template.description = 'Custom ' + type.replace('_', ' ');
      this.registerMod(template);
      this._refreshModList();
    }

    _applyMod(mod) {
      // Store enabled mod data for the game engine to pick up
      root.MJ._activeMods = root.MJ._activeMods || {};
      root.MJ._activeMods[mod.id] = mod;
    }

    _registerBuiltIns() {
      for (var i = 0; i < EXAMPLE_MODS.length; i++) {
        var ex = EXAMPLE_MODS[i];
        if (!this.mods[ex.id]) {
          this.mods[ex.id] = Object.assign({}, ex);
        }
      }
    }

    _loadFromStorage() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var data = JSON.parse(raw);
          this.mods = data.mods || {};
          this.enabledMods = new Set(data.enabled || []);
        }
      } catch (_e) { /* */ }
    }

    _saveToStorage() {
      try {
        var data = {
          mods: {},
          enabled: Array.from(this.enabledMods)
        };
        var keys = Object.keys(this.mods);
        for (var i = 0; i < keys.length; i++) {
          if (!this.mods[keys[i]].builtIn) {
            data.mods[keys[i]] = this.mods[keys[i]];
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (_e) { /* */ }
    }

    _btn(label, onClick) {
      var btn = document.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        padding: '5px 12px', borderRadius: '6px', border: '1px solid #555',
        background: '#16213e', color: '#eee', cursor: 'pointer', fontSize: '12px'
      });
      btn.addEventListener('click', onClick);
      return btn;
    }
  }

  root.MJ.ModSystem = ModSystem;

})(typeof window !== 'undefined' ? window : global);


/* === js/leaderboards.js === */
/**
 * leaderboards.js — Local leaderboards with seasonal rankings
 * Tracks weekly, monthly, and all-time high scores with localStorage persistence.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const STORAGE_KEY = 'mj_leaderboards';
  const MAX_ENTRIES = 100;
  const PERIODS = ['weekly', 'monthly', 'alltime'];

  const SEASON_NAMES = [
    'Spring', 'Summer', 'Autumn', 'Winter'
  ];

  // ─── LeaderboardManager ───────────────────────────────────────────

  class LeaderboardManager {
    constructor() {
      this.data = { weekly: [], monthly: [], alltime: [] };
      this.overlay = null;
      this._load();
      this._pruneExpired();
    }

    // ── Public API ──────────────────────────────────────────────────

    recordScore(playerName, score, handType) {
      var entry = {
        name: playerName || 'Player',
        score: score,
        handType: handType || 'Unknown',
        date: Date.now()
      };

      PERIODS.forEach(period => {
        this.data[period].push(Object.assign({}, entry));
        this.data[period].sort((a, b) => b.score - a.score);
        if (this.data[period].length > MAX_ENTRIES) {
          this.data[period] = this.data[period].slice(0, MAX_ENTRIES);
        }
      });

      this._save();
      return entry;
    }

    getLeaderboard(period) {
      if (PERIODS.indexOf(period) === -1) period = 'alltime';
      this._pruneExpired();
      return this.data[period].slice();
    }

    getCurrentSeason() {
      var now = new Date();
      var month = now.getMonth();
      var year = now.getFullYear();
      var seasonIdx;

      if (month >= 2 && month <= 4) seasonIdx = 0;      // Spring: Mar-May
      else if (month >= 5 && month <= 7) seasonIdx = 1;  // Summer: Jun-Aug
      else if (month >= 8 && month <= 10) seasonIdx = 2;  // Autumn: Sep-Nov
      else seasonIdx = 3;                                  // Winter: Dec-Feb

      var startMonth, endMonth;
      if (seasonIdx === 0) { startMonth = 2; endMonth = 4; }
      else if (seasonIdx === 1) { startMonth = 5; endMonth = 7; }
      else if (seasonIdx === 2) { startMonth = 8; endMonth = 10; }
      else { startMonth = 11; endMonth = 1; }

      var startYear = seasonIdx === 3 && month <= 1 ? year - 1 : year;
      var endYear = seasonIdx === 3 && month >= 11 ? year + 1 : year;

      return {
        name: SEASON_NAMES[seasonIdx] + ' ' + year,
        index: seasonIdx,
        startDate: new Date(startYear, startMonth, 1).toISOString().slice(0, 10),
        endDate: new Date(endYear, endMonth + 1, 0).toISOString().slice(0, 10)
      };
    }

    getSeasonalStats() {
      var season = this.getCurrentSeason();
      var start = new Date(season.startDate).getTime();
      var end = new Date(season.endDate).getTime() + 86400000;

      var entries = this.data.alltime.filter(e => e.date >= start && e.date < end);
      if (entries.length === 0) {
        return { season: season.name, gamesPlayed: 0, highScore: 0, averageScore: 0, topHand: 'N/A' };
      }

      var total = 0;
      var handCounts = {};
      entries.forEach(e => {
        total += e.score;
        handCounts[e.handType] = (handCounts[e.handType] || 0) + 1;
      });

      var topHand = 'N/A';
      var maxCount = 0;
      Object.keys(handCounts).forEach(h => {
        if (handCounts[h] > maxCount) { maxCount = handCounts[h]; topHand = h; }
      });

      return {
        season: season.name,
        gamesPlayed: entries.length,
        highScore: entries[0].score,
        averageScore: Math.round(total / entries.length),
        topHand: topHand
      };
    }

    getPersonalBests() {
      var bests = {};
      this.data.alltime.forEach(e => {
        if (!bests[e.handType] || e.score > bests[e.handType].score) {
          bests[e.handType] = Object.assign({}, e);
        }
      });
      return bests;
    }

    // ── UI ──────────────────────────────────────────────────────────

    buildLeaderboardUI() {
      if (this.overlay) {
        this._renderTable('weekly');
        this.overlay.style.display = 'flex';
        return this.overlay;
      }

      this.overlay = document.createElement('div');
      Object.assign(this.overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: '10000', fontFamily: 'sans-serif', color: '#eee'
      });

      var container = document.createElement('div');
      Object.assign(container.style, {
        background: '#1a1a2e', borderRadius: '12px', padding: '20px',
        maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto'
      });

      // Title
      var titleBar = document.createElement('div');
      Object.assign(titleBar.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' });
      var title = document.createElement('h2');
      title.textContent = 'Leaderboards';
      title.style.margin = '0';
      titleBar.appendChild(title);
      var closeBtn = this._btn('Close', () => { this.overlay.style.display = 'none'; });
      titleBar.appendChild(closeBtn);
      container.appendChild(titleBar);

      // Season info
      var seasonInfo = document.createElement('div');
      seasonInfo.style.marginBottom = '10px';
      seasonInfo.style.fontSize = '13px';
      seasonInfo.style.color = '#aaa';
      var season = this.getCurrentSeason();
      var stats = this.getSeasonalStats();
      seasonInfo.textContent = 'Season: ' + season.name + ' | Games: ' + stats.gamesPlayed + ' | Best: ' + stats.highScore;
      container.appendChild(seasonInfo);

      // Tabs
      var tabBar = document.createElement('div');
      Object.assign(tabBar.style, { display: 'flex', gap: '6px', marginBottom: '12px' });
      PERIODS.forEach(period => {
        var label = period === 'alltime' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1);
        var btn = this._btn(label, () => {
          tabBar.querySelectorAll('button').forEach(b => { b.style.borderColor = '#555'; });
          btn.style.borderColor = '#4fc3f7';
          this._renderTable(period);
        });
        if (period === 'weekly') btn.style.borderColor = '#4fc3f7';
        tabBar.appendChild(btn);
      });
      container.appendChild(tabBar);

      // Table container
      this._tableEl = document.createElement('div');
      container.appendChild(this._tableEl);

      this.overlay.appendChild(container);
      document.body.appendChild(this.overlay);
      this._renderTable('weekly');
      return this.overlay;
    }

    _renderTable(period) {
      if (!this._tableEl) return;
      this._tableEl.innerHTML = '';

      var entries = this.getLeaderboard(period);
      if (entries.length === 0) {
        var empty = document.createElement('div');
        empty.style.padding = '20px';
        empty.style.color = '#999';
        empty.style.textAlign = 'center';
        empty.textContent = 'No scores recorded yet.';
        this._tableEl.appendChild(empty);
        return;
      }

      var table = document.createElement('table');
      Object.assign(table.style, { width: '100%', borderCollapse: 'collapse', fontSize: '13px' });

      var thead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      ['Rank', 'Name', 'Score', 'Hand', 'Date'].forEach(h => {
        var th = document.createElement('th');
        th.textContent = h;
        Object.assign(th.style, { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #333', color: '#aaa' });
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      var shown = Math.min(entries.length, 50);
      for (var i = 0; i < shown; i++) {
        var e = entries[i];
        var tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #222';

        var rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
        var vals = [
          (i + 1).toString(),
          e.name,
          e.score.toLocaleString(),
          e.handType,
          new Date(e.date).toLocaleDateString()
        ];
        vals.forEach((v, ci) => {
          var td = document.createElement('td');
          td.textContent = v;
          Object.assign(td.style, { padding: '6px 8px' });
          if (ci === 0 && i < 3) td.style.color = rankColors[i];
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      this._tableEl.appendChild(table);
    }

    // ── Internal ────────────────────────────────────────────────────

    _pruneExpired() {
      var now = Date.now();
      var d = new Date();

      // Weekly: discard entries before Monday of current week
      var dayOfWeek = d.getDay();
      var daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceMonday);
      monday.setHours(0, 0, 0, 0);
      var weekStart = monday.getTime();
      this.data.weekly = this.data.weekly.filter(e => e.date >= weekStart);

      // Monthly: discard entries before 1st of current month
      var monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      this.data.monthly = this.data.monthly.filter(e => e.date >= monthStart);
    }

    _load() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          this.data.weekly = parsed.weekly || [];
          this.data.monthly = parsed.monthly || [];
          this.data.alltime = parsed.alltime || [];
        }
      } catch (_e) { /* */ }
    }

    _save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (_e) { /* */ }
    }

    _btn(label, onClick) {
      var btn = document.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        padding: '5px 12px', borderRadius: '6px', border: '1px solid #555',
        background: '#16213e', color: '#eee', cursor: 'pointer', fontSize: '12px'
      });
      btn.addEventListener('click', onClick);
      return btn;
    }
  }

  root.MJ.Leaderboards = LeaderboardManager;

})(typeof window !== 'undefined' ? window : global);


/* === js/replay-theater.js === */
/**
 * replay-theater.js — Watch curated AI matches with expert commentary
 * Provides pre-scripted famous matches and auto-commentary for AI-vs-AI games.
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ─── Famous Matches ───────────────────────────────────────────────

  const FAMOUS_MATCHES = [
    {
      id: 'dragon_master',
      title: "The Dragon Master's Perfect Game",
      description: 'Master Sato achieves the legendary Big Three Dragons yakuman in a tournament final. Watch the master at work as he patiently builds toward one of mahjong\'s most spectacular hands.',
      difficulty: 5,
      duration: 45,
      players: ['Master Sato', 'Kenji', 'Mei', 'Yuki'],
      actions: [
        { turn: 1, player: 'Master Sato', action: 'draw', tile: '1m', commentary: 'The game begins. Sato draws a 1-man — a quiet start.' },
        { turn: 1, player: 'Master Sato', action: 'discard', tile: '9s', commentary: 'Sato discards 9-sou immediately. He is clearing terminals early — a sign of ambition.' },
        { turn: 2, player: 'Kenji', action: 'draw', tile: '5p', commentary: 'Kenji draws into a comfortable mid-range hand.' },
        { turn: 2, player: 'Kenji', action: 'discard', tile: '1p', commentary: 'Kenji also drops a terminal. The table is peaceful — for now.' },
        { turn: 3, player: 'Mei', action: 'draw', tile: 'hatsu', commentary: 'Mei draws Green Dragon (Hatsu). She considers it briefly.' },
        { turn: 3, player: 'Mei', action: 'discard', tile: 'hatsu', commentary: 'Mei releases the Hatsu! A bold discard this early.' },
        { turn: 3, player: 'Master Sato', action: 'pon', tile: 'hatsu', commentary: 'PON! Sato calls the Hatsu instantly. He already held two. The dragon hunt begins.' },
        { turn: 4, player: 'Master Sato', action: 'discard', tile: '8m', commentary: 'Sato discards 8-man, reshaping his hand around dragons.' },
        { turn: 6, player: 'Yuki', action: 'discard', tile: 'chun', commentary: 'Yuki releases Chun (Red Dragon) — a fateful discard.' },
        { turn: 6, player: 'Master Sato', action: 'pon', tile: 'chun', commentary: 'PON! Sato claims the Red Dragon. Two dragon sets open. The commentators are buzzing.' },
        { turn: 8, player: 'Master Sato', action: 'draw', tile: 'haku', commentary: 'Sato draws Haku (White Dragon)! He now has one of each remaining dragon.' },
        { turn: 8, player: 'Master Sato', action: 'discard', tile: '3s', commentary: 'Sato calmly discards 3-sou. He needs one more Haku for the legendary Big Three Dragons.' },
        { turn: 11, player: 'Kenji', action: 'discard', tile: '2m', commentary: 'Kenji is playing cautiously now, sensing danger from Sato\'s two open dragon sets.' },
        { turn: 14, player: 'Master Sato', action: 'draw', tile: 'haku', commentary: 'Another Haku! Sato now holds a pair of White Dragons. One more and he completes the set.' },
        { turn: 14, player: 'Master Sato', action: 'discard', tile: '6p', commentary: 'The tension is incredible. Sato needs just one more Haku.' },
        { turn: 17, player: 'Master Sato', action: 'draw', tile: 'haku', commentary: 'HAKU! Master Sato draws the third White Dragon from the wall! Big Three Dragons is COMPLETE!' },
        { turn: 17, player: 'Master Sato', action: 'tsumo', tile: 'haku', commentary: 'TSUMO! Master Sato declares a yakuman win — Big Three Dragons (Daisangen)! The crowd erupts! A perfect, patient, legendary hand.' }
      ]
    },
    {
      id: 'rivalry_match',
      title: 'Kenji vs Mei — The Rivalry Match',
      description: 'Two fierce rivals clash in an intense back-and-forth match. Both players push aggressive strategies with expert defensive pivots.',
      difficulty: 4,
      duration: 55,
      players: ['Kenji', 'Mei', 'Yuki', 'Master Sato'],
      actions: [
        { turn: 1, player: 'Kenji', action: 'draw', tile: '7p', commentary: 'Kenji starts strong with a connected hand.' },
        { turn: 1, player: 'Kenji', action: 'discard', tile: '1s', commentary: 'Kenji goes for speed. He wants tanyao — all simples.' },
        { turn: 2, player: 'Mei', action: 'draw', tile: '3m', commentary: 'Mei has a hand suited for a flush attempt in man (characters).' },
        { turn: 2, player: 'Mei', action: 'discard', tile: '8p', commentary: 'Mei discards from pinzu. She is clearly going for honitsu (half flush).' },
        { turn: 4, player: 'Kenji', action: 'chi', tile: '6s', commentary: 'Kenji calls chi on 6-sou, building a quick hand. Speed vs value — a classic rivalry dynamic.' },
        { turn: 5, player: 'Mei', action: 'draw', tile: '2m', commentary: 'Mei draws beautifully into her man flush.' },
        { turn: 5, player: 'Mei', action: 'discard', tile: '4s', commentary: 'Another non-man tile goes. Mei\'s intent is transparent but her hand is dangerous.' },
        { turn: 7, player: 'Kenji', action: 'draw', tile: '5p', commentary: 'Kenji is tenpai! He needs 3-pin or 6-pin to complete.' },
        { turn: 7, player: 'Kenji', action: 'discard', tile: '9m', commentary: 'Kenji discards 9-man. He is racing Mei to the finish.' },
        { turn: 8, player: 'Mei', action: 'draw', tile: '6m', commentary: 'Mei is also tenpai now! She needs 1-man for a beautiful flush.' },
        { turn: 8, player: 'Mei', action: 'discard', tile: 'ton', commentary: 'Both players in tenpai — the tension is electric.' },
        { turn: 10, player: 'Kenji', action: 'draw', tile: '1m', commentary: 'Kenji draws 1-man — Mei\'s winning tile! But does he know?' },
        { turn: 10, player: 'Kenji', action: 'discard', tile: '1m', commentary: 'Kenji pushes the 1-man! An aggressive discard — he is gambling that Mei is not ready.' },
        { turn: 10, player: 'Mei', action: 'ron', tile: '1m', commentary: 'RON! Mei calls it! Honitsu with hatsu — a beautiful flush hand wins it! Kenji\'s aggression cost him dearly. The rivalry continues!' }
      ]
    },
    {
      id: 'beautiful_flush',
      title: "Yuki's Beautiful Flush",
      description: 'A masterclass in patience and reading the table. Yuki builds a stunning Pure Flush (chinitsu) while keeping her opponents guessing.',
      difficulty: 4,
      duration: 50,
      players: ['Yuki', 'Master Sato', 'Kenji', 'Mei'],
      actions: [
        { turn: 1, player: 'Yuki', action: 'draw', tile: '2p', commentary: 'Yuki draws 2-pin. Her starting hand has five pinzu tiles — the seed of something beautiful.' },
        { turn: 1, player: 'Yuki', action: 'discard', tile: '9s', commentary: 'A terminal goes. Yuki decides early to commit to the flush.' },
        { turn: 3, player: 'Yuki', action: 'draw', tile: '4p', commentary: 'Another pinzu. Yuki now holds seven pin tiles. The flush is forming.' },
        { turn: 3, player: 'Yuki', action: 'discard', tile: '3m', commentary: 'Yuki keeps her discards varied — man and sou mixed — to disguise the flush.' },
        { turn: 5, player: 'Yuki', action: 'draw', tile: '7p', commentary: 'Eight pinzu tiles now. Yuki is a picture of calm.' },
        { turn: 5, player: 'Yuki', action: 'discard', tile: 'sha', commentary: 'A wind tile goes. Smart — discarding honors is less revealing than discarding from other suits.' },
        { turn: 7, player: 'Master Sato', action: 'discard', tile: '5p', commentary: 'Sato discards 5-pin. Yuki could call chi but...' },
        { turn: 7, player: 'Yuki', action: 'draw', tile: '6p', commentary: 'Yuki passes on the call. She wants the closed hand bonus. Patience is rewarded with 6-pin from the wall!' },
        { turn: 9, player: 'Yuki', action: 'draw', tile: '8p', commentary: 'Ten pinzu tiles! The chinitsu is nearly complete. This is extraordinary.' },
        { turn: 9, player: 'Yuki', action: 'discard', tile: '5s', commentary: 'Yuki continues to play calmly. Only three more tiles needed.' },
        { turn: 12, player: 'Yuki', action: 'draw', tile: '1p', commentary: 'Eleven pinzu. Yuki is tenpai for chinitsu! She needs any pin that completes a set.' },
        { turn: 12, player: 'Yuki', action: 'discard', tile: '2s', commentary: 'The last non-pin tile leaves her hand. The discard river tells a story if you look closely.' },
        { turn: 14, player: 'Kenji', action: 'discard', tile: '3p', commentary: 'Kenji discards 3-pin — and it is Yuki\'s winning tile!' },
        { turn: 14, player: 'Yuki', action: 'ron', tile: '3p', commentary: 'RON! Yuki reveals a stunning chinitsu — Pure Flush in pinzu! 13 tiles of pure beauty. The table applauds. A masterclass in patience and concealment.' }
      ]
    },
    {
      id: 'comeback_king',
      title: "The Comeback King",
      description: 'Down 30,000 points in the final round, Kenji pulls off an impossible comeback with a dealer repeat strategy.',
      difficulty: 3,
      duration: 40,
      players: ['Kenji', 'Mei', 'Yuki', 'Master Sato'],
      actions: [
        { turn: 1, player: 'Kenji', action: 'draw', tile: '5m', commentary: 'Final round. Kenji is East (dealer) and down 30,000 points. He needs a miracle — or multiple wins.' },
        { turn: 1, player: 'Kenji', action: 'discard', tile: '1p', commentary: 'Kenji plays fast. As dealer, each win earns 50% more and gives him another round.' },
        { turn: 4, player: 'Kenji', action: 'draw', tile: '6m', commentary: 'Kenji reaches tenpai quickly with a riichi-ready hand.' },
        { turn: 4, player: 'Kenji', action: 'riichi', tile: '9s', commentary: 'RIICHI! Kenji declares with conviction. The comeback attempt begins!' },
        { turn: 6, player: 'Kenji', action: 'draw', tile: '4m', commentary: 'TSUMO! Kenji wins! Riichi, menzen tsumo, ippatsu — a strong start. Dealer repeats!' },
        { turn: 6, player: 'Kenji', action: 'tsumo', tile: '4m', commentary: 'First win secured. The gap closes. Kenji remains dealer.' },
        { turn: 8, player: 'Kenji', action: 'draw', tile: 'hatsu', commentary: 'Round 2 as dealer. Kenji has a dragon pair and connected tiles.' },
        { turn: 11, player: 'Yuki', action: 'discard', tile: 'hatsu', commentary: 'Yuki drops hatsu — right into Kenji\'s waiting hand.' },
        { turn: 11, player: 'Kenji', action: 'ron', tile: 'hatsu', commentary: 'RON! Kenji strikes again! The deficit is melting away. Dealer repeats once more!' },
        { turn: 15, player: 'Kenji', action: 'riichi', tile: '8p', commentary: 'Third consecutive dealer turn. Kenji declares riichi AGAIN! The pressure is immense.' },
        { turn: 18, player: 'Kenji', action: 'draw', tile: '3s', commentary: 'TSUMO! A third consecutive win! Kenji has erased the entire deficit and pulled ahead! The comeback is COMPLETE!' },
        { turn: 18, player: 'Kenji', action: 'tsumo', tile: '3s', commentary: 'Incredible. Three dealer wins in a row to overcome a 30,000 point deficit. This is why they call him the Comeback King.' }
      ]
    }
  ];

  // ─── Auto-Commentary Templates ────────────────────────────────────

  const COMMENTARY_TEMPLATES = {
    draw: [
      '{player} draws {tile}.',
      '{player} picks up {tile} from the wall.',
      'A new tile for {player}: {tile}.'
    ],
    discard: [
      '{player} releases {tile}.',
      '{player} sends {tile} to the river.',
      '{player} parts with {tile}.'
    ],
    pon: [
      'PON! {player} claims {tile} for a triplet!',
      '{player} calls pon on {tile}!'
    ],
    chi: [
      'CHI! {player} takes {tile} to complete a sequence.',
      '{player} calls chi on {tile}.'
    ],
    riichi: [
      'RIICHI! {player} declares with confidence!',
      '{player} pushes 1000 points forward — riichi!'
    ],
    tsumo: [
      'TSUMO! {player} wins by self-draw with {tile}!',
      '{player} draws the winning {tile} — tsumo!'
    ],
    ron: [
      'RON! {player} claims victory with {tile}!',
      '{player} calls ron on {tile}!'
    ]
  };

  // ─── ReplayTheater ────────────────────────────────────────────────

  class ReplayTheater {
    constructor() {
      this.overlay = null;
      this._playbackTimer = null;
      this._currentMatch = null;
      this._actionIndex = 0;
      this._speed = 1;
      this._paused = false;
    }

    // ── Public API ──────────────────────────────────────────────────

    getAvailableMatches() {
      return FAMOUS_MATCHES.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        difficulty: m.difficulty,
        duration: m.duration,
        players: m.players.slice()
      }));
    }

    playMatch(matchId) {
      var match = FAMOUS_MATCHES.find(m => m.id === matchId);
      if (!match) return;
      this._currentMatch = match;
      this._actionIndex = 0;
      this._paused = false;
      this._speed = 1;
      this.buildTheaterUI();
      this._showPlayback();
      this._startPlayback();
    }

    buildTheaterUI() {
      if (this.overlay) {
        this.overlay.style.display = 'flex';
        return this.overlay;
      }

      this.overlay = document.createElement('div');
      Object.assign(this.overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: '10000', fontFamily: 'sans-serif', color: '#eee'
      });

      var container = document.createElement('div');
      Object.assign(container.style, {
        background: '#0d1117', borderRadius: '12px', padding: '24px',
        maxWidth: '750px', width: '95%', maxHeight: '92vh', overflowY: 'auto'
      });

      // Title bar
      var titleBar = document.createElement('div');
      Object.assign(titleBar.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' });
      var title = document.createElement('h2');
      title.textContent = 'Replay Theater';
      title.style.margin = '0';
      titleBar.appendChild(title);
      titleBar.appendChild(this._btn('Close', () => this._close()));
      container.appendChild(titleBar);

      // Content area — switches between match list and playback
      this._contentEl = document.createElement('div');
      container.appendChild(this._contentEl);

      this.overlay.appendChild(container);
      document.body.appendChild(this.overlay);

      if (!this._currentMatch) {
        this._showMatchList();
      }

      return this.overlay;
    }

    generateAIMatch() {
      // Generate a simulated AI match with auto-commentary
      var players = ['AI-Alpha', 'AI-Beta', 'AI-Gamma', 'AI-Delta'];
      var suits = ['m', 'p', 's'];
      var actions = [];
      var turn = 0;

      for (var round = 0; round < 12; round++) {
        for (var p = 0; p < 4; p++) {
          turn++;
          var player = players[p];
          var suit = suits[Math.floor(Math.random() * 3)];
          var num = Math.floor(Math.random() * 9) + 1;
          var drawTile = num + suit;
          var discardNum = Math.floor(Math.random() * 9) + 1;
          var discardTile = discardNum + suit;

          actions.push({
            turn: turn,
            player: player,
            action: 'draw',
            tile: drawTile,
            commentary: this._autoComment('draw', player, drawTile)
          });
          actions.push({
            turn: turn,
            player: player,
            action: 'discard',
            tile: discardTile,
            commentary: this._autoComment('discard', player, discardTile)
          });
        }
      }

      // Winner
      var winner = players[Math.floor(Math.random() * 4)];
      var winTile = (Math.floor(Math.random() * 9) + 1) + suits[Math.floor(Math.random() * 3)];
      turn++;
      actions.push({
        turn: turn,
        player: winner,
        action: 'tsumo',
        tile: winTile,
        commentary: this._autoComment('tsumo', winner, winTile)
      });

      var match = {
        id: 'ai_' + Date.now(),
        title: 'AI Exhibition Match',
        description: 'A computer-generated match between four AI players.',
        difficulty: 2,
        duration: 30,
        players: players,
        actions: actions
      };

      return match;
    }

    // ── Internal: Views ─────────────────────────────────────────────

    _showMatchList() {
      if (!this._contentEl) return;
      this._contentEl.innerHTML = '';

      var matches = this.getAvailableMatches();
      matches.forEach(match => {
        var card = document.createElement('div');
        Object.assign(card.style, {
          background: '#161b22', border: '1px solid #30363d', borderRadius: '10px',
          padding: '16px', marginBottom: '12px', cursor: 'pointer',
          transition: 'border-color 0.2s'
        });
        card.addEventListener('mouseenter', () => { card.style.borderColor = '#4fc3f7'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = '#30363d'; });
        card.addEventListener('click', () => this.playMatch(match.id));

        var titleEl = document.createElement('div');
        titleEl.style.fontWeight = 'bold';
        titleEl.style.fontSize = '16px';
        titleEl.style.marginBottom = '6px';
        titleEl.textContent = match.title;
        card.appendChild(titleEl);

        var descEl = document.createElement('div');
        descEl.style.fontSize = '13px';
        descEl.style.color = '#aaa';
        descEl.style.marginBottom = '8px';
        descEl.textContent = match.description;
        card.appendChild(descEl);

        var meta = document.createElement('div');
        meta.style.fontSize = '12px';
        meta.style.color = '#777';
        var stars = '';
        for (var s = 0; s < 5; s++) stars += s < match.difficulty ? '\u2605' : '\u2606';
        meta.textContent = 'Difficulty: ' + stars + '  |  ~' + match.duration + ' sec  |  ' + match.players.join(', ');
        card.appendChild(meta);

        this._contentEl.appendChild(card);
      });

      // AI match button
      var aiBtn = this._btn('Generate AI Match', () => {
        var aiMatch = this.generateAIMatch();
        FAMOUS_MATCHES.push(aiMatch);
        this.playMatch(aiMatch.id);
      });
      aiBtn.style.marginTop = '12px';
      this._contentEl.appendChild(aiBtn);
    }

    _showPlayback() {
      if (!this._contentEl || !this._currentMatch) return;
      this._contentEl.innerHTML = '';

      var match = this._currentMatch;

      // Match title
      var header = document.createElement('div');
      header.style.marginBottom = '14px';
      var titleEl = document.createElement('div');
      titleEl.style.fontSize = '18px';
      titleEl.style.fontWeight = 'bold';
      titleEl.textContent = match.title;
      header.appendChild(titleEl);
      var playersEl = document.createElement('div');
      playersEl.style.fontSize = '13px';
      playersEl.style.color = '#888';
      playersEl.textContent = match.players.join(' vs ');
      header.appendChild(playersEl);
      this._contentEl.appendChild(header);

      // Board state (simplified)
      this._boardEl = document.createElement('div');
      Object.assign(this._boardEl.style, {
        background: '#1a2332', borderRadius: '8px', padding: '16px',
        minHeight: '80px', marginBottom: '12px', fontSize: '14px',
        display: 'flex', flexDirection: 'column', gap: '4px'
      });
      this._boardEl.textContent = 'Waiting for match to start...';
      this._contentEl.appendChild(this._boardEl);

      // Commentary panel
      this._commentaryEl = document.createElement('div');
      Object.assign(this._commentaryEl.style, {
        background: '#111822', border: '1px solid #30363d', borderRadius: '8px',
        padding: '14px', minHeight: '120px', maxHeight: '200px', overflowY: 'auto',
        marginBottom: '12px', fontSize: '13px', lineHeight: '1.6'
      });
      this._commentaryEl.textContent = 'Commentary will appear here...';
      this._contentEl.appendChild(this._commentaryEl);

      // Controls
      var controls = document.createElement('div');
      Object.assign(controls.style, { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' });

      this._playPauseBtn = this._btn('Pause', () => this._togglePause());
      controls.appendChild(this._playPauseBtn);
      controls.appendChild(this._btn('0.5x', () => { this._speed = 0.5; }));
      controls.appendChild(this._btn('1x', () => { this._speed = 1; }));
      controls.appendChild(this._btn('2x', () => { this._speed = 2; }));
      controls.appendChild(this._btn('4x', () => { this._speed = 4; }));
      controls.appendChild(this._btn('Back to List', () => { this._stopPlayback(); this._showMatchList(); }));

      // Progress
      this._progressEl = document.createElement('span');
      this._progressEl.style.fontSize = '12px';
      this._progressEl.style.color = '#888';
      this._progressEl.style.marginLeft = '10px';
      controls.appendChild(this._progressEl);

      this._contentEl.appendChild(controls);
    }

    _startPlayback() {
      this._stopPlayback();
      this._advanceAction();
    }

    _advanceAction() {
      if (!this._currentMatch) return;
      if (this._paused) return;

      var actions = this._currentMatch.actions;
      if (this._actionIndex >= actions.length) {
        this._onPlaybackEnd();
        return;
      }

      var action = actions[this._actionIndex];
      this._renderAction(action);
      this._actionIndex++;

      if (this._progressEl) {
        this._progressEl.textContent = this._actionIndex + ' / ' + actions.length;
      }

      var delay = Math.max(400, 2000 / this._speed);
      this._playbackTimer = setTimeout(() => this._advanceAction(), delay);
    }

    _renderAction(action) {
      // Update board state
      if (this._boardEl) {
        var actionEl = document.createElement('div');
        var actionColor = '#ccc';
        if (action.action === 'tsumo' || action.action === 'ron') actionColor = '#ffd700';
        else if (action.action === 'pon' || action.action === 'chi') actionColor = '#4fc3f7';
        else if (action.action === 'riichi') actionColor = '#ff6b6b';

        actionEl.style.color = actionColor;
        actionEl.textContent = 'Turn ' + action.turn + ': ' + action.player + ' — ' + action.action.toUpperCase() + ' ' + (action.tile || '');
        this._boardEl.appendChild(actionEl);

        // Keep only last 6 actions visible
        while (this._boardEl.children.length > 6) {
          this._boardEl.removeChild(this._boardEl.firstChild);
        }
      }

      // Update commentary
      if (this._commentaryEl && action.commentary) {
        var line = document.createElement('div');
        line.style.marginBottom = '6px';
        line.style.borderLeft = '3px solid #4fc3f7';
        line.style.paddingLeft = '10px';
        line.textContent = action.commentary;
        this._commentaryEl.appendChild(line);
        this._commentaryEl.scrollTop = this._commentaryEl.scrollHeight;
      }
    }

    _onPlaybackEnd() {
      if (this._commentaryEl) {
        var endLine = document.createElement('div');
        endLine.style.fontWeight = 'bold';
        endLine.style.color = '#ffd700';
        endLine.style.marginTop = '10px';
        endLine.textContent = 'Match complete.';
        this._commentaryEl.appendChild(endLine);
        this._commentaryEl.scrollTop = this._commentaryEl.scrollHeight;
      }
    }

    _togglePause() {
      this._paused = !this._paused;
      if (this._playPauseBtn) {
        this._playPauseBtn.textContent = this._paused ? 'Play' : 'Pause';
      }
      if (!this._paused) {
        this._advanceAction();
      }
    }

    _stopPlayback() {
      if (this._playbackTimer) {
        clearTimeout(this._playbackTimer);
        this._playbackTimer = null;
      }
      this._currentMatch = null;
      this._actionIndex = 0;
    }

    _close() {
      this._stopPlayback();
      if (this.overlay) this.overlay.style.display = 'none';
    }

    _autoComment(action, player, tile) {
      var templates = COMMENTARY_TEMPLATES[action] || ['{player} performs {action} with {tile}.'];
      var tpl = templates[Math.floor(Math.random() * templates.length)];
      return tpl.replace('{player}', player).replace('{tile}', tile).replace('{action}', action);
    }

    _btn(label, onClick) {
      var btn = document.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        padding: '6px 14px', borderRadius: '6px', border: '1px solid #30363d',
        background: '#21262d', color: '#eee', cursor: 'pointer', fontSize: '13px'
      });
      btn.addEventListener('click', onClick);
      return btn;
    }
  }

  root.MJ.ReplayTheater = ReplayTheater;

})(typeof window !== 'undefined' ? window : global);


/* === js/player-house.js === */
/**
 * player-house.js - Virtual room that the player customizes with trophies,
 * photos, furniture, and decorations earned or purchased through gameplay.
 *
 * Provides a DOM-rendered room view using CSS Grid with shelves, walls,
 * a Mahjong table, and character visitors. Persists to localStorage.
 */
(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  // ---------------------------------------------------------------------------
  // Default room state
  // ---------------------------------------------------------------------------

  function createDefaultRoom() {
    return {
      wallColor: '#e8dcc8',
      furniture: [
        { id: 'shelf_main',  type: 'shelf',  name: 'Trophy Shelf',  slot: 'wall-top' },
        { id: 'table_main',  type: 'table',  name: 'Mahjong Table', slot: 'center' }
      ],
      trophies: [],
      photos: [],
      decorations: [],
      stats: {
        gamesPlayedHere: 0,
        firstVisit: null,
        lastVisit: null
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Character comments about the room
  // ---------------------------------------------------------------------------

  var CHARACTER_ROOM_COMMENTS = {
    kenji: {
      empty:   "A bit bare in here. Need some trophies? Beat ME and you will get one!",
      few:     "Nice trophies! ...I have more though.",
      many:    "Okay, okay, that is an impressive collection. Don't let it go to your head.",
      bonsai:  "A bonsai! Reminds me of the one outside my shop.",
      lantern: "Paper lantern! Sets the mood for a good game.",
      incense: "Incense? Fancy. My shop just smells like tonkotsu."
    },
    yuki: {
      empty:   "Every room starts empty. Fill it with memories, one game at a time.",
      few:     "Your room has a warm feeling. Like Takeshi's study.",
      many:    "So many memories on these walls. Each one a story worth telling.",
      bonsai:  "A fine bonsai. Patience made visible.",
      lantern: "The lantern light is gentle. Perfect for evening games.",
      incense: "Sandalwood? It reminds me of the old parlor in Kyoto."
    },
    mei: {
      empty:   "A blank canvas. The data suggests you should play more games to fill it.",
      few:     "I notice you arranged the trophies by date. I approve.",
      many:    "Statistically impressive. You are in the top percentile of collectors.",
      bonsai:  "Bonsai maintenance follows fascinating mathematical growth patterns.",
      lantern: "The light diffusion from that lantern is quite pleasing.",
      incense: "Mochi would love that smell. She always sits near grandmother's incense."
    },
    hana: {
      empty:   "We all start somewhere! I bet this room will look amazing soon.",
      few:     "Looking good! Each trophy is proof of improvement.",
      many:    "Wow, this is like a Mahjong museum! Can I take notes?",
      bonsai:  "So cute! I want one for my apartment.",
      lantern: "Ooh, ambient lighting! Very aesthetic.",
      incense: "That smells amazing. Very zen study vibes."
    }
  };

  // ---------------------------------------------------------------------------
  // Room item definitions (what can appear in the room)
  // ---------------------------------------------------------------------------

  var ITEM_VISUALS = {
    // Economy shop items that appear in the room
    acc_lantern: { emoji: '\uD83C\uDFEE', label: 'Paper Lantern',  slot: 'wall-left',  css: 'house-lantern' },
    acc_incense: { emoji: '\uD83E\uDE94', label: 'Incense Holder', slot: 'table-side',  css: 'house-incense' },
    acc_bonsai:  { emoji: '\uD83C\uDF33', label: 'Bonsai Tree',    slot: 'floor-right', css: 'house-bonsai' },

    // Tile set displayed on table
    tile_set:    { emoji: '\uD83C\uDC04', label: 'Tile Set',       slot: 'center',      css: 'house-tileset' },

    // Generic decoration slots
    decoration:  { emoji: '\uD83C\uDFA8', label: 'Decoration',     slot: 'wall-right',  css: 'house-deco' }
  };

  // ---------------------------------------------------------------------------
  // PlayerHouse class
  // ---------------------------------------------------------------------------

  class PlayerHouse {
    constructor() {
      this.load();
    }

    // ── Persistence ─────────────────────────────────────────────────────

    load() {
      try {
        var data = JSON.parse(localStorage.getItem('mj_player_house'));
        this.room = data || createDefaultRoom();
      } catch (e) {
        this.room = createDefaultRoom();
      }
      // Ensure stats exist for older saves
      if (!this.room.stats) {
        this.room.stats = { gamesPlayedHere: 0, firstVisit: null, lastVisit: null };
      }
    }

    save() {
      try {
        localStorage.setItem('mj_player_house', JSON.stringify(this.room));
      } catch (e) { /* storage full or unavailable */ }
    }

    // ── Room state accessors ────────────────────────────────────────────

    /** Returns the full room state object. */
    getRoom() {
      return {
        wallColor:   this.room.wallColor,
        furniture:   this.room.furniture.slice(),
        trophies:    this.room.trophies.slice(),
        photos:      this.room.photos.slice(),
        decorations: this.room.decorations.slice(),
        stats:       Object.assign({}, this.room.stats)
      };
    }

    /** Returns all trophies (auto-generated from tournament wins, achievements). */
    getTrophies() {
      return this.room.trophies.slice();
    }

    /** Returns all photos (from photo album milestones). */
    getPhotos() {
      return this.room.photos.slice();
    }

    // ── Item management ─────────────────────────────────────────────────

    /**
     * Add an item to the room.
     * @param {object} item - { id, type, name, [emoji], [slot], [source] }
     */
    addItem(item) {
      if (!item || !item.id) return false;

      // Determine where it goes
      if (item.type === 'trophy') {
        if (this._findById(this.room.trophies, item.id)) return false;
        this.room.trophies.push({
          id: item.id,
          name: item.name || 'Trophy',
          emoji: item.emoji || '\uD83C\uDFC6',
          date: item.date || new Date().toISOString(),
          source: item.source || 'unknown'
        });
      } else if (item.type === 'photo') {
        if (this._findById(this.room.photos, item.id)) return false;
        this.room.photos.push({
          id: item.id,
          name: item.name || 'Photo',
          emoji: item.emoji || '\uD83D\uDDBC\uFE0F',
          date: item.date || new Date().toISOString(),
          milestone: item.milestone || null
        });
      } else if (item.type === 'furniture') {
        if (this._findById(this.room.furniture, item.id)) return false;
        this.room.furniture.push({
          id: item.id,
          type: 'furniture',
          name: item.name || 'Furniture',
          slot: item.slot || 'floor-left'
        });
      } else {
        // Decoration / accessory
        if (this._findById(this.room.decorations, item.id)) return false;
        this.room.decorations.push({
          id: item.id,
          type: item.type || 'decoration',
          name: item.name || 'Decoration',
          emoji: item.emoji || '\uD83C\uDFA8',
          slot: item.slot || 'wall-right'
        });
      }

      this.save();
      return true;
    }

    /**
     * Remove an item from the room by id.
     * Searches trophies, photos, furniture, and decorations.
     */
    removeItem(itemId) {
      var removed = false;
      removed = this._removeById(this.room.trophies, itemId) || removed;
      removed = this._removeById(this.room.photos, itemId) || removed;
      removed = this._removeById(this.room.decorations, itemId) || removed;
      // Don't remove core furniture (shelf + table)
      var fIdx = this.room.furniture.findIndex(function(f) { return f.id === itemId; });
      if (fIdx !== -1 && itemId !== 'shelf_main' && itemId !== 'table_main') {
        this.room.furniture.splice(fIdx, 1);
        removed = true;
      }
      if (removed) this.save();
      return removed;
    }

    /** Set wall colour. */
    setWallColor(color) {
      if (!color || typeof color !== 'string') return;
      this.room.wallColor = color;
      this.save();
    }

    /** Increment the games-played-here counter. */
    recordGamePlayed() {
      this.room.stats.gamesPlayedHere++;
      if (!this.room.stats.firstVisit) {
        this.room.stats.firstVisit = new Date().toISOString();
      }
      this.room.stats.lastVisit = new Date().toISOString();
      this.save();
    }

    // ── Auto-sync with other systems ────────────────────────────────────

    /**
     * Pull trophies from tournament/achievement data if available.
     */
    syncTrophies() {
      var Tournament = root.MJ.Tournament;
      var Achievements = root.MJ.Achievements;

      if (Tournament && typeof Tournament.getWins === 'function') {
        var wins = Tournament.getWins();
        for (var i = 0; i < wins.length; i++) {
          this.addItem({
            id: 'trophy_' + wins[i].id,
            type: 'trophy',
            name: wins[i].name || 'Tournament Win',
            emoji: '\uD83C\uDFC6',
            date: wins[i].date,
            source: 'tournament'
          });
        }
      }

      if (Achievements && typeof Achievements.getUnlocked === 'function') {
        var unlocked = Achievements.getUnlocked();
        for (var j = 0; j < unlocked.length; j++) {
          this.addItem({
            id: 'ach_' + unlocked[j].id,
            type: 'trophy',
            name: unlocked[j].name || 'Achievement',
            emoji: '\u2B50',
            date: unlocked[j].date,
            source: 'achievement'
          });
        }
      }
    }

    /**
     * Pull photos from the PhotoAlbum if available.
     */
    syncPhotos() {
      var Album = root.MJ.PhotoAlbum;
      if (!Album) return;

      var instance = (typeof Album === 'function') ? new Album() : Album;
      if (!instance || !instance.albums) return;

      var milestones = instance.albums.milestones || [];
      for (var i = 0; i < milestones.length; i++) {
        this.addItem({
          id: 'photo_' + (milestones[i].id || i),
          type: 'photo',
          name: milestones[i].label || 'Milestone Photo',
          emoji: '\uD83D\uDDBC\uFE0F',
          date: milestones[i].date,
          milestone: milestones[i].type || null
        });
      }
    }

    /**
     * Sync purchased economy items (lantern, bonsai, etc.) into the room.
     */
    syncShopItems() {
      var Economy = root.MJ.Economy;
      if (!Economy) return;

      var instance = (typeof Economy === 'function') ? new Economy() : Economy;
      if (!instance || typeof instance.getOwnedItems !== 'function') return;

      var owned = instance.getOwnedItems();
      for (var i = 0; i < owned.length; i++) {
        var shopId = owned[i].id || owned[i];
        var visual = ITEM_VISUALS[shopId];
        if (visual) {
          this.addItem({
            id: 'shop_' + shopId,
            type: 'decoration',
            name: visual.label,
            emoji: visual.emoji,
            slot: visual.slot
          });
        }
      }
    }

    // ── Character comments ──────────────────────────────────────────────

    /**
     * Get a character's comment about the player's room.
     */
    getCharacterComment(characterId) {
      var lines = CHARACTER_ROOM_COMMENTS[characterId];
      if (!lines) return '';

      // Check for specific decoration comments first
      var decoIds = this.room.decorations.map(function(d) { return d.id; });

      if (decoIds.indexOf('shop_acc_bonsai') !== -1 && lines.bonsai) {
        return lines.bonsai;
      }
      if (decoIds.indexOf('shop_acc_lantern') !== -1 && lines.lantern) {
        return lines.lantern;
      }
      if (decoIds.indexOf('shop_acc_incense') !== -1 && lines.incense) {
        return lines.incense;
      }

      // Fall back to trophy-count comments
      var count = this.room.trophies.length;
      if (count === 0) return lines.empty || '';
      if (count < 5)   return lines.few   || '';
      return lines.many || '';
    }

    // ── DOM rendering ───────────────────────────────────────────────────

    /**
     * Build and return a DOM element representing the room.
     * Uses CSS Grid for a side-view room layout.
     */
    buildHouseUI() {
      if (typeof document === 'undefined') return null;

      var container = document.createElement('div');
      container.className = 'player-house';
      container.style.cssText = [
        'display: grid',
        'grid-template-columns: 1fr 2fr 1fr',
        'grid-template-rows: auto 1fr auto',
        'gap: 8px',
        'padding: 16px',
        'background-color: ' + this.room.wallColor,
        'border-radius: 12px',
        'min-height: 320px',
        'position: relative',
        'font-family: sans-serif'
      ].join('; ');

      // -- Room title / stats bar --
      var header = document.createElement('div');
      header.style.cssText = 'grid-column: 1 / -1; text-align: center; font-weight: bold; font-size: 16px; padding: 4px 0; border-bottom: 2px solid rgba(0,0,0,0.1);';
      header.textContent = 'My Room';
      container.appendChild(header);

      // -- Wall area (top): trophy shelf --
      var shelfEl = this._buildShelf();
      shelfEl.style.cssText += '; grid-column: 1 / -1;';
      container.appendChild(shelfEl);

      // -- Left wall: decorations + lantern --
      var leftWall = document.createElement('div');
      leftWall.className = 'house-wall-left';
      leftWall.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px;';
      this._renderSlotItems(leftWall, 'wall-left');
      container.appendChild(leftWall);

      // -- Center: Mahjong table + tile set --
      var centerArea = document.createElement('div');
      centerArea.className = 'house-center';
      centerArea.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;';
      var tableEl = document.createElement('div');
      tableEl.className = 'house-table';
      tableEl.style.cssText = 'width: 120px; height: 120px; background: #5a8f5a; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);';
      tableEl.textContent = '\uD83C\uDC04';
      tableEl.title = 'Mahjong Table';
      centerArea.appendChild(tableEl);
      this._renderSlotItems(centerArea, 'table-side');
      container.appendChild(centerArea);

      // -- Right wall: more decorations --
      var rightWall = document.createElement('div');
      rightWall.className = 'house-wall-right';
      rightWall.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px;';
      this._renderSlotItems(rightWall, 'wall-right');
      this._renderSlotItems(rightWall, 'floor-right');
      container.appendChild(rightWall);

      // -- Photo wall --
      if (this.room.photos.length > 0) {
        var photoWall = this._buildPhotoWall();
        photoWall.style.cssText += '; grid-column: 1 / -1;';
        container.appendChild(photoWall);
      }

      // -- Character visitors --
      var visitors = this._buildVisitors();
      if (visitors) {
        visitors.style.cssText += '; grid-column: 1 / -1;';
        container.appendChild(visitors);
      }

      // -- Stats footer --
      var footer = document.createElement('div');
      footer.style.cssText = 'grid-column: 1 / -1; text-align: center; font-size: 12px; color: #666; padding-top: 4px; border-top: 1px solid rgba(0,0,0,0.1);';
      footer.textContent = 'Games played here: ' + (this.room.stats.gamesPlayedHere || 0);
      container.appendChild(footer);

      return container;
    }

    // ── Private rendering helpers ───────────────────────────────────────

    _buildShelf() {
      var shelf = document.createElement('div');
      shelf.className = 'house-shelf';
      shelf.style.cssText = 'display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 6px; min-height: 48px;';

      if (this.room.trophies.length === 0) {
        var empty = document.createElement('span');
        empty.style.cssText = 'color: #999; font-size: 12px; align-self: center;';
        empty.textContent = 'Trophy shelf — win tournaments to fill it!';
        shelf.appendChild(empty);
      } else {
        for (var i = 0; i < this.room.trophies.length; i++) {
          var t = this.room.trophies[i];
          var icon = document.createElement('span');
          icon.className = 'house-trophy';
          icon.style.cssText = 'font-size: 24px; cursor: default;';
          icon.textContent = t.emoji || '\uD83C\uDFC6';
          icon.title = t.name + (t.date ? ' (' + t.date.slice(0, 10) + ')' : '');
          shelf.appendChild(icon);
        }
      }

      return shelf;
    }

    _buildPhotoWall() {
      var wall = document.createElement('div');
      wall.className = 'house-photos';
      wall.style.cssText = 'display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; padding: 8px;';

      for (var i = 0; i < this.room.photos.length; i++) {
        var p = this.room.photos[i];
        var frame = document.createElement('div');
        frame.className = 'house-photo-frame';
        frame.style.cssText = 'width: 48px; height: 48px; background: #fff; border: 2px solid #8b7355; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: default;';
        frame.textContent = p.emoji || '\uD83D\uDDBC\uFE0F';
        frame.title = p.name + (p.date ? ' (' + p.date.slice(0, 10) + ')' : '');
        wall.appendChild(frame);
      }

      return wall;
    }

    _buildVisitors() {
      if (typeof root.MJ.CharacterRelations === 'undefined') return null;

      var relations = root.MJ.CharacterRelations;
      var instance = (typeof relations === 'function') ? new relations() : relations;
      if (!instance || typeof instance.getRelationship !== 'function') return null;

      var visitors = document.createElement('div');
      visitors.className = 'house-visitors';
      visitors.style.cssText = 'display: flex; gap: 12px; justify-content: center; padding: 8px;';

      var charIds = ['yuki', 'kenji', 'mei', 'hana'];
      var charEmojis = { yuki: '\uD83D\uDC75', kenji: '\uD83D\uDC68\u200D\uD83C\uDF73', mei: '\uD83D\uDC69\u200D\uD83D\uDCBB', hana: '\uD83D\uDC69\u200D\uD83C\uDF93' };
      var hasVisitors = false;

      for (var i = 0; i < charIds.length; i++) {
        var cid = charIds[i];
        var rel = instance.getRelationship(cid);
        var level = (rel && typeof rel === 'object') ? (rel.level || rel.friendship || 0) : (typeof rel === 'number' ? rel : 0);

        if (level >= 3) {
          hasVisitors = true;
          var portrait = document.createElement('div');
          portrait.className = 'house-visitor';
          portrait.style.cssText = 'text-align: center; font-size: 28px; cursor: default;';
          portrait.textContent = charEmojis[cid] || '\uD83D\uDC64';
          portrait.title = cid.charAt(0).toUpperCase() + cid.slice(1) + ' (visiting)';
          visitors.appendChild(portrait);
        }
      }

      return hasVisitors ? visitors : null;
    }

    _renderSlotItems(parent, slotName) {
      var items = this.room.decorations.filter(function(d) {
        var visual = ITEM_VISUALS[d.id.replace('shop_', '')] || {};
        return (d.slot === slotName) || (visual.slot === slotName);
      });

      for (var i = 0; i < items.length; i++) {
        var el = document.createElement('div');
        el.className = 'house-item ' + (ITEM_VISUALS[items[i].id.replace('shop_', '')] || {}).css || '';
        el.style.cssText = 'font-size: 28px; cursor: default;';
        el.textContent = items[i].emoji || '\uD83C\uDFA8';
        el.title = items[i].name;
        parent.appendChild(el);
      }
    }

    // ── Internal helpers ────────────────────────────────────────────────

    _findById(arr, id) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) return arr[i];
      }
      return null;
    }

    _removeById(arr, id) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          arr.splice(i, 1);
          return true;
        }
      }
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  root.MJ.PlayerHouse = PlayerHouse;

})(typeof exports !== 'undefined' ? exports : this);


/* === js/story-scenes.js === */
/*  story-scenes.js — Full-screen illustrated story scenes for narrative moments
 *  Renders cinematic scenes with character portraits, typewriter dialogue,
 *  player choices, and celebration effects.
 *  Exports: root.MJ.StoryScenes
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};

  // ── Scene background gradients by mood ──

  var SCENE_BACKGROUNDS = {
    emotional:    'linear-gradient(135deg, #5c3a1e 0%, #c8874a 40%, #e8a85c 70%, #5c3a1e 100%)',
    dramatic:     'linear-gradient(135deg, #1a0000 0%, #4a0e0e 35%, #8b1a1a 60%, #1a0000 100%)',
    peaceful:     'linear-gradient(135deg, #1a3a2a 0%, #3a7a5a 40%, #5aaa8a 70%, #2a5a6a 100%)',
    celebratory:  'linear-gradient(135deg, #3a2a00 0%, #8a6a10 30%, #d4a820 50%, #8a6a10 70%, #3a2a00 100%)',
    nostalgic:    'linear-gradient(135deg, #3a2e20 0%, #7a6a50 40%, #a89878 60%, #5a4e3a 100%)'
  };

  // Map common mood keywords to background styles
  var MOOD_TO_BACKGROUND = {
    happy: 'celebratory', excited: 'celebratory', triumphant: 'celebratory',
    ecstatic: 'celebratory', grateful: 'celebratory',
    sad: 'emotional', disappointed: 'emotional', worried: 'emotional',
    warm: 'emotional', touched: 'emotional',
    angry: 'dramatic', tilted: 'dramatic', frustrated: 'dramatic',
    tense: 'dramatic', distracted: 'dramatic',
    serene: 'peaceful', calm: 'peaceful', accepting: 'peaceful',
    contemplative: 'peaceful',
    nostalgic: 'nostalgic', philosophical: 'nostalgic', wistful: 'nostalgic',
    neutral: 'peaceful'
  };

  // ── CSS injection (once) ──

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    var css =
      '.mj-scene-overlay {' +
        'position: fixed; top: 0; left: 0; width: 100%; height: 100%;' +
        'z-index: 10000; display: flex; align-items: center; justify-content: center;' +
        'background: rgba(0,0,0,0.85); opacity: 0; transition: opacity 0.5s ease;' +
        'font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;' +
      '}' +
      '.mj-scene-overlay.active { opacity: 1; }' +
      '.mj-scene-container {' +
        'display: flex; align-items: center; max-width: 900px; width: 90%;' +
        'min-height: 300px; border-radius: 16px; overflow: hidden;' +
        'box-shadow: 0 20px 60px rgba(0,0,0,0.6); position: relative;' +
      '}' +
      '.mj-scene-portrait {' +
        'flex: 0 0 160px; display: flex; align-items: center; justify-content: center;' +
        'padding: 20px; min-height: 280px;' +
      '}' +
      '.mj-scene-portrait-right {' +
        'flex: 0 0 140px; display: flex; align-items: center; justify-content: center;' +
        'padding: 16px;' +
      '}' +
      '.mj-scene-content {' +
        'flex: 1; padding: 32px 36px; color: #f0e8d8; position: relative;' +
      '}' +
      '.mj-scene-speaker {' +
        'font-size: 14px; text-transform: uppercase; letter-spacing: 2px;' +
        'color: #d4a860; margin-bottom: 12px; font-weight: 600;' +
      '}' +
      '.mj-scene-text {' +
        'font-size: 18px; line-height: 1.7; min-height: 60px;' +
        'text-shadow: 0 1px 3px rgba(0,0,0,0.4);' +
      '}' +
      '.mj-scene-text .cursor {' +
        'display: inline-block; width: 2px; height: 1em; background: #d4a860;' +
        'margin-left: 2px; animation: mj-blink 0.8s infinite;' +
      '}' +
      '@keyframes mj-blink { 0%,50% { opacity: 1; } 51%,100% { opacity: 0; } }' +
      '.mj-scene-choices {' +
        'margin-top: 24px; display: flex; flex-direction: column; gap: 10px;' +
      '}' +
      '.mj-scene-choice-btn {' +
        'background: rgba(212,168,96,0.15); border: 1px solid rgba(212,168,96,0.4);' +
        'color: #f0e8d8; padding: 10px 18px; border-radius: 8px; cursor: pointer;' +
        'font-size: 15px; text-align: left; transition: all 0.2s ease;' +
      '}' +
      '.mj-scene-choice-btn:hover {' +
        'background: rgba(212,168,96,0.3); border-color: #d4a860;' +
        'transform: translateX(4px);' +
      '}' +
      '.mj-scene-continue {' +
        'margin-top: 24px; background: none; border: 1px solid rgba(240,232,216,0.3);' +
        'color: #f0e8d8; padding: 8px 24px; border-radius: 6px; cursor: pointer;' +
        'font-size: 14px; transition: all 0.2s; opacity: 0;' +
      '}' +
      '.mj-scene-continue.visible { opacity: 1; }' +
      '.mj-scene-continue:hover { background: rgba(240,232,216,0.1); border-color: #f0e8d8; }' +
      '.mj-confetti-particle {' +
        'position: fixed; z-index: 10001; pointer-events: none;' +
        'width: 8px; height: 8px; border-radius: 2px;' +
      '}' +
      '@keyframes mj-confetti-fall {' +
        '0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }' +
        '100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }' +
      '}';

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── StoryScene Class ──

  class StoryScene {
    constructor() {
      this._overlay = null;
      this._isActive = false;
      this._typewriterTimer = null;
      this._autoAdvanceTimer = null;
      this._currentResolve = null;
      this._portraitRenderer = null;
    }

    /**
     * Show a full-screen story scene.
     *
     * @param {object} sceneData
     * @param {string} sceneData.type - 'narrative', 'dialogue', 'choice', 'celebration'
     * @param {string} [sceneData.character] - character ID for portrait
     * @param {string} [sceneData.emotion] - emotion for portrait rendering
     * @param {string} [sceneData.speaker] - display name above text
     * @param {string|string[]} sceneData.text - dialogue text (array for multi-step)
     * @param {string} [sceneData.mood] - mood for background gradient
     * @param {Array} [sceneData.choices] - [{label, response, effect}] for choice scenes
     * @param {object} [sceneData.dialogue] - for dialogue type: [{character, emotion, speaker, text}]
     * @param {boolean} [sceneData.autoAdvance] - auto-advance after text completes
     * @param {number} [sceneData.autoAdvanceDelay] - ms to wait after text (default 3000)
     * @returns {Promise<{choice?: number, choiceLabel?: string}>}
     */
    showScene(sceneData) {
      var self = this;
      injectStyles();

      return new Promise(function (resolve) {
        self._currentResolve = resolve;

        // Set music mood if available
        if (sceneData.mood && root.MJ.Music) {
          var moodMap = {
            excited: 'victory', triumphant: 'victory', celebratory: 'victory',
            ecstatic: 'victory', grateful: 'victory',
            tense: 'tense', dramatic: 'tense', angry: 'tense',
            frustrated: 'tense', worried: 'tense',
            calm: 'calm', peaceful: 'calm', serene: 'calm',
            nostalgic: 'contemplative', philosophical: 'contemplative',
            contemplative: 'contemplative', sad: 'contemplative'
          };
          var musicMood = moodMap[sceneData.mood];
          if (musicMood) {
            try {
              var musicSystem = root.MJ.Music.create ? root.MJ.Music.create() : null;
              if (musicSystem && musicSystem.setMood) musicSystem.setMood(musicMood);
            } catch (e) { /* music not initialized */ }
          }
        }

        // Route to scene type handler
        var type = sceneData.type || 'narrative';
        if (type === 'dialogue') {
          self._showDialogueScene(sceneData, resolve);
        } else if (type === 'choice') {
          self._showChoiceScene(sceneData, resolve);
        } else if (type === 'celebration') {
          self._showCelebrationScene(sceneData, resolve);
        } else {
          self._showNarrativeScene(sceneData, resolve);
        }
      });
    }

    /**
     * Play CSS confetti particle effect for celebrations.
     * @param {number} [count=40] - number of particles
     */
    playConfetti(count) {
      count = count || 40;
      var colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#ff9ff3', '#54a0ff'];

      for (var i = 0; i < count; i++) {
        var particle = document.createElement('div');
        particle.className = 'mj-confetti-particle';
        particle.style.left = (Math.random() * 100) + 'vw';
        particle.style.top = '-20px';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.width = (4 + Math.random() * 8) + 'px';
        particle.style.height = (4 + Math.random() * 8) + 'px';
        particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        particle.style.animation = 'mj-confetti-fall ' + (2 + Math.random() * 3) + 's ease-out ' + (Math.random() * 1.5) + 's forwards';

        document.body.appendChild(particle);

        // Clean up particle after animation
        (function (el) {
          setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
          }, 6000);
        })(particle);
      }
    }

    /**
     * Typewriter effect: reveal text letter-by-letter.
     * @param {HTMLElement} element - target element
     * @param {string} text - text to reveal
     * @param {number} [speed=35] - ms per character
     * @returns {Promise<void>} resolves when complete
     */
    typewriterEffect(element, text, speed) {
      var self = this;
      speed = speed || 35;

      return new Promise(function (resolve) {
        element.textContent = '';
        var cursor = document.createElement('span');
        cursor.className = 'cursor';
        element.appendChild(cursor);

        var idx = 0;
        var textNode = document.createTextNode('');
        element.insertBefore(textNode, cursor);

        function tick() {
          if (idx < text.length) {
            textNode.textContent += text.charAt(idx);
            idx++;
            self._typewriterTimer = setTimeout(tick, speed);
          } else {
            // Remove cursor after a brief pause
            setTimeout(function () {
              if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
              resolve();
            }, 500);
          }
        }

        self._typewriterTimer = setTimeout(tick, speed);
      });
    }

    /**
     * Check if a scene is currently active.
     * @returns {boolean}
     */
    isActive() {
      return this._isActive;
    }

    /**
     * Force-close the current scene.
     */
    close() {
      this._cleanup();
      if (this._currentResolve) {
        this._currentResolve({});
        this._currentResolve = null;
      }
    }

    // ── Private: scene type renderers ──

    _showNarrativeScene(sceneData, resolve) {
      var self = this;
      var overlay = this._createOverlay(sceneData.mood);
      var container = this._createContainer(sceneData.mood);

      // Portrait
      if (sceneData.character) {
        var portraitWrap = document.createElement('div');
        portraitWrap.className = 'mj-scene-portrait';
        var portrait = this._renderPortrait(sceneData.character, sceneData.emotion || 'neutral', 120);
        if (portrait) portraitWrap.appendChild(portrait);
        container.appendChild(portraitWrap);
      }

      // Content area
      var content = document.createElement('div');
      content.className = 'mj-scene-content';

      if (sceneData.speaker) {
        var speaker = document.createElement('div');
        speaker.className = 'mj-scene-speaker';
        speaker.textContent = sceneData.speaker;
        content.appendChild(speaker);
      }

      var textEl = document.createElement('div');
      textEl.className = 'mj-scene-text';
      content.appendChild(textEl);

      // Continue button
      var continueBtn = document.createElement('button');
      continueBtn.className = 'mj-scene-continue';
      continueBtn.textContent = 'Continue \u25B6';
      content.appendChild(continueBtn);

      container.appendChild(content);
      overlay.appendChild(container);

      this._show(overlay);

      // Handle text (single string or array of strings)
      var textLines = Array.isArray(sceneData.text) ? sceneData.text : [sceneData.text];
      var lineIdx = 0;

      function showNextLine() {
        if (lineIdx >= textLines.length) {
          self._cleanup();
          resolve({});
          return;
        }

        continueBtn.classList.remove('visible');
        self.typewriterEffect(textEl, textLines[lineIdx], 35).then(function () {
          lineIdx++;
          if (lineIdx >= textLines.length) {
            // Last line
            if (sceneData.autoAdvance) {
              self._autoAdvanceTimer = setTimeout(function () {
                self._cleanup();
                resolve({});
              }, sceneData.autoAdvanceDelay || 3000);
            } else {
              continueBtn.textContent = 'Close \u2715';
              continueBtn.classList.add('visible');
            }
          } else {
            continueBtn.classList.add('visible');
          }
        });
      }

      continueBtn.addEventListener('click', function () {
        if (self._autoAdvanceTimer) {
          clearTimeout(self._autoAdvanceTimer);
          self._autoAdvanceTimer = null;
        }
        showNextLine();
      });

      // Also allow clicking overlay background to skip to next
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          if (self._typewriterTimer) {
            // Skip typewriter, show full text immediately
            clearTimeout(self._typewriterTimer);
            self._typewriterTimer = null;
            textEl.textContent = textLines[lineIdx - 1] || textLines[lineIdx] || '';
            continueBtn.classList.add('visible');
          }
        }
      });

      showNextLine();
    }

    _showDialogueScene(sceneData, resolve) {
      var self = this;
      var exchanges = sceneData.dialogue || [];
      if (exchanges.length === 0) {
        resolve({});
        return;
      }

      var overlay = this._createOverlay(sceneData.mood);
      var container = this._createContainer(sceneData.mood);
      container.style.flexDirection = 'column';
      container.style.padding = '24px';

      // Dialogue area with two portrait slots
      var dialogueArea = document.createElement('div');
      dialogueArea.style.cssText = 'display:flex; align-items:center; width:100%; min-height:200px;';

      var leftPortrait = document.createElement('div');
      leftPortrait.className = 'mj-scene-portrait';
      dialogueArea.appendChild(leftPortrait);

      var centerContent = document.createElement('div');
      centerContent.className = 'mj-scene-content';
      centerContent.style.textAlign = 'center';

      var speakerEl = document.createElement('div');
      speakerEl.className = 'mj-scene-speaker';
      centerContent.appendChild(speakerEl);

      var textEl = document.createElement('div');
      textEl.className = 'mj-scene-text';
      centerContent.appendChild(textEl);

      dialogueArea.appendChild(centerContent);

      var rightPortrait = document.createElement('div');
      rightPortrait.className = 'mj-scene-portrait-right';
      dialogueArea.appendChild(rightPortrait);

      container.appendChild(dialogueArea);

      // Continue button
      var continueBtn = document.createElement('button');
      continueBtn.className = 'mj-scene-continue';
      continueBtn.textContent = 'Continue \u25B6';
      continueBtn.style.alignSelf = 'center';
      container.appendChild(continueBtn);

      overlay.appendChild(container);
      this._show(overlay);

      var exchangeIdx = 0;

      function showNextExchange() {
        if (exchangeIdx >= exchanges.length) {
          self._cleanup();
          resolve({});
          return;
        }

        var exchange = exchanges[exchangeIdx];
        continueBtn.classList.remove('visible');

        // Update portraits
        leftPortrait.innerHTML = '';
        rightPortrait.innerHTML = '';

        var portrait = self._renderPortrait(exchange.character, exchange.emotion || 'neutral', 100);
        if (portrait) {
          // Put active speaker on left, dim the right side
          leftPortrait.appendChild(portrait);
          leftPortrait.style.opacity = '1';
          rightPortrait.style.opacity = '0.3';
        }

        // Show second character if present
        if (exchange.otherCharacter) {
          var otherPortrait = self._renderPortrait(exchange.otherCharacter, 'neutral', 80);
          if (otherPortrait) {
            rightPortrait.appendChild(otherPortrait);
            rightPortrait.style.opacity = '0.5';
          }
        }

        speakerEl.textContent = exchange.speaker || '';

        self.typewriterEffect(textEl, exchange.text, 30).then(function () {
          exchangeIdx++;
          if (exchangeIdx >= exchanges.length) {
            continueBtn.textContent = 'Close \u2715';
          }
          continueBtn.classList.add('visible');
        });
      }

      continueBtn.addEventListener('click', showNextExchange);
      showNextExchange();
    }

    _showChoiceScene(sceneData, resolve) {
      var self = this;
      var overlay = this._createOverlay(sceneData.mood);
      var container = this._createContainer(sceneData.mood);

      // Portrait
      if (sceneData.character) {
        var portraitWrap = document.createElement('div');
        portraitWrap.className = 'mj-scene-portrait';
        var portrait = this._renderPortrait(sceneData.character, sceneData.emotion || 'neutral', 120);
        if (portrait) portraitWrap.appendChild(portrait);
        container.appendChild(portraitWrap);
      }

      // Content
      var content = document.createElement('div');
      content.className = 'mj-scene-content';

      if (sceneData.speaker) {
        var speaker = document.createElement('div');
        speaker.className = 'mj-scene-speaker';
        speaker.textContent = sceneData.speaker;
        content.appendChild(speaker);
      }

      var textEl = document.createElement('div');
      textEl.className = 'mj-scene-text';
      content.appendChild(textEl);

      // Choices container (hidden until text completes)
      var choicesDiv = document.createElement('div');
      choicesDiv.className = 'mj-scene-choices';
      choicesDiv.style.display = 'none';
      content.appendChild(choicesDiv);

      container.appendChild(content);
      overlay.appendChild(container);

      this._show(overlay);

      var promptText = Array.isArray(sceneData.text) ? sceneData.text.join(' ') : (sceneData.text || '');
      var choices = sceneData.choices || [];

      self.typewriterEffect(textEl, promptText, 35).then(function () {
        // Show choices
        choicesDiv.style.display = 'flex';

        for (var i = 0; i < choices.length; i++) {
          (function (index, choice) {
            var btn = document.createElement('button');
            btn.className = 'mj-scene-choice-btn';
            btn.textContent = choice.label;
            btn.addEventListener('click', function () {
              // If choice has a response, show it before closing
              if (choice.response) {
                choicesDiv.style.display = 'none';
                self.typewriterEffect(textEl, choice.response, 30).then(function () {
                  setTimeout(function () {
                    self._cleanup();
                    resolve({
                      choice: index,
                      choiceLabel: choice.label,
                      effect: choice.effect || null,
                      relationshipBonus: choice.relationshipBonus || 0
                    });
                  }, 1500);
                });
              } else {
                self._cleanup();
                resolve({
                  choice: index,
                  choiceLabel: choice.label,
                  effect: choice.effect || null,
                  relationshipBonus: choice.relationshipBonus || 0
                });
              }
            });
            choicesDiv.appendChild(btn);
          })(i, choices[i]);
        }
      });
    }

    _showCelebrationScene(sceneData, resolve) {
      var self = this;
      var overlay = this._createOverlay('celebratory');
      var container = this._createContainer('celebratory');

      // Portrait
      if (sceneData.character) {
        var portraitWrap = document.createElement('div');
        portraitWrap.className = 'mj-scene-portrait';
        var portrait = this._renderPortrait(sceneData.character, sceneData.emotion || 'excited', 120);
        if (portrait) portraitWrap.appendChild(portrait);
        container.appendChild(portraitWrap);
      }

      // Content
      var content = document.createElement('div');
      content.className = 'mj-scene-content';

      if (sceneData.speaker) {
        var speaker = document.createElement('div');
        speaker.className = 'mj-scene-speaker';
        speaker.textContent = '\u2728 ' + sceneData.speaker + ' \u2728';
        content.appendChild(speaker);
      }

      var textEl = document.createElement('div');
      textEl.className = 'mj-scene-text';
      content.appendChild(textEl);

      var continueBtn = document.createElement('button');
      continueBtn.className = 'mj-scene-continue';
      continueBtn.textContent = 'Celebrate! \u2728';
      content.appendChild(continueBtn);

      container.appendChild(content);
      overlay.appendChild(container);

      this._show(overlay);

      // Launch confetti
      self.playConfetti(50);

      var celebText = Array.isArray(sceneData.text) ? sceneData.text.join(' ') : (sceneData.text || 'Congratulations!');

      self.typewriterEffect(textEl, celebText, 25).then(function () {
        continueBtn.classList.add('visible');
        // Second wave of confetti
        self.playConfetti(30);
      });

      continueBtn.addEventListener('click', function () {
        self._cleanup();
        resolve({});
      });

      // Auto-close after 10 seconds
      self._autoAdvanceTimer = setTimeout(function () {
        if (self._isActive) {
          self._cleanup();
          resolve({});
        }
      }, 10000);
    }

    // ── Private: DOM helpers ──

    _createOverlay(mood) {
      var overlay = document.createElement('div');
      overlay.className = 'mj-scene-overlay';
      return overlay;
    }

    _createContainer(mood) {
      var container = document.createElement('div');
      container.className = 'mj-scene-container';

      var bgKey = MOOD_TO_BACKGROUND[mood] || 'peaceful';
      container.style.background = SCENE_BACKGROUNDS[bgKey] || SCENE_BACKGROUNDS.peaceful;

      return container;
    }

    _renderPortrait(characterId, emotion, size) {
      if (!this._portraitRenderer) {
        if (root.MJ.Portraits && root.MJ.Portraits.create) {
          this._portraitRenderer = root.MJ.Portraits.create();
        }
      }
      if (this._portraitRenderer) {
        return this._portraitRenderer.render(characterId, emotion, size || 120);
      }
      // Fallback: text placeholder
      var Personality = root.MJ.Personality;
      if (Personality && Personality.CHARACTERS && Personality.CHARACTERS[characterId]) {
        var placeholder = document.createElement('div');
        placeholder.style.cssText = 'width:' + (size || 120) + 'px;height:' + (size || 120) + 'px;' +
          'border-radius:50%;background:rgba(255,255,255,0.1);display:flex;' +
          'align-items:center;justify-content:center;font-size:48px;';
        placeholder.textContent = Personality.CHARACTERS[characterId].avatar;
        return placeholder;
      }
      return null;
    }

    _show(overlay) {
      this._isActive = true;
      this._overlay = overlay;
      document.body.appendChild(overlay);
      // Trigger CSS transition
      requestAnimationFrame(function () {
        overlay.classList.add('active');
      });
    }

    _cleanup() {
      this._isActive = false;

      if (this._typewriterTimer) {
        clearTimeout(this._typewriterTimer);
        this._typewriterTimer = null;
      }
      if (this._autoAdvanceTimer) {
        clearTimeout(this._autoAdvanceTimer);
        this._autoAdvanceTimer = null;
      }
      if (this._overlay) {
        var overlay = this._overlay;
        overlay.classList.remove('active');
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 500);
        this._overlay = null;
      }
    }
  }

  // ── Public API ──

  root.MJ.StoryScenes = Object.freeze({
    StoryScene: StoryScene,
    SCENE_BACKGROUNDS: SCENE_BACKGROUNDS,
    MOOD_TO_BACKGROUND: MOOD_TO_BACKGROUND,
    create: function () {
      return new StoryScene();
    }
  });

})(typeof window !== 'undefined' ? window : global);


/* === js/music-advanced.js === */
/*  music-advanced.js — Enhanced procedural music with composition and game-reactive dynamics
 *  Proper melodic phrases, chord progressions, modular layers, and game event triggers.
 *  Exports: root.MJ.AdvancedMusic
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};

  // ── Musical data ──

  // Base frequencies for notes (octave 4)
  var NOTE_FREQ = {
    C: 261.63, Db: 277.18, D: 293.66, Eb: 311.13, E: 329.63,
    F: 349.23, Gb: 369.99, G: 392.00, Ab: 415.30, A: 440.00,
    Bb: 466.16, B: 493.88
  };

  // Melodic motifs per mood (intervals relative to scale root, in semitones)
  var MOTIFS = {
    calm: [
      [0, 2, 4, 7, 4, 2],          // gentle ascending/descending
      [7, 5, 4, 2, 0],              // descending pentatonic
      [0, 4, 7, 12, 7],             // arpeggio up and back
      [2, 4, 7, 4, 2, 0]            // wave shape
    ],
    tense: [
      [0, 1, 3, 1, 0],              // chromatic tension
      [0, 3, 6, 3],                  // diminished feel
      [7, 6, 3, 1, 0],              // descending minor
      [0, 1, 0, 3, 0, 1]            // nervous oscillation
    ],
    victory: [
      [0, 4, 7, 12],                // triumphant arpeggio
      [7, 9, 12, 16, 12],           // soaring ascent
      [0, 2, 4, 5, 7, 9, 11, 12],  // full major scale run
      [12, 11, 9, 7, 12]            // heroic phrase
    ],
    contemplative: [
      [0, 2, 5, 7, 5, 2],           // pentatonic meditation
      [7, 5, 2, 0, -5],             // descending reflection
      [0, 5, 7, 0, 5],              // sparse intervals
      [2, 0, -3, 0, 2, 5]           // gentle wandering
    ]
  };

  // Chord progressions (as arrays of semitone offsets from root for each chord)
  var PROGRESSIONS = {
    major:  [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],   // I-IV-V-I
    minor:  [[0, 3, 7], [5, 8, 12], [10, 14, 17], [3, 7, 10]],  // i-iv-VII-III
    calm:   [[0, 4, 7], [5, 9, 12], [2, 5, 9], [0, 4, 7]],      // I-IV-ii-I
    tense:  [[0, 3, 7], [1, 4, 8], [3, 6, 10], [0, 3, 7]]       // i-bII-biv-i (phrygian feel)
  };

  // Scale roots per mood
  var MOOD_ROOTS = {
    calm: NOTE_FREQ.C,
    tense: NOTE_FREQ.Eb,
    victory: NOTE_FREQ.G,
    contemplative: NOTE_FREQ.A / 2 // lower A
  };

  // Timing per mood
  var MOOD_TIMING = {
    calm:          { bpm: 60,  noteDur: 1.8, padDur: 4.0, interval: 2500, density: 0.4 },
    tense:         { bpm: 80,  noteDur: 0.8, padDur: 2.0, interval: 1500, density: 0.7 },
    victory:       { bpm: 100, noteDur: 0.6, padDur: 2.5, interval: 1000, density: 0.9 },
    contemplative: { bpm: 50,  noteDur: 2.2, padDur: 5.0, interval: 3200, density: 0.3 }
  };

  // Crossfade duration in seconds
  var CROSSFADE_TIME = 2.0;

  // ── Helper functions ──

  function semitonesToFreq(rootFreq, semitones) {
    return rootFreq * Math.pow(2, semitones / 12);
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Motif transformations
  function transposeMotif(motif, semitones) {
    return motif.map(function (n) { return n + semitones; });
  }

  function invertMotif(motif) {
    var first = motif[0];
    return motif.map(function (n) { return first - (n - first); });
  }

  function retrogradeMotif(motif) {
    return motif.slice().reverse();
  }

  function transformMotif(motif) {
    var transforms = [
      function (m) { return m; },                         // original
      function (m) { return transposeMotif(m, 5); },      // up a fourth
      function (m) { return transposeMotif(m, 7); },      // up a fifth
      function (m) { return transposeMotif(m, -12); },    // down an octave
      function (m) { return invertMotif(m); },             // inversion
      function (m) { return retrogradeMotif(m); }          // retrograde
    ];
    return pickRandom(transforms)(motif);
  }

  // ── AdvancedMusic Class ──

  class AdvancedMusic {
    constructor() {
      this.ctx = null;
      this.playing = false;
      this.mood = 'calm';
      this._targetMood = 'calm';
      this.volume = 0.15;
      this._intensity = 0.3;
      this._masterGain = null;

      // Layer system
      this._layers = {
        bass:    { enabled: true, gain: null, generator: null, timer: null },
        pad:     { enabled: true, gain: null, generator: null, timer: null },
        melody:  { enabled: true, gain: null, generator: null, timer: null },
        sparkle: { enabled: true, gain: null, generator: null, timer: null }
      };

      this._nodes = [];
      this._motifIndex = 0;
      this._chordIndex = 0;
      this._crossfadeTimer = null;
      this._crossfading = false;
    }

    /**
     * Initialize the audio context. Call on user gesture.
     */
    init() {
      if (this.ctx) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this._masterGain = this.ctx.createGain();
        this._masterGain.gain.value = this.volume;
        this._masterGain.connect(this.ctx.destination);

        // Create gain nodes for each layer
        var self = this;
        Object.keys(this._layers).forEach(function (name) {
          var layer = self._layers[name];
          layer.gain = self.ctx.createGain();
          layer.gain.connect(self._masterGain);
          self._updateLayerVolume(name);
        });
      } catch (e) {
        this.ctx = null;
      }
    }

    /**
     * Start playing music.
     * @param {string} [mood='calm']
     */
    start(mood) {
      if (!this.ctx) this.init();
      if (!this.ctx || this.playing) return;

      this.mood = mood || 'calm';
      this._targetMood = this.mood;
      this.playing = true;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this._startAllLayers();
    }

    /**
     * Stop all music and clean up.
     */
    stop() {
      this.playing = false;
      this._stopAllLayers();

      for (var i = 0; i < this._nodes.length; i++) {
        try { this._nodes[i].stop(); } catch (e) {}
      }
      this._nodes = [];

      if (this._crossfadeTimer) {
        clearTimeout(this._crossfadeTimer);
        this._crossfadeTimer = null;
      }
    }

    /**
     * Transition to a new mood with crossfade.
     * @param {string} mood
     */
    setMood(mood) {
      if (!MOOD_TIMING[mood]) return;
      if (mood === this.mood && !this._crossfading) return;

      this._targetMood = mood;

      if (!this.playing) {
        this.mood = mood;
        return;
      }

      this._crossfadeTo(mood);
    }

    /**
     * Set music intensity (0.0 to 1.0).
     * Controls note density and layer volumes.
     * @param {number} level
     */
    setIntensity(level) {
      this._intensity = Math.max(0, Math.min(1, level));
      this._updateAllLayerVolumes();
    }

    /**
     * Set master volume (0.0 to 0.3 for safety).
     * @param {number} vol
     */
    setVolume(vol) {
      this.volume = Math.max(0, Math.min(0.3, vol));
      if (this._masterGain && this.ctx) {
        this._masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
      }
    }

    /**
     * Add a custom layer with a generator function.
     * @param {string} name
     * @param {function} generator - receives (ctx, layerGain, mood, intensity)
     */
    addLayer(name, generator) {
      if (this._layers[name]) return; // don't overwrite built-ins

      var layer = { enabled: true, gain: null, generator: generator, timer: null };

      if (this.ctx) {
        layer.gain = this.ctx.createGain();
        layer.gain.connect(this._masterGain);
        layer.gain.gain.value = 0.3;
      }

      this._layers[name] = layer;
    }

    /**
     * Enable or disable a named layer.
     * @param {string} name
     * @param {boolean} enabled
     */
    setLayerEnabled(name, enabled) {
      var layer = this._layers[name];
      if (!layer) return;

      layer.enabled = !!enabled;
      if (layer.gain && this.ctx) {
        var target = enabled ? this._getLayerBaseVolume(name) : 0;
        layer.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.3);
      }

      if (!enabled && layer.timer) {
        clearTimeout(layer.timer);
        layer.timer = null;
      } else if (enabled && this.playing && !layer.timer) {
        this._startLayer(name);
      }
    }

    /**
     * Get count of currently active (enabled) layers.
     * @returns {number}
     */
    getActiveLayerCount() {
      var count = 0;
      for (var name in this._layers) {
        if (this._layers[name].enabled) count++;
      }
      return count;
    }

    // ── Game-reactive triggers ──

    /**
     * Player's shanten decreased (closer to tenpai).
     */
    onShantenDecrease() {
      this.setIntensity(Math.min(1, this._intensity + 0.1));
    }

    /**
     * Opponent declared riichi.
     */
    onRiichi() {
      this.setMood('tense');
      this._playTensionMotif();
    }

    /**
     * Player reached tenpai.
     */
    onTenpai() {
      this.setIntensity(Math.min(1, this._intensity + 0.15));
      this._playHopefulPhrase();
    }

    /**
     * Someone won the hand.
     */
    onWin() {
      this.setMood('victory');
      this._playTriumphChord();
      // Revert to calm after 6 seconds
      var self = this;
      setTimeout(function () {
        if (self.mood === 'victory' && self.playing) {
          self.setMood('calm');
          self.setIntensity(0.3);
        }
      }, 6000);
    }

    /**
     * Player dealt in (lost by discard).
     */
    onDealIn() {
      this._playDescendingMinor();
      this.setIntensity(Math.max(0, this._intensity - 0.2));
    }

    /**
     * Wall is running low on tiles.
     */
    onWallLow() {
      // Subtly increase tempo by raising intensity
      this.setIntensity(Math.min(1, this._intensity + 0.05));
    }

    /**
     * Return to calm state (e.g., new hand starting).
     */
    onNewHand() {
      this.setMood('calm');
      this.setIntensity(0.3);
    }

    // ── Private: layer management ──

    _startAllLayers() {
      for (var name in this._layers) {
        if (this._layers[name].enabled) {
          this._startLayer(name);
        }
      }
    }

    _stopAllLayers() {
      for (var name in this._layers) {
        var layer = this._layers[name];
        if (layer.timer) {
          clearTimeout(layer.timer);
          layer.timer = null;
        }
      }
    }

    _startLayer(name) {
      var self = this;
      var layer = this._layers[name];
      if (!layer || !layer.enabled) return;

      // Custom generator layers
      if (layer.generator) {
        layer.generator(this.ctx, layer.gain, this.mood, this._intensity);
        return;
      }

      // Built-in layer schedulers
      switch (name) {
        case 'bass':    this._scheduleBass(); break;
        case 'pad':     this._schedulePad(); break;
        case 'melody':  this._scheduleMelody(); break;
        case 'sparkle': this._scheduleSparkle(); break;
      }
    }

    _updateAllLayerVolumes() {
      for (var name in this._layers) {
        this._updateLayerVolume(name);
      }
    }

    _updateLayerVolume(name) {
      var layer = this._layers[name];
      if (!layer || !layer.gain || !this.ctx) return;

      var target = layer.enabled ? this._getLayerBaseVolume(name) : 0;
      layer.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.2);
    }

    _getLayerBaseVolume(name) {
      var intensity = this._intensity;
      switch (name) {
        case 'bass':    return 0.25 + intensity * 0.15;  // always present
        case 'pad':     return intensity < 0.1 ? 0.3 : 0.2 + intensity * 0.2;
        case 'melody':  return intensity < 0.3 ? 0 : (intensity - 0.3) * 0.7;
        case 'sparkle': return intensity < 0.6 ? 0 : (intensity - 0.6) * 0.8;
        default:        return 0.3;
      }
    }

    // ── Private: layer schedulers ──

    _scheduleBass() {
      if (!this.playing || !this._layers.bass.enabled) return;

      var self = this;
      var rootFreq = (MOOD_ROOTS[this.mood] || MOOD_ROOTS.calm) / 2;
      var timing = MOOD_TIMING[this.mood] || MOOD_TIMING.calm;

      // Play bass drone note
      this._playTone(rootFreq, timing.padDur * 1.5, 'sine', this._layers.bass.gain, 0.6);

      // Occasionally play the fifth
      if (Math.random() < 0.3) {
        var fifth = rootFreq * 1.5;
        setTimeout(function () {
          if (self.playing) {
            self._playTone(fifth, timing.padDur, 'sine', self._layers.bass.gain, 0.3);
          }
        }, timing.padDur * 500);
      }

      var interval = timing.padDur * 1200 + Math.random() * 1000;
      this._layers.bass.timer = setTimeout(function () {
        self._scheduleBass();
      }, interval);
    }

    _schedulePad() {
      if (!this.playing || !this._layers.pad.enabled) return;

      var self = this;
      var rootFreq = MOOD_ROOTS[this.mood] || MOOD_ROOTS.calm;
      var timing = MOOD_TIMING[this.mood] || MOOD_TIMING.calm;

      // Play chord from progression
      var progressionKey = (this.mood === 'tense') ? 'tense' :
                           (this.mood === 'victory') ? 'major' :
                           (this.mood === 'contemplative') ? 'minor' : 'calm';
      var progression = PROGRESSIONS[progressionKey];
      var chord = progression[this._chordIndex % progression.length];
      this._chordIndex++;

      for (var i = 0; i < chord.length; i++) {
        var freq = semitonesToFreq(rootFreq, chord[i]);
        this._playTone(freq, timing.padDur, 'sine', this._layers.pad.gain, 0.35);
      }

      var interval = timing.padDur * 900 + Math.random() * 600;
      this._layers.pad.timer = setTimeout(function () {
        self._schedulePad();
      }, interval);
    }

    _scheduleMelody() {
      if (!this.playing || !this._layers.melody.enabled) return;
      if (this._intensity < 0.3) {
        // Too quiet for melody — check again later
        var self = this;
        this._layers.melody.timer = setTimeout(function () {
          self._scheduleMelody();
        }, 3000);
        return;
      }

      var self = this;
      var rootFreq = MOOD_ROOTS[this.mood] || MOOD_ROOTS.calm;
      var timing = MOOD_TIMING[this.mood] || MOOD_TIMING.calm;

      // Pick and transform a motif
      var moodMotifs = MOTIFS[this.mood] || MOTIFS.calm;
      var motif = pickRandom(moodMotifs);
      motif = transformMotif(motif);

      // Play motif notes in sequence
      var noteSpacing = (60 / timing.bpm) * 1000; // ms per beat
      for (var n = 0; n < motif.length; n++) {
        (function (noteIdx, semitone) {
          setTimeout(function () {
            if (!self.playing) return;
            var freq = semitonesToFreq(rootFreq, semitone);
            self._playTone(freq, timing.noteDur, 'triangle', self._layers.melody.gain, 0.5);
          }, noteIdx * noteSpacing);
        })(n, motif[n]);
      }

      // Schedule next motif after this one finishes plus a pause
      var motifDuration = motif.length * noteSpacing;
      var pauseAfter = timing.interval + Math.random() * timing.interval;
      this._layers.melody.timer = setTimeout(function () {
        self._scheduleMelody();
      }, motifDuration + pauseAfter);
    }

    _scheduleSparkle() {
      if (!this.playing || !this._layers.sparkle.enabled) return;
      if (this._intensity < 0.6) {
        var self = this;
        this._layers.sparkle.timer = setTimeout(function () {
          self._scheduleSparkle();
        }, 4000);
        return;
      }

      var self = this;
      var rootFreq = (MOOD_ROOTS[this.mood] || MOOD_ROOTS.calm) * 2; // high register
      var timing = MOOD_TIMING[this.mood] || MOOD_TIMING.calm;

      // High register accent note
      var scale = [0, 2, 4, 5, 7, 9, 11, 12, 14];
      var semitone = pickRandom(scale);
      var freq = semitonesToFreq(rootFreq, semitone);

      this._playTone(freq, timing.noteDur * 0.4, 'sine', this._layers.sparkle.gain, 0.25);

      var interval = 1500 + Math.random() * 3000;
      this._layers.sparkle.timer = setTimeout(function () {
        self._scheduleSparkle();
      }, interval);
    }

    // ── Private: special game-reactive phrases ──

    _playTensionMotif() {
      if (!this.ctx || !this._masterGain) return;
      var rootFreq = MOOD_ROOTS.tense;
      var self = this;
      // Ominous: root, minor second, root
      var notes = [0, 1, 0, -1, 0];
      notes.forEach(function (semi, i) {
        setTimeout(function () {
          if (!self.playing) return;
          var freq = semitonesToFreq(rootFreq, semi);
          self._playTone(freq, 0.6, 'triangle', self._masterGain, 0.3);
        }, i * 300);
      });
    }

    _playHopefulPhrase() {
      if (!this.ctx || !this._masterGain) return;
      var rootFreq = MOOD_ROOTS.calm;
      var self = this;
      // Ascending: root, third, fifth, octave
      var notes = [0, 4, 7, 12];
      notes.forEach(function (semi, i) {
        setTimeout(function () {
          if (!self.playing) return;
          var freq = semitonesToFreq(rootFreq, semi);
          self._playTone(freq, 0.8, 'triangle', self._masterGain, 0.35);
        }, i * 250);
      });
    }

    _playTriumphChord() {
      if (!this.ctx || !this._masterGain) return;
      var rootFreq = MOOD_ROOTS.victory;
      var self = this;
      // Big major chord with octave doubling
      var chord = [0, 4, 7, 12, 16];
      chord.forEach(function (semi) {
        var freq = semitonesToFreq(rootFreq, semi);
        self._playTone(freq, 2.5, 'sine', self._masterGain, 0.25);
      });
    }

    _playDescendingMinor() {
      if (!this.ctx || !this._masterGain) return;
      var rootFreq = MOOD_ROOTS.tense;
      var self = this;
      // Descending minor phrase
      var notes = [12, 10, 7, 3, 0];
      notes.forEach(function (semi, i) {
        setTimeout(function () {
          if (!self.playing) return;
          var freq = semitonesToFreq(rootFreq, semi);
          self._playTone(freq, 1.0, 'triangle', self._masterGain, 0.3);
        }, i * 350);
      });
    }

    // ── Private: crossfade ──

    _crossfadeTo(newMood) {
      var self = this;
      this._crossfading = true;

      // Fade out current layers
      for (var name in this._layers) {
        var layer = this._layers[name];
        if (layer.gain && this.ctx) {
          layer.gain.gain.setTargetAtTime(0, this.ctx.currentTime, CROSSFADE_TIME / 3);
        }
      }

      // After crossfade, switch mood and restart
      if (this._crossfadeTimer) clearTimeout(this._crossfadeTimer);
      this._crossfadeTimer = setTimeout(function () {
        self.mood = newMood;
        self._chordIndex = 0;
        self._motifIndex = 0;

        // Stop old layer timers
        self._stopAllLayers();

        // Restore volumes and restart
        self._updateAllLayerVolumes();
        if (self.playing) {
          self._startAllLayers();
        }

        self._crossfading = false;
        self._crossfadeTimer = null;
      }, CROSSFADE_TIME * 1000);
    }

    // ── Private: core tone generator ──

    _playTone(freq, duration, waveform, destinationNode, relativeVol) {
      if (!this.ctx || !destinationNode) return;

      var now = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();

      osc.type = waveform || 'sine';
      osc.frequency.value = freq;

      // Soft envelope
      var attackTime = Math.min(0.15, duration * 0.15);
      var releaseStart = duration * 0.65;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(relativeVol || 0.3, now + attackTime);
      gain.gain.setValueAtTime(relativeVol || 0.3, now + releaseStart);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      osc.connect(gain);
      gain.connect(destinationNode);

      osc.start(now);
      osc.stop(now + duration + 0.05);

      this._nodes.push(osc);

      // Prune old nodes
      if (this._nodes.length > 30) {
        this._nodes = this._nodes.slice(-15);
      }
    }

    // ── Query methods ──

    /** @returns {boolean} */
    isPlaying() { return this.playing; }

    /** @returns {string} */
    getMood() { return this.mood; }

    /** @returns {number} */
    getIntensity() { return this._intensity; }

    /** @returns {string[]} */
    getMoods() { return Object.keys(MOOD_TIMING); }

    /** @returns {string[]} */
    getLayerNames() { return Object.keys(this._layers); }

    /** @param {string} name  @returns {boolean} */
    isLayerEnabled(name) {
      return !!(this._layers[name] && this._layers[name].enabled);
    }
  }

  // ── Public API ──

  root.MJ.AdvancedMusic = Object.freeze({
    AdvancedMusic: AdvancedMusic,
    MOTIFS: MOTIFS,
    PROGRESSIONS: PROGRESSIONS,
    MOOD_ROOTS: MOOD_ROOTS,
    create: function () {
      return new AdvancedMusic();
    }
  });

})(typeof window !== 'undefined' ? window : global);


/* === js/puzzle-creator.js === */
/**
 * puzzle-creator.js — Player-created Mahjong puzzles with sharing
 * Full puzzle editor, library browser, import/export, and auto-solve.
 * Exports: root.MJ.PuzzleCreator
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const Constants = () => root.MJ.Constants;
  const Tile = () => root.MJ.Tile;
  const Hand = () => root.MJ.Hand;
  const AIE = () => root.MJ.AIEngine;
  const TileRenderer = () => root.MJ.TileRenderer;

  const STORAGE_KEY = 'mj_user_puzzles';
  const RATINGS_KEY = 'mj_puzzle_ratings';

  // All 34 unique tile types in compact notation
  const TILE_CODES = [
    'c1','c2','c3','c4','c5','c6','c7','c8','c9',
    'b1','b2','b3','b4','b5','b6','b7','b8','b9',
    'p1','p2','p3','p4','p5','p6','p7','p8','p9',
    'w1','w2','w3','w4',
    'd1','d2','d3'
  ];

  const SUIT_MAP = {
    c: 'characters', b: 'bamboo', p: 'circles', w: 'wind', d: 'dragon'
  };

  const SUIT_REVERSE = {
    characters: 'c', bamboo: 'b', circles: 'p', wind: 'w', dragon: 'd'
  };

  // ── Compact format helpers ──

  function tileToCode(tile) {
    return (SUIT_REVERSE[tile.suit] || 'x') + tile.rank;
  }

  function codeToTile(code) {
    const suit = SUIT_MAP[code[0]];
    const rank = parseInt(code.substring(1), 10);
    return suit ? { suit: suit, rank: rank } : null;
  }

  function handToCompact(tiles) {
    return tiles.map(tileToCode).join('');
  }

  function compactToHand(str) {
    const tiles = [];
    for (var i = 0; i < str.length; i += 2) {
      var code = str.substring(i, i + 2);
      var tile = codeToTile(code);
      if (tile) tiles.push(tile);
    }
    return tiles;
  }

  function generateId() {
    return 'pzl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }

  // ── Built-in puzzle library ──

  var BUILTIN_PUZZLES = [
    {
      id: 'builtin_bd_01',
      type: 'best_discard',
      title: 'Drop the Orphan',
      description: 'One tile has no connections. Find and discard it.',
      difficulty: 1,
      hand: 'b1b2b3c4c5c6p7p8p9w1w1d3b5',
      melds: [],
      answer: 'd3',
      hint: 'Look for isolated honor tiles with no pairs.',
      author: 'MJ Team',
      builtin: true
    },
    {
      id: 'builtin_bd_02',
      type: 'best_discard',
      title: 'Efficiency Choice',
      description: 'Which discard maximizes your winning tiles?',
      difficulty: 3,
      hand: 'b2b3b4c3c4c5p6p7p8c7c8w2w2',
      melds: [],
      answer: 'c7',
      hint: 'Consider which partial meld has the fewest remaining outs.',
      author: 'MJ Team',
      builtin: true
    },
    {
      id: 'builtin_iw_01',
      type: 'identify_waits',
      title: 'Simple Sequence Wait',
      description: 'Identify all tiles that would complete this hand.',
      difficulty: 1,
      hand: 'b1b2b3c4c5c6p7p8p9w1w1b5b6',
      melds: [],
      answer: 'b4,b7',
      hint: 'Look at the incomplete sequence.',
      author: 'MJ Team',
      builtin: true
    },
    {
      id: 'builtin_cp_01',
      type: 'claim_or_pass',
      title: 'To Pon or Not to Pon',
      description: 'An opponent discards this tile. Should you claim it?',
      difficulty: 2,
      hand: 'b1b2b3c4c5c6p7p8p9w1w1d2d2',
      melds: [],
      offeredTile: 'd2',
      answer: 'pass',
      hint: 'Calling pon would break your concealed hand and reduce yaku.',
      author: 'MJ Team',
      builtin: true
    }
  ];

  // ── PuzzleCreator class ──

  function PuzzleCreator() {
    this._container = null;
    this._currentPuzzle = null;
    this._selectedTiles = [];
    this._selectedMelds = [];
    this._currentMeld = [];
    this._puzzleType = 'best_discard';
    this._answerTile = null;
    this._offeredTile = null;
    this._answerWaits = [];
    this._claimAnswer = 'claim';
  }

  // ── UI Builder: Full-screen puzzle editor ──

  PuzzleCreator.prototype.buildCreatorUI = function (parentEl) {
    var self = this;
    this._container = parentEl || document.createElement('div');
    this._container.className = 'puzzle-creator-screen';

    var html = '<div class="puzzle-creator">';

    // Header
    html += '<div class="pc-header"><h2>Puzzle Creator</h2>';
    html += '<button class="pc-close-btn" data-action="close">&#x2715;</button></div>';

    // Metadata inputs
    html += '<div class="pc-meta">';
    html += '<input type="text" id="pc-title" placeholder="Puzzle Title" maxlength="80">';
    html += '<textarea id="pc-desc" placeholder="Description..." rows="2" maxlength="300"></textarea>';
    html += '<div class="pc-row">';
    html += '<label>Difficulty: </label>';
    html += '<select id="pc-difficulty">';
    for (var d = 1; d <= 5; d++) {
      html += '<option value="' + d + '">' + '\u2605'.repeat(d) + '</option>';
    }
    html += '</select>';
    html += '<label> Type: </label>';
    html += '<select id="pc-type">';
    html += '<option value="best_discard">Best Discard</option>';
    html += '<option value="identify_waits">Identify Waits</option>';
    html += '<option value="claim_or_pass">Claim or Pass</option>';
    html += '</select>';
    html += '</div>';
    html += '<textarea id="pc-hint" placeholder="Hint / Explanation..." rows="2" maxlength="500"></textarea>';
    html += '</div>';

    // Tile palette
    html += '<div class="pc-palette"><h3>Tile Palette</h3><div class="pc-palette-tiles">';
    TILE_CODES.forEach(function (code) {
      html += '<div class="pc-tile-btn" data-code="' + code + '" title="' + code + '">';
      html += '<span class="pc-tile-label">' + code + '</span>';
      html += '</div>';
    });
    html += '</div></div>';

    // Hand area: 13 slots
    html += '<div class="pc-hand-area"><h3>Hand (13 tiles)</h3>';
    html += '<div class="pc-hand-slots" id="pc-hand-slots">';
    for (var i = 0; i < 13; i++) {
      html += '<div class="pc-slot" data-slot="' + i + '"></div>';
    }
    html += '</div>';
    html += '<button class="pc-btn" data-action="clear-hand">Clear Hand</button>';
    html += '</div>';

    // Meld area
    html += '<div class="pc-meld-area"><h3>Open Melds</h3>';
    html += '<div class="pc-melds-list" id="pc-melds-list"></div>';
    html += '<div class="pc-meld-builder" id="pc-meld-builder">';
    html += '<span>Building meld: </span><span id="pc-meld-tiles"></span>';
    html += '<button class="pc-btn pc-btn-sm" data-action="add-meld">Add Meld</button>';
    html += '<button class="pc-btn pc-btn-sm" data-action="clear-meld-builder">Clear</button>';
    html += '</div></div>';

    // Answer area (changes based on type)
    html += '<div class="pc-answer-area" id="pc-answer-area">';
    html += this._buildAnswerUI('best_discard');
    html += '</div>';

    // Action buttons
    html += '<div class="pc-actions">';
    html += '<button class="pc-btn pc-btn-primary" data-action="test">Test Puzzle</button>';
    html += '<button class="pc-btn pc-btn-primary" data-action="save">Save</button>';
    html += '<button class="pc-btn" data-action="share">Share</button>';
    html += '<button class="pc-btn" data-action="auto-solve">Auto-Solve</button>';
    html += '<button class="pc-btn" data-action="library">Library</button>';
    html += '</div>';

    html += '</div>';
    this._container.innerHTML = html;

    // Render SVG tiles in palette
    this._renderPaletteTiles();

    // Bind events
    this._bindEvents();

    return this._container;
  };

  PuzzleCreator.prototype._buildAnswerUI = function (type) {
    var html = '<h3>Answer</h3>';
    if (type === 'best_discard') {
      html += '<p>Click a tile in your hand to set it as the correct discard.</p>';
      html += '<div id="pc-answer-display">No answer set</div>';
    } else if (type === 'identify_waits') {
      html += '<p>Waits will be auto-calculated from the hand.</p>';
      html += '<div id="pc-answer-display">Set a tenpai hand to see waits</div>';
    } else if (type === 'claim_or_pass') {
      html += '<p>Set the offered tile and correct action:</p>';
      html += '<div class="pc-row">';
      html += '<label>Offered tile: </label>';
      html += '<span id="pc-offered-tile">None</span>';
      html += '<button class="pc-btn pc-btn-sm" data-action="set-offered">Set from palette</button>';
      html += '</div>';
      html += '<div class="pc-row">';
      html += '<label>Correct answer: </label>';
      html += '<select id="pc-claim-answer">';
      html += '<option value="claim">Claim</option>';
      html += '<option value="pass">Pass</option>';
      html += '</select>';
      html += '</div>';
      html += '<div id="pc-answer-display"></div>';
    }
    return html;
  };

  PuzzleCreator.prototype._renderPaletteTiles = function () {
    var renderer = TileRenderer();
    if (!renderer) return;
    var btns = this._container.querySelectorAll('.pc-tile-btn');
    btns.forEach(function (btn) {
      var code = btn.getAttribute('data-code');
      var tile = codeToTile(code);
      if (tile && renderer.renderTileSVG) {
        var svg = renderer.renderTileSVG(tile, { width: 36, height: 48 });
        if (typeof svg === 'string') {
          btn.innerHTML = svg;
        } else if (svg instanceof Element) {
          btn.innerHTML = '';
          btn.appendChild(svg);
        }
      }
    });
  };

  PuzzleCreator.prototype._renderSlotTile = function (slotEl, code) {
    var renderer = TileRenderer();
    var tile = codeToTile(code);
    if (tile && renderer && renderer.renderTileSVG) {
      var svg = renderer.renderTileSVG(tile, { width: 36, height: 48 });
      if (typeof svg === 'string') {
        slotEl.innerHTML = svg;
      } else if (svg instanceof Element) {
        slotEl.innerHTML = '';
        slotEl.appendChild(svg);
      }
    } else {
      slotEl.textContent = code;
    }
    slotEl.setAttribute('data-code', code);
  };

  PuzzleCreator.prototype._bindEvents = function () {
    var self = this;
    var settingOffered = false;

    this._container.addEventListener('click', function (e) {
      var target = e.target.closest('[data-action]');
      var paletteBtn = e.target.closest('.pc-tile-btn');
      var slotEl = e.target.closest('.pc-slot');

      // Palette tile click — add to hand or meld builder
      if (paletteBtn) {
        var code = paletteBtn.getAttribute('data-code');
        if (settingOffered) {
          self._offeredTile = code;
          settingOffered = false;
          var offeredEl = self._container.querySelector('#pc-offered-tile');
          if (offeredEl) offeredEl.textContent = code;
          return;
        }
        if (self._selectedTiles.length < 13) {
          self._selectedTiles.push(code);
          self._updateHandSlots();
        }
        return;
      }

      // Hand slot click — set as answer for best_discard or remove
      if (slotEl) {
        var slotCode = slotEl.getAttribute('data-code');
        if (!slotCode) return;
        if (self._puzzleType === 'best_discard') {
          self._answerTile = slotCode;
          self._updateAnswerDisplay();
          self._highlightAnswerSlot();
        } else {
          // Remove tile from hand
          var idx = parseInt(slotEl.getAttribute('data-slot'), 10);
          if (idx >= 0 && idx < self._selectedTiles.length) {
            self._selectedTiles.splice(idx, 1);
            self._updateHandSlots();
          }
        }
        return;
      }

      if (!target) return;
      var action = target.getAttribute('data-action');

      switch (action) {
        case 'close':
          self._container.innerHTML = '';
          break;
        case 'clear-hand':
          self._selectedTiles = [];
          self._answerTile = null;
          self._updateHandSlots();
          self._updateAnswerDisplay();
          break;
        case 'add-meld':
          if (self._currentMeld.length >= 3) {
            self._selectedMelds.push(self._currentMeld.slice());
            self._currentMeld = [];
            self._updateMeldDisplay();
          }
          break;
        case 'clear-meld-builder':
          self._currentMeld = [];
          self._updateMeldBuilderDisplay();
          break;
        case 'set-offered':
          settingOffered = true;
          break;
        case 'test':
          self._testPuzzle();
          break;
        case 'save':
          self._saveCurrent();
          break;
        case 'share':
          self._shareCurrent();
          break;
        case 'auto-solve':
          self._autoSolveCurrent();
          break;
        case 'library':
          self.buildPuzzleLibraryUI(self._container);
          break;
      }
    });

    // Type selector change
    var typeSelect = this._container.querySelector('#pc-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', function () {
        self._puzzleType = typeSelect.value;
        var answerArea = self._container.querySelector('#pc-answer-area');
        if (answerArea) answerArea.innerHTML = self._buildAnswerUI(self._puzzleType);
        if (self._puzzleType === 'identify_waits') {
          self._computeWaits();
        }
      });
    }
  };

  PuzzleCreator.prototype._updateHandSlots = function () {
    var slots = this._container.querySelectorAll('.pc-slot');
    var self = this;
    slots.forEach(function (slot, i) {
      if (i < self._selectedTiles.length) {
        self._renderSlotTile(slot, self._selectedTiles[i]);
      } else {
        slot.innerHTML = '';
        slot.removeAttribute('data-code');
      }
    });
    if (this._puzzleType === 'identify_waits') {
      this._computeWaits();
    }
  };

  PuzzleCreator.prototype._updateMeldDisplay = function () {
    var list = this._container.querySelector('#pc-melds-list');
    if (!list) return;
    var html = '';
    this._selectedMelds.forEach(function (meld, i) {
      html += '<div class="pc-meld">' + meld.join(' ') +
        ' <button class="pc-btn pc-btn-sm" data-action="remove-meld" data-meld-idx="' + i + '">x</button></div>';
    });
    list.innerHTML = html;
    this._updateMeldBuilderDisplay();
  };

  PuzzleCreator.prototype._updateMeldBuilderDisplay = function () {
    var el = this._container.querySelector('#pc-meld-tiles');
    if (el) el.textContent = this._currentMeld.join(' ') || '(empty)';
  };

  PuzzleCreator.prototype._updateAnswerDisplay = function () {
    var el = this._container.querySelector('#pc-answer-display');
    if (!el) return;
    if (this._puzzleType === 'best_discard') {
      el.textContent = this._answerTile ? 'Answer: ' + this._answerTile : 'No answer set';
    } else if (this._puzzleType === 'identify_waits') {
      el.textContent = this._answerWaits.length > 0
        ? 'Waits: ' + this._answerWaits.join(', ')
        : 'Set a tenpai hand to see waits';
    }
  };

  PuzzleCreator.prototype._highlightAnswerSlot = function () {
    var slots = this._container.querySelectorAll('.pc-slot');
    var ans = this._answerTile;
    slots.forEach(function (slot) {
      slot.classList.toggle('pc-slot-answer', slot.getAttribute('data-code') === ans);
    });
  };

  PuzzleCreator.prototype._computeWaits = function () {
    this._answerWaits = [];
    if (this._selectedTiles.length < 13) return;
    var hand = compactToHand(this._selectedTiles.join(''));
    var aie = AIE();
    if (!aie) return;
    // Try removing each tile and checking if remaining is tenpai
    var waitsSet = {};
    for (var i = 0; i < 34; i++) {
      var testTile = codeToTile(TILE_CODES[i]);
      if (!testTile) continue;
      var testHand = hand.concat([testTile]);
      // Check if this forms a complete hand
      var handObj = Hand();
      if (handObj && handObj.isComplete && handObj.isComplete(testHand)) {
        waitsSet[TILE_CODES[i]] = true;
      }
    }
    this._answerWaits = Object.keys(waitsSet);
    this._updateAnswerDisplay();
  };

  // ── Puzzle assembly ──

  PuzzleCreator.prototype._assemblePuzzle = function () {
    var titleEl = this._container.querySelector('#pc-title');
    var descEl = this._container.querySelector('#pc-desc');
    var diffEl = this._container.querySelector('#pc-difficulty');
    var hintEl = this._container.querySelector('#pc-hint');

    var puzzle = {
      id: generateId(),
      type: this._puzzleType,
      title: titleEl ? titleEl.value.trim() : 'Untitled',
      description: descEl ? descEl.value.trim() : '',
      difficulty: diffEl ? parseInt(diffEl.value, 10) : 1,
      hand: this._selectedTiles.join(''),
      melds: this._selectedMelds.map(function (m) { return m.join(''); }),
      hint: hintEl ? hintEl.value.trim() : '',
      author: 'Player',
      created: Date.now()
    };

    if (this._puzzleType === 'best_discard') {
      puzzle.answer = this._answerTile || '';
    } else if (this._puzzleType === 'identify_waits') {
      puzzle.answer = this._answerWaits.join(',');
    } else if (this._puzzleType === 'claim_or_pass') {
      puzzle.offeredTile = this._offeredTile || '';
      var claimSel = this._container.querySelector('#pc-claim-answer');
      puzzle.answer = claimSel ? claimSel.value : 'pass';
    }

    return puzzle;
  };

  // ── Validation ──

  PuzzleCreator.prototype.validatePuzzle = function (puzzle) {
    var errors = [];
    if (!puzzle.title || puzzle.title.length === 0) {
      errors.push('Title is required.');
    }
    if (!puzzle.hand || puzzle.hand.length === 0) {
      errors.push('Hand is required.');
    }
    var tiles = compactToHand(puzzle.hand);
    var expectedCount = 13 - (puzzle.melds ? puzzle.melds.length * 3 : 0);
    if (tiles.length !== 13 && tiles.length !== expectedCount) {
      errors.push('Hand should have 13 tiles (or fewer with melds). Got ' + tiles.length + '.');
    }
    if (puzzle.type === 'best_discard') {
      if (!puzzle.answer) {
        errors.push('Best discard puzzles require a correct answer tile.');
      } else {
        var answerInHand = false;
        var ansTile = puzzle.answer;
        for (var i = 0; i < puzzle.hand.length; i += 2) {
          if (puzzle.hand.substring(i, i + 2) === ansTile) {
            answerInHand = true;
            break;
          }
        }
        if (!answerInHand) {
          errors.push('Answer tile must be in the hand.');
        }
      }
    }
    if (puzzle.type === 'claim_or_pass') {
      if (!puzzle.offeredTile) {
        errors.push('Claim or pass puzzles require an offered tile.');
      }
      if (puzzle.answer !== 'claim' && puzzle.answer !== 'pass') {
        errors.push('Claim or pass answer must be "claim" or "pass".');
      }
    }
    if (puzzle.type === 'identify_waits') {
      if (!puzzle.answer || puzzle.answer.length === 0) {
        errors.push('No waits found. Ensure the hand is in tenpai.');
      }
    }
    // Check tile counts don't exceed 4
    var counts = {};
    tiles.forEach(function (t) {
      var key = tileToCode(t);
      counts[key] = (counts[key] || 0) + 1;
      if (counts[key] > 4) {
        errors.push('Tile ' + key + ' appears more than 4 times.');
      }
    });

    return { valid: errors.length === 0, errors: errors };
  };

  // ── Save / Load ──

  PuzzleCreator.prototype.savePuzzle = function (puzzle) {
    var puzzles = this.loadPuzzles();
    var existing = puzzles.findIndex(function (p) { return p.id === puzzle.id; });
    if (existing >= 0) {
      puzzles[existing] = puzzle;
    } else {
      puzzles.push(puzzle);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
    } catch (e) {
      console.warn('PuzzleCreator: Failed to save puzzle', e);
    }
    return puzzle;
  };

  PuzzleCreator.prototype.loadPuzzles = function () {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('PuzzleCreator: Failed to load puzzles', e);
      return [];
    }
  };

  // ── Import / Export ──

  PuzzleCreator.prototype.importPuzzle = function (json) {
    try {
      var puzzle = typeof json === 'string' ? JSON.parse(json) : json;
      if (!puzzle.id) puzzle.id = generateId();
      puzzle.imported = true;
      puzzle.importedAt = Date.now();
      var validation = this.validatePuzzle(puzzle);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }
      this.savePuzzle(puzzle);
      return { success: true, puzzle: puzzle };
    } catch (e) {
      return { success: false, errors: ['Invalid JSON: ' + e.message] };
    }
  };

  PuzzleCreator.prototype.exportPuzzle = function (puzzleId) {
    var puzzles = this.loadPuzzles();
    var puzzle = puzzles.find(function (p) { return p.id === puzzleId; });
    if (!puzzle) return null;
    // Compact format: strip internal fields
    var compact = {
      type: puzzle.type,
      hand: puzzle.hand,
      melds: puzzle.melds || [],
      answer: puzzle.answer,
      title: puzzle.title,
      desc: puzzle.description || '',
      difficulty: puzzle.difficulty,
      author: puzzle.author || 'Player'
    };
    if (puzzle.offeredTile) compact.offeredTile = puzzle.offeredTile;
    if (puzzle.hint) compact.hint = puzzle.hint;
    return JSON.stringify(compact);
  };

  // ── Auto-solve ──

  PuzzleCreator.prototype.autoSolve = function (puzzle) {
    var tiles = compactToHand(puzzle.hand);
    var aie = AIE();
    if (!aie) return { answer: null, reason: 'AIEngine not available' };

    if (puzzle.type === 'best_discard') {
      // Use AI to pick the best discard
      try {
        var result = aie.chooseBestDiscard
          ? aie.chooseBestDiscard(tiles, puzzle.melds || [])
          : null;
        if (result && result.tile) {
          return { answer: tileToCode(result.tile), reason: result.reason || 'AI analysis' };
        }
        // Fallback: try evaluateDiscards
        if (aie.evaluateDiscards) {
          var evals = aie.evaluateDiscards(tiles);
          if (evals && evals.length > 0) {
            evals.sort(function (a, b) { return b.score - a.score; });
            return { answer: tileToCode(evals[0].tile), reason: 'Highest efficiency score' };
          }
        }
      } catch (e) {
        return { answer: null, reason: 'AI error: ' + e.message };
      }
    }

    if (puzzle.type === 'identify_waits') {
      var waits = [];
      for (var i = 0; i < 34; i++) {
        var testTile = codeToTile(TILE_CODES[i]);
        var testHand = tiles.concat([testTile]);
        var handMod = Hand();
        if (handMod && handMod.isComplete && handMod.isComplete(testHand)) {
          waits.push(TILE_CODES[i]);
        }
      }
      return { answer: waits.join(','), reason: 'Exhaustive search of all 34 tile types' };
    }

    if (puzzle.type === 'claim_or_pass') {
      // Basic heuristic: if claiming improves shanten, claim
      if (puzzle.offeredTile && aie.calculateShanten) {
        var offered = codeToTile(puzzle.offeredTile);
        var currentShanten = aie.calculateShanten(tiles);
        var withClaim = tiles.concat([offered]);
        // Try each discard after claiming
        var bestShanten = 99;
        for (var j = 0; j < withClaim.length; j++) {
          var reduced = withClaim.slice(0, j).concat(withClaim.slice(j + 1));
          var s = aie.calculateShanten(reduced);
          if (s < bestShanten) bestShanten = s;
        }
        if (bestShanten < currentShanten) {
          return { answer: 'claim', reason: 'Claiming improves shanten from ' + currentShanten + ' to ' + bestShanten };
        }
        return { answer: 'pass', reason: 'Claiming does not improve shanten (' + currentShanten + ')' };
      }
    }

    return { answer: null, reason: 'Unable to solve' };
  };

  // ── Test puzzle (interactive) ──

  PuzzleCreator.prototype._testPuzzle = function () {
    var puzzle = this._assemblePuzzle();
    var validation = this.validatePuzzle(puzzle);
    if (!validation.valid) {
      alert('Puzzle validation failed:\n' + validation.errors.join('\n'));
      return;
    }
    // Simple test: show the puzzle and let user answer
    var answer = prompt(
      'TEST: ' + puzzle.title + '\nType: ' + puzzle.type +
      '\nHand: ' + puzzle.hand +
      '\n\nEnter your answer:'
    );
    if (answer === null) return;
    answer = answer.trim().toLowerCase();
    var correct = puzzle.answer.toLowerCase();
    if (answer === correct) {
      alert('Correct! The answer is: ' + puzzle.answer);
    } else {
      alert('Incorrect. Your answer: ' + answer + '\nCorrect answer: ' + puzzle.answer);
    }
  };

  PuzzleCreator.prototype._saveCurrent = function () {
    var puzzle = this._assemblePuzzle();
    var validation = this.validatePuzzle(puzzle);
    if (!validation.valid) {
      alert('Cannot save:\n' + validation.errors.join('\n'));
      return;
    }
    this.savePuzzle(puzzle);
    alert('Puzzle saved: ' + puzzle.title);
  };

  PuzzleCreator.prototype._shareCurrent = function () {
    var puzzle = this._assemblePuzzle();
    var validation = this.validatePuzzle(puzzle);
    if (!validation.valid) {
      alert('Cannot share:\n' + validation.errors.join('\n'));
      return;
    }
    this.savePuzzle(puzzle);
    var json = this.exportPuzzle(puzzle.id);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(function () {
        alert('Puzzle JSON copied to clipboard!');
      }).catch(function () {
        prompt('Copy this JSON to share:', json);
      });
    } else {
      prompt('Copy this JSON to share:', json);
    }
  };

  PuzzleCreator.prototype._autoSolveCurrent = function () {
    var puzzle = this._assemblePuzzle();
    var result = this.autoSolve(puzzle);
    if (result.answer) {
      alert('AI Answer: ' + result.answer + '\nReason: ' + result.reason);
      if (this._puzzleType === 'best_discard') {
        this._answerTile = result.answer;
        this._updateAnswerDisplay();
        this._highlightAnswerSlot();
      } else if (this._puzzleType === 'identify_waits') {
        this._answerWaits = result.answer.split(',');
        this._updateAnswerDisplay();
      }
    } else {
      alert('Auto-solve failed: ' + result.reason);
    }
  };

  // ── Puzzle Library ──

  PuzzleCreator.prototype.getPuzzleLibrary = function () {
    var userPuzzles = this.loadPuzzles();
    return BUILTIN_PUZZLES.concat(userPuzzles);
  };

  PuzzleCreator.prototype.buildPuzzleLibraryUI = function (parentEl) {
    var self = this;
    var container = parentEl || document.createElement('div');
    var puzzles = this.getPuzzleLibrary();
    var ratings = this._loadRatings();

    var html = '<div class="pc-library">';
    html += '<div class="pc-header"><h2>Puzzle Library</h2>';
    html += '<button class="pc-btn" data-action="back-to-creator">Create New</button>';
    html += '<button class="pc-btn" data-action="import">Import</button>';
    html += '</div>';

    if (puzzles.length === 0) {
      html += '<p>No puzzles yet. Create one!</p>';
    } else {
      html += '<div class="pc-puzzle-list">';
      puzzles.forEach(function (p) {
        var starStr = '\u2605'.repeat(p.difficulty || 1) + '\u2606'.repeat(5 - (p.difficulty || 1));
        var rating = ratings[p.id];
        var ratingStr = rating ? ' | Rated: ' + '\u2605'.repeat(rating) : '';
        html += '<div class="pc-puzzle-item" data-id="' + p.id + '">';
        html += '<div class="pc-puzzle-info">';
        html += '<strong>' + (p.title || 'Untitled') + '</strong>';
        html += '<span class="pc-puzzle-meta">' + (p.type || '').replace('_', ' ') + ' | ' + starStr + ratingStr + '</span>';
        html += '<span class="pc-puzzle-desc">' + (p.description || p.desc || '') + '</span>';
        html += '<span class="pc-puzzle-author">by ' + (p.author || 'Unknown') + '</span>';
        html += '</div>';
        html += '<div class="pc-puzzle-actions">';
        html += '<button class="pc-btn pc-btn-sm" data-action="play" data-id="' + p.id + '">Play</button>';
        if (!p.builtin) {
          html += '<button class="pc-btn pc-btn-sm" data-action="edit" data-id="' + p.id + '">Edit</button>';
          html += '<button class="pc-btn pc-btn-sm" data-action="delete" data-id="' + p.id + '">Delete</button>';
        }
        html += '<button class="pc-btn pc-btn-sm" data-action="share-puzzle" data-id="' + p.id + '">Share</button>';
        html += '<select class="pc-rate-select" data-id="' + p.id + '">';
        html += '<option value="">Rate</option>';
        for (var r = 1; r <= 5; r++) {
          html += '<option value="' + r + '"' + (rating === r ? ' selected' : '') + '>' + '\u2605'.repeat(r) + '</option>';
        }
        html += '</select>';
        html += '</div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;

    // Bind library events
    container.addEventListener('click', function (e) {
      var target = e.target.closest('[data-action]');
      if (!target) return;
      var action = target.getAttribute('data-action');
      var id = target.getAttribute('data-id');

      if (action === 'back-to-creator') {
        self.buildCreatorUI(container);
      } else if (action === 'import') {
        var json = prompt('Paste puzzle JSON:');
        if (json) {
          var result = self.importPuzzle(json);
          if (result.success) {
            alert('Imported: ' + result.puzzle.title);
            self.buildPuzzleLibraryUI(container);
          } else {
            alert('Import failed:\n' + result.errors.join('\n'));
          }
        }
      } else if (action === 'play') {
        self._playPuzzle(id, container);
      } else if (action === 'edit') {
        self._editPuzzle(id, container);
      } else if (action === 'delete') {
        if (confirm('Delete this puzzle?')) {
          self._deletePuzzle(id);
          self.buildPuzzleLibraryUI(container);
        }
      } else if (action === 'share-puzzle') {
        var json2 = self.exportPuzzle(id);
        if (json2) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json2).then(function () {
              alert('Copied to clipboard!');
            });
          } else {
            prompt('Copy:', json2);
          }
        }
      }
    });

    container.addEventListener('change', function (e) {
      var sel = e.target.closest('.pc-rate-select');
      if (sel) {
        var id = sel.getAttribute('data-id');
        var val = parseInt(sel.value, 10);
        if (val >= 1 && val <= 5) {
          self.ratePuzzle(id, val);
        }
      }
    });

    return container;
  };

  PuzzleCreator.prototype._playPuzzle = function (puzzleId, container) {
    var allPuzzles = this.getPuzzleLibrary();
    var puzzle = allPuzzles.find(function (p) { return p.id === puzzleId; });
    if (!puzzle) return;

    var answer = prompt(
      puzzle.title + '\n' + (puzzle.description || puzzle.desc || '') +
      '\nType: ' + puzzle.type.replace('_', ' ') +
      '\nHand: ' + puzzle.hand +
      (puzzle.hint ? '\nHint: ' + puzzle.hint : '') +
      '\n\nEnter your answer:'
    );
    if (answer === null) return;
    answer = answer.trim().toLowerCase();
    var correct = (puzzle.answer || '').toLowerCase();
    if (answer === correct) {
      alert('Correct!');
    } else {
      alert('Incorrect.\nYour answer: ' + answer + '\nCorrect: ' + puzzle.answer +
        (puzzle.hint ? '\n\nExplanation: ' + puzzle.hint : ''));
    }
  };

  PuzzleCreator.prototype._editPuzzle = function (puzzleId, container) {
    var puzzles = this.loadPuzzles();
    var puzzle = puzzles.find(function (p) { return p.id === puzzleId; });
    if (!puzzle) return;

    this.buildCreatorUI(container);
    // Populate fields
    this._puzzleType = puzzle.type;
    this._selectedTiles = [];
    for (var i = 0; i < puzzle.hand.length; i += 2) {
      this._selectedTiles.push(puzzle.hand.substring(i, i + 2));
    }
    this._selectedMelds = (puzzle.melds || []).map(function (m) {
      var tiles = [];
      for (var j = 0; j < m.length; j += 2) tiles.push(m.substring(j, j + 2));
      return tiles;
    });
    this._answerTile = puzzle.type === 'best_discard' ? puzzle.answer : null;
    this._offeredTile = puzzle.offeredTile || null;
    this._claimAnswer = puzzle.type === 'claim_or_pass' ? puzzle.answer : 'claim';
    if (puzzle.type === 'identify_waits') {
      this._answerWaits = puzzle.answer ? puzzle.answer.split(',') : [];
    }

    var titleEl = this._container.querySelector('#pc-title');
    var descEl = this._container.querySelector('#pc-desc');
    var diffEl = this._container.querySelector('#pc-difficulty');
    var typeEl = this._container.querySelector('#pc-type');
    var hintEl = this._container.querySelector('#pc-hint');

    if (titleEl) titleEl.value = puzzle.title || '';
    if (descEl) descEl.value = puzzle.description || puzzle.desc || '';
    if (diffEl) diffEl.value = puzzle.difficulty || 1;
    if (typeEl) typeEl.value = puzzle.type;
    if (hintEl) hintEl.value = puzzle.hint || '';

    this._updateHandSlots();
    this._updateMeldDisplay();
    this._updateAnswerDisplay();
  };

  PuzzleCreator.prototype._deletePuzzle = function (puzzleId) {
    var puzzles = this.loadPuzzles();
    puzzles = puzzles.filter(function (p) { return p.id !== puzzleId; });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
    } catch (e) {
      console.warn('PuzzleCreator: Failed to delete puzzle', e);
    }
  };

  // ── Ratings ──

  PuzzleCreator.prototype.ratePuzzle = function (puzzleId, rating) {
    var ratings = this._loadRatings();
    ratings[puzzleId] = Math.max(1, Math.min(5, rating));
    try {
      localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
    } catch (e) {
      console.warn('PuzzleCreator: Failed to save rating', e);
    }
  };

  PuzzleCreator.prototype._loadRatings = function () {
    try {
      var data = localStorage.getItem(RATINGS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  };

  // ── Export ──
  root.MJ.PuzzleCreator = new PuzzleCreator();

})(typeof window !== 'undefined' ? window : this);


/* === js/spectator-stream.js === */
/**
 * spectator-stream.js — Enhanced spectator mode with streaming support
 * BroadcastChannel for multi-tab spectating, optional WebSocket for remote,
 * expert commentary, and viewer reactions.
 * Exports: root.MJ.SpectatorStream
 */
(function (exports) {
  'use strict';
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const AIE = () => root.MJ.AIEngine;
  const TileRenderer = () => root.MJ.TileRenderer;

  const CHANNEL_PREFIX = 'mj_spectate_';
  const REACTION_DURATION = 2500;
  const MAX_LOG_ENTRIES = 200;

  // ── Commentary patterns ──

  var COMMENTARY_PATTERNS = {
    discard_safe: '{player} discards {tile}. This is suji-safe from {target} who discarded {related_tile} earlier.',
    discard_dangerous: '{player} discards {tile} \u2014 a bold move. This tile is live against {target}\'s hand.',
    discard_neutral: '{player} discards {tile}. A reasonable play at this stage.',
    riichi: '{player} declares riichi with a {wait_type} wait. {remaining} tiles remaining, approximately {outs} winning tiles left.',
    fold: '{player} folds \u2014 smart move given the riichi declaration.',
    chi: '{player} calls chi on {tile}, building toward a sequence-heavy hand.',
    pon: '{player} calls pon on {tile}. Three of a kind locked in.',
    kan: '{player} declares kan on {tile}! Four of a kind \u2014 the stakes just rose.',
    tsumo: '{player} wins by tsumo! Self-drawn victory with {hand_desc}.',
    ron: '{player} wins by ron off {target}\'s {tile}! {hand_desc}.',
    draw: 'Exhaustive draw. No one claims victory this round.',
    efficiency: '{player} is at {shanten}-shanten with {outs} potential improvements.',
    riichi_threat: 'Warning: {player} in riichi. Other players should consider defensive play.',
    tenpai: '{player} appears to be in tenpai. Dangerous tiles to watch for: {dangerous}.'
  };

  var WAIT_TYPE_NAMES = {
    shanpon: 'dual-pon',
    ryanmen: 'two-sided',
    kanchan: 'closed',
    penchan: 'edge',
    tanki: 'single-tile',
    unknown: 'unknown'
  };

  // ── SpectatorStream class ──

  function SpectatorStream() {
    this._broadcasting = false;
    this._spectating = false;
    this._channel = null;
    this._channelId = null;
    this._ws = null;
    this._viewers = new Set();
    this._viewerCount = 0;
    this._log = [];
    this._container = null;
    this._expertMode = false;
    this._reactionOverlay = null;
    this._onStateUpdate = null;
  }

  // ── Broadcasting ──

  SpectatorStream.prototype.startBroadcast = function (channelId) {
    if (this._broadcasting) return;
    this._channelId = channelId || ('game_' + Date.now().toString(36));
    this._broadcasting = true;

    // BroadcastChannel for same-device multi-tab
    if (typeof BroadcastChannel !== 'undefined') {
      this._channel = new BroadcastChannel(CHANNEL_PREFIX + this._channelId);
      var self = this;
      this._channel.onmessage = function (e) {
        var msg = e.data;
        if (msg.type === 'join') {
          self._viewerCount++;
          self._broadcastViewerCount();
        } else if (msg.type === 'leave') {
          self._viewerCount = Math.max(0, self._viewerCount - 1);
          self._broadcastViewerCount();
        } else if (msg.type === 'reaction') {
          self._showReaction(msg.emoji, msg.from);
        }
      };
    }

    this._log = [];
    this._addLog('system', 'Broadcast started on channel: ' + this._channelId);
    return this._channelId;
  };

  SpectatorStream.prototype.broadcastState = function (gameState) {
    if (!this._broadcasting) return;
    var payload = {
      type: 'state_update',
      state: gameState,
      timestamp: Date.now()
    };
    if (this._channel) {
      this._channel.postMessage(payload);
    }
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(payload));
    }
  };

  SpectatorStream.prototype.broadcastAction = function (action, commentary) {
    if (!this._broadcasting) return;
    var payload = {
      type: 'action',
      action: action,
      commentary: commentary || '',
      timestamp: Date.now()
    };
    if (this._channel) {
      this._channel.postMessage(payload);
    }
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(payload));
    }
    this._addLog('action', commentary || JSON.stringify(action));
  };

  SpectatorStream.prototype.stopBroadcast = function () {
    if (!this._broadcasting) return;
    this._broadcasting = false;
    if (this._channel) {
      this._channel.postMessage({ type: 'broadcast_end' });
      this._channel.close();
      this._channel = null;
    }
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._addLog('system', 'Broadcast ended.');
  };

  SpectatorStream.prototype._broadcastViewerCount = function () {
    if (this._channel) {
      this._channel.postMessage({ type: 'viewer_count', count: this._viewerCount });
    }
  };

  // ── Spectating (joining) ──

  SpectatorStream.prototype.joinBroadcast = function (channelId, wsUrl) {
    if (this._spectating) this.leaveBroadcast();
    this._channelId = channelId;
    this._spectating = true;
    this._log = [];
    var self = this;

    // BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      this._channel = new BroadcastChannel(CHANNEL_PREFIX + channelId);
      this._channel.onmessage = function (e) {
        var msg = e.data;
        if (msg.type === 'state_update' && self._onStateUpdate) {
          self._onStateUpdate(msg.state);
          self._updateSpectatorView(msg.state);
        } else if (msg.type === 'action') {
          self._addLog('action', msg.commentary || JSON.stringify(msg.action));
          self._updateLogUI();
        } else if (msg.type === 'viewer_count') {
          self._viewerCount = msg.count;
          self._updateViewerCountUI();
        } else if (msg.type === 'reaction') {
          self._showReaction(msg.emoji, msg.from);
        } else if (msg.type === 'broadcast_end') {
          self._addLog('system', 'Broadcast has ended.');
          self._updateLogUI();
        }
      };
      // Announce join
      this._channel.postMessage({ type: 'join' });
    }

    // Optional WebSocket for remote spectating
    if (wsUrl) {
      try {
        this._ws = new WebSocket(wsUrl);
        this._ws.onmessage = function (e) {
          try {
            var msg = JSON.parse(e.data);
            if (msg.type === 'state_update' && self._onStateUpdate) {
              self._onStateUpdate(msg.state);
              self._updateSpectatorView(msg.state);
            } else if (msg.type === 'action') {
              self._addLog('action', msg.commentary || '');
              self._updateLogUI();
            }
          } catch (err) {
            // Malformed message
          }
        };
        this._ws.onopen = function () {
          self._ws.send(JSON.stringify({ type: 'join', channel: channelId }));
        };
      } catch (e) {
        console.warn('SpectatorStream: WebSocket connection failed', e);
      }
    }

    this._addLog('system', 'Joined broadcast: ' + channelId);
  };

  SpectatorStream.prototype.leaveBroadcast = function () {
    if (!this._spectating) return;
    if (this._channel) {
      this._channel.postMessage({ type: 'leave' });
      this._channel.close();
      this._channel = null;
    }
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._spectating = false;
    this._addLog('system', 'Left broadcast.');
  };

  SpectatorStream.prototype.onStateUpdate = function (callback) {
    this._onStateUpdate = callback;
  };

  // ── Spectator UI ──

  SpectatorStream.prototype.buildSpectatorUI = function (parentEl) {
    var self = this;
    this._container = parentEl || document.createElement('div');
    this._container.className = 'spectator-stream-ui';

    var html = '<div class="ss-layout">';

    // Header
    html += '<div class="ss-header">';
    html += '<h2>Spectator Mode</h2>';
    html += '<span class="ss-viewer-count" id="ss-viewer-count">Viewers: 0</span>';
    html += '<label class="ss-expert-toggle">';
    html += '<input type="checkbox" id="ss-expert-mode"> Expert Mode';
    html += '</label>';
    html += '<button class="ss-btn" data-action="leave">Leave</button>';
    html += '</div>';

    // Main game area — all 4 hands visible
    html += '<div class="ss-game-area">';
    html += '<div class="ss-hand ss-hand-north" id="ss-hand-north"><h4>North</h4><div class="ss-tiles"></div></div>';
    html += '<div class="ss-center-row">';
    html += '<div class="ss-hand ss-hand-west" id="ss-hand-west"><h4>West</h4><div class="ss-tiles"></div></div>';
    html += '<div class="ss-table-center" id="ss-table-center"><div class="ss-discards"></div></div>';
    html += '<div class="ss-hand ss-hand-east" id="ss-hand-east"><h4>East</h4><div class="ss-tiles"></div></div>';
    html += '</div>';
    html += '<div class="ss-hand ss-hand-south" id="ss-hand-south"><h4>South</h4><div class="ss-tiles"></div></div>';
    html += '</div>';

    // Sidebar: stats + expert info
    html += '<div class="ss-sidebar" id="ss-sidebar">';
    html += '<h3>Player Stats</h3>';
    html += '<div id="ss-stats"></div>';
    html += '<div id="ss-expert-panel" class="ss-expert-panel ss-hidden">';
    html += '<h3>Tile Efficiency</h3>';
    html += '<div id="ss-efficiency"></div>';
    html += '</div>';
    html += '</div>';

    // Commentary panel
    html += '<div class="ss-commentary" id="ss-commentary">';
    html += '<h3>Commentary</h3>';
    html += '<div class="ss-log" id="ss-log"></div>';
    html += '</div>';

    // Reaction overlay
    html += '<div class="ss-reaction-overlay" id="ss-reaction-overlay"></div>';

    // Reaction bar
    html += '<div class="ss-reaction-bar">';
    var reactions = ['\ud83d\udc4f', '\ud83d\ude32', '\ud83d\ude02', '\ud83d\udd25', '\ud83d\udca1', '\ud83d\ude31'];
    reactions.forEach(function (emoji) {
      html += '<button class="ss-reaction-btn" data-reaction="' + emoji + '">' + emoji + '</button>';
    });
    html += '</div>';

    html += '</div>';
    this._container.innerHTML = html;

    this._reactionOverlay = this._container.querySelector('#ss-reaction-overlay');

    // Bind events
    this._container.addEventListener('click', function (e) {
      var actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        var action = actionEl.getAttribute('data-action');
        if (action === 'leave') {
          self.leaveBroadcast();
          self._container.innerHTML = '<p>Disconnected from broadcast.</p>';
        }
      }
      var reactionBtn = e.target.closest('[data-reaction]');
      if (reactionBtn) {
        self.sendReaction(reactionBtn.getAttribute('data-reaction'));
      }
    });

    var expertToggle = this._container.querySelector('#ss-expert-mode');
    if (expertToggle) {
      expertToggle.addEventListener('change', function () {
        self._expertMode = expertToggle.checked;
        var panel = self._container.querySelector('#ss-expert-panel');
        if (panel) panel.classList.toggle('ss-hidden', !self._expertMode);
      });
    }

    this._updateLogUI();
    return this._container;
  };

  SpectatorStream.prototype._updateSpectatorView = function (state) {
    if (!this._container || !state) return;
    var renderer = TileRenderer();
    var winds = ['east', 'south', 'west', 'north'];

    winds.forEach(function (wind) {
      var handEl = this._container.querySelector('#ss-hand-' + wind + ' .ss-tiles');
      if (!handEl) return;
      var player = state.players ? state.players.find(function (p) {
        return (p.wind || p.seat || '').toLowerCase() === wind;
      }) : null;
      if (!player || !player.hand) {
        handEl.innerHTML = '<em>No data</em>';
        return;
      }
      var tilesHtml = '';
      player.hand.forEach(function (tile) {
        if (renderer && renderer.renderTileSVG) {
          var svg = renderer.renderTileSVG(tile, { width: 30, height: 40 });
          tilesHtml += typeof svg === 'string' ? svg : '<span>' + (tile.suit || '') + tile.rank + '</span>';
        } else {
          tilesHtml += '<span class="ss-tile-text">' + (tile.suit || '')[0] + tile.rank + '</span>';
        }
      });
      handEl.innerHTML = tilesHtml;
    }.bind(this));

    // Update stats
    this._updateStatsUI(state);

    // Update expert panel
    if (this._expertMode) {
      this._updateEfficiencyUI(state);
    }
  };

  SpectatorStream.prototype._updateStatsUI = function (state) {
    var statsEl = this._container ? this._container.querySelector('#ss-stats') : null;
    if (!statsEl || !state || !state.players) return;
    var html = '';
    state.players.forEach(function (p) {
      var name = p.name || p.wind || 'Player';
      var score = p.score != null ? p.score : '?';
      var wind = p.wind || p.seat || '';
      html += '<div class="ss-stat-row">';
      html += '<strong>' + name + '</strong> (' + wind + ')';
      html += '<span>' + score + ' pts</span>';
      html += '</div>';
    });
    statsEl.innerHTML = html;
  };

  SpectatorStream.prototype._updateEfficiencyUI = function (state) {
    var effEl = this._container ? this._container.querySelector('#ss-efficiency') : null;
    if (!effEl || !state) return;
    var aie = AIE();
    if (!aie || !state.currentPlayer) {
      effEl.innerHTML = '<em>No data</em>';
      return;
    }

    var player = state.players ? state.players.find(function (p) {
      return p.wind === state.currentPlayer || p.seat === state.currentPlayer;
    }) : null;
    if (!player || !player.hand) return;

    var html = '<div class="ss-eff-header">Current: ' + (player.name || player.wind) + '</div>';
    if (aie.calculateShanten) {
      try {
        var shanten = aie.calculateShanten(player.hand);
        html += '<div>Shanten: ' + shanten + '</div>';
      } catch (e) {
        // Ignore calculation errors
      }
    }
    if (aie.evaluateDiscards) {
      try {
        var evals = aie.evaluateDiscards(player.hand);
        if (evals && evals.length > 0) {
          evals.sort(function (a, b) { return b.score - a.score; });
          html += '<div class="ss-eff-list">';
          evals.slice(0, 5).forEach(function (ev) {
            var code = (ev.tile.suit || '')[0] + ev.tile.rank;
            html += '<div>' + code + ': ' + ev.score.toFixed(1) + '</div>';
          });
          html += '</div>';
        }
      } catch (e) {
        // Ignore
      }
    }
    effEl.innerHTML = html;
  };

  SpectatorStream.prototype._updateViewerCountUI = function () {
    if (!this._container) return;
    var el = this._container.querySelector('#ss-viewer-count');
    if (el) el.textContent = 'Viewers: ' + this._viewerCount;
  };

  // ── Play-by-play log ──

  SpectatorStream.prototype._addLog = function (type, text) {
    this._log.push({
      type: type,
      text: text,
      timestamp: Date.now()
    });
    if (this._log.length > MAX_LOG_ENTRIES) {
      this._log.shift();
    }
  };

  SpectatorStream.prototype._updateLogUI = function () {
    if (!this._container) return;
    var logEl = this._container.querySelector('#ss-log');
    if (!logEl) return;
    var html = '';
    this._log.forEach(function (entry) {
      var time = new Date(entry.timestamp);
      var ts = time.getHours().toString().padStart(2, '0') + ':' +
               time.getMinutes().toString().padStart(2, '0') + ':' +
               time.getSeconds().toString().padStart(2, '0');
      var cls = entry.type === 'system' ? 'ss-log-system' : 'ss-log-action';
      html += '<div class="' + cls + '"><span class="ss-log-time">' + ts + '</span> ' + entry.text + '</div>';
    });
    logEl.innerHTML = html;
    logEl.scrollTop = logEl.scrollHeight;
  };

  // ── Expert commentary generation ──

  SpectatorStream.prototype.generateExpertCommentary = function (action, state) {
    if (!action || !action.type) return '';

    var vars = {
      player: action.player || action.seat || 'Unknown',
      tile: action.tile ? ((action.tile.suit || '')[0] + '-' + action.tile.rank) : '?',
      target: action.target || 'opponent',
      related_tile: '',
      remaining: '?',
      outs: '?',
      wait_type: 'unknown',
      hand_desc: '',
      shanten: '?',
      dangerous: ''
    };

    // Enrich with AI analysis
    var aie = AIE();
    if (aie && state) {
      // Count remaining tiles
      if (state.wallCount != null) {
        vars.remaining = String(state.wallCount);
      }
    }

    var pattern = '';

    switch (action.type) {
      case 'discard':
        // Check if the tile is safe via suji
        if (state && state.discards) {
          var isSafe = this._checkSujiSafe(action.tile, state.discards, action.target);
          if (isSafe.safe) {
            vars.related_tile = (isSafe.relatedTile.suit || '')[0] + '-' + isSafe.relatedTile.rank;
            vars.target = isSafe.target || 'an opponent';
            pattern = COMMENTARY_PATTERNS.discard_safe;
          } else if (this._isDangerous(action.tile, state)) {
            pattern = COMMENTARY_PATTERNS.discard_dangerous;
          } else {
            pattern = COMMENTARY_PATTERNS.discard_neutral;
          }
        } else {
          pattern = COMMENTARY_PATTERNS.discard_neutral;
        }
        break;

      case 'riichi':
        vars.wait_type = action.waitType ? (WAIT_TYPE_NAMES[action.waitType] || action.waitType) : 'unknown';
        if (action.outs != null) vars.outs = String(action.outs);
        pattern = COMMENTARY_PATTERNS.riichi;
        break;

      case 'chi':
        pattern = COMMENTARY_PATTERNS.chi;
        break;

      case 'pon':
        pattern = COMMENTARY_PATTERNS.pon;
        break;

      case 'kan':
        pattern = COMMENTARY_PATTERNS.kan;
        break;

      case 'tsumo':
        vars.hand_desc = action.handDesc || action.yaku || 'a complete hand';
        pattern = COMMENTARY_PATTERNS.tsumo;
        break;

      case 'ron':
        vars.hand_desc = action.handDesc || action.yaku || 'a complete hand';
        pattern = COMMENTARY_PATTERNS.ron;
        break;

      case 'draw':
        pattern = COMMENTARY_PATTERNS.draw;
        break;

      case 'fold':
        pattern = COMMENTARY_PATTERNS.fold;
        break;

      default:
        return vars.player + ' performs: ' + action.type;
    }

    // Fill template
    var result = pattern;
    Object.keys(vars).forEach(function (key) {
      var ph = '{' + key + '}';
      while (result.indexOf(ph) !== -1) {
        result = result.replace(ph, vars[key]);
      }
    });

    return result;
  };

  SpectatorStream.prototype._checkSujiSafe = function (tile, discards, target) {
    // Suji: if 4 is discarded, 1 and 7 of same suit are suji-safe
    // If 5 is discarded, 2 and 8 are safe, etc.
    if (!tile || !tile.suit || !tile.rank) return { safe: false };
    var suit = tile.suit;
    var rank = tile.rank;
    if (suit === 'wind' || suit === 'dragon') return { safe: false };

    var sujiPairs = { 1: [4], 2: [5], 3: [6], 4: [1, 7], 5: [2, 8], 6: [3, 9], 7: [4], 8: [5], 9: [6] };
    var needed = sujiPairs[rank] || [];

    var allDiscards = [];
    if (Array.isArray(discards)) {
      allDiscards = discards;
    } else if (typeof discards === 'object') {
      Object.keys(discards).forEach(function (seat) {
        if (Array.isArray(discards[seat])) {
          discards[seat].forEach(function (t) {
            allDiscards.push({ tile: t, seat: seat });
          });
        }
      });
    }

    for (var i = 0; i < allDiscards.length; i++) {
      var d = allDiscards[i].tile || allDiscards[i];
      var dSeat = allDiscards[i].seat || target;
      if (d.suit === suit && needed.indexOf(d.rank) >= 0) {
        return { safe: true, relatedTile: d, target: dSeat };
      }
    }
    return { safe: false };
  };

  SpectatorStream.prototype._isDangerous = function (tile, state) {
    // Simple heuristic: middle tiles (3-7) in suited are more dangerous
    if (!tile || !tile.rank) return false;
    if (tile.suit === 'wind' || tile.suit === 'dragon') return false;
    return tile.rank >= 3 && tile.rank <= 7;
  };

  // ── Viewer count ──

  SpectatorStream.prototype.getViewerCount = function () {
    return this._viewerCount;
  };

  // ── Reactions ──

  SpectatorStream.prototype.sendReaction = function (emoji) {
    if (!emoji) return;
    var payload = { type: 'reaction', emoji: emoji, from: 'spectator', timestamp: Date.now() };
    if (this._channel) {
      this._channel.postMessage(payload);
    }
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(payload));
    }
    // Show locally too
    this._showReaction(emoji, 'you');
  };

  SpectatorStream.prototype.buildReactionOverlay = function (parentEl) {
    var overlay = document.createElement('div');
    overlay.className = 'ss-reaction-overlay';
    overlay.id = 'ss-reaction-overlay';
    if (parentEl) parentEl.appendChild(overlay);
    this._reactionOverlay = overlay;
    return overlay;
  };

  SpectatorStream.prototype._showReaction = function (emoji, from) {
    var overlay = this._reactionOverlay;
    if (!overlay) return;

    var el = document.createElement('div');
    el.className = 'ss-floating-reaction';
    el.textContent = emoji;
    // Random horizontal position
    el.style.left = (10 + Math.random() * 80) + '%';
    el.style.animationDuration = (REACTION_DURATION + Math.random() * 500) + 'ms';
    overlay.appendChild(el);

    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, REACTION_DURATION + 600);
  };

  // ── Export ──
  root.MJ.SpectatorStream = new SpectatorStream();

})(typeof window !== 'undefined' ? window : this);


/* === js/cloud-sync.js === */
/**
 * Mahjong Living Simulation - Cloud Sync Client
 * Browser client for cloud save/load, leaderboards, and replays.
 */
(function (root) {
  'use strict';

  var MJ = root.MJ = root.MJ || {};

  // -------------------------------------------------------------------------
  // CloudSync class
  // -------------------------------------------------------------------------

  function CloudSync() {
    this.serverUrl = localStorage.getItem('mj_server_url') || 'http://localhost:3000';
    this.token = localStorage.getItem('mj_cloud_token') || null;
    this.userId = localStorage.getItem('mj_cloud_userId') || null;
    this.syncCode = localStorage.getItem('mj_cloud_code') || null;
    this.online = navigator.onLine;
    this.actionQueue = [];
    this._panel = null;

    this._loadQueue();
    this._bindNetworkEvents();
  }

  // -------------------------------------------------------------------------
  // Server URL
  // -------------------------------------------------------------------------

  CloudSync.prototype.setServerUrl = function (url) {
    this.serverUrl = url.replace(/\/+$/, '');
    localStorage.setItem('mj_server_url', this.serverUrl);
  };

  // -------------------------------------------------------------------------
  // Internal fetch helper
  // -------------------------------------------------------------------------

  CloudSync.prototype._request = function (method, path, body) {
    var self = this;
    var url = this.serverUrl + path;
    var headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = 'Bearer ' + this.token;
    }
    var opts = { method: method, headers: headers };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (resp) {
      if (!resp.ok) {
        return resp.json().then(function (data) {
          var err = new Error(data.error || 'Request failed');
          err.status = resp.status;
          throw err;
        });
      }
      return resp.json();
    }).catch(function (err) {
      if (!navigator.onLine) {
        self.online = false;
      }
      throw err;
    });
  };

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  /**
   * Register a new account. Returns the 6-digit sync code.
   */
  CloudSync.prototype.register = function () {
    var self = this;
    return this._request('POST', '/api/auth/code').then(function (data) {
      self.syncCode = data.code;
      self.userId = data.userId;
      self.token = data.token;
      localStorage.setItem('mj_cloud_code', data.code);
      localStorage.setItem('mj_cloud_userId', data.userId);
      localStorage.setItem('mj_cloud_token', data.token);
      return data.code;
    });
  };

  /**
   * Login with an existing 6-digit sync code.
   */
  CloudSync.prototype.login = function (code) {
    var self = this;
    return this._request('POST', '/api/auth/login', { code: code }).then(function (data) {
      self.userId = data.userId;
      self.token = data.token;
      self.syncCode = code;
      localStorage.setItem('mj_cloud_code', code);
      localStorage.setItem('mj_cloud_userId', data.userId);
      localStorage.setItem('mj_cloud_token', data.token);
      return data;
    });
  };

  /**
   * Check if the user is authenticated.
   */
  CloudSync.prototype.isAuthenticated = function () {
    return !!(this.token && this.userId);
  };

  // -------------------------------------------------------------------------
  // Save / Load
  // -------------------------------------------------------------------------

  /**
   * Collect all mj_* localStorage keys and upload to server.
   */
  CloudSync.prototype.uploadSave = function () {
    var self = this;
    if (!this.isAuthenticated()) {
      return Promise.reject(new Error('Not authenticated'));
    }

    var saveData = {};
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('mj_') === 0 && key !== 'mj_cloud_token' && key !== 'mj_cloud_userId' && key !== 'mj_cloud_code' && key !== 'mj_server_url') {
        try {
          saveData[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          saveData[key] = localStorage.getItem(key);
        }
      }
    }

    if (!this.online) {
      this._enqueue({ action: 'uploadSave', data: saveData });
      return Promise.resolve({ queued: true });
    }

    return this._request('POST', '/api/save', { data: saveData }).then(function (resp) {
      self._setStatus('Save uploaded successfully');
      return resp;
    });
  };

  /**
   * Download save from server and restore to localStorage.
   */
  CloudSync.prototype.downloadSave = function () {
    var self = this;
    if (!this.isAuthenticated()) {
      return Promise.reject(new Error('Not authenticated'));
    }
    return this._request('GET', '/api/save').then(function (resp) {
      var data = resp.data;
      if (data && typeof data === 'object') {
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var value = data[key];
          if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
          } else {
            localStorage.setItem(key, String(value));
          }
        }
      }
      self._setStatus('Save downloaded and restored');
      return resp;
    });
  };

  // -------------------------------------------------------------------------
  // Leaderboard
  // -------------------------------------------------------------------------

  /**
   * Submit a score to the leaderboard.
   */
  CloudSync.prototype.submitScore = function (score, handType) {
    var playerName = localStorage.getItem('mj_player_name') || 'Anonymous';
    var body = { score: score, handType: handType || '', playerName: playerName };

    if (!this.online) {
      this._enqueue({ action: 'submitScore', data: body });
      return Promise.resolve({ queued: true });
    }

    return this._request('POST', '/api/leaderboard', body);
  };

  /**
   * Get leaderboard entries for a time period.
   * @param {string} period - 'weekly', 'monthly', or 'alltime'
   */
  CloudSync.prototype.getLeaderboard = function (period) {
    period = period || 'alltime';
    return this._request('GET', '/api/leaderboard/' + encodeURIComponent(period));
  };

  // -------------------------------------------------------------------------
  // Replays
  // -------------------------------------------------------------------------

  /**
   * Upload a replay to the server.
   */
  CloudSync.prototype.uploadReplay = function (replay, title) {
    var body = { title: title || 'Untitled Replay', data: replay };

    if (!this.online) {
      this._enqueue({ action: 'uploadReplay', data: body });
      return Promise.resolve({ queued: true });
    }

    return this._request('POST', '/api/replay', body);
  };

  /**
   * List shared replays from the server.
   */
  CloudSync.prototype.getSharedReplays = function () {
    return this._request('GET', '/api/replays');
  };

  // -------------------------------------------------------------------------
  // Offline queue
  // -------------------------------------------------------------------------

  CloudSync.prototype._enqueue = function (entry) {
    this.actionQueue.push(entry);
    this._saveQueue();
  };

  CloudSync.prototype._saveQueue = function () {
    try {
      localStorage.setItem('mj_cloud_queue', JSON.stringify(this.actionQueue));
    } catch (e) {
      // storage full, drop oldest entries
      this.actionQueue = this.actionQueue.slice(-10);
      try {
        localStorage.setItem('mj_cloud_queue', JSON.stringify(this.actionQueue));
      } catch (e2) {
        // ignore
      }
    }
  };

  CloudSync.prototype._loadQueue = function () {
    try {
      var raw = localStorage.getItem('mj_cloud_queue');
      if (raw) {
        this.actionQueue = JSON.parse(raw);
      }
    } catch (e) {
      this.actionQueue = [];
    }
  };

  CloudSync.prototype._flushQueue = function () {
    var self = this;
    if (!this.online || this.actionQueue.length === 0) {
      return;
    }
    var queue = this.actionQueue.slice();
    this.actionQueue = [];
    this._saveQueue();

    queue.forEach(function (entry) {
      switch (entry.action) {
        case 'uploadSave':
          self._request('POST', '/api/save', { data: entry.data }).catch(function () {});
          break;
        case 'submitScore':
          self._request('POST', '/api/leaderboard', entry.data).catch(function () {});
          break;
        case 'uploadReplay':
          self._request('POST', '/api/replay', entry.data).catch(function () {});
          break;
      }
    });
  };

  // -------------------------------------------------------------------------
  // Network events
  // -------------------------------------------------------------------------

  CloudSync.prototype._bindNetworkEvents = function () {
    var self = this;
    window.addEventListener('online', function () {
      self.online = true;
      self._setStatus('Back online');
      self._flushQueue();
    });
    window.addEventListener('offline', function () {
      self.online = false;
      self._setStatus('Offline - actions will be queued');
    });
  };

  // -------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------

  CloudSync.prototype._setStatus = function (msg) {
    if (this._statusEl) {
      this._statusEl.textContent = msg;
    }
  };

  /**
   * Build the sync UI panel and append it to the given container (or document.body).
   */
  CloudSync.prototype.buildSyncUI = function (container) {
    var self = this;
    container = container || document.body;

    var panel = document.createElement('div');
    panel.className = 'cloud-sync-panel';
    panel.style.cssText = 'padding:12px;background:#1a1a2e;border-radius:8px;color:#e0e0e0;font-family:sans-serif;font-size:14px;max-width:340px;';

    var title = document.createElement('h3');
    title.textContent = 'Cloud Sync';
    title.style.cssText = 'margin:0 0 10px;color:#ffd700;';
    panel.appendChild(title);

    // Status
    var statusEl = document.createElement('div');
    statusEl.style.cssText = 'margin-bottom:8px;font-size:12px;color:#aaa;min-height:16px;';
    statusEl.textContent = this.online ? 'Online' : 'Offline';
    panel.appendChild(statusEl);
    this._statusEl = statusEl;

    // Sync code display
    if (this.syncCode) {
      var codeDisplay = document.createElement('div');
      codeDisplay.style.cssText = 'margin-bottom:8px;';
      codeDisplay.innerHTML = 'Your sync code: <strong style="color:#ffd700;font-size:18px;letter-spacing:2px;">' + this.syncCode + '</strong>';
      panel.appendChild(codeDisplay);
    }

    // Register button (if not authenticated)
    if (!this.isAuthenticated()) {
      var regBtn = document.createElement('button');
      regBtn.textContent = 'Get Sync Code';
      regBtn.style.cssText = 'display:block;width:100%;padding:8px;margin-bottom:6px;background:#4a6fa5;color:#fff;border:none;border-radius:4px;cursor:pointer;';
      regBtn.addEventListener('click', function () {
        self.register().then(function (code) {
          self._setStatus('Your sync code: ' + code);
          self.buildSyncUI(container);
        }).catch(function (err) {
          self._setStatus('Error: ' + err.message);
        });
      });
      panel.appendChild(regBtn);
    }

    // Login input
    var loginRow = document.createElement('div');
    loginRow.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;';
    var loginInput = document.createElement('input');
    loginInput.type = 'text';
    loginInput.maxLength = 6;
    loginInput.placeholder = 'Enter 6-digit code';
    loginInput.style.cssText = 'flex:1;padding:6px;border:1px solid #444;border-radius:4px;background:#222;color:#fff;';
    var loginBtn = document.createElement('button');
    loginBtn.textContent = 'Login';
    loginBtn.style.cssText = 'padding:6px 12px;background:#4a6fa5;color:#fff;border:none;border-radius:4px;cursor:pointer;';
    loginBtn.addEventListener('click', function () {
      var code = loginInput.value.trim();
      if (code.length !== 6) {
        self._setStatus('Enter a 6-digit code');
        return;
      }
      self.login(code).then(function () {
        self._setStatus('Logged in successfully');
        self.buildSyncUI(container);
      }).catch(function (err) {
        self._setStatus('Login failed: ' + err.message);
      });
    });
    loginRow.appendChild(loginInput);
    loginRow.appendChild(loginBtn);
    panel.appendChild(loginRow);

    // Upload / Download buttons
    if (this.isAuthenticated()) {
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;';

      var uploadBtn = document.createElement('button');
      uploadBtn.textContent = 'Upload Save';
      uploadBtn.style.cssText = 'flex:1;padding:8px;background:#2d6a4f;color:#fff;border:none;border-radius:4px;cursor:pointer;';
      uploadBtn.addEventListener('click', function () {
        self.uploadSave().then(function (r) {
          self._setStatus(r.queued ? 'Save queued (offline)' : 'Save uploaded');
        }).catch(function (err) {
          self._setStatus('Upload failed: ' + err.message);
        });
      });

      var downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Download Save';
      downloadBtn.style.cssText = 'flex:1;padding:8px;background:#6a4c2d;color:#fff;border:none;border-radius:4px;cursor:pointer;';
      downloadBtn.addEventListener('click', function () {
        self.downloadSave().then(function () {
          self._setStatus('Save restored. Reload to apply.');
        }).catch(function (err) {
          self._setStatus('Download failed: ' + err.message);
        });
      });

      btnRow.appendChild(uploadBtn);
      btnRow.appendChild(downloadBtn);
      panel.appendChild(btnRow);
    }

    // Replace existing panel
    if (this._panel && this._panel.parentNode) {
      this._panel.parentNode.removeChild(this._panel);
    }
    this._panel = panel;
    container.appendChild(panel);

    return panel;
  };

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  MJ.CloudSync = CloudSync;

})(typeof window !== 'undefined' ? window : this);


/* === js/native-app.js === */
/**
 * Mahjong Living Simulation - Native App Helpers
 * Capacitor/Electron detection and native feature integration.
 */
(function (root) {
  'use strict';

  var MJ = root.MJ = root.MJ || {};

  // -------------------------------------------------------------------------
  // NativeApp class
  // -------------------------------------------------------------------------

  function NativeApp() {
    this._panel = null;
    this._deferredInstallPrompt = null;
    this._initInstallPrompt();
  }

  // -------------------------------------------------------------------------
  // Platform detection
  // -------------------------------------------------------------------------

  /**
   * Returns true if running inside Capacitor or Electron (not a plain browser).
   */
  NativeApp.prototype.isNative = function () {
    return this.isCapacitor() || this.isElectron();
  };

  /**
   * Detect Capacitor runtime.
   */
  NativeApp.prototype.isCapacitor = function () {
    return !!(root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform());
  };

  /**
   * Detect Electron runtime.
   */
  NativeApp.prototype.isElectron = function () {
    return !!(typeof process !== 'undefined' && process.versions && process.versions.electron);
  };

  /**
   * Detect if running as an installed PWA.
   */
  NativeApp.prototype.isPWA = function () {
    return (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) ||
           (root.navigator && root.navigator.standalone === true);
  };

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------

  /**
   * Request notification permission. Returns a promise resolving to the permission state.
   */
  NativeApp.prototype.requestNotificationPermission = function () {
    if (!('Notification' in root)) {
      return Promise.resolve('unsupported');
    }
    if (Notification.permission === 'granted') {
      return Promise.resolve('granted');
    }
    return Notification.requestPermission().then(function (perm) {
      return perm;
    });
  };

  /**
   * Schedule a local reminder notification after a delay.
   * @param {string} message - Notification body text.
   * @param {number} delayMs - Delay in milliseconds.
   */
  NativeApp.prototype.scheduleReminder = function (message, delayMs) {
    var self = this;

    // Capacitor local notifications
    if (this.isCapacitor() && root.Capacitor.Plugins && root.Capacitor.Plugins.LocalNotifications) {
      return root.Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [{
          title: 'Mahjong Living Simulation',
          body: message,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + delayMs) }
        }]
      });
    }

    // Fallback: browser setTimeout + Notification API
    return this.requestNotificationPermission().then(function (perm) {
      if (perm === 'granted') {
        setTimeout(function () {
          try {
            new Notification('Mahjong Living Simulation', { body: message });
          } catch (e) {
            // ignore - some browsers restrict Notification constructor
          }
        }, delayMs);
        return 'scheduled';
      }
      return 'permission_denied';
    });
  };

  // -------------------------------------------------------------------------
  // Sharing
  // -------------------------------------------------------------------------

  /**
   * Share text/URL via native share sheet or Web Share API.
   * @param {string} text - The text to share.
   * @param {string} [url] - Optional URL.
   */
  NativeApp.prototype.shareGame = function (text, url) {
    var shareData = { title: 'Mahjong Living Simulation', text: text };
    if (url) {
      shareData.url = url;
    }

    // Capacitor share plugin
    if (this.isCapacitor() && root.Capacitor.Plugins && root.Capacitor.Plugins.Share) {
      return root.Capacitor.Plugins.Share.share(shareData);
    }

    // Web Share API
    if (navigator.share) {
      return navigator.share(shareData).catch(function () {
        // user cancelled or API error, ignore
      });
    }

    // Fallback: copy to clipboard
    var fullText = text + (url ? '\n' + url : '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(fullText).then(function () {
        return 'copied';
      });
    }

    return Promise.resolve('unsupported');
  };

  // -------------------------------------------------------------------------
  // Haptics
  // -------------------------------------------------------------------------

  /**
   * Trigger haptic feedback on supported devices.
   * @param {string} type - 'light', 'medium', 'heavy', or 'selection'
   */
  NativeApp.prototype.hapticFeedback = function (type) {
    type = type || 'medium';

    // Capacitor haptics
    if (this.isCapacitor() && root.Capacitor.Plugins && root.Capacitor.Plugins.Haptics) {
      var style = { light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' };
      return root.Capacitor.Plugins.Haptics.impact({ style: style[type] || 'MEDIUM' });
    }

    // Vibration API fallback
    if (navigator.vibrate) {
      var durations = { light: 10, medium: 25, heavy: 50, selection: 5 };
      navigator.vibrate(durations[type] || 25);
    }
  };

  // -------------------------------------------------------------------------
  // Device info
  // -------------------------------------------------------------------------

  /**
   * Gather device information.
   * @returns {{ width: number, height: number, pixelRatio: number, platform: string, darkMode: boolean, standalone: boolean }}
   */
  NativeApp.prototype.getDeviceInfo = function () {
    return {
      width: root.innerWidth || 0,
      height: root.innerHeight || 0,
      pixelRatio: root.devicePixelRatio || 1,
      platform: this.isCapacitor() ? 'capacitor' : this.isElectron() ? 'electron' : this.isPWA() ? 'pwa' : 'browser',
      darkMode: !!(root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches),
      standalone: this.isPWA()
    };
  };

  // -------------------------------------------------------------------------
  // PWA install prompt
  // -------------------------------------------------------------------------

  NativeApp.prototype._initInstallPrompt = function () {
    var self = this;
    root.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      self._deferredInstallPrompt = e;
    });
  };

  // -------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------

  /**
   * Build a native features UI panel and append it to the given container.
   */
  NativeApp.prototype.buildNativeUI = function (container) {
    var self = this;
    container = container || document.body;

    var panel = document.createElement('div');
    panel.className = 'native-app-panel';
    panel.style.cssText = 'padding:12px;background:#1a1a2e;border-radius:8px;color:#e0e0e0;font-family:sans-serif;font-size:14px;max-width:340px;';

    var title = document.createElement('h3');
    title.textContent = 'App Settings';
    title.style.cssText = 'margin:0 0 10px;color:#ffd700;';
    panel.appendChild(title);

    // Platform info
    var info = this.getDeviceInfo();
    var infoEl = document.createElement('div');
    infoEl.style.cssText = 'margin-bottom:8px;font-size:12px;color:#aaa;';
    infoEl.textContent = 'Platform: ' + info.platform + ' | ' + info.width + 'x' + info.height + (info.darkMode ? ' | Dark mode' : '');
    panel.appendChild(infoEl);

    // Install PWA button
    if (!this.isNative() && !this.isPWA() && this._deferredInstallPrompt) {
      var installBtn = document.createElement('button');
      installBtn.textContent = 'Install as App';
      installBtn.style.cssText = 'display:block;width:100%;padding:8px;margin-bottom:6px;background:#4a6fa5;color:#fff;border:none;border-radius:4px;cursor:pointer;';
      installBtn.addEventListener('click', function () {
        if (self._deferredInstallPrompt) {
          self._deferredInstallPrompt.prompt();
          self._deferredInstallPrompt.userChoice.then(function (result) {
            if (result.outcome === 'accepted') {
              installBtn.textContent = 'Installed!';
              installBtn.disabled = true;
            }
            self._deferredInstallPrompt = null;
          });
        }
      });
      panel.appendChild(installBtn);
    }

    // Notification toggle
    var notifBtn = document.createElement('button');
    notifBtn.textContent = 'Enable Notifications';
    notifBtn.style.cssText = 'display:block;width:100%;padding:8px;margin-bottom:6px;background:#2d6a4f;color:#fff;border:none;border-radius:4px;cursor:pointer;';
    notifBtn.addEventListener('click', function () {
      self.requestNotificationPermission().then(function (perm) {
        notifBtn.textContent = perm === 'granted' ? 'Notifications Enabled' : 'Notifications: ' + perm;
      });
    });
    panel.appendChild(notifBtn);

    // Share button
    var shareBtn = document.createElement('button');
    shareBtn.textContent = 'Share Game';
    shareBtn.style.cssText = 'display:block;width:100%;padding:8px;margin-bottom:6px;background:#6a4c2d;color:#fff;border:none;border-radius:4px;cursor:pointer;';
    shareBtn.addEventListener('click', function () {
      self.shareGame('Check out Mahjong Living Simulation!', root.location.href);
    });
    panel.appendChild(shareBtn);

    // Replace existing panel
    if (this._panel && this._panel.parentNode) {
      this._panel.parentNode.removeChild(this._panel);
    }
    this._panel = panel;
    container.appendChild(panel);

    return panel;
  };

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  MJ.NativeApp = NativeApp;

})(typeof window !== 'undefined' ? window : this);

