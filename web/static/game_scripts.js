// Loads the game's own classic scripts (IIFEs that attach to window.MJ) into the shell page, in order, once each.
// The Card lab uses this so it runs the game's real evaluators instead of a copy.
const loaded = new Map();

function load(src) {
  if (!loaded.has(src)) {
    loaded.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('could not load ' + src));
      document.head.appendChild(s);
    }));
  }
  return loaded.get(src);
}

// Scripts the lab needs, in the order index.html loads them (cards before the modules that read MJ.Poker.Cards).
export const LAB_SCRIPTS = ['poker/cards.js', 'poker/hand-eval.js', 'blackjack/blackjack-cards.js', 'blackjack/blackjack-ai.js'];

export async function gameMJ(scripts = LAB_SCRIPTS) {
  for (const s of scripts) await load('game/js/' + s);
  return window.MJ;
}
