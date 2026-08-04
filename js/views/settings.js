// js/views/settings.js — Categories manager, export, backup, budget

import {
  getCategories, addCategory, updateCategory, deleteCategory, reorderCategories,
  getAllExpenses, db,
  getSetting, setSetting,
} from '../db.js';
import { getExpensesByDateRange } from '../db.js';
import { toDateStr, getMonthStart, getMonthEnd, formatAmount } from '../utils/date-utils.js';
import { exportCSV, csvFilename } from '../utils/csv-export.js';
import { exportJSON, importJSON } from '../utils/json-backup.js';
import { showToast } from '../components/toast.js';

const EMOJI_OPTIONS = ['🍔','☕','🚗','⛽','🛒','💊','🎬','📦','🍕','🍜','🥗','🍣','🎮','📚','✈️','🏋️','💇','🐶','🎁','💸','🏠','💡','🔧','👗','💰','🎵','🎨','🏃','🚿','📱'];
const COLOR_OPTIONS = [
  'hsl(25,95%,55%)','hsl(28,65%,42%)','hsl(210,80%,55%)','hsl(350,75%,55%)',
  'hsl(140,60%,42%)','hsl(330,65%,55%)','hsl(270,65%,58%)','hsl(220,15%,52%)',
  'hsl(190,80%,45%)','hsl(55,90%,50%)','hsl(0,0%,60%)','hsl(160,70%,40%)',
];

export async function renderSettings(container) {
  container.innerHTML = `<div class="page" id="settings-page"></div>`;
  await buildSettings(document.getElementById('settings-page'));
}

