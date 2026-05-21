import { C } from "../tokens/design";
import { Icon, Input } from "./ui";

const TopBar = ({ title, subtitle, search, setSearch, isMobile, onMenuClick, userEmail, role }) => {
  // Derive initials from email (e.g. "jake@lounge.com" → "JA")
  const initials = userEmail
    ? userEmail.split("@")[0].slice(0, 2).toUpperCase()
    : "??";

  const roleLabel = role === "admin" ? "Admin" : "Barber";

  return (
    <header
      style={{
        padding: isMobile ? "20px 0 16px" : "28px 0 24px",
        marginBottom: 8,
      }}
    >
      {/* Row 1: Menu + Title + Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 12 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isMobile && (
            <button
              onClick={onMenuClick}
              style={{
                padding: 8, borderRadius: 10,
                background: C.surfaceLowest,
                border: `1px solid ${C.outlineVariant}`,
                display: "flex",
              }}
            >
              <Icon name="menu" size={20} />
            </button>
          )}
          <div>
            <h2
              style={{
                fontFamily: "Geist",
                fontSize: isMobile ? 26 : 40,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: C.primary,
                lineHeight: 1.1,
              }}
            >
              {title}
            </h2>
            {!isMobile && (
              <p style={{ color: C.onSurfaceVariant, fontSize: 14, marginTop: 6 }}>{subtitle}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16 }}>
          {!isMobile && (
            <Input
              icon="search"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 240 }}
            />
          )}

          <button
            style={{
              padding: 10, borderRadius: 12,
              background: C.surfaceLowest,
              border: `1px solid ${C.outlineVariant}`,
              display: "flex",
            }}
          >
            <Icon name="notifications" size={20} />
          </button>

          {!isMobile && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 16px", background: C.surfaceLowest,
                borderRadius: 999, border: `1px solid ${C.outlineVariant}`,
              }}
            >
              <div
                style={{
                  width: 30, height: 30,
                  background: role === "admin" ? C.secondaryContainer : C.surfaceHigh,
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Geist", fontSize: 11, fontWeight: 700,
                  color: role === "admin" ? C.secondary : C.onSurfaceVariant,
                }}
              >
                {initials}
              </div>
              <span style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600 }}>{roleLabel}</span>
              <Icon name="expand_more" size={18} style={{ color: C.onSurfaceVariant }} />
            </div>
          )}

          {isMobile && (
            <div
              style={{
                width: 36, height: 36,
                background: role === "admin" ? C.secondaryContainer : C.surfaceHigh,
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Geist", fontSize: 12, fontWeight: 700,
                color: role === "admin" ? C.secondary : C.onSurfaceVariant,
              }}
            >
              {initials}
            </div>
          )}
        </div>
      </div>

      {/* Row 2 on mobile: search */}
      {isMobile && (
        <Input
          icon="search"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%" }}
        />
      )}
    </header>
  );
};

export default TopBar;