import { writable, derived } from 'svelte/store';

// Current mode: 'therapy' | 'brainwave' | 'sleep'
export const currentMode = writable('therapy');

// Sub-views within each mode
export const therapyView = writable('match'); // 'match' | 'session' | 'result'

// Onboarding state
export const onboardingComplete = writable(false);
export const onboardingStep = writable(0);

// Audio state
export const isPlaying = writable(false);
export const volume = writable(0.7);
export const isMuted = writable(false);
export const isDarkMode = writable(false);
export const isMicromode = writable(false);

// Treatment records
export const records = writable([]);

// Alert message
export const alert = writable(null);
