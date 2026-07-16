import { useMemo } from "react";
import { useTransactions, useStylists, useClients } from "./useFirestore";
import { useSettingsContext } from "../context/useSettingsContext";
import { fmt, toNum, parseDate } from "../utils/currency";

/* ─────────────────────────────────────────────────────────────────────────────
   useStats — derives all live KPIs, chart data, and breakdowns from Firestore.
   Consumed by both DashboardPage and ReportsPage.
───────────────────────────────────────────────────────────────────────────── */
export const useStats = () => {
  const { data: transactions, loading: txLoading } = useTransactions();
  const { data: stylists,     loading: stLoading  } = useStylists();
  const { data: clients,      loading: clLoading  } = useClients();
  const { settings }                                 = useSettingsContext();

  const loading = txLoading || stLoading || clLoading;

  const monthlyTarget = parseFloat(String(settings?.monthlyTarget ?? "0").replace(/[₱$,]/g, "")) || 20000;

  const stats = useMemo(() => {
    if (!transactions.length) {
      const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const now    = new Date();
      const currentMonth = now.getMonth();
      const revenueData  = Array.from({ length: 6 }, (_, i) => {
        const mIdx = (currentMonth - 5 + i + 12) % 12;
        return { month: MONTHS[mIdx], revenue: 0, target: monthlyTarget };
      });
      const salesData        = DAYS.map(day => ({ day, sales: 0 }));
      const monthlyGrowth    = revenueData.map(d => ({ month: d.month, growth: 0 }));
      return {
        totalRevenue: 0, dailyRevenue: 0, weeklySales: 0,
        avgTicket: 0, refundRate: 0, refundCount: 0,
        txCount: 0, clientCount: clients.length,
        revenueData, salesData, monthlyGrowth,
        serviceBreakdown: [], barberPerf: [], topBarbers: [],
        transactions: [], completed: [],
      };
    }

    const completed = transactions.filter(t => t.status === "Completed");
    const refunded  = transactions.filter(t => t.status === "Refunded");

    /* ── Totals ───────────────────────────────────────────────────────────── */
    const totalRevenue = completed.reduce((s, t) => s + toNum(t.amount), 0);
    const avgTicket    = completed.length ? totalRevenue / completed.length : 0;
    const refundRate   = transactions.length
      ? ((refunded.length / transactions.length) * 100).toFixed(0)
      : 0;

    /* ── Today / this week ────────────────────────────────────────────────── */
    const now        = new Date();
    const todayStr   = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayOfWeek  = now.getDay(); // 0 = Sun
    const weekStart  = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);


    const dailyRevenue = completed
      .filter(t => {
        const d = parseDate(t.date);
        if (!d) return String(t.date ?? "").startsWith(todayStr);
        return d.toDateString() === now.toDateString();
      })
      .reduce((s, t) => s + toNum(t.amount), 0);

    const weeklySales = completed
      .filter(t => {
        const d = parseDate(t.date);
        if (!d) return true; // include if unparseable — better than excluding
        return d >= weekStart;
      })
      .reduce((s, t) => s + toNum(t.amount), 0);

    /* ── Revenue by month (for charts) ───────────────────────────────────── */
    const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const byMonth = {};
    completed.forEach(t => {
      const d = parseDate(t.date);
      const key = d ? MONTHS[d.getMonth()] : null;
      if (!key) return;
      byMonth[key] = (byMonth[key] ?? 0) + toNum(t.amount);
    });

    // Build last 6 months in order
    const currentMonth = now.getMonth();
    const revenueData = Array.from({ length: 6 }, (_, i) => {
      const mIdx  = (currentMonth - 5 + i + 12) % 12;
      const month = MONTHS[mIdx];
      return {
        month,
        revenue: byMonth[month] ?? 0,
        target:  monthlyTarget,
      };
    });

    /* ── Daily sales this week ────────────────────────────────────────────── */
    const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const byDay = {};
    completed.forEach(t => {
      const d = parseDate(t.date);
      if (!d || d < weekStart) return;
      const key = DAYS[d.getDay()];
      byDay[key] = (byDay[key] ?? 0) + toNum(t.amount);
    });
    const salesData = DAYS.map(day => ({ day, sales: byDay[day] ?? 0 }));

    /* ── Service breakdown ────────────────────────────────────────────────── */
    const bySvc = {};
    completed.forEach(t => {
      const svc = t.service ?? "Other";
      bySvc[svc] = (bySvc[svc] ?? 0) + 1;
    });
    const total = completed.length || 1;
    const COLORS = ["#000000","#735c00","#c4c7c7","#eae7e7","#444748"];
    const serviceBreakdown = Object.entries(bySvc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], i) => ({
        name,
        value: Math.round((count / total) * 100),
        color: COLORS[i] ?? COLORS[0],
      }));

    /* ── Barber performance ───────────────────────────────────────────────── */
    const byBarber = {}; // keyed by normalised lowercase name
    completed.forEach(t => {
      const key = (t.barber ?? "Unknown").trim().toLowerCase();
      if (!byBarber[key]) byBarber[key] = { revenue: 0, clients: 0, displayName: (t.barber ?? "Unknown").trim() };
      byBarber[key].revenue += toNum(t.amount);
      byBarber[key].clients += 1;
    });
    const barberPerf = Object.values(byBarber).map(d => ({
      barber:    d.displayName,
      revenue:   d.revenue,
      clients:   d.clients,
      avgTicket: d.clients ? Math.round(d.revenue / d.clients) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    /* ── Top barbers (for Dashboard cards) ───────────────────────────────── */
    const topBarbers = stylists
      .map(s => {
        // Normalise stylist name for lookup — tolerates case/whitespace mismatches
        const key  = (s.name ?? "").trim().toLowerCase();
        const perf = byBarber[key] ?? { revenue: 0, clients: 0 };
        return {
          ...s,
          _revenue: perf.revenue,
          revenue:  fmt(perf.revenue),
          bookings: perf.clients,
          tier:     perf.revenue >= 10000 ? "Top Tier" : perf.revenue >= 5000 ? "Steady" : "Rising",
        };
      })
      .sort((a, b) => b._revenue - a._revenue)
      .slice(0, 3)
      .map(t => { const { _revenue, ...rest } = t; void _revenue; return rest; });

    /* ── Month-on-month growth ────────────────────────────────────────────── */
    const monthlyGrowth = revenueData.map((d, i, arr) => ({
      month:  d.month,
      growth: i === 0 ? 0 : arr[i - 1].revenue === 0 ? 0
        : parseFloat((((d.revenue - arr[i - 1].revenue) / arr[i - 1].revenue) * 100).toFixed(1)),
    }));


    /* -- KPI trends: current vs previous period ----------------------------- */
    // Month boundaries
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthTx = completed.filter(t => { const d = parseDate(t.date); return d && d >= thisMonthStart; });
    const prevMonthTx = completed.filter(t => { const d = parseDate(t.date); return d && d >= prevMonthStart && d < thisMonthStart; });

    const thisMonthRev = thisMonthTx.reduce((s, t) => s + toNum(t.amount), 0);
    const prevMonthRev = prevMonthTx.reduce((s, t) => s + toNum(t.amount), 0);

    const thisMonthAvg = thisMonthTx.length ? thisMonthRev / thisMonthTx.length : 0;
    const prevMonthAvg = prevMonthTx.length ? prevMonthRev / prevMonthTx.length : 0;

    // Week boundaries
    const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(weekStart.getDate() - 7);
    const thisWeekTxCount = transactions.filter(t => { const d = parseDate(t.date); return d && d >= weekStart; }).length;
    const prevWeekTxCount = transactions.filter(t => { const d = parseDate(t.date); return d && d >= prevWeekStart && d < weekStart; }).length;

    // pctChange: returns { label: "+12.5%", positive: true }
    const pctChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? { label: "New", positive: true } : { label: "--", positive: true };
      const pct = ((curr - prev) / prev) * 100;
      return { label: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
    };

    const revTrend     = pctChange(thisMonthRev, prevMonthRev);
    const avgTrend     = pctChange(thisMonthAvg, prevMonthAvg);
    const txDiff       = thisWeekTxCount - prevWeekTxCount;
    const txTrendLabel = txDiff === 0 ? "same as last week"
      : txDiff > 0 ? `+${txDiff} vs last week` : `${txDiff} vs last week`;
    const txTrendPositive = txDiff >= 0;
    const refundTrend  = { label: `${refunded.length} refund${refunded.length !== 1 ? "s" : ""}`, positive: refunded.length === 0 };

    return {
      // KPIs
      totalRevenue,
      dailyRevenue,
      weeklySales,
      avgTicket:        Math.round(avgTicket),
      refundRate,
      refundCount:      refunded.length,
      txCount:          transactions.length,
      clientCount:      clients.length,
      // KPI trends (computed vs prior period)
      revTrend,
      avgTrend,
      txTrendLabel,
      txTrendPositive,
      refundTrend,
      // Charts
      revenueData,
      salesData,
      monthlyGrowth,
      serviceBreakdown,
      barberPerf,
      topBarbers,
      // Raw
      transactions,
      completed,
      monthlyTarget,
    };
  }, [transactions, stylists, clients, monthlyTarget]);

  return { stats, loading, clients, stylists };
};