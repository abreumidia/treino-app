/** views/workout.js — detalhe do treino: checklist, cargas, registro e conclusao. */

import {
  esc, fromIso, todayIso, fmtLongDate, pace, fmtPace, toast, haptic, INTENSITY_LABELS, MOOD,
} from '../utils.js';
import { RIR_TEXT, RIR_RANGE, VARIANTS } from '../plan.js';
import {
  getEntry, updateEntry, getExercise, updateExercise, lastLoad,
} from '../store.js';
import { workoutsOf, exerciseProgress } from '../logic.js';
import {
  backHeader, ICONS, sheet, bindScales, intensityScale, moodScale, ring,
} from '../ui.js';
import { scheduleSync } from '../sync.js';

/* --------------------------------------------------------------------- */

export function renderWorkout(params) {
  const dateIso = params.date;
  const wid = decodeURIComponent(params.wid || '');
  const list = workoutsOf(dateIso);
  const w = list.find((x) => x.id === wid);

  if (!w) {
    return `
      ${backHeader('Treino', '#/hoje')}
      <div class="empty">
        <div class="em">\u{1F914}</div>
        <h2 class="h3">Treino nao encontrado</h2>
        <p>Esse treino nao faz parte da rotina deste dia.</p>
        <a class="btn" style="margin-top:16px" href="#/hoje">Ir para hoje</a>
      </div>`;
  }

  const entry = getEntry(dateIso, w);
  const date = fromIso(dateIso);
  const done = entry.status === 'done';
  const backHref = `#/hoje/${dateIso}`;

  const head = `
    ${backHeader(fmtLongDate(date), backHref)}

    <div class="row" style="gap:12px;margin-top:16px">
      <span class="wemoji" style="width:52px;height:52px;flex:0 0 52px;border-radius:18px;display:grid;place-items:center;font-size:24px;background:${
        w.variant === 'prova' ? 'var(--amber-soft)'
        : w.kind === 'strength' ? 'var(--lime-soft)'
        : w.kind === 'run' ? 'var(--violet-soft)' : 'var(--sky-soft)'}" aria-hidden="true">${w.emoji}</span>
      <div class="grow">
        <h1 class="h2">${esc(w.title)}</h1>
        <p class="tiny">${esc(w.subtitle || w.tag)}</p>
      </div>
      ${done ? '<span class="chip done">Concluido</span>' : ''}
    </div>

    ${w.variantable ? variantToggle(entry.variant) : ''}
  `;

  const body = w.kind === 'strength'
    ? strengthBody(dateIso, w, entry)
    : cardioBody(dateIso, w, entry);

  return head + body;
}

/* ---------------- variante domingo ---------------- */

function variantToggle(current) {
  const opts = [['longao', 'Longao', '\u{1F3C3}'], ['prova', 'Prova', '\u{1F3C1}']];
  return `
    <div class="card soft" style="padding:12px">
      <p class="eyebrow" style="margin-bottom:8px">Tipo do treino de domingo</p>
      <div class="row" style="gap:8px">
        ${opts.map(([v, label, em]) => `
          <button type="button" class="btn ${current === v ? '' : 'outline'}" data-variant="${v}"
            style="min-height:46px;font-size:14px" aria-pressed="${current === v}">
            <span aria-hidden="true">${em}</span> ${label}
          </button>`).join('')}
      </div>
    </div>`;
}

/* ---------------- musculacao ---------------- */

