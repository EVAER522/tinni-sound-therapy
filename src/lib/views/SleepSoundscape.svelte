<script>
  import { activeTracks, soundPresets, sleepTimer, selectedPreset, remainingTime, audioProgress } from "../stores/audio.js";
  import { isPlaying, sessionActive } from "../stores/app.js";
  import { soundLibrary, defaultPresets, findSound } from "../data/sounds.js";
  import { t } from "../stores/locale.js";
  import { getAudioContext, getMasterGain } from "../audio/engine.js";

  let timerInterval=null, elapsed=0, playing=false, trackRefs=[];
  
  // Store cached AudioBuffers to prevent reloading gaps
  const bufferCache = new Map();

  async function getAudioBuffer(url, ctx) {
    if (bufferCache.has(url)) {
      return bufferCache.get(url);
    }
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    bufferCache.set(url, audioBuffer);
    return audioBuffer;
  }

  function addTrack(sid){
    if($activeTracks.find(t=>t.soundId===sid))return;
    activeTracks.update(t=>[...t,{soundId:sid,volume:.5}]);
    if($sessionActive && $isPlaying)_start(sid,.5);
  }
  function removeTrack(sid){
    activeTracks.update(t=>t.filter(tr=>tr.soundId!==sid));
    _stop(sid);
  }
  function updateTrackVolume(sid,vol){
    activeTracks.update(t=>t.map(tr=>tr.soundId===sid?{...tr,volume:vol}:tr));
    const ref=trackRefs.find(r=>r.id===sid);
    if(ref){
      ref.volume=vol;
      if(ref.gainNode){
        const ctx=getAudioContext();
        try{
          ref.gainNode.gain.setValueAtTime(ref.gainNode.gain.value,ctx.currentTime);
          ref.gainNode.gain.linearRampToValueAtTime(vol,ctx.currentTime+0.05);
        }catch(e){
          ref.gainNode.gain.value=vol;
        }
      }
    }
  }
  async function _start(sid,vol){
    const s=findSound(sid);if(!s||!s.file)return;
    const ctx=getAudioContext();
    const existingRef=trackRefs.find(r=>r.id===sid);
    if(existingRef)return;

    const ref={
      id:sid,
      sourceNode:null,
      gainNode:null,
      volume:vol,
      loading:true,
      audioBuffer:null
    };
    trackRefs.push(ref);
    trackRefs=trackRefs;

    try{
      const buffer=await getAudioBuffer(s.file,ctx);
      ref.audioBuffer=buffer;
      ref.loading=false;

      if(!trackRefs.includes(ref))return;

      if($sessionActive && $isPlaying){
        const source=ctx.createBufferSource();
        source.buffer=buffer;
        source.loop=true;

        const gainNode=ctx.createGain();
        gainNode.gain.setValueAtTime(0,ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(vol,ctx.currentTime+0.1);

        source.connect(gainNode);
        gainNode.connect(getMasterGain());

        source.start(0);
        ref.sourceNode=source;
        ref.gainNode=gainNode;
      }
    }catch(e){
      console.error("Failed to load/play sleep sound:",e);
      trackRefs=trackRefs.filter(r=>r!==ref);
    }
  }
  function _stop(sid){
    const idx=trackRefs.findIndex(r=>r.id===sid);
    if(idx===-1)return;
    const ref=trackRefs[idx];
    trackRefs.splice(idx,1);
    trackRefs=trackRefs;

    const ctx=getAudioContext();
    const source=ref.sourceNode;
    const gain=ref.gainNode;

    if(source && gain){
      try{
        gain.gain.setValueAtTime(gain.gain.value,ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0,ctx.currentTime+0.15);
      }catch(e){}
      setTimeout(()=>{
        try{source.stop();}catch(e){}
        try{source.disconnect();}catch(e){}
        try{gain.disconnect();}catch(e){}
      },160);
    }
  }
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      elapsed++;
      remainingTime.set($sleepTimer * 60 - elapsed);
      audioProgress.set(elapsed / ($sleepTimer * 60));
      if (elapsed >= $sleepTimer * 60) stopAll();
    }, 1000);
  }
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  $: if ($sessionActive) {
    if ($isPlaying && !playing) {
      playing = true;
      const ctx = getAudioContext();
      trackRefs.forEach(ref => {
        if (!ref.sourceNode && ref.audioBuffer) {
          const source = ctx.createBufferSource();
          source.buffer = ref.audioBuffer;
          source.loop = true;

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(ref.volume, ctx.currentTime + 0.1);

          source.connect(gainNode);
          gainNode.connect(getMasterGain());

          source.start(0);
          ref.sourceNode = source;
          ref.gainNode = gainNode;
        }
      });
      startTimer();
    } else if (!$isPlaying && playing) {
      playing = false;
      const ctx = getAudioContext();
      trackRefs.forEach(ref => {
        const source = ref.sourceNode;
        const gain = ref.gainNode;
        if (source && gain) {
          try {
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
          } catch (e) {}
          ref.sourceNode = null;
          ref.gainNode = null;
          setTimeout(() => {
            try { source.stop(); } catch (e) {}
            try { source.disconnect(); } catch (e) {}
            try { gain.disconnect(); } catch (e) {}
          }, 160);
        }
      });
      stopTimer();
    }
  }

  function stopAll(){
    const ctx = getAudioContext();
    trackRefs.forEach(ref => {
      const source = ref.sourceNode;
      const gain = ref.gainNode;
      if (source && gain) {
        try {
          gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        } catch (e) {}
        setTimeout(() => {
          try { source.stop(); } catch (e) {}
          try { source.disconnect(); } catch (e) {}
          try { gain.disconnect(); } catch (e) {}
        }, 160);
      }
    });
    trackRefs=[];
    playing=false;
    isPlaying.set(false);
    sessionActive.set(false);
    remainingTime.set(0);
    audioProgress.set(0);
    stopTimer();
  }
  function playAll(){
    if($sessionActive){
      stopAll();
    } else {
      sessionActive.set(true);
      isPlaying.set(true);
      playing=true;
      elapsed=0;
      remainingTime.set($sleepTimer * 60);
      audioProgress.set(0);
      $activeTracks.forEach(t=>_start(t.soundId,t.volume));
      startTimer();
    }
  }
  function loadPreset(preset){selectedPreset.set(preset.id);stopAll();activeTracks.set(preset.tracks.map(t=>({...t})));}
  function saveAsPreset(){
    const name=prompt($t.sleep_name_preset);if(!name)return;
    soundPresets.update(p=>[...p,{id:"custom-"+Date.now(),name,icon:"🎵",tracks:$activeTracks.map(t=>({...t}))}]);
  }
  import { onDestroy } from "svelte";onDestroy(()=>stopAll());
  function fmt(s){const m=Math.floor(s/60),sec=s%60;return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");}
</script>
<div class="sleep-view">
  <div class="view-panel">
    <h2 class="title">{$t.sleep_title}</h2>
    <p class="desc">{$t.sleep_desc}</p>
    {#if $sessionActive}
      <div class="status-bar">
        <span class="pulse-dot" style="animation-play-state: {$isPlaying ? 'running' : 'paused'}"></span>
        <span class="status-text">{$isPlaying ? $t.sleep_playing : $t.notch_pause}</span>
        <span class="status-time">{fmt($sleepTimer*60-elapsed)}</span>
      </div>
    {/if}
      <div class="section"><h3 class="section-title">{$t.sleep_presets}</h3><div class="preset-grid">{#each [...defaultPresets,...$soundPresets] as preset}<button class="glass-chip" class:selected={$selectedPreset===preset.id} onclick={()=>loadPreset(preset)}><span>{preset.icon}</span><span>{preset.name}</span></button>{/each}</div></div>
    <div class="section"><h3 class="section-title">{$t.sleep_sound_lib}</h3><div class="sound-grid">{#each soundLibrary as sound}<button class="glass-chip" onclick={()=>addTrack(sound.id)}><span class="sound-icon">{sound.icon}</span><span class="sound-name">{sound.name}</span></button>{/each}</div></div>
    {#if $activeTracks.length>0}
    <div class="section"><h3 class="section-title">{$t.sleep_mixer}</h3><div class="mixer-tracks">{#each $activeTracks as track,i}{@const s=findSound(track.soundId)}<div class="mixer-track"><div class="track-header"><span class="track-icon">{s?.icon||"🔊"}</span><span class="track-name">{s?.name||track.soundId}</span><button class="track-remove" onclick={()=>removeTrack(track.soundId)}>X</button></div><input type="range" min="0" max="1" step="0.01" value={track.volume} oninput={(e)=>updateTrackVolume(track.soundId,parseFloat(e.target.value))} class="mixer-slider" aria-label={$t.sleep_volume} /></div>{/each}</div><div class="mixer-actions"><button class="glass-btn-secondary" onclick={saveAsPreset}>{$t.sleep_save_preset}</button></div></div>
    {:else}<div class="empty-state"><span class="text-caption">{$t.sleep_empty}</span></div>{/if}
      <div class="section"><h3 class="section-title">{$t.sleep_timer}</h3><div class="chip-group">{#each [15,30,45,60,90] as dur}<button class="glass-chip" class:selected={$sleepTimer===dur} onclick={()=>sleepTimer.set(dur)}>{dur} {$t.notch_min}</button>{/each}</div></div>
    {#if $activeTracks.length>0}
      <div class="action-bar">
        {#if $sessionActive}
          <button class="glass-btn-secondary" onclick={()=>isPlaying.update(v=>!v)}>{$isPlaying ? $t.notch_pause : $t.notch_resume}</button>
          <button class="glass-btn-hero start-btn" onclick={stopAll}>{$t.sleep_stop}</button>
        {:else}
          <button class="glass-btn-hero start-btn" onclick={playAll}>{$t.sleep_play}</button>
        {/if}
      </div>
    {/if}
  </div>
</div>
<style>
.sleep-view{flex:1;overflow-y:auto;padding:var(--space-section)var(--space-lg);display:flex;flex-direction:column;align-items:center;scrollbar-width:thin;}
.view-panel{max-width:700px;width:100%;display:flex;flex-direction:column;gap:var(--space-lg);align-items:center;text-align:center;}
.title{font-size:clamp(28px,4vw,34px);font-weight:700;line-height:1.1;letter-spacing:-.02em;color:var(--text-primary);}
.desc{font-size:17px;font-weight:400;line-height:1.5;color:var(--text-secondary);max-width:480px;}
.status-bar{display:inline-flex;align-items:center;gap:var(--space-sm);padding:var(--space-xs)var(--space-md);background:var(--glass-bg-medium);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:9999px;color:var(--text-primary);font-size:14px;}
.pulse-dot{width:8px;height:8px;border-radius:50%;background:rgba(108,92,231,0.8);animation:pulse 1.5s infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.5;}}
.status-text{color:#a29bfe;font-weight:600;}
.status-time{color:var(--text-secondary);}
.section{width:100%;display:flex;flex-direction:column;gap:var(--space-sm);align-items:center;}
.preset-grid,.sound-grid{display:flex;flex-wrap:wrap;gap:var(--space-xs);justify-content:center;}
.sound-icon{font-size:18px;}
.mixer-tracks{width:100%;display:flex;flex-direction:column;gap:var(--space-xs);}
.mixer-track{background:var(--glass-bg-medium);backdrop-filter:blur(var(--glass-blur-mobile)) saturate(1.8);-webkit-backdrop-filter:blur(var(--glass-blur-mobile)) saturate(1.8);border:1px solid var(--glass-border);border-radius:var(--glass-radius);padding:var(--space-sm)var(--space-md);display:flex;flex-direction:column;gap:var(--space-xs);box-shadow:var(--glass-shadow);}
.track-header{display:flex;align-items:center;gap:var(--space-xs);}
.track-icon{font-size:20px;}
.track-name{font-size:14px;font-weight:600;flex:1;text-align:left;color:var(--text-primary);}
.track-remove{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:transparent;border:none;color:var(--text-tertiary);cursor:pointer;font-size:12px;}
.track-remove:hover{background:rgba(255,255,255,0.1);color:var(--text-secondary);}
.mixer-slider{width:100%;height:4px;-webkit-appearance:none;appearance:none;background:var(--slider-track-bg, rgba(255,255,255,0.12));border-radius:2px;outline:none;}
.mixer-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent-blue-purple);cursor:pointer;}
.mixer-actions{display:flex;gap:var(--space-xs);}
.empty-state{padding:var(--space-xl);color:var(--text-tertiary);}
.action-bar{display:flex;gap:var(--space-md);}
.start-btn{padding:14px 48px;}
</style>