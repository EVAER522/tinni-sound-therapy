// Notch therapy audio processing module

import { getAudioContext, createWhiteNoise, createPinkNoise, createNotchFilter, getMasterGain } from './engine.js';

let currentNodes = {};
let isRunning = false;

// --- uploaded audio ---
let uploadedAudioBuffer = null;
let uploadedAudioName = "";

// --- mic ---
let micStream = null;

export function isTherapyRunning() {
  return isRunning;
}

export function loadUploadedAudio(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const ctx = getAudioContext();
      try {
        uploadedAudioBuffer = await ctx.decodeAudioData(e.target.result);
        uploadedAudioName = file.name;
        resolve(uploadedAudioBuffer);
      } catch (err) {
        uploadedAudioBuffer = null;
        uploadedAudioName = "";
        reject(err);
      }
    };
    reader.onerror = () => { uploadedAudioBuffer = null; reject(); };
    reader.readAsArrayBuffer(file);
  });
}

export function clearUploadedAudio() {
  uploadedAudioBuffer = null;
  uploadedAudioName = "";
}

export function getUploadedAudioName() {
  return uploadedAudioName;
}

export async function startMic() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch (e) {
    console.warn("Mic access denied:", e);
    return false;
  }
}

export function stopMic() {
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
}

export function isMicActive() {
  return !!micStream;
}

/**
 * Audio graph: (carrier noise + uploaded audio + mic) -> mixerGain 
 *                                                     -> dryGain (gain = depth) -------> Master
 *                                                     -> notchFilter -> wetGain (1-depth) -> Master
 */

export function startTherapy(frequency, bandwidth = "medium", depth = -12, carrier = "white", options = {}) {
  const { useVoice = false, useUpload = false } = options;
  const ctx = getAudioContext();
  stopTherapy();
  isRunning = true;

  const mixerGain = ctx.createGain();
  // Smooth fade-in: start at 0, ramp to 0.7 over 200ms
  mixerGain.gain.setValueAtTime(0, ctx.currentTime);
  mixerGain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.2);

  const Qmap = { narrow: 4.32, medium: 2.87, wide: 1.41 };
  const notchFilter = createNotchFilter(frequency, Qmap[bandwidth] || 2.87);

  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  
  const depthMap = { "-3": 0.707, "-6": 0.5, "-12": 0.25, "-20": 0.1 };
  const g = depthMap[String(depth)] || 0.25;
  
  dryGain.gain.value = g;
  wetGain.gain.value = 1 - g;

  mixerGain.connect(dryGain);
  dryGain.connect(getMasterGain());

  mixerGain.connect(notchFilter);
  notchFilter.connect(wetGain);
  wetGain.connect(getMasterGain());

  const sourceNodes = [];

  // 1. Carrier noise
  const noiseBuf = carrier === "pink" ? createPinkNoise(30) : createWhiteNoise(30);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  noiseSrc.loop = true;
  noiseSrc.connect(mixerGain);
  noiseSrc.start();
  sourceNodes.push(noiseSrc);

  // 2. Uploaded audio
  if (useUpload && uploadedAudioBuffer) {
    const uploadSrc = ctx.createBufferSource();
    uploadSrc.buffer = uploadedAudioBuffer;
    uploadSrc.loop = true;
    const uploadGain = ctx.createGain();
    uploadGain.gain.value = 0.45;
    uploadSrc.connect(uploadGain);
    uploadGain.connect(mixerGain);
    uploadSrc.start();
    sourceNodes.push(uploadSrc, uploadGain);
  }

  // 3. Mic
  if (useVoice && micStream) {
    const micSrc = ctx.createMediaStreamSource(micStream);
    const micGain = ctx.createGain();
    micGain.gain.value = 0.35;
    micSrc.connect(micGain);
    micGain.connect(mixerGain);
    sourceNodes.push(micSrc, micGain);
  }

  currentNodes = { mixerGain, notchFilter, dryGain, wetGain, sourceNodes };
  return currentNodes;
}

