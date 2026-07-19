import { useState, useRef, useEffect } from "react";
import { C } from "../tokens/design";
import { Icon, Input } from "./ui";

/* Shared hook: closes a floating panel when clicking outside its ref */
const useOutsideClick = (ref, isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose]);
};

const TopBar = ({ title, subtitle, search, setSearch, isMobile, onMenuClick, userEmail, displayName, role, onLogout, onNavigate, notifications = [] }) => {
  const [visible, setVisible] = useState(true);
  const [displayed, setDisplayed] = useState({ title, subtitle });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(false);
    const t = setTimeout(() => {
      setDisplayed({ title, subtitle });
      setVisible(true);
    }, 120);
    return () => clearTimeout(t);
  }, [title, subtitle]);

  const initials = (displayName || userEmail || "")
    .split(/[\s@]/)[0]
    .split(/[._]/)
    .map(p => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";
  const roleLabel = role === "admin" ? "Admin" : "Barber";

  /* ── Notifications state ── */
  const [notifOpen, setNotifOpen] = useState(false);
  const [read,      setRead]      = useState(new Set());
  const notifRef = useRef(null);
  useOutsideClick(notifRef, notifOpen, () => setNotifOpen(false));

  const unreadCount = notifications.filter(n => !read.has(n.id)).length;
  const markAllRead = () => setRead(new Set(notifications.map(n => n.id)));

  /* ── User menu state ── */
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);
  useOutsideClick(userRef, userOpen, () => setUserOpen(false));

  const menuItems = [
    { icon: "person",   label: "Profile",  action: () => onNavigate?.("profile"),  divider: false },
    ...(role === "admin"
      ? [{ icon: "settings", label: "Settings", action: () => onNavigate?.("settings"), divider: false }]
      : []),
    { icon: "logout",   label: "Log out",  action: onLogout, divider: true },
  ];

  return (
    <header style={{ padding: isMobile ? "20px 0 16px" : "28px 0 24px", marginBottom: 8 }}>

      {/* Row 1 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 12 : 0 }}>

        {/* Left: hamburger + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isMobile && (
            <button onClick={onMenuClick} style={{ padding: 8, borderRadius: 10, background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, display: "flex" }}>
              <Icon name="menu" size={20} />
            </button>
          )}
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.2s ease, transform 0.2s ease" }}>
            <h2 style={{ fontFamily: "Geist", fontSize: isMobile ? 26 : 40, fontWeight: 500, letterSpacing: "-0.02em", color: C.primary, lineHeight: 1.1 }}>
              {displayed.title}
            </h2>
            {!isMobile && <p style={{ color: C.onSurfaceVariant, fontSize: 14, marginTop: 6 }}>{displayed.subtitle}</p>}
          </div>
        </div>

        {/* Right: search + bell + user pill */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16 }}>

          {!isMobile && (
            <Input icon="search" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} />
          )}

          {/* ── Notifications bell ── */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              onClick={() => { setNotifOpen(v => !v); setUserOpen(false); }}
              style={{
                padding: 10, borderRadius: 12,
                background: notifOpen ? C.surfaceLow : C.surfaceLowest,
                border: `1px solid ${notifOpen ? C.primary + "60" : C.outlineVariant}`,
                display: "flex", position: "relative",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <Icon name="notifications" size={20} />
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: C.error, border: `2px solid ${C.surface}` }} />
              )}
            </button>

            {notifOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 320, background: C.surface, border: `1px solid ${C.outlineVariant}40`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 200, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 12px" }}>
                  <span style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 700, color: C.primary }}>
                    Notifications{" "}
                    {unreadCount > 0 && <span style={{ marginLeft: 6, background: C.error, color: C.onError, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>{unreadCount}</span>}
                  </span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: 11, fontFamily: "Geist", fontWeight: 600, color: C.secondary, background: "none" }}>Mark all read</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: "24px 18px", textAlign: "center", color: C.onSurfaceVariant, fontSize: 13 }}>
                    All caught up!
                  </div>
                ) : notifications.map(n => {
                  const isRead = read.has(n.id);
                  return (
                    <div key={n.id} onClick={() => setRead(prev => new Set([...prev, n.id]))}
                      style={{ display: "flex", gap: 12, padding: "12px 18px", borderTop: `1px solid ${C.outlineVariant}20`, background: isRead ? "transparent" : `${C.primary}06`, cursor: "pointer", transition: "background 0.15s" }}
                      onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
                      onMouseOut={e => (e.currentTarget.style.background = isRead ? "transparent" : `${C.primary}06`)}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: n.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name={n.icon} size={16} style={{ color: n.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <p style={{ fontFamily: "Geist", fontSize: 12, fontWeight: isRead ? 500 : 700, color: C.primary, lineHeight: 1.3 }}>{n.title}</p>
                          <span style={{ fontSize: 10, color: C.onSurfaceVariant, flexShrink: 0, marginTop: 1 }}>{n.time}</span>
                        </div>
                        <p style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 2, lineHeight: 1.4 }}>{n.body}</p>
                      </div>
                      {!isRead && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.primary, flexShrink: 0, marginTop: 6 }} />}
                    </div>
                  );
                })}
                <div style={{ padding: "10px 18px", borderTop: `1px solid ${C.outlineVariant}20`, textAlign: "center" }}>
                  <span style={{ fontSize: 11, fontFamily: "Geist", fontWeight: 600, color: C.secondary }}>View all notifications</span>
                </div>
              </div>
            )}
          </div>

          {/* ── User pill (desktop) ── */}
          {!isMobile && (
            <div ref={userRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setUserOpen(v => !v); setNotifOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 16px",
                  background: userOpen ? C.surfaceLow : C.surfaceLowest,
                  borderRadius: 999,
                  border: `1px solid ${userOpen ? C.primary + "60" : C.outlineVariant}`,
                  cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                <div style={{ width: 30, height: 30, background: role === "admin" ? C.secondaryContainer : C.surfaceHigh, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Geist", fontSize: 11, fontWeight: 700, color: role === "admin" ? C.secondary : C.onSurfaceVariant }}>
                  {initials}
                </div>
                <span style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: C.primary }}>{roleLabel}</span>
                <Icon name={userOpen ? "expand_less" : "expand_more"} size={18} style={{ color: C.onSurfaceVariant, transition: "transform 0.15s" }} />
              </button>

              {userOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 220, background: C.surface, border: `1px solid ${C.outlineVariant}40`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 200, overflow: "hidden", padding: "8px 0" }}>

                  {/* User info header */}
                  <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${C.outlineVariant}20` }}>
                    <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</p>
                    <span style={{ display: "inline-block", marginTop: 4, background: role === "admin" ? C.secondaryContainer : C.surfaceHigh, color: role === "admin" ? C.secondary : C.onSurfaceVariant, fontSize: 10, fontFamily: "Geist", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999 }}>
                      {roleLabel}
                    </span>
                  </div>

                  {/* Menu items */}
                  {menuItems.map(item => (
                    <div key={item.label}>
                      {item.divider && <div style={{ height: 1, background: `${C.outlineVariant}30`, margin: "6px 0" }} />}
                      <button
                        onClick={() => { setUserOpen(false); item.action?.(); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "none", textAlign: "left", cursor: item.action ? "pointer" : "default", transition: "background 0.15s" }}
                        onMouseOver={e => (e.currentTarget.style.background = item.label === "Log out" ? `${C.error}10` : C.surfaceLow)}
                        onMouseOut={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <Icon name={item.icon} size={16} style={{ color: item.label === "Log out" ? C.error : C.onSurfaceVariant, flexShrink: 0 }} />
                        <span style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 500, color: item.label === "Log out" ? C.error : C.primary }}>{item.label}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── User avatar (mobile) ── */}
          {isMobile && (
            <div ref={userRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setUserOpen(v => !v); setNotifOpen(false); }}
                style={{ width: 36, height: 36, background: role === "admin" ? C.secondaryContainer : C.surfaceHigh, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Geist", fontSize: 12, fontWeight: 700, color: role === "admin" ? C.secondary : C.onSurfaceVariant, border: userOpen ? `2px solid ${C.primary}` : "2px solid transparent", transition: "border-color 0.15s" }}
              >
                {initials}
              </button>

              {userOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 200, background: C.surface, border: `1px solid ${C.outlineVariant}40`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 200, overflow: "hidden", padding: "8px 0" }}>
                  <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${C.outlineVariant}20` }}>
                    <p style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</p>
                  </div>
                  <button
                    onClick={() => { setUserOpen(false); onLogout?.(); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "none", textAlign: "left", cursor: "pointer" }}
                    onMouseOver={e => (e.currentTarget.style.background = `${C.error}10`)}
                    onMouseOut={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <Icon name="logout" size={16} style={{ color: C.error }} />
                    <span style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 500, color: C.error }}>Log out</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Row 2 on mobile: search */}
      {isMobile && (
        <Input icon="search" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%" }} />
      )}

    </header>
  );
};

export default TopBar;