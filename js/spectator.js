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
