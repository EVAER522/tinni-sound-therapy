<script>
  import { matchMethod, matchEar, matchStep, matchTotalSteps, matchResults, matchConfidence, matchPhase, notchParams, sessionTimer, sessionDuration, postFeeling, postSeverity, postNote, tinnitusToday, useVoice, useUpload, uploadedFileName } from "../stores/therapy.js";
  import { isPlaying, isMicromode, records, currentMode, therapyView, onboardingComplete, sessionActive, activeTab, locale } from "../stores/app.js";
  import { createMatchingSession, startTherapy, stopTherapy, updateTherapyParams, loadUploadedAudio, clearUploadedAudio, startMic, stopMic } from "../audio/notch.js";
  import { getAudioContext, setMasterVolume, getAnalyserNode, suspendAudio, resumeAudio, isAudioSuspended, getMasterGain } from "../audio/engine.js";
  import { remainingTime, audioProgress } from "../stores/audio.js";
  import { t } from "../stores/locale.js";
  import { tick } from "svelte";

  let session,currentFreqA=0,currentFreqB=0,matchingComplete=false,matchFreqResult=null,sessionInterval=null,sessionElapsed=0,selectedCarrier="white",uploadError="",micLoading=false,fileInputEl,useNoise=false,manualFreq=4000,manualPlaying=false,manualOsc=null,manualGainNode=null,manualFineMode=false,manualFineCenter=4000,spectrumAnimFrame=null;
  const bandwidths=[{id:"narrow",label:"Narrow (1/3 oct)"},{id:"medium",label:"Medium (1/2 oct)"},{id:"wide",label:"Wide (1 oct)"}];
  const depths=[{id:-3,label:"-3 dB"},{id:-6,label:"-6 dB"},{id:-12,label:"-12 dB"},{id:-20,label:"-20 dB"}];
  let dailyCheckDone=false;
  function answerDaily(a){
    tinnitusToday.set(a);
    dailyCheckDone=true;
    if(a==="no") {
      activeTab.set(2);
      currentMode.set("sleep");
    }
  }
  let onboardingStep=0;
  const oSteps=[{title:$t.notch_onboarding_1_title,desc:$t.notch_onboarding_1_desc},{title:$t.notch_onboarding_2_title,desc:$t.notch_onboarding_2_desc},{title:$t.notch_onboarding_3_title,desc:$t.notch_onboarding_3_desc}];
  function nextO(){if(onboardingStep<2)onboardingStep++;else{onboardingComplete.set(true);matchPhase.set("method-select");}}
  function selectMethod(m){
    resetMatching();
    matchMethod.set(m);
    matchPhase.set("ear-select");
  }
  function resetMatching(){session=null;currentFreqA=0;currentFreqB=0;matchingComplete=false;matchFreqResult=null;matchStep.set(0);matchEar.set("left");matchResults.set({left:null,right:null,confidence:0});matchConfidence.set(0);useNoise=false;}
  function goBack(){
    const m={
      "ear-select":"method-select",
      "manual-match":"ear-select",
      "matching":"ear-select",
      "verification":$matchMethod==="manual"?"manual-match":"matching",
      "complete":"verification",
      "result":"complete"
    };
    if(m[$matchPhase])matchPhase.set(m[$matchPhase]);
  }
  function selectEar(e){
    matchEar.set(e);
    if($matchMethod==="2afc"){
      session=createMatchingSession();
      matchStep.set(0);
      currentFreqA=0;
      currentFreqB=0;
      matchPhase.set("matching");
      nextPair();
    } else if($matchMethod==="manual") {
      matchPhase.set("manual-match");
    }
  }
  function nextPair(){
    const p=session.getNextFreqs();
    if(p){
      currentFreqA=p.freqA;
      currentFreqB=p.freqB;
      session.playPair(p.freqA,p.freqB,useNoise,$matchEar);
    } else finishMatching();
  }
  function playSingleTone(f){
    const c=getAudioContext();
    const o=c.createOscillator();
    o.type="sine";
    o.frequency.value=f;
    const g=c.createGain();
    const startTime=c.currentTime;
    const duration=1.5;
    g.gain.setValueAtTime(0,startTime);
    g.gain.linearRampToValueAtTime(0.3,startTime+0.1);
    g.gain.setValueAtTime(0.3,startTime+duration-0.1);
    g.gain.linearRampToValueAtTime(0,startTime+duration);
    o.connect(g);
    const ear=$matchEar;
    if(ear==="left"||ear==="right"){
      const panner=c.createStereoPanner();
      panner.pan.value=ear==="left"?-1:1;
      g.connect(panner);
      panner.connect(getMasterGain());
    }else{
      g.connect(getMasterGain());
    }
    o.start(startTime);
    o.stop(startTime+duration);
  }
  function chooseFreq(c){matchFreqResult=c;session.advance(c);matchStep.set(session.currentStep);matchConfidence.set(session.getConfidence());setTimeout(()=>nextPair(),500);}
  function finishMatching(){matchFreqResult=session.getResult();matchResults.set({left:matchFreqResult,right:null,confidence:session.getConfidence()});matchConfidence.set(session.getConfidence());notchParams.update(p=>{p.left.frequency=matchFreqResult;return p;});matchPhase.set("verification");}
  function playTestTone(f){
    const c=getAudioContext();
    if(manualOsc){
      try{manualOsc.frequency.setValueAtTime(f,c.currentTime);}catch(e){}
      return;
    }
    manualOsc=c.createOscillator();
    manualOsc.type="sine";
    manualOsc.frequency.value=f;
    manualGainNode=c.createGain();
    manualGainNode.gain.setValueAtTime(0,c.currentTime);
    manualGainNode.gain.linearRampToValueAtTime(0.3,c.currentTime+0.1);
    manualOsc.connect(manualGainNode);
    const ear=$matchEar;
    if(ear==="left"||ear==="right"){
      const panner=c.createStereoPanner();
      panner.pan.value=ear==="left"?-1:1;
      manualGainNode.connect(panner);
      panner.connect(getMasterGain());
    }else{
      manualGainNode.connect(getMasterGain());
    }
    manualOsc.start();
    manualPlaying=true;
  }
  function stopTestTone(){
    if(manualOsc){
      const osc=manualOsc;
      const gain=manualGainNode;
      const c=getAudioContext();
      try{
        gain.gain.setValueAtTime(gain.gain.value,c.currentTime);
        gain.gain.linearRampToValueAtTime(0,c.currentTime+0.15);
      }catch(e){}
      manualOsc=null;
      manualGainNode=null;
      manualPlaying=false;
      setTimeout(()=>{
        try{osc.stop();}catch(e){}
        try{osc.disconnect();}catch(e){}
        try{gain.disconnect();}catch(e){}
      },160);
    }
  }
  async function handleUpload(){const f=fileInputEl?.files?.[0];if(!f)return;uploadError="";try{await loadUploadedAudio(f);uploadedFileName.set(f.name);useUpload.set(true);}catch(e){uploadError=$t.notch_unsupported_format;useUpload.set(false);}}
  function clearUpload(){clearUploadedAudio();uploadedFileName.set("");useUpload.set(false);}
  async function toggleVoice(){if($useVoice){stopMic();useVoice.set(false);}else{micLoading=true;const ok=await startMic();useVoice.set(ok);if(!ok)uploadError=$t.notch_mic_denied;micLoading=false;}}
  function toggleManualFine(){if(!manualFineMode){manualFineCenter=manualFreq;manualFineMode=true;}else manualFineMode=false;}
  function confirmManual(){matchResults.set({left:manualFreq,right:null,confidence:3});matchConfidence.set(3);notchParams.update(p=>{p.left.frequency=manualFreq;return p;});stopTestTone();matchPhase.set("verification");}
  function verifyAccept(){matchPhase.set("complete");}function verifyRetune(){resetMatching();matchPhase.set("method-select");}
  function freqToLogPct(f, min = 125, max = 12000) {
    if (f < min) f = min;
    if (f > max) f = max;
    return (Math.log(f / min) / Math.log(max / min)) * 100;
  }
  function logPctToFreq(pct, min = 125, max = 12000) {
    return Math.round(min * Math.pow(max / min, pct / 100));
  }
  function handleDirectFreqInput() {
    if (manualFreq < 20) manualFreq = 20;
    if (manualFreq > 16000) manualFreq = 16000;
    if (manualPlaying) {
      playTestTone(manualFreq);
    } else {
      playSingleTone(manualFreq);
    }
  }

  function getBandLabel(f, lang) {
    if (lang === 'zh') {
      if (f < 250) return '低音 (Bass)';
      if (f < 500) return '中低音 (Low-Mid)';
      if (f < 2000) return '中音 (Mid)';
      if (f < 4000) return '中高音 (Mid-High)';
      if (f < 6000) return '存在感频段 (Presence)';
      return '极高音 (Brilliance)';
    } else {
      if (f < 250) return 'Bass';
      if (f < 500) return 'Low-Mid';
      if (f < 2000) return 'Mid';
      if (f < 4000) return 'Mid-High';
      if (f < 6000) return 'Presence';
      return 'Brilliance';
    }
  }

  $: sliderMin = manualFineMode ? Math.max(20, manualFineCenter - 100) : 125;
  $: sliderMax = manualFineMode ? Math.min(16000, manualFineCenter + 100) : 12000;
  $: sliderProgressPct = manualFineMode 
    ? Math.max(0, Math.min(100, ((manualFreq - sliderMin) / (sliderMax - sliderMin)) * 100))
    : freqToLogPct(manualFreq, 125, 12000);

  function adjustFreq(amount) {
    manualFreq = Math.max(20, Math.min(16000, manualFreq + amount));
    if (manualPlaying) {
      playTestTone(manualFreq);
    }
  }

  function getCarrierIcon(c) {
    const map = {
      white: '🌀',
      pink: '🌸',
      brown: '🟤',
      rain: '🌧️',
      waves: '🌊',
      wind: '🍃',
      stream: '💧'
    };
    return map[c] || '🎵';
  }

  function getCarrierName(c, translations) {
    const map = {
      white: translations.notch_white_noise,
      pink: translations.notch_pink_noise,
      brown: translations.notch_brown_noise,
      rain: translations.notch_rain,
      waves: translations.notch_waves,
      wind: translations.notch_wind,
      stream: translations.notch_stream
    };
    return map[c] || c;
  }

  function getConfidenceLabel(c, lang) {
    if (lang === 'zh') {
      if (c >= 5) return '极高';
      if (c === 4) return '高';
      if (c === 3) return '中等';
      return '偏低';
    } else {
      if (c >= 5) return 'Excellent';
      if (c === 4) return 'High';
      if (c === 3) return 'Good';
      return 'Fair';
    }
  }

  $: paused = $sessionActive && !$isPlaying;
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
    if ($isPlaying) {
      resumeAudio();
      startTimer();
      startSpectrum();
    } else {
      suspendAudio();
      stopTimer();
      stopSpectrum();
    }
  }
  function startSession(){
    const f=$notchParams.left.frequency||4000;
    startTherapy(f,$notchParams.left.bandwidth,$notchParams.left.depth,selectedCarrier,{useVoice:$useVoice,useUpload:$useUpload});
    sessionElapsed=0;
    sessionTimer.set(0);
    sessionActive.set(true);
    isPlaying.set(true);
  }
  function stopSession(b){stopSpectrum();stopTherapy();sessionActive.set(false);isPlaying.set(false);remainingTime.set(0);audioProgress.set(0);stopTimer();matchPhase.set("result");}
  function emergencyStop(){stopSpectrum();stopTherapy();sessionActive.set(false);isPlaying.set(false);remainingTime.set(0);audioProgress.set(0);stopTimer();therapyView.set("match");}
  function togglePause(){isPlaying.update(v=>!v);}
  
  let isDrawing = false;
  async function startSpectrum(){
    stopSpectrum();
    isDrawing = true;
    await tick();
    if (!isDrawing) return;
    const c=document.getElementById("spectrum-canvas");
    if(!c)return;
    const c2d=c.getContext("2d");
    const a=getAnalyserNode();
    if(!a)return;
    const bl=a.frequencyBinCount;
    const d=new Uint8Array(bl);
    const w=c.width,h=c.height;
    const sr=getAudioContext().sampleRate;
    
    // Logarithmic scale parameters
    const minFreq = 80;
    const maxFreq = 16000;
    const logMin = Math.log(minFreq);
    const logMax = Math.log(maxFreq);
    
    function draw(){
      if(!isDrawing)return;
      spectrumAnimFrame=requestAnimationFrame(draw);
      a.getByteFrequencyData(d);
      c2d.clearRect(0,0,w,h);
      
      // 1. Draw notch band highlight (background layer)
      if ($notchParams.left.frequency) {
        const fc = $notchParams.left.frequency;
        const bwId = $notchParams.left.bandwidth || "medium";
        const octaves = bwId === "narrow" ? 0.3333 : bwId === "wide" ? 1.0 : 0.5;
        const f1 = fc * Math.pow(2, -octaves / 2);
        const f2 = fc * Math.pow(2, octaves / 2);
        
        let x1 = 0;
        if (f1 > minFreq) {
          x1 = ((Math.log(f1) - logMin) / (logMax - logMin)) * w;
        }
        let x2 = w;
        if (f2 < maxFreq) {
          x2 = ((Math.log(f2) - logMin) / (logMax - logMin)) * w;
        }
        x1 = Math.max(0, Math.min(w, x1));
        x2 = Math.max(0, Math.min(w, x2));
        
        // Draw soft highlighting band
        c2d.fillStyle = "rgba(108, 92, 231, 0.08)";
        c2d.fillRect(x1, 0, x2 - x1, h);
        
        // Draw dashed borders for filter limits
        c2d.strokeStyle = "rgba(108, 92, 231, 0.22)";
        c2d.lineWidth = 1;
        c2d.setLineDash([4, 4]);
        c2d.beginPath();
        c2d.moveTo(x1, 0); c2d.lineTo(x1, h);
        c2d.moveTo(x2, 0); c2d.lineTo(x2, h);
        c2d.stroke();
        c2d.setLineDash([]); // reset dash
      }
      
      // 2. Draw spectrum curve (foreground layer)
      c2d.beginPath();
      let first = true;
      for (let x = 0; x <= w; x += 2) {
        const pct = x / w;
        const f = Math.exp(logMin + pct * (logMax - logMin));
        const binIndex = (f / (sr / 2)) * bl;
        
        const indexFloor = Math.floor(binIndex);
        const indexCeil = Math.min(bl - 1, indexFloor + 1);
        const weight = binIndex - indexFloor;
        let val = 0;
        if (indexFloor < bl) {
          val = d[indexFloor] * (1 - weight) + d[indexCeil] * weight;
        }
        
        const bh = (val / 255) * h * 0.78;
        if (first) {
          c2d.moveTo(x, h - bh);
          first = false;
        } else {
          c2d.lineTo(x, h - bh);
        }
      }
      
      // Store current path, draw stroke
      c2d.strokeStyle = "rgba(162, 155, 254, 0.85)";
      c2d.lineWidth = 2.5;
      c2d.stroke();
      
      // Close path to draw gradient fill
      c2d.lineTo(w, h);
      c2d.lineTo(0, h);
      c2d.closePath();
      
      const grad = c2d.createLinearGradient(0, 0, 0, h);
      const isLightMode = document.body.classList.contains("light-mode");
      if (isLightMode) {
        grad.addColorStop(0, "rgba(108, 92, 231, 0.35)");
        grad.addColorStop(1, "rgba(116, 185, 255, 0.02)");
      } else {
        grad.addColorStop(0, "rgba(108, 92, 231, 0.55)");
        grad.addColorStop(1, "rgba(116, 185, 255, 0.03)");
      }
      c2d.fillStyle = grad;
      c2d.fill();
      
      // 3. Draw center frequency indicator line and label
      if ($notchParams.left.frequency) {
        const fc = $notchParams.left.frequency;
        let xc = 0;
        if (fc >= minFreq && fc <= maxFreq) {
          xc = ((Math.log(fc) - logMin) / (logMax - logMin)) * w;
        } else if (fc < minFreq) {
          xc = 0;
        } else {
          xc = w;
        }
        xc = Math.max(0, Math.min(w, xc));
        
        c2d.strokeStyle = "rgba(41, 151, 255, 0.8)";
        c2d.lineWidth = 1.5;
        c2d.beginPath();
        c2d.moveTo(xc, 0);
        c2d.lineTo(xc, h);
        c2d.stroke();
        
        c2d.fillStyle = "rgba(41, 151, 255, 0.9)";
        c2d.font = "11px Inter, sans-serif";
        c2d.fillText(Math.round(fc) + " Hz", xc + 6, 16);
      }
    }
    spectrumAnimFrame=requestAnimationFrame(draw);
  }
  function stopSpectrum(){
    isDrawing = false;
    if(spectrumAnimFrame){
      cancelAnimationFrame(spectrumAnimFrame);
      spectrumAnimFrame=null;
    }
  }
  function submitRating(){const r={date:new Date().toISOString().split("T")[0],time:new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}),mode:"therapy",duration_min:Math.round(sessionElapsed/60),frequency:$notchParams.left.frequency,bandwidth:$notchParams.left.bandwidth,depth:$notchParams.left.depth,feeling:$postFeeling,severity_before:$postSeverity,note:$postNote||""};records.update(rs=>[...rs,r]);postFeeling.set(null);postSeverity.set(5);postNote.set("");therapyView.set("match");matchPhase.set("method-select");}
  import { onDestroy } from "svelte";onDestroy(()=>{stopSpectrum();stopTimer();stopTestTone();stopTherapy();});
