<script>
  import { records } from '../stores/app.js';

  function getMonthData(records, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = year + "-" + String(month).padStart(2, "0") + "-" + String(i + 1).padStart(2, "0");
      const dayRecords = records.filter(r => r.date === date);
      return { date, day: i + 1, count: dayRecords.length, sessions: dayRecords };
    });
  }

  let viewMode = "calendar";
  let currentYear = 2026;
  let currentMonth = 6;

  let monthData;
  $: monthData = getMonthData($records, currentYear, currentMonth);

  let selectedDay = null;
  function selectDay(day) {
    selectedDay = selectedDay === day ? null : day;
  }

  function prevMonth() {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
  }

  function nextMonth() {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  }

  function getIntensity(count) {
    if (count === 0) return "level-0";
    if (count === 1) return "level-1";
    if (count <= 2) return "level-2";
    return "level-3";
  }
</script>

<div class="records-view">
  <div class="view-panel">
    <div class="header-row">
      <h2 class="title">治疗记录</h2>
      <div class="view-toggle">
        <button class="toggle-btn" class:active={viewMode === "calendar"} onclick={() => viewMode = "calendar"}>月视图</button>
        <button class="toggle-btn" class:active={viewMode === "list"} onclick={() => viewMode = "list"}>列表</button>
      </div>
    </div>

    {#if viewMode === "calendar"}
      <div class="calendar">
        <div class="cal-header">
          <button class="cal-nav" onclick={prevMonth}>◀</button>
          <span class="cal-month">{currentYear} 年 {currentMonth} 月</span>
          <button class="cal-nav" onclick={nextMonth}>▶</button>
        </div>
        <div class="cal-grid">
          <span class="cal-weekday">一</span>
          <span class="cal-weekday">二</span>
          <span class="cal-weekday">三</span>
          <span class="cal-weekday">四</span>
          <span class="cal-weekday">五</span>
          <span class="cal-weekday">六</span>
          <span class="cal-weekday">日</span>

          {#each monthData as day}
            <button
              class="cal-day {getIntensity(day.count)}"
              class:selected={selectedDay === day.day}
              onclick={() => selectDay(day.day)}
              disabled={day.count === 0}
            >
              {day.day}
            </button>
          {/each}
        </div>
      </div>

      {#if selectedDay}
        {@const dayInfo = monthData.find(d => d.day === selectedDay)}
        {#if dayInfo?.sessions?.length}
          <div class="day-detail">
            <h3 class="section-title">{dayInfo.date} 的记录</h3>
            {#each dayInfo.sessions as session}
              <div class="session-card">
                <div class="session-header">
                  <span class="text-caption-strong">{session.time}</span>
                  <span class="session-mode">{session.mode === 'therapy' ? '🎯 切迹治疗' : '🧠 脑波'}</span>
                  <span class="text-caption">{session.duration_min} 分钟</span>
                </div>
                {#if session.frequency}
                  <div class="session-detail">
                    频率: {Math.round(session.frequency)} Hz · 带宽: {session.bandwidth} · 深度: {session.depth} dB
                  </div>
                {/if}
                {#if session.feeling}
                  <div class="session-feeling">
                    感受: {session.feeling === 'better' ? '😊 好转' : session.feeling === 'unchanged' ? '😐 没变化' : '😔 更差'}
                    {#if session.severity_before !== undefined}
                      · 程度: {session.severity_before}/10
                    {/if}
                  </div>
                {/if}
                {#if session.note}
                  <div class="session-note">{session.note}</div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      {/if}

    {:else}
      <!-- List view -->
      <div class="list-view">
        {#if $records.length === 0}
          <div class="empty-state">
            <span class="text-body">暂无治疗记录</span>
          </div>
        {:else}
          {#each [...$records].reverse() as record}
            <div class="list-item">
              <div class="list-header">
                <span class="text-caption-strong">{record.date}</span>
                <span class="text-caption">{record.time}</span>
                <span class="text-caption">{record.duration_min} 分钟</span>
              </div>
              {#if record.frequency}
                <div class="text-fine">{Math.round(record.frequency)} Hz · {record.bandwidth} · {record.depth} dB</div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .records-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg) var(--space-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .view-panel {
    max-width: 600px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .title {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.14;
  }
  .view-toggle {
    display: flex;
    gap: 4px;
    background: var(--surface-pearl);
    border-radius: var(--radius-sm);
    padding: 3px;
  }
  .toggle-btn {
    padding: 6px 14px;
    border-radius: var(--radius-xs);
    border: none;
    background: transparent;
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-muted-48);
    cursor: pointer;
    transition: all 0.15s;
  }
  .toggle-btn.active {
    background: var(--canvas);
    color: var(--ink);
  }
  .calendar {
    width: 100%;
  }
  .cal-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }
  .cal-nav {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--hairline);
    background: var(--canvas);
    color: var(--ink);
    cursor: pointer;
  }
  .cal-nav:hover {
    background: var(--surface-pearl);
  }
  .cal-month {
    font-size: 17px;
    font-weight: 600;
    min-width: 120px;
    text-align: center;
  }
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }
  .cal-weekday {
    text-align: center;
    font-size: 12px;
    font-weight: 400;
    color: var(--ink-muted-48);
    padding: 4px;
  }
  .cal-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-xs);
    border: none;
    background: transparent;
    font-size: 14px;
    color: var(--ink);
    cursor: pointer;
    transition: background 0.15s;
  }
  .cal-day:hover:not(:disabled) {
    background: var(--surface-pearl);
  }
  .cal-day:disabled {
    color: var(--ink-muted-48);
    opacity: 0.3;
    cursor: default;
  }
  .cal-day.level-1 {
    background: rgba(196, 129, 61, 0.15);
  }
  .cal-day.level-2 {
    background: rgba(196, 129, 61, 0.3);
  }
  .cal-day.level-3 {
    background: rgba(196, 129, 61, 0.5);
    color: #fff;
  }
  .cal-day.selected {
    border: 2px solid var(--primary);
  }
  .day-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-muted-48);
    letter-spacing: 0.5px;
    margin-top: var(--space-sm);
  }
  .session-card {
    background: var(--canvas);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-sm);
    padding: var(--space-sm);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .session-header {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
  }
  .session-mode {
    font-size: 12px;
    font-weight: 400;
    color: var(--primary);
  }
  .session-detail, .session-feeling, .session-note {
    font-size: 12px;
    font-weight: 400;
    color: var(--ink-muted-48);
    line-height: 1.3;
  }
  .list-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .list-item {
    padding: var(--space-sm);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .list-header {
    display: flex;
    gap: var(--space-sm);
  }
  .empty-state {
    text-align: center;
    padding: var(--space-section);
    color: var(--ink-muted-48);
  }
</style>
