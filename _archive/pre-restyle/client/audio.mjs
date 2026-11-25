export class Sound {
  constructor() { this.enabled = localStorage.getItem('callit-sound') === 'true'; this.context = null; }
  toggle() { this.enabled = !this.enabled; localStorage.setItem('callit-sound', String(this.enabled)); if (this.enabled) this.unlock(); return this.enabled; }
  unlock() { if (!this.enabled) return; this.context ??= new (window.AudioContext || window.webkitAudioContext)(); this.context.resume().catch(() => {}); }
  play(kind) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const notes = { click: [440], draw: [330, 494], reveal: [523, 659, 784], swap: [392, 294, 523], call: [392, 523, 659, 784], win: [523, 659, 784, 1047], error: [146, 130] }[kind] ?? [440];
    const now = this.context.currentTime;
    notes.forEach((frequency, i) => {
      const o = this.context.createOscillator(), g = this.context.createGain(); o.type = 'square'; o.frequency.value = frequency;
      const t = now + i * .045; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.028, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + .07);
      o.connect(g); g.connect(this.context.destination); o.start(t); o.stop(t + .08);
    });
  }
}
