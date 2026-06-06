<script>
  import { currentMode, therapyView, isPlaying, isDarkMode, isMicromode } from './lib/stores/app.js';
  import GlobalNav from './lib/components/GlobalNav.svelte';
  import SubNav from './lib/components/SubNav.svelte';
  import MiniPlayer from './lib/components/MiniPlayer.svelte';
  import NotchTherapy from './lib/views/NotchTherapy.svelte';
  import Brainwave from './lib/views/Brainwave.svelte';
  import SleepSoundscape from './lib/views/SleepSoundscape.svelte';
  import Records from './lib/views/Records.svelte';
  import Settings from './lib/views/Settings.svelte';

  let contentView;
  $: {
    if ($therapyView === "records") contentView = "records";
    else if ($therapyView === "settings") contentView = "settings";
    else contentView = "main";
  }

  function handleKeydown(e) {
    if (e.ctrlKey && e.key === "1") { e.preventDefault(); currentMode.set("therapy"); therapyView.set("main"); }
    if (e.ctrlKey && e.key === "2") { e.preventDefault(); currentMode.set("brainwave"); therapyView.set("main"); }
    if (e.ctrlKey && e.key === "3") { e.preventDefault(); currentMode.set("sleep"); therapyView.set("main"); }
    if (e.ctrlKey && e.key === "m") { e.preventDefault(); isPlaying.update(v => !v); }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app-container" class:dark-mode={$isDarkMode}>
  <GlobalNav />
  <SubNav />

  <div class="content-area">
    {#if contentView === "records"}
      <Records />
    {:else if contentView === "settings"}
      <Settings />
    {:else if $currentMode === "therapy"}
      <NotchTherapy />
    {:else if $currentMode === "brainwave"}
      <Brainwave />
    {:else if $currentMode === "sleep"}
      <SleepSoundscape />
    {/if}
  </div>

  <MiniPlayer />
</div>

<style>
  .app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--canvas);
    color: var(--ink);
  }
  .app-container.dark-mode {
    background: var(--surface-tile-1);
    color: #fff;
  }
  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
