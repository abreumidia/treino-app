/** views/today.js — tela principal "Hoje" (com navegacao pelos dias da semana). */

import { esc, iso, fromIso, today, todayIso, fmtLongDate, weekDays, isSameDay } from '../utils.js';
import { config } from '../store.js';
import { dayStatus, exerciseProgress, weekStats } from '../logic.js';
import { getEntry } from '../store.js';
import { workoutCard, restCard, dayStrip, ring, ICONS } from '../ui.js';
import { sync } from '../sync.js';

export function renderToday(params) {
  const dateIso = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayIso();
  const date = fromIso(dateIso);
  const isToday = dateIso === todayIso();
  const days = weekDays(date);
  const st = dayStatus(dateIso);
  const ws = st.workouts;

  const syncLabel = { ok: 'Sincronizado', sync: 'Sincronizando', err: 'Offline', off: 'Local' }[sync.status];

  const greeting = (() => {
    const hh = new Date().getHours();
    if (hh < 12) return 'Bom dia';
    if (hh < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const cards = ws.length
    ? ws.map((w) => {
        const entry = getEntry(dateIso, w);
        const prog = exerciseProgress(dateIso, w);
        return workoutCard(dateIso, w, entry, prog.total ? prog : null);
      }).join('')
    : restCard();

  const wk = weekStats(date);

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">${esc(greeting)}, ${esc(config.name || 'atleta')}</p>
        <h1 class="h1">${isToday ? 'Hoje' : esc(fmtLongDate(date).split(',')[0])}</h1>
        <p class="muted" style="margin-top:2px">${esc(fmtLongDate(date))}</p>
      </div>
      <a class="icon-btn" href="#/mais" aria-label="Ajustes">${ICONS.gear}</a>
    </header>

    <div class="row between" style="margin-top:14px">
      <span class="syncpill" data-s="${sync.status}"><i></i>${esc(syncLabel)}</span>
      ${!isToday ? `<a class="btn sm soft" href="#/hoje/${todayIso()}">Voltar para hoje</a>` : ''}
    </div>

    ${dayStrip(days, dateIso, (di) => dayStatus(di))}

    ${st.total ? `
      <section class="hero" aria-label="Progresso do dia">
        <div class="hrow">
          <div class="ring-wrap">${ring(st.total ? Math.round((st.done / st.total) * 100) : 0, 62, 7)}</div>
          <div class="grow">
            <p class="eyebrow" style="color:rgba(14,16,19,.55)">Progresso do dia</p>
            <p class="h2" style="margin-top:2px">${st.done} de ${st.total} treino${st.total > 1 ? 's' : ''}</p>
            <p class="tiny" style="color:rgba(14,16,19,.6);margin-top:2px">
              Semana: ${wk.totals.done}/${wk.totals.total} · ${wk.rate}%
            </p>
          </div>
        </div>
      </section>` : ''}

    <div class="section-head">
      <h2 class="h2">${st.total > 1 ? 'Treinos do dia' : 'Treino do dia'}</h2>
      ${st.total ? `<span class="tiny">${st.done}/${st.total}</span>` : ''}
    </div>

    <div class="stack">${cards}</div>
  `;
}
