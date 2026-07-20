import { useState, useMemo } from "react";
import { C } from "../tokens/design";
import { Icon } from "./ui";
import { fmt, toNum } from "../utils/currency";
import { getHolidayForDate, getHolidaysForMonth, getUpcomingHolidays, holidayDateKey } from "../utils/philippineHolidays";

/* ─── Earnings Calendar ──────────────────────────────────────────────────────
 * Month view showing which days had submitted income. Used on the Dashboard
 * for both admin and barber — pass in that person's own transactions.
 *
 * - Tap a day to open a small detail panel (amount, service, cut per txn).
 * - Heatmap intensity: darker fill = higher-earning day.
 * - "Today" button jumps back to the current month from anywhere.
 * - Month total shown right next to the month name in the header.
 * - Submission streak badge nudges barbers to log daily.
 * ────────────────────────────────────────────────────────────────────────── */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const toDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const EarningsCalendar = ({ txns = [] }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(null);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const prevMonth = () => { setViewDate(new Date(year, month - 1, 1)); setSelectedKey(null); };
  const nextMonth = () => { setViewDate(new Date(year, month + 1, 1)); setSelectedKey(null); };
  const jumpToToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(toDateKey(today));
  };

  // Build a map: "YYYY-MM-DD" → [txns] (across all time, not just the viewed month)
  const txnsByDay = useMemo(() => {
    const map = {};
    txns.forEach(t => {
      const d = t.createdAt?.toDate?.() ?? (t.date ? new Date(t.date) : null);
      if (!d || isNaN(d)) return;
      const key = toDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [txns]);

  // Submission streak — consecutive days with a logged transaction, counting
  // back from today. If today hasn't been logged yet, we don't break the
  // streak on account of it — we just start counting from yesterday.
  const streak = useMemo(() => {
    let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!txnsByDay[toDateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (txnsByDay[toDateKey(cursor)] && count < 3650) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [txnsByDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();      // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayKey = toDateKey(today);

  // Per-day totals for the visible month, used for both the header total
  // and the heatmap intensity scale.
  const { dayTotals, monthTotal, maxDayTotal } = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    const totals = {};
    let sum = 0;
    let max = 0;
    for (let d = 1; d <= dim; d++) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayTxns = txnsByDay[key] ?? [];
      const total = dayTxns.reduce((s, t) => s + (Number(t.barberCut) || 0), 0);
      totals[key] = total;
      sum += total;
      if (total > max) max = total;
    }
    return { dayTotals: totals, monthTotal: sum, maxDayTotal: max };
  }, [txnsByDay, viewDate]);

  const intensityBg = (ratio) => {
    if (ratio >= 0.85) return `${C.accent}80`;
    if (ratio >= 0.55) return `${C.accent}59`;
    if (ratio >= 0.25) return `${C.accent}33`;
    return `${C.accent}14`;
  };

  // Holidays/peak days for the month currently being viewed. When viewing
  // the real current month we only keep ones that are still upcoming
  // (today or later); when browsing any other month we show the full list.
  const thisMonthHolidays = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const list = getHolidaysForMonth(y, m + 1);
    const isThisRealMonth = y === today.getFullYear() && m === today.getMonth();
    if (!isThisRealMonth) return list;
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return list.filter(h => h.date >= startOfToday);
  }, [viewDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // A quick peek at next month's holidays so barbers/admins can plan ahead
  // even before flipping the calendar forward.
  const nextMonthHolidays = useMemo(() => {
    const nm = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    return getHolidaysForMonth(nm.getFullYear(), nm.getMonth() + 1);
  }, [viewDate]);

  // The single soonest holiday/peak day from *today*, regardless of which
  // month is being viewed — powers the always-visible "fast read" banner
  // at the top so barbers/admins never have to hunt for it.
  const nextHoliday = useMemo(() => getUpcomingHolidays(today, 1)[0] ?? null, []); // eslint-disable-line react-hooks/exhaustive-deps
  const nextHolidayUrgent = nextHoliday ? nextHoliday.daysAway <= 3 : false;

  const selectedHoliday = selectedKey ? getHolidayForDate(month + 1, Number(selectedKey.split("-")[2]), year) : null;

  const selectedTxns = selectedKey ? (txnsByDay[selectedKey] ?? []) : [];
  const selectedTotal = selectedTxns.reduce((s, t) => s + (Number(t.barberCut) || 0), 0);
  const selectedLabel = selectedKey
    ? new Date(`${selectedKey}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <div className="card" style={{ padding: "24px 28px", marginTop: 24 }}>
      {/* Calendar header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
        <button
          onClick={prevMonth}
          style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: C.surfaceLow, flexShrink: 0 }}
          onMouseOver={e => (e.currentTarget.style.background = C.surfaceHigh)}
          onMouseOut={e => (e.currentTarget.style.background = C.surfaceLow)}
        >
          <Icon name="chevron_left" size={18} style={{ color: C.onSurfaceVariant }} />
        </button>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0, justifyContent: "center", flexWrap: "wrap" }}>
          <p style={{ fontFamily: "Geist", fontSize: 15, fontWeight: 700, color: C.primary, whiteSpace: "nowrap" }}>
            {MONTHS[month]} {year}
          </p>
          <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.onSurfaceVariant, whiteSpace: "nowrap" }}>
            · {fmt(monthTotal)}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {!isCurrentMonth && (
            <button
              onClick={jumpToToday}
              style={{
                display: "flex", alignItems: "center", gap: 4, height: 32, padding: "0 10px",
                borderRadius: 8, background: C.surfaceLow, fontFamily: "Geist", fontSize: 11.5, fontWeight: 700,
                color: C.primary, whiteSpace: "nowrap",
              }}
              onMouseOver={e => (e.currentTarget.style.background = C.surfaceHigh)}
              onMouseOut={e => (e.currentTarget.style.background = C.surfaceLow)}
            >
              <Icon name="today" size={15} />
              Today
            </button>
          )}
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            style={{
              width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              background: C.surfaceLow,
              opacity: isCurrentMonth ? 0.3 : 1,
            }}
            onMouseOver={e => (e.currentTarget.style.background = C.surfaceHigh)}
            onMouseOut={e => (e.currentTarget.style.background = C.surfaceLow)}
          >
            <Icon name="chevron_right" size={18} style={{ color: C.onSurfaceVariant }} />
          </button>
        </div>
      </div>

      {/* Streak badge */}
      {streak >= 2 && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px",
            borderRadius: 999, background: `${C.accent}18`, fontFamily: "Geist", fontSize: 12, fontWeight: 700, color: C.accent,
          }}>
            {streak}-day submission streak 🔥
          </div>
        </div>
      )}
      {streak < 2 && <div style={{ marginBottom: 16 }} />}

      {/* Next-holiday fast-read banner — always visible, always today-relative,
          so it can be scanned/understood in under a second regardless of
          which month is currently on screen. */}
      {nextHoliday && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 14, marginBottom: 14,
            background: nextHolidayUrgent ? `${C.accent}22` : `${C.accent}0F`,
            border: `1.5px solid ${nextHolidayUrgent ? C.accent : `${C.accent}40`}`,
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: nextHolidayUrgent ? C.accent : `${C.accent}26`,
          }}>
            <Icon name={nextHoliday.icon} size={18} style={{ color: nextHolidayUrgent ? C.onAccent : C.accent }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.onSurfaceVariant }}>
              Next {nextHoliday.type === "peak" ? "peak day" : "holiday"}
            </p>
            <p style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 800, color: C.onSurface, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {nextHoliday.name}
            </p>
          </div>
          <div style={{
            flexShrink: 0, padding: "6px 12px", borderRadius: 999,
            background: nextHolidayUrgent ? C.accent : C.surfaceLow,
            fontFamily: "Geist", fontSize: 12, fontWeight: 800,
            color: nextHolidayUrgent ? C.onAccent : C.accent,
            whiteSpace: "nowrap",
          }}>
            {nextHoliday.daysAway === 0 ? "Today" : nextHoliday.daysAway === 1 ? "Tomorrow" : `In ${nextHoliday.daysAway}d`}
          </div>
        </div>
      )}

      {/* Holidays & Peak-Season reminders (PH) — aware of the month you're viewing */}
      {(thisMonthHolidays.length > 0 || nextMonthHolidays.length > 0) && (
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 8 }}>
            Holidays &amp; Peak Days — {MONTHS[month]}
          </p>

          {thisMonthHolidays.length > 0 ? (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {thisMonthHolidays.map((h) => {
                const isPeak = h.type === "peak";
                const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const daysAway = Math.round((h.date - startOfToday) / (1000 * 60 * 60 * 24));
                const label = isCurrentMonth
                  ? (daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `In ${daysAway} days`)
                  : h.date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                return (
                  <div
                    key={`${h.name}-${holidayDateKey(h)}`}
                    style={{
                      flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px", borderRadius: 12,
                      background: isPeak ? `${C.accent}14` : C.surfaceLow,
                      border: `1px solid ${isPeak ? `${C.accent}40` : `${C.outlineVariant}30`}`,
                    }}
                  >
                    <Icon name={h.icon} size={16} style={{ color: isPeak ? C.accent : C.onSurfaceVariant }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: "Geist", fontSize: 11.5, fontWeight: 700, color: C.onSurface, whiteSpace: "nowrap" }}>
                        {h.name}
                      </p>
                      <p style={{ fontFamily: "Geist", fontSize: 10.5, color: isPeak ? C.accent : C.onSurfaceVariant, whiteSpace: "nowrap", fontWeight: isPeak ? 700 : 400 }}>
                        {label}{isPeak ? " · Peak season" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontFamily: "Geist", fontSize: 11.5, color: C.onSurfaceVariant, marginBottom: nextMonthHolidays.length ? 8 : 0 }}>
              No more holidays or peak days this month.
            </p>
          )}

          {nextMonthHolidays.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 8 }}>
              {nextMonthHolidays.map((h) => (
                <div
                  key={`next-${h.name}-${holidayDateKey(h)}`}
                  style={{
                    flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 10px", borderRadius: 10,
                    background: C.surfaceLow, border: `1px dashed ${C.outlineVariant}40`,
                  }}
                >
                  <Icon name={h.icon} size={13} style={{ color: C.onSurfaceVariant }} />
                  <span style={{ fontFamily: "Geist", fontSize: 10.5, fontWeight: 600, color: C.onSurfaceVariant, whiteSpace: "nowrap" }}>
                    {h.name} · Next month
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontFamily: "Geist", fontSize: 10, fontWeight: 700, color: C.onSurfaceVariant, letterSpacing: "0.06em", padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const dateKey   = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTxns   = txnsByDay[dateKey] ?? [];
          const isToday   = dateKey === todayKey;
          const isSelected = dateKey === selectedKey;
          const hasTxns   = dayTxns.length > 0;
          const totalCut  = dayTotals[dateKey] ?? 0;
          const ratio     = maxDayTotal > 0 ? totalCut / maxDayTotal : 0;
          const holiday   = getHolidayForDate(month + 1, day, year);

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedKey(isSelected ? null : dateKey)}
              style={{
                position: "relative",
                borderRadius: 10, padding: "8px 4px",
                textAlign: "center", cursor: "pointer",
                background: isToday ? C.accent : hasTxns ? intensityBg(ratio) : "transparent",
                border: isSelected
                  ? `1.5px solid ${C.accent}`
                  : isToday ? "none" : holiday ? `1.5px dashed ${C.accent}60` : hasTxns ? `1.5px solid ${C.accent}30` : "1.5px solid transparent",
                boxShadow: isSelected ? `0 0 0 3px ${C.accent}20` : "none",
                transition: "background 0.15s, box-shadow 0.15s",
              }}
            >
              <p style={{
                fontFamily: "Geist", fontSize: 12,
                fontWeight: isToday ? 800 : hasTxns ? 700 : 400,
                color: isToday ? C.onAccent : hasTxns && ratio >= 0.85 ? C.onAccent : hasTxns ? C.accent : C.onSurfaceVariant,
                lineHeight: 1,
              }}>
                {day}
              </p>
              {holiday && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, marginTop: 3, padding: "0 2px" }}>
                  <Icon name={holiday.icon} size={8} style={{ color: isToday ? C.onAccent : C.accent, flexShrink: 0 }} />
                  <span style={{
                    fontFamily: "Geist", fontSize: 8, fontWeight: 700,
                    color: isToday ? C.onAccent : C.accent,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 52,
                  }}>
                    {holiday.short}
                  </span>
                </div>
              )}
              {hasTxns && (
                <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 4 }}>
                  {dayTxns.slice(0, 3).map((_, di) => (
                    <div
                      key={di}
                      style={{
                        width: 4, height: 4, borderRadius: "50%",
                        background: isToday || ratio >= 0.85 ? C.onAccent : C.accent,
                      }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tap-to-view detail panel */}
      {selectedKey && (
        <div style={{
          marginTop: 16, padding: "16px 18px", borderRadius: 14,
          background: C.surfaceLow, border: `1px solid ${C.outlineVariant}30`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: selectedTxns.length ? 12 : 0 }}>
            <div>
              <p style={{ fontFamily: "Geist", fontSize: 13.5, fontWeight: 700, color: C.onSurface }}>
                {selectedLabel}
              </p>
              {selectedHoliday && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon name={selectedHoliday.icon} size={13} style={{ color: C.accent }} />
                    <p style={{ fontFamily: "Geist", fontSize: 11.5, fontWeight: 700, color: C.accent }}>
                      {selectedHoliday.name}{selectedHoliday.type === "peak" ? " · Peak season" : ""}
                    </p>
                  </div>
                  {selectedHoliday.note && (
                    <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 }}>
                      {selectedHoliday.note}
                    </p>
                  )}
                </div>
              )}
              {selectedTxns.length > 0 && (
                <p style={{ fontFamily: "Geist", fontSize: 11.5, color: C.onSurfaceVariant, marginTop: 2 }}>
                  {selectedTxns.length} transaction{selectedTxns.length > 1 ? "s" : ""} · {fmt(selectedTotal)} earned
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedKey(null)}
              style={{ width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: C.surfaceHigh, flexShrink: 0 }}
            >
              <Icon name="close" size={15} style={{ color: C.onSurfaceVariant }} />
            </button>
          </div>

          {selectedTxns.length === 0 ? (
            <p style={{ fontFamily: "Geist", fontSize: 12.5, color: C.onSurfaceVariant }}>
              No income submitted this day.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedTxns.map((t, i) => (
                <div
                  key={t.id ?? t.txnId ?? i}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    padding: "10px 12px", borderRadius: 10, background: C.surfaceContainer,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: "Geist", fontSize: 12.5, fontWeight: 600, color: C.onSurface, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.service || "Service"}
                    </p>
                    <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 1 }}>
                      {fmt(toNum(t.grossAmount ?? t.amount))} total
                    </p>
                  </div>
                  <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 800, color: C.accent, whiteSpace: "nowrap" }}>
                    +{fmt(t.barberCut)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.outlineVariant}20`, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: `${C.accent}33` }} />
          <span style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant }}>Lower income</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: `${C.accent}80` }} />
          <span style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant }}>Higher income</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: C.accent }} />
          <span style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant }}>Today</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="celebration" size={12} style={{ color: C.accent }} />
          <span style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant }}>Holiday / Peak day</span>
        </div>
        <span style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginLeft: "auto" }}>
          Tap a day for details
        </span>
      </div>
    </div>
  );
};

export default EarningsCalendar;