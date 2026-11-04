// js/views/history.js — Full expense history with filters

import { getCategories, getExpensesByDateRange, sumTotal } from '../db.js';
import { formatAmount, toDateStr, getMonthStart, getMonthEnd, monthLabel } from '../utils/date-utils.js';
import { renderExpenseList } from '../components/expense-list.js';
import { createDatePicker } from '../components/date-picker.js';

export async function renderHistory(container) {
  container.innerHTML = `<div class="page" id="history-page"></div>`;
  const page = document.getElementById('history-page');

  const categories = await getCategories();
  const catMap     = Object.fromEntries(categories.map(c => [c.id, c]));

  // Default range: this month
  const defaultStart = toDateStr(getMonthStart());
  const defaultEnd   = toDateStr(getMonthEnd());

  let startDate  = defaultStart;
  let endDate    = defaultEnd;
  let activeCatId = null; // null = all
  let sortOrder   = 'desc'; // 'desc' = newest first, 'asc' = oldest first

  page.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0 16px">
      <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.5px">History</h1>
      <button class="filter-chip" id="hist-sort-btn" type="button" aria-label="Sort expenses: newest first" aria-pressed="false">
        <span id="hist-sort-label">↓ Newest first</span>
      </button>
    </div>

    <!-- Date Range -->
    <div class="date-range-row mb-md">
      <div id="hist-start-picker"></div>
      <span style="color:var(--text-muted);align-self:center;flex-shrink:0;font-weight:600;display:flex;align-items:center;padding:0 4px">→</span>
      <div id="hist-end-picker"></div>
    </div>

    <!-- Category filter chips -->
    <div class="filter-chips mb-md" id="cat-chips" role="group" aria-label="Filter by category">
      <button class="filter-chip active" data-cat="" aria-pressed="true">All</button>
      ${categories.map(c => `
        <button class="filter-chip" data-cat="${c.id}" aria-pressed="false">
          ${c.emoji} ${c.name}
        </button>
      `).join('')}
    </div>

    <!-- Total summary -->
    <div class="card mb-md" id="hist-summary" style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600">Total</div>
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px" id="hist-total">—</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600">Entries</div>
        <div style="font-size:22px;font-weight:800" id="hist-count">—</div>
      </div>
    </div>

    <!-- Expense list -->
    <div id="hist-list"></div>
  `;

  async function loadData() {
    if (!startDate || !endDate || startDate > endDate) return;

    let expenses = await getExpensesByDateRange(startDate, endDate);

    // Filter by category
    if (activeCatId !== null) {
      expenses = expenses.filter(e => e.categoryId === activeCatId);
    }

    const total = await sumTotal(expenses);
    document.getElementById('hist-total').textContent = formatAmount(total);
    document.getElementById('hist-count').textContent = expenses.length;

    renderExpenseList(document.getElementById('hist-list'), expenses, catMap, loadData, sortOrder);
  }

  // Mount custom date pickers
  let endPickerEl = null;

  const startPickerEl = createDatePicker({
    value: startDate,
    id: 'hist-start',
    ariaLabel: 'Start date',
    onChange: (val) => {
      startDate = val;
      // Keep the range valid: if "from" moves past "to", snap "to" to that month's end
      if (startDate > endDate) {
        endDate = toDateStr(getMonthEnd(new Date(startDate + 'T00:00:00')));
        endPickerEl?._setValue(endDate);
      }
      loadData();
    },
  });
  document.getElementById('hist-start-picker').appendChild(startPickerEl);

  endPickerEl = createDatePicker({
    value: endDate,
    id: 'hist-end',
    ariaLabel: 'End date',
    onChange: (val) => { endDate = val; loadData(); },
  });
  document.getElementById('hist-end-picker').appendChild(endPickerEl);

  // Sort order toggle
  const sortBtn = document.getElementById('hist-sort-btn');
  sortBtn.addEventListener('click', () => {
    sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    const oldestFirst = sortOrder === 'asc';
    document.getElementById('hist-sort-label').textContent = oldestFirst ? '↑ Oldest first' : '↓ Newest first';
    sortBtn.setAttribute('aria-pressed', String(oldestFirst));
    sortBtn.setAttribute('aria-label', `Sort expenses: ${oldestFirst ? 'oldest' : 'newest'} first`);
    loadData();
  });

  // Category chip listeners
  document.getElementById('cat-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    document.querySelectorAll('#cat-chips .filter-chip').forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-pressed', 'false');
    });
    chip.classList.add('active');
    chip.setAttribute('aria-pressed', 'true');

    const val = chip.dataset.cat;
    activeCatId = val === '' ? null : parseInt(val, 10);
    loadData();
  });

  await loadData();
}
