/**
 * campaign-loot.js - Equipment, item database, shop inventories, and loot tables
 * for D&D campaign expansion
 * Exports under root.MJ.Dragon.Campaign.Loot
 */
(function(exports) {
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Dragon = root.MJ.Dragon || {};
    root.MJ.Dragon.Campaign = root.MJ.Dragon.Campaign || {};

    // =========================================================================
    // Item categories
    // =========================================================================
    var CATEGORY_WEAPON  = 'weapon';
    var CATEGORY_ARMOR   = 'armor';
    var CATEGORY_POTION  = 'potion';
    var CATEGORY_SCROLL  = 'scroll';
    var CATEGORY_MISC    = 'misc';

    // =========================================================================
    // Helper: build weapon entry
    // =========================================================================
    function wpn(id, name, diceCount, diceSize, bonus, dmgType, price, extra) {
        var item = {
            id: id,
            name: name,
            category: CATEGORY_WEAPON,
            damage: diceCount + 'd' + diceSize + '+' + bonus,
            diceCount: diceCount,
            diceSize: diceSize,
            damageBonus: bonus,
            damageType: dmgType,
            type: 'melee',
            price: price,
            consumable: false
        };
        if (extra) {
            for (var k in extra) {
                if (extra.hasOwnProperty(k)) { item[k] = extra[k]; }
            }
        }
        return Object.freeze(item);
    }

    // =========================================================================
    // Helper: build armor entry
    // =========================================================================
    function armor(id, name, acValue, price, extra) {
        var item = {
            id: id,
            name: name,
            category: CATEGORY_ARMOR,
            ac: acValue,
            price: price,
            consumable: false
        };
        if (extra) {
            for (var k in extra) {
                if (extra.hasOwnProperty(k)) { item[k] = extra[k]; }
            }
        }
        return Object.freeze(item);
    }

    // =========================================================================
    // Helper: build potion entry
    // =========================================================================
    function potion(id, name, effect, price, extra) {
        var item = {
            id: id,
            name: name,
            category: CATEGORY_POTION,
            effect: effect,
            price: price,
            consumable: true
        };
        if (extra) {
            for (var k in extra) {
                if (extra.hasOwnProperty(k)) { item[k] = extra[k]; }
            }
        }
        return Object.freeze(item);
    }

    // =========================================================================
    // Helper: build scroll entry
    // =========================================================================
    function scroll(id, name, spellEffect, price, extra) {
        var item = {
            id: id,
            name: name,
            category: CATEGORY_SCROLL,
            spellEffect: spellEffect,
            price: price,
            consumable: true
        };
        if (extra) {
            for (var k in extra) {
                if (extra.hasOwnProperty(k)) { item[k] = extra[k]; }
            }
        }
        return Object.freeze(item);
    }

    // =========================================================================
    // WEAPONS
    // =========================================================================
    var WEAPONS = {
        greataxe_plus1: wpn('greataxe_plus1', 'Greataxe +1', 1, 12, 5, 'slashing', 200, {
            bonus: 1,
            description: 'A finely forged greataxe with a magical edge.'
        }),
        longsword_plus1: wpn('longsword_plus1', 'Longsword +1', 1, 8, 4, 'slashing', 150, {
            bonus: 1,
            description: 'A well-balanced longsword imbued with minor enchantment.'
        }),
        shortbow_plus1: wpn('shortbow_plus1', 'Shortbow +1', 1, 6, 5, 'piercing', 150, {
            bonus: 1,
            type: 'ranged',
            range: 16,
            description: 'A compact bow with magically reinforced limbs.'
        }),
        flame_tongue_longsword: wpn('flame_tongue_longsword', 'Flame Tongue Longsword', 1, 8, 3, 'slashing', 500, {
            bonus: 0,
            extraDamage: '2d6',
            extraDamageType: 'fire',
            extraDiceCount: 2,
            extraDiceSize: 6,
            magical: true,
            description: 'On command, this blade ignites with fire, dealing extra fire damage.'
        }),
        oathbow: wpn('oathbow', 'Oathbow', 1, 8, 4, 'piercing', 600, {
            bonus: 0,
            type: 'ranged',
            range: 30,
            swornEnemy: true,
            swornExtraDamage: '3d6',
            swornExtraDiceCount: 3,
            swornExtraDiceSize: 6,
            magical: true,
            description: 'Speak your oath against a foe; deal 3d6 extra to your sworn enemy.'
        }),
        dagger_of_venom: wpn('dagger_of_venom', 'Dagger of Venom', 1, 4, 4, 'piercing', 300, {
            bonus: 1,
            finesse: true,
            poisonDC: 15,
            poisonDamage: '2d10',
            poisonDiceCount: 2,
            poisonDiceSize: 10,
            poisonSave: 'con',
            magical: true,
            description: 'Once per day, coat blade in venom. DC 15 CON save or take 2d10 poison.'
        }),
        staff_of_power: wpn('staff_of_power', 'Staff of Power', 1, 6, 3, 'bludgeoning', 800, {
            bonus: 2,
            spellDCBonus: 2,
            spellAttackBonus: 2,
            magical: true,
            description: 'A potent arcane focus. +2 to spell save DC and spell attack rolls.'
        }),
        // Basic shop weapons (non-magical)
        shortsword: wpn('shortsword', 'Shortsword', 1, 6, 2, 'piercing', 10, {
            finesse: true,
            description: 'A light, quick blade.'
        }),
        handaxe: wpn('handaxe', 'Handaxe', 1, 6, 2, 'slashing', 5, {
            type: 'ranged',
            range: 4,
            description: 'Suitable for throwing or melee.'
        }),
        longbow: wpn('longbow', 'Longbow', 1, 8, 2, 'piercing', 50, {
            type: 'ranged',
            range: 30,
            description: 'A tall bow with impressive range.'
        }),
        greataxe: wpn('greataxe', 'Greataxe', 1, 12, 3, 'slashing', 30, {
            description: 'A heavy two-handed axe.'
        }),
        longsword: wpn('longsword', 'Longsword', 1, 8, 3, 'slashing', 15, {
            description: 'A versatile one-handed sword.'
        }),
        mace: wpn('mace', 'Mace', 1, 6, 2, 'bludgeoning', 5, {
            description: 'A simple but effective blunt weapon.'
        }),
        crossbow_light: wpn('crossbow_light', 'Light Crossbow', 1, 8, 2, 'piercing', 25, {
            type: 'ranged',
            range: 16,
            description: 'A mechanical ranged weapon, easy to operate.'
        })
    };

    // =========================================================================
    // ARMOR
    // =========================================================================
    var ARMORS = {
        chain_mail_plus1: armor('chain_mail_plus1', 'Chain Mail +1', 17, 300, {
            bonus: 1,
            type: 'heavy',
            stealthDisadvantage: true,
            description: 'Enchanted interlocking metal rings offering superior protection.'
        }),
        studded_leather_plus1: armor('studded_leather_plus1', 'Studded Leather +1', 14, 200, {
            bonus: 1,
            type: 'light',
            maxDexBonus: null,
            description: 'Reinforced leather armor with a magical sheen.'
        }),
        shield_plus1: armor('shield_plus1', 'Shield +1', 3, 200, {
            bonus: 1,
            slot: 'offhand',
            isShield: true,
            description: 'A sturdy shield with a faint protective aura.'
        }),
        plate_armor: armor('plate_armor', 'Plate Armor', 18, 500, {
            type: 'heavy',
            stealthDisadvantage: true,
            strRequirement: 15,
            description: 'Full plate mail, the finest mundane protection available.'
        }),
        mithral_chain: armor('mithral_chain', 'Mithral Chain', 16, 400, {
            type: 'medium',
            stealthDisadvantage: false,
            magical: true,
            description: 'Lightweight mithral links. No stealth disadvantage.'
        }),
        // Basic shop armor
        chain_mail: armor('chain_mail', 'Chain Mail', 16, 75, {
            type: 'heavy',
            stealthDisadvantage: true,
            description: 'Standard interlocking metal rings.'
        }),
        studded_leather: armor('studded_leather', 'Studded Leather', 12, 45, {
            type: 'light',
            maxDexBonus: null,
            description: 'Hardened leather reinforced with studs.'
        }),
        shield: armor('shield', 'Shield', 2, 10, {
            slot: 'offhand',
            isShield: true,
            description: 'A wooden or metal shield.'
        }),
        leather_armor: armor('leather_armor', 'Leather Armor', 11, 10, {
            type: 'light',
            maxDexBonus: null,
            description: 'Basic cured leather protection.'
        }),
        scale_mail: armor('scale_mail', 'Scale Mail', 14, 50, {
            type: 'medium',
            stealthDisadvantage: true,
            maxDexBonus: 2,
            description: 'Overlapping metal scales on leather.'
        })
    };

    // =========================================================================
    // POTIONS
    // =========================================================================
    var POTIONS = {
        potion_healing: potion('potion_healing', 'Potion of Healing', {
            type: 'heal',
            healing: '2d4+2',
            diceCount: 2,
            diceSize: 4,
            healingBonus: 2
        }, 25, {
            description: 'A red liquid that glimmers when agitated. Restores 2d4+2 HP.'
        }),
        potion_greater_healing: potion('potion_greater_healing', 'Potion of Greater Healing', {
            type: 'heal',
            healing: '4d4+4',
            diceCount: 4,
            diceSize: 4,
            healingBonus: 4
        }, 100, {
            description: 'A bright red potion with golden flecks. Restores 4d4+4 HP.'
        }),
        potion_superior_healing: potion('potion_superior_healing', 'Potion of Superior Healing', {
            type: 'heal',
            healing: '8d4+8',
            diceCount: 8,
            diceSize: 4,
            healingBonus: 8
        }, 500, {
            description: 'A deep crimson elixir that pulses with warm light. Restores 8d4+8 HP.'
        }),
        potion_fire_resistance: potion('potion_fire_resistance', 'Potion of Fire Resistance', {
            type: 'resistance',
            resistanceType: 'fire',
            duration: 60,
            durationRounds: 10,
            durationDesc: '1 hour'
        }, 150, {
            description: 'A flickering orange liquid. Grants fire resistance for 1 hour.'
        }),
        potion_speed: potion('potion_speed', 'Potion of Speed', {
            type: 'buff',
            effect: 'haste',
            duration: 10,
            durationDesc: '1 minute',
            bonusAC: 2,
            doubleSpeed: true,
            extraAttack: true,
            advantageDex: true
        }, 250, {
            description: 'A yellow fluid that streaks and swirls. Grants haste for 1 minute.'
        })
    };

    // =========================================================================
    // SCROLLS
    // =========================================================================
    var SCROLLS = {
        scroll_fireball: scroll('scroll_fireball', 'Scroll of Fireball', {
            spellName: 'Fireball',
            damage: '8d6',
            damageType: 'fire',
            diceCount: 8,
            diceSize: 6,
            saveType: 'dex',
            saveDC: 15,
            halfOnSave: true,
            range: 30,
            aoeRadius: 4,
            slotLevel: 3
        }, 150, {
            description: 'A parchment crackling with latent energy. Unleashes an 8d6 fireball.'
        }),
        scroll_revivify: scroll('scroll_revivify', 'Scroll of Revivify', {
            spellName: 'Revivify',
            type: 'resurrection',
            range: 1,
            targetType: 'dead_ally',
            restoredHP: 1,
            timeLimit: 'within 1 minute of death',
            slotLevel: 3
        }, 500, {
            description: 'Sacred text that can bring a recently fallen ally back to life at 1 HP.'
        }),
        scroll_protection_evil: scroll('scroll_protection_evil', 'Scroll of Protection from Evil', {
            spellName: 'Protection from Evil and Good',
            type: 'buff',
            duration: 10,
            durationDesc: '10 minutes',
            targetType: 'ally',
            advantageVs: ['undead', 'fiend', 'aberration', 'celestial', 'elemental', 'fey'],
            cantBeCharmed: true,
            cantBeFrightened: true,
            cantBePossessed: true,
            slotLevel: 1
        }, 100, {
            description: 'A warded scroll. Grants advantage on saves vs undead and similar creatures.'
        })
    };

    // =========================================================================
    // Unified ITEMS lookup
    // =========================================================================
    var ITEMS = {};
    var categories = [WEAPONS, ARMORS, POTIONS, SCROLLS];
    for (var c = 0; c < categories.length; c++) {
        var cat = categories[c];
        for (var key in cat) {
            if (cat.hasOwnProperty(key)) {
                ITEMS[key] = cat[key];
            }
        }
    }
    Object.freeze(ITEMS);

    // =========================================================================
    // SHOP INVENTORIES
    // =========================================================================
    var SHOPS = Object.freeze({
        smithShop: Object.freeze({
            id: 'smithShop',
            name: 'Ironforge Smithy',
            description: 'A soot-covered smithy run by a burly dwarf. Weapons and armor for sale.',
            inventory: [
                'shortsword', 'longsword', 'greataxe', 'mace', 'handaxe',
                'crossbow_light', 'longbow',
                'leather_armor', 'studded_leather', 'chain_mail', 'scale_mail',
                'shield',
                'longsword_plus1', 'greataxe_plus1'
            ]
        }),
        herbShop: Object.freeze({
            id: 'herbShop',
            name: 'The Verdant Remedy',
            description: 'A cluttered shop smelling of dried herbs and incense.',
            inventory: [
                'potion_healing', 'potion_greater_healing', 'potion_superior_healing',
                'potion_fire_resistance', 'potion_speed',
                'scroll_fireball', 'scroll_revivify', 'scroll_protection_evil'
            ]
        }),
        specialShop: Object.freeze({
            id: 'specialShop',
            name: 'The Arcane Emporium',
            description: 'A mysterious shop that only appears after the veil weakens. Magic items abound.',
            unlockCondition: 'story_phase_2',
            inventory: [
                'flame_tongue_longsword', 'oathbow', 'dagger_of_venom',
                'staff_of_power',
                'chain_mail_plus1', 'studded_leather_plus1', 'shield_plus1',
                'plate_armor', 'mithral_chain',
                'shortbow_plus1',
                'potion_superior_healing', 'potion_speed',
                'scroll_revivify'
            ]
        })
    });

    // =========================================================================
    // LOOT TABLES — keyed by encounter id
    // =========================================================================
    var LOOT_TABLES = Object.freeze({
        wolves: Object.freeze({
            gold: { diceCount: 2, diceSize: 6, bonus: 0, formula: '2d6' },
            items: [
                { itemId: 'potion_healing', chance: 0.10 }
            ]
        }),
        dire_wolves: Object.freeze({
            gold: { diceCount: 3, diceSize: 6, bonus: 0, formula: '3d6' },
            items: [
                { itemId: 'potion_healing', chance: 0.20 },
                { itemId: 'leather_armor', chance: 0.05 }
            ]
        }),
        bandits: Object.freeze({
            gold: { diceCount: 4, diceSize: 6, bonus: 0, formula: '4d6' },
            items: [
                { itemId: 'potion_healing', chance: 0.25 },
                { itemId: 'shortsword', chance: 0.30 },
                { itemId: 'crossbow_light', chance: 0.15 }
            ]
        }),
        bandit_captain: Object.freeze({
            gold: { diceCount: 6, diceSize: 6, bonus: 10, formula: '6d6+10' },
            items: [
                { itemId: 'potion_greater_healing', chance: 0.30 },
                { itemId: 'longsword_plus1', chance: 0.10 },
                { itemId: 'studded_leather', chance: 0.20 }
            ]
        }),
        ogres: Object.freeze({
            gold: { diceCount: 6, diceSize: 6, bonus: 0, formula: '6d6' },
            items: [
                { itemId: 'greataxe', chance: 0.40 },
                { itemId: 'potion_greater_healing', chance: 0.25 }
            ]
        }),
        skeletons: Object.freeze({
            gold: { diceCount: 2, diceSize: 6, bonus: 0, formula: '2d6' },
            items: [
                { itemId: 'shortsword', chance: 0.15 },
                { itemId: 'scroll_protection_evil', chance: 0.05 }
            ]
        }),
        zombies: Object.freeze({
            gold: { diceCount: 1, diceSize: 6, bonus: 0, formula: '1d6' },
            items: [
                { itemId: 'potion_healing', chance: 0.10 }
            ]
        }),
        wights: Object.freeze({
            gold: { diceCount: 4, diceSize: 8, bonus: 5, formula: '4d8+5' },
            items: [
                { itemId: 'longsword_plus1', chance: 0.15 },
                { itemId: 'potion_greater_healing', chance: 0.20 },
                { itemId: 'scroll_protection_evil', chance: 0.10 }
            ]
        }),
        wraiths: Object.freeze({
            gold: { diceCount: 6, diceSize: 8, bonus: 10, formula: '6d8+10' },
            items: [
                { itemId: 'potion_superior_healing', chance: 0.15 },
                { itemId: 'scroll_revivify', chance: 0.10 },
                { itemId: 'mithral_chain', chance: 0.05 }
            ]
        }),
        animated_armor: Object.freeze({
            gold: { diceCount: 3, diceSize: 6, bonus: 5, formula: '3d6+5' },
            items: [
                { itemId: 'chain_mail_plus1', chance: 0.10 },
                { itemId: 'shield', chance: 0.25 }
            ]
        }),
        arcane_guardian: Object.freeze({
            gold: { diceCount: 5, diceSize: 8, bonus: 10, formula: '5d8+10' },
            items: [
                { itemId: 'scroll_fireball', chance: 0.20 },
                { itemId: 'staff_of_power', chance: 0.05 },
                { itemId: 'potion_fire_resistance', chance: 0.15 }
            ]
        }),
        flesh_golem: Object.freeze({
            gold: { diceCount: 6, diceSize: 8, bonus: 15, formula: '6d8+15' },
            items: [
                { itemId: 'potion_superior_healing', chance: 0.20 },
                { itemId: 'flame_tongue_longsword', chance: 0.05 },
                { itemId: 'scroll_revivify', chance: 0.10 }
            ]
        }),
        orcs: Object.freeze({
            gold: { diceCount: 3, diceSize: 6, bonus: 0, formula: '3d6' },
            items: [
                { itemId: 'greataxe', chance: 0.30 },
                { itemId: 'potion_healing', chance: 0.15 }
            ]
        }),
        orc_war_chief: Object.freeze({
            gold: { diceCount: 8, diceSize: 6, bonus: 20, formula: '8d6+20' },
            items: [
                { itemId: 'greataxe_plus1', chance: 0.20 },
                { itemId: 'potion_greater_healing', chance: 0.30 },
                { itemId: 'plate_armor', chance: 0.05 }
            ]
        }),
        orc_shaman: Object.freeze({
            gold: { diceCount: 5, diceSize: 6, bonus: 10, formula: '5d6+10' },
            items: [
                { itemId: 'scroll_fireball', chance: 0.15 },
                { itemId: 'potion_greater_healing', chance: 0.25 },
                { itemId: 'scroll_protection_evil', chance: 0.15 }
            ]
        }),
        will_o_wisp: Object.freeze({
            gold: { diceCount: 2, diceSize: 8, bonus: 5, formula: '2d8+5' },
            items: [
                { itemId: 'potion_speed', chance: 0.10 },
                { itemId: 'scroll_fireball', chance: 0.10 }
            ]
        }),
        green_hag: Object.freeze({
            gold: { diceCount: 6, diceSize: 8, bonus: 20, formula: '6d8+20' },
            items: [
                { itemId: 'dagger_of_venom', chance: 0.10 },
                { itemId: 'potion_superior_healing', chance: 0.15 },
                { itemId: 'oathbow', chance: 0.03 }
            ]
        })
    });

    // =========================================================================
    // Dice roller utility (internal)
    // =========================================================================
    function rollDice(count, size) {
        var total = 0;
        for (var i = 0; i < count; i++) {
            total += Math.floor(Math.random() * size) + 1;
        }
        return total;
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * getItem - returns the item definition for a given item ID
     * @param {string} itemId
     * @returns {object|null}
     */
    function getItem(itemId) {
        if (!itemId) { return null; }
        return ITEMS[itemId] || null;
    }

    /**
     * getShopInventory - returns available items with prices for a shop
     * @param {string} shopId - 'smithShop', 'herbShop', or 'specialShop'
     * @returns {object|null} { id, name, description, items: [{ item, price }] }
     */
    function getShopInventory(shopId) {
        var shop = SHOPS[shopId];
        if (!shop) { return null; }
        var result = {
            id: shop.id,
            name: shop.name,
            description: shop.description,
            unlockCondition: shop.unlockCondition || null,
            items: []
        };
        var inv = shop.inventory;
        for (var i = 0; i < inv.length; i++) {
            var item = ITEMS[inv[i]];
            if (item) {
                result.items.push({
                    item: item,
                    itemId: item.id,
                    name: item.name,
                    price: item.price,
                    category: item.category,
                    consumable: item.consumable || false
                });
            }
        }
        return result;
    }

    /**
     * rollLoot - rolls on a loot table for an encounter, returns gold and items
     * @param {string} encounterId - key into LOOT_TABLES
     * @returns {object} { gold: number, items: [item objects] }
     */
    function rollLoot(encounterId) {
        var table = LOOT_TABLES[encounterId];
        if (!table) {
            return { gold: 0, items: [] };
        }

        // Roll gold
        var gold = rollDice(table.gold.diceCount, table.gold.diceSize) + (table.gold.bonus || 0);

        // Roll for each item drop
        var droppedItems = [];
        var tableItems = table.items;
        for (var i = 0; i < tableItems.length; i++) {
            var entry = tableItems[i];
            var roll = Math.random();
            if (roll < entry.chance) {
                var item = ITEMS[entry.itemId];
                if (item) {
                    droppedItems.push({
                        itemId: item.id,
                        name: item.name,
                        category: item.category,
                        item: item
                    });
                }
            }
        }

        return {
            gold: gold,
            items: droppedItems
        };
    }

    /**
     * getItemBonus - returns stat modifications for an equipped item
     * @param {string} itemId
     * @param {string} slot - 'weapon', 'armor', 'offhand', etc.
     * @returns {object} bonuses like { ac, attackBonus, damageBonus, spellDC, etc. }
     */
    function getItemBonus(itemId, slot) {
        var item = ITEMS[itemId];
        if (!item) { return {}; }

        var bonuses = {};

        if (item.category === CATEGORY_WEAPON) {
            bonuses.attackBonus = item.bonus || 0;
            bonuses.damageBonus = item.damageBonus || 0;
            bonuses.damageType = item.damageType || 'slashing';
            bonuses.damage = item.damage || '';
            if (item.extraDamage) {
                bonuses.extraDamage = item.extraDamage;
                bonuses.extraDamageType = item.extraDamageType || '';
            }
            if (item.spellDCBonus) {
                bonuses.spellDCBonus = item.spellDCBonus;
            }
            if (item.spellAttackBonus) {
                bonuses.spellAttackBonus = item.spellAttackBonus;
            }
        }

        if (item.category === CATEGORY_ARMOR) {
            bonuses.ac = item.ac || 0;
            bonuses.isShield = item.isShield || false;
            bonuses.stealthDisadvantage = item.stealthDisadvantage || false;
            if (item.maxDexBonus !== undefined) {
                bonuses.maxDexBonus = item.maxDexBonus;
            }
        }

        return bonuses;
    }

    // =========================================================================
    // Export
    // =========================================================================
    root.MJ.Dragon.Campaign.Loot = {
        ITEMS: ITEMS,
        WEAPONS: WEAPONS,
        ARMORS: ARMORS,
        POTIONS: POTIONS,
        SCROLLS: SCROLLS,
        SHOPS: SHOPS,
        LOOT_TABLES: LOOT_TABLES,
        getItem: getItem,
        getShopInventory: getShopInventory,
        rollLoot: rollLoot,
        getItemBonus: getItemBonus
    };

})(typeof window !== 'undefined' ? window : global);
