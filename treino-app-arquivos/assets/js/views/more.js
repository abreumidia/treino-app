/** views/more.js — historico, sincronizacao e ajustes. */

import {
  esc, fromIso, MONTHS_SH, toast, INTENSITY_LABELS, MOOD, fmtDuration, fmtPace,
} from '../utils.js';
import {
  config, saveConfig, exportJson, importJson, resetAll, state,
} from '../store.js';
import { history, weekStats, KIND_LABEL } from '../logic.js';
import { backHeader, ICONS, sheet } from '../ui.js';
import { sync, runSync, ping } from '../sync.js';

let histFilter = 'all';

/* ============================ MAIS ============================ */

export function renderMore() {
  const s = weekStats(new Date());
  const totalDone = Object.values(state.entries).filter((e) => e.status === 'done').length;
  const syncLabel = {
    ok: 'Sincronizado', sync: 'Sincronizando...', err: 'Erro / offline', off: 'Somente neste aparelho',
  }[sync.status];

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Perfil</p>
        <h1 class="h1">Mais</h1>
      </div>
    </header>

    <section class="card">
      <div class="row" style="gap:14px">
        <span style="width:52px;height:52px;border-radius:50%;background:var(--lime);display:grid;place-items:center;font-size:22px" aria-hidden="true">\u{1F4AA}</span>
        <div class="grow">
          <p class="h3">${esc(config.name || 'Atleta')}</p>
          <p class="tiny">${totalDone} treino${totalDone === 1 ? '' : 's'} registrado${totalDone === 1 ? '' : 's'}</p>
        </div>
        <button class="btn sm soft" data-edit-name>Editar</button>
      </div>
      <div class="stat-grid" style="margin-top:14px">
        <div class="card soft" style="padding:14px">
          <p class="tiny">Semana atual</p>
          <p class="val" style="font-size:22px;font-weight:800;margin-top:6px">${s.totals.done}/${s.totals.total}</p>
        </div>
        <div class="card soft" style="padding:14px">
          <p class="tiny">Taxa</p>
          <p class="val" style="font-size:22px;font-weight:800;margin-top:6px">${s.rate}%</p>
        </div>
      </div>
    </section>

    <div class="section-head"><h2 class="h2">Registros</h2></div>
    <div class="list">
      <a class="list-item" href="#/historico">
        <span class="li-ic" aria-hidden="true">\u{1F5C2}\u{FE0F}</span>
        <span class="grow"><span class="li-t">Historico</span><span class="li-s">Todos os treinos concluidos</span></span>
        <span class="li-go" aria-hidden="true">${ICONS.chev}</span>
      </a>
      <a class="list-item" href="#/relatorio">
        <span class="li-ic" aria-hidden="true">\u{1F4CA}</span>
        <span class="grow"><span class="li-t">Relatorio da semana</span><span class="li-s">Resumo e consistencia</span></span>
        <span class="li-go" aria-hidden="true">${ICONS.chev}</span>
      </a>
    </div>

    <div class="section-head"><h2 class="h2">Dados</h2></div>
    <div class="list">
      <button class="list-item" data-sync-cfg>
        <span class="li-ic" aria-hidden="true">\u{2601}\u{FE0F}</span>
        <span class="grow"><span class="li-t">Sincronizacao</span><span class="li-s">${esc(syncLabel)}</span></span>
        <span class="li-go" aria-hidden="true">${ICONS.chev}</span>
      </button>
      <button class="list-item" data-export>
        <span class="li-ic" aria-hidden="true">\u{2B07}\u{FE0F}</span>
        <span class="grow"><span class="li-t">Exportar backup</span><span class="li-s">Baixar arquivo JSON</span></span>
        <span class="li-go" aria-hidden="true">${ICONS.chev}</span>
      </button>
      <button class="list-item" data-import>
        <span class="li-ic" aria-hidden="true">\u{2B06}\u{FE0F}</span>
        <span class="grow"><span class="li-t">Importar backup</span><span class="li-s">Restaurar de um arquivo</span></span>
        <span class="li-go" aria-hidden="true">${ICONS.chev}</span>
      </button>
      <button class="list-item" data-reset>
        <span class="li-ic" aria-hidden="true">\u{1F5D1}\u{FE0F}</span>
        <span class="grow"><span class="li-t" style="color:#B3453C">Apagar tudo</span><span class="li-s">Remove os registros deste aparelho</span></span>
      </button>
    </div>

    <p class="tiny center" style="margin-top:22px">Treino · versao 1.0</p>
    <input type="file" id="import-file" accept="application/json,.json" class="sr-only" aria-hidden="true">
  `;
}

export function bindMore(root, params, rerender) {
  root.querySelector('[data-edit-name]')?.addEventListener('click', () => {
    sheet(`
      <h2 class="h2">Seu nome</h2>
      <div class="field">
        <label for="n-in">Como quer ser chamado</label>
        <input class="input" id="n-in" value="${esc(config.name || '')}" maxlength="40" autofocus>
      </div>
      <button class="btn" data-ok>Salvar</button>
    `, {
      onMount(el, close) {
        el.querySelector('[data-ok]').addEventListener('click', () => {
          saveConfig({ name: el.querySelector('#n-in').value.trim() || 'Atleta' });
          close(); toast('Nome salvo', true); rerender();
        });
      },
    });
  });

  root.querySelector('[data-sync-cfg]')?.addEventListener('click', () => openSyncSheet(rerender));

  root.querySelector('[data-export]')?.addEventListener('click', () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treino-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Backup gerado', true);
  });

  const fileInput = root.querySelector('#import-file');
  root.querySelector('[data-import]')?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    try {
      const n = importJson(await f.text());
      toast(`${n} registros importados`, true);
      rerender();
    } catch (e) {
      toast('Arquivo invalido');
    } finally { fileInput.value = ''; }
  });

  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    sheet(`
      <h2 class="h2">Apagar todos os registros?</h2>
      <p class="muted">Isso remove os treinos salvos neste aparelho. Se a sincronizacao estiver ligada, os dados do servidor permanecem e voltam no proximo sync.</p>
      <button class="btn danger" data-confirm>Sim, apagar</button>
      <button class="btn soft" data-close>Cancelar</button>
    `, {
      onMount(el, close) {
        el.querySelector('[data-confirm]').addEventListener('click', () => {
          resetAll(); close(); toast('Registros apagados'); rerender();
        });
      },
    });
  });
}

/* ---------------- sheet de sincronizacao ---------------- */

function openSyncSheet(rerender) {
  sheet(`
    <h2 class="h2">Sincronizacao</h2>
    <p class="muted">Ligue para salvar os treinos no banco MySQL da Hostinger e usar o app em mais de um aparelho.</p>

    <div class="card">
      <div class="field">
        <label for="s-url">Endereco da API</label>
        <input class="input" id="s-url" value="${esc(config.apiUrl || '')}" placeholder="api/index.php" autocapitalize="off" spellcheck="false">
      </div>
      <div class="field" style="margin-top:12px">
        <label for="s-key">Chave de acesso</label>
        <input class="input" id="s-key" type="password" value="${esc(config.appKey || '')}" placeholder="a mesma do config.php" autocapitalize="off" spellcheck="false">
      </div>
      <label class="row" style="margin-top:14px;gap:10px">
        <input type="checkbox" id="s-on" ${config.syncEnabled ? 'checked' : ''} style="width:22px;height:22px">
        <span class="muted">Ativar sincronizacao</span>
      </label>
    </div>

    <div id="s-msg"></div>
    <button class="btn outline" data-test>Testar conexao</button>
    <button class="btn" data-save>Salvar</button>
  `, {
    onMount(el, close) {
      const msg = el.querySelector('#s-msg');
      const read = () => ({
        apiUrl: el.querySelector('#s-url').value.trim() || 'api/index.php',
        appKey: el.querySelector('#s-key').value.trim(),
        syncEnabled: el.querySelector('#s-on').checked,
      });

      el.querySelector('[data-test]').addEventListener('click', async () => {
        saveConfig(read());
        msg.innerHTML = '<div class="banner warn">Testando...</div>';
        try {
          const r = await ping();
          msg.innerHTML = `<div class="banner ok">Conectado. Banco: ${esc(r.db || 'ok')}</div>`;
        } catch (e) {
          msg.innerHTML = `<div class="banner err">${esc(e.message)}</div>`;
        }
      });

      el.querySelector('[data-save]').addEventListener('click', async () => {
        saveConfig(read());
        close();
        if (config.syncEnabled) {
          const r = await runSync();
          toast(r.ok ? 'Sincronizado' : 'Salvo (sem conexao com o servidor)', !!r.ok);
        } else {
          toast('Salvo');
        }
        rerender();
      });
    },
  });
}

/* ============================ HISTORICO ============================ */

export function renderHistory() {
  const rows = history(histFilter);
  const filters = [
    ['all', 'Todos'], ['strength', 'Musculacao'], ['run', 'Corrida'], ['swim', 'Natacao'],
  ];

  const list = rows.length ? rows.map(({ entry, workout }) => {
    const d = fromIso(entry.date);
    const bits = [];
    if (entry.distance_km) bits.push(`${Number(entry.distance_km)} km`);
    if (entry.duration_min) bits.push(fmtDuration(Number(entry.duration_min)));
    if (entry.pace_sec) bits.push(`${fmtPace(entry.pace_sec)} /km`);
    if (entry.intensity) bits.push(`Intensidade ${entry.intensity}/5`);

    return `
      <li>
        <a class="hist-item" href="#/treino/${entry.date}/${encodeURIComponent(entry.workout_id)}">
          <span class="hist-date">
            <span class="d">${d.getDate()}</span>
            <span class="m">${MONTHS_SH[d.getMonth()]}</span>
          </span>
          <span class="hist-sep" aria-hidden="true"></span>
          <span class="grow">
            <span style="display:block;font-size:14.5px;font-weight:650">
              <span aria-hidden="true">${workout.emoji}</span> ${esc(workout.title)}
            </span>
            <span class="tiny">${esc(bits.join(' · ') || 'Concluido')}</span>
            ${entry.notes ? `<span class="tiny" style="display:block;margin-top:2px;font-style:italic">"${esc(entry.notes)}"</span>` : ''}
          </span>
          ${entry.feeling ? `<span aria-hidden="true" style="font-size:18px">${MOOD[entry.feeling].e}</span>` : ''}
        </a>
      </li>`;
  }).join('') : `
    <div class="empty">
      <div class="em">\u{1F4C1}</div>
      <h2 class="h3">Nada por aqui</h2>
      <p>Os treinos concluidos aparecem nesta lista.</p>
    </div>`;

  return `
    ${backHeader('Registros', '#/mais')}
    <h1 class="h1" style="margin-top:12px">Historico</h1>

    <div class="filters" role="group" aria-label="Filtrar por modalidade">
      ${filters.map(([v, l]) => `
        <button type="button" data-filter="${v}" aria-pressed="${histFilter === v}">${l}</button>`).join('')}
    </div>

    <ul class="stack" style="margin-top:14px">${list}</ul>
  `;
}

export function bindHistory(root, params, rerender) {
  root.querySelectorAll('[data-filter]').forEach((b) => {
    b.addEventListener('click', () => { histFilter = b.dataset.filter; rerender(); });
  });
}
