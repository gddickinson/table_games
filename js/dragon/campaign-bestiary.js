/**
 * campaign-bestiary.js - Monster stat blocks, encounter tables, and instance creation
 * for D&D campaign expansion
 * Exports under root.MJ.Dragon.Campaign.Bestiary
 */
(function(exports) {
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Dragon = root.MJ.Dragon || {};
    root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

    // =========================================================================
    // Helper: build attack entry (mirrors wpn pattern from dragon-characters.js)
    // =========================================================================
    function atk(name, type, diceCount, diceSize, bonus, dmgType, extra) {
        var a = {
            name: name,
            type: type,
            damage: diceCount + 'd' + diceSize + '+' + bonus,
            damageType: dmgType,
            diceCount: diceCount,
            diceSize: diceSize,
            damageBonus: bonus,
            ranged: (type === 'ranged')
        };
        if (extra) {
            for (var k in extra) {
                if (extra.hasOwnProperty(k)) { a[k] = extra[k]; }
            }
        }
        return Object.freeze(a);
    }

    // =========================================================================
    // WILDERNESS MONSTERS
    // =========================================================================

    var wolf = Object.freeze({
        id: 'wolf',
        name: 'Wolf',
        size: 'Medium',
        type: 'beast',
        hp: 11,
        ac: 13,
        stats: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
        speed: { feet: 40, squares: 8 },
        attacks: {
            primary: atk('Bite', 'melee', 2, 4, 2, 'piercing', { reach: 1 })
        },
        abilities: {
            packTactics: {
                name: 'Pack Tactics',
                actionType: 'passive',
                grantsAdvantage: true,
                condition: 'ally_adjacent_to_target',
                description: 'Advantage on attack if an ally is within 5ft of the target.'
            }
        },
        cr: 0.25,
        xp: 50,
        isBoss: false
    });

    var dire_wolf = Object.freeze({
        id: 'dire_wolf',
        name: 'Dire Wolf',
        size: 'Large',
        type: 'beast',
        hp: 37,
        ac: 14,
        stats: { str: 17, dex: 15, con: 15, int: 3, wis: 12, cha: 7 },
        speed: { feet: 50, squares: 10 },
        attacks: {
            primary: atk('Bite', 'melee', 2, 6, 3, 'piercing', { reach: 1 })
        },
        abilities: {
            packTactics: {
                name: 'Pack Tactics',
                actionType: 'passive',
                grantsAdvantage: true,
                condition: 'ally_adjacent_to_target',
                description: 'Advantage on attack if an ally is within 5ft of the target.'
            },
            knockdown: {
                name: 'Knockdown',
                actionType: 'passive',
                trigger: 'on_bite_hit',
                saveType: 'str',
                saveDC: 13,
                effect: 'prone',
                description: 'Target must succeed DC 13 STR save or be knocked prone.'
            }
        },
        cr: 1,
        xp: 200,
        isBoss: false
    });

    var bandit = Object.freeze({
        id: 'bandit',
        name: 'Bandit',
        size: 'Medium',
        type: 'humanoid',
        hp: 11,
        ac: 12,
        stats: { str: 11, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
        speed: { feet: 30, squares: 6 },
        attacks: {
            primary: atk('Scimitar', 'melee', 1, 6, 1, 'slashing', { reach: 1 }),
            secondary: atk('Light Crossbow', 'ranged', 1, 8, 1, 'piercing', { range: 16 })
        },
        abilities: {},
        cr: 0.125,
        xp: 25,
        isBoss: false
    });

    var bandit_captain = Object.freeze({
        id: 'bandit_captain',
        name: 'Bandit Captain',
        size: 'Medium',
        type: 'humanoid',
        hp: 65,
        ac: 15,
        stats: { str: 15, dex: 16, con: 14, int: 14, wis: 11, cha: 14 },
        speed: { feet: 30, squares: 6 },
        attacks: {
            primary: atk('Scimitar', 'melee', 2, 6, 2, 'slashing', { reach: 1 })
        },
        multiattack: { description: 'Two scimitar attacks', sequence: ['primary', 'primary'] },
        abilities: {},
        cr: 2,
        xp: 450,
        isBoss: true
    });

    var ogre = Object.freeze({
        id: 'ogre',
        name: 'Ogre',
        size: 'Large',
        type: 'giant',
        hp: 59,
        ac: 11,
        stats: { str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7 },
        speed: { feet: 40, squares: 8 },
        attacks: {
            primary: atk('Greatclub', 'melee', 2, 8, 4, 'bludgeoning', { reach: 1 })
        },
        abilities: {},
        cr: 2,
        xp: 450,
        isBoss: false
    });

    // =========================================================================
    // UNDEAD — Castle Ravenmoor
    // =========================================================================

    var skeleton = Object.freeze({
        id: 'skeleton',
        name: 'Skeleton',
        size: 'Medium',
        type: 'undead',
        hp: 13,
        ac: 13,
        stats: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
        speed: { feet: 30, squares: 6 },
        attacks: {
            primary: atk('Shortsword', 'melee', 1, 6, 2, 'piercing', { reach: 1 }),
            secondary: atk('Shortbow', 'ranged', 1, 6, 2, 'piercing', { range: 16 })
        },
        abilities: {},
        vulnerabilities: ['bludgeoning'],
        immunities: ['poison'],
        conditionImmunities: ['exhaustion', 'poisoned'],
        cr: 0.25,
        xp: 50,
        isBoss: false
    });

    var zombie = Object.freeze({
        id: 'zombie',
        name: 'Zombie',
        size: 'Medium',
        type: 'undead',
        hp: 22,
        ac: 8,
        stats: { str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5 },
        speed: { feet: 20, squares: 4 },
        attacks: {
            primary: atk('Slam', 'melee', 1, 6, 1, 'bludgeoning', { reach: 1 })
        },
        abilities: {
            undeadFortitude: {
                name: 'Undead Fortitude',
                actionType: 'passive',
                trigger: 'reduced_to_zero_hp',
                saveType: 'con',
                saveDCFormula: '5 + damage_taken',
                effect: 'drop_to_1hp',
                excludeDamageTypes: ['radiant'],
                excludeCritical: true,
                description: 'If damage reduces zombie to 0 HP, CON save (DC 5+damage) to drop to 1 HP instead. Does not work against radiant or critical hits.'
            }
        },
        immunities: ['poison'],
        conditionImmunities: ['poisoned'],
        cr: 0.25,
        xp: 50,
        isBoss: false
    });

    var wight = Object.freeze({
        id: 'wight',
        name: 'Wight',
        size: 'Medium',
        type: 'undead',
        hp: 45,
        ac: 14,
        stats: { str: 15, dex: 14, con: 16, int: 10, wis: 13, cha: 15 },
        speed: { feet: 30, squares: 6 },
        attacks: {
            primary: atk('Longsword', 'melee', 1, 8, 2, 'slashing', { reach: 1 }),
            lifeDrain: atk('Life Drain', 'melee', 1, 6, 0, 'necrotic', {
                reach: 1,
                maxHpReduction: true,
                description: 'Target\'s max HP reduced by necrotic damage dealt.'
            })
        },
        abilities: {
            lifeDrain: {
                name: 'Life Drain',
                actionType: 'special',
                damageType: 'necrotic',
                damage: '1d6',
                diceCount: 1,
                diceSize: 6,
                maxHpReduction: true,
                description: 'Necrotic damage reduces target\'s max HP. Target dies if max HP reaches 0.'
            }
        },
        resistances: ['necrotic'],
        immunities: ['poison'],
        conditionImmunities: ['exhaustion', 'poisoned'],
        cr: 3,
        xp: 700,
        isBoss: false
    });

    var wraith = Object.freeze({
        id: 'wraith',
        name: 'Wraith',
        size: 'Medium',
        type: 'undead',
        hp: 67,
        ac: 13,
        stats: { str: 6, dex: 16, con: 16, int: 12, wis: 14, cha: 15 },
        speed: { feet: 60, squares: 12 },
        attacks: {
            primary: atk('Life Drain', 'melee', 4, 8, 3, 'necrotic', {
                reach: 1,
                maxHpReduction: true,
                description: 'Target\'s max HP reduced by necrotic damage dealt.'
            })
        },
        abilities: {
            incorporealMovement: {
                name: 'Incorporeal Movement',
                actionType: 'passive',
                movesThroughObjects: true,
                description: 'Can move through other creatures and objects as if difficult terrain. Takes 1d10 force damage if ending turn inside an object.'
            },
            resistanceNonmagical: {
                name: 'Resistance to Nonmagical Weapons',
                actionType: 'passive',
                description: 'Resistant to bludgeoning, piercing, and slashing from nonmagical attacks.'
            }
        },
        resistances: ['acid', 'cold', 'fire', 'lightning', 'thunder', 'bludgeoning_nonmagical', 'piercing_nonmagical', 'slashing_nonmagical'],
        immunities: ['necrotic', 'poison'],
        conditionImmunities: ['charmed', 'exhaustion', 'grappled', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained'],
        cr: 5,
        xp: 1800,
        isBoss: true
    });

    // =========================================================================
    // ARCANE — Wizard's Crypt
    // =========================================================================

    var animated_armor = Object.freeze({
        id: 'animated_armor',
        name: 'Animated Armor',
        size: 'Medium',
        type: 'construct',
        hp: 33,
        ac: 18,
        stats: { str: 14, dex: 11, con: 13, int: 1, wis: 3, cha: 1 },
        speed: { feet: 25, squares: 5 },
        attacks: {
            primary: atk('Slam', 'melee', 1, 6, 3, 'bludgeoning', { reach: 1 })
        },
        abilities: {
            antimagicSusceptibility: {
                name: 'Antimagic Susceptibility',
                actionType: 'passive',
                description: 'Incapacitated in an antimagic field. Targeted by dispel magic, must succeed CON save vs caster\'s DC or fall unconscious for 1 minute.'
            },
            falseAppearance: {
                name: 'False Appearance',
                actionType: 'passive',
                description: 'While motionless, indistinguishable from normal suit of armor.'
            }
        },
        immunities: ['psychic', 'poison'],
        conditionImmunities: ['blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'paralyzed', 'petrified', 'poisoned'],
        cr: 1,
        xp: 200,
        isBoss: false
    });

    var arcane_guardian = Object.freeze({
        id: 'arcane_guardian',
        name: 'Arcane Guardian',
        size: 'Medium',
        type: 'construct',
        hp: 60,
        ac: 20,
        stats: { str: 18, dex: 13, con: 16, int: 10, wis: 10, cha: 10 },
        speed: { feet: 30, squares: 6 },
        attacks: {
            primary: atk('Longsword', 'melee', 1, 8, 3, 'slashing', { reach: 1 })
        },
        multiattack: { description: 'Two longsword attacks', sequence: ['primary', 'primary'] },
        abilities: {
            spellResistance: {
                name: 'Spell Resistance',
                actionType: 'passive',
                advantageOnSpellSaves: true,
                description: 'Advantage on saving throws against spells and other magical effects.'
            },
            spellImmunity: {
                name: 'Spell Immunity',
                actionType: 'passive',
                immuneToSpells: ['fireball', 'heat_metal', 'lightning_bolt'],
                description: 'Immune to force, fire, and lightning damage from spells.'
            }
        },
        immunities: ['force', 'fire', 'lightning', 'poison'],
        conditionImmunities: ['blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'paralyzed', 'petrified', 'poisoned'],
        cr: 4,
        xp: 1100,
        isBoss: true
    });

    var flesh_golem = Object.freeze({
        id: 'flesh_golem',
        name: 'Flesh Golem',
        size: 'Medium',
        type: 'construct',
        hp: 93,
        ac: 9,
        stats: { str: 19, dex: 9, con: 18, int: 6, wis: 10, cha: 5 },
        speed: { feet: 30, squares: 6 },
        attacks: {
            primary: atk('Slam', 'melee', 2, 8, 4, 'bludgeoning', { reach: 1 })
        },
        multiattack: { description: 'Two slam attacks', sequence: ['primary', 'primary'] },
        abilities: {
            berserk: {
                name: 'Berserk',
                actionType: 'passive',
                trigger: 'hp_below_40',
                hpThreshold: 40,
                description: 'At start of turn, if HP < 40, roll d6. On 6, golem goes berserk and attacks nearest creature (friend or foe) each turn.'
            },
            immutableForm: {
                name: 'Immutable Form',
                actionType: 'passive',
                description: 'Immune to any spell or effect that would alter its form.'
            },
            lightningAbsorption: {
                name: 'Lightning Absorption',
                actionType: 'passive',
                absorbType: 'lightning',
                description: 'Whenever subjected to lightning damage, takes no damage and instead regains HP equal to the lightning damage dealt.'
            },
            magicResistance: {
                name: 'Magic Resistance',
                actionType: 'passive',
                advantageOnSpellSaves: true,
                description: 'Advantage on saving throws against spells and other magical effects.'
            },
            immuneNonmagical: {
                name: 'Nonmagical Weapon Immunity',
                actionType: 'passive',
                description: 'Immune to bludgeoning, piercing, and slashing from nonmagical attacks that aren\'t adamantine.'
            }
        },
        immunities: ['lightning', 'poison', 'bludgeoning_nonmagical', 'piercing_nonmagical', 'slashing_nonmagical'],
        conditionImmunities: ['charmed', 'exhaustion', 'frightened', 'paralyzed', 'petrified', 'poisoned'],
        cr: 5,
        xp: 1800,
        isBoss: true
    });

    // =========================================================================
    // ORCS — Iron Tusk Camp
    // =========================================================================

    var orc = Object.freeze({
        id: 'orc',
        name: 'Orc',
        size: 'Medium',
        type: 'humanoid',
        hp: 15,
        ac: 13,
        stats: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
        speed: { feet: 30, squares: 6 },
        attacks: {
            primary: atk('Greataxe', 'melee', 1, 12, 3, 'slashing', { reach: 1 })
        },
        abilities: {
            aggressive: {
                name: 'Aggressive',
                actionType: 'bonus',
                effect: 'dash_toward_enemy',
                description: 'As a bonus action, the orc can move up to its speed toward a hostile creature it can see.'
            }
        },
        cr: 0.5,
        xp: 100,
        isBoss: false
    });

    var orc_war_chief = Object.freeze({
        id: 'orc_war_chief',
        name: 'Orc War Chief',
        size: 'Medium',
        type: 'humanoid',
        hp: 93,
        ac: 16,
        stats: { str: 18, dex: 12, con: 18, int: 11, wis: 11, cha: 16 },
        speed: { feet: 30, squares: 6 },
        attacks: {
            primary: atk('Greataxe', 'melee', 1, 12, 4, 'slashing', { reach: 1 })
        },
        multiattack: { description: 'Two greataxe attacks', sequence: ['primary', 'primary'] },
        abilities: {
            aggressive: {
                name: 'Aggressive',
                actionType: 'bonus',
                effect: 'dash_toward_enemy',
                description: 'As a bonus action, the orc can move up to its speed toward a hostile creature it can see.'
            },
            battleCry: {
                name: 'Battle Cry',
                actionType: 'action',
                usesPerDay: 1,
                aoeRadius: 6,
                targetType: 'allies',
                effect: 'advantage_1_turn',
                duration: 1,
                description: 'Each ally within 30 feet that can hear the war chief gains advantage on attack rolls until the start of the war chief\'s next turn.'
            }
        },
        cr: 4,
        xp: 1100,
        isBoss: true
    });

    var orc_shaman = Object.freeze({
        id: 'orc_shaman',
        name: 'Orc Shaman',
        size: 'Medium',
        type: 'humanoid',
        hp: 45,
        ac: 12,
        stats: { str: 12, dex: 10, con: 14, int: 11, wis: 16, cha: 12 },
        speed: { feet: 30, squares: 6 },
        attacks: {
            primary: atk('Staff', 'melee', 1, 6, 1, 'bludgeoning', { reach: 1 })
        },
        abilities: {
            spiritualWeapon: {
                name: 'Spiritual Weapon',
                actionType: 'bonus',
                type: 'spell',
                slotLevel: 2,
                damage: '1d8+3',
                damageType: 'force',
                diceCount: 1,
                diceSize: 8,
                damageBonus: 3,
                range: 12,
                duration: 10,
                concentration: false,
                description: 'Creates a floating spectral weapon that attacks for 1d8+3 force damage.'
            },
            cureWounds: {
                name: 'Cure Wounds',
                actionType: 'action',
                type: 'spell',
                slotLevel: 1,
                healing: '1d8+3',
                diceCount: 1,
                diceSize: 8,
                healingBonus: 3,
                range: 1,
                targetType: 'ally',
                description: 'Heals an ally for 1d8+3 HP.'
            },
            holdPerson: {
                name: 'Hold Person',
                actionType: 'action',
                type: 'spell',
                slotLevel: 2,
                range: 12,
                saveType: 'wis',
                saveDC: 13,
                effect: 'paralyzed',
                duration: 10,
                concentration: true,
                description: 'Target must succeed DC 13 WIS save or be paralyzed. Repeat save at end of each turn.'
            }
        },
        spellSlots: { 1: 4, 2: 3 },
        spellSaveDC: 13,
        spellAttackBonus: 5,
        cr: 3,
        xp: 700,
        isBoss: false
    });

    // =========================================================================
    // SWAMP — Optional Encounters
    // =========================================================================

    var will_o_wisp = Object.freeze({
        id: 'will_o_wisp',
        name: "Will-o'-Wisp",
        size: 'Tiny',
        type: 'undead',
        hp: 22,
        ac: 19,
        stats: { str: 1, dex: 28, con: 10, int: 13, wis: 14, cha: 11 },
        speed: { feet: 50, squares: 10 },
        attacks: {
            primary: atk('Shock', 'melee', 4, 8, 0, 'lightning', { reach: 1 })
        },
        abilities: {
            incorporealMovement: {
                name: 'Incorporeal Movement',
                actionType: 'passive',
                movesThroughObjects: true,
                description: 'Can move through other creatures and objects as if difficult terrain.'
            },
            invisibility: {
                name: 'Invisibility',
                actionType: 'action',
                effect: 'invisible',
                toggleable: true,
                description: 'The wisp and its light become invisible. Can toggle visibility as an action.'
            },
            consumeLife: {
                name: 'Consume Life',
                actionType: 'bonus',
                range: 1,
                condition: 'target_at_zero_hp',
                healing: '3d6',
                diceCount: 3,
                diceSize: 6,
                description: 'As a bonus action, can target a creature at 0 HP within 5 feet. The target fails one death save, and the wisp regains 3d6 HP.'
            }
        },
        resistances: ['acid', 'cold', 'fire', 'necrotic', 'thunder', 'bludgeoning_nonmagical', 'piercing_nonmagical', 'slashing_nonmagical'],
        immunities: ['lightning', 'poison'],
        conditionImmunities: ['exhaustion', 'grappled', 'paralyzed', 'poisoned', 'prone', 'restrained', 'unconscious'],
        cr: 2,
        xp: 450,
        isBoss: false
    });

    var green_hag = Object.freeze({
        id: 'green_hag',
        name: 'Green Hag',
        size: 'Medium',
        type: 'fey',
        hp: 82,
        ac: 17,
        stats: { str: 18, dex: 12, con: 16, int: 13, wis: 14, cha: 14 },
        speed: { feet: 30, squares: 6 },
        attacks: {
            primary: atk('Claws', 'melee', 2, 8, 4, 'slashing', { reach: 1 })
        },
        abilities: {
            illusoryAppearance: {
                name: 'Illusory Appearance',
                actionType: 'action',
                effect: 'disguise',
                description: 'Covers herself and belongings with an illusion of another humanoid form. A DC 20 Investigation check reveals the illusion.'
            },
            invisiblePassage: {
                name: 'Invisible Passage',
                actionType: 'action',
                effect: 'invisible',
                endsOnAttack: true,
                description: 'Turns invisible until she attacks or casts a spell, or concentration ends.'
            },
            mimicry: {
                name: 'Mimicry',
                actionType: 'passive',
                description: 'Can mimic animal sounds and humanoid voices. A DC 14 Insight check reveals the mimicry.'
            }
        },
        cr: 5,
        xp: 1800,
        isBoss: true
    });

    // =========================================================================
    // Unified MONSTERS lookup
    // =========================================================================
    var MONSTERS = Object.freeze({
        wolf: wolf,
        dire_wolf: dire_wolf,
        bandit: bandit,
        bandit_captain: bandit_captain,
        ogre: ogre,
        skeleton: skeleton,
        zombie: zombie,
        wight: wight,
        wraith: wraith,
        animated_armor: animated_armor,
        arcane_guardian: arcane_guardian,
        flesh_golem: flesh_golem,
        orc: orc,
        orc_war_chief: orc_war_chief,
        orc_shaman: orc_shaman,
        will_o_wisp: will_o_wisp,
        green_hag: green_hag
    });

    // =========================================================================
    // ENCOUNTER TABLES — keyed by location id
    // =========================================================================
    var ENCOUNTERS = Object.freeze({
        forest_road: Object.freeze({
            name: 'Forest Road',
            enemies: [
                { monsterId: 'wolf', count: 3 },
                { monsterId: 'dire_wolf', count: 1 }
            ]
        }),
        forest_clearing: Object.freeze({
            name: 'Forest Clearing',
            enemies: [
                { monsterId: 'wolf', count: 4 }
            ]
        }),
        bandit_ambush: Object.freeze({
            name: 'Bandit Ambush',
            enemies: [
                { monsterId: 'bandit', count: 4 },
                { monsterId: 'bandit_captain', count: 1 }
            ]
        }),
        ogre_cave: Object.freeze({
            name: 'Ogre Cave',
            enemies: [
                { monsterId: 'ogre', count: 2 }
            ]
        }),
        castle_entrance: Object.freeze({
            name: 'Castle Ravenmoor - Entrance',
            enemies: [
                { monsterId: 'skeleton', count: 4 },
                { monsterId: 'zombie', count: 2 }
            ]
        }),
        castle_hall: Object.freeze({
            name: 'Castle Ravenmoor - Great Hall',
            enemies: [
                { monsterId: 'wight', count: 2 },
                { monsterId: 'skeleton', count: 3 }
            ]
        }),
        castle_crypt: Object.freeze({
            name: 'Castle Ravenmoor - Crypt',
            enemies: [
                { monsterId: 'wraith', count: 1 },
                { monsterId: 'wight', count: 1 },
                { monsterId: 'zombie', count: 3 }
            ]
        }),
        wizard_antechamber: Object.freeze({
            name: "Wizard's Crypt - Antechamber",
            enemies: [
                { monsterId: 'animated_armor', count: 3 }
            ]
        }),
        wizard_vault: Object.freeze({
            name: "Wizard's Crypt - Vault",
            enemies: [
                { monsterId: 'arcane_guardian', count: 1 },
                { monsterId: 'animated_armor', count: 2 }
            ]
        }),
        wizard_sanctum: Object.freeze({
            name: "Wizard's Crypt - Inner Sanctum",
            enemies: [
                { monsterId: 'flesh_golem', count: 1 }
            ]
        }),
        iron_tusk_perimeter: Object.freeze({
            name: 'Iron Tusk Camp - Perimeter',
            enemies: [
                { monsterId: 'orc', count: 4 }
            ]
        }),
        iron_tusk_camp: Object.freeze({
            name: 'Iron Tusk Camp - Main Camp',
            enemies: [
                { monsterId: 'orc', count: 3 },
                { monsterId: 'orc_shaman', count: 1 },
                { monsterId: 'orc_war_chief', count: 1 }
            ]
        }),
        swamp_path: Object.freeze({
            name: 'Mirefen Swamp - Path',
            enemies: [
                { monsterId: 'will_o_wisp', count: 2 }
            ]
        }),
        swamp_hag_lair: Object.freeze({
            name: 'Mirefen Swamp - Hag Lair',
            enemies: [
                { monsterId: 'green_hag', count: 1 },
                { monsterId: 'will_o_wisp', count: 2 }
            ]
        })
    });

    // =========================================================================
    // Instance counter for unique ids
    // =========================================================================
    var instanceCounter = 0;

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * getMonster - returns the frozen stat block for a given monster ID
     * @param {string} id
     * @returns {object|null}
     */
    function getMonster(id) {
        if (!id) { return null; }
        return MONSTERS[id] || null;
    }

    /**
     * createMonsterInstance - creates a mutable combat instance from a monster template
     * Mirrors createDragonInstance / createCharacterInstance pattern
     * @param {string} id - monster template ID
     * @returns {object} mutable combat instance
     */
    function createMonsterInstance(id) {
        var t = MONSTERS[id];
        if (!t) { throw new Error('Unknown monster id: ' + id); }

        instanceCounter++;
        var instanceId = t.id + '_' + instanceCounter;

        // Compute attack bonus from best of STR/DEX + assumed proficiency from CR
        var profBonus = 2;
        if (t.cr >= 5) { profBonus = 3; }
        else if (t.cr >= 3) { profBonus = 2; }

        var strMod = Math.floor(((t.stats && t.stats.str) || 10) - 10) / 2;
        var dexMod = Math.floor(((t.stats && t.stats.dex) || 10) - 10) / 2;
        var bestMod = Math.max(Math.floor(strMod), Math.floor(dexMod));
        var atkBonus = profBonus + bestMod;

        // Copy spell slots if present
        var slots = null;
        if (t.spellSlots) {
            slots = {};
            var lvls = Object.keys(t.spellSlots);
            for (var i = 0; i < lvls.length; i++) {
                slots[lvls[i]] = t.spellSlots[lvls[i]];
            }
        }

        // Deep-copy attacks so they are mutable
        var attacks = {};
        if (t.attacks) {
            for (var ak in t.attacks) {
                if (t.attacks.hasOwnProperty(ak)) {
                    var src = t.attacks[ak];
                    var copy = {};
                    for (var pk in src) {
                        if (src.hasOwnProperty(pk)) { copy[pk] = src[pk]; }
                    }
                    attacks[ak] = copy;
                }
            }
        }

        return {
            id: instanceId,
            templateId: t.id,
            name: t.name,
            size: t.size || 'Medium',
            type: t.type || 'beast',
            hp: t.hp,
            maxHp: t.hp,
            currentHp: t.hp,
            ac: t.ac,
            stats: {
                str: t.stats.str,
                dex: t.stats.dex,
                con: t.stats.con,
                int: t.stats.int,
                wis: t.stats.wis,
                cha: t.stats.cha
            },
            speed: t.speed ? (t.speed.feet || 30) : 30,
            attacks: attacks,
            multiattack: t.multiattack || null,
            attackBonus: atkBonus,
            abilities: t.abilities || {},
            spellSlots: slots,
            spellSaveDC: t.spellSaveDC || 0,
            spellAttackBonus: t.spellAttackBonus || 0,
            vulnerabilities: t.vulnerabilities || [],
            resistances: t.resistances || [],
            immunities: t.immunities || [],
            conditionImmunities: t.conditionImmunities || [],
            cr: t.cr,
            xp: t.xp,
            isBoss: t.isBoss || false,
            isDragon: false,
            position: { x: 0, y: 0 },
            conditions: [],
            statusEffects: {},
            initiativeRoll: 0,
            isDead: false,
            turnsTaken: 0,
            usedReaction: false,
            usedBonusAction: false,
            // Boss-specific tracking
            battleCryUsed: false,
            spiritualWeaponActive: false,
            isConcentrating: null,
            berserk: false
        };
    }

    /**
     * getEncounterEnemies - creates an array of monster instances for a location
     * @param {string} locationId - key into ENCOUNTERS
     * @returns {object[]} array of mutable monster instances
     */
    function getEncounterEnemies(locationId) {
        var encounter = ENCOUNTERS[locationId];
        if (!encounter) { return []; }

        var enemies = [];
        var groups = encounter.enemies;
        for (var g = 0; g < groups.length; g++) {
            var group = groups[g];
            for (var i = 0; i < group.count; i++) {
                var instance = createMonsterInstance(group.monsterId);
                // Append index for duplicate names
                if (group.count > 1) {
                    instance.name = instance.name + ' ' + (i + 1);
                }
                enemies.push(instance);
            }
        }

        return enemies;
    }

    // =========================================================================
    // Export
    // =========================================================================
    root.MJ.Dragon.Campaign.Bestiary = {
        MONSTERS: MONSTERS,
        ENCOUNTERS: ENCOUNTERS,
        getMonster: getMonster,
        createMonsterInstance: createMonsterInstance,
        getEncounterEnemies: getEncounterEnemies
    };

})(typeof window !== 'undefined' ? window : global);
