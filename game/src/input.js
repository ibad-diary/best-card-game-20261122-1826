// Ember Pact — input: mouse clicks on cards and buttons, plus keyboard.
// 1–7 plays the card in that hand slot, Enter ends the turn, R restarts
// after a game ends, M toggles mute. Nothing here touches game rules.
// Key repeats are ignored so holding Enter cannot end two turns at once.
export function bindInput(callbacks) {
  const startBtn = document.querySelector('#start-btn');
  if (startBtn) startBtn.addEventListener('click', () => callbacks.onStart());
  const endTurnBtn = document.querySelector('#end-turn');
  if (endTurnBtn) endTurnBtn.addEventListener('click', () => callbacks.onEndTurn());
  const muteBtn = document.querySelector('#mute');
  if (muteBtn) muteBtn.addEventListener('click', () => callbacks.onMute());
  const againBtn = document.querySelector('#play-again');
  if (againBtn) againBtn.addEventListener('click', () => callbacks.onRestart());

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key;
    if (key >= '1' && key <= '7') {
      callbacks.onPlaySlot(Number(key) - 1);
    } else if (key === 'Enter') {
      callbacks.onEndTurn();
    } else if (key === 'r' || key === 'R') {
      callbacks.onRestart();
    } else if (key === 'm' || key === 'M') {
      callbacks.onMute();
    }
  });
}