export function stopTherapy() {
  isRunning = false;
  const ctx = getAudioContext();
  const nodes = currentNodes;
  currentNodes = {};

  if (nodes.mixerGain) {
    try {
      nodes.mixerGain.gain.setValueAtTime(nodes.mixerGain.gain.value, ctx.currentTime);
      nodes.mixerGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15); // Smooth fade-out over 150ms
    } catch (e) {}
  }

  // Disconnect and stop nodes after the fade-out completes
  setTimeout(() => {
    if (nodes.sourceNodes) {
      nodes.sourceNodes.forEach((n) => {
        try { if (n.stop) n.stop(); } catch (e) {}
        try { n.disconnect(); } catch (e) {}
      });
    }
    ["mixerGain", "notchFilter", "dryGain", "wetGain"].forEach((k) => {
      const n = nodes[k];
      if (n) try { n.disconnect(); } catch (e) {}
    });
  }, 160);
}

export function updateTherapyParams(frequency, bandwidth = "medium", depth = -12) {
  const Qmap = { narrow: 4.32, medium: 2.87, wide: 1.41 };
  const notchFilter = currentNodes.notchFilter;
  const dryGain = currentNodes.dryGain;
  const wetGain = currentNodes.wetGain;
  if (notchFilter) {
    notchFilter.frequency.value = frequency;
    notchFilter.Q.value = Qmap[bandwidth] || 2.87;
  }
  const depthMap = { "-3": 0.707, "-6": 0.5, "-12": 0.25, "-20": 0.1 };
  const g = depthMap[String(depth)] || 0.25;
  if (dryGain) {
    dryGain.gain.value = g;
  }
  if (wetGain) {
    wetGain.gain.value = 1 - g;
  }
}

// ============================================================
// 2AFC adaptive staircase matching
// Phase 1-3: coarse -> fine -> verification
// ============================================================

