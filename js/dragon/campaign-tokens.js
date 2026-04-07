/**
 * campaign-tokens.js — Extended figure/sprite rendering for all creature types.
 * Draws monster tokens, NPC sprites, party marker, and campaign tile types.
 * Exports under window.MJ.Dragon.Campaign.Tokens (IIFE module).
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  /* ========== MONSTER VISUALS ========== */

  var MONSTER_VISUALS = Object.freeze({
    wolf:           { color: '#888',    icon: '\uD83D\uDC3A', size: 1 },
    dire_wolf:      { color: '#666',    icon: '\uD83D\uDC3A', size: 2 },
    bandit:         { color: '#8b0000', icon: '\u2694',        size: 1 },
    bandit_captain: { color: '#660000', icon: '\u2694',        size: 1 },
    ogre:           { color: '#8b4513', icon: '\uD83D\uDC79', size: 2 },
    skeleton:       { color: '#d2b48c', icon: '\uD83D\uDC80', size: 1 },
    zombie:         { color: '#556b2f', icon: '\uD83E\uDDDF', size: 1 },
    wight:          { color: '#483d8b', icon: '\uD83D\uDC7B', size: 1 },
    wraith:         { color: '#4b0082', icon: '\uD83D\uDC7B', size: 2, translucent: true },
    animated_armor: { color: '#808080', icon: '\uD83D\uDEE1', size: 1 },
    arcane_guardian:{ color: '#4169e1', icon: '\uD83D\uDEE1', size: 2 },
    flesh_golem:    { color: '#8b4513', icon: '\uD83E\uDDDF', size: 2 },
    orc:            { color: '#228b22', icon: '\u2694',        size: 1 },
    orc_war_chief:  { color: '#006400', icon: '\u2694',        size: 2 },
    orc_shaman:     { color: '#2e8b57', icon: '\u2728',        size: 1 },
    will_o_wisp:    { color: '#00ffff', icon: '\u2728',        size: 1, glowing: true },
    green_hag:      { color: '#006400', icon: '\uD83E\uDDD9', size: 1 },
    dragon:         { color: '#ff4500', icon: '\uD83D\uDC09', size: 3 }
  });

  /* ========== NPC VISUALS ========== */

  var NPC_VISUALS = Object.freeze({
    innkeeper:   { color: '#8b4513', icon: '\uD83C\uDF7A' },
    blacksmith:  { color: '#696969', icon: '\uD83D\uDD28' },
    herbalist:   { color: '#228b22', icon: '\uD83C\uDF3F' },
    quest_giver: { color: '#daa520', icon: '\uD83D\uDCDC' },
    merchant:    { color: '#9932cc', icon: '\uD83D\uDC8E' }
  });

  /* ========== CAMPAIGN TILE TYPES ========== */

  var TILE_TYPES = Object.freeze({
    GRASS:     7,
    TREE:      8,
    WATER:     9,
    ALTAR:     10,
    DOOR:      11,
    TOMBSTONE: 12,
    TENT:      13,
    CAMPFIRE:  14
  });

  /* ========== HELPERS ========== */

  function hexToRgb(hex) {
    var n = parseInt(hex.charAt(0) === '#' ? hex.slice(1) : hex, 16);
    return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
  }

  function darken(hex, amount) {
    var c = hexToRgb(hex);
    var r = Math.max(0, c.r - amount);
    var g = Math.max(0, c.g - amount);
    var b = Math.max(0, c.b - amount);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function lighten(hex, amount) {
    var c = hexToRgb(hex);
    var r = Math.min(255, c.r + amount);
    var g = Math.min(255, c.g + amount);
    var b = Math.min(255, c.b + amount);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ========== MONSTER RENDERING ========== */

  /**
   * Draw a monster token at a given canvas position.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} monster — { id, name, hp, maxHp, isBoss }
   * @param {number} x — center x in canvas pixels
   * @param {number} y — center y in canvas pixels
   * @param {number} cellSize — single cell size in pixels
   * @param {number} time — elapsed ms for animation
   */
  function drawMonster(ctx, monster, x, y, cellSize, time) {
    var vis = MONSTER_VISUALS[monster.id] || MONSTER_VISUALS.bandit;
    var radius = (cellSize * 0.4) * vis.size;
    var t = (time || 0) / 1000;

    ctx.save();

    /* --- translucent creatures --- */
    if (vis.translucent) {
      ctx.globalAlpha = 0.6;
    }

    /* --- glowing creatures (pulsing aura) --- */
    if (vis.glowing) {
      var pulse = 0.5 + 0.5 * Math.sin(t * 3);
      var glowRadius = radius + 6 + pulse * 6;
      var glow = ctx.createRadialGradient(x, y, radius * 0.5, x, y, glowRadius);
      var rgb = hexToRgb(vis.color);
      glow.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.5)');
      glow.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    /* --- boss golden border --- */
    if (monster.isBoss) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    /* --- main body circle --- */
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    var grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    grad.addColorStop(0, lighten(vis.color, 40));
    grad.addColorStop(1, vis.color);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = darken(vis.color, 60);
    ctx.lineWidth = 2;
    ctx.stroke();

    /* --- icon emoji --- */
    var fontSize = Math.round(radius * 1.0);
    ctx.font = fontSize + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = vis.translucent ? 0.7 : 1;
    ctx.fillText(vis.icon, x, y);

    ctx.globalAlpha = 1;

    /* --- name label below --- */
    var labelY = y + radius + 12;
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeText(monster.name || monster.id, x, labelY);
    ctx.fillText(monster.name || monster.id, x, labelY);

    /* --- HP bar above (if damaged) --- */
    if (monster.hp !== undefined && monster.maxHp && monster.hp < monster.maxHp) {
      var barW = radius * 1.6;
      var barH = 4;
      var barX = x - barW / 2;
      var barY = y - radius - 10;
      var hpRatio = Math.max(0, monster.hp / monster.maxHp);

      /* background */
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      /* remaining HP */
      var hpColor = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      /* border */
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
    }

    ctx.restore();
  }

  /* ========== NPC RENDERING ========== */

  /**
   * Draw an NPC sprite at position.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} npcId — key into NPC_VISUALS
   * @param {number} x — center x
   * @param {number} y — center y
   * @param {number} size — sprite diameter in pixels
   */
  function drawNPCSprite(ctx, npcId, x, y, size) {
    var vis = NPC_VISUALS[npcId];
    if (!vis) { vis = { color: '#888', icon: '?' }; }

    var radius = size / 2;

    ctx.save();

    /* body circle */
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    var grad = ctx.createRadialGradient(x - radius * 0.25, y - radius * 0.25, 0, x, y, radius);
    grad.addColorStop(0, lighten(vis.color, 50));
    grad.addColorStop(1, vis.color);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = darken(vis.color, 50);
    ctx.lineWidth = 2;
    ctx.stroke();

    /* icon */
    var fontSize = Math.round(size * 0.5);
    ctx.font = fontSize + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(vis.icon, x, y);

    ctx.restore();
  }

  /* ========== PARTY TOKEN ON WORLD MAP ========== */

  /**
   * Draw the party token on the hex world map — golden pulsing circle with sword icon.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x — center x
   * @param {number} y — center y
   * @param {number} time — elapsed ms
   */
  function drawPartyTokenOnWorldMap(ctx, x, y, time) {
    var t = (time || 0) / 1000;
    var pulse = 0.85 + 0.15 * Math.sin(t * 2.5);
    var radius = 16 * pulse;

    ctx.save();

    /* outer glow */
    var glow = ctx.createRadialGradient(x, y, radius * 0.4, x, y, radius + 8);
    glow.addColorStop(0, 'rgba(255,215,0,0.5)');
    glow.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
    ctx.fill();

    /* golden circle */
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    var grad = ctx.createRadialGradient(x - 4, y - 4, 0, x, y, radius);
    grad.addColorStop(0, '#fff8dc');
    grad.addColorStop(0.5, '#ffd700');
    grad.addColorStop(1, '#b8860b');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* sword icon */
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#333';
    ctx.fillText('\u2694', x, y);

    ctx.restore();
  }

  /* ========== VISUAL LOOKUPS ========== */

  /**
   * Returns the visual definition for a monster type.
   * @param {string} monsterId
   * @returns {object|null}
   */
  function getMonsterVisual(monsterId) {
    return MONSTER_VISUALS[monsterId] || null;
  }

  /**
   * Returns the visual definition for an NPC type.
   * @param {string} npcId
   * @returns {object|null}
   */
  function getNPCVisual(npcId) {
    return NPC_VISUALS[npcId] || null;
  }

  /* ========== TILE RENDERING ========== */

  /**
   * Draw an extended campaign tile at position.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} tileType — numeric tile type constant
   * @param {number} x — top-left x
   * @param {number} y — top-left y
   * @param {number} cellSize — cell width/height
   * @param {number} time — elapsed ms for animation
   */
  function drawTile(ctx, tileType, x, y, cellSize, time) {
    var t = (time || 0) / 1000;
    var cx = x + cellSize / 2;
    var cy = y + cellSize / 2;

    ctx.save();

    switch (tileType) {

      /* --- GRASS (7) --- */
      case TILE_TYPES.GRASS: {
        ctx.fillStyle = '#7ec850';
        ctx.fillRect(x, y, cellSize, cellSize);
        /* grass blade texture */
        ctx.strokeStyle = '#5da03a';
        ctx.lineWidth = 1;
        for (var gi = 0; gi < 5; gi++) {
          var gx = x + (gi + 0.5) * (cellSize / 5);
          var gy = y + cellSize * 0.7;
          ctx.beginPath();
          ctx.moveTo(gx, y + cellSize);
          ctx.quadraticCurveTo(gx - 2, gy, gx + 1, gy - 4);
          ctx.stroke();
        }
        break;
      }

      /* --- TREE (8) --- */
      case TILE_TYPES.TREE: {
        /* ground */
        ctx.fillStyle = '#7ec850';
        ctx.fillRect(x, y, cellSize, cellSize);
        /* trunk */
        var trunkW = cellSize * 0.12;
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(cx - trunkW / 2, cy + cellSize * 0.05, trunkW, cellSize * 0.35);
        /* canopy */
        ctx.beginPath();
        ctx.arc(cx, cy - cellSize * 0.05, cellSize * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#228b22';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy - cellSize * 0.05, cellSize * 0.3, 0, Math.PI * 2);
        ctx.strokeStyle = '#145a14';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }

      /* --- WATER (9) --- */
      case TILE_TYPES.WATER: {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x, y, cellSize, cellSize);
        /* animated ripples */
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        for (var ri = 0; ri < 3; ri++) {
          var ripX = x + cellSize * (0.25 + ri * 0.25);
          var ripY = cy + Math.sin(t * 2 + ri) * 3;
          ctx.beginPath();
          ctx.arc(ripX, ripY, 3 + Math.sin(t * 1.5 + ri * 1.2) * 2, 0, Math.PI);
          ctx.stroke();
        }
        break;
      }

      /* --- ALTAR (10) --- */
      case TILE_TYPES.ALTAR: {
        /* stone base */
        ctx.fillStyle = '#a9a9a9';
        ctx.fillRect(x, y, cellSize, cellSize);
        /* altar block */
        var aw = cellSize * 0.6;
        var ah = cellSize * 0.35;
        ctx.fillStyle = '#808080';
        ctx.fillRect(cx - aw / 2, cy - ah / 2, aw, ah);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - aw / 2, cy - ah / 2, aw, ah);
        /* glowing rune */
        var runeGlow = 0.4 + 0.4 * Math.sin(t * 2);
        ctx.strokeStyle = 'rgba(138,43,226,' + runeGlow + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx + 5, cy + 4);
        ctx.lineTo(cx - 5, cy + 4);
        ctx.closePath();
        ctx.stroke();
        /* center dot */
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(138,43,226,' + (runeGlow + 0.2) + ')';
        ctx.fill();
        break;
      }

      /* --- DOOR (11) --- */
      case TILE_TYPES.DOOR: {
        /* wall background */
        ctx.fillStyle = '#696969';
        ctx.fillRect(x, y, cellSize, cellSize);
        /* door rectangle */
        var dw = cellSize * 0.55;
        var dh = cellSize * 0.75;
        var dx = cx - dw / 2;
        var dy = y + cellSize - dh - cellSize * 0.08;
        ctx.fillStyle = '#8b5e3c';
        ctx.fillRect(dx, dy, dw, dh);
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(dx, dy, dw, dh);
        /* door handle */
        ctx.beginPath();
        ctx.arc(dx + dw * 0.78, dy + dh * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        break;
      }

      /* --- TOMBSTONE (12) --- */
      case TILE_TYPES.TOMBSTONE: {
        /* ground */
        ctx.fillStyle = '#556b2f';
        ctx.fillRect(x, y, cellSize, cellSize);
        /* tombstone (rounded rect) */
        var tw = cellSize * 0.4;
        var th = cellSize * 0.55;
        var tx = cx - tw / 2;
        var ty = cy - th * 0.3;
        var cornerR = tw * 0.35;
        ctx.beginPath();
        ctx.moveTo(tx, ty + th);
        ctx.lineTo(tx, ty + cornerR);
        ctx.arcTo(tx, ty, tx + cornerR, ty, cornerR);
        ctx.lineTo(tx + tw - cornerR, ty);
        ctx.arcTo(tx + tw, ty, tx + tw, ty + cornerR, cornerR);
        ctx.lineTo(tx + tw, ty + th);
        ctx.closePath();
        ctx.fillStyle = '#a9a9a9';
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.stroke();
        /* cross mark */
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, ty + 6);
        ctx.lineTo(cx, ty + th - 6);
        ctx.moveTo(cx - 4, ty + th * 0.3);
        ctx.lineTo(cx + 4, ty + th * 0.3);
        ctx.stroke();
        break;
      }

      /* --- TENT (13) --- */
      case TILE_TYPES.TENT: {
        /* ground */
        ctx.fillStyle = '#7ec850';
        ctx.fillRect(x, y, cellSize, cellSize);
        /* hide tent triangle */
        ctx.beginPath();
        ctx.moveTo(cx, cy - cellSize * 0.3);
        ctx.lineTo(cx - cellSize * 0.35, cy + cellSize * 0.25);
        ctx.lineTo(cx + cellSize * 0.35, cy + cellSize * 0.25);
        ctx.closePath();
        ctx.fillStyle = '#8b6c42';
        ctx.fill();
        ctx.strokeStyle = '#5a4025';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        /* tent opening */
        ctx.beginPath();
        ctx.moveTo(cx - cellSize * 0.06, cy + cellSize * 0.25);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + cellSize * 0.06, cy + cellSize * 0.25);
        ctx.strokeStyle = '#3a2510';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }

      /* --- CAMPFIRE (14) --- */
      case TILE_TYPES.CAMPFIRE: {
        /* ground */
        ctx.fillStyle = '#7ec850';
        ctx.fillRect(x, y, cellSize, cellSize);
        /* fire glow */
        var flickerR = cellSize * 0.25 + Math.sin(t * 6) * 2;
        var fireGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, flickerR + 6);
        fireGlow.addColorStop(0, 'rgba(255,140,0,0.6)');
        fireGlow.addColorStop(1, 'rgba(255,69,0,0)');
        ctx.fillStyle = fireGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, flickerR + 6, 0, Math.PI * 2);
        ctx.fill();
        /* fire core */
        ctx.beginPath();
        ctx.arc(cx, cy, flickerR * 0.6, 0, Math.PI * 2);
        var flicker = 0.8 + 0.2 * Math.sin(t * 8);
        ctx.fillStyle = 'rgba(255,' + Math.round(160 * flicker) + ',0,0.9)';
        ctx.fill();
        /* sparks */
        for (var si = 0; si < 3; si++) {
          var angle = t * 3 + si * 2.09;
          var dist = 4 + Math.sin(t * 5 + si) * 3;
          var sx = cx + Math.cos(angle) * dist;
          var sy = cy - Math.abs(Math.sin(angle)) * dist - 2;
          ctx.beginPath();
          ctx.arc(sx, sy, 1, 0, Math.PI * 2);
          ctx.fillStyle = '#ffff00';
          ctx.fill();
        }
        /* log stones */
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        for (var li = 0; li < 6; li++) {
          var la = (li / 6) * Math.PI * 2;
          var lr = cellSize * 0.22;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(la) * lr, cy + Math.sin(la) * lr, 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }

      default: {
        /* unknown tile — dark fill */
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, cellSize, cellSize);
        break;
      }
    }

    ctx.restore();
  }

  /* ========== PUBLIC API ========== */

  root.MJ.Dragon.Campaign.Tokens = Object.freeze({
    MONSTER_VISUALS:   MONSTER_VISUALS,
    NPC_VISUALS:       NPC_VISUALS,
    TILE_TYPES:        TILE_TYPES,

    drawMonster:              drawMonster,
    drawNPCSprite:            drawNPCSprite,
    drawPartyTokenOnWorldMap: drawPartyTokenOnWorldMap,
    getMonsterVisual:         getMonsterVisual,
    getNPCVisual:             getNPCVisual,
    drawTile:                 drawTile
  });

})(typeof window !== 'undefined' ? window : this);
