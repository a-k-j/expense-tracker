// js/db.js — Dexie.js database setup, schema, CRUD helpers

const db = new Dexie('SpendSenseDB');

db.version(1).stores({
  expenses:   '++id, date, categoryId, amount, createdAt, [date+categoryId]',
  categories: '++id, name, order',
  settings:   'key',
});

// ── Default categories ──────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { name: 'Food',             emoji: '🍔', color: 'hsl(25, 95%, 55%)',   order: 0, isDefault: true },
  { name: 'Tea/Coffee',       emoji: '☕', color: 'hsl(28, 65%, 42%)',   order: 1, isDefault: true },
  { name: 'Bike/Auto/Cab',    emoji: '🚗', color: 'hsl(210, 80%, 55%)', order: 2, isDefault: true },
  { name: 'Petrol',           emoji: '⛽', color: 'hsl(350, 75%, 55%)',  order: 3, isDefault: true },
  { name: 'Coke Zero',        emoji: '🥤', color: 'hsl(195, 85%, 45%)',  order: 4, isDefault: true },
  { name: 'Groceries',        emoji: '🛒', color: 'hsl(140, 60%, 42%)',  order: 5, isDefault: true },
  { name: 'Health',           emoji: '💊', color: 'hsl(330, 65%, 55%)',  order: 6, isDefault: true },
  { name: 'Entertainment',    emoji: '🎬', color: 'hsl(270, 65%, 58%)',  order: 7, isDefault: true },
  { name: 'Rent & Utilities', emoji: '🏠', color: 'hsl(190, 80%, 45%)',  order: 8, isDefault: true },
  { name: 'Other',            emoji: '📦', color: 'hsl(220, 15%, 52%)',  order: 9, isDefault: true },
];

// ── Seed on first run ────────────────────────────────────────────────────────
async function seedIfEmpty() {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  } else {
    // Check if Rent & Utilities exists; if not, add it
    const allCats = await db.categories.toArray();
    const hasRent = allCats.some(c => c.name.toLowerCase() === 'rent & utilities' || c.name.toLowerCase() === 'rent and utilities');
    if (!hasRent) {
      const maxOrder = await db.categories.orderBy('order').last();
      await db.categories.add({
        name: 'Rent & Utilities',
        emoji: '🏠',
        color: 'hsl(190, 80%, 45%)',
        order: maxOrder ? maxOrder.order + 1 : 7,
        isDefault: true,
      });
    }
    // Check if Coke Zero exists; if not, add it
    const hasCoke = allCats.some(c => c.name.toLowerCase() === 'coke zero');
    if (!hasCoke) {
      const maxOrder2 = await db.categories.orderBy('order').last();
      await db.categories.add({
        name: 'Coke Zero',
        emoji: '🥤',
        color: 'hsl(195, 85%, 45%)',
        order: maxOrder2 ? maxOrder2.order + 1 : 4,
        isDefault: true,
      });
    }
  }

  // Seed default settings
  const keys = ['budget', 'budgetAlertsSeen'];
  for (const key of keys) {
    const existing = await db.settings.get(key);
    if (!existing) {
      await db.settings.put({ key, value: key === 'budget' ? 0 : [] });
    }
  }
}

// ── Settings helpers ─────────────────────────────────────────────────────────
async function getSetting(key, defaultVal = null) {
  const row = await db.settings.get(key);
  return row ? row.value : defaultVal;
}

async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

// ── Category helpers ──────────────────────────────────────────────────────────
async function getCategories() {
  return db.categories.orderBy('order').toArray();
}

async function getCategoryById(id) {
  return db.categories.get(id);
}

async function addCategory(cat) {
  const maxOrder = await db.categories.orderBy('order').last();
  return db.categories.add({ ...cat, order: maxOrder ? maxOrder.order + 1 : 0, isDefault: false });
}

async function updateCategory(id, changes) {
  return db.categories.update(id, changes);
}

async function deleteCategory(id) {
  const count = await db.expenses.where('categoryId').equals(id).count();
  if (count > 0) {
    throw new Error(`Cannot delete: ${count} expense(s) use this category.`);
  }
  return db.categories.delete(id);
}

// ── Expense helpers ────────────────────────────────────────────────────────────
async function addExpense({ amount, categoryId, note = '', customName = '', date }) {
  const d = date ? new Date(date) : new Date();
  // Normalise to start-of-day string for day-level grouping
  const dateStr = toDateStr(d);
  return db.expenses.add({
    amount: parseFloat(amount),
    categoryId,
    note,
    customName: (customName || '').trim(),
    date: dateStr,
    createdAt: new Date().toISOString(),
  });
}

async function updateExpense(id, changes) {
  if (changes.date) changes.date = toDateStr(new Date(changes.date));
  if (changes.amount) changes.amount = parseFloat(changes.amount);
  return db.expenses.update(id, changes);
}

async function deleteExpense(id) {
  return db.expenses.delete(id);
}

async function getExpenseById(id) {
  return db.expenses.get(id);
}

async function getExpensesByDateRange(startDate, endDate) {
  // dateStr format: YYYY-MM-DD
  const start = toDateStr(startDate);
  const end   = toDateStr(endDate);
  return db.expenses
    .where('date')
    .between(start, end, true, true)
    .reverse()
    .sortBy('date');
}

async function getTodayExpenses() {
  const today = toDateStr(new Date());
  return db.expenses.where('date').equals(today).toArray();
}

async function getMonthExpenses(year, month) {
  const start = new Date(year, month, 1);
  const end   = new Date(year, month + 1, 0);
  return getExpensesByDateRange(start, end);
}

async function getAllExpenses() {
  return db.expenses.orderBy('date').reverse().toArray();
}

// ── Aggregation helpers ────────────────────────────────────────────────────────
async function sumByCategory(expenses) {
  const map = {};
  for (const e of expenses) {
    map[e.categoryId] = (map[e.categoryId] || 0) + e.amount;
  }
  return map; // { categoryId: totalAmount }
}

async function sumTotal(expenses) {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

// Get daily totals for a range (for trend chart)
async function getDailyTotals(startDate, endDate) {
  const expenses = await getExpensesByDateRange(startDate, endDate);
  const map = {};
  for (const e of expenses) {
    map[e.date] = (map[e.date] || 0) + e.amount;
  }
  return map; // { 'YYYY-MM-DD': total }
}

// ── Date utility (minimal, used here for normalisation) ──────────────────────
function toDateStr(d) {
  const dd = d instanceof Date ? d : new Date(d);
  const y  = dd.getFullYear();
  const m  = String(dd.getMonth() + 1).padStart(2, '0');
  const day = String(dd.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export {
  db,
  seedIfEmpty,
  getSetting, setSetting,
  getCategories, getCategoryById, addCategory, updateCategory, deleteCategory,
  addExpense, updateExpense, deleteExpense, getExpenseById,
  getExpensesByDateRange, getTodayExpenses, getMonthExpenses, getAllExpenses,
  sumByCategory, sumTotal, getDailyTotals,
  toDateStr,
};
