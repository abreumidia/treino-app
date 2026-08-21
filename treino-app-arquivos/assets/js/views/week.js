/** views/week.js — calendario semanal. */

import {
  esc, iso, fromIso, todayIso, weekDays, weekStart, addDays,
  WD_LONG, WD_SHORT, fmtRangeShort, today,
} from '../utils.js';
import { dayStatus, exerciseProgress, weekStats } from '../logic.js';
import { getEntry } from '../store.js';
import { ICONS } from '../ui.js';

export function renderWeek(params) {
  const anchor = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? fromIso(params.date) : today();
  const days = weekDays(anchor);
  const t = todayIso();
  const wk = weekStats(anchor);
  const prevIso = iso(addDays(days[0], -7));
  const nextIso = iso(addDays(days[0], 7));
  const isCurrentWeek = iso(weekStart(today())) === iso(days[0]);

  const dayBlocks = days.map((d) => {
    const di = iso(d);
    const st = dayStatus(di);
    const isT = di === t;

    const inner = st.total === 0
      ? `<div class="row" style="gap:8px;padding:4px 0">
           <span class="wemoji" style="width:34px;height:34px;flex:0 0 34px;border-radius:12px;background:var(--violet-soft);display:grid;place-items:center;font-size:16px">\u{1F634}</span>
           <span class="muted" style="font-size:13.5px">Descanso e recuperacao</span>
         </div>`
      : st.workouts.map((w) => {
          const e = getEntry(di, w);
          const done = e.status === 'done';
          const p = exerciseProgress(di, w);
          const kind = w.variant === 'prova' ? 'race' : w.kind;
          const bgs = { strength:'var(--lime-soft)', run:'var(--violet-soft)', swim:'var(--sky-soft)', race:'var(--amber-soft)' };
          return `
            <a class="row" href="#/treino/${di}/${encodeURIComponent(w.id)}" style="padding:7px 0;gap:10px"
               aria-label="${esc(w.title)} em ${WD_LONG[d.getDay()]}${done ? ', concluido' : ''}">
              <span style="width:34px;height:34px;flex:0 0 34px;border-radius:12px;background:${bgs[kind]};display:grid;place-items:center;font-size:16px" aria-hidden="true">${w.emoji}</span>
              <span class="grow">
                <span style="display:block;font-size:14.5px;font-weight:650;letter-spacing:-.01em">${esc(w.title)}</span>
                <span class="tiny">${esc(w.tag)}${p.total ? ` · ${p.done}/${p.total}` : ''}</span>
              </span>
              ${done
                ? `<span class="chip done" style="padding:4px 9px">${ICONS.check.replace('#0E1013','#28340A')}</span>`
                : `<span class="li-go" aria-hidden="true">${ICONS.chev}</span>`}
            </a>`;
        }).join('<div style="height:1px;background:var(--line)"></div>');

    return `
      <section class="card${isT ? '' : ''}" style="${isT ? 'box-shadow:0 0 0 2px var(--ink) inset, var(--sh-1)' : ''}" aria-label="${WD_LONG[d.getDay()]} ${d.getDate()}">
        <div class="row between" style="margin-bottom:6px">
          <div class="row" style="gap:8px">
            <span class="h3">${WD_LONG[d.getDay()].replace('-feira','')}</span>
            <span class="tiny">${d.getDate()}/${String(d.getMonth() + 1).padStart(2,'0')}</span>
          </div>
          ${isT ? '<span class="chip dark">Hoje</span>'
                : st.total ? `<span class="tiny">${st.done}/${st.total}</span>` : ''}
        </div>
        ${inner}
      </section>`;
  }).join('');

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Calendario</p>
        <h1 class="h1">Semana</h1>
        <p class="muted" style="margin-top:2px">${esc(fmtRangeShort(days[0], days[6]))}</p>
      </div>
    </header>

    <div class="row" style="gap:8px">
      <button class="icon-btn" data-nav="#/semana/${prevIso}" aria-label="Semana anterior">${ICONS.left}</button>
      <div class="grow center">
        ${isCurrentWeek
          ? '<span class="chip lime">Semana atual</span>'
          : `<a class="btn sm soft" href="#/semana/${todayIso()}">Voltar para hoje</a>`}
      </div>
      <button class="icon-btn" data-nav="#/semana/${nextIso}" aria-label="Proxima semana">${ICONS.chev}</button>
    </div>

    <div class="card soft" style="padding:14px">
      <div class="row between" style="margin-bottom:8px">
        <span class="h3">${wk.totals.done} de ${wk.totals.total} treinos</span>
        <span class="chip ${wk.rate >= 80 ? 'lime' : 'amber'}">${wk.rate}%</span>
      </div>
      <div class="bar lime"><i style="width:${wk.rate}%"></i></div>
    </div>

    <div class="stack">${dayBlocks}</div>
  `;
}

export function bindWeek(root) {
  root.querySelectorAll('[data-nav]').forEach((b) => {
    b.addEventListener('click', () => { location.hash = b.dataset.nav; });
  });
}
