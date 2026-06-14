import { writable, derived } from 'svelte/store';

// Helper to persist stores to localStorage
export function persist(store, key) {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        store.set(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse persisted state for key:", key, e);
      }
    }
    store.subscribe(val => {
      localStorage.setItem(key, JSON.stringify(val));
    });
  }
  return store;
}

// Current mode: 'therapy' | 'brainwave' | 'sleep'
export const currentMode = writable('therapy');

// Sub-views within each mode
export const therapyView = writable('match');

// Onboarding state
export const onboardingComplete = persist(writable(false), 'tinni_onboarding_complete');
export const onboardingStep = writable(0);

// Audio state
export const isPlaying = writable(false);
export const volume = persist(writable(0.7), 'tinni_volume');
export const isMuted = writable(false);
export const isDarkMode = persist(writable(true), 'tinni_dark_mode'); // Default to true (Dark Theme active)
export const isMicromode = persist(writable(false), 'tinni_micromode');

// Treatment records
export const records = persist(writable([]), 'tinni_records');

// Alert message
export const alert = writable(null);
// Locale
export const locale = persist(writable('zh'), 'tinni_locale');

// iOS 26 new stores
// activeTab: 0=therapy, 1=brainwave, 2=sleep, 3=records
export const activeTab = writable(0);
// Sheet content: null | { component, props }
export const sheetContent = writable(null);
// Background animation toggle
export const bgAnimationEnabled = persist(writable(true), 'tinni_bg_animation_enabled');
// Toast: null | { message, type ('info'|'error'|'success'), duration }
export const toast = writable(null);

// Session active tracking
export const sessionActive = writable(false);

// Derive currentMode from activeTab
const tabToMode = ['therapy', 'brainwave', 'sleep', 'records'];
activeTab.subscribe(tab => {
  if (tab >= 0 && tab < 3) currentMode.set(tabToMode[tab]);
});

