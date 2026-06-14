<script>
  import { isPlaying, currentMode } from '../stores/app.js';
  import { t } from '../stores/locale.js';
  import { remainingTime } from '../stores/audio.js';
  import { getBrainwaveName } from '../audio/brainwave.js';
  import { brainwaveMode } from '../stores/audio.js';

  $: isVisible = $isPlaying;
  $: trackName = $currentMode === 'therapy' ? 'Notch Therapy' : $currentMode === 'brainwave' ? getBrainwaveName($brainwaveMode) : 'Sleep Soundscape';
  $: timeStr = formatTime($remainingTime);
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }
  function expandPlayer() {
    // dispatched event will be caught by MiniPlayer to expand sheet
    window.dispatchEvent(new CustomEvent('expand-player'));
  }
</script>

{#if isVisible}
  <button class="dynamic-island" onclick={expandPlayer} aria-label="Now Playing">
    <svg class="wave-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="10" width="3" height="6" rx="1" fill="currentColor" opacity="0.4">
        <animate attributeName="height" values="6;12;6" dur="1.2s" repeatCount="indefinite"/>
        <animate attributeName="y" values="10;7;10" dur="1.2s" repeatCount="indefinite"/>
      </rect>
      <rect x="7" y="6" width="3" height="14" rx="1" fill="currentColor" opacity="0.7">
        <animate attributeName="height" values="14;8;14" dur="1.0s" repeatCount="indefinite"/>
        <animate attributeName="y" values="6;9;6" dur="1.0s" repeatCount="indefinite"/>
      </rect>
      <rect x="12" y="8" width="3" height="10" rx="1" fill="currentColor" opacity="0.9">
        <animate attributeName="height" values="10;16;10" dur="0.8s" repeatCount="indefinite"/>
        <animate attributeName="y" values="8;5;8" dur="0.8s" repeatCount="indefinite"/>
      </rect>
      <rect x="17" y="5" width="3" height="16" rx="1" fill="currentColor" opacity="0.6">
        <animate attributeName="height" values="16;10;16" dur="1.1s" repeatCount="indefinite"/>
        <animate attributeName="y" values="5;8;5" dur="1.1s" repeatCount="indefinite"/>
      </rect>
    </svg>
    <span class="island-title">{trackName}</span>
    <span class="island-time">{timeStr}</span>
  </button>
{/if}

<style>
  .dynamic-island { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; background: var(--glass-bg-medium); backdrop-filter: blur(20px) saturate(1.8); -webkit-backdrop-filter: blur(20px) saturate(1.8); border: 1px solid var(--glass-border); border-radius: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); color: var(--text-primary); cursor: pointer; animation: island-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); will-change: transform; transform: translateZ(0); }
  .dynamic-island:hover { background: var(--glass-bg-heavy); }
  @keyframes island-in { from { transform: translateY(-40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .wave-icon { flex-shrink: 0; color: rgba(108,92,231,0.9); }
  .island-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
  .island-time { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
</style>
