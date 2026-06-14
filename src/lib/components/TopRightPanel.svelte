<script>
  import { isDarkMode, sheetContent, bgAnimationEnabled, therapyView, toast, records } from '../stores/app.js';
  import { scale } from 'svelte/transition';
  import { t } from '../stores/locale.js';
  import Settings from '../views/Settings.svelte';

  let isOpen = false;
  let panelEl;

  function toggle() { isOpen = !isOpen; }
  function close() { isOpen = false; }
  function openSettings() { const SheetContent = Settings; sheetContent.set({ component: SheetContent, props: {} }); close(); }
  function openTools() { const SheetContent = Settings; sheetContent.set({ component: SheetContent, props: {} }); close(); }
  function toggleDark() { isDarkMode.update(v => !v); }
  function toggleBgAnim() { bgAnimationEnabled.update(v => !v); }
  function exportRecords() {
    try {
      const data = JSON.stringify($records, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'tinni-records.json'; a.click();
      URL.revokeObjectURL(url);
      toast.set({ message: 'Exported records', type: 'success', duration: 2000 });
    } catch(e) { toast.set({ message: 'Export failed', type: 'error' }); }
    close();
  }
  function resetProgress() {
    if (confirm('Reset all treatment data? This cannot be undone.')) {
      records.set([]);
      toast.set({ message: 'Progress reset', type: 'info' });
    }
    close();
  }

  function handleClickOutside(e) {
    if (panelEl && !panelEl.contains(e.target) && isOpen) close();
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="top-right-wrapper" bind:this={panelEl}>
  <button class="gear-btn glass-btn-icon" onclick={toggle} aria-label="Settings & Tools">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </button>

  {#if isOpen}
    <div class="dropdown-panel" transition:scale={{ start: 0.95, duration: 120 }}>
      <button class="dropdown-item" onclick={openSettings}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
        <span>{$t.settings}</span>
      </button>
      <button class="dropdown-item" onclick={openTools}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        <span>{$t.top_tools}</span>
      </button>

      <div class="dropdown-divider"></div>

      <div class="dropdown-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-9-9"/><path d="M12 3v9h9"/></svg>
        <span>{$t.top_animated_bg}</span>
        <label class="glass-toggle" style="margin-left:auto">
          <input type="checkbox" checked={$bgAnimationEnabled} onchange={toggleBgAnim} />
          <span class="glass-toggle-track"></span>
        </label>
      </div>

      <div class="dropdown-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <span>{$t.top_dark_mode}</span>
        <label class="glass-toggle" style="margin-left:auto">
          <input type="checkbox" checked={$isDarkMode} onchange={toggleDark} />
          <span class="glass-toggle-track"></span>
        </label>
      </div>

      <div class="dropdown-divider"></div>

      <button class="dropdown-item" onclick={exportRecords}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>{$t.top_export}</span>
      </button>
      <button class="dropdown-item destructive" onclick={resetProgress}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="1 4 4 4 21 4"/><path d="M19 4l-1 16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 4m5 4v8m4-8v8"/></svg>
        <span>{$t.top_reset}</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .top-right-wrapper { position: relative; display: inline-flex; }
  .gear-btn { width: 36px; height: 36px; font-size: 0; position: relative; z-index: 5; }
  .dropdown-panel { position: fixed; top: 52px; right: 12px; width: 240px; background: var(--glass-bg-heavy); backdrop-filter: blur(20px) saturate(1.8); -webkit-backdrop-filter: blur(20px) saturate(1.8); border: 1px solid var(--glass-border); border-radius: 18px; padding: 6px; box-shadow: var(--glass-shadow-lg); z-index: 1000; animation: scaleIn 0.15s var(--spring-snappy); }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
  .dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: none; background: none; color: var(--text-primary); font-size: 14px; font-weight: 500; border-radius: 12px; cursor: pointer; transition: background 0.12s; text-align: left; }
  .dropdown-item:hover { background: var(--glass-bg-light); }
  .dropdown-item.destructive { color: rgba(255,85,85,0.9); }
  .dropdown-item.destructive:hover { background: rgba(255,85,85,0.08); }
  .dropdown-divider { height: 1px; background: var(--glass-border); margin: 4px 12px; }
</style>
