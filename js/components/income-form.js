// js/components/income-form.js — Add extra income + edit monthly salary

import { addIncome, setSalaryForMonth } from '../db.js';
import { formatAmount, getSmartDefaultDate, saveLastUsedDate } from '../utils/date-utils.js';
import { showToast } from './toast.js';
import { createDatePicker } from './date-picker.js';

let sheetEl = null;
let overlayEl = null;
let onClosed = null;

const INCOME_SOURCES = ['Parents', 'Bonus', 'Refund', 'Gift', 'Freelance', 'Other'];

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.getElementById('modal-overlay');
  overlayEl.addEventListener('click', closeSheet);
  return overlayEl;
}

function openSheet(html, ariaLabel) {
  ensureOverlay();
  if (sheetEl) sheetEl.remove();

  sheetEl = document.createElement('div');
  sheetEl.className = 'bottom-sheet';
  sheetEl.setAttribute('role', 'dialog');
  sheetEl.setAttribute('aria-modal', 'true');
  sheetEl.setAttribute('aria-label', ariaLabel);
  sheetEl.innerHTML = html;

  document.body.appendChild(sheetEl);
  requestAnimationFrame(() => {
    overlayEl.classList.add('active');
    sheetEl.classList.add('open');
  });
}

export function closeSheet() {
  if (!sheetEl) return;
  overlayEl?.classList.remove('active');
  sheetEl.classList.remove('open');
  const el = sheetEl;
  sheetEl = null;
  setTimeout(() => el.remove(), 400);
  onClosed = null;
}

function monthLongLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function openIncomeModal(onSaved = null) {
  onClosed = onSaved;

  openSheet(`
    <div class="bottom-sheet-handle"></div>
    <h2 class="bottom-sheet-title">Add Income</h2>

    <div class="form-field">
      <div class="amount-input-wrapper">
        <span class="amount-currency-symbol">₹</span>
        <input type="number" id="income-amount" class="amount-input" placeholder="0"
               min="0" step="0.01" inputmode="decimal" autocomplete="off"
               aria-label="Income amount in rupees" />
      </div>
    </div>

    <div class="form-field">
      <label class="form-label" for="income-source">Source</label>
      <input type="text" id="income-source" class="form-input" placeholder="e.g. Parents, Bonus, Refund"
             maxlength="40" autocomplete="off" aria-label="Income source" />
      <div class="income-source-chips">
        ${INCOME_SOURCES.map(s => `<button type="button" class="filter-chip income-source-chip" data-source="${s}">${s}</button>`).join('')}
      </div>
    </div>

    <div class="form-field">
      <label class="form-label" for="income-note">Note <span style="opacity:.5;font-weight:400;text-transform:none">(optional)</span></label>
      <input type="text" id="income-note" class="form-input" placeholder="e.g. For Activa"
             maxlength="120" autocomplete="off" aria-label="Income note" />
    </div>

    <div class="form-field">
      <label class="form-label">Date</label>
      <div id="income-date-picker"></div>
    </div>

    <div style="display:flex;gap:12px;margin-top:8px">
      <button class="btn btn-secondary" id="income-cancel" style="flex:1">Cancel</button>
      <button class="btn btn-primary" id="income-save" style="flex:2">Add Income</button>
    </div>
  `, 'Add Income');

  let selectedDate = getSmartDefaultDate();
  const datePicker = createDatePicker({
    value: selectedDate,
    id: 'income-date',
    ariaLabel: 'Income date',
    onChange: (val) => { selectedDate = val; },
  });
  document.getElementById('income-date-picker').appendChild(datePicker);

  const sourceInput = document.getElementById('income-source');
  sheetEl.querySelectorAll('.income-source-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      sourceInput.value = chip.dataset.source;
      sheetEl.querySelectorAll('.income-source-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  document.getElementById('income-cancel').addEventListener('click', closeSheet);

  document.getElementById('income-save').addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('income-amount').value);
    const source = sourceInput.value.trim();
    const note = document.getElementById('income-note').value.trim();
    if (!amount || amount <= 0) {
      showToast('Enter a valid amount', 'warning');
      document.getElementById('income-amount').focus();
      return;
    }
    if (!source) {
      showToast('Add a source', 'warning');
      sourceInput.focus();
      return;
    }

    const btn = document.getElementById('income-save');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      await addIncome({ amount, source, note, date: selectedDate });
      saveLastUsedDate(selectedDate);
      showToast(`${formatAmount(amount)} income added ✓`, 'success');
      const cb = onClosed;
      closeSheet();
      cb?.();
    } catch (err) {
      showToast('Could not add income', 'error');
      btn.disabled = false;
      btn.textContent = 'Add Income';
    }
  });

  setTimeout(() => document.getElementById('income-amount')?.focus(), 400);
}

export function openSalaryModal({ month, value = 0, hasOverride = false, onSaved = null }) {
  onClosed = onSaved;

  openSheet(`
    <div class="bottom-sheet-handle"></div>
    <h2 class="bottom-sheet-title">Salary for ${monthLongLabel(month)}</h2>
    <p style="color:var(--text-muted);font-size:13px;margin:0 0 20px">
      Set the take-home salary received in this month. Months without an override use your default salary.
    </p>

    <div class="form-field">
      <div class="amount-input-wrapper">
        <span class="amount-currency-symbol">₹</span>
        <input type="number" id="salary-amount" class="amount-input" placeholder="0"
               min="0" step="100" inputmode="decimal" value="${value || ''}"
               autocomplete="off" aria-label="Monthly salary in rupees" />
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-top:8px">
      <button class="btn btn-secondary" id="salary-cancel" style="flex:1">Cancel</button>
      <button class="btn btn-primary" id="salary-save" style="flex:2">Save Salary</button>
    </div>
    ${hasOverride ? `<button class="btn btn-secondary" id="salary-clear" style="width:100%;margin-top:10px">Use default salary instead</button>` : ''}
  `, 'Edit Salary');

  document.getElementById('salary-cancel').addEventListener('click', closeSheet);

  document.getElementById('salary-save').addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('salary-amount').value);
    if (!amount || amount <= 0) {
      showToast('Enter a valid salary', 'warning');
      document.getElementById('salary-amount').focus();
      return;
    }
    const btn = document.getElementById('salary-save');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      await setSalaryForMonth(month, amount);
      showToast(`Salary set to ${formatAmount(amount)}`, 'success');
      const cb = onClosed;
      closeSheet();
      cb?.();
    } catch (err) {
      showToast('Could not save salary', 'error');
      btn.disabled = false;
      btn.textContent = 'Save Salary';
    }
  });

  document.getElementById('salary-clear')?.addEventListener('click', async () => {
    try {
      await setSalaryForMonth(month, null);
      showToast('Using default salary', 'info');
      const cb = onClosed;
      closeSheet();
      cb?.();
    } catch (err) {
      showToast('Could not clear salary', 'error');
    }
  });

  setTimeout(() => document.getElementById('salary-amount')?.focus(), 400);
}
