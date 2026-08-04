// js/utils/date-utils.js — Date formatting and range helpers

export function toDateStr(d) {
  const dd = d instanceof Date ? d : new Date(d);
  const y  = dd.getFullYear();
  const m  = String(dd.getMonth() + 1).padStart(2, '0');
  const day = String(dd.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDate(dateStr) {
  // dateStr: YYYY-MM-DD  → "Mon, 4 Aug"
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatAmount(amount) {
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatAmountShort(amount) {
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
  if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + 'K';
  return '₹' + amount.toFixed(0);
}

export function getToday() {
  return new Date();
}

export function getTodayStr() {
  return toDateStr(new Date());
}

export function getMonthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function getMonthEnd(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function getWeekStart(d = new Date()) {
  const day = d.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day; // Mon start
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getPrevWeekRange() {
  const thisWeekStart = getWeekStart();
  const prevWeekEnd = new Date(thisWeekStart);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  const prevWeekStart = getWeekStart(prevWeekEnd);
  return { start: prevWeekStart, end: prevWeekEnd };
}

export function getThisWeekRange() {
  const start = getWeekStart();
  const end   = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

export function isToday(dateStr) {
  return dateStr === getTodayStr();
}

export function isYesterday(dateStr) {
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  return dateStr === toDateStr(yest);
}

export function friendlyDay(dateStr) {
  if (isToday(dateStr)) return 'Today';
  if (isYesterday(dateStr)) return 'Yesterday';
  return formatDate(dateStr);
}

export function monthLabel(d = new Date()) {
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// Generate an array of YYYY-MM-DD strings between start and end (inclusive)
export function dateRange(start, end) {
  const dates = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(0, 0, 0, 0);
  while (cur <= endD) {
    dates.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function shortDayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

export function shortDayDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Sticky date picker helpers ──────────────────────────────────────────────
const LAST_DATE_KEY     = 'spendSense_lastUsedDate';
const LAST_DATE_TS_KEY  = 'spendSense_lastUsedDateTs';
const STICKY_DURATION   = 30 * 60 * 1000; // 30 minutes

/**
 * Returns the last-used date if it was set within 30 minutes, otherwise today.
 * Prevents returning a future date.
 */
export function getSmartDefaultDate() {
  try {
    const savedDate = localStorage.getItem(LAST_DATE_KEY);
    const savedTs   = parseInt(localStorage.getItem(LAST_DATE_TS_KEY), 10);
    if (savedDate && savedTs) {
      const elapsed = Date.now() - savedTs;
      if (elapsed < STICKY_DURATION) {
        // Don't return a future date
        const today = getTodayStr();
        return savedDate <= today ? savedDate : today;
      }
    }
  } catch (_) { /* localStorage unavailable — fall through */ }
  return getTodayStr();
}

/**
 * Save the date the user just used so the form remembers it for 30 minutes.
 */
export function saveLastUsedDate(dateStr) {
  try {
    localStorage.setItem(LAST_DATE_KEY, dateStr);
    localStorage.setItem(LAST_DATE_TS_KEY, String(Date.now()));
  } catch (_) { /* ignore */ }
}
