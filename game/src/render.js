// Ember Pact — rendering: draws the table, hands, HUD and end screens
// into the static skeleton in index.html. Cards slide in with CSS
// transitions; damage numbers float up; the win screen rains confetti.
import { CONFIG, SUITS } from './config.js';
import { suitOf, cardText } from './deck.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

/** One suit pip: colour AND shape, so suits differ without reading text. */
export function pipElement(suitId) {
  const suit = SUITS[suitId];
  const pip = el('span', `pip pip-${suit.shape}`);
  pip.style.background = suit.color;
  pip.title = suit.name;
  return pip;
}

/** A face-up card element. `onPlay` fires when the card is clicked. */
export function cardElement(card, opts = {}) {
  const suit = suitOf(card);
  const cardEl = el('article', `card suit-${card.suit}${opts.playable ? ' playable' : ''}${opts.played ? ' played' : ''}`);
  cardEl.dataset.uid = String(card.uid);
  const cost = el('div', 'card-cost', String(card.cost));
  const name = el('div', 'card-name', card.name);
  const pip = el('div', 'card-pip');
  pip.appendChild(pipElement(card.suit));
  // Big number only: the emoji sword/shield glyphs rendered as a smudged
  // X in headless Chromium and collided with the text line below.
  const big = el('div', 'card-big', card.kind === 'attack' ? String(card.attack) : String(card.block));
  const text = el('div', 'card-text', cardText(card));
  const suitName = el('div', 'card-suit', suit.name);
  cardEl.append(cost, name, pip, big, text, suitName);
  if (opts.onPlay) cardEl.addEventListener('click', () => opts.onPlay(card));
  return cardEl;
}

/** A face-down card back for the rival's hand. */
export function cardBackElement() {
  const back = el('div', 'card card-back');
  back.appendChild(el('div', 'card-back-pip', '🔥'));
  return back;
}

/** Life bar with a number, for one side of the HUD. */
function lifeBar(label, life, max, isPlayer) {
  const wrap = el('div', `life-wrap${isPlayer ? ' player' : ' rival'}`);
  wrap.appendChild(el('div', 'life-label', `${label} · ❤ ${life}/${max}`));
  const bar = el('div', 'life-bar');
  const fill = el('div', 'life-fill');
  fill.style.width = `${Math.max(0, (life / max) * 100)}%`;
  bar.appendChild(fill);
  wrap.appendChild(bar);
  return wrap;
}

export class Renderer {
  constructor(root) {
    this.root = root;
    this.hud = root.querySelector('#hud');
    this.enemyHand = root.querySelector('#enemy-hand');
    this.middle = root.querySelector('#middle');
    this.playedRow = root.querySelector('#played-row');
    this.logBox = root.querySelector('#log');
    this.intentBox = root.querySelector('#intent');
    this.playerHand = root.querySelector('#player-hand');
    this.titleScreen = root.querySelector('#title-screen');
    this.endScreen = root.querySelector('#end-screen');
    this.manaBox = root.querySelector('#mana');
    this.roundBox = root.querySelector('#round');
    this.scoreBox = root.querySelector('#score');
    this.endTurnBtn = root.querySelector('#end-turn');
    this.muteBtn = root.querySelector('#mute');
  }

  render(state, callbacks) {
    this.renderHud(state);
    this.renderEnemyHand(state);
    this.renderPlayed(state);
    this.renderLog(state);
    this.renderIntent(state);
    this.renderPlayerHand(state, callbacks);
    this.renderScreens(state, callbacks);
    this.endTurnBtn.disabled = state.phase !== 'player' || state.over;
  }

  renderHud(state) {
    this.hud.querySelectorAll('.life-wrap').forEach((n) => n.remove());
    this.hud.insertBefore(lifeBar(CONFIG.playerName, state.playerLife, CONFIG.maxLife, true), this.manaBox);
    this.hud.insertBefore(lifeBar(CONFIG.enemyName, state.enemyLife, CONFIG.maxLife, false), this.manaBox);
    this.manaBox.textContent = `🔮 Mana ${state.mana}/${state.manaMax}`;
    this.roundBox.textContent = `Ronde ${state.round}`;
    this.scoreBox.textContent = `Skor ${state.score}`;
    this.muteBtn.textContent = state.muted ? '🔇 Suara Mati' : '🔊 Suara';
  }

