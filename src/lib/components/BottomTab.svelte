<script>
  import { activeTab } from '../stores/app.js';
  import { t } from '../stores/locale.js';

  const tabs = [
    { id: 0, key: 'nav_therapy', icon: 'waveform' },
    { id: 1, key: 'nav_brainwave', icon: 'brain' },
    { id: 2, key: 'nav_sleep', icon: 'moon' },
    { id: 3, key: 'records', icon: 'calendar' },
  ];

  function switchTab(id) { activeTab.set(id); }

  function getIcon(id, active) {
    const a = active ? 'currentColor' : 'rgba(255,255,255,0.5)';
    switch (id) {
      case 0: return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${a}" stroke-width="1.5" stroke-linecap="round"><path d="M3 12h2"/><path d="M6 8v8"/><path d="M9 5v14"/><path d="M12 3v18"/><path d="M15 7v10"/><path d="M18 9v6"/><path d="M21 11v2"/></svg>`;
      case 1: return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${a}" stroke-width="1.5" stroke-linecap="round"><path d="M12 2a6 6 0 0 0-6 6c0 3.5 2 5.5 3 6.5V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5.5c1-1 3-3 3-6.5a6 6 0 0 0-6-6z"/><path d="M10 13h4"/><path d="M9 16h6"/></svg>`;
      case 2: return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${a}" stroke-width="1.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-9-9"/><path d="M12 3v9h9"/></svg>`;
      case 3: return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${a}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>`;
    }
  }
</script>

<nav class="bottom-tab">
  {#each tabs as tab}
    <button class="tab-item" class:active={$activeTab === tab.id} onclick={() => switchTab(tab.id)} aria-label={$t[tab.key]}>
      <span class="tab-icon">{@html getIcon(tab.id, $activeTab === tab.id)}</span>
      <span class="tab-label">{$t[tab.key]}</span>
    </button>
  {/each}
</nav>

<style>
  .bottom-tab { position: fixed; bottom: 0; left: 0; right: 0; height: calc(var(--tabbar-height) + var(--safe-bottom)); padding-bottom: var(--safe-bottom); display: flex; background: var(--glass-bg-light); backdrop-filter: blur(20px) saturate(1.8); -webkit-backdrop-filter: blur(20px) saturate(1.8); border-top: none; z-index: 50; will-change: transform; transform: translateZ(0); }
  .tab-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 6px 0; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.45); transition: color 0.22s var(--spring-smooth), transform 0.18s var(--spring-bounce); position: relative; -webkit-tap-highlight-color: transparent; }
  .tab-item::after { content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%) scaleX(0); width: 18px; height: 3px; border-radius: 2px; background: var(--accent-blue-purple); transition: transform 0.28s var(--spring-bounce), opacity 0.22s; opacity: 0; }
  .tab-item:hover { color: rgba(255,255,255,0.75); transform: translateY(-1px); }
  .tab-item:active { transform: scale(0.9) !important; transition-duration: 80ms !important; }
  .tab-item.active { color: #fff; }
  .tab-item.active::after { transform: translateX(-50%) scaleX(1); opacity: 1; }
  .tab-item.active .tab-icon { transform: translateY(-3px); }
  .tab-item.active .tab-icon :global(svg) { filter: drop-shadow(0 0 8px rgba(108,92,231,0.7)); }
  .tab-icon { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; transition: transform 0.22s var(--spring-bounce), filter 0.22s; }
  .tab-label { font-size: 10px; font-weight: 500; letter-spacing: -0.02em; transition: color 0.22s; }
</style>
