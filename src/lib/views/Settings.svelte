<script>
  import { volume, isDarkMode, isMicromode } from '../stores/app.js';
  import { setMasterVolume } from '../audio/engine.js';
  import { isPlaying } from '../stores/app.js';

  let localVolume = 0.7;

  function handleVolume(e) {
    localVolume = parseFloat(e.target.value);
    volume.set(localVolume);
    setMasterVolume(localVolume);
  }
</script>

<div class="settings-view">
  <div class="view-panel">
    <h2 class="title">设置</h2>

    <div class="settings-section">
      <h3 class="section-title">音频</h3>
      <div class="setting-row">
        <label class="setting-label">主音量</label>
        <div class="setting-control">
          <input type="range" min="0" max="1" step="0.01" value={localVolume} oninput={handleVolume} class="setting-slider" />
          <span class="setting-value">{Math.round(localVolume * 100)}%</span>
        </div>
      </div>
      <div class="setting-row">
        <label class="setting-label">音量安全硬限 (85dB SPL)</label>
        <span class="text-caption">已启用 · 最大安全音量</span>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">显示</h3>
      <div class="setting-row">
        <label class="setting-label">深色模式</label>
        <div class="setting-control">
          <label class="toggle">
            <input type="checkbox" bind:checked={$isDarkMode} />
            <span class="toggle-knob"></span>
          </label>
        </div>
      </div>
      <div class="setting-row">
        <label class="setting-label">微光模式</label>
        <div class="setting-control">
          <label class="toggle">
            <input type="checkbox" bind:checked={$isMicromode} />
            <span class="toggle-knob"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">快捷键</h3>
      <div class="shortcut-list">
        <div class="shortcut-row"><span>播放/暂停</span><kbd>Space</kbd></div>
        <div class="shortcut-row"><span>紧急停止</span><kbd>Esc</kbd></div>
        <div class="shortcut-row"><span>音量增减</span><kbd>Ctrl + ↑↓</kbd></div>
        <div class="shortcut-row"><span>切换模式</span><kbd>Ctrl + 1/2/3</kbd></div>
        <div class="shortcut-row"><span>静音</span><kbd>Ctrl + M</kbd></div>
        <div class="shortcut-row"><span>全屏</span><kbd>F11</kbd></div>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">关于</h3>
      <div class="about-info">
        <p class="text-body">Tinni 声愈 v0.1.0</p>
        <p class="text-caption">耳鸣切迹音乐疗法 · 开源免费 (MIT)</p>
        <p class="text-fine" style="margin-top: 8px;">所有数据存储本机 · 无需联网 · 无需注册</p>
        <p class="text-fine" style="margin-top: 8px;">
          声明：本应用不可替代医学诊断。如有搏动性耳鸣或听力骤降，请及时就医。
        </p>
      </div>
    </div>
  </div>
</div>

<style>
  .settings-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg) var(--space-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .view-panel {
    max-width: 600px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  .title {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.14;
  }
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-muted-48);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-xs) 0;
    border-bottom: 1px solid var(--divider-soft);
  }
  .setting-label {
    font-size: 17px;
    font-weight: 400;
    letter-spacing: -0.374px;
  }
  .setting-control {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .setting-slider {
    width: 120px;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--hairline);
    border-radius: 2px;
    outline: none;
  }
  .setting-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primary);
    cursor: pointer;
  }
  .setting-value {
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-muted-48);
    min-width: 36px;
    text-align: right;
  }
  .toggle {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    cursor: pointer;
  }
  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .toggle-knob {
    position: absolute;
    inset: 0;
    background: var(--hairline);
    border-radius: 24px;
    transition: background 0.2s;
  }
  .toggle-knob:before {
    content: "";
    position: absolute;
    width: 20px;
    height: 20px;
    left: 2px;
    bottom: 2px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.2s;
  }
  .toggle input:checked + .toggle-knob {
    background: var(--primary);
  }
  .toggle input:checked + .toggle-knob:before {
    transform: translateX(20px);
  }
  .shortcut-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .shortcut-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    font-weight: 400;
    padding: var(--space-xxs) 0;
  }
  kbd {
    background: var(--surface-pearl);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-xs);
    padding: 2px 8px;
    font-size: 12px;
    font-family: inherit;
  }
  .about-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
</style>
