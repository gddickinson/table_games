# Blackjack — Complete Rulebook

A comprehensive guide to the rules of Blackjack (also known as Twenty-One), one of the most popular casino card games in the world and a featured game mode in this application.

---

## Table of Contents

1. [Game Overview](#game-overview)
2. [Card Values](#card-values)
3. [Table Setup](#table-setup)
4. [Game Flow](#game-flow)
5. [Player Actions](#player-actions)
6. [Dealer Rules](#dealer-rules)
7. [Payouts and Settling](#payouts-and-settling)
8. [Splitting Rules](#splitting-rules)
9. [Soft Hands vs Hard Hands](#soft-hands-vs-hard-hands)
10. [Insurance and Even Money](#insurance-and-even-money)
11. [Surrender](#surrender)
12. [Multi-Deck Shoe](#multi-deck-shoe)
13. [Side Bets](#side-bets)
14. [Etiquette and Table Rules](#etiquette-and-table-rules)
15. [Variations and House Rules](#variations-and-house-rules)
16. [Glossary](#glossary)

---

## Game Overview

Blackjack is a comparing card game between a player and a dealer. Unlike poker, you do not compete against other players at the table — every hand is an independent contest between you and the dealer. The primary objective is to beat the dealer by having a hand value closer to 21 without going over.

### Ways to Win

- **Get a natural Blackjack** — an Ace plus a 10-value card as your first two cards.
- **Have a higher hand value than the dealer** without exceeding 21.
- **The dealer busts** — their hand exceeds 21 while yours does not.

### Ways to Lose

- **You bust** — your hand value exceeds 21. This is an automatic loss regardless of what the dealer has.
- **The dealer has a higher hand value** than you without busting.

### Push (Tie)

If both you and the dealer have the same hand value, the result is a **push**. Your bet is returned to you — you neither win nor lose.

### Key Characteristics

- **Players:** 1 to 7 at a single table, each playing independently against the dealer
- **Deck:** One to eight standard 52-card decks (most commonly 6)
- **Type:** Banking game with fixed dealer rules
- **Objective:** Beat the dealer's hand without exceeding 21
- **Skill vs. Luck:** Significant skill element through proper strategy decisions
- **House Edge:** Approximately 0.5% with optimal basic strategy

---

## Card Values

Understanding card values is fundamental to Blackjack. Every card has a specific point value:

### Number Cards (2-10)

Number cards are worth their **face value**. A 2 is worth 2, a 7 is worth 7, and a 10 is worth 10.

| Card | Value |
|------|-------|
| 2 | 2 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |
| 6 | 6 |
| 7 | 7 |
| 8 | 8 |
| 9 | 9 |
| 10 | 10 |

### Face Cards (Jack, Queen, King)

All face cards are worth **10 points**. There is no difference in value between a Jack, Queen, or King.

| Card | Value |
|------|-------|
| Jack (J) | 10 |
| Queen (Q) | 10 |
| King (K) | 10 |

### The Ace

The Ace is the most versatile card in Blackjack. It can be worth either **1 or 11 points**, depending on which value benefits the hand more.

- If counting the Ace as 11 would cause the hand to bust (exceed 21), the Ace is counted as 1.
- If counting the Ace as 11 keeps the hand at 21 or below, the Ace is counted as 11.
- The value automatically adjusts as additional cards are dealt.

**Examples:**

- Ace + 6 = 17 (Ace counts as 11, making a "soft 17")
- Ace + 6 + 8 = 15 (Ace must count as 1 to avoid busting)
- Ace + Ace = 12 (one Ace counts as 11, the other as 1)

### Hand Value Calculation

To calculate the total value of a hand, simply add up the values of all cards:

- **5 + 8** = 13
- **King + 7** = 17
- **Ace + Queen** = 21 (Blackjack!)
- **Ace + 5 + 3** = 19 (Ace counts as 11)
- **Ace + 5 + 8** = 14 (Ace counts as 1 to avoid busting at 24)
- **9 + 7 + Queen** = 26 (Bust!)

---

## Table Setup

### The Table Layout

A standard Blackjack table is a semicircular shape that seats up to seven players on the curved side, with the dealer standing on the straight side. Key areas include:

- **Betting Circle/Box** — each player has a designated area to place their wager before cards are dealt.
- **Card Area** — where the player's cards are placed face-up.
- **Dealer's Area** — the dealer's cards: one face-up (the "upcard") and one face-down (the "hole card").
- **Chip Tray** — where the dealer keeps the house chips.
- **Shoe** — the device holding multiple decks of shuffled cards from which the dealer draws.
- **Discard Tray** — where used cards are placed after each round.

### Table Positions

Players are numbered from the dealer's left to right:

| Position | Name | Notes |
|----------|------|-------|
| Seat 1 | First Base | Receives cards first, acts first |
| Seats 2-5 | Middle Positions | Standard play order |
| Seat 6 | Shortstop | Second to last position |
| Seat 7 | Third Base | Acts last before the dealer |

**Third Base** is often considered the most scrutinized seat because the player's decision directly precedes the dealer's play. Superstitious players sometimes blame third base for "bad" hits, though mathematically each position is equal.

### Table Minimums and Maximums

Every Blackjack table displays its minimum and maximum bet limits on a placard. Common limits include:

- **Low-stakes:** $5 minimum, $500 maximum
- **Mid-stakes:** $25 minimum, $5,000 maximum
- **High-stakes:** $100 minimum, $10,000+ maximum

In this game, the betting range is determined by your current chip count and the selected difficulty level.

---

## Game Flow

A complete round of Blackjack follows this precise sequence:

### Step 1: Place Bets

Before any cards are dealt, each player places their wager in their betting circle. Once all bets are placed, no further bets or changes are allowed (with exceptions for doubling and splitting).

### Step 2: Initial Deal

The dealer distributes cards one at a time, face-up, starting from first base and moving clockwise:

1. Each player receives their **first card** face-up.
2. The dealer takes their **first card** face-up (the **upcard**).
3. Each player receives their **second card** face-up.
4. The dealer takes their **second card** face-down (the **hole card**).

At this point, every player has two face-up cards and the dealer has one face-up card and one face-down card.

### Step 3: Check for Blackjack

If the dealer's upcard is an Ace or a 10-value card, the dealer may check for a natural Blackjack (Ace + 10-value):

- **Dealer upcard is an Ace:** Insurance is offered to all players (see Insurance section). Then the dealer checks the hole card. If the dealer has Blackjack, all hands lose immediately (except player Blackjacks, which push).
- **Dealer upcard is 10-value:** The dealer checks the hole card. If the dealer has Blackjack, all hands lose immediately (except player Blackjacks, which push).
- **Player has Blackjack:** If the dealer does not also have Blackjack, the player is paid immediately at 3:2.

### Step 4: Player Decisions

Starting from first base and moving clockwise, each player makes decisions about their hand:

- **Hit** — take another card
- **Stand** — keep the current hand
- **Double Down** — double the bet and take exactly one more card
- **Split** — if holding a pair, divide into two separate hands
- **Surrender** — forfeit half the bet and end the hand (if available)

Players continue making decisions until they stand or bust.

### Step 5: Dealer Plays

After all players have completed their hands, the dealer reveals the hole card and plays according to fixed rules (see Dealer Rules section). The dealer has no choices — their actions are entirely predetermined.

### Step 6: Settle Bets

Starting from third base and moving counterclockwise (or first base moving clockwise, depending on house convention), the dealer settles each bet:

- **Player wins** — paid even money (1:1) on their bet
- **Player Blackjack** — paid 3:2 on their bet
- **Dealer wins** — player's bet is collected
- **Push** — player's bet is returned
- **Player busted** — already collected during player decisions

---

## Player Actions

### Hit

Take one additional card from the shoe. You may hit as many times as you wish, as long as your hand total does not exceed 21. If you hit and your total exceeds 21, you **bust** and lose your bet immediately.

**When to hit:** Generally when your hand total is low and the risk of busting is acceptable given the dealer's upcard. Basic strategy provides precise guidance (see the Strategy Guide).

**Signal:** In a face-up game, tap the table behind your cards. In a hand-held game, scrape the cards toward you on the felt.

### Stand

Keep your current hand and end your turn. You are satisfied with your total and do not want any more cards.

**When to stand:** When your hand is strong enough that taking another card risks busting, or when the dealer's upcard suggests they may bust.

**Signal:** Wave your hand horizontally over your cards, palm down.

### Double Down

Double your original bet and receive **exactly one more card**. After receiving that card, your turn ends — you cannot hit again. This is an aggressive move used when the odds strongly favor the player.

**Rules for doubling:**

- You must have exactly two cards (your initial deal).
- You place an additional bet equal to your original wager next to your original bet.
- You receive one and only one additional card.
- Some casinos restrict doubling to certain hand totals (e.g., 9, 10, or 11 only). In this game, you may double on any two-card total.

**When to double:** When you have a strong starting position. Classic doubling situations include:

- Hard 11 against any dealer upcard except Ace
- Hard 10 against dealer 2 through 9
- Hard 9 against dealer 3 through 6
- Soft 16 to soft 18 against dealer 4 through 6

### Split

When your first two cards are a **pair** (same rank), you may split them into two separate hands. A second bet equal to your original wager is placed, and each card becomes the first card of a new hand. Each hand receives one additional card, and you play each hand independently.

**Split rules:**

- Both cards must be the same rank (two 8s, two Kings, etc.).
- In most games, any two 10-value cards can be split (e.g., King and Jack), though some houses require identical cards.
- After splitting, you play the first hand to completion before moving to the second.
- You may hit, stand, or double down on each split hand.
- If you split Aces, you typically receive only one card on each Ace and cannot hit further.
- Getting a 10-value card on a split Ace (or an Ace on a split 10) counts as 21, not as a natural Blackjack. It pays 1:1, not 3:2.

See the detailed Splitting Rules section for more information.

### Insurance

A side bet offered when the dealer's upcard is an Ace. See the Insurance and Even Money section for full details.

### Surrender

Forfeit your hand and recover half your original bet. See the Surrender section for full details.

---

## Dealer Rules

The dealer in Blackjack has **no decisions to make**. Their play is governed entirely by fixed rules printed on the table felt. This is one of the fundamental differences between Blackjack and poker — the dealer is an automaton.

### Standard Dealer Rules

| Dealer's Hand Total | Action |
|---------------------|--------|
| 16 or less | Must hit |
| Hard 17 or more | Must stand |
| Soft 17 | Depends on house rules |

### Hit Soft 17 vs. Stand on All 17s

The most significant dealer rule variation concerns soft 17 (a hand containing an Ace counted as 11, totaling 17, such as Ace-6):

- **Dealer stands on all 17s (S17):** The dealer stands whenever the hand total is 17 or more, regardless of whether it is soft or hard. This is more favorable for the player.
- **Dealer hits soft 17 (H17):** The dealer must hit on soft 17 but stands on hard 17. This gives the dealer more chances to improve from 17 and increases the house edge by approximately 0.2%.

In this game, the dealer **hits soft 17** (H17), which is the more common rule in modern casinos.

### Dealer Play Sequence

1. The dealer reveals the hole card.
2. If the hand total is 16 or less, the dealer draws a card.
3. The process repeats until the hand is 17 or more (accounting for the soft 17 rule).
4. If the dealer's total exceeds 21, the dealer busts and all remaining player hands win.

### Why Dealer Rules Matter

The fixed nature of dealer rules is what makes Blackjack mathematically analyzable. Because the dealer has no choices, every possible outcome can be calculated, which forms the basis for basic strategy.

---

## Payouts and Settling

### Standard Payouts

| Outcome | Payout | Example |
|---------|--------|---------|
| Player wins | 1:1 (even money) | Bet $10, win $10, keep original $10 |
| Player Blackjack | 3:2 | Bet $10, win $15, keep original $10 |
| Push (tie) | 0:0 (bet returned) | Bet $10, get $10 back |
| Player loses | -1:1 (bet lost) | Bet $10, lose $10 |
| Insurance wins | 2:1 | Insurance $5, win $10, keep original $5 |
| Surrender | -0.5:1 (half bet lost) | Bet $10, lose $5, get $5 back |

### Blackjack Payout Details

A natural Blackjack (an Ace plus a 10-value card dealt as the initial two cards) pays **3:2** in the standard game. This means:

- A $10 bet returns $25 total ($10 original + $15 winnings)
- A $25 bet returns $62.50 total ($25 original + $37.50 winnings)
- A $100 bet returns $250 total ($100 original + $150 winnings)

> **Warning:** Some casinos offer "6:5 Blackjack" tables where a natural Blackjack pays only 6:5 instead of 3:2. This significantly increases the house edge (by about 1.4%) and should be avoided. A $10 bet at 6:5 would only win $12 instead of $15. This game uses the standard 3:2 payout.

### Settlement Order

After the dealer completes their hand:

1. All busted player hands have already been collected.
2. If the dealer busts, all remaining player hands are paid 1:1.
3. If the dealer does not bust, each remaining hand is compared to the dealer's total.
4. Hands closer to 21 than the dealer win 1:1.
5. Hands with the same total as the dealer push.
6. Hands with a lower total than the dealer lose.

### Blackjack vs. 21

A natural Blackjack (two cards) beats a hand totaling 21 with three or more cards. If a player has a natural Blackjack and the dealer makes 21 with multiple cards, the player wins. However, if both the player and dealer have natural Blackjacks, the result is a push.

---

## Splitting Rules

Splitting is one of the most powerful tools in a Blackjack player's arsenal. Here is a comprehensive breakdown of how splitting works.

### When You Can Split

You may split any time your first two cards are a pair — two cards of the same rank. In most games (including this one), any two 10-value cards may be split (e.g., a Jack and a King), though this is almost never strategically advisable.

### The Splitting Process

1. Signal your intent to split (place a second bet equal to your first beside the original).
2. The dealer separates your two cards into two hands.
3. Each hand receives one additional card.
4. You play the first hand to completion (hit, stand, or double).
5. Then you play the second hand to completion.

### Resplitting

If after splitting you receive another card of the same rank, many casinos allow you to split again (called **resplitting**). Common rules include:

- Resplitting allowed up to 4 total hands
- No resplitting allowed
- Resplitting allowed for all pairs except Aces

### Splitting Aces

Aces are a special case with restrictive rules:

- When you split Aces, you receive **only one card** on each Ace. You cannot hit.
- If you receive a 10-value card on a split Ace, the hand counts as **21**, not as a natural Blackjack. It pays 1:1, not 3:2.
- Most casinos do not allow resplitting Aces.

### Doubling After Splitting (DAS)

Some casinos allow you to double down after splitting. For example, if you split 8s and receive a 3 on the first hand (making 11), you may double down. This rule is favorable for the player and reduces the house edge by approximately 0.14%.

In this game, **doubling after splitting is allowed**.

### When to Split — Quick Reference

| Pair | Action | Reason |
|------|--------|--------|
| Aces | Always split | Two chances at 21 |
| 8s | Always split | 16 is the worst hand; two 8s have potential |
| 10s | Never split | 20 is nearly unbeatable |
| 5s | Never split (double if possible) | 10 is a great doubling hand |
| 4s | Usually don't split | 8 is not a strong starting card |
| 2s, 3s | Split vs dealer 4-7 | Low pairs benefit from the split when dealer is weak |
| 6s | Split vs dealer 2-6 | Avoid splitting when dealer is strong |
| 7s | Split vs dealer 2-7 | 14 is weak; two 7s have moderate potential |
| 9s | Split vs dealer 2-9 (except 7) | 18 is good but two 9s can be better; stand vs 7 since you already beat likely 17 |

---

## Soft Hands vs Hard Hands

Understanding the difference between soft and hard hands is critical to proper Blackjack play.

### Hard Hands

A **hard hand** is any hand that either:

- Does not contain an Ace, or
- Contains an Ace that must be counted as 1 (because counting it as 11 would bust the hand).

In a hard hand, there is only one possible total. Taking another card always risks busting.

**Examples of hard hands:**

- 10 + 7 = Hard 17
- 9 + 4 + 5 = Hard 18
- Ace + 6 + 10 = Hard 17 (Ace must count as 1)
- 8 + 8 = Hard 16
- 10 + 5 + 3 = Hard 18

### Soft Hands

A **soft hand** contains an Ace that is being counted as 11 without busting. In a soft hand, you effectively have two possible totals — the current total and a total that is 10 less (if you switch the Ace from 11 to 1).

This gives soft hands a safety net: **you cannot bust by taking one card on a soft hand**.

**Examples of soft hands:**

- Ace + 6 = Soft 17 (could also be 7)
- Ace + 2 + 4 = Soft 17 (could also be 7)
- Ace + 7 = Soft 18 (could also be 8)
- Ace + Ace = Soft 12 (could also be 2)
- Ace + 3 + 2 = Soft 16 (could also be 6)

### Why It Matters

The soft/hard distinction changes your optimal strategy dramatically:

- **Soft 17:** You should hit (or even double in some cases) because you cannot bust and might improve to 18-21.
- **Hard 17:** You should always stand because any card 5 or higher will bust you.
- **Soft 18:** Against a dealer 9, 10, or Ace, you should hit because 18 is likely to lose and you have no risk of busting on one card.
- **Hard 18:** You should always stand — this is a strong hand.

### Transition from Soft to Hard

A hand can start soft and become hard:

1. You have Ace + 5 (Soft 16)
2. You hit and receive a 9
3. Now you have Ace + 5 + 9 = 15 (Hard 15, because the Ace must count as 1)

The Ace's value transitions automatically. Once a soft hand becomes hard, it stays hard for the rest of that hand's play.

---

## Insurance and Even Money

### Insurance

When the dealer's upcard is an **Ace**, the dealer offers "Insurance" to all players before checking the hole card. Insurance is a **side bet** that the dealer has Blackjack (a 10-value card as the hole card).

**How insurance works:**

1. The dealer shows an Ace.
2. Players are asked "Insurance?"
3. Players may place an insurance bet up to **half their original wager**.
4. The dealer checks the hole card.
5. If the dealer has Blackjack: insurance pays **2:1**, but the original bet loses (unless you also have Blackjack).
6. If the dealer does not have Blackjack: insurance bet is lost, and play continues normally.

**The mathematics:** In a standard deck, there are 16 ten-value cards out of 52 total. After the Ace is shown, 16 out of the remaining 51 cards are tens. This means the dealer has Blackjack approximately 30.6% of the time. For insurance to be a fair bet at 2:1 payout, the dealer would need Blackjack 33.3% of the time. Since 30.6% < 33.3%, **insurance is a losing bet in the long run**.

> **Advice:** Always decline insurance. It is mathematically unfavorable with a house edge of approximately 7.4%. The only exception is if you are counting cards and the count indicates an unusually high proportion of tens remaining in the shoe.

### Even Money

When you have a natural Blackjack and the dealer's upcard is an Ace, you may be offered **"even money"** — a guaranteed 1:1 payout on your Blackjack instead of risking a push if the dealer also has Blackjack.

Even money is mathematically equivalent to taking insurance on a Blackjack. The same logic applies: **declining even money is the correct play in the long run**.

---

## Surrender

Surrender is an option that allows you to forfeit your hand and recover half of your original bet. Not all casinos offer surrender, and there are two varieties.

### Early Surrender

The player may surrender **before** the dealer checks for Blackjack. This is extremely rare and highly favorable for the player (reduces house edge by about 0.6%).

### Late Surrender

The player may surrender **after** the dealer has checked for Blackjack and confirmed they do not have it. This is the more common form (reduces house edge by about 0.08%).

In this game, **late surrender** is available.

### When to Surrender

Surrender is correct in only a few specific situations:

| Your Hand | Dealer Upcard | Action |
|-----------|--------------|--------|
| Hard 16 (not 8+8) | 9, 10, Ace | Surrender |
| Hard 15 | 10 | Surrender |
| Hard 17 | Ace (if dealer hits soft 17) | Surrender (rare rule) |

Surrender is most valuable when you have a very weak hand against a very strong dealer upcard. In these situations, you expect to lose more than 50% of the time, so getting 50 cents back on the dollar is a better deal than playing the hand out.

---

## Multi-Deck Shoe

### Why Multiple Decks?

Early Blackjack was dealt from a single deck. Casinos switched to multiple decks primarily to combat card counting, as more cards in play make counting less effective.

### Standard Shoe Composition

A 6-deck shoe contains:

- **312 total cards** (6 x 52)
- **96 ten-value cards** (6 x 16: four each of 10, J, Q, K per deck)
- **24 Aces** (6 x 4)
- **24 of each other value** (2 through 9)

### Penetration

**Penetration** refers to how deeply into the shoe the dealer deals before reshuffling. It is expressed as a percentage:

- **75% penetration:** The dealer places the cut card approximately 234 cards into a 312-card shoe, reshuffling after about 78 cards remain.
- **85% penetration:** A deeper cut, more favorable for card counters.
- **50% penetration:** A shallow cut, terrible for card counters.

Higher penetration makes card counting more effective because the running count becomes more meaningful as fewer cards remain.

### The Cut Card

A brightly colored plastic card is placed into the shoe by a player at the start of a new shuffle. When the cut card is reached during dealing, the current round is completed and then the entire shoe is reshuffled.

### Continuous Shuffling Machines (CSM)

Some modern casinos use machines that automatically shuffle discarded cards back into the shoe, effectively creating infinite deck penetration. CSMs eliminate the possibility of card counting but do not significantly change basic strategy.

### Effect of Number of Decks on House Edge

| Number of Decks | Approximate House Edge (with basic strategy) |
|-----------------|----------------------------------------------|
| 1 deck | 0.17% |
| 2 decks | 0.46% |
| 4 decks | 0.60% |
| 6 decks | 0.64% |
| 8 decks | 0.66% |

More decks slightly increase the house edge. The difference is primarily due to the reduced probability of being dealt a natural Blackjack with more decks.

---

## Side Bets

While not the focus of standard Blackjack strategy, many tables offer optional side bets. These typically carry a much higher house edge than the main game.

### Common Side Bets

| Side Bet | Description | Typical House Edge |
|----------|-------------|-------------------|
| **21+3** | Your two cards + dealer upcard form a poker hand (flush, straight, three of a kind) | 3.2% - 8.8% |
| **Perfect Pairs** | Your two cards are a pair (mixed, colored, or perfect) | 4% - 8% |
| **Lucky Ladies** | Your two cards total 20 (bonus for Queen of Hearts pair) | 17% - 25% |
| **Royal Match** | Your two cards are suited (bonus for King-Queen suited) | 3.7% - 6.7% |
| **Insurance** | Dealer has Blackjack when showing Ace | 7.4% |

> **Advice:** Avoid side bets. They carry significantly higher house edges than the main game and will erode your bankroll faster.

---

## Etiquette and Table Rules

### At a Physical Casino

- **Hand signals are mandatory.** Verbal declarations alone are not sufficient because of surveillance cameras. You must use the proper hand signals for hit, stand, double, and split.
- **Don't touch your bet** once cards have been dealt. Moving chips after dealing begins can result in removal from the table.
- **Don't touch the cards** in a face-up shoe game. In a hand-held (pitch) game, use one hand only.
- **Tip the dealer.** It is customary to tip occasionally, either by placing a bet for the dealer or handing chips directly.
- **Don't give unsolicited advice.** Other players' decisions are their own, even if you disagree with their strategy.
- **Be aware of table minimums** before sitting down.
- **Don't blame other players** for the outcome of your hand. Each decision is statistically independent.

### In This Game

- Take your time with decisions — there is no rush.
- Use the provided buttons to indicate your action.
- Review the strategy guide if you are unsure of the optimal play.
- The game will prevent illegal actions (e.g., splitting non-pairs).

### Common Table Rules Displayed

- "Blackjack pays 3 to 2"
- "Dealer must hit soft 17" or "Dealer must stand on all 17s"
- "Insurance pays 2 to 1"
- "No mid-shoe entry" (cannot join a table mid-shoe)

---

## Variations and House Rules

Blackjack has many regional and casino-specific variations. Here are the most common rule variations and their effect on the house edge:

### Rules That Favor the Player

| Rule | House Edge Impact |
|------|-------------------|
| Fewer decks | -0.02% to -0.48% |
| Dealer stands on soft 17 | -0.20% |
| Double after split allowed | -0.14% |
| Late surrender allowed | -0.08% |
| Early surrender allowed | -0.62% |
| Resplitting Aces allowed | -0.08% |
| Double on any number of cards | -0.23% |

### Rules That Favor the House

| Rule | House Edge Impact |
|------|-------------------|
| More decks | +0.02% to +0.48% |
| Dealer hits soft 17 | +0.20% |
| No doubling after split | +0.14% |
| No surrender | +0.08% |
| Blackjack pays 6:5 | +1.36% |
| Blackjack pays 1:1 | +2.27% |
| No hole card (European style) | +0.11% |

### Popular Blackjack Variants

- **Spanish 21:** All 10s removed (but not face cards). More liberal rules compensate. Player Blackjack always wins. Late surrender at any time.
- **Pontoon:** British/Australian variant. Both dealer cards face down. Player must hit on 14 or less. Five card trick (5 cards without busting) beats everything except a natural.
- **Double Exposure:** Both dealer cards are dealt face up. Dealer wins all ties except natural Blackjack. Blackjack pays even money.
- **Blackjack Switch:** Player is dealt two hands and may switch the second card of each hand. Natural Blackjack pays even money. Dealer 22 is a push.

---

## Glossary

| Term | Definition |
|------|-----------|
| **Ace** | A card worth 1 or 11 points, the most versatile card in Blackjack |
| **Bankroll** | The total amount of money a player has available to wager |
| **Basic Strategy** | The mathematically optimal play for every possible hand combination |
| **Blackjack** | A natural 21 from the first two cards (Ace + 10-value card); also the name of the game itself |
| **Box** | The betting area in front of each player position |
| **Burn Card** | A card discarded face-down from the top of the shoe before dealing begins |
| **Bust** | Exceeding a hand total of 21, resulting in an automatic loss |
| **Card Counting** | A strategy technique of tracking the ratio of high to low cards remaining in the shoe |
| **Color Up** | Exchanging smaller denomination chips for larger ones when leaving the table |
| **Cut Card** | A plastic card placed in the shoe to determine when to reshuffle |
| **DAS** | Double After Split — a rule allowing doubling down on split hands |
| **Dealer** | The house representative who deals the cards and follows fixed rules |
| **Double Down** | Doubling the original bet in exchange for exactly one more card |
| **Early Surrender** | Forfeiting half the bet before the dealer checks for Blackjack |
| **Even Money** | A 1:1 payout offered to a player Blackjack when the dealer shows an Ace |
| **Face Card** | Jack, Queen, or King — each worth 10 points |
| **First Base** | The seat immediately to the dealer's left; acts first |
| **Flat Bet** | Wagering the same amount on every hand |
| **H17** | A rule where the dealer must hit on soft 17 |
| **Hard Hand** | A hand without an Ace counting as 11, or a hand with no Ace at all |
| **Hit** | To request an additional card |
| **Hole Card** | The dealer's face-down card |
| **House Edge** | The mathematical advantage the casino has over the player, expressed as a percentage |
| **Insurance** | A side bet that the dealer has Blackjack when showing an Ace |
| **Late Surrender** | Forfeiting half the bet after the dealer checks for Blackjack |
| **Natural** | Another term for a Blackjack (Ace + 10-value card on the initial deal) |
| **Pat Hand** | A hand totaling 17-21 that typically should not receive additional cards |
| **Penetration** | How deeply into the shoe the dealer deals before reshuffling |
| **Pitch Game** | A Blackjack game dealt from 1-2 decks held in the dealer's hand |
| **Push** | A tie between the player and dealer; the bet is returned |
| **S17** | A rule where the dealer must stand on all 17s including soft 17 |
| **Shoe** | A device holding multiple shuffled decks from which cards are dealt |
| **Shoe Game** | A Blackjack game dealt from a multi-deck shoe |
| **Soft Hand** | A hand containing an Ace counted as 11 |
| **Split** | Dividing a pair into two separate hands, each with its own bet |
| **Stand** | To keep the current hand total and end your turn |
| **Stiff Hand** | A hard hand totaling 12-16, which risks busting on the next hit |
| **Surrender** | To forfeit your hand and receive half your bet back |
| **Third Base** | The seat immediately to the dealer's right; acts last |
| **True Count** | The running count divided by the estimated number of decks remaining |
| **Upcard** | The dealer's face-up card |

---

*This rulebook covers the standard rules of Blackjack as implemented in this game. Individual casino rules may vary — always check the table placard and ask the dealer about specific rules before playing.*
