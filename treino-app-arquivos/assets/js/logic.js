/** logic.js — regras de negocio derivadas (progresso, estatisticas). */

import { planFor, PLAN } from './plan.js';
import { getEntry, getExercise, variantFor, state, entryKey } from './store.js';
import { iso, fromIso, weekDays, todayIso } from './utils.js';

/** Treinos planejados para uma data ISO, ja com variante aplicada. */
export function workoutsOf(dateIso) {
  return planFor(fromIso(dateIso), variantFor(dateIso));
}

/** Progresso de checklist de um treino de musculacao. */
export function exerciseProgress(dateIso, workout) {
  if (!workout.exercises || !workout.exercises.length) return { done: 0, total: 0 };
  let done = 0;
  workout.exercises.forEach((e) => {
    if (getExercise(dateIso, workout.id, e.id).done) done++;
  });
  return { done, total: workout.exercises.length };
}

/** Resumo do dia: total planejado x concluido. */
export function dayStatus(dateIso) {
  const ws = workoutsOf(dateIso);
  let done = 0;
  ws.forEach((w) => { if (getEntry(dateIso, w).status === 'done') done++; });
  return { total: ws.length, done, workouts: ws };
}

const KIND_LABEL = { strength: 'Musculacao', run: 'Corrida', swim: 'Natacao' };

/** Estatisticas de uma semana (recebe qualquer Date dentro da semana). */
export function weekStats(anyDate) {
  const days = weekDays(anyDate);
  const perDay = [];
  const totals = { total: 0, done: 0 };
  const byKind = {
    strength: { total: 0, done: 0, label: KIND_LABEL.strength },
    run:      { total: 0, done: 0, label: KIND_LABEL.run },
    swim:     { total: 0, done: 0, label: KIND_LABEL.swim },
  };

  days.forEach((d) => {
    const di = iso(d);
    const ws = workoutsOf(di);
    let dDone = 0;
    ws.forEach((w) => {
      const k = w.kind === 'race' ? 'run' : w.kind;
      totals.total++;
      if (byKind[k]) byKind[k].total++;
      if (getEntry(di, w).status === 'done') {
        totals.done++; dDone++;
        if (byKind[k]) byKind[k].done++;
      }
    });
    perDay.push({ date: di, dow: d.getDay(), total: ws.length, done: dDone });
  });

  return {
    days, perDay, totals, byKind,
    rate: totals.total ? Math.round((totals.done / totals.total) * 100) : 0,
    start: days[0], end: days[6],
  };
}

/** Ultimas N semanas (para a mini tendencia). */
export function trendWeeks(n = 4, ref = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i * 7);
    const s = weekStats(d);
    out.push({ rate: s.rate, done: s.totals.done, total: s.totals.total, start: s.start });
  }
  return out;
}

/** Historico: registros concluidos, mais recentes primeiro. */
export function history(filterKind = 'all', limit = 120) {
  const rows = [];
  for (const k in state.entries) {
    const e = state.entries[k];
    if (e.status !== 'done') continue;
    if (filterKind !== 'all' && (e.kind || '') !== filterKind) continue;
    const ws = workoutsOf(e.date);
    const w = ws.find((x) => x.id === e.workout_id);
    rows.push({ entry: e, workout: w || fallbackWorkout(e) });
  }
  rows.sort((a, b) => (a.entry.date < b.entry.date ? 1
    : a.entry.date > b.entry.date ? -1
    : (a.entry.completed_at || '') < (b.entry.completed_at || '') ? 1 : -1));
  return rows.slice(0, limit);
}

function fallbackWorkout(e) {
  const found = Object.values(PLAN).flat().find((w) => w.id === e.workout_id);
  return found || {
    id: e.workout_id, kind: e.kind || 'strength', emoji: '\u{1F4AA}',
    title: e.workout_id, subtitle: '', tag: KIND_LABEL[e.kind] || '',
  };
}

/** true se ha algum registro salvo (para estado vazio). */
export function hasAnyData() {
  return Object.keys(state.entries).length > 0;
}

export { KIND_LABEL, entryKey, todayIso };
