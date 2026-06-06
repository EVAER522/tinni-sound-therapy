<script>
  import {
    matchMethod, matchEar, matchStep, matchTotalSteps,
    matchResults, matchConfidence, matchPhase,
    notchParams, sessionTimer, sessionDuration,
    postFeeling, postSeverity, postNote,
    tinnitusToday
  } from '../stores/therapy.js';
  import { isPlaying, isMicromode, records, currentMode, therapyView, onboardingComplete } from '../stores/app.js';
  import { createMatchingSession, startTherapy, stopTherapy, updateTherapyParams } from '../audio/notch.js';
  import { getAudioContext, setMasterVolume } from '../audio/engine.js';

  let session;
  let currentFreqA = 0;
  let currentFreqB = 0;
  let matchingComplete = false;
  let matchFreqResult = null;
  let sessionInterval = null;
  let sessionElapsed = 0;
  let selectedCarrier = 'white';

  const bandwidths = [
    { id: 'narrow', label: '窄 (1/3 oct)' },
    { id: 'medium', label: '中 (1/2 oct)' },
    { id: 'wide', label: '宽 (1 oct)' },
  ];
  const depths = [
    { id: -3, label: '-3 dB' },
    { id: -6, label: '-6 dB' },
    { id: -12, label: '-12 dB' },
    { id: -20, label: '-20 dB' },
  ];

  // Daily check
  let dailyCheckDone = false;
  function answerDaily(answer) {
    tinnitusToday.set(answer);
    dailyCheckDone = true;
    if (answer === 'no') {
      currentMode.set('sleep');
    }
  }

  // Onboarding
  let onboardingStep = 0;
  const onboardingSteps = [
    { title: '什么是切迹疗法？', desc: '切迹音乐疗法通过在音乐或噪音中精准去除你耳鸣频率附近的频段，训练大脑逐渐忽略耳鸣信号。数据全程不上传，完全离线。' },
    { title: '快速问卷', desc: '回答几个问题，帮助我们了解你的情况。' },
    { title: '隐私承诺', desc: '所有数据存储在本机，无需联网，无需注册。你的隐私我们认真对待。' },
  ];
  function nextOnboarding() {
    if (onboardingStep < onboardingSteps.length - 1) {
      onboardingStep++;
    } else {
      onboardingComplete.set(true);
      matchPhase.set('method-select');
    }
  }

  // Method selection
  function selectMethod(method) {
    resetMatching();
    matchMethod.set(method);
    matchPhase.set(method === 'manual' ? 'manual-match' : 'ear-select');
  }
  function resetMatching() {
    session = null;
    currentFreqA = 0;
    currentFreqB = 0;
    matchingComplete = false;
    matchFreqResult = null;
    matchStep.set(0);
    matchEar.set('left');
    matchResults.set({ left: null, right: null, confidence: 0 });
    matchConfidence.set(0);
  }

  // Go back
  function goBack() {
    const backMap = {
      'ear-select': 'method-select',
      'manual-match': 'method-select',
      'matching': 'ear-select',
      'verification': 'matching',
      'complete': 'verification',
      'result': 'complete',
    };
    if (backMap[$matchPhase]) {
      matchPhase.set(backMap[$matchPhase]);
    }
  }

  // Ear selection
  function selectEar(ear) {
    matchEar.set(ear);
    if ($matchMethod === '2afc') {
      session = createMatchingSession();
      matchStep.set(0);
      currentFreqA = 0;
      currentFreqB = 0;
      matchPhase.set('matching');
      nextPair();
    }
  }

  // 2AFC matching
  function nextPair() {
    const pair = session.getNextFreqs();
    if (pair) {
      currentFreqA = pair.freqA;
      currentFreqB = pair.freqB;
      session.playPair(pair.freqA, pair.freqB);
    } else {
      finishMatching();
    }
  }
  function playSingleTone(freq) {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  }
  function chooseFreq(chosen) {
    matchFreqResult = chosen;
    session.advance();
    matchStep.set(session.currentStep);
    const pct = Math.min(session.currentStep / session.totalSteps, 1);
    matchConfidence.set(Math.max(1, Math.round(pct * 5)));
    setTimeout(() => nextPair(), 500);
  }
  function finishMatching() {
    const freqs = session.testFrequencies;
    matchFreqResult = freqs[Math.min(session.currentStep, freqs.length - 1)];
    matchResults.set({ left: matchFreqResult, right: null, confidence: 4 });
    matchConfidence.set(4);
    notchParams.update(p => { p.left.frequency = matchFreqResult; return p; });
    matchPhase.set('verification');
  }

  // Manual matching
  let manualFreq = 4000;
  let manualPlaying = false;
  let manualOsc = null;
  function playTestTone(freq) {
    const ctx = getAudioContext();
    if (manualOsc) { try { manualOsc.stop(); } catch(e) {} manualOsc = null; }
    manualOsc = ctx.createOscillator();
    manualOsc.type = 'sine';
    manualOsc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = 0.3;
    manualOsc.connect(gain);
    gain.connect(ctx.destination);
    manualOsc.start();
    manualPlaying = true;
  }
  function stopTestTone() {
    if (manualOsc) { try { manualOsc.stop(); } catch(e) {} manualOsc = null; }
    manualPlaying = false;
  }
  function confirmManual() {
    matchResults.set({ left: manualFreq, right: null, confidence: 3 });
    matchConfidence.set(3);
    notchParams.update(p => { p.left.frequency = manualFreq; return p; });
    stopTestTone();
    matchPhase.set('verification');
  }

  // Verification
  function verifyAccept() { matchPhase.set('complete'); }
  function verifyRetune() { resetMatching(); matchPhase.set('method-select'); }

  // Start therapy session
  function startSession() {
    const freq = $notchParams.left.frequency || 4000;
    startTherapy(freq, $notchParams.left.bandwidth, $notchParams.left.depth, selectedCarrier);
    isPlaying.set(true);
    sessionElapsed = 0;
    sessionTimer.set(0);
    sessionInterval = setInterval(() => {
      sessionElapsed++;
      sessionTimer.set(sessionElapsed);
      if (sessionElapsed >= $sessionDuration * 60) stopSession(true);
    }, 1000);
  }
  function stopSession(byTimer = false) {
    stopTherapy();
    isPlaying.set(false);
    if (sessionInterval) { clearInterval(sessionInterval); sessionInterval = null; }
    matchPhase.set('result');
  }
  function emergencyStop() {
    stopTherapy();
    isPlaying.set(false);
    if (sessionInterval) { clearInterval(sessionInterval); sessionInterval = null; }
    therapyView.set('match');
  }

  // Post-session rating
  function submitRating() {
    const newRecord = {
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      mode: "therapy",
      duration_min: Math.round(sessionElapsed / 60),
      frequency: $notchParams.left.frequency,
      bandwidth: $notchParams.left.bandwidth,
      depth: $notchParams.left.depth,
      feeling: $postFeeling,
      severity_before: $postSeverity,
      note: $postNote || "",
    };
    records.update(r => [...r, newRecord]);
    postFeeling.set(null);
    postSeverity.set(5);
    postNote.set("");
    therapyView.set('match');
    matchPhase.set('method-select');
  }

  import { onDestroy } from 'svelte';
  onDestroy(() => {
    if (sessionInterval) clearInterval(sessionInterval);
    stopTestTone();
    stopTherapy();
  });
