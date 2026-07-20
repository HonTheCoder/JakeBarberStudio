import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { C } from "../tokens/design";
import { KpiCard, SectionTitle, SecondaryBtn, PrimaryBtn } from "../components/ui";
import { NewSaleModal } from "../components/modals";
import { useStats } from "../hooks/useStats";
import { useClients } from "../hooks/useFirestore";
import { useSettingsContext } from "../context/useSettingsContext";
import useIsMobile from "../hooks/useIsMobile";
import { fmt, toNum, parseDate } from "../utils/currency";

/* ── Skeleton ────────────────────────────────────────────────────────────── */
const Shimmer = ({ w = "100%", h = 24, r = 8 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: `linear-gradient(90deg, ${C.surfaceHigh} 25%, ${C.surfaceContainer} 50%, ${C.surfaceHigh} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
);

/* ── Shared card primitives ──────────────────────────────────────────────── */
const Card = ({ children, style = {} }) => (
  <div className="card" style={{ padding: 0, overflow: "hidden", ...style }}>{children}</div>
);
const CardInner = ({ children, style = {} }) => (
  <div style={{ padding: "28px 32px", ...style }}>{children}</div>
);
const ChartTitle = ({ title, sub }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 500, color: C.primary }}>{title}</h3>
    {sub && <p style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 3 }}>{sub}</p>}
  </div>
);
const StatRow = ({ label, value, highlight = false, last = false }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: last ? "none" : `1px solid ${C.outlineVariant}20` }}>
    <span style={{ fontSize: 13, color: C.onSurfaceVariant }}>{label}</span>
    <span style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 600, color: highlight ? C.secondary : C.primary }}>{value}</span>
  </div>
);

const TOOLTIP_STYLE = { background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: 12, fontFamily: "Inter", fontSize: 13, color: C.onSurface, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" };

const AGE_BRACKETS = [
  { label: "Under 18", test: a => a < 18 },
  { label: "18–24",    test: a => a >= 18 && a <= 24 },
  { label: "25–34",    test: a => a >= 25 && a <= 34 },
  { label: "35–44",    test: a => a >= 35 && a <= 44 },
  { label: "45–54",    test: a => a >= 45 && a <= 54 },
  { label: "55+",      test: a => a >= 55 },
];

/* ── Page ────────────────────────────────────────────────────────────────── */
const ReportsPage = () => {
  const [revPeriod, setRevPeriod] = useState("Monthly");
  const [showModal, setShowModal] = useState(false);
  const isMobile = useIsMobile();
  const { stats, loading } = useStats();
  const { data: clients = [] } = useClients();
  const { settings } = useSettingsContext();
  const shop = {
    name:    settings?.shop?.name    || "Jake Barber Studio",
    tagline: settings?.shop?.tagline || "Cut Safe · Cut Right",
    email:   settings?.shop?.email   || "",
    phone:   settings?.shop?.phone   || "",
    address: settings?.shop?.address || "",
  };

  const ageDemographics = useMemo(() => {
    const withAge = (clients ?? []).filter(c => c.age != null && c.age !== "" && !isNaN(Number(c.age)));
    const buckets = AGE_BRACKETS.map(b => ({ label: b.label, count: 0 }));
    withAge.forEach(c => {
      const age = Number(c.age);
      const idx = AGE_BRACKETS.findIndex(b => b.test(age));
      if (idx !== -1) buckets[idx].count++;
    });
    const totalWithAge = withAge.length;
    const withPct = buckets.map(b => ({ ...b, pct: totalWithAge ? Math.round((b.count / totalWithAge) * 100) : 0 }));
    const top = withPct.reduce((max, b) => (b.count > max.count ? b : max), withPct[0] ?? { label: "—", count: 0, pct: 0 });
    const avgAge = totalWithAge ? Math.round(withAge.reduce((s, c) => s + Number(c.age), 0) / totalWithAge) : null;
    return { buckets: withPct, top, totalWithAge, avgAge, totalClients: (clients ?? []).length };
  }, [clients]);

  const exportPDF = () => {
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const kpiRows = [
      ["Total Revenue",  fmt(totalRevenue)],
      ["Transactions",   txCount],
      ["Avg. Ticket",    fmt(avgTicket)],
      ["Refund Rate",    `${refundRate}% (${refundCount} refunds)`],
    ].map(([l, v]) => `<tr><td>${l}</td><td><strong>${v}</strong></td></tr>`).join("");

    const barberRows = barberPerf.map(b =>
      `<tr><td>${b.barber}</td><td>${fmt(b.revenue)}</td><td>${b.clients}</td><td>${fmt(b.avgTicket)}</td></tr>`
    ).join("") || `<tr><td colspan="4" style="color:#888">No barber data</td></tr>`;

    const txRows = transactions.slice(0, 50).map(t =>
      `<tr><td>${t.txnId ?? t.id ?? ""}</td><td>${t.client ?? ""}</td><td>${t.service ?? ""}</td><td>${t.barber ?? ""}</td><td>${t.amount ?? ""}</td><td>${t.status ?? ""}</td></tr>`
    ).join("") || `<tr><td colspan="6" style="color:#888">No transactions</td></tr>`;

    const contactParts = [shop.phone, shop.email, shop.address].filter(Boolean);
    const contactLine = contactParts.join(" · ");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>${shop.name} — Reports</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px; }
        h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 4px; }
        .tagline { color: #888; font-size: 12px; margin-bottom: 6px; }
        .contact { color: #666; font-size: 11px; margin-bottom: 6px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 32px; }
        h2 { font-size: 14px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #444; margin: 28px 0 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th { text-align: left; padding: 8px 12px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888; background: #f5f5f5; }
        td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
        .kpi td:first-child { color: #666; }
        .kpi td:last-child { text-align: right; }
        @page { margin: 20mm; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <h1>${shop.name}</h1>
      <p class="tagline">${shop.tagline}</p>
      ${contactLine ? `<p class="contact">${contactLine}</p>` : ""}
      <p class="meta">Report generated on ${date}</p>

      <h2>Key Metrics</h2>
      <table class="kpi"><tbody>${kpiRows}</tbody></table>

      <h2>Barber Performance</h2>
      <table><thead><tr><th>Barber</th><th>Revenue</th><th>Clients</th><th>Avg. Ticket</th></tr></thead>
      <tbody>${barberRows}</tbody></table>

      <h2>Transaction Log (last 50)</h2>
      <table><thead><tr><th>ID</th><th>Client</th><th>Service</th><th>Barber</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${txRows}</tbody></table>
    </body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;width:0;height:0;border:none;opacity:0;";
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
  };

  const exportCSV = () => {
    const letterhead = [
      [shop.name],
      [shop.tagline],
      [[shop.phone, shop.email, shop.address].filter(Boolean).join(" · ")],
      [`Report generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`],
      [],
    ];
    const headers = ["ID", "Client", "Service", "Barber", "Amount", "Status"];
    const rows = transactions.map(t => [
      t.txnId ?? t.id ?? "",
      t.client  ?? "",
      t.service ?? "",
      t.barber  ?? "",
      t.amount  ?? "",
      t.status  ?? "",
    ]);
    const csv = [...letterhead, headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${shop.name.replace(/[^a-z0-9]+/gi, "_")}_reports_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const {
    totalRevenue = 0,
    txCount = 0,
    avgTicket = 0,
    refundRate = 0,
    refundCount = 0,
    revenueData = [],
    salesData = [],
    monthlyGrowth = [],
    serviceBreakdown = [],
    barberPerf = [],
    transactions = [],
    revTrend     = { label: "--", positive: true },
    avgTrend     = { label: "--", positive: true },
    txTrendLabel = "--",
    txTrendPositive = true,
    refundTrend  = { label: "0 refunds", positive: true },
    monthlyTarget = 0,
  } = stats ?? {};

  const quarterlyData = useMemo(() => {
    const qs = ["Q1","Q2","Q3","Q4"];
    const completed = (transactions ?? []).filter(t => t.status === "Completed");
    const byQ = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    completed.forEach(t => {
      const d = parseDate(t.date);
      if (!d) return;
      const q = qs[Math.floor(d.getMonth() / 3)];
      byQ[q] += toNum(t.amount);
    });
    const target = monthlyTarget * 3;
    return qs.map(q => ({ month: q, revenue: byQ[q], target }));
  }, [transactions, monthlyTarget]);

  const activeRevenueData = revPeriod === "Quarterly" ? quarterlyData : revenueData;

  if (loading) return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 12 : 20, marginBottom: isMobile ? 24 : 40 }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="card" style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <Shimmer w={46} h={46} r={14} />
              <Shimmer w={48} h={14} r={6} />
            </div>
            <Shimmer w="60%" h={12} r={6} />
            <div style={{ marginTop: 10 }}>
              <Shimmer w="75%" h={32} r={6} />
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 32, marginBottom: 28 }}><Shimmer h={280} r={12} /></div>
    </div>
  );

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>

      {showModal && <NewSaleModal onClose={() => setShowModal(false)} />}

      {/* Export actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28, gap: 10, flexWrap: "wrap" }}>
        <SecondaryBtn icon="download"   onClick={exportPDF}>Export PDF</SecondaryBtn>
        <SecondaryBtn icon="table_view" onClick={exportCSV}>Export CSV</SecondaryBtn>
        <PrimaryBtn icon="receipt_long" onClick={() => setShowModal(true)}>New Sale</PrimaryBtn>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 12 : 20, marginBottom: isMobile ? 24 : 40 }}>
        <KpiCard icon="payments"     label="Total Revenue"  value={fmt(totalRevenue)} trend={revTrend.label}    trendPositive={revTrend.positive} />
        <KpiCard icon="receipt"      label="Transactions"   value={txCount}           trend={txTrendLabel}     trendPositive={txTrendPositive} />
        <KpiCard icon="trending_up"  label="Avg. Ticket"    value={fmt(avgTicket)}    trend={avgTrend.label}   trendPositive={avgTrend.positive} />
        <KpiCard icon="replay"       label="Refund Rate"    value={`${refundRate}%`}  trend={refundTrend.label} trendPositive={refundTrend.positive} />
      </div>

      {/* Revenue Trend + MoM Growth */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: isMobile ? 20 : 28, marginBottom: isMobile ? 20 : 28 }}>

        <Card>
          <CardInner>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
              <ChartTitle title="Revenue Trend" sub="Actual vs target by month" />
              <div style={{ display: "flex", gap: 6 }}>
                {["Monthly", "Quarterly"].map(p => (
                  <button key={p} onClick={() => setRevPeriod(p)} style={{ padding: "6px 14px", borderRadius: 999, background: revPeriod === p ? C.primary : "transparent", color: revPeriod === p ? C.onPrimary : C.onSurfaceVariant, border: `1px solid ${revPeriod === p ? C.primary : C.outlineVariant}`, fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{p}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
              <AreaChart data={activeRevenueData}>
                <defs>
                  <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.accent} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.outlineVariant} strokeOpacity={0.3} vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontFamily: "Geist", fontSize: 10, fill: C.onSurfaceVariant }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 11, fill: C.onSurfaceVariant }} tickFormatter={v => fmt(v, true)} width={40} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmt(v), ""]} />
                <Area type="monotone" dataKey="revenue" stroke={C.accent}         strokeWidth={2.5} fill="url(#rGrad)" dot={{ fill: C.accent, r: 3 }} activeDot={{ r: 5, fill: C.accent }} name="Actual" />
                <Area type="monotone" dataKey="target"  stroke={C.outlineVariant} strokeWidth={1.5} fill="none" strokeDasharray="4 4" dot={false} name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </CardInner>
        </Card>

        <Card>
          <CardInner>
            <ChartTitle title="Month-on-Month Growth" sub="% change vs prior month" />
            <ResponsiveContainer width="100%" height={isMobile ? 160 : 220}>
              <BarChart data={monthlyGrowth} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.outlineVariant} strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontFamily: "Geist", fontSize: 10, fill: C.onSurfaceVariant }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 10, fill: C.onSurfaceVariant }} tickFormatter={v => `${v}%`} width={36} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, "Growth"]} />
                <Bar dataKey="growth" radius={[6,6,0,0]} fill={C.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </CardInner>
        </Card>
      </div>

      {/* Daily Sales + Service Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 20 : 28, marginBottom: isMobile ? 20 : 28 }}>

        <Card>
          <CardInner>
            <ChartTitle title="Daily Sales" sub="This week's revenue by day" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesData} barSize={isMobile ? 22 : 34}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.outlineVariant} strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontFamily: "Geist", fontSize: 10, fill: C.onSurfaceVariant }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 11, fill: C.onSurfaceVariant }} tickFormatter={v => fmt(v, true)} width={40} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmt(v), "Sales"]} />
                <Bar dataKey="sales" fill={C.accent} radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardInner>
        </Card>

        <Card>
          <CardInner>
            <ChartTitle title="Revenue by Service" sub="Share of completed bookings" />
            {serviceBreakdown.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: C.onSurfaceVariant, fontSize: 13 }}>No service data yet</div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                      {serviceBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  {serviceBreakdown.map(s => (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: C.onSurface }}>{s.name}</span>
                      <span style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.primary }}>{s.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardInner>
        </Card>
      </div>

      {/* Barber Performance */}
      <SectionTitle title="Barber Performance" subtitle="Individual revenue and client breakdown" />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 24, marginBottom: isMobile ? 28 : 40 }}>
        {barberPerf.length === 0 ? (
          <div className="card" style={{ padding: 32, color: C.onSurfaceVariant, fontSize: 13 }}>No barber data yet</div>
        ) : (
          barberPerf.map(b => (
            <Card key={b.barber}>
              <CardInner>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.secondaryContainer, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Geist", fontSize: 15, fontWeight: 700, color: C.secondary, flexShrink: 0 }}>
                    {b.barber.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div>
                    <div style={{ fontFamily: "Geist", fontSize: 15, fontWeight: 500, color: C.primary }}>{b.barber}</div>
                    <div style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>This period</div>
                  </div>
                </div>
                <StatRow label="Total Revenue"  value={fmt(b.revenue)}   highlight />
                <StatRow label="Clients Served" value={b.clients} />
                <StatRow label="Avg. Ticket"    value={fmt(b.avgTicket)} last />
              </CardInner>
            </Card>
          ))
        )}
      </div>

      {/* Customer Demographics */}
      <SectionTitle title="Customer Demographics" subtitle="Age breakdown to help you understand who your clients are" />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr", gap: isMobile ? 16 : 24, marginBottom: isMobile ? 28 : 40 }}>
        <Card>
          <CardInner>
            <ChartTitle title="Clients by Age Group" sub="How many clients fall into each age bracket" />
            {ageDemographics.totalWithAge === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: C.onSurfaceVariant, fontSize: 13 }}>
                No age data yet — ages you add when creating clients will show up here.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ageDemographics.buckets}>
                  <CartesianGrid vertical={false} stroke={C.outlineVariant} opacity={0.35} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.onSurfaceVariant }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.onSurfaceVariant }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--c-accent-soft)" }}
                    formatter={(v, n, p) => [`${v} client${v === 1 ? "" : "s"} (${p.payload.pct}%)`, ""]} />
                  <Bar dataKey="count" fill={C.accent} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardInner>
        </Card>

        <Card>
          <CardInner>
            <ChartTitle title="Age Insights" sub="Quick takeaways for your marketing & services" />
            {ageDemographics.totalWithAge === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: C.onSurfaceVariant, fontSize: 13 }}>
                Add client ages to unlock this insight.
              </div>
            ) : (
              <>
                <div style={{ background: "var(--c-accent-soft)", border: `1px solid ${C.accent}30`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent, marginBottom: 6 }}>
                    Most Common Age Group
                  </p>
                  <p style={{ fontFamily: "Geist", fontSize: 26, fontWeight: 700, color: C.primary }}>{ageDemographics.top.label}</p>
                  <p style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 4 }}>
                    {ageDemographics.top.count} of {ageDemographics.totalWithAge} clients ({ageDemographics.top.pct}%)
                  </p>
                </div>
                <StatRow label="Average Age" value={ageDemographics.avgAge != null ? `${ageDemographics.avgAge} yrs` : "—"} />
                <StatRow label="Clients with Age on File" value={`${ageDemographics.totalWithAge} of ${ageDemographics.totalClients}`} last />
              </>
            )}
          </CardInner>
        </Card>
      </div>

      {/* Transaction Log */}
      <SectionTitle title="Transaction Log" subtitle="Latest completed and refunded sales" />
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 480 : "auto" }}>
            <thead>
              <tr style={{ background: C.surfaceLow }}>
                {["ID","Client","Service","Barber","Amount","Status"].map(h => (
                  <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 20).map((t, i) => (
                <tr key={t.id ?? i} style={{ borderTop: `1px solid ${C.outlineVariant}20` }}
                  onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow + "60")}
                  onMouseOut={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 20px", fontFamily: "Geist", fontSize: 11, fontWeight: 600, color: C.onSurfaceVariant }}>{t.txnId ?? t.id}</td>
                  <td style={{ padding: "14px 20px", fontFamily: "Geist", fontSize: 13, fontWeight: 500, color: C.primary, whiteSpace: "nowrap" }}>{t.client}</td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: C.onSurface }}>{t.service}</td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: C.onSurfaceVariant, whiteSpace: "nowrap" }}>{t.barber}</td>
                  <td style={{ padding: "14px 20px", fontFamily: "Geist", fontSize: 14, fontWeight: 600, color: C.primary }}>{t.amount}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{
                      background: t.status === "Completed" ? "var(--badge-success-bg)" : "var(--c-error-container)",
                      color: t.status === "Completed" ? "var(--badge-success-fg)" : C.error,
                      padding: "3px 12px", borderRadius: 999, fontSize: 11,
                      fontFamily: "Geist", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                    }}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: C.onSurfaceVariant, fontSize: 13 }}>No transactions yet</div>
          )}
        </div>
      </Card>

    </div>
  );
};

export default ReportsPage;