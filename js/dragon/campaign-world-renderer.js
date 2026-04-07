/**
 * campaign-world-renderer.js — Canvas rendering of the hexagonal world map.
 * Exports under window.MJ.Dragon.Campaign.WorldRenderer (IIFE module).
 * Dependencies (lazy): MJ.Dragon.Campaign.World
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  function W() { return root.MJ.Dragon.Campaign.World; }

  var SQRT3 = Math.sqrt(3);
  var PI2 = Math.PI * 2;

  /* ========== WorldMapRenderer ========== */

  function WorldMapRenderer() {
    this.canvas  = null;
    this.ctx     = null;
    this.hexSize = 30;       /* radius from center to vertex */
    this.offsetX = 0;
    this.offsetY = 0;
    this.width   = 0;
    this.height  = 0;
    this._animFrame = null;
    this._travelAnim = null;
    this._highlightedHex = null;
    this._time = 0;
  }

  /* ---------- init ---------- */

  WorldMapRenderer.prototype.init = function (container) {
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }
    if (!container) { return; }

    var world = W();
    var dim = world.getGridDimensions();
    var cols = dim.cols;
    var rows = dim.rows;

    /* Size each hex so the full grid fits ~800x500 */
    this.hexSize = 30;
    var hexW = SQRT3 * this.hexSize;
    var hexH = 2 * this.hexSize;

    this.width  = Math.ceil(hexW * cols + hexW * 0.5 + 40);
    this.height = Math.ceil(hexH * 0.75 * (rows - 1) + hexH + 40);

    /* Padding offset so hex (0,0) isn't clipped */
    this.offsetX = this.hexSize + 10;
    this.offsetY = this.hexSize + 10;

    this.canvas = document.createElement('canvas');
    this.canvas.width  = this.width;
    this.canvas.height = this.height;
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    this.canvas.style.background = '#1a1a2e';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.cursor = 'pointer';

    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    return this;
  };

  /* ---------- Hex geometry (pointy-top, odd-r offset) ---------- */

  WorldMapRenderer.prototype.hexToPixel = function (q, r) {
    var size = this.hexSize;
    var x = size * SQRT3 * (q + 0.5 * (r & 1));
    var y = size * 1.5 * r;
    return { x: x + this.offsetX, y: y + this.offsetY };
  };

  WorldMapRenderer.prototype.pixelToHex = function (px, py) {
    var size = this.hexSize;
    var x = px - this.offsetX;
    var y = py - this.offsetY;

    /* Fractional axial from pixel */
    var r = (2.0 / 3.0) * y / size;
    var q = (SQRT3 / 3.0 * y - y) / size;  /* placeholder — use proper inverse */

    /* Proper inverse for odd-r offset: iterate candidates */
    var world = W();
    var dim = world.getGridDimensions();
    var bestQ = 0, bestR = 0, bestDist = Infinity;
    for (var rr = 0; rr < dim.rows; rr++) {
      for (var qq = 0; qq < dim.cols; qq++) {
        var center = this.hexToPixel(qq, rr);
        var dx = center.x - px;
        var dy = center.y - py;
        var dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestQ = qq;
          bestR = rr;
        }
      }
    }
    return { q: bestQ, r: bestR };
  };

  /* ---------- Draw a single pointy-top hexagon ---------- */

  WorldMapRenderer.prototype.drawHex = function (ctx, cx, cy, size, fillColor, strokeColor) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var angle = PI2 / 6 * i - Math.PI / 6;
      var vx = cx + size * Math.cos(angle);
      var vy = cy + size * Math.sin(angle);
      if (i === 0) { ctx.moveTo(vx, vy); }
      else { ctx.lineTo(vx, vy); }
    }
    ctx.closePath();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  /* ---------- Terrain-specific rendering ---------- */

  WorldMapRenderer.prototype.drawTerrain = function (ctx, terrain, cx, cy, size) {
    var world = W();
    var baseColor = world.getTerrainColor(terrain);

    /* Base hex fill */
    this.drawHex(ctx, cx, cy, size, baseColor, null);

    /* Terrain details */
    switch (terrain) {

      case 'plains':
        this._drawGrass(ctx, cx, cy, size);
        break;

      case 'forest':
        this._drawTrees(ctx, cx, cy, size);
        break;

      case 'mountain':
        this._drawPeaks(ctx, cx, cy, size);
        break;

      case 'swamp':
        this._drawPuddles(ctx, cx, cy, size);
        break;

      case 'river':
        this._drawWaves(ctx, cx, cy, size);
        break;

      case 'road':
        this._drawRoadPath(ctx, cx, cy, size);
        break;
    }
  };

  WorldMapRenderer.prototype._drawGrass = function (ctx, cx, cy, size) {
    ctx.strokeStyle = '#a89030';
    ctx.lineWidth = 1;
    var s = size * 0.4;
    for (var i = 0; i < 5; i++) {
      var gx = cx + (Math.random() - 0.5) * s * 2;
      var gy = cy + (Math.random() - 0.5) * s * 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + 2, gy - 6, gx - 1, gy - 10);
      ctx.stroke();
    }
  };

  WorldMapRenderer.prototype._drawTrees = function (ctx, cx, cy, size) {
    var s = size * 0.35;
    var treeCount = 4 + Math.floor(Math.random() * 3);
    for (var i = 0; i < treeCount; i++) {
      var tx = cx + (Math.random() - 0.5) * s * 2.5;
      var ty = cy + (Math.random() - 0.5) * s * 2.5;
      /* Small triangle tree */
      ctx.fillStyle = '#1a4d1a';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 7);
      ctx.lineTo(tx - 4, ty + 3);
      ctx.lineTo(tx + 4, ty + 3);
      ctx.closePath();
      ctx.fill();
      /* Trunk */
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(tx - 1, ty + 3, 2, 3);
    }
  };

  WorldMapRenderer.prototype._drawPeaks = function (ctx, cx, cy, size) {
    var peaks = [
      { dx: -8, dy: 2, h: 14, w: 10 },
      { dx:  4, dy: 4, h: 11, w: 8 },
      { dx: -2, dy: -2, h: 16, w: 12 }
    ];
    for (var i = 0; i < peaks.length; i++) {
      var p = peaks[i];
      var px = cx + p.dx;
      var py = cy + p.dy;
      /* Jagged peak silhouette */
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.moveTo(px - p.w / 2, py + 4);
      ctx.lineTo(px - 2, py - p.h);
      ctx.lineTo(px + 1, py - p.h + 3);
      ctx.lineTo(px + 3, py - p.h - 1);
      ctx.lineTo(px + p.w / 2, py + 4);
      ctx.closePath();
      ctx.fill();
      /* Snow cap */
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.moveTo(px - 2, py - p.h);
      ctx.lineTo(px + 1, py - p.h + 3);
      ctx.lineTo(px + 3, py - p.h - 1);
      ctx.lineTo(px, py - p.h + 5);
      ctx.closePath();
      ctx.fill();
    }
  };

  WorldMapRenderer.prototype._drawPuddles = function (ctx, cx, cy, size) {
    ctx.fillStyle = 'rgba(40, 80, 50, 0.6)';
    for (var i = 0; i < 5; i++) {
      var px = cx + (Math.random() - 0.5) * size * 0.7;
      var py = cy + (Math.random() - 0.5) * size * 0.7;
      ctx.beginPath();
      ctx.arc(px, py, 2 + Math.random() * 3, 0, PI2);
      ctx.fill();
    }
    /* Reeds */
    ctx.strokeStyle = '#5a7a3a';
    ctx.lineWidth = 1;
    for (var j = 0; j < 3; j++) {
      var rx = cx + (Math.random() - 0.5) * size * 0.5;
      var ry = cy + (Math.random() - 0.5) * size * 0.4;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 1, ry - 8);
      ctx.stroke();
    }
  };

  WorldMapRenderer.prototype._drawWaves = function (ctx, cx, cy, size) {
    var time = this._time || 0;
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.6)';
    ctx.lineWidth = 1.5;
    for (var i = -1; i <= 1; i++) {
      var wy = cy + i * 7;
      ctx.beginPath();
      for (var x = -size * 0.5; x <= size * 0.5; x += 2) {
        var yOff = Math.sin((x + time * 40) * 0.2) * 2;
        if (x === -size * 0.5) { ctx.moveTo(cx + x, wy + yOff); }
        else { ctx.lineTo(cx + x, wy + yOff); }
      }
      ctx.stroke();
    }
  };

  WorldMapRenderer.prototype._drawRoadPath = function (ctx, cx, cy, size) {
    /* Tan path through hex center */
    ctx.strokeStyle = '#a08050';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.5, cy);
    ctx.lineTo(cx + size * 0.5, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.5);
    ctx.lineTo(cx, cy + size * 0.5);
    ctx.stroke();
    /* Edge pebbles */
    ctx.fillStyle = '#6b5a3a';
    for (var i = 0; i < 4; i++) {
      var px = cx + (Math.random() - 0.5) * size * 0.4;
      var py = cy + (Math.random() - 0.5) * size * 0.4;
      ctx.beginPath();
      ctx.arc(px, py, 1, 0, PI2);
      ctx.fill();
    }
  };

  /* ---------- Location marker ---------- */

  WorldMapRenderer.prototype.drawLocationMarker = function (ctx, location, cx, cy, completed) {
    /* Icon */
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(location.icon || '?', cx, cy - 4);

    /* Name label */
    var name = location.name || location.locationId;
    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeText(name, cx, cy + 14);
    ctx.fillText(name, cx, cy + 14);

    /* Completion checkmark */
    if (completed) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#4cff4c';
      ctx.fillText('\u2713', cx + 10, cy - 10);
    }
  };

  /* ---------- Party token ---------- */

  WorldMapRenderer.prototype.drawPartyToken = function (ctx, cx, cy, time) {
    /* Pulsing glow */
    var glowAlpha = 0.3 + 0.2 * Math.sin(time * 3);
    var glowRadius = 18 + 3 * Math.sin(time * 3);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, PI2);
    ctx.fillStyle = 'rgba(255, 215, 0, ' + glowAlpha + ')';
    ctx.fill();

    /* Golden circle */
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, PI2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* Sword icon */
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#333';
    ctx.fillText('\u2694', cx, cy);
    ctx.restore();
  };

  /* ---------- Fog of war ---------- */

  WorldMapRenderer.prototype.drawFogOfWar = function (ctx, cx, cy, size) {
    this.drawHex(ctx, cx, cy, size, 'rgba(10, 10, 20, 0.70)', null);
  };

  /* ---------- Highlight hex ---------- */

  WorldMapRenderer.prototype.highlightHex = function (q, r, color) {
    this._highlightedHex = { q: q, r: r, color: color || 'rgba(255,255,100,0.3)' };
  };

  WorldMapRenderer.prototype.clearHighlight = function () {
    this._highlightedHex = null;
  };

  /* ---------- Full render ---------- */

  WorldMapRenderer.prototype.render = function (worldState, partyHex, locations, visitedLocations) {
    if (!this.ctx) { return; }
    var ctx = this.ctx;
    var world = W();
    var dim = world.getGridDimensions();
    var cols = dim.cols;
    var rows = dim.rows;
    var size = this.hexSize;
    var visited = visitedLocations || {};
    var now = Date.now() / 1000;
    this._time = now;

    /* 1. Clear canvas */
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    /* Build location lookup */
    var locLookup = {};
    if (locations) {
      for (var li = 0; li < locations.length; li++) {
        var loc = locations[li];
        locLookup[loc.q + ',' + loc.r] = loc;
      }
    }

    /* Seed random consistently per-hex for terrain details */
    var savedRandom = Math.random;

    /* 2-6. Draw hexes */
    for (var r = 0; r < rows; r++) {
      for (var q = 0; q < cols; q++) {
        var hex = world.getHex(q, r);
        if (!hex) { continue; }
        var center = this.hexToPixel(q, r);
        var cx = center.x;
        var cy = center.y;

        /* Seed pseudo-random per hex for consistent terrain decoration */
        this._seedRandom(q * 1000 + r);

        /* 2. Terrain fill */
        this.drawTerrain(ctx, hex.terrain, cx, cy, size);

        /* 6. Hex borders */
        this.drawHex(ctx, cx, cy, size, null, '#333');

        /* 3. Fog of war */
        if (!hex.explored) {
          this.drawFogOfWar(ctx, cx, cy, size);
        } else {
          /* 4. Location markers (only on explored hexes) */
          var locKey = q + ',' + r;
          if (locLookup[locKey]) {
            var locData = locLookup[locKey];
            var isCompleted = visited[locData.locationId] === true;
            this.drawLocationMarker(ctx, locData, cx, cy, isCompleted);
          }
        }
      }
    }

    /* Highlighted hex overlay */
    if (this._highlightedHex) {
      var hh = this._highlightedHex;
      var hc = this.hexToPixel(hh.q, hh.r);
      this.drawHex(ctx, hc.x, hc.y, size, hh.color, null);
    }

    /* 5. Party token (animated) */
    if (partyHex) {
      var pq = partyHex.q;
      var pr = partyHex.r;

      /* If travel animation is running, interpolate position */
      if (this._travelAnim) {
        var ta = this._travelAnim;
        var t = (now - ta.startTime) / ta.duration;
        if (t >= 1) {
          t = 1;
          var cb = ta.callback;
          this._travelAnim = null;
          pq = ta.toQ;
          pr = ta.toR;
          if (cb) { setTimeout(cb, 0); }
        }
        var fromPx = this.hexToPixel(ta.fromQ, ta.fromR);
        var toPx   = this.hexToPixel(ta.toQ, ta.toR);
        var pcx = fromPx.x + (toPx.x - fromPx.x) * t;
        var pcy = fromPx.y + (toPx.y - fromPx.y) * t;
        this.drawPartyToken(ctx, pcx, pcy, now);
      } else {
        var pc = this.hexToPixel(pq, pr);
        this.drawPartyToken(ctx, pc.x, pc.y, now);
      }
    }

    /* Restore Math.random */
    Math.random = savedRandom;

    /* 7. Optional grid coordinates (debug) */
    if (this._showCoords) {
      ctx.font = '7px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (r = 0; r < rows; r++) {
        for (q = 0; q < cols; q++) {
          var cc = this.hexToPixel(q, r);
          ctx.fillText(q + ',' + r, cc.x, cc.y + size - 2);
        }
      }
    }
  };

  /* Seeded pseudo-random for consistent terrain decoration */
  WorldMapRenderer.prototype._seedRandom = function (seed) {
    var s = seed;
    Math.random = function () {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  };

  /* ---------- getCellFromClick ---------- */

  WorldMapRenderer.prototype.getCellFromClick = function (x, y) {
    if (!this.canvas) { return null; }
    var rect = this.canvas.getBoundingClientRect();
    var px = x - rect.left;
    var py = y - rect.top;
    /* Scale for CSS vs canvas size */
    px = px * (this.canvas.width / rect.width);
    py = py * (this.canvas.height / rect.height);
    return this.pixelToHex(px, py);
  };

  /* ---------- animateTravel ---------- */

  WorldMapRenderer.prototype.animateTravel = function (fromHex, toHex, callback) {
    this._travelAnim = {
      fromQ: fromHex.q,
      fromR: fromHex.r,
      toQ: toHex.q,
      toR: toHex.r,
      startTime: Date.now() / 1000,
      duration: 1.0,
      callback: callback || null
    };
  };

  /* ---------- startAnimationLoop / stopAnimationLoop ---------- */

  WorldMapRenderer.prototype.startAnimationLoop = function (renderFn) {
    var self = this;
    function loop() {
      renderFn();
      self._animFrame = requestAnimationFrame(loop);
    }
    this._animFrame = requestAnimationFrame(loop);
  };

  WorldMapRenderer.prototype.stopAnimationLoop = function () {
    if (this._animFrame) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
  };

  /* ---------- toggleCoords ---------- */

  WorldMapRenderer.prototype.toggleCoords = function (show) {
    this._showCoords = !!show;
  };

  /* ---------- Destroy ---------- */

  WorldMapRenderer.prototype.destroy = function () {
    this.stopAnimationLoop();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  };

  /* ========== EXPORT ========== */

  root.MJ.Dragon.Campaign.WorldRenderer = {
    create: function () { return new WorldMapRenderer(); },
    WorldMapRenderer: WorldMapRenderer
  };

})(window);
