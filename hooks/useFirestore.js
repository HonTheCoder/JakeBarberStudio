import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, query, orderBy,
  getDocs, setDoc, writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// ── App-wide auth-uid tracker ────────────────────────────────────────────────
// Root cause of the "Missing or insufficient permissions" + timeout errors:
// components (useTopBarNotifications, SettingsProvider, etc.) call these
// Firestore hooks BEFORE the user has logged in, or during the split-second
// before Firebase Auth resolves. Firestore rules require request.auth != null,
// so those early queries get a permission-denied response.
//
// Worse: Firestore's onSnapshot listeners are TERMINAL once they receive a
// permission-denied error — the SDK does not silently retry them once you
// sign in, even though the singleton registry above keeps refCount > 0. So
// without this gate, the very first (unauthenticated) attempt permanently
// kills the listener for that collection for the rest of the session, which
// is why data never loads even after a successful login.
//
// Fix: track the authenticated uid here and only ever call onSnapshot once
// a uid exists. The effect below re-runs (and opens a brand-new listener)
// whenever the uid changes, so login/logout always gets a fresh, working
// subscription instead of reusing a dead one.
let currentUid = auth.currentUser?.uid ?? null;
const authUidListeners = new Set();
onAuthStateChanged(auth, (u) => {
  currentUid = u?.uid ?? null;
  authUidListeners.forEach(fn => fn(currentUid));
});

const useAuthedUid = () => {
  const [uid, setUid] = useState(currentUid);
  useEffect(() => {
    authUidListeners.add(setUid);
    return () => authUidListeners.delete(setUid);
  }, []);
  return uid;
};

const isOfflineError = err =>
  err?.code === "unavailable" ||
  err?.message?.toLowerCase().includes("network") ||
  err?.message?.toLowerCase().includes("internet") ||
  err?.message?.toLowerCase().includes("offline") ||
  err?.message?.toLowerCase().includes("transport") ||
  err?.message?.toLowerCase().includes("disconnected");

// ── Singleton subscription registry ──────────────────────────────────────────
// Prevents duplicate onSnapshot listeners from being opened when components
// mount/unmount rapidly (React StrictMode, hot-reload, page navigation).
// Each unique collection+orderField pair gets exactly one live listener.
//
// KEEP-ALIVE GRACE PERIOD — this is the fix for "Sales/Reports/Dashboard/
// Clients take a while to load every time I click them":
// Previously, the listener for a collection was closed the instant the last
// component using it unmounted (refCount hit 0), e.g. the moment you
// navigated away from Reports (which is the only page using `stylists` if
// the top bar isn't using it). Navigating back then had to open a BRAND NEW
// listener from scratch and wait on a fresh round trip before the page could
// render, even though you'd just been looking at that exact data seconds
// earlier. Now, instead of closing immediately, we wait `KEEP_ALIVE_MS` in
// case something re-subscribes (e.g. you click back to that page) — if it
// does, the still-open listener is reused instantly with its last known
// data. It only actually closes if nothing needs it for a while (or on
// logout, since the effect's cleanup runs then too).
const KEEP_ALIVE_MS = 5 * 60 * 1000; // 5 minutes of inactivity before a listener is actually closed

const registry = new Map();

const subscribe = (key, ref, onData, onErr) => {
  if (!registry.has(key)) {
    const listeners      = new Set();
    const errorListeners = new Set();
    const entry = {
      unsub: null, refCount: 0, listeners, errorListeners, closeTimer: null,
      lastSnap: null, lastErr: null,
    };
    entry.unsub = onSnapshot(
      ref,
      snap => { entry.lastSnap = snap; entry.lastErr = null; listeners.forEach(fn => fn(snap)); },
      err  => { entry.lastErr  = err;  errorListeners.forEach(fn => fn(err)); }
    );
    registry.set(key, entry);
  }
  const entry = registry.get(key);

  // A new subscriber arrived before the grace-period close fired — cancel it.
  if (entry.closeTimer) {
    clearTimeout(entry.closeTimer);
    entry.closeTimer = null;
  }

  entry.refCount++;
  entry.listeners.add(onData);
  entry.errorListeners.add(onErr);

  // The listener may already be open and holding data/an error from before
  // this subscriber attached (kept alive from a previous page visit).
  // Firestore's onSnapshot only fires again on an actual change, so without
  // this replay a revisited page would sit on "loading" until something in
  // the collection happens to change. Replay synchronously so the page
  // renders immediately with the data it already has.
  if (entry.lastSnap) onData(entry.lastSnap);
  else if (entry.lastErr) onErr(entry.lastErr);

  return () => {
    entry.listeners.delete(onData);
    entry.errorListeners.delete(onErr);
    entry.refCount--;
    if (entry.refCount <= 0) {
      entry.closeTimer = setTimeout(() => {
        // Re-check refCount — something may have resubscribed during the wait.
        if (entry.refCount <= 0) {
          entry.unsub();
          registry.delete(key);
        }
      }, KEEP_ALIVE_MS);
    }
  };
};

