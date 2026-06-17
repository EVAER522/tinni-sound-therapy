// Audio engine - core audio context and utilities for Web Audio API

let audioCtx = null;
let masterGain = null;
let analyserNode = null;
let isSuspendedIntentionally = false;

export function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioCtx.destination);

    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.88;
    masterGain.connect(analyserNode);
  }
  if (audioCtx.state === 'suspended' && !isSuspendedIntentionally) {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getMasterGain() {
  if (!masterGain) getAudioContext();
  return masterGain;
}

export function setMasterVolume(val) {
  const g = getMasterGain();
  const ctx = getAudioContext();
  const targetVal = Math.max(0, Math.min(1, val));
  try {
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(targetVal, ctx.currentTime + 0.1);
  } catch (e) {
    g.gain.value = targetVal;
  }
}

export function createWhiteNoise(duration = 1) {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function createPinkNoise(duration = 1) {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

const toneCache = new Map();

export function createTone(frequency, duration = 1, type = 'sine') {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }
  return buffer;
}

export function createNotchFilter(frequency, Q = 1) {
  const ctx = getAudioContext();
  const filter = ctx.createBiquadFilter();
  filter.type = 'notch';
  filter.frequency.value = frequency;
  filter.Q.value = Q;
  return filter;
}

export function createOscillator(frequency, type = 'sine') {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  return osc;
}

export function playBuffer(buffer, loop = false, gain = 0.5) {
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;

  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;

  source.connect(gainNode);
  gainNode.connect(getMasterGain());
  source.start();
  return source;
}

export function connectFilter(source, filter) {
  source.disconnect();
  source.connect(filter);
  filter.connect(getMasterGain());
  return filter;
}

export function getAnalyserNode() {
  if (!analyserNode) getAudioContext();
  return analyserNode;
}

export function suspendAudio() {
  isSuspendedIntentionally = true;
  if (audioCtx && audioCtx.state === 'running') {
    audioCtx.suspend();
  }
}

export function resumeAudio() {
  isSuspendedIntentionally = false;
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function isAudioSuspended() {
  return audioCtx && audioCtx.state === 'suspended';
}