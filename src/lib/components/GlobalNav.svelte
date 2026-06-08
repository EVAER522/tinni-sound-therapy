<script>
  import { currentMode } from '../stores/app.js';
  import { t } from '../stores/locale.js';
  const modes = [
    { id: 'therapy', key: 'nav_therapy' },
    { id: 'brainwave', key: 'nav_brainwave' },
    { id: 'sleep', key: 'nav_sleep' },
  ];
  function switchMode(mode) { currentMode.set(mode); }
</script>
<nav class="global-nav">
  <div class="nav-brand"><span class="nav-logo">Tinni</span></div>
  <div class="nav-links">
    {#each modes as m}
      <button class="nav-link" class:active={$currentMode===m.id} onclick={()=>switchMode(m.id)}>{$t[m.key]}</button>
    {/each}
  </div>
</nav>
<style>
.global-nav{height:44px;background:var(--surface-black);display:flex;align-items:center;justify-content:space-between;padding:0 var(--space-lg);user-select:none;-webkit-user-select:none;flex-shrink:0;}
.nav-logo{font-family:var(--font-display);font-size:14px;font-weight:600;color:var(--body-on-dark);letter-spacing:-.12px;}
.nav-links{display:flex;gap:var(--space-lg);}
.nav-link{font-size:12px;font-weight:400;color:rgba(255,255,255,.65);letter-spacing:-.12px;line-height:1.0;padding:0;background:none;border:none;cursor:pointer;transition:color .15s;}
.nav-link:hover{color:#fff;}
.nav-link.active{color:var(--primary-on-dark);}
</style>
