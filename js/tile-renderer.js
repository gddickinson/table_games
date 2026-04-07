/**
 * tile-renderer.js — SVG-based tile rendering (no Unicode dependency)
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const { SUITS } = window.MJ.Constants;
  const Tile = window.MJ.Tile;

  const SUIT_COLORS = {
    [SUITS.BAMBOO]: '#2d8a4e',
    [SUITS.CIRCLES]: '#1a6bb5',
    [SUITS.CHARACTERS]: '#c41e3a',
    [SUITS.WIND]: '#4a4a4a',
    [SUITS.DRAGON]: '#8b5a2b',
    [SUITS.FLOWER]: '#d4831a'
  };

  const SUIT_LABELS = {
    [SUITS.BAMBOO]: '竹',
    [SUITS.CIRCLES]: '筒',
    [SUITS.CHARACTERS]: '萬',
    [SUITS.WIND]: '風',
    [SUITS.DRAGON]: '龍',
    [SUITS.FLOWER]: '花'
  };

  const svgCache = {};

  // --- Global SVG defs injection ---
  let defsInjected = false;
  function ensureSvgDefs() {
    if (defsInjected) return;
    defsInjected = true;
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    defs.innerHTML = `<defs>
      <linearGradient id="mj-bamboo-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#1a5c32"/>
        <stop offset="30%" stop-color="#3aad62"/>
        <stop offset="50%" stop-color="#4ac474"/>
        <stop offset="70%" stop-color="#3aad62"/>
        <stop offset="100%" stop-color="#1a5c32"/>
      </linearGradient>
      <linearGradient id="mj-bamboo-grad2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#104a28"/>
        <stop offset="30%" stop-color="#2d8a4e"/>
        <stop offset="50%" stop-color="#3aad62"/>
        <stop offset="70%" stop-color="#2d8a4e"/>
        <stop offset="100%" stop-color="#104a28"/>
      </linearGradient>
    </defs>`;
    document.body.prepend(defs);
  }

  // --- SVG helpers ---
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  }

  function makeSvg() {
    return svgEl('svg', { viewBox: '0 0 40 56', width: '100%', height: '100%',
      xmlns: SVG_NS, 'shape-rendering': 'geometricPrecision' });
  }

  // --- Circle layout patterns (like dice dots) ---
  const CIRCLE_LAYOUTS = {
    1: [[20, 20]],
    2: [[13, 14], [27, 26]],
    3: [[20, 10], [10, 26], [30, 26]],
    4: [[12, 12], [28, 12], [12, 28], [28, 28]],
    5: [[12, 10], [28, 10], [20, 20], [12, 30], [28, 30]],
    6: [[12, 9], [28, 9], [12, 20], [28, 20], [12, 31], [28, 31]],
    7: [[12, 8], [28, 8], [20, 16], [12, 24], [28, 24], [12, 33], [28, 33]],
    8: [[12, 8], [28, 8], [12, 17], [28, 17], [12, 26], [28, 26], [20, 33], [20, 8]],
    9: [[10, 8], [20, 8], [30, 8], [10, 20], [20, 20], [30, 20], [10, 32], [20, 32], [30, 32]]
  };

  function drawCircles(svg, rank) {
    if (rank === 1) {
      svgEl('circle', { cx: 20, cy: 20, r: 14, fill: 'none', stroke: '#1a6bb5', 'stroke-width': 2 }, svg);
      svgEl('circle', { cx: 20, cy: 20, r: 10, fill: 'none', stroke: '#2d8a4e', 'stroke-width': 1.5 }, svg);
      svgEl('circle', { cx: 20, cy: 20, r: 6, fill: '#c41e3a' }, svg);
      svgEl('circle', { cx: 20, cy: 20, r: 2, fill: '#ffd700' }, svg);
      return;
    }
    const pts = CIRCLE_LAYOUTS[rank] || [];
    const r = rank <= 4 ? 5 : (rank <= 6 ? 4.5 : 3.8);
    for (const [cx, cy] of pts) {
      svgEl('circle', { cx, cy, r, fill: 'none', stroke: '#1a6bb5', 'stroke-width': 1.2 }, svg);
      svgEl('circle', { cx, cy, r: r * 0.6, fill: '#1a6bb5' }, svg);
      svgEl('circle', { cx, cy, r: r * 0.25, fill: '#c41e3a' }, svg);
    }
  }

  // --- Bamboo drawings ---
  function drawBamboo(svg, rank) {
    if (rank === 1) {
      // Bird (sparrow) — simplified
      svgEl('ellipse', { cx: 20, cy: 16, rx: 7, ry: 5, fill: '#2d8a4e' }, svg);
      svgEl('circle', { cx: 24, cy: 14, r: 1.5, fill: '#fff' }, svg);
      svgEl('circle', { cx: 24, cy: 14, r: 0.8, fill: '#333' }, svg);
      svgEl('polygon', { points: '27,15 33,14 27,17', fill: '#e67e22' }, svg);
      // Tail feathers
      svgEl('path', { d: 'M13,17 Q8,22 6,30', stroke: '#2d8a4e', fill: 'none',
        'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
      svgEl('path', { d: 'M13,18 Q9,24 8,32', stroke: '#1a6b3a', fill: 'none',
        'stroke-width': 1.5, 'stroke-linecap': 'round' }, svg);
      // Body
      svgEl('ellipse', { cx: 20, cy: 24, rx: 5, ry: 7, fill: '#3aad62' }, svg);
      // Red breast
      svgEl('ellipse', { cx: 20, cy: 22, rx: 3, ry: 4, fill: '#c41e3a', opacity: 0.6 }, svg);
      // Feet
      svgEl('line', { x1: 18, y1: 31, x2: 16, y2: 36, stroke: '#e67e22', 'stroke-width': 1 }, svg);
      svgEl('line', { x1: 22, y1: 31, x2: 24, y2: 36, stroke: '#e67e22', 'stroke-width': 1 }, svg);
    } else {
      // Stacked vertical bars
      const cols = rank <= 3 ? rank : (rank <= 6 ? Math.ceil(rank / 2) : Math.ceil(rank / 3));
      const rows = Math.ceil(rank / cols);
      const barW = 4, barH = Math.min(14, 34 / rows - 2);
      const gapX = barW + 3, gapY = barH + 2;
      const startX = 20 - (cols - 1) * gapX / 2;
      const startY = 20 - (rows - 1) * gapY / 2;
      let drawn = 0;
      for (let r = 0; r < rows && drawn < rank; r++) {
        for (let c = 0; c < cols && drawn < rank; c++) {
          const x = startX + c * gapX - barW / 2;
          const y = startY + r * gapY - barH / 2;
          const gradId = drawn % 2 === 0 ? 'mj-bamboo-grad' : 'mj-bamboo-grad2';
          svgEl('rect', { x, y, width: barW, height: barH, rx: 1,
            fill: `url(#${gradId})`, stroke: '#1a6b3a', 'stroke-width': 0.5 }, svg);
          // Bamboo node lines
          const mid = y + barH / 2;
          svgEl('line', { x1: x, y1: mid, x2: x + barW, y2: mid,
            stroke: '#1a6b3a', 'stroke-width': 0.6 }, svg);
          drawn++;
        }
      }
    }
  }

  // --- Characters (萬) ---
  function drawCharacters(svg, rank) {
    const charFont = "'Noto Serif CJK SC', 'SimSun', 'STSong', serif";
    // Rank number on top — shadow
    svgEl('text', { x: 20, y: 18.5, 'text-anchor': 'middle', 'font-size': '16',
      'font-weight': 'bold', fill: 'rgba(0,0,0,0.12)', 'font-family': charFont }, svg)
      .textContent = rank;
    // Rank number on top
    svgEl('text', { x: 20, y: 18, 'text-anchor': 'middle', 'font-size': '16',
      'font-weight': 'bold', fill: '#c41e3a', 'font-family': charFont }, svg)
      .textContent = rank;
    // 萬 character below — shadow
    svgEl('text', { x: 20, y: 35.5, 'text-anchor': 'middle', 'font-size': '13',
      fill: 'rgba(0,0,0,0.12)', 'font-family': charFont }, svg)
      .textContent = '萬';
    // 萬 character below
    svgEl('text', { x: 20, y: 35, 'text-anchor': 'middle', 'font-size': '13',
      fill: '#c41e3a', 'font-family': charFont }, svg)
      .textContent = '萬';
  }

  // --- Winds ---
  const WIND_KANJI = ['東', '南', '西', '北'];

  function drawWind(svg, rank) {
    // Shadow (engraved effect)
    svgEl('text', { x: 20, y: 28.5, 'text-anchor': 'middle', 'font-size': '22',
      'font-weight': 'bold', fill: 'rgba(0,0,0,0.12)', 'font-family': 'serif',
      'dominant-baseline': 'central' }, svg)
      .textContent = WIND_KANJI[rank - 1] || '?';
    svgEl('text', { x: 20, y: 28, 'text-anchor': 'middle', 'font-size': '22',
      'font-weight': 'bold', fill: '#333', 'font-family': 'serif',
      'dominant-baseline': 'central' }, svg)
      .textContent = WIND_KANJI[rank - 1] || '?';
  }

  // --- Dragons ---
  function drawDragon(svg, rank) {
    if (rank === 1) {
      // Red dragon: 中 — shadow
      svgEl('text', { x: 20, y: 28.5, 'text-anchor': 'middle', 'font-size': '24',
        'font-weight': 'bold', fill: 'rgba(0,0,0,0.12)', 'font-family': 'serif',
        'dominant-baseline': 'central' }, svg)
        .textContent = '中';
      // Red dragon: 中
      svgEl('text', { x: 20, y: 28, 'text-anchor': 'middle', 'font-size': '24',
        'font-weight': 'bold', fill: '#c41e3a', 'font-family': 'serif',
        'dominant-baseline': 'central' }, svg)
        .textContent = '中';
    } else if (rank === 2) {
      // Green dragon: 發 — shadow
      svgEl('text', { x: 20, y: 28.5, 'text-anchor': 'middle', 'font-size': '22',
        'font-weight': 'bold', fill: 'rgba(0,0,0,0.12)', 'font-family': 'serif',
        'dominant-baseline': 'central' }, svg)
        .textContent = '發';
      // Green dragon: 發
      svgEl('text', { x: 20, y: 28, 'text-anchor': 'middle', 'font-size': '22',
        'font-weight': 'bold', fill: '#2d8a4e', 'font-family': 'serif',
        'dominant-baseline': 'central' }, svg)
        .textContent = '發';
    } else {
      // White dragon: empty rectangle with blue border
      svgEl('rect', { x: 8, y: 8, width: 24, height: 30, rx: 2,
        fill: 'none', stroke: '#4a7fb5', 'stroke-width': 1.8 }, svg);
      svgEl('rect', { x: 11, y: 11, width: 18, height: 24, rx: 1,
        fill: 'none', stroke: '#4a7fb5', 'stroke-width': 0.8 }, svg);
    }
  }

  // --- Flowers ---
  const FLOWER_COLORS = ['#e84393', '#e17055', '#fdcb6e', '#00b894',
    '#74b9ff', '#fd79a8', '#e67e22', '#636e72'];
  const FLOWER_LABELS = ['梅', '蘭', '菊', '竹', '春', '夏', '秋', '冬'];

  function drawFlower(svg, rank) {
    const color = FLOWER_COLORS[(rank - 1) % 8];
    if (rank <= 4) {
      // Botanical: petals around center
      const petalCount = rank + 3;
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
        const px = 20 + Math.cos(angle) * 9;
        const py = 18 + Math.sin(angle) * 9;
        svgEl('ellipse', { cx: px, cy: py, rx: 4, ry: 2.5,
          fill: color, opacity: 0.8,
          transform: `rotate(${(angle * 180 / Math.PI) + 90} ${px} ${py})` }, svg);
      }
      svgEl('circle', { cx: 20, cy: 18, r: 3, fill: '#fdcb6e' }, svg);
      // Stem
      svgEl('line', { x1: 20, y1: 25, x2: 20, y2: 36, stroke: '#2d8a4e', 'stroke-width': 1.5 }, svg);
      svgEl('ellipse', { cx: 24, cy: 32, rx: 4, ry: 2, fill: '#27ae60', opacity: 0.7,
        transform: 'rotate(-30 24 32)' }, svg);
    } else {
      // Season: geometric symbol
      svgEl('text', { x: 20, y: 22, 'text-anchor': 'middle', 'font-size': '18',
        'font-weight': 'bold', fill: color, 'font-family': 'serif',
        'dominant-baseline': 'central' }, svg)
        .textContent = FLOWER_LABELS[rank - 1];
      // Decorative underline
      svgEl('line', { x1: 10, y1: 33, x2: 30, y2: 33,
        stroke: color, 'stroke-width': 1.5, 'stroke-linecap': 'round' }, svg);
    }
  }

  // --- Face-down back pattern ---
  function drawBack(svg) {
    // Green background
    svgEl('rect', { x: 0, y: 0, width: 40, height: 56, rx: 3, fill: '#1a5c32' }, svg);
    // Gold border
    svgEl('rect', { x: 2, y: 2, width: 36, height: 52, rx: 2,
      fill: 'none', stroke: '#c8a84e', 'stroke-width': 1.2 }, svg);
    svgEl('rect', { x: 4.5, y: 4.5, width: 31, height: 47, rx: 1.5,
      fill: 'none', stroke: '#c8a84e', 'stroke-width': 0.5, opacity: 0.6 }, svg);
    // Diamond lattice pattern
    const g = svgEl('g', { stroke: '#c8a84e', 'stroke-width': 0.4, opacity: 0.35 }, svg);
    for (let i = -6; i < 12; i++) {
      svgEl('line', { x1: 5, y1: 5 + i * 6, x2: 35, y2: 5 + (i + 5) * 6 }, g);
      svgEl('line', { x1: 35, y1: 5 + i * 6, x2: 5, y2: 5 + (i + 5) * 6 }, g);
    }
    // Center emblem
    svgEl('circle', { cx: 20, cy: 28, r: 6, fill: '#1a5c32', stroke: '#c8a84e', 'stroke-width': 0.8 }, svg);
    svgEl('circle', { cx: 20, cy: 28, r: 3, fill: '#c8a84e', opacity: 0.4 }, svg);
  }

  // --- Compose full tile SVG ---
  function buildTileSvg(tile) {
    const svg = makeSvg();
    const suit = tile.suit;
    const rank = tile.rank;

    // Graphic area background (top 70%)
    svgEl('rect', { x: 0, y: 0, width: 40, height: 39.2, fill: '#fff', rx: 3 }, svg);
    // Clip the bottom corners of the white rect
    svgEl('rect', { x: 0, y: 37, width: 40, height: 3, fill: '#fff' }, svg);

    // Draw the suit graphic
    const gfxGroup = svgEl('g', { 'clip-path': 'inset(1 1 17.8 1)' }, svg);
    if (suit === SUITS.BAMBOO) drawBamboo(gfxGroup, rank);
    else if (suit === SUITS.CIRCLES) drawCircles(gfxGroup, rank);
    else if (suit === SUITS.CHARACTERS) drawCharacters(gfxGroup, rank);
    else if (suit === SUITS.WIND) drawWind(gfxGroup, rank);
    else if (suit === SUITS.DRAGON) drawDragon(gfxGroup, rank);
    else if (suit === SUITS.FLOWER) drawFlower(gfxGroup, rank);

    // Label area (bottom 30%)
    svgEl('rect', { x: 0, y: 39, width: 40, height: 17, fill: '#f5f0e8', rx: 0 }, svg);
    svgEl('rect', { x: 0, y: 53, width: 40, height: 3, rx: 3, fill: '#f5f0e8' }, svg);
    svgEl('line', { x1: 3, y1: 39.5, x2: 37, y2: 39.5, stroke: '#ddd', 'stroke-width': 0.5 }, svg);

    // Label text
    let labelText;
    if (Tile.isSuited(tile)) {
      labelText = rank + ' ' + SUIT_LABELS[suit];
    } else if (suit === SUITS.WIND) {
      labelText = ['E', 'S', 'W', 'N'][rank - 1];
    } else if (suit === SUITS.DRAGON) {
      labelText = ['中', '發', '白'][rank - 1];
    } else {
      labelText = FLOWER_LABELS[(rank - 1) % 8] || '花';
    }
    svgEl('text', { x: 20, y: 50, 'text-anchor': 'middle', 'font-size': '8',
      fill: '#555', 'font-family': 'sans-serif', 'dominant-baseline': 'central' }, svg)
      .textContent = labelText;

    // Suit color dot (bottom-right)
    svgEl('circle', { cx: 35, cy: 50, r: 2, fill: SUIT_COLORS[suit] || '#999' }, svg);

    // Left border stripe for quick suit scanning
    svgEl('rect', { x: 0, y: 0, width: 2.5, height: 56, rx: 1.5,
      fill: SUIT_COLORS[suit] || '#999', opacity: 0.7 }, svg);

    return svg;
  }

  function buildBackSvg() {
    const svg = makeSvg();
    drawBack(svg);
    return svg;
  }

  // --- Public API ---

  /**
   * Create a tile DOM element
   * @param {Object} tile - The tile data { suit, rank, uid }
   * @param {Object} options - { faceDown, small, clickable, selected, highlighted, horizontal }
   */
  function createTileElement(tile, options = {}) {
    ensureSvgDefs();
    const el = document.createElement('div');
    el.className = 'mj-tile';
    if (options.faceDown) el.classList.add('face-down');
    if (options.small) el.classList.add('small');
    if (options.clickable) el.classList.add('clickable');
    if (options.selected) el.classList.add('selected');
    if (options.highlighted) el.classList.add('highlighted');
    if (options.horizontal) el.classList.add('horizontal');

    el.dataset.suit = tile.suit;
    el.dataset.rank = tile.rank;
    el.dataset.uid = tile.uid;
    el.dataset.tileId = Tile.getId(tile);

    if (!options.faceDown) {
      const cacheKey = tile.suit + '-' + tile.rank;
      const svgWrapper = document.createElement('div');
      svgWrapper.className = 'tile-svg-wrap';
      if (svgCache[cacheKey]) {
        svgWrapper.innerHTML = svgCache[cacheKey];
      } else {
        const svg = buildTileSvg(tile);
        svgWrapper.appendChild(svg);
        svgCache[cacheKey] = svgWrapper.innerHTML;
      }
      el.appendChild(svgWrapper);
    } else {
      const svgWrapper = document.createElement('div');
      svgWrapper.className = 'tile-svg-wrap tile-back';
      if (svgCache['_back']) {
        svgWrapper.innerHTML = svgCache['_back'];
      } else {
        const svg = buildBackSvg();
        svgWrapper.appendChild(svg);
        svgCache['_back'] = svgWrapper.innerHTML;
      }
      el.appendChild(svgWrapper);
    }

    el.title = options.faceDown ? 'Face down' : Tile.getName(tile);
    return el;
  }

  function createMeldElement(meld) {
    const el = document.createElement('div');
    el.className = `mj-meld meld-${meld.type}`;
    if (!meld.open) el.classList.add('concealed');

    for (let i = 0; i < meld.tiles.length; i++) {
      const t = meld.tiles[i];
      const isClaimedTile = meld.open && i === meld.tiles.length - 1;
      const tileEl = createTileElement(t, {
        small: true,
        faceDown: !meld.open && meld.type === 'concealed_kong' && (i === 0 || i === 3),
        horizontal: isClaimedTile
      });
      el.appendChild(tileEl);
    }
    return el;
  }

  function createDiscardElement(tile) {
    return createTileElement(tile, { small: true });
  }

  function updateTileState(element, state) {
    element.classList.toggle('selected', !!state.selected);
    element.classList.toggle('highlighted', !!state.highlighted);
    element.classList.toggle('dimmed', !!state.dimmed);
  }

  function getTileFromElement(element) {
    if (!element || !element.dataset.suit) return null;
    return {
      suit: element.dataset.suit,
      rank: parseInt(element.dataset.rank),
      uid: parseInt(element.dataset.uid)
    };
  }

  function createEmptySlot() {
    const el = document.createElement('div');
    el.className = 'mj-tile empty-slot';
    return el;
  }

  window.MJ.TileRenderer = Object.freeze({
    createTileElement, createMeldElement, createDiscardElement,
    updateTileState, getTileFromElement, createEmptySlot,
    SUIT_COLORS, SUIT_LABELS
  });

  console.log('[Mahjong] TileRenderer module loaded (SVG)');
})();
