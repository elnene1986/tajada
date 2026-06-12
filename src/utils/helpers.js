// Simple UUID v4 fallback (no external dependency)
export function v4Fallback() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Money formatters live in src/utils/money.js — they operate on
// integer cents (the canonical internal representation). The old
// formatMoney() / formatCompact() helpers that lived here took raw
// float dollars; they were unused at removal time, but their absence
// is intentional: no float-dollar formatter should exist alongside
// the cents-based ones, because nothing prevents a future caller from
// accidentally passing aggregated dollars (which is the bug we're
// avoiding). If you need a money formatter, import from utils/money.

// Parse date string to Date object
export function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  // Handle MM/DD/YY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    const year = parseInt(y) < 100 ? 2000 + parseInt(y) : parseInt(y);
    return new Date(year, parseInt(m) - 1, parseInt(d));
  }
  // Handle YYYY-MM-DD
  return new Date(dateStr);
}

// Get month/year label from date string
export function getMonthYear(dateStr) {
  const d = parseDate(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Get date range label from transactions
export function getDateRange(transactions) {
  if (!transactions.length) return '';
  const dates = transactions.map(t => parseDate(t.date)).sort((a, b) => a - b);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    return `${months[first.getMonth()]} ${first.getFullYear()}`;
  }
  return `${months[first.getMonth()]} - ${months[last.getMonth()]} ${last.getFullYear()}`;
}
