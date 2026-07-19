import { useState } from "react";
import useIsMobile from "../hooks/useIsMobile";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { C } from "../tokens/design";
import { useAuth } from "../context/AuthContext";
import { useStats } from "../hooks/useStats";
import { AddClientModal, AddStylistModal } from "../components/modals";
import EarningsCalendar from "../components/EarningsCalendar";
import { Icon, Badge, SectionTitle } from "../components/ui";

import { fmt, toNum } from "../utils/currency";

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
const Sk = ({ w = "100%", h = 16, r = 8, style: s = {} }) => (
  <div className="pulse" style={{ width: w, height: h, borderRadius: r, background: C.surfaceLow, ...s }} />
);

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, sub, accent = false, loading }) => (
  <div className="card fade-up" style={{ padding: "24px 28px" }}>
    {loading ? (
      <>
        <Sk w={40} h={40} r={12} style={{ marginBottom: 20 }} />
        <Sk w="55%" h={11} style={{ marginBottom: 8 }} />
        <Sk w="70%" h={30} />
      </>
    ) : (
      <>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: accent ? C.secondaryContainer : C.surfaceLow,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
        }}>
          <Icon name={icon} size={20} style={{ color: accent ? C.secondary : C.onSurfaceVariant }} />
        </div>
        <p style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>
          {label}
        </p>
        <p style={{ fontFamily: "Geist", fontSize: 30, fontWeight: 500, letterSpacing: "-0.01em", color: C.primary, lineHeight: 1.1 }}>
          {value}
        </p>
        {sub && (
          <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant, marginTop: 6 }}>{sub}</p>
        )}
      </>
    )}
  </div>
);

/* ─── Quick Action Button ────────────────────────────────────────────────── */
const QuickAction = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 20px", borderRadius: 14,
      background: C.surfaceLowest,
      border: `1px solid ${C.outlineVariant}`,
      fontFamily: "Geist", fontSize: 12, fontWeight: 600,
      letterSpacing: "0.06em", textTransform: "uppercase",
      color: C.onSurface, cursor: "pointer",
      transition: "all 0.18s",
    }}
    onMouseOver={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.color = C.onPrimary; e.currentTarget.style.borderColor = C.primary; }}
    onMouseOut={e => { e.currentTarget.style.background = C.surfaceLowest; e.currentTarget.style.color = C.onSurface; e.currentTarget.style.borderColor = C.outlineVariant; }}
  >
    <Icon name={icon} size={18} />
    {label}
  </button>
);

/* ─── Custom Chart Tooltip ───────────────────────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: 10, padding: "8px 14px", fontFamily: "Geist", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{fmt(p.value)}</p>
      ))}
    </div>
  );
};

/* ─── Client Avatar + Name ───────────────────────────────────────────────── */
const ClientAvatar = ({ initials, name, sub, status }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: status === "VIP" ? C.secondaryContainer : C.surfaceLow,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Geist", fontSize: 12, fontWeight: 700,
      color: status === "VIP" ? C.secondary : C.onSurfaceVariant,
      flexShrink: 0,
    }}>
      {initials}
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
      {sub && <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 1 }}>{sub}</p>}
    </div>
  </div>
);

/* ─── Schedule helpers ───────────────────────────────────────────────────── */

/**
 * Parse a Firestore date value into a JS Date.
 * Handles Timestamp objects, ISO strings, and "Oct 14, 3:22 PM" style strings.
 */
const parseTxDate = (val) => {
  if (!val) return null;
  if (val?.toDate) return val.toDate();           // Firestore Timestamp
  const d = new Date(val);
  return isNaN(d) ? null : d;
};

/**
 * Format a Date to "3:22 PM" display.
 */
const fmtTime = (date) =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

/**
 * Status pill colour map for appointments.
 */
const apptStatusStyle = (status) => {
  switch (status) {
    case "Completed": return { bg: "#e6f4ea", color: "#1a7a3c" };
    case "Refunded":  return { bg: C.errorContainer, color: C.error };
    default:          return { bg: C.secondaryContainer, color: C.secondary }; // Pending / In-Progress
  }
};