async function buildSettings(page) {
  const [categories, budget] = await Promise.all([
    getCategories(),
    getSetting('budget', 0),
  ]);

  page.innerHTML = `
    <div style="padding:8px 0 16px">
      <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.5px">Settings</h1>
    </div>

    <!-- Budget -->
    <div class="settings-section">
      <div class="settings-section-title">Budget</div>
      <div class="settings-list">
        <div class="settings-item" style="cursor:default;">
          <div class="settings-item-icon" style="background:rgba(124,58,237,0.15)">💰</div>
          <div class="settings-item-info">
            <div class="settings-item-title">Monthly Budget</div>
            <div class="settings-item-sub">Alerts at 50%, 75%, 90%, 100%</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:var(--text-muted)">₹</span>
            <input
              type="number"
              id="budget-input"
              class="form-input"
              style="width:100px;text-align:right;padding:6px 8px;font-weight:700;font-size:15px"
              value="${budget || ''}"
              placeholder="0"
              min="0"
              step="100"
              aria-label="Monthly budget in rupees"
            />
          </div>
        </div>
        <button class="settings-item" id="save-budget-btn" style="width:100%;cursor:pointer;">
          <div class="settings-item-icon" style="background:rgba(16,185,129,0.15)">✅</div>
          <div class="settings-item-info">
            <div class="settings-item-title">Save Budget</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Categories -->
    <div class="settings-section">
      <div class="settings-section-title">Categories</div>
      <div id="cat-list"></div>
      <button class="btn btn-secondary mt-sm w-full" id="add-cat-btn" style="gap:8px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Category
      </button>
    </div>

    <!-- Export -->
    <div class="settings-section">
      <div class="settings-section-title">Export</div>
      <div class="settings-list">
        <div class="settings-item" style="cursor:default;">
          <div class="settings-item-icon" style="background:rgba(59,130,246,0.15)">📅</div>
          <div class="settings-item-info">
            <div class="settings-item-title">Date Range</div>
          </div>
        </div>
        <div class="settings-item" style="cursor:default;flex-wrap:wrap;gap:8px">
          <input type="date" id="export-start" class="form-input" style="flex:1;min-width:130px"
                 value="${toDateStr(getMonthStart())}" aria-label="Export start date" />
          <span style="color:var(--text-muted);font-weight:700;align-self:center">→</span>
          <input type="date" id="export-end" class="form-input" style="flex:1;min-width:130px"
                 value="${toDateStr(getMonthEnd())}" max="${toDateStr(new Date())}" aria-label="Export end date" />
        </div>
        <button class="settings-item" id="export-csv-btn">
          <div class="settings-item-icon" style="background:rgba(16,185,129,0.15)">📊</div>
          <div class="settings-item-info">
            <div class="settings-item-title">Export as CSV</div>
            <div class="settings-item-sub">Opens in Excel / Google Sheets</div>
          </div>
          <div class="settings-item-arrow">›</div>
        </button>
      </div>
    </div>

    <!-- Backup -->
    <div class="settings-section">
      <div class="settings-section-title">Backup & Restore</div>
      <div class="settings-list">
        <button class="settings-item" id="export-json-btn">
          <div class="settings-item-icon" style="background:rgba(124,58,237,0.15)">💾</div>
          <div class="settings-item-info">
            <div class="settings-item-title">Backup All Data</div>
            <div class="settings-item-sub">Downloads a .json file</div>
          </div>
          <div class="settings-item-arrow">›</div>
        </button>
        <label class="settings-item" id="import-json-label" style="cursor:pointer;">
          <div class="settings-item-icon" style="background:rgba(245,158,11,0.15)">📥</div>
          <div class="settings-item-info">
            <div class="settings-item-title">Restore from Backup</div>
            <div class="settings-item-sub">Select a .json backup file</div>
          </div>
          <div class="settings-item-arrow">›</div>
          <input type="file" accept=".json" id="import-json-input" style="display:none" aria-label="Import JSON backup" />
        </label>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="settings-section">
      <div class="settings-section-title">Danger Zone</div>
      <div class="settings-list">
        <button class="settings-item" id="clear-data-btn">
          <div class="settings-item-icon" style="background:rgba(239,68,68,0.15)">🗑️</div>
          <div class="settings-item-info">
            <div class="settings-item-title" style="color:var(--danger)">Clear All Data</div>
            <div class="settings-item-sub">Permanently deletes all expenses</div>
          </div>
          <div class="settings-item-arrow" style="color:var(--danger)">›</div>
        </button>
      </div>
    </div>

    <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px;">
      SpendSense v1.0 · Data stored locally
    </div>
  `;

  renderCategoryList(document.getElementById('cat-list'), categories, page);

  // Budget save
  document.getElementById('save-budget-btn').addEventListener('click', async () => {
    const val = parseFloat(document.getElementById('budget-input').value) || 0;
    await setSetting('budget', val);
    await setSetting('budgetAlertsSeen', []); // Reset alerts for new budget
    showToast(val > 0 ? `Budget set to ${formatAmount(val)}` : 'Budget cleared', 'success');
  });

  // Add category
  document.getElementById('add-cat-btn').addEventListener('click', () => {
    openCategoryModal(null, async () => {
      const cats = await getCategories();
      renderCategoryList(document.getElementById('cat-list'), cats, page);
    });
  });

  // CSV export
  document.getElementById('export-csv-btn').addEventListener('click', async () => {
    const start = new Date(document.getElementById('export-start').value);
    const end   = new Date(document.getElementById('export-end').value);
    if (isNaN(start) || isNaN(end)) { showToast('Select valid dates', 'warning'); return; }
    try {
      const expenses   = await getExpensesByDateRange(start, end);
      const categories = await getCategories();
      const catMap     = Object.fromEntries(categories.map(c => [c.id, c]));
      const startStr   = toDateStr(start);
      const endStr     = toDateStr(end);
      exportCSV(expenses, catMap, csvFilename(startStr, endStr));
      showToast(`Exported ${expenses.length} expense(s)`, 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    }
  });

  // JSON backup
  document.getElementById('export-json-btn').addEventListener('click', async () => {
    try {
      await exportJSON();
      showToast('Backup downloaded ✓', 'success');
    } catch (e) {
      showToast('Backup failed', 'error');
    }
  });

  // JSON restore
  document.getElementById('import-json-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('This will REPLACE all your current data. Continue?')) {
      e.target.value = ''; return;
    }
    try {
      const result = await importJSON(file, false);
      showToast(`Restored: ${result.expenses} expenses, ${result.categories} categories`, 'success');
      await buildSettings(page);
    } catch (err) {
      showToast('Restore failed: ' + err.message, 'error');
    }
    e.target.value = '';
  });

  // Clear all data
  document.getElementById('clear-data-btn').addEventListener('click', async () => {
    if (!confirm('Delete ALL expenses? This cannot be undone.')) return;
    await db.expenses.clear();
    showToast('All expenses deleted', 'success');
  });
}

