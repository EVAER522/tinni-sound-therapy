<script>
  import { activeTab, isPlaying, isDarkMode, therapyView, currentMode, toast, bgAnimationEnabled } from './lib/stores/app.js';
  import BottomTab from './lib/components/BottomTab.svelte';
  import MiniPlayer from './lib/components/MiniPlayer.svelte';
  import DynamicIsland from './lib/components/DynamicIsland.svelte';
  import TopRightPanel from './lib/components/TopRightPanel.svelte';
  import BottomSheet from './lib/components/BottomSheet.svelte';
  import NotchTherapy from './lib/views/NotchTherapy.svelte';
  import Brainwave from './lib/views/Brainwave.svelte';
  import SleepSoundscape from './lib/views/SleepSoundscape.svelte';
  import Records from './lib/views/Records.svelte';
  import Settings from './lib/views/Settings.svelte';

  let currentToast = null;
  let toastTimer = null;
  $: if ($toast) {
    currentToast = $toast;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.set(null); currentToast = null; }, $toast.duration || 3000);
  }

  $: bgClass = $activeTab === 0 ? 'bg-therapy' : $activeTab === 1 ? 'bg-brainwave' : $activeTab === 2 ? 'bg-sleep' : 'bg-records';
</script>

<div class="app-root" class:light-mode={!$isDarkMode}>
  <!-- Gradient Background -->
  <div class="bg-layer {bgClass} bg-gradient" class:paused={!$bgAnimationEnabled}></div>

  <!-- Top Layer: Dynamic Island + Top Right Button -->
  <div class="top-layer">
    <DynamicIsland />
    <TopRightPanel />
  </div>

  <!-- Main Content Area -->
  <div class="content-area">
    {#if $activeTab === 0 && $therapyView === "main"}
      <NotchTherapy />
    {:else if $activeTab === 1}
      <Brainwave />
    {:else if $activeTab === 2}
      <SleepSoundscape />
    {:else if $activeTab === 3}
      <Records />
    {:else if $therapyView === "records"}
      <Records />
    {:else if $therapyView === "settings"}
      <Settings />
    {:else}
      <NotchTherapy />
    {/if}
  </div>

  <!-- MiniPlayer (above tab bar) -->
  <MiniPlayer />

  <!-- Bottom Tab Bar -->
  <BottomTab />

  <!-- Bottom Sheet overlay -->
  <BottomSheet />

  <!-- Toast container -->
  {#if currentToast}
    <div class="toast" class:error={currentToast.type === 'error'} class:success={currentToast.type === 'success'}>
      {currentToast.message}
    </div>
  {/if}
</div>

<style>
  .app-root { height: 100vh; display: flex; flex-direction: column; position: relative; overflow: hidden; }
  .bg-layer { position: fixed; inset: 0; z-index: 0; transition: background-image 0.8s ease; }
  .top-layer { position: fixed; top: 0; left: 0; right: 0; z-index: 50; padding: 8px 12px 0; pointer-events: none; display: flex; justify-content: center; }
  .top-layer :global(.top-right-wrapper) { position: fixed; right: 12px; top: 8px; z-index: 55; pointer-events: auto; }
  .content-area { flex: 1; position: relative; z-index: 1; display: flex; flex-direction: column; overflow: hidden; padding-bottom: calc(var(--tabbar-height) + var(--safe-bottom)); }
  .toast { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 1000; padding: 12px 20px; background: var(--glass-bg-heavy); backdrop-filter: blur(var(--glass-blur)) saturate(1.8); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.8); border: 1px solid var(--glass-border); border-radius: var(--glass-radius-sm); font-size: 14px; font-weight: 500; color: var(--text-primary); box-shadow: var(--glass-shadow); animation: toast-in 0.3s var(--spring-snappy); }
  .toast.error { border-color: rgba(255,85,85,0.4); }
  .toast.success { border-color: rgba(85,255,148,0.4); }
  @keyframes toast-in { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
