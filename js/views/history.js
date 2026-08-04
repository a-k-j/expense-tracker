// js/views/history.js — Full expense history with filters

import { getCategories, getExpensesByDateRange, sumTotal } from '../db.js';
import { formatAmount, toDateStr, getMonthStart, getMonthEnd, monthLabel } from '../utils/date-utils.js';
import { renderExpenseList } from '../components/expense-list.js';

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

  page.innerHTML = `
    <!-- Header -->
    <div class="page-header" style="position:relative;top:0;padding:12px 0 8px">
      <h1 class="page-title">History</h1>
    </div>

    <!-- Date Range -->
    <div class="date-range-row mb-md">
      <input type="date" id="hist-start" class="form-input" value="${startDate}" max="${toDateStr(new Date())}" aria-label="Start date" />
      <span style="color:var(--text-muted);align-self:center;flex-shrink:0;font-weight:600">→</span>
      <input type="date" id="hist-end"   class="form-input" value="${endDate}"   max="${toDateStr(new Date())}" aria-label="End date" />
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
    const start = new Date(document.getElementById('hist-start').value);
    const end   = new Date(document.getElementById('hist-end').value);
    if (isNaN(start) || isNaN(end) || start > end) return;

    let expenses = await getExpensesByDateRange(start, end);

    // Filter by category
    if (activeCatId !== null) {
      expenses = expenses.filter(e => e.categoryId === activeCatId);
    }

    const total = await sumTotal(expenses);
    document.getElementById('hist-total').textContent = formatAmount(total);
    document.getElementById('hist-count').textContent = expenses.length;

    renderExpenseList(document.getElementById('hist-list'), expenses, catMap, loadData);
  }

  // Date range listeners
  document.getElementById('hist-start').addEventListener('change', (e) => {
    startDate = e.target.value;
    loadData();
  });
  document.getElementById('hist-end').addEventListener('change', (e) => {
    endDate = e.target.value;
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
