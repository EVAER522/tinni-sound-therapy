<script>
  import { brainwaveMode, brainwaveType, brainwaveBgNoise, brainwaveTimer, brainwaveCustomFreq } from '../stores/audio.js';
  import { isPlaying } from '../stores/app.js';
  import { startBrainwave, stopBrainwave, restartBrainwave, getBrainwaveName } from '../audio/brainwave.js';
  import { getAudioContext, getMasterGain, createWhiteNoise } from '../audio/engine.js';

  const brainwaveOptions = [
    { id: 'delta', label: 'Delta δ', freq: '0.5-4 Hz', desc: '深睡' },
    { id: 'theta', label: 'Theta θ', freq: '4-8 Hz', desc: '冥想' },
    { id: 'alpha', label: 'Alpha α', freq: '8-14 Hz', desc: '放松' },
    { id: 'beta', label: 'Beta β', freq: '14-30 Hz', desc: '专注' },
    { id: 'gamma', label: 'Gamma γ', freq: '30-100 Hz', desc: '超专注' },
    { id: 'schumann', label: 'Schumann', freq: '7.83 Hz', desc: '接地' },
    { id: 'isochronic', label: '自定义', freq: '可调', desc: '自定义频率' },
  ];

  let isRunning = false;
  let timerInterval = null;
  let elapsed = 0;

  // Live bg noise support
  let bgNoiseNodes = [];

  // Reactive: when params change during playback, restart automatically
  $: if (isRunning) {
    const freq = $brainwaveMode === 'isochronic' ? $brainwaveCustomFreq : null;
    restartBrainwave($brainwaveMode, $brainwaveType, freq);
    updateBgNoise();
  }

  function updateBgNoise() {
    // Stop old bg noise
    bgNoiseNodes.forEach(n => {
      try { n.stop(); } catch(e) {}
      try { n.disconnect(); } catch(e) {}
    });
    bgNoiseNodes = [];

    if ($brainwaveBgNoise) {
      const ctx = getAudioContext();
      const buffer = createWhiteNoise(30);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      src.connect(gain);
      gain.connect(getMasterGain());
      src.start();
      bgNoiseNodes = [src, gain];
    }
  }

  function toggleSession() {
    if (isRunning) {
      stopAll();
    } else {
      startSession();
    }
  }

  function startSession() {
    const freq = $brainwaveMode === 'isochronic' ? $brainwaveCustomFreq : null;
    startBrainwave($brainwaveMode, $brainwaveType, freq);
    isRunning = true;
    isPlaying.set(true);
    elapsed = 0;
    updateBgNoise();

    timerInterval = setInterval(() => {
      elapsed++;
      if (elapsed >= $brainwaveTimer * 60) {
        stopAll();
      }
    }, 1000);
  }

  function stopAll() {
    stopBrainwave();
    bgNoiseNodes.forEach(n => {
      try { n.stop(); } catch(e) {}
      try { n.disconnect(); } catch(e) {}
    });
    bgNoiseNodes = [];
    isRunning = false;
    isPlaying.set(false);
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  import { onDestroy } from 'svelte';
  onDestroy(() => {
    stopAll();
  });

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }

  function selectMode(id) {
    brainwaveMode.set(id);
  }

  function selectType(t) {
    brainwaveType.set(t);
  }

  function selectTimer(t) {
    brainwaveTimer.set(t);
  }

  function toggleBgNoise() {
    brainwaveBgNoise.update(v => !v);
  }
</script>

<div class="brainwave-view">
  <div class="view-panel">
    <h2 class="title">脑波引导放松</h2>
    <p class="desc">选择脑波模式，建议佩戴耳机获得最佳效果</p>

    {#if isRunning}
      <div class="status-bar">
        <div class="pulse-dot"></div>
        <span class="status-text">{getBrainwaveName($brainwaveMode)} 运行中</span>
        <span class="status-time">{formatTime($brainwaveTimer * 60 - elapsed)}</span>
      </div>
    {/if}

    <div class="brainwave-grid">
      {#each brainwaveOptions as bw}
        <button
          class="brainwave-card"
          class:selected={$brainwaveMode === bw.id}
          onclick={() => selectMode(bw.id)}
        >
          <div class="bw-name">{bw.label}</div>
          <div class="bw-freq">{bw.freq}</div>
          <div class="bw-desc">{bw.desc}</div>
        </button>
      {/each}
    </div>

    <div class="controls-section">
      <div class="control-group">
        <label class="text-caption-strong">刺激类型</label>
        <div class="chip-group">
          <button class="chip" class:selected={$brainwaveType === 'binaural'} onclick={() => selectType('binaural')}>双耳节拍</button>
          <button class="chip" class:selected={$brainwaveType === 'isochronic'} onclick={() => selectType('isochronic')}>等时音</button>
        </div>
      </div>

      {#if $brainwaveMode === 'isochronic'}
        <div class="control-group">
          <label class="text-caption-strong">自定义频率 (Hz)</label>
          <input type="number" step="0.01" min="0.5" max="100" bind:value={$brainwaveCustomFreq} class="freq-input" />
        </div>
      {/if}

      <div class="control-group">
        <label class="text-caption-strong">时长（分钟）</label>
        <div class="chip-group">
          {#each [15, 30, 45, 60] as t}
            <button class="chip" class:selected={$brainwaveTimer === t} onclick={() => selectTimer(t)}>{t} 分</button>
          {/each}
        </div>
      </div>

      <div class="control-group">
        <button class="chip" class:selected={$brainwaveBgNoise} onclick={toggleBgNoise}>
          白噪音背景 {$brainwaveBgNoise ? '✅ 开' : '❌ 关'}
        </button>
      </div>
    </div>

    <div class="action-bar">
      {#if isRunning}
        <button class="btn-emergency start-btn" onclick={stopAll}>
          ⏹ 停止
        </button>
      {:else}
        <button class="btn-primary start-btn" onclick={toggleSession}>
          ▶ 开始
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .brainwave-view {
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
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
  .status-text {
    color: var(--primary-on-dark);
    font-weight: 600;
  }
  .status-time {
    color: rgba(255,255,255,0.7);
  }
  .brainwave-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--space-sm);
    width: 100%;
  }
  .brainwave-card {
    background: var(--canvas);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xxs);
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .brainwave-card:hover {
    border-color: var(--primary);
  }
  .brainwave-card.selected {
    border: 2px solid var(--primary-focus);
  }
  .bw-name {
    font-size: 17px;
    font-weight: 600;
    color: var(--ink);
  }
  .bw-freq {
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-muted-48);
  }
  .bw-desc {
    font-size: 12px;
    font-weight: 400;
    color: var(--ink-muted-48);
  }
  .controls-section {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    justify-content: center;
  }
  .control-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    align-items: center;
  }
  .chip-group {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
    justify-content: center;
  }
  .freq-input {
    width: 120px;
    padding: 8px 12px;
    border: 1px solid var(--hairline);
    border-radius: var(--radius-sm);
    text-align: center;
    font-size: 17px;
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

