<script>
  import { volume, isDarkMode, isMicromode, locale } from "../stores/app.js";
  import { setMasterVolume } from "../audio/engine.js";
  import { t } from "../stores/locale.js";
  let localVolume = 0.7;
  function handleVolume(e) { localVolume = parseFloat(e.target.value); volume.set(localVolume); setMasterVolume(localVolume); }
  function setLang(l) { locale.set(l); }
</script>
<div class="settings-view">
  <div class="view-panel">
    <h2 class="title">{$t.set_title}</h2>
    <div class="settings-section">
      <h3 class="section-title">{$t.set_audio}</h3>
      <div class="setting-row">
        <label class="setting-label" for="master-vol">{$t.set_master_volume}</label>
        <div class="setting-control">
          <input id="master-vol" type="range" min="0" max="1" step="0.01" value={localVolume} oninput={handleVolume} class="setting-slider" />
          <span class="setting-value">{Math.round(localVolume*100)}%</span>
        </div>
      </div>
      <div class="setting-row">
        <span class="setting-label">{$t.set_safe_volume}</span>
        <span class="text-caption">{$t.set_enabled}</span>
      </div>
    </div>
    <div class="settings-section">
      <h3 class="section-title">{$t.set_display}</h3>
      <div class="setting-row">
        <label class="setting-label" for="dark-mode">{$t.set_dark_mode}</label>
        <div class="setting-control">
          <label class="toggle"><input id="dark-mode" type="checkbox" bind:checked={$isDarkMode} /><span class="toggle-knob"></span></label>
        </div>
      </div>
      <div class="setting-row">
        <label class="setting-label" for="micromode">{$t.set_micromode}</label>
        <div class="setting-control">
          <label class="toggle"><input id="micromode" type="checkbox" bind:checked={$isMicromode} /><span class="toggle-knob"></span></label>
        </div>
      </div>
      <div class="setting-row">
        <span class="setting-label">{$t.set_language}</span>
        <div class="setting-control">
          <div class="lang-toggle">
            <button class="lang-btn" class:active={$locale==="en"} onclick={()=>setLang("en")}>English</button>
            <button class="lang-btn" class:active={$locale==="zh"} onclick={()=>setLang("zh")}>中文</button>
          </div>
        </div>
      </div>
    </div>
    <div class="settings-section">
      <h3 class="section-title">{$t.set_shortcuts}</h3>
      <div class="shortcut-list">
        <div class="shortcut-row"><span>{$t.set_play_pause}</span><kbd>Space</kbd></div>
        <div class="shortcut-row"><span>{$t.set_emergency_stop}</span><kbd>Esc</kbd></div>
        <div class="shortcut-row"><span>{$t.set_vol_up_down}</span><kbd>Ctrl + Up/Down</kbd></div>
        <div class="shortcut-row"><span>{$t.set_switch_mode}</span><kbd>Ctrl + 1/2/3</kbd></div>
        <div class="shortcut-row"><span>{$t.set_mute}</span><kbd>Ctrl + M</kbd></div>
        <div class="shortcut-row"><span>{$t.set_fullscreen}</span><kbd>F11</kbd></div>
      </div>
    </div>
    <div class="settings-section">
      <h3 class="section-title">{$t.set_about}</h3>
      <div class="about-info">
        <p class="text-body">{$t.set_version}</p>
        <p class="text-caption">{$t.set_license}</p>
        <p class="text-fine" style="margin-top:8px">{$t.set_privacy}</p>
        <p class="text-fine" style="margin-top:8px">{$t.set_disclaimer}</p>
      </div>
    </div>
  </div>
</div>
<style>
.settings-view{flex:1;overflow-y:auto;padding:var(--space-lg);display:flex;flex-direction:column;align-items:center;}
.view-panel{max-width:600px;width:100%;display:flex;flex-direction:column;gap:var(--space-lg);}
.title{font-size:28px;font-weight:600;line-height:1.14;color:var(--ink);}
.settings-section{display:flex;flex-direction:column;gap:var(--space-sm);}
.section-title{font-size:14px;font-weight:600;color:var(--ink-muted-48);letter-spacing:.5px;text-transform:uppercase;}
.setting-row{display:flex;justify-content:space-between;align-items:center;padding:var(--space-xs)0;border-bottom:1px solid var(--divider-soft);}
.setting-label{font-size:17px;font-weight:400;letter-spacing:-.374px;}
.setting-control{display:flex;align-items:center;gap:var(--space-sm);}
.setting-slider{width:120px;height:4px;-webkit-appearance:none;appearance:none;background:var(--hairline);border-radius:2px;outline:none;}
.setting-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--primary);cursor:pointer;}
.setting-value{font-size:14px;font-weight:400;color:var(--ink-muted-48);min-width:36px;text-align:right;}
.toggle{position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;}
.toggle input{opacity:0;width:0;height:0;}
.toggle-knob{position:absolute;inset:0;background:var(--hairline);border-radius:24px;transition:background .2s;}
.toggle-knob:before{content:"";position:absolute;width:20px;height:20px;left:2px;bottom:2px;background:#fff;border-radius:50%;transition:transform .2s;}
.toggle input:checked+.toggle-knob{background:var(--primary);}
.toggle input:checked+.toggle-knob:before{transform:translateX(20px);}
.lang-toggle{display:flex;gap:2px;background:var(--surface-pearl);border-radius:var(--radius-sm);padding:2px;}
.lang-btn{padding:6px 14px;border-radius:var(--radius-xs);border:none;background:transparent;font-size:14px;font-weight:400;color:var(--ink-muted-48);cursor:pointer;transition:all .15s;}
.lang-btn.active{background:var(--canvas);color:var(--ink);}
.shortcut-list{display:flex;flex-direction:column;gap:var(--space-xs);}
.shortcut-row{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:400;padding:var(--space-xxs)0;}
kbd{background:var(--surface-pearl);border:1px solid var(--hairline);border-radius:var(--radius-xs);padding:2px 8px;font-size:12px;font-family:inherit;}
.about-info{display:flex;flex-direction:column;gap:2px;}
</style>
