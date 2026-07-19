import { useState, useEffect, lazy, Suspense } from "react";
import "./styles/globalStyles";

import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/AuthContext";
import { pageMeta, C, getNavItems } from "./tokens/design";

import Sidebar           from "./components/Sidebar";
import TopBar            from "./components/TopBar";
import { OfflineBanner } from "./components/ui";
import LoginPage         from "./pages/LoginPage"; // kept eager — users see it first

import { SettingsProvider } from "./context/SettingsProvider";
import { ToastProvider } from "./context/ToastContext";
import { useSettingsContext } from "./context/useSettingsContext";
import { useNotifications }  from "./hooks/useNotification";
import { useTopBarNotifications } from "./hooks/useTopBarNotifications";
import useIdleTimer           from "./hooks/useIdleTimer";

// Heavy pages — lazy loaded so the initial JS bundle is ~60% smaller.
// Each page is only fetched when the user navigates to it the first time.
const loadDashboard  = () => import("./pages/DashboardPage");
const loadStylists   = () => import("./pages/StylistsPage");
const loadProfile    = () => import("./pages/ProfilePage");
const loadClients    = () => import("./pages/ClientsPage");
const loadInventory  = () => import("./pages/InventoryPage");
const loadReports    = () => import("./pages/ReportsPage");
const loadSettings   = () => import("./pages/SettingsPage");
const loadComingSoon = () => import("./pages/ComingSoonPage");

const DashboardPage  = lazy(loadDashboard);
const StylistsPage   = lazy(loadStylists);
const ProfilePage    = lazy(loadProfile);
const ClientsPage    = lazy(loadClients);
const InventoryPage  = lazy(loadInventory);
const ReportsPage    = lazy(loadReports);
const SettingsPage   = lazy(loadSettings);
const ComingSoonPage = lazy(loadComingSoon);

// Prefetch every page's JS chunk once, shortly after first paint, so that
// the FIRST time you click Dashboard/Clients/Reports/etc. you're only
// waiting on Firestore data (which is now fast/cached) instead of also
// waiting on a fresh JS chunk download. Uses requestIdleCallback so it never
// competes with the initial page render for bandwidth/CPU.
let pagesPrefetched = false;
const prefetchAllPages = () => {
  if (pagesPrefetched) return;
  pagesPrefetched = true;
  [
    loadDashboard, loadStylists, loadProfile, loadClients,
    loadInventory, loadReports, loadSettings, loadComingSoon,
  ].forEach(load => load().catch(() => { /* ignore — will just load on click instead */ }));
};

const MOBILE_BREAKPOINT = 768;

/** Inner shell — has access to auth context. */
const Shell = () => {
  const { user, role, displayName, logout } = useAuth();

  const defaultPage = "dashboard";

  const [active,     setActive]     = useState(defaultPage);
  const [collapsed,  setCollapsed]  = useState(() => {
    try { return localStorage.getItem("collapsed") === "true"; } catch { return false; }
  });
  // Per-page search: persisted in sessionStorage so queries survive navigation and refresh
  const ssKey = page => `search:${page}`;
  const [search, setSearchRaw] = useState(() => {
    try { return sessionStorage.getItem(ssKey(defaultPage)) ?? ""; } catch { return ""; }
  });
  const setSearch = val => {
    setSearchRaw(val);
    try { sessionStorage.setItem(ssKey(active), val); } catch { /* noop */ }
  };
  const [isMobile,   setIsMobile]   = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isOffline,  setIsOffline]  = useState(!navigator.onLine);

  // Controlled by SettingsPage — seed from localStorage immediately to avoid flash
  const [darkMode,   setDarkMode]   = useState(() => {
    try { return localStorage.getItem("darkMode") === "true"; } catch { return false; }
  });

  // Live notification preferences from Firestore
  const { settings } = useSettingsContext();

  // Wire real browser notifications to Firestore listeners
  useNotifications(settings?.notifs);
  useIdleTimer(settings?.sessionTimeout, logout);

  const notifications = useTopBarNotifications({ role, barberName: displayName });

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setDrawerOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  // If the active page is not allowed for this role, redirect to first allowed page
  useEffect(() => {
    const allowed = getNavItems(role).map(i => i.id);
    if (!allowed.includes(active)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(allowed[0] ?? "stylists");
    }
  }, [role, active]);

  // Navigate to Settings from any page via custom event (e.g. StylistsPage banner)
  useEffect(() => {
    const handler = () => setActive("settings");
    window.addEventListener("navigate-settings", handler);
    return () => window.removeEventListener("navigate-settings", handler);
  }, []);

  const handleDarkModeChange   = (val) => {
    setDarkMode(val);
    try { localStorage.setItem("darkMode", String(val)); } catch { /* noop */ }
  };
  const handleCompactNavChange = (val) => {
    setCollapsed(val);
    try { localStorage.setItem("collapsed", String(val)); } catch { /* noop */ }
  };

  useEffect(() => {
    if (!user) return;
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(prefetchAllPages, { timeout: 3000 })
      : setTimeout(prefetchAllPages, 1000);
    return () => {
      if (window.cancelIdleCallback && typeof idle === "number") window.cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, [user]);

  if (!user) return <LoginPage />;

  const sideW = collapsed ? 80 : 280;
  const mainL = isMobile ? 0 : sideW + 20 + 24;

  const renderPage = () => {
    const allowed = getNavItems(role).map(i => i.id);
    if (!allowed.includes(active)) return <ComingSoonPage title="Access Denied" />;

    switch (active) {
      case "dashboard": return <DashboardPage />;
      case "stylists":  return <StylistsPage  search={search} />;
      case "profile":   return <ProfilePage   />;
      case "clients":   return <ClientsPage   search={search} />;
      case "inventory": return <InventoryPage search={search} />;
      case "reports":   return <ReportsPage   />;
      case "settings":  return (
        <SettingsPage
          onDarkModeChange={handleDarkModeChange}
          onCompactNavChange={handleCompactNavChange}
        />
      );
      default:          return <ComingSoonPage title={pageMeta[active]?.title} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.surface }}>

      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99, backdropFilter: "blur(2px)" }}
        />
      )}

      <Sidebar
        active={active}
        setActive={page => { setActive(page); try { setSearchRaw(sessionStorage.getItem(`search:${page}`) ?? ""); } catch { setSearchRaw(""); } if (isMobile) setDrawerOpen(false); }}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        isMobile={isMobile}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        onLogout={logout}
        role={role}
      />

      <main
        style={{
          marginLeft: mainL,
          paddingRight: isMobile ? 16 : 40,
          paddingLeft:  isMobile ? 16 : 0,
          paddingBottom: 60,
          minHeight: "100vh",
          transition: "margin-left 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {isOffline && <OfflineBanner />}
        <TopBar
          title={pageMeta[active]?.title}
          subtitle={active === "dashboard"
            ? `Welcome back, ${
                displayName
                  ? displayName.split(" ")[0]
                  : user.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
              }`
            : pageMeta[active]?.subtitle}
          search={search}
          setSearch={setSearch}
          isMobile={isMobile}
          onMenuClick={() => setDrawerOpen(true)}
          onLogout={logout}
          onNavigate={setActive}
          userEmail={user.email}
          displayName={displayName}
          role={role}
          notifications={notifications}
        />
        <Suspense fallback={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <div className="spin" style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${C.primary}30`, borderTopColor: C.primary }} />
          </div>
        }>
          <div key={active} className="fade-up">
            {renderPage()}
          </div>
        </Suspense>
      </main>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}