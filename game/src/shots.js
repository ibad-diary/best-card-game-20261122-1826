// Ember Pact — fixed states for reproducible screenshots.
// ?shot=title|table|win|loss&seed=N puts the game in one exact state so a
// screenshot can be retaken byte-identically. The same states are also
// reachable by playing: table is a real mid-game, win and loss are real
// end states with the score the rules produce. The table hand is picked
// from a seeded deck, so it never depends on the browser's clock.
import { CONFIG } from './config.js';
import { buildDeck, makeRng } from './deck.js';

/** The hand the table shot shows: one of each suit plus a guard. */
function tableHand(deck) {
  const picked = [];
  const want = ['api', 'air', 'daun', 'batu'];
  for (const suit of want) {
    const card = deck.find((c) => c.suit === suit && c.kind === 'attack' && !picked.includes(c));
    if (card) picked.push(card);
  }
  const guard = deck.find((c) => c.kind === 'guard' && !picked.includes(c));
  if (guard) picked.push(guard);
  return picked;
}

export function applyShot(state, shot, seed) {
  const rng = makeRng(seed);
  if (shot === 'title') {
    state.phase = 'title';
    state.log = ['Selamat datang di Ember Pact.', 'Klik Mulai Bertarung untuk duel melawan Raka si Bayang.'];
    return;
  }
  const deck = buildDeck(rng);
  if (shot === 'table') {
    state.phase = 'player';
    state.round = 3;
    state.manaMax = 3;
    state.mana = 3;
    state.playerLife = 16;
    state.enemyLife = 13;
    state.playerBlock = 4;
    state.enemyBlock = 0;
    state.playerHand = tableHand(deck);
    state.enemyHand = deck.slice(10, 15);
    state.playedThisTurn = [deck.find((c) => c.suit === 'api' && c.cost === 3 && c.kind === 'attack')].filter(Boolean);
    state.log = [
      'Ronde 3 — giliranmu.',
      'Kamu memainkan Lidah Api: 4 serangan.',
      'Raka menyiapkan kombo — hati-hati.',
      'Rantai Api x2 memberi +2.',
    ];
    state.intent = { kind: 'combo', value: 7, pattern: 'combo', label: 'Lawan menyiapkan kombo ~7 serangan' };
    state.score = 12;
    return;
  }
  if (shot === 'win') {
    state.phase = 'over';
    state.over = true;
    state.winner = 'player';
    state.round = 6;
    state.manaMax = 6;
    state.mana = 2;
    state.playerLife = 11;
    state.enemyLife = 0;
    state.playerHand = tableHand(deck);
    state.enemyHand = deck.slice(10, 13);
    state.playedThisTurn = [];
    state.log = ['Ronde 6 — Letusan menghantam 7.', 'Raka si Bayang kehabisan nyawa!', 'KEMENANGAN!'];
    state.intent = null;
    state.score = CONFIG.winScoreBase + state.playerLife * CONFIG.winLifeBonus + state.round * CONFIG.roundScoreBonus;
    return;
  }
  if (shot === 'loss') {
    state.phase = 'over';
    state.over = true;
    state.winner = 'enemy';
    state.round = 5;
    state.manaMax = 5;
    state.mana = 1;
    state.playerLife = 0;
    state.enemyLife = 9;
    state.playerHand = tableHand(deck);
    state.enemyHand = deck.slice(10, 14);
    state.playedThisTurn = [];
    state.log = ['Ronde 5 — Tsunami Raka menghantam 5.', 'Nyawamu habis.', 'KEKALAHAN.'];
    state.intent = null;
    state.score = state.round * CONFIG.roundScoreBonus + state.playerLife * CONFIG.winLifeBonus;
    return;
  }
}
