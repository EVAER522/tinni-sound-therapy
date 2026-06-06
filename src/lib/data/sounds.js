// Sound data for sleep soundscape mode
//
// In a production build, these would reference actual audio files bundled with the app.
// For the MVP, we use Web Audio API synthesis for each sound type.

export const soundLibrary = [
  { id: 'rain', name: '雨声', icon: '🌧️', category: 'nature', synthesizable: true, freq: { type: 'noise', filter: { type: 'lowpass', freq: 2000 } } },
  { id: 'waves', name: '海浪', icon: '🌊', category: 'nature', synthesizable: true, freq: { type: 'noise', filter: { type: 'lowpass', freq: 800, gain: 2 } } },
  { id: 'stream', name: '溪流', icon: '🏞️', category: 'nature', synthesizable: true, freq: { type: 'noise', filter: { type: 'highpass', freq: 3000 } } },
  { id: 'fire', name: '篝火', icon: '🔥', category: 'nature', synthesizable: true, freq: { type: 'noise', filter: { type: 'bandpass', freq: 500, Q: 0.5 } } },
  { id: 'whitenoise', name: '白噪音', icon: '📡', category: 'noise', synthesizable: true, freq: { type: 'white' } },
  { id: 'pinknoise', name: '粉红噪音', icon: '🌸', category: 'noise', synthesizable: true, freq: { type: 'pink' } },
  { id: 'forest', name: '森林', icon: '🌲', category: 'nature', synthesizable: true, freq: { type: 'noise', filter: { type: 'bandpass', freq: 1000, Q: 1 } } },
  { id: 'thunder', name: '雷雨', icon: '⛈️', category: 'nature', synthesizable: true, freq: { type: 'noise', filter: { type: 'lowpass', freq: 400 } } },
  { id: 'fan', name: '风扇', icon: '🌀', category: 'ambient', synthesizable: true, freq: { type: 'noise', filter: { type: 'lowpass', freq: 300 } } },
  { id: 'train', name: '火车', icon: '🚃', category: 'ambient', synthesizable: true, freq: { type: 'noise', filter: { type: 'bandpass', freq: 200, Q: 2 } } },
  { id: 'birds', name: '鸟鸣', icon: '🐦', category: 'nature', synthesizable: true, freq: { type: 'tone', freq: 3000, mod: { rate: 4, depth: 500 } } },
  { id: 'lullaby', name: '摇篮曲', icon: '🎵', category: 'music', synthesizable: true, freq: { type: 'tone', freq: 440, mod: { rate: 1, depth: 200 } } },
  { id: 'brownnoise', name: '布朗噪音', icon: '🟤', category: 'noise', synthesizable: true, freq: { type: 'noise', filter: { type: 'lowpass', freq: 200 } } },
  { id: 'creek', name: '小溪', icon: '💧', category: 'nature', synthesizable: true, freq: { type: 'noise', filter: { type: 'highpass', freq: 2000 } } },
  { id: 'wind', name: '风声', icon: '🍃', category: 'nature', synthesizable: true, freq: { type: 'noise', filter: { type: 'lowpass', freq: 600 } } },
];

export const defaultPresets = [
  {
    id: 'deep-sleep',
    name: '深度睡眠',
    icon: '🌙',
    tracks: [
      { soundId: 'rain', volume: 0.6 },
      { soundId: 'whitenoise', volume: 0.3 },
    ]
  },
  {
    id: 'rainy-night',
    name: '雨夜',
    icon: '🌧️',
    tracks: [
      { soundId: 'rain', volume: 0.7 },
      { soundId: 'thunder', volume: 0.3 },
    ]
  },
  {
    id: 'ocean',
    name: '海洋',
    icon: '🌊',
    tracks: [
      { soundId: 'waves', volume: 0.6 },
      { soundId: 'wind', volume: 0.2 },
    ]
  },
  {
    id: 'forest-calm',
    name: '森林静心',
    icon: '🌲',
    tracks: [
      { soundId: 'forest', volume: 0.5 },
      { soundId: 'birds', volume: 0.3 },
      { soundId: 'stream', volume: 0.3 },
    ]
  },
  {
    id: 'meditation',
    name: '冥想',
    icon: '🧘',
    tracks: [
      { soundId: 'pinknoise', volume: 0.4 },
      { soundId: 'fire', volume: 0.3 },
    ]
  },
];

export function findSound(id) {
  return soundLibrary.find(s => s.id === id);
}
