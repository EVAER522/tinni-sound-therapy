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
  function toggleTrack(sid){
    if($activeTracks.some(t=>t.soundId===sid)){
      removeTrack(sid);
    } else {
      addTrack(sid);
    }
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
      <div class="status-bar glass">
        {#if $isPlaying}
          <div class="eq-bars">
            <span class="eq-bar"></span>
            <span class="eq-bar"></span>
            <span class="eq-bar"></span>
          </div>
        {:else}
          <span class="pulse-dot" style="animation-play-state: paused"></span>
        {/if}
        <span class="status-text">{$isPlaying ? $t.sleep_playing : $t.notch_pause}</span>
        <span class="status-time">{fmt($sleepTimer*60-elapsed)}</span>
      </div>
    {/if}

    <!-- 1. Presets -->
    <div class="settings-card glass">
      <h3 class="card-section-title">{$t.sleep_presets}</h3>
      <div class="preset-grid">
        {#each [...defaultPresets,...$soundPresets] as preset}
          <button 
            type="button"
            class="preset-card" 
            class:selected={$selectedPreset===preset.id} 
            onclick={()=>loadPreset(preset)}
          >
            <span class="preset-icon">{preset.icon}</span>
            <span class="preset-name">{preset.name}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- 2. Sound Library -->
    <div class="settings-card glass">
      <h3 class="card-section-title">{$t.sleep_sound_lib}</h3>
      <div class="sound-grid">
        {#each soundLibrary as sound}
          {@const isActive = $activeTracks.some(t => t.soundId === sound.id)}
          <button 
            type="button"
            class="sound-card" 
            class:selected={isActive} 
            onclick={() => toggleTrack(sound.id)}
          >
            <span class="sound-icon" class:pulse={isActive && $isPlaying}>{sound.icon}</span>
            <span class="sound-name">{sound.name}</span>
            {#if isActive}
              <span class="active-indicator"></span>
            {/if}
          </button>
        {/each}
      </div>
      {#if $activeTracks.length === 0}
        <span class="grid-hint">{$t.sleep_empty}</span>
      {/if}
    </div>

    <!-- 3. Mixer -->
    {#if $activeTracks.length > 0}
      <div class="settings-card glass mixer-card">
        <div class="card-header-row">
          <h3 class="card-section-title">{$t.sleep_mixer}</h3>
          <button type="button" class="glass-btn-secondary" onclick={saveAsPreset} style="padding: 6px 12px; font-size: 12px; border-radius: 8px; margin: 0;">
            {$t.sleep_save_preset}
          </button>
        </div>
        
        <div class="mixer-tracks">
          {#each $activeTracks as track (track.soundId)}
            {@const s = findSound(track.soundId)}
            <div class="mixer-track-row">
              <div class="track-info">
                <span class="track-icon">{s?.icon || "🔊"}</span>
                <span class="track-name">{s?.name || track.soundId}</span>
              </div>
              
              <div class="slider-wrapper">
                <div class="slider-progress-fill" style="width: {track.volume * 100}%"></div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={track.volume} 
                  oninput={(e) => updateTrackVolume(track.soundId, parseFloat(e.target.value))} 
                  class="mixer-slider" 
                  aria-label={$t.sleep_volume} 
                />
              </div>
              <span class="vol-pct">{Math.round(track.volume * 100)}%</span>
              
              <button type="button" class="track-remove-btn" onclick={() => removeTrack(track.soundId)} aria-label="Remove sound">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- 4. Duration Timer -->
    <div class="settings-card glass">
      <h3 class="card-section-title">{$t.sleep_timer}</h3>
      <div class="chip-group">
        {#each [15,30,45,60,90] as dur}
          <button 
            type="button"
            class="glass-chip" 
            class:selected={$sleepTimer===dur} 
            onclick={()=>sleepTimer.set(dur)}
          >
            {dur} {$t.notch_min}
          </button>
        {/each}
      </div>
    </div>

    <!-- Action Bar -->
    {#if $activeTracks.length > 0}
      <div class="action-bar">
        {#if $sessionActive}
          <button type="button" class="glass-btn-secondary" onclick={() => isPlaying.update(v => !v)}>
            {$isPlaying ? $t.notch_pause : $t.notch_resume}
          </button>
          <button type="button" class="glass-btn-hero start-btn" onclick={stopAll}>{$t.sleep_stop}</button>
        {:else}
          <button type="button" class="glass-btn-hero start-btn" onclick={playAll}>{$t.sleep_play}</button>
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
    background: rgba(108, 92, 231, 0.8);
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .4; }
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

  /* Equalizer Animation */
  .eq-bars {
    display: inline-flex;
    align-items: flex-end;
    gap: 2.5px;
    width: 14px;
    height: 12px;
  }
  .eq-bar {
    width: 2.5px;
    height: 100%;
    background-color: #a29bfe;
    border-radius: 1px;
    animation: eqPulse 1.2s infinite ease-in-out alternate;
  }
  .light-mode .eq-bar {
    background-color: #6c5ce7;
  }
  .eq-bar:nth-child(1) { animation-delay: 0.1s; }
  .eq-bar:nth-child(2) { animation-delay: 0.35s; height: 60%; }
  .eq-bar:nth-child(3) { animation-delay: 0.55s; height: 80%; }
  @keyframes eqPulse {
    0% { height: 20%; }
    100% { height: 100%; }
  }

  /* Card Containers */
  .settings-card {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
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
  .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  /* Preset Presets Grid */
  .preset-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-start;
  }
  .preset-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    color: var(--text-secondary);
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s var(--spring-smooth);
    box-sizing: border-box;
  }
  .light-mode .preset-card {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.08);
  }
  .preset-card:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
  }
  .light-mode .preset-card:hover {
    background: rgba(0, 0, 0, 0.06);
    border-color: rgba(0, 0, 0, 0.12);
  }
  .preset-card.selected {
    background: rgba(108, 92, 231, 0.16);
    border-color: rgba(108, 92, 231, 0.45);
    color: var(--text-primary);
    box-shadow: 0 0 12px rgba(108, 92, 231, 0.15);
  }
  .light-mode .preset-card.selected {
    background: rgba(108, 92, 231, 0.08);
    border-color: rgba(108, 92, 231, 0.3);
  }
  .preset-icon {
    font-size: 15px;
  }

  /* Sound Library Grid */
  .sound-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
    gap: 8px;
    width: 100%;
  }
  @media (max-width: 480px) {
    .sound-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .sound-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s var(--spring-smooth);
    box-sizing: border-box;
    position: relative;
  }
  .light-mode .sound-card {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.08);
  }
  .sound-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.16);
    transform: translateY(-2px);
  }
  .light-mode .sound-card:hover {
    background: rgba(0, 0, 0, 0.06);
    border-color: rgba(0, 0, 0, 0.12);
  }
  .sound-card.selected {
    background: rgba(108, 92, 231, 0.18);
    border-color: rgba(108, 92, 231, 0.45);
    box-shadow: 0 0 16px rgba(108, 92, 231, 0.22);
  }
  .light-mode .sound-card.selected {
    background: rgba(108, 92, 231, 0.08);
    border-color: rgba(108, 92, 231, 0.3);
  }
  .sound-icon {
    font-size: 20px;
    transition: transform 0.2s;
  }
  .sound-card.selected .sound-icon.pulse {
    animation: iconPulse 2s infinite ease-in-out;
  }
  @keyframes iconPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.18); }
  }
  .sound-name {
    font-size: 12.5px;
    color: var(--text-secondary);
    font-weight: 500;
  }
  .sound-card.selected .sound-name {
    color: var(--text-primary);
    font-weight: 600;
  }
  .active-indicator {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #a29bfe;
    box-shadow: 0 0 6px #a29bfe;
  }
  .light-mode .active-indicator {
    background: #6c5ce7;
    box-shadow: 0 0 4px #6c5ce7;
  }
  .grid-hint {
    font-size: 12px;
    color: var(--text-tertiary);
    text-align: left;
    margin-top: 2px;
  }

  /* Mixer Card & Slider Rows */
  .mixer-card {
    gap: 16px;
  }
  .mixer-tracks {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }
  .mixer-track-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 8px 12px;
    box-sizing: border-box;
    width: 100%;
  }
  .light-mode .mixer-track-row {
    background: rgba(0, 0, 0, 0.01);
    border-color: rgba(0, 0, 0, 0.05);
  }
  .track-info {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 90px;
    flex-shrink: 0;
  }
  .track-icon {
    font-size: 16px;
  }
  .track-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    background: linear-gradient(90deg, #6c5ce7, #a29bfe);
    border-radius: 2px;
    pointer-events: none;
  }
  .mixer-slider {
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
  .mixer-slider::-webkit-slider-runnable-track {
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
  }
  .light-mode .mixer-slider::-webkit-slider-runnable-track {
    background: rgba(0, 0, 0, 0.08);
  }
  .mixer-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #6c5ce7;
    box-shadow: 0 0 8px rgba(108, 92, 231, 0.7);
    cursor: pointer;
    margin-top: -6px; /* center it over the 4px track */
    transition: transform 0.12s var(--spring-bounce);
  }
  .mixer-slider::-webkit-slider-thumb:hover {
    transform: scale(1.25);
  }
  .vol-pct {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    width: 32px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .track-remove-btn {
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }
  .track-remove-btn:hover {
    background: rgba(255, 118, 117, 0.15);
    color: #ff7675;
  }

  /* Chip Groups */
  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-start;
  }
  .empty-state-card {
    width: 100%;
    padding: 24px;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed var(--glass-border);
    box-sizing: border-box;
  }
  .empty-icon {
    font-size: 24px;
    opacity: 0.6;
  }
  .empty-text {
    font-size: 13px;
    color: var(--text-secondary);
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