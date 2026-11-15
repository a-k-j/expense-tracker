// js/db.js — Dexie.js database setup, schema, CRUD helpers

const db = new Dexie('SpendSenseDB');

db.version(1).stores({
  expenses:   '++id, date, categoryId, amount, createdAt, [date+categoryId]',
  categories: '++id, name, order',
  settings:   'key',
});

db.version(3).stores({
  expenses:   '++id, date, categoryId, amount, createdAt, [date+categoryId]',
  categories: '++id, name, order',
  settings:   'key',
  backups:    '++id, createdAt, type',
  incomes:    '++id, date, createdAt',
});

// ── Category buckets ────────────────────────────────────────────────────────
// expense    → lifestyle spending (current behaviour)
// investment → money moved into investments (counts as invested, not spend)
// savings    → money set aside (counts as saved, not spend)
export function inferBucket(name = '') {
  const n = String(name).toLowerCase();
  if (n.includes('invest')) return 'investment';
  if (n.includes('saving')) return 'savings';
  return 'expense';
}

export function categoryBucket(cat) {
  return cat?.bucket || inferBucket(cat?.name);
}

// ── Default categories ──────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { name: 'Food',             emoji: '🍔', color: 'hsl(25, 95%, 55%)',   order: 0,  isDefault: true, bucket: 'expense' },
  { name: 'Tea/Coffee',       emoji: '☕', color: 'hsl(28, 65%, 42%)',   order: 1,  isDefault: true, bucket: 'expense' },
  { name: 'Bike/Auto/Cab',    emoji: '🚗', color: 'hsl(210, 80%, 55%)', order: 2,  isDefault: true, bucket: 'expense' },
  { name: 'Petrol',           emoji: '⛽', color: 'hsl(350, 75%, 55%)',  order: 3,  isDefault: true, bucket: 'expense' },
  { name: 'Coke Zero',        emoji: '🥤', color: 'hsl(195, 85%, 45%)',  order: 4,  isDefault: true, bucket: 'expense' },
  { name: 'Groceries',        emoji: '🛒', color: 'hsl(140, 60%, 42%)',  order: 5,  isDefault: true, bucket: 'expense' },
  { name: 'Health',           emoji: '💊', color: 'hsl(330, 65%, 55%)',  order: 6,  isDefault: true, bucket: 'expense' },
  { name: 'Entertainment',    emoji: '🎬', color: 'hsl(270, 65%, 58%)',  order: 7,  isDefault: true, bucket: 'expense' },
  { name: 'Rent & Utilities', emoji: '🏠', color: 'hsl(190, 80%, 45%)',  order: 8,  isDefault: true, bucket: 'expense' },
  { name: 'Other',            emoji: '📦', color: 'hsl(220, 15%, 52%)',  order: 9,  isDefault: true, bucket: 'expense' },
  { name: 'Investments',      emoji: '💸', color: 'hsl(150, 70%, 42%)',  order: 10, isDefault: true, bucket: 'investment' },
  { name: 'Savings',          emoji: '🏦', color: 'hsl(210, 70%, 50%)',  order: 11, isDefault: true, bucket: 'savings' },
];

// Categories that must exist even for users upgrading from an older backup.
const REQUIRED_CATEGORIES = [
  { name: 'Rent & Utilities', emoji: '🏠', color: 'hsl(190, 80%, 45%)', bucket: 'expense' },
  { name: 'Coke Zero',        emoji: '🥤', color: 'hsl(195, 85%, 45%)', bucket: 'expense' },
  { name: 'Investments',      emoji: '💸', color: 'hsl(150, 70%, 42%)', bucket: 'investment' },
  { name: 'Savings',          emoji: '🏦', color: 'hsl(210, 70%, 50%)', bucket: 'savings' },
];

// ── Seed on first run ────────────────────────────────────────────────────────
async function seedIfEmpty() {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  }

  // Add any required category that is missing (older databases / restored backups)
  const existing = await db.categories.toArray();
  const names = new Set(existing.map(c => c.name.toLowerCase()));
  for (const required of REQUIRED_CATEGORIES) {
    if (names.has(required.name.toLowerCase())) continue;
    const maxOrder = await db.categories.orderBy('order').last();
    await db.categories.add({
      ...required,
      order: maxOrder ? maxOrder.order + 1 : 0,
      isDefault: true,
    });
    names.add(required.name.toLowerCase());
  }

  // Backfill buckets on categories created before buckets existed
  for (const cat of await db.categories.toArray()) {
    if (!cat.bucket) {
      await db.categories.update(cat.id, { bucket: inferBucket(cat.name) });
    }
  }

  // Seed default settings
  const defaults = {
    budget: 0,
    budgetAlertsSeen: [],
    defaultSalary: 0,
    salaryByMonth: {},
    rolloverEnabled: false,
    rolloverNegative: false,
  };
  for (const [key, value] of Object.entries(defaults)) {
    const row = await db.settings.get(key);
    if (!row) await db.settings.put({ key, value });
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

// ── Salary helpers ───────────────────────────────────────────────────────────
async function getSalaryForMonth(month) {
  const overrides = await getSetting('salaryByMonth', {});
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, month)) {
    return Number(overrides[month]) || 0;
  }
  return Number(await getSetting('defaultSalary', 0)) || 0;
}

