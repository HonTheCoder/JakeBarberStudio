/**
 * useNotifications.js
 *
 * Wires Firestore real-time listeners to the Web Notifications API.
 * - Low-stock  : fires when any inventory item's stock drops to ≤ threshold
 * - New sale   : fires when a new "Completed" transaction is added
 * - Daily/Weekly summary : fires once per day/week via a localStorage timestamp guard
 *
 * Usage (call once, high in the tree — e.g. App.jsx):
 *   useNotifications(settings?.notifs)   // pass the notifs object from useSettings()
 */

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { auth, db } from "../firebase";
import { getUpcomingHolidays } from "../utils/philippineHolidays";

// Fire the holiday push once it's this many days out (and again on the day itself).
const HOLIDAY_NOTIFY_DAYS_BEFORE = 3;

/**
 * Tracks whether a user is currently signed in. This hook previously opened
 * onSnapshot listeners on "inventory" / "transactions" unconditionally, even
 * before login. Firestore rules require an authenticated request, so those
 * early listeners got permission-denied — and Firestore listeners are
 * terminal once denied, so they never recovered even after a successful
 * login (this is why low-stock/new-sale notifications silently never fired).
 */
const useIsSignedIn = () => {
  const [signedIn, setSignedIn] = useState(!!auth.currentUser);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setSignedIn(!!u));
    return unsub;
  }, []);
  return signedIn;
};

/* ─── permission helper ────────────────────────────────────────────────────── */
export const requestNotifPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied")  return "denied";
  const result = await Notification.requestPermission();
  return result;
};

export const getNotifPermission = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
};

/* ─── fire a single browser notification ──────────────────────────────────── */
const notify = (title, body, icon = "/favicon.svg") => {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon });
  } catch {
    // Some browsers (e.g. Firefox in private mode) throw — silently ignore.
  }
};

/* ─── localStorage timestamp guards (prevent re-firing) ───────────────────── */
const LS_DAILY   = "notif_daily_last";
const LS_WEEKLY  = "notif_weekly_last";
const LS_HOLIDAY = "notif_holiday_last_key"; // stores "MM-DD" of the last holiday we alerted for

const msInDay  = 86_400_000;
const msInWeek = 604_800_000;

const shouldFireSummary = (key, interval) => {
  const last = parseInt(localStorage.getItem(key) || "0", 10);
  return Date.now() - last >= interval;
};

const markFired = (key) => localStorage.setItem(key, String(Date.now()));

