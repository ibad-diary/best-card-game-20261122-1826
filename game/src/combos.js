// Ember Pact — combos: chain bonuses for repeating a suit in one turn
// and element reactions when two suits meet on the table.
// Cards combine in more than one way, so every hand is a decision:
// hold a suit for its chain, or mix suits to trigger a reaction.
import { CONFIG } from './config.js';

// Reactions keyed by the two suits in alphabetical order. Only the first
// reaction found in a turn applies, so a four-suit hand cannot stack them.
export const REACTIONS = {
  'api+daun': { bonus: 3, label: 'Bara Membara! Api + Daun' },
  'air+api': { bonus: 2, label: 'Uap Panas! Air + Api' },
  'batu+daun': { bonus: 2, label: 'Duri Tumbuh! Daun + Batu' },
  'air+batu': { bonus: 1, label: 'Lumpur Berat! Air + Batu' },
};

/** How many cards of the same suit were already played this turn. */
export function chainCount(playedThisTurn, card) {
  return playedThisTurn.filter((c) => c.suit === card.suit).length;
}

/**
 * The full bonus for playing `card` after `playedThisTurn`:
 * +2 per same-suit card already played (the chain), plus a reaction
 * bonus when its suit reacts with a suit already on the table.
 * Returns { bonus, notes } where notes lists what triggered, for the log.
 */
export function comboBonus(playedThisTurn, card) {
  let bonus = 0;
  const notes = [];
  const chain = chainCount(playedThisTurn, card);
  if (chain > 0) {
    bonus += chain * CONFIG.chainBonus;
    notes.push(`Rantai ${card.suit} x${chain + 1} +${chain * CONFIG.chainBonus}`);
  }
  for (const earlier of playedThisTurn) {
    if (earlier.suit === card.suit) continue;
    const key = [earlier.suit, card.suit].sort().join('+');
    const reaction = REACTIONS[key];
    if (reaction) {
      bonus += reaction.bonus;
      notes.push(`${reaction.label} +${reaction.bonus}`);
      break;
    }
  }
  return { bonus, notes };
}

/** The damage a played attack card deals after its combo bonus. */
export function attackDamage(playedThisTurn, card) {
  return card.attack + comboBonus(playedThisTurn, card).bonus;
}

/** The block a played guard card gives after its combo bonus. */
export function guardBlock(playedThisTurn, card) {
  return card.block + comboBonus(playedThisTurn, card).bonus;
}
