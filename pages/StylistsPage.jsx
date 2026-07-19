import { useState, useMemo } from "react";
import { C } from "../tokens/design";
import { Icon, SecondaryBtn, ErrorBanner } from "../components/ui";
import { useStylists, useTransactions } from "../hooks/useFirestore";
import { fmt, TIER_DEFAULT_SPLIT } from "../utils/currency";
import { EditStylistModal, DeleteStylistModal, AddStylistModal, BarberSplitsModal } from "../components/modals";
import useIsMobile from "../hooks/useIsMobile";

/* ── Status badge ────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const active = status === "Active";
  return (
    <span style={{
      background: active ? "var(--badge-success-bg)" : C.surfaceHigh,
      color: active ? "var(--badge-success-fg)" : C.onSurfaceVariant,
      padding: "3px 12px", borderRadius: 999,
      fontSize: 11, fontFamily: "Geist", fontWeight: 600,
      letterSpacing: "0.08em", textTransform: "uppercase",
    }}>{status}</span>
  );
};

/* ── Stylist card ────────────────────────────────────────────────────────── */
const StylistCard = ({ stylist, onEdit, onDelete }) => (
  <div className="card" style={{ padding: 0, overflow: "hidden", transition: "box-shadow 0.2s" }}
    onMouseOver={e => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.10)")}
    onMouseOut={e => (e.currentTarget.style.boxShadow = "")}
  >
    {/* Card header */}
    <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${C.outlineVariant}20` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
            background: C.secondaryContainer,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Geist", fontSize: 16, fontWeight: 700, color: C.secondary,
          }}>
            {stylist.initials}
          </div>
          <div>
            <div style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary }}>{stylist.name}</div>
            <div style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 3 }}>{stylist.role}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 5, padding: "2px 8px", borderRadius: 999, background: C.surfaceLow }}>
              <span style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.onSurfaceVariant }}>
                {stylist.tier ?? "Junior"} · {stylist.splitPercent ?? TIER_DEFAULT_SPLIT[stylist.tier ?? "Junior"]}% split
              </span>
            </div>
            {!stylist.uid && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 5, padding: "2px 8px", borderRadius: 999, background: "var(--badge-warning-bg)" }}>
                <Icon name="warning" size={11} style={{ color: "var(--badge-warning-fg)" }} />
                <span style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--badge-warning-fg)" }}>
                  No login
                </span>
              </div>
            )}
          </div>
        </div>
        <StatusBadge status={stylist.status} />
      </div>
    </div>

    {/* Stats row */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${C.outlineVariant}20` }}>
      {[
        { icon: "receipt",  label: "Sales",   value: stylist.bookings ?? 0 },
        { icon: "payments", label: "Revenue", value: fmt(stylist.revenue ?? 0) },
      ].map(s => (
        <div key={s.label} style={{ padding: "16px 24px", borderRight: s.label === "Bookings" ? `1px solid ${C.outlineVariant}20` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Icon name={s.icon} size={14} style={{ color: C.onSurfaceVariant }} />
            <span style={{ fontSize: 10, fontFamily: "Geist", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant }}>{s.label}</span>
          </div>
          <div style={{ fontFamily: "Geist", fontSize: 20, fontWeight: 700, color: C.primary }}>{s.value}</div>
        </div>
      ))}
    </div>

    {/* Contact row */}
    {(stylist.email || stylist.phone) && (
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${C.outlineVariant}20`, display: "flex", flexWrap: "wrap", gap: 16 }}>
        {stylist.email && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="mail" size={13} style={{ color: C.onSurfaceVariant }} />
            <span style={{ fontSize: 12, color: C.onSurfaceVariant }}>{stylist.email}</span>
          </div>
        )}
        {stylist.phone && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="phone" size={13} style={{ color: C.onSurfaceVariant }} />
            <span style={{ fontSize: 12, color: C.onSurfaceVariant }}>{stylist.phone}</span>
          </div>
        )}
      </div>
    )}

    {/* Specialties */}
    {stylist.specialties?.length > 0 && (
      <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.outlineVariant}20`, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {stylist.specialties.map(sp => (
          <span key={sp} style={{ background: C.surfaceLow, color: C.onSurfaceVariant, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontFamily: "Geist", fontWeight: 500 }}>
            {sp}
          </span>
        ))}
      </div>
    )}

    {/* Actions */}
    <div style={{ padding: "14px 24px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
      <SecondaryBtn icon="edit" onClick={() => onEdit(stylist)}>Edit</SecondaryBtn>
      <button
        onClick={() => onDelete(stylist)}
        style={{ padding: "8px 14px", borderRadius: 10, background: "var(--c-error-container)", color: C.error, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}
      >
        <Icon name="delete" size={14} style={{ color: C.error }} />
        Remove
      </button>
    </div>
  </div>
);

/* ── Page ────────────────────────────────────────────────────────────────── */
const StylistsPage = ({ search = "" }) => {
  const isMobile = useIsMobile();
  const { data: stylists,     loading,  error  } = useStylists();
  const { data: transactions } = useTransactions();

  // Aggregate bookings & revenue per barber name from live transactions
  const barberStats = useMemo(() => {
    const map = {};
    (transactions ?? []).forEach(t => {
      if (!t.barber) return;
      if (!map[t.barber]) map[t.barber] = { bookings: 0, revenue: 0 };
      map[t.barber].bookings += 1;
      const amt = parseFloat((t.amount ?? "0").toString().replace(/[$,]/g, "")) || 0;
      if (t.status !== "Refunded") map[t.barber].revenue += amt;
    });
    return map;
  }, [transactions]);

  // Enrich each stylist with live aggregated stats
  const enriched = useMemo(() =>
    (stylists ?? []).map(s => {
      const stats = barberStats[s.name] ?? { bookings: 0, revenue: 0 };
      return {
        ...s,
        bookings: stats.bookings,
        revenue:  stats.revenue,
      };
    }),
  [stylists, barberStats]);

  const [editTarget, setEditTarget] = useState(null);
  const [delTarget,  setDelTarget]  = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);
  const [showSplits, setShowSplits] = useState(false);
  const [filter,     setFilter]     = useState("All");

  const filters = ["All", "Active", "Inactive"];

  const q = (search ?? "").toLowerCase();

  const filtered = enriched
    .filter(s => filter === "All" || s.status === filter)
    .filter(s =>
      !q ||
      s.name?.toLowerCase().includes(q) ||
      s.role?.toLowerCase().includes(q)
    );

  const active    = enriched.filter(s => s.status === "Active").length;
  const totalRev  = enriched.reduce((sum, s) => sum + (s.revenue ?? 0), 0);

  if (error) return <ErrorBanner message={error} />;

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>

      {/* Info banner - stylists auto-sync from Staff Accounts */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
        background: C.secondaryContainer, borderRadius: 14,
        padding: "14px 20px", marginBottom: 28,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="info" size={18} style={{ color: C.secondary, flexShrink: 0 }} />
          <span style={{ fontFamily: "Geist", fontSize: 13, color: C.secondary, fontWeight: 500 }}>
            Stylist profiles are created automatically when a barber account is added in Settings.
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <SecondaryBtn icon="percent" onClick={() => setShowSplits(true)}>
            Barber Splits
          </SecondaryBtn>
          <SecondaryBtn icon="settings" onClick={() => window.dispatchEvent(new CustomEvent("navigate-settings"))}>
            Staff Accounts
          </SecondaryBtn>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(240px, 1fr))", gap: isMobile ? 12 : 20, marginBottom: isMobile ? 24 : 36 }}>
        {[
          { icon: "content_cut",  label: "Total Stylists",  value: stylists.length },
          { icon: "check_circle", label: "Active",          value: active },
          { icon: "payments",     label: "Team Revenue",    value: fmt(totalRev) },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, background: C.surfaceLow, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={k.icon} size={20} style={{ color: C.primary }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: "Geist", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant }}>{k.label}</div>
              <div style={{ fontFamily: "Geist", fontSize: 22, fontWeight: 700, color: C.primary, marginTop: 3 }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 18px", borderRadius: 999,
            background: filter === f ? C.primary : "transparent",
            color: filter === f ? C.onPrimary : C.onSurfaceVariant,
            border: `1px solid ${filter === f ? C.primary : C.outlineVariant}`,
            fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
            transition: "all 0.15s",
          }}>{f}</button>
        ))}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: C.onSurfaceVariant, fontFamily: "Geist" }}>Loading stylists…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: `${C.secondary}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <Icon name="content_cut" size={36} style={{ color: C.secondary }} />
          </div>
          <p style={{ fontFamily: "Geist", fontSize: 20, fontWeight: 600, color: C.primary, marginBottom: 10 }}>
            {filter === "All" ? "No stylists yet" : `No ${filter.toLowerCase()} stylists`}
          </p>
          <p style={{ fontFamily: "Geist", fontSize: 14, color: C.onSurfaceVariant, marginBottom: 32, maxWidth: 360 }}>
            {filter === "All"
              ? "Stylist profiles are created automatically when you add a barber account in Settings."
              : "Try changing the filter to see all stylists."}
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("navigate-settings"))}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: 14,
              background: C.primary, color: C.onPrimary,
              fontFamily: "Geist", fontSize: 13, fontWeight: 600,
              letterSpacing: "0.04em", border: "none", cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseOut={e => (e.currentTarget.style.opacity = "1")}
          >
            <Icon name="settings" size={18} style={{ color: C.onPrimary }} />
            Go to Staff Accounts
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(340px, 1fr))", gap: isMobile ? 16 : 24 }}>
          {filtered.map(s => (
            <StylistCard key={s.id} stylist={s} onEdit={setEditTarget} onDelete={setDelTarget} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd      && <AddStylistModal                      onClose={() => setShowAdd(null)} />}
      {editTarget && <EditStylistModal   stylist={editTarget} onClose={() => setEditTarget(null)} />}
      {delTarget  && <DeleteStylistModal stylist={delTarget}  onClose={() => setDelTarget(null)} />}
      {showSplits && <BarberSplitsModal  onClose={() => setShowSplits(false)} />}
    </div>
  );
};

export default StylistsPage;