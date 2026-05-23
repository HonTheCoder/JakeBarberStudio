import { useState, useMemo } from "react";
import useIsMobile from "../hooks/useIsMobile";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { C } from "../tokens/design";
import { KpiCard, Badge, Icon, SectionTitle, PrimaryBtn, SecondaryBtn } from "../components/ui";
import { NewSaleModal } from "../components/modals";
import { useTransactions } from "../hooks/useFirestore";
import { fmt } from "../utils/currency";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

const parseDate = str => {
  if (!str) return null;
  if (str?.toDate) return str.toDate();
  const d = new Date(str);
  return isNaN(d) ? null : d;
};

const toNum = v => parseFloat(String(v ?? "0").replace(/[$,]/g, "")) || 0;

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
    <div className="spin" style={{ width: 32, height: 32, border: `3px solid ${C.outlineVariant}`, borderTopColor: C.primary, borderRadius: "50%" }} />
  </div>
);

const SalesPage = ({ search = "" }) => {
  const { data: transactions, loading } = useTransactions();
  const [period,    setPeriod]    = useState("Weekly");
  const [showModal, setShowModal] = useState(false);
  const isMobile = useIsMobile();

  const exportCSV = () => {
    const headers = ["Transaction ID", "Date", "Client", "Service", "Barber", "Method", "Amount", "Status"];
    const rows = filtered.map(t => [
      t.txnId   ?? "",
      t.date    ?? "",
      t.client  ?? "",
      t.service ?? "",
      t.barber  ?? "",
      t.method  ?? "",
      t.amount  ?? "",
      t.status  ?? "",
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `sales_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const q = search.toLowerCase();
  const filtered = transactions.filter(t =>
    t.client?.toLowerCase().includes(q) ||
    t.txnId?.toLowerCase().includes(q)
  );

  const completed = transactions.filter(t => t.status === "Completed");
  const totalRevenue = completed.reduce((s, t) => s + toNum(t.amount), 0);
  const avgTicket    = completed.length ? (totalRevenue / completed.length).toFixed(2) : "0.00";

  // Build chart data from live transactions
  const chartData = useMemo(() => {
    const now = new Date();
    if (period === "Weekly") {
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const byDay = {};
      completed.forEach(t => {
        const d = parseDate(t.date ?? t.createdAt);
        if (!d || d < weekStart) return;
        const key = DAYS[d.getDay()];
        byDay[key] = (byDay[key] ?? 0) + toNum(t.amount);
      });
      return DAYS.map(day => ({ day, sales: byDay[day] ?? 0 }));
    } else {
      // Monthly: last 6 months
      const byMonth = {};
      completed.forEach(t => {
        const d = parseDate(t.date ?? t.createdAt);
        if (!d) return;
        const key = MONTHS[d.getMonth()];
        byMonth[key] = (byMonth[key] ?? 0) + toNum(t.amount);
      });
      const currentMonth = now.getMonth();
      return Array.from({ length: 6 }, (_, i) => {
        const mIdx = (currentMonth - 5 + i + 12) % 12;
        const month = MONTHS[mIdx];
        return { day: month, sales: byMonth[month] ?? 0 };
      });
    }
  }, [transactions, period]);

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>

      {showModal && <NewSaleModal onClose={() => setShowModal(false)} />}

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 12 : 20, marginBottom: isMobile ? 24 : 40 }}>
        <KpiCard icon="payments"     label="Total Revenue"  value={fmt(totalRevenue)}    trend="+12.5%" />
        <KpiCard icon="receipt"      label="Transactions"   value={transactions.length}  trend={`${transactions.length} total`} />
        <KpiCard icon="check_circle" label="Completed"      value={completed.length}     trend="live" />
        <KpiCard icon="trending_up"  label="Avg. Ticket"    value={fmt(avgTicket)}       trend="+3.1%" />
      </div>

      {/* Sales Chart */}
      <div className="card fade-up" style={{ padding: isMobile ? 20 : 36, marginBottom: isMobile ? 24 : 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-end", flexDirection: isMobile ? "column" : "row", gap: 12, marginBottom: isMobile ? 16 : 32 }}>
          <div>
            <h3 style={{ fontFamily: "Geist", fontSize: isMobile ? 16 : 20, fontWeight: 500, color: C.primary }}>
              {period === "Weekly" ? "Daily Sales Breakdown" : "Monthly Sales Breakdown"}
            </h3>
            {!isMobile && (
              <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginTop: 4 }}>
                {period === "Weekly" ? "This week's performance by day" : "Last 6 months performance"}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["Weekly", "Monthly"].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: "7px 16px", borderRadius: 999, background: period === p ? C.primary : "transparent", color: period === p ? "#fff" : C.onSurfaceVariant, border: `1px solid ${period === p ? C.primary : C.outlineVariant}`, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div style={{ height: isMobile ? 180 : 240, background: C.surfaceLow, borderRadius: 12 }} className="pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 240}>
            <BarChart data={chartData} barSize={isMobile ? 24 : 40}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.outlineVariant} strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontFamily: "Geist", fontSize: 10, fill: C.onSurfaceVariant }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 11, fill: C.onSurfaceVariant }} tickFormatter={v => fmt(v, true)} width={40} />
              <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${C.outlineVariant}`, borderRadius: 12, fontFamily: "Inter", fontSize: 13 }} formatter={v => [fmt(v), "Sales"]} />
              <Bar dataKey="sales" fill={C.primary} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Transactions Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <SectionTitle title="Recent Transactions" />
        <div style={{ display: "flex", gap: 8, marginTop: -28 }}>
          {!isMobile && <SecondaryBtn icon="download" onClick={exportCSV}>Export CSV</SecondaryBtn>}
          <PrimaryBtn icon="receipt_long" onClick={() => setShowModal(true)}>New Sale</PrimaryBtn>
        </div>
      </div>

      {loading ? <Spinner /> : isMobile ? (
        /* Mobile: cards */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(t => (
            <div key={t.id} className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 500, color: C.primary }}>{t.client}</div>
                  <div style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 }}>{t.txnId} · {t.date}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary }}>{t.amount}</div>
                  <div style={{ marginTop: 4 }}><Badge status={t.status} /></div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.onSurfaceVariant }}>
                <span>{t.service}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name={t.method === "Card" ? "credit_card" : "payments"} size={13} style={{ color: C.onSurfaceVariant }} />
                  <span>{t.method}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: C.onSurfaceVariant, fontSize: 13 }}>No transactions found</div>
          )}
        </div>
      ) : (
        /* Desktop: table */
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: C.surfaceLow }}>
                  {["Transaction", "Client", "Service", "Barber", "Method", "Amount", "Status"].map(h => (
                    <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} style={{ borderTop: `1px solid ${C.outlineVariant}20`, transition: "background 0.15s", cursor: "pointer" }} onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow + "60")} onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "15px 20px" }}>
                      <div style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: C.onSurfaceVariant }}>{t.txnId}</div>
                      <div style={{ fontSize: 11, color: C.onSurfaceVariant, opacity: 0.6, marginTop: 2 }}>{t.date}</div>
                    </td>
                    <td style={{ padding: "15px 20px", fontFamily: "Geist", fontSize: 14, fontWeight: 500, color: C.primary, whiteSpace: "nowrap" }}>{t.client}</td>
                    <td style={{ padding: "15px 20px", fontSize: 13, color: C.onSurface }}>{t.service}</td>
                    <td style={{ padding: "15px 20px", fontSize: 13, color: C.onSurfaceVariant, whiteSpace: "nowrap" }}>{t.barber}</td>
                    <td style={{ padding: "15px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name={t.method === "Card" ? "credit_card" : "payments"} size={15} style={{ color: C.onSurfaceVariant }} />
                        <span style={{ fontSize: 13, color: C.onSurfaceVariant }}>{t.method}</span>
                      </div>
                    </td>
                    <td style={{ padding: "15px 20px", fontFamily: "Geist", fontSize: 15, fontWeight: 600, color: C.primary }}>{t.amount}</td>
                    <td style={{ padding: "15px 20px" }}><Badge status={t.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: "center", color: C.onSurfaceVariant, fontSize: 13 }}>No transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;