# Texas Hold'em Poker — Complete Rulebook

A comprehensive guide to the rules of Texas Hold'em, the most popular variant of poker worldwide and the poker mode featured in this game.

---

## Table of Contents

1. [Game Overview](#game-overview)
2. [The Deck and Card Rankings](#the-deck-and-card-rankings)
3. [Hand Rankings](#hand-rankings)
4. [Table Setup and Positions](#table-setup-and-positions)
5. [Game Flow](#game-flow)
6. [Betting Actions](#betting-actions)
7. [Betting Rounds in Detail](#betting-rounds-in-detail)
8. [Pot Calculation and Side Pots](#pot-calculation-and-side-pots)
9. [Showdown Rules](#showdown-rules)
10. [Special Situations](#special-situations)
11. [Basic Strategy](#basic-strategy)
12. [Glossary](#glossary)

---

## Game Overview

Texas Hold'em is a community card poker game played with 2 to 10 players using a standard 52-card deck. The objective is to win chips by either:

- Having the best five-card hand at showdown, or
- Making all other players fold before the showdown.

Each player receives two private cards (called "hole cards") and shares five community cards placed face-up on the table. Players make the best possible five-card hand using any combination of their two hole cards and the five community cards.

### Key Characteristics

- **Players:** 2 to 10 at a single table
- **Deck:** Standard 52-card deck, no jokers
- **Type:** Betting game with forced bets (blinds)
- **Objective:** Win chips from other players
- **Skill vs. Luck:** Short-term luck, long-term skill

### Game Variants

| Variant | Description |
|---------|-------------|
| **No-Limit** | Players can bet any amount up to their entire stack at any time. This is the most common form. |
| **Pot-Limit** | Maximum bet is the current size of the pot. |
| **Fixed-Limit** | Bets and raises are fixed to predetermined amounts. |

This game uses **No-Limit Texas Hold'em**, where you can bet any amount at any time.

---

## The Deck and Card Rankings

### Card Values (High to Low)

```
A  K  Q  J  10  9  8  7  6  5  4  3  2
```

- **Ace** is the highest card in most situations.
- The Ace can also serve as a low card in a "wheel" straight: A-2-3-4-5.
- **Suits are equal.** There is no suit hierarchy in Texas Hold'em. A flush of hearts is exactly equal to a flush of spades of the same rank.

### The Four Suits

- Spades (black)
- Hearts (red)
- Diamonds (red)
- Clubs (black)

Suits never determine the winner of a hand. If two players have identical hands of different suits, they split the pot.

---

## Hand Rankings

Hand rankings from strongest to weakest. In any showdown, the player with the highest-ranking hand wins. All hands consist of exactly five cards.

### 1. Royal Flush

The absolute best hand in poker. An ace-high straight flush.

```
A♠  K♠  Q♠  J♠  10♠
```

- Five consecutive cards from 10 to Ace, all the same suit.
- All Royal Flushes are equal (suits do not break ties).
- Probability: ~0.000154% (1 in 649,740)

### 2. Straight Flush

Five consecutive cards of the same suit, not headed by an Ace.

```
7♥  8♥  9♥  10♥  J♥
```

- Ranked by the highest card in the sequence.
- Example: 9-high straight flush beats a 6-high straight flush.
- A-2-3-4-5 of the same suit is the lowest straight flush (a "steel wheel").
- Probability: ~0.00139% (1 in 72,193)

### 3. Four of a Kind (Quads)

Four cards of the same rank plus one kicker.

```
9♣  9♦  9♥  9♠  K♠
```

- Ranked by the quad rank first, then the kicker.
- Four Kings beats four Jacks, regardless of the kicker.
- Probability: ~0.024% (1 in 4,165)

### 4. Full House (Full Boat)

Three of a kind combined with a pair.

```
Q♥  Q♣  Q♠  8♦  8♣
```

- Ranked by the three-of-a-kind first, then the pair.
- Queens full of Eights beats Jacks full of Aces.
- Probability: ~0.144% (1 in 694)

### 5. Flush

Five cards of the same suit, not in sequence.

```
A♦  J♦  8♦  6♦  3♦
```

- Ranked by the highest card, then second highest, and so on.
- A♦-J♦-8♦-6♦-3♦ beats K♣-Q♣-J♣-9♣-2♣ because Ace beats King.
- If the highest cards tie, compare the second highest, etc.
- Probability: ~0.197% (1 in 509)

### 6. Straight

Five consecutive cards of mixed suits.

```
5♣  6♦  7♠  8♥  9♣
```

- Ranked by the highest card in the sequence.
- A-K-Q-J-10 is the highest straight ("Broadway").
- A-2-3-4-5 is the lowest straight (the "wheel"). The Ace plays low.
- K-A-2-3-4 is NOT a valid straight — no wrapping allowed.
- Probability: ~0.392% (1 in 255)

### 7. Three of a Kind (Trips / Set)

Three cards of the same rank plus two unrelated kickers.

```
7♣  7♦  7♠  K♥  2♣
```

- Ranked by the trip rank first, then the kickers.
- A "set" means you hold a pocket pair and one matches the board.
- "Trips" means two of the three are on the board.
- Probability: ~2.11% (1 in 47)

### 8. Two Pair

Two separate pairs plus one kicker.

```
J♥  J♣  4♠  4♦  A♣
```

- Ranked by the higher pair first, then the lower pair, then the kicker.
- Jacks and Fours with an Ace kicker beats Tens and Nines with a King kicker.
- Probability: ~4.75% (1 in 21)

### 9. One Pair

Two cards of the same rank plus three kickers.

```
10♥  10♠  A♦  8♣  3♥
```

- Ranked by the pair first, then kickers in descending order.
- A pair of Tens with A-8-3 beats a pair of Tens with K-Q-J (Ace kicker wins).
- Probability: ~42.26% (1 in 2.4)

### 10. High Card

No matching ranks, no straight, no flush. Just five unrelated cards.

```
A♣  J♦  9♠  6♥  3♣
```

- Ranked by the highest card, then second, and so on.
- Ace-high beats King-high. K-Q-J-9-8 beats K-Q-J-9-7.
- Probability: ~50.12% (1 in 2)

### Hand Rankings Summary Table

| Rank | Hand            | Example             | Frequency   |
|------|-----------------|---------------------|-------------|
| 1    | Royal Flush     | A-K-Q-J-10 suited   | 1 in 649,740 |
| 2    | Straight Flush  | 5-6-7-8-9 suited    | 1 in 72,193  |
| 3    | Four of a Kind  | 9-9-9-9-K           | 1 in 4,165   |
| 4    | Full House      | Q-Q-Q-8-8           | 1 in 694     |
| 5    | Flush           | A-J-8-6-3 suited    | 1 in 509     |
| 6    | Straight        | 5-6-7-8-9 rainbow   | 1 in 255     |
| 7    | Three of a Kind | 7-7-7-K-2           | 1 in 47      |
| 8    | Two Pair        | J-J-4-4-A           | 1 in 21      |
| 9    | One Pair        | 10-10-A-8-3         | 1 in 2.4     |
| 10   | High Card       | A-J-9-6-3           | 1 in 2       |

---

## Table Setup and Positions

### The Dealer Button

A circular marker (the "button") rotates clockwise around the table after each hand. The player with the button is in the most advantageous position because they act last in every betting round after the flop.

### Positions

Positions are named relative to the dealer button. Position is critically important in poker — acting later gives you more information.

```
             [Small Blind]
          [Big Blind]
       [UTG]  (Under the Gun)
     [UTG+1]
   [Middle Position]
  [Hijack]
 [Cutoff]
[Button / Dealer]      ← Acts last (best position)
```

| Position | Abbreviation | Notes |
|----------|-------------|-------|
| **Button (Dealer)** | BTN | Best position. Acts last on all post-flop streets. |
| **Small Blind** | SB | Posts the small forced bet. Acts second-to-last pre-flop, first post-flop. |
| **Big Blind** | BB | Posts the large forced bet (usually 2x the small blind). Acts last pre-flop, second post-flop. |
| **Under the Gun** | UTG | First to act pre-flop. Worst position. |
| **UTG+1** | UTG+1 | Second to act pre-flop. |
| **Middle Position** | MP | Middle of the action. |
| **Hijack** | HJ | Two seats right of the button. |
| **Cutoff** | CO | One seat right of the button. Second-best position. |

### Early, Middle, and Late Position

- **Early Position (EP):** UTG, UTG+1 — You act first, so you need strong hands.
- **Middle Position (MP):** MP, Hijack — Moderate hands are playable.
- **Late Position (LP):** Cutoff, Button — You can play a wider range because you see what everyone else does first.
- **The Blinds:** SB, BB — You have the worst post-flop position but get a discount on entering the pot.

---

## Game Flow

A complete hand of Texas Hold'em follows this sequence:

### Step 1: Post Blinds

The two players to the left of the dealer button post forced bets:
- **Small Blind (SB):** Half the minimum bet (e.g., 50 chips).
- **Big Blind (BB):** The full minimum bet (e.g., 100 chips).

These forced bets create initial action and give players something to compete for.

### Step 2: Deal Hole Cards

Each player receives **two cards face-down**. Only you can see your own hole cards. These are your private cards for the entire hand.

### Step 3: Pre-Flop Betting Round

- Action starts with the player to the left of the Big Blind (Under the Gun).
- Proceeds clockwise around the table.
- Each player may **fold**, **call** (match the big blind), or **raise**.
- The Big Blind acts last and may **check** if no one raised, or call/raise.
- Betting continues until all players have acted and all bets are equal.

### Step 4: The Flop

Three community cards are dealt face-up in the center of the table. All players share these cards.

```
[  5♥  ]  [  J♣  ]  [  K♦  ]
```

A second betting round follows, starting with the first active player to the left of the button. Players may **check** or **bet**.

### Step 5: The Turn (Fourth Street)

One additional community card is dealt face-up.

```
[  5♥  ]  [  J♣  ]  [  K♦  ]  [  9♠  ]
```

A third betting round follows, using the same rules as the flop.

### Step 6: The River (Fifth Street)

The fifth and final community card is dealt face-up.

```
[  5♥  ]  [  J♣  ]  [  K♦  ]  [  9♠  ]  [  2♦  ]
```

A fourth and final betting round follows.

### Step 7: Showdown

If two or more players remain after the final betting round, they reveal their cards. The player with the best five-card hand wins the pot.

- Players choose the best five cards from the seven available (2 hole + 5 community).
- You can use both hole cards, one hole card, or even neither (play the board).
- If hands are tied, the pot is split equally.

### Visual Flow Summary

```
Blinds Posted → Hole Cards Dealt → Pre-Flop Betting
     → Flop (3 cards) → Flop Betting
     → Turn (1 card) → Turn Betting
     → River (1 card) → River Betting
     → Showdown
```

---

## Betting Actions

On each turn, a player can take one of the following actions:

### Fold

Discard your hand and forfeit any chips already in the pot. You are out of the hand.

- Costs nothing additional.
- You lose all chips invested so far.
- Use when your hand is too weak to continue.

### Check

Pass the action to the next player without betting. Only available if no one has bet in the current round.

- Costs nothing.
- You remain in the hand.
- Only possible if no bet has been made (or you are the Big Blind pre-flop with no raise).

### Call

Match the current bet to stay in the hand.

- You put in exactly the amount needed to match the highest bet.
- Example: If someone bet 200, you pay 200 to call.

### Raise

Increase the bet. All other players must then at least call your new amount.

- Minimum raise: At least the size of the previous raise (or the big blind if no raise yet).
- Example: Blinds are 50/100. Player A raises to 300 (a raise of 200). Player B wants to re-raise — the minimum re-raise is 200 more, so the minimum is 500.
- No maximum in No-Limit Hold'em (you can raise up to your entire stack).

### All-In

Bet all of your remaining chips. This happens when you want to bet or call but do not have enough chips.

- You are still eligible to win the pot (up to the amount you matched from each player).
- If others continue betting, a side pot is created.
- You cannot be "bet out" of a hand — you always get to see the showdown if you go all-in.

### Betting Action Summary

| Action | Cost | When Available |
|--------|------|----------------|
| Fold | Free (forfeit pot) | Always |
| Check | Free | When no bet has been made |
| Call | Match current bet | When a bet or raise has been made |
| Raise | Increase the bet | When a bet has been made (or open the betting) |
| All-In | Your entire stack | Always (may create side pots) |

---

## Betting Rounds in Detail

### Pre-Flop

- Blinds are already posted (SB and BB).
- Action begins with UTG (player to the left of BB).
- Minimum bet is the Big Blind amount.
- Big Blind acts last and has the option to check (if no raise) or raise.
- If everyone folds to the Big Blind, the BB wins the small blind.

### Post-Flop (Flop, Turn, River)

- Action begins with the first active player to the left of the button.
- No forced bets — the round starts at zero.
- Players may check or bet.
- Once a bet is made, subsequent players must fold, call, or raise.
- The round ends when all active players have matched the highest bet or checked.

### Completing the Betting Round

A betting round is complete when one of the following happens:

1. All players except one have folded. The remaining player wins the pot.
2. All active players have put in the same amount and had a chance to act.
3. A player is all-in and all other players have acted.

---

## Pot Calculation and Side Pots

### The Main Pot

All bets go into a central pot. The winner of the hand takes the entire pot.

### Side Pots

Side pots are created when a player goes all-in for less than the full bet amount.

**Example:**

- Player A has 500 chips and goes all-in.
- Player B has 1,500 chips and calls.
- Player C has 2,000 chips and calls.

The main pot has 1,500 chips (500 from each player). Players A, B, and C compete for this pot.

A side pot of 2,000 chips (1,000 from B and 1,000 from C) is created. Only Players B and C can win this side pot.

**Resolution:**

1. First, determine the winner of the side pot (between B and C only).
2. Then, determine the winner of the main pot (among A, B, and C).
3. It is possible for one player to win the main pot and a different player to win the side pot.

### Multiple Side Pots

If multiple players go all-in for different amounts, multiple side pots are created. Each side pot is resolved separately, starting from the smallest.

### Pot Splitting

If two or more players have exactly the same hand at showdown, the pot is split equally. If the pot cannot be divided evenly, the remainder chip goes to the player closest to the left of the button.

---

## Showdown Rules

### When Does a Showdown Occur?

A showdown happens when the final betting round is complete and two or more players remain.

### Who Shows First?

- The last player to bet or raise on the river shows first.
- If everyone checked on the river, the first player to the left of the button shows first.
- Other players then reveal in clockwise order.

### Mucking

- A player may choose to "muck" (discard without showing) if they know they are beaten.
- In casual games, losing players often muck to hide their cards.
- The winning player must always show their hand if requested.

### Using the Board

- You can use any combination of your hole cards and community cards.
- "Playing the board" means using all five community cards as your hand.
- If you play the board, the best you can do is tie with anyone else who plays the board.

### Determining the Winner

1. Each remaining player makes their best five-card hand from seven cards.
2. Compare hands using the hand rankings.
3. Higher-ranked hand wins.
4. If ranks are tied, compare individual card ranks (kickers).
5. If hands are identical, split the pot.

---

## Special Situations

### Heads-Up Play (2 Players)

When only two players remain at the table:
- The Button posts the Small Blind and acts first pre-flop.
- The other player posts the Big Blind and acts second pre-flop.
- Post-flop, the Big Blind acts first.

### Running Out of Cards

In rare cases with many players (10 at a table), there may not be enough cards. This almost never happens in practice because most players fold before the river.

### Exposed Cards

If a card is accidentally exposed during the deal, different rules apply depending on the venue. In this game, exposed cards trigger a re-deal.

### Disconnection

If a player disconnects during an online hand, they are treated as all-in for their current bet. The hand plays out to showdown automatically.

### String Bets

In live poker, you must announce your raise before placing chips, or put the total amount in one motion. In this game, the interface prevents string betting.

---

## Basic Strategy

This section provides foundational strategy tips to get you started. For advanced strategies, see the [Poker Strategy Guide](poker-strategy.md).

### Starting Hand Selection

Not all starting hands are equal. Here is a simplified grouping:

**Premium Hands (Always Raise):**
- AA, KK, QQ, JJ
- AK suited

**Strong Hands (Raise in Most Positions):**
- 10-10, 99
- AK offsuit, AQ suited, AQ offsuit
- KQ suited

**Playable Hands (Raise in Late Position, Call in Middle):**
- 88, 77, 66
- AJ, AT suited
- KQ offsuit, KJ suited, QJ suited

**Speculative Hands (Play Cheaply from Late Position):**
- 55, 44, 33, 22
- Suited connectors (87s, 76s, 65s)
- Suited aces (A5s, A4s, A3s)

**Trash Hands (Fold):**
- Anything not listed above, especially:
- 72 offsuit (the worst hand in poker)
- Unconnected, unsuited low cards

### Position Play

- **Play tighter in early position.** You act first and have no information.
- **Play wider in late position.** You see what others do before you act.
- **Attack the blinds from the button and cutoff.** If everyone folds to you in late position, raise with a wide range to steal the blinds.
- **Defend your big blind wisely.** You already have chips invested, so you can call with weaker hands, but do not call with trash.

### Pot Odds

Pot odds help you decide whether calling a bet is mathematically profitable.

**Formula:**
```
Pot Odds = Cost to Call / (Total Pot + Cost to Call)
```

**Example:**
The pot is 300. Your opponent bets 100. You must call 100 to compete for a pot of 500.
```
Pot Odds = 100 / 500 = 20%
```
If your chance of winning is greater than 20%, calling is profitable in the long run.

### Common Outs

| Draw | Outs | Approximate % on Turn | Approximate % on River |
|------|------|-----------------------|------------------------|
| Flush draw | 9 | 19% | 19.6% |
| Open-ended straight draw | 8 | 17% | 17.4% |
| Gutshot straight draw | 4 | 8.5% | 8.7% |
| Two overcards | 6 | 12.8% | 13% |
| Set to full house/quads | 7 | 14.9% | 15.2% |

**Quick Rule of Thumb:**
- Multiply your outs by 2 to get the approximate percentage per street.
- Multiply your outs by 4 if you are on the flop with two cards to come.

### Bet Sizing

- **Value bets:** Bet 50-75% of the pot when you have a strong hand and want to be called.
- **Bluffs:** Use the same sizing as your value bets so opponents cannot tell the difference.
- **Small bets:** 25-33% of the pot as continuation bets on dry boards.
- **Overbets:** More than 100% of the pot to put maximum pressure on opponents.

---

## Glossary

| Term | Definition |
|------|------------|
| **All-In** | Betting all of your remaining chips. |
| **Ante** | A forced bet posted by all players before the deal (not used in standard Hold'em). |
| **Backdoor** | A draw that requires hitting cards on both the turn and river. |
| **Bad Beat** | Losing a hand despite being a heavy favorite. |
| **Barrel** | Betting on consecutive streets (double-barrel = betting flop and turn). |
| **Big Blind (BB)** | The larger of the two forced bets, posted by the player two seats left of the button. |
| **Blank** | A community card that appears to help no one. |
| **Bluff** | Betting or raising with a weak hand to make opponents fold. |
| **Board** | The five community cards in the center of the table. |
| **Broadway** | The highest straight: A-K-Q-J-10. Also refers to any card 10 or higher. |
| **Button (BTN)** | The dealer position, marked with a circular disc. Best position at the table. |
| **Buy-In** | The amount of chips required to join a game. |
| **C-Bet** | A continuation bet: betting the flop after raising pre-flop. |
| **Call** | Matching the current bet. |
| **Check** | Passing without betting when no bet has been made. |
| **Check-Raise** | Checking and then raising after an opponent bets. A powerful play. |
| **Community Cards** | The five shared cards dealt face-up on the board. |
| **Cutoff (CO)** | The position one seat to the right of the button. |
| **Donk Bet** | Betting into the pre-flop raiser out of position on the flop. |
| **Drawing Dead** | Having no possible cards that can give you the winning hand. |
| **Early Position** | The first few seats to act (UTG, UTG+1). |
| **Equity** | Your mathematical share of the pot based on your chances of winning. |
| **Expected Value (EV)** | The average amount you expect to win or lose from a decision over time. |
| **Fish** | A weak or inexperienced player. |
| **Flop** | The first three community cards dealt simultaneously. |
| **Flush** | Five cards of the same suit. |
| **Fold** | Discarding your hand and forfeiting the pot. |
| **Gutshot** | A straight draw with only one card that completes it (4 outs). |
| **Heads-Up** | A hand or game with only two players. |
| **Hole Cards** | Your two private cards. |
| **Implied Odds** | The ratio of what you expect to win on future streets compared to what you must call now. |
| **Kicker** | The highest unpaired card used to break ties between similar hands. |
| **Late Position** | The last few seats to act (Cutoff, Button). |
| **Limp** | Calling the Big Blind instead of raising pre-flop. Generally considered weak play. |
| **Muck** | To discard your hand without showing it. |
| **Nuts** | The best possible hand given the current board. |
| **Offsuit** | Two hole cards of different suits. Abbreviated with "o" (e.g., AKo). |
| **Open** | The first raise in a betting round. |
| **Outs** | The number of cards remaining in the deck that can improve your hand. |
| **Overcard** | A card in your hand higher than any card on the board. |
| **Pocket Pair** | A pair in your hole cards (e.g., 77). |
| **Position** | Your seat relative to the dealer button, determining when you act. |
| **Pot** | The total chips wagered in the current hand. |
| **Pot Odds** | The ratio of the current pot size to the cost of calling a bet. |
| **Pre-Flop** | The betting round after hole cards are dealt but before the flop. |
| **Rainbow** | A flop with three different suits (no flush draw possible). |
| **Raise** | Increasing the current bet. |
| **Range** | The set of hands a player could have in a given situation. |
| **River** | The fifth and final community card. |
| **Semi-Bluff** | Bluffing with a hand that can improve to the best hand (e.g., a flush draw). |
| **Set** | Three of a kind when you hold a pocket pair and one matches the board. |
| **Shark** | A strong, skilled player. |
| **Short Stack** | A player with fewer chips than the table average. |
| **Showdown** | Revealing hands at the end to determine the winner. |
| **Slow Play** | Playing a strong hand weakly to trap opponents into betting. |
| **Small Blind (SB)** | The smaller of the two forced bets, posted by the player immediately left of the button. |
| **Straight** | Five consecutive cards of mixed suits. |
| **Suited** | Two hole cards of the same suit. Abbreviated with "s" (e.g., AKs). |
| **Tell** | A behavioral clue that reveals information about a player's hand. |
| **Tilt** | Playing poorly due to frustration or emotional distress. |
| **Trips** | Three of a kind when two of the three matching cards are on the board. |
| **Turn** | The fourth community card. |
| **Under the Gun (UTG)** | The position immediately left of the Big Blind. First to act pre-flop. |
| **Value Bet** | Betting with a strong hand to extract chips from opponents who will call with worse. |
| **Wheel** | The lowest possible straight: A-2-3-4-5. |

---

*For more advanced strategies, see [Poker Strategy Guide](poker-strategy.md).*
*For a complete interactive tutorial, play through the Poker Tutorial mode in-game.*