const useCollection = (collectionName, orderField) => {
  const uid                   = useAuthedUid();
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const timerRef              = useRef(null);

  useEffect(() => {
    // Not signed in (yet) — don't touch Firestore at all. Firing a query here
    // would get a permission-denied response (rules require request.auth) and
    // permanently poison the listener for this collection (see note above).
    // Just wait; this effect re-runs the moment `uid` becomes truthy. Nothing
    // to reset here on mount since data/error/loading already start at these
    // exact defaults — if we *were* previously subscribed and uid just went
    // falsy (sign-out), the cleanup of that prior run (below) already reset it.
    if (!uid) {
      return;
    }

    let active  = true;
    let gotData = false; // flips true the moment Firestore responds (success or error)

    // Timeout: only fires if Firestore never responds at all (total network loss).
    // A permission error IS a response — gotData prevents the timeout from
    // firing after real error/data state is already set.
    //
    // 10s: now that firebase.js auto-detects the transport (instead of forcing
    // long-polling on every client) and listeners are kept alive across page
    // navigation (see KEEP_ALIVE_MS above), a genuinely fresh connection is
    // much faster than it used to be. 10s is still generous breathing room
    // for a real first-time connection, without leaving the user staring at
    // a spinner for 20s if something is actually wrong.
    timerRef.current = setTimeout(() => {
      if (!active || gotData) return;
      console.warn(`[useFirestore] Timeout on "${collectionName}" — Firestore did not respond in 10s.`);
      setData([]);
      setError("Connection timed out. Check your internet and try refreshing.");
      setLoading(false);
    }, 10000);

    const ref = orderField
      ? query(collection(db, collectionName), orderBy(orderField, "desc"))
      : collection(db, collectionName);

    const key = `${collectionName}::${orderField ?? ""}`;

    const unsubscribe = subscribe(
      key,
      ref,
      snap => {
        if (!active) return;
        gotData = true;
        clearTimeout(timerRef.current);
        const seenIds = new Set();
        const docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => {
            if (seenIds.has(d.id)) return false;
            seenIds.add(d.id);
            return true;
          });
        setData(docs);
        setError(null);
        setLoading(false);
      },
      err => {
        if (!active) return;
        gotData = true;
        clearTimeout(timerRef.current);
        console.error(`[useFirestore] Error on "${collectionName}":`, err);
        if (isOfflineError(err)) {
          setData([]);
          setError("You're offline. Reconnect to load live data.");
        } else {
          // Permission error or other real Firestore error.
          // Show empty data + the real error. Never mask with mock data.
          setData([]);
          setError(err.message);
        }
        setLoading(false);
      }
    );

    return () => {
      active = false;
      clearTimeout(timerRef.current);
      unsubscribe();
      // Reset display state when this subscription is torn down — whether
      // because collectionName/orderField changed or the user signed out.
      // Lives inside the cleanup closure (not the effect body), so it isn't
      // a synchronous setState-in-effect call.
      setData([]);
      setError(null);
      setLoading(true);
    };
  }, [collectionName, orderField, uid]);

  return { data, loading, error };
};

// ── Clients ───────────────────────────────────────────────────────────────────
export const useClients      = () => useCollection("clients",      "name");
export const addClient       = data     => addDoc(collection(db, "clients"),      { ...data, createdAt: serverTimestamp() });
export const updateClient    = (id, d)  => updateDoc(doc(db, "clients",      id), d);
export const deleteClient    = id       => deleteDoc(doc(db, "clients",      id));

