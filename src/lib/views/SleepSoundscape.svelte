<script>
  import { activeTracks, soundPresets, sleepTimer, selectedPreset } from '../stores/audio.js';
  import { isPlaying } from '../stores/app.js';
  import { soundLibrary, defaultPresets, findSound } from '../data/sounds.js';
  import { getAudioContext, createWhiteNoise, createPinkNoise, getMasterGain } from '../audio/engine.js';

  let timerInterval = null;
  let elapsed = 0;
  let isRunning = false;
  let activeNodes = []; // { src, gain, nodes, soundId }

  function addTrack(soundId) {
    const exists = $activeTracks.find(t => t.soundId === soundId);
    if (exists) return;
    activeTracks.update(t => [...t, { soundId, volume: 0.5 }]);
    // If playing, start this track immediately
    if (isRunning) {
      startTrack(soundId, 0.5);
    }
  }

  function removeTrack(soundId) {
    activeTracks.update(t => t.filter(tr => tr.soundId !== soundId));
    stopTrack(soundId);
  }

  function updateTrackVolume(soundId, vol) {
    activeTracks.update(t => t.map(tr => tr.soundId === soundId ? { ...tr, volume: vol } : tr));
    // Update gain node in real-time
    const node = activeNodes.find(n => n.soundId === soundId);
    if (node && node.gain) {
      node.gain.gain.value = vol * 0.4;
    }
  }

  function startTrack(soundId, volume) {
    const sound = findSound(soundId);
    if (!sound || !sound.synthesizable) return;
    const ctx = getAudioContext();

    let source;
    if (sound.freq.type === 'white' || sound.freq.type === 'noise') {
      const buffer = sound.freq.type === 'white' ? createWhiteNoise(30) : createPinkNoise(30);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      let output = src;
      if (sound.freq.filter) {
        const filter = ctx.createBiquadFilter();
        filter.type = sound.freq.filter.type;
        filter.frequency.value = sound.freq.filter.freq || 1000;
        if (sound.freq.filter.Q) filter.Q.value = sound.freq.filter.Q;
        if (sound.freq.filter.gain) filter.gain.value = sound.freq.filter.gain;
        output.connect(filter);
        output = filter;
      }

      const gain = ctx.createGain();
      gain.gain.value = volume * 0.4;
      output.connect(gain);
      gain.connect(getMasterGain());
      src.start();
      source = { src, gain, nodes: [src, gain, ...(output !== src ? [output] : [])], soundId };
    } else if (sound.freq.type === 'tone') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = sound.freq.freq || 440;
      if (sound.freq.mod) {
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = sound.freq.mod.rate || 4;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = sound.freq.mod.depth || 500;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        source = { src: osc, nodes: [osc, lfo, lfoGain], soundId, lfo };
      } else {
        source = { src: osc, nodes: [osc], soundId };
      }
      const gain = ctx.createGain();
      gain.gain.value = volume * 0.15;
      osc.connect(gain);
      gain.connect(getMasterGain());
      osc.start();
      source.gain = gain;
      source.nodes.push(gain);
    }

    if (source) activeNodes.push(source);
  }

  function playAll() {
    if (isRunning) { stopAll(); return; }
    isRunning = true;
    isPlaying.set(true);

    $activeTracks.forEach(track => {
      startTrack(track.soundId, track.volume);
    });

    elapsed = 0;
    timerInterval = setInterval(() => {
      elapsed++;
      if (elapsed >= $sleepTimer * 60) {
        stopAll();
      }
    }, 1000);
  }

  function stopTrack(soundId) {
    activeNodes = activeNodes.filter(n => {
      if (n.soundId === soundId) {
        n.nodes.forEach(node => {
          try { node.stop(); } catch(e) {}
          try { node.disconnect(); } catch(e) {}
        });
        return false;
      }
      return true;
    });
  }

  function stopAll() {
    activeNodes.forEach(n => {
      n.nodes.forEach(node => {
        try { node.stop(); } catch(e) {}
        try { node.disconnect(); } catch(e) {}
      });
    });
    activeNodes = [];
    isRunning = false;
    isPlaying.set(false);
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function loadPreset(preset) {
    selectedPreset.set(preset.id);
    stopAll();
    activeTracks.set(preset.tracks.map(t => ({ ...t })));
    // Auto-start if was already playing
  }

  function saveAsPreset() {
    const name = prompt("命名这个场景预设：");
    if (!name) return;
    const preset = {
      id: "custom-" + Date.now(),
      name,
      icon: "🎵",
      tracks: $activeTracks.map(t => ({ ...t })),
    };
    soundPresets.update(p => [...p, preset]);
  }

  import { onDestroy } from 'svelte';
  onDestroy(() => stopAll());

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }
</script>

