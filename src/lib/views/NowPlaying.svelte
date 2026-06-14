<script>
  import { isPlaying, currentMode, sheetContent } from '../stores/app.js';
  import { audioProgress, remainingTime, brainwaveMode } from '../stores/audio.js';
  import { getBrainwaveName } from '../audio/brainwave.js';
  import { isAudioSuspended, resumeAudio, suspendAudio } from '../audio/engine.js';
  import { t } from '../stores/locale.js';

  $: trackName = $currentMode === 'therapy' ? 'Notch Therapy' : $currentMode === 'brainwave' ? getBrainwaveName($brainwaveMode) : 'Sleep Soundscape';
  $: timeStr = formatTime($remainingTime);
  $: progressPct = Math.min($audioProgress * 100, 100);

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  function togglePause() {
    if (isAudioSuspended()) { resumeAudio(); isPlaying.set(true); }
    else { suspendAudio(); isPlaying.set(false); }
  }

  function closeSheet() { sheetContent.set(null); }
</script>

<div class="nowplaying">
  <div class="np-header">
    <button class="np-close" onclick={closeSheet}>&larr;</button>
    <span class="np-heading">{$t.notch_in_session}</span>
    <div style="width:32px"></div>
  </div>
  <div class="np-art">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
      <rect x="3" y="6" width="3" height="14" rx="1" opacity="0.5"><animate attributeName="height" values="14;8;14" dur="1.2s" repeatCount="indefinite"/><animate attributeName="y" values="6;9;6" dur="1.2s" repeatCount="indefinite"/></rect>
      <rect x="8" y="4" width="3" height="18" rx="1" opacity="0.7"><animate attributeName="height" values="18;10;18" dur="1.0s" repeatCount="indefinite"/><animate attributeName="y" values="4;8;4" dur="1.0s" repeatCount="indefinite"/></rect>
      <rect x="13" y="2" width="3" height="22" rx="1" opacity="0.9"><animate attributeName="height" values="22;14;22" dur="0.8s" repeatCount="indefinite"/><animate attributeName="y" values="2;6;2" dur="0.8s" repeatCount="indefinite"/></rect>
      <rect x="18" y="5" width="3" height="16" rx="1" opacity="0.6"><animate attributeName="height" values="16;9;16" dur="1.1s" repeatCount="indefinite"/><animate attributeName="y" values="5;9;5" dur="1.1s" repeatCount="indefinite"/></rect>
    </svg>
  </div>
  <div class="np-title">{trackName}</div>
  <div class="np-time">{timeStr}</div>
  <div class="np-progress">
    <div class="np-progress-track">
      <div class="np-progress-fill" style="width: {progressPct}%"></div>
    </div>
  </div>
  <div class="np-controls">
    <button class="np-btn" onclick={togglePause}>{isAudioSuspended() ? String.fromCharCode(9654) : String.fromCharCode(9208)}</button>
  </div>
</div>

<style>
  .nowplaying { display: flex; flex-direction: column; align-items: center; gap: var(--space-lg); padding: var(--space-md) 0; }
  .np-header { display: flex; align-items: center; justify-content: space-between; width: 100%; }
  .np-close { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; border: none; color: var(--text-primary); font-size: 20px; cursor: pointer; }
  .np-heading { font-size: 16px; font-weight: 600; color: var(--text-primary); }
  .np-art { width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; color: rgba(108,92,231,0.7); }
  .np-title { font-size: 22px; font-weight: 700; color: var(--text-primary); }
  .np-time { font-size: 16px; font-weight: 500; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
  .np-progress { width: 100%; max-width: 300px; }
  .np-progress-track { height: 4px; background: rgba(255,255,255,0.12); border-radius: 2px; overflow: hidden; }
  .np-progress-fill { height: 100%; background: var(--accent-blue-purple); border-radius: 2px; transition: width 0.3s; }
  .np-controls { display: flex; gap: var(--space-md); }
  .np-btn { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; background: var(--glass-bg-light); border: 1px solid var(--glass-border); color: var(--text-primary); cursor: pointer; }
</style>