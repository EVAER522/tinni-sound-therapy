<script>
  import { isPlaying, volume, isMuted, currentMode } from '../stores/app.js';
  import { remainingTime, audioProgress } from '../stores/audio.js';
  import { setMasterVolume } from '../audio/engine.js';

  let localVolume = 0.7;

  function togglePlay() {
    isPlaying.update(v => !v);
  }

  function handleVolume(e) {
    localVolume = parseFloat(e.target.value);
    volume.set(localVolume);
    setMasterVolume(localVolume);
  }

  function toggleMute() {
    isMuted.update(v => !v);
    if ($isMuted) {
      setMasterVolume(0);
    } else {
      setMasterVolume($volume);
    }
  }

  function formatTime(minutes) {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }
</script>

{#if $isPlaying}
  <div class="mini-player">
    <div class="player-left">
      <button class="player-btn" onclick={togglePlay} aria-label="播放/暂停">
        {#if $isPlaying}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        {:else}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        {/if}
      </button>
    </div>
    <div class="player-center">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {Math.min($audioProgress * 100, 100)}%"></div>
      </div>
    </div>
    <div class="player-right">
      <button class="player-btn" onclick={toggleMute} aria-label="静音">
        {#if $isMuted || localVolume === 0}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"/></svg>
        {:else if $volume < 0.5}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.5 8.5a4 4 0 010 7"/></svg>
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.5 8.5a4 4 0 010 7"/><path d="M19 5a8 8 0 010 14"/></svg>
        {/if}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={localVolume}
        oninput={handleVolume}
        class="volume-slider"
        aria-label="音量"
      />
      <span class="timer-text">{formatTime($remainingTime)}</span>
    </div>
  </div>
{/if}

<style>
  .mini-player {
    height: 64px;
    background: var(--canvas);
    border-top: 1px solid var(--hairline);
    display: flex;
    align-items: center;
    padding: 0 var(--space-lg);
    gap: var(--space-md);
    flex-shrink: 0;
    position: relative;
    z-index: 10;
  }
  .player-left {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
  .player-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-pearl);
    border: 1px solid var(--divider-soft);
    color: var(--ink);
    cursor: pointer;
    transition: background 0.15s;
  }
  .player-btn:hover {
    background: var(--canvas-parchment);
  }
  .player-center {
    flex: 1;
  }
  .progress-bar {
    height: 4px;
    background: var(--hairline);
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 2px;
    transition: width 0.3s;
  }
  .player-right {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
  .volume-slider {
    width: 80px;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--hairline);
    border-radius: 2px;
    outline: none;
  }
  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--canvas);
    border: 2px solid var(--primary);
    cursor: pointer;
  }
  .timer-text {
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-muted-48);
    min-width: 50px;
    text-align: right;
    letter-spacing: -0.224px;
  }
</style>