function strengthBody(dateIso, w, entry) {
  const p = exerciseProgress(dateIso, w);
  const done = entry.status === 'done';
  const allChecked = p.total > 0 && p.done === p.total;

  const items = w.exercises.map((e) => {
    const rec = getExercise(dateIso, w.id, e.id);
    const last = lastLoad(e.id, dateIso);
    return `
      <li class="exitem" data-done="${rec.done ? 1 : 0}" data-ex="${esc(e.id)}">
        <button type="button" class="exhead" data-toggle-ex="${esc(e.id)}"
          aria-pressed="${rec.done}" aria-label="${esc(e.name)}, ${e.sets}${rec.done ? ', concluido' : ''}">
          <span class="exbox" aria-hidden="true">${ICONS.check}</span>
          <span class="grow">
            <span class="exname" style="display:block">${esc(e.name)}</span>
            <span class="exmeta">${esc(e.sets)}${last ? ` · ultima vez ${esc(String(last.load_kg))} kg` : ''}</span>
          </span>
        </button>
        <div class="exload">
          <label for="kg-${esc(e.id)}">Carga</label>
          <input class="kg-input" id="kg-${esc(e.id)}" type="number" inputmode="decimal"
            step="0.5" min="0" max="999" placeholder="--" data-load-ex="${esc(e.id)}"
            value="${rec.load_kg != null ? esc(String(rec.load_kg)) : ''}"
            aria-label="Carga usada em ${esc(e.name)} em quilos">
          <span class="tiny">kg</span>
        </div>
      </li>`;
  }).join('');

  return `
    <section class="card" style="margin-top:16px">
      <div class="row" style="gap:14px">
        <div>${ring(p.total ? Math.round((p.done / p.total) * 100) : 0, 56, 6)}</div>
        <div class="grow">
          <p class="h3">${p.done}/${p.total} exercicios</p>
          <p class="tiny">${allChecked ? 'Tudo feito, so falta registrar.' : 'Marque conforme for executando.'}</p>
        </div>
      </div>
      <div class="bar lime" style="margin-top:14px"><i style="width:${p.total ? (p.done / p.total) * 100 : 0}%"></i></div>
    </section>

    <div class="rir" style="margin-top:12px">
      <span class="rir-badge">RIR ${RIR_RANGE}</span>
      <p>${esc(RIR_TEXT)}</p>
    </div>

    ${allChecked && !done ? `
      <div class="celebrate" style="margin-top:14px">
        <div class="em" aria-hidden="true">\u{1F389}</div>
        <p class="h3">Todos os exercicios feitos!</p>
        <p class="tiny" style="margin-top:2px">Registre a intensidade para fechar o treino.</p>
      </div>` : ''}

    <div class="section-head"><h2 class="h2">Exercicios</h2></div>
    <ul class="exlist">${items}</ul>

    ${done ? doneSummary(entry) : ''}

    <div class="cta-bar">
      ${done
        ? `<button class="btn soft" data-reopen>Reabrir treino</button>`
        : `<button class="btn" data-finish>
             Finalizar treino
             <span class="btn-arrow" aria-hidden="true">${ICONS.arrow}</span>
           </button>`}
    </div>
  `;
}

/* ---------------- corrida / natacao ---------------- */

function cardioBody(dateIso, w, entry) {
  const isRun = w.kind === 'run' || w.kind === 'race';
  const done = entry.status === 'done';
  const p = pace(entry.distance_km, entry.duration_min);

  return `
    <form id="cardio-form" style="margin-top:16px" novalidate>
      <div class="stack">
        <div class="card">
          <p class="eyebrow" style="margin-bottom:12px">Registro</p>
          <div class="field-2">
            <div class="field">
              <label for="f-dist">Distancia (km)</label>
              <input class="input" id="f-dist" name="distance_km" type="number" inputmode="decimal"
                step="0.01" min="0" max="500" placeholder="0,00"
                value="${entry.distance_km != null ? esc(String(entry.distance_km)) : ''}">
            </div>
            <div class="field">
              <label for="f-dur">Tempo (min)</label>
              <input class="input" id="f-dur" name="duration_min" type="number" inputmode="numeric"
                step="1" min="0" max="1440" placeholder="0"
                value="${entry.duration_min != null ? esc(String(entry.duration_min)) : ''}">
            </div>
          </div>
          ${isRun ? `
            <div class="hintline" style="margin-top:12px">
              <span>Ritmo medio</span>
              <b id="pace-out">${p ? fmtPace(p) + ' /km' : '--'}</b>
            </div>` : ''}
        </div>

        <div class="card">
          <p class="eyebrow" style="margin-bottom:10px">Intensidade percebida</p>
          ${intensityScale(entry.intensity)}
          <p class="tiny center" id="int-label" style="margin-top:8px">
            ${entry.intensity ? esc(INTENSITY_LABELS[entry.intensity]) : 'Toque para escolher'}
          </p>
        </div>

        ${isRun ? `
          <div class="card">
            <p class="eyebrow" style="margin-bottom:10px">Como voce se sentiu</p>
            ${moodScale(entry.feeling)}
          </div>` : ''}

        <div class="card">
          <div class="field">
            <label for="f-notes">Observacao</label>
            <textarea class="textarea" id="f-notes" name="notes" maxlength="500"
              placeholder="Ex: senti as pernas pesadas.">${esc(entry.notes || '')}</textarea>
          </div>
        </div>
      </div>

      <div class="cta-bar">
        <button class="btn" type="submit">
          ${done ? 'Salvar alteracoes' : 'Salvar e concluir'}
          <span class="btn-arrow" aria-hidden="true">${ICONS.arrow}</span>
        </button>
        ${done ? '<button class="btn soft" type="button" data-reopen>Marcar como nao concluido</button>' : ''}
      </div>
    </form>
  `;
}

