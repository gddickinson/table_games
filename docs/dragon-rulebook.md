# Dragon Battle — Rulebook

## Overview

Dragon Battle is a tactical turn-based RPG combat encounter based on D&D 5th Edition rules. A party of 6 heroes fights an Adult Red Dragon in its cave lair. The player controls one hero and can issue orders to the others, or enable Auto-Play to let the AI handle everything.

## The Party

### Kenji — Human Barbarian (Level 5)
- **Role**: Front-line damage dealer and damage sponge
- **HP**: 55 | **AC**: 14 | **Speed**: 40 ft (8 squares)
- **Key Ability**: **Rage** — Bonus action. +2 melee damage, resist physical damage. 3 uses per battle.
- **Reckless Attack**: Gain advantage on attacks, but enemies get advantage against you.
- **Extra Attack**: Make 2 attacks per turn.
- **Weapon**: Greataxe (1d12+4 slashing)

### Mei — Half-Elf Cleric of Life (Level 5)
- **Role**: Primary healer and support
- **HP**: 38 | **AC**: 18 | **Speed**: 30 ft (6 squares)
- **Key Spells**: Cure Wounds (1d8+4 healing per slot level), Spirit Guardians (3d8 radiant AoE), Guiding Bolt (4d6 radiant + advantage to next attack)
- **Cantrip**: Sacred Flame (2d8 radiant, DEX save)
- **Spell Slots**: 1st: 4, 2nd: 3, 3rd: 2

### Yuki — High Elf Wizard (Level 5)
- **Role**: Area damage and battlefield control
- **HP**: 28 | **AC**: 15 | **Speed**: 30 ft (6 squares)
- **Key Spells**: Fireball (8d6 fire, 20ft radius, DEX save), Shield (reaction, +5 AC), Counterspell (reaction, negate spell), Misty Step (bonus, teleport 30 ft), Magic Missile (3×1d4+1 force, auto-hit), Scorching Ray (3×2d6 fire, ranged attack)
- **Spell Slots**: 1st: 4, 2nd: 3, 3rd: 2

### Riku — Halfling Rogue (Level 5)
- **Role**: Burst single-target damage, evasion
- **HP**: 33 | **AC**: 15 | **Speed**: 25 ft (5 squares)
- **Key Ability**: **Sneak Attack** — Extra 3d6 damage when you have advantage or an ally is adjacent to the target.
- **Cunning Action**: Bonus action to Dash, Disengage, or Hide.
- **Uncanny Dodge**: Reaction to halve one attack's damage.
- **Evasion**: DEX saves — success = 0 damage, fail = half damage.
- **Weapon**: Shortsword (1d6+4), Shortbow (1d6+4, range 80 ft)

### Tomoe — Dragonborn Paladin (Level 5)
- **Role**: Tank, off-healer, burst damage on boss
- **HP**: 44 | **AC**: 18 | **Speed**: 30 ft (6 squares)
- **Key Ability**: **Divine Smite** — On hit, spend a spell slot for 2d8 extra radiant damage (3d8 with 2nd-level slot).
- **Lay on Hands**: Pool of 25 HP to distribute as an action.
- **Aura of Protection**: All allies within 10 ft get +3 to saving throws.
- **Shield of Faith**: Concentration, +2 AC to one ally.
- **Spell Slots**: 1st: 4, 2nd: 2

### Sora — Wood Elf Ranger (Level 5)
- **Role**: Sustained ranged damage, tracking
- **HP**: 38 | **AC**: 15 | **Speed**: 35 ft (7 squares)
- **Key Ability**: **Hunter's Mark** — Bonus action, concentration. +1d6 damage on each attack against marked target.
- **Multiattack**: 2 attacks per turn.
- **Colossus Slayer**: Once per turn, +1d8 damage to an injured target.
- **Absorb Elements**: Reaction — resist the damage type, add 1d6 of that type to your next melee attack.
- **Weapon**: Longbow (1d8+4, range 150 ft), Two Shortswords (1d6+4 each)

---

## The Dragon — Adult Red Dragon