function renderCategoryList(container, categories, page) {
  if (!categories.length) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;padding:12px">No categories yet.</p>`;
    return;
  }
  container.innerHTML = '';

  // Track current category order by ID for drag reorder
  let catOrder = categories.map(c => c.id);

  for (const cat of categories) {
    const row = document.createElement('div');
    row.className = 'category-manage-item';
    row.dataset.catId = cat.id;
    row.innerHTML = `
      <div class="drag-handle" aria-label="Drag to reorder">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
          <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
          <circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/>
          <circle cx="9" cy="15" r="1.5"/><circle cx="15" cy="15" r="1.5"/>
          <circle cx="9" cy="20" r="1.5"/><circle cx="15" cy="20" r="1.5"/>
        </svg>
      </div>
      <div class="category-manage-item-icon" style="background:${hexAlpha(cat.color,0.18)}">${cat.emoji}</div>
      <div class="category-manage-item-name">${cat.name}</div>
      <div class="category-manage-item-actions">
        <button class="btn-icon edit-cat-btn" data-id="${cat.id}" aria-label="Edit ${cat.name}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        ${!cat.isDefault ? `
        <button class="btn-icon delete-cat-btn" data-id="${cat.id}" aria-label="Delete ${cat.name}" style="color:var(--danger)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>` : ''}
      </div>
    `;
    container.appendChild(row);
  }

  // ── Long-press drag reorder ────────────────────────────────────────────────
  initDragReorder(container, catOrder, async (newOrder) => {
    await reorderCategories(newOrder);
    const cats = await getCategories();
    renderCategoryList(container, cats, page);
  });

  // Edit
  container.querySelectorAll('.edit-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = categories.find(c => c.id === parseInt(btn.dataset.id));
      if (!cat) return;
      openCategoryModal(cat, async () => {
        const cats = await getCategories();
        renderCategoryList(container, cats, page);
      });
    });
  });

  // Delete
  container.querySelectorAll('.delete-cat-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cat = categories.find(c => c.id === parseInt(btn.dataset.id));
      if (!cat) return;
      if (!confirm(`Delete category "${cat.name}"?`)) return;
      try {
        await deleteCategory(cat.id);
        showToast(`"${cat.name}" deleted`, 'success');
        const cats = await getCategories();
        renderCategoryList(container, cats, page);
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });
}

// ── Drag reorder engine (touch long-press + mouse) ──────────────────────────
function initDragReorder(container, catOrder, onReorder) {
  const LONG_PRESS_MS = 400;
  let dragState = null;

  // Get all items as an array
  const getItems = () => [...container.querySelectorAll('.category-manage-item')];

  // --- Touch support ---
  let longPressTimer = null;

  container.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.category-manage-item');
    if (!item || dragState) return;

    const touch = e.touches[0];
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      startDrag(item, touch.clientY);
      // Vibrate feedback if available
      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (longPressTimer) {
      // Cancel long press if finger moves too much before activation
      const touch = e.touches[0];
      if (!dragState) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        return;
      }
    }
    if (!dragState) return;
    e.preventDefault();
    moveDrag(e.touches[0].clientY);
  }, { passive: false });

  container.addEventListener('touchend', () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (dragState) endDrag();
  }, { passive: true });

  container.addEventListener('touchcancel', () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (dragState) cancelDrag();
  }, { passive: true });

  // --- Mouse support (hold to drag) ---
  let mouseTimer = null;

  container.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.category-manage-item');
    // Only initiate on drag handle or via long press
    const isHandle = e.target.closest('.drag-handle');
    if (!item) return;
    // Prevent if clicking buttons
    if (e.target.closest('.btn-icon')) return;

    if (isHandle) {
      // Immediate drag from handle
      e.preventDefault();
      startDrag(item, e.clientY);
    } else {
      // Long press for non-handle area
      mouseTimer = setTimeout(() => {
        mouseTimer = null;
        startDrag(item, e.clientY);
      }, LONG_PRESS_MS);
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (mouseTimer && !dragState) {
      clearTimeout(mouseTimer);
      mouseTimer = null;
      return;
    }
    if (!dragState) return;
    e.preventDefault();
    moveDrag(e.clientY);
  });

  document.addEventListener('mouseup', () => {
    if (mouseTimer) {
      clearTimeout(mouseTimer);
      mouseTimer = null;
    }
    if (dragState) endDrag();
  });

  // --- Core drag logic ---
  function startDrag(item, startY) {
    const items = getItems();
    const index = items.indexOf(item);
    if (index < 0) return;

    const rect = item.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    dragState = {
      el: item,
      index,
      currentIndex: index,
      startY,
      offsetY: startY - rect.top,
      itemHeight: rect.height + parseFloat(getComputedStyle(item).marginBottom || 0),
      containerTop: containerRect.top,
    };

    item.classList.add('dragging');
    container.classList.add('drag-active');

    // Add placeholder styling to other items
    items.forEach((it, i) => {
      if (i !== index) {
        it.style.transition = 'transform 200ms ease';
      }
    });
  }

  function moveDrag(clientY) {
    if (!dragState) return;
    const { el, index, itemHeight, containerTop, offsetY } = dragState;
    const items = getItems();

    // Position the dragged element
    const relativeY = clientY - containerTop - offsetY;
    el.style.transform = `translateY(${clientY - dragState.startY}px)`;
    el.style.zIndex = '100';

    // Determine new index based on cursor position
    const rawIndex = Math.round((relativeY) / itemHeight);
    const newIndex = Math.max(0, Math.min(items.length - 1, rawIndex));

    if (newIndex !== dragState.currentIndex) {
      dragState.currentIndex = newIndex;

      // Shift other items visually
      items.forEach((it, i) => {
        if (it === el) return;
        if (i >= Math.min(index, newIndex) && i <= Math.max(index, newIndex)) {
          const shift = newIndex > index
            ? (i <= newIndex && i > index ? -itemHeight : 0)
            : (i >= newIndex && i < index ? itemHeight : 0);
          it.style.transform = `translateY(${shift}px)`;
        } else {
          it.style.transform = 'translateY(0)';
        }
      });
    }
  }

  function endDrag() {
    if (!dragState) return;
    const { el, index, currentIndex } = dragState;
    const items = getItems();

    // Clean up styles
    el.classList.remove('dragging');
    container.classList.remove('drag-active');
    items.forEach(it => {
      it.style.transform = '';
      it.style.transition = '';
      it.style.zIndex = '';
    });

    // Apply reorder if changed
    if (index !== currentIndex) {
      // Reorder catOrder array
      const moved = catOrder.splice(index, 1)[0];
      catOrder.splice(currentIndex, 0, moved);
      onReorder([...catOrder]);
    }

    dragState = null;
  }

  function cancelDrag() {
    if (!dragState) return;
    const { el } = dragState;
    const items = getItems();
    el.classList.remove('dragging');
    container.classList.remove('drag-active');
    items.forEach(it => {
      it.style.transform = '';
      it.style.transition = '';
      it.style.zIndex = '';
    });
    dragState = null;
  }
}

// ── Category modal (add / edit) ───────────────────────────────────────────────
function openCategoryModal(existing, onDone) {
  const overlay = document.getElementById('modal-overlay');
  const isEdit  = !!existing;

  let selectedEmoji = existing?.emoji ?? '📦';
  let selectedColor = existing?.color ?? COLOR_OPTIONS[0];

  const sheet = document.createElement('div');
  sheet.className = 'bottom-sheet';
  sheet.id        = 'cat-modal';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', isEdit ? 'Edit Category' : 'New Category');

  sheet.innerHTML = `
    <div class="bottom-sheet-handle"></div>
    <h2 class="bottom-sheet-title">${isEdit ? 'Edit Category' : 'New Category'}</h2>

    <div class="form-field">
      <label class="form-label" for="cat-name-input">Name</label>
      <input type="text" id="cat-name-input" class="form-input" value="${existing?.name ?? ''}"
             placeholder="e.g. Snacks" maxlength="24" aria-label="Category name" />
    </div>

    <div class="form-field">
      <label class="form-label">Icon</label>
      <div id="emoji-grid" style="display:flex;flex-wrap:wrap;gap:8px;">${
        EMOJI_OPTIONS.map(e => `
          <button class="emoji-btn" data-emoji="${e}"
                  style="font-size:24px;padding:8px;border-radius:10px;border:2px solid transparent;
                         background:var(--bg-card);transition:all .15s;${e===selectedEmoji?'border-color:var(--accent);background:var(--bg-glass-strong)':''}"
                  aria-label="Select emoji ${e}" aria-pressed="${e===selectedEmoji}">${e}</button>
        `).join('')
      }</div>
    </div>

    <div class="form-field">
      <label class="form-label">Color</label>
      <div id="color-grid" style="display:flex;flex-wrap:wrap;gap:8px;">${
        COLOR_OPTIONS.map(c => `
          <button class="color-btn" data-color="${c}"
                  style="width:32px;height:32px;border-radius:50%;background:${c};
                         border:3px solid ${c===selectedColor?'white':'transparent'};transition:all .15s;"
                  aria-label="Select color" aria-pressed="${c===selectedColor}"></button>
        `).join('')
      }</div>
    </div>

    <div style="display:flex;gap:12px;margin-top:8px">
      <button class="btn btn-secondary" id="cat-cancel-btn" style="flex:1">Cancel</button>
      <button class="btn btn-primary" id="cat-save-btn" style="flex:2">${isEdit ? 'Save' : 'Add Category'}</button>
    </div>
  `;

  document.body.appendChild(sheet);
  overlay.classList.add('active');
  requestAnimationFrame(() => sheet.classList.add('open'));

  const closeCatModal = () => {
    overlay.classList.remove('active');
    sheet.classList.remove('open');
    setTimeout(() => sheet.remove(), 400);
  };

  overlay.addEventListener('click', closeCatModal, { once: true });
  document.getElementById('cat-cancel-btn').addEventListener('click', closeCatModal);

  // Emoji selection
  sheet.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sheet.querySelectorAll('.emoji-btn').forEach(b => {
        b.style.borderColor = 'transparent';
        b.style.background = 'var(--bg-card)';
        b.setAttribute('aria-pressed', 'false');
      });
      btn.style.borderColor = 'var(--accent)';
      btn.style.background = 'var(--bg-glass-strong)';
      btn.setAttribute('aria-pressed', 'true');
      selectedEmoji = btn.dataset.emoji;
    });
  });

  // Color selection
  sheet.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sheet.querySelectorAll('.color-btn').forEach(b => {
        b.style.border = `3px solid transparent`;
        b.setAttribute('aria-pressed', 'false');
      });
      btn.style.border = '3px solid white';
      btn.setAttribute('aria-pressed', 'true');
      selectedColor = btn.dataset.color;
    });
  });

  // Save
  document.getElementById('cat-save-btn').addEventListener('click', async () => {
    const name = document.getElementById('cat-name-input').value.trim();
    if (!name) { showToast('Enter a category name', 'warning'); return; }

    try {
      if (isEdit) {
        await updateCategory(existing.id, { name, emoji: selectedEmoji, color: selectedColor });
        showToast(`"${name}" updated`, 'success');
      } else {
        await addCategory({ name, emoji: selectedEmoji, color: selectedColor });
        showToast(`"${name}" added`, 'success');
      }
      closeCatModal();
      onDone?.();
    } catch (e) {
      showToast('Error saving category', 'error');
    }
  });

  setTimeout(() => document.getElementById('cat-name-input')?.focus(), 400);
}

function hexAlpha(color, alpha) {
  if (color.startsWith('hsl')) return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  return color;
}
