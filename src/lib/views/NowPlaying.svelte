<script>
  import { isPlaying, currentMode, sheetContent, volume } from '../stores/app.js';
  import { audioProgress, remainingTime, brainwaveMode, activeTracks } from '../stores/audio.js';
  import { getBrainwaveName } from '../audio/brainwave.js';
  import { isAudioSuspended, resumeAudio, suspendAudio, setMasterVolume } from '../audio/engine.js';
  import { notchParams, sessionDuration } from '../stores/therapy.js';
  import { sleepTimer, brainwaveTimer } from '../stores/audio.js';
  import { findSound } from '../data/sounds.js';
  import { t } from '../stores/locale.js';

  $: trackName = $currentMode === 'therapy' ? 'Notch Therapy' : $currentMode === 'brainwave' ? getBrainwaveName($brainwaveMode) : 'Sleep Soundscape';
  $: timeStr = formatTime($remainingTime);
  $: progressPct = Math.min($audioProgress * 100, 100);

  // Subtitle / config description
  $: subtitle = (() => {
    if ($currentMode === 'therapy') {
      const freq = $notchParams?.left?.frequency;
      const bw = $notchParams?.left?.bandwidth;
      const depth = $notchParams?.left?.depth;
      return freq ? `Notched (${Math.round(freq)} Hz • ${bw.toUpperCase()} • ${depth}dB)` : 'Notched White Noise';
    } else if ($currentMode === 'brainwave') {
      const typeLabel = $brainwaveMode === 'isochronic' ? 'Isochronic' : 'Binaural';
      return `${typeLabel} Beats • ${$brainwaveMode.toUpperCase()} wave`;
    } else {
      if (!$activeTracks || $activeTracks.length === 0) return 'Relaxing Nature Mix';
      return $activeTracks.map(t => {
        const s = findSound(t.soundId);
        return s ? s.name : '';
      }).filter(Boolean).join(' + ');
    }
  })();

  // Calculate elapsed time
  $: totalSec = $currentMode === 'therapy' ? $sessionDuration * 60 : $currentMode === 'brainwave' ? $brainwaveTimer * 60 : $sleepTimer * 60;
  $: elapsedSec = Math.max(0, totalSec - $remainingTime);
  $: elapsedStr = formatTime(elapsedSec);

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  function togglePause() {
    if (!$isPlaying) {
      resumeAudio();
      isPlaying.set(true);
    } else {
      suspendAudio();
      isPlaying.set(false);
    }
  }

  function closeSheet() {
    sheetContent.set(null);
  }

  function handleVolumeChange(e) {
    const val = parseFloat(e.target.value);
    volume.set(val);
    setMasterVolume(val);
  }
</script>