</script>
<div class="nt-view">{#if !$onboardingComplete}<div class="view-panel fade-in"><h2 class="title">{oSteps[onboardingStep].title}</h2><p class="desc">{oSteps[onboardingStep].desc}</p><div class="onboarding-nav"><div class="dots">{#each oSteps as _,i}<span class="dot" class:active={i===onboardingStep}></span>{/each}</div><button class="glass-btn-primary" onclick={nextO}>{onboardingStep<2?$t.notch_next:$t.notch_start_matching}</button></div></div>
{:else if !dailyCheckDone}<div class="daily-check fade-in"><h2 class="title">{$t.notch_tinnitus_today}</h2><div class="daily-options"><button class="glass-btn-primary" onclick={()=>answerDaily("yes")}>{$t.notch_yes}</button><button class="glass-btn-secondary" onclick={()=>answerDaily("mild")}>{$t.notch_mild}</button><button class="glass-btn-secondary" onclick={()=>answerDaily("no")}>{$t.notch_no}</button></div></div>
{:else if $matchPhase==="method-select"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_select_method}</h2><p class="desc">{$t.notch_method_desc}</p><div class="method-grid"><button class="method-card" onclick={()=>selectMethod("2afc")}><div class="method-name">{$t.notch_adaptive}</div><div class="method-desc">{$t.notch_adaptive_desc}</div></button><button class="method-card" onclick={()=>selectMethod("manual")}><div class="method-name">{$t.notch_manual}</div><div class="method-desc">{$t.notch_manual_desc}</div></button></div></div>
  {:else if $matchPhase==="ear-select"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_select_ear}</h2><p class="desc">{$t.notch_ear_desc}</p><div class="ear-grid">{#each ["left","right","both"] as ear}<button class="ear-card" onclick={()=>selectEar(ear)}><div class="ear-name">{ear==="left"?$t.notch_left:ear==="right"?$t.notch_right:$t.notch_both}</div></button>{/each}</div><button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button></div>
{:else if $matchPhase==="matching"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_freq_matching}</h2><div class="progress-info"><span class="text-body">{$t.notch_round} {$matchStep}/{$matchTotalSteps}<span class="phase-badge">{session?.phase==="coarse"?$t.notch_coarse:$t.notch_fine}</span></span><div class="progress-bar-compact"><div class="progress-fill-compact" style="width:{Math.min($matchStep/$matchTotalSteps*100,100)}%"></div></div></div><p class="desc">{$t.notch_which_sound}</p><div class="afc-grid"><button class="afc-btn" onclick={()=>chooseFreq(currentFreqA)}><span class="afc-label">{$t.notch_sound_a}</span><span class="afc-freq">{Math.round(currentFreqA)} Hz</span></button><button class="afc-btn" onclick={()=>chooseFreq(currentFreqB)}><span class="afc-label">{$t.notch_sound_b}</span><span class="afc-freq">{Math.round(currentFreqB)} Hz</span></button></div><div class="replay-row"><button class="btn-secondary replay-btn" onclick={()=>playSingleTone(currentFreqA)}>{$t.notch_sound_a}</button><button class="btn-secondary replay-btn" onclick={()=>playSingleTone(currentFreqB)}>{$t.notch_sound_b}</button></div><div class="matching-tools"><button class="glass-chip" class:selected={useNoise} onclick={()=>useNoise=!useNoise}>{useNoise?$t.notch_narrowband:$t.notch_pure_tone}</button></div><button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button></div>
  {:else if $matchPhase==="manual-match"}
  <div class="view-panel fade-in">
    <h2 class="title">{$t.notch_manual_title}</h2>
    <p class="desc">{manualFineMode ? $t.notch_manual_desc_fine : $t.notch_manual_desc_coarse}</p>
    
    <div class="manual-controls">
      <!-- Frequency Card Dashboard -->
      <div class="freq-card">
        <button class="freq-step-btn" onclick={() => adjustFreq(manualFineMode ? -1 : -50)} aria-label="Decrease frequency">-</button>
        <div class="freq-card-info">
          <div class="freq-card-value-wrapper">
            <input 
              type="number" 
              min="20" 
              max="16000" 
              bind:value={manualFreq} 
              class="freq-card-input" 
              onchange={handleDirectFreqInput} 
            />
            <span class="freq-card-unit">Hz</span>
          </div>
          <div class="freq-card-band">{getBandLabel(manualFreq, $locale)}</div>
        </div>
        <button class="freq-step-btn" onclick={() => adjustFreq(manualFineMode ? 1 : 50)} aria-label="Increase frequency">+</button>
      </div>

      <!-- Glowing Slider with Ticks -->
      <div class="slider-with-ticks">
        <div class="slider-container">
          <div class="slider-track-bg"></div>
          <div class="slider-progress-fill" style="width: {sliderProgressPct}%"></div>
          {#if manualFineMode}
            <input 
              type="range" 
              min={sliderMin} 
              max={sliderMax} 
              step="1" 
              bind:value={manualFreq} 
              class="manual-freq-slider" 
              oninput={() => { if (manualPlaying) playTestTone(manualFreq); }} 
              onmousedown={() => playTestTone(manualFreq)} 
              onmouseup={stopTestTone} 
            />
          {:else}
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="0.01" 
              value={freqToLogPct(manualFreq, 125, 12000)} 
              class="manual-freq-slider" 
              oninput={(e) => { 
                manualFreq = logPctToFreq(parseFloat(e.target.value), 125, 12000); 
                if (manualPlaying) playTestTone(manualFreq); 
              }} 
              onmousedown={() => playTestTone(manualFreq)} 
              onmouseup={stopTestTone} 
            />
          {/if}
        </div>

        <div class="tick-marks">
          {#if manualFineMode}
            {#each Array(21) as _, i}
              {@const thz = manualFineCenter - 100 + i * 10}
              {#if thz >= 20 && thz <= 16000}
                {@const fl = manualFineCenter - 100}
                {@const fh = manualFineCenter + 100}
                {@const pct = ((thz - fl) / (fh - fl)) * 100}
                {@const isMajor = i % 5 === 0}
                <span class="tick" class:major={isMajor} style="left: {pct}%">
                  <span class="tick-line"></span>
                  {#if isMajor}
                    <span class="tick-label">{thz}</span>
                  {/if}
                </span>
              {/if}
            {/each}
          {:else}
            {#each [125, 250, 500, 1000, 2000, 4000, 6000, 8000, 12000] as thz}
              {@const pct = freqToLogPct(thz, 125, 12000)}
              {@const hasLabel = thz !== 250 && thz !== 500}
              {@const labelText = thz >= 1000 ? (thz / 1000) + 'k' : thz}
              <span class="tick" class:major={hasLabel} style="left: {pct}%">
                <span class="tick-line"></span>
                {#if hasLabel}
                  <span class="tick-label">{labelText}</span>
                {/if}
              </span>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Manual Match Actions -->
      <div class="manual-actions">
        <button class="glass-btn-primary" onclick={confirmManual}>{$t.notch_confirm}</button>
        <button class="glass-btn-secondary" onclick={() => playTestTone(manualFreq)}>{$t.notch_preview}</button>
        <button class="glass-btn-secondary" onclick={stopTestTone}>{$t.notch_stop}</button>
        <button class="glass-btn-secondary" onclick={toggleManualFine}>
          {manualFineMode ? $t.notch_back_coarse : $t.notch_fine_tune}
        </button>
      </div>
    </div>
    <button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button>
  </div>
{:else if $matchPhase==="verification"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_verify_title}</h2><p class="desc">{$t.notch_verify_desc} <strong>{Math.round($notchParams.left.frequency)} Hz</strong></p><div class="verification-actions"><button class="glass-btn-primary" onclick={verifyAccept}>{$t.notch_confirm_start}</button><button class="glass-btn-secondary" onclick={()=>playTestTone($notchParams.left.frequency)}>{$t.notch_preview}</button><button class="glass-btn-secondary" onclick={verifyRetune}>{$t.notch_rematch}</button></div><button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button></div>
  {:else if $matchPhase==="complete"}
  <div class="view-panel fade-in">
    <h2 class="title">{$t.notch_complete_title}</h2>
    
    <div class="match-dashboard glass">
      <div class="dash-item">
        <span class="dash-label">{$t.notch_frequency}</span>
        <span class="dash-value">{Math.round($notchParams.left.frequency)} <span class="dash-unit">Hz</span></span>
      </div>
      <div class="dash-divider"></div>
      <div class="dash-item">
        <span class="dash-label">{$t.notch_confidence}</span>
        <div class="dash-confidence">
          <div class="confidence-dots">{#each Array(5) as _,i}<span class="conf-dot" class:filled={i<$matchConfidence}></span>{/each}</div>
          <span class="confidence-text">{getConfidenceLabel($matchConfidence, $locale)}</span>
        </div>
      </div>
    </div>
    
    <div class="session-controls">
      <!-- Card 1: Sound Sources -->
      <div class="settings-card glass">
        <h3 class="card-section-title">{$t.notch_audio_sources}</h3>
        
        <!-- Carrier Selection -->
        <div class="carrier-section">
          <button 
            type="button"
            class="none-carrier-btn" 
            class:active={selectedCarrier === 'none'} 
            onclick={() => selectedCarrier = 'none'}
          >
            <span class="none-icon">🔇</span>
            <div class="none-details">
              <span class="none-title">{$t.notch_no_carrier_title}</span>
              <span class="none-subtitle">{$t.notch_no_carrier_desc}</span>
            </div>
          </button>
          
          <div class="carrier-divider">
            <span>{$t.notch_or_choose_noise}</span>
          </div>
          
          <div class="noises-grid">
            {#each ["white","pink","brown","rain","waves","wind","stream"] as c}
              <button 
                type="button"
                class="noise-card" 
                class:selected={selectedCarrier === c} 
                onclick={() => selectedCarrier = c}
              >
                <span class="noise-icon">{getCarrierIcon(c)}</span>
                <span class="noise-name">{getCarrierName(c, $t)}</span>
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Auxiliary Inputs Grid -->
        <div class="aux-grid">
          <!-- Upload block -->
          <div class="aux-card">
            <span class="aux-label">{$t.notch_upload_audio}</span>
            <div class="aux-actions">
              <input type="file" accept="audio/*" bind:this={fileInputEl} onchange={handleUpload} style="display:none" />
              <button type="button" class="glass-btn-secondary" onclick={()=>fileInputEl?.click()} style="padding: 8px 16px; font-size: 13px; width: 100%; border-radius: 10px;">
                {$useUpload ? $t.notch_uploaded : $t.notch_select_file}
              </button>
              {#if $useUpload}
                <button type="button" class="glass-btn-secondary" onclick={clearUpload} style="padding: 8px 12px; font-size: 13px; border-radius: 10px;">
                  {$t.notch_clear}
                </button>
              {/if}
            </div>
            {#if $useUpload}
              <span class="aux-filename" title={$uploadedFileName}>{$uploadedFileName}</span>
            {/if}
            {#if uploadError}
              <span class="aux-error">{uploadError}</span>
            {/if}
          </div>

          <!-- Mic block -->
          <div class="aux-card">
            <span class="aux-label">{$t.notch_mic}</span>
            <button 
              type="button"
              class="glass-btn-secondary" 
              class:active={$useVoice}
              onclick={toggleVoice} 
              disabled={micLoading}
              style="padding: 8px 16px; font-size: 13px; width: 100%; border-radius: 10px;"
            >
              {micLoading ? $t.notch_requesting : $useVoice ? $t.notch_mic_on : $t.notch_enable_mic}
            </button>
          </div>
        </div>
      </div>

      <!-- Card 2: Therapy Parameters -->
      <div class="settings-card glass">
        <h3 class="card-section-title">{$t.notch_therapy_params}</h3>
        
        <!-- Bandwidth Selection -->
        <div class="param-row">
          <div class="param-row-header">
            <span class="param-title">{$t.notch_bandwidth}</span>
          </div>
          <div class="param-options">
            {#each bandwidths as bw}
              <button 
                type="button"
                class="glass-chip" 
                class:selected={$notchParams.left.bandwidth === bw.id} 
                onclick={() => notchParams.update(p => { p.left.bandwidth = bw.id; return p; })}
              >
                {bw.label}
              </button>
            {/each}
          </div>
          <div class="param-hint-box">
            {#if $notchParams.left.bandwidth === "narrow"}{$t.notch_bandwidth_narrow_hint}
            {:else if $notchParams.left.bandwidth === "medium"}{$t.notch_bandwidth_medium_hint}
            {:else if $notchParams.left.bandwidth === "wide"}{$t.notch_bandwidth_wide_hint}
            {/if}
          </div>
        </div>

        <!-- Depth Selection -->
        <div class="param-row">
          <div class="param-row-header">
            <span class="param-title">{$t.notch_depth}</span>
          </div>
          <div class="param-options">
            {#each depths as d}
              <button 
                type="button"
                class="glass-chip" 
                class:selected={$notchParams.left.depth === d.id} 
                onclick={() => notchParams.update(p => { p.left.depth = d.id; return p; })}
              >
                {d.label}
              </button>
            {/each}
          </div>
          <div class="param-hint-box">
            {#if $notchParams.left.depth === -20}{$t.notch_depth_20_hint}
            {:else if $notchParams.left.depth === -12}{$t.notch_depth_12_hint}
            {:else if $notchParams.left.depth === -6}{$t.notch_depth_6_hint}
            {:else if $notchParams.left.depth === -3}{$t.notch_depth_3_hint}
            {/if}
          </div>
        </div>

        <!-- Duration Selection -->
        <div class="param-row">
          <div class="param-row-header">
            <span class="param-title">{$t.notch_duration}</span>
          </div>
          <div class="param-options">
            {#each [15,30,45,60] as dur}
              <button 
                type="button"
                class="glass-chip" 
                class:selected={$sessionDuration === dur} 
                onclick={() => sessionDuration.set(dur)}
              >
                {dur} {$t.notch_min}
              </button>
            {/each}
          </div>
        </div>
      </div>
      
      <!-- Action buttons -->
      <div class="therapy-actions" style="display:flex; flex-direction:column; gap:12px; width:100%; align-items:center; margin-top:8px;">
        <button class="glass-btn-hero start-btn" onclick={startSession} style="width:100%; max-width:320px;">{$t.notch_start_therapy}</button>
        <button class="glass-btn-secondary" onclick={()=>therapyView.set("match")} style="width:100%; max-width:320px; border-radius: var(--glass-radius-sm);">{$t.notch_skip_today}</button>
      </div>
    </div>
    <button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button>
  </div>
  {:else if $matchPhase==="result"}<div class="view-panel fade-in"><h2 class="title">{$t.notch_session_complete}</h2><p class="desc">{$t.notch_how_feel}</p><div class="feeling-grid">{#each [{id:"better",label:$t.notch_better},{id:"unchanged",label:$t.notch_no_change},{id:"worse",label:$t.notch_worse}] as f}<button class="feeling-btn" class:selected={$postFeeling===f.id} onclick={()=>postFeeling.set(f.id)}>{f.label}</button>{/each}</div><div class="severity-slider"><label class="text-caption-strong" for="notch-severity">{$t.notch_current_level}</label><div class="slider-row"><span class="text-fine">0 {$t.notch_quiet}</span><input type="range" id="notch-severity" min="0" max="10" step="1" bind:value={$postSeverity} class="freq-slider" /><span class="text-fine">10 {$t.notch_loud}</span></div><span class="text-display-md severity-value">{$postSeverity}</span></div><div class="note-section"><label class="text-caption-strong" for="notch-notes">{$t.notch_notes}</label><textarea id="notch-notes" bind:value={$postNote} class="note-input" placeholder={$t.notch_notes_placeholder} rows="3"></textarea></div><button class="glass-btn-hero start-btn" onclick={submitRating} disabled={!$postFeeling}>{$t.notch_save_record}</button><button class="glass-btn-secondary" onclick={()=>matchPhase.set("method-select")}>{$t.notch_repeat}</button><button class="back-step" onclick={goBack}>&larr; {$t.notch_back}</button><div class="privacy-note text-fine">{$t.notch_privacy}</div></div>
{/if}</div>
{#if $isPlaying || paused}
<div class="session-overlay" class:micromode={$isMicromode} class:paused-state={paused}>

  <!-- Top controls row -->
  <div class="overlay-controls">
    <button class="overlay-btn" class:btn-resume={paused} onclick={togglePause}>
      {#if paused}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        {$t.notch_resume}
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        {$t.notch_pause}
      {/if}
    </button>
    <button class="overlay-btn btn-stop" onclick={emergencyStop}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
      {$t.notch_stop_esc}
    </button>
  </div>

  <!-- Timer display -->
  <div class="session-info">
    <span class="session-status">{paused ? '⏸ '+$t.notch_pause : $t.notch_in_session}</span>
    <span class="session-timer">{Math.floor(sessionElapsed/60)}:{String(sessionElapsed%60).padStart(2,"0")}</span>
    <span class="session-remaining">{Math.max(0,Math.floor(($sessionDuration*60-sessionElapsed)/60))}:{String(Math.max(0,($sessionDuration*60-sessionElapsed)%60)).padStart(2,"0")} left</span>
  </div>

  <!-- Session parameter pills -->
  <div class="session-params">
    <div class="param-pill">
      <span class="param-pill-label">{$t.notch_frequency}</span>
      <span class="param-pill-value">{Math.round($notchParams.left.frequency)} Hz</span>
    </div>
    <div class="param-pill">
      <span class="param-pill-label">{$t.notch_bandwidth}</span>
      <span class="param-pill-value">{$notchParams.left.bandwidth === 'narrow' ? '1/3 oct' : $notchParams.left.bandwidth === 'medium' ? '1/2 oct' : '1 oct'}</span>
    </div>
    <div class="param-pill">
      <span class="param-pill-label">{$t.notch_depth}</span>
      <span class="param-pill-value">{$notchParams.left.depth} dB</span>
    </div>
  </div>

  <!-- Real-time spectrum -->
  <div class="spectrum-container">
    <div class="spectrum-header">
      <span class="spectrum-label">{$t.notch_real_time_spec}</span>
      <span class="spectrum-hint">{$t.notch_notch_hint}</span>
    </div>
    <canvas id="spectrum-canvas" width="480" height="140"></canvas>
  </div>

</div>
{/if}
<style>
.nt-view{flex:1;overflow-y:auto;padding:var(--space-section)var(--space-lg);display:flex;flex-direction:column;align-items:center;scrollbar-width:thin;}
.view-panel{max-width:600px;width:100%;display:flex;flex-direction:column;gap:var(--space-lg);align-items:center;text-align:center;}
.title{font-size:clamp(28px,4vw,34px);font-weight:700;line-height:1.1;letter-spacing:-.02em;color:var(--text-primary);margin-bottom:var(--space-xs);}
.desc{font-size:17px;font-weight:400;line-height:1.5;color:var(--text-secondary);max-width:480px;}
.method-card,.ear-card{flex:1;background:var(--glass-bg-medium);backdrop-filter:blur(var(--glass-blur)) saturate(1.8);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.8);border:1px solid var(--glass-border);border-radius:var(--glass-radius);padding:var(--space-lg);display:flex;flex-direction:column;align-items:center;gap:var(--space-sm);cursor:pointer;transition:border-color 0.2s var(--spring-smooth),background 0.15s,transform 0.18s var(--spring-bounce),box-shadow 0.2s;text-align:center;box-shadow:var(--glass-shadow);will-change:transform;}
.method-card:hover,.ear-card:hover{background:var(--glass-bg-heavy);border-color:rgba(108,92,231,0.4);transform:translateY(-2px);box-shadow:var(--glass-shadow-lg);}
.method-card:active,.ear-card:active{transform:scale(0.97) !important;transition-duration:80ms !important;}
.method-name,.ear-name{font-size:17px;font-weight:600;color:var(--text-primary);}
.method-desc{font-size:14px;font-weight:400;color:var(--text-tertiary);line-height:1.4;}
.afc-btn{flex:1;background:var(--glass-bg-medium);backdrop-filter:blur(var(--glass-blur)) saturate(1.8);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.8);border:2px solid var(--glass-border);border-radius:var(--glass-radius);padding:var(--space-xl);display:flex;flex-direction:column;align-items:center;gap:var(--space-sm);cursor:pointer;transition:border-color 0.2s var(--spring-smooth),background 0.15s,transform 0.18s var(--spring-bounce),box-shadow 0.2s;box-shadow:var(--glass-shadow);will-change:transform;}
.afc-btn:hover{background:var(--glass-bg-heavy);border-color:rgba(108,92,231,0.6);transform:translateY(-2px);box-shadow:var(--glass-shadow-lg);}
.afc-btn:active{transform:scale(0.96) !important;transition-duration:80ms !important;}
.afc-label{font-size:14px;font-weight:600;color:var(--text-secondary);letter-spacing:-.224px;}
.afc-freq{font-size:24px;font-weight:600;color:var(--text-primary);}
.feeling-btn{flex:1;padding:var(--space-lg);background:var(--glass-bg-medium);backdrop-filter:blur(var(--glass-blur-mobile)) saturate(1.8);-webkit-backdrop-filter:blur(var(--glass-blur-mobile)) saturate(1.8);border:2px solid var(--glass-border);border-radius:var(--glass-radius);display:flex;flex-direction:column;align-items:center;gap:var(--space-xs);cursor:pointer;transition:border-color 0.2s var(--spring-smooth),background 0.15s,transform 0.18s var(--spring-bounce),box-shadow 0.2s;font-size:14px;font-weight:500;color:var(--text-primary);will-change:transform;}
.feeling-btn:hover{border-color:rgba(108,92,231,0.5);background:var(--glass-bg-heavy);transform:translateY(-1px);}
.feeling-btn.selected{border-color:rgba(108,92,231,0.8);background:rgba(108,92,231,0.18);box-shadow:0 0 16px rgba(108,92,231,0.25);transform:translateY(-1px);}
.feeling-btn:active{transform:scale(0.96) !important;transition-duration:80ms !important;}
.progress-info{width:100%;display:flex;flex-direction:column;gap:var(--space-xs);}
.phase-badge{display:inline-block;font-size:12px;font-weight:600;color:#a29bfe;background:rgba(108,92,231,.2);border-radius:9999px;padding:2px 10px;margin-left:8px;}
.method-grid,.ear-grid{display:flex;gap:var(--space-md);width:100%;}
.afc-grid{display:flex;gap:var(--space-lg);width:100%;max-width:400px;}
.replay-row,.matching-tools{display:flex;gap:var(--space-sm);}
.freq-slider{width:100%;max-width:400px;height:6px;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,0.15);border-radius:3px;outline:none;}
.freq-slider::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:var(--accent-blue-purple);cursor:pointer;border:3px solid var(--glass-bg-heavy);box-shadow:0 1px 4px rgba(0,0,0,.3);}
.manual-controls{width:100%;display:flex;flex-direction:column;align-items:center;gap:var(--space-lg);padding:var(--space-lg)0;}
.slider-with-ticks{width:100%;max-width:400px;display:flex;flex-direction:column;gap:4px;}
.tick-marks{position:relative;width:100%;height:28px;margin-top:2px;}
.tick{position:absolute;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;}
.tick-line{width:1px;height:6px;background:rgba(255,255,255,0.2);transition:background 0.2s;}
.tick-label{font-size:9px;color:var(--text-tertiary);white-space:nowrap;transition:color 0.2s;}
.match-report{display:flex;gap:var(--space-xl);align-items:flex-start;}
.conf-dot{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.15);transition:background .2s;}
.conf-dot.filled{background:var(--accent-blue-purple);}
.daily-check{text-align:center;display:flex;flex-direction:column;gap:var(--space-lg);align-items:center;padding-top:var(--space-section);}
.daily-options{display:flex;gap:var(--space-md);}
.chip-group{display:flex;gap:var(--space-xs);flex-wrap:wrap;justify-content:center;}
.control-row{display:flex;flex-direction:column;gap:var(--space-xs);align-items:center;}
.progress-bar-compact{height:4px;background:rgba(255,255,255,0.12);border-radius:2px;overflow:hidden;}
.progress-fill-compact{height:100%;background:var(--accent-blue-purple);border-radius:2px;transition:width .4s var(--ease-out-expo);}
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
.spectrum-container{width:100%;max-width:520px;display:flex;flex-direction:column;gap:6px;align-items:center;}
.spectrum-header{width:100%;display:flex;justify-content:space-between;align-items:center;padding:0 4px;}
.spectrum-label{font-size:12px;font-weight:600;color:var(--text-secondary);letter-spacing:1px;text-transform:uppercase;}
.spectrum-hint{font-size:11px;color:var(--text-secondary);}
#spectrum-canvas{width:100%;height:auto;border-radius:12px;background:rgba(0,0,0,.3);}
.back-step{font-size:14px;font-weight:500;color:var(--text-secondary);background:none;border:none;cursor:pointer;padding:4px 0;margin-top:4px;transition:color .15s;}
.back-step:hover{color:var(--text-primary);}
.privacy-note{color:var(--text-tertiary);text-align:center;margin-top:var(--space-md);}
.manual-actions,.verification-actions{display:flex;gap:var(--space-sm);flex-wrap:wrap;justify-content:center;}
.session-controls{width:100%;display:flex;flex-direction:column;gap:var(--space-md);align-items:center;}
.feeling-grid{display:flex;gap:var(--space-md);}

/* Premium Frequency Dashboard Card */
.freq-card {
  width: 100%;
  max-width: 400px;
  background: var(--glass-bg-medium);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--glass-shadow);
  margin-bottom: var(--space-md);
  box-sizing: border-box;
}
.freq-step-btn {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
  border-radius: 50%;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.18s var(--spring-bounce), border-color 0.15s;
  will-change: transform;
  user-select: none;
  -webkit-user-select: none;
}
.freq-step-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.22);
}
.freq-step-btn:active {
  transform: scale(0.88) !important;
  transition-duration: 60ms !important;
  background: rgba(255, 255, 255, 0.2);
}
.freq-card-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.freq-card-value-wrapper {
  display: flex;
  align-items: baseline;
  justify-content: center;
}
.freq-card-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  width: 130px;
  font-family: inherit;
  outline: none;
  -moz-appearance: textfield;
}
.freq-card-input::-webkit-outer-spin-button,
.freq-card-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.freq-card-unit {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 2px;
}
.freq-card-band {
  font-size: 11px;
  font-weight: 600;
  color: #a29bfe;
  background: rgba(108, 92, 231, 0.15);
  padding: 2px 10px;
  border-radius: 12px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* Premium Slider styling */
.slider-container {
  position: relative;
  width: 100%;
  height: 24px;
  display: flex;
  align-items: center;
}
.slider-track-bg {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  pointer-events: none;
}
.slider-progress-fill {
  position: absolute;
  left: 0;
  height: 6px;
  background: linear-gradient(90deg, #6c5ce7, #a29bfe);
  border-radius: 3px;
  pointer-events: none;
  box-shadow: 0 0 10px rgba(108, 92, 231, 0.4);
}
.manual-freq-slider {
  position: absolute;
  width: 100%;
  height: 24px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  outline: none;
  margin: 0;
}
.manual-freq-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #6c5ce7;
  box-shadow: 0 0 12px rgba(108, 92, 231, 0.9), 0 2px 6px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition: transform 0.15s var(--spring-bounce), box-shadow 0.15s;
}
.manual-freq-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 18px rgba(108, 92, 231, 1), 0 3px 8px rgba(0, 0, 0, 0.4);
}
.manual-freq-slider:active::-webkit-slider-thumb {
  transform: scale(1.2);
}
.tick.major .tick-line {
  height: 10px;
  background: rgba(255, 255, 255, 0.4);
}
.tick.major .tick-label {
  color: var(--text-secondary);
  font-weight: 500;
}

/* Contextual param hint text */
.param-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 8px 12px;
  max-width: 420px;
  text-align: left;
  margin-top: 4px;
  transition: opacity 0.2s;
}

/* Redesigned session overlay */
.session-overlay {
  position: fixed;
  bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 8px);
  left: 10px;
  right: 10px;
  top: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  z-index: 20;
  background: rgba(4, 4, 20, 0.82);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px 16px 16px;
  animation: overlayIn 0.38s var(--ease-out-expo) both;
  will-change: transform, opacity;
  transition: background 0.4s var(--ease-in-out-quart), border-color 0.4s var(--ease-in-out-quart);
}
.session-overlay.paused-state {
  background: rgba(20, 10, 40, 0.88);
  border-color: rgba(162, 155, 254, 0.25);
}
.overlay-controls {
  display: flex;
  gap: 10px;
}
.overlay-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.18s var(--spring-bounce);
  will-change: transform;
}
.overlay-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  transform: translateY(-1px);
}
.overlay-btn:active {
  transform: scale(0.93) !important;
  transition-duration: 80ms !important;
}
.overlay-btn.btn-resume {
  background: rgba(108, 92, 231, 0.35);
  border-color: rgba(162, 155, 254, 0.5);
  color: #a29bfe;
}
.overlay-btn.btn-resume:hover {
  background: rgba(108, 92, 231, 0.55);
  color: #fff;
}
.overlay-btn.btn-stop {
  border-color: rgba(255, 80, 80, 0.3);
  color: rgba(255, 140, 140, 0.85);
}
.overlay-btn.btn-stop:hover {
  background: rgba(255, 60, 60, 0.2);
  color: #ff8a8a;
}
.session-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.session-status {
  font-size: 11px;
  font-weight: 600;
  color: #a29bfe;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.session-timer {
  font-size: 52px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -2px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  transition: color 0.3s var(--ease-out-expo);
}
.session-remaining {
  font-size: 12px;
  color: var(--text-tertiary);
  letter-spacing: 0.3px;
}
.session-params {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.param-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 6px 14px;
}
.param-pill-label {
  font-size: 9px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.param-pill-value {
  font-size: 13px;
  font-weight: 700;
  color: #a29bfe;
}

  /* Premium Complete Configuration Styles */
  .match-dashboard {
    display: flex;
    align-items: center;
    justify-content: space-around;
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 16px 24px;
    box-shadow: var(--glass-shadow);
    margin-bottom: 8px;
    box-sizing: border-box;
  }
  .light-mode .match-dashboard {
    background: rgba(255, 255, 255, 0.65);
    border-color: rgba(0, 0, 0, 0.1);
  }
  .dash-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .dash-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .dash-value {
    font-size: 32px;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: baseline;
    gap: 2px;
  }
  .dash-unit {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-secondary);
  }
  .dash-divider {
    width: 1px;
    height: 48px;
    background: rgba(255, 255, 255, 0.1);
  }
  .light-mode .dash-divider {
    background: rgba(0, 0, 0, 0.08);
  }
  .dash-confidence {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .confidence-text {
    font-size: 11px;
    font-weight: 600;
    color: #a29bfe;
    background: rgba(108, 92, 231, 0.15);
    padding: 2px 8px;
    border-radius: 8px;
    text-transform: uppercase;
  }
  .light-mode .confidence-text {
    color: #6c5ce7;
    background: rgba(108, 92, 231, 0.06);
  }

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
    font-size: 14px;
    font-weight: 700;
    color: #a29bfe;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    text-align: left;
    border-left: 3px solid #6c5ce7;
    padding-left: 8px;
    margin-bottom: 2px;
  }
  .light-mode .card-section-title {
    color: #6c5ce7;
    border-left-color: #6c5ce7;
  }

  /* Carrier Section Styles */
  .carrier-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
  .none-carrier-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s var(--spring-smooth);
    box-sizing: border-box;
  }
  .none-carrier-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }
  .none-carrier-btn.active {
    background: rgba(108, 92, 231, 0.15);
    border-color: rgba(108, 92, 231, 0.4);
    box-shadow: 0 0 16px rgba(108, 92, 231, 0.1);
  }
  .light-mode .none-carrier-btn {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.08);
  }
  .light-mode .none-carrier-btn:hover {
    background: rgba(0, 0, 0, 0.06);
    border-color: rgba(0, 0, 0, 0.12);
  }
  .light-mode .none-carrier-btn.active {
    background: rgba(108, 92, 231, 0.08);
    border-color: rgba(108, 92, 231, 0.3);
  }
  .none-icon {
    font-size: 20px;
  }
  .none-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .none-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .none-subtitle {
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .carrier-divider {
    display: flex;
    align-items: center;
    text-align: center;
    font-size: 11px;
    color: var(--text-tertiary);
    margin: 4px 0;
  }
  .carrier-divider::before, .carrier-divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .light-mode .carrier-divider::before, .light-mode .carrier-divider::after {
    border-bottom-color: rgba(0, 0, 0, 0.08);
  }
  .carrier-divider:not(:empty)::before {
    margin-right: .5em;
  }
  .carrier-divider:not(:empty)::after {
    margin-left: .5em;
  }

  .noises-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    width: 100%;
  }
  @media (max-width: 520px) {
    .noises-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  .noise-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s var(--spring-smooth);
    box-sizing: border-box;
  }
  .noise-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
  .noise-card.selected {
    background: rgba(108, 92, 231, 0.18);
    border-color: rgba(108, 92, 231, 0.5);
    box-shadow: 0 0 16px rgba(108, 92, 231, 0.2);
  }
  .light-mode .noise-card {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.08);
  }
  .light-mode .noise-card:hover {
    background: rgba(0, 0, 0, 0.06);
    border-color: rgba(0, 0, 0, 0.12);
  }
  .light-mode .noise-card.selected {
    background: rgba(108, 92, 231, 0.08);
    border-color: rgba(108, 92, 231, 0.3);
  }
  .noise-icon {
    font-size: 18px;
  }
  .noise-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }
  .noise-card.selected .noise-name {
    color: var(--text-primary);
  }

  /* Auxiliary Input Grid Styles */
  .aux-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    width: 100%;
    margin-top: 4px;
  }
  @media (max-width: 480px) {
    .aux-grid {
      grid-template-columns: 1fr;
    }
  }
  .aux-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    box-sizing: border-box;
    width: 100%;
  }
  .light-mode .aux-card {
    background: rgba(0, 0, 0, 0.01);
    border-color: rgba(0, 0, 0, 0.05);
  }
  .aux-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .aux-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
  }
  .aux-filename {
    font-size: 11px;
    color: #a29bfe;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: rgba(108, 92, 231, 0.1);
    border: 1px solid rgba(108, 92, 231, 0.15);
    border-radius: 6px;
    padding: 4px 8px;
    box-sizing: border-box;
    text-align: left;
    width: 100%;
  }
  .light-mode .aux-filename {
    color: #6c5ce7;
    background: rgba(108, 92, 231, 0.05);
    border-color: rgba(108, 92, 231, 0.1);
  }
  .aux-error {
    font-size: 11px;
    color: #ff7675;
    text-align: left;
  }

  /* Parameter Row Styles */
  .param-row {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    padding-bottom: 16px;
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
  .param-row-header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }
  .param-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
  }
  .param-options {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .param-hint-box {
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-secondary);
    background: rgba(108, 92, 231, 0.06);
    border: 1px solid rgba(108, 92, 231, 0.12);
    border-radius: 10px;
    padding: 10px 14px;
    text-align: left;
    transition: opacity 0.2s;
  }
  .light-mode .param-hint-box {
    background: rgba(108, 92, 231, 0.03);
    border-color: rgba(108, 92, 231, 0.08);
    color: var(--text-secondary);
  }
</style>
