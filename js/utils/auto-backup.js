// js/utils/auto-backup.js — On-device automatic snapshots with rotation

import { db, getSetting, setSetting } from '../db.js';
import { restoreFromPayload } from './json-backup.js';

const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // once per day
const DEFAULT_RETENTION = 7;
const MIN_RETENTION = 1;
const MAX_RETENTION = 50;

// These are managed by the app and deliberately kept out of snapshot payloads.
const BACKUP_SETTING_KEYS = new Set([
  'autoBackupEnabled',
  'autoBackupRetention',
  'lastBackupAt',
]);

let persistRequested = false;

function clampRetention(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return DEFAULT_RETENTION;
  return Math.min(MAX_RETENTION, Math.max(MIN_RETENTION, n));
}

function requestPersistentStorage() {
  if (persistRequested) return;
  persistRequested = true;
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch (_) { /* storage API unavailable */ }
}

async function buildBackupPayload() {
  const [expenses, categories, settings] = await Promise.all([
    db.expenses.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    expenses,
    categories,
    settings: settings.filter(s => !BACKUP_SETTING_KEYS.has(s.key)),
  };
}

async function hasDataChangedSinceLastBackup() {
  const latest = await db.backups.orderBy('createdAt').last();
  if (!latest?.payload) return true;

  const current = await buildBackupPayload();
  const normalize = (arr = []) =>
    JSON.stringify([...arr].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));

  return (
    normalize(current.expenses) !== normalize(latest.payload.expenses) ||
    normalize(current.categories) !== normalize(latest.payload.categories) ||
    normalize(current.settings) !== normalize(latest.payload.settings)
  );
}

async function getAutoBackupsNewestFirst() {
  const rows = await db.backups.where('type').equals('auto').toArray();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function addBackupRecord(record) {
  try {
    return await db.backups.add(record);
  } catch (err) {
    if (err?.name !== 'QuotaExceededError') throw err;

    // Free space by removing the oldest automatic snapshot, then retry once.
    const autoBackups = await getAutoBackupsNewestFirst();
    if (!autoBackups.length) throw err;
    await db.backups.delete(autoBackups[autoBackups.length - 1].id);
    return db.backups.add(record);
  }
}

export async function getAutoBackupConfig() {
  const [enabled, retention, storedLast, latest] = await Promise.all([
    getSetting('autoBackupEnabled', true),
    getSetting('autoBackupRetention', DEFAULT_RETENTION),
    getSetting('lastBackupAt', null),
    db.backups.orderBy('createdAt').last(),
  ]);

  return {
    enabled: enabled !== false,
    retention: clampRetention(retention),
    lastBackupAt: storedLast || latest?.createdAt || null,
  };
}

export async function setAutoBackupEnabled(enabled) {
  await setSetting('autoBackupEnabled', !!enabled);
}

export async function pruneAutoBackups(retention) {
  const limit = clampRetention(retention);
  const autoBackups = await getAutoBackupsNewestFirst();
  const excess = autoBackups.slice(limit);
  if (excess.length) {
    await db.backups.bulkDelete(excess.map(b => b.id));
  }
  return excess.length;
}

export async function setAutoBackupRetention(retention) {
  const normalized = clampRetention(retention);
  await setSetting('autoBackupRetention', normalized);
  await pruneAutoBackups(normalized);
  return normalized;
}

export async function getBackupList() {
  const rows = await db.backups.orderBy('createdAt').reverse().toArray();
  return rows.map(({ payload, ...meta }) => meta);
}

export async function createBackup({ type = 'auto' } = {}) {
  const payload = await buildBackupPayload();
  const size = new Blob([JSON.stringify(payload)]).size;
  const createdAt = new Date().toISOString();

  const id = await addBackupRecord({
    type,
    createdAt,
    schemaVersion: payload.version,
    size,
    payload,
  });

  await setSetting('lastBackupAt', createdAt);

  if (type === 'auto') {
    const retention = await getSetting('autoBackupRetention', DEFAULT_RETENTION);
    await pruneAutoBackups(retention);
  }

  return { id, createdAt, size };
}

/**
 * Create a snapshot if auto-backup is enabled and the last one is over a day old.
 */
export async function maybeRunAutoBackup() {
  const { enabled, lastBackupAt } = await getAutoBackupConfig();
  if (!enabled) return null;

  if (lastBackupAt) {
    const lastMs = new Date(lastBackupAt).getTime();
    if (Number.isFinite(lastMs) && Date.now() - lastMs < AUTO_BACKUP_INTERVAL_MS) {
      return null;
    }
  }

  // Don't rotate out meaningful snapshots just because the app was opened another day.
  if (!(await hasDataChangedSinceLastBackup())) return null;

  requestPersistentStorage();
  return createBackup({ type: 'auto' });
}

export async function deleteBackup(id) {
  return db.backups.delete(id);
}

export async function restoreBackup(id) {
  const backup = await db.backups.get(id);
  if (!backup) throw new Error('Backup not found.');

  // Preserve the user's current automatic-backup settings across a restore.
  const { enabled, retention } = await getAutoBackupConfig();

  const result = await restoreFromPayload(backup.payload, false);

  await setSetting('autoBackupEnabled', enabled);
  await setSetting('autoBackupRetention', retention);
  await setSetting('lastBackupAt', new Date().toISOString());

  return result;
}