async function setSalaryForMonth(month, amount) {
  const overrides = { ...(await getSetting('salaryByMonth', {})) };
  if (amount === null || amount === undefined || amount === '') {
    delete overrides[month];
  } else {
    overrides[month] = Number(amount) || 0;
  }
  await setSetting('salaryByMonth', overrides);
  return overrides;
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

async function reorderCategories(orderedIds) {
  // orderedIds: array of category IDs in the desired new order
  await db.transaction('rw', db.categories, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.categories.update(orderedIds[i], { order: i });
    }
  });
}

// ── Expense helpers ────────────────────────────────────────────────────────────
async function addExpense({ amount, categoryId, note = '', customName = '', date, excludeFromAnalytics = false }) {
  const d = date ? new Date(date) : new Date();
  // Normalise to start-of-day string for day-level grouping
  const dateStr = toDateStr(d);
  return db.expenses.add({
    amount: parseFloat(amount),
    categoryId,
    note,
    customName: (customName || '').trim(),
    date: dateStr,
    excludeFromAnalytics: !!excludeFromAnalytics,
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

// ── Income helpers (salary top-ups, bonuses, reimbursements, gifts) ──────────
async function addIncome({ amount, source = '', note = '', date }) {
  const d = date ? new Date(date) : new Date();
  return db.incomes.add({
    amount: parseFloat(amount),
    source: (source || '').trim(),
    note: (note || '').trim(),
    date: toDateStr(d),
    createdAt: new Date().toISOString(),
  });
}

async function updateIncome(id, { amount, source = '', note = '', date }) {
  const d = date ? new Date(date) : new Date();
  return db.incomes.update(id, {
    amount: parseFloat(amount),
    source: (source || '').trim(),
    note: (note || '').trim(),
    date: toDateStr(d),
  });
}

async function deleteIncome(id) {
  return db.incomes.delete(id);
}

async function getAllIncomes() {
  return db.incomes.orderBy('date').reverse().toArray();
}

async function getIncomesByDateRange(startDate, endDate) {
  const start = toDateStr(startDate);
  const end   = toDateStr(endDate);
  return db.incomes
    .where('date')
    .between(start, end, true, true)
    .reverse()
    .sortBy('date');
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

// ── Analytics-filtered helpers (exclude non-expense buckets + excluded rows) ─
async function getExpensesByDateRangeForAnalytics(startDate, endDate) {
  const [all, categories] = await Promise.all([
    getExpensesByDateRange(startDate, endDate),
    getCategories(),
  ]);
  const bucketById = Object.fromEntries(categories.map(c => [c.id, categoryBucket(c)]));
  return all.filter(e =>
    !e.excludeFromAnalytics && (bucketById[e.categoryId] || 'expense') === 'expense'
  );
}

async function getDailyTotalsForAnalytics(startDate, endDate) {
  const expenses = await getExpensesByDateRangeForAnalytics(startDate, endDate);
  const map = {};
  for (const e of expenses) {
    map[e.date] = (map[e.date] || 0) + e.amount;
  }
  return map;
}

async function getMonthExpensesForAnalytics(year, month) {
  const start = new Date(year, month, 1);
  const end   = new Date(year, month + 1, 0);
  return getExpensesByDateRangeForAnalytics(start, end);
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
  getSalaryForMonth, setSalaryForMonth,
  getCategories, getCategoryById, addCategory, updateCategory, deleteCategory, reorderCategories,
  addExpense, updateExpense, deleteExpense, getExpenseById,
  addIncome, updateIncome, deleteIncome, getAllIncomes, getIncomesByDateRange,
  getExpensesByDateRange, getTodayExpenses, getMonthExpenses, getAllExpenses,
  getExpensesByDateRangeForAnalytics, getDailyTotalsForAnalytics, getMonthExpensesForAnalytics,
  sumByCategory, sumTotal, getDailyTotals,
  toDateStr,
};
