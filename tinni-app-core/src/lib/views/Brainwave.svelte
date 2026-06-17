<script>
  import { brainwaveMode, brainwaveType, brainwaveBgNoise, brainwaveTimer, brainwaveCustomFreq, remainingTime, audioProgress } from "../stores/audio.js";
  import { isPlaying, sessionActive } from "../stores/app.js";
  import { startBrainwave, stopBrainwave, restartBrainwave, getBrainwaveName } from "../audio/brainwave.js";
  import { getAudioContext, getMasterGain, createWhiteNoise, suspendAudio, resumeAudio, isAudioSuspended } from "../audio/engine.js";
  import { t } from "../stores/locale.js";
  const bwOptions = [
    {id:"delta", label:"Delta \u03b4", freq:"0.5-4 Hz", key:"bw_deep_sleep"},
    {id:"theta", label:"Theta \u03b8", freq:"4-8 Hz", key:"bw_meditation"},
    {id:"alpha", label:"Alpha \u03b1", freq:"8-14 Hz", key:"bw_relaxation"},
    {id:"beta", label:"Beta \u03b2", freq:"14-30 Hz", key:"bw_focus"},
    {id:"gamma", label:"Gamma \u03b3", freq:"30-100 Hz", key:"bw_deep_focus"},
    {id:"schumann", label:"Schumann", freq:"7.83 Hz", key:"bw_grounding"},
    {id:"isochronic", label:"Custom", freq:"Adjustable", key:"bw_custom"},
  ];
  let isRunning=false, timerInterval=null, elapsed=0, bgNoiseNodes=[];
  $: paused = $sessionActive && !$isPlaying;

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      elapsed++;
      remainingTime.set($brainwaveTimer * 60 - elapsed);
      audioProgress.set(elapsed / ($brainwaveTimer * 60));
      if (elapsed >= $brainwaveTimer * 60) stopAll();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  $: if ($sessionActive) {
    if ($isPlaying) {
      resumeAudio();
      startTimer();
    } else {
      suspendAudio();
      stopTimer();
    }
  }

  $: if(isRunning){const f=$brainwaveMode==="isochronic"?$brainwaveCustomFreq:null;restartBrainwave($brainwaveMode,$brainwaveType,f);}
  $:{const _bg=$brainwaveBgNoise;if(isRunning)updateBgNoise();}
  function updateBgNoise(){bgNoiseNodes.forEach(n=>{try{n.stop();}catch(e){}try{n.disconnect();}catch(e){}});bgNoiseNodes=[];if($brainwaveBgNoise){const ctx=getAudioContext();const buffer=createWhiteNoise(30);const src=ctx.createBufferSource();src.buffer=buffer;src.loop=true;const g=ctx.createGain();g.gain.value=.05;src.connect(g);g.connect(getMasterGain());src.start();bgNoiseNodes=[src,g];}}
  function toggleSession(){if(isRunning)stopAll();else startSession();}
  function startSession(){
    resumeAudio();
    const f=$brainwaveMode==="isochronic"?$brainwaveCustomFreq:null;
    startBrainwave($brainwaveMode,$brainwaveType,f);
    isRunning=true;
    isPlaying.set(true);
    sessionActive.set(true);
    elapsed=0;
    remainingTime.set($brainwaveTimer * 60);
    audioProgress.set(0);
    updateBgNoise();
  }
  function stopAll(){
    stopBrainwave();
    bgNoiseNodes.forEach(n=>{try{n.stop();}catch(e){}try{n.disconnect();}catch(e){}});
    bgNoiseNodes=[];
    isRunning=false;
    isPlaying.set(false);
    sessionActive.set(false);
    remainingTime.set(0);
    audioProgress.set(0);
    stopTimer();
  }
  function toggleBwPause(){
    isPlaying.update(v=>!v);
  }
  import { onDestroy } from "svelte";onDestroy(()=>stopAll());
  function formatTime(s){const m=Math.floor(s/60);const sec=s%60;return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");}
  function selectMode(id){brainwaveMode.set(id);}
  function selectType(t){brainwaveType.set(t);}
  function selectTimer(t){brainwaveTimer.set(t);}
  function toggleBgNoise(){brainwaveBgNoise.update(v=>!v);}

  function getPulseSpeed(mode) {
    const speeds = {
      delta: '3.0s',     // Delta is slow (0.5 - 4 Hz)
      theta: '2.0s',     // Theta (4 - 8 Hz)
      alpha: '1.2s',     // Alpha (8 - 14 Hz)
      beta: '0.6s',      // Beta (14 - 30 Hz)
      gamma: '0.3s',      // Gamma is fast (30 - 100 Hz)
      schumann: '1.5s',  // Schumann (7.83 Hz)
      isochronic: '0.8s' // Custom
    };
    return speeds[mode] || '1.0s';
  }
</script>

<div class="bw-view">
  <div class="view-panel">
    <h2 class="title">{$t.bw_title}</h2>
    <p class="desc">{$t.bw_desc}</p>
    
    {#if isRunning}
      <div class="status-bar glass">
        <span class="pulse-dot" style="animation-duration: {getPulseSpeed($brainwaveMode)}"></span>
        <span class="status-text">{getBrainwaveName($brainwaveMode)} {$t.bw_running}</span>
        <span class="status-time">{formatTime($brainwaveTimer*60-elapsed)}</span>
      </div>
    {/if}

    <!-- 1. Brainwave Mode Grid -->
    <div class="bw-grid">
      {#each bwOptions as bw}
        <button 
          type="button"
          class="bw-card {bw.id}" 
          class:selected={$brainwaveMode===bw.id} 
          onclick={()=>selectMode(bw.id)}
        >
          <div class="bw-card-glow"></div>
          <div class="bw-name">{bw.label}</div>
          <div class="bw-freq">{bw.freq}</div>
          <div class="bw-desc">{$t[bw.key]}</div>
        </button>
      {/each}
    </div>

    <!-- 2. Parameter Control Card -->
    <div class="settings-card glass">
      <h3 class="card-section-title">{$t.notch_therapy_params}</h3>
      
      <!-- Stimulus Type -->
      <div class="param-row">
        <span class="param-title">{$t.bw_stimulus}</span>
        <div class="chip-group" role="radiogroup">
          <button 
            type="button" 
            class="glass-chip" 
            class:selected={$brainwaveType==="binaural"} 
            onclick={()=>selectType("binaural")}
          >
            {$t.bw_binaural}
          </button>
          <button 
            type="button" 
            class="glass-chip" 
            class:selected={$brainwaveType==="isochronic"} 
            onclick={()=>selectType("isochronic")}
          >
            {$t.bw_isochronic}
          </button>
        </div>
      </div>

      <!-- Custom Freq Slider (conditional) -->
      {#if $brainwaveMode==="isochronic"}
        <div class="param-row">
          <span class="param-title">{$t.bw_custom_freq_hz}</span>
          <div class="custom-freq-control">
            <div class="slider-wrapper">
              <div class="slider-progress-fill" style="width: {(($brainwaveCustomFreq - 0.5) / (100 - 0.5)) * 100}%"></div>
              <input 
                type="range" 
                min="0.5" 
                max="100" 
                step="0.1" 
                bind:value={$brainwaveCustomFreq} 
                class="custom-freq-slider" 
                aria-label={$t.bw_custom_freq_hz} 
              />
            </div>
            <div class="freq-val-input-wrapper">
              <input 
                type="number" 
                step="0.01" 
                min="0.5" 
                max="100" 
                bind:value={$brainwaveCustomFreq} 
                class="freq-val-input" 
              />
              <span class="freq-val-unit">Hz</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Duration Selection -->
      <div class="param-row">
        <span class="param-title">{$t.bw_duration}</span>
        <div class="chip-group" role="radiogroup">
          {#each [15,30,45,60] as dur}
            <button 
              type="button" 
              class="glass-chip" 
              class:selected={$brainwaveTimer===dur} 
              onclick={()=>selectTimer(dur)}
            >
              {dur} {$t.notch_min}
            </button>
          {/each}
        </div>
      </div>

      <!-- Background White Noise -->
      <div class="param-row">
        <span class="param-title">{$t.bw_white_noise_bg}</span>
        <button 
          type="button" 
          class="noise-toggle-btn" 
          class:active={$brainwaveBgNoise} 
          onclick={toggleBgNoise}
        >
          <span class="toggle-icon">🔊</span>
          <span class="toggle-text">{$t.bw_white_noise_bg}: {$brainwaveBgNoise ? $t.bw_on : $t.bw_off}</span>
          <div class="toggle-switch" class:on={$brainwaveBgNoise}>
            <span class="toggle-knob"></span>
          </div>
        </button>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      {#if isRunning}
        <button type="button" class="glass-btn-secondary" onclick={toggleBwPause}>
          {paused ? $t.notch_resume : $t.notch_pause}
        </button>
        <button type="button" class="glass-btn-hero start-btn" onclick={stopAll}>{$t.bw_stop}</button>
      {:else}
        <button type="button" class="glass-btn-hero start-btn" onclick={toggleSession}>{$t.bw_start}</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .bw-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-section) var(--space-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    scrollbar-width: thin;
  }
  .view-panel {
    max-width: 650px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    align-items: center;
    text-align: center;
  }
  .title {
    font-size: clamp(28px, 4vw, 34px);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -.02em;
    color: var(--text-primary);
    margin-bottom: 2px;
  }
  .desc {
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--text-secondary);
    max-width: 480px;
    margin-bottom: 8px;
  }

  /* Status Bar */
  .status-bar {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    padding: 6px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
    border-radius: 9999px;
    color: var(--text-primary);
    font-size: 14px;
    box-shadow: var(--glass-shadow);
    margin-bottom: 4px;
  }
  .light-mode .status-bar {
    background: rgba(255, 255, 255, 0.65);
    border-color: rgba(0, 0, 0, 0.1);
  }
  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(108, 92, 231, 0.85);
    animation: pulse 1.0s infinite ease-in-out;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1.1); }
    50% { opacity: .2; transform: scale(0.75); }
  }
  .status-text {
    color: #a29bfe;
    font-weight: 600;
  }
  .light-mode .status-text {
    color: #6c5ce7;
  }
  .status-time {
    color: var(--text-secondary);
  }

  /* Brainwave Grid & Cards */
  .bw-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
    width: 100%;
  }
  @media (max-width: 600px) {
    .bw-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  .bw-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: var(--glass-shadow);
    transition: all 0.25s var(--spring-smooth);
    box-sizing: border-box;
  }
  .light-mode .bw-card {
    background: rgba(255, 255, 255, 0.55);
    border-color: rgba(0, 0, 0, 0.08);
  }
  .bw-card:hover {
    background: rgba(255, 255, 255, 0.07);
    transform: translateY(-3px);
    box-shadow: var(--glass-shadow-lg);
  }
  .light-mode .bw-card:hover {
    background: rgba(0, 0, 0, 0.04);
  }
  .bw-card:active {
    transform: scale(0.96);
    transition-duration: 80ms;
  }

  .bw-card-glow {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  }

  /* Card Selected States */
  .bw-card.selected {
    border-color: var(--theme-color);
    background: var(--theme-bg);
    box-shadow: 0 0 16px var(--theme-shadow);
  }
  .bw-card.selected .bw-card-glow {
    opacity: 0.15;
    background: radial-gradient(circle at center, var(--theme-color) 0%, transparent 70%);
  }
  .bw-card.selected .bw-name {
    color: #fff;
  }
  .light-mode .bw-card.selected .bw-name {
    color: var(--theme-color);
  }
  .bw-card.selected .bw-freq {
    color: var(--theme-text-freq);
    font-weight: 500;
  }

  /* Specific color profiles for brainwaves */
  .bw-card.delta {
    --theme-color: #3f51b5;
    --theme-bg: rgba(63, 81, 181, 0.12);
    --theme-shadow: rgba(63, 81, 181, 0.25);
    --theme-text-freq: #7986cb;
  }
  .bw-card.theta {
    --theme-color: #9c27b0;
    --theme-bg: rgba(156, 39, 176, 0.12);
    --theme-shadow: rgba(156, 39, 176, 0.25);
    --theme-text-freq: #ba68c8;
  }
  .bw-card.alpha {
    --theme-color: #6c5ce7;
    --theme-bg: rgba(108, 92, 231, 0.12);
    --theme-shadow: rgba(108, 92, 231, 0.25);
    --theme-text-freq: #a29bfe;
  }
  .bw-card.beta {
    --theme-color: #00bcd4;
    --theme-bg: rgba(0, 188, 212, 0.12);
    --theme-shadow: rgba(0, 188, 212, 0.25);
    --theme-text-freq: #4dd0e1;
  }
  .bw-card.gamma {
    --theme-color: #e91e63;
    --theme-bg: rgba(233, 30, 99, 0.12);
    --theme-shadow: rgba(233, 30, 99, 0.25);
    --theme-text-freq: #f06292;
  }
  .bw-card.schumann {
    --theme-color: #26a69a;
    --theme-bg: rgba(38, 166, 154, 0.12);
    --theme-shadow: rgba(38, 166, 154, 0.25);
    --theme-text-freq: #80cbc4;
  }
  .bw-card.isochronic {
    --theme-color: #ff5722;
    --theme-bg: rgba(255, 87, 34, 0.12);
    --theme-shadow: rgba(255, 87, 34, 0.25);
    --theme-text-freq: #ff8a65;
  }

  .bw-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 2px;
  }
  .bw-freq {
    font-size: 12.5px;
    font-weight: 400;
    color: var(--text-tertiary);
    margin-bottom: 4px;
  }
  .bw-desc {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-secondary);
  }

  /* Settings Card & Parameter Layout */
  .settings-card {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--glass-shadow);
    box-sizing: border-box;
  }
  .light-mode .settings-card {
    background: rgba(255, 255, 255, 0.65);
    border-color: rgba(0, 0, 0, 0.1);
  }
  .card-section-title {
    font-size: 13px;
    font-weight: 700;
    color: #a29bfe;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    text-align: left;
    border-left: 3px solid #6c5ce7;
    padding-left: 8px;
    margin: 0;
  }
  .light-mode .card-section-title {
    color: #6c5ce7;
    border-left-color: #6c5ce7;
  }
  .param-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    box-sizing: border-box;
  }
  .param-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .light-mode .param-row {
    border-bottom-color: rgba(0, 0, 0, 0.05);
  }
  .param-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    text-align: left;
  }

  /* Chip Groups */
  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-start;
  }

  /* Custom Freq Controls */
  .custom-freq-control {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  
  /* Progress-Fill Custom Slider */
  .slider-wrapper {
    position: relative;
    flex: 1;
    height: 24px;
    display: flex;
    align-items: center;
  }
  .slider-wrapper .slider-progress-fill {
    position: absolute;
    left: 0;
    height: 4px;
    background: linear-gradient(90deg, #ff5722, #ff8a65);
    border-radius: 2px;
    pointer-events: none;
  }
  .custom-freq-slider {
    position: absolute;
    width: 100%;
    height: 24px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    outline: none;
    margin: 0;
    cursor: pointer;
  }
  .custom-freq-slider::-webkit-slider-runnable-track {
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
  }
  .light-mode .custom-freq-slider::-webkit-slider-runnable-track {
    background: rgba(0, 0, 0, 0.08);
  }
  .custom-freq-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #ff5722;
    box-shadow: 0 0 8px rgba(255, 87, 34, 0.7);
    cursor: pointer;
    margin-top: -6px;
    transition: transform 0.12s var(--spring-bounce);
  }
  .custom-freq-slider::-webkit-slider-thumb:hover {
    transform: scale(1.25);
  }

  .freq-val-input-wrapper {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 4px 8px;
    flex-shrink: 0;
  }
  .light-mode .freq-val-input-wrapper {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.06);
  }
  .freq-val-input {
    width: 65px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    font-family: inherit;
    outline: none;
    -moz-appearance: textfield;
  }
  .freq-val-input::-webkit-outer-spin-button,
  .freq-val-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .freq-val-unit {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
  }

  /* Noise Toggle Toggler Button */
  .noise-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s var(--spring-smooth);
    box-sizing: border-box;
  }
  .noise-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }
  .noise-toggle-btn.active {
    background: rgba(108, 92, 231, 0.15);
    border-color: rgba(108, 92, 231, 0.4);
    color: var(--text-primary);
  }
  .light-mode .noise-toggle-btn {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.08);
  }
  .light-mode .noise-toggle-btn:hover {
    background: rgba(0, 0, 0, 0.06);
    border-color: rgba(0, 0, 0, 0.12);
  }
  .light-mode .noise-toggle-btn.active {
    background: rgba(108, 92, 231, 0.08);
    border-color: rgba(108, 92, 231, 0.3);
  }
  .toggle-icon {
    font-size: 16px;
    margin-right: 8px;
  }
  .toggle-text {
    flex: 1;
    text-align: left;
    font-size: 13.5px;
    font-weight: 500;
  }
  .toggle-switch {
    width: 38px;
    height: 20px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    position: relative;
    transition: background-color 0.2s;
  }
  .light-mode .toggle-switch {
    background: rgba(0, 0, 0, 0.12);
  }
  .toggle-switch.on {
    background: #6c5ce7;
  }
  .toggle-knob {
    width: 14px;
    height: 14px;
    background: #fff;
    border-radius: 50%;
    position: absolute;
    top: 3px;
    left: 3px;
    transition: transform 0.2s;
  }
  .toggle-switch.on .toggle-knob {
    transform: translateX(18px);
  }

  /* Action Bar */
  .action-bar {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }
  .start-btn {
    padding: 14px 48px;
  }
</style>
