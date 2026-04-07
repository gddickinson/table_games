/**
 * blackjack-dialogue.js - Character-specific Blackjack dialogue
 * Exports under root.MJ.Blackjack.Dialogue
 */
(function(exports) {
    var root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Blackjack = root.MJ.Blackjack || {};

    var BLACKJACK_DIALOGUE = {
        mei: {
            game_start: ['Basic strategy says this is optimal.', 'The count is in our favor.'],
            blackjack: ['Natural 21! Statistically inevitable eventually.', 'The math works!'],
            bust: ['I calculated that risk...', 'Variance happens.'],
            dealer_bust: ['Expected outcome given the upcard.', 'The dealer was always going to bust there.'],
            double_down: ['The expected value is positive.', 'Doubling is correct here.'],
            win: ['Positive expected value confirmed.', 'As the numbers predicted.'],
            lose: ['A negative variance swing.', 'The long run will correct this.'],
            push: ['A push. Statistically common.', 'Break even. The math is neutral here.'],
            insurance: ['Insurance is a sucker bet. The math says no.', 'Never take insurance unless the count is very high.'],
            split: ['Splitting is correct per basic strategy.', 'Two hands are better than one here.'],
            idle: ['The house edge in blackjack is only 0.5% with perfect play.', 'Card counting is just applied statistics.']
        },
        kenji: {
            game_start: ['Hit me!', 'I FEEL a blackjack coming!'],
            blackjack: ['BOOM! BLACKJACK BABY!', 'NATURAL!'],
            bust: ['ONE MORE CARD! Why did I-- okay. Next hand.', 'Bust?! BUST?!'],
            dealer_bust: ['HA! Take THAT, dealer!', 'Justice!'],
            double_down: ['Double or nothing! Let\'s GO!', 'ALL IN on this one!'],
            win: ['WINNER WINNER!', 'That\'s what I\'m talking about!'],
            lose: ['Rigged! RIGGED!', 'The dealer got lucky. AGAIN.'],
            push: ['A TIE?! That\'s the WORST outcome!', 'Push?! I wanted to WIN!'],
            insurance: ['Insurance? Sure, why not! YOLO!', 'I\'ll take that bet!'],
            split: ['TWO hands! Double the chaos!', 'Split \'em! More cards more fun!'],
            idle: ['Blackjack is just vibes and luck!', 'I once hit on 20. Don\'t ask.']
        },
        yuki: {
            game_start: ['Patience at the table.', 'The cards come as they will.'],
            blackjack: ['A gift from the deck.', 'Twenty-one. How elegant.'],
            bust: ['One too many. A lesson in restraint.', 'The card was honest. I was greedy.'],
            dealer_bust: ['The house doesn\'t always win.', 'Even the dealer follows rules.'],
            double_down: ['A calculated moment of courage.', 'Takeshi would say: trust the numbers.'],
            win: ['The cards favored patience.', 'A quiet victory.'],
            lose: ['The table teaches humility.', 'Every loss carries a lesson.'],
            push: ['Neither win nor loss. A moment of balance.', 'The universe returns what was given.'],
            insurance: ['Insurance is a hedge against fear. I prefer clarity.', 'I will trust the hand I have.'],
            split: ['Dividing to conquer. An old strategy.', 'Two paths from one choice.'],
            idle: ['In blackjack, the house has rules too. There is fairness in that.', 'Takeshi loved this game. He said it was honest.']
        }
    };

    /**
     * Get a random dialogue line for a character and situation.
     * @param {string} character - 'mei', 'kenji', 'yuki'
     * @param {string} situation - e.g. 'game_start', 'blackjack', 'bust', etc.
     * @returns {string|null}
     */
    function getDialogue(character, situation) {
        var charDialogue = BLACKJACK_DIALOGUE[character];
        if (!charDialogue) return null;
        var lines = charDialogue[situation];
        if (!lines || lines.length === 0) return null;
        return lines[Math.floor(Math.random() * lines.length)];
    }

    /**
     * Get dialogue for a game event from all characters.
     * @param {string} situation
     * @returns {Object} {mei: string, kenji: string, yuki: string}
     */
    function getAllDialogue(situation) {
        return {
            mei: getDialogue('mei', situation),
            kenji: getDialogue('kenji', situation),
            yuki: getDialogue('yuki', situation)
        };
    }

    /**
     * Get all available dialogue situations.
     * @returns {string[]}
     */
    function getSituations() {
        var situations = {};
        for (var char in BLACKJACK_DIALOGUE) {
            if (BLACKJACK_DIALOGUE.hasOwnProperty(char)) {
                for (var sit in BLACKJACK_DIALOGUE[char]) {
                    if (BLACKJACK_DIALOGUE[char].hasOwnProperty(sit)) {
                        situations[sit] = true;
                    }
                }
            }
        }
        return Object.keys(situations);
    }

    // Export
    root.MJ.Blackjack.Dialogue = {
        BLACKJACK_DIALOGUE: BLACKJACK_DIALOGUE,
        getDialogue: getDialogue,
        getAllDialogue: getAllDialogue,
        getSituations: getSituations
    };

})(typeof window !== 'undefined' ? window : global);
