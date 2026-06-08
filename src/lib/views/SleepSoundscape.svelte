<script>
  import { activeTracks, soundPresets, sleepTimer, selectedPreset } from "../stores/audio.js";
  import { isPlaying } from "../stores/app.js";
  import { soundLibrary, defaultPresets, findSound } from "../data/sounds.js";
  import { getAudioContext, createWhiteNoise, createPinkNoise, getMasterGain } from "../audio/engine.js";
  import { t } from "../stores/locale.js";
  let timerInterval=null, elapsed=0, isRunning=false, activeNodes=[];
  function addTrack(sid){const e=$activeTracks.find(t=>t.soundId===sid);if(e)return;activeTracks.update(t=>[...t,{soundId:sid,volume:.5}]);if(isRunning)startTrack(sid,.5);}
  function removeTrack(sid){activeTracks.update(t=>t.filter(tr=>tr.soundId!==sid));stopTrack(sid);}
  function updateTrackVolume(sid,vol){activeTracks.update(t=>t.map(tr=>tr.soundId===sid?{...tr,volume:vol}:tr));const n=activeNodes.find(n=>n.soundId===sid);if(n&&n.gain)n.gain.gain.value=vol*.4;}
  function startTrack(sid,vol){const s=findSound(sid);if(!s||!s.synthesizable)return;const ctx=getAudioContext();let src;if(s.freq.type==="white"||s.freq.type==="noise"){const buffer=s.freq.type==="white"?createWhiteNoise(30):createPinkNoise(30);const sc=ctx.createBufferSource();sc.buffer=buffer;sc.loop=true;let out=sc;if(s.freq.filter){const f=ctx.createBiquadFilter();f.type=s.freq.filter.type;f.frequency.value=s.freq.filter.freq||1000;if(s.freq.filter.Q)f.Q.value=s.freq.filter.Q;if(s.freq.filter.gain)f.gain.value=s.freq.filter.gain;out.connect(f);out=f;}const g=ctx.createGain();g.gain.value=vol*.4;out.connect(g);g.connect(getMasterGain());sc.start();src={src:sc,nodes:[sc,g,out!==sc?out:[]].flat(),soundId:sid,gain:g};}else if(s.freq.type==="tone"){const o=ctx.createOscillator();o.type="sine";o.frequency.value=s.freq.freq||440;const nodes=[o];if(s.freq.mod){const lfo=ctx.createOscillator();lfo.type="sine";lfo.frequency.value=s.freq.mod.rate||4;const lg=ctx.createGain();lg.gain.value=s.freq.mod.depth||500;lfo.connect(lg);lg.connect(o.frequency);lfo.start();nodes.push(lfo,lg);}const g=ctx.createGain();g.gain.value=vol*.15;o.connect(g);g.connect(getMasterGain());o.start();src={src:o,nodes:[...nodes,g],soundId:sid,gain:g};}if(src)activeNodes.push(src);}
  function playAll(){if(isRunning){stopAll();return;}isRunning=true;isPlaying.set(true);$activeTracks.forEach(t=>startTrack(t.soundId,t.volume));elapsed=0;timerInterval=setInterval(()=>{elapsed++;if(elapsed>=$sleepTimer*60)stopAll();},1000);}
  function stopTrack(sid){activeNodes=activeNodes.filter(n=>{if(n.soundId===sid){n.nodes.forEach(node=>{try{node.stop();}catch(e){}try{node.disconnect();}catch(e){}});return false;}return true;});}
  function stopAll(){activeNodes.forEach(n=>{n.nodes.forEach(node=>{try{node.stop();}catch(e){}try{node.disconnect();}catch(e){}});});activeNodes=[];isRunning=false;isPlaying.set(false);if(timerInterval){clearInterval(timerInterval);timerInterval=null;}}
  function loadPreset(preset){selectedPreset.set(preset.id);stopAll();activeTracks.set(preset.tracks.map(t=>({...t})));}
  function saveAsPreset(){const name=prompt($t.sleep_name_preset);if(!name)return;soundPresets.update(p=>[...p,{id:"custom-"+Date.now(),name,icon:"\uD83C\uDFB5",tracks:$activeTracks.map(t=>({...t}))}]);}
  import { onDestroy } from "svelte";onDestroy(()=>stopAll());
  function formatTime(s){const m=Math.floor(s/60);const sec=s%60;return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");}
</script>
<div class="sleep-view">
  <div class="view-panel">
    <h2 class="title">{$t.sleep_title}</h2>
    <p class="desc">{$t.sleep_desc}</p>
    {#if isRunning}<div class="status-bar"><span class="pulse-dot"></span><span class="status-text">{$t.sleep_playing}</span><span class="status-time">{formatTime($sleepTimer*60-elapsed)}</span></div>{/if}
      <div class="section"><h3 class="section-title">{$t.sleep_presets}</h3><div class="preset-grid">{#each [...defaultPresets,...$soundPresets] as preset}<button class="preset-chip" class:selected={$selectedPreset===preset.id} onclick={()=>loadPreset(preset)}><span>{preset.icon}</span><span>{preset.name}</span></button>{/each}</div></div>
    <div class="section"><h3 class="section-title">{$t.sleep_sound_lib}</h3><div class="sound-grid">{#each soundLibrary as sound}<button class="sound-chip" onclick={()=>addTrack(sound.id)}><span class="sound-icon">{sound.icon}</span><span class="sound-name">{sound.name}</span></button>{/each}</div></div>
    {#if $activeTracks.length>0}
    <div class="section"><h3 class="section-title">{$t.sleep_mixer}</h3><div class="mixer-tracks">{#each $activeTracks as track,i}{@const s=findSound(track.soundId)}<div class="mixer-track"><div class="track-header"><span class="track-icon">{s?.icon||"\uD83D\uDD0A"}</span><span class="track-name">{s?.name||track.soundId}</span><button class="track-remove" onclick={()=>removeTrack(track.soundId)}>X</button></div><input type="range" min="0" max="1" step="0.01" value={track.volume} oninput={(e)=>updateTrackVolume(track.soundId,parseFloat(e.target.value))} class="mixer-slider" aria-label={$t.sleep_volume} /></div>{/each}</div><div class="mixer-actions"><button class="btn-secondary" onclick={saveAsPreset}>{$t.sleep_save_preset}</button></div></div>
    {:else}<div class="empty-state"><span class="text-caption">{$t.sleep_empty}</span></div>{/if}
      <div class="section"><h3 class="section-title">{$t.sleep_timer}</h3><div class="chip-group">{#each [15,30,45,60,90] as dur}<button class="chip" class:selected={$sleepTimer===dur} onclick={()=>sleepTimer.set(dur)}>{dur} {$t.notch_min}</button>{/each}</div></div>
    {#if $activeTracks.length>0}<div class="action-bar">{#if isRunning}<button class="btn-hero start-btn" onclick={playAll}>{$t.sleep_stop}</button>{:else}<button class="btn-hero start-btn" onclick={playAll}>{$t.sleep_play}</button>{/if}</div>{/if}
  </div>
</div>
<style>
.sleep-view{flex:1;overflow-y:auto;padding:var(--space-section)var(--space-lg);display:flex;flex-direction:column;align-items:center;}
.view-panel{max-width:700px;width:100%;display:flex;flex-direction:column;gap:var(--space-lg);align-items:center;text-align:center;}
.title{font-size:34px;font-weight:600;line-height:1.1;letter-spacing:-.374px;color:var(--ink);}
.desc{font-size:17px;font-weight:400;line-height:1.47;letter-spacing:-.374px;color:var(--ink-muted-80);}
.status-bar{display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-xs)var(--space-md);background:var(--surface-tile-1);border-radius:var(--radius-pill);color:#fff;font-size:14px;}
.pulse-dot{width:8px;height:8px;border-radius:50%;background:var(--primary-on-dark);animation:pulse 1.5s infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.5;}}
.status-text{color:var(--primary-on-dark);font-weight:600;}
.status-time{color:rgba(255,255,255,.7);}
.section{width:100%;display:flex;flex-direction:column;gap:var(--space-sm);align-items:center;}
.section-title{font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--ink-muted-48);}
.preset-grid,.sound-grid{display:flex;flex-wrap:wrap;gap:var(--space-xs);justify-content:center;}
.preset-chip,.sound-chip{background:var(--canvas);border:1px solid var(--hairline);border-radius:var(--radius-pill);padding:8px 16px;display:flex;align-items:center;gap:var(--space-xs);cursor:pointer;font-size:14px;color:var(--ink);transition:border-color .2s;}
.preset-chip:hover,.sound-chip:hover{border-color:var(--primary);}
.preset-chip.selected{border:2px solid var(--primary);background:var(--surface-pearl);}
.sound-icon{font-size:18px;}
.mixer-tracks{width:100%;display:flex;flex-direction:column;gap:var(--space-xs);}
.mixer-track{background:var(--canvas);border:1px solid var(--hairline);border-radius:var(--radius-lg);padding:var(--space-sm)var(--space-md);display:flex;flex-direction:column;gap:var(--space-xs);}
.track-header{display:flex;align-items:center;gap:var(--space-xs);}
.track-icon{font-size:20px;}
.track-name{font-size:14px;font-weight:600;flex:1;text-align:left;}
.track-remove{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:transparent;border:none;color:var(--ink-muted-48);cursor:pointer;font-size:12px;}
.track-remove:hover{background:var(--divider-soft);color:var(--ink-muted-80);}
.mixer-slider{width:100%;height:4px;-webkit-appearance:none;appearance:none;background:var(--hairline);border-radius:2px;outline:none;}
.mixer-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--primary);cursor:pointer;}
.mixer-actions{display:flex;gap:var(--space-xs);}
.empty-state{padding:var(--space-xl);color:var(--ink-muted-48);}
.chip-group{display:flex;gap:var(--space-xs);flex-wrap:wrap;justify-content:center;}
.action-bar{display:flex;gap:var(--space-md);}
.start-btn{padding:14px 48px;}
</style>
