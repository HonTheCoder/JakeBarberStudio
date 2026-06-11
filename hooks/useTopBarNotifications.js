import { useMemo, useState } from "react";
import { C } from "../tokens/design";
import { useInventory, useTransactions } from "./useFirestore";
import { fmt } from "../utils/currency";

const LOW_STOCK_THRESHOLD = 5;

/**
 * Builds the notification list shown in TopBar.
 * Called once in App Shell so inventory + transaction listeners
 * are not duplicated across TopBar and the rest of the app.
 */
export const useTopBarNotifications = () => {
  const { data: inventory    = [] } = useInventory();
  const { data: transactions = [] } = useTransactions();

  const [now] = useState(() => Date.now());

  return useMemo(() => {
    const notifs = [];

    // Out-of-stock alerts (highest priority)
    inventory
      .filter(p => p.status === "out-of-stock" || p.stock === 0)
      .forEach(p => notifs.push({
        id:    `oos-${p.id}`,
        icon:  "remove_shopping_cart",
        color: C.error,
        bg:    "#fef2f2",
        title: "Out of stock",
        body:  `${p.name} has run out. Reorder needed.`,
        time:  "Inventory",
      }));

    // Low-stock alerts
    inventory
      .filter(p => p.status === "low-stock" || (p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD))
      .forEach(p => notifs.push({
        id:    `low-${p.id}`,
        icon:  "warning",
        color: "#d97706",
        bg:    "#fef3c7",
        title: "Low stock alert",
        body:  `${p.name} is down to ${p.stock} unit${p.stock === 1 ? "" : "s"}.`,
        time:  "Inventory",
      }));

    // Latest 3 completed sales
    const recentSales = [...transactions]
      .filter(t => t.status === "Completed")
      .sort((a, b) => {
        const ta = a.createdAt?.toDate?.() ?? new Date(a.date ?? 0);
        const tb = b.createdAt?.toDate?.() ?? new Date(b.date ?? 0);
        return tb - ta;
      })
      .slice(0, 3);

    recentSales.forEach(t => {
      const d    = t.createdAt?.toDate?.() ?? new Date(t.date ?? 0);
      const diff = now - d;
      const mins = Math.floor(diff / 60000);
      const hrs  = Math.floor(diff / 3600000);
      const time = mins < 1 ? "Just now"
        : hrs  < 1 ? `${mins}m ago`
        : hrs  < 24 ? `${hrs}h ago`
        : t.date ?? "";
      notifs.push({
        id:    `sale-${t.id ?? t.txnId}`,
        icon:  "receipt",
        color: C.primary,
        bg:    C.surfaceLow,
        title: "New sale recorded",
        body:  `${fmt(t.amount ?? 0)} transaction${t.barber ? ` by ${t.barber}` : ""}${t.client ? ` · ${t.client}` : ""}.`,
        time,
      });
    });

    return notifs;
  }, [inventory, transactions, now]);
};