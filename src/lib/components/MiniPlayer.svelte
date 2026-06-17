<script>
  import { isPlaying, currentMode, volume, sheetContent, sessionActive } from '../stores/app.js';
  import { audioProgress, remainingTime } from '../stores/audio.js';
  import { setMasterVolume } from '../audio/engine.js';
  import { getBrainwaveName } from '../audio/brainwave.js';
  import { brainwaveMode } from '../stores/audio.js';
  import { t } from '../stores/locale.js';

  $: trackName = $currentMode === 'therapy' ? 'Notch Therapy' : $currentMode === 'brainwave' ? getBrainwaveName($brainwaveMode) : 'Sleep Soundscape';
  $: timeStr = formatTime($remainingTime);
  $: progressPct = Math.min($audioProgress * 100, 100);

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  function togglePlay(e) {
    e.stopPropagation();
    isPlaying.update(v => !v);
  }
  function handleExpand() {
    // Open Now Playing sheet with a simple info panel
    import('../views/NowPlaying.svelte').then(mod => {
      sheetContent.set({ component: mod.default, props: {}, height: 65 });
    });
  }

  // Listen for expand event from DynamicIsland
  function onExpand(e) { handleExpand(); }
  import { onMount, onDestroy } from 'svelte';
  onMount(() => { window.addEventListener('expand-player', onExpand); });
  onDestroy(() => { window.removeEventListener('expand-player', onExpand); });
</script>

{#if $sessionActive}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="mini-player" onclick={handleExpand} role="button" tabindex="0" onkeydown={(e)=>{if(e.key==="Enter"||e.key===" ")handleExpand();}}>
    <div class="mp-thumb">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="2" width="4" height="20" rx="1" opacity="0.4"><animate attributeName="height" values="20;12;20" dur="1.2s" repeatCount="indefinite"/><animate attributeName="y" values="2;7;2" dur="1.2s" repeatCount="indefinite"/></rect><rect x="14" y="4" width="4" height="16" rx="1" opacity="0.8"><animate attributeName="height" values="16;8;16" dur="0.9s" repeatCount="indefinite"/><animate attributeName="y" values="4;9;4" dur="0.9s" repeatCount="indefinite"/></rect></svg>
    </div>
    <div class="mp-info">
      <div class="mp-title">{trackName}</div>
      <div class="mp-progress-track">
        <div class="mp-progress-fill" style="width: {progressPct}%"></div>
      </div>
    </div>
    <button class="mp-play-btn" aria-label="Play/Pause" onclick={togglePlay}>
      <span class="mp-btn-icon" class:is-playing={$isPlaying}>
        {#if $isPlaying}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        {:else}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        {/if}
      </span>
    </button>
  </div>
{/if}

<style>
  .mini-player { position: fixed; bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 8px); left: 12px; right: 12px; height: var(--miniplayer-height); display: flex; align-items: center; gap: 12px; padding: 0 12px; background: var(--glass-bg-medium); backdrop-filter: blur(20px) saturate(1.8); -webkit-backdrop-filter: blur(20px) saturate(1.8); border: 1px solid var(--glass-border); border-radius: 14px; box-shadow: var(--glass-shadow); z-index: 30; cursor: pointer; animation: mp-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); will-change: transform; transform: translateZ(0); transition: background 0.2s, transform 0.2s var(--spring-smooth), box-shadow 0.2s; }
  .mini-player:hover { background: var(--glass-bg-heavy); transform: translateY(-2px) translateZ(0); box-shadow: var(--glass-shadow-lg); }
  .mini-player:active { transform: translateY(0) scale(0.98) translateZ(0) !important; transition-duration: 100ms !important; }
  @keyframes mp-in { from { transform: translateY(80px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .mp-thumb { width: 40px; height: 40px; border-radius: 10px; background: var(--glass-bg-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: rgba(108,92,231,0.8); }
  .mp-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .mp-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); }
  .mp-progress-track { height: 3px; background: rgba(255,255,255,0.12); border-radius: 2px; overflow: hidden; }
  .mp-progress-fill { height: 100%; background: var(--accent-blue-purple); border-radius: 2px; transition: width 0.5s var(--ease-out-expo); }
  .mp-play-btn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--glass-bg-light); border: 1px solid var(--glass-border); color: var(--text-primary); flex-shrink: 0; cursor: pointer; transition: background 0.15s, transform 0.18s var(--spring-bounce); will-change: transform; }
  .mp-play-btn:hover { background: var(--glass-bg-medium); transform: scale(1.08); }
  .mp-play-btn:active { transform: scale(0.9) !important; transition-duration: 80ms !important; }
  .mp-btn-icon { display: flex; align-items: center; justify-content: center; animation: popIn 0.22s var(--spring-bounce) both; }
</style>

