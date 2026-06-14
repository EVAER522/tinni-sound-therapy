<script>
  import { records } from "../stores/app.js";
  import { t } from "../stores/locale.js";
  function getMonthData(r,y,m){
    const dim=new Date(y,m,0).getDate();
    const firstDayOfWeek = new Date(y, m - 1, 1).getDay();
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const list = [];
    for (let i = 0; i < offset; i++) {
      list.push({ isPadding: true });
    }
    for (let i = 1; i <= dim; i++) {
      const d=y+"-"+String(m).padStart(2,"0")+"-"+String(i).padStart(2,"0");
      const dr=r.filter(x=>x.date===d);
      list.push({ isPadding: false, date: d, day: i, count: dr.length, sessions: dr });
    }
    return list;
  }
  let viewMode="calendar",currentYear=2026,currentMonth=6;
  let monthData;$:monthData=getMonthData($records,currentYear,currentMonth);
  let selectedDay=null;function selectDay(d){selectedDay=selectedDay===d?null:d;}
  function prevMonth(){currentMonth--;if(currentMonth<1){currentMonth=12;currentYear--;}}
  function nextMonth(){currentMonth++;if(currentMonth>12){currentMonth=1;currentYear++;}}
  function getIntensity(c){if(c===0)return"l0";if(c===1)return"l1";if(c<=2)return"l2";return"l3";}
</script>
<div class="rec-view">
  <div class="view-panel">
    <div class="header-row"><h2 class="title">{$t.rec_title}</h2><div class="view-toggle"><button class="glass-segmented-btn" class:active={viewMode==="calendar"} onclick={()=>viewMode="calendar"}>{$t.rec_calendar}</button><button class="glass-segmented-btn" class:active={viewMode==="list"} onclick={()=>viewMode="list"}>{$t.rec_list}</button></div></div>
    {#if viewMode==="calendar"}
        <div class="calendar"><div class="cal-header"><button class="glass-btn-icon cal-nav" onclick={prevMonth}>&larr;</button><span class="cal-month">{currentYear} &middot; {currentMonth}</span><button class="glass-btn-icon cal-nav" onclick={nextMonth}>&rarr;</button></div><div class="cal-grid">{#each ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] as d}<span class="cal-weekday">{d}</span>{/each}{#each monthData as day}{#if day.isPadding}<span class="cal-day empty" style="pointer-events:none;opacity:0;"></span>{:else}<button class="cal-day {getIntensity(day.count)}" class:selected={selectedDay===day.day} onclick={()=>selectDay(day.day)} disabled={day.count===0}>{day.day}</button>{/if}{/each}</div></div>
      {#if selectedDay}{@const di=monthData.find(d=>d.day===selectedDay)}{#if di?.sessions?.length}<div class="day-detail"><h3 class="section-title">{di.date}</h3>{#each di.sessions as s}<div class="session-card"><div class="session-header"><span class="text-caption-strong">{s.time}</span><span class="session-mode">{s.mode==="therapy"?$t.rec_notch_therapy:$t.rec_brainwave}</span><span class="text-caption">{s.duration_min} {$t.notch_min}</span></div>{#if s.frequency}<div class="session-detail">{Math.round(s.frequency)} Hz &middot; {s.bandwidth} &middot; {s.depth} dB</div>{/if}{#if s.feeling}<div class="session-feeling">{s.feeling==="better"?$t.notch_better:s.feeling==="unchanged"?$t.notch_no_change:$t.notch_worse}{#if s.severity_before!==undefined}&middot; {$t.notch_current_level}: {s.severity_before}/10{/if}</div>{/if}{#if s.note}<div class="session-note">{s.note}</div>{/if}</div>{/each}</div>{/if}{/if}
    {:else}
      <div class="list-view">{#if $records.length===0}<div class="empty-state"><span class="text-body">{$t.rec_no_records}</span></div>{:else}{#each [...$records].reverse() as r}<div class="list-item"><div class="list-header"><span class="text-caption-strong">{r.date}</span><span class="text-caption">{r.time}</span><span class="text-caption">{r.duration_min} {$t.notch_min}</span></div>{#if r.frequency}<div class="text-fine">{Math.round(r.frequency)} Hz &middot; {r.bandwidth} &middot; {r.depth} dB</div>{/if}</div>{/each}{/if}</div>
    {/if}
  </div>
</div>
<style>
.rec-view{flex:1;overflow-y:auto;padding:var(--space-lg);display:flex;flex-direction:column;align-items:center;scrollbar-width:thin;}
.view-panel{max-width:600px;width:100%;display:flex;flex-direction:column;gap:var(--space-md);}
.header-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);}
.title{font-size:clamp(24px,3vw,28px);font-weight:700;line-height:1.1;letter-spacing:-.02em;color:var(--text-primary);}
.calendar{width:100%;}
.cal-header{display:flex;align-items:center;justify-content:center;gap:var(--space-md);margin-bottom:var(--space-sm);}
.cal-nav{width:32px;height:32px;font-size:0;}
.cal-month{font-size:17px;font-weight:600;min-width:120px;text-align:center;color:var(--text-primary);}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
.cal-weekday{text-align:center;font-size:12px;font-weight:500;color:var(--text-tertiary);padding:4px;}
.cal-day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;border:none;background:transparent;font-size:14px;font-weight:500;color:var(--text-primary);cursor:pointer;transition:background .15s;}
.cal-day:hover:not(:disabled){background:var(--glass-bg-light);}
.cal-day:disabled{color:var(--text-tertiary);opacity:.3;cursor:default;}
.cal-day.l1{background:rgba(108,92,231,.15);}
.cal-day.l2{background:rgba(108,92,231,.3);}
.cal-day.l3{background:var(--accent-blue-purple);color:#fff;}
.cal-day.selected{border:2px solid rgba(108,92,231,0.6);}
.day-detail{display:flex;flex-direction:column;gap:var(--space-xs);}
.section-title{font-size:13px;font-weight:600;color:var(--text-secondary);letter-spacing:.5px;margin-top:var(--space-sm);}
.session-card,.list-item{background:var(--glass-bg-medium);border:1px solid var(--glass-border);border-radius:14px;padding:var(--space-sm)var(--space-md);display:flex;flex-direction:column;gap:4px;box-shadow:var(--glass-shadow);}
.session-header,.list-header{display:flex;gap:var(--space-sm);align-items:center;}
.session-mode{font-size:12px;font-weight:500;color:#a29bfe;}
.session-detail,.session-feeling,.session-note{font-size:12px;font-weight:400;color:var(--text-tertiary);line-height:1.3;}
.list-view{display:flex;flex-direction:column;gap:var(--space-xs);}
.empty-state{text-align:center;padding:var(--space-section);color:var(--text-tertiary);}
.view-toggle{display:flex;gap:2px;padding:3px;background:var(--glass-bg-light);border-radius:14px;}
.view-toggle button{padding:6px 14px;border-radius:11px;font-size:14px;font-weight:500;color:var(--text-secondary);background:transparent;border:none;cursor:pointer;transition:all .15s;}
.view-toggle button.active{background:var(--glass-bg-heavy);color:var(--text-primary);}
</style>
