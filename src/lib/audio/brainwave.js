// Brainwave entrainment audio processing

import { getAudioContext, getMasterGain } from './engine.js';

const brainwaveFreqs = {
  delta: { min: 0.5, max: 4 },
  theta: { min: 4, max: 8 },
  alpha: { min: 8, max: 14 },
  beta: { min: 14, max: 30 },
  gamma: { min: 30, max: 100 },
  schumann: { min: 7.83, max: 7.83 },
};

const brainwaveNames = {
  delta: "Delta δ",
  theta: "Theta θ",
  alpha: "Alpha α",
  beta: "Beta β",
  gamma: "Gamma γ",
  schumann: "Schumann",
  isochronic: "自定义"
};

let brainwaveNodes = [];
let brainwaveRunning = false;
let lastParams = { mode: "alpha", type: "binaural", customFreq: null };

export function getBrainwaveName(mode) {
  return brainwaveNames[mode] || mode;
}

export function isBrainwaveRunning() {
  return brainwaveRunning;
}

export function startBrainwave(mode, type = "binaural", customFreq = null) {
  const ctx = getAudioContext();
  stopBrainwave();
  brainwaveRunning = true;
  lastParams = { mode, type, customFreq };

  const carrierFreq = 200;
  const bw = brainwaveFreqs[mode];
  const beatFreq = customFreq || (bw ? (bw.min + bw.max) / 2 : 10);

  if (type === "binaural") {
    const oscL = ctx.createOscillator();
    oscL.type = "sine";
    oscL.frequency.value = carrierFreq;
    const panL = ctx.createStereoPanner();
    panL.pan.value = -1;
    const gainL = ctx.createGain();
    gainL.gain.value = 0.2;
    oscL.connect(gainL);
    gainL.connect(panL);
    panL.connect(getMasterGain());
    oscL.start();

    const oscR = ctx.createOscillator();
    oscR.type = "sine";
    oscR.frequency.value = carrierFreq + beatFreq;
    const panR = ctx.createStereoPanner();
    panR.pan.value = 1;
    const gainR = ctx.createGain();
    gainR.gain.value = 0.2;
    oscR.connect(gainR);
    gainR.connect(panR);
    panR.connect(getMasterGain());
    oscR.start();

    brainwaveNodes = [oscL, oscR, gainL, gainR, panL, panR];
    return { oscL, oscR, beatFreq };
  } else {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = carrierFreq;

    const gain = ctx.createGain();
    gain.gain.value = 0.2;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = beatFreq;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.start();
    lfo.start();

    brainwaveNodes = [osc, gain, lfo, lfoGain];
    return { osc, beatFreq, pulseFreq: beatFreq };
  }
}

/** Restart brainwave with new params while keeping running state */
export function restartBrainwave(mode, type, customFreq) {
  if (brainwaveRunning) {
    startBrainwave(mode, type, customFreq);
  }
}

export function stopBrainwave() {
  brainwaveRunning = false;
  brainwaveNodes.forEach(node => {
    try { node.stop(); } catch(e) {}
    try { node.disconnect(); } catch(e) {}
  });
  brainwaveNodes = [];
}

