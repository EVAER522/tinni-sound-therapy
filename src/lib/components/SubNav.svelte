<script>
  import { currentMode, therapyView } from "../stores/app.js";
  import { getBrainwaveName } from "../audio/brainwave.js";
  import { brainwaveMode } from "../stores/audio.js";
  import { t } from "../stores/locale.js";
  let modeLabel; $: modeLabel = $currentMode==="therapy"?$t.nav_therapy:$currentMode==="brainwave"?getBrainwaveName($brainwaveMode):$t.nav_sleep;
  let showRecords; $: showRecords=$currentMode!=="sleep";
  let isSubView, subViewTitle;
  $:{if($therapyView==="records"){isSubView=true;subViewTitle=$t.records;}else if($therapyView==="settings"){isSubView=true;subViewTitle=$t.settings;}else{isSubView=false;subViewTitle="";}}
  function goBack(){therapyView.set("main");}
</script>
<div class="sub-nav frosted">
  {#if isSubView}
    <button class="back-btn" onclick={goBack}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>{subViewTitle}</button>
    <div></div>
  {:else}
    <span class="sub-nav-title">{modeLabel}</span>
    <div class="sub-nav-actions">
      {#if showRecords}<button class="sub-btn" onclick={()=>therapyView.set("records")}>{$t.records}</button>{/if}
      <button class="sub-btn" onclick={()=>therapyView.set("settings")}>{$t.settings}</button>
    </div>
  {/if}
</div>
<style>
.sub-nav{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 var(--space-lg);background:rgba(245,245,247,.8);backdrop-filter:saturate(180%)blur(20px);-webkit-backdrop-filter:saturate(180%)blur(20px);border-bottom:1px solid var(--hairline);flex-shrink:0;}
.sub-nav-title{font-size:21px;font-weight:600;line-height:1.19;letter-spacing:.231px;font-family:var(--font-display);color:var(--ink);}
.sub-nav-actions{display:flex;gap:var(--space-xs);}
.sub-btn{background:var(--surface-pearl);border:1px solid var(--divider-soft);border-radius:var(--radius-md);padding:8px 14px;font-size:14px;font-weight:400;color:var(--ink-muted-80);cursor:pointer;line-height:1.29;letter-spacing:-.224px;transition:background .15s;}
.sub-btn:hover{background:var(--canvas-parchment);}
.back-btn{display:flex;align-items:center;gap:6px;background:none;border:none;font-size:21px;font-weight:600;line-height:1.19;letter-spacing:.231px;color:var(--ink);cursor:pointer;padding:4px 0;}
.back-btn:hover{opacity:.7;}
</style>
