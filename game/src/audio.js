// Ember Pact — sound: tiny WebAudio synth, no audio files.
// Every effect is one oscillator burst so the game ships no assets and
// loads nothing over the network. Mute with M or the speaker button.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
    // Silent when muted or when the browser has no WebAudio at all.
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  playCard() {
    this.tone(520, 0.09, 'triangle', 0.1);
    this.tone(780, 0.07, 'triangle', 0.07, 0.05);
  }

  hit() {
    this.tone(160, 0.16, 'sawtooth', 0.1);
    this.tone(90, 0.2, 'square', 0.07, 0.03);
  }

  block() {
    this.tone(300, 0.1, 'sine', 0.1);
    this.tone(420, 0.12, 'sine', 0.08, 0.06);
  }

  draw() {
    this.tone(660, 0.05, 'triangle', 0.06);
  }

  turn() {
    this.tone(440, 0.08, 'triangle', 0.08);
    this.tone(587, 0.1, 'triangle', 0.08, 0.07);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.11, i * 0.11));
  }

  lose() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.26, 'sine', 0.1, i * 0.14));
  }
}
