/**
 * campaign-world.js — Hexagonal world map data and navigation for D&D campaign.
 * Exports under window.MJ.Dragon.Campaign.World (IIFE module).
 * 12-column x 8-row pointy-top hex grid with terrain, fog of war, and pathfinding.
 */
(function (root) {
  'use strict';
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};
  root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

  /* ========== TERRAIN TYPES ========== */

  var TERRAIN_TYPES = Object.freeze({
    plains:   { moveCost: 1, color: '#c4a747', passable: true,  label: 'Plains' },
    forest:   { moveCost: 2, color: '#2d5a27', passable: true,  label: 'Forest' },
    mountain: { moveCost: 3, color: '#6b6b6b', passable: false, label: 'Mountain' },
    swamp:    { moveCost: 2, color: '#4a5a3a', passable: true,  label: 'Swamp' },
    river:    { moveCost: 9, color: '#3498db', passable: false, label: 'River' },
    road:     { moveCost: 1, color: '#8b7355', passable: true,  label: 'Road' }
  });

  var COLS = 12;
  var ROWS = 8;

  /* ========== MAP DATA ========== */

  /**
   * Build the 12x8 hex grid. Each cell: {terrain, locationId, explored, passable}.
   * Layout design:
   *   - Center-south road crossroads at Willowmere
   *   - Western forests (Whispering Woods, Haunted Castle)
   *   - Eastern mountains (Stormcrag Pass, Wizard's Crypt, Orc Camp)
   *   - Northern volcanic mountain (Dragon's Lair)
   *   - Southwest swamp (Cursed Swamp)
   *   - Rivers running east-west through the middle
   *   - Roads connecting Willowmere outward
   */
  function buildGrid() {
    var grid = [];
    var q, r;

    /* Initialize everything as plains */
    for (r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (q = 0; q < COLS; q++) {
        grid[r][q] = {
          terrain: 'plains',
          locationId: null,
          explored: false,
          passable: true
        };
      }
    }

    /* ------- Forest clusters (west) ------- */
    var forestHexes = [
      [1,1],[2,1],[3,1],
      [1,2],[2,2],[3,2],[4,2],
      [1,3],[2,3],[3,3],[4,3],
      [2,4],[3,4],
      [0,2],[0,3],[0,4]
    ];
    for (var i = 0; i < forestHexes.length; i++) {
      setTerrain(grid, forestHexes[i][0], forestHexes[i][1], 'forest');
    }

    /* ------- Mountain clusters (east & north) ------- */
    var mountainHexes = [
      [7,0],[8,0],[9,0],[10,0],
      [7,1],[8,1],[9,1],[10,1],
      [8,2],[9,2],[10,2],
      [9,3],[10,3],
      [5,0],[6,0],
      [11,0],[11,1],[11,2],[11,3]
    ];
    for (i = 0; i < mountainHexes.length; i++) {
      setTerrain(grid, mountainHexes[i][0], mountainHexes[i][1], 'mountain');
    }

    /* ------- Swamp (southwest) ------- */
    var swampHexes = [
      [0,5],[1,5],[2,5],
      [0,6],[1,6],[2,6],
      [0,7],[1,7]
    ];
    for (i = 0; i < swampHexes.length; i++) {
      setTerrain(grid, swampHexes[i][0], swampHexes[i][1], 'swamp');
    }

    /* ------- River (east-west through middle, rows 4-5) ------- */
    var riverHexes = [
      [4,4],[5,4],[6,4],[7,4],[8,4],
      [6,5],[7,5],[8,5],[9,5],[10,5]
    ];
    for (i = 0; i < riverHexes.length; i++) {
      setTerrain(grid, riverHexes[i][0], riverHexes[i][1], 'river');
    }

    /* ------- Roads ------- */
    /* Main crossroads at Willowmere plus spokes outward */
    var roadHexes = [
      /* Crossroads hub */
      [5,6],
      /* Road north from Willowmere */
      [5,5],[5,3],[5,2],[5,1],
      /* Road south */
      [5,7],[4,7],
      /* Road west toward forest */
      [4,6],[3,6],[3,5],
      /* Road east toward crypt */
      [6,6],[7,6],[8,6],
      /* Bridge/ford over river at (5,5) is already road — bridges the river */
      /* Road through Stormcrag Pass */
      [8,3],[7,2],[7,3],
      /* Road spur to orc camp */
      [9,1]
    ];
    for (i = 0; i < roadHexes.length; i++) {
      setTerrain(grid, roadHexes[i][0], roadHexes[i][1], 'road');
    }

    /* ------- Rocky terrain near mountains (plains with location) ------- */
    setTerrain(grid, 8, 4, 'road');  /* bridge over river near crypt */
    setTerrain(grid, 9, 4, 'plains');

    /* ------- Location assignments ------- */
    grid[6][5].locationId  = 'willowmere';        /* center-south hamlet */
    grid[3][3].locationId  = 'whispering_woods';   /* deep forest */
    grid[2][7].locationId  = 'stormcrag_pass';     /* mountain pass — road hex */
    grid[3][1].locationId  = 'castle_ravenmoor';   /* haunted castle in forest */
    grid[4][8].locationId  = 'wizards_crypt';      /* east rocky area */
    grid[1][9].locationId  = 'orc_camp';           /* northeast plains */
    grid[0][5].locationId  = 'dragons_lair';       /* volcanic north */
    grid[5][1].locationId  = 'cursed_swamp';       /* southwest swamp */

    /* ------- Reveal Willowmere area by default ------- */
    revealArea(grid, 5, 6, 2);

    return grid;
  }

  function setTerrain(grid, q, r, terrain) {
    if (r >= 0 && r < ROWS && q >= 0 && q < COLS) {
      grid[r][q].terrain = terrain;
      grid[r][q].passable = TERRAIN_TYPES[terrain].passable;
    }
  }

  function revealArea(grid, q, r, radius) {
    for (var dr = -radius; dr <= radius; dr++) {
      for (var dq = -radius; dq <= radius; dq++) {
        var rr = r + dr;
        var qq = q + dq;
        if (rr >= 0 && rr < ROWS && qq >= 0 && qq < COLS) {
          grid[rr][qq].explored = true;
        }
      }
    }
  }

  /* ========== HEX GRID INSTANCE ========== */

  var HEX_GRID = buildGrid();

  /* ========== HEX ADJACENCY (pointy-top) ========== */

  /**
   * Pointy-top hex offset coords (odd-r layout).
   * Even rows and odd rows have different neighbor offsets.
   */
  var NEIGHBOR_OFFSETS_EVEN = [
    [+1,  0], [ 0, -1], [-1, -1],
    [-1,  0], [-1, +1], [ 0, +1]
  ];
  var NEIGHBOR_OFFSETS_ODD = [
    [+1,  0], [+1, -1], [ 0, -1],
    [-1,  0], [ 0, +1], [+1, +1]
  ];

  /* ========== PUBLIC FUNCTIONS ========== */

  function getHex(q, r) {
    if (r < 0 || r >= ROWS || q < 0 || q >= COLS) { return null; }
    return HEX_GRID[r][q];
  }

  function setExplored(q, r) {
    var hex = getHex(q, r);
    if (hex) { hex.explored = true; }
  }

  function getAdjacentHexes(q, r) {
    var offsets = (r % 2 === 0) ? NEIGHBOR_OFFSETS_EVEN : NEIGHBOR_OFFSETS_ODD;
    var neighbors = [];
    for (var i = 0; i < 6; i++) {
      var nq = q + offsets[i][0];
      var nr = r + offsets[i][1];
      var hex = getHex(nq, nr);
      if (hex) {
        neighbors.push({ q: nq, r: nr, hex: hex });
      }
    }
    return neighbors;
  }

  function isPassable(q, r) {
    var hex = getHex(q, r);
    if (!hex) { return false; }
    /* Roads are always passable (bridges, mountain passes) */
    if (hex.terrain === 'road') { return true; }
    return hex.passable;
  }

  function canTravel(fromQ, fromR, toQ, toR) {
    /* Must be adjacent */
    var neighbors = getAdjacentHexes(fromQ, fromR);
    var adjacent = false;
    for (var i = 0; i < neighbors.length; i++) {
      if (neighbors[i].q === toQ && neighbors[i].r === toR) {
        adjacent = true;
        break;
      }
    }
    if (!adjacent) { return false; }
    /* Destination must be passable */
    return isPassable(toQ, toR);
  }

  function getMoveCost(q, r) {
    var hex = getHex(q, r);
    if (!hex) { return Infinity; }
    return TERRAIN_TYPES[hex.terrain].moveCost;
  }

  function getLocationHex(locationId) {
    for (var r = 0; r < ROWS; r++) {
      for (var q = 0; q < COLS; q++) {
        if (HEX_GRID[r][q].locationId === locationId) {
          return { q: q, r: r };
        }
      }
    }
    return null;
  }

  function getTerrainColor(terrain) {
    var t = TERRAIN_TYPES[terrain];
    return t ? t.color : '#999';
  }

  function revealAdjacentHexes(q, r) {
    setExplored(q, r);
    var neighbors = getAdjacentHexes(q, r);
    for (var i = 0; i < neighbors.length; i++) {
      setExplored(neighbors[i].q, neighbors[i].r);
    }
  }

  /* ========== BFS PATHFINDING ========== */

  function getPath(fromQ, fromR, toQ, toR) {
    if (fromQ === toQ && fromR === toR) { return [{ q: fromQ, r: fromR }]; }
    if (!isPassable(toQ, toR)) { return null; }

    var start = fromQ + ',' + fromR;
    var goal = toQ + ',' + toR;

    var queue = [{ q: fromQ, r: fromR }];
    var visited = {};
    visited[start] = null; /* parent pointer */
    var costSoFar = {};
    costSoFar[start] = 0;

    while (queue.length > 0) {
      /* Simple priority: pick lowest cost (Dijkstra-like BFS) */
      var bestIdx = 0;
      for (var bi = 1; bi < queue.length; bi++) {
        var bk = queue[bi].q + ',' + queue[bi].r;
        var ck = queue[bestIdx].q + ',' + queue[bestIdx].r;
        if (costSoFar[bk] < costSoFar[ck]) { bestIdx = bi; }
      }
      var current = queue.splice(bestIdx, 1)[0];
      var currentKey = current.q + ',' + current.r;

      if (currentKey === goal) {
        /* Reconstruct path */
        var path = [];
        var ck2 = goal;
        while (ck2 !== null) {
          var parts = ck2.split(',');
          path.unshift({ q: parseInt(parts[0], 10), r: parseInt(parts[1], 10) });
          ck2 = visited[ck2];
        }
        return path;
      }

      var neighbors = getAdjacentHexes(current.q, current.r);
      for (var ni = 0; ni < neighbors.length; ni++) {
        var nb = neighbors[ni];
        if (!isPassable(nb.q, nb.r)) { continue; }
        var nbKey = nb.q + ',' + nb.r;
        var newCost = costSoFar[currentKey] + getMoveCost(nb.q, nb.r);
        if (costSoFar[nbKey] === undefined || newCost < costSoFar[nbKey]) {
          costSoFar[nbKey] = newCost;
          visited[nbKey] = currentKey;
          queue.push({ q: nb.q, r: nb.r });
        }
      }
    }

    return null; /* no path found */
  }

  /* ========== RESET (for new campaign) ========== */

  function resetGrid() {
    var newGrid = buildGrid();
    for (var r = 0; r < ROWS; r++) {
      for (var q = 0; q < COLS; q++) {
        HEX_GRID[r][q] = newGrid[r][q];
      }
    }
  }

  /* ========== LOCATION MAP (id -> display info) ========== */

  var LOCATION_INFO = Object.freeze({
    willowmere:      { name: 'Willowmere',        icon: '\uD83C\uDFE0', description: 'A quiet hamlet at the crossroads' },
    whispering_woods:{ name: 'Whispering Woods',   icon: '\uD83C\uDF32', description: 'Ancient forest where the trees speak' },
    stormcrag_pass:  { name: 'Stormcrag Pass',     icon: '\u26F0\uFE0F', description: 'A treacherous mountain pass' },
    castle_ravenmoor:{ name: 'Castle Ravenmoor',   icon: '\uD83C\uDFF0', description: 'A haunted fortress shrouded in mist' },
    wizards_crypt:   { name: "Wizard's Crypt",     icon: '\uD83D\uDDDD\uFE0F', description: 'Sealed tomb of an archmage' },
    orc_camp:        { name: 'Orc Camp',           icon: '\u2694\uFE0F', description: 'War-camp of the Bloodtusk clan' },
    dragons_lair:    { name: "Dragon's Lair",       icon: '\uD83D\uDC09', description: 'Volcanic peak of Ashenfang' },
    cursed_swamp:    { name: 'Cursed Swamp',       icon: '\uD83C\uDF3F', description: 'Poisonous bogs and restless spirits' }
  });

  function getLocationInfo(locationId) {
    return LOCATION_INFO[locationId] || null;
  }

  function getAllLocations() {
    var list = [];
    for (var r = 0; r < ROWS; r++) {
      for (var q = 0; q < COLS; q++) {
        var hex = HEX_GRID[r][q];
        if (hex.locationId) {
          var info = LOCATION_INFO[hex.locationId];
          list.push({
            q: q,
            r: r,
            locationId: hex.locationId,
            name: info ? info.name : hex.locationId,
            icon: info ? info.icon : '?',
            description: info ? info.description : ''
          });
        }
      }
    }
    return list;
  }

  /* ========== UTILITY ========== */

  function getGridDimensions() {
    return { cols: COLS, rows: ROWS };
  }

  function hexDistance(q1, r1, q2, r2) {
    /* Convert offset to cube then compute distance */
    var c1 = offsetToCube(q1, r1);
    var c2 = offsetToCube(q2, r2);
    return Math.max(
      Math.abs(c1.x - c2.x),
      Math.abs(c1.y - c2.y),
      Math.abs(c1.z - c2.z)
    );
  }

  function offsetToCube(q, r) {
    /* odd-r offset to cube */
    var x = q - (r - (r & 1)) / 2;
    var z = r;
    var y = -x - z;
    return { x: x, y: y, z: z };
  }

  /* ========== EXPORT ========== */

  root.MJ.Dragon.Campaign.World = {
    HEX_GRID:            HEX_GRID,
    TERRAIN_TYPES:       TERRAIN_TYPES,
    LOCATION_INFO:       LOCATION_INFO,
    getHex:              getHex,
    setExplored:         setExplored,
    getAdjacentHexes:    getAdjacentHexes,
    canTravel:           canTravel,
    getMoveCost:         getMoveCost,
    getLocationHex:      getLocationHex,
    getTerrainColor:     getTerrainColor,
    getPath:             getPath,
    revealAdjacentHexes: revealAdjacentHexes,
    getLocationInfo:     getLocationInfo,
    getAllLocations:      getAllLocations,
    getGridDimensions:   getGridDimensions,
    hexDistance:          hexDistance,
    isPassable:          isPassable,
    resetGrid:           resetGrid
  };

})(window);
