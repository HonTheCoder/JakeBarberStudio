import { C } from "../tokens/design";
import { Icon } from "../components/ui";

const FEATURES = [
  { icon: "inventory_2",    label: "Stock Levels",        desc: "Live quantity tracking per SKU with low-stock alerts" },
  { icon: "local_shipping", label: "Supplier Orders",     desc: "Raise and track purchase orders directly in the app" },
  { icon: "qr_code_scanner",label: "Barcode Scanning",    desc: "Scan products in/out with a phone camera" },
  { icon: "analytics",      label: "Usage Reports",       desc: "See which products move fastest and forecast reorders" },
  { icon: "sell",           label: "Cost & Margin",       desc: "Attach cost prices and calculate per-service margins" },
  { icon: "category",       label: "Category Management", desc: "Organise stock by brand, type, or service line" },
];

const MILESTONES = [
  { label: "Data model & Firestore schema", done: true  },
  { label: "Stock list view + search",      done: true  },
  { label: "Add / edit / delete products",  done: false },
  { label: "Low-stock alert rules",         done: false },
  { label: "Supplier order workflow",       done: false },
  { label: "Barcode scan integration",      done: false },
];

const doneCount = MILESTONES.filter(m => m.done).length;
const pct       = Math.round((doneCount / MILESTONES.length) * 100);

const InventoryPage = () => (
  <div style={{ maxWidth: 860, margin: "0 auto", paddingTop: 8 }}>

    {/* Hero card */}
    <div
      className="glass"
      style={{
        borderRadius: 24, padding: "40px 40px 36px",
        marginBottom: 24, position: "relative", overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: -60, right: -60,
        width: 260, height: 260, borderRadius: "50%",
        background: `${C.accent}10`, pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 28 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, flexShrink: 0,
          background: C.primaryContainer,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="inventory_2" size={28} style={{ color: C.onPrimaryContainer }} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h3 style={{ fontFamily: "Geist", fontSize: 22, fontWeight: 600, color: C.primary }}>
              Inventory Management
            </h3>
            <span style={{
              padding: "3px 10px", borderRadius: 999,
              background: C.secondaryContainer,
              color: C.secondary,
              fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}>
              In Development
            </span>
          </div>
          <p style={{ color: C.onSurfaceVariant, fontSize: 14, lineHeight: 1.6, maxWidth: 520 }}>
            Full stock control for Jake Barber Studio — track products, manage suppliers, and get
            low-stock alerts before you run out mid-service.
          </p>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: C.onSurfaceVariant, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Build progress
          </span>
          <span style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 700, color: C.primary }}>
            {doneCount} / {MILESTONES.length} milestones
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: C.surfaceHigh, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 999,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${C.accent}, ${C.secondary})`,
            transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
          }} />
        </div>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

      <div className="glass" style={{ borderRadius: 20, padding: "28px 28px 24px" }}>
        <p style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 18 }}>
          Milestones
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MILESTONES.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: m.done ? C.primary : C.surfaceHigh,
                border: m.done ? "none" : `1.5px solid ${C.outlineVariant}`,
              }}>
                {m.done && <Icon name="check" size={14} style={{ color: C.onPrimary }} />}
              </div>
              <span style={{
                fontFamily: "Geist", fontSize: 13,
                color: m.done ? C.primary : C.onSurfaceVariant,
                fontWeight: m.done ? 500 : 400,
                textDecoration: m.done ? "line-through" : "none",
                opacity: m.done ? 0.6 : 1,
              }}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass" style={{ borderRadius: 20, padding: "28px 28px 24px" }}>
        <p style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 18 }}>
          Planned Features
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: C.surfaceContainer,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={f.icon} size={16} style={{ color: C.onSurfaceVariant }} />
              </div>
              <div>
                <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.primary, marginBottom: 2 }}>{f.label}</p>
                <p style={{ fontSize: 11, color: C.onSurfaceVariant, lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            </div>
          ))} 
        </div>
      </div>

    </div>

    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "14px 20px", borderRadius: 14,
      background: C.surfaceContainer,
      color: C.onSurfaceVariant, fontSize: 13,
    }}>
      <Icon name="schedule" size={16} style={{ flexShrink: 0 }} />
      <span>
        <strong style={{ fontFamily: "Geist", fontWeight: 600, color: C.primary }}>Estimated availability:</strong>
        {" "}Q3 2025 — check back soon or watch for a release note in Settings.
      </span>
    </div>

  </div>
);

export default InventoryPage;