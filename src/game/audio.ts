/* Procedural WebAudio sound manager — no assets, all synthesized. */

type ToneOpts = {
  f0: number;
  f1?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  delay?: number;
};

export class AudioMan {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: number | null = null;
  private nextNote = 0;
  private step = 0;
  muted = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  private tone({ f0, f1, dur, type = "square", vol = 0.12, delay = 0 }: ToneOpts) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol = 0.12, delay = 0, freq = 900) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  /* ── SFX vocabulary ─────────────────────────── */
  ui() {
    this.tone({ f0: 620, f1: 880, dur: 0.09, type: "triangle", vol: 0.1 });
  }
  jump() {
    this.tone({ f0: 300, f1: 640, dur: 0.16, type: "square", vol: 0.09 });
  }
  flap() {
    this.noise(0.12, 0.07, 0, 2400);
    this.tone({ f0: 420, f1: 700, dur: 0.1, type: "triangle", vol: 0.07 });
  }
  land() {
    this.noise(0.07, 0.06, 0, 500);
  }
  eat() {
    this.tone({ f0: 520, f1: 900, dur: 0.09, type: "square", vol: 0.09 });
    this.tone({ f0: 780, f1: 1240, dur: 0.1, type: "square", vol: 0.08, delay: 0.06 });
  }
  coin() {
    this.tone({ f0: 988, dur: 0.09, type: "square", vol: 0.1 });
    this.tone({ f0: 1319, dur: 0.22, type: "square", vol: 0.1, delay: 0.08 });
  }
  power() {
    const seq = [392, 494, 587, 784];
    seq.forEach((f, i) => this.tone({ f0: f, dur: 0.12, type: "square", vol: 0.09, delay: i * 0.07 }));
  }
  dance() {
    const seq = [523, 659, 784, 659, 880, 784];
    seq.forEach((f, i) => this.tone({ f0: f, dur: 0.11, type: "triangle", vol: 0.1, delay: i * 0.08 }));
  }
  heart() {
    this.tone({ f0: 660, f1: 990, dur: 0.16, type: "sine", vol: 0.14 });
    this.tone({ f0: 880, f1: 1320, dur: 0.2, type: "sine", vol: 0.12, delay: 0.12 });
  }
  smash() {
    this.noise(0.22, 0.2, 0, 1400);
    this.tone({ f0: 220, f1: 60, dur: 0.22, type: "sawtooth", vol: 0.14 });
  }
  hurt() {
    this.tone({ f0: 320, f1: 90, dur: 0.28, type: "sawtooth", vol: 0.16 });
    this.noise(0.16, 0.12, 0, 700);
  }
  over() {
    const seq = [392, 330, 262, 196];
    seq.forEach((f, i) => this.tone({ f0: f, dur: 0.22, type: "square", vol: 0.11, delay: i * 0.16 }));
  }
  record() {
    const seq = [523, 659, 784, 1047, 784, 1047, 1319];
    seq.forEach((f, i) => this.tone({ f0: f, dur: 0.14, type: "square", vol: 0.1, delay: i * 0.09 }));
  }

  /* ── tiny farm-groove loop ──────────────────── */
  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer !== null) return;
    this.nextNote = ctx.currentTime + 0.1;
    this.step = 0;
    const bass = [196, 0, 196, 0, 247, 0, 220, 0, 196, 0, 196, 0, 294, 262, 247, 220];
    const pluck = [0, 587, 0, 523, 0, 659, 0, 0, 0, 587, 0, 659, 0, 784, 0, 659];
    const tick = () => {
      if (!this.ctx) return;
      while (this.nextNote < this.ctx.currentTime + 0.18) {
        const d = this.nextNote - this.ctx.currentTime;
        const b = bass[this.step % 16];
        const p = pluck[this.step % 16];
        if (b) this.tone({ f0: b, dur: 0.16, type: "triangle", vol: 0.055, delay: Math.max(0, d) });
        if (p) this.tone({ f0: p, dur: 0.1, type: "square", vol: 0.028, delay: Math.max(0, d) });
        if (this.step % 4 === 2) this.noise(0.03, 0.02, Math.max(0, d), 6000);
        this.nextNote += 0.165;
        this.step++;
      }
    };
    tick();
    this.musicTimer = window.setInterval(tick, 90);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
