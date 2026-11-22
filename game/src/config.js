// Ember Pact — game tuning numbers, in one place.
// Every balance value the rules use lives here so a tweak never hunts
// through the turn loop, the AI or the renderer.
export const CONFIG = {
  maxLife: 20,
  handSize: 5,
  deckSize: 40,
  startingMana: 1,
  maxMana: 10,
  manaPerRound: 1,
  chainBonus: 2,
  winScoreBase: 100,
  winLifeBonus: 5,
  roundScoreBonus: 2,
  logLines: 6,
  // Milliseconds between each rival card play during the rival's turn,
  // so the player can follow what the AI does instead of it all landing at once.
  enemyStepMs: 650,
  enemyName: 'Raka si Bayang',
  playerName: 'Kamu',
  gameTitle: 'Ember Pact',
  gameSubtitle: 'Duel kartu para penyihir api',
};

// Suits are told apart by colour AND shape, never by text alone:
// Api is a red triangle, Air a blue droplet, Daun a green leaf,
// Batu an amber hexagon. The renderer draws each pip with clip-path.
export const SUITS = {
  api: { id: 'api', name: 'Api', color: '#e5484d', dark: '#8f1d22', shape: 'triangle', glyph: '▲' },
  air: { id: 'air', name: 'Air', color: '#3e8fd9', dark: '#174a75', shape: 'droplet', glyph: '●' },
  daun: { id: 'daun', name: 'Daun', color: '#46a758', dark: '#1f5c2e', shape: 'leaf', glyph: '◆' },
  batu: { id: 'batu', name: 'Batu', color: '#d9a13b', dark: '#7a5510', shape: 'hexagon', glyph: '⬢' },
};

export const SUIT_IDS = ['api', 'air', 'daun', 'batu'];
