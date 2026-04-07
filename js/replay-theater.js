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
