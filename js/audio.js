// Sound: placeholder effects made with the Web Audio API.
// Browsers only allow sound after a touch, and Android only once the touch has ended, so unlock()
// runs on both the start and the end of a touch.
let ctx = null;
let enabled = true;
let noiseBuffer = null;

export function setEnabled(on) {
  enabled = on;
}

export function unlock() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}

function ready() {
  return enabled && ctx && ctx.state === "running";
}

function tone(freq, duration, { type = "square", volume = 0.06, slideTo = null, delay = 0 } = {}) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise(duration, { volume = 0.15, filter = 1200, type = "lowpass", delay = 0 } = {}) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = filter;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(f).connect(gain).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

const SOUNDS = {
  // "ho ho ho": three low bouncy notes
  ho() {
    for (let i = 0; i < 3; i++) tone(170 - i * 8, 0.14, { type: "triangle", volume: 0.12, slideTo: 120, delay: i * 0.18 });
  },
  jump() {
    tone(300, 0.2, { type: "sine", volume: 0.09, slideTo: 700 });
  },
  leap() {
    tone(220, 0.45, { type: "sine", volume: 0.1, slideTo: 900 });
    noise(0.3, { volume: 0.06, filter: 3000, type: "highpass" });
  },
  land() {
    noise(0.12, { volume: 0.12, filter: 1500, type: "bandpass" });
  },
  skid() {
    noise(0.5, { volume: 0.12, filter: 4000, type: "highpass" });
    tone(900, 0.4, { type: "sine", volume: 0.03, slideTo: 1400 });
  },
  // sleigh bells: quick bright jingles
  jingle() {
    for (let i = 0; i < 6; i++) {
      tone(1900 + Math.random() * 500, 0.08, { type: "triangle", volume: 0.04, delay: i * 0.045 });
      noise(0.04, { volume: 0.03, filter: 6000, type: "highpass", delay: i * 0.045 });
    }
  },
  cocoa() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { type: "triangle", volume: 0.08, delay: i * 0.07 }));
  },
  crash() {
    noise(0.4, { volume: 0.35, filter: 700 });
    tone(200, 0.3, { type: "sine", volume: 0.2, slideTo: 50 });
  },
  splash() {
    noise(0.6, { volume: 0.3, filter: 2500, type: "bandpass" });
    tone(500, 0.3, { type: "sine", volume: 0.08, slideTo: 150 });
  },
  wipeout() {
    tone(392, 0.2, { type: "triangle", volume: 0.08 });
    tone(330, 0.2, { type: "triangle", volume: 0.08, delay: 0.2 });
    tone(262, 0.6, { type: "triangle", volume: 0.08, slideTo: 200, delay: 0.4 });
  },
  pop() {
    tone(500, 0.08, { type: "sine", volume: 0.06, slideTo: 900 });
  },
  tick() {
    tone(660, 0.05, { type: "square", volume: 0.03 });
  },
  cheer() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { type: "triangle", volume: 0.07, delay: i * 0.12 }));
  },
  fanfare() {
    [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 7 ? 0.5 : 0.12, { type: "triangle", volume: 0.07, delay: i * 0.13 }));
  },
  groan() {
    tone(300, 0.6, { type: "sawtooth", volume: 0.04, slideTo: 120 });
  },
};

export function play(name) {
  SOUNDS[name]?.();
}

// Spoken lines (sayings/voices/*.mp3): fetched and decoded the first time, then kept. A new line
// cuts off the one still being said.
const voices = new Map(); // url → decoded AudioBuffer
let speaking = null;
let speakingUntil = 0;

export function talking() {
  return ctx && ctx.currentTime < speakingUntil;
}

export async function playVoice(url) {
  if (!url || !ready()) return false;
  try {
    let buffer = voices.get(url);
    if (!buffer) {
      const bytes = await (await fetch(url)).arrayBuffer();
      buffer = await ctx.decodeAudioData(bytes);
      voices.set(url, buffer);
    }
    try {
      speaking?.stop();
    } catch {
      // it had already finished
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
    speaking = src;
    speakingUntil = ctx.currentTime + buffer.duration;
    return true;
  } catch {
    return false;
  }
}
