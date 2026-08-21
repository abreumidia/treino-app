/**
 * sync.js — sincronizacao com a API PHP/MySQL.
 * Offline-first: nunca bloqueia a UI. Se falhar, os dados continuam locais
 * e sao reenviados na proxima oportunidade.
 */

import {
  config, state, dirtyPayload, clearDirty, mergeRemote, persist, emit,
} from './store.js';
import { debounce } from './utils.js';

export const sync = {
  status: 'off',   // off | ok | sync | err
  lastError: null,
  lastAt: null,
};

const statusListeners = new Set();
export function onSyncStatus(fn) { statusListeners.add(fn); return () => statusListeners.delete(fn); }
function setStatus(s, err = null) {
  sync.status = s;
  sync.lastError = err;
  if (s === 'ok') sync.lastAt = new Date().toISOString();
  statusListeners.forEach((fn) => { try { fn(sync); } catch (_) {} });
}

function apiUrl(action) {
  const base = (config.apiUrl || 'api/index.php').replace(/\?$/, '');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}action=${encodeURIComponent(action)}`;
}

async function call(action, body, method = 'GET', extraQuery = '') {
  const url = apiUrl(action) + extraQuery;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': config.appKey || '',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch (_) { throw new Error(`Resposta invalida do servidor (${res.status})`); }
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `Erro ${res.status}`);
  }
  return json;
}

export async function ping() {
  return call('ping');
}

let running = false;
let pendingAgain = false;

export async function runSync({ silent = true } = {}) {
  if (!config.syncEnabled || !config.appKey) { setStatus('off'); return { skipped: true }; }
  if (!navigator.onLine) { setStatus('err', 'Sem conexao'); return { skipped: true }; }
  if (running) { pendingAgain = true; return { queued: true }; }

  running = true;
  setStatus('sync');
  try {
    // 1. empurra alteracoes locais
    const payload = dirtyPayload();
    if (payload.entries.length || payload.exercises.length) {
      await call('push', payload, 'POST');
      clearDirty(payload);
    }

    // 2. puxa alteracoes remotas
    const since = state.lastPull ? `&since=${encodeURIComponent(state.lastPull)}` : '';
    const res = await call('pull', null, 'GET', since);
    mergeRemote({ entries: res.entries || [], exercises: res.exercises || [] });
    state.lastPull = res.serverTime || new Date().toISOString();
    persist(true);

    setStatus('ok');
    emit();
    return { ok: true, pulled: (res.entries || []).length + (res.exercises || []).length };
  } catch (e) {
    console.warn('[sync]', e);
    setStatus('err', e.message);
    if (!silent) throw e;
    return { ok: false, error: e.message };
  } finally {
    running = false;
    if (pendingAgain) { pendingAgain = false; setTimeout(() => runSync(), 400); }
  }
}

export const scheduleSync = debounce(() => runSync(), 1500);

export function initSync() {
  if (!config.syncEnabled) { setStatus('off'); return; }
  runSync();
  window.addEventListener('online', () => runSync());
  window.addEventListener('offline', () => setStatus('err', 'Sem conexao'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') runSync();
  });
  setInterval(() => runSync(), 5 * 60 * 1000);
}