/* ─── hook ─────────────────────────────────────────────────────────────────── */
export const useNotifications = (notifs) => {
  const signedIn = useIsSignedIn();

  // Keep a ref so the Firestore callbacks always read the latest toggles
  // without needing to re-subscribe.
  const notifsRef = useRef(notifs);
  useEffect(() => { notifsRef.current = notifs; }, [notifs]);

  // Track which inventory IDs we've already alerted so we don't spam.
  const alertedLowStock = useRef(new Set());
  // Track the latest transaction ID we've seen.
  const latestTxId = useRef(null);
  const initialTxLoad = useRef(true);

  /* ── Inventory low-stock listener ────────────────────────────────────── */
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (!signedIn) return; // avoid querying before auth resolves (see useIsSignedIn note)

    const unsub = onSnapshot(
      collection(db, "inventory"),
      (snap) => {
        if (Notification.permission !== "granted") return;
        if (!notifsRef.current?.lowStock) return;

        snap.docs.forEach((d) => {
          const item = d.data();
          const stock = parseInt(item.stock ?? item.qty ?? 0, 10);
          const threshold = parseInt(item.lowStockThreshold ?? 5, 10);
          const isLow = stock <= threshold;

          if (isLow && !alertedLowStock.current.has(d.id)) {
            alertedLowStock.current.add(d.id);
            notify(
              "⚠️ Low Stock Alert",
              `${item.name} is running low — only ${stock} unit${stock !== 1 ? "s" : ""} left.`
            );
          } else if (!isLow) {
            // Clear alert once restocked so it can fire again next time.
            alertedLowStock.current.delete(d.id);
          }
        });
      },
      () => {} // silence errors — feature degrades gracefully
    );

    return unsub;
  }, [signedIn]); // re-subscribes with a fresh listener once signed in

  /* ── New-sale listener ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (!signedIn) return; // avoid querying before auth resolves (see useIsSignedIn note)

    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"), limit(1));

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) return;

        const latest = snap.docs[0];
        const data   = latest.data();

        // On the very first load, just record the ID — don't fire.
        if (initialTxLoad.current) {
          latestTxId.current = latest.id;
          initialTxLoad.current = false;
          return;
        }

        // Skip if we've already seen this transaction.
        if (latest.id === latestTxId.current) return;
        latestTxId.current = latest.id;

        if (Notification.permission !== "granted") return;
        if (!notifsRef.current?.newSale) return;
        if (data.status !== "Completed") return;

        const amount  = data.amount ?? data.total ?? "";
        const client  = data.client ?? data.clientName ?? "a client";
        const service = data.service ?? data.type ?? "";
        const body    = [
          `${client}`,
          service  ? `· ${service}` : "",
          amount   ? `· ${amount}`  : "",
        ]
          .filter(Boolean)
          .join(" ");

        notify("💈 New Sale", body || "A new transaction has been completed.");
      },
      () => {}
    );

    return unsub;
  }, [signedIn]); // re-subscribes with a fresh listener once signed in

  /* ── Daily & Weekly summary ──────────────────────────────────────────── */
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (!signedIn) return; // avoid querying before auth resolves (see useIsSignedIn note)

    // Check once on mount, then every 30 minutes.
    const check = async () => {
      if (Notification.permission !== "granted") return;
      const n = notifsRef.current;

      if (n?.dailySummary && shouldFireSummary(LS_DAILY, msInDay)) {
        markFired(LS_DAILY);
        // Pull today's completed transactions for a quick summary.
        const { getDocs, collection: col } = await import("firebase/firestore");
        try {
          const snap = await getDocs(col(db, "transactions"));
          const today = new Date().toDateString();
          const todayTxs = snap.docs
            .map((d) => d.data())
            .filter((t) => {
              if (!t.createdAt) return false;
              const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
              return d.toDateString() === today && t.status === "Completed";
            });
          const total = todayTxs.reduce((s, t) => {
            return s + parseFloat(String(t.amount ?? t.total ?? "0").replace(/[₱$,]/g, ""));
          }, 0);
          notify(
            "📋 Daily Summary",
            `Today: ${todayTxs.length} sale${todayTxs.length !== 1 ? "s" : ""} · ₱${total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
          );
        } catch { /* no-op */ }
      }

      if (n?.weeklySummary && shouldFireSummary(LS_WEEKLY, msInWeek)) {
        markFired(LS_WEEKLY);
        try {
          const { getDocs, collection: col } = await import("firebase/firestore");
          const snap = await getDocs(col(db, "transactions"));
          const now  = new Date();
          const weekAgo = new Date(now.getTime() - msInWeek);
          const weekTxs = snap.docs
            .map((d) => d.data())
            .filter((t) => {
              if (!t.createdAt) return false;
              const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
              return d >= weekAgo && t.status === "Completed";
            });
          const total = weekTxs.reduce((s, t) => {
            return s + parseFloat(String(t.amount ?? t.total ?? "0").replace(/[₱$,]/g, ""));
          }, 0);
          notify(
            "📊 Weekly Report",
            `This week: ${weekTxs.length} sale${weekTxs.length !== 1 ? "s" : ""} · ₱${total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
          );
        } catch { /* no-op */ }
      }
    };

    check();
    const interval = setInterval(check, 30 * 60 * 1000); // every 30 min
    return () => clearInterval(interval);
  }, [signedIn]); // ref handles toggle changes; re-arm once signed in

  /* ── Holiday / Peak-day reminder ─────────────────────────────────────── */
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (!signedIn) return; // avoid firing before auth resolves

    const check = () => {
      if (Notification.permission !== "granted") return;
      if (!notifsRef.current?.holidayReminder) return;

      const next = getUpcomingHolidays(new Date(), 1)[0];
      if (!next) return;
      if (next.daysAway > HOLIDAY_NOTIFY_DAYS_BEFORE) return;

      // One push per holiday per year — keyed by month-day so it can fire
      // again next year without needing a reset.
      const key = `${next.month}-${next.day}-${next.date.getFullYear()}`;
      if (localStorage.getItem(LS_HOLIDAY) === key) return;
      localStorage.setItem(LS_HOLIDAY, key);

      const isPeak = next.type === "peak";
      const when = next.daysAway === 0 ? "today" : next.daysAway === 1 ? "tomorrow" : `in ${next.daysAway} days`;
      notify(
        isPeak ? `📈 Peak day coming up` : `📅 Upcoming holiday`,
        `${next.name} is ${when} — plan staffing${isPeak ? " for the rush" : " and shop hours"}.`
      );
    };

    check();
    const interval = setInterval(check, 60 * 60 * 1000); // hourly is enough — dates don't change fast
    return () => clearInterval(interval);
  }, [signedIn]); // ref handles toggle changes; re-arm once signed in
};