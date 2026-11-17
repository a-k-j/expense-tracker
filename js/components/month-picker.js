// js/components/month-picker.js — Custom dark-themed month picker

// Native <select> menus use the OS picker on Android, which looks out of place
// in the app. This component renders an in-app dropdown instead.

let activeDropdown = null;
let activeTrigger = null;
let outsideClickHandler = null;
let escapeHandler = null;

function closeActiveDropdown() {
  if (activeDropdown) {
    const dropdown = activeDropdown;
    dropdown.classList.remove('open');
    setTimeout(() => dropdown.remove(), 160);
    activeDropdown = null;
    activeTrigger = null;
  }
  if (outsideClickHandler) {
    document.removeEventListener('pointerdown', outsideClickHandler, true);
    outsideClickHandler = null;
  }
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
  document.querySelectorAll('.month-picker-trigger[aria-expanded="true"]')
    .forEach(btn => btn.setAttribute('aria-expanded', 'false'));
}

function monthLabel(month) {
  const [y, m] = String(month).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/**
 * Create a month picker trigger + dropdown.
 *
 * @param {object} opts
 * @param {string[]} opts.months   Available months, YYYY-MM (ascending)
 * @param {string} opts.value      Initially selected month
 * @param {string} [opts.id]       ID for the trigger button
 * @param {string} [opts.ariaLabel] Accessible label
 * @param {function} opts.onChange Called with the selected month
 * @returns {HTMLElement} Wrapper element to insert into the DOM
 */
export function createMonthPicker({ months, value, id, ariaLabel = 'Select month', onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'month-picker-wrapper';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'month-picker-trigger';
  if (id) trigger.id = id;
  trigger.setAttribute('aria-label', ariaLabel);
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = `
    <span class="month-picker-label">${monthLabel(value)}</span>
    <svg class="month-picker-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>`;

  let currentValue = value;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeDropdown && activeTrigger === trigger) {
      closeActiveDropdown();
      return;
    }
    closeActiveDropdown();

    const dropdown = document.createElement('div');
    dropdown.className = 'month-picker-dropdown';
    dropdown.setAttribute('role', 'listbox');
    dropdown.setAttribute('aria-label', ariaLabel);

    [...months].reverse().forEach(month => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'month-picker-option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(month === currentValue));
      if (month === currentValue) option.classList.add('selected');
      option.innerHTML = `
        <span>${monthLabel(month)}</span>
        <svg class="month-picker-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="${month === currentValue ? '' : 'visibility:hidden'}">
          <polyline points="20 6 9 17 4 12" />
        </svg>`;
      option.addEventListener('click', () => {
        currentValue = month;
        trigger.querySelector('.month-picker-label').textContent = monthLabel(month);
        closeActiveDropdown();
        onChange?.(month);
      });
      dropdown.appendChild(option);
    });

    document.body.appendChild(dropdown);

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(240, window.innerWidth - 32);
    const gap = 6;
    const height = dropdown.offsetHeight;

    let top = rect.bottom + gap;
    if (top + height > window.innerHeight - 8 && rect.top - height - gap > 8) {
      top = rect.top - height - gap;
    }
    top = Math.max(8, Math.min(top, window.innerHeight - height - 8));

    let left = rect.left;
    left = Math.max(16, Math.min(left, window.innerWidth - width - 16));

    dropdown.style.width = `${width}px`;
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;

    requestAnimationFrame(() => dropdown.classList.add('open'));

    activeDropdown = dropdown;
    activeTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');

    setTimeout(() => {
      outsideClickHandler = (ev) => {
        if (!dropdown.contains(ev.target) && ev.target !== trigger && !trigger.contains(ev.target)) {
          closeActiveDropdown();
        }
      };
      document.addEventListener('pointerdown', outsideClickHandler, true);
      escapeHandler = (ev) => {
        if (ev.key === 'Escape') closeActiveDropdown();
      };
      document.addEventListener('keydown', escapeHandler);
    }, 10);
  });

  wrapper.appendChild(trigger);
  return wrapper;
}
