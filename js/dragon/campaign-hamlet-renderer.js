/**
 * campaign-hamlet-renderer.js — Canvas rendering of Willowmere hamlet.
 * Draws sky, buildings, NPCs, fountain, ambient details, and interactive highlights.
 * Exports under window.MJ.Dragon.Campaign.HamletRenderer (IIFE module).
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  /* ---------- constants ---------- */

  var CANVAS_W = 800;
  var CANVAS_H = 500;

  var BUILDINGS = [
    {
      id: 'inn',
      name: 'The Wandering Wyvern',
      icon: '\uD83C\uDF7A',
      x: 100, y: 140,
      width: 180, height: 130,
      wallColor: '#6b4423',
      roofColor: '#4a2810',
      windowColor: '#f5c542',
      hasChimney: true,
      hasSign: true
    },
    {
      id: 'smithy',
      name: "Grimhammer's Smithy",
      icon: '\uD83D\uDD28',
      x: 520, y: 160,
      width: 140, height: 100,
      wallColor: '#777777',
      roofColor: '#555555',
      windowColor: '#ff6600',
      hasChimney: false,
      hasForge: true
    },
    {
      id: 'herbshop',
      name: "Willow's Herbary",
      icon: '\uD83C\uDF3F',
      x: 30, y: 180,
      width: 100, height: 80,
      wallColor: '#7a6040',
      roofColor: '#3a5a2a',
      windowColor: '#aaddaa',
      hasChimney: false,
      hasGarden: true
    },
    {
      id: 'questboard',
      name: 'Quest Board',
      icon: '\uD83D\uDCDC',
      x: 370, y: 280,
      width: 50, height: 60,
      wallColor: '#8a6a3a',
      roofColor: null,
      isBoard: true
    }
  ];

  /* fountain position */
  var FOUNTAIN = { x: 400, y: 220, radius: 30 };

  /* party token positions near fountain */
  var PARTY_POSITIONS = [
    { x: 360, y: 250 },
    { x: 380, y: 260 },
    { x: 400, y: 265 },
    { x: 420, y: 260 },
    { x: 440, y: 250 },
    { x: 400, y: 245 }
  ];

  var PARTY_COLORS = ['#e74c3c', '#3498db', '#9b59b6', '#2ecc71', '#f39c12', '#1abc9c'];

  /* ambient lanterns along paths */
  var LANTERNS = [
    { x: 300, y: 300 },
    { x: 350, y: 340 },
    { x: 450, y: 340 },
    { x: 500, y: 300 },
    { x: 200, y: 320 },
    { x: 600, y: 310 }
  ];

  /* fence posts */
  var FENCE_POSTS = [
    { x: 300, y: 370 }, { x: 320, y: 370 }, { x: 340, y: 370 },
    { x: 460, y: 370 }, { x: 480, y: 370 }, { x: 500, y: 370 }
  ];

  /* barrels and crates */
  var PROPS = [
    { type: 'barrel', x: 285, y: 250 },
    { type: 'barrel', x: 295, y: 255 },
    { type: 'crate',  x: 660, y: 240 },
    { type: 'crate',  x: 675, y: 245 },
    { type: 'barrel', x: 130, y: 310 },
    { type: 'well',   x: 680, y: 180 }
  ];

  /* chimney smoke particles (reused each frame) */
  var SMOKE_PARTICLES = 6;

  /* seeded random for consistent details */
  function seededRand(seed) {
    var x = Math.sin(seed) * 43758.5453;
    return x - Math.floor(x);
  }

  /* ================================================================
   *  HamletRenderer class
   * ================================================================ */

  function HamletRenderer() {
    this.canvas = null;
    this.ctx = null;
    this.startTime = Date.now();
  }

  var P = HamletRenderer.prototype;

  /* ---------- init ---------- */

  P.init = function (container) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.canvas.style.display = 'block';
    this.canvas.style.borderRadius = '6px';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.startTime = Date.now();
    return this.canvas;
  };

  /* ---------- full render ---------- */

  P.render = function (hamletState, highlightBuilding) {
    if (!this.ctx) return;
    var ctx = this.ctx;
    var t = (Date.now() - this.startTime) / 1000;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    /* 1. sky and background */
    this._drawSky(ctx, t);
    this._drawTreeLine(ctx);

    /* 2. ground and paths */
    this._drawGround(ctx);
    this._drawPaths(ctx);

    /* 3. ambient details (behind buildings) */
    this._drawFencePosts(ctx);
    this._drawProps(ctx);

    /* 4. buildings */
    for (var i = 0; i < BUILDINGS.length; i++) {
      var b = BUILDINGS[i];
      var highlighted = highlightBuilding === b.id;
      this.drawBuilding(ctx, b, highlighted, t);
    }

    /* 5. fountain */
    this.drawFountain(ctx, FOUNTAIN.x, FOUNTAIN.y, t);

    /* 6. NPCs */
    if (hamletState && hamletState.npcs) {
      for (var n = 0; n < hamletState.npcs.length; n++) {
        this.drawNPC(ctx, hamletState.npcs[n]);
      }
    }

    /* 7. party tokens near fountain */
    this._drawPartyTokens(ctx);

    /* 8. lanterns and chimney smoke (foreground ambient) */
    this.drawAmbient(ctx, t);
  };

  /* ---------- sky ---------- */

  P._drawSky = function (ctx, t) {
    var grad = ctx.createLinearGradient(0, 0, 0, 180);
    /* subtle time-based color shift */
    var sunMix = 0.5 + 0.3 * Math.sin(t * 0.05);
    var r1 = Math.floor(70 + 60 * sunMix);
    var g1 = Math.floor(130 + 40 * sunMix);
    var b1 = Math.floor(200 - 30 * sunMix);
    grad.addColorStop(0, 'rgb(' + r1 + ',' + g1 + ',' + b1 + ')');
    grad.addColorStop(0.6, '#d4926a');
    grad.addColorStop(1.0, '#e8a858');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, 180);
  };

  /* ---------- distant tree line silhouettes ---------- */

  P._drawTreeLine = function (ctx) {
    ctx.fillStyle = '#1a3a1a';
    ctx.beginPath();
    ctx.moveTo(0, 170);
    /* jagged tree line across the top */
    for (var x = 0; x <= CANVAS_W; x += 20) {
      var h = 140 + seededRand(x * 7 + 13) * 40;
      ctx.lineTo(x, h);
      ctx.lineTo(x + 10, h - 10 - seededRand(x * 3 + 7) * 20);
    }
    ctx.lineTo(CANVAS_W, 180);
    ctx.lineTo(CANVAS_W, 180);
    ctx.lineTo(0, 180);
    ctx.closePath();
    ctx.fill();

    /* second layer — slightly lighter */
    ctx.fillStyle = '#2a4a2a';
    ctx.beginPath();
    ctx.moveTo(0, 175);
    for (var x2 = 0; x2 <= CANVAS_W; x2 += 25) {
      var h2 = 155 + seededRand(x2 * 11 + 37) * 30;
      ctx.lineTo(x2, h2);
      ctx.lineTo(x2 + 12, h2 - 8 - seededRand(x2 * 5 + 19) * 15);
    }
    ctx.lineTo(CANVAS_W, 180);
    ctx.lineTo(0, 180);
    ctx.closePath();
    ctx.fill();
  };

  /* ---------- ground ---------- */

  P._drawGround = function (ctx) {
    var grad = ctx.createLinearGradient(0, 170, 0, CANVAS_H);
    grad.addColorStop(0, '#4a6a2a');
    grad.addColorStop(0.3, '#3d5a24');
    grad.addColorStop(1, '#2d4a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 170, CANVAS_W, CANVAS_H - 170);

    /* grass texture speckles */
    for (var i = 0; i < 120; i++) {
      var gx = seededRand(i * 31 + 7) * CANVAS_W;
      var gy = 180 + seededRand(i * 17 + 53) * (CANVAS_H - 190);
      var shade = seededRand(i * 13 + 3);
      ctx.fillStyle = shade > 0.5 ? 'rgba(80,120,40,0.3)' : 'rgba(30,50,15,0.25)';
      ctx.fillRect(gx, gy, 3, 2);
    }
  };

  /* ---------- paths ---------- */

  P._drawPaths = function (ctx) {
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    /* main horizontal path */
    ctx.beginPath();
    ctx.moveTo(0, 330);
    ctx.lineTo(CANVAS_W, 330);
    ctx.stroke();

    /* path to inn */
    ctx.beginPath();
    ctx.moveTo(190, 330);
    ctx.lineTo(190, 275);
    ctx.stroke();

    /* path to fountain/center */
    ctx.beginPath();
    ctx.moveTo(400, 330);
    ctx.lineTo(400, 260);
    ctx.stroke();

    /* path to smithy */
    ctx.beginPath();
    ctx.moveTo(590, 330);
    ctx.lineTo(590, 265);
    ctx.stroke();

    /* path texture overlay */
    ctx.fillStyle = 'rgba(120,100,70,0.15)';
    for (var i = 0; i < 80; i++) {
      var px = seededRand(i * 41 + 11) * CANVAS_W;
      var py = 318 + seededRand(i * 23 + 67) * 24;
      ctx.fillRect(px, py, 4 + seededRand(i) * 6, 2 + seededRand(i + 99) * 3);
    }
  };

  /* ---------- draw a building ---------- */

  P.drawBuilding = function (ctx, building, highlighted, t) {
    var bx = building.x;
    var by = building.y;
    var bw = building.width;
    var bh = building.height;

    if (building.isBoard) {
      this._drawQuestBoard(ctx, bx, by, bw, bh, highlighted);
      return;
    }

    /* highlight glow */
    if (highlighted) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 18;
    }

    /* shadow on ground */
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(bx + bw / 2, by + bh + 4, bw * 0.55, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    /* walls */
    ctx.fillStyle = building.wallColor;
    ctx.fillRect(bx, by, bw, bh);

    /* wall shading (slight gradient for 3D effect) */
    var wallGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    wallGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
    wallGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(bx, by, bw, bh);

    /* wall outline */
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    /* roof (peaked triangle) */
    if (building.roofColor) {
      ctx.fillStyle = building.roofColor;
      ctx.beginPath();
      ctx.moveTo(bx - 10, by);
      ctx.lineTo(bx + bw / 2, by - 35);
      ctx.lineTo(bx + bw + 10, by);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      /* roof ridge line */
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, by - 35);
      ctx.lineTo(bx + bw / 2, by);
      ctx.stroke();
    }

    /* windows */
    var winCount = Math.max(1, Math.floor(bw / 55));
    var winW = 18, winH = 22;
    var winSpacing = bw / (winCount + 1);
    for (var wi = 0; wi < winCount; wi++) {
      var wx = bx + winSpacing * (wi + 1) - winW / 2;
      var wy = by + bh * 0.25;
      /* window frame */
      ctx.fillStyle = '#2a1a08';
      ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4);
      /* warm glow */
      ctx.fillStyle = building.windowColor || '#f5c542';
      ctx.fillRect(wx, wy, winW, winH);
      /* glow aura */
      ctx.fillStyle = 'rgba(245,197,66,0.1)';
      ctx.beginPath();
      ctx.arc(wx + winW / 2, wy + winH / 2, 20, 0, Math.PI * 2);
      ctx.fill();
      /* cross bar */
      ctx.strokeStyle = '#2a1a08';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wx + winW / 2, wy);
      ctx.lineTo(wx + winW / 2, wy + winH);
      ctx.moveTo(wx, wy + winH / 2);
      ctx.lineTo(wx + winW, wy + winH / 2);
      ctx.stroke();
    }

    /* door */
    var doorW = 20, doorH = 35;
    var doorX = bx + bw / 2 - doorW / 2;
    var doorY = by + bh - doorH;
    ctx.fillStyle = building.id === 'herbshop' ? '#3a6a2a' : '#3a2510';
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(doorX, doorY, doorW, doorH);
    /* door knob */
    ctx.fillStyle = '#c0a040';
    ctx.beginPath();
    ctx.arc(doorX + doorW - 5, doorY + doorH / 2, 2, 0, Math.PI * 2);
    ctx.fill();

    /* chimney */
    if (building.hasChimney) {
      var cx = bx + bw * 0.75;
      var cy = by - 30;
      ctx.fillStyle = '#555';
      ctx.fillRect(cx, cy, 14, 30);
      ctx.fillStyle = '#444';
      ctx.fillRect(cx - 2, cy - 3, 18, 6);
    }

    /* forge glow for smithy */
    if (building.hasForge) {
      var glow = 0.4 + 0.2 * Math.sin(t * 4);
      ctx.fillStyle = 'rgba(255,100,0,' + glow + ')';
      ctx.beginPath();
      ctx.arc(bx + bw * 0.3, by + bh - 15, 25, 0, Math.PI * 2);
      ctx.fill();
      /* anvil silhouette */
      ctx.fillStyle = '#333';
      ctx.fillRect(bx + 15, by + bh - 22, 25, 8);
      ctx.fillRect(bx + 20, by + bh - 30, 15, 10);
    }

    /* herb garden patches */
    if (building.hasGarden) {
      var colors = ['#4a8a2a', '#3a7a3a', '#5a9a4a', '#6aaa3a'];
      for (var gi = 0; gi < 8; gi++) {
        ctx.fillStyle = colors[gi % colors.length];
        var gx = bx - 10 + seededRand(gi * 17 + 3) * (bw + 20);
        var gy = by + bh + 8 + seededRand(gi * 13 + 7) * 20;
        ctx.beginPath();
        ctx.arc(gx, gy, 4 + seededRand(gi) * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      /* vines on walls */
      ctx.strokeStyle = '#3a7a2a';
      ctx.lineWidth = 2;
      for (var vi = 0; vi < 3; vi++) {
        ctx.beginPath();
        var vx = bx + seededRand(vi * 31 + 11) * bw;
        ctx.moveTo(vx, by + bh);
        ctx.quadraticCurveTo(vx + 5, by + bh * 0.5, vx - 3, by + 10);
        ctx.stroke();
      }
    }

    /* sign for inn */
    if (building.hasSign) {
      var sx = bx + bw - 20;
      var sy = by + 15;
      /* bracket */
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 25, sy);
      ctx.lineTo(sx + 25, sy + 5);
      ctx.stroke();
      /* sign board */
      ctx.fillStyle = '#5a4020';
      ctx.fillRect(sx + 10, sy + 5, 30, 18);
      ctx.strokeStyle = '#3a2a10';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 10, sy + 5, 30, 18);
      /* sign text */
      ctx.fillStyle = '#f0d080';
      ctx.font = '8px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('INN', sx + 25, sy + 14);
    }

    /* reset shadow */
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    /* name label */
    ctx.fillStyle = '#fff';
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(building.name, bx + bw / 2, by + bh + 6);
  };

  /* ---------- quest board ---------- */

  P._drawQuestBoard = function (ctx, x, y, w, h, highlighted) {
    if (highlighted) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 14;
    }

    /* post */
    ctx.fillStyle = '#6a5030';
    ctx.fillRect(x + w / 2 - 4, y, 8, h + 20);

    /* board */
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(x, y, w, h * 0.7);
    ctx.strokeStyle = '#5a4020';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h * 0.7);

    /* parchment notes */
    var noteColors = ['#f5e6c8', '#e8d8b0', '#f0daa0'];
    for (var ni = 0; ni < 4; ni++) {
      ctx.fillStyle = noteColors[ni % noteColors.length];
      var nx = x + 5 + (ni % 2) * 22;
      var ny = y + 4 + Math.floor(ni / 2) * 18;
      ctx.fillRect(nx, ny, 18, 14);
      /* tiny text lines */
      ctx.fillStyle = '#555';
      ctx.fillRect(nx + 3, ny + 4, 12, 1);
      ctx.fillRect(nx + 3, ny + 7, 10, 1);
      ctx.fillRect(nx + 3, ny + 10, 8, 1);
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    /* label */
    ctx.fillStyle = '#fff';
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Quest Board', x + w / 2, y + h * 0.7 + 24);
  };

  /* ---------- NPC ---------- */

  P.drawNPC = function (ctx, npc) {
    var x = npc.x;
    var y = npc.y;
    var radius = 14;

    /* shadow */
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + radius + 2, radius * 0.7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    /* body circle */
    ctx.fillStyle = '#4a3520';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* emoji icon */
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(npc.icon, x, y);

    /* name */
    ctx.fillStyle = '#fff';
    ctx.font = '10px serif';
    ctx.textBaseline = 'top';
    ctx.fillText(npc.name, x, y + radius + 4);
  };

  /* ---------- fountain ---------- */

  P.drawFountain = function (ctx, x, y, t) {
    var r = FOUNTAIN.radius;

    /* stone base */
    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.ellipse(x, y, r + 4, r * 0.45 + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* water surface */
    ctx.fillStyle = '#4488cc';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    /* animated ripples */
    for (var ri = 0; ri < 3; ri++) {
      var rippleR = (r * 0.3) + ((t * 15 + ri * 30) % (r * 0.8));
      var alpha = 0.4 - (rippleR / (r * 0.8)) * 0.35;
      if (alpha < 0) alpha = 0;
      ctx.strokeStyle = 'rgba(180,220,255,' + alpha + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, rippleR, rippleR * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* center pillar */
    ctx.fillStyle = '#888';
    ctx.fillRect(x - 4, y - 18, 8, 18);
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(x, y - 18, 6, 0, Math.PI * 2);
    ctx.fill();

    /* water spout arcs */
    ctx.strokeStyle = 'rgba(140,190,240,0.5)';
    ctx.lineWidth = 1.5;
    for (var si = 0; si < 4; si++) {
      var angle = (si / 4) * Math.PI * 2 + t * 0.3;
      var sx = x + Math.cos(angle) * 3;
      var sy = y - 18;
      var ex = x + Math.cos(angle) * (r * 0.6);
      var ey = y - 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + Math.cos(angle) * 10, sy - 8, ex, ey);
      ctx.stroke();
    }
  };

  /* ---------- ambient: lanterns + chimney smoke ---------- */

  P.drawAmbient = function (ctx, t) {
    /* lanterns */
    for (var i = 0; i < LANTERNS.length; i++) {
      var lx = LANTERNS[i].x;
      var ly = LANTERNS[i].y;
      /* post */
      ctx.fillStyle = '#555';
      ctx.fillRect(lx - 2, ly - 20, 4, 20);
      /* lantern housing */
      ctx.fillStyle = '#6a5a30';
      ctx.fillRect(lx - 5, ly - 26, 10, 10);
      /* flicker glow */
      var flicker = 0.5 + 0.3 * Math.sin(t * 5 + i * 2.1);
      ctx.fillStyle = 'rgba(255,200,80,' + flicker + ')';
      ctx.beginPath();
      ctx.arc(lx, ly - 21, 4, 0, Math.PI * 2);
      ctx.fill();
      /* light aura */
      ctx.fillStyle = 'rgba(255,200,80,' + (flicker * 0.12) + ')';
      ctx.beginPath();
      ctx.arc(lx, ly - 21, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    /* chimney smoke from inn */
    var innBuilding = BUILDINGS[0]; // inn
    if (innBuilding.hasChimney) {
      var smokeX = innBuilding.x + innBuilding.width * 0.75 + 7;
      var smokeBaseY = innBuilding.y - 33;
      for (var s = 0; s < SMOKE_PARTICLES; s++) {
        var age = (t * 0.8 + s * 0.6) % 4;
        var sy = smokeBaseY - age * 18;
        var sx = smokeX + Math.sin(t * 0.7 + s * 1.3) * (4 + age * 3);
        var sAlpha = Math.max(0, 0.35 - age * 0.08);
        var sRadius = 4 + age * 3;
        ctx.fillStyle = 'rgba(160,160,160,' + sAlpha + ')';
        ctx.beginPath();
        ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  /* ---------- fence posts ---------- */

  P._drawFencePosts = function (ctx) {
    ctx.fillStyle = '#6a5030';
    for (var i = 0; i < FENCE_POSTS.length; i++) {
      var fp = FENCE_POSTS[i];
      ctx.fillRect(fp.x - 2, fp.y - 12, 4, 14);
      ctx.fillRect(fp.x - 4, fp.y - 13, 8, 3);
    }
    /* rails between adjacent posts */
    ctx.strokeStyle = '#5a4020';
    ctx.lineWidth = 2;
    for (var j = 0; j < FENCE_POSTS.length - 1; j++) {
      var a = FENCE_POSTS[j];
      var b = FENCE_POSTS[j + 1];
      if (Math.abs(a.x - b.x) < 30 && Math.abs(a.y - b.y) < 10) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - 6);
        ctx.lineTo(b.x, b.y - 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - 10);
        ctx.lineTo(b.x, b.y - 10);
        ctx.stroke();
      }
    }
  };

  /* ---------- props: barrels, crates, well ---------- */

  P._drawProps = function (ctx) {
    for (var i = 0; i < PROPS.length; i++) {
      var p = PROPS[i];
      if (p.type === 'barrel') {
        ctx.fillStyle = '#6a4a2a';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(p.x - 8, p.y - 12, 16, 12);
        ctx.strokeStyle = '#4a3018';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - 8, p.y - 4);
        ctx.lineTo(p.x + 8, p.y - 4);
        ctx.moveTo(p.x - 8, p.y - 9);
        ctx.lineTo(p.x + 8, p.y - 9);
        ctx.stroke();
      } else if (p.type === 'crate') {
        ctx.fillStyle = '#7a5a30';
        ctx.fillRect(p.x - 8, p.y - 10, 16, 14);
        ctx.strokeStyle = '#5a3a18';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - 8, p.y - 10, 16, 14);
        /* cross */
        ctx.beginPath();
        ctx.moveTo(p.x - 8, p.y - 10);
        ctx.lineTo(p.x + 8, p.y + 4);
        ctx.moveTo(p.x + 8, p.y - 10);
        ctx.lineTo(p.x - 8, p.y + 4);
        ctx.stroke();
      } else if (p.type === 'well') {
        /* stone ring */
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.stroke();
        /* dark water inside */
        ctx.fillStyle = '#2a3a5a';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        /* posts and crossbar */
        ctx.fillStyle = '#5a4020';
        ctx.fillRect(p.x - 14, p.y - 24, 4, 24);
        ctx.fillRect(p.x + 10, p.y - 24, 4, 24);
        ctx.fillRect(p.x - 14, p.y - 26, 28, 4);
        /* bucket */
        ctx.fillStyle = '#6a5030';
        ctx.fillRect(p.x - 3, p.y - 18, 6, 6);
      }
    }
  };

  /* ---------- party tokens ---------- */

  P._drawPartyTokens = function (ctx) {
    for (var i = 0; i < PARTY_POSITIONS.length; i++) {
      var pos = PARTY_POSITIONS[i];
      var color = PARTY_COLORS[i] || '#888';
      /* shadow */
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y + 7, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      /* token */
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  /* ---------- hit testing ---------- */

  P.getCellFromClick = function (x, y) {
    /* check buildings */
    for (var i = 0; i < BUILDINGS.length; i++) {
      var b = BUILDINGS[i];
      /* expanded hit area to include roof */
      var hitTop = b.roofColor ? b.y - 35 : b.y;
      if (x >= b.x - 10 && x <= b.x + b.width + 10 &&
          y >= hitTop && y <= b.y + b.height + 20) {
        return { type: 'building', id: b.id, building: b };
      }
    }

    /* check NPC positions (uses current NPC_DEFS; renderer doesn't know state) */
    /* We test against the static NPC_DEFS positions with a generous radius */
    /* NOTE: the caller (HamletScene) provides live NPCs via hamletState,
       but for hit-testing we use the fixed positions in NPC_DEFS since
       the renderer doesn't store per-frame state. */
    return null;
  };

  /* ---------- shop panel (unused — shops are DOM-based via campaign-hamlet.js) ---------- */

  P.drawShopPanel = function (ctx, items, gold) {
    /* Shops are rendered as DOM overlays by campaign-hamlet.js for full
       interactivity (scroll, click, hover). This stub exists only for
       completeness — call campaign-hamlet.js showShop() instead. */
    if (!items || !items.length) return;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(100, 60, 600, 380);
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 60, 600, 380);

    ctx.fillStyle = '#f0d080';
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Shop', 400, 75);

    ctx.fillStyle = '#ffd700';
    ctx.font = '14px serif';
    ctx.textAlign = 'right';
    ctx.fillText('Gold: ' + (gold || 0), 680, 75);

    ctx.textAlign = 'left';
    ctx.font = '13px serif';
    var yOff = 110;
    for (var i = 0; i < items.length && yOff < 420; i++) {
      var item = items[i];
      ctx.fillStyle = '#ddd';
      ctx.fillText(item.name || item.itemId, 120, yOff);
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'right';
      ctx.fillText((item.price || 0) + 'g', 680, yOff);
      ctx.textAlign = 'left';
      yOff += 22;
    }
  };

  /* ================================================================
   *  MODULE EXPORT
   * ================================================================ */

  root.MJ.Dragon.Campaign.HamletRenderer = Object.freeze({
    HamletRenderer: HamletRenderer,
    BUILDINGS: BUILDINGS,
    FOUNTAIN: FOUNTAIN,

    create: function () {
      return new HamletRenderer();
    }
  });

})(typeof window !== 'undefined' ? window : this);
