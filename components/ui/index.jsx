import { C } from "../../tokens/design";

export const Icon = ({ name, size = 22, style: s = {} }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size, ...s }}>
    {name}
  </span>
);

export const Badge = ({ status }) => {
  const map = {
    VIP:            { bg: "var(--badge-vip-bg)",     color: "var(--badge-vip-fg)"     },
    Regular:        { bg: "var(--badge-neutral-bg)", color: "var(--badge-neutral-fg)" },
    New:            { bg: "var(--badge-new-bg)",     color: "var(--badge-new-fg)"     },
    Completed:      { bg: "var(--badge-neutral-bg)", color: "var(--badge-neutral-fg)" },
    Refunded:       { bg: "var(--badge-error-bg)",   color: "var(--badge-error-fg)"   },
    "in-stock":     { bg: "var(--badge-success-bg)", color: "var(--badge-success-fg)" },
    "low-stock":    { bg: "var(--badge-warning-bg)", color: "var(--badge-warning-fg)" },
    "out-of-stock": { bg: "var(--badge-error-bg)",   color: "var(--badge-error-fg)"   },
    "Low Level":    { bg: "var(--badge-warning-bg)", color: "var(--badge-warning-fg)" },
    Adjusted:       { bg: "var(--badge-neutral-bg)", color: "var(--badge-neutral-fg)" },
    Pending:        { bg: "var(--badge-new-bg)",     color: "var(--badge-new-fg)"     },
    Active:         { bg: "var(--badge-success-bg)", color: "var(--badge-success-fg)" },
    Inactive:       { bg: "var(--badge-neutral-bg)", color: "var(--badge-neutral-fg)" },
  };
  const { bg = "var(--badge-neutral-bg)", color = "var(--badge-neutral-fg)" } = map[status] || {};
  return (
    <span style={{ background: bg, color, padding: "3px 12px", borderRadius: 999, fontSize: 11, fontFamily: "Geist, sans-serif", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
      {status}
    </span>
  );
};

export const KpiCard = ({ icon, label, value, trend, trendPositive = true }) => (
  <div className="card fade-up" style={{ padding: 32 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
      <div style={{ padding: 12, background: C.surfaceLow, borderRadius: 14 }}>
        <Icon name={icon} size={22} />
      </div>
      {trend && (
        <span style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: trendPositive ? C.secondary : C.error }}>
          {trend}
        </span>
      )}
    </div>
    <p style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>
      {label}
    </p>
    <p style={{ fontFamily: "Geist", fontSize: 32, fontWeight: 500, letterSpacing: "-0.01em", color: C.primary }}>
      {value}
    </p>
  </div>
);

export const SectionTitle = ({ title, subtitle, action, onAction }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
    <div>
      <h3 style={{ fontFamily: "Geist", fontSize: 24, fontWeight: 500, color: C.primary }}>{title}</h3>
      {subtitle && <p style={{ color: C.onSurfaceVariant, marginTop: 4, fontSize: 14 }}>{subtitle}</p>}
    </div>
    {action && (
      <button onClick={onAction} style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.secondary }}>
        {action}
      </button>
    )}
  </div>
);

export const Input = ({ placeholder, icon, value, onChange, style: s = {} }) => (
  <div style={{ position: "relative", ...s }}>
    {icon && (
      <Icon name={icon} size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.onSurfaceVariant, opacity: 0.5 }} />
    )}
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ width: "100%", padding: icon ? "10px 16px 10px 42px" : "10px 16px", background: C.surfaceLow, border: "none", borderRadius: 12, fontFamily: "Inter", fontSize: 14, color: C.onSurface }}
    />
  </div>
);

export const PrimaryBtn = ({ children, onClick, icon, pill = false, style: s = {} }) => (
  <button
    onClick={onClick}
    style={{ background: C.primary, color: "#fff", padding: pill ? "10px 24px" : "12px 24px", borderRadius: pill ? 999 : 12, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, transition: "opacity 0.2s", ...s }}
    onMouseOver={e => (e.currentTarget.style.opacity = "0.85")}
    onMouseOut={e => (e.currentTarget.style.opacity = "1")}
  >
    {icon && <Icon name={icon} size={18} style={{ color: "#fff" }} />}
    {children}
  </button>
);

export const SecondaryBtn = ({ children, onClick, icon, disabled = false, style: s = {} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{ background: "transparent", color: C.onSurface, padding: "10px 20px", borderRadius: 12, border: `1px solid ${C.outlineVariant}`, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer", ...s }}
    onMouseOver={e => { if (!disabled) e.currentTarget.style.background = C.surfaceLow; }}
    onMouseOut={e => (e.currentTarget.style.background = "transparent")}
  >
    {icon && <Icon name={icon} size={18} />}
    {children}
  </button>
);

export const ErrorBanner = ({ message }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "16px 20px", borderRadius: 16, marginBottom: 24,
    background: C.errorContainer, border: `1px solid ${C.error}20`,
  }}>
    <Icon name="error_outline" size={20} style={{ color: C.error, flexShrink: 0 }} />
    <div>
      <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.error }}>
        Failed to load data
      </p>
      <p style={{ fontFamily: "Geist", fontSize: 12, color: C.error, opacity: 0.75, marginTop: 2 }}>
        {message ?? "Check your connection and try refreshing the page."}
      </p>
    </div>
  </div>
);

export const OfflineBanner = () => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 20px",
    background: "#fef9c3", borderBottom: "1px solid #fde047",
    position: "sticky", top: 0, zIndex: 200,
  }}>
    <Icon name="wifi_off" size={18} style={{ color: "#854d0e", flexShrink: 0 }} />
    <p style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 500, color: "#854d0e" }}>
      No internet connection — showing demo data. Changes will not be saved.
    </p>
  </div>
);