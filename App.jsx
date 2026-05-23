import { useState, useEffect } from "react";
import "./styles/globalStyles";

import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/AuthContext";
import { pageMeta, C, getNavItems } from "./tokens/design";

import Sidebar        from "./components/Sidebar";
import TopBar         from "./components/TopBar";
import { OfflineBanner } from "./components/ui";
import LoginPage      from "./pages/LoginPage";
import DashboardPage  from "./pages/DashboardPage";
import StylistsPage   from "./pages/StylistsPage";
import ClientsPage    from "./pages/ClientsPage";
import InventoryPage  from "./pages/InventoryPage";
import SalesPage      from "./pages/SalesPage";
import ReportsPage    from "./pages/ReportsPage";
import SettingsPage   from "./pages/SettingsPage";
import ComingSoonPage from "./pages/ComingSoonPage";

import { useSettings }       from "./hooks/useFirestore";
import { useNotifications }  from "./hooks/useNotification";

const MOBILE_BREAKPOINT = 768;

/** Inner shell — has access to auth context. */
const Shell = () => {
  const { user, role, logout } = useAuth();

  const defaultPage = "dashboard";

  const [active,     setActive]     = useState(defaultPage);
  const [collapsed,  setCollapsed]  = useState(false);
  const [search,     setSearch]     = useState("");
  const [isMobile,   setIsMobile]   = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isOffline,  setIsOffline]  = useState(!navigator.onLine);

  // Controlled by SettingsPage
  const [darkMode,   setDarkMode]   = useState(false);

  // Live notification preferences from Firestore
  const { settings } = useSettings();

  // Wire real browser notifications to Firestore listeners
  useNotifications(settings?.notifs);

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
      setActive(allowed[0] ?? "stylists");
    }
  }, [role, active]);

  // Navigate to Settings from any page via custom event (e.g. StylistsPage banner)
  useEffect(() => {
    const handler = () => setActive("settings");
    window.addEventListener("navigate-settings", handler);
    return () => window.removeEventListener("navigate-settings", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDarkModeChange   = (val) => setDarkMode(val);
  const handleCompactNavChange = (val) => setCollapsed(val);

  if (!user) return <LoginPage />;

  const sideW = collapsed ? 80 : 280;
  const mainL = isMobile ? 0 : sideW + 20 + 24;

  const renderPage = () => {
    const allowed = getNavItems(role).map(i => i.id);
    if (!allowed.includes(active)) return <ComingSoonPage title="Access Denied" />;

    switch (active) {
      case "dashboard": return <DashboardPage />;
      case "stylists":  return <StylistsPage  search={search} />;
      case "clients":   return <ClientsPage   search={search} />;
      case "inventory": return <InventoryPage search={search} />;
      case "sales":     return <SalesPage     search={search} />;
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
        setActive={page => { setActive(page); setSearch(""); if (isMobile) setDrawerOpen(false); }}
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
            ? `Welcome back, ${user.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`
            : pageMeta[active]?.subtitle}
          search={search}
          setSearch={setSearch}
          isMobile={isMobile}
          onMenuClick={() => setDrawerOpen(true)}
          onLogout={logout}
          userEmail={user.email}
          role={role}
        />
        {renderPage()}
      </main>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}