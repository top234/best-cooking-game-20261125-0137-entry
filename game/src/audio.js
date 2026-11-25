// Warung Senja — audio: every sound is a WebAudio oscillator, no audio files.
// A short blip for a chop, a sizzle burst for the wok, a two-note ding for a serve,
// a low buzz for a mistake. Nothing plays until the player first interacts.
let context = null;
let muted = false;

function ensureContext() {
  if (!context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(freq, dur, type, gain, when = 0, slideTo = null) {
  const ctx = ensureContext();
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function soundChop() {
  tone(220, 0.09, 'square', 0.08, 0, 140);
}

export function soundPick() {
  tone(520, 0.07, 'sine', 0.06, 0, 660);
}

export function soundSizzle() {
  // A burst of high, short noise-like blips reads as a hot wok.
  tone(1800 + Math.random() * 800, 0.12, 'sawtooth', 0.015);
  tone(2400 + Math.random() * 600, 0.1, 'sawtooth', 0.012, 0.05);
}

export function soundCookDone() {
  tone(660, 0.12, 'sine', 0.09);
  tone(880, 0.18, 'sine', 0.09, 0.12);
}

export function soundServe() {
  tone(880, 0.1, 'sine', 0.1);
  tone(1174, 0.16, 'sine', 0.1, 0.09);
  tone(1568, 0.2, 'sine', 0.07, 0.18);
}

export function soundError() {
  tone(160, 0.18, 'sawtooth', 0.07, 0, 110);
}

export function soundLeave() {
  tone(330, 0.25, 'sine', 0.06, 0, 220);
}

export function soundDayOver() {
  tone(523, 0.15, 'sine', 0.09);
  tone(392, 0.15, 'sine', 0.09, 0.15);
  tone(330, 0.3, 'sine', 0.09, 0.3);
}

/** Toggle mute; returns the new muted state. */
export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

/** Unlock audio on the first pointer interaction (browsers require a gesture). */
export function unlockAudio() {
  ensureContext();
}
