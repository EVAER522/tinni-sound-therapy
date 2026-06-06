<script>
  import { currentMode, isPlaying, volume, isMuted } from '../stores/app.js';

  const modes = [
    { id: 'therapy', label: '🎯 治疗' },
    { id: 'brainwave', label: '🧠 脑波' },
    { id: 'sleep', label: '🌙 助眠' },
  ];

  function switchMode(mode) {
    currentMode.set(mode);
  }
</script>

<nav class="global-nav">
  <div class="nav-brand">
    <span class="nav-logo">Tinni 声愈</span>
  </div>
  <div class="nav-links">
    {#each modes as m}
      <button
        class="nav-link"
        class:active={$currentMode === m.id}
        onclick={() => switchMode(m.id)}
      >
        {m.label}
      </button>
    {/each}
  </div>
</nav>

<style>
  .global-nav {
    height: 44px;
    background: var(--surface-black);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-lg);
    user-select: none;
    -webkit-user-select: none;
    flex-shrink: 0;
  }
  .nav-brand {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .nav-logo {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    letter-spacing: 0.5px;
  }
  .nav-links {
    display: flex;
    gap: var(--space-md);
  }
  .nav-link {
    font-size: 12px;
    font-weight: 400;
    color: rgba(255,255,255,0.7);
    letter-spacing: -0.12px;
    padding: 4px 8px;
    border-radius: var(--radius-xs);
    transition: color 0.15s;
    background: none;
    border: none;
    cursor: pointer;
    line-height: 1;
  }
  .nav-link:hover {
    color: #fff;
  }
  .nav-link.active {
    color: var(--primary-on-dark);
  }
</style>

