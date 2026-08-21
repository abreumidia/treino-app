/** ui.js — componentes visuais reutilizaveis. */

import { esc, h, WD_SHORT, iso, isSameDay, today, INTENSITY_LABELS, MOOD } from './utils.js';

export const ICONS = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  back:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H6M11 6l-6 6 6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="#0E1013" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>',
  chev:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  left:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  gear:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
};

/* ---------------- ring de progresso ---------------- */

export function ring(percent, size = 62, stroke = 7, label = null) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, percent)) / 100);
  return `
    <span class="ring-box" style="width:${size}px;height:${size}px">
      <svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle class="trk" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
        <circle class="val" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"
          stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
          transform="rotate(-90 ${size / 2} ${size / 2})"/>
      </svg>
      <span class="ring-label">${label ?? percent + '%'}</span>
    </span>`;
}

/* ---------------- card de treino ---------------- */

export function workoutCard(dateIso, workout, entry, progress) {
  const done = entry.status === 'done';
  const kind = workout.variant === 'prova' ? 'race' : workout.kind;

  let statusChip;
  if (done) {
    statusChip = `<span class="chip done">${ICONS.check.replace('#0E1013', '#28340A')} Concluido</span>`;
  } else if (progress && progress.done > 0) {
    statusChip = `<span class="chip amber">Em andamento ${progress.done}/${progress.total}</span>`;
  } else {
    statusChip = `<span class="chip">Nao concluido</span>`;
  }

  const meta = [];
  if (done && entry.intensity) meta.push(`Intensidade ${entry.intensity}/5`);
  if (entry.distance_km) meta.push(`${Number(entry.distance_km)} km`);

  return `
    <a class="wcard" href="#/treino/${dateIso}/${encodeURIComponent(workout.id)}"
       data-kind="${kind}" data-done="${done ? 1 : 0}"
       aria-label="${esc(workout.title)} — ${done ? 'concluido' : 'nao concluido'}">
      <div class="wtop">
        <span class="wemoji" aria-hidden="true">${workout.emoji}</span>
        <span class="grow">
          <span class="wtitle" style="display:block">${esc(workout.title)}</span>
          <span class="wsub">${esc(workout.subtitle || workout.tag)}</span>
        </span>
        <span class="go" aria-hidden="true">${ICONS.arrow}</span>
      </div>
      ${progress && !done && progress.total ? `
        <div class="bar lime" style="margin-bottom:10px"><i style="width:${Math.round((progress.done / progress.total) * 100)}%"></i></div>
      ` : ''}
      <div class="wfoot">
        ${statusChip}
        ${meta.length ? `<span class="tiny">${esc(meta.join(' · '))}</span>` : ''}
      </div>
    </a>`;
}

export function restCard() {
  return `
    <div class="restcard">
      <div class="em" aria-hidden="true">\u{1F634}</div>
      <div class="h2" style="margin-top:8px">Dia de descanso</div>
      <p class="muted" style="margin-top:4px">Recuperacao tambem e treino.</p>
    </div>`;
}

/* ---------------- strip de dias ---------------- */

export function dayStrip(days, selectedIso, statusOf) {
  const t = iso(today());
  return `<div class="daystrip" role="tablist" aria-label="Dias da semana">${days.map((d) => {
    const di = iso(d);
    const st = statusOf(di); // {total, done}
    const dots = Array.from({ length: st.total }, (_, i) =>
      `<i class="${i < st.done ? 'ok' : ''}"></i>`).join('');
    return `
      <a class="dayp" role="tab" href="#/hoje/${di}"
         data-today="${di === t ? 1 : 0}" data-sel="${di === selectedIso ? 1 : 0}"
         aria-selected="${di === selectedIso}"
         aria-label="${WD_SHORT[d.getDay()]} ${d.getDate()}, ${st.done} de ${st.total} treinos">
        <span class="dw">${WD_SHORT[d.getDay()]}</span>
        <span class="dn">${d.getDate()}</span>
        <span class="dots" aria-hidden="true">${dots}</span>
      </a>`;
  }).join('')}</div>`;
}

/* ---------------- escalas ---------------- */

export function intensityScale(value, name = 'intensity') {
  return `<div class="scale" role="group" aria-label="Intensidade percebida">${
    [1, 2, 3, 4, 5].map((n) => `
      <button type="button" data-scale="${name}" data-val="${n}"
        aria-pressed="${value === n}" aria-label="${n} - ${INTENSITY_LABELS[n]}">
        <span class="n">${n}</span><span class="t">${INTENSITY_LABELS[n].split(' ')[0]}</span>
      </button>`).join('')
  }</div>`;
}

export function moodScale(value, name = 'feeling') {
  return `<div class="scale mood" role="group" aria-label="Como voce se sentiu">${
    [1, 2, 3, 4, 5].map((n) => `
      <button type="button" data-scale="${name}" data-val="${n}"
        aria-pressed="${value === n}" aria-label="${MOOD[n].t}">
        <span class="n" aria-hidden="true">${MOOD[n].e}</span><span class="t">${MOOD[n].t}</span>
      </button>`).join('')
  }</div>`;
}

/* ---------------- bottom sheet ---------------- */

let openSheet = null;

export function sheet(innerHtml, { onMount, onClose } = {}) {
  closeSheet();
  const root = document.getElementById('sheet-root');
  const el = h(`
    <div class="sheet-backdrop" role="dialog" aria-modal="true">
      <div class="sheet">
        <div class="sheet-grab" aria-hidden="true"></div>
        ${innerHtml}
      </div>
    </div>`);
  root.appendChild(el);
  document.body.style.overflow = 'hidden';

  const close = () => {
    el.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { el.remove(); }, 280);
    openSheet = null;
    document.removeEventListener('keydown', onKey);
    onClose && onClose();
  };
  const onKey = (ev) => { if (ev.key === 'Escape') close(); };

  el.addEventListener('click', (ev) => { if (ev.target === el) close(); });
  el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', onKey);

  requestAnimationFrame(() => {
    el.classList.add('open');
    const f = el.querySelector('[autofocus], button, input, textarea');
    f && f.focus({ preventScroll: true });
  });

  openSheet = { el, close };
  onMount && onMount(el.querySelector('.sheet'), close);
  return openSheet;
}

export function closeSheet() {
  if (openSheet) openSheet.close();
}

/** liga os botoes de escala dentro de um container */
export function bindScales(root, values, onChange) {
  root.querySelectorAll('[data-scale]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.scale;
      const val = Number(btn.dataset.val);
      values[name] = values[name] === val ? null : val;
      root.querySelectorAll(`[data-scale="${name}"]`).forEach((b) => {
        b.setAttribute('aria-pressed', String(Number(b.dataset.val) === values[name]));
      });
      onChange && onChange(name, values[name]);
    });
  });
}

/* ---------------- header simples ---------------- */

export function backHeader(title, backHref) {
  return `
    <div class="detail-head">
      <a class="icon-btn" href="${backHref}" aria-label="Voltar">${ICONS.back}</a>
      <span class="dh-t">${esc(title)}</span>
    </div>`;
}
