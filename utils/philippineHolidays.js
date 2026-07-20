/* ─── Philippine Holidays & Haircut Peak-Season Reminders ───────────────────
 * A small, editable calendar of fixed-date Philippine holidays and known
 * "peak season" dates for barbershops (when haircut demand spikes).
 *
 * NOTE: Only FIXED-date events are listed here (same month/day every year).
 * Movable holidays — Chinese New Year, Holy Week/Easter, Eid'l Fitr,
 * Eid'l Adha — shift every year based on the lunar calendar and are not
 * included. If you want those shown too, add them manually each year to
 * EXTRA_DATES below with an explicit { year, month, day }.
 * ────────────────────────────────────────────────────────────────────────── */

// type:  "holiday" = regular/special non-working day (shop may close/adjust hours)
//        "peak"    = no day off, but historically busier — good to staff up for
// short: compact label used inside the small calendar day cells
export const PH_HOLIDAYS = [
  { month: 1,  day: 1,  name: "New Year's Day",          short: "New Year",      type: "holiday", icon: "celebration",    note: "Peak walk-ins — clients freshen up before the new year." },
  { month: 2,  day: 14, name: "Valentine's Day",          short: "Valentine's",   type: "peak",    icon: "favorite",       note: "Peak season — couples & date-night grooming." },
  { month: 2,  day: 25, name: "EDSA People Power Anniv.",  short: "EDSA",          type: "holiday", icon: "flag",           note: "Special non-working day." },
  { month: 4,  day: 9,  name: "Araw ng Kagitingan",       short: "Araw ng Kagit.",type: "holiday", icon: "flag",           note: "Regular holiday." },
  { month: 5,  day: 1,  name: "Labor Day",                short: "Labor Day",     type: "holiday", icon: "flag",           note: "Regular holiday." },
  { month: 6,  day: 12, name: "Independence Day",         short: "Independence",  type: "holiday", icon: "flag",           note: "Regular holiday — often a long weekend rush before." },
  { month: 6,  day: 1,  name: "Back-to-School Season",    short: "Back to School",type: "peak",    icon: "school",         note: "Peak season — parents book haircuts before enrollment." },
  { month: 8,  day: 21, name: "Ninoy Aquino Day",         short: "Ninoy Aquino",  type: "holiday", icon: "flag",           note: "Special non-working day." },
  { month: 8,  day: 25, name: "National Heroes Day",      short: "Heroes Day",    type: "holiday", icon: "flag",           note: "Regular holiday (observed)." },
  { month: 11, day: 1,  name: "All Saints' Day (Undas)",  short: "Undas",         type: "peak",    icon: "local_florist",  note: "Peak season — families groom up before visiting the cemetery." },
  { month: 11, day: 30, name: "Bonifacio Day",            short: "Bonifacio",     type: "holiday", icon: "flag",           note: "Regular holiday." },
  { month: 12, day: 16, name: "Simbang Gabi Starts",      short: "Simbang Gabi",  type: "peak",    icon: "church",         note: "Peak season begins — Christmas rush kicks off." },
  { month: 12, day: 24, name: "Christmas Eve",            short: "Christmas Eve", type: "peak",    icon: "celebration",    note: "Highest-demand day of the year — book early." },
  { month: 12, day: 25, name: "Christmas Day",            short: "Christmas",     type: "holiday", icon: "celebration",    note: "Regular holiday." },
  { month: 12, day: 30, name: "Rizal Day",                short: "Rizal Day",     type: "holiday", icon: "flag",           note: "Regular holiday." },
  { month: 12, day: 31, name: "New Year's Eve",           short: "New Year's Eve",type: "peak",    icon: "celebration",    note: "Peak season — last-minute haircuts before the countdown." },
];

// Manually add movable holidays here per year if desired, e.g.:
// { year: 2027, month: 1, day: 29, name: "Chinese New Year", short: "CNY", type: "peak", icon: "celebration", note: "Peak season." }
export const EXTRA_DATES = [];

const pad2 = (n) => String(n).padStart(2, "0");

/** Returns the holiday/peak entry matching a given month (1-12) + day, or null. */
export function getHolidayForDate(month, day, year) {
  const extra = EXTRA_DATES.find(h => h.month === month && h.day === day && (!h.year || h.year === year));
  if (extra) return extra;
  return PH_HOLIDAYS.find(h => h.month === month && h.day === day) || null;
}

/** Returns the holiday/peak entry for a "YYYY-MM-DD" date key, or null. */
export function getHolidayForDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return getHolidayForDate(m, d, y);
}

/**
 * Returns every holiday/peak entry that falls within the given month,
 * sorted by day, each with a real `date` attached.
 * @param {number} year
 * @param {number} month 1-12
 */
export function getHolidaysForMonth(year, month) {
  const extras = EXTRA_DATES.filter(h => h.month === month && (!h.year || h.year === year));
  const fixed = PH_HOLIDAYS.filter(h => h.month === month);
  return [...fixed, ...extras]
    .map(h => ({ ...h, date: new Date(year, month - 1, h.day) }))
    .sort((a, b) => a.day - b.day);
}

/**
 * Returns the next N upcoming holidays/peak days from `from`, sorted by how
 * soon they occur (wraps into next year if this year's date has passed).
 */
export function getUpcomingHolidays(from = new Date(), limit = 5) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const all = [...PH_HOLIDAYS, ...EXTRA_DATES.filter(h => !h.year || h.year >= from.getFullYear())];

  const withDates = all.map(h => {
    let candidate = new Date(start.getFullYear(), h.month - 1, h.day);
    if (candidate < start) candidate = new Date(start.getFullYear() + 1, h.month - 1, h.day);
    const daysAway = Math.round((candidate - start) / (1000 * 60 * 60 * 24));
    return { ...h, date: candidate, daysAway };
  });

  withDates.sort((a, b) => a.daysAway - b.daysAway);
  return withDates.slice(0, limit);
}

export const holidayDateKey = (h) =>
  `${h.date.getFullYear()}-${pad2(h.date.getMonth() + 1)}-${pad2(h.date.getDate())}`;