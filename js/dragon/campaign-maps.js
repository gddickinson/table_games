/**
 * campaign-maps.js — Combat grid maps for campaign encounter locations
 * Each map is a 20x15 grid compatible with the dragon-map.js API
 * See dragon module docs for API documentation
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  // --- Extended tile type enum (superset of dragon-map.js) ---
  var TILE_TYPES = Object.freeze({
    FLOOR:     0,
    WALL:      1,
    RUBBLE:    2,
    LAVA:      3,
    PILLAR:    4,
    TREASURE:  5,
    ENTRANCE:  6,
    GRASS:     7,
    TREE:      8,
    WATER:     9,
    ALTAR:    10,
    DOOR:     11,
    TOMBSTONE:12,
    TENT:     13,
    CAMPFIRE: 14
  });

  var T = TILE_TYPES;
  var W = T.WALL, F = T.FLOOR, R = T.RUBBLE, L = T.LAVA;
  var P = T.PILLAR, X = T.TREASURE, E = T.ENTRANCE;
  var G = T.GRASS, B = T.TREE, Q = T.WATER, A = T.ALTAR;
  var D = T.DOOR, S = T.TOMBSTONE, N = T.TENT, C = T.CAMPFIRE;

  var ROWS = 15;
  var COLS = 20;

  // --- Cover bonus for tiles that provide cover ---
  var COVER_BONUS = Object.freeze({ pillar: 2, tree: 2, tombstone: 2 });

  // =========================================================================
  // Map definitions — each is { grid, partyStart, enemyStart }
  // =========================================================================

  var MAP_DATA = {};

  // --- 1. forest_clearing ---
  MAP_DATA.forest_clearing = {
    grid: Object.freeze([
      [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
      [B,B,B,G,G,G,G,G,G,G,G,G,G,G,G,G,G,B,B,B],
      [B,B,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,B,B],
      [B,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,B],
      [B,G,G,G,G,G,G,B,G,G,G,G,G,G,G,G,G,Q,G,B],
      [B,G,G,G,G,G,G,G,G,G,G,G,B,G,G,G,G,Q,G,B],
      [B,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,Q,G,B],
      [B,G,G,G,B,G,G,G,G,G,G,G,G,G,G,G,G,Q,G,B],
      [B,G,G,G,G,G,G,G,G,G,G,G,G,G,B,G,G,Q,G,B],
      [B,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,Q,G,B],
      [B,G,G,G,G,G,B,G,G,G,G,G,G,G,G,G,G,Q,G,B],
      [B,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,B],
      [B,B,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,B,B],
      [B,B,B,G,G,G,G,G,E,E,E,E,G,G,G,G,B,B,B,B],
      [B,B,B,B,B,B,B,B,E,E,E,E,B,B,B,B,B,B,B,B]
    ].map(function (row) { return Object.freeze(row); })),
    partyStart: Object.freeze([
      { row: 14, col: 8  },
      { row: 14, col: 9  },
      { row: 14, col: 10 },
      { row: 14, col: 11 },
      { row: 13, col: 8  },
      { row: 13, col: 11 }
    ]),
    enemyStart: Object.freeze([
      { row: 2, col: 8  },
      { row: 2, col: 11 },
      { row: 3, col: 6  },
      { row: 3, col: 13 },
      { row: 4, col: 10 }
    ])
  };

  // --- 2. mountain_pass ---
  MAP_DATA.mountain_pass = {
    grid: Object.freeze([
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,W,W,R,F,F,R,W,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,W,R,F,F,F,F,R,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,R,F,F,P,F,F,F,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,F,F,R,F,F,F,W,W,W,W,W,W,W,W],
      [W,W,W,W,W,R,F,F,F,F,R,W,W,W,W,W,W,W,W,W],
      [W,W,W,W,W,F,F,P,F,F,F,W,W,W,W,W,W,W,W,W],
      [W,W,W,W,R,F,F,F,F,R,W,W,W,W,W,W,W,W,W,W],
      [W,W,W,W,F,F,R,F,F,F,F,W,W,W,W,W,W,W,W,W],
      [W,W,W,W,W,F,F,F,P,F,F,R,W,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,F,F,F,F,F,F,W,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,R,F,F,F,F,R,W,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,W,F,F,F,F,W,W,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,W,F,E,E,E,E,W,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,W,W,E,E,E,E,W,W,W,W,W,W,W,W]
    ].map(function (row) { return Object.freeze(row); })),
    partyStart: Object.freeze([
      { row: 14, col: 8  },
      { row: 14, col: 9  },
      { row: 14, col: 10 },
      { row: 14, col: 11 },
      { row: 13, col: 8  },
      { row: 13, col: 11 }
    ]),
    enemyStart: Object.freeze([
      { row: 1, col: 9  },
      { row: 2, col: 10 },
      { row: 3, col: 8  },
      { row: 4, col: 7  }
    ])
  };

  // --- 3. castle_entrance ---
  MAP_DATA.castle_entrance = {
    grid: Object.freeze([
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,F,F,F,F,W,S,F,F,F,F,F,F,S,W,F,F,F,F,W],
      [W,F,F,F,F,W,F,F,F,F,F,F,F,F,W,F,F,F,F,W],
      [W,F,F,P,F,W,F,F,F,F,F,F,F,F,W,F,P,F,F,W],
      [W,F,F,F,F,W,F,F,F,F,F,F,F,F,W,F,F,F,F,W],
      [W,F,F,F,F,W,F,F,F,F,F,F,F,F,W,F,F,F,F,W],
      [W,W,W,D,W,W,F,F,F,D,D,F,F,F,W,W,D,W,W,W],
      [W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,F,S,F,F,F,F,F,F,F,F,F,F,F,F,F,F,S,F,W],
      [W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,F,F,F,F,P,F,F,F,F,F,F,F,F,P,F,F,F,F,W],
      [W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,W,W,W,W,W,W,F,F,F,F,F,F,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,W,F,E,E,E,E,F,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,W,W,E,E,E,E,W,W,W,W,W,W,W,W]
    ].map(function (row) { return Object.freeze(row); })),
    partyStart: Object.freeze([
      { row: 14, col: 8  },
      { row: 14, col: 9  },
      { row: 14, col: 10 },
      { row: 14, col: 11 },
      { row: 13, col: 8  },
      { row: 13, col: 11 }
    ]),
    enemyStart: Object.freeze([
      { row: 1, col: 2  },
      { row: 1, col: 17 },
      { row: 7, col: 9  },
      { row: 7, col: 10 },
      { row: 3, col: 10 }
    ])
  };

  // --- 4. castle_throne ---
  MAP_DATA.castle_throne = {
    grid: Object.freeze([
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,W,W,W,P,F,F,F,A,A,A,A,F,F,F,P,W,W,W,W],
      [W,W,W,F,F,F,F,F,A,A,A,A,F,F,F,F,F,W,W,W],
      [W,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W],
      [W,P,F,F,F,F,R,F,F,F,F,F,F,R,F,F,F,F,P,W],
      [W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,P,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,P,W],
      [W,F,F,F,F,F,R,F,F,F,F,F,F,R,F,F,F,F,F,W],
      [W,P,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,P,W],
      [W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,P,F,F,F,F,R,F,F,F,F,F,F,R,F,F,F,F,P,W],
      [W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,W,W,W,W,W,W,F,F,F,F,F,F,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,W,F,E,E,E,E,F,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,W,W,E,E,E,E,W,W,W,W,W,W,W,W]
    ].map(function (row) { return Object.freeze(row); })),
    partyStart: Object.freeze([
      { row: 14, col: 8  },
      { row: 14, col: 9  },
      { row: 14, col: 10 },
      { row: 14, col: 11 },
      { row: 13, col: 8  },
      { row: 13, col: 11 }
    ]),
    enemyStart: Object.freeze([
      { row: 1, col: 9  },
      { row: 1, col: 10 },
      { row: 3, col: 5  },
      { row: 3, col: 14 },
      { row: 5, col: 9  },
      { row: 5, col: 10 }
    ])
  };

  // --- 5. crypt_chamber ---
  MAP_DATA.crypt_chamber = {
    grid: Object.freeze([
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,F,F,F,W,S,F,S,W,F,F,F,W,S,F,S,F,F,F,W],
      [W,F,P,F,W,F,F,F,W,F,P,F,W,F,F,F,F,P,F,W],
      [W,F,F,F,W,F,F,F,W,F,F,F,W,F,F,F,F,F,F,W],
      [W,F,F,F,D,F,F,F,D,F,F,F,D,F,F,F,F,F,F,W],
      [W,W,W,D,W,W,W,W,W,F,F,F,W,W,W,W,D,W,W,W],
      [W,F,F,F,F,F,F,F,F,F,A,F,F,F,F,F,F,F,F,W],
      [W,F,F,F,F,F,P,F,F,A,A,A,F,F,P,F,F,F,F,W],
      [W,F,F,F,F,F,F,F,F,F,A,F,F,F,F,F,F,F,F,W],
      [W,W,W,D,W,W,W,W,W,F,F,F,W,W,W,W,D,W,W,W],
      [W,F,F,F,W,S,F,S,W,F,F,F,W,F,F,F,F,F,F,W],
      [W,F,P,F,W,F,F,F,W,F,P,F,W,F,F,F,F,P,F,W],
      [W,F,F,F,W,F,F,F,W,F,F,F,W,F,F,F,F,F,F,W],
      [W,F,F,F,W,F,F,F,W,F,E,E,W,F,F,F,F,F,F,W],
      [W,W,W,W,W,W,W,W,W,W,E,E,W,W,W,W,W,W,W,W]
    ].map(function (row) { return Object.freeze(row); })),
    partyStart: Object.freeze([
      { row: 14, col: 10 },
      { row: 14, col: 11 },
      { row: 13, col: 10 },
      { row: 13, col: 11 },
      { row: 12, col: 10 },
      { row: 12, col: 11 }
    ]),
    enemyStart: Object.freeze([
      { row: 6, col: 10 },
      { row: 7, col: 9  },
      { row: 7, col: 11 },
      { row: 1, col: 6  },
      { row: 1, col: 14 }
    ])
  };

  // --- 6. crypt_sanctum ---
  MAP_DATA.crypt_sanctum = {
    grid: Object.freeze([
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,W,F,F,F,F,F,F,W,W,W,W,W,W,W],
      [W,W,W,W,W,F,F,F,F,F,F,F,F,F,F,W,W,W,W,W],
      [W,W,W,W,F,F,F,F,P,F,F,P,F,F,F,F,W,W,W,W],
      [W,W,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W,W],
      [W,W,F,F,F,F,P,F,F,F,F,F,F,P,F,F,F,F,W,W],
      [W,W,F,F,F,F,F,F,F,A,A,F,F,F,F,F,F,F,W,W],
      [W,W,F,F,F,F,F,F,A,A,A,A,F,F,F,F,F,F,W,W],
      [W,W,F,F,F,F,F,F,F,A,A,F,F,F,F,F,F,F,W,W],
      [W,W,F,F,F,F,P,F,F,F,F,F,F,P,F,F,F,F,W,W],
      [W,W,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W,W],
      [W,W,W,W,F,F,F,F,P,F,F,P,F,F,F,F,W,W,W,W],
      [W,W,W,W,W,F,F,F,F,F,F,F,F,F,F,W,W,W,W,W],
      [W,W,W,W,W,W,W,F,F,E,E,F,F,W,W,W,W,W,W,W],
      [W,W,W,W,W,W,W,W,W,E,E,W,W,W,W,W,W,W,W,W]
    ].map(function (row) { return Object.freeze(row); })),
    partyStart: Object.freeze([
      { row: 14, col: 9  },
      { row: 14, col: 10 },
      { row: 13, col: 9  },
      { row: 13, col: 10 },
      { row: 13, col: 8  },
      { row: 13, col: 11 }
    ]),
    enemyStart: Object.freeze([
      { row: 7, col: 9  },
      { row: 7, col: 10 },
      { row: 6, col: 9  },
      { row: 6, col: 10 },
      { row: 4, col: 9  },
      { row: 4, col: 10 }
    ])
  };

  // --- 7. orc_camp ---
  MAP_DATA.orc_camp = {
    grid: Object.freeze([
      [P,G,G,G,G,P,G,G,G,G,G,G,G,G,P,G,G,G,G,P],
      [G,G,G,N,N,N,G,G,G,G,G,G,G,G,N,N,N,G,G,G],
      [G,G,G,N,N,N,G,G,G,G,G,G,G,G,N,N,N,G,G,G],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,R,G,G,R,G,G,G,G,G,G,G,G],
      [P,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,P],
      [G,G,G,G,G,G,G,G,G,C,C,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,G,C,C,G,G,G,G,G,G,G,G,G],
      [G,G,G,G,G,G,G,G,R,G,G,R,G,G,G,G,G,G,G,G],
      [P,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,P],
      [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
      [G,G,N,N,N,G,G,G,G,G,G,G,G,G,G,N,N,N,G,G],
      [G,G,N,N,N,G,G,G,G,G,G,G,G,G,G,N,N,N,G,G],
      [P,G,G,G,G,P,G,G,E,E,E,E,G,G,P,G,G,G,G,P],
      [G,G,G,G,G,G,G,G,E,E,E,E,G,G,G,G,G,G,G,G]
    ].map(function (row) { return Object.freeze(row); })),
    partyStart: Object.freeze([
      { row: 14, col: 8  },
      { row: 14, col: 9  },
      { row: 14, col: 10 },
      { row: 14, col: 11 },
      { row: 13, col: 8  },
      { row: 13, col: 11 }
    ]),
    enemyStart: Object.freeze([
      { row: 1, col: 9  },
      { row: 1, col: 10 },
      { row: 4, col: 4  },
      { row: 4, col: 15 },
      { row: 6, col: 3  },
      { row: 6, col: 16 }
    ])
  };

  // --- 8. swamp ---
  MAP_DATA.swamp = {
    grid: Object.freeze([
      [Q,Q,Q,Q,Q,Q,Q,Q,Q,Q,Q,Q,Q,Q,Q,Q,Q,Q,Q,Q],
      [Q,Q,Q,G,G,G,Q,Q,Q,Q,Q,Q,Q,Q,N,N,N,Q,Q,Q],
      [Q,Q,G,G,B,G,G,Q,Q,Q,Q,Q,Q,G,N,N,N,G,Q,Q],
      [Q,G,G,R,G,G,Q,Q,Q,G,G,Q,Q,G,G,G,G,G,Q,Q],
      [Q,G,G,G,G,Q,Q,Q,G,G,G,G,Q,Q,G,G,G,Q,Q,Q],
      [Q,Q,G,G,Q,Q,Q,G,G,B,G,G,G,Q,Q,G,Q,Q,Q,Q],
      [Q,Q,Q,G,G,Q,G,G,G,G,G,G,G,G,Q,Q,Q,Q,Q,Q],
      [Q,Q,Q,Q,G,G,G,G,R,G,G,R,G,G,G,Q,Q,Q,Q,Q],
      [Q,Q,Q,Q,Q,G,G,G,G,G,G,G,G,G,G,Q,Q,Q,Q,Q],
      [Q,Q,Q,Q,Q,Q,G,G,G,G,G,G,G,G,Q,Q,Q,Q,Q,Q],
      [Q,Q,Q,Q,Q,G,G,G,B,G,G,B,G,G,G,Q,Q,Q,Q,Q],
      [Q,Q,Q,Q,G,G,G,G,G,G,G,G,G,G,G,G,Q,Q,Q,Q],
      [Q,Q,Q,G,G,G,G,G,G,G,G,G,G,G,G,G,G,Q,Q,Q],
      [Q,Q,Q,Q,Q,Q,Q,G,E,E,E,E,G,Q,Q,Q,Q,Q,Q,Q],
      [Q,Q,Q,Q,Q,Q,Q,Q,E,E,E,E,Q,Q,Q,Q,Q,Q,Q,Q]
    ].map(function (row) { return Object.freeze(row); })),
    partyStart: Object.freeze([
      { row: 14, col: 8  },
      { row: 14, col: 9  },
      { row: 14, col: 10 },
      { row: 14, col: 11 },
      { row: 13, col: 8  },
      { row: 13, col: 11 }
    ]),
    enemyStart: Object.freeze([
      { row: 1, col: 15 },
      { row: 3, col: 9  },
      { row: 3, col: 10 },
      { row: 5, col: 9  },
      { row: 6, col: 7  }
    ])
  };

  // =========================================================================
  // Active map state
  // =========================================================================

  var activeMapId = 'forest_clearing';

  function setActiveMap(mapId) {
    if (!MAP_DATA[mapId]) {
      throw new Error('Unknown campaign map: ' + mapId);
    }
    activeMapId = mapId;
  }

  function getActiveMapId() {
    return activeMapId;
  }

  // =========================================================================
  // Core map functions — operate on a given grid
  // =========================================================================

  function inBounds(row, col) {
    return row >= 0 && row < ROWS && col >= 0 && col < COLS;
  }

  function _getTile(grid, row, col) {
    if (!inBounds(row, col)) return T.WALL;
    return grid[row][col];
  }

  function _isPassable(grid, row, col) {
    var tile = _getTile(grid, row, col);
    return tile === F || tile === R || tile === X || tile === E ||
           tile === G || tile === Q || tile === A || tile === D || tile === C;
  }

  function _isLava(grid, row, col) {
    return _getTile(grid, row, col) === L;
  }

  function _getMovementCost(grid, row, col) {
    var tile = _getTile(grid, row, col);
    if (tile === R) return 2;
    if (tile === Q) return 3; // WATER costs 3
    if (tile === F || tile === X || tile === E || tile === G ||
        tile === A || tile === D || tile === C) return 1;
    if (tile === L) return 1;
    return Infinity;
  }

  function getDistance(posA, posB) {
    return Math.max(Math.abs(posA.row - posB.row), Math.abs(posA.col - posB.col));
  }

  function isAdjacent(posA, posB) {
    return getDistance(posA, posB) <= 1;
  }

  function _getLineOfSight(grid, from, to) {
    var dr = to.row - from.row;
    var dc = to.col - from.col;
    var steps = Math.max(Math.abs(dr), Math.abs(dc));
    if (steps === 0) return true;

    var rowStep = dr / steps;
    var colStep = dc / steps;
    var r, c, tile;

    for (var i = 1; i < steps; i++) {
      r = Math.round(from.row + rowStep * i);
      c = Math.round(from.col + colStep * i);
      tile = _getTile(grid, r, c);
      if (tile === W || tile === P || tile === B || tile === N || tile === S) return false;
    }
    return true;
  }

  function getSquaresInCone(origin, direction, length) {
    var results = [];
    var dr = direction.dRow;
    var dc = direction.dCol;
    dr = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
    dc = dc === 0 ? 0 : (dc > 0 ? 1 : -1);

    var isDiagonal = (dr !== 0 && dc !== 0);
    var r, c, spread, s;

    for (var d = 1; d <= length; d++) {
      var baseRow = origin.row + dr * d;
      var baseCol = origin.col + dc * d;
      spread = Math.floor(d / 2);

      if (isDiagonal) {
        for (s = -spread; s <= spread; s++) {
          r = baseRow + s;
          c = baseCol;
          if (inBounds(r, c)) results.push({ row: r, col: c });
          if (s !== 0) {
            r = baseRow;
            c = baseCol + s;
            if (inBounds(r, c)) results.push({ row: r, col: c });
          }
        }
      } else if (dr === 0) {
        for (s = -spread; s <= spread; s++) {
          r = baseRow + s;
          c = baseCol;
          if (inBounds(r, c)) results.push({ row: r, col: c });
        }
      } else {
        for (s = -spread; s <= spread; s++) {
          r = baseRow;
          c = baseCol + s;
          if (inBounds(r, c)) results.push({ row: r, col: c });
        }
      }
    }

    var seen = {};
    var unique = [];
    for (var i = 0; i < results.length; i++) {
      var key = results[i].row + ',' + results[i].col;
      if (!seen[key]) {
        seen[key] = true;
        unique.push(results[i]);
      }
    }
    return unique;
  }

  function getSquaresInRadius(center, radius) {
    var results = [];
    var r, c;
    for (r = center.row - radius; r <= center.row + radius; r++) {
      for (c = center.col - radius; c <= center.col + radius; c++) {
        if (!inBounds(r, c)) continue;
        var dr = r - center.row;
        var dc = c - center.col;
        if (Math.sqrt(dr * dr + dc * dc) <= radius + 0.5) {
          results.push({ row: r, col: c });
        }
      }
    }
    return results;
  }

  function _getAdjacentPassable(grid, pos) {
    var neighbors = [];
    var offsets = [
      { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
      { row:  0, col: -1 },                        { row:  0, col: 1 },
      { row:  1, col: -1 }, { row:  1, col: 0 },  { row:  1, col: 1 }
    ];
    for (var i = 0; i < offsets.length; i++) {
      var r = pos.row + offsets[i].row;
      var c = pos.col + offsets[i].col;
      if (_isPassable(grid, r, c)) {
        neighbors.push({ row: r, col: c });
      }
    }
    return neighbors;
  }

  function _findPath(grid, from, to) {
    if (from.row === to.row && from.col === to.col) return [{ row: from.row, col: from.col }];
    if (!_isPassable(grid, to.row, to.col) && !_isLava(grid, to.row, to.col)) return [];

    var queue = [{ row: from.row, col: from.col }];
    var visited = {};
    var prev = {};
    var key = from.row + ',' + from.col;
    visited[key] = true;

    var offsets = [
      { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
      { row:  0, col: -1 },                        { row:  0, col: 1 },
      { row:  1, col: -1 }, { row:  1, col: 0 },  { row:  1, col: 1 }
    ];

    while (queue.length > 0) {
      var cur = queue.shift();
      if (cur.row === to.row && cur.col === to.col) {
        var path = [];
        var node = cur;
        while (node) {
          path.unshift({ row: node.row, col: node.col });
          node = prev[node.row + ',' + node.col];
        }
        return path;
      }

      for (var i = 0; i < offsets.length; i++) {
        var nr = cur.row + offsets[i].row;
        var nc = cur.col + offsets[i].col;
        var nk = nr + ',' + nc;
        if (visited[nk]) continue;
        if (!_isPassable(grid, nr, nc) && !_isLava(grid, nr, nc)) continue;
        visited[nk] = true;
        prev[nk] = cur;
        queue.push({ row: nr, col: nc });
      }
    }

    return [];
  }

  function _createMapState(grid) {
    var revealed = [];
    var r, c;
    for (r = 0; r < ROWS; r++) {
      revealed[r] = [];
      for (c = 0; c < COLS; c++) {
        revealed[r][c] = false;
      }
    }

    var boundGetSquaresInRadius = getSquaresInRadius;

    return {
      revealed: revealed,
      revealSquare: function (row, col) {
        if (inBounds(row, col)) revealed[row][col] = true;
      },
      revealRadius: function (center, radius) {
        var squares = boundGetSquaresInRadius(center, radius);
        for (var i = 0; i < squares.length; i++) {
          revealed[squares[i].row][squares[i].col] = true;
        }
      },
      isRevealed: function (row, col) {
        if (!inBounds(row, col)) return false;
        return revealed[row][col];
      }
    };
  }

  // =========================================================================
  // Active-map wrapper functions (delegate to active grid)
  // =========================================================================

  function getTile(row, col) {
    return _getTile(MAP_DATA[activeMapId].grid, row, col);
  }

  function isPassable(row, col) {
    return _isPassable(MAP_DATA[activeMapId].grid, row, col);
  }

  function isLava(row, col) {
    return _isLava(MAP_DATA[activeMapId].grid, row, col);
  }

  function getMovementCost(row, col) {
    return _getMovementCost(MAP_DATA[activeMapId].grid, row, col);
  }

  function getLineOfSight(from, to) {
    return _getLineOfSight(MAP_DATA[activeMapId].grid, from, to);
  }

  function getAdjacentPassable(pos) {
    return _getAdjacentPassable(MAP_DATA[activeMapId].grid, pos);
  }

  function findPath(from, to) {
    return _findPath(MAP_DATA[activeMapId].grid, from, to);
  }

  function createMapState() {
    return _createMapState(MAP_DATA[activeMapId].grid);
  }

  // =========================================================================
  // Enemy positions accessor
  // =========================================================================

  function getEnemyPositions(mapId) {
    var data = MAP_DATA[mapId || activeMapId];
    if (!data) throw new Error('Unknown campaign map: ' + mapId);
    return data.enemyStart;
  }

  // =========================================================================
  // createCompatibleMapObject — returns a dragon-map.js–shaped API object
  // =========================================================================

  function createCompatibleMapObject(mapId) {
    var data = MAP_DATA[mapId];
    if (!data) throw new Error('Unknown campaign map: ' + mapId);
    var grid = data.grid;

    return Object.freeze({
      TILE_TYPES:            TILE_TYPES,
      CAVE_MAP:              grid,
      ROWS:                  ROWS,
      COLS:                  COLS,
      PARTY_START_POSITIONS: data.partyStart,
      DRAGON_START_POSITION: data.enemyStart[0],
      COVER_BONUS:           COVER_BONUS,
      createMapState:        function () { return _createMapState(grid); },
      getTile:               function (row, col) { return _getTile(grid, row, col); },
      isPassable:            function (row, col) { return _isPassable(grid, row, col); },
      isLava:                function (row, col) { return _isLava(grid, row, col); },
      getMovementCost:       function (row, col) { return _getMovementCost(grid, row, col); },
      getDistance:            getDistance,
      isAdjacent:            isAdjacent,
      getLineOfSight:        function (from, to) { return _getLineOfSight(grid, from, to); },
      getSquaresInCone:      getSquaresInCone,
      getSquaresInRadius:    getSquaresInRadius,
      getAdjacentPassable:   function (pos) { return _getAdjacentPassable(grid, pos); },
      findPath:              function (from, to) { return _findPath(grid, from, to); }
    });
  }

  // =========================================================================
  // Export
  // =========================================================================

  root.MJ.Dragon.Campaign.LocationMaps = Object.freeze({
    TILE_TYPES:            TILE_TYPES,
    ROWS:                  ROWS,
    COLS:                  COLS,
    COVER_BONUS:           COVER_BONUS,
    setActiveMap:          setActiveMap,
    getActiveMapId:        getActiveMapId,
    getTile:               getTile,
    isPassable:            isPassable,
    isLava:                isLava,
    getMovementCost:       getMovementCost,
    getDistance:            getDistance,
    isAdjacent:            isAdjacent,
    getLineOfSight:        getLineOfSight,
    getSquaresInCone:      getSquaresInCone,
    getSquaresInRadius:    getSquaresInRadius,
    getAdjacentPassable:   getAdjacentPassable,
    findPath:              findPath,
    createMapState:        createMapState,
    getEnemyPositions:     getEnemyPositions,
    createCompatibleMapObject: createCompatibleMapObject
  });

})(typeof window !== 'undefined' ? window : this);
