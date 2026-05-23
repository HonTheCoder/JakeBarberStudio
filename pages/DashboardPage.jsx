import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { C } from "../tokens/design";
import { useAuth } from "../context/AuthContext";
import { useStats } from "../hooks/useStats";
import { useClients, useStylists, addAppointment, useAppointments } from "../hooks/useFirestore";
import { AddClientModal, AddStylistModal } from "../components/modals";
import { Icon, Badge, SectionTitle } from "../components/ui";

import { fmt } from "../utils/currency";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

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
    onMouseOver={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = C.primary; }}
    onMouseOut={e => { e.currentTarget.style.background = C.surfaceLowest; e.currentTarget.style.color = C.onSurface; e.currentTarget.style.borderColor = C.outlineVariant; }}
  >
    <Icon name={icon} size={18} />
    {label}
  </button>
);

/* ─── Status Badge for Appointments ─────────────────────────────────────── */
const ApptBadge = ({ status }) => {
  const map = {
    Completed: { bg: "#dcfce7", color: "#166534" },
    Pending:   { bg: "#fef9c3", color: "#854d0e" },
    Cancelled: { bg: "#ffdad6", color: "#ba1a1a" },
    Confirmed: { bg: "#dbeafe", color: "#1e40af" },
  };
  const { bg = C.surfaceLow, color = C.onSurfaceVariant } = map[status] || {};
  return (
    <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontFamily: "Geist", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
};

/* ─── Custom Chart Tooltip ───────────────────────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.outlineVariant}`, borderRadius: 10, padding: "8px 14px", fontFamily: "Geist", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 13, fontWeight: 500, color: C.primary }}>{fmt(p.value)}</p>
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

/* ─── Add Appointment Modal ──────────────────────────────────────────────── */
const SERVICES = ["Haircut", "Beard Trim", "Haircut & Beard", "Hot Towel Shave", "Hair Colour", "Fade", "Kids Cut"];
const TIMES    = ["9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM"];

const inputStyle = {
  width: "100%", padding: "10px 14px",
  background: C.surfaceLow,
  border: `1px solid ${C.outlineVariant}40`,
  borderRadius: 10,
  fontFamily: "Inter", fontSize: 14, color: C.onSurface,
  boxSizing: "border-box",
};

const AddAppointmentModal = ({ onClose, clients, stylists, userId }) => {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    client:  "",
    barber:  "",
    service: SERVICES[0],
    date:    today,
    time:    TIMES[0],
    notes:   "",
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");
  const [done, setDone] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async () => {
    if (!form.client.trim()) { setErr("Please enter a client name."); return; }
    if (!form.barber.trim()) { setErr("Please select a barber."); return; }
    setBusy(true); setErr("");
    try {
      const selectedStylist = (stylists ?? []).find(s => s.name === form.barber);
      await addAppointment({
        client:    form.client.trim(),
        barber:    form.barber,
        barberUid: selectedStylist?.uid ?? null,
        service:   form.service,
        date:      form.date,
        time:      form.time,
        notes:     form.notes.trim(),
        status:    "Pending",
        amount:    "0",
      });
      setDone(true);
    } catch (e) {
      setErr("Failed to save appointment. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const activeBarbers = (stylists ?? []).filter(s => s.status === "Active");

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ padding: 32, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>

        {done ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ width: 52, height: 52, background: "#dcfce7", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="event_available" size={26} style={{ color: "#166534" }} />
            </div>
            <p style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary, marginBottom: 6 }}>Appointment booked!</p>
            <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginBottom: 24 }}>
              <strong>{form.client}</strong> with <strong>{form.barber}</strong> at <strong>{form.time}</strong> on <strong>{form.date}</strong>.
            </p>
            <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 12, background: C.primary, color: "#fff", fontFamily: "Geist", fontSize: 13, fontWeight: 600 }}>
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, background: C.surfaceLow, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="event_add" size={20} style={{ color: C.primary }} />
                </div>
                <h2 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 500, color: C.primary }}>Add Appointment</h2>
              </div>
              <button onClick={onClose} style={{ padding: 6, borderRadius: 8 }}
                onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
                onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
              </button>
            </div>

            {/* Client */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Client *</label>
              <input style={inputStyle} list="client-list" placeholder="Search or enter client name" value={form.client} onChange={set("client")} />
              <datalist id="client-list">
                {(clients ?? []).map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>

            {/* Barber */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Barber *</label>
              <select style={{ ...inputStyle, appearance: "none" }} value={form.barber} onChange={set("barber")}>
                <option value="">Select barber…</option>
                {activeBarbers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            {/* Service */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Service</label>
              <select style={{ ...inputStyle, appearance: "none" }} value={form.service} onChange={set("service")}>
                {SERVICES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Date + Time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Date</label>
                <input type="date" style={inputStyle} value={form.date} onChange={set("date")} />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Time</label>
                <select style={{ ...inputStyle, appearance: "none" }} value={form.time} onChange={set("time")}>
                  {TIMES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Notes</label>
              <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} placeholder="Optional notes…" value={form.notes} onChange={set("notes")} />
            </div>

            {err && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fef2f2", borderRadius: 10, marginBottom: 16 }}>
                <Icon name="error" size={15} style={{ color: C.error, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.error }}>{err}</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.outlineVariant}`, fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: C.onSurfaceVariant }}>Cancel</button>
              <button onClick={handle} disabled={busy} style={{ padding: "10px 20px", borderRadius: 10, background: busy ? C.outlineVariant : C.primary, color: "#fff", fontFamily: "Geist", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, opacity: busy ? 0.7 : 1 }}>
                {busy && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
                {busy ? "Saving…" : "Book Appointment"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
const AdminDashboard = ({ stats, loading, clients, stylists, appointments, userId }) => {
  const [showAddAppt,   setShowAddAppt]   = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddBarber, setShowAddBarber] = useState(false);

  /* ── Today's appointments from real appointments collection ── */
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppts = (appointments ?? [])
    .filter(a => a.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const activeBarbers = (stylists ?? []).filter(s => s.status === "Active").length;
  const recentClients = (clients ?? []).slice(0, 4);

  const cards = [
    { icon: "payments",     label: "Today Sales",         value: fmt(stats?.dailyRevenue ?? 0),  loading },
    { icon: "event",        label: "Today Appointments",  value: todayAppts.length,               loading },
    { icon: "group",        label: "Total Clients",       value: stats?.clientCount ?? 0,         loading },
    { icon: "content_cut",  label: "Active Barbers",      value: activeBarbers,                   accent: true, loading },
  ];

  return (
    <div>
      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20, marginBottom: 32 }}>
        {cards.map((c, i) => <StatCard key={i} {...c} />)}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 36 }}>
        <QuickAction icon="event_add"    label="Add Appointment" onClick={() => setShowAddAppt(true)} />
        <QuickAction icon="person_add"   label="Add Client"      onClick={() => setShowAddClient(true)} />
        <QuickAction icon="content_cut"  label="Add Barber"      onClick={() => setShowAddBarber(true)} />
      </div>

      {/* ── Weekly Sales Chart + Recent Clients ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, marginBottom: 28, alignItems: "start" }}>

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
                <YAxis tickFormatter={v => `$${v / 1000}k`} tick={{ fontFamily: "Geist", fontSize: 11, fill: C.onSurfaceVariant }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<ChartTip />} cursor={{ fill: `${C.primary}08` }} />
                <Bar dataKey="sales" name="Sales" fill={C.primary} radius={[6, 6, 0, 0]} />
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
            : recentClients.map((c, i) => (
                <div key={c.id ?? i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < recentClients.length - 1 ? `1px solid ${C.outlineVariant}20` : "none" }}>
                  <ClientAvatar initials={c.initials} name={c.name} sub={c.lastVisit} status={c.status} />
                  <Badge status={c.status} />
                </div>
              ))
          }
        </div>
      </div>

      {/* ── Today's Appointments Table ── */}
      <div className="card" style={{ padding: 28 }}>
        <SectionTitle title="Today's Appointments" subtitle={`${todayAppts.length} scheduled for today`} />
        {loading ? (
          <Sk h={160} r={12} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Geist" }}>
              <thead>
                <tr>
                  {["Time", "Client", "Barber", "Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0 16px 14px 0", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, borderBottom: `1px solid ${C.outlineVariant}30` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayAppts.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "24px 0", textAlign: "center", color: C.onSurfaceVariant, fontSize: 13 }}>No appointments today</td></tr>
                ) : todayAppts.map((a, i) => (
                  <tr key={i}>
                    <td style={{ padding: "14px 16px 14px 0", borderBottom: i < todayAppts.length - 1 ? `1px solid ${C.outlineVariant}20` : "none" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>{a.time}</span>
                    </td>
                    <td style={{ padding: "14px 16px 14px 0", borderBottom: i < todayAppts.length - 1 ? `1px solid ${C.outlineVariant}20` : "none" }}>
                      <span style={{ fontSize: 13, color: C.onSurface }}>{a.client}</span>
                    </td>
                    <td style={{ padding: "14px 16px 14px 0", borderBottom: i < todayAppts.length - 1 ? `1px solid ${C.outlineVariant}20` : "none" }}>
                      <span style={{ fontSize: 13, color: C.onSurfaceVariant }}>{a.barber}</span>
                    </td>
                    <td style={{ padding: "14px 0", borderBottom: i < todayAppts.length - 1 ? `1px solid ${C.outlineVariant}20` : "none" }}>
                      <ApptBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Appointment Modal ── */}
      {showAddAppt && (
        <AddAppointmentModal
          onClose={() => setShowAddAppt(false)}
          clients={clients}
          stylists={stylists}
          userId={userId}
        />
      )}

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
const BarberDashboard = ({ stats, loading, clients, userId, userEmail, stylists, appointments }) => {
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
  const myEarnings = myCompleted.reduce((s, t) => s + (parseFloat(String(t.amount ?? "0").replace(/[$,]/g, "")) || 0), 0);
  const myPending = myTx.filter(t => t.status !== "Completed" && t.status !== "Refunded");

  /* ── Today's schedule from real appointments collection — uid match first ── */
  const todayStr = new Date().toISOString().split("T")[0];
  const schedule = (appointments ?? [])
    .filter(a => a.date === todayStr && (
      a.barberUid
        ? a.barberUid === userId
        : (a.barber ?? "").toLowerCase() === barberName.toLowerCase()
    ))
    .sort((a, b) => a.time.localeCompare(b.time))
    .map(a => ({
      time:     a.time,
      client:   a.client,
      service:  a.service,
      status:   a.status ?? "Pending",
      initials: (a.client ?? "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    }));

  const recentClients = (clients ?? []).slice(0, 3);

  const statusStyle = {
    Completed:    { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
    "In Progress":{ bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
    Pending:      { bg: C.surfaceLow, color: C.onSurfaceVariant, dot: C.outlineVariant },
  };

  return (
    <div>
      {/* ── Greeting ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "Geist", fontSize: 13, color: C.onSurfaceVariant, marginBottom: 4 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h2 style={{ fontFamily: "Geist", fontSize: 22, fontWeight: 500, color: C.primary }}>
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {barberName.split(" ")[0]} 👋
        </h2>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 20, marginBottom: 32 }}>
        <StatCard icon="payments"    label="Today Earnings"      value={fmt(myEarnings)}       loading={loading} accent />
        <StatCard icon="group"       label="Clients Served"      value={myCompleted.length}     loading={loading} />
        <StatCard icon="pending"     label="Pending"             value={myPending.length}        loading={loading} />
      </div>

      {/* ── Today's Schedule + Recent Clients ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 24, alignItems: "start" }}>

        {/* Today Schedule — main focus */}
        <div className="card" style={{ padding: 28 }}>
          <SectionTitle title="Today's Schedule" subtitle={`${schedule.length} appointments`} />
          {loading ? (
            Array(5).fill(null).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < 4 ? `1px solid ${C.outlineVariant}20` : "none" }}>
                <Sk w={48} h={48} r={12} />
                <div style={{ flex: 1 }}><Sk w="40%" h={13} style={{ marginBottom: 6 }} /><Sk w="60%" h={11} /></div>
                <Sk w={70} h={22} r={999} />
              </div>
            ))
          ) : schedule.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.onSurfaceVariant }}>
              <Icon name="event_available" size={36} style={{ opacity: 0.3, display: "block", margin: "0 auto 12px" }} />
              <p style={{ fontFamily: "Geist", fontSize: 13 }}>No appointments scheduled today</p>
            </div>
          ) : schedule.map((appt, i) => {
            const { bg, color, dot } = statusStyle[appt.status] ?? statusStyle.Pending;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "14px 0",
                borderBottom: i < schedule.length - 1 ? `1px solid ${C.outlineVariant}20` : "none",
              }}>
                {/* Time */}
                <div style={{ width: 64, flexShrink: 0 }}>
                  <p style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: C.primary }}>{appt.time}</p>
                </div>

                {/* Dot */}
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />

                {/* Client info */}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.surfaceLow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "Geist", fontSize: 12, fontWeight: 700, color: C.onSurfaceVariant }}>
                  {appt.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {appt.client}
                  </p>
                  <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {appt.service}
                  </p>
                </div>

                {/* Status */}
                <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 999, fontSize: 10, fontFamily: "Geist", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {appt.status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Recent Clients (compact) */}
        <div className="card" style={{ padding: 24 }}>
          <SectionTitle title="Recent Clients" subtitle="Your regulars" />
          {loading
            ? Array(3).fill(null).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <Sk w={36} h={36} r="50%" />
                  <div style={{ flex: 1 }}><Sk w="65%" h={13} style={{ marginBottom: 5 }} /><Sk w="45%" h={11} /></div>
                </div>
              ))
            : recentClients.map((c, i) => (
                <div key={c.id ?? i} style={{ padding: "10px 0", borderBottom: i < recentClients.length - 1 ? `1px solid ${C.outlineVariant}20` : "none" }}>
                  <ClientAvatar initials={c.initials} name={c.name} sub={`${c.visits} visits`} status={c.status} />
                </div>
              ))
          }
          {!loading && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.outlineVariant}20` }}>
              <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, textAlign: "center" }}>
                {(clients ?? []).length} total clients
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT EXPORT
═══════════════════════════════════════════════════════════════════════════ */
const DashboardPage = () => {
  const { role, user } = useAuth();
  const { stats, loading } = useStats();
  const { data: clients } = useClients();
  const { data: stylists } = useStylists();
  const { data: appointments } = useAppointments();

  if (role === "barber") {
    return (
      <BarberDashboard
        stats={stats}
        loading={loading}
        clients={clients}
        stylists={stylists}
        userId={user?.uid}
        userEmail={user?.email}
        appointments={appointments}
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
      appointments={appointments}
    />
  );
};

export default DashboardPage;