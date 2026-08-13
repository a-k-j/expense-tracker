// js/views/dashboard.js — Main dashboard view

import { APP_VERSION } from '../config.js';

import {
  getTodayExpenses, getMonthExpenses, getCategories, sumByCategory, sumTotal,
  getSetting, setSetting,
} from '../db.js';
import { formatAmount, formatAmountShort, monthLabel, getMonthStart, getMonthEnd, getTodayStr, getSmartDefaultDate } from '../utils/date-utils.js';
import { renderExpenseList } from '../components/expense-list.js';
import { renderBarChart }    from '../components/chart.js';
import { renderCategoryGrid } from '../components/category-grid.js';
import { openAddExpense }    from '../components/expense-form.js';
import { showToast }         from '../components/toast.js';
import { createDatePicker }  from '../components/date-picker.js';

export async function renderDashboard(container) {
  container.innerHTML = `<div class="page" id="dashboard-page"><div class="spinner"></div></div>`;
  const page = container.querySelector('#dashboard-page');

  const [categories, todayExpenses, monthExpenses, budget, alertsSeen] = await Promise.all([
    getCategories(),
    getTodayExpenses(),
    getMonthExpenses(new Date().getFullYear(), new Date().getMonth()),
    getSetting('budget', 0),
    getSetting('budgetAlertsSeen', []),
  ]);

  const catMap     = Object.fromEntries(categories.map(c => [c.id, c]));
  const todayTotal = await sumTotal(todayExpenses);
  const monthTotal = await sumTotal(monthExpenses);
  const monthCatSum = await sumByCategory(monthExpenses);

  // Compute analytics-included totals (excludes expenses marked excludeFromAnalytics)
  const includedMonthExpenses = monthExpenses.filter(e => !e.excludeFromAnalytics);
  const includedMonthTotal = await sumTotal(includedMonthExpenses);
  const includedTodayTotal = await sumTotal(todayExpenses.filter(e => !e.excludeFromAnalytics));
  const hasExcluded = includedMonthTotal !== monthTotal;

  // Check budget alerts (uses full total — real spending)
  if (budget > 0) {
    await checkBudgetAlerts(monthTotal, budget, alertsSeen);
  }

  const budgetPct   = budget > 0 ? Math.min((includedMonthTotal / budget) * 100, 100) : 0;
  const warnClass   = budgetPct >= 100 ? 'warn-100' : budgetPct >= 90 ? 'warn-90' : budgetPct >= 75 ? 'warn-75' : budgetPct >= 50 ? 'warn-50' : '';

  page.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 16px">
      <div>
        <div style="font-size:13px;color:var(--text-muted);font-weight:500">${new Date().toLocaleDateString('en-IN',{weekday:'long'})}</div>
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px">SpendSense <span style="font-size:11px;font-weight:500;color:var(--text-muted);letter-spacing:0">v${APP_VERSION}</span></div>
      </div>
      <div style="font-size:28px">👋</div>
    </div>

    <!-- Balance hero card -->
    <div class="balance-card mb-md">
      <div class="balance-label">This Month · ${monthLabel()}</div>
      <div class="balance-amount">
        <span class="currency">₹</span>${includedMonthTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </div>
      ${hasExcluded ? `
      <div class="balance-actual-spend">
        Actual Spend: <span class="actual-val">${formatAmount(monthTotal)}</span>
      </div>` : ''}
      <div class="balance-meta">
        <div class="balance-meta-item">
          <span class="label">Today</span>
          <span class="value">${formatAmountShort(includedTodayTotal)}</span>
        </div>
        <div class="balance-meta-item">
          <span class="label">Entries</span>
          <span class="value">${monthExpenses.length}</span>
        </div>
        ${budget > 0 ? `
        <div class="balance-meta-item">
          <span class="label">Budget left</span>
          <span class="value" style="color:${budgetPct>=90?'#fca5a5':budgetPct>=75?'#fcd34d':'white'}">${formatAmountShort(Math.max(0, budget - includedMonthTotal))}</span>
        </div>` : ''}
      </div>
      ${budget > 0 ? `
      <div class="budget-progress">
        <div class="budget-progress-label">
          <span>Budget: ${formatAmountShort(budget)}</span>
          <span>${budgetPct.toFixed(0)}%</span>
        </div>
        <div class="budget-progress-track">
          <div class="budget-progress-fill ${warnClass}" style="width:0%" id="budget-fill"></div>
        </div>
      </div>` : ''}
    </div>

    <!-- Quick Add -->
    <div class="card mb-md">
      <div class="section-header mb-sm">
        <span class="section-title">Quick Add</span>
      </div>
      <div class="amount-input-wrapper mb-md" id="quick-amount-wrap">
        <span class="amount-currency-symbol">₹</span>
        <input
          type="number"
          id="quick-amount"
          class="amount-input"
          placeholder="0"
          inputmode="decimal"
          step="0.01"
          min="0"
          autocomplete="off"
          aria-label="Quick-add amount"
          style="font-size:28px"
        />
      </div>
      <div id="quick-cat-grid" class="category-grid mb-md"></div>
      <div class="form-field mb-md" id="quick-custom-name-wrapper" style="display:none;margin-top:12px">
        <input
          type="text"
          id="quick-custom-name"
          class="form-input"
          placeholder="Expense Name (e.g. WiFi Bill, Gift)"
          maxlength="60"
          autocomplete="off"
          aria-label="Expense custom name"
        />
      </div>
      <div class="form-field mb-md" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <label class="form-label" style="margin-bottom:0;font-size:13px;white-space:nowrap;color:var(--text-muted);">Date</label>
        <div id="quick-date-picker" style="max-width:180px"></div>
      </div>
      <div class="form-field mb-md">
        <div class="toggle-row">
          <div class="toggle-row-info">
            <div class="toggle-row-label">Exclude from Analytics</div>
            <div class="toggle-row-sub">Won't count in trends & reports</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="quick-exclude-analytics" />
            <span class="toggle-track"></span>
            <span class="toggle-knob"></span>
          </label>
        </div>
      </div>
      <button class="btn btn-primary" id="quick-add-btn" aria-label="Save expense">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Expense
      </button>
    </div>

    <!-- Monthly breakdown chart -->
    <div class="card mb-md">
      <div class="section-header">
        <span class="section-title">📊 Monthly Breakdown</span>
      </div>
      <div class="chart-container" id="month-chart"></div>
    </div>

    <!-- Recent expenses -->
    <div>
      <div class="section-header mb-sm">
        <span class="section-title">Recent Expenses</span>
        <button class="section-action" id="view-all-btn">View all</button>
      </div>
      <div id="recent-list"></div>
    </div>
  `;

  // Animate budget bar
  if (budget > 0) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const fill = document.getElementById('budget-fill');
      if (fill) fill.style.width = budgetPct + '%';
    }));
  }

  const updateQuickCustomNameVisibility = (id) => {
    const wrap = document.getElementById('quick-custom-name-wrapper');
    if (!wrap) return;
    const cat = catMap[id];
    const isOther = cat && cat.name.toLowerCase().startsWith('other');
    wrap.style.display = isOther ? 'block' : 'none';
  };

  // Render category quick-add grid
  let selectedQuickCat = categories[0]?.id ?? null;
  renderCategoryGrid(
    document.getElementById('quick-cat-grid'),
    categories,
    selectedQuickCat,
    (id) => {
      selectedQuickCat = id;
      updateQuickCustomNameVisibility(id);
    }
  );
  updateQuickCustomNameVisibility(selectedQuickCat);

  // Mount quick-add date picker
  let quickDateValue = getSmartDefaultDate();
  const quickDatePicker = createDatePicker({
    value: quickDateValue,
    max: getTodayStr(),
    id: 'quick-date',
    ariaLabel: 'Quick-add date',
    onChange: (val) => { quickDateValue = val; },
  });
  document.getElementById('quick-date-picker').appendChild(quickDatePicker);

  // Quick-add handler
  document.getElementById('quick-add-btn').addEventListener('click', async () => {
    const amountInput = document.getElementById('quick-amount');
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
      showToast('Enter a valid amount', 'warning');
      amountInput.focus();
      return;
    }
    if (!selectedQuickCat) {
      showToast('Select a category', 'warning');
      return;
    }
    const selectedCat = catMap[selectedQuickCat];
    const customName  = document.getElementById('quick-custom-name')?.value.trim() || '';
    if (selectedCat && selectedCat.name.toLowerCase().startsWith('other') && !customName) {
      showToast('Enter a name for this expense', 'warning');
      document.getElementById('quick-custom-name')?.focus();
      return;
    }
    const date = quickDateValue;

    const btn = document.getElementById('quick-add-btn');
    btn.disabled = true;
    try {
      const excludeFromAnalytics = document.getElementById('quick-exclude-analytics')?.checked || false;
      const { addExpense } = await import('../db.js');
      await addExpense({ amount, categoryId: selectedQuickCat, customName, date, excludeFromAnalytics });
      showToast(`${formatAmount(amount)} added ✓`, 'success');
      amountInput.value = '';
      const quickNameInput = document.getElementById('quick-custom-name');
      if (quickNameInput) quickNameInput.value = '';
      await refreshDashboard(container);
    } catch (e) {
      showToast('Failed to save', 'error');
      btn.disabled = false;
    }
  });

  // View all → switch to history
  document.getElementById('view-all-btn').addEventListener('click', () => {
    document.querySelector('[data-view="history"]')?.click();
  });

  // Render bar chart
  renderBarChart(document.getElementById('month-chart'), categories, monthCatSum);

  // Render recent (last 8)
  const recent = [...monthExpenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  renderExpenseList(
    document.getElementById('recent-list'),
    recent,
    catMap,
    () => refreshDashboard(container)
  );
}

async function refreshDashboard(container) {
  await renderDashboard(container);
}

// ── Budget alert logic ───────────────────────────────────────────────────────
const ALERT_THRESHOLDS = [50, 75, 90, 100];

async function checkBudgetAlerts(spent, budget, alertsSeen) {
  const pct = (spent / budget) * 100;
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM

  for (const threshold of ALERT_THRESHOLDS) {
    const key = `${month}-${threshold}`;
    if (pct >= threshold && !alertsSeen.includes(key)) {
      alertsSeen.push(key);
      await setSetting('budgetAlertsSeen', alertsSeen);

      const type    = threshold >= 100 ? 'error' : threshold >= 90 ? 'warning' : 'info';
      const emoji   = threshold >= 100 ? '🚨' : threshold >= 90 ? '⚠️' : threshold >= 75 ? '🔶' : '📢';
      const msg     = threshold >= 100
        ? `${emoji} Budget exceeded! You've spent ${formatAmount(spent)}`
        : `${emoji} ${threshold}% of budget used — ${formatAmountShort(spent)} of ${formatAmountShort(budget)}`;
      showToast(msg, type, 6000);
    }
  }
}
