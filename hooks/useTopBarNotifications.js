import { useMemo, useEffect, useState } from "react";
import { C } from "../tokens/design";
import { useInventory, useTransactions, useClients } from "./useFirestore";
// currency utils not imported here — notification bodies are text-only (no amounts)

const LOW_STOCK_THRESHOLD = 5;

// Overdue thresholds (days since last visit)
const OVERDUE_VIP     = 30;
const OVERDUE_REGULAR = 45;
const OVERDUE_NEW     = 60;

// VIP milestones worth celebrating
const VIP_MILESTONES = [10, 25, 50, 100];

/** Parse any date value Firestore might give us (Timestamp, ISO string, "Oct 12, 2024") */
const parseDate = (val) => {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  const d = new Date(val);
  return isNaN(d) ? null : d;
};

const daysSince = (val) => {
  const d = parseDate(val);
  if (!d) return null;
  return Math.floor((Date.now() - d) / 86_400_000);
};

const hoursAgo = (val) => {
  const d = parseDate(val);
  if (!d) return null;
  return (Date.now() - d) / 3_600_000;
};

const relativeTime = (val) => {
  const d = parseDate(val);
  if (!d) return "";
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60_000);
  const hrs  = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1)  return "Just now";
  if (hrs  < 1)  return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
};

/**
 * useTopBarNotifications
 *
 * Builds a prioritised, real notification list from live Firestore data.
 * Priority order: errors → warnings → info → activity
 *
 * Called once in the App shell so listeners are not duplicated.
 * Accepts optional `role` and `barberName` to scope barber-only notifs.
 */
