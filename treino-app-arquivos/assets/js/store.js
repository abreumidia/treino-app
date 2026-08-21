/**
 * store.js — estado local (offline-first).
 *
 * A fonte da verdade para a UI e sempre o localStorage. A sincronizacao com o
 * MySQL (sync.js) apenas empurra registros "sujos" e puxa alteracoes remotas,
 * resolvendo conflitos por "ultima escrita vence" (updated_at).
 *
 * Formato:
 *   entries[`${date}|${workoutId}`] = {
 *     date, workout_id, kind, status, intensity, feeling, notes,
 *     distance_km, duration_min, pace_sec, variant, completed_at, updated_at, dirty
 *   }
 *   exercises[`${date}|${workoutId}|${exerciseId}`] = {
 *     date, workout_id, exercise_id, done, load_kg, updated_at, dirty
 *   }
 */

import { iso, todayIso } from './utils.js';

const LS_KEY   = 'treino.v1.data';
const LS_CFG   = 'treino.v1.config';
const SCHEMA   = 1;

const listeners = new Set();

function nowIso() { return new Date().toISOString(); }

function blankState() {
  return { schema: SCHEMA, entries: {}, exercises: {}, lastPull: null, deviceId: null };
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return blankState();
    return {
      schema: parsed.schema || SCHEMA,
      entries: parsed.entries || {},
      exercises: parsed.exercises || {},
      lastPull: parsed.lastPull || null,
      deviceId: parsed.deviceId || null,
    };
  } catch (e) {
    console.warn('[store] falha ao ler localStorage:', e);
    return blankState();
  }
}

export const state = load();

if (!state.deviceId) {
  state.deviceId = 'dev_' + Math.random().toString(36).slice(2, 10);
}

let saveTimer = null;
export function persist(immediate = false) {
  const write = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('[store] falha ao gravar:', e);
    }
  };
  if (immediate) { clearTimeout(saveTimer); write(); return; }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(write, 120);
}

/* ---------------- config (API / chave) ---------------- */

function loadCfg() {
  try {
    const raw = localStorage.getItem(LS_CFG);
    const c = raw ? JSON.parse(raw) : {};
    return {
      apiUrl: c.apiUrl ?? 'api/index.php',
      appKey: c.appKey ?? '',
      syncEnabled: c.syncEnabled ?? false,
      name: c.name ?? 'Rodrigo',
    };
  } catch (_) {
    return { apiUrl: 'api/index.php', appKey: '', syncEnabled: false, name: 'Rodrigo' };
  }
}

export const config = loadCfg();

export function saveConfig(patch) {
  Object.assign(config, patch);
  localStorage.setItem(LS_CFG, JSON.stringify(config));
  emit();
}

/* ---------------- eventos ---------------- */

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let emitScheduled = false;
export function emit() {
  if (emitScheduled) return;
  emitScheduled = true;
  queueMicrotask(() => {
    emitScheduled = false;
    listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  });
}

/* ---------------- chaves ---------------- */

export const entryKey = (date, wid) => `${date}|${wid}`;
export const exKey = (date, wid, exid) => `${date}|${wid}|${exid}`;

/* ---------------- entries (treinos) ---------------- */

export function getEntry(date, workout) {
  const k = entryKey(date, workout.id);
  const e = state.entries[k];
  if (e) return e;
  return {
    date,
    workout_id: workout.id,
    kind: workout.kind,
    status: 'pending',
    intensity: null,
    feeling: null,
    notes: '',
    distance_km: null,
    duration_min: null,
    pace_sec: null,
    variant: workout.variantable ? 'longao' : null,
    completed_at: null,
    updated_at: null,
    dirty: false,
    _new: true,
  };
}

export function updateEntry(date, workout, patch) {
  const k = entryKey(date, workout.id);
  const base = state.entries[k] || getEntry(date, workout);
  const next = { ...base, ...patch };
  delete next._new;
  next.kind = workout.kind === 'race' ? 'run' : workout.kind;
  next.updated_at = nowIso();
  next.dirty = true;
  state.entries[k] = next;
  persist();
  emit();
  return next;
}

/* ---------------- exercises ---------------- */

