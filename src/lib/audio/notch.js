// Notch therapy audio processing module

import { getAudioContext, createWhiteNoise, createPinkNoise, createNotchFilter, createTone, getMasterGain } from './engine.js';

let currentNodes = [];
let isRunning = false;

export function isTherapyRunning() {
  return isRunning;
}

export function startTherapy(frequency, bandwidth = 'medium', depth = -12, carrier = 'white') {
  const ctx = getAudioContext();
  stopTherapy();

  isRunning = true;

  // Create carrier noise
  const duration = 30; // recycle every 30s
  const buffer = carrier === 'pink' ? createPinkNoise(duration) : createWhiteNoise(duration);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Notch filter
  const Qmap = { narrow: 4.3, medium: 2.0, wide: 1.0 };
  const Q = Qmap[bandwidth] || 2.0;
  const notchFilter = createNotchFilter(frequency, Q);

  // Depth gain
  const depthGain = ctx.createGain();
  // Convert dB to linear gain
  // -3dB = 0.707, -6dB = 0.5, -12dB = 0.25, -20dB = 0.1
  const depthMap = { '-3': 0.707, '-6': 0.5, '-12': 0.25, '-20': 0.1 };
  depthGain.gain.value = depthMap[String(depth)] || 0.25;

  source.connect(notchFilter);
  notchFilter.connect(depthGain);
  depthGain.connect(getMasterGain());
  source.start();

  currentNodes = [source, notchFilter, depthGain];
  return { source, notchFilter, depthGain };
}

export function stopTherapy() {
  isRunning = false;
  currentNodes.forEach(node => {
    try { node.disconnect(); } catch(e) {}
  });
  currentNodes = [];
}

export function updateTherapyParams(frequency, bandwidth = 'medium', depth = -12) {
  const Qmap = { narrow: 4.3, medium: 2.0, wide: 1.0 };
  const notchFilter = currentNodes[1];
  const depthGain = currentNodes[2];
  if (notchFilter) {
    notchFilter.frequency.value = frequency;
    notchFilter.Q.value = Qmap[bandwidth] || 2.0;
  }
  if (depthGain) {
    const depthMap = { '-3': 0.707, '-6': 0.5, '-12': 0.25, '-20': 0.1 };
    depthGain.gain.value = depthMap[String(depth)] || 0.25;
  }
}

// 2AFC Matching - plays two tones and lets user pick which matches their tinnitus
// Returns: a function to generate the next trial
export function createMatchingSession() {
  const testFrequencies = [
    125, 250, 500, 750, 1000, 1500, 2000, 3000, 4000,
    5000, 6000, 8000, 10000, 12000
  ];
  let currentFreqIndex = 0;
  let results = [];

  function playPair(freqA, freqB) {
    const ctx = getAudioContext();
    const duration = 1.5;

    // Tone A
    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = freqA;
    const gainA = ctx.createGain();
    gainA.gain.value = 0.3;
    oscA.connect(gainA);
    gainA.connect(getMasterGain());
    oscA.start(ctx.currentTime);
    oscA.stop(ctx.currentTime + duration);

    // Tone B
    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = freqB;
    const gainB = ctx.createGain();
    gainB.gain.value = 0.3;
    oscB.connect(gainB);
    gainB.connect(getMasterGain());
    oscB.start(ctx.currentTime + duration + 1); // 1s silence between
    oscB.stop(ctx.currentTime + 2 * duration + 1);

    return { freqA, freqB };
  }

  return {
    playPair,
    getNextFreqs() {
      const idx = currentFreqIndex;
      if (idx >= testFrequencies.length - 1) return null;
      return {
        freqA: testFrequencies[idx],
        freqB: testFrequencies[idx + 1],
      };
    },
    advance() {
      currentFreqIndex++;
    },
    get totalSteps() { return testFrequencies.length; },
    get currentStep() { return currentFreqIndex; },
    get testFrequencies() { return testFrequencies; },
  };
}
