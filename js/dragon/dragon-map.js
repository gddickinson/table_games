/**
 * dragon-map.js — Cave map for D&D dragon battle encounter
 * 20x15 grid, each square = 5ft (100ft x 75ft cave)
 * See dragon module docs for API documentation
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};

  // --- Tile type enum ---
  var TILE_TYPES = Object.freeze({
    FLOOR:    0,
    WALL:     1,
    RUBBLE:   2,
    LAVA:     3,
    PILLAR:   4,
    TREASURE: 5,
    ENTRANCE: 6
  });

  var T = TILE_TYPES;
  var W = T.WALL, F = T.FLOOR, R = T.RUBBLE, L = T.LAVA;
  var P = T.PILLAR, X = T.TREASURE, E = T.ENTRANCE;

  // 20 cols x 15 rows — [row][col]
  // Row 0 = top (north), Row 14 = bottom (south)
  var CAVE_MAP = Object.freeze([
    // Row 0: solid wall top border
    [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    // Row 1: dragon lair top — treasure hoard
    [W,W,W,W,W,W,W,X,X,X,X,X,X,W,W,W,W,W,W,W],
    // Row 2: dragon lair middle
    [W,W,W,W,W,W,X,X,F,F,F,X,X,X,W,W,W,W,W,W],
    // Row 3: dragon lair bottom edge
    [W,W,W,W,W,R,F,F,F,F,F,F,F,R,W,W,W,W,W,W],
    // Row 4: transition to central chamber
    [W,W,W,W,R,F,F,F,F,F,F,F,F,F,R,W,W,W,W,W],
    // Row 5: central chamber + right elevated area starts
    [W,W,W,F,F,F,F,P,F,F,F,F,F,F,F,F,R,F,F,W],
    // Row 6: left alcove starts + central chamber
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,F,R,W],
    // Row 7: left alcove with pillars + lava pools
    [W,F,P,F,L,L,F,F,F,F,F,F,F,F,F,F,W,F,F,W],
    // Row 8: left alcove + lava pools right side
    [W,F,F,F,L,L,F,F,F,P,F,F,F,F,L,L,W,R,F,W],
    // Row 9: left alcove ends + central chamber
    [W,F,P,F,F,F,F,F,F,F,F,F,P,F,L,L,F,F,F,W],
    // Row 10: central chamber lower
    [W,W,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W],
    // Row 11: narrowing toward entrance
    [W,W,W,W,R,F,F,F,P,F,F,P,F,F,F,R,W,W,W,W],
    // Row 12: corridor widens
    [W,W,W,W,W,W,R,F,F,F,F,F,F,R,W,W,W,W,W,W],
    // Row 13: entrance corridor
    [W,W,W,W,W,W,W,F,E,E,E,E,F,W,W,W,W,W,W,W],
    // Row 14: bottom wall border
    [W,W,W,W,W,W,W,W,E,E,E,E,W,W,W,W,W,W,W,W]
  ].map(function (row) { return Object.freeze(row); }));

  var ROWS = CAVE_MAP.length;    // 15
  var COLS = CAVE_MAP[0].length; // 20

  // --- Starting positions ---
  var PARTY_START_POSITIONS = Object.freeze([
    { row: 14, col: 8 },
    { row: 14, col: 9 },
    { row: 14, col: 10 },
    { row: 14, col: 11 },
    { row: 13, col: 8 },
    { row: 13, col: 11 }
  ]);

  var DRAGON_START_POSITION = Object.freeze({ row: 2, col: 9 });

  var COVER_BONUS = Object.freeze({ pillar: 2 });

  // --- Tile query helpers ---

  function inBounds(row, col) {
    return row >= 0 && row < ROWS && col >= 0 && col < COLS;
  }

  function getTile(row, col) {
    if (!inBounds(row, col)) return T.WALL;
    return CAVE_MAP[row][col];
  }

  function isPassable(row, col) {
    var tile = getTile(row, col);
    return tile === F || tile === R || tile === X || tile === E;
  }

  function isLava(row, col) {
    return getTile(row, col) === L;
  }

  function getMovementCost(row, col) {
    var tile = getTile(row, col);
    if (tile === R) return 2;
    if (tile === F || tile === X || tile === E) return 1;
    // Lava is traversable but costs 1 movement (damage applied separately)
    if (tile === L) return 1;
    return Infinity;
  }

  // --- Distance and adjacency ---

  function getDistance(posA, posB) {
    return Math.max(Math.abs(posA.row - posB.row), Math.abs(posA.col - posB.col));
  }

  function isAdjacent(posA, posB) {
    return getDistance(posA, posB) <= 1;
  }

  // --- Map state with fog of war ---

  function createMapState() {
    var revealed = [];
    var r, c;
    for (r = 0; r < ROWS; r++) {
      revealed[r] = [];
      for (c = 0; c < COLS; c++) {
        revealed[r][c] = false;
      }
    }
    return {
      revealed: revealed,
      revealSquare: function (row, col) {
        if (inBounds(row, col)) revealed[row][col] = true;
      },
      revealRadius: function (center, radius) {
        var squares = getSquaresInRadius(center, radius);
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

  // --- Line of sight (ray march) ---

  function getLineOfSight(from, to, map) {
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
      tile = getTile(r, c);
      if (tile === W || tile === P) return false;
    }
    return true;
  }

  // --- Area of effect: cone ---

  function getSquaresInCone(origin, direction, length) {
    // direction: {dRow, dCol} unit-ish vector indicating cone direction
    // Cone widens: at distance d from origin, width = d on each side
    var results = [];
    var dr = direction.dRow;
    var dc = direction.dCol;
    // Normalize to -1/0/1
    dr = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
    dc = dc === 0 ? 0 : (dc > 0 ? 1 : -1);

    var isDiagonal = (dr !== 0 && dc !== 0);
    var r, c, spread, s;

    for (var d = 1; d <= length; d++) {
      var baseRow = origin.row + dr * d;
      var baseCol = origin.col + dc * d;
      spread = Math.floor(d / 2);

      if (isDiagonal) {
        // Diagonal cone: spread along both perpendicular axes
        for (s = -spread; s <= spread; s++) {
          r = baseRow + s;
          c = baseCol;
          if (inBounds(r, c)) results.push({ row: r, col: c });
          if (s !== 0 || true) {
            r = baseRow;
            c = baseCol + s;
            if (s !== 0 && inBounds(r, c)) results.push({ row: r, col: c });
          }
        }
      } else if (dr === 0) {
        // Horizontal cone: spread vertically
        for (s = -spread; s <= spread; s++) {
          r = baseRow + s;
          c = baseCol;
          if (inBounds(r, c)) results.push({ row: r, col: c });
        }
      } else {
        // Vertical cone: spread horizontally
        for (s = -spread; s <= spread; s++) {
          r = baseRow;
          c = baseCol + s;
          if (inBounds(r, c)) results.push({ row: r, col: c });
        }
      }
    }

    // Deduplicate
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

  // --- Area of effect: radius (circle) ---

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

  // --- Adjacent passable squares ---

  function getAdjacentPassable(pos) {
    var neighbors = [];
    var offsets = [
      { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
      { row:  0, col: -1 },                        { row:  0, col: 1 },
      { row:  1, col: -1 }, { row:  1, col: 0 },  { row:  1, col: 1 }
    ];
    for (var i = 0; i < offsets.length; i++) {
      var r = pos.row + offsets[i].row;
      var c = pos.col + offsets[i].col;
      if (isPassable(r, c)) {
        neighbors.push({ row: r, col: c });
      }
    }
    return neighbors;
  }

  // --- BFS pathfinding ---

  function findPath(from, to) {
    if (from.row === to.row && from.col === to.col) return [{ row: from.row, col: from.col }];
    if (!isPassable(to.row, to.col) && !isLava(to.row, to.col)) return [];

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
        // Reconstruct path
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
        if (!isPassable(nr, nc) && !isLava(nr, nc)) continue;
        visited[nk] = true;
        prev[nk] = cur;
        queue.push({ row: nr, col: nc });
      }
    }

    return []; // No path found
  }

  // --- Export ---

  root.MJ.Dragon.Map = Object.freeze({
    TILE_TYPES:            TILE_TYPES,
    CAVE_MAP:              CAVE_MAP,
    ROWS:                  ROWS,
    COLS:                  COLS,
    PARTY_START_POSITIONS: PARTY_START_POSITIONS,
    DRAGON_START_POSITION: DRAGON_START_POSITION,
    COVER_BONUS:           COVER_BONUS,
    createMapState:        createMapState,
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
    findPath:              findPath
  });

})(typeof window !== 'undefined' ? window : this);