export function getExercise(date, workoutId, exerciseId) {
  const k = exKey(date, workoutId, exerciseId);
  return state.exercises[k] || {
    date, workout_id: workoutId, exercise_id: exerciseId,
    done: false, load_kg: null, updated_at: null, dirty: false, _new: true,
  };
}

export function updateExercise(date, workoutId, exerciseId, patch) {
  const k = exKey(date, workoutId, exerciseId);
  const base = state.exercises[k] || getExercise(date, workoutId, exerciseId);
  const next = { ...base, ...patch };
  delete next._new;
  next.updated_at = nowIso();
  next.dirty = true;
  state.exercises[k] = next;
  persist();
  emit();
  return next;
}

/** Ultima carga registrada para um exercicio antes da data informada. */
export function lastLoad(exerciseId, beforeDate) {
  let best = null;
  for (const k in state.exercises) {
    const r = state.exercises[k];
    if (r.exercise_id !== exerciseId) continue;
    if (r.load_kg == null || r.load_kg === '') continue;
    if (beforeDate && r.date >= beforeDate) continue;
    if (!best || r.date > best.date) best = r;
  }
  return best; // {date, load_kg} | null
}

/* ---------------- variante de domingo ---------------- */

export function variantFor(date) {
  return (wid) => {
    const e = state.entries[entryKey(date, wid)];
    return e && e.variant ? e.variant : 'longao';
  };
}

/* ---------------- agregacoes ---------------- */

export function entriesInRange(startIso, endIso) {
  const out = [];
  for (const k in state.entries) {
    const e = state.entries[k];
    if (e.date >= startIso && e.date <= endIso) out.push(e);
  }
  return out;
}

export function allEntriesSorted() {
  return Object.values(state.entries)
    .filter((e) => e.status === 'done')
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/* ---------------- sync helpers ---------------- */

export function dirtyPayload() {
  const entries = [], exercises = [];
  for (const k in state.entries) if (state.entries[k].dirty) entries.push(state.entries[k]);
  for (const k in state.exercises) if (state.exercises[k].dirty) exercises.push(state.exercises[k]);
  return { entries, exercises };
}

export function clearDirty(payload) {
  payload.entries.forEach((e) => {
    const r = state.entries[entryKey(e.date, e.workout_id)];
    if (r && r.updated_at === e.updated_at) r.dirty = false;
  });
  payload.exercises.forEach((e) => {
    const r = state.exercises[exKey(e.date, e.workout_id, e.exercise_id)];
    if (r && r.updated_at === e.updated_at) r.dirty = false;
  });
  persist(true);
}

/** Aplica registros vindos do servidor (last-write-wins). */
export function mergeRemote({ entries = [], exercises = [] }) {
  let changed = 0;
  entries.forEach((r) => {
    const k = entryKey(r.date, r.workout_id);
    const cur = state.entries[k];
    if (!cur || (!cur.dirty && (!cur.updated_at || r.updated_at > cur.updated_at))) {
      state.entries[k] = { ...r, dirty: false };
      changed++;
    }
  });
  exercises.forEach((r) => {
    const k = exKey(r.date, r.workout_id, r.exercise_id);
    const cur = state.exercises[k];
    if (!cur || (!cur.dirty && (!cur.updated_at || r.updated_at > cur.updated_at))) {
      state.exercises[k] = { ...r, dirty: false };
      changed++;
    }
  });
  if (changed) { persist(true); emit(); }
  return changed;
}

/* ---------------- export / import / reset ---------------- */

export function exportJson() {
  return JSON.stringify({
    app: 'treino', schema: SCHEMA, exportedAt: nowIso(),
    entries: state.entries, exercises: state.exercises,
  }, null, 2);
}

export function importJson(text) {
  const data = JSON.parse(text);
  if (!data || (!data.entries && !data.exercises)) throw new Error('Arquivo invalido');
  Object.entries(data.entries || {}).forEach(([k, v]) => {
    state.entries[k] = { ...v, dirty: true };
  });
  Object.entries(data.exercises || {}).forEach(([k, v]) => {
    state.exercises[k] = { ...v, dirty: true };
  });
  persist(true);
  emit();
  return Object.keys(data.entries || {}).length + Object.keys(data.exercises || {}).length;
}

export function resetAll() {
  state.entries = {};
  state.exercises = {};
  state.lastPull = null;
  persist(true);
  emit();
}

export { todayIso, iso };
