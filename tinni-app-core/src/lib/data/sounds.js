// Sound data for sleep soundscape — real audio files from 音效 folder

export const soundLibrary = [
  { id: 'rain', name: '雨声', icon: '🌧️', category: 'nature', file: 'audio/雨声.mp3' },
  { id: 'thunder', name: '雷雨', icon: '⛈️', category: 'nature', file: 'audio/雷雨.mp3' },
  { id: 'waves', name: '海浪', icon: '🌊', category: 'nature', file: 'audio/海浪.mp3' },
  { id: 'stream', name: '小溪', icon: '💧', category: 'nature', file: 'audio/小溪.mp3' },
  { id: 'fire', name: '篝火', icon: '🔥', category: 'nature', file: 'audio/篝火.mp3' },
  { id: 'wind', name: '风声', icon: '🍃', category: 'nature', file: 'audio/风声.mp3' },
  { id: 'birds', name: '鸟鸣', icon: '🐦', category: 'nature', file: 'audio/鸟鸣.mp3' },
  { id: 'insects', name: '虫鸣', icon: '🦗', category: 'nature', file: 'audio/虫鸣.mp3' },
  { id: 'cat-purr', name: '猫咪呼噜', icon: '🐱', category: 'animals', file: 'audio/猫咪呼噜.mp3' },
  { id: 'fan', name: '风扇', icon: '🌀', category: 'ambient', file: 'audio/风扇.mp3' },
  { id: 'pinknoise', name: '粉红噪声', icon: '🌸', category: 'noise', file: 'audio/粉红噪声.mp3' },
  { id: 'brownnoise', name: '布朗噪声', icon: '🟤', category: 'noise', file: 'audio/布朗噪声.mp3' },
];

export const defaultPresets = [
  {
    id: 'deep-sleep',
    name: '深度睡眠',
    icon: '🌙',
    tracks: [
      { soundId: 'rain', volume: 0.5 },
      { soundId: 'pinknoise', volume: 0.3 },
    ]
  },
  {
    id: 'rainy-night',
    name: '雨夜',
    icon: '🌧️',
    tracks: [
      { soundId: 'rain', volume: 0.6 },
      { soundId: 'thunder', volume: 0.3 },
    ]
  },
  {
    id: 'ocean',
    name: '海洋',
    icon: '🌊',
    tracks: [
      { soundId: 'waves', volume: 0.5 },
      { soundId: 'wind', volume: 0.2 },
    ]
  },
  {
    id: 'campfire',
    name: '篝火夜',
    icon: '🔥',
    tracks: [
      { soundId: 'fire', volume: 0.5 },
      { soundId: 'insects', volume: 0.2 },
    ]
  },
  {
    id: 'purr-sleep',
    name: '猫咪陪伴',
    icon: '🐱',
    tracks: [
      { soundId: 'cat-purr', volume: 0.5 },
      { soundId: 'brownnoise', volume: 0.2 },
    ]
  },
];

export function findSound(id) {
  return soundLibrary.find(s => s.id === id);
}