/** app.js — roteador e bootstrap. */

import { todayIso } from './utils.js';
import { subscribe, config } from './store.js';
import { initSync, onSyncStatus } from './sync.js';
import { closeSheet } from './ui.js';

import { renderToday } from './views/today.js';
import { renderWeek, bindWeek } from './views/week.js';
import { renderWorkout, bindWorkout } from './views/workout.js';
import { renderReport, bindReport } from './views/report.js';
import { renderMore, bindMore, renderHistory, bindHistory } from './views/more.js';

const main = document.getElementById('main');

/* ---------------- rotas ---------------- */

const ROUTES = [
  { re: /^\/hoje(?:\/(\d{4}-\d{2}-\d{2}))?$/, tab: 'hoje',
    map: (m) => ({ date: m[1] }), render: renderToday },

  { re: /^\/semana(?:\/(\d{4}-\d{2}-\d{2}))?$/, tab: 'semana',
    map: (m) => ({ date: m[1] }), render: renderWeek, bind: bindWeek },

  { re: /^\/relatorio(?:\/(\d{4}-\d{2}-\d{2}))?$/, tab: 'relatorio',
    map: (m) => ({ date: m[1] }), render: renderReport, bind: bindReport },

  { re: /^\/historico$/, tab: 'mais',
    map: () => ({}), render: renderHistory, bind: bindHistory },

  { re: /^\/mais$/, tab: 'mais',
    map: () => ({}), render: renderMore, bind: bindMore },

  { re: /^\/treino\/(\d{4}-\d{2}-\d{2})\/(.+)$/, tab: 'hoje',
    map: (m) => ({ date: m[1], wid: m[2] }), render: renderWorkout, bind: bindWorkout },
];

function currentPath() {
  const raw = location.hash.replace(/^#/, '');
  return raw || `/hoje/${todayIso()}`;
}

function match(path) {
  for (const r of ROUTES) {
    const m = path.match(r.re);
    if (m) return { route: r, params: r.map(m) };
  }
  return { route: ROUTES[0], params: { date: todayIso() } };
}

/* ---------------- render ---------------- */

let current = null;
let rendering = false;

function paint(opts = {}) {
  if (rendering) return;
  rendering = true;

  const path = currentPath();
  const { route, params } = match(path);
  const scrollY = window.scrollY;

  try {
    main.innerHTML = route.render(params);
  } catch (err) {
    console.error('[render]', err);
    main.innerHTML = `
      <div class="empty">
        <div class="em">\u{26A0}\u{FE0F}</div>
        <h2 class="h3">Algo deu errado</h2>
        <p>${String(err.message || err)}</p>
        <a class="btn" style="margin-top:16px" href="#/hoje">Voltar ao inicio</a>
      </div>`;
    rendering = false;
    return;
  }

  const rerender = (o = {}) => paint(o);
  if (route.bind) {
    try { route.bind(main, params, rerender); }
    catch (err) { console.error('[bind]', err); }
  }

  // tab ativa
  document.querySelectorAll('.tab').forEach((t) => {
    if (t.dataset.tab === route.tab) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });

  const samePath = current === path;
  current = path;

  if (opts.keepScroll || samePath) window.scrollTo(0, scrollY);
  else window.scrollTo(0, 0);

  rendering = false;
}

/* ---------------- eventos ---------------- */

window.addEventListener('hashchange', () => { closeSheet(); paint(); });

// re-renderiza quando o estado muda (sync remoto, import, etc.)
let repaintQueued = false;
subscribe(() => {
  if (repaintQueued) return;
  repaintQueued = true;
  setTimeout(() => { repaintQueued = false; paint({ keepScroll: true }); }, 0);
});

onSyncStatus(() => {
  const pill = document.querySelector('.syncpill');
  if (pill) paint({ keepScroll: true });
});

// atalho: home no logo / troca de dia mantendo scroll no topo
window.addEventListener('pageshow', () => paint({ keepScroll: true }));

/* ---------------- boot ---------------- */

if (!location.hash) location.hash = `#/hoje/${todayIso()}`;
paint();
initSync();

// Se o dia virar com o app aberto, atualiza a tela.
let lastDay = todayIso();
setInterval(() => {
  const t = todayIso();
  if (t !== lastDay) { lastDay = t; paint(); }
}, 60 * 1000);
