// js/views/analytics.js — Lifestyle analytics + Money Flow (salary allocation)

import {
  getCategories, getExpensesByDateRangeForAnalytics, getDailyTotalsForAnalytics,
  sumByCategory, sumTotal, getAllExpenses, getAllIncomes, deleteIncome,
  getSetting, categoryBucket,
} from '../db.js';
import {
  formatAmount, formatAmountShort,
  getThisWeekRange, getPrevWeekRange,
  getMonthStart, getMonthEnd,
  toDateStr, getTodayStr, dateRange, shortDayDate,
} from '../utils/date-utils.js';
import { renderBarChart, renderTrendLine, renderDonutChart, renderGroupedBars } from '../components/chart.js';
import { openIncomeModal, openSalaryModal } from '../components/income-form.js';
import { openSliceDetail } from '../components/slice-detail.js';
import { showToast } from '../components/toast.js';
import { showConfirm } from '../components/confirm-dialog.js';

const BUCKET_COLORS = {
  rent:        'hsl(190, 80%, 45%)',
  lifestyle:   'hsl(270, 65%, 58%)',
  investment:  'hsl(150, 70%, 42%)',
  savings:     'hsl(210, 70%, 50%)',
  left:        'hsl(220, 15%, 62%)',
  overspent:   'hsl(350, 75%, 55%)',
};

let analyticsMode = 'lifestyle';
let lifestyleMonth = null;
let moneyFlowMonth = null;

export async function renderAnalytics(container) {
  container.innerHTML = `
    <div class="page" id="analytics-page">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 12px">
        <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.5px">Analytics</h1>
      </div>

      <div class="segmented-control" role="tablist" aria-label="Analytics mode">
        <button class="segment-btn ${analyticsMode === 'lifestyle' ? 'active' : ''}"
                data-mode="lifestyle" role="tab" aria-selected="${analyticsMode === 'lifestyle'}">Lifestyle</button>
        <button class="segment-btn ${analyticsMode === 'moneyflow' ? 'active' : ''}"
                data-mode="moneyflow" role="tab" aria-selected="${analyticsMode === 'moneyflow'}">Money Flow</button>
      </div>

      <div id="analytics-body"></div>
    </div>
  `;

  const page = document.getElementById('analytics-page');
  const body = document.getElementById('analytics-body');

  const renderBody = async () => {
    if (analyticsMode === 'lifestyle') await renderLifestyleBody(body);
    else await renderMoneyFlowBody(body);
  };

  page.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.mode;
      if (next === analyticsMode) return;
      analyticsMode = next;
      page.querySelectorAll('.segment-btn').forEach(b => {
        const active = b.dataset.mode === analyticsMode;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      renderBody();
    });
  });

  await renderBody();
}

// ── Lifestyle mode (existing behaviour) ──────────────────────────────────────
async function renderLifestyleBody(body) {
  body.innerHTML = `<div class="spinner"></div>`;

  const categories   = await getCategories();
  const thisWeek     = getThisWeekRange();
  const prevWeek     = getPrevWeekRange();
  const today        = getTodayStr();
  const currentMonth = today.slice(0, 7);
  const currentMonthStart = getMonthStart();
  const currentMonthEnd   = getMonthEnd();

  const [thisWeekExp, prevWeekExp, allExpenses] = await Promise.all([
    getExpensesByDateRangeForAnalytics(thisWeek.start, thisWeek.end),
    getExpensesByDateRangeForAnalytics(prevWeek.start, prevWeek.end),
    getAllExpenses(),
  ]);

  // Months that have actual expenses, plus the current month.
  const monthSet = new Set([currentMonth]);
  allExpenses.forEach(e => { if (e.date) monthSet.add(e.date.slice(0, 7)); });
  const months = [...monthSet].sort();
  if (!lifestyleMonth || !months.includes(lifestyleMonth)) lifestyleMonth = currentMonth;

  const selectedRange = monthRange(lifestyleMonth);
  const [currentMonthExpFromFetch, selectedMonthExp] = await Promise.all([
    lifestyleMonth === currentMonth
      ? Promise.resolve(null)
      : getExpensesByDateRangeForAnalytics(currentMonthStart, currentMonthEnd),
    getExpensesByDateRangeForAnalytics(selectedRange.start, selectedRange.end),
  ]);
  const currentMonthExp = lifestyleMonth === currentMonth
    ? selectedMonthExp
    : (currentMonthExpFromFetch || []);

  const thisWeekTotal      = await sumTotal(thisWeekExp);
  const prevWeekTotal      = await sumTotal(prevWeekExp);
  const currentMonthTotal  = await sumTotal(currentMonthExp);
  const selectedMonthTotal = await sumTotal(selectedMonthExp);

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const lifestyleByCat = aggregateByCategory(selectedMonthExp, catMap);

  // Daily totals for trend line (last 30 days) — analytics-filtered
  const trendEnd   = new Date();
  const trendStart = new Date();
  trendStart.setDate(trendStart.getDate() - 29);
  const dailyMap = await getDailyTotalsForAnalytics(trendStart, trendEnd);
  const trendDates  = dateRange(trendStart, trendEnd);
  const trendValues = trendDates.map(d => dailyMap[d] || 0);

  // Week delta
  const delta    = thisWeekTotal - prevWeekTotal;
  const deltaPct = prevWeekTotal > 0 ? Math.abs((delta / prevWeekTotal) * 100).toFixed(0) : null;
  const deltaUp  = delta > 0;
  const deltaBadgeClass = delta === 0 ? 'neutral' : deltaUp ? 'up' : 'down';
  const deltaText = delta === 0 ? '—'
    : `${deltaUp ? '▲' : '▼'} ${deltaPct !== null ? deltaPct + '%' : formatAmountShort(Math.abs(delta))}`;

  const weekMax = Math.max(thisWeekTotal, prevWeekTotal) || 1;

  const maxTrendValue = Math.max(...trendValues);
  const highestDayStat = maxTrendValue > 0
    ? trendStat('Highest Day', maxTrendValue, trendDates[trendValues.indexOf(maxTrendValue)])
    : trendStat('Highest Day', 0, null);
  const daysElapsedInMonth = new Date().getDate();
  const avgPerDay = daysElapsedInMonth > 0 ? (currentMonthTotal / daysElapsedInMonth) : 0;
  const monthCatSum = await sumByCategory(selectedMonthExp);

  body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:flex-end;padding:0 0 10px">
      <span class="delta-badge ${deltaBadgeClass}">${deltaText} vs last week</span>
    </div>

    <!-- Week-over-Week -->
    <div class="analytics-card">
      <div class="analytics-card-title">📅 Week-over-Week</div>

      <div class="week-compare-row">
        <div class="week-compare-label">This week</div>
        <div class="week-compare-track">
          <div class="week-compare-fill" id="this-week-bar"
               style="width:0%;background:var(--accent-light)"></div>
        </div>
        <div class="week-compare-value" style="color:var(--text-primary)">${formatAmountShort(thisWeekTotal)}</div>
      </div>
      <div class="week-compare-row">
        <div class="week-compare-label">Last week</div>
        <div class="week-compare-track">
          <div class="week-compare-fill" id="prev-week-bar"
               style="width:0%;background:var(--text-muted)"></div>
        </div>
        <div class="week-compare-value" style="color:var(--text-secondary)">${formatAmountShort(prevWeekTotal)}</div>
      </div>

      <div class="divider"></div>
      <div class="analytics-card-title" style="margin-top:4px">Daily Breakdown — This Week</div>
      <div id="this-week-days"></div>
    </div>

    <!-- 30-Day Trend -->
    <div class="analytics-card">
      <div class="analytics-card-title">📈 30-Day Spending Trend</div>
      <div id="trend-chart-container" class="trend-chart"></div>

      <div class="divider"></div>
      <div style="display:flex;gap:16px;justify-content:space-between">
        ${highestDayStat}
        ${trendStat('Avg / Day', avgPerDay, null)}
        ${trendStat('This Month', currentMonthTotal, null)}
      </div>
    </div>

    <!-- Monthly Category Donut -->
    <div class="analytics-card">
      <div class="mf-month-bar" style="margin-bottom:12px">
        <div>
          <div class="analytics-card-title" style="margin:0">🥧 Where It Went</div>
          <div class="mf-month-sub">${monthLong(lifestyleMonth)} · lifestyle only</div>
        </div>
        <select id="lf-month-select" class="form-input mf-month-select" aria-label="Select lifestyle month">
          ${[...months].reverse().map(m => `<option value="${m}" ${m === lifestyleMonth ? 'selected' : ''}>${monthShort(m)}</option>`).join('')}
        </select>
      </div>
      <div id="lifestyle-donut"></div>
      <p class="analytics-note" style="margin:12px 0 0">Tap a slice or legend row to see the transactions behind it.</p>
    </div>

    <!-- Monthly Category Breakdown -->
    <div class="analytics-card">
      <div class="analytics-card-title">🗂️ ${monthLong(lifestyleMonth)} — By Category</div>
      <div class="chart-container" id="cat-chart"></div>
    </div>

    <p class="analytics-note">Lifestyle excludes rent, investments, savings and anything marked “exclude from analytics”.</p>
  `;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    const thisBar = document.getElementById('this-week-bar');
    const prevBar = document.getElementById('prev-week-bar');
    if (thisBar) thisBar.style.width = ((thisWeekTotal / weekMax) * 100) + '%';
    if (prevBar) prevBar.style.width = ((prevWeekTotal / weekMax) * 100) + '%';
  }));

  await renderWeekDays(document.getElementById('this-week-days'), thisWeek);

  renderTrendLine(
    document.getElementById('trend-chart-container'),
    trendDates,
    trendValues,
    'var(--accent-light)'
  );

  renderDonutChart(
    document.getElementById('lifestyle-donut'),
    topSlices(lifestyleByCat, 6),
    {
      centerValue: formatAmountShort(selectedMonthTotal),
      centerLabel: 'Lifestyle',
      percentBase: selectedMonthTotal || 1,
      emptyText: 'No lifestyle spending this month',
      onSliceClick: (slice) => openSliceDetail({
        title: slice.label,
        subtitle: `${monthLong(lifestyleMonth)} · ${(slice.items || []).length} entries`,
        total: slice.value,
        items: slice.items || [],
        catMap,
        emptyText: 'No transactions behind this slice.',
      }),
    }
  );

  renderBarChart(document.getElementById('cat-chart'), categories, monthCatSum);

  document.getElementById('lf-month-select').addEventListener('change', (e) => {
    lifestyleMonth = e.target.value;
    renderLifestyleBody(body);
  });
}

// ── Money Flow mode ──────────────────────────────────────────────────────────
async function renderMoneyFlowBody(body) {
  body.innerHTML = `<div class="spinner"></div>`;

  const [categories, allExpenses, allIncomes, salaryOverrides, defaultSalary, rolloverEnabled, rolloverNegative] = await Promise.all([
    getCategories(),
    getAllExpenses(),
    getAllIncomes(),
    getSetting('salaryByMonth', {}),
    getSetting('defaultSalary', 0),
    getSetting('rolloverEnabled', false),
    getSetting('rolloverNegative', false),
  ]);

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const today = getTodayStr();
  const currentMonth = today.slice(0, 7);

  const actualExpenses = allExpenses.filter(e => e.date <= today);
  const actualIncomes  = allIncomes.filter(i => i.date <= today);

  // Months that have actual data, salary overrides, or the current month.
  const monthSet = new Set([currentMonth]);
  actualExpenses.forEach(e => monthSet.add(e.date.slice(0, 7)));
  actualIncomes.forEach(i => monthSet.add(i.date.slice(0, 7)));
  Object.keys(salaryOverrides || {}).forEach(m => { if (m <= currentMonth) monthSet.add(m); });
  const months = [...monthSet].sort();

  if (!moneyFlowMonth || !months.includes(moneyFlowMonth)) moneyFlowMonth = currentMonth;

  const hasOverride = (m) => Object.prototype.hasOwnProperty.call(salaryOverrides || {}, m);
  const salaryFor = (m) => hasOverride(m) ? (Number(salaryOverrides[m]) || 0) : (Number(defaultSalary) || 0);

  const bucketOf = (e) => categoryBucket(catMap[e.categoryId]);
  const isRent = (e) => /rent/i.test(catMap[e.categoryId]?.name || '');
  const sum = (arr) => arr.reduce((total, e) => total + (Number(e.amount) || 0), 0);

  const expenseMonths = groupByMonth(actualExpenses);
  const incomeMonths  = groupByMonth(actualIncomes);

  const monthExpenses = expenseMonths[moneyFlowMonth] || [];
  const monthIncomes  = incomeMonths[moneyFlowMonth] || [];

  const salary      = salaryFor(moneyFlowMonth);
  const otherIncome = sum(monthIncomes);
  const incomeTotal = salary + otherIncome;

  // Roll earlier months' leftover into the selected month when enabled.
  // Negative leftovers are discarded unless the user opts in.
  let carriedIn = 0;
  if (rolloverEnabled) {
    for (const m of months) {
      if (m >= moneyFlowMonth) break;
      const inflow  = salaryFor(m) + sum(incomeMonths[m] || []);
      const outflow = sum(expenseMonths[m] || []);
      const monthLeft = inflow + carriedIn - outflow;
      carriedIn = (monthLeft < 0 && !rolloverNegative) ? 0 : monthLeft;
    }
  }
  const available = incomeTotal + carriedIn;

  const rentItems      = monthExpenses.filter(e => bucketOf(e) === 'expense' && isRent(e));
  const investmentItems = monthExpenses.filter(e => bucketOf(e) === 'investment');
  const savingsItems    = monthExpenses.filter(e => bucketOf(e) === 'savings');
  const lifestyleItems  = monthExpenses.filter(e => bucketOf(e) === 'expense' && !isRent(e));

  const rentTotal       = sum(rentItems);
  const investmentTotal = sum(investmentItems);
  const savingsTotal    = sum(savingsItems);
  const lifestyleTotal  = sum(lifestyleItems);
  const spentTotal      = rentTotal + lifestyleTotal;
  const outflowTotal    = spentTotal + investmentTotal + savingsTotal;
  const left            = available - outflowTotal;
  const overspent       = left < 0;

  const pctBase = available > 0 ? available : incomeTotal;
  const pctOfIncome = (value) => pctBase > 0 ? (value / pctBase) * 100 : null;

  // Donut segments. When inflow is known, "left" closes the ring.
  const allocation = [
    { label: 'Rent & utilities', value: rentTotal,       color: BUCKET_COLORS.rent,       items: rentItems },
    { label: 'Lifestyle',        value: lifestyleTotal,  color: BUCKET_COLORS.lifestyle,  items: lifestyleItems },
    { label: 'Investments',      value: investmentTotal, color: BUCKET_COLORS.investment, items: investmentItems },
    { label: 'Savings',          value: savingsTotal,    color: BUCKET_COLORS.savings,    items: savingsItems },
  ];
  if (!overspent && available > 0) {
    allocation.push({ label: 'Left unspent', value: left, color: BUCKET_COLORS.left, items: [] });
  }

  // Last 6 months (ending at the selected month) for the trend bars.
  const endIdx = months.indexOf(moneyFlowMonth);
  const chartMonths = months.slice(Math.max(0, endIdx - 5), endIdx + 1);
  const chartIncome = chartMonths.map(m => salaryFor(m) + sum(incomeMonths[m] || []));
  const chartOutflow = chartMonths.map(m => {
    const items = expenseMonths[m] || [];
    return sum(items);
  });
  const chartInvested = chartMonths.map(m =>
    sum((expenseMonths[m] || []).filter(e => bucketOf(e) === 'investment'))
  );

  body.innerHTML = `
    <!-- Month selector -->
    <div class="mf-month-bar">
      <div>
        <div class="mf-month-label">${monthLong(moneyFlowMonth)}</div>
        ${incomeTotal > 0 ? '' : '<div class="mf-month-sub">No inflow recorded for this month</div>'}
      </div>
      <select id="mf-month-select" class="form-input mf-month-select" aria-label="Select month">
        ${[...months].reverse().map(m => `<option value="${m}" ${m === moneyFlowMonth ? 'selected' : ''}>${monthShort(m)}</option>`).join('')}
      </select>
    </div>

    <!-- Income card -->
    <div class="analytics-card mf-income-card">
      <div class="mf-income-head">
        <div>
          <div class="mf-income-label">Total Inflow</div>
          <div class="mf-income-value">${incomeTotal > 0 ? formatAmount(incomeTotal) : '—'}</div>
          <div class="mf-income-breakdown">
            Salary ${formatAmount(salary)}${otherIncome > 0 ? ` · Other ${formatAmount(otherIncome)}` : ''}
          </div>
          ${rolloverEnabled && carriedIn !== 0 ? `
          <div class="mf-carry-line ${carriedIn < 0 ? 'negative' : ''}">
            Carried over ${signedAmount(carriedIn)} · Available ${formatAmount(available)}
          </div>` : ''}
        </div>
        <div class="mf-income-actions">
          <button class="filter-chip" id="mf-edit-salary" type="button">Edit salary</button>
          <button class="filter-chip" id="mf-add-income" type="button">+ Income</button>
        </div>
      </div>
      ${salary <= 0 ? `
      <div class="mf-salary-prompt">
        <span>Set this month's salary to see percentages and what's left.</span>
        <button class="filter-chip active" id="mf-set-salary" type="button">Set salary</button>
      </div>` : ''}
    </div>

    <!-- KPIs -->
    <div class="mf-kpi-grid">
      ${kpiCard('Spent', spentTotal, pctOfIncome(spentTotal), BUCKET_COLORS.lifestyle)}
      ${kpiCard(overspent ? 'Overspent' : 'Left', Math.abs(left), pctOfIncome(Math.abs(left)), overspent ? BUCKET_COLORS.overspent : BUCKET_COLORS.left)}
    </div>

    <!-- Allocation donut -->
    <div class="analytics-card">
      <div class="analytics-card-title">🧭 Where the money went</div>
      <div id="mf-allocation-donut"></div>
      ${overspent ? `<p class="mf-warning">Outflow is ${formatAmount(Math.abs(left))} more than available this month.</p>` : ''}
    </div>

    <!-- 6-month graph -->
    <div class="analytics-card">
      <div class="analytics-card-title">📊 Last 6 months</div>
      <div id="mf-trend-chart"></div>
    </div>

    <!-- Income entries -->
    <div class="analytics-card">
      <div class="analytics-card-title">➕ Other income this month</div>
      ${monthIncomes.length ? `
        <div class="mf-income-list">
          ${monthIncomes.map(i => `
            <div class="mf-income-row">
              <div class="mf-income-row-main">
                <div class="mf-income-row-source">${escapeHtml(i.source || 'Income')}</div>
                <div class="mf-income-row-meta">${formatShortDate(i.date)}${i.note ? ` · ${escapeHtml(i.note)}` : ''}</div>
              </div>
              <div class="mf-income-row-amount">${formatAmount(i.amount)}</div>
              <button class="btn-icon mf-income-delete" data-id="${i.id}" aria-label="Delete income entry" style="color:var(--danger)">×</button>
            </div>
          `).join('')}
        </div>` : `<p class="analytics-note" style="margin:0">No extra income recorded this month.</p>`}
    </div>

    <p class="analytics-note">Money Flow includes rent, one-off purchases and investments. It is separate from the Lifestyle view.</p>
  `;

  // Donut 1 — allocation of income
  renderDonutChart(document.getElementById('mf-allocation-donut'), allocation, {
    centerValue: overspent || available <= 0
      ? formatAmountShort(outflowTotal)
      : formatAmountShort(available),
    centerLabel: overspent || available <= 0 ? 'Outflow' : 'Available',
    percentBase: overspent || available <= 0 ? outflowTotal : available,
    emptyText: 'No expenses this month',
    onSliceClick: (slice) => {
      const isLeft = slice.label === 'Left unspent';
      openSliceDetail({
        title: slice.label,
        subtitle: isLeft
          ? `${monthLong(moneyFlowMonth)} · money not spent`
          : `${monthLong(moneyFlowMonth)} · ${(slice.items || []).length} entries`,
        total: slice.value,
        items: slice.items || [],
        catMap,
        emptyText: isLeft
          ? 'This is the money left after rent, lifestyle, investments and savings, including any carried-over leftover.'
          : `No ${slice.label.toLowerCase()} entries this month.`,
      });
    },
  });

  // 6-month grouped bars
  renderGroupedBars(
    document.getElementById('mf-trend-chart'),
    chartMonths.map(m => ({ label: monthLetter(m) })),
    [
      { label: 'Inflow',   color: 'var(--accent-light)', values: chartIncome },
      { label: 'Outflow',  color: BUCKET_COLORS.lifestyle, values: chartOutflow },
      { label: 'Invested', color: BUCKET_COLORS.investment, values: chartInvested },
    ]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  document.getElementById('mf-month-select').addEventListener('change', (e) => {
    moneyFlowMonth = e.target.value;
    renderMoneyFlowBody(body);
  });

  const openSalary = () => openSalaryModal({
    month: moneyFlowMonth,
    value: salary,
    hasOverride: hasOverride(moneyFlowMonth),
    onSaved: () => renderMoneyFlowBody(body),
  });

  document.getElementById('mf-edit-salary').addEventListener('click', openSalary);
  document.getElementById('mf-set-salary')?.addEventListener('click', openSalary);

  document.getElementById('mf-add-income').addEventListener('click', () => {
    openIncomeModal(() => renderMoneyFlowBody(body));
  });

  body.querySelectorAll('.mf-income-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await showConfirm({
        title: 'Delete income?',
        message: 'This income entry will be removed from Money Flow.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await deleteIncome(parseInt(btn.dataset.id, 10));
        showToast('Income deleted', 'success');
        renderMoneyFlowBody(body);
      } catch (err) {
        showToast('Could not delete income', 'error');
      }
    });
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function groupByMonth(rows) {
  const map = {};
  for (const row of rows) {
    const m = row.date.slice(0, 7);
    (map[m] ||= []).push(row);
  }
  return map;
}

function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
}

function signedAmount(amount) {
  const value = Number(amount) || 0;
  return `${value < 0 ? '−' : '+'}${formatAmount(Math.abs(value))}`;
}

function aggregateByCategory(items, catMap) {
  const map = {};
  for (const e of items) {
    const cat = catMap[e.categoryId] || { name: 'Other', emoji: '📦', color: BUCKET_COLORS.lifestyle };
    const key = cat.id ?? cat.name;
    if (!map[key]) {
      map[key] = { label: cat.name, emoji: cat.emoji, color: cat.color, value: 0, catId: cat.id, items: [] };
    }
    map[key].value += Number(e.amount) || 0;
    map[key].items.push(e);
  }
  return map;
}

function topSlices(map, limit) {
  const all = Object.values(map).sort((a, b) => b.value - a.value);
  if (all.length <= limit) return all;
  const top = all.slice(0, limit);
  const rest = all.slice(limit);
  const restValue = rest.reduce((sum, s) => sum + s.value, 0);
  if (restValue > 0) {
    top.push({
      label: 'Everything else',
      color: BUCKET_COLORS.left,
      value: restValue,
      items: rest.flatMap(s => s.items || []),
      aggregate: true,
    });
  }
  return top;
}

function kpiCard(label, value, pct, color) {
  return `
    <div class="mf-kpi" style="--kpi-color:${color}">
      <div class="mf-kpi-label">${label}</div>
      <div class="mf-kpi-value">${formatAmountShort(value)}</div>
      <div class="mf-kpi-pct">${pct === null ? '—' : pct.toFixed(0) + '% of available'}</div>
    </div>`;
}

function monthLong(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function monthShort(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function monthLetter(month) {
  const [, m] = month.split('-').map(Number);
  return new Date(2000, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function renderWeekDays(container, weekRange) {
  const days     = dateRange(weekRange.start, weekRange.end);
  const dailyMap = await getDailyTotalsForAnalytics(weekRange.start, weekRange.end);
  const dayMax   = Math.max(...days.map(d => dailyMap[d] || 0)) || 1;

  container.innerHTML = days.map(d => {
    const total = dailyMap[d] || 0;
    const pct   = (total / dayMax) * 100;
    const label = new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    const isToday = d === toDateStr(new Date());
    return `
      <div class="week-compare-row">
        <div class="week-compare-label" style="${isToday ? 'color:var(--accent-light);font-weight:700' : ''}">${label}</div>
        <div class="week-compare-track">
          <div class="week-compare-fill"
               style="width:${pct}%;background:${isToday ? 'var(--accent-light)' : 'var(--border-strong)'}"></div>
        </div>
        <div class="week-compare-value" style="${isToday ? 'color:var(--text-primary)' : 'color:var(--text-secondary)'}">
          ${total > 0 ? formatAmountShort(total) : '—'}
        </div>
      </div>`;
  }).join('');
}

function trendStat(label, value, dateStr) {
  const displayDate = dateStr
    ? new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null;
  return `
    <div style="flex:1;text-align:center;">
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:4px">${label}</div>
      <div style="font-size:16px;font-weight:800;letter-spacing:-0.3px">${value > 0 ? formatAmountShort(value) : '—'}</div>
      ${displayDate ? `<div style="font-size:10px;color:var(--text-muted)">${displayDate}</div>` : ''}
    </div>`;
}
