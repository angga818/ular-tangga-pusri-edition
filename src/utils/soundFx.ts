class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.08, delay = 0) {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playDiceRoll() {
    for (let i = 0; i < 6; i++) {
      this.playTone(220 + (i % 3) * 70 + Math.random() * 40, 0.05, 'triangle', 0.05, i * 0.08);
    }
  }

  playHop(stepIndex = 0) {
    this.playTone(420 + stepIndex * 35, 0.08, 'sine', 0.07, 0);
  }

  playCorrect() {
    this.playTone(523.25, 0.14, 'triangle', 0.09, 0);
    this.playTone(659.25, 0.14, 'triangle', 0.09, 0.09);
    this.playTone(783.99, 0.25, 'triangle', 0.1, 0.18);
  }

  playWrong() {
    this.playTone(240, 0.18, 'sawtooth', 0.05, 0);
    this.playTone(180, 0.25, 'sawtooth', 0.05, 0.14);
  }

  playLadder() {
    const notes = [440, 523.25, 587.33, 659.25, 783.99, 880];
    notes.forEach((f, idx) => this.playTone(f, 0.12, 'triangle', 0.08, idx * 0.07));
  }

  playSnake() {
    const notes = [620, 520, 420, 330, 250, 190];
    notes.forEach((f, idx) => this.playTone(f, 0.12, 'sine', 0.07, idx * 0.07));
  }

  playWin() {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, idx) => this.playTone(f, 0.45, 'triangle', 0.1, idx * 0.11));
  }
}

export const soundFx = new SoundEngine();