<div class="sleep-view">
  <div class="view-panel">
    <h2 class="title">助眠声景</h2>
    <p class="desc">混搭环境音，创造属于你的放松空间</p>

    {#if isRunning}
      <div class="status-bar">
        <div class="pulse-dot"></div>
        <span class="status-text">播放中</span>
        <span class="status-time">{formatTime($sleepTimer * 60 - elapsed)}</span>
      </div>
    {/if}

    <!-- Presets -->
    <div class="section">
      <h3 class="section-title">场景预设</h3>
      <div class="preset-grid">
        {#each [...defaultPresets, ...$soundPresets] as preset}
          <button class="preset-chip" class:selected={$selectedPreset === preset.id} onclick={() => loadPreset(preset)}>
            <span>{preset.icon}</span>
            <span>{preset.name}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Sound library -->
    <div class="section">
      <h3 class="section-title">音源库</h3>
      <div class="sound-grid">
        {#each soundLibrary as sound}
          <button class="sound-chip" onclick={() => addTrack(sound.id)}>
            <span class="sound-icon">{sound.icon}</span>
            <span class="sound-name">{sound.name}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Mixer -->
    {#if $activeTracks.length > 0}
      <div class="section">
        <h3 class="section-title">混音器</h3>
        <div class="mixer-tracks">
          {#each $activeTracks as track, i}
            {@const sound = findSound(track.soundId)}
            <div class="mixer-track">
              <div class="track-header">
                <span class="track-icon">{sound?.icon || '🔊'}</span>
                <span class="track-name">{sound?.name || track.soundId}</span>
                <button class="track-remove" onclick={() => removeTrack(track.soundId)}>✕</button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={track.volume}
                oninput={(e) => updateTrackVolume(track.soundId, parseFloat(e.target.value))}
                class="mixer-slider"
                aria-label="{sound?.name} 音量"
              />
            </div>
          {/each}
        </div>
        <div class="mixer-actions">
          <button class="btn-secondary" onclick={saveAsPreset}>保存为预设</button>
        </div>
      </div>
    {:else}
      <div class="empty-state">
        <span class="text-caption">点击上方音源添加到混音器</span>
      </div>
    {/if}

    <!-- Timer -->
    <div class="section">
      <h3 class="section-title">睡眠定时器</h3>
      <div class="chip-group">
        {#each [15, 30, 45, 60, 90] as t}
          <button class="chip" class:selected={$sleepTimer === t} onclick={() => sleepTimer.set(t)}>{t} 分钟</button>
        {/each}
      </div>
    </div>

    {#if $activeTracks.length > 0}
      <div class="action-bar">
        {#if isRunning}
          <button class="btn-emergency start-btn" onclick={playAll}>
            ⏹ 停止
          </button>
        {:else}
          <button class="btn-primary start-btn" onclick={playAll}>
            ▶ 开始播放
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .sleep-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-section) var(--space-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .view-panel {
    max-width: 700px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    align-items: center;
    text-align: center;
  }
  .title {
    font-size: 34px;
    font-weight: 600;
    line-height: 1.1;
    color: var(--ink);
  }
  .desc {
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    color: var(--ink-muted-80);
  }
  .status-bar {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-md);
    background: var(--surface-tile-1);
    border-radius: var(--radius-pill);
    color: #fff;
    font-size: 14px;
  }
  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary);
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .status-text {
    color: var(--primary-on-dark);
    font-weight: 600;
  }
  .status-time {
    color: rgba(255,255,255,0.7);
  }
  .section {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    align-items: center;
  }
  .section-title {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ink-muted-48);
  }
  .preset-grid, .sound-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    justify-content: center;
  }
  .preset-chip, .sound-chip {
    background: var(--canvas);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-pill);
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    cursor: pointer;
    font-size: 14px;
    color: var(--ink);
    transition: border-color 0.2s;
  }
  .preset-chip:hover, .sound-chip:hover {
    border-color: var(--primary);
  }
  .preset-chip.selected {
    border: 2px solid var(--primary-focus);
    background: var(--surface-pearl);
  }
  .sound-icon {
    font-size: 18px;
  }
  .mixer-tracks {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .mixer-track {
    background: var(--canvas);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-lg);
    padding: var(--space-sm) var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .track-header {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
  .track-icon {
    font-size: 20px;
  }
  .track-name {
    font-size: 14px;
    font-weight: 600;
    flex: 1;
    text-align: left;
  }
  .track-remove {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--ink-muted-48);
    cursor: pointer;
    font-size: 12px;
  }
  .track-remove:hover {
    background: var(--divider-soft);
    color: var(--emergency);
  }
  .mixer-slider {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--hairline);
    border-radius: 2px;
    outline: none;
  }
  .mixer-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primary);
    cursor: pointer;
  }
  .mixer-actions {
    display: flex;
    gap: var(--space-xs);
  }
  .empty-state {
    padding: var(--space-xl);
    color: var(--ink-muted-48);
  }
  .chip-group {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
    justify-content: center;
  }
  .action-bar {
    display: flex;
    gap: var(--space-md);
  }
  .start-btn {
    font-size: 18px;
    font-weight: 600;
    padding: 14px 48px;
  }
</style>

