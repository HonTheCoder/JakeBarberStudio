import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Guard against HMR / hot-reload re-initializing Firebase on every save.
// Without this, every code change in dev destroys the existing Firestore
// WebSocket connection, forcing a full re-auth that takes 8-15 seconds.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// ── Why the app was slow ────────────────────────────────────────────────────
// `experimentalForceLongPolling: true` was forcing EVERY client onto
// long-polling (repeated hanging-GET HTTP requests), even browsers/networks
// that support the normal WebChannel/WebSocket-style stream perfectly fine.
// Long-polling has much higher per-request latency, and this app opens up
// to 6 listeners at once on login (clients/transactions/inventory/stylists/
// appointments/settings) — so every single page load paid that tax 6x over.
// That's the main cause of the Dashboard/Clients/Sales slowness.
//
// Fix: let Firestore auto-detect the best transport (uses the fast path
// whenever it's available, and only falls back to long-polling if the
// network actually needs it — e.g. certain corporate proxies/VPNs).
//
// We also restore persistentLocalCache. The earlier note worried that an
// IndexedDB lock/open hang could block the very first network request.
// persistentMultipleTabManager avoids the classic multi-tab lock contention
// case, and Firestore still fires the network request in parallel with
// cache hydration — it does not block on IndexedDB. The upside is large:
// repeat visits (and every page but the very first) render instantly from
// cache while fresh data streams in behind it, instead of re-downloading
// every collection from scratch on every navigation.
export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Firestore already initialized for this app (HMR re-run), or the
    // current environment doesn't support persistence (private/incognito
    // mode, unsupported browser) — reuse/fall back to the default instance.
    return getFirestore(app);
  }
})();