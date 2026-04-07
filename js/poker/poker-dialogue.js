/**
 * poker-dialogue.js - Poker-specific character dialogue
 * Exports under root.MJ.Poker.Dialogue
 */
(function(exports) {
    const root = typeof window !== 'undefined' ? window : exports;
    root.MJ = root.MJ || {};
    root.MJ.Poker = root.MJ.Poker || {};

    var POKER_DIALOGUE = {
        mei: {
            game_start: [
                'Let\'s play it smart.',
                'I\'ve been studying pot odds.',
                'Probability favors the prepared mind.',
                'Time to put theory into practice.'
            ],
            won_pot: [
                'The math worked out.',
                'Calculated risk, calculated reward.',
                'Expected value positive.',
                'As predicted.'
            ],
            lost_pot: [
                'I should have folded...',
                'The odds were against me.',
                'A statistical anomaly.',
                'I need to re-evaluate my range.'
            ],
            big_bluff: [
                'My heart is racing...',
                'Don\'t look at my hands, they\'re shaking.',
                'I hope my face isn\'t giving anything away.',
                'This is pure variance...'
            ],
            opponent_allin: [
                'That\'s a lot of chips... Let me think.',
                'The risk-reward here...',
                'I need to calculate the implied odds.',
                'Statistically speaking...'
            ],
            idle: [
                'Poker is like data analysis \u2014 patterns everywhere.',
                'In Mahjong you read tiles, in poker you read faces.',
                'I\'ve been tracking everyone\'s bet sizing patterns.',
                'The standard deviation of outcomes in poker is quite high.',
                'Did you know the probability of a Royal Flush is 0.000154%?'
            ],
            fold: [
                'Not this time.',
                'I\'ll wait for better odds.',
                'Discipline is key.'
            ],
            raise: [
                'The numbers support a raise here.',
                'Raising.',
                'I believe I have the edge.'
            ],
            check: [
                'Check.',
                'I\'ll see what develops.',
                'Gathering information.'
            ]
        },
        kenji: {
            game_start: [
                'THIS is my game!',
                'Poker and ramen \u2014 two things I do best.',
                'Let\'s see some ACTION!',
                'Deal me in! I\'m feeling lucky!'
            ],
            won_pot: [
                'READ \'EM AND WEEP!',
                'The pot is MINE!',
                'That\'s how it\'s done!',
                'PAY ME!',
                'BOOM! Nobody saw that coming!'
            ],
            lost_pot: [
                'WHAT?! You had THAT?!',
                'Lucky river...',
                'I\'ll get you next hand.',
                'No way... NO WAY!',
                'That was MY pot!'
            ],
            big_bluff: [
                'You think I\'m bluffing? Call me. I DARE you.',
                'All in, baby!',
                'I\'ve got the NUTS. Probably. Maybe.',
                'My face says it all \u2014 WINNER.'
            ],
            opponent_allin: [
                'Let\'s GO! I\'m not scared!',
                'All in? BRING IT!',
                'You want to dance? LET\'S DANCE!',
                'Ha! You think THAT scares me?!'
            ],
            idle: [
                'Poker is just Mahjong with money and lies.',
                'My poker face? It\'s this face. Always.',
                'I once won a pot with seven-two offsuit. True story.',
                'Patience? What\'s that? RAISE!',
                'In poker, the best hand is the one your opponent THINKS you have.'
            ],
            fold: [
                'Fine... FINE. I fold.',
                'Even I know when to fold. Barely.',
                'This hurts my soul.'
            ],
            raise: [
                'RAISE! Let\'s make this interesting!',
                'Pump it up!',
                'More chips, more fun!'
            ],
            check: [
                'Check... for now.',
                'I\'m just setting the trap!',
                'Check. But don\'t get comfortable.'
            ]
        },
        yuki: {
            game_start: [
                'Ah, poker. A different kind of conversation.',
                'The cards know your intentions.',
                'Every hand tells a story.',
                'Let us see what the evening reveals.'
            ],
            won_pot: [
                'Patience rewarded.',
                'Takeshi played poker too. He was terrible at bluffing.',
                'The river brought clarity.',
                'Sometimes the cards align with the spirit.'
            ],
            lost_pot: [
                'The river is unpredictable, like life.',
                'A lesson in humility.',
                'Even the moon has its dark side.',
                'The cards teach acceptance.'
            ],
            big_bluff: [
                'Sometimes silence speaks louder than a raise.',
                '...',
                'A stone face hides a restless heart.',
                'Truth and deception are two sides of the same chip.'
            ],
            opponent_allin: [
                'Courage or recklessness? Let\'s find out.',
                'The universe asks: how much do you believe?',
                'An interesting proposition.',
                'Takeshi would say: trust your gut, not your eyes.'
            ],
            idle: [
                'In Mahjong, chance deals the tiles. In poker, courage plays the cards.',
                'Takeshi would say: never bluff a philosopher.',
                'The table holds many truths if you know where to look.',
                'Poker is meditation with betting.',
                'Each chip carries the weight of a decision.'
            ],
            fold: [
                'I release these cards.',
                'Not meant to be.',
                'Wisdom is knowing when to let go.'
            ],
            raise: [
                'I sense an opportunity.',
                'The moment feels right.',
                'Raising with intention.'
            ],
            check: [
                'I\'ll observe.',
                'Patience.',
                'The river reveals all in time.'
            ]
        }
    };

    /**
     * Get a random dialogue line for a character and situation.
     * @param {string} character - 'mei', 'kenji', 'yuki'
     * @param {string} situation - e.g. 'game_start', 'won_pot', etc.
     * @returns {string|null}
     */
    function getDialogue(character, situation) {
        var charDialogue = POKER_DIALOGUE[character];
        if (!charDialogue) return null;
        var lines = charDialogue[situation];
        if (!lines || lines.length === 0) return null;
        return lines[Math.floor(Math.random() * lines.length)];
    }

    /**
     * Get dialogue for a game event, checking all characters.
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
     * Get all available situations.
     * @returns {string[]}
     */
    function getSituations() {
        var situations = {};
        for (var char in POKER_DIALOGUE) {
            for (var sit in POKER_DIALOGUE[char]) {
                situations[sit] = true;
            }
        }
        return Object.keys(situations);
    }

    // Export
    root.MJ.Poker.Dialogue = {
        POKER_DIALOGUE: POKER_DIALOGUE,
        getDialogue: getDialogue,
        getAllDialogue: getAllDialogue,
        getSituations: getSituations
    };

})(typeof window !== 'undefined' ? window : global);
