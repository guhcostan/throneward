// SFX procedurais via WebAudio (nenhum asset). Lazy AudioContext; no-op seguro
// em headless/Node (sem gesto do usuário ou sem AudioContext, nada toca e nada lança).

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (typeof AudioContext === 'undefined') return null;
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, dur = 0.08, type: OscillatorType = 'square', gain = 0.04, delay = 0): void {
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    // Silencia qualquer falha de áudio: jogo continua.
  }
}

export const sfx = {
  select(): void {
    blip(660, 0.06);
  },
  order(): void {
    blip(440, 0.07);
    blip(550, 0.07, 'square', 0.04, 0.07);
  },
  attack(): void {
    blip(180, 0.12, 'sawtooth', 0.05);
  },
  error(): void {
    blip(140, 0.15, 'square', 0.05);
  },
  build(): void {
    blip(330, 0.08, 'triangle', 0.05);
    blip(440, 0.1, 'triangle', 0.05, 0.08);
  },
  advance(): void {
    blip(523, 0.12, 'triangle', 0.05);
    blip(659, 0.12, 'triangle', 0.05, 0.12);
    blip(784, 0.2, 'triangle', 0.05, 0.24);
  },
  victory(): void {
    [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.18, 'triangle', 0.05, i * 0.15));
  }
};

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}
