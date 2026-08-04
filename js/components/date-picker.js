// js/components/date-picker.js — Custom dark-themed calendar date picker

import { toDateStr } from '../utils/date-utils.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// ── Singleton cleanup ────────────────────────────────────────────────────────
let activeDropdown = null;
let activeTrigger = null;
let outsideClickHandler = null;

function closeActiveDropdown() {
  if (activeDropdown) {
    activeDropdown.classList.remove('open');
    const ref = activeDropdown;
    setTimeout(() => ref?.remove(), 200);
    activeDropdown = null;
    activeTrigger = null;
  }
  if (outsideClickHandler) {
    document.removeEventListener('pointerdown', outsideClickHandler, true);
    outsideClickHandler = null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a date picker trigger button + dropdown.
 *
 * @param {object}   opts
 * @param {string}   opts.value      Initial date YYYY-MM-DD
 * @param {string}   [opts.max]      Max selectable date YYYY-MM-DD
 * @param {string}   [opts.min]      Min selectable date YYYY-MM-DD
 * @param {string}   [opts.id]       ID for the trigger button
 * @param {string}   [opts.ariaLabel] Accessible label
 * @param {function} opts.onChange   Called with (dateStr) when user picks a date
 * @returns {HTMLElement} The wrapper element to insert into the DOM
 */
export function createDatePicker(opts) {
  const {
    value,
    max,
    min,
    id,
    ariaLabel = 'Select date',
    onChange,
  } = opts;

  let currentValue = value || toDateStr(new Date());
  let viewYear  = parseInt(currentValue.slice(0, 4), 10);
  let viewMonth = parseInt(currentValue.slice(5, 7), 10) - 1; // 0-indexed

  // ── Wrapper ──
  const wrapper = document.createElement('div');
  wrapper.className = 'date-picker-wrapper';

  // ── Trigger button ──
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'date-picker-trigger';
  if (id) trigger.id = id;
  trigger.setAttribute('aria-label', ariaLabel);
  trigger.setAttribute('aria-haspopup', 'dialog');
  updateTriggerLabel(trigger, currentValue);

  // ── Open calendar on click ──
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();

    // If this trigger's dropdown is already open, close it
    if (activeDropdown && activeTrigger === trigger) {
      closeActiveDropdown();
      return;
    }

    // Close any other open dropdown first
    closeActiveDropdown();

    const dropdown = buildDropdown();
    // Append to document.body so it escapes all overflow:hidden / stacking contexts
    document.body.appendChild(dropdown);

    // Position the dropdown using fixed positioning relative to the trigger
    const rect = trigger.getBoundingClientRect();
    const dropdownWidth = Math.min(280, window.innerWidth - 32);
    const gap = 6;

    // Vertical: prefer below, flip above if not enough space
    let top = rect.bottom + gap;
    const estimatedHeight = 310; // approximate calendar height
    if (top + estimatedHeight > window.innerHeight && rect.top > estimatedHeight + gap) {
      top = rect.top - estimatedHeight - gap;
    }

    // Horizontal: center on trigger, clamp to viewport
    let left = rect.left + rect.width / 2 - dropdownWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - dropdownWidth - 16));

    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.width = `${dropdownWidth}px`;

    requestAnimationFrame(() => dropdown.classList.add('open'));

    activeDropdown = dropdown;
    activeTrigger = trigger;

    // Close on outside click (deferred to avoid catching this click)
    setTimeout(() => {
      outsideClickHandler = (ev) => {
        if (!dropdown.contains(ev.target) && ev.target !== trigger) {
          closeActiveDropdown();
        }
      };
      document.addEventListener('pointerdown', outsideClickHandler, true);
    }, 10);
  });

  wrapper.appendChild(trigger);

  // ── Build the calendar dropdown ──
  function buildDropdown() {
    const dropdown = document.createElement('div');
    dropdown.className = 'date-picker-dropdown';
    dropdown.setAttribute('role', 'dialog');
    dropdown.setAttribute('aria-modal', 'false');
    dropdown.setAttribute('aria-label', 'Date picker calendar');
    renderCalendar(dropdown);
    return dropdown;
  }

  function renderCalendar(dropdown) {
    const today = toDateStr(new Date());

    // ── Header ──
    const header = document.createElement('div');
    header.className = 'date-picker-header';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'date-picker-nav';
    prevBtn.setAttribute('aria-label', 'Previous month');
    prevBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'date-picker-nav';
    nextBtn.setAttribute('aria-label', 'Next month');
    nextBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    const monthLabel = document.createElement('span');
    monthLabel.className = 'date-picker-month-label';
    monthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

    header.appendChild(prevBtn);
    header.appendChild(monthLabel);
    header.appendChild(nextBtn);

    // ── Day-of-week row ──
    const dayLabels = document.createElement('div');
    dayLabels.className = 'date-picker-day-labels';
    DAY_LABELS.forEach(label => {
      const el = document.createElement('div');
      el.className = 'date-picker-day-label';
      el.textContent = label;
      dayLabels.appendChild(el);
    });

    // ── Day grid ──
    const grid = document.createElement('div');
    grid.className = 'date-picker-grid';
    grid.setAttribute('role', 'grid');

    // First day of month (JS: 0=Sun, we want Mon=0)
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDow = firstDay.getDay() - 1; // Mon=0 .. Sun=6
    if (startDow < 0) startDow = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Previous month trailing days
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const dayEl = document.createElement('button');
      dayEl.type = 'button';
      dayEl.className = 'date-picker-day outside';
      dayEl.textContent = prevMonthDays - i;
      dayEl.disabled = true;
      dayEl.setAttribute('aria-hidden', 'true');
      grid.appendChild(dayEl);
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEl = document.createElement('button');
      dayEl.type = 'button';
      dayEl.className = 'date-picker-day';

      const isDisabledMax = max && dateStr > max;
      const isDisabledMin = min && dateStr < min;

      if (dateStr === currentValue) dayEl.classList.add('selected');
      if (dateStr === today) dayEl.classList.add('today');
      if (isDisabledMax || isDisabledMin) {
        dayEl.classList.add('disabled');
        dayEl.disabled = true;
      }

      dayEl.textContent = d;
      dayEl.setAttribute('aria-label', `${d} ${MONTH_NAMES[viewMonth]} ${viewYear}`);

      if (!isDisabledMax && !isDisabledMin) {
        dayEl.addEventListener('click', () => {
          currentValue = dateStr;
          viewYear  = parseInt(dateStr.slice(0, 4), 10);
          viewMonth = parseInt(dateStr.slice(5, 7), 10) - 1;
          updateTriggerLabel(trigger, currentValue);
          closeActiveDropdown();
          onChange?.(currentValue);
        });
      }

      grid.appendChild(dayEl);
    }

    // Next month leading days (fill to complete last row)
    const totalCells = startDow + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      const dayEl = document.createElement('button');
      dayEl.type = 'button';
      dayEl.className = 'date-picker-day outside';
      dayEl.textContent = i;
      dayEl.disabled = true;
      dayEl.setAttribute('aria-hidden', 'true');
      grid.appendChild(dayEl);
    }

    // Nav handlers
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      dropdown.innerHTML = '';
      renderCalendar(dropdown);
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      dropdown.innerHTML = '';
      renderCalendar(dropdown);
    });

    // Assemble
    dropdown.appendChild(header);
    dropdown.appendChild(dayLabels);
    dropdown.appendChild(grid);
  }

  // ── Public methods on the wrapper ──
  wrapper._getValue = () => currentValue;
  wrapper._setValue = (dateStr) => {
    currentValue = dateStr;
    viewYear  = parseInt(dateStr.slice(0, 4), 10);
    viewMonth = parseInt(dateStr.slice(5, 7), 10) - 1;
    updateTriggerLabel(trigger, currentValue);
  };

  return wrapper;
}

function updateTriggerLabel(trigger, dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-IN', { month: 'short' });
  const year = d.getFullYear();
  trigger.innerHTML = `
    <svg class="date-picker-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
    <span>${day}/${month}/${year}</span>
    <svg class="date-picker-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  `;
}
