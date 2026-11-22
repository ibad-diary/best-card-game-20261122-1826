// Ember Pact — the opponent AI: three readable patterns and a shown intent.
// The AI's plan is visible BEFORE the player ends their turn, so the
// player can counter it: block when a big hit is coming, strike first
// when the rival is setting up a combo.
import { CONFIG } from './config.js';

/**
 * Which pattern the rival follows, from its remaining life:
 * confident and high life it attacks, mid life it builds combos,
 * low life it turtles behind block. The pattern also feeds the intent
 * label, so a pattern change is visible to the player as a new plan.
 */
export function patternFor(life) {
  if (life <= 7) return 'defend';
  if (life <= 14) return 'combo';
  return 'attack';
}

export const PATTERN_LABEL = {
  attack: 'Agresif',
  combo: 'Kombo',
  defend: 'Bertahan',
};

/**
 * Decide the rival's intent for the coming turn from its hand and mana.
 * Returns { kind, value, label } — the label is shown in the HUD so the
 * player can read the rival's plan and play around it.
 */
export function chooseIntent(hand, mana, life) {
  const pattern = patternFor(life);
  const affordable = hand.filter((c) => c.cost <= mana);
  if (affordable.length === 0) {
    return { kind: 'wait', value: 0, pattern, label: 'Lawan kehabisan mana — diam' };
  }
  if (pattern === 'defend') {
    const guards = affordable.filter((c) => c.kind === 'guard');
    if (guards.length > 0) {
      const best = guards.reduce((a, b) => (b.block > a.block ? b : a));
      return { kind: 'defend', value: best.block, pattern, label: `Lawan akan bertahan +${best.block} blok` };
    }
  }
  if (pattern === 'combo') {
    const bySuit = {};
    for (const c of affordable) (bySuit[c.suit] ??= []).push(c);
    const pair = Object.values(bySuit).find((list) => list.length >= 2);
    if (pair) {
      const total = pair.slice(0, 2).reduce((n, c) => n + (c.kind === 'attack' ? c.attack : 0), 0) + CONFIG.chainBonus;
      return { kind: 'combo', value: total, pattern, label: `Lawan menyiapkan kombo ~${total} serangan` };
    }
  }
  const attacks = affordable.filter((c) => c.kind === 'attack');
  if (attacks.length > 0) {
    const best = attacks.reduce((a, b) => (b.attack > a.attack ? b : a));
    return { kind: 'attack', value: best.attack, pattern, label: `Lawan akan menyerang ${best.attack}` };
  }
  const guard = affordable.find((c) => c.kind === 'guard');
  return { kind: 'defend', value: guard ? guard.block : 0, pattern, label: `Lawan akan bertahan +${guard ? guard.block : 0} blok` };
}

/**
 * Pick the cards the rival actually plays on its turn, following its
 * pattern and spending at most its mana. Returns the chosen cards in
 * play order; the caller removes them from the rival's hand.
 */
export function choosePlays(hand, mana, life) {
  const pattern = patternFor(life);
  const pool = [...hand].sort((a, b) => b.attack + b.block - (a.attack + a.block));
  const chosen = [];
  let spent = 0;
  if (pattern === 'defend') {
    const guard = pool.filter((c) => c.kind === 'guard').sort((a, b) => b.block - a.block)[0];
    if (guard && guard.cost <= mana) {
      chosen.push(guard);
      spent += guard.cost;
    }
  }
  if (pattern === 'combo') {
    const bySuit = {};
    for (const c of pool) (bySuit[c.suit] ??= []).push(c);
    for (const list of Object.values(bySuit)) {
      if (list.length >= 2) {
        for (const c of list) {
          if (spent + c.cost <= mana) {
            chosen.push(c);
            spent += c.cost;
          }
        }
        break;
      }
    }
  }
  for (const c of pool) {
    if (chosen.includes(c)) continue;
    if (c.kind !== 'attack') continue;
    if (spent + c.cost <= mana) {
      chosen.push(c);
      spent += c.cost;
    }
  }
  if (pattern === 'defend' && chosen.length === 0) {
    const cheapest = pool.filter((c) => c.cost <= mana).sort((a, b) => a.cost - b.cost)[0];
    if (cheapest) chosen.push(cheapest);
  }
  return chosen;
}
