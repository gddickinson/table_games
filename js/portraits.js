(function(exports) {
  const root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};

  const NS = 'http://www.w3.org/2000/svg';

  // Character portrait data
  const PORTRAIT_DATA = {
    mei: {
      bgColor: '#e8b4d0',
      skinColor: '#fce4d6',
      hairColor: '#2c1810',
      hairStyle: 'long',
      eyeColor: '#4a2810',
      accessories: null
    },
    kenji: {
      bgColor: '#b4c8e8',
      skinColor: '#f0d6b8',
      hairColor: '#1a1a1a',
      hairStyle: 'spiky',
      eyeColor: '#1a1a1a',
      accessories: ['headband']
    },
    yuki: {
      bgColor: '#d4e8b4',
      skinColor: '#f5e6d0',
      hairColor: '#a0a0a0',
      hairStyle: 'bun',
      eyeColor: '#3a5a3a',
      accessories: ['glasses']
    }
  };

  // Eye shapes per emotion: each returns a function(svg, char, side)
  // side: -1 = left, 1 = right. Eyes centered around (40, 35).
  const EYE_SHAPES = {
    neutral: function(svg, char, cx, cy) {
      addEllipse(svg, cx, cy, 4, 5, 'white');
      addCircle(svg, cx, cy, 2.5, char.eyeColor);
      addCircle(svg, cx + 0.5, cy - 0.5, 1, 'white');
    },
    happy: function(svg, char, cx, cy) {
      // ^_^ curved up arcs
      var path = createEl(svg, 'path');
      path.setAttribute('d', 'M ' + (cx - 4) + ' ' + cy + ' Q ' + cx + ' ' + (cy - 6) + ' ' + (cx + 4) + ' ' + cy);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', char.eyeColor);
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('stroke-linecap', 'round');
    },
    sad: function(svg, char, cx, cy) {
      addEllipse(svg, cx, cy, 3.5, 4.5, 'white');
      addCircle(svg, cx, cy + 1, 2, char.eyeColor);
      // Drooped brow
      var brow = createEl(svg, 'line');
      setAttrs(brow, { x1: cx - 4, y1: cy - 6, x2: cx + 3, y2: cy - 7.5, stroke: char.hairColor, 'stroke-width': 1.2, 'stroke-linecap': 'round' });
    },
    excited: function(svg, char, cx, cy) {
      // Wide eyes with sparkle
      addEllipse(svg, cx, cy, 5, 6, 'white');
      addCircle(svg, cx, cy, 3, char.eyeColor);
      addCircle(svg, cx + 1, cy - 1.5, 1.2, 'white');
      addCircle(svg, cx - 1, cy + 1, 0.6, 'white');
    },
    angry: function(svg, char, cx, cy) {
      addEllipse(svg, cx, cy, 4, 4, 'white');
      addCircle(svg, cx, cy, 2.5, char.eyeColor);
      // Angled brow
      var dir = cx < 40 ? 1 : -1;
      var brow = createEl(svg, 'line');
      setAttrs(brow, { x1: cx - 5, y1: cy - 5 - dir * 2, x2: cx + 4, y2: cy - 5 + dir * 2, stroke: char.hairColor, 'stroke-width': 1.8, 'stroke-linecap': 'round' });
    },
    tilted: function(svg, char, cx, cy) {
      // One eye normal, one twitching (narrowed)
      if (cx < 40) {
        addEllipse(svg, cx, cy, 4, 5, 'white');
        addCircle(svg, cx, cy, 2.5, char.eyeColor);
      } else {
        // Twitching: narrow horizontal line
        addEllipse(svg, cx, cy, 4, 2, 'white');
        addCircle(svg, cx, cy, 1.5, char.eyeColor);
      }
    },
    serene: function(svg, char, cx, cy) {
      // Closed peacefully - gentle downward arcs
      var path = createEl(svg, 'path');
      path.setAttribute('d', 'M ' + (cx - 4) + ' ' + cy + ' Q ' + cx + ' ' + (cy + 3) + ' ' + (cx + 4) + ' ' + cy);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', char.eyeColor);
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('stroke-linecap', 'round');
    },
    thoughtful: function(svg, char, cx, cy) {
      addEllipse(svg, cx, cy, 3.5, 5, 'white');
      addCircle(svg, cx + (cx < 40 ? 1 : -1), cy - 1, 2.2, char.eyeColor);
      addCircle(svg, cx + (cx < 40 ? 1.5 : -0.5), cy - 1.5, 0.8, 'white');
    },
    surprised: function(svg, char, cx, cy) {
      addEllipse(svg, cx, cy, 5.5, 6.5, 'white');
      addCircle(svg, cx, cy, 3.5, char.eyeColor);
      addCircle(svg, cx + 1, cy - 1, 1.5, 'white');
    }
  };

  // Mouth shapes per emotion
  const MOUTH_SHAPES = {
    neutral: function(svg, cx, cy) {
      var line = createEl(svg, 'line');
      setAttrs(line, { x1: cx - 5, y1: cy, x2: cx + 5, y2: cy, stroke: '#8b5e4b', 'stroke-width': 1.2, 'stroke-linecap': 'round' });
    },
    happy: function(svg, cx, cy) {
      var path = createEl(svg, 'path');
      path.setAttribute('d', 'M ' + (cx - 6) + ' ' + (cy - 1) + ' Q ' + cx + ' ' + (cy + 7) + ' ' + (cx + 6) + ' ' + (cy - 1));
      setAttrs(path, { fill: 'none', stroke: '#8b5e4b', 'stroke-width': 1.3, 'stroke-linecap': 'round' });
    },
    sad: function(svg, cx, cy) {
      var path = createEl(svg, 'path');
      path.setAttribute('d', 'M ' + (cx - 5) + ' ' + (cy + 2) + ' Q ' + cx + ' ' + (cy - 4) + ' ' + (cx + 5) + ' ' + (cy + 2));
      setAttrs(path, { fill: 'none', stroke: '#8b5e4b', 'stroke-width': 1.3, 'stroke-linecap': 'round' });
    },
    excited: function(svg, cx, cy) {
      // Open mouth O
      addEllipse(svg, cx, cy + 1, 4, 5, '#8b5e4b');
      addEllipse(svg, cx, cy + 1, 3, 4, '#d4656a');
    },
    angry: function(svg, cx, cy) {
      var path = createEl(svg, 'path');
      path.setAttribute('d', 'M ' + (cx - 5) + ' ' + cy + ' L ' + (cx - 2) + ' ' + (cy + 2) + ' L ' + (cx + 2) + ' ' + (cy - 1) + ' L ' + (cx + 5) + ' ' + (cy + 1));
      setAttrs(path, { fill: 'none', stroke: '#8b5e4b', 'stroke-width': 1.5, 'stroke-linecap': 'round' });
    },
    tilted: function(svg, cx, cy) {
      // Wavy/grimace
      var path = createEl(svg, 'path');
      path.setAttribute('d', 'M ' + (cx - 6) + ' ' + cy + ' Q ' + (cx - 3) + ' ' + (cy - 3) + ' ' + cx + ' ' + cy + ' Q ' + (cx + 3) + ' ' + (cy + 3) + ' ' + (cx + 6) + ' ' + cy);
      setAttrs(path, { fill: 'none', stroke: '#8b5e4b', 'stroke-width': 1.3, 'stroke-linecap': 'round' });
    },
    serene: function(svg, cx, cy) {
      var path = createEl(svg, 'path');
      path.setAttribute('d', 'M ' + (cx - 4) + ' ' + cy + ' Q ' + cx + ' ' + (cy + 4) + ' ' + (cx + 4) + ' ' + cy);
      setAttrs(path, { fill: 'none', stroke: '#8b5e4b', 'stroke-width': 1.2, 'stroke-linecap': 'round' });
    },
    thoughtful: function(svg, cx, cy) {
      // Small pursed 'o'
      addEllipse(svg, cx + 2, cy, 2.5, 2, '#8b5e4b');
      addEllipse(svg, cx + 2, cy, 1.5, 1, '#d4656a');
    },
    surprised: function(svg, cx, cy) {
      // Big O
      addEllipse(svg, cx, cy + 1, 5, 7, '#8b5e4b');
      addEllipse(svg, cx, cy + 1, 4, 6, '#d4656a');
    }
  };

  // SVG helper functions
  function createEl(parent, tag) {
    var el = document.createElementNS(NS, tag);
    parent.appendChild(el);
    return el;
  }

  function setAttrs(el, attrs) {
    for (var key in attrs) {
      if (attrs.hasOwnProperty(key)) {
        el.setAttribute(key, attrs[key]);
      }
    }
  }

  function addCircle(svg, cx, cy, r, fill) {
    var c = createEl(svg, 'circle');
    setAttrs(c, { cx: cx, cy: cy, r: r, fill: fill });
    return c;
  }

  function addEllipse(svg, cx, cy, rx, ry, fill) {
    var e = createEl(svg, 'ellipse');
    setAttrs(e, { cx: cx, cy: cy, rx: rx, ry: ry, fill: fill });
    return e;
  }

  /**
   * PortraitRenderer - generates SVG character portraits with
   * emotion-responsive facial features.
   */
  class PortraitRenderer {
    constructor() {}

    /**
     * Render an SVG portrait element.
     * @param {string} characterId - mei, kenji, or yuki
     * @param {string} emotion - neutral, happy, sad, excited, angry, tilted, serene, thoughtful, surprised
     * @param {number} [size=40] - width and height in pixels
     * @returns {SVGElement}
     */
    render(characterId, emotion, size) {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 80 80');
      svg.setAttribute('width', size || 40);
      svg.setAttribute('height', size || 40);
      svg.style.display = 'block';

      var char = PORTRAIT_DATA[characterId];
      if (!char) return svg;

      var em = emotion || 'neutral';

      // Background circle
      addCircle(svg, 40, 40, 38, char.bgColor);

      // Hair (back layer for some styles)
      this._drawHairBack(svg, char);

      // Face
      addEllipse(svg, 40, 42, 22, 26, char.skinColor);

      // Eyes
      var drawEye = EYE_SHAPES[em] || EYE_SHAPES.neutral;
      drawEye(svg, char, 32, 36);
      drawEye(svg, char, 48, 36);

      // Nose (subtle)
      var nose = createEl(svg, 'path');
      nose.setAttribute('d', 'M 39 41 Q 40 44 41 41');
      setAttrs(nose, { fill: 'none', stroke: '#c8a89a', 'stroke-width': 0.8 });

      // Mouth
      var drawMouth = MOUTH_SHAPES[em] || MOUTH_SHAPES.neutral;
      drawMouth(svg, 40, 51);

      // Hair (front layer)
      this._drawHairFront(svg, char);

      // Accessories
      if (char.accessories) {
        this._drawAccessories(svg, char);
      }

      // Cheek blush for happy/excited
      if (em === 'happy' || em === 'excited') {
        addEllipse(svg, 26, 44, 5, 3, 'rgba(255, 150, 150, 0.3)');
        addEllipse(svg, 54, 44, 5, 3, 'rgba(255, 150, 150, 0.3)');
      }

      return svg;
    }

    _drawHairBack(svg, char) {
      var path = createEl(svg, 'path');
      if (char.hairStyle === 'long') {
        path.setAttribute('d', 'M 16 30 Q 14 55 20 70 L 25 70 Q 20 50 22 32 Z M 64 30 Q 66 55 60 70 L 55 70 Q 60 50 58 32 Z');
      } else if (char.hairStyle === 'bun') {
        path.setAttribute('d', 'M 32 10 Q 40 4 48 10 Q 52 6 48 2 Q 40 -2 32 2 Q 28 6 32 10 Z');
      } else {
        path.setAttribute('d', '');
      }
      path.setAttribute('fill', char.hairColor);
    }

    _drawHairFront(svg, char) {
      var path = createEl(svg, 'path');
      if (char.hairStyle === 'long') {
        // Flowing bangs
        path.setAttribute('d', 'M 18 28 Q 22 12 40 10 Q 58 12 62 28 Q 58 22 50 20 Q 42 18 34 20 Q 26 22 22 28 Z');
      } else if (char.hairStyle === 'spiky') {
        // Spiky hair
        path.setAttribute('d', 'M 20 30 L 24 10 L 30 24 L 35 6 L 40 20 L 45 4 L 50 22 L 55 8 L 58 26 L 62 30 Q 58 20 40 16 Q 22 20 20 30 Z');
      } else if (char.hairStyle === 'bun') {
        // Neat parted hair
        path.setAttribute('d', 'M 20 30 Q 24 16 40 14 Q 56 16 60 30 Q 56 24 48 22 L 40 20 L 32 22 Q 24 24 20 30 Z');
      }
      path.setAttribute('fill', char.hairColor);
    }

    _drawAccessories(svg, char) {
      for (var i = 0; i < char.accessories.length; i++) {
        var acc = char.accessories[i];
        if (acc === 'glasses') {
          // Round glasses
          var g = createEl(svg, 'g');
          g.setAttribute('fill', 'none');
          g.setAttribute('stroke', '#666');
          g.setAttribute('stroke-width', '1');
          var left = createEl(g, 'circle');
          setAttrs(left, { cx: 32, cy: 36, r: 6 });
          var right = createEl(g, 'circle');
          setAttrs(right, { cx: 48, cy: 36, r: 6 });
          var bridge = createEl(g, 'line');
          setAttrs(bridge, { x1: 38, y1: 36, x2: 42, y2: 36 });
          var armL = createEl(g, 'line');
          setAttrs(armL, { x1: 26, y1: 36, x2: 20, y2: 34 });
          var armR = createEl(g, 'line');
          setAttrs(armR, { x1: 54, y1: 36, x2: 60, y2: 34 });
        } else if (acc === 'headband') {
          var hb = createEl(svg, 'path');
          hb.setAttribute('d', 'M 18 24 Q 30 18 40 18 Q 50 18 62 24');
          setAttrs(hb, { fill: 'none', stroke: '#d44', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
          // Knot
          addCircle(svg, 58, 22, 3, '#d44');
        }
      }
    }

    /**
     * Get the list of supported emotions.
     */
    getEmotions() {
      return Object.keys(EYE_SHAPES);
    }

    /**
     * Get the list of supported characters.
     */
    getCharacters() {
      return Object.keys(PORTRAIT_DATA);
    }
  }

  root.MJ.Portraits = Object.freeze({
    PortraitRenderer: PortraitRenderer,
    PORTRAIT_DATA: PORTRAIT_DATA,
    create: function() {
      return new PortraitRenderer();
    }
  });

})(typeof window !== 'undefined' ? window : global);
