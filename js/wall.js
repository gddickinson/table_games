/**
 * wall.js — Wall building, shuffling, and tile drawing
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const { TILE_DEFS, FLOWER_DEFS } = window.MJ.Constants;
  const Tile = window.MJ.Tile;

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Create wall. Options: { includeFlowers: true }
   * With flowers: 144 tiles (136 standard + 8 flower, 1 copy each)
   */
  function create(options) {
    const tiles = [];
    // 4 copies of each of 34 unique tiles = 136
    for (const def of TILE_DEFS) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push(Tile.create(def.suit, def.rank));
      }
    }
    // Add flower tiles (1 copy each = 8)
    const includeFlowers = options && options.includeFlowers !== undefined
      ? options.includeFlowers : true;
    if (includeFlowers) {
      for (const def of FLOWER_DEFS) {
        tiles.push(Tile.create(def.suit, def.rank));
      }
    }
    shuffle(tiles);

    const wall = {
      tiles,
      drawIndex: 0,
      endIndex: tiles.length - 1,
      deadWallSize: 14,
      hasFlowers: includeFlowers,
      doraIndicatorPositions: [tiles.length - 5]
    };
    return wall;
  }

  function draw(wall) {
    if (isEmpty(wall)) return null;
    const tile = wall.tiles[wall.drawIndex];
    wall.drawIndex++;
    return tile;
  }

  function drawFromEnd(wall) {
    // Draw from the end (kong replacement)
    if (wall.endIndex <= wall.drawIndex + wall.deadWallSize) return null;
    const tile = wall.tiles[wall.endIndex];
    wall.endIndex--;
    return tile;
  }

  function remaining(wall) {
    return Math.max(0, wall.endIndex - wall.drawIndex - wall.deadWallSize + 1);
  }

  function isEmpty(wall) {
    return remaining(wall) <= 0;
  }

  function getDoraIndicators(wall) {
    if (!wall || !wall.doraIndicatorPositions) return [];
    const indicators = [];
    for (const pos of wall.doraIndicatorPositions) {
      if (pos >= 0 && pos < wall.tiles.length) {
        indicators.push(wall.tiles[pos]);
      }
    }
    return indicators;
  }

  window.MJ.Wall = Object.freeze({
    create, draw, drawFromEnd, remaining, isEmpty, getDoraIndicators
  });

  console.log('[Mahjong] Wall module loaded');
})();
