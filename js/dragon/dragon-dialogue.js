/**
 * dragon-dialogue.js — Scripted dialogue banks and Ollama LLM integration
 * for the D&D dragon battle game.
 * Exports under window.MJ.Dragon.Dialogue (IIFE module).
 */
(function(exports) {
  'use strict';

  var root = typeof window !== 'undefined' ? window : exports;
  root.MJ = root.MJ || {};
  root.MJ.Dragon = root.MJ.Dragon || {};

  // =========================================================================
  // 1. Character Dialogue Banks
  // =========================================================================

  var DIALOGUE = {
    kenji: {
      attack_hit:    ["TAKE THAT, OVERGROWN GECKO!", "HAHA! DID THAT HURT?!", "RIGHT IN THE SNOUT!"],
      attack_miss:   ["WHAT?! HOLD STILL, LIZARD!", "I WASN'T EVEN TRYING!", "MY AXE DEMANDS A REMATCH!"],
      critical_hit:  ["RAAAGH! THAT'S HOW WE CHOP VEGGIES AT THE RAMEN SHOP!", "CRITICAL! FEEL THE FURY!", "NOW THAT'S A HIT! KENJI SPECIAL!"],
      take_damage:   ["THAT'S NOTHING COMPARED TO A LUNCH RUSH!", "HA! MY GRANDMA HITS HARDER!", "IS THAT ALL YOU GOT?!"],
      heavy_damage:  ["OKAY... THAT ONE STUNG A LITTLE!", "I'M NOT DONE! NOT BY A LONG SHOT!", "YOU'LL HAVE TO DO BETTER THAN THAT TO STOP ME!"],
      rage:          ["RAAAAAAGH! NOW I'M ANGRY!", "YOU WOULDN'T LIKE ME WHEN I'M ANGRY!", "THE RAGE FLOWS! COME AT ME, LIZARD!"],
      ally_down:     ["GET UP! WE'RE NOT DONE HERE!", "NO! I'LL MAKE THIS DRAGON PAY!", "HANG ON! KENJI'S COMING!"],
      ally_healed:   ["GOOD, NOW GET BACK IN THERE!", "ABOUT TIME! LET'S GO!", "WELCOME BACK TO THE FIGHT!"],
      self_healed:   ["THAT'S THE STUFF! ROUND TWO!", "I FEEL LIKE A NEW MAN! A VERY ANGRY NEW MAN!", "THANKS! NOW WATCH THIS!"],
      victory:       ["HAHAHA! WHO'S THE LIZARD NOW?!", "THAT'S WHAT HAPPENS WHEN YOU MESS WITH KENJI!", "FREE RAMEN FOR EVERYONE! MY TREAT!"],
      defeat:        ["NO... I WON'T... FALL...", "THE RAMEN SHOP... SOMEONE TELL THEM...", "NOT... LIKE THIS..."],
      near_death:    ["I CAN STILL FIGHT! JUST... GIVE ME A SECOND!", "I'VE HAD WORSE! ...ACTUALLY NO I HAVEN'T!", "STILL STANDING!"],
      idle:          ["COME ON, WHAT ARE WE WAITING FOR?!", "I'M GETTING BORED HERE!", "LET'S SMASH SOMETHING ALREADY!"],
      battle_start:  ["FINALLY! LET'S DO THIS!", "COME AT ME, LIZARD!", "TIME TO EARN MY RAMEN!"],
      breath_weapon_incoming: ["EVERYBODY MOVE! NOW!", "INCOMING! GET BEHIND SOMETHING!", "OH THAT'S A BIG FIRE!"],
      dragon_roar:   ["ROAR ALL YOU WANT! I'VE HEARD LOUDER AT KARAOKE!", "NICE LUNGS! MINE ARE BETTER! RAAAGH!", "IS THAT SUPPOSED TO SCARE ME?!"],
      taunt:         ["HEY UGLY! OVER HERE!", "YOUR MOTHER WAS A SALAMANDER!", "I'VE FOUGHT SCARIER SOUP POTS!"],
      big_hit:       ["YEAH! THAT'S HOW IT'S DONE!", "NOW THAT'S WHAT I CALL A HIT! RAMEN-POWERED!", "HAHA! DID YOU SEE THAT?! BEAUTIFUL!", "KEEP HITTING IT! DON'T STOP!"],
      critical:      ["OHHH! RIGHT IN THE SOFT SPOT!", "CRITICAL! THAT'S WHAT I'M TALKING ABOUT!", "NOW WE'RE COOKING! EXTRA SPICY!", "BOOM! THAT'S GONNA LEAVE A MARK!"],
      ally_hurt:     ["HEY! NOBODY HURTS MY FRIENDS!", "HANG IN THERE! KENJI'S GOT YOUR BACK!", "THAT DOES IT! NOW I'M REALLY MAD!", "GET BEHIND ME! I'LL HANDLE THIS!"],
      dragon_wounded: ["IT'S BLEEDING! KEEP PUSHING!", "THE LIZARD'S SLOWING DOWN! PILE ON!", "I CAN SMELL VICTORY! AND RAMEN!", "WE'VE GOT IT ON THE ROPES!"],
      dragon_desperate: ["IT'S ALMOST DONE! ONE MORE BIG HIT!", "DON'T LET UP! FINISH THIS OVERGROWN GECKO!", "I CAN TASTE THE VICTORY RAMEN ALREADY!", "THIS ENDS NOW! FOR THE RAMEN SHOP!"],
      round_start:   ["NEW ROUND! LET'S GO!", "STILL STANDING! COME AT ME!", "ROUND TWO HUNDRED! JUST KIDDING! LET'S FIGHT!", "I COULD DO THIS ALL DAY!"],
      encouragement: ["YOU GOT THIS! WE ALL GOT THIS!", "TEAM KENJI NEVER LOSES!", "COME ON EVERYONE! FIGHT HARDER!", "WE'RE WINNING! I CAN FEEL IT!"],
      banter:        ["ANYONE ELSE HUNGRY? JUST ME?", "THIS REMINDS ME OF THE LUNCH RUSH!", "WHEN THIS IS OVER, RAMEN'S ON ME!", "MY AXE IS THIRSTY AND SO AM I!"]
    },

    mei: {
      attack_hit:    ["Strike connected. Adjusting trajectory for next swing.", "Hit confirmed. Damage within expected range.", "Solid contact. Proceeding as planned."],
      attack_miss:   ["Miscalculation. Adjusting angle by three degrees.", "The probability was in my favor, yet here we are.", "Noted. I will not miss twice."],
      critical_hit:  ["Critical strike achieved. Probability was only 5%, but preparation favors the prepared.", "Maximum damage output confirmed.", "Statistically improbable, yet entirely intended."],
      take_damage:   ["Damage received. Still within survivable parameters.", "Pain is temporary. Data is forever.", "Wound noted. Healing priority reassessed."],
      heavy_damage:  ["Warning: hit points critically low. Triage protocol engaged.", "My survival probability has dropped below acceptable thresholds.", "I need healing. The numbers do not lie."],
      heal_cast:     ["Healing probability optimized. You should recover nicely.", "Channeling restorative energy. Hold still for maximum efficiency.", "The expected healing output is 2d8 plus modifier. Brace yourself."],
      ally_down:     ["Ally down! Redirecting healing resources immediately.", "We have a casualty. Everyone, stay in formation while I stabilize them.", "Unconscious but stable. I can fix this."],
      ally_healed:   ["Recovery successful. All vitals within normal range.", "Back on your feet. Try not to make this a habit.", "Healing complete. Your survival probability just increased by 40%."],
      self_healed:   ["Self-repair complete. Returning to optimal performance.", "I have restored my own hit points. Efficient, if I say so myself.", "Back to full capacity. The math works out."],
      victory:       ["Victory achieved. Final damage tallies coming shortly.", "The expected outcome, given our party composition and strategy.", "Well fought, everyone. The statistics favored us today."],
      defeat:        ["This was... not the predicted outcome...", "The probability of failure was only 12%... how...", "I should have... accounted for more variables..."],
      near_death:    ["I am running dangerously low. Someone cover me.", "Three hit points remaining. This is not ideal.", "The expected damage output suggests caution on my part."],
      idle:          ["I am recalculating our optimal formation.", "Everyone, stay in formation.", "Reviewing spell slot allocation for maximum efficiency."],
      battle_start:  ["Analyzing threat level. Everyone, positions please.", "Combat initiated. I have healing prioritized by threat assessment.", "The dragon's CR suggests we proceed with extreme caution."],
      breath_weapon_incoming: ["Breath weapon detected! Spread formation, reduce area damage!", "Scatter! The cone angle is approximately 60 degrees!", "Evasive action! Statistical survival drops 70% in grouped formation!"],
      dragon_roar:   ["Frightful Presence. Everyone, steel your Wisdom saves.", "Psychological attack. Resist it with logic and focus.", "A roar. Loud, but ultimately just displaced air."],
      taunt:         ["Your threat assessment does not concern me, dragon.", "I have calculated seventeen ways this ends badly for you.", "Statistically, you should surrender now."],
      big_hit:       ["Excellent strike! Damage output exceeded expectations.", "That blow was statistically significant. Well done.", "Impact force: impressive. Keep that up.", "Above-average damage. The numbers favor us."],
      critical:      ["Critical hit confirmed! The probability gods smile upon us.", "A 5% chance, executed perfectly. Beautiful.", "Maximum damage variance achieved. Textbook critical.", "That critical alone shifts our win probability by 8%."],
      ally_hurt:     ["Ally damage sustained. Recalculating healing priority.", "Injuries noted. I am adjusting my triage queue.", "Hold on! My healing resources are allocated for you.", "Damage intake is exceeding my healing throughput. Be careful!"],
      dragon_wounded: ["Dragon HP below 50%. We have entered the favorable zone.", "The data suggests we are winning. Maintain pressure.", "Damage accumulation is on track. Continue current strategy.", "The dragon's combat effectiveness should decrease proportionally."],
      dragon_desperate: ["Dragon HP critical. Victory probability now exceeds 80%.", "The endgame approaches. Conserve resources for the final push.", "Almost there. Do not become reckless with victory in sight.", "Three more rounds of sustained damage should suffice."],
      round_start:   ["New round. Recalculating optimal spell slot allocation.", "Reviewing party vitals. Everyone, report your status.", "Round begins. Healing priorities are updated.", "Adjusting strategy based on accumulated combat data."],
      encouragement: ["Your performance metrics are excellent. Keep it up.", "We are operating at 94% tactical efficiency. Well done, everyone.", "The math says we win this. Trust the numbers.", "Statistically, this party is performing above expected parameters."],
      banter:        ["I wonder if the dragon has considered surrendering based on the odds.", "My healing log for this battle will make an excellent research paper.", "Has anyone else noticed the fascinating acoustic properties of this cave?", "I am keeping a detailed damage spreadsheet. For science."]
    },

    yuki: {
      attack_hit:    ["The quill is mightier, but the staff works in a pinch.", "A satisfying connection, if inelegant.", "Even wizards must resort to the direct approach sometimes."],
      attack_miss:   ["How vexing. Even Homer nodded, I suppose.", "A miss. The universe has a sense of dramatic irony.", "I shall have to consult my notes on aim."],
      critical_hit:  ["As they say, fortune favors the bold!", "A masterwork of applied force! The muses approve.", "The arcane energies align in devastating fashion!"],
      take_damage:   ["Pain is merely the body's critique of one's positioning.", "A flesh wound. I have suffered worse from paper cuts in the library.", "The dragon makes a compelling counterargument."],
      heavy_damage:  ["I am reminded that wizards are traditionally fragile...", "This may be the end of my story, though I hope for a sequel.", "Knowledge is the greatest weapon... but I could use a shield right now."],
      spell_cast:    ["The arcane energies align. Witness true power!", "As Tolkien wrote, even the smallest spell can change the course of battle.", "Incantation complete. Stand back and observe."],
      ally_down:     ["No! This chapter cannot end here for them!", "A fallen comrade. We must write a better ending than this.", "Hold on! Every great story has a moment of darkness before the dawn."],
      ally_healed:   ["Rise, friend! Your story is not yet finished.", "Welcome back to the narrative. We missed your contributions.", "A resurrection worthy of the great epics!"],
      self_healed:   ["I return to the fray, wiser for the experience.", "A brief intermission, nothing more.", "The pen is refilled. Where were we?"],
      victory:       ["And so the dragon falls, as all tyrants must.", "A tale worthy of the great bards! I shall document everything.", "As the poets say: sic semper draconibus."],
      defeat:        ["So this is how the story ends... not with triumph, but...", "Even tragedies have their beauty...", "The final chapter... written in fire..."],
      near_death:    ["I am barely standing, but the mind endures.", "The body falters, yet the spirit remains unbroken.", "A cliffhanger, if ever there was one."],
      idle:          ["I wonder what the dragon reads in its spare time.", "Every moment of rest is a chance to prepare the mind.", "The calm before the literary storm."],
      battle_start:  ["A dragon! How delightfully classical.", "And so our quest reaches its climax. How exciting!", "Not all who wander are lost... but this dragon certainly is about to be."],
      breath_weapon_incoming: ["Countermeasures! Shield yourselves!", "Dragon fire! The most cliched yet effective of attacks!", "A classic move from the dragon's repertoire. Dodge accordingly!"],
      dragon_roar:   ["Shakespeare himself could not have written a better villain.", "Impressive acoustics. I give it a seven out of ten.", "The dragon speaks! Though its vocabulary is somewhat limited."],
      taunt:         ["I have read scarier things in children's fairy tales.", "Your fire is impressive, but my intellect burns brighter.", "Knowledge is the greatest weapon, and I am heavily armed."],
      big_hit:       ["A masterful blow! The poets would approve.", "Splendid! That strike had real literary weight to it.", "Now THAT is worthy of an epic verse!", "Such force! Reminds me of Beowulf's final blow."],
      critical:      ["A critical strike of legendary proportions!", "The muses themselves guided that blow!", "As they say in the classics \u2014 a perfect hit!", "The narrative demanded that critical. Destiny itself struck."],
      ally_hurt:     ["No! This is not how the story should unfold!", "Hold fast, friend! Every hero endures trials!", "A dark chapter, but not the final one!", "Courage! The greatest tales require the deepest wounds."],
      dragon_wounded: ["The beast falters! The climax approaches!", "As in all great tales, the villain begins to crack.", "The dragon's narrative arc bends toward defeat.", "We write the final chapter of this wyrm's story!"],
      dragon_desperate: ["The denouement is upon us! Strike true!", "Like Smaug before Bard's arrow \u2014 the end is nigh!", "The final act! Make it worthy of legend!", "One last push! This tale demands a triumphant ending!"],
      round_start:   ["A new chapter of our battle unfolds.", "The next stanza of this combat poem begins.", "Turn the page \u2014 the story continues.", "And so the narrative progresses..."],
      encouragement: ["Take heart! Every great hero faces impossible odds!", "Remember: it is the darkest hour before the dawn of victory!", "We are writing a story worth telling!", "Courage, friends! This is our finest chapter!"],
      banter:        ["I must remember to document the dragon's dialogue patterns.", "This cave has excellent ambiance for a climactic battle.", "I wonder if the dragon appreciates irony.", "Note to self: research flame-resistant quill ink."]
    },

    riku: {
      attack_hit:    ["Didn't see that coming, did ya?", "Right in the soft spot!", "Too easy. Almost feel bad. Almost."],
      attack_miss:   ["Okay, that didn't happen. Nobody saw that.", "Stupid scales! Hold still!", "I blame the lighting in here."],
      critical_hit:  ["BOOM! Right between the scales!", "That's what you get for ignoring the rogue!", "Nice scales. They'll look better as boots."],
      take_damage:   ["Ow! Watch it, that's my good arm!", "Okay, rude.", "Hey! Personal space, dragon!"],
      heavy_damage:  ["This is fine. Everything is fine. I'm fine.", "Anyone got a healing potion? Asking for a friend. The friend is me.", "I'll just... be over here. Behind this rock."],
      sneak_attack:  ["Surprise! Miss me?", "From the shadows, with love.", "They never watch their blind spot. Never."],
      ally_down:     ["No no no! Get up! Come on!", "That's it. This dragon just made it personal.", "Hey! Only I get to annoy them!"],
      ally_healed:   ["Oh good, you're alive. I was NOT worried.", "Welcome back. You owe me for the emotional damage.", "Try not to die again, yeah?"],
      self_healed:   ["Oh sweet relief! I can feel my everything again!", "Thanks! I was getting worried there. Not that I'd admit it.", "Back in business, baby!"],
      victory:       ["We did it! I mean, I did most of the work, but sure, we.", "Dibs on the treasure! Called it!", "So... about that dragon hoard..."],
      defeat:        ["This isn't... how I saw this going...", "Should've stayed in the thieves' guild...", "Tell my fence... I had one last score..."],
      near_death:    ["Okay this is bad. This is very bad.", "If anyone has a plan, NOW would be great!", "I am too young and too pretty for this!"],
      idle:          ["So are we fighting or what?", "I could be picking locks right now.", "Anyone else notice that loose gold coin over there?"],
      battle_start:  ["A dragon. Great. Love it. Totally what I signed up for.", "Okay team, I'll be providing... tactical support. From back here.", "Let's get this over with so I can loot the hoard."],
      breath_weapon_incoming: ["MOVE MOVE MOVE!", "Nope nope nope nope nope!", "Evasion don't fail me now!"],
      dragon_roar:   ["Yeah yeah, big scary roar. I've heard worse from debt collectors.", "Cool. Very intimidating. I'm shaking. See? Shaking.", "My landlord is scarier than you, pal."],
      taunt:         ["Hey dragon! Your hoard? Already spent it. In my head.", "Bet you can't even fit through your own front door!", "For a legendary creature, you're kind of a letdown."],
      big_hit:       ["Nice! ...I mean, I could've done better.", "Okay that was actually impressive. Don't tell them I said that.", "BOOM! That's what I'm talking about!", "Not bad! Almost as good as a sneak attack."],
      critical:      ["Ooh, that's gotta sting! Love it!", "CRIT! The dice gods are on our side today!", "Beautiful! Chef's kiss! *mwah*", "That was SO satisfying. Do it again!"],
      ally_hurt:     ["Hey, watch out! We need you alive for the looting!", "Whoa, that looked painful. And I say that as an expert.", "Down?! Come on, get up! I'm not carrying your share!", "Someone heal them! I need all hands for the treasure haul!"],
      dragon_wounded: ["It's bleeding gold! ...wait, that's just blood. Still good though.", "Ha! The big scary dragon's not so tough after all!", "Keep going! I want this thing dead before dinner!", "Smell that? That's the smell of almost-victory."],
      dragon_desperate: ["It's almost dead! Dibs on the biggest gem!", "Finish it! I've already mentally spent the hoard!", "One more good hit and we're RICH!", "Come on come on come on almost there!"],
      round_start:   ["Another round? Sure, I love overtime.", "Still here. Still stabbing. Living the dream.", "Okay, new round. Time to make bad decisions.", "Round whatever \u2014 let's wrap this up already."],
      encouragement: ["Hey, you got this! Probably! Maybe!", "We're not dead yet! That's basically winning!", "Come on team, think of the LOOT!", "You're all doing great. Seriously. Now fight harder."],
      banter:        ["So... about my cut of the treasure...", "Is it hot in here or is it just the dragon?", "I should've negotiated hazard pay.", "Anyone else's health insurance cover dragon attacks?"]
    },

    tomoe: {
      attack_hit:    ["For honor and justice!", "My blade strikes true!", "The light guides my hand!"],
      attack_miss:   ["I shall not miss again. By my oath.", "A momentary lapse. It will not be repeated.", "The next strike will find its mark."],
      critical_hit:  ["Divine justice strikes without mercy!", "By the sacred oath, a righteous blow!", "The heavens themselves guided that strike!"],
      take_damage:   ["I will not falter!", "Pain is the price of duty. I pay it gladly.", "A wound of honor, nothing more."],
      heavy_damage:  ["I still stand... my oath... demands it...", "I will shield you with my life, and that is no idle boast.", "My body may break, but my spirit will not."],
      smite:         ["By my oath, this beast shall fall! Feel divine wrath!", "Sacred flame, consume this evil!", "Smite! Let the light burn away darkness!"],
      ally_down:     ["I have failed to protect them... Never again!", "Fall back! I will cover the fallen!", "I will shield you with my life. Hold on!"],
      ally_healed:   ["Rise, warrior. Your duty is not yet complete.", "The light restores you. Fight on with renewed purpose.", "Welcome back, comrade. We need your strength."],
      self_healed:   ["The light sustains me. I continue.", "Restored by divine grace. My oath endures.", "I am healed. The fight goes on."],
      victory:       ["Honor is satisfied. The beast is slain.", "By my oath, the dragon falls! Justice prevails!", "We have fulfilled our sacred duty this day."],
      defeat:        ["I have... failed my oath...", "Forgive me... I was not strong enough...", "My shield... was not enough..."],
      near_death:    ["I will not yield! Honor demands we stand firm!", "Still standing. Still fighting. Still sworn.", "One breath left, and I will use it in service."],
      idle:          ["I stand vigilant.", "My shield is ready. My oath is firm.", "Let us proceed with caution and courage."],
      battle_start:  ["Dragon! Face the judgment of the light!", "By my oath, this evil ends today!", "Form up behind me. I will take the first blow."],
      breath_weapon_incoming: ["Behind my shield! Now!", "I will hold the line! Take cover!", "Shield of faith! Everyone, get behind me!"],
      dragon_roar:   ["Your roar does not shake my resolve, beast!", "I have sworn oaths louder than your bellowing.", "Intimidation is the tool of cowards. I do not fear you."],
      taunt:         ["Face me, dragon! Or are you afraid of the light?", "Your evil ends here. I have sworn it.", "Honor demands I give you one chance to flee. This is it."],
      big_hit:       ["A righteous blow! The light guides our arms!", "Well struck! Honor is served!", "That is the power of conviction!", "By my oath, that was a worthy strike!"],
      critical:      ["Divine justice manifests! A critical blow!", "The heavens smile upon that strike!", "A blow worthy of legend! The light prevails!", "Sacred fury given form! Magnificent!"],
      ally_hurt:     ["I will not let another fall! Rally to me!", "By my oath, I will protect you all!", "Hold fast! I am your shield!", "No more! I will stand between you and this beast!"],
      dragon_wounded: ["The beast weakens! Press the advantage!", "Our resolve is stronger than its scales!", "The light pierces even dragonhide! Continue!", "We are winning this righteous battle!"],
      dragon_desperate: ["The beast falls! For honor and glory!", "One final push! By my sacred oath!", "The end draws near! Fight with everything you have!", "This is our moment! Let justice be done!"],
      round_start:   ["I stand ready. My oath endures.", "Another round. My shield arm does not waver.", "The fight continues. My resolve is iron.", "I am prepared. The light guides us."],
      encouragement: ["Take heart, companions! We fight for what is right!", "You are all warriors of great honor!", "Stand firm! We will prevail!", "I believe in each of you. Fight on!"],
      banter:        ["I once swore to slay a dragon. Today I fulfill that oath.", "The light in this cave is terrible. The light in my heart is not.", "My shield has more dents than I can count. Each one a badge of honor.", "After this, I shall need a very long prayer session."]
    },

    sora: {
      attack_hit:    ["Hit.", "Weak spot. Found it.", "Clean shot."],
      attack_miss:   ["Wind shifted.", "Adjusted.", "Next one lands."],
      critical_hit:  ["...nice shot.", "Right through the gap in the scales.", "Perfect."],
      take_damage:   ["Flesh wound.", "Still moving.", "Noted."],
      heavy_damage:  ["...that was close.", "Need cover.", "Bad position. Falling back."],
      hunters_mark:  ["Marked. It's not getting away.", "Tracking. Weak spot. Left flank.", "Hunters mark set. Every shot counts now."],
      ally_down:     ["Cover them. Now.", "Get them up. I'll keep it busy.", "One down. Focus."],
      ally_healed:   ["Good. Keep moving.", "Back up. Stay low.", "Eyes forward."],
      self_healed:   ["Better. Thanks.", "Back in it.", "Moving."],
      victory:       ["It's done.", "Good hunt.", "The cave narrows ahead. Use it. ...oh. We won already."],
      defeat:        ["Wasn't enough...", "...", "Should have seen it coming."],
      near_death:    ["Still breathing.", "Not done.", "One more shot."],
      idle:          ["...", "Watching.", "Move."],
      battle_start:  ["Big target. Stay spread.", "The cave narrows ahead. Use it.", "I'll find high ground."],
      breath_weapon_incoming: ["Incoming. Scatter.", "Move. Now.", "Break formation. Regroup after."],
      dragon_roar:   ["Loud.", "Heard worse in a storm.", "It's angry. Good."],
      taunt:         ["Over here.", "Come get me.", "Slow."],
      big_hit:       ["Solid hit.", "Good. Keep going.", "That'll slow it.", "Clean strike."],
      critical:      ["...nice.", "Critical. Perfect placement.", "Textbook.", "Right through the armor."],
      ally_hurt:     ["Cover them.", "Wounded. Get back.", "Need healing here.", "Fall back. Regroup."],
      dragon_wounded: ["It's hurt. Push.", "Blood trail. Weakening.", "Keep pressure.", "Don't let up."],
      dragon_desperate: ["Almost down.", "One more volley.", "Finish it.", "Nearly done."],
      round_start:   ["Next round.", "Ready.", "Moving.", "Eyes up."],
      encouragement: ["Steady.", "Keep fighting.", "We've got this.", "Hold the line."],
      banter:        ["...", "Wind's shifted.", "Cave's getting warmer.", "Noted."]
    }
  };

  // =========================================================================
  // 2. Dragon Dialogue Bank
  // =========================================================================

  var DRAGON = {
    roar:            ["GRRRAAAAWWWRR!", "ROOOOAAARRR!", "The cave trembles with primal fury!"],
    taunt:           ["YOU DARE ENTER MY DOMAIN?!", "YOUR BONES WILL DECORATE MY HOARD!", "PATHETIC MORTALS! YOU AMUSE ME!", "INSECTS! YOU THINK YOU CAN CHALLENGE ME?!"],
    breath_incoming: ["BURN!", "FEEL THE FLAMES!", "LET FIRE CONSUME YOU!"],
    phase_50:        ["YOU WILL PAY FOR THIS!", "ENOUGH GAMES! NOW I FIGHT FOR REAL!", "YOU HAVE ANGERED ME, MORTALS! WITNESS TRUE POWER!"],
    phase_25:        ["I WILL NOT FALL TO MORTALS!", "NO! THIS CANNOT BE!", "I AM ANCIENT! I AM ETERNAL! I WILL NOT BE DEFEATED!"],
    attack:          ["CRUSH!", "TASTE MY CLAWS!", "FEEL THE WRATH OF AGES!"],
    kill:            ["ONE LESS INSECT TO WORRY ABOUT!", "WHO IS NEXT?!", "FALL BEFORE ME!"],
    victory:         ["YOUR QUEST ENDS HERE, IN FIRE AND ASH!", "THIS IS MY DOMAIN! NONE SHALL LEAVE ALIVE!", "FOOLS. ALL OF YOU."],
    defeat:          ["NO... IMPOSSIBLE... I AM... ETERNAL...", "HOW... MERE MORTALS...", "THIS... CANNOT... BE..."],
    phase_change:    ["YOU THINK YOU ARE WINNING? THIS IS MERELY THE BEGINNING!", "ENOUGH! NOW YOU FACE MY TRUE POWER!", "FOOLS! YOU HAVE ONLY ANGERED ME!", "THE GLOVES COME OFF, MORTALS!"],
    target_healer:   ["THE HEALER DIES FIRST!", "YOUR PRECIOUS CLERIC CANNOT SAVE YOU NOW!", "NO MORE HEALING! I WILL BURN YOUR PRIEST TO ASH!", "STOP MENDING THEIR WOUNDS OR FACE MY WRATH!"],
    multiattack:     ["CLAW! FANG! TAIL! ALL SHALL REND YOU!", "FEEL EVERY WEAPON AT MY DISPOSAL!", "BITE AND SLASH AND CRUSH!", "NONE CAN WITHSTAND THE FURY OF MY FULL ASSAULT!"],
    legendary:       ["YOU THINK MY TURN IS OVER? THINK AGAIN!", "I ACT OUTSIDE THE BOUNDS OF YOUR PITIFUL TURNS!", "LEGENDARY POWER FLOWS THROUGH ME!", "MY ANCIENT MIGHT KNOWS NO LIMITS!"]
  };

  // =========================================================================
  // 3. Narrator Lines
  // =========================================================================

  var NARRATION = {
    battle_start:      ["The party stands united against the ancient terror.", "Torchlight flickers across crimson scales as the dragon stirs.", "The air grows hot. The battle begins."],
    breath_weapon:     ["The dragon rears back, flames licking between its fangs...", "A terrible glow builds in the dragon's throat...", "Heat distorts the air as the dragon inhales deeply..."],
    ally_down:         ["A hero falls! The party must rally!", "One of the brave adventurers collapses!", "A sickening thud as a warrior hits the ground."],
    ally_revived:      ["The fallen hero stirs, life returning to their eyes!", "Healing magic pulls them back from the brink!", "Back on their feet, battered but alive!"],
    critical_hit:      ["A devastating blow! The dragon reels!", "A perfect strike finds its mark!", "The attack connects with tremendous force!"],
    dragon_phase:      ["The dragon's eyes burn with renewed fury!", "Something shifts. The dragon is more dangerous now.", "The beast roars with desperate rage!"],
    dragon_roar:       ["A deafening roar shakes the cave walls...", "The sound is overwhelming, primal, ancient.", "Dust falls from the ceiling as the roar echoes."],
    victory:           ["The great wyrm falls at last! The cave falls silent.", "It is done. The dragon is slain.", "Against all odds, the party stands victorious."],
    defeat:            ["Darkness falls over the brave adventurers...", "The dragon's flames consume the last of the resistance.", "Silence. The dragon returns to its hoard, undisturbed."],
    near_tpk:          ["Only one hero remains standing...", "The situation is dire. Hope flickers like a dying torch.", "One last chance. One last stand."],
    turn_start:        ["The battle rages on!", "Steel and scales clash once more.", "Another round of combat begins."],
    dragon_wounded:    ["Crimson blood seeps from the dragon's wounds.", "The ancient beast is weakening.", "The dragon staggers, but does not fall."],
    round_start:       ["The torchlight flickers as a new round begins...", "Steel clashes against scale as the battle continues.", "The cave trembles with each thunderous exchange.", "Shadows dance on the walls as combat rages on."],
    dragon_phase:      ["The dragon's eyes shift color \u2014 something has changed.", "A new fury ignites in the dragon's gaze. It fights differently now.", "The beast draws upon deeper reserves of ancient power.", "The air itself seems to warp around the dragon as it enters a new phase."],
    environment:       ["Stalactites groan overhead, loosened by the violence below.", "Lava pools bubble and hiss at the edges of the cavern.", "The stench of brimstone and charred stone fills the air.", "The cave walls glow faintly orange, reflecting the dragon's inner fire."],
    tension:           ["The next blow could decide everything.", "Time seems to slow as the battle reaches its critical moment.", "Every breath is sharp, every heartbeat thunder.", "The cave holds its breath \u2014 the outcome hangs by a thread."]
  };

  // =========================================================================
  // 4. Public Dialogue API
  // =========================================================================

  function pick(arr) {
    if (!arr || arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** Get a random dialogue line for a character and situation. */
  function getDialogue(characterId, situation) {
    var id = (characterId || '').toLowerCase();
    var bank = DIALOGUE[id];
    if (!bank) return '';
    var lines = bank[situation];
    return pick(lines);
  }

  /** Get a random dragon dialogue line for a situation. */
  function getDragonDialogue(situation) {
    var lines = DRAGON[situation];
    return pick(lines);
  }

  /** Get a random narrator line for an event. */
  function getNarration(event) {
    var lines = NARRATION[event];
    return pick(lines);
  }

  // =========================================================================
  // 5. Ollama LLM Integration
  // =========================================================================

  var DRAGON_TUTOR_PROMPT =
    'You are an expert D&D 5th Edition combat tutor embedded in a dragon battle game. ' +
    'You help players understand tactical decisions during combat encounters. ' +
    'When advising, reference specific 5e mechanics: Armor Class (AC) and attack rolls, ' +
    'saving throws (STR/DEX/CON/WIS/INT/CHA), spell slot management and conservation, ' +
    'action economy (action, bonus action, reaction, movement), positioning and flanking, ' +
    'cover mechanics (half cover +2 AC, three-quarters cover +5 AC), ' +
    'concentration checks for spells (DC 10 or half damage taken, whichever is higher), ' +
    'opportunity attacks and disengagement, healing efficiency (action vs bonus action), ' +
    'and damage type resistances/vulnerabilities. ' +
    'Keep responses concise (2-3 sentences) and immediately actionable. ' +
    'Frame advice as tactical options, not commands. Reference the specific characters ' +
    'and their abilities when relevant. If a player is about to waste a resource, gently ' +
    'point out the opportunity cost.';

  var DRAGON_CHARACTER_CONTEXT =
    'This is a D&D 5e dragon battle game with 6 party members fighting an adult red dragon ' +
    'in a cave lair. Party members: Kenji (Human Barbarian, melee DPS, Rage ability), ' +
    'Mei (Half-Elf Cleric, healer/support, healing spells and buffs), ' +
    'Yuki (High Elf Wizard, arcane DPS, area spells and control), ' +
    'Riku (Halfling Rogue, stealth/sneak attack, high single-target damage), ' +
    'Tomoe (Human Paladin, tank/off-healer, Divine Smite and Lay on Hands), ' +
    'Sora (Wood Elf Ranger, ranged DPS, Hunter\'s Mark and favored enemy). ' +
    'The dragon has breath weapon (fire cone, recharge 5-6), Frightful Presence, ' +
    'multiattack (bite + 2 claws), tail attack as reaction, and legendary actions. ' +
    'The cave environment offers stalactites for cover, narrow passages to limit ' +
    'the dragon\'s movement, and elevated ledges for ranged advantage.';

  var CHARACTER_VOICE_HINTS = {
    kenji:  'Speak as Kenji: a loud, aggressive barbarian who shouts in ALL CAPS, references his ramen shop, and trash-talks constantly.',
    mei:    'Speak as Mei: a calm, analytical cleric who references statistics, probability, and optimal strategy even mid-combat.',
    yuki:   'Speak as Yuki: an elegant, philosophical wizard who makes literary references and speaks with poetic flair.',
    riku:   'Speak as Riku: a sarcastic, streetwise young rogue who cracks jokes and downplays danger.',
    tomoe:  'Speak as Tomoe: a formal, honor-bound paladin who speaks of oaths, duty, and the light.',
    sora:   'Speak as Sora: a laconic, practical ranger who uses short sentences and focuses on tactics.'
  };

  /**
   * Build a rich prompt for Ollama to generate in-character dialogue.
   * @param {string} characterId - One of the 6 party member IDs.
   * @param {string} situation   - The combat situation triggering dialogue.
   * @param {Object} gameContext - Current game state (hp, enemies, round, etc).
   * @returns {Object} Prompt object with system and user messages.
   */
  function buildCombatPrompt(characterId, situation, gameContext) {
    var id = (characterId || '').toLowerCase();
    var voiceHint = CHARACTER_VOICE_HINTS[id] || 'Speak as a D&D adventurer.';
    var ctx = gameContext || {};

    var systemMsg = DRAGON_CHARACTER_CONTEXT + ' ' + voiceHint +
      ' Keep your response to 1-2 short sentences, in character. Do not break character.';

    var stateLines = [];
    if (ctx.currentHp !== undefined && ctx.maxHp !== undefined) {
      stateLines.push('Your HP: ' + ctx.currentHp + '/' + ctx.maxHp);
    }
    if (ctx.dragonHp !== undefined && ctx.dragonMaxHp !== undefined) {
      stateLines.push('Dragon HP: ' + ctx.dragonHp + '/' + ctx.dragonMaxHp);
    }
    if (ctx.round !== undefined) {
      stateLines.push('Round: ' + ctx.round);
    }
    if (ctx.alliesDown !== undefined && ctx.alliesDown > 0) {
      stateLines.push('Allies down: ' + ctx.alliesDown);
    }
    if (ctx.spellSlots !== undefined) {
      stateLines.push('Spell slots remaining: ' + ctx.spellSlots);
    }
    if (ctx.raging) {
      stateLines.push('You are currently raging.');
    }
    if (ctx.lastAction) {
      stateLines.push('Last action: ' + ctx.lastAction);
    }

    var userMsg = 'Situation: ' + situation + '.\n';
    if (stateLines.length > 0) {
      userMsg += 'Game state: ' + stateLines.join('. ') + '.\n';
    }
    userMsg += 'Respond in character with a short combat quip or reaction.';

    return {
      model: 'llama3',
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user',   content: userMsg }
      ],
      stream: false
    };
  }

  // =========================================================================
  // 6. Module Export
  // =========================================================================

  root.MJ.Dragon.Dialogue = {
    getDialogue:              getDialogue,
    getDragonDialogue:        getDragonDialogue,
    getNarration:             getNarration,
    buildCombatPrompt:        buildCombatPrompt,
    DRAGON_TUTOR_PROMPT:      DRAGON_TUTOR_PROMPT,
    DRAGON_CHARACTER_CONTEXT: DRAGON_CHARACTER_CONTEXT
  };

})(this);