</script>

<div class="therapy-view">
  {#if !$onboardingComplete}
    <!-- Onboarding -->
    <div class="view-panel fade-in">
      <h2 class="title">{onboardingSteps[onboardingStep].title}</h2>
      <p class="desc">{onboardingSteps[onboardingStep].desc}</p>
      <div class="onboarding-nav">
        <div class="dots">
          {#each onboardingSteps as _, i}
            <span class="dot" class:active={i === onboardingStep}></span>
          {/each}
        </div>
        <button class="btn-primary" onclick={nextOnboarding}>
          {onboardingStep < onboardingSteps.length - 1 ? '下一步' : '开始匹配'}
        </button>
      </div>
    </div>
  {:else if !dailyCheckDone}
    <!-- Daily check -->
    <div class="daily-check fade-in">
      <h2 class="title">今天有耳鸣吗？</h2>
      <div class="daily-options">
        <button class="btn-primary" onclick={() => answerDaily('yes')}>有</button>
        <button class="btn-secondary" onclick={() => answerDaily('mild')}>有但轻</button>
        <button class="btn-secondary" onclick={() => answerDaily('no')}>没有</button>
      </div>
    </div>
  {:else if $matchPhase === 'method-select'}
    <!-- Method Selection -->
    <div class="view-panel fade-in">
      <h2 class="title">选择匹配方式</h2>
      <p class="desc">请选择一种方法来确定你的耳鸣频率</p>
      <div class="method-grid">
        <button class="method-card" onclick={() => selectMethod('2afc')}>
          <div class="method-icon">🎯</div>
          <div class="method-name">自适应阶梯法</div>
          <div class="method-desc">通过逐对比较，精确锁定耳鸣频率。约 5-8 分钟。</div>
        </button>
        <button class="method-card" onclick={() => selectMethod('manual')}>
          <div class="method-icon">🎛️</div>
          <div class="method-name">手动匹配</div>
          <div class="method-desc">通过滑块调节频率，自己找出最接近的频率。</div>
        </button>
      </div>
    </div>
  {:else if $matchPhase === 'ear-select'}
    <!-- Ear selection -->
    <div class="view-panel fade-in">
      <h2 class="title">选择耳朵</h2>
      <p class="desc">你哪只耳朵有耳鸣？</p>
      <div class="ear-grid">
        <button class="method-card" onclick={() => selectEar('left')}>
          <div class="method-icon">👂</div>
          <div class="method-name">左耳</div>
        </button>
        <button class="method-card" onclick={() => selectEar('right')}>
          <div class="method-icon">👂</div>
          <div class="method-name">右耳</div>
        </button>
        <button class="method-card" onclick={() => selectEar('both')}>
          <div class="method-icon">👂👂</div>
          <div class="method-name">双耳</div>
        </button>
      </div>
      <button class="back-step" onclick={goBack}>← 上一步</button>
    </div>
  {:else if $matchPhase === 'matching'}
    <!-- 2AFC Matching -->
    <div class="view-panel fade-in">
      <h2 class="title">频率匹配</h2>
      <div class="progress-info">
        <span class="text-body">第 {$matchStep}/{$matchTotalSteps} 轮</span>
        <div class="progress-bar-compact">
          <div class="progress-fill-compact" style="width: {Math.min($matchStep / $matchTotalSteps * 100, 100)}%"></div>
        </div>
      </div>
      <p class="desc">请仔细听下面两个声音，选择更接近你耳鸣音调的那一个</p>
      <div class="afc-grid">
        <button class="afc-btn" onclick={() => chooseFreq(currentFreqA)}>
          <span class="afc-label">声音 A</span>
          <span class="afc-freq">{Math.round(currentFreqA)} Hz</span>
        </button>
        <button class="afc-btn" onclick={() => chooseFreq(currentFreqB)}>
          <span class="afc-label">声音 B</span>
          <span class="afc-freq">{Math.round(currentFreqB)} Hz</span>
        </button>
      </div>
      <div class="replay-row">
        <button class="btn-secondary replay-btn" onclick={() => playSingleTone(currentFreqA)}>🔊 A</button>
        <button class="btn-secondary replay-btn" onclick={() => playSingleTone(currentFreqB)}>🔊 B</button>
      </div>
      <button class="back-step" onclick={goBack}>← 上一步</button>
    </div>
  {:else if $matchPhase === 'manual-match'}
    <!-- Manual matching -->
    <div class="view-panel fade-in">
      <h2 class="title">手动匹配</h2>
      <p class="desc">拖动滑块试听，找到最接近你的耳鸣频率</p>
      <div class="manual-controls">
        <input
          type="range" min="125" max="12000" step="10"
          bind:value={manualFreq}
          class="freq-slider"
          oninput={() => { if (manualPlaying) playTestTone(manualFreq); }}
          onmousedown={() => playTestTone(manualFreq)}
          onmouseup={stopTestTone}
          ontouchstart={() => playTestTone(manualFreq)}
          ontouchend={stopTestTone}
        />
        <div class="freq-display">
          <span class="text-display-md">{manualFreq}</span>
          <span class="text-body">Hz</span>
        </div>
        <div class="manual-actions">
          <button class="btn-primary" onclick={confirmManual}>确认这个频率</button>
          <button class="btn-secondary" onclick={() => playTestTone(manualFreq)}>试听</button>
          <button class="btn-secondary" onclick={stopTestTone}>停止</button>
        </div>
      </div>
      <button class="back-step" onclick={goBack}>← 上一步</button>
    </div>
  {:else if $matchPhase === 'verification'}
    <!-- Verification -->
    <div class="view-panel fade-in">
      <h2 class="title">确认频率</h2>
      <p class="desc">系统锁定频率为 <strong>{Math.round($notchParams.left.frequency)} Hz</strong></p>
      <div class="verification-actions">
        <button class="btn-primary" onclick={verifyAccept}>确认，开始治疗</button>
        <button class="btn-secondary" onclick={verifyRetune}>重新匹配</button>
      </div>
      <button class="back-step" onclick={goBack}>← 上一步</button>
    </div>
  {:else if $matchPhase === 'complete'}
    <!-- Ready for therapy -->
    <div class="view-panel fade-in">
      <h2 class="title">匹配完成</h2>
      <div class="match-report">
        <div class="report-item">
          <span class="text-caption">锁定频率</span>
          <span class="text-display-md">{Math.round($notchParams.left.frequency)} Hz</span>
        </div>
        <div class="report-item">
          <span class="text-caption">匹配可信度</span>
          <div class="stars">{'★'.repeat($matchConfidence)}{'☆'.repeat(5 - $matchConfidence)}</div>
        </div>
      </div>
      <div class="session-controls">
        <div class="control-row">
          <label class="text-caption-strong">载音类型</label>
          <div class="chip-group">
            {#each ['white', 'pink', 'ambient'] as c}
              <button class="chip" class:selected={selectedCarrier === c} onclick={() => selectedCarrier = c}>
                {c === 'white' ? '白噪音' : c === 'pink' ? '粉红噪音' : '环境音乐'}
              </button>
            {/each}
          </div>
        </div>
        <div class="control-row">
          <label class="text-caption-strong">带宽</label>
          <div class="chip-group">
            {#each bandwidths as bw}
              <button class="chip" class:selected={$notchParams.left.bandwidth === bw.id} onclick={() => notchParams.update(p => { p.left.bandwidth = bw.id; return p; })}>
                {bw.label}
              </button>
            {/each}
          </div>
        </div>
        <div class="control-row">
          <label class="text-caption-strong">深度</label>
          <div class="chip-group">
            {#each depths as d}
              <button class="chip" class:selected={$notchParams.left.depth === d.id} onclick={() => notchParams.update(p => { p.left.depth = d.id; return p; })}>
                {d.label}
              </button>
            {/each}
          </div>
        </div>
        <div class="control-row">
          <label class="text-caption-strong">治疗时长（分钟）</label>
          <div class="duration-selector">
            {#each [15, 30, 45, 60] as dur}
              <button class="chip" class:selected={$sessionDuration === dur} onclick={() => sessionDuration.set(dur)}>{dur} 分</button>
            {/each}
          </div>
        </div>
        <button class="btn-primary start-btn" onclick={startSession}>
          开始治疗
        </button>
        <button class="btn-secondary" onclick={() => therapyView.set('match')}>
          跳过今天
        </button>
      </div>
      <button class="back-step" onclick={goBack}>← 上一步</button>
    </div>
  {:else if $matchPhase === 'result'}
    <!-- Post-session rating -->
    <div class="view-panel fade-in">
      <h2 class="title">治疗结束</h2>
      <p class="desc">这次治疗后你有什么感觉？</p>
      <div class="feeling-grid">
        {#each [{ id: 'better', label: '好转', icon: '😊' }, { id: 'unchanged', label: '没变化', icon: '😐' }, { id: 'worse', label: '更差', icon: '😔' }] as f}
          <button class="feeling-btn" class:selected={$postFeeling === f.id} onclick={() => postFeeling.set(f.id)}>
            <span class="feeling-icon">{f.icon}</span>
            <span>{f.label}</span>
          </button>
        {/each}
      </div>
      <div class="severity-slider">
        <label class="text-caption-strong">目前耳鸣程度（0-10）</label>
        <div class="slider-row">
          <span class="text-fine">0 无声</span>
          <input type="range" min="0" max="10" step="1" bind:value={$postSeverity} class="freq-slider" />
          <span class="text-fine">10 极响</span>
        </div>
        <span class="text-display-md severity-value">{$postSeverity}</span>
      </div>
      <div class="note-section">
        <label class="text-caption-strong">备注</label>
        <textarea bind:value={$postNote} class="note-input" placeholder="可选：记录你的感受..." rows="3"></textarea>
      </div>
      <button class="btn-primary start-btn" onclick={submitRating} disabled={!$postFeeling}>
        保存记录
      </button>
      <button class="btn-secondary" onclick={() => matchPhase.set('method-select')}>
        再来一次
      </button>
      <button class="back-step" onclick={goBack}>← 返回</button>
      <div class="privacy-note text-fine">
        所有数据存储本机·无需联网·无需注册
      </div>
    </div>
  {/if}
</div>

{#if $isPlaying}
  <div class="session-overlay" class:micromode={$isMicromode}>
    <button class="btn-emergency emergency-btn" onclick={emergencyStop}>
      🛑 紧急停止 (Esc)
    </button>
    <div class="session-info">
      <span class="text-tagline">治疗中</span>
      <span class="text-lead">{Math.floor(sessionElapsed / 60)}:{String(sessionElapsed % 60).padStart(2, '0')}</span>
    </div>
  </div>
{/if}

<style>
  .therapy-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-section) var(--space-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .view-panel {
    max-width: 600px;
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
    margin-bottom: var(--space-xs);
  }
  .desc {
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    color: var(--ink-muted-80);
    max-width: 480px;
  }
  .method-grid, .ear-grid {
    display: flex;
    gap: var(--space-md);
    width: 100%;
  }
  .method-card {
    flex: 1;
    background: var(--canvas);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
    transition: border-color 0.2s, transform 0.1s;
    text-align: center;
  }
  .method-card:hover {
    border-color: var(--primary);
  }
  .method-icon { font-size: 36px; }
  .method-name { font-size: 17px; font-weight: 600; }
  .method-desc { font-size: 14px; font-weight: 400; color: var(--ink-muted-48); line-height: 1.43; }
  .daily-check {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    align-items: center;
    padding-top: var(--space-section);
  }
  .daily-options { display: flex; gap: var(--space-md); }
  .progress-info {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .progress-bar-compact {
    height: 4px;
    background: var(--hairline);
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill-compact {
    height: 100%;
    background: var(--primary);
    border-radius: 2px;
    transition: width 0.3s;
  }
  .afc-grid {
    display: flex;
    gap: var(--space-lg);
    width: 100%;
    max-width: 400px;
  }
  .afc-btn {
    flex: 1;
    background: var(--surface-pearl);
    border: 2px solid var(--hairline);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .afc-btn:hover {
    border-color: var(--primary);
    background: var(--canvas);
  }
  .afc-label { font-size: 14px; font-weight: 600; color: var(--ink-muted-48); letter-spacing: -0.224px; }
  .afc-freq { font-size: 24px; font-weight: 600; color: var(--ink); }
  .manual-controls {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-lg);
    padding: var(--space-lg) 0;
  }
  .freq-slider {
    width: 100%;
    max-width: 400px;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--hairline);
    border-radius: 3px;
    outline: none;
  }
  .freq-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--primary);
    cursor: pointer;
    border: 3px solid var(--canvas);
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  }
  .freq-display {
    display: flex;
    align-items: baseline;
    gap: var(--space-xs);
  }
  .manual-actions { display: flex; gap: var(--space-sm); }
  .verification-actions {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
    justify-content: center;
  }
  .match-report {
    display: flex;
    gap: var(--space-xl);
  }
  .report-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
  }
  .stars {
    font-size: 24px;
    color: var(--primary);
    letter-spacing: 2px;
  }
  .session-controls {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .control-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    align-items: center;
  }
  .chip-group, .duration-selector {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
    justify-content: center;
  }
  .start-btn {
    margin-top: var(--space-md);
    font-size: 18px;
    font-weight: 600;
    padding: 14px 36px;
  }
  .feeling-grid {
    display: flex;
    gap: var(--space-md);
  }
  .feeling-btn {
    flex: 1;
    padding: var(--space-lg);
    border: 2px solid var(--hairline);
    border-radius: var(--radius-lg);
    background: var(--canvas);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    cursor: pointer;
    transition: border-color 0.2s;
    font-size: 14px;
    color: var(--ink);
  }
  .feeling-btn:hover, .feeling-btn.selected {
    border-color: var(--primary);
  }
  .feeling-icon { font-size: 32px; }
  .severity-slider {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    align-items: center;
  }
  .slider-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
  }
  .severity-value { color: var(--primary); }
  .note-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    text-align: left;
  }
  .note-input {
    width: 100%;
    padding: var(--space-sm);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-sm);
    resize: vertical;
    background: var(--canvas);
    font-size: 14px;
    font-family: inherit;
  }
  .note-input:focus {
    outline: 2px solid var(--primary-focus);
    outline-offset: -1px;
  }
  .onboarding-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    margin-top: var(--space-lg);
  }
  .dots {
    display: flex;
    gap: var(--space-xs);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--hairline);
    transition: background 0.2s;
  }
  .dot.active {
    background: var(--primary);
  }
  .back-step {
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-muted-48);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 0;
    margin-top: 4px;
  }
  .back-step:hover {
    color: var(--primary);
  }
  .privacy-note {
    color: var(--ink-muted-48);
    text-align: center;
    margin-top: var(--space-md);
  }
  .session-overlay {
    position: fixed;
    bottom: 64px;
    left: 0;
    right: 0;
    top: 96px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-lg);
    background: rgba(0,0,0,0.85);
    z-index: 20;
  }
  .session-overlay.micromode { filter: brightness(0.25); }
  .session-overlay.micromode:hover { filter: brightness(0.5); }
  .emergency-btn {
    font-size: 18px;
    padding: 14px 32px;
  }
  .session-info {
    text-align: center;
    color: #fff;
  }
  .session-info .text-tagline {
    color: var(--primary-on-dark);
  }
</style>
