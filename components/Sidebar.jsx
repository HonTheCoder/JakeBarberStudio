import { C, getNavItems } from "../tokens/design";
import { Icon } from "./ui";

const Sidebar = ({ active, setActive, collapsed, setCollapsed, isMobile, drawerOpen, setDrawerOpen, onLogout, role }) => {
  const W = collapsed ? 80 : 280;
  const visibleItems = getNavItems(role);

  const mobileStyle = {
    position: "fixed",
    left: 0, top: 0, bottom: 0,
    width: 280,
    borderRadius: 0,
    transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
    transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
    zIndex: 100,
  };

  const desktopStyle = {
    position: "fixed",
    left: 20, top: 20, bottom: 20,
    width: W,
    borderRadius: 24,
    transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
    zIndex: 100,
  };

  return (
    <aside
      className="glass"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "28px 0",
        boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
        ...(isMobile ? mobileStyle : desktopStyle),
      }}
    >
      {/* Branding */}
      <div style={{
        padding: collapsed && !isMobile ? "0 16px" : "0 28px",
        marginBottom: 32,
        overflow: "hidden",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {!collapsed || isMobile ? (
          <>
            <div>
              <div style={{ fontFamily: "Geist", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: C.primary }}>
                THE PARLOUR
              </div>
              <div style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: C.onSurfaceVariant, opacity: 0.5, marginTop: 3 }}>
                Premium Grooming
              </div>
            </div>
            {isMobile && (
              <button onClick={() => setDrawerOpen(false)} style={{ padding: 6, borderRadius: 8 }}>
                <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
              </button>
            )}
          </>
        ) : (
          <div style={{ width: 36, height: 36, background: C.primary, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
            <Icon name="content_cut" size={18} style={{ color: "#fff" }} />
          </div>
        )}
      </div>

      {/* Nav Items — filtered by role */}
      <nav style={{ flex: 1, overflow: "hidden" }}>
        {visibleItems.map(item => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14,
                padding: (collapsed && !isMobile) ? "12px 0" : "11px 28px",
                justifyContent: (collapsed && !isMobile) ? "center" : "flex-start",
                color: isActive ? C.primary : C.onSurfaceVariant,
                background: isActive ? C.surfaceLow : "transparent",
                borderRight: isActive ? `2px solid ${C.secondaryContainer}` : "2px solid transparent",
                transition: "all 0.2s",
                fontFamily: "Geist", fontSize: 11, fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase",
                opacity: isActive ? 1 : 0.55,
              }}
              onMouseOver={e => { if (!isActive) { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.background = C.surfaceHigh; } }}
              onMouseOut={e => { if (!isActive) { e.currentTarget.style.opacity = "0.55"; e.currentTarget.style.background = "transparent"; } }}
            >
              <Icon name={item.icon} size={20} style={{ flexShrink: 0 }} />
              {(!collapsed || isMobile) && (
                <span style={{ overflow: "hidden", whiteSpace: "nowrap" }}>{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Role badge */}
      {(!collapsed || isMobile) && role && (
        <div style={{ padding: "0 28px", marginBottom: 8 }}>
          <span style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 999,
            background: role === "admin" ? C.secondaryContainer : C.surfaceHigh,
            color: role === "admin" ? C.secondary : C.onSurfaceVariant,
            fontFamily: "Geist", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}>
            {role}
          </span>
        </div>
      )}

      {/* Logout button */}
      <div style={{ padding: collapsed && !isMobile ? "0 12px" : "0 20px", marginTop: 8 }}>
        <button
          onClick={onLogout}
          style={{
            width: "100%", padding: "10px", borderRadius: 12,
            display: "flex", alignItems: "center",
            justifyContent: collapsed && !isMobile ? "center" : "flex-start",
            gap: 10, transition: "background 0.2s",
            color: C.onSurfaceVariant, opacity: 0.6,
            fontFamily: "Geist", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}
          onMouseOver={e => { e.currentTarget.style.background = C.surfaceContainer; e.currentTarget.style.opacity = "1"; }}
          onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.6"; }}
        >
          <Icon name="logout" size={18} style={{ flexShrink: 0 }} />
          {(!collapsed || isMobile) && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle (desktop only) */}
      {!isMobile && (
        <div style={{ padding: collapsed ? "0 12px" : "0 20px", marginTop: 8 }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: "100%", padding: "10px", borderRadius: 12,
              background: C.surfaceContainer, color: C.onSurfaceVariant,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
            }}
          >
            <Icon name={collapsed ? "chevron_right" : "chevron_left"} size={20} />
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;