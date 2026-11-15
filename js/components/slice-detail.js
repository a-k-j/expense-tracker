// js/components/slice-detail.js — Bottom sheet listing the entries behind a chart slice

import { formatAmount, formatDate } from '../utils/date-utils.js';
import { addSwipeDownClose } from '../utils/sheet-swipe.js';

let sheetEl = null;
let overlayEl = null;
let overlayHandler = null;

function ensureOverlay() {
  if (!overlayEl) overlayEl = document.getElementById('modal-overlay');
  return overlayEl;
}

function onKeyDown(e) {
  if (e.key === 'Escape') closeSliceDetail();
}

export function closeSliceDetail() {
  document.removeEventListener('keydown', onKeyDown);
  const overlay = ensureOverlay();
  if (overlayHandler) {
    overlay.removeEventListener('click', overlayHandler);
    overlayHandler = null;
  }
  overlay.classList.remove('active');
  if (!sheetEl) return;
  const el = sheetEl;
  sheetEl = null;
  el.classList.remove('open');
  setTimeout(() => el.remove(), 400);
}

/**
 * Open a bottom sheet with the transactions that make up a chart slice.
 * @param {object} opts
 * @param {string} opts.title       - Slice label
 * @param {string} [opts.subtitle]  - Small line under the title
 * @param {number} [opts.total]     - Slice total
 * @param {Array}  [opts.items]     - Expense entries behind the slice
 * @param {Object} [opts.catMap]    - { categoryId: category }
 * @param {string} [opts.emptyText] - Message when there are no entries
 */
export function openSliceDetail({
  title,
  subtitle = '',
  total = null,
  items = [],
  catMap = {},
  emptyText = 'No entries to show.',
}) {
  closeSliceDetail();

  const overlay = ensureOverlay();
  const rows = [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });

  const count = rows.length;
  const sub = subtitle || (count ? `${count} ${count === 1 ? 'entry' : 'entries'}` : '');

  const list = rows.length
    ? `<div class="slice-detail-list">${rows.map(e => {
        const cat = catMap[e.categoryId] || { name: 'Other', emoji: '📦' };
        const titleText = e.customName || e.note || cat.name;
        const metaParts = [formatDate(e.date), cat.name];
        if (e.customName && e.note) metaParts.push(e.note);
        return `
          <div class="slice-detail-row">
            <div class="slice-detail-row-emoji">${cat.emoji || '📦'}</div>
            <div class="slice-detail-row-main">
              <div class="slice-detail-row-title">${escapeHtml(titleText)}</div>
              <div class="slice-detail-row-meta">${escapeHtml(metaParts.join(' · '))}</div>
            </div>
            <div class="slice-detail-row-amount">${formatAmount(e.amount)}</div>
          </div>`;
      }).join('')}</div>`
    : `<p class="analytics-note" style="margin:0">${escapeHtml(emptyText)}</p>`;

  sheetEl = document.createElement('div');
  sheetEl.className = 'bottom-sheet slice-detail-sheet';
  sheetEl.setAttribute('role', 'dialog');
  sheetEl.setAttribute('aria-modal', 'true');
  sheetEl.setAttribute('aria-label', title);
  sheetEl.innerHTML = `
    <div class="bottom-sheet-handle"></div>
    <h2 class="bottom-sheet-title">${escapeHtml(title)}</h2>
    ${sub ? `<p class="slice-detail-sub">${escapeHtml(sub)}</p>` : ''}
    ${total !== null ? `<div class="slice-detail-total">${formatAmount(total)}</div>` : ''}
    ${list}
    <button class="btn btn-secondary" id="slice-detail-close" style="width:100%;margin-top:16px">Close</button>
  `;

  document.body.appendChild(sheetEl);
  addSwipeDownClose(sheetEl, closeSliceDetail);
  requestAnimationFrame(() => {
    overlay.classList.add('active');
    sheetEl.classList.add('open');
  });

  overlayHandler = (e) => {
    if (e.target === overlay) closeSliceDetail();
  };
  overlay.addEventListener('click', overlayHandler);
  document.addEventListener('keydown', onKeyDown);

  sheetEl.querySelector('#slice-detail-close').addEventListener('click', closeSliceDetail);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
