import { writable, derived } from "svelte/store";

// --- Frequency matching state ---
export const matchMethod = writable(""); // "2afc" | "manual"
export const matchEar = writable("left"); // "left" | "right" | "both"
export const matchStep = writable(0);
export const matchTotalSteps = writable(30);
export const matchResults = writable({ left: null, right: null, confidence: 0 });
export const matchConfidence = writable(0);
export const matchPhase = writable("method-select"); // method-select | ear-select | matching | verification | complete

// --- Upload & Voice toggles (Issue 1) ---
export const useVoice = writable(false);
export const useUpload = writable(false);
export const uploadedFileName = writable("");

// --- Notch filter parameters ---
export const notchParams = writable({
  left: { frequency: null, bandwidth: "medium", depth: -12 },
  right: { frequency: null, bandwidth: "medium", depth: -12 },
  independent: false,
});

// --- Session state ---
export const sessionTimer = writable(0);
export const sessionDuration = writable(30); // minutes
export const sessionEndedBy = writable(null); // "timer" | "manual" | "emergency"

// --- Post-session rating ---
export const postFeeling = writable(null); // "better" | "unchanged" | "worse"
export const postSeverity = writable(5);
export const postNote = writable("");

// --- Daily tinnitus check ---
export const tinnitusToday = writable(null); // "yes" | "mild" | "no"
