// Ember Pact — the game loop: state, turns, damage, win and loss.
// Player and rival each have 20 life. Mana grows +1 a round to a max
// of 10 and the hand refills to 5. Playing a card spends mana; attack
// cards hit the rival (block absorbs first), guard cards give block.
// The rival's intent is shown before the player ends their turn.
import { CONFIG } from './config.js';
import { buildDeck, drawCards, makeRng } from './deck.js';
import { attackDamage, guardBlock, comboBonus } from './combos.js';
import { chooseIntent, choosePlays } from './ai.js';
import { SoundBank } from './audio.js';
import { Renderer } from './render.js';
import { bindInput } from './input.js';
import { applyShot } from './shots.js';

export function createState(seed) {
  const rng = makeRng(seed);
  return {
    seed,
    rng,
    phase: 'title',
    over: false,
    winner: null,
    round: 1,
    mana: CONFIG.startingMana,
    manaMax: CONFIG.startingMana,
    playerLife: CONFIG.maxLife,
    enemyLife: CONFIG.maxLife,
    playerBlock: 0,
    enemyBlock: 0,
    score: 0,
    playerDeck: buildDeck(rng),
    enemyDeck: buildDeck(rng),
    playerHand: [],
    enemyHand: [],
    playerDiscard: [],
    enemyDiscard: [],
    playedThisTurn: [],
    log: [],
    intent: null,
    muted: false,
  };
}

function addLog(state, line) {
  state.log.push(line);
  if (state.log.length > 40) state.log.splice(0, state.log.length - 40);
}

function dealDamage(state, target, amount) {
  if (target === 'enemy') {
    const absorbed = Math.min(state.enemyBlock, amount);
    state.enemyBlock -= absorbed;
    const rest = amount - absorbed;
    state.enemyLife = Math.max(0, state.enemyLife - rest);
    return { absorbed, dealt: rest };
  }
  const absorbed = Math.min(state.playerBlock, amount);
  state.playerBlock -= absorbed;
  const rest = amount - absorbed;
  state.playerLife = Math.max(0, state.playerLife - rest);
  return { absorbed, dealt: rest };
}

function computeScore(state) {
  let score = state.round * CONFIG.roundScoreBonus;
  if (state.winner === 'player') score += CONFIG.winScoreBase + state.playerLife * CONFIG.winLifeBonus;
  return score;
}

function checkEnd(state, sounds, renderer) {
  if (state.enemyLife <= 0) {
    state.over = true;
    state.winner = 'player';
    state.phase = 'over';
    state.score = computeScore(state);
    addLog(state, 'KEMENANGAN! Raka si Bayang kalah.');
    sounds.win();
    renderer.render(state, callbacksOf(state, sounds, renderer));
    return true;
  }
  if (state.playerLife <= 0) {
    state.over = true;
    state.winner = 'enemy';
    state.phase = 'over';
    state.score = computeScore(state);
    addLog(state, 'KEKALAHAN. Nyawamu habis.');
    sounds.lose();
    renderer.render(state, callbacksOf(state, sounds, renderer));
    return true;
  }
  return false;
}

function startPlayerTurn(state, sounds) {
  state.phase = 'player';
  state.manaMax = Math.min(CONFIG.maxMana, CONFIG.startingMana + (state.round - 1) * CONFIG.manaPerRound);
  state.mana = state.manaMax;
  state.playerBlock = 0;
  state.playedThisTurn = [];
  drawCards(state.playerHand, state.playerDeck, state.playerDiscard, CONFIG.handSize - state.playerHand.length, state.rng);
  state.intent = chooseIntent(state.enemyHand, state.manaMax, state.enemyLife);
  addLog(state, `Ronde ${state.round} — giliranmu. Mana ${state.mana}.`);
  sounds.turn();
}

function playCard(state, card, sounds, renderer) {
  if (state.phase !== 'player' || state.over) return;
  if (!state.playerHand.includes(card)) return;
  if (card.cost > state.mana) {
    addLog(state, `Mana kurang untuk ${card.name} (butuh ${card.cost}).`);
    renderer.render(state, callbacksOf(state, sounds, renderer));
    return;
  }
  state.mana -= card.cost;
  state.playerHand.splice(state.playerHand.indexOf(card), 1);
  state.playerDiscard.push(card);
  const { bonus, notes } = comboBonus(state.playedThisTurn, card);
  state.playedThisTurn.push(card);
  if (card.kind === 'attack') {
    const dmg = attackDamage(state.playedThisTurn.slice(0, -1), card);
    const result = dealDamage(state, 'enemy', dmg);
    addLog(state, `Kamu memainkan ${card.name}: ${dmg} serangan${result.absorbed ? ` (${result.absorbed} diserap blok)` : ''}.`);
    for (const note of notes) addLog(state, `  ${note}`);
    renderer.floater(`-${dmg}`, 'damage');
    sounds.hit();
  } else {
    const block = guardBlock(state.playedThisTurn.slice(0, -1), card);
    state.playerBlock += block;
    addLog(state, `Kamu memainkan ${card.name}: +${block} blok.`);
    for (const note of notes) addLog(state, `  ${note}`);
    renderer.floater(`+${block} blok`, 'block');
    sounds.block();
  }
  sounds.playCard();
  if (!checkEnd(state, sounds, renderer)) renderer.render(state, callbacksOf(state, sounds, renderer));
}

