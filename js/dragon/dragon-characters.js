/**
 * dragon-characters.js - Party members and dragon definitions for D&D-style battle
 * Exports under root.MJ.Dragon.Characters
 */
(function(exports) {
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Dragon = root.MJ.Dragon || {};

    var CHARACTER_IDS = ['kenji', 'mei', 'yuki', 'riku', 'tomoe', 'sora'];

    function wpn(name, type, dc, ds, bonus, dmgType, extra) {
        var w = { name: name, type: type, damage: dc + 'd' + ds + '+' + bonus,
            damageType: dmgType, diceCount: dc, diceSize: ds, damageBonus: bonus,
            ranged: (type === 'ranged') };
        if (extra) { for (var k in extra) { w[k] = extra[k]; } }
        return w;
    }

    var CHARACTERS = Object.freeze({
        kenji: Object.freeze({
            id: 'kenji', name: 'Kenji', race: 'Human', class: 'Barbarian', level: 5,
            avatar: '\uD83D\uDC68', color: '#e74c3c',
            stats: { str: 18, dex: 14, con: 16, int: 8, wis: 10, cha: 12 },
            hp: 55, ac: 14, armorDesc: 'Unarmored Defense',
            speed: { feet: 40, squares: 8 }, proficiencyBonus: 3,
            savingThrows: ['str', 'con'],
            personality: { traits: ['aggressive', 'charges in', 'trash-talks dragon'], combatStyle: 'aggressive' },
            weapons: [
                wpn('Greataxe', 'melee', 1, 12, 4, 'slashing', { reach: 1 }),
                wpn('Handaxe', 'ranged', 1, 6, 4, 'slashing', { range: 4 })
            ],
            abilities: {
                rage: { name: 'Rage', actionType: 'bonus', usesPerDay: 3, damageBonus: 2,
                    resistances: ['bludgeoning', 'piercing', 'slashing'], duration: 10,
                    description: '+2 melee damage, resistance to bludgeoning/piercing/slashing' },
                recklessAttack: { name: 'Reckless Attack', actionType: 'special',
                    grantsAdvantage: true, givesEnemyAdvantage: true,
                    description: 'Advantage on melee STR attacks, enemies get advantage on you' },
                extraAttack: { name: 'Extra Attack', actionType: 'passive', attackCount: 2,
                    description: 'Two attacks per Attack action' },
                dangerSense: { name: 'Danger Sense', actionType: 'passive', advantageOn: 'dex_saves',
                    description: 'Advantage on DEX saves against visible effects' }
            }
        }),
        mei: Object.freeze({
            id: 'mei', name: 'Mei', race: 'Half-Elf', class: 'Cleric', subclass: 'Life Domain', level: 5,
            avatar: '\uD83D\uDC69', color: '#3498db',
            stats: { str: 10, dex: 12, con: 14, int: 14, wis: 18, cha: 13 },
            hp: 38, ac: 18, armorDesc: 'Chain mail + shield',
            speed: { feet: 30, squares: 6 }, proficiencyBonus: 3,
            savingThrows: ['wis', 'cha'],
            personality: { traits: ['cautious healer', 'prioritizes keeping party alive'], combatStyle: 'supportive' },
            weapons: [],
            spellSlots: { 1: 4, 2: 3, 3: 2 }, spellcastingMod: 4, spellSaveDC: 15, spellAttackBonus: 7,
            abilities: {
                cureWounds: { name: 'Cure Wounds', actionType: 'action', type: 'spell', slotLevel: 1,
                    range: 1, healing: '1d8+4', diceCount: 1, diceSize: 8, healingBonus: 4, scalable: true,
                    description: 'Restore 1d8+4 HP per slot level used' },
                spiritualWeapon: { name: 'Spiritual Weapon', actionType: 'bonus', type: 'spell', slotLevel: 2,
                    range: 12, damage: '1d8+4', damageType: 'force', diceCount: 1, diceSize: 8,
                    damageBonus: 4, duration: 10, concentration: false,
                    description: 'Bonus action attack dealing 1d8+4 force damage' },
                spiritGuardians: { name: 'Spirit Guardians', actionType: 'action', type: 'spell', slotLevel: 3,
                    range: 0, aoeRadius: 3, damage: '3d8', damageType: 'radiant', diceCount: 3, diceSize: 8,
                    saveType: 'wis', duration: 10, concentration: true,
                    description: '3d8 radiant to enemies in 15ft radius' },
                sacredFlame: { name: 'Sacred Flame', actionType: 'action', type: 'cantrip', range: 12,
                    damage: '2d8', damageType: 'radiant', diceCount: 2, diceSize: 8, saveType: 'dex',
                    description: 'DEX save or 2d8 radiant' },
                guidingBolt: { name: 'Guiding Bolt', actionType: 'action', type: 'spell', slotLevel: 1,
                    range: 24, damage: '4d6', damageType: 'radiant', diceCount: 4, diceSize: 6,
                    attackRoll: true, grantsNextAttackAdvantage: true,
                    description: '4d6 radiant, next attack on target has advantage' }
            }
        }),
        yuki: Object.freeze({
            id: 'yuki', name: 'Yuki', race: 'High Elf', class: 'Wizard', level: 5,
            avatar: '\uD83D\uDC75', color: '#9b59b6',
            stats: { str: 8, dex: 14, con: 12, int: 18, wis: 14, cha: 10 },
            hp: 28, ac: 15, armorDesc: 'Mage Armor',
            speed: { feet: 30, squares: 6 }, proficiencyBonus: 3,
            savingThrows: ['int', 'wis'],
            personality: { traits: ['wise', 'calculates best spell', 'patient'], combatStyle: 'strategic' },
            weapons: [],
            spellSlots: { 1: 4, 2: 3, 3: 2 }, spellcastingMod: 4, spellSaveDC: 15, spellAttackBonus: 7,
            abilities: {
                fireball: { name: 'Fireball', actionType: 'action', type: 'spell', slotLevel: 3,
                    range: 30, aoeRadius: 4, damage: '8d6', damageType: 'fire', diceCount: 8, diceSize: 6,
                    saveType: 'dex', halfOnSave: true,
                    description: '8d6 fire in 20ft radius, DEX save for half' },
                shield: { name: 'Shield', actionType: 'reaction', type: 'spell', slotLevel: 1,
                    acBonus: 5, duration: 1, trigger: 'hit by attack',
                    description: '+5 AC until start of next turn' },
                counterspell: { name: 'Counterspell', actionType: 'reaction', type: 'spell', slotLevel: 3,
                    range: 12, trigger: 'enemy casts spell', autoNegateLevel: 3,
                    description: 'Negate spell of 3rd level or lower' },
                mistyStep: { name: 'Misty Step', actionType: 'bonus', type: 'spell', slotLevel: 2,
                    teleportRange: 6, description: 'Teleport up to 6 squares' },
                magicMissile: { name: 'Magic Missile', actionType: 'action', type: 'spell', slotLevel: 1,
                    range: 24, damage: '1d4+1', damageType: 'force', diceCount: 1, diceSize: 4,
                    damageBonus: 1, dartCount: 3, autoHit: true,
                    description: '3 darts, 1d4+1 force each, auto-hit' },
                scorchingRay: { name: 'Scorching Ray', actionType: 'action', type: 'spell', slotLevel: 2,
                    range: 24, damage: '2d6', damageType: 'fire', diceCount: 2, diceSize: 6,
                    rayCount: 3, attackRoll: true,
                    description: '3 rays, 2d6 fire each, ranged spell attack' }
            }
        }),
        riku: Object.freeze({
            id: 'riku', name: 'Riku', race: 'Halfling', class: 'Rogue', level: 5, age: 22,
            avatar: '\uD83E\uDDD1', color: '#2ecc71',
            stats: { str: 10, dex: 18, con: 12, int: 14, wis: 12, cha: 14 },
            hp: 33, ac: 15, armorDesc: 'Studded leather',
            speed: { feet: 25, squares: 5 }, proficiencyBonus: 3,
            savingThrows: ['dex', 'int'],
            personality: { traits: ['sarcastic', 'streetwise', 'finds openings'], combatStyle: 'opportunistic' },
            weapons: [
                wpn('Shortsword', 'melee', 1, 6, 4, 'piercing', { finesse: true, reach: 1 }),
                wpn('Shortbow', 'ranged', 1, 6, 4, 'piercing', { range: 16 })
            ],
            abilities: {
                sneakAttack: { name: 'Sneak Attack', actionType: 'passive', extraDamage: '3d6',
                    diceCount: 3, diceSize: 6, condition: 'advantage_or_ally_adjacent', oncePerTurn: true,
                    description: '+3d6 if advantage or ally adjacent to target' },
                cunningAction: { name: 'Cunning Action', actionType: 'bonus',
                    options: ['dash', 'disengage', 'hide'],
                    description: 'Dash, Disengage, or Hide as bonus action' },
                uncannyDodge: { name: 'Uncanny Dodge', actionType: 'reaction',
                    trigger: 'hit by attack', effect: 'halve_damage',
                    description: 'Halve one attack\'s damage' },
                evasion: { name: 'Evasion', actionType: 'passive', modifiesSave: 'dex',
                    successEffect: 'no_damage', failEffect: 'half_damage',
                    description: 'DEX saves: success=0, fail=half' }
            }
        }),
        tomoe: Object.freeze({
            id: 'tomoe', name: 'Tomoe', race: 'Dragonborn', class: 'Paladin', level: 5, age: 30,
            avatar: '\uD83D\uDEE1\uFE0F', color: '#f39c12',
            stats: { str: 16, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
            hp: 44, ac: 18, armorDesc: 'Chain mail + shield',
            speed: { feet: 30, squares: 6 }, proficiencyBonus: 3,
            savingThrows: ['wis', 'cha'],
            personality: { traits: ['honorable', 'protective', 'sworn oath against dragon', 'stoic'], combatStyle: 'defensive' },
            weapons: [ wpn('Longsword', 'melee', 1, 8, 3, 'slashing', { reach: 1 }) ],
            spellSlots: { 1: 4, 2: 2 }, spellcastingMod: 3, spellSaveDC: 14, spellAttackBonus: 6,
            abilities: {
                divineSmite: { name: 'Divine Smite', actionType: 'special', type: 'spell',
                    extraDamage: '2d8', damageType: 'radiant', diceCount: 2, diceSize: 8,
                    scalable: true, trigger: 'on_hit', minSlotLevel: 1,
                    description: '+2d8 radiant on hit, +1d8 per slot above 1st' },
                layOnHands: { name: 'Lay on Hands', actionType: 'action', healingPool: 25,
                    description: 'Distribute healing from pool of 25 HP' },
                auraOfProtection: { name: 'Aura of Protection', actionType: 'passive',
                    aoeRadius: 2, saveBonus: 3, affectsAllies: true,
                    description: '+3 to all saves for allies within 2 squares' },
                shieldOfFaith: { name: 'Shield of Faith', actionType: 'bonus', type: 'spell', slotLevel: 1,
                    range: 12, acBonus: 2, duration: 10, concentration: true, targetType: 'ally',
                    description: '+2 AC to ally, concentration' },
                compelledDuel: { name: 'Compelled Duel', actionType: 'bonus', type: 'spell', slotLevel: 1,
                    range: 6, saveType: 'wis', duration: 10, concentration: true, effect: 'compelled',
                    description: 'Target must WIS save or attack you' }
            }
        }),
        sora: Object.freeze({
            id: 'sora', name: 'Sora', race: 'Wood Elf', class: 'Ranger', level: 5, age: 145,
            avatar: '\uD83C\uDFF9', color: '#1abc9c',
            stats: { str: 12, dex: 18, con: 12, int: 12, wis: 16, cha: 10 },
            hp: 38, ac: 15, armorDesc: 'Studded leather',
            speed: { feet: 35, squares: 7 }, proficiencyBonus: 3,
            savingThrows: ['str', 'dex'],
            personality: { traits: ['quiet observer', 'practical', 'dry humor', 'guided party to cave'], combatStyle: 'ranged' },
            weapons: [
                wpn('Longbow', 'ranged', 1, 8, 4, 'piercing', { range: 30 }),
                wpn('Shortsword (main)', 'melee', 1, 6, 4, 'piercing', { finesse: true, reach: 1 }),
                wpn('Shortsword (off-hand)', 'melee', 1, 6, 4, 'piercing', { finesse: true, offhand: true, reach: 1 })
            ],
            spellSlots: { 1: 4, 2: 2 }, spellcastingMod: 3, spellSaveDC: 14, spellAttackBonus: 6,
            abilities: {
                huntersMark: { name: "Hunter's Mark", actionType: 'bonus', type: 'spell', slotLevel: 1,
                    range: 18, extraDamage: '1d6', diceCount: 1, diceSize: 6,
                    duration: 10, concentration: true, targetType: 'enemy',
                    description: '+1d6 per hit on marked target, concentration' },
                multiattack: { name: 'Multiattack', actionType: 'passive', attackCount: 2,
                    description: 'Two attacks per Attack action' },
                colossusSlayer: { name: 'Colossus Slayer', actionType: 'passive', extraDamage: '1d8',
                    diceCount: 1, diceSize: 8, condition: 'target_injured', oncePerTurn: true,
                    description: '+1d8 to injured target, once per turn' },
                absorbElements: { name: 'Absorb Elements', actionType: 'reaction', type: 'spell', slotLevel: 1,
                    trigger: 'elemental_damage', extraDamage: '1d6', diceCount: 1, diceSize: 6,
                    grantsResistance: true,
                    description: 'Resist element, +1d6 of that type on next melee' }
            }
        })
    });

    // --- Dragon ---
    var DRAGON = Object.freeze({
        id: 'dragon', name: 'Adult Red Dragon', type: 'dragon', size: 'Huge', gridSize: 3,
        avatar: '\uD83D\uDC32', color: '#c0392b',
        stats: { str: 27, dex: 10, con: 25, int: 16, wis: 13, cha: 21 },
        hp: 256, ac: 19, armorDesc: 'Natural armor',
        speed: { ground: { feet: 40, squares: 8 }, fly: { feet: 80, squares: 16 } },
        savingThrows: ['dex', 'con', 'wis', 'cha'],
        damageImmunities: ['fire'],
        senses: { blindsight: 12, darkvision: 24 },
        legendaryResistances: 3, legendaryActionsPerRound: 3,
        attacks: {
            bite: { name: 'Bite', type: 'melee', toHit: 14, reach: 2,
                damage: '2d10+8', damageType: 'piercing', diceCount: 2, diceSize: 10, damageBonus: 8,
                extraDamage: '2d6', extraDamageType: 'fire', extraDiceCount: 2, extraDiceSize: 6 },
            claw: { name: 'Claw', type: 'melee', toHit: 14, reach: 1,
                damage: '2d6+8', damageType: 'slashing', diceCount: 2, diceSize: 6, damageBonus: 8 }
        },
        multiattack: { description: 'Bite once and Claw twice', sequence: ['bite', 'claw', 'claw'] },
        abilities: {
            fireBreath: { name: 'Fire Breath', actionType: 'action', shape: 'cone', range: 12,
                damage: '18d6', damageType: 'fire', diceCount: 18, diceSize: 6,
                saveType: 'dex', saveDC: 21, halfOnSave: true, recharge: { min: 5, max: 6 },
                description: '60ft cone, 18d6 fire, DC 21 DEX save for half' },
            frightfulPresence: { name: 'Frightful Presence', actionType: 'action', range: 24,
                saveType: 'wis', saveDC: 19, effect: 'frightened', duration: 10,
                description: 'All within 120ft, DC 19 WIS save or frightened 1 min' }
        },
        legendaryActions: {
            tailAttack: { name: 'Tail Attack', cost: 1, type: 'melee', toHit: 14, reach: 3,
                damage: '2d8+8', damageType: 'bludgeoning', diceCount: 2, diceSize: 8, damageBonus: 8 },
            wingAttack: { name: 'Wing Attack', cost: 2, aoeRadius: 2,
                damage: '2d6+8', damageType: 'bludgeoning', diceCount: 2, diceSize: 6, damageBonus: 8,
                saveType: 'dex', saveDC: 22, effect: 'prone', halfOnSave: false, dragonMoves: true,
                description: 'All within 10ft, 2d6+8 bludgeoning, DC 22 DEX or prone, dragon moves' }
        }
    });

    // --- Instance creation ---
    function createCharacterInstance(id) {
        var t = CHARACTERS[id];
        if (!t) { throw new Error('Unknown character id: ' + id); }
        var slots = null;
        if (t.spellSlots) {
            slots = {};
            var lvls = Object.keys(t.spellSlots);
            for (var i = 0; i < lvls.length; i++) { slots[lvls[i]] = t.spellSlots[lvls[i]]; }
        }
        return {
            id: t.id, templateId: t.id, name: t.name,
            class: t.class, className: t.class, color: t.color, avatar: t.avatar,
            race: t.race, level: t.level, stats: t.stats,
            maxHp: t.hp, currentHp: t.hp, hp: t.hp, ac: t.ac, tempAc: 0,
            speed: t.speed ? (t.speed.feet || 30) : 30,
            proficiencyBonus: t.proficiencyBonus || 3,
            savingThrows: t.savingThrows || [],
            weapons: t.weapons || [],
            abilities: t.abilities || {},
            spellSaveDC: t.spellSaveDC || 0,
            spellAttackBonus: t.spellAttackBonus || 0,
            // Attack bonus = proficiency + best of STR/DEX modifier
            attackBonus: (t.proficiencyBonus || 3) + Math.max(
                Math.floor((((t.stats && t.stats.str) || 10) - 10) / 2),
                Math.floor((((t.stats && t.stats.dex) || 10) - 10) / 2)),
            position: { x: 0, y: 0 }, conditions: [],
            isConcentrating: null, isRaging: false,
            rageUsesLeft: t.abilities.rage ? t.abilities.rage.usesPerDay : 0,
            recklessThisTurn: false, sneakAttackUsedThisTurn: false,
            colossusSlayerUsedThisTurn: false,
            spellSlotsRemaining: slots,
            layOnHandsPool: t.abilities.layOnHands ? t.abilities.layOnHands.healingPool : 0,
            huntersMarkTarget: null,
            spiritualWeaponActive: false, spiritGuardiansActive: false, shieldActive: false,
            usedReaction: false, usedBonusAction: false,
            isDead: false, deathSaves: { successes: 0, failures: 0 },
            initiativeRoll: 0, statusEffects: {}, turnsTaken: 0
        };
    }

    function createDragonInstance() {
        return {
            id: 'dragon', templateId: 'dragon', name: DRAGON.name,
            maxHp: DRAGON.hp, currentHp: DRAGON.hp, hp: DRAGON.hp, ac: DRAGON.ac,
            // Ability scores for saving throws
            stats: DRAGON.stats,
            savingThrows: DRAGON.savingThrows,
            proficiencyBonus: 6,
            // Breath weapon and ability DCs
            breathDC: DRAGON.abilities.fireBreath.saveDC,
            breathDamage: DRAGON.abilities.fireBreath.damage,
            frightfulDC: DRAGON.abilities.frightfulPresence.saveDC,
            wingDC: DRAGON.legendaryActions.wingAttack.saveDC,
            maxLegendaryActions: DRAGON.legendaryActionsPerRound,
            maxLegendaryResistances: DRAGON.legendaryResistances,
            position: { x: 0, y: 0 }, conditions: [],
            fireBreathAvailable: true, fireBreathRecharging: false,
            legendaryResistancesLeft: DRAGON.legendaryResistances,
            legendaryActionsLeft: DRAGON.legendaryActionsPerRound,
            frightfulPresenceUsed: false, usedReaction: false,
            isDead: false, initiativeRoll: 0, statusEffects: {}, turnsTaken: 0,
            currentSpeed: 'ground',
            // Copy attack definitions so engine can resolve dragon attacks
            attacks: {
                bite: { name: 'Bite', type: 'piercing', damage: '2d10+8', bonus: 13,
                    attackBonus: 13, toHit: 14, reach: 2, ranged: false,
                    diceCount: 2, diceSize: 10, damageBonus: 8,
                    extraDamage: '2d6', extraDamageType: 'fire' },
                claw: { name: 'Claw', type: 'slashing', damage: '2d6+8', bonus: 13,
                    attackBonus: 13, toHit: 14, reach: 1, ranged: false,
                    diceCount: 2, diceSize: 6, damageBonus: 8 },
                tail: { name: 'Tail', type: 'bludgeoning', damage: '2d8+8', bonus: 13,
                    attackBonus: 13, toHit: 14, reach: 3, ranged: false,
                    diceCount: 2, diceSize: 8, damageBonus: 8 }
            },
            // Dragon's attack bonus for resolveAttack
            attackBonus: 14
        };
    }

    function getAbility(characterId, abilityName) {
        if (characterId === 'dragon') {
            return DRAGON.abilities[abilityName] || DRAGON.legendaryActions[abilityName] ||
                DRAGON.attacks[abilityName] || null;
        }
        var t = CHARACTERS[characterId];
        return t ? (t.abilities[abilityName] || null) : null;
    }

    // Spell lookup across all characters
    function getSpell(spellId) {
        if (!spellId) return null;
        var normalized = spellId.replace(/[_\s]/g, '').toLowerCase();
        for (var cid in CHARACTERS) {
            if (!CHARACTERS.hasOwnProperty(cid)) continue;
            var abs = CHARACTERS[cid].abilities;
            for (var aid in abs) {
                if (!abs.hasOwnProperty(aid)) continue;
                var a = abs[aid];
                if (a.type === 'spell' && aid.toLowerCase() === normalized) return a;
                if (a.type === 'spell' && a.name && a.name.replace(/\s/g, '').toLowerCase() === normalized) return a;
            }
        }
        // Also check cantrips/spells by id directly
        var SPELL_DB = {
            sacredflame: { name: 'Sacred Flame', type: 'spell', damage: '2d8', damageType: 'radiant', save: 'dex', slotLevel: 0, actionType: 'action', range: 12 },
            firebolt: { name: 'Fire Bolt', type: 'spell', damage: '2d10', damageType: 'fire', slotLevel: 0, actionType: 'action', range: 24, attackRoll: true }
        };
        return SPELL_DB[normalized] || null;
    }

    root.MJ.Dragon.Characters = {
        CHARACTERS: CHARACTERS,
        DRAGON: DRAGON,
        CHARACTER_IDS: CHARACTER_IDS,
        createCharacterInstance: createCharacterInstance,
        createDragonInstance: createDragonInstance,
        getAbility: getAbility,
        getSpell: getSpell
    };

})(typeof window !== 'undefined' ? window : global);
