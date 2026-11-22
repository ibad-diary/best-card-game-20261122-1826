// Ember Pact — the deck: card definitions, the seeded shuffle, drawing.
// A card is a plain object: { uid, suit, name, kind, cost, attack, block }.
// kind is 'attack' (deals damage) or 'guard' (gains block). Every card is
// original to this game; no name or art is borrowed from another game.
import { SUITS, SUIT_IDS, CONFIG } from './config.js';

// Attack cards per suit, by mana cost. Attack is cost + 1, except the
// 5-cost finisher which hits for 7. Guard cards give block instead.
const CARD_NAMES = {
  api: {
    attack: { 1: ['Bara Kecil', 'Percik'], 2: ['Jilat Api', 'Nyala'], 3: ['Lidah Api', 'Pilar Api'], 4: ['Inferno'], 5: ['Letusan'] },
    guard: { 2: ['Perisai Bara'], 3: ['Dinding Magma'] },
  },
  air: {
    attack: { 1: ['Tetes', 'Ciprat'], 2: ['Arus', 'Ombak'], 3: ['Pusaran', 'Badai Air'], 4: ['Tsunami'], 5: ['Samudra'] },
    guard: { 2: ['Selimut Kabut'], 3: ['Benteng Es'] },
  },
  daun: {
    attack: { 1: ['Kuncup', 'Tunas'], 2: ['Akar', 'Ranting'], 3: ['Duri', 'Belukar'], 4: ['Hutan'], 5: ['Raksasa Rimba'] },
    guard: { 2: ['Kulit Kayu'], 3: ['Perisai Lumut'] },
  },
  batu: {
    attack: { 1: ['Kerikil', 'Batu'], 2: ['Puing', 'Bongkah'], 3: ['Menhir', 'Tebing'], 4: ['Gunung'], 5: ['Gempa'] },
    guard: { 2: ['Zirah Batu'], 3: ['Tembok Granit'] },
  },
};

const ATTACK_FOR_COST = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 7 };
const BLOCK_FOR_COST = { 2: 5, 3: 8 };

/** A deterministic RNG (mulberry32) so a seed replays the same shuffle. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build one fresh 40-card deck (10 per suit) and shuffle it with rng. */
export function buildDeck(rng) {
  const cards = [];
  let uid = 0;
  for (const suit of SUIT_IDS) {
    const names = CARD_NAMES[suit];
    for (const [costText, list] of Object.entries(names.attack)) {
      const cost = Number(costText);
      for (const name of list) {
        cards.push({ uid: uid++, suit, name, kind: 'attack', cost, attack: ATTACK_FOR_COST[cost], block: 0 });
      }
    }
    for (const [costText, list] of Object.entries(names.guard)) {
      const cost = Number(costText);
      for (const name of list) {
        cards.push({ uid: uid++, suit, name, kind: 'guard', cost, attack: 0, block: BLOCK_FOR_COST[cost] });
      }
    }
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Draw n cards from the top of pile into hand; reshuffles discard when empty.
 *  When both pile and discard are empty the hand simply stays short. */
export function drawCards(hand, pile, discard, n, rng) {
  for (let i = 0; i < n; i++) {
    if (pile.length === 0) {
      if (discard.length === 0) return;
      pile.push(...discard.splice(0));
      for (let k = pile.length - 1; k > 0; k--) {
        const j = Math.floor(rng() * (k + 1));
        [pile[k], pile[j]] = [pile[j], pile[k]];
      }
    }
    hand.push(pile.pop());
  }
}

/** The suit record for a card, for colours and shapes in the renderer. */
export function suitOf(card) {
  return SUITS[card.suit];
}

/** A short one-line description of what a card does, shown on the card. */
export function cardText(card) {
  if (card.kind === 'guard') return `Blok +${card.block}`;
  return `Serang ${card.attack}`;
}

export { CONFIG };
