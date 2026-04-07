/**
 * screenshot.js — Capture gameplay screenshots and manage a gallery
 * Uses native DOM-to-canvas rendering. No external dependencies.
 *
 * Captures the game board as a PNG image with metadata overlay.
 * Stores screenshots in memory and offers download/gallery viewing.
 *
 * API:
 *   capture(state, label?)  — take a screenshot, returns Promise<ScreenshotEntry>
 *   captureQuick(state)     — fire-and-forget capture (no await needed)
 *   getGallery()            — returns array of all captured screenshots
 *   clearGallery()          — remove all screenshots
 *   downloadScreenshot(idx) — trigger browser download for screenshot at index
 *   downloadAll()           — download all as a zip-like sequence
 *   showGallery()           — open gallery overlay
 *   hideGallery()           — close gallery overlay
 *   getCount()              — number of screenshots stored
 */
(function () {
  'use strict';
  window.MJ = window.MJ || {};

  const MAX_SCREENSHOTS = 100;
  const gallery = []; // [{dataUrl, timestamp, label, roundNumber, turnCount, phase}]

  /**
   * Capture the game board element as a PNG data URL.
   * Uses a hidden canvas and manually renders the DOM snapshot.
   */
  async function capture(state, label) {
    const boardEl = document.getElementById('game-board');
    if (!boardEl) return null;

    try {
      const dataUrl = await domToImage(boardEl);
      const entry = {
        dataUrl,
        timestamp: Date.now(),
        label: label || `Turn ${state ? state.turnCount || 0 : '?'}`,
        roundNumber: state ? state.roundNumber : 0,
        turnCount: state ? state.turnCount || 0 : 0,
        phase: state ? state.phase : 'unknown',
        index: gallery.length
      };

      gallery.push(entry);

      // Trim if over max
      if (gallery.length > MAX_SCREENSHOTS) {
        gallery.splice(0, gallery.length - MAX_SCREENSHOTS);
        gallery.forEach((e, i) => e.index = i);
      }

      return entry;
    } catch (e) {
      console.warn('[Screenshot] Capture failed:', e.message);
      return null;
    }
  }

  /**
   * Fire-and-forget capture — doesn't block the game loop
   */
  function captureQuick(state, label) {
    requestAnimationFrame(() => {
      capture(state, label).then(entry => {
        if (entry && window.MJ.Renderer) {
          window.MJ.Renderer.showMessage(`Screenshot captured (#${entry.index + 1})`);
        }
      });
    });
  }

  /**
   * Convert a DOM element to a canvas data URL.
   * Strategy: use the SVG foreignObject technique for pure-DOM capture.
   * Falls back to a simple styled canvas if foreignObject fails.
   */
  async function domToImage(element) {
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    // Attempt 1: SVG foreignObject (captures full DOM including styles)
    try {
      const clone = element.cloneNode(true);
      // Inline all computed styles for the clone
      inlineStyles(element, clone);

      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;">
              ${new XMLSerializer().serializeToString(clone)}
            </div>
          </foreignObject>
        </svg>`;

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      const loaded = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      img.src = url;
      await loaded;

      const canvas = document.createElement('canvas');
      canvas.width = width * 2; // 2x for retina quality
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      // Add metadata watermark
      addWatermark(ctx, width, height);

      return canvas.toDataURL('image/png');
    } catch (e) {
      // Fallback: simple styled canvas capture
      return fallbackCapture(element, width, height);
    }
  }

  /**
   * Recursively inline computed styles onto cloned elements
   */
  function inlineStyles(source, target) {
    if (source.nodeType !== 1) return; // Element nodes only
    const computed = window.getComputedStyle(source);
    const dominated = ['background', 'color', 'font', 'border', 'padding', 'margin',
      'display', 'flex', 'position', 'width', 'height', 'box-shadow', 'border-radius',
      'text-align', 'line-height', 'overflow', 'opacity', 'transform', 'gap',
      'grid-template', 'justify-content', 'align-items'];
    for (const prop of dominated) {
      try { target.style[prop] = computed.getPropertyValue(prop); } catch (e) {}
    }
    const sourceChildren = source.children;
    const targetChildren = target.children;
    for (let i = 0; i < sourceChildren.length && i < targetChildren.length; i++) {
      inlineStyles(sourceChildren[i], targetChildren[i]);
    }
  }

  /**
   * Fallback: render a summary card on canvas when DOM capture fails
   */
  function fallbackCapture(element, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a4a2e';
    ctx.fillRect(0, 0, 800, 500);

    // Border
    ctx.strokeStyle = '#2d6b45';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 780, 480);

    // Title
    ctx.fillStyle = '#e8b830';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Mahjong - Game Screenshot', 400, 50);

    // Grab text content from the board
    ctx.fillStyle = '#f0e6d3';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';

    const textLines = [];
    const infoEl = element.querySelector('.round-info');
    const wallEl = element.querySelector('.wall-count');
    const turnEl = element.querySelector('.turn-indicator');
    const shantenEl = element.querySelector('.shanten-info');

    if (infoEl) textLines.push('Round: ' + infoEl.textContent);
    if (wallEl) textLines.push(wallEl.textContent);
    if (turnEl) textLines.push(turnEl.textContent);
    if (shantenEl) textLines.push('Status: ' + shantenEl.textContent);

    // Grab player scores
    for (let i = 0; i < 4; i++) {
      const label = element.querySelector(`#label-${['bottom','right','top','left'][i]}`);
      const score = element.querySelector(`#score-${['bottom','right','top','left'][i]}`);
      if (label && score) textLines.push(`${label.textContent}: ${score.textContent} pts`);
    }

    // Draw tiles from human hand as text
    const handEl = element.querySelector('#hand-bottom');
    if (handEl) {
      const tiles = handEl.querySelectorAll('.tile-symbol');
      if (tiles.length > 0) {
        const tileStr = Array.from(tiles).map(t => t.textContent).join(' ');
        textLines.push('');
        textLines.push('Your Hand: ' + tileStr);
      }
    }

    textLines.push('');
    textLines.push(new Date().toLocaleString());

    let y = 90;
    for (const line of textLines) {
      ctx.fillText(line, 40, y);
      y += 22;
    }

    addWatermark(ctx, 800, 500);
    return canvas.toDataURL('image/png');
  }

  /**
   * Add a small watermark with timestamp
   */
  function addWatermark(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Mahjong ' + new Date().toLocaleTimeString(), width - 8, height - 6);
    ctx.restore();
  }

  // === Gallery ===

  function getGallery() {
    return gallery.map((e, i) => ({
      index: i, label: e.label, timestamp: e.timestamp,
      roundNumber: e.roundNumber, turnCount: e.turnCount, phase: e.phase,
      dataUrl: e.dataUrl
    }));
  }

  function getCount() { return gallery.length; }

  function clearGallery() {
    gallery.length = 0;
  }

  function downloadScreenshot(index) {
    const entry = gallery[index];
    if (!entry) return;
    const link = document.createElement('a');
    link.download = `mahjong_r${entry.roundNumber}_t${entry.turnCount}_${Date.now()}.png`;
    link.href = entry.dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function downloadAll() {
    gallery.forEach((_, i) => {
      setTimeout(() => downloadScreenshot(i), i * 300);
    });
  }

  /**
   * Auto-capture at key game events
   */
  function autoCapture(state, event) {
    const autoEvents = ['round_start', 'win', 'draw', 'riichi'];
    if (autoEvents.includes(event)) {
      captureQuick(state, `${event} R${state.roundNumber || 0}`);
    }
  }

  // === Gallery Overlay ===

  function showGallery() {
    let overlay = document.getElementById('screenshot-gallery');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'screenshot-gallery';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:300;
      display:flex;flex-direction:column;padding:16px;overflow:hidden;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-shrink:0;';
    header.innerHTML = `
      <h3 style="color:#e8b830;margin:0;font-size:18px;">Screenshots (${gallery.length})</h3>
      <div style="display:flex;gap:8px;">
        <button id="ss-download-all" class="btn" ${gallery.length === 0 ? 'disabled' : ''}>Download All</button>
        <button id="ss-clear" class="btn" ${gallery.length === 0 ? 'disabled' : ''}>Clear All</button>
        <button id="ss-close" class="btn">Close</button>
      </div>
    `;
    overlay.appendChild(header);

    // Grid
    const grid = document.createElement('div');
    grid.style.cssText = `
      display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
      gap:12px;overflow-y:auto;flex:1;padding-right:8px;
    `;

    if (gallery.length === 0) {
      grid.innerHTML = '<div style="color:#888;text-align:center;grid-column:1/-1;padding:40px;">No screenshots yet. Press the camera button or Ctrl+P to capture.</div>';
    }

    for (let i = gallery.length - 1; i >= 0; i--) {
      const entry = gallery[i];
      const card = document.createElement('div');
      card.style.cssText = `
        background:rgba(255,255,255,0.05);border-radius:8px;overflow:hidden;
        border:1px solid rgba(255,255,255,0.1);cursor:pointer;transition:border-color 0.2s;
      `;
      card.addEventListener('mouseenter', () => card.style.borderColor = '#e8b830');
      card.addEventListener('mouseleave', () => card.style.borderColor = 'rgba(255,255,255,0.1)');

      const img = document.createElement('img');
      img.src = entry.dataUrl;
      img.style.cssText = 'width:100%;display:block;';
      img.loading = 'lazy';
      card.appendChild(img);

      const info = document.createElement('div');
      info.style.cssText = 'padding:6px 10px;font-size:11px;color:#aaa;display:flex;justify-content:space-between;align-items:center;';
      const time = new Date(entry.timestamp);
      info.innerHTML = `
        <span>${entry.label} | R${entry.roundNumber}</span>
        <span>${time.toLocaleTimeString()}</span>
      `;
      card.appendChild(info);

      const actions = document.createElement('div');
      actions.style.cssText = 'padding:4px 10px 8px;display:flex;gap:6px;';

      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn btn-sm';
      dlBtn.textContent = 'Download';
      dlBtn.addEventListener('click', (e) => { e.stopPropagation(); downloadScreenshot(i); });
      actions.appendChild(dlBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm';
      delBtn.textContent = 'Delete';
      delBtn.style.color = '#c41e3a';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        gallery.splice(i, 1);
        gallery.forEach((e, idx) => e.index = idx);
        showGallery(); // Refresh
      });
      actions.appendChild(delBtn);

      card.appendChild(actions);

      // Click to view full size
      img.addEventListener('click', () => showFullView(entry));

      grid.appendChild(card);
    }

    overlay.appendChild(grid);
    document.body.appendChild(overlay);

    // Wire buttons
    document.getElementById('ss-close').addEventListener('click', hideGallery);
    document.getElementById('ss-download-all').addEventListener('click', downloadAll);
    document.getElementById('ss-clear').addEventListener('click', () => {
      clearGallery();
      showGallery(); // Refresh
    });

    // Escape to close
    const escHandler = (e) => {
      if (e.key === 'Escape') { hideGallery(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  }

  function showFullView(entry) {
    let viewer = document.getElementById('screenshot-fullview');
    if (viewer) viewer.remove();

    viewer = document.createElement('div');
    viewer.id = 'screenshot-fullview';
    viewer.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:350;
      display:flex;align-items:center;justify-content:center;cursor:pointer;
    `;

    const img = document.createElement('img');
    img.src = entry.dataUrl;
    img.style.cssText = 'max-width:95%;max-height:90%;object-fit:contain;border-radius:4px;box-shadow:0 0 40px rgba(0,0,0,0.5);';
    viewer.appendChild(img);

    const info = document.createElement('div');
    info.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:#888;font-size:12px;';
    info.textContent = `${entry.label} | Round ${entry.roundNumber} | ${new Date(entry.timestamp).toLocaleString()} — Click to close`;
    viewer.appendChild(info);

    viewer.addEventListener('click', () => viewer.remove());
    document.body.appendChild(viewer);
  }

  function hideGallery() {
    const overlay = document.getElementById('screenshot-gallery');
    if (overlay) overlay.remove();
  }

  window.MJ.Screenshot = Object.freeze({
    capture, captureQuick, autoCapture,
    getGallery, getCount, clearGallery,
    downloadScreenshot, downloadAll,
    showGallery, hideGallery
  });

  console.log('[Mahjong] Screenshot module loaded');
})();
