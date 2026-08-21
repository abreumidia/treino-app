/** utils.js — datas, formatacao e helpers de DOM. */

export const WD_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
export const WD_LONG  = ['Domingo','Segunda-feira','Terca-feira','Quarta-feira',
                         'Quinta-feira','Sexta-feira','Sabado'];
export const MONTHS    = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
                          'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export const MONTHS_SH = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/** Data local -> 'YYYY-MM-DD' (sem deslocamento de fuso). */
export function iso(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 'YYYY-MM-DD' -> Date local (meio-dia, imune a DST). */
export function fromIso(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12, 0, 0, 0);
}

export function todayIso() { return iso(today()); }

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Segunda-feira da semana da data informada. */
export function weekStart(date) {
  const d = new Date(date);
  const off = (d.getDay() + 6) % 7; // 0=segunda
  return addDays(d, -off);
}

/** Array com os 7 dias da semana (segunda -> domingo). */
export function weekDays(anyDateInWeek) {
  const s = weekStart(anyDateInWeek);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

export function isSameDay(a, b) { return iso(a) === iso(b); }

export function fmtLongDate(d) {
  return `${WD_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()}`;
}

export function fmtRangeShort(a, b) {
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()}-${b.getDate()} ${MONTHS_SH[a.getMonth()].toLowerCase()}`;
  }
  return `${a.getDate()} ${MONTHS_SH[a.getMonth()].toLowerCase()} - ${b.getDate()} ${MONTHS_SH[b.getMonth()].toLowerCase()}`;
}

/** segundos -> 'm:ss' */
export function fmtPace(secPerKm) {
  if (!secPerKm || !isFinite(secPerKm)) return '';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** minutos -> '1h 05' ou '45 min' */
export function fmtDuration(min) {
  if (!min && min !== 0) return '';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

export function pace(distanceKm, durationMin) {
  const d = Number(distanceKm), t = Number(durationMin);
  if (!d || !t || d <= 0 || t <= 0) return null;
  return Math.round((t * 60) / d);
}

export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

export function pct(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

/** Escapa texto para interpolar com seguranca em template HTML. */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** cria elemento a partir de HTML string */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const INTENSITY_LABELS = ['', 'Muito leve', 'Leve', 'Moderado', 'Pesado', 'Muito pesado'];
export const MOOD = [
  null,
  { e: '\u{1F62B}', t: 'Pessimo' },
  { e: '\u{1F615}', t: 'Ruim' },
  { e: '\u{1F610}', t: 'Normal' },
  { e: '\u{1F642}', t: 'Bom' },
  { e: '\u{1F525}', t: 'Excelente' },
];

let toastTimer;
export function toast(msg, good = false) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  root.innerHTML = '';
  const el = h(`<div class="toast${good ? ' good' : ''}">${esc(msg)}</div>`);
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2200);
}

/** vibra levemente, se suportado */
export function haptic(ms = 10) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {}
}
