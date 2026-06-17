<script>
  import { sheetContent } from '../stores/app.js';
  import { fly } from 'svelte/transition';
  import { spring } from 'svelte/motion';

  export let baseHeight = 45; // percentage
  let element;
  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  let sheetHeight = spring(baseHeight, { stiffness: 300, damping: 30 });
  let isOpen = false;
  let contentComponent = null;
  let contentProps = {};

  $: if ($sheetContent) {
    contentComponent = $sheetContent.component;
    contentProps = $sheetContent.props || {};
    isOpen = true;
    sheetHeight.set($sheetContent.height || baseHeight);
  }

  function handlePointerDown(e) {
    if (!e.target.closest('.sheet-handle')) return;
    startY = e.clientY || e.touches?.[0]?.clientY || 0;
    currentY = startY;
    isDragging = true;
    element.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!isDragging) return;
    const y = e.clientY || e.touches?.[0]?.clientY || 0;
    const delta = (y - startY) / window.innerHeight * 100;
    const newHeight = Math.max(20, Math.min(92, baseHeight - delta));
    sheetHeight.set(newHeight);
  }

  function handlePointerUp() {
    if (!isDragging) return;
    isDragging = false;
    const h = $sheetHeight;
    if (h < 30) { close(); return; }
    if (h > 70) { sheetHeight.set(90); return; }
    sheetHeight.set(baseHeight);
  }

  function close() {
    sheetContent.set(null);
    isOpen = false;
  }

  function handleBackdropClick() { close(); }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="sheet-backdrop" class:visible={isOpen} onclick={handleBackdropClick} transition:fly={{ duration: 200, opacity: 0 }}></div>
  <div
    class="sheet"
    class:open={isOpen}
    bind:this={element}
    style="height: {$sheetHeight}vh"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    role="dialog"
    aria-modal="true"
  >
    <div class="sheet-handle">
      <div class="handle-bar"></div>
    </div>
    <div class="sheet-content">
      {#if contentComponent}
        <svelte:component this={contentComponent} {...contentProps} />
      {/if}
    </div>
  </div>
{/if}

<style>
  .sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 100; }
  .sheet { position: fixed; bottom: 0; left: 0; right: 0; z-index: 101; background: var(--glass-bg-heavy); backdrop-filter: blur(20px) saturate(1.8); -webkit-backdrop-filter: blur(20px) saturate(1.8); border: 1px solid var(--glass-border); border-radius: 24px 24px 0 0; box-shadow: var(--glass-shadow-lg); display: flex; flex-direction: column; will-change: transform; transform: translateZ(0); touch-action: none; }
  .sheet-handle { display: flex; justify-content: center; padding: 12px 0 4px; cursor: grab; }
  .handle-bar { width: 36px; height: 4px; border-radius: 3px; background: rgba(255,255,255,0.3); }
  .sheet-content { flex: 1; overflow-y: auto; padding: var(--space-sm) var(--space-lg) calc(var(--space-lg) + var(--safe-bottom)); }
  .sheet-content::-webkit-scrollbar { width: 3px; }
  .sheet-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
</style>
