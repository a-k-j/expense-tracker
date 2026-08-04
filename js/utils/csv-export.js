// js/utils/csv-export.js — CSV generation and download

import { formatAmount } from './date-utils.js';

/**
 * Download expenses as CSV
 * @param {Array} expenses - expense records
 * @param {Object} categoryMap - { id: category }
 * @param {string} filename - suggested filename
 */
export function exportCSV(expenses, categoryMap, filename = 'expenses.csv') {
  const rows = [
    ['Date', 'Time', 'Amount (INR)', 'Category', 'Expense Name', 'Note'],
  ];

  for (const e of expenses) {
    const cat = categoryMap[e.categoryId];
    const time = e.createdAt ? new Date(e.createdAt).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    }) : '';
    const catName = cat ? cat.name : 'Unknown';
    const customName = e.customName || '';
    rows.push([
      e.date,
      time,
      e.amount.toFixed(2),
      `"${catName.replace(/"/g, '""')}"`,
      `"${customName.replace(/"/g, '""')}"`,
      `"${(e.note || '').replace(/"/g, '""')}"`,
    ]);
  }

  const csv = rows.map(r => r.join(',')).join('\r\n');
  downloadText(csv, filename, 'text/csv;charset=utf-8;');
}

/**
 * Generic text file download trigger
 */
export function downloadText(content, filename, mimeType = 'text/plain') {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // BOM for Excel compat
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 200);
}

export function csvFilename(start, end) {
  return `spendsense_${start}_to_${end}.csv`;
}