  renderEnemyHand(state) {
    this.enemyHand.replaceChildren();
    const label = el('div', 'hand-label', `${CONFIG.enemyName} — ${state.enemyHand.length} kartu`);
    this.enemyHand.appendChild(label);
    const row = el('div', 'hand-row');
    for (let i = 0; i < state.enemyHand.length; i++) row.appendChild(cardBackElement());
    this.enemyHand.appendChild(row);
  }

  renderPlayed(state) {
    this.playedRow.replaceChildren();
    for (const card of state.playedThisTurn) {
      this.playedRow.appendChild(cardElement(card, { played: true }));
    }
    if (state.playedThisTurn.length === 0) {
      this.playedRow.appendChild(el('div', 'played-empty', 'Kartu yang kamu mainkan muncul di sini'));
    }
  }

  renderLog(state) {
    this.logBox.replaceChildren();
    const lines = state.log.slice(-CONFIG.logLines);
    for (const line of lines) this.logBox.appendChild(el('div', 'log-line', line));
  }

  renderIntent(state) {
    if (state.over) {
      this.intentBox.textContent = '';
      return;
    }
    const intent = state.intent;
    this.intentBox.textContent = intent ? `👁 ${intent.label} · Pola: ${intent.pattern === 'attack' ? 'Agresif' : intent.pattern === 'combo' ? 'Kombo' : 'Bertahan'}` : '';
  }

  renderPlayerHand(state, callbacks) {
    this.playerHand.replaceChildren();
    const label = el('div', 'hand-label', `Tanganmu — klik kartu untuk main (1–7) · Enter: akhiri giliran`);
    this.playerHand.appendChild(label);
    const row = el('div', 'hand-row');
    state.playerHand.forEach((card, i) => {
      const playable = state.phase === 'player' && !state.over && card.cost <= state.mana;
      const node = cardElement(card, {
        playable,
        onPlay: playable ? () => callbacks.onPlayCard(card) : null,
      });
      node.style.setProperty('--i', String(i));
      row.appendChild(node);
    });
    this.playerHand.appendChild(row);
  }

  renderScreens(state, callbacks) {
    if (state.phase === 'title') {
      this.titleScreen.classList.remove('hidden');
      this.endScreen.classList.add('hidden');
      return;
    }
    this.titleScreen.classList.add('hidden');
    if (!state.over) {
      this.endScreen.classList.add('hidden');
      return;
    }
    this.endScreen.classList.remove('hidden');
    const won = state.winner === 'player';
    this.endScreen.querySelector('.end-title').textContent = won ? '🔥 KEMENANGAN!' : '💔 KEKALAHAN';
    this.endScreen.querySelector('.end-sub').textContent = won
      ? `${CONFIG.enemyName} kehabisan nyawa. Paktamu menang!`
      : `${CONFIG.playerName} kehabisan nyawa. Paktamu kalah.`;
    this.endScreen.querySelector('.end-score').textContent = `Skor akhir: ${state.score} · Ronde: ${state.round} · Nyawa tersisa: ${state.playerLife}`;
    const again = this.endScreen.querySelector('#play-again');
    again.textContent = won ? 'Main Lagi' : 'Coba Lagi';
    again.onclick = () => callbacks.onRestart();
    const confetti = this.endScreen.querySelector('.confetti');
    confetti.replaceChildren();
    if (won) {
      for (let i = 0; i < 42; i++) {
        const piece = el('i', 'confetti-piece');
        piece.style.left = `${(i * 37) % 100}%`;
        piece.style.background = ['#e5484d', '#3e8fd9', '#46a758', '#d9a13b', '#f5d76e'][i % 5];
        piece.style.animationDelay = `${(i % 10) * 0.12}s`;
        confetti.appendChild(piece);
      }
    }
  }

  /** A floating damage/block number over the middle of the table. */
  floater(text, kind) {
    const n = el('div', `floater floater-${kind}`, text);
    n.style.left = `${42 + Math.random() * 16}%`;
    this.middle.appendChild(n);
    window.setTimeout(() => n.remove(), 1200);
  }
}