export const useTopBarNotifications = ({ role, barberName } = {}) => {
  const { data: inventory    = [] } = useInventory();
  const { data: transactions = [] } = useTransactions();
  const { data: clients      = [] } = useClients();

  // Live clock — updates every 60 seconds so "Xm ago" stays accurate
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const notifs = [];

    // ── 1. OUT-OF-STOCK (error — highest priority) ──────────────────────
    // Dedupe by product NAME (not doc id) — if the same product exists as
    // multiple Firestore docs (e.g. duplicated/seeded rows), only surface it once.
    const seenOOS = new Set();
    inventory
      .filter(p => p.status === "out-of-stock" || Number(p.stock) === 0)
      .filter(p => {
        const key = (p.name || "").trim().toLowerCase();
        if (!key || seenOOS.has(key)) return false;
        seenOOS.add(key);
        return true;
      })
      .forEach(p => notifs.push({
        id:       `oos-${p.id}`,
        priority: 0,
        icon:     "remove_shopping_cart",
        color:    C.error,
        bg:       "var(--c-error-container)",
        title:    "Out of stock",
        body:     `${p.name} has run out. Reorder needed immediately.`,
        time:     "Inventory",
        category: "inventory",
      }));

    // ── 2. LOW STOCK (warning) ───────────────────────────────────────────
    const seenLow = new Set();
    inventory
      .filter(p => {
        const stock = Number(p.stock);
        return stock > 0 && (p.status === "low-stock" || stock <= LOW_STOCK_THRESHOLD);
      })
      .filter(p => {
        const key = (p.name || "").trim().toLowerCase();
        if (!key || seenLow.has(key)) return false;
        seenLow.add(key);
        return true;
      })
      .forEach(p => notifs.push({
        id:       `low-${p.id}`,
        priority: 1,
        icon:     "warning",
        color:    "var(--badge-warning-fg)",
        bg:       "var(--badge-warning-bg)",
        title:    "Low stock",
        body:     `${p.name} — only ${p.stock} unit${p.stock === 1 ? "" : "s"} left.`,
        time:     "Inventory",
        category: "inventory",
      }));

    // ── 3. OVERDUE CLIENTS — haven't visited in a while ─────────────────
    // Only admins see overdue alerts (they manage retention)
    if (role === "admin") {
      const overdue = clients
        .filter(c => {
          const days = daysSince(c.lastVisit);
          if (days === null) return false;
          if (c.status === "VIP")     return days >= OVERDUE_VIP;
          if (c.status === "Regular") return days >= OVERDUE_REGULAR;
          if (c.status === "New")     return days >= OVERDUE_NEW;
          return false;
        })
        .sort((a, b) => (daysSince(b.lastVisit) ?? 0) - (daysSince(a.lastVisit) ?? 0))
        .slice(0, 3); // cap at 3 so it doesn't flood

      overdue.forEach(c => {
        const days = daysSince(c.lastVisit);
        notifs.push({
          id:       `overdue-${c.id}`,
          priority: 2,
          icon:     "person_off",
          color:    "var(--c-error)",
          bg:       "var(--c-error-container)",
          title:    `${c.status} client overdue`,
          body:     `${c.name} hasn't visited in ${days} days. Time to reach out.`,
          time:     c.lastVisit ? `Last: ${c.lastVisit}` : "No visit recorded",
          category: "clients",
        });
      });
    }

    // ── 4. VIP MILESTONE REACHED ─────────────────────────────────────────
    // Fire when a client just hit a milestone visit count (within last 24h
    // since we don't store the exact milestone timestamp, proxy via lastVisit)
    if (role === "admin") {
      clients
        .filter(c => {
          const v = parseInt(c.visits) || 0;
          if (!VIP_MILESTONES.includes(v)) return false;
          const hrs = hoursAgo(c.lastVisit);
          return hrs !== null && hrs <= 24;
        })
        .forEach(c => notifs.push({
          id:       `milestone-${c.id}-${c.visits}`,
          priority: 2,
          icon:     "workspace_premium",
          color:    "var(--badge-warning-fg)",
          bg:       "var(--badge-warning-bg)",
          title:    `🏆 ${c.visits}-visit milestone!`,
          body:     `${c.name} just hit ${c.visits} visits. Consider a loyalty reward.`,
          time:     "Today",
          category: "clients",
        }));
    }

    // ── 5. NEW CLIENT REGISTERED (within last 48h) ───────────────────────
    clients
      .filter(c => {
        const hrs = hoursAgo(c.createdAt);
        return hrs !== null && hrs <= 48;
      })
      .sort((a, b) => (hoursAgo(a.createdAt) ?? 0) - (hoursAgo(b.createdAt) ?? 0))
      .slice(0, 3)
      .forEach(c => notifs.push({
        id:       `newclient-${c.id}`,
        priority: 3,
        icon:     "person_add",
        color:    "var(--badge-info-fg)",
        bg:       "var(--badge-info-bg)",
        title:    "New client registered",
        body:     `${c.name} joined${c.barber ? ` under ${c.barber}` : ""}.`,
        time:     relativeTime(c.createdAt),
        category: "clients",
      }));

    // ── 6. RECENT QR SCAN / CLIENT CHECK-IN ─────────────────────────────
    // When a client is scanned, their `visits` count increases and
    // `lastVisit` is set to today. Detect by lastVisit within last 2h.
    clients
      .filter(c => {
        const hrs = hoursAgo(c.lastVisit);
        return hrs !== null && hrs <= 2;
      })
      .sort((a, b) => (hoursAgo(a.lastVisit) ?? 0) - (hoursAgo(b.lastVisit) ?? 0))
      .slice(0, 5)
      .forEach(c => {
        // Don't double-notify clients already in the new-client list
        if (notifs.find(n => n.id === `newclient-${c.id}`)) return;
        notifs.push({
          id:       `checkin-${c.id}`,
          priority: 3,
          icon:     "qr_code_scanner",
          color:    "var(--badge-success-fg)",
          bg:       "var(--badge-success-bg)",
          title:    "Client checked in",
          body:     `${c.name} scanned in${c.barber ? ` for ${c.barber}` : ""}. Visit #${c.visits}.`,
          time:     relativeTime(c.lastVisit),
          category: "clients",
        });
      });

    // ── 7. RECENT SALES ──────────────────────────────────────────────────
    // Scope to this barber's own sales if role === "barber"
    const relevantTxns = [...transactions]
      .filter(t => {
        if (t.status !== "Completed") return false;
        if (role === "barber" && barberName && t.barber !== barberName) return false;
        return true;
      })
      .sort((a, b) => {
        const da = parseDate(a.createdAt) ?? new Date(0);
        const db = parseDate(b.createdAt) ?? new Date(0);
        return db - da;
      })
      .slice(0, role === "barber" ? 5 : 3);

    relevantTxns.forEach(t => {
      // Privacy: don't show amounts in notification text (visible on lock screen).
      // Use generic descriptions only.
      const service  = t.service ?? t.type ?? "Service";
      const clientId = t.client ?? t.clientName ?? null;
      const who      = role === "barber"
        ? `${service}${clientId ? ` · ${clientId}` : ""}`
        : `${t.barber ? `${t.barber}` : "A barber"}${clientId ? ` · ${clientId}` : ""}`;

      notifs.push({
        id:       `sale-${t.id ?? t.txnId}`,
        priority: 4,
        icon:     "receipt",
        color:    C.primary,
        bg:       C.surfaceLow,
        title:    role === "barber" ? "Sale recorded" : "New sale",
        body:     who || "Transaction completed",
        time:     relativeTime(t.createdAt) || t.date || "",
        category: "sales",
      });
    });

    // ── 8. DAILY INCOME REMINDER (barber only, after 6pm) ───────────────
    if (role === "barber" && barberName) {
      const hour = new Date().getHours();
      if (hour >= 18) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const submittedToday = transactions.some(t => {
          if (t.barber !== barberName) return false;
          if (t.source !== "barber_self_report") return false;
          const d = parseDate(t.createdAt);
          return d && d.toISOString().slice(0, 10) === todayStr;
        });
        if (!submittedToday) {
          notifs.push({
            id:       "daily-reminder",
            priority: 2,
            icon:     "schedule",
            color:    "var(--badge-warning-fg)",
            bg:       "var(--badge-warning-bg)",
            title:    "Daily income not submitted",
            body:     "You haven't logged today's income yet. Go to Profile → Submit Daily Income.",
            time:     "Today",
            category: "reminder",
          });
        }
      }
    }

    // Deduplicate by id — guards against Firestore sending multiple snapshots
    // during initial sync or reconnect, which can produce repeated entries.
    const seen = new Set();
    const unique = notifs.filter(n => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    // Sort by priority (lower = more urgent), then by time within same priority,
    // and cap the total so the dropdown never turns into an endless scroll.
    const MAX_NOTIFICATIONS = 20;
    return unique
      .sort((a, b) => a.priority - b.priority)
      .slice(0, MAX_NOTIFICATIONS);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory, transactions, clients, role, barberName, now]);
};