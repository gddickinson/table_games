/**
 * scoring.js — Score calculation and pattern recognition
 * See interfaces.js for API documentation
 */
(function () {
  'use strict';
  const { SUITS, MELD_TYPES } = window.MJ.Constants;
  const Tile = window.MJ.Tile;

  /**
   * Each scoring rule: { name, description, check(decomp, ctx) => points|0 }
   * Context: { seatWind, roundWind, selfDrawn, lastTile, concealed, melds,
   *            riichi, flowerCount, isDealer }
   */
  const SCORING_RULES = [
    {
      name: 'All Sequences (Ping Hu)',
      description: 'Hand made entirely of chows and a non-scoring pair',
      points: 5,
      check(d, ctx) {
        const allChows = d.sets.every(s =>
          s.type === MELD_TYPES.CHOW || s.type === MELD_TYPES.PAIR
        );
        return allChows ? this.points : 0;
      }
    },
    {
      name: 'All Triplets (Dui Dui Hu)',
      description: 'Hand made entirely of pongs/kongs',
      points: 30,
      check(d) {
        const sets = d.sets.filter(s => s.type !== MELD_TYPES.PAIR);
        return sets.every(s =>
          s.type === MELD_TYPES.PONG ||
          s.type === MELD_TYPES.KONG ||
          s.type === MELD_TYPES.CONCEALED_KONG
        ) ? this.points : 0;
      }
    },
    {
      name: 'Mixed One Suit (Hun Yi Se)',
      description: 'One suit plus honors',
      points: 25,
      check(d) {
        const allTiles = getAllTiles(d);
        const suits = new Set(allTiles.filter(t => Tile.isSuited(t)).map(t => t.suit));
        const hasHonors = allTiles.some(t => Tile.isHonor(t));
        return suits.size === 1 && hasHonors ? this.points : 0;
      }
    },
    {
      name: 'Pure One Suit (Qing Yi Se)',
      description: 'All tiles from a single suit, no honors',
      points: 50,
      check(d) {
        const allTiles = getAllTiles(d);
        const suits = new Set(allTiles.map(t => t.suit));
        return suits.size === 1 && Tile.isSuited(allTiles[0]) ? this.points : 0;
      }
    },
    {
      name: 'All Honors (Zi Yi Se)',
      description: 'Hand made entirely of wind and dragon tiles',
      points: 80,
      check(d) {
        return getAllTiles(d).every(t => Tile.isHonor(t)) ? this.points : 0;
      }
    },
    {
      name: 'Dragon Pong',
      description: 'A pong/kong of any dragon',
      points: 10,
      check(d) {
        let total = 0;
        for (const s of d.sets) {
          if ((s.type === MELD_TYPES.PONG || s.type === MELD_TYPES.KONG) &&
              s.tiles[0].suit === SUITS.DRAGON) {
            total += this.points;
          }
        }
        return total;
      }
    },
    {
      name: 'Seat Wind Pong',
      description: 'A pong/kong of your seat wind',
      points: 10,
      check(d, ctx) {
        const windRank = ['east', 'south', 'west', 'north'].indexOf(ctx.seatWind) + 1;
        for (const s of d.sets) {
          if ((s.type === MELD_TYPES.PONG || s.type === MELD_TYPES.KONG) &&
              s.tiles[0].suit === SUITS.WIND && s.tiles[0].rank === windRank) {
            return this.points;
          }
        }
        return 0;
      }
    },
    {
      name: 'Round Wind Pong',
      description: 'A pong/kong of the round wind',
      points: 10,
      check(d, ctx) {
        const windRank = ['east', 'south', 'west', 'north'].indexOf(ctx.roundWind) + 1;
        for (const s of d.sets) {
          if ((s.type === MELD_TYPES.PONG || s.type === MELD_TYPES.KONG) &&
              s.tiles[0].suit === SUITS.WIND && s.tiles[0].rank === windRank) {
            return this.points;
          }
        }
        return 0;
      }
    },
    {
      name: 'Self Drawn (Zi Mo)',
      description: 'Winning on your own draw',
      points: 5,
      check(d, ctx) {
        return ctx.selfDrawn ? this.points : 0;
      }
    },
    {
      name: 'Fully Concealed',
      description: 'No open melds when winning',
      points: 5,
      check(d, ctx) {
        return ctx.concealed ? this.points : 0;
      }
    },
    {
      name: 'All Terminals and Honors',
      description: 'Every tile is a terminal (1,9) or honor',
      points: 40,
      check(d) {
        return getAllTiles(d).every(t => Tile.isTerminalOrHonor(t)) ? this.points : 0;
      }
    },
    {
      name: 'Small Three Dragons (Xiao San Yuan)',
      description: 'Two dragon pongs and a dragon pair',
      points: 40,
      check(d) {
        let dragonPongs = 0;
        let dragonPair = false;
        for (const s of d.sets) {
          if (s.tiles[0].suit === SUITS.DRAGON) {
            if (s.type === MELD_TYPES.PONG || s.type === MELD_TYPES.KONG) dragonPongs++;
            if (s.type === MELD_TYPES.PAIR) dragonPair = true;
          }
        }
        return (dragonPongs === 2 && dragonPair) ? this.points : 0;
      }
    },
    {
      name: 'Big Three Dragons (Da San Yuan)',
      description: 'Three pongs of all three dragons',
      points: 88,
      check(d) {
        let dragonPongs = 0;
        for (const s of d.sets) {
          if ((s.type === MELD_TYPES.PONG || s.type === MELD_TYPES.KONG) &&
              s.tiles[0].suit === SUITS.DRAGON) dragonPongs++;
        }
        return dragonPongs === 3 ? this.points : 0;
      }
    },
    {
      name: 'Kong Bonus',
      description: 'Points for each kong declared',
      points: 5,
      check(d) {
        let total = 0;
        for (const s of d.sets) {
          if (s.type === MELD_TYPES.KONG) total += this.points;
          if (s.type === MELD_TYPES.CONCEALED_KONG) total += this.points * 2;
        }
        return total;
      }
    },
    {
      name: 'Riichi',
      description: 'Declared riichi before winning',
      points: 10,
      check(d, ctx) {
        return ctx.riichi ? this.points : 0;
      }
    },
    {
      name: 'Dealer Bonus',
      description: 'Winning as dealer (East seat)',
      points: 5,
      check(d, ctx) {
        return ctx.isDealer ? this.points : 0;
      }
    },
    {
      name: 'Flower Bonus',
      description: 'Bonus for each flower tile drawn',
      points: 2,
      check(d, ctx) {
        return (ctx.flowerCount || 0) * this.points;
      }
    },
    {
      name: 'Dora Bonus',
      description: 'Bonus for each dora tile in hand',
      points: 5,
      check(d, ctx) {
        return (ctx.doraCount || 0) * this.points;
      }
    },
    {
      name: 'Half Flush (Ban Qing)',
      description: 'All suited tiles from one suit, with at least one chow',
      points: 15,
      check(d) {
        const allTiles = getAllTiles(d);
        const suited = allTiles.filter(t => Tile.isSuited(t));
        if (suited.length === 0) return 0;
        const suits = new Set(suited.map(t => t.suit));
        if (suits.size !== 1) return 0;
        const hasChow = d.sets.some(s => s.type === MELD_TYPES.CHOW);
        const hasPong = d.sets.some(s =>
          s.type === MELD_TYPES.PONG || s.type === MELD_TYPES.KONG);
        return (hasChow && hasPong) ? this.points : 0;
      }
    },
    {
      name: 'All Terminals (Qing Lao Tou)',
      description: 'All tiles are 1s and 9s only (no honors)',
      points: 60,
      check(d) {
        const allTiles = getAllTiles(d);
        return allTiles.every(t => Tile.isSuited(t) && Tile.isTerminal(t))
          ? this.points : 0;
      }
    },
    {
      name: 'Small Four Winds (Xiao Si Xi)',
      description: 'Three wind pongs and a wind pair',
      points: 60,
      check(d) {
        let windPongs = 0;
        let windPair = false;
        for (const s of d.sets) {
          if (s.tiles[0].suit === SUITS.WIND) {
            if (s.type === MELD_TYPES.PONG || s.type === MELD_TYPES.KONG) windPongs++;
            if (s.type === MELD_TYPES.PAIR) windPair = true;
          }
        }
        return (windPongs === 3 && windPair) ? this.points : 0;
      }
    }
  ];

  function getAllTiles(decomposition) {
    const tiles = [];
    for (const s of decomposition.sets) {
      tiles.push(...s.tiles);
    }
    if (decomposition.pair) {
      tiles.push(...decomposition.pair);
    }
    return tiles;
  }

  function calculateScore(decomposition, context) {
    const breakdown = [];
    let total = 0;
    const basePts = 1; // minimum for winning

    for (const rule of SCORING_RULES) {
      const pts = rule.check(decomposition, context);
      if (pts > 0) {
        breakdown.push({ name: rule.name, points: pts, description: rule.description });
        total += pts;
      }
    }

    // Minimum winning score
    total = Math.max(total, basePts);
    if (breakdown.length === 0) {
      breakdown.push({ name: 'Chicken Hand', points: 1, description: 'Basic winning hand' });
    }

    return { total, breakdown };
  }

  function getScoreBreakdown(scoreResult) {
    const lines = scoreResult.breakdown.map(b => `${b.name}: ${b.points} pts`);
    lines.push(`─── Total: ${scoreResult.total} pts ───`);
    return lines.join('\n');
  }

  window.MJ.Scoring = Object.freeze({
    calculateScore, getScoreBreakdown, SCORING_RULES
  });

  console.log('[Mahjong] Scoring module loaded');
})();