export function createMatchingSession() {
  const octaveBands = [125, 250, 500, 1000, 2000, 4000, 8000, 12000];
  let phase = "coarse";
  let coarseLow = 0;
  let coarseHigh = octaveBands.length - 1;
  let currentFreqLow = 0;
  let currentFreqHigh = 0;
  let fineCenter = null;
  let fineStep = null;
  let trialCount = 0;
  const maxFineTrials = 30;
  let reversals = [];
  let activeNodes = [];

  function stopActiveNodes() {
    activeNodes.forEach((n) => {
      try { if (n.stop) n.stop(); } catch (e) {}
      try { if (n.disconnect) n.disconnect(); } catch (e) {}
    });
    activeNodes = [];
  }

  function createToneNode(freq, startTime, duration, useNoise, ear) {
    const ctx = getAudioContext();
    let sourceNode = null;
    const nodes = [];

    if (useNoise) {
      const bufLen = ctx.sampleRate * duration;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = freq;
      filter.Q.value = 8;
      src.connect(filter);
      sourceNode = filter;
      nodes.push(src, filter);
    } else {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      sourceNode = osc;
      nodes.push(osc);
    }

    const gain = ctx.createGain();
    // Fade in
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.08);
    // Sustain
    gain.gain.setValueAtTime(0.3, startTime + duration - 0.08);
    // Fade out
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    sourceNode.connect(gain);
    nodes.push(gain);

    // Stereo panning
    if (ear === "left" || ear === "right") {
      const panner = ctx.createStereoPanner();
      panner.pan.value = ear === "left" ? -1 : 1;
      gain.connect(panner);
      panner.connect(getMasterGain());
      nodes.push(panner);
    } else {
      gain.connect(getMasterGain());
    }

    if (nodes[0].start) {
      nodes[0].start(startTime);
      nodes[0].stop(startTime + duration);
    }
    return nodes;
  }

  function playPair(freqA, freqB, useNoise, ear) {
    const ctx = getAudioContext();
    stopActiveNodes();
    const dur = 1.5;
    const gap = 1.0;
    const nodesA = createToneNode(freqA, ctx.currentTime, dur, useNoise, ear);
    const nodesB = createToneNode(freqB, ctx.currentTime + dur + gap, dur, useNoise, ear);
    activeNodes = [...nodesA, ...nodesB];
    return { freqA, freqB };
  }

  function getNextFreqs() {
    if (phase === "coarse") {
      if (coarseHigh - coarseLow <= 1) {
        phase = "fine";
        const lo = octaveBands[coarseLow];
        const hi = octaveBands[coarseHigh];
        fineCenter = Math.round(Math.sqrt(lo * hi));
        fineStep = Math.round(fineCenter * 0.12);
        fineStep = Math.max(fineStep, 10);
        currentFreqLow = Math.max(20, fineCenter - fineStep);
        currentFreqHigh = Math.min(16000, fineCenter + fineStep);
        return { freqA: currentFreqLow, freqB: currentFreqHigh };
      }
      const mid = Math.floor((coarseLow + coarseHigh) / 2);
      currentFreqLow = octaveBands[mid];
      currentFreqHigh = octaveBands[mid + 1];
      return { freqA: currentFreqLow, freqB: currentFreqHigh };
    }
    if (phase === "fine") {
      if (trialCount >= maxFineTrials) {
        phase = "verification";
        return null;
      }
      currentFreqLow = Math.max(20, Math.round(fineCenter - fineStep));
      currentFreqHigh = Math.min(16000, Math.round(fineCenter + fineStep));
      return { freqA: currentFreqLow, freqB: currentFreqHigh };
    }
    return null;
  }

  function advance(chosenFreq) {
    trialCount++;
    if (phase === "coarse") {
      const mid = Math.floor((coarseLow + coarseHigh) / 2);
      if (chosenFreq <= octaveBands[mid]) {
        coarseHigh = mid;
      } else {
        coarseLow = mid + 1;
      }
    } else if (phase === "fine") {
      if (chosenFreq < fineCenter) {
        fineCenter = Math.round((fineCenter + currentFreqLow) / 2);
      } else {
        fineCenter = Math.round((fineCenter + currentFreqHigh) / 2);
      }
      fineStep = Math.max(5, Math.round(fineStep * 0.88));
      reversals.push(fineCenter);
      if (reversals.length >= 6) {
        const last6 = reversals.slice(-6);
        const range = Math.max(...last6) - Math.min(...last6);
        if (range / fineCenter < 0.02) {
          phase = "verification";
        }
      }
    }
  }

  function getConfidence() {
    if (phase === "coarse") return Math.max(1, Math.min(5, Math.floor(trialCount / 2)));
    if (phase === "fine") return Math.max(2, Math.min(5, 2 + Math.floor(trialCount / 4)));
    if (reversals.length < 2) return 2;
    const last6 = reversals.slice(-6);
    const range = Math.max(...last6) - Math.min(...last6);
    const avg = last6.reduce((a, b) => a + b, 0) / last6.length;
    const pct = range / avg;
    if (pct < 0.02) return 5;
    if (pct < 0.05) return 4;
    if (pct < 0.10) return 3;
    return 2;
  }

  function getResult() {
    if (reversals.length > 0) return Math.round(reversals[reversals.length - 1]);
    if (fineCenter) return Math.round(fineCenter);
    const lo = octaveBands[coarseLow];
    const hi = octaveBands[Math.min(coarseHigh, octaveBands.length - 1)];
    return Math.round((lo + hi) / 2);
  }

  return {
    playPair,
    stopActiveNodes,
    getNextFreqs,
    advance,
    get totalSteps() { return maxFineTrials + 6; },
    get currentStep() { return trialCount; },
    get testFrequencies() { return [currentFreqLow, currentFreqHigh]; },
    getResult,
    getConfidence,
    get phase() { return phase; },
    get fineCenter() { return fineCenter ? Math.round(fineCenter) : 0; },
  };
}
