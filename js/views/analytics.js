// js/views/analytics.js — Week-over-week comparison + daily trend line

import {
  getCategories, getExpensesByDateRangeForAnalytics, getDailyTotalsForAnalytics,
  sumByCategory, sumTotal,
} from '../db.js';
import {
  formatAmount, formatAmountShort,
  getThisWeekRange, getPrevWeekRange,
  getMonthStart, getMonthEnd,
  toDateStr, dateRange, shortDayDate,
} from '../utils/date-utils.js';
import { renderBarChart, renderTrendLine } from '../components/chart.js';

export async function renderAnalytics(container) {
  container.innerHTML = `<div class="page" id="analytics-page"><div class="spinner"></div></div>`;
  const page = document.getElementById('analytics-page');

  const categories = await getCategories();
  const catMap     = Object.fromEntries(categories.map(c => [c.id, c]));

  // Ranges
  const thisWeek = getThisWeekRange();
  const prevWeek = getPrevWeekRange();
  const monthStart = getMonthStart();
  const monthEnd   = getMonthEnd();

  const [thisWeekExp, prevWeekExp, monthExp] = await Promise.all([
    getExpensesByDateRangeForAnalytics(thisWeek.start, thisWeek.end),
    getExpensesByDateRangeForAnalytics(prevWeek.start, prevWeek.end),
    getExpensesByDateRangeForAnalytics(monthStart, monthEnd),
  ]);

  const thisWeekTotal = await sumTotal(thisWeekExp);
  const prevWeekTotal = await sumTotal(prevWeekExp);
  const monthCatSum   = await sumByCategory(monthExp);

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

  // Max for week bars
  const weekMax  = Math.max(thisWeekTotal, prevWeekTotal) || 1;

  // Trend stats (handle all-zero edge case)
  const maxTrendValue = Math.max(...trendValues);
  const highestDayStat = maxTrendValue > 0
    ? trendStat('Highest Day', maxTrendValue, trendDates[trendValues.indexOf(maxTrendValue)])
    : trendStat('Highest Day', 0, null);
  const monthTotal = await sumTotal(monthExp);
  const daysElapsedInMonth = new Date().getDate(); // 1 to 31
  const avgPerDay = daysElapsedInMonth > 0 ? (monthTotal / daysElapsedInMonth) : 0;

  page.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 16px">
      <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.5px">Analytics</h1>
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

      <!-- Day-by-day this week -->
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
        ${trendStat('This Month', monthTotal, null)}
      </div>
    </div>

    <!-- Monthly Category Breakdown -->
    <div class="analytics-card">
      <div class="analytics-card-title">🗂️ This Month — By Category</div>
      <div class="chart-container" id="cat-chart"></div>
    </div>
  `;

  // Animate week bars
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const thisBar = document.getElementById('this-week-bar');
    const prevBar = document.getElementById('prev-week-bar');
    if (thisBar) thisBar.style.width = ((thisWeekTotal / weekMax) * 100) + '%';
    if (prevBar) prevBar.style.width = ((prevWeekTotal / weekMax) * 100) + '%';
  }));

  // Day-by-day this week (also analytics-filtered)
  await renderWeekDays(document.getElementById('this-week-days'), thisWeek);

  // Trend line
  renderTrendLine(
    document.getElementById('trend-chart-container'),
    trendDates,
    trendValues,
    'var(--accent-light)'
  );

  // Category chart
  renderBarChart(document.getElementById('cat-chart'), categories, monthCatSum);
}

async function renderWeekDays(container, weekRange) {
  const days    = dateRange(weekRange.start, weekRange.end);
  const dailyMap = await getDailyTotalsForAnalytics(weekRange.start, weekRange.end);
  const dayMax  = Math.max(...days.map(d => dailyMap[d] || 0)) || 1;

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
