/**
 * dragon-renderer.js — Canvas renderer for the D&D dragon battle
 * Renders cave map, character tokens, dragon, combat animations
 * Exports under window.MJ.Dragon.Renderer
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};

  var COLS = 20, ROWS = 15;
  function getMap() { return root.MJ.Dragon.Map; }
  var CLASS_ICONS = {
    Barbarian: '\u2694', Cleric: '\u271A', Wizard: '\u2605',
    Rogue: '\uD83D\uDDE1', Paladin: '\uD83D\uDEE1', Ranger: '\uD83C\uDFF9'
  };
  var STATUS_COLORS = {
    frightened: '#e74c3c', poisoned: '#27ae60',
    concentrating: '#f1c40f', prone: '#95a5a6'
  };

  function seededRand(seed) {
    var x = Math.sin(seed) * 43758.5453;
    return x - Math.floor(x);
  }

  function darkenHex(hex) {
    if (!hex || hex.charAt(0) !== '#') return '#333';
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, ((n >> 16) & 0xff) - 50);
    var g = Math.max(0, ((n >> 8) & 0xff) - 50);
    var b = Math.max(0, (n & 0xff) - 50);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function hpColor(ratio) {
    return ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f1c40f' : '#e74c3c';
  }

  // --- DragonRenderer ---
  function DragonRenderer() {
    this.canvas = null; this.ctx = null; this.cellSize = 0;
    this.animationQueue = []; this.activeAnimations = [];
    this.animFrameId = null; this.dirty = true;
    this.lastState = null; this.startTime = Date.now();
  }
  var P = DragonRenderer.prototype;

  P.init = function (container) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);
    var cellW = Math.floor(container.clientWidth / COLS);
    var cellH = Math.floor(container.clientHeight / ROWS);
    this.cellSize = Math.min(cellW, cellH);
    this.canvas.width = this.cellSize * COLS;
    this.canvas.height = this.cellSize * ROWS;
    this.ctx = this.canvas.getContext('2d');
    this.startTime = Date.now();
    return this.canvas;
  };

  P.render = function (state) {
    if (!this.ctx) return;
    this.lastState = state;
    var ctx = this.ctx, cs = this.cellSize;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    var map = getMap();
    if (map) this.drawCave(map.CAVE_MAP);
    this.drawGrid();
    if (state.movementRange) this.showMovementRange(state.movementRange);
    if (state.attackRange) this.showAttackRange(state.attackRange);
    if (state.aoeTemplate) this.showAoETemplate(state.aoeTemplate);
    var chars = state.characters || state.party || [];
    for (var i = 0; i < chars.length; i++) this.drawCharacter(chars[i], cs, state);
    if (state.dragon) this.drawDragon(state.dragon, cs);
    if (state.activeCharId) this._drawTurnBanner(state.activeCharId, state);
    this._processAnimations();
  };

  P.drawCave = function (caveMap) {
    var ctx = this.ctx, cs = this.cellSize, T = getMap().TILE_TYPES;
    var t = (Date.now() - this.startTime) / 1000;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = c * cs, y = r * cs, tile = caveMap[r][c];
        if (tile === T.WALL) {
          var grd = ctx.createLinearGradient(x, y, x + cs, y + cs);
          grd.addColorStop(0, '#2d1f0e'); grd.addColorStop(1, '#1a1209');
          ctx.fillStyle = grd; ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = '#1a1209';
          for (var ri = 0; ri < 3; ri++) {
            ctx.fillRect(
              x + seededRand(r * 100 + c * 10 + ri) * cs * 0.3,
              y + seededRand(r * 100 + c * 10 + ri + 50) * cs * 0.3,
              cs * 0.15, cs * 0.15);
          }
        } else if (tile === T.FLOOR) {
          this._drawFloor(ctx, x, y, cs, r, c);
        } else if (tile === T.RUBBLE) {
          this._drawFloor(ctx, x, y, cs, r, c);
          ctx.fillStyle = '#2a2318';
          for (var di = 0; di < 5; di++) {
            ctx.fillRect(
              x + seededRand(r * 73 + c * 37 + di) * cs * 0.8,
              y + seededRand(r * 37 + c * 73 + di) * cs * 0.8,
              cs * 0.12, cs * 0.1);
          }
        } else if (tile === T.LAVA) {
          var alpha = 0.7 + 0.3 * Math.sin(t * 2 + r * 0.5 + c * 0.3);
          var lg = ctx.createRadialGradient(
            x + cs / 2, y + cs / 2, cs * 0.1, x + cs / 2, y + cs / 2, cs * 0.7);
          lg.addColorStop(0, '#ff4500'); lg.addColorStop(1, '#cc3300');
          ctx.fillStyle = lg; ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = 'rgba(255,200,50,' + (alpha * 0.3) + ')';
          ctx.fillRect(x, y, cs, cs);
        } else if (tile === T.PILLAR) {
          this._drawFloor(ctx, x, y, cs, r, c);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath();
          ctx.ellipse(x + cs / 2, y + cs * 0.75, cs * 0.35, cs * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#666'; ctx.beginPath();
          ctx.arc(x + cs / 2, y + cs / 2, cs * 0.3, 0, Math.PI * 2);
          ctx.fill(); ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.stroke();
        } else if (tile === T.TREASURE) {
          this._drawFloor(ctx, x, y, cs, r, c);
          var golds = ['#ffd700', '#daa520'];
          for (var gi = 0; gi < 4; gi++) {
            ctx.fillStyle = golds[gi % 2];
            var gx = x + seededRand(r * 51 + c * 29 + gi) * cs * 0.7 + cs * 0.1;
            var gy = y + seededRand(r * 29 + c * 51 + gi) * cs * 0.7 + cs * 0.1;
            if (gi % 2 === 0) {
              ctx.beginPath(); ctx.arc(gx, gy, cs * 0.06, 0, Math.PI * 2); ctx.fill();
            } else { ctx.fillRect(gx, gy, cs * 0.1, cs * 0.07); }
          }
        } else if (tile === T.ENTRANCE) {
          this._drawFloor(ctx, x, y, cs, r, c);
          ctx.fillStyle = 'rgba(200,200,180,0.12)'; ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath();
          ctx.moveTo(x + cs / 2, y + cs * 0.2);
          ctx.lineTo(x + cs * 0.7, y + cs * 0.6);
          ctx.lineTo(x + cs * 0.3, y + cs * 0.6);
          ctx.closePath(); ctx.fill();
        }
      }
    }
  };

  P._drawFloor = function (ctx, x, y, cs, r, c) {
    var grd = ctx.createLinearGradient(x, y, x + cs, y + cs);
    grd.addColorStop(0, '#4a3f2f'); grd.addColorStop(1, '#3d3425');
    ctx.fillStyle = grd; ctx.fillRect(x, y, cs, cs);
    for (var ni = 0; ni < 4; ni++) {
      ctx.fillStyle = 'rgba(0,0,0,' + (seededRand(r * 131 + c * 97 + ni) * 0.08) + ')';
      ctx.fillRect(
        x + seededRand(r * 97 + c * 131 + ni) * cs,
        y + seededRand(r * 131 + c * 97 + ni + 7) * cs,
        cs * 0.15, cs * 0.15);
    }
  };

  P.drawGrid = function () {
    var ctx = this.ctx, cs = this.cellSize, map = getMap();
    if (!map) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.063)'; ctx.lineWidth = 0.5;
    for (var r = 0; r < ROWS; r++)
      for (var c = 0; c < COLS; c++)
        if (map.isPassable(r, c)) ctx.strokeRect(c * cs, r * cs, cs, cs);
  };

  P.drawCharacter = function (ch, cs, state) {
    if (!ch.position) return;
    var ctx = this.ctx;
    var x = ch.position.col * cs + cs / 2, y = ch.position.row * cs + cs / 2;
    var rad = cs * 0.38, isDowned = (ch.currentHp != null ? ch.currentHp : (ch.hp || 0)) <= 0;
    var isActive = state && state.activeCharId === ch.id;
    var isSelected = state && state.selectedCharId === ch.id;

    if (isActive) {
      var ta = 0.4 + 0.3 * Math.sin((Date.now() - this.startTime) / 1000 * 3);
      ctx.beginPath(); ctx.arc(x, y, rad + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,215,0,' + ta + ')'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fillStyle = isDowned ? '#555' : (ch.color || '#888'); ctx.fill();
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeStyle = isSelected ? '#fff' : darkenHex(ch.color || '#888'); ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = Math.floor(cs * 0.35) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(CLASS_ICONS[ch.class] || CLASS_ICONS[ch.className] || '?', x, y);

    if (isDowned) {
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
      var off = rad * 0.55; ctx.strokeStyle = '#c00'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - off, y - off); ctx.lineTo(x + off, y + off);
      ctx.moveTo(x + off, y - off); ctx.lineTo(x - off, y + off);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = Math.max(9, Math.floor(cs * 0.22)) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(ch.name || ch.id, x, y + rad + 2);

    if (!isDowned && (ch.maxHp || ch.maxHP))
      this.drawHPBar(ch.position.col * cs + cs * 0.1, ch.position.row * cs - 6,
        cs * 0.8, ch.currentHp != null ? ch.currentHp : (ch.hp || 0), ch.maxHp || ch.maxHP);
    if (ch.conditions && ch.conditions.length)
      this.drawStatusIcons(ch.position.col * cs + cs * 0.1, ch.position.row * cs - 14,
        ch.conditions);
  };

  P.drawDragon = function (dragon, cs) {
    if (!dragon.position) return;
    var ctx = this.ctx;
    var col = dragon.position.col, row = dragon.position.row;
    var cx = (col + 1.5) * cs, cy = (row + 1.5) * cs;
    var w3 = cs * 3, ox = col * cs, oy = row * cs;

    // Body oval
    var bg = ctx.createRadialGradient(cx, cy, cs * 0.3, cx, cy, cs * 1.4);
    bg.addColorStop(0, '#ff4500'); bg.addColorStop(1, '#8b0000');
    ctx.beginPath(); ctx.ellipse(cx, cy, w3 * 0.42, w3 * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = '#600'; ctx.lineWidth = 2; ctx.stroke();

    // Head triangle
    ctx.fillStyle = '#6b0000'; ctx.beginPath();
    ctx.moveTo(cx, oy + cs * 0.15);
    ctx.lineTo(cx - cs * 0.5, oy + cs); ctx.lineTo(cx + cs * 0.5, oy + cs);
    ctx.closePath(); ctx.fill();

    // Wings
    ctx.fillStyle = 'rgba(139,0,0,0.6)';
    ctx.beginPath(); ctx.moveTo(ox + cs * 0.3, cy);
    ctx.lineTo(ox - cs * 0.3, cy - cs); ctx.lineTo(ox + cs * 0.8, cy - cs * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ox + w3 - cs * 0.3, cy);
    ctx.lineTo(ox + w3 + cs * 0.3, cy - cs); ctx.lineTo(ox + w3 - cs * 0.8, cy - cs * 0.3);
    ctx.closePath(); ctx.fill();

    // Eyes
    ctx.fillStyle = '#ffff00';
    ctx.beginPath(); ctx.arc(cx - cs * 0.2, oy + cs * 0.55, cs * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + cs * 0.2, oy + cs * 0.55, cs * 0.08, 0, Math.PI * 2); ctx.fill();

    // Breath ready particles
    if (dragon.breathReady) {
      var t = (Date.now() - this.startTime) / 1000;
      for (var fi = 0; fi < 5; fi++) {
        var fx = cx + (seededRand(fi * 7 + Math.floor(t * 3)) - 0.5) * cs * 0.4;
        var fy = oy + cs * 0.1 - seededRand(fi * 11 + Math.floor(t * 4)) * cs * 0.3;
        ctx.fillStyle = 'rgba(255,140,0,' + (0.5 + 0.5 * Math.sin(t * 5 + fi)) + ')';
        ctx.beginPath(); ctx.arc(fx, fy, cs * 0.06, 0, Math.PI * 2); ctx.fill();
      }
    }
    // HP bar
    if (dragon.maxHp) {
      var ratio = (dragon.currentHp != null ? dragon.currentHp : (dragon.hp || 0)) / (dragon.maxHp || dragon.maxHP || 1);
      var barW = w3 * 0.8, barX = cx - barW / 2, barY = oy - 10;
      ctx.fillStyle = '#000'; ctx.fillRect(barX - 1, barY - 1, barW + 2, 8);
      ctx.fillStyle = hpColor(ratio);
      ctx.fillRect(barX, barY, barW * Math.max(0, ratio), 6);
      ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1;
      ctx.strokeRect(barX - 1, barY - 1, barW + 2, 8);
    }
    if (dragon.conditions && dragon.conditions.length)
      this.drawStatusIcons(cx - w3 * 0.3, oy - 20, dragon.conditions);
  };

  P.drawHPBar = function (x, y, width, current, max) {
    var ctx = this.ctx, ratio = Math.max(0, current / max);
    ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, width + 2, 6);
    ctx.fillStyle = hpColor(ratio); ctx.fillRect(x, y, width * ratio, 4);
  };

  P.drawStatusIcons = function (x, y, conditions) {
    var ctx = this.ctx;
    for (var i = 0; i < conditions.length; i++) {
      ctx.fillStyle = STATUS_COLORS[conditions[i]] || '#aaa';
      ctx.beginPath(); ctx.arc(x + i * 10 + 4, y + 4, 3, 0, Math.PI * 2); ctx.fill();
    }
  };

  // --- Highlight overlays ---
  P.showMovementRange = function (sq) { this._hlSq(sq, 'rgba(50,130,255,0.25)'); };
  P.showAttackRange   = function (sq) { this._hlSq(sq, 'rgba(220,50,50,0.25)'); };
  P.showAoETemplate   = function (sq) { this._hlSq(sq, 'rgba(255,165,0,0.35)'); };

  P._hlSq = function (squares, color) {
    var ctx = this.ctx, cs = this.cellSize;
    ctx.fillStyle = color;
    for (var i = 0; i < squares.length; i++)
      ctx.fillRect(squares[i].col * cs, squares[i].row * cs, cs, cs);
  };

  // --- Animation triggers ---
  P.animateAttack = function (from, to, color, callback) {
    this.activeAnimations.push({
      type: 'attack', from: from, to: to, color: color || '#fff',
      start: Date.now(), duration: 400, callback: callback
    }); this.dirty = true;
  };

  P.animateDamage = function (pos, amount) {
    this.activeAnimations.push({
      type: 'float', pos: pos, text: '-' + amount, color: '#e74c3c',
      start: Date.now(), duration: 1500
    }); this.dirty = true;
  };

  P.animateHeal = function (pos, amount) {
    this.activeAnimations.push({
      type: 'float', pos: pos, text: '+' + amount, color: '#2ecc71',
      sparkle: true, start: Date.now(), duration: 1500
    }); this.dirty = true;
  };

  P.animateBreathWeapon = function (origin, coneSquares, callback) {
    this.activeAnimations.push({
      type: 'breath', origin: origin, squares: coneSquares,
      start: Date.now(), duration: 2000, callback: callback
    }); this.dirty = true;
  };

  P.animateSpell = function (type, from, to, callback) {
    this.activeAnimations.push({
      type: 'spell', spellType: type, from: from, to: to,
      start: Date.now(), duration: 1200, callback: callback
    }); this.dirty = true;
  };

  // --- Animation processing ---
  P._processAnimations = function () {
    var ctx = this.ctx, cs = this.cellSize, now = Date.now(), remaining = [];
    for (var i = 0; i < this.activeAnimations.length; i++) {
      var a = this.activeAnimations[i];
      var prog = Math.min(1, (now - a.start) / a.duration);
      if (a.type === 'attack')     this._animAttack(ctx, cs, a, prog);
      else if (a.type === 'float') this._animFloat(ctx, cs, a, prog);
      else if (a.type === 'breath') this._animBreath(ctx, cs, a, prog);
      else if (a.type === 'spell') this._animSpell(ctx, cs, a, prog);
      if (prog < 1) remaining.push(a);
      else if (a.callback) a.callback();
    }
    this.activeAnimations = remaining;
    if (remaining.length > 0) this.dirty = true;
  };

  P._animAttack = function (ctx, cs, a, prog) {
    var fx = (a.from.col + 0.5) * cs, fy = (a.from.row + 0.5) * cs;
    var tx = (a.to.col + 0.5) * cs, ty = (a.to.row + 0.5) * cs;
    if (prog < 0.6) {
      var p = prog / 0.6;
      ctx.strokeStyle = a.color; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(fx, fy); ctx.lineTo(fx + (tx - fx) * p, fy + (ty - fy) * p); ctx.stroke();
    } else {
      var fade = 1 - (prog - 0.6) / 0.4;
      ctx.fillStyle = 'rgba(255,255,255,' + fade + ')';
      ctx.beginPath(); ctx.arc(tx, ty, cs * 0.4 * fade, 0, Math.PI * 2); ctx.fill();
    }
  };

  P._animFloat = function (ctx, cs, a, prog) {
    var x = (a.pos.col + 0.5) * cs, y = (a.pos.row + 0.5) * cs - prog * cs * 1.2;
    var alpha = 1 - prog;
    ctx.globalAlpha = alpha; ctx.fillStyle = a.color;
    ctx.font = 'bold ' + Math.floor(cs * 0.35) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(a.text, x, y);
    if (a.sparkle) {
      for (var si = 0; si < 3; si++) {
        var sx = x + (seededRand(si * 13 + Math.floor(prog * 10)) - 0.5) * cs;
        var sy = y + (seededRand(si * 17 + Math.floor(prog * 10)) - 0.5) * cs * 0.5;
        ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  P._animBreath = function (ctx, cs, a, prog) {
    var fade = prog < 0.5 ? prog * 2 : 2 - prog * 2;
    ctx.fillStyle = 'rgba(255,100,0,' + (fade * 0.5) + ')';
    var count = Math.floor(a.squares.length * Math.min(1, prog * 2));
    for (var i = 0; i < count; i++) {
      var sq = a.squares[i];
      ctx.fillRect(sq.col * cs, sq.row * cs, cs, cs);
    }
  };

  P._animSpell = function (ctx, cs, a, prog) {
    var tx = (a.to.col + 0.5) * cs, ty = (a.to.row + 0.5) * cs;
    var fx = (a.from.col + 0.5) * cs, fy = (a.from.row + 0.5) * cs;
    if (a.spellType === 'fireball') {
      ctx.fillStyle = 'rgba(255,120,0,' + ((1 - prog) * 0.6) + ')';
      ctx.beginPath(); ctx.arc(tx, ty, cs * 2 * prog, 0, Math.PI * 2); ctx.fill();
    } else if (a.spellType === 'magic_missile') {
      for (var bi = 0; bi < 3; bi++) {
        var p = Math.min(1, prog * 1.5 - bi * 0.15);
        if (p <= 0) continue;
        ctx.fillStyle = 'rgba(180,130,255,0.9)'; ctx.beginPath();
        ctx.arc(fx + (tx - fx) * p, fy + (ty - fy) * p + (bi - 1) * cs * 0.2,
          cs * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (a.spellType === 'healing') {
      for (var hi = 0; hi < 6; hi++) {
        ctx.fillStyle = 'rgba(46,204,113,' + (1 - prog) + ')'; ctx.beginPath();
        ctx.arc(tx + (seededRand(hi * 7) - 0.5) * cs,
          ty - prog * cs * 1.5 + seededRand(hi * 11) * cs * 0.5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,' + (1 - prog) + ')';
      ctx.beginPath(); ctx.arc(tx, ty, cs * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  };

  P._drawTurnBanner = function (activeId, state) {
    var chars = state.characters || state.party || [], name = activeId;
    for (var i = 0; i < chars.length; i++)
      if (chars[i].id === activeId) { name = chars[i].name || activeId; break; }
    if (state.dragon && state.dragon.id === activeId) name = state.dragon.name || 'Dragon';
    var ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, this.canvas.width, 22);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Turn: ' + name, this.canvas.width / 2, 11);
  };

  // --- Animation loop ---
  P.startAnimationLoop = function () {
    var self = this;
    (function loop() {
      self.animFrameId = requestAnimationFrame(loop);
      if (self.lastState) self.render(self.lastState);
    })();
  };

  P.stopAnimationLoop = function () {
    if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null; }
  };

  // --- Coordinate helpers ---
  P.getCellFromClick = function (x, y) {
    var cs = this.cellSize;
    if (cs <= 0) return null;
    var col = Math.floor(x / cs), row = Math.floor(y / cs);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { row: row, col: col };
  };

  P.highlightCell = function (row, col, color) {
    this.ctx.strokeStyle = color || '#fff'; this.ctx.lineWidth = 2;
    this.ctx.strokeRect(col * this.cellSize + 1, row * this.cellSize + 1,
      this.cellSize - 2, this.cellSize - 2);
  };

  // --- Export ---
  root.MJ.Dragon.Renderer = Object.freeze({
    DragonRenderer: DragonRenderer,
    create: function () { return new DragonRenderer(); }
  });

})(typeof window !== 'undefined' ? window : this);
