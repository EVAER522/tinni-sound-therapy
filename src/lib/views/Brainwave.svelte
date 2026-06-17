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
</script>
<div class="bw-view">
  <div class="view-panel">
    <h2 class="title">{$t.bw_title}</h2>
    <p class="desc">{$t.bw_desc}</p>
    {#if isRunning}<div class="status-bar"><span class="pulse-dot"></span><span class="status-text">{getBrainwaveName($brainwaveMode)} {$t.bw_running}</span><span class="status-time">{formatTime($brainwaveTimer*60-elapsed)}</span></div>{/if}
    <div class="bw-grid">{#each bwOptions as bw}<button class="bw-card" class:selected={$brainwaveMode===bw.id} onclick={()=>selectMode(bw.id)}><div class="bw-name">{bw.label}</div><div class="bw-freq">{bw.freq}</div><div class="bw-desc">{$t[bw.key]}</div></button>{/each}</div>
    <div class="controls-section">
      <div class="control-group"><label class="text-caption-strong">{$t.bw_stimulus}</label><div class="chip-group" role="radiogroup"><button class="glass-chip" class:selected={$brainwaveType==="binaural"} onclick={()=>selectType("binaural")}>{$t.bw_binaural}</button><button class="glass-chip" class:selected={$brainwaveType==="isochronic"} onclick={()=>selectType("isochronic")}>{$t.bw_isochronic}</button></div></div>
      {#if $brainwaveMode==="isochronic"}<div class="control-group"><label class="text-caption-strong">{$t.bw_custom_freq_hz}<input type="number" step="0.01" min="0.5" max="100" bind:value={$brainwaveCustomFreq} class="freq-input" /></label></div>{/if}
          <div class="control-group"><label class="text-caption-strong">{$t.bw_duration}</label><div class="chip-group" role="radiogroup">{#each [15,30,45,60] as dur}<button class="glass-chip" class:selected={$brainwaveTimer===dur} onclick={()=>selectTimer(dur)}>{dur} {$t.notch_min}</button>{/each}</div></div>
      <div class="control-group"><button class="glass-chip" class:selected={$brainwaveBgNoise} onclick={toggleBgNoise}>{$t.bw_white_noise_bg} {$brainwaveBgNoise?$t.bw_on:$t.bw_off}</button></div>
    </div>
    <div class="action-bar">{#if isRunning}<button class="glass-btn-secondary" onclick={toggleBwPause}>{paused?$t.notch_resume:$t.notch_pause}</button><button class="glass-btn-hero start-btn" onclick={stopAll}>{$t.bw_stop}</button>{:else}<button class="glass-btn-hero start-btn" onclick={toggleSession}>{$t.bw_start}</button>{/if}</div>
  </div>
</div>
<style>
.bw-view{flex:1;overflow-y:auto;padding:var(--space-section)var(--space-lg);display:flex;flex-direction:column;align-items:center;scrollbar-width:thin;}
.view-panel{max-width:700px;width:100%;display:flex;flex-direction:column;gap:var(--space-lg);align-items:center;text-align:center;}
.title{font-size:clamp(28px,4vw,34px);font-weight:700;line-height:1.1;letter-spacing:-.02em;color:var(--text-primary);}
.desc{font-size:17px;font-weight:400;line-height:1.5;color:var(--text-secondary);max-width:480px;}
.status-bar{display:inline-flex;align-items:center;gap:var(--space-sm);padding:var(--space-xs)var(--space-md);background:var(--glass-bg-medium);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:9999px;color:var(--text-primary);font-size:14px;}
.pulse-dot{width:8px;height:8px;border-radius:50%;background:rgba(108,92,231,0.8);animation:pulse 1.5s infinite;}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(.8);}}
.status-text{color:#a29bfe;font-weight:600;}
.status-time{color:var(--text-secondary);}
.bw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:var(--space-sm);width:100%;}
.bw-card{background:var(--glass-bg-medium);backdrop-filter:blur(var(--glass-blur)) saturate(1.8);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.8);border:1px solid var(--glass-border);border-radius:var(--glass-radius);padding:var(--space-md);display:flex;flex-direction:column;align-items:center;gap:var(--space-xxs);cursor:pointer;transition:border-color .2s,background .15s;box-shadow:var(--glass-shadow);}
.bw-card:hover{background:var(--glass-bg-heavy);border-color:rgba(108,92,231,0.4);}
.bw-card.selected{border:2px solid rgba(108,92,231,0.6);background:var(--glass-bg-heavy);}
.bw-card.selected .bw-name{color:#fff;}
.bw-name{font-size:17px;font-weight:600;color:var(--text-primary);}
.bw-freq,.bw-desc{font-size:14px;font-weight:400;color:var(--text-tertiary);}
.controls-section{width:100%;display:flex;flex-wrap:wrap;gap:var(--space-md);justify-content:center;}
.control-group{display:flex;flex-direction:column;gap:var(--space-xs);align-items:center;}
.action-bar{display:flex;gap:var(--space-md);}
.start-btn{padding:14px 48px;}
.freq-input{width:120px;padding:8px 12px;background:var(--glass-bg-light);border:1px solid var(--glass-border);border-radius:12px;text-align:center;font-size:17px;color:var(--text-primary);font-family:inherit;}
.freq-input:focus{outline:2px solid rgba(108,92,231,0.6);outline-offset:-1px;}
</style>
