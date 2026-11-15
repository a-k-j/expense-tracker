// js/utils/json-backup.js — JSON export/import for full data backup

import { db, seedIfEmpty } from '../db.js';
import { downloadText } from './csv-export.js';

export async function exportJSON() {
  const [expenses, categories, settings, incomes] = await Promise.all([
    db.expenses.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
    db.incomes.toArray(),
  ]);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    expenses,
    categories,
    settings,
    incomes,
  };

  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  downloadText(json, `spendsense_backup_${date}.json`, 'application/json');
}

/**
 * Restore from an already-parsed backup payload.
 * @param {object} data - Backup payload with version, expenses, categories, settings and (optionally) incomes
 * @param {boolean} merge - true = merge, false = replace all
 */
export async function restoreFromPayload(data, merge = false) {
  if (!data.version || !data.expenses || !data.categories) {
    throw new Error('Invalid backup file format.');
  }

  const incomes = Array.isArray(data.incomes) ? data.incomes : [];

  if (!merge) {
    // Clear existing data
    await db.transaction('rw', db.expenses, db.categories, db.settings, db.incomes, async () => {
      await db.expenses.clear();
      await db.categories.clear();
      await db.settings.clear();
      await db.incomes.clear();
    });
  }

  // Re-import
  await db.transaction('rw', db.expenses, db.categories, db.settings, db.incomes, async () => {
    if (!merge) {
      await db.categories.bulkAdd(data.categories);
      await db.expenses.bulkAdd(data.expenses);
    } else {
      await db.categories.bulkPut(data.categories);
      await db.expenses.bulkPut(data.expenses);
    }
    if (data.settings) {
      await db.settings.bulkPut(data.settings);
    }
    if (incomes.length) {
      if (merge) await db.incomes.bulkPut(incomes);
      else await db.incomes.bulkAdd(incomes);
    }
  });

  // Older backups have no buckets / salary settings / seeded categories.
  await seedIfEmpty();

  return { expenses: data.expenses.length, categories: data.categories.length, incomes: incomes.length };
}

/**
 * Import from a JSON backup file
 * @param {File} file - JSON file from input[type=file]
 * @param {boolean} merge - true = merge, false = replace all
 */
export async function importJSON(file, merge = false) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(await restoreFromPayload(data, merge));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