function doneSummary(entry) {
  const bits = [];
  if (entry.intensity) bits.push(`Intensidade ${entry.intensity}/5 · ${INTENSITY_LABELS[entry.intensity]}`);
  if (entry.feeling) bits.push(`${MOOD[entry.feeling].e} ${MOOD[entry.feeling].t}`);
  if (!bits.length && !entry.notes) return '';
  return `
    <div class="card soft" style="margin-top:14px">
      <p class="eyebrow" style="margin-bottom:6px">Registro</p>
      ${bits.length ? `<p class="muted">${esc(bits.join(' · '))}</p>` : ''}
      ${entry.notes ? `<p class="tiny" style="margin-top:6px">"${esc(entry.notes)}"</p>` : ''}
    </div>`;
}

/* ---------------- bindings ---------------- */

export function bindWorkout(root, params, rerender) {
  const dateIso = params.date;
  const wid = decodeURIComponent(params.wid || '');
  const w = workoutsOf(dateIso).find((x) => x.id === wid);
  if (!w) return;

  // variante domingo
  root.querySelectorAll('[data-variant]').forEach((b) => {
    b.addEventListener('click', () => {
      updateEntry(dateIso, w, { variant: b.dataset.variant });
      scheduleSync();
      haptic();
      rerender();
    });
  });

  // checklist
  root.querySelectorAll('[data-toggle-ex]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const exId = btn.dataset.toggleEx;
      const cur = getExercise(dateIso, w.id, exId);
      const next = !cur.done;
      updateExercise(dateIso, w.id, exId, { done: next });
      haptic(next ? 14 : 8);
      scheduleSync();
      rerender({ keepScroll: true });
    });
  });

  // cargas
  root.querySelectorAll('[data-load-ex]').forEach((inp) => {
    const save = () => {
      const raw = inp.value.replace(',', '.').trim();
      const val = raw === '' ? null : Number(raw);
      if (val !== null && (!isFinite(val) || val < 0)) { inp.value = ''; return; }
      updateExercise(dateIso, w.id, inp.dataset.loadEx, { load_kg: val });
      scheduleSync();
    };
    inp.addEventListener('change', save);
    inp.addEventListener('blur', save);
  });

  // reabrir
  root.querySelectorAll('[data-reopen]').forEach((b) => {
    b.addEventListener('click', () => {
      updateEntry(dateIso, w, { status: 'pending', completed_at: null });
      scheduleSync();
      toast('Treino reaberto');
      rerender();
    });
  });

  // finalizar musculacao -> sheet
  const finishBtn = root.querySelector('[data-finish]');
  if (finishBtn) {
    finishBtn.addEventListener('click', () => openFinishSheet(dateIso, w, rerender));
  }

  // formulario cardio
  const form = root.querySelector('#cardio-form');
  if (form) {
    const values = { intensity: getEntry(dateIso, w).intensity, feeling: getEntry(dateIso, w).feeling };
    const label = form.querySelector('#int-label');
    bindScales(form, values, (name) => {
      if (name === 'intensity' && label) {
        label.textContent = values.intensity ? INTENSITY_LABELS[values.intensity] : 'Toque para escolher';
      }
      haptic();
    });

    const dist = form.querySelector('#f-dist');
    const dur = form.querySelector('#f-dur');
    const paceOut = form.querySelector('#pace-out');
    const upd = () => {
      if (!paceOut) return;
      const p = pace(dist.value.replace(',', '.'), dur.value);
      paceOut.textContent = p ? fmtPace(p) + ' /km' : '--';
    };
    dist && dist.addEventListener('input', upd);
    dur && dur.addEventListener('input', upd);

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const d = dist.value.replace(',', '.').trim();
      const t = dur.value.trim();
      const distance = d === '' ? null : Number(d);
      const duration = t === '' ? null : Number(t);
      if ((distance !== null && (!isFinite(distance) || distance < 0)) ||
          (duration !== null && (!isFinite(duration) || duration < 0))) {
        toast('Valores invalidos');
        return;
      }
      updateEntry(dateIso, w, {
        status: 'done',
        completed_at: new Date().toISOString(),
        distance_km: distance,
        duration_min: duration,
        pace_sec: pace(distance, duration),
        intensity: values.intensity,
        feeling: values.feeling,
        notes: form.querySelector('#f-notes').value.trim(),
      });
      scheduleSync();
      haptic(20);
      toast('Treino registrado', true);
      location.hash = `#/hoje/${dateIso}`;
    });
  }
}

/* ---------------- sheet de conclusao ---------------- */

function openFinishSheet(dateIso, w, rerender) {
  const entry = getEntry(dateIso, w);
  const values = { intensity: entry.intensity, feeling: entry.feeling };

  sheet(`
    <div class="row between">
      <h2 class="h2">Como foi o treino?</h2>
      <button class="icon-btn ghost" data-close aria-label="Fechar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>

    <div class="card">
      <p class="eyebrow" style="margin-bottom:10px">Intensidade</p>
      ${intensityScale(values.intensity)}
      <p class="tiny center" id="s-int-label" style="margin-top:8px">
        ${values.intensity ? esc(INTENSITY_LABELS[values.intensity]) : 'Toque para escolher'}
      </p>
    </div>

    <div class="card">
      <p class="eyebrow" style="margin-bottom:10px">Como voce se sentiu</p>
      ${moodScale(values.feeling)}
    </div>

    <div class="card">
      <div class="field">
        <label for="s-notes">Observacao (opcional)</label>
        <textarea class="textarea" id="s-notes" maxlength="500"
          placeholder="Ex: senti as pernas pesadas.">${esc(entry.notes || '')}</textarea>
      </div>
    </div>

    <button class="btn" data-save-finish>
      Concluir treino
      <span class="btn-arrow" aria-hidden="true">${ICONS.arrow}</span>
    </button>
  `, {
    onMount(el, close) {
      const label = el.querySelector('#s-int-label');
      bindScales(el, values, (name) => {
        if (name === 'intensity') {
          label.textContent = values.intensity ? INTENSITY_LABELS[values.intensity] : 'Toque para escolher';
        }
        haptic();
      });
      el.querySelector('[data-save-finish]').addEventListener('click', () => {
        updateEntry(dateIso, w, {
          status: 'done',
          completed_at: new Date().toISOString(),
          intensity: values.intensity,
          feeling: values.feeling,
          notes: el.querySelector('#s-notes').value.trim(),
        });
        scheduleSync();
        haptic(24);
        close();
        toast('Treino concluido!', true);
        setTimeout(() => { location.hash = `#/hoje/${dateIso}`; }, 120);
      });
    },
  });
}
