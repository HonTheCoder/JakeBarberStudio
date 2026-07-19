import { useState, useMemo } from "react";
import { C } from "../tokens/design";
import { Icon } from "./ui";
import { fmt, toNum } from "../utils/currency";

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
    const totals = {};
    let sum = 0;
    let max = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayTxns = txnsByDay[key] ?? [];
      const total = dayTxns.reduce((s, t) => s + (Number(t.barberCut) || 0), 0);
      totals[key] = total;
      sum += total;
      if (total > max) max = total;
    }
    return { dayTotals: totals, monthTotal: sum, maxDayTotal: max };
  }, [txnsByDay, year, month, daysInMonth]);

  const intensityBg = (ratio) => {
    if (ratio >= 0.85) return `${C.accent}80`;
    if (ratio >= 0.55) return `${C.accent}59`;
    if (ratio >= 0.25) return `${C.accent}33`;
    return `${C.accent}14`;
  };

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

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedKey(isSelected ? null : dateKey)}
              style={{
                borderRadius: 10, padding: "8px 4px",
                textAlign: "center", cursor: "pointer",
                background: isToday ? C.accent : hasTxns ? intensityBg(ratio) : "transparent",
                border: isSelected
                  ? `1.5px solid ${C.accent}`
                  : isToday ? "none" : hasTxns ? `1.5px solid ${C.accent}30` : "1.5px solid transparent",
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
        <span style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginLeft: "auto" }}>
          Tap a day for details
        </span>
      </div>
    </div>
  );
};

export default EarningsCalendar;