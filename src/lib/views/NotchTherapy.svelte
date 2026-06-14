<script>
  import { matchMethod, matchEar, matchStep, matchTotalSteps, matchResults, matchConfidence, matchPhase, notchParams, sessionTimer, sessionDuration, postFeeling, postSeverity, postNote, tinnitusToday, useVoice, useUpload, uploadedFileName } from "../stores/therapy.js";
  import { isPlaying, isMicromode, records, currentMode, therapyView, onboardingComplete, sessionActive } from "../stores/app.js";
  import { createMatchingSession, startTherapy, stopTherapy, updateTherapyParams, loadUploadedAudio, clearUploadedAudio, startMic, stopMic } from "../audio/notch.js";
  import { getAudioContext, setMasterVolume, getAnalyserNode, suspendAudio, resumeAudio, isAudioSuspended } from "../audio/engine.js";
  import { remainingTime, audioProgress } from "../stores/audio.js";
  import { t } from "../stores/locale.js";
  let session,currentFreqA=0,currentFreqB=0,matchingComplete=false,matchFreqResult=null,sessionInterval=null,sessionElapsed=0,selectedCarrier="white",uploadError="",micLoading=false,fileInputEl,useNoise=false,manualFreq=4000,manualPlaying=false,manualOsc=null,manualFineMode=false,manualFineCenter=4000,spectrumAnimFrame=null;
  const bandwidths=[{id:"narrow",label:"Narrow (1/3 oct)"},{id:"medium",label:"Medium (1/2 oct)"},{id:"wide",label:"Wide (1 oct)"}];
  const depths=[{id:-3,label:"-3 dB"},{id:-6,label:"-6 dB"},{id:-12,label:"-12 dB"},{id:-20,label:"-20 dB"}];
  let dailyCheckDone=false;function answerDaily(a){tinnitusToday.set(a);dailyCheckDone=true;if(a==="no")currentMode.set("sleep");}
  let onboardingStep=0;
  const oSteps=[{title:$t.notch_onboarding_1_title,desc:$t.notch_onboarding_1_desc},{title:$t.notch_onboarding_2_title,desc:$t.notch_onboarding_2_desc},{title:$t.notch_onboarding_3_title,desc:$t.notch_onboarding_3_desc}];
  function nextO(){if(onboardingStep<2)onboardingStep++;else{onboardingComplete.set(true);matchPhase.set("method-select");}}
  function selectMethod(m){resetMatching();matchMethod.set(m);matchPhase.set(m==="manual"?"manual-match":"ear-select");}
  function resetMatching(){session=null;currentFreqA=0;currentFreqB=0;matchingComplete=false;matchFreqResult=null;matchStep.set(0);matchEar.set("left");matchResults.set({left:null,right:null,confidence:0});matchConfidence.set(0);useNoise=false;}
  function goBack(){const m={"ear-select":"method-select","manual-match":"method-select","matching":"ear-select","verification":"matching","complete":"verification","result":"complete"};if(m[$matchPhase])matchPhase.set(m[$matchPhase]);}
  function selectEar(e){matchEar.set(e);if($matchMethod==="2afc"){session=createMatchingSession();matchStep.set(0);currentFreqA=0;currentFreqB=0;matchPhase.set("matching");nextPair();}}
  function nextPair(){const p=session.getNextFreqs();if(p){currentFreqA=p.freqA;currentFreqB=p.freqB;session.playPair(p.freqA,p.freqB,useNoise);}else finishMatching();}
  function playSingleTone(f){const c=getAudioContext();const o=c.createOscillator();o.type="sine";o.frequency.value=f;const g=c.createGain();g.gain.value=0.3;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+1.5);}
  function chooseFreq(c){matchFreqResult=c;session.advance(c);matchStep.set(session.currentStep);matchConfidence.set(session.getConfidence());setTimeout(()=>nextPair(),500);}
  function finishMatching(){matchFreqResult=session.getResult();matchResults.set({left:matchFreqResult,right:null,confidence:session.getConfidence()});matchConfidence.set(session.getConfidence());notchParams.update(p=>{p.left.frequency=matchFreqResult;return p;});matchPhase.set("verification");}
  function playTestTone(f){const c=getAudioContext();if(manualOsc){try{manualOsc.stop();}catch(e){}manualOsc=null;}manualOsc=c.createOscillator();manualOsc.type="sine";manualOsc.frequency.value=f;const g=c.createGain();g.gain.value=0.3;manualOsc.connect(g);g.connect(c.destination);manualOsc.start();manualPlaying=true;}
  async function handleUpload(){const f=fileInputEl?.files?.[0];if(!f)return;uploadError="";try{await loadUploadedAudio(f);uploadedFileName.set(f.name);useUpload.set(true);}catch(e){uploadError=$t.notch_unsupported_format;useUpload.set(false);}}
  function clearUpload(){clearUploadedAudio();uploadedFileName.set("");useUpload.set(false);}
  async function toggleVoice(){if($useVoice){stopMic();useVoice.set(false);}else{micLoading=true;const ok=await startMic();useVoice.set(ok);if(!ok)uploadError=$t.notch_mic_denied;micLoading=false;}}
  function stopTestTone(){if(manualOsc){try{manualOsc.stop();}catch(e){}manualOsc=null;}manualPlaying=false;}
  function toggleManualFine(){if(!manualFineMode){manualFineCenter=manualFreq;manualFineMode=true;}else manualFineMode=false;}
  function confirmManual(){matchResults.set({left:manualFreq,right:null,confidence:3});matchConfidence.set(3);notchParams.update(p=>{p.left.frequency=manualFreq;return p;});stopTestTone();matchPhase.set("verification");}
  function verifyAccept(){matchPhase.set("complete");}function verifyRetune(){resetMatching();matchPhase.set("method-select");}
  let paused=false;
  function startTimer(){
    if(sessionInterval)clearInterval(sessionInterval);
    sessionInterval=setInterval(()=>{
      sessionElapsed++;
      sessionTimer.set(sessionElapsed);
      remainingTime.set($sessionDuration*60-sessionElapsed);
      audioProgress.set(sessionElapsed/($sessionDuration*60));
      if(sessionElapsed>=$sessionDuration*60)stopSession(true);
    },1000);
  }
  function stopTimer(){
    if(sessionInterval){
      clearInterval(sessionInterval);
      sessionInterval=null;
    }
  }
  $: if ($sessionActive) {
    if ($isPlaying && paused) {
      resumeAudio();
      paused=false;
      startTimer();
    } else if (!$isPlaying && !paused) {
      suspendAudio();
      paused=true;
      stopTimer();
    }
  }
  function startSession(){const f=$notchParams.left.frequency||4000;startTherapy(f,$notchParams.left.bandwidth,$notchParams.left.depth,selectedCarrier,{useVoice:$useVoice,useUpload:$useUpload});sessionActive.set(true);isPlaying.set(true);paused=false;sessionElapsed=0;sessionTimer.set(0);setTimeout(()=>startSpectrum(),100);startTimer();}
  function stopSession(b){stopSpectrum();stopTherapy();sessionActive.set(false);isPlaying.set(false);remainingTime.set(0);audioProgress.set(0);stopTimer();matchPhase.set("result");}
  function emergencyStop(){stopSpectrum();stopTherapy();sessionActive.set(false);isPlaying.set(false);paused=false;remainingTime.set(0);audioProgress.set(0);stopTimer();therapyView.set("match");}
  function togglePause(){isPlaying.update(v=>!v);}
  function startSpectrum(){stopSpectrum();const c=document.getElementById("spectrum-canvas");if(!c)return;const c2d=c.getContext("2d");const a=getAnalyserNode();const bl=a.frequencyBinCount;const d=new Uint8Array(bl);const w=c.width,h=c.height;function draw(){spectrumAnimFrame=requestAnimationFrame(draw);a.getByteFrequencyData(d);c2d.clearRect(0,0,w,h);const bw=w/bl;for(let i=0;i<bl;i++){const bh=(d[i]/255)*h;const o=0.3+(d[i]/255)*0.7;c2d.fillStyle="rgba(0,102,204,"+o+")";c2d.fillRect(i*bw,h-bh,Math.max(bw-0.5,1),bh);}if($notchParams.left.frequency){const sr=getAudioContext().sampleRate;const x=($notchParams.left.frequency/(sr/2))*w;c2d.strokeStyle="rgba(41,151,255,0.8)";c2d.lineWidth=2;c2d.beginPath();c2d.moveTo(x,0);c2d.lineTo(x,h);c2d.stroke();c2d.fillStyle="rgba(41,151,255,0.9)";c2d.font="11px Inter, sans-serif";c2d.fillText(Math.round($notchParams.left.frequency)+" Hz",x+4,14);}}draw();}
  function stopSpectrum(){if(spectrumAnimFrame){cancelAnimationFrame(spectrumAnimFrame);spectrumAnimFrame=null;}}
  function submitRating(){const r={date:new Date().toISOString().split("T")[0],time:new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}),mode:"therapy",duration_min:Math.round(sessionElapsed/60),frequency:$notchParams.left.frequency,bandwidth:$notchParams.left.bandwidth,depth:$notchParams.left.depth,feeling:$postFeeling,severity_before:$postSeverity,note:$postNote||""};records.update(rs=>[...rs,r]);postFeeling.set(null);postSeverity.set(5);postNote.set("");therapyView.set("match");matchPhase.set("method-select");}
  import { onDestroy } from "svelte";onDestroy(()=>{stopSpectrum();stopTimer();stopTestTone();stopTherapy();});
</script>
<div class="nt-view">{#if !$onboardingComplete}<div class="view-panel fade-in"><h2 class="title">{oSteps[onboardingStep].title}</h2><p class="desc">{oSteps[onboardingStep].desc}</p><div class="onboarding-nav"><div class="dots">{#each oSteps as _,i}<span class="dot" class:active={i===onboardingStep}></span>{/each}</div><button class="glass-btn-primary" onclick={nextO}>{onboardingStep<2?$t.notch_next:$t.notch_start_matching}</button></div></div>
{:else if !dailyCheckDone}<div class="daily-check fade-in"><h2 class="title">{$t.notch_tinnitus_today}</h2><div class="daily-options"><button class="glass-btn-primary" onclick={()=>answerDaily("yes")}>{$t.notch_yes}</button><button class="glass-btn-secondary" onclick={()=>answerDaily("mild")}>{$t.notch_mild}</button><button class="glass-btn-secondary" onclick={()=>answerDaily("no")}>{$t.notch_no}</button></div></div>
{:else if $matchPhase==="method-select"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_select_method}</h2><p class="desc">{$t.notch_method_desc}</p><div class="method-grid"><button class="method-card" onclick={()=>selectMethod("2afc")}><div class="method-name">{$t.notch_adaptive}</div><div class="method-desc">{$t.notch_adaptive_desc}</div></button><button class="method-card" onclick={()=>selectMethod("manual")}><div class="method-name">{$t.notch_manual}</div><div class="method-desc">{$t.notch_manual_desc}</div></button></div></div>
  {:else if $matchPhase==="ear-select"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_select_ear}</h2><p class="desc">{$t.notch_ear_desc}</p><div class="ear-grid">{#each ["left","right","both"] as ear}<button class="ear-card" onclick={()=>selectEar(ear)}><div class="ear-name">{ear==="left"?$t.notch_left:ear==="right"?$t.notch_right:$t.notch_both}</div></button>{/each}</div><button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button></div>
{:else if $matchPhase==="matching"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_freq_matching}</h2><div class="progress-info"><span class="text-body">{$t.notch_round} {$matchStep}/{$matchTotalSteps}<span class="phase-badge">{session?.phase==="coarse"?$t.notch_coarse:$t.notch_fine}</span></span><div class="progress-bar-compact"><div class="progress-fill-compact" style="width:{Math.min($matchStep/$matchTotalSteps*100,100)}%"></div></div></div><p class="desc">{$t.notch_which_sound}</p><div class="afc-grid"><button class="afc-btn" onclick={()=>chooseFreq(currentFreqA)}><span class="afc-label">{$t.notch_sound_a}</span><span class="afc-freq">{Math.round(currentFreqA)} Hz</span></button><button class="afc-btn" onclick={()=>chooseFreq(currentFreqB)}><span class="afc-label">{$t.notch_sound_b}</span><span class="afc-freq">{Math.round(currentFreqB)} Hz</span></button></div><div class="replay-row"><button class="btn-secondary replay-btn" onclick={()=>playSingleTone(currentFreqA)}>{$t.notch_sound_a}</button><button class="btn-secondary replay-btn" onclick={()=>playSingleTone(currentFreqB)}>{$t.notch_sound_b}</button></div><div class="matching-tools"><button class="glass-chip" class:selected={useNoise} onclick={()=>useNoise=!useNoise}>{useNoise?$t.notch_narrowband:$t.notch_pure_tone}</button></div><button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button></div>
  {:else if $matchPhase==="manual-match"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_manual_title}</h2><p class="desc">{manualFineMode?$t.notch_manual_desc_fine:$t.notch_manual_desc_coarse}</p><div class="manual-controls"><div class="slider-with-ticks"><input type="range" min={manualFineMode?Math.max(20,manualFineCenter-100):125} max={manualFineMode?Math.min(16000,manualFineCenter+100):12000} step={manualFineMode?1:50} bind:value={manualFreq} class="freq-slider" oninput={()=>{if(manualPlaying)playTestTone(manualFreq);}} onmousedown={()=>playTestTone(manualFreq)} onmouseup={stopTestTone} /><div class="tick-marks">{#if manualFineMode}{#each Array(21) as _,i}{@const thz=manualFineCenter-100+i*10}{@const fl=manualFineCenter-100}{@const fh=manualFineCenter+100}{@const pct=((thz-fl)/(fh-fl))*100}<span class="tick" style="left:{pct}%"><span class="tick-line"></span><span class="tick-label">{thz}</span></span>{/each}{:else}{#each [125,250,500,1000,2000,4000,6000,8000,12000] as thz}{@const pct=((thz-125)/(12000-125))*100}<span class="tick" style="left:{pct}%"><span class="tick-line"></span><span class="tick-label">{thz}</span></span>{/each}{/if}</div></div><div class="freq-display"><input type="number" min="20" max="16000" bind:value={manualFreq} class="freq-input" onchange={()=>{if(manualPlaying)playTestTone(manualFreq);}} /><span class="text-body">Hz</span></div><div class="manual-actions"><button class="glass-btn-primary" onclick={confirmManual}>{$t.notch_confirm}</button><button class="glass-btn-secondary" onclick={()=>playTestTone(manualFreq)}>{$t.notch_preview}</button><button class="glass-btn-secondary" onclick={stopTestTone}>{$t.notch_stop}</button><button class="glass-btn-secondary" onclick={toggleManualFine}>{manualFineMode?$t.notch_back_coarse:$t.notch_fine_tune}</button></div></div><button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button></div>
{:else if $matchPhase==="verification"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_verify_title}</h2><p class="desc">{$t.notch_verify_desc} <strong>{Math.round($notchParams.left.frequency)} Hz</strong></p><div class="verification-actions"><button class="glass-btn-primary" onclick={verifyAccept}>{$t.notch_confirm_start}</button><button class="glass-btn-secondary" onclick={()=>playTestTone($notchParams.left.frequency)}>{$t.notch_preview}</button><button class="glass-btn-secondary" onclick={verifyRetune}>{$t.notch_rematch}</button></div><button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button></div>
  {:else if $matchPhase==="complete"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_complete_title}</h2><div class="match-report"><div class="report-item"><span class="text-caption">{$t.notch_frequency}</span><span class="text-display-md">{Math.round($notchParams.left.frequency)} Hz</span></div><div class="report-item"><span class="text-caption">{$t.notch_confidence}</span><div class="confidence-dots">{#each Array(5) as _,i}<span class="conf-dot" class:filled={i<$matchConfidence}></span>{/each}</div></div></div><div class="session-controls"><div class="control-row"><label class="text-caption-strong">{$t.notch_carrier}</label><div class="chip-group" role="radiogroup">{#each ["white","pink","ambient"] as c}<button class="glass-chip" class:selected={selectedCarrier===c} onclick={()=>selectedCarrier=c}>{c==="white"?$t.notch_white_noise:c==="pink"?$t.notch_pink_noise:$t.notch_ambient}</button>{/each}</div></div><div class="control-row"><label class="text-caption-strong">{$t.notch_upload_audio}</label><div class="chip-group"><input type="file" accept="audio/*" bind:this={fileInputEl} onchange={handleUpload} style="display:none" /><button class="glass-chip" onclick={()=>fileInputEl?.click()}>{$t.notch_select_file}</button>{#if $useUpload}<button class="glass-chip" onclick={clearUpload}>{$t.notch_clear}</button>{/if}</div></div><div class="control-row"><label class="text-caption-strong">{$t.notch_mic}</label><div class="chip-group" role="radiogroup"><button class="glass-chip" class:selected={$useVoice} onclick={toggleVoice} disabled={micLoading}>{micLoading?$t.notch_requesting:$useVoice?$t.notch_mic_on:$t.notch_enable_mic}</button></div></div><div class="control-row"><label class="text-caption-strong">{$t.notch_bandwidth}</label><div class="chip-group" role="radiogroup">{#each bandwidths as bw}<button class="glass-chip" class:selected={$notchParams.left.bandwidth===bw.id} onclick={()=>notchParams.update(p=>{p.left.bandwidth=bw.id;return p;})}>{bw.label}</button>{/each}</div></div><div class="control-row"><label class="text-caption-strong">{$t.notch_depth}</label><div class="chip-group" role="radiogroup">{#each depths as d}<button class="glass-chip" class:selected={$notchParams.left.depth===d.id} onclick={()=>notchParams.update(p=>{p.left.depth=d.id;return p;})}>{d.label}</button>{/each}</div></div><div class="control-row"><label class="text-caption-strong">{$t.notch_duration}</label><div class="chip-group" role="radiogroup">{#each [15,30,45,60] as dur}<button class="glass-chip" class:selected={$sessionDuration===dur} onclick={()=>sessionDuration.set(dur)}>{dur} {$t.notch_min}</button>{/each}</div></div><button class="glass-btn-hero start-btn" onclick={startSession}>{$t.notch_start_therapy}</button><button class="glass-btn-secondary" onclick={()=>therapyView.set("match")}>{$t.notch_skip_today}</button></div><button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button></div>
  {:else if $matchPhase==="result"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_session_complete}</h2><p class="desc">{$t.notch_how_feel}</p><div class="feeling-grid">{#each [{id:"better",label:$t.notch_better},{id:"unchanged",label:$t.notch_no_change},{id:"worse",label:$t.notch_worse}] as f}<button class="feeling-btn" class:selected={$postFeeling===f.id} onclick={()=>postFeeling.set(f.id)}>{f.label}</button>{/each}</div><div class="severity-slider"><label class="text-caption-strong" for="notch-severity">{$t.notch_current_level}</label><div class="slider-row"><span class="text-fine">0 {$t.notch_quiet}</span><input type="range" id="notch-severity" min="0" max="10" step="1" bind:value={$postSeverity} class="freq-slider" /><span class="text-fine">10 {$t.notch_loud}</span></div><span class="text-display-md severity-value">{$postSeverity}</span></div><div class="note-section"><label class="text-caption-strong" for="notch-notes">{$t.notch_notes}</label><textarea id="notch-notes" bind:value={$postNote} class="note-input" placeholder={$t.notch_notes_placeholder} rows="3"></textarea></div><button class="glass-btn-hero start-btn" onclick={submitRating} disabled={!$postFeeling}>{$t.notch_save_record}</button><button class="glass-btn-secondary" onclick={()=>matchPhase.set("method-select")}>{$t.notch_repeat}</button><button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button><div class="privacy-note text-fine">{$t.notch_privacy}</div></div>
{/if}</div>
{#if $isPlaying || paused}<div class="session-overlay" class:micromode={$isMicromode}><button class="btn-utility emergency-btn" onclick={togglePause}>{paused?$t.notch_resume:$t.notch_pause}</button><button class="btn-utility emergency-btn" onclick={emergencyStop}>{$t.notch_stop_esc}</button><div class="session-info"><span class="text-tagline session-title">{$t.notch_in_session}</span><span class="text-lead">{Math.floor(sessionElapsed/60)}:{String(sessionElapsed%60).padStart(2,"0")}</span></div><div class="spectrum-container"><div class="spectrum-header"><span class="spectrum-label">{$t.notch_real_time_spec}</span><span class="spectrum-hint">{$t.notch_notch_hint}</span></div><canvas id="spectrum-canvas" width="480" height="160"></canvas></div></div>{/if}
<style>
.nt-view{flex:1;overflow-y:auto;padding:var(--space-section)var(--space-lg);display:flex;flex-direction:column;align-items:center;scrollbar-width:thin;}
.view-panel{max-width:600px;width:100%;display:flex;flex-direction:column;gap:var(--space-lg);align-items:center;text-align:center;}
.title{font-size:clamp(28px,4vw,34px);font-weight:700;line-height:1.1;letter-spacing:-.02em;color:var(--text-primary);margin-bottom:var(--space-xs);}
.desc{font-size:17px;font-weight:400;line-height:1.5;color:var(--text-secondary);max-width:480px;}
.method-card,.ear-card{flex:1;background:var(--glass-bg-medium);backdrop-filter:blur(var(--glass-blur)) saturate(1.8);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.8);border:1px solid var(--glass-border);border-radius:var(--glass-radius);padding:var(--space-lg);display:flex;flex-direction:column;align-items:center;gap:var(--space-sm);cursor:pointer;transition:border-color .2s,background .15s;text-align:center;box-shadow:var(--glass-shadow);}
.method-card:hover,.ear-card:hover{background:var(--glass-bg-heavy);border-color:rgba(108,92,231,0.4);}
.method-name,.ear-name{font-size:17px;font-weight:600;color:var(--text-primary);}
.method-desc{font-size:14px;font-weight:400;color:var(--text-tertiary);line-height:1.4;}
.afc-btn{flex:1;background:var(--glass-bg-medium);backdrop-filter:blur(var(--glass-blur)) saturate(1.8);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.8);border:2px solid var(--glass-border);border-radius:var(--glass-radius);padding:var(--space-xl);display:flex;flex-direction:column;align-items:center;gap:var(--space-sm);cursor:pointer;transition:border-color .2s,background .15s;box-shadow:var(--glass-shadow);}
.afc-btn:hover{background:var(--glass-bg-heavy);border-color:rgba(108,92,231,0.6);}
.afc-label{font-size:14px;font-weight:600;color:var(--text-secondary);letter-spacing:-.224px;}
.afc-freq{font-size:24px;font-weight:600;color:var(--text-primary);}
.feeling-btn{flex:1;padding:var(--space-lg);background:var(--glass-bg-medium);backdrop-filter:blur(var(--glass-blur-mobile)) saturate(1.8);-webkit-backdrop-filter:blur(var(--glass-blur-mobile)) saturate(1.8);border:2px solid var(--glass-border);border-radius:var(--glass-radius);display:flex;flex-direction:column;align-items:center;gap:var(--space-xs);cursor:pointer;transition:border-color .2s,background .15s;font-size:14px;font-weight:500;color:var(--text-primary);}
.feeling-btn:hover,.feeling-btn.selected{border-color:rgba(108,92,231,0.6);background:var(--glass-bg-heavy);}
.progress-info{width:100%;display:flex;flex-direction:column;gap:var(--space-xs);}
.phase-badge{display:inline-block;font-size:12px;font-weight:600;color:#a29bfe;background:rgba(108,92,231,.2);border-radius:9999px;padding:2px 10px;margin-left:8px;}
.method-grid,.ear-grid{display:flex;gap:var(--space-md);width:100%;}
.afc-grid{display:flex;gap:var(--space-lg);width:100%;max-width:400px;}
.replay-row,.matching-tools{display:flex;gap:var(--space-sm);}
.freq-slider{width:100%;max-width:400px;height:6px;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,0.15);border-radius:3px;outline:none;}
.freq-slider::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:var(--accent-blue-purple);cursor:pointer;border:3px solid var(--glass-bg-heavy);box-shadow:0 1px 4px rgba(0,0,0,.3);}
.freq-input{width:120px;padding:8px 12px;background:var(--glass-bg-light);border:1px solid var(--glass-border);border-radius:12px;text-align:center;font-size:24px;font-weight:600;color:var(--text-primary);font-family:inherit;}
.freq-input:focus{outline:2px solid rgba(108,92,231,0.6);outline-offset:-1px;}
.manual-controls{width:100%;display:flex;flex-direction:column;align-items:center;gap:var(--space-lg);padding:var(--space-lg)0;}
.slider-with-ticks{width:100%;max-width:400px;display:flex;flex-direction:column;gap:4px;}
.tick-marks{position:relative;width:100%;height:28px;margin-top:2px;}
.tick{position:absolute;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;}
.tick-line{width:1px;height:6px;background:rgba(255,255,255,0.2);}
.tick-label{font-size:9px;color:var(--text-tertiary);white-space:nowrap;}
.match-report{display:flex;gap:var(--space-xl);align-items:flex-start;}
.conf-dot{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.15);transition:background .2s;}
.conf-dot.filled{background:var(--accent-blue-purple);}
.daily-check{text-align:center;display:flex;flex-direction:column;gap:var(--space-lg);align-items:center;padding-top:var(--space-section);}
.daily-options{display:flex;gap:var(--space-md);}
.chip-group{display:flex;gap:var(--space-xs);flex-wrap:wrap;justify-content:center;}
.control-row{display:flex;flex-direction:column;gap:var(--space-xs);align-items:center;}
.progress-bar-compact{height:4px;background:rgba(255,255,255,0.12);border-radius:2px;overflow:hidden;}
.progress-fill-compact{height:100%;background:var(--accent-blue-purple);border-radius:2px;transition:width .3s;}
.severity-slider{width:100%;max-width:400px;display:flex;flex-direction:column;gap:var(--space-sm);align-items:center;}
.slider-row{display:flex;align-items:center;gap:var(--space-sm);width:100%;}
.note-section{width:100%;display:flex;flex-direction:column;gap:var(--space-xs);text-align:left;}
.note-input{width:100%;padding:var(--space-sm);background:var(--glass-bg-light);border:1px solid var(--glass-border);border-radius:12px;resize:vertical;color:var(--text-primary);font-size:14px;font-family:inherit;}
.note-input:focus{outline:2px solid rgba(108,92,231,0.6);outline-offset:-1px;}
.note-input::placeholder{color:var(--text-tertiary);}
.onboarding-nav{display:flex;flex-direction:column;align-items:center;gap:var(--space-md);margin-top:var(--space-lg);}
.dots{display:flex;gap:var(--space-xs);}
.dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.15);transition:background .2s;}
.dot.active{background:var(--accent-blue-purple);}
.session-overlay{position:fixed;bottom:calc(var(--tabbar-height) + var(--safe-bottom) + 70px);left:12px;right:12px;top:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-lg);z-index:20;background:rgba(0,0,0,0.6);border-radius:20px;padding:var(--space-lg);}
.session-info{text-align:center;}
.session-info :global(.text-lead){font-size:48px;font-weight:700;color:#fff;background:var(--glass-bg-light);padding:8px 24px;border-radius:14px;backdrop-filter:blur(20px);}
.emergency-btn{font-size:14px;padding:8px 20px;background:var(--glass-bg-light);color:rgba(255,255,255,.7);border:1px solid var(--glass-border);border-radius:12px;}
.spectrum-container{width:100%;max-width:520px;display:flex;flex-direction:column;gap:6px;align-items:center;}
.spectrum-header{width:100%;display:flex;justify-content:space-between;align-items:center;padding:0 4px;}
.spectrum-label{font-size:12px;font-weight:600;color:var(--text-secondary);letter-spacing:1px;text-transform:uppercase;}
.spectrum-hint{font-size:11px;color:var(--text-secondary);}
#spectrum-canvas{width:100%;height:auto;border-radius:12px;background:rgba(0,0,0,.3);}
.back-step{font-size:14px;font-weight:500;color:var(--text-secondary);background:none;border:none;cursor:pointer;padding:4px 0;margin-top:4px;transition:color .15s;}
.back-step:hover{color:var(--text-primary);}
.privacy-note{color:var(--text-tertiary);text-align:center;margin-top:var(--space-md);}
.freq-display{display:flex;align-items:center;gap:var(--space-xs);}
.manual-actions,.verification-actions{display:flex;gap:var(--space-sm);flex-wrap:wrap;justify-content:center;}
.session-controls{width:100%;display:flex;flex-direction:column;gap:var(--space-md);align-items:center;}
.feeling-grid{display:flex;gap:var(--space-md);}
</style>