function enemyTurn(state, sounds, renderer) {
  state.phase = 'enemy';
  renderer.render(state, callbacksOf(state, sounds, renderer));
  const mana = Math.min(CONFIG.maxMana, CONFIG.startingMana + (state.round - 1) * CONFIG.manaPerRound);
  state.enemyBlock = 0;
  drawCards(state.enemyHand, state.enemyDeck, state.enemyDiscard, CONFIG.handSize - state.enemyHand.length, state.rng);
  const plays = choosePlays(state.enemyHand, mana, state.enemyLife);
  const played = [];
  let step = 0;
  for (const card of plays) {
    const delay = CONFIG.enemyStepMs * ++step;
    window.setTimeout(() => {
      if (state.over) return;
      state.enemyHand.splice(state.enemyHand.indexOf(card), 1);
      state.enemyDiscard.push(card);
      played.push(card);
      if (card.kind === 'attack') {
        const dmg = attackDamage(played.slice(0, -1), card);
        const result = dealDamage(state, 'player', dmg);
        addLog(state, `Raka memainkan ${card.name}: ${dmg} serangan${result.absorbed ? ` (${result.absorbed} diserap blok)` : ''}.`);
        renderer.floater(`-${dmg}`, 'damage');
        sounds.hit();
      } else {
        const block = guardBlock(played.slice(0, -1), card);
        state.enemyBlock += block;
        addLog(state, `Raka memainkan ${card.name}: +${block} blok.`);
        renderer.floater(`+${block} blok`, 'block');
        sounds.block();
      }
      if (!checkEnd(state, sounds, renderer)) renderer.render(state, callbacksOf(state, sounds, renderer));
    }, delay);
  }
  window.setTimeout(() => {
    if (state.over) return;
    state.round += 1;
    startPlayerTurn(state, sounds);
    renderer.render(state, callbacksOf(state, sounds, renderer));
  }, CONFIG.enemyStepMs * (plays.length + 1) + 300);}

function callbacksOf(state, sounds, renderer) {
  return {
    onPlayCard: (card) => playCard(state, card, sounds, renderer),
    onPlaySlot: (i) => {
      const card = state.playerHand[i];
      if (card) playCard(state, card, sounds, renderer);
    },
    onEndTurn: () => {
      if (state.phase !== 'player' || state.over) return;
      addLog(state, 'Kamu mengakhiri giliran.');
      enemyTurn(state, sounds, renderer);
    },
    onStart: () => {
      state.phase = 'player';
      state.log = ['Duel dimulai! Kalahkan Raka si Bayang.'];
      startPlayerTurn(state, sounds);
      renderer.render(state, callbacksOf(state, sounds, renderer));
    },
    onRestart: () => {
      const fresh = createState(state.seed + 1);
      Object.assign(state, fresh, { muted: state.muted });
      state.log = ['Duel baru dimulai!'];
      startPlayerTurn(state, sounds);
      renderer.render(state, callbacksOf(state, sounds, renderer));
    },
    onMute: () => {
      state.muted = sounds.toggleMute();
      renderer.render(state, callbacksOf(state, sounds, renderer));
    },
  };
}

export function boot() {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed') || '1') || 1;
  const shot = params.get('shot');
  const state = createState(seed);
  const sounds = new SoundBank();
  const renderer = new Renderer(document.querySelector('#stage'));
  const callbacks = callbacksOf(state, sounds, renderer);
  bindInput(callbacks);
  drawCards(state.playerHand, state.playerDeck, state.playerDiscard, CONFIG.handSize, state.rng);
  drawCards(state.enemyHand, state.enemyDeck, state.enemyDiscard, CONFIG.handSize, state.rng);
  if (shot) {
    applyShot(state, shot, seed);
    renderer.render(state, callbacks);
  } else {
    state.log = ['Selamat datang di Ember Pact.', 'Klik Mulai Bertarung untuk duel melawan Raka si Bayang.'];
    renderer.render(state, callbacks);
  }
  return { state, sounds, renderer };
}

document.addEventListener('DOMContentLoaded', boot);
