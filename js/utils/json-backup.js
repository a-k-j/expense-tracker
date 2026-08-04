// js/utils/json-backup.js — JSON export/import for full data backup

import { db, seedIfEmpty } from '../db.js';
import { downloadText } from './csv-export.js';

export async function exportJSON() {
  const [expenses, categories, settings] = await Promise.all([
    db.expenses.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
  ]);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    expenses,
    categories,
    settings,
  };

  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  downloadText(json, `spendsense_backup_${date}.json`, 'application/json');
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
        if (!data.version || !data.expenses || !data.categories) {
          throw new Error('Invalid backup file format.');
        }

        if (!merge) {
          // Clear existing data
          await db.transaction('rw', db.expenses, db.categories, db.settings, async () => {
            await db.expenses.clear();
            await db.categories.clear();
            await db.settings.clear();
          });
        }

        // Re-import
        await db.transaction('rw', db.expenses, db.categories, db.settings, async () => {
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
        });

        resolve({ expenses: data.expenses.length, categories: data.categories.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