<div class="nowplaying">
  <!-- Top bar / Drag Handle -->
  <div class="np-header">
    <button class="np-close" onclick={closeSheet} aria-label="Minimize player">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
    <div class="np-header-center">
      <span class="np-heading">{$t.notch_in_session}</span>
      {#if $isPlaying}
        <span class="np-live-badge">
          <span class="np-live-dot"></span>
          LIVE
        </span>
      {/if}
    </div>
    <div style="width:32px"></div>
  </div>

  <!-- Visualizer Cover Art -->
  <div class="np-visualizer-section">
    <div class="np-visualizer-glow" class:active={$isPlaying}></div>
    <div class="np-disc-container" class:playing={$isPlaying}>
      <div class="np-disc">
        <div class="np-disc-grooves"></div>
        <div class="np-disc-label">
          <div class="np-disc-label-inner">
            <div class="np-disc-hole"></div>
          </div>
        </div>
      </div>
      <!-- Floating animated soundwave bars in the center of the disc -->
      <div class="np-bars-overlay" class:active={$isPlaying}>
        <div class="np-bar np-bar-1"></div>
        <div class="np-bar np-bar-2"></div>
        <div class="np-bar np-bar-3"></div>
        <div class="np-bar np-bar-4"></div>
        <div class="np-bar np-bar-5"></div>
      </div>
    </div>
  </div>

  <!-- Track Information -->
  <div class="np-info-section">
    <h1 class="np-title">{trackName}</h1>
    <p class="np-subtitle">{subtitle}</p>
  </div>

  <!-- Progress Bar & Timers -->
  <div class="np-progress-section">
    <div class="np-progress-track">
      <div class="np-progress-fill" style="width: {progressPct}%"></div>
    </div>
    <div class="np-time-row">
      <span class="np-time-elapsed">{elapsedStr}</span>
      <span class="np-time-remaining">-{timeStr}</span>
    </div>
  </div>

  <!-- Main Controls Row -->
  <div class="np-controls-section">
    <!-- Utility Left: Volume icon -->
    <div class="np-utility-btn">
      {#if $volume === 0}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      {:else if $volume < 0.5}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      {:else}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      {/if}
    </div>

    <!-- Center Play/Pause button -->
    <button class="np-play-btn" class:playing={$isPlaying} aria-label="Play/Pause" onclick={togglePause}>
      {#if $isPlaying}
        <!-- Pause SVG -->
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      {:else}
        <!-- Play SVG -->
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 3px;">
          <polygon points="6 3 20 12 6 21 6 3"/>
        </svg>
      {/if}
    </button>

    <!-- Utility Right: Close/minimize indicator icon -->
    <button class="np-utility-btn clickable" onclick={closeSheet} aria-label="Stop Session">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>
      </svg>
    </button>
  </div>

  <!-- Bottom Volume Slider -->
  <div class="np-volume-section">
    <svg class="np-volume-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    </svg>
    <input type="range" min="0" max="1" step="0.01" value={$volume} oninput={handleVolumeChange} class="np-volume-slider" aria-label="Volume Slider" />
    <svg class="np-volume-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  </div>
</div>

<style>
  .nowplaying {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: var(--space-xs) 0 calc(var(--space-md) + var(--safe-bottom));
    color: var(--text-primary);
  }

  /* Header Styles */
  .np-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 var(--space-sm);
  }
  .np-close {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--glass-bg-light);
    border: 1px solid var(--glass-border);
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }
  .np-close:hover {
    background: var(--glass-bg-medium);
    color: var(--text-primary);
    transform: translateY(1px);
  }
  .np-header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .np-heading {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
  .np-live-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 9px;
    font-weight: 700;
    color: #ff7675;
    background: rgba(255, 118, 117, 0.15);
    padding: 1px 6px;
    border-radius: 9999px;
  }
  .np-live-dot {
    width: 5px;
    height: 5px;
    background: #ff7675;
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
  }

  /* Visualizer Section */
  .np-visualizer-section {
    position: relative;
    width: 170px;
    height: 170px;
    margin: var(--space-sm) 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .np-visualizer-glow {
    position: absolute;
    width: 130px;
    height: 130px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(108,92,231,0.5) 0%, rgba(116,185,255,0.2) 60%, transparent 100%);
    filter: blur(20px);
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 1;
  }
  .np-visualizer-glow.active {
    opacity: 0.8;
    transform: scale(1.2);
    animation: breathe 4s ease-in-out infinite alternate;
  }
  @keyframes breathe {
    0% { transform: scale(1.1); filter: blur(20px); }
    100% { transform: scale(1.3); filter: blur(28px); }
  }

  .np-disc-container {
    position: relative;
    width: 160px;
    height: 160px;
    z-index: 2;
    transition: transform 0.5s ease;
  }
  .np-disc {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(circle, #2d3436 0%, #090a0f 70%, #000 100%);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.05);
    border: 3px solid rgba(255, 255, 255, 0.08);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .np-disc-grooves {
    position: absolute;
    inset: 12px;
    border-radius: 50%;
    border: 1px double rgba(255, 255, 255, 0.04);
  }
  .np-disc-grooves::before {
    content: '';
    position: absolute;
    inset: 18px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.03);
  }
  .np-disc-grooves::after {
    content: '';
    position: absolute;
    inset: 30px;
    border-radius: 50%;
    border: 1px dashed rgba(255, 255, 255, 0.02);
  }
  .np-disc-label {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--accent-blue-purple);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 2px 5px rgba(0,0,0,0.3);
  }
  .np-disc-label-inner {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #090a0f;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .np-disc-hole {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.95);
    border: 1.5px solid rgba(255,255,255,0.15);
  }

  /* Disc rotation animation when playing */
  .np-disc-container.playing .np-disc {
    animation: spin 12s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Soundwave Overlay in the center */
  .np-bars-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    z-index: 5;
    pointer-events: none;
    opacity: 0.3;
    transition: opacity 0.3s;
  }
  .np-bars-overlay.active {
    opacity: 0.95;
  }
  .np-bar {
    width: 3.5px;
    height: 12px;
    background: #a29bfe;
    border-radius: 2px;
    box-shadow: 0 0 5px rgba(162, 155, 254, 0.6);
    transition: height 0.15s ease;
  }
  .np-bars-overlay.active .np-bar {
    animation: wave 1s infinite ease-in-out alternate;
  }
  .np-bars-overlay.active .np-bar:nth-child(1) { animation-duration: 1.1s; animation-delay: 0.1s; }
  .np-bars-overlay.active .np-bar:nth-child(2) { animation-duration: 0.8s; animation-delay: 0.25s; }
  .np-bars-overlay.active .np-bar:nth-child(3) { animation-duration: 1.0s; animation-delay: 0.0s; }
  .np-bars-overlay.active .np-bar:nth-child(4) { animation-duration: 0.7s; animation-delay: 0.35s; }
  .np-bars-overlay.active .np-bar:nth-child(5) { animation-duration: 1.2s; animation-delay: 0.15s; }

  @keyframes wave {
    0% { height: 10px; background: #6c5ce7; }
    50% { height: 28px; background: #a29bfe; }
    100% { height: 14px; background: #74b9ff; }
  }

  /* Track Info Section */
  .np-info-section {
    text-align: center;
    width: 100%;
    padding: 0 var(--space-md);
    margin-bottom: var(--space-xs);
  }
  .np-title {
    font-size: 21px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
    text-shadow: 0 2px 10px rgba(0,0,0,0.3);
  }
  .np-subtitle {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    line-height: 1.4;
    max-width: 90%;
    margin: 0 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* Progress Section */
  .np-progress-section {
    width: 100%;
    max-width: 310px;
    padding: 0 var(--space-xs);
    margin-bottom: var(--space-sm);
  }
  .np-progress-track {
    height: 5px;
    background: rgba(255,255,255,0.08);
    border-radius: 9999px;
    overflow: hidden;
    position: relative;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.4);
  }
  .np-progress-fill {
    height: 100%;
    background: var(--accent-blue-purple);
    border-radius: 9999px;
    position: relative;
    box-shadow: 0 0 8px rgba(108,92,231,0.6);
    transition: width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .np-time-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-tertiary);
    margin-top: 6px;
    font-variant-numeric: tabular-nums;
  }

  /* Controls Section */
  .np-controls-section {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 36px;
    width: 100%;
    margin-bottom: var(--space-md);
  }
  .np-utility-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    background: transparent;
    transition: all 0.2s;
  }
  .np-utility-btn.clickable {
    cursor: pointer;
    background: var(--glass-bg-light);
    border: 1px solid var(--glass-border);
  }
  .np-utility-btn.clickable:hover {
    background: var(--glass-bg-medium);
    color: var(--text-primary);
    transform: scale(1.05);
  }
  .np-utility-btn.clickable:active {
    transform: scale(0.95);
  }
  
  .np-play-btn {
    width: 66px;
    height: 66px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-blue-purple);
    color: #fff;
    border: none;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(108, 92, 231, 0.4), inset 0 2px 4px rgba(255,255,255,0.2);
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .np-play-btn:hover {
    box-shadow: 0 12px 28px rgba(108, 92, 231, 0.6), inset 0 2px 4px rgba(255,255,255,0.3);
    transform: scale(1.06);
  }
  .np-play-btn:active {
    transform: scale(0.94);
  }

  /* Volume Section */
  .np-volume-section {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    width: 100%;
    max-width: 260px;
    padding: 0 var(--space-sm);
  }
  .np-volume-icon {
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
  .np-volume-slider {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255,255,255,0.08);
    border-radius: 9999px;
    outline: none;
  }
  .np-volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    border: none;
    transition: transform 0.1s;
  }
  .np-volume-slider::-webkit-slider-thumb:hover {
    transform: scale(1.25);
  }
</style>