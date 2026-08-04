// js/components/chart.js — CSS bar chart + SVG trend line

import { formatAmountShort } from '../utils/date-utils.js';

/**
 * Render a horizontal CSS bar chart by category
 * @param {HTMLElement} container
 * @param {Array} categories
 * @param {Object} sumMap  { categoryId: totalAmount }
 */
export function renderBarChart(container, categories, sumMap) {
  container.innerHTML = '';

  const entries = categories
    .map(c => ({ cat: c, total: sumMap[c.id] || 0 }))
    .filter(e => e.total > 0)
    .sort((a, b) => b.total - a.total);

  if (!entries.length) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px 0">No data this month</p>`;
    return;
  }

  const max = entries[0].total;

  for (const { cat, total } of entries) {
    const pct = max > 0 ? (total / max) * 100 : 0;

    const row = document.createElement('div');
    row.className = 'chart-bar-row';
    row.innerHTML = `
      <div class="chart-bar-label">
        <span class="emoji">${cat.emoji}</span>
        <span>${cat.name}</span>
      </div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:0%;background:${cat.color}">
        </div>
      </div>
      <div class="chart-bar-amount">${formatAmountShort(total)}</div>
    `;
    container.appendChild(row);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.querySelector('.chart-bar-fill').style.width = pct + '%';
      });
    });
  }
}

/**
 * Render a smooth SVG trend line for daily spending
 * @param {HTMLElement} container
 * @param {Array<string>} labels  — array of date strings (YYYY-MM-DD)
 * @param {Array<number>} values  — parallel array of amounts
 * @param {string} color          — stroke color
 */
export function renderTrendLine(container, labels, values, color = 'var(--accent-light)') {
  container.innerHTML = '';

  if (!values.length || values.every(v => v === 0)) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px 0">No data for this period</p>`;
    return;
  }

  const W = 340;
  const H = 110;
  const PAD_X = 8;
  const PAD_Y = 12;
  const max = Math.max(...values) || 1;

  const n    = values.length;
  const xStep = n > 1 ? (W - PAD_X * 2) / (n - 1) : W - PAD_X * 2;

  const points = values.map((v, i) => ({
    x: PAD_X + i * xStep,
    y: PAD_Y + (1 - v / max) * (H - PAD_Y * 2),
  }));

  const pathD = smoothPath(points);
  const areaD = `${pathD} L${points[points.length - 1].x},${H} L${points[0].x},${H} Z`;

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.setAttribute('preserveAspectRatio', 'none');
  svgEl.setAttribute('aria-label', 'Daily spending trend');
  svgEl.style.cssText = 'width:100%;height:110px;overflow:visible';

  svgEl.innerHTML = `
    <defs>
      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <!-- Area fill -->
    <path d="${areaD}" fill="url(#trendGrad)" />
    <!-- Trend line -->
    <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          style="stroke-dasharray:${pathLength(points)};stroke-dashoffset:${pathLength(points)};
                 animation:drawLine 1s cubic-bezier(0.4,0,0.2,1) 0.1s forwards"/>
    <!-- Dots -->
    ${points.map((p, i) => `
      <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${color}"
              style="opacity:0;animation:dotFadeIn 0.3s ease ${0.2 + i * 0.04}s forwards"/>
    `).join('')}
    <style>
      @keyframes drawLine {
        to { stroke-dashoffset: 0; }
      }
      @keyframes dotFadeIn {
        to { opacity: 1; }
      }
    </style>
  `;

  container.appendChild(svgEl);

  // X-axis labels (show first, mid, last)
  const labelsEl = document.createElement('div');
  labelsEl.className = 'trend-labels';

  const showIdxs = getAxisLabelIndices(n);
  const labelSpans = labels.map((lbl, i) => {
    const visible = showIdxs.includes(i);
    const d = new Date(lbl + 'T00:00:00');
    const text = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `<span class="trend-label" style="${visible ? '' : 'visibility:hidden'}">${text}</span>`;
  });
  labelsEl.innerHTML = labelSpans.join('');

  container.appendChild(labelsEl);
}

// ── SVG helpers ───────────────────────────────────────────────────────────────
function smoothPath(pts) {
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cpX = (pts[i].x + pts[i + 1].x) / 2;
    d += ` C${cpX},${pts[i].y} ${cpX},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

function pathLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.ceil(total * 1.3) + 50; // slight overestimate for smooth drawing
}

function getAxisLabelIndices(n) {
  if (n <= 3) return Array.from({ length: n }, (_, i) => i);
  return [0, Math.floor((n - 1) / 2), n - 1];
}
