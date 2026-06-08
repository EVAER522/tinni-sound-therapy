<script>
  import { records } from "../stores/app.js";
  import { t } from "../stores/locale.js";
  function getMonthData(r,y,m){const dim=new Date(y,m,0).getDate();return Array.from({length:dim},(_,i)=>{const d=y+"-"+String(m).padStart(2,"0")+"-"+String(i+1).padStart(2,"0");const dr=r.filter(x=>x.date===d);return{date:d,day:i+1,count:dr.length,sessions:dr};});}
  let viewMode="calendar",currentYear=2026,currentMonth=6;
  let monthData;$:monthData=getMonthData($records,currentYear,currentMonth);
  let selectedDay=null;function selectDay(d){selectedDay=selectedDay===d?null:d;}
  function prevMonth(){currentMonth--;if(currentMonth<1){currentMonth=12;currentYear--;}}
  function nextMonth(){currentMonth++;if(currentMonth>12){currentMonth=1;currentYear++;}}
  function getIntensity(c){if(c===0)return"l0";if(c===1)return"l1";if(c<=2)return"l2";return"l3";}
</script>
<div class="rec-view">
  <div class="view-panel">
    <div class="header-row"><h2 class="title">{$t.rec_title}</h2><div class="view-toggle"><button class="toggle-btn" class:active={viewMode==="calendar"} onclick={()=>viewMode="calendar"}>{$t.rec_calendar}</button><button class="toggle-btn" class:active={viewMode==="list"} onclick={()=>viewMode="list"}>{$t.rec_list}</button></div></div>
    {#if viewMode==="calendar"}
        <div class="calendar"><div class="cal-header"><button class="cal-nav" onclick={prevMonth}>&larr;</button><span class="cal-month">{currentYear} &middot; {currentMonth}</span><button class="cal-nav" onclick={nextMonth}>&rarr;</button></div><div class="cal-grid">{#each ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] as d}<span class="cal-weekday">{d}</span>{/each}{#each monthData as day}<button class="cal-day {getIntensity(day.count)}" class:selected={selectedDay===day.day} onclick={()=>selectDay(day.day)} disabled={day.count===0}>{day.day}</button>{/each}</div></div>
      {#if selectedDay}{@const di=monthData.find(d=>d.day===selectedDay)}{#if di?.sessions?.length}<div class="day-detail"><h3 class="section-title">{di.date}</h3>{#each di.sessions as s}<div class="session-card"><div class="session-header"><span class="text-caption-strong">{s.time}</span><span class="session-mode">{s.mode==="therapy"?$t.rec_notch_therapy:$t.rec_brainwave}</span><span class="text-caption">{s.duration_min} {$t.notch_min}</span></div>{#if s.frequency}<div class="session-detail">{Math.round(s.frequency)} Hz &middot; {s.bandwidth} &middot; {s.depth} dB</div>{/if}{#if s.feeling}<div class="session-feeling">{s.feeling==="better"?$t.notch_better:s.feeling==="unchanged"?$t.notch_no_change:$t.notch_worse}{#if s.severity_before!==undefined}&middot; {$t.notch_current_level}: {s.severity_before}/10{/if}</div>{/if}{#if s.note}<div class="session-note">{s.note}</div>{/if}</div>{/each}</div>{/if}{/if}
    {:else}
      <div class="list-view">{#if $records.length===0}<div class="empty-state"><span class="text-body">{$t.rec_no_records}</span></div>{:else}{#each [...$records].reverse() as r}<div class="list-item"><div class="list-header"><span class="text-caption-strong">{r.date}</span><span class="text-caption">{r.time}</span><span class="text-caption">{r.duration_min} {$t.notch_min}</span></div>{#if r.frequency}<div class="text-fine">{Math.round(r.frequency)} Hz &middot; {r.bandwidth} &middot; {r.depth} dB</div>{/if}</div>{/each}{/if}</div>
    {/if}
  </div>
</div>
<style>
.rec-view{flex:1;overflow-y:auto;padding:var(--space-lg);display:flex;flex-direction:column;align-items:center;}
.view-panel{max-width:600px;width:100%;display:flex;flex-direction:column;gap:var(--space-md);}
.header-row{display:flex;justify-content:space-between;align-items:center;}
.title{font-size:28px;font-weight:600;line-height:1.14;color:var(--ink);}
.view-toggle{display:flex;gap:4px;background:var(--surface-pearl);border-radius:var(--radius-sm);padding:3px;}
.toggle-btn{padding:6px 14px;border-radius:var(--radius-xs);border:none;background:transparent;font-size:14px;font-weight:400;color:var(--ink-muted-48);cursor:pointer;transition:all .15s;}
.toggle-btn.active{background:var(--canvas);color:var(--ink);}
.calendar{width:100%;}
.cal-header{display:flex;align-items:center;justify-content:center;gap:var(--space-md);margin-bottom:var(--space-sm);}
.cal-nav{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid var(--hairline);background:var(--canvas);color:var(--ink);cursor:pointer;}
.cal-nav:hover{background:var(--surface-pearl);}
.cal-month{font-size:17px;font-weight:600;min-width:120px;text-align:center;}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
.cal-weekday{text-align:center;font-size:12px;font-weight:400;color:var(--ink-muted-48);padding:4px;}
.cal-day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-xs);border:none;background:transparent;font-size:14px;color:var(--ink);cursor:pointer;transition:background .15s;}
.cal-day:hover:not(:disabled){background:var(--surface-pearl);}
.cal-day:disabled{color:var(--ink-muted-48);opacity:.3;cursor:default;}
.cal-day.l1{background:rgba(0,102,204,.12);}
.cal-day.l2{background:rgba(0,102,204,.28);}
.cal-day.l3{background:rgba(0,102,204,.5);color:#fff;}
.cal-day.selected{border:2px solid var(--primary);}
.day-detail{display:flex;flex-direction:column;gap:var(--space-xs);}
.section-title{font-size:14px;font-weight:600;color:var(--ink-muted-48);letter-spacing:.5px;margin-top:var(--space-sm);}
.session-card{background:var(--canvas);border:1px solid var(--hairline);border-radius:var(--radius-sm);padding:var(--space-sm);display:flex;flex-direction:column;gap:4px;}
.session-header{display:flex;gap:var(--space-sm);align-items:center;}
.session-mode{font-size:12px;font-weight:400;color:var(--primary);}
.session-detail,.session-feeling,.session-note{font-size:12px;font-weight:400;color:var(--ink-muted-48);line-height:1.3;}
.list-view{display:flex;flex-direction:column;gap:var(--space-xs);}
.list-item{padding:var(--space-sm);border:1px solid var(--hairline);border-radius:var(--radius-sm);display:flex;flex-direction:column;gap:2px;}
.list-header{display:flex;gap:var(--space-sm);}
.empty-state{text-align:center;padding:var(--space-section);color:var(--ink-muted-48);}
</style>
