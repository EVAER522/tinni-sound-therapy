import { writable, derived } from 'svelte/store';
import { persist } from './app.js';

// Brainwave state
export const brainwaveMode = writable('alpha'); // 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma' | 'schumann' | 'isochronic'
export const brainwaveType = writable('binaural'); // 'binaural' | 'isochronic'
export const brainwaveBgNoise = writable(true);
export const brainwaveTimer = writable(30); // minutes
export const brainwaveCustomFreq = writable(7.83);

// Sleep soundscape state
export const activeTracks = writable([]);
export const soundPresets = persist(writable([]), 'tinni_sound_presets');
export const sleepTimer = writable(30); // minutes
export const selectedPreset = writable(null);


// Common
export const remainingTime = writable(0);
export const audioProgress = writable(0);
