import { useState, useEffect, useRef } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, query, orderBy,
  getDocs, setDoc, getDoc, writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

// Mock data is only used in development so it never ships to production.
// Vite statically replaces import.meta.env.DEV with false in prod builds,
// which lets the bundler tree-shake the entire mockData module out.
const IS_DEV = import.meta.env.DEV;
import * as mockModule from "../data/mockData";
const mock = IS_DEV ? mockModule : {};

// In prod the fallback is always [] so Firestore errors surface as empty
// state rather than silently showing fake data.
const devFallback = (data) => (IS_DEV ? (data ?? []) : []);

// Detect if the error is a network/connection error
const isOfflineError = err =>
  err?.code === "unavailable" ||
  err?.message?.toLowerCase().includes("network") ||
  err?.message?.toLowerCase().includes("internet") ||
  err?.message?.toLowerCase().includes("offline") ||
  err?.message?.toLowerCase().includes("transport") ||
  err?.message?.toLowerCase().includes("disconnected");

// Generic real-time collection hook with offline fallback.
// Hook shape (useState/useRef/useEffect order) is always fixed — no conditional hooks.
const useCollection = (collectionName, orderField, fallbackData) => {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const timerRef              = useRef(null);

  useEffect(() => {
    let active = true;

    // Safety net: if Firebase doesn't respond in 8s, fall back to mock data in dev only
    timerRef.current = setTimeout(() => {
      if (!active) return;
      console.warn(`[useFirestore] Timeout on "${collectionName}" — ${IS_DEV ? "using mock data" : "returning empty"}`);
      setData(devFallback(fallbackData));
      setError(null);
      setLoading(false);
    }, 8000);

    const ref = orderField
      ? query(collection(db, collectionName), orderBy(orderField, "desc"))
      : collection(db, collectionName);

    const unsub = onSnapshot(
      ref,
      snap => {
        if (!active) return;
        clearTimeout(timerRef.current);
        setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setError(null);
        setLoading(false);
      },
      err => {
        if (!active) return;
        clearTimeout(timerRef.current);
        console.error(`[useFirestore] Error on "${collectionName}":`, err);
        if (isOfflineError(err)) {
          setData(devFallback(fallbackData));
          setError(null);
        } else {
          setError(err.message);
        }
        setLoading(false);
      }
    );

    return () => {
      active = false;
      clearTimeout(timerRef.current);
      unsub();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, orderField]);

  return { data, loading, error };
};

// ── Clients ───────────────────────────────────────────────────────────────────
export const useClients      = () => useCollection("clients",      "name",      mock.clients);
export const addClient       = data     => addDoc(collection(db, "clients"),      { ...data, createdAt: serverTimestamp() });
export const updateClient    = (id, d)  => updateDoc(doc(db, "clients",      id), d);
export const deleteClient    = id       => deleteDoc(doc(db, "clients",      id));

// ── Stylists ──────────────────────────────────────────────────────────────────
export const useStylists     = () => useCollection("stylists",     "name",      mock.stylists);
export const addStylist      = data     => addDoc(collection(db, "stylists"),     { ...data, createdAt: serverTimestamp() });
export const updateStylist   = (id, d)  => updateDoc(doc(db, "stylists",     id), d);
export const deleteStylist   = id       => deleteDoc(doc(db, "stylists",     id));

// ── Inventory ─────────────────────────────────────────────────────────────────
export const useInventory    = () => useCollection("inventory",    "name",      mock.inventory);
export const addProduct      = data     => addDoc(collection(db, "inventory"),    { ...data, createdAt: serverTimestamp() });
export const updateProduct   = (id, d)  => updateDoc(doc(db, "inventory",    id), d);
export const deleteProduct   = id       => deleteDoc(doc(db, "inventory",    id));

// ── Appointments ──────────────────────────────────────────────────────────────
export const useAppointments   = () => useCollection("appointments", "date", []);
export const addAppointment    = data    => addDoc(collection(db, "appointments"),  { ...data, createdAt: serverTimestamp() });
export const updateAppointment = (id, d) => updateDoc(doc(db, "appointments", id), d);
export const deleteAppointment = id      => deleteDoc(doc(db, "appointments", id));

// ── Transactions ──────────────────────────────────────────────────────────────
export const useTransactions  = () => useCollection("transactions",  "createdAt", mock.transactions);
export const addTransaction   = data    => addDoc(collection(db, "transactions"),  { ...data, createdAt: serverTimestamp() });

// ── Stock Movement ────────────────────────────────────────────────────────────
export const useStockMovement = () => useCollection("stockMovement", "createdAt", mock.stockMovement);
export const addStockMovement = data    => addDoc(collection(db, "stockMovement"), { ...data, createdAt: serverTimestamp() });

// ── Settings (single doc: settings/main) ─────────────────────────────────────
const SETTINGS_DOC = doc(db, "settings", "main");

export const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let active = true;
    getDoc(SETTINGS_DOC)
      .then(snap => {
        if (!active) return;
        setSettings(snap.exists() ? snap.data() : null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSettings(null);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { settings, loading };
};

export const saveSettings = data => setDoc(SETTINGS_DOC, data, { merge: true });

// ── Danger Zone ───────────────────────────────────────────────────────────────
export const clearAllTransactions = async () => {
  const snap = await getDocs(collection(db, "transactions"));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();

  const movSnap = await getDocs(collection(db, "stockMovement"));
  const batch2 = writeBatch(db);
  movSnap.docs.forEach(d => batch2.delete(d.ref));
  await batch2.commit();
};

export const resetInventoryStock = async () => {
  const snap = await getDocs(collection(db, "inventory"));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { stock: 0, status: "out-of-stock" }));
  await batch.commit();
};

// ── Client Cleanup ────────────────────────────────────────────────────────────
// filter: { statuses: string[], minVisits: number|null, maxVisits: number|null }
export const deleteClientsByFilter = async (filter) => {
  const snap = await getDocs(collection(db, "clients"));
  const toDelete = snap.docs.filter(d => {
    const data = d.data();
    const statusMatch = !filter.statuses?.length || filter.statuses.includes(data.status);
    const visits = parseInt(data.visits) || 0;
    const minOk = filter.minVisits == null || visits >= filter.minVisits;
    const maxOk = filter.maxVisits == null || visits <= filter.maxVisits;
    return statusMatch && minOk && maxOk;
  });
  const batch = writeBatch(db);
  toDelete.forEach(d => batch.delete(d.ref));
  await batch.commit();
  return toDelete.length;
};