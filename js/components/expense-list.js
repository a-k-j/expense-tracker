// js/components/expense-list.js — Expense list with grouping and swipe-to-delete

import { deleteExpense } from '../db.js';
import { formatAmount, friendlyDay, formatTime } from '../utils/date-utils.js';
import { openEditExpense } from './expense-form.js';
import { showToast } from './toast.js';
import { showConfirm } from './confirm-dialog.js';

/**
 * Render a grouped expense list into a container
 * @param {HTMLElement} container
 * @param {Array} expenses - sorted newest-first, already fetched
 * @param {Object} categoryMap - { id: category }
 * @param {Function} onChanged - callback when an expense is mutated
 */
export function renderExpenseList(container, expenses, categoryMap, onChanged) {
  container.innerHTML = '';

  if (!expenses.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💸</div>
        <h3>No expenses yet</h3>
        <p>Tap the <strong>+</strong> button to log your first expense.</p>
      </div>`;
    return;
  }

  // Group by date
  const groups = {};
  for (const e of expenses) {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  }

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  for (const date of sortedDates) {
    const dayExpenses = groups[date];
    const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

    const groupEl = document.createElement('div');
    groupEl.className = 'expense-group';
    groupEl.innerHTML = `
      <div class="expense-group-header">
        <span class="expense-group-date">${friendlyDay(date)}</span>
        <span class="expense-group-total">${formatAmount(dayTotal)}</span>
      </div>
    `;

    for (const expense of dayExpenses) {
      const cat = categoryMap[expense.categoryId] || { emoji: '📦', name: 'Unknown', color: 'hsl(220,15%,52%)' };
      const item = buildExpenseItem(expense, cat, categoryMap, onChanged);
      groupEl.appendChild(item);
    }

    container.appendChild(groupEl);
  }
}

function buildExpenseItem(expense, cat, categoryMap, onChanged) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.overflow = 'hidden';
  wrapper.style.borderRadius = '12px';
  wrapper.style.marginBottom = '6px';

  // Delete background
  const deleteBg = document.createElement('div');
  deleteBg.className = 'expense-item-delete-bg';
  deleteBg.innerHTML = '🗑️';

  const item = document.createElement('div');
  item.className = 'expense-item';
  item.setAttribute('role', 'button');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', `${cat.name}: ${formatAmount(expense.amount)}`);

  const displayName = expense.customName
    ? (cat.name.toLowerCase().startsWith('other') ? `Other - ${escapeHtml(expense.customName)}` : `${escapeHtml(cat.name)} — ${escapeHtml(expense.customName)}`)
    : escapeHtml(cat.name);

  const excludedBadge = expense.excludeFromAnalytics
    ? '<span class="expense-excluded-badge">Excluded</span>' : '';

  const bgColor = hexAlpha(cat.color, 0.18);
  item.innerHTML = `
    <div class="expense-item-icon" style="background:${bgColor}">${cat.emoji}</div>
    <div class="expense-item-info">
      <div class="expense-item-category">${displayName}${excludedBadge}</div>
      ${expense.note ? `<div class="expense-item-note">${escapeHtml(expense.note)}</div>` : `<div class="expense-item-time">${formatTime(expense.createdAt)}</div>`}
      ${expense.note ? `<div class="expense-item-time">${formatTime(expense.createdAt)}</div>` : ''}
    </div>
    <div class="expense-item-amount">${formatAmount(expense.amount)}</div>
  `;

  // Tap to edit
  item.addEventListener('click', () => {
    openEditExpense(expense, onChanged);
  });

  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') openEditExpense(expense, onChanged);
  });

  // Swipe to delete
  addSwipeToDelete(wrapper, item, deleteBg, expense, onChanged);

  wrapper.appendChild(deleteBg);
  wrapper.appendChild(item);
  return wrapper;
}

function addSwipeToDelete(wrapper, item, deleteBg, expense, onChanged) {
  let startX = 0;
  let curX = 0;
  let active = false;
  const THRESHOLD = 80;

  item.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    active = true;
    item.style.transition = 'none';
  }, { passive: true });

  item.addEventListener('touchmove', (e) => {
    if (!active) return;
    curX = e.touches[0].clientX - startX;
    if (curX < 0) {
      const dx = Math.max(curX, -THRESHOLD - 20);
      item.style.transform = `translateX(${dx}px)`;
      const pct = Math.min(Math.abs(dx) / THRESHOLD, 1);
      deleteBg.style.opacity = pct;
    }
  }, { passive: true });

  item.addEventListener('touchend', async () => {
    if (!active) return;
    active = false;
    item.style.transition = '';

    if (curX < -THRESHOLD) {
      // Hold at swiped position and ask for confirmation
      item.style.transform = `translateX(-${THRESHOLD}px)`;
      const confirmed = await showConfirm({
        title: 'Delete Expense?',
        message: 'This expense will be permanently deleted.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
      });

      if (confirmed) {
        item.style.transform = `translateX(-100%)`;
        item.style.opacity = '0';
        setTimeout(async () => {
          await deleteExpense(expense.id);
          wrapper.remove();
          showToast('Expense deleted', 'success');
          onChanged?.();
        }, 250);
      } else {
        item.style.transform = '';
        deleteBg.style.opacity = '0';
      }
    } else {
      item.style.transform = '';
      deleteBg.style.opacity = '0';
    }
    curX = 0;
  }, { passive: true });
}

function hexAlpha(color, alpha) {
  if (color.startsWith('hsl')) return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  return color;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