/* ─── Today's Schedule panel (real appointment times) ───────────────────── */
const TodaySchedule = ({ appointments, loading }) => {
  if (loading) {
    return (
      <div className="card" style={{ padding: 28 }}>
        <SectionTitle title="Today's Schedule" subtitle="Your appointments" />
        {Array(4).fill(null).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 18, alignItems: "flex-start" }}>
            <Sk w={52} h={36} r={8} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Sk w="55%" h={13} style={{ marginBottom: 6 }} />
              <Sk w="75%" h={11} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!appointments.length) {
    return (
      <div className="card" style={{ padding: 28 }}>
        <SectionTitle title="Today's Schedule" subtitle="Your appointments" />
        <div style={{ paddingTop: 24, textAlign: "center" }}>
          <Icon name="event_available" size={32} style={{ color: C.outlineVariant, marginBottom: 8 }} />
          <p style={{ fontFamily: "Geist", fontSize: 13, color: C.onSurfaceVariant }}>
            No appointments for today
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 28 }}>
      <SectionTitle title="Today's Schedule" subtitle={`${appointments.length} appointment${appointments.length !== 1 ? "s" : ""} today`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {appointments.map((appt, i) => {
          const pill = apptStatusStyle(appt.status);
          const isLast = i === appointments.length - 1;
          return (
            <div
              key={appt.id ?? i}
              style={{
                display: "flex", alignItems: "flex-start", gap: 16,
                padding: "14px 0",
                borderBottom: isLast ? "none" : `1px solid ${C.outlineVariant}20`,
              }}
            >
              {/* Time column — sourced from the actual date field */}
              <div style={{
                minWidth: 56, textAlign: "center",
                background: C.surfaceLow, borderRadius: 8,
                padding: "6px 4px", flexShrink: 0,
              }}>
                <p style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 700, color: C.primary, lineHeight: 1.2 }}>
                  {appt.displayTime}
                </p>
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.primary, marginBottom: 2 }}>
                  {appt.client ?? "—"}
                </p>
                <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant }}>
                  {appt.service ?? "Service not specified"}
                </p>
              </div>

              {/* Right: amount + status */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                {appt.amount && (
                  <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.primary }}>
                    {appt.amount}
                  </p>
                )}
                <span style={{
                  fontFamily: "Geist", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "2px 8px", borderRadius: 20,
                  background: pill.bg, color: pill.color,
                }}>
                  {appt.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
const AdminDashboard = ({ stats, loading, clients, stylists, userId, userEmail }) => {
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddBarber, setShowAddBarber] = useState(false);
  const isMobile = useIsMobile();

  const activeBarbers = (stylists ?? []).filter(s => s.status === "Active").length;
  const recentClients = (clients ?? []).slice(0, 4);

  // Admin's own submitted income (same owner-operator model as BarberDashboard)
  // — uid match first, name fallback — so their personal calendar below shows
  // only days *they* logged income on, not the whole shop's transactions.
  const stylistRecord = (stylists ?? []).find(s => s.uid === userId);
  const myBarberName = stylistRecord?.name
    ?? (userEmail ? userEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Me");
  const allTx = stats?.transactions ?? [];
  const myTx = allTx.filter(t =>
    t.barberUid
      ? t.barberUid === userId
      : (t.barber ?? "").toLowerCase() === myBarberName.toLowerCase()
  );

  const monthlyRevenue = stats?.monthlyRevenue ?? 0;
  const monthlyTarget  = stats?.monthlyTarget ?? 0;
  const targetPct = monthlyTarget > 0 ? Math.min(100, Math.round((monthlyRevenue / monthlyTarget) * 100)) : 0;
  const targetMet = monthlyTarget > 0 && monthlyRevenue >= monthlyTarget;

  const cards = [
    { icon: "payments",     label: "Today Sales",    value: fmt(stats?.dailyRevenue ?? 0), loading },
    { icon: "group",        label: "Total Clients",  value: stats?.clientCount ?? 0,        loading },
    { icon: "content_cut",  label: "Active Barbers", value: activeBarbers,                  accent: true, loading },
  ];

  return (
    <div>
      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        {cards.map((c, i) => <StatCard key={i} {...c} />)}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 36 }}>
        <QuickAction icon="person_add"   label="Add Client" onClick={() => setShowAddClient(true)} />
        <QuickAction icon="content_cut"  label="Add Barber" onClick={() => setShowAddBarber(true)} />
      </div>

      {/* ── Sales Overview (Today / Week / Month) ── */}
      <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 12 }}>
        Sales Overview
      </p>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
        <StatCard icon="today"          label="Today"      value={fmt(stats?.dailyRevenue   ?? 0)} sub="Sales collected today"    loading={loading} accent />
        <StatCard icon="date_range"     label="This Week"  value={fmt(stats?.weeklySales     ?? 0)} sub="Current calendar week"    loading={loading} />
        <StatCard icon="calendar_month" label="This Month" value={fmt(stats?.monthlyRevenue  ?? 0)} sub={new Date().toLocaleString("en-PH", { month: "long", year: "numeric" })} loading={loading} />
      </div>

      {/* ── Monthly Revenue Target — current vs. the target set in Settings ── */}
      <div className="card" style={{ padding: "24px 28px", marginBottom: 36 }}>
        {loading ? (
          <>
            <Sk w="40%" h={13} style={{ marginBottom: 14 }} />
            <Sk w="100%" h={10} r={999} style={{ marginBottom: 10 }} />
            <Sk w="55%" h={12} />
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div>
                <p style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 600, color: C.primary }}>
                  Monthly Revenue Target
                </p>
                <p style={{ fontFamily: "Geist", fontSize: 11.5, color: C.onSurfaceVariant, marginTop: 2 }}>
                  {new Date().toLocaleString("en-PH", { month: "long", year: "numeric" })} progress
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 700, color: C.primary }}>
                  {fmt(monthlyRevenue)} <span style={{ fontWeight: 400, color: C.onSurfaceVariant, fontSize: 13 }}>of {fmt(monthlyTarget)}</span>
                </p>
              </div>
            </div>

            <div style={{ width: "100%", height: 10, borderRadius: 999, background: C.surfaceLow, overflow: "hidden" }}>
              <div style={{
                width: `${targetPct}%`, height: "100%", borderRadius: 999,
                background: targetMet ? "#1a7a3c" : C.primary,
                transition: "width 0.4s ease",
              }} />
            </div>

            <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant, marginTop: 10 }}>
              {targetMet
                ? `Target reached — ${targetPct}% of goal 🎉`
                : `${targetPct}% of target reached · ${fmt(Math.max(0, monthlyTarget - monthlyRevenue))} to go`}
            </p>
          </>
        )}
      </div>


      {/* ── Weekly Sales Chart + Recent Clients ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 24, marginBottom: 28, alignItems: "start" }}>

        {/* Weekly Sales Bar Chart */}
        <div className="card" style={{ padding: 28 }}>
          <SectionTitle title="Weekly Sales" subtitle="Revenue by day this week" />
          {loading ? (
            <Sk h={200} r={12} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.salesData} barSize={28} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${C.outlineVariant}30`} vertical={false} />
                <XAxis dataKey="day" tick={{ fontFamily: "Geist", fontSize: 11, fill: C.onSurfaceVariant }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmt(v, true)} tick={{ fontFamily: "Geist", fontSize: 11, fill: C.onSurfaceVariant }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--c-accent-soft)", radius: [6, 6, 0, 0] }} />
                <Bar dataKey="sales" name="Sales" fill={C.accent} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Clients */}
        <div className="card" style={{ padding: 28 }}>
          <SectionTitle title="Recent Clients" subtitle="Latest additions" />
          {loading
            ? Array(4).fill(null).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <Sk w={36} h={36} r="50%" />
                  <div style={{ flex: 1 }}><Sk w="60%" h={13} style={{ marginBottom: 6 }} /><Sk w="40%" h={11} /></div>
                </div>
              ))
            : recentClients.length === 0
              ? (
                <div style={{ paddingTop: 24, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${C.secondary}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Icon name="group" size={26} style={{ color: C.secondary }} />
                  </div>
                  <p style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 6 }}>No clients yet</p>
                  <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant, marginBottom: 20 }}>Add your first client to get started.</p>
                  <button
                    onClick={() => setShowAddClient(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 10, background: C.primary, color: C.onPrimary, fontFamily: "Geist", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "opacity 0.15s" }}
                    onMouseOver={e => (e.currentTarget.style.opacity = "0.88")}
                    onMouseOut={e => (e.currentTarget.style.opacity = "1")}
                  >
                    <Icon name="person_add" size={15} style={{ color: C.onPrimary }} />
                    Add your first client
                  </button>
                </div>
              )
              : recentClients.map((c, i) => (
                <div key={c.id ?? i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < recentClients.length - 1 ? `1px solid ${C.outlineVariant}20` : "none" }}>
                  <ClientAvatar initials={c.initials} name={c.name} sub={c.lastVisit} status={c.status} />
                  <Badge status={c.status} />
                </div>
              ))
          }
        </div>
      </div>

      {/* ── My Earnings Calendar ── */}
      <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 12 }}>
        My Earnings Calendar
      </p>
      <EarningsCalendar txns={myTx} />

      {/* ── Add Client Modal ── */}
      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onSaved={() => setShowAddClient(false)}
        />
      )}

      {/* ── Add Barber Modal ── */}
      {showAddBarber && (
        <AddStylistModal onClose={() => setShowAddBarber(false)} />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   BARBER DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
const BarberDashboard = ({ stats, loading, clients, userId, userEmail, stylists }) => {
  const isMobile = useIsMobile();
  /* ── Resolve barber's display name from stylists collection via uid ── */
  const stylistRecord = (stylists ?? []).find(s => s.uid === userId);
  const barberName = stylistRecord?.name
    ?? (userEmail ? userEmail.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Barber");

  /* ── Filter transactions for this barber — uid match first, name fallback ── */
  const allTx = stats?.transactions ?? [];
  const myTx = allTx.filter(t =>
    t.barberUid
      ? t.barberUid === userId
      : (t.barber ?? "").toLowerCase() === barberName.toLowerCase()
  );
  const myCompleted = myTx.filter(t => t.status === "Completed");
  const myPending = myTx.filter(t => t.status !== "Completed" && t.status !== "Refunded");

  const recentClients = (clients ?? []).slice(0, 3);

  /* ── Date-scoped earnings (today / this week / this month) ───────────────
     Each completed transaction's real date is parsed once, then bucketed —
     matches the same day/week/month boundaries used elsewhere in the app. */
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const myCompletedDated = myCompleted.map(t => ({ ...t, _d: parseTxDate(t.date) ?? parseTxDate(t.createdAt) }));
  const todayEarnings = myCompletedDated.filter(t => t._d && t._d.toDateString() === now.toDateString()).reduce((s, t) => s + toNum(t.amount), 0);
  const weekEarnings  = myCompletedDated.filter(t => t._d && t._d >= weekStart).reduce((s, t) => s + toNum(t.amount), 0);
  const monthEarnings = myCompletedDated.filter(t => t._d && t._d >= monthStart).reduce((s, t) => s + toNum(t.amount), 0);
  const clientsServedToday = myCompletedDated.filter(t => t._d && t._d.toDateString() === now.toDateString()).length;

  /* ── Build today's schedule from real appointment time fields ────────────
     Each transaction's `date` field holds the actual appointment datetime,
     e.g. "Oct 14, 3:22 PM" or a Firestore Timestamp.
     We parse it, filter to today, sort ascending by time, then display the
     real formatted time — no hardcoded TIMES array, no positional index.
  ─────────────────────────────────────────────────────────────────────── */

  const todayAppointments = myTx
    .map(t => {
      const date = parseTxDate(t.date);
      return { ...t, _parsed: date };
    })
    .filter(t => t._parsed && t._parsed.toDateString() === now.toDateString())
    .sort((a, b) => a._parsed - b._parsed)          // ascending chronological order
    .map(t => ({
      ...t,
      displayTime: fmtTime(t._parsed),              // e.g. "3:22 PM" from real date
    }));

  return (
    <div>
      {/* ── Greeting ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "Geist", fontSize: 13, color: C.onSurfaceVariant, marginBottom: 4 }}>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h2 style={{ fontFamily: "Geist", fontSize: 22, fontWeight: 500, color: C.primary }}>
          Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, {barberName.split(" ")[0]} 👋
        </h2>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 32 }}>
        <StatCard icon="payments"    label="Today Earnings"  value={fmt(todayEarnings)}       loading={loading} accent />
        <StatCard icon="group"       label="Clients Served"  value={clientsServedToday}       loading={loading} />
        <StatCard icon="pending"     label="Pending"         value={myPending.length}         loading={loading} />
      </div>

      {/* ── Earnings Overview (Today / Week / Month) ── */}
      <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 12 }}>
        Earnings Overview
      </p>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
        <StatCard icon="today"          label="Today"      value={fmt(todayEarnings)} sub="Your take home today"    loading={loading} accent />
        <StatCard icon="date_range"     label="This Week"  value={fmt(weekEarnings)}  sub="Current calendar week"   loading={loading} />
        <StatCard icon="calendar_month" label="This Month" value={fmt(monthEarnings)} sub={new Date().toLocaleString("en-PH", { month: "long", year: "numeric" })} loading={loading} />
      </div>

      {/* ── Today's Schedule + Recent Clients ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 24, alignItems: "start" }}>

        {/* Today's Schedule — real times from transaction date field */}
        <TodaySchedule appointments={todayAppointments} loading={loading} />

        {/* Recent Clients */}
        <div className="card" style={{ padding: 28 }}>
          <SectionTitle title="Recent Clients" subtitle="Your regulars" />
          {loading
            ? Array(3).fill(null).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <Sk w={36} h={36} r="50%" />
                  <div style={{ flex: 1 }}><Sk w="65%" h={13} style={{ marginBottom: 5 }} /><Sk w="45%" h={11} /></div>
                </div>
              ))
            : recentClients.length === 0
              ? (
                <div style={{ paddingTop: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.secondary}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Icon name="group" size={24} style={{ color: C.secondary }} />
                  </div>
                  <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.primary, marginBottom: 4 }}>No clients yet</p>
                  <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant }}>Clients will appear here after visits.</p>
                </div>
              )
              : recentClients.map((c, i) => (
                <div key={c.id ?? i} style={{ padding: "10px 0", borderBottom: i < recentClients.length - 1 ? `1px solid ${C.outlineVariant}20` : "none" }}>
                  <ClientAvatar initials={c.initials} name={c.name} sub={`${c.visits} visits`} status={c.status} />
                </div>
              ))
          }
          {!loading && recentClients.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.outlineVariant}20` }}>
              <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, textAlign: "center" }}>
                {(clients ?? []).length} total clients
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Earnings Calendar ── */}
      <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginTop: 28, marginBottom: 12 }}>
        Earnings Calendar
      </p>
      <EarningsCalendar txns={myTx} />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT EXPORT
═══════════════════════════════════════════════════════════════════════════ */
const DashboardPage = () => {
  const { role, user } = useAuth();
  const { stats, loading, clients, stylists } = useStats();

  if (role === "barber") {
    return (
      <BarberDashboard
        stats={stats}
        loading={loading}
        clients={clients}
        stylists={stylists}
        userId={user?.uid}
        userEmail={user?.email}
      />
    );
  }

  return (
    <AdminDashboard
      stats={stats}
      loading={loading}
      clients={clients}
      stylists={stylists}
      userId={user?.uid}
      userEmail={user?.email}
    />
  );
};

export default DashboardPage;