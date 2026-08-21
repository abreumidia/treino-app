/** views/report.js — mini relatorio semanal. */

import { esc, fmtRangeShort, iso, fromIso, today, todayIso, addDays, weekStart, WD_SHORT } from '../utils.js';
import { weekStats, trendWeeks, hasAnyData } from '../logic.js';
import { ring, ICONS } from '../ui.js';

export function renderReport(params) {
  const anchor = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? fromIso(params.date) : today();
  const s = weekStats(anchor);
  const t = todayIso();
  const isCurrentWeek = iso(weekStart(today())) === iso(s.start);
  const prevIso = iso(addDays(s.start, -7));
  const nextIso = iso(addDays(s.start, 7));

  if (!hasAnyData()) {
    return `
      <header class="topbar"><div>
        <p class="eyebrow">Resumo</p><h1 class="h1">Relatorio</h1>
      </div></header>
      <div class="empty">
        <div class="em">\u{1F4CA}</div>
        <h2 class="h3">Sem dados ainda</h2>
        <p>Conclua o primeiro treino para o relatorio comecar a fazer sentido.</p>
        <a class="btn" style="margin-top:16px" href="#/hoje">Ver treino de hoje</a>
      </div>`;
  }

  // barra clara = treinos planejados, preenchimento verde = concluidos
  const maxDay = Math.max(1, ...s.perDay.map((d) => d.total));
  const bars = s.perDay.map((d) => {
    const height = d.total === 0 ? 8 : Math.max(14, (d.total / maxDay) * 100);
    const fill = d.total ? Math.round((d.done / d.total) * 100) : 0;
    return `
      <div class="cb" data-today="${d.date === t ? 1 : 0}" data-empty="${d.total === 0 ? 1 : 0}">
        <div class="bx" style="height:${height}%" title="${d.done} de ${d.total} concluidos">
          <i style="height:${fill}%"></i>
        </div>
        <span class="lb">${WD_SHORT[d.dow]}</span>
      </div>`;
  }).join('');

  const kinds = [
    ['strength', '\u{1F4AA}', 'Musculacao'],
    ['run', '\u{1F3C3}', 'Corrida'],
    ['swim', '\u{1F3CA}', 'Natacao'],
  ].filter(([k]) => s.byKind[k].total > 0);

  const trend = trendWeeks(4, anchor);

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">${isCurrentWeek ? 'Esta semana' : 'Semana'}</p>
        <h1 class="h1">Relatorio</h1>
        <p class="muted" style="margin-top:2px">${esc(fmtRangeShort(s.start, s.end))}</p>
      </div>
    </header>

    <div class="row" style="gap:8px">
      <button class="icon-btn" data-nav="#/relatorio/${prevIso}" aria-label="Semana anterior">${ICONS.left}</button>
      <div class="grow center">
        ${isCurrentWeek ? '<span class="chip lime">Semana atual</span>'
          : `<a class="btn sm soft" href="#/relatorio/${todayIso()}">Semana atual</a>`}
      </div>
      <button class="icon-btn" data-nav="#/relatorio/${nextIso}" aria-label="Proxima semana">${ICONS.chev}</button>
    </div>

    <section class="hero">
      <div class="hrow">
        <div class="ring-wrap">${ring(s.rate, 76, 8, `${s.rate}%`)}</div>
        <div class="grow">
          <p class="eyebrow" style="color:rgba(14,16,19,.55)">Treinos concluidos</p>
          <p class="strong-num" style="margin-top:4px">${s.totals.done} <span style="font-size:18px;font-weight:700;opacity:.5">/ ${s.totals.total}</span></p>
          <p class="tiny" style="color:rgba(14,16,19,.6);margin-top:4px">Taxa de conclusao</p>
        </div>
      </div>
    </section>

    <div class="section-head"><h2 class="h2">Por modalidade</h2></div>
    <div class="card">
      <div class="breakdown">
        ${kinds.map(([k, em, label]) => {
          const b = s.byKind[k];
          const p = b.total ? Math.round((b.done / b.total) * 100) : 0;
          return `
            <div class="bd-row">
              <div class="bd-top">
                <span class="bd-name"><span aria-hidden="true">${em}</span> ${label}</span>
                <span class="bd-num">${b.done} / ${b.total}</span>
              </div>
              <div class="bar lime"><i style="width:${p}%"></i></div>
            </div>`;
        }).join('')}
      </div>
    </div>

    <div class="section-head"><h2 class="h2">Distribuicao da semana</h2></div>
    <div class="card">
      <div class="chartbars">${bars}</div>
      <div class="chartlegend">
        <span><i style="background:var(--lime-deep)"></i> Concluidos</span>
        <span><i style="background:var(--surface-sunk)"></i> Planejados</span>
      </div>
    </div>

    <div class="section-head"><h2 class="h2">Consistencia</h2></div>
    <div class="stack">
      <div class="insight">
        <span class="ie" aria-hidden="true">\u{1F525}</span>
        <div class="grow">
          <p class="it">Consistencia</p>
          <p class="ip">Voce treinou ${s.totals.done} dos ${s.totals.total} treinos planejados${isCurrentWeek ? ' esta semana' : ' na semana'}.</p>
        </div>
      </div>
      ${kinds.map(([k, em, label]) => {
        const b = s.byKind[k];
        return `
          <div class="insight">
            <span class="ie" aria-hidden="true">${em}</span>
            <div class="grow">
              <p class="it">${label}</p>
              <p class="ip">Voce completou ${b.done} de ${b.total} treinos.</p>
            </div>
          </div>`;
      }).join('')}
    </div>

    <div class="section-head"><h2 class="h2">Ultimas 4 semanas</h2></div>
    <div class="card">
      <div class="chartbars" style="grid-template-columns:repeat(4,1fr);height:104px">
        ${trend.map((w, i) => `
          <div class="cb" data-today="${i === trend.length - 1 ? 1 : 0}">
            <div class="bx" style="height:100%" title="${w.done} de ${w.total}">
              <i style="height:${Math.max(3, w.rate)}%"></i>
            </div>
            <span class="lb">${w.rate}%</span>
          </div>`).join('')}
      </div>
    </div>
  `;
}

export function bindReport(root) {
  root.querySelectorAll('[data-nav]').forEach((b) => {
    b.addEventListener('click', () => { location.hash = b.dataset.nav; });
  });
}