// ── Stylists ──────────────────────────────────────────────────────────────────
export const useStylists     = () => useCollection("stylists",     "name");
export const addStylist      = data     => addDoc(collection(db, "stylists"),     { ...data, createdAt: serverTimestamp() });
export const updateStylist   = (id, d)  => updateDoc(doc(db, "stylists",     id), d);
export const deleteStylist   = id       => deleteDoc(doc(db, "stylists",     id));

// ── Inventory ─────────────────────────────────────────────────────────────────
export const useInventory    = () => useCollection("inventory",    "name");
export const addProduct      = data     => addDoc(collection(db, "inventory"),    { ...data, createdAt: serverTimestamp() });
export const updateProduct   = (id, d)  => updateDoc(doc(db, "inventory",    id), d);
export const deleteProduct   = id       => deleteDoc(doc(db, "inventory",    id));

// ── Appointments ──────────────────────────────────────────────────────────────
export const useAppointments   = () => useCollection("appointments", "date");
export const addAppointment    = data    => addDoc(collection(db, "appointments"),  { ...data, createdAt: serverTimestamp() });
export const updateAppointment = (id, d) => updateDoc(doc(db, "appointments", id), d);
export const deleteAppointment = id      => deleteDoc(doc(db, "appointments", id));

// ── Transactions ──────────────────────────────────────────────────────────────
export const useTransactions  = () => useCollection("transactions",  "createdAt");
export const addTransaction   = data    => addDoc(collection(db, "transactions"),  { ...data, createdAt: serverTimestamp() });

// ── Stock Movement ────────────────────────────────────────────────────────────
export const useStockMovement = () => useCollection("stockMovement", "createdAt");
export const addStockMovement = data    => addDoc(collection(db, "stockMovement"), { ...data, createdAt: serverTimestamp() });

// ── Settings (single doc: settings/main) ─────────────────────────────────────
const SETTINGS_DOC = doc(db, "settings", "main");

export const useSettings = () => {
  const uid = useAuthedUid();
  const [settings, setSettings] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // Same reasoning as useCollection above: never query settings/main while
    // logged out, or the listener gets permission-denied and stays dead even
    // after the user signs in. Nothing to reset here on mount — settings/loading
    // already start at these exact defaults; a sign-out after being signed in
    // is handled by the cleanup of the previous run (below).
    if (!uid) {
      return;
    }

    const unsub = onSnapshot(
      SETTINGS_DOC,
      snap => {
        setSettings(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      () => {
        setSettings(null);
        setLoading(false);
      }
    );
    return () => {
      unsub();
      // Reset when this listener is torn down (uid changed / sign-out) — runs
      // inside the cleanup closure, not synchronously in the effect body.
      setSettings(null);
      setLoading(true);
    };
  }, [uid]);

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

// ── Data Wipe (Feature: Settings → Danger Zone → Data Wipe) ──────────────────
// Deletes every document in a collection. Firestore batches cap out at 500
// writes, so we chunk deletes into groups of 400 and commit sequentially.
const WIPE_CHUNK_SIZE = 400;

const wipeCollection = async (name) => {
  const snap = await getDocs(collection(db, name));
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += WIPE_CHUNK_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + WIPE_CHUNK_SIZE).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  return docs.length;
};

export const wipeSales     = () => wipeCollection("transactions");
export const wipeReports   = () => wipeCollection("stockMovement");
export const wipeInventory = () => wipeCollection("inventory");
export const wipeClients   = () => wipeCollection("clients");

const WIPE_MAP = {
  sales:     wipeSales,
  reports:   wipeReports,
  inventory: wipeInventory,
  clients:   wipeClients,
};

/**
 * Wipe one or more categories at once.
 * @param {string[]} categories - subset of ["sales","reports","inventory","clients"]
 * @returns {Object} map of category -> number of documents deleted
 */
export const wipeData = async (categories = []) => {
  const results = {};
  for (const cat of categories) {
    if (WIPE_MAP[cat]) results[cat] = await WIPE_MAP[cat]();
  }
  return results;
};

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