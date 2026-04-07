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
