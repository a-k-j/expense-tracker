// js/components/expense-form.js — Add/Edit expense bottom sheet

import { getCategories, addExpense, updateExpense, deleteExpense } from '../db.js';
import { getTodayStr, formatAmount } from '../utils/date-utils.js';
import { showToast } from './toast.js';
import { renderCategoryGrid } from './category-grid.js';

let sheetEl   = null;
let overlayEl = null;
let onSavedCb = null;

export function initExpenseForm() {
  overlayEl = document.getElementById('modal-overlay');
  overlayEl.addEventListener('click', closeSheet);
}

export async function openAddExpense(prefillCategory = null, onSaved = null) {
  onSavedCb = onSaved;
  await buildSheet({ mode: 'add', prefillCategory });
}

export async function openEditExpense(expense, onSaved = null) {
  onSavedCb = onSaved;
  await buildSheet({ mode: 'edit', expense });
}

async function buildSheet({ mode, expense = null, prefillCategory = null }) {
  const categories = await getCategories();
  const isEdit     = mode === 'edit';

  // Remove existing sheet if any
  if (sheetEl) sheetEl.remove();

  sheetEl = document.createElement('div');
  sheetEl.className  = 'bottom-sheet';
  sheetEl.id         = 'expense-sheet';
  sheetEl.setAttribute('role', 'dialog');
  sheetEl.setAttribute('aria-modal', 'true');
  sheetEl.setAttribute('aria-label', isEdit ? 'Edit Expense' : 'Add Expense');

  const selectedCatId = expense?.categoryId ?? prefillCategory?.id ?? null;
  const defaultDate   = expense?.date ?? getTodayStr();
  const catMap        = Object.fromEntries(categories.map(c => [c.id, c]));

  sheetEl.innerHTML = `
    <div class="bottom-sheet-handle"></div>
    <h2 class="bottom-sheet-title">${isEdit ? 'Edit Expense' : 'Add Expense'}</h2>

    <!-- Amount -->
    <div class="form-field">
      <div class="amount-input-wrapper" id="amount-wrapper">
        <span class="amount-currency-symbol">₹</span>
        <input
          type="number"
          id="expense-amount"
          class="amount-input"
          placeholder="0"
          min="0"
          step="0.01"
          inputmode="decimal"
          value="${expense?.amount ?? ''}"
          autocomplete="off"
          aria-label="Expense amount in rupees"
        />
      </div>
    </div>

    <!-- Category -->
    <div class="form-field">
      <label class="form-label">Category</label>
      <div id="sheet-cat-grid" class="category-grid"></div>
    </div>

    <!-- Expense Name (shown when category is Other) -->
    <div class="form-field" id="expense-custom-name-wrapper" style="display:none">
      <label class="form-label" for="expense-custom-name">Expense Name / Title <span style="color:var(--danger)">*</span></label>
      <input
        type="text"
        id="expense-custom-name"
        class="form-input"
        placeholder="e.g. WiFi Bill, Gift, Repairs"
        value="${expense?.customName ?? ''}"
        maxlength="60"
        autocomplete="off"
        aria-label="Expense custom name"
      />
    </div>

    <!-- Note -->
    <div class="form-field">
      <label class="form-label" for="expense-note">Note <span style="opacity:.5;font-weight:400;text-transform:none">(optional)</span></label>
      <input
        type="text"
        id="expense-note"
        class="form-input"
        placeholder="e.g. Paid via UPI"
        value="${expense?.note ?? ''}"
        maxlength="120"
        autocomplete="off"
        aria-label="Expense note"
      />
    </div>

    <!-- Date -->
    <div class="form-field">
      <label class="form-label" for="expense-date">Date</label>
      <input
        type="date"
        id="expense-date"
        class="form-input"
        value="${defaultDate}"
        max="${getTodayStr()}"
        aria-label="Expense date"
      />
    </div>

    <!-- Actions -->
    <div style="display:flex;gap:12px;margin-top:8px;">
      ${isEdit ? `<button class="btn btn-danger" id="expense-delete" style="flex:0 0 auto;padding:14px 18px;" aria-label="Delete expense">🗑️</button>` : ''}
      <button class="btn btn-primary" id="expense-save">
        ${isEdit ? 'Save Changes' : 'Add Expense'}
      </button>
    </div>
  `;

  document.body.appendChild(sheetEl);

  const updateCustomNameVisibility = (catId) => {
    const wrapper = document.getElementById('expense-custom-name-wrapper');
    if (!wrapper) return;
    const cat = catMap[catId];
    const isOther = cat && cat.name.toLowerCase().startsWith('other');
    wrapper.style.display = isOther ? 'block' : 'none';
  };

  // Render category grid inside sheet
  let selectedCategory = selectedCatId;
  renderCategoryGrid(
    document.getElementById('sheet-cat-grid'),
    categories,
    selectedCatId,
    (catId) => {
      selectedCategory = catId;
      updateCustomNameVisibility(catId);
    }
  );

  // Initial check
  updateCustomNameVisibility(selectedCatId);

  // Activate
  requestAnimationFrame(() => {
    overlayEl.classList.add('active');
    sheetEl.classList.add('open');
  });

  // Focus amount
  setTimeout(() => document.getElementById('expense-amount')?.focus(), 400);

  // Save
  document.getElementById('expense-save').addEventListener('click', async () => {
    await handleSave({ isEdit, expense, selectedCategoryGetter: () => selectedCategory, catMap });
  });

  // Delete (edit mode)
  if (isEdit) {
    document.getElementById('expense-delete').addEventListener('click', async () => {
      if (!confirm('Delete this expense?')) return;
      await deleteExpense(expense.id);
      showToast('Expense deleted', 'success');
      closeSheet();
      onSavedCb?.();
    });
  }

  // Allow swipe-down to close
  addSwipeDownClose(sheetEl);
}

async function handleSave({ isEdit, expense, selectedCategoryGetter, catMap }) {
  const amountVal  = parseFloat(document.getElementById('expense-amount').value);
  const note       = document.getElementById('expense-note').value.trim();
  const customName = document.getElementById('expense-custom-name')?.value.trim() || '';
  const date       = document.getElementById('expense-date').value;
  const categoryId = selectedCategoryGetter();
  const selectedCat = catMap[categoryId];

  if (!amountVal || amountVal <= 0) {
    showToast('Please enter a valid amount', 'error');
    document.getElementById('expense-amount').focus();
    return;
  }
  if (!categoryId) {
    showToast('Please select a category', 'warning');
    return;
  }

  if (selectedCat && selectedCat.name.toLowerCase().startsWith('other') && !customName) {
    showToast('Please enter a name for this expense', 'warning');
    document.getElementById('expense-custom-name')?.focus();
    return;
  }

  const btn = document.getElementById('expense-save');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    if (isEdit) {
      await updateExpense(expense.id, { amount: amountVal, categoryId, note, customName, date });
      showToast('Expense updated ✓', 'success');
    } else {
      await addExpense({ amount: amountVal, categoryId, note, customName, date });
      showToast(`${formatAmount(amountVal)} added ✓`, 'success');
    }
    closeSheet();
    onSavedCb?.();
  } catch (err) {
    showToast('Error saving expense', 'error');
    btn.disabled = false;
    btn.textContent = isEdit ? 'Save Changes' : 'Add Expense';
  }
}

export function closeSheet() {
  if (!sheetEl) return;
  overlayEl.classList.remove('active');
  sheetEl.classList.remove('open');
  setTimeout(() => {
    sheetEl?.remove();
    sheetEl = null;
  }, 400);
}

function addSwipeDownClose(el) {
  let startY = 0;
  let isDragging = false;

  el.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      el.style.transform = `translateX(-50%) translateY(${dy}px)`;
    }
  }, { passive: true });

  el.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 100) {
      closeSheet();
    } else {
      el.style.transform = '';
    }
  }, { passive: true });
}
