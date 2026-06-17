<script>
  import { volume, isDarkMode, isMicromode, locale } from "../stores/app.js";
  import { setMasterVolume } from "../audio/engine.js";
  import { t } from "../stores/locale.js";
  function handleVolume(e) { const val = parseFloat(e.target.value); volume.set(val); setMasterVolume(val); }
  function setLang(l) { locale.set(l); }
</script>
<div class="settings-sheet">
  <h2 class="settings-title">{$t.set_title}</h2>
  <div class="settings-section"><span class="section-title">{$t.set_audio}</span>
    <div class="setting-row"><span class="setting-label">{$t.set_master_volume}</span>
      <div class="setting-control"><input type="range" min="0" max="1" step="0.01" value={$volume} oninput={handleVolume} class="setting-slider" /><span class="setting-value">{Math.round($volume*100)}%</span></div></div>
    <div class="setting-row"><span class="setting-label">{$t.set_safe_volume}</span><span class="text-caption">{$t.set_enabled}</span></div></div>
  <div class="settings-section"><span class="section-title">{$t.set_display}</span>
    <div class="setting-row"><span class="setting-label">{$t.set_dark_mode}</span><label class="glass-toggle"><input type="checkbox" bind:checked={$isDarkMode} /><span class="glass-toggle-track"></span></label></div>
    <div class="setting-row"><span class="setting-label">{$t.set_micromode}</span><label class="glass-toggle"><input type="checkbox" bind:checked={$isMicromode} /><span class="glass-toggle-track"></span></label></div>
    <div class="setting-row"><span class="setting-label">{$t.set_language}</span><div class="glass-segmented"><button class:active={$locale==="en"} onclick={()=>setLang("en")}>English</button><button class:active={$locale==="zh"} onclick={()=>setLang("zh")}>中文</button></div></div></div>
  <div class="settings-section"><span class="section-title">{$t.set_about}</span>
    <p class="text-body">{$t.set_version}</p>
    <p class="text-caption">{$t.set_license}</p>
    <p class="text-fine" style="margin-top:8px">{$t.set_privacy}</p>
    <p class="text-fine" style="margin-top:8px">{$t.set_disclaimer}</p></div>
</div>
<style>
.settings-sheet{display:flex;flex-direction:column;gap:var(--space-md);padding:var(--space-xs)0;}
.settings-title{font-size:clamp(24px,3vw,28px);font-weight:700;line-height:1.1;color:var(--text-primary);margin-bottom:var(--space-xs);}
.settings-section{display:flex;flex-direction:column;gap:var(--space-sm);}
.setting-row{display:flex;justify-content:space-between;align-items:center;padding:var(--space-xs)0;}
.setting-label{font-size:17px;font-weight:500;color:var(--text-primary);}
.setting-control{display:flex;align-items:center;gap:var(--space-sm);}
.setting-slider{width:100px;height:4px;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,0.15);border-radius:2px;outline:none;}
.setting-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent-blue-purple);cursor:pointer;}
.setting-value{font-size:14px;font-weight:500;color:var(--text-secondary);min-width:36px;text-align:right;}
</style>