- **HP**: 256 | **AC**: 19 | **Speed**: 40 ft ground, 80 ft flying
- **Size**: Huge (occupies 3×3 squares)
- **Multiattack**: Bite (2d10+8 piercing + 2d6 fire) + 2 Claws (2d6+8 slashing)
- **Fire Breath** (Recharge 5–6): 60 ft cone. 18d6 fire damage. DC 21 DEX save for half. After using, roll d6 at start of each turn — recharges on 5 or 6.
- **Frightful Presence**: All creatures within 120 ft must make DC 19 WIS save or become Frightened for 1 minute. Can repeat save each turn.
- **Legendary Resistance** (3/day): If the dragon fails a saving throw, it can choose to succeed instead.
- **Legendary Actions** (3/round): Used between other creatures' turns.
  - **Tail Attack** (1 action): 2d8+8 bludgeoning, reach 15 ft.
  - **Wing Attack** (2 actions): All within 10 ft take 2d6+8 bludgeoning (DC 22 DEX save or knocked prone). Dragon can then move up to half speed.
  - **Detect** (1 action): The dragon makes a Wisdom (Perception) check, potentially revealing hidden creatures.

### Dragon Phases
- **Phase 1 (100–50% HP)**: Aggressive. Prioritizes breath weapon and multiattack.
- **Phase 2 (50–25% HP)**: Tactical. Targets healers, repositions with Wing Attack.
- **Phase 3 (Below 25% HP)**: Desperate. All-out attacks on weakest targets.

---

## Combat Rules

### Turn Structure
Each turn, a creature can:
1. **Move** up to their speed (in 5 ft squares)
2. **Take one Action**: Attack, Cast a Spell, Dash, Dodge, Disengage, Hide, Use an Ability
3. **Take one Bonus Action** (if available): some abilities are bonus actions
4. **Take one Reaction** (if triggered): Shield, Counterspell, Opportunity Attack, Uncanny Dodge

### Attack Rolls
- Roll d20 + attack bonus vs target's AC
- **Natural 20**: Critical hit! Double all damage dice.
- **Natural 1**: Automatic miss.
- **Advantage**: Roll 2d20, take higher.
- **Disadvantage**: Roll 2d20, take lower.

### Saving Throws
- Roll d20 + ability modifier + proficiency (if proficient)
- Meet or beat the DC to succeed
- Common saves: DEX (avoid AoE), WIS (resist fear), CON (maintain concentration)

### Damage and Healing
- Damage types: slashing, piercing, bludgeoning, fire, cold, radiant, force, etc.
- When HP reaches 0, the character falls unconscious and starts making death saves
- Healing restores HP up to maximum

### Death Saving Throws
- At the start of each turn while at 0 HP, roll d20:
  - 10+: Success. 3 successes = stabilize.
  - 1–9: Failure. 3 failures = death.
  - Natural 20: Regain 1 HP and wake up.
  - Natural 1: Counts as 2 failures.
- Taking damage while at 0 HP = 1 automatic failure (critical = 2 failures)
- Any healing brings you back to consciousness

### Concentration
- Some spells require concentration (Spirit Guardians, Hunter's Mark, Shield of Faith)
- Only one concentration spell at a time
- Taking damage requires a CON save (DC = 10 or half damage, whichever is higher) or the spell ends

### Opportunity Attacks
- When a creature moves out of your melee reach, you can use your reaction to make one melee attack
- Using the Disengage action prevents opportunity attacks

### Cover
- **Half cover** (pillar): +2 AC and DEX saves
- Standing behind another creature: no cover benefit (they're fighting too)

### Terrain
- **Normal floor**: 1 square of movement per square
- **Rubble (difficult terrain)**: 2 squares of movement per square
- **Lava**: 2d6 fire damage when entering or starting turn in lava

---

## Tactical Tips

- **Spread out** to minimize breath weapon casualties
- **Focus fire** on the dragon — don't split damage
- **Protect the wizard** — Yuki has the lowest HP but highest damage potential
- **Heal proactively** — don't wait until someone is at 0 HP
- **Use the pillars** for half cover against the dragon's attacks
- **Flank** to enable Riku's Sneak Attack
- **Save 3rd-level slots** for clutch moments (Fireball, Spirit Guardians, high-level Smites)
- **Stay near Tomoe** for her Aura of Protection (+3 saves vs breath weapon)
- **Watch for breath weapon recharge** — the dragon telegraphs it

---

## Victory and Defeat

**Victory**: Reduce the dragon's HP to 0. The party earns XP, coins, and a permanent achievement.

**Defeat**: All 6 party members are downed (0 HP with 3 failed death saves or no one conscious to heal). The party retreats to fight another day.

**Scoring**: Based on rounds to victory, characters surviving, total damage dealt, healing efficiency, and spell slot conservation.
