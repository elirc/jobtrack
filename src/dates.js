/**
 * Date helpers shared by every section.
 *
 * Dates are stored and passed around as "YYYY-MM-DD" strings and only ever
 * become Date objects in local time — Date's UTC parsing shifts the day.
 */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Column headings for the calendar grids. Weeks start on Monday everywhere. */
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WEEKDAYS_LONG = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

/** Parse "YYYY-MM-DD" into a local-midnight Date. Returns null when unusable. */
export function parseISO(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(year, month, day);
  // The Date constructor silently rolls invalid input (Feb 31 -> Mar 3). Keep
  // the storage contract strict so malformed records cannot drift to a new day.
  if (
    Number.isNaN(d.getTime()) ||
    d.getFullYear() !== year ||
    d.getMonth() !== month ||
    d.getDate() !== day
  ) return null;
  return d;
}

/** A local Date back to "YYYY-MM-DD" — the inverse of parseISO. "" when unusable. */
export function toISO(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Today as "YYYY-MM-DD" in local time (toISOString would shift across UTC). */
export function todayISO() {
  return toISO(new Date());
}

/** "Mar 4, 2026" — or an em dash when the record has no date. */
export function formatDate(iso) {
  const d = parseISO(iso);
  if (!d) return "—";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "today" / "1 day ago" / "12 days ago" — future dates read "in N days". */
export function relativeLabel(iso) {
  const d = parseISO(iso);
  if (!d) return "";
  const now = new Date();
  // Calendar-day ordinals avoid 23/25-hour DST days skewing the result.
  const todayOrdinal = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOrdinal = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((todayOrdinal - dateOrdinal) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days > 1) return `${days} days ago`;
  if (days === -1) return "in 1 day";
  return `in ${Math.abs(days)} days`;
}

/* ------------------------------------------------------------- date math */

/** Shift a day by n days — negative goes back. "" when the input is unusable. */
export function addDays(iso, n) {
  const d = parseISO(iso);
  if (!d) return "";
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/**
 * Shift by whole months, clamping to the end of the target month: Jan 31 plus
 * one month is Feb 28 (Feb 29 in a leap year), not a spill into March.
 */
export function addMonths(iso, n) {
  const d = parseISO(iso);
  if (!d) return "";
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  // day 0 of the next month is the last day of this one
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return toISO(target);
}

/** The Monday on or before `iso`. */
export function startOfWeek(iso) {
  const d = parseISO(iso);
  if (!d) return "";
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Sunday (0) is 6 days in
  return toISO(d);
}

/** The seven days of the Monday-start week containing `iso`. [] when unusable. */
export function weekDays(iso) {
  const start = startOfWeek(iso);
  if (!start) return [];
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * The calendar page for `iso`'s month as whole Monday-start weeks, so the first
 * and last rows carry days from the neighbouring months. Four rows (a 28-day
 * February that opens on a Monday) to six.
 */
export function monthGrid(iso) {
  const d = parseISO(iso);
  if (!d) return [];
  const last = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const weeks = [];
  // ISO days compare correctly as plain strings, so the walk needs no Dates
  for (let cursor = startOfWeek(toISO(new Date(d.getFullYear(), d.getMonth(), 1)));
       cursor <= last;
       cursor = addDays(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
  }
  return weeks;
}

/** True when `iso` is today in local time. */
export function isToday(iso) {
  return Boolean(iso) && iso === todayISO();
}

/** True when two days fall in the same calendar month of the same year. */
export function isSameMonth(a, b) {
  return Boolean(a) && Boolean(b) && a.slice(0, 7) === b.slice(0, 7);
}

/** "Thursday", or "Thu" with style "short". "" when the date is unusable. */
export function weekdayName(iso, style = "long") {
  const d = parseISO(iso);
  if (!d) return "";
  const i = (d.getDay() + 6) % 7; // Monday-first, to match WEEKDAYS
  return style === "short" ? WEEKDAYS[i] : WEEKDAYS_LONG[i];
}
