import { useState } from "react";
import useIsMobile from "../hooks/useIsMobile";
import { C } from "../tokens/design";
import { Badge, Icon, SectionTitle, PrimaryBtn, SecondaryBtn, ErrorBanner } from "../components/ui";
import { AddProductModal, EditProductModal, RestockModal } from "../components/modals";
import { useInventory, useStockMovement } from "../hooks/useFirestore";

const CATEGORIES = ["All Products", "Styling", "Shave & Beard", "Fragrance", "Hair Care", "Equipment"];
const SORT_OPTIONS = ["Name A–Z", "Name Z–A", "Price ↑", "Price ↓", "Stock ↑", "Stock ↓"];

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
    <div style={{ width: 32, height: 32, border: "3px solid #eee", borderTopColor: "#333", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
  </div>
);

/* ── Filter/Sort dropdown ─────────────────────────────────────────────────── */
const SortDropdown = ({ sort, setSort, onClose }) => (
  <div
    onClick={e => e.stopPropagation()}
    style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 200,
      background: "#fff", border: `1px solid ${C.outlineVariant}30`,
      borderRadius: 14, padding: "8px 0", minWidth: 180,
      boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
    }}
  >
    <p style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant, padding: "6px 16px 10px" }}>Sort By</p>
    {SORT_OPTIONS.map(opt => (
      <button
        key={opt}
        onClick={() => { setSort(opt); onClose(); }}
        style={{
          display: "block", width: "100%", textAlign: "left",
          padding: "9px 16px", fontFamily: "Geist", fontSize: 13,
          color: sort === opt ? C.primary : C.onSurface,
          background: sort === opt ? `${C.primary}08` : "transparent",
          fontWeight: sort === opt ? 600 : 400,
          transition: "background 0.12s",
        }}
        onMouseOver={e => { if (sort !== opt) e.currentTarget.style.background = C.surfaceLow; }}
        onMouseOut={e => { if (sort !== opt) e.currentTarget.style.background = "transparent"; }}
      >
        {opt}
      </button>
    ))}
  </div>
);

/* ── Product card ─────────────────────────────────────────────────────────── */
const ProductCard = ({ p, isMobile, onEdit, onRestock }) => (
  <div
    className="card"
    style={{ overflow: "hidden", transition: "transform 0.3s, box-shadow 0.3s" }}
    onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 28px 56px rgba(0,0,0,0.09)"; }}
    onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.04)"; }}
  >
    {/* Image placeholder */}
    <div style={{ height: isMobile ? 120 : 200, background: C.surfaceLow, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {p.status === "low-stock" && (
        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(254,214,91,0.9)", backdropFilter: "blur(8px)", padding: "4px 10px", borderRadius: 999, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="warning" size={12} style={{ color: C.secondary }} />
          <span style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.secondary }}>Low Stock</span>
        </div>
      )}
      {p.status === "out-of-stock" && (
        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(255,218,214,0.9)", backdropFilter: "blur(8px)", padding: "4px 10px", borderRadius: 999, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="block" size={12} style={{ color: C.error }} />
          <span style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.error }}>Out of Stock</span>
        </div>
      )}
      {/* Edit button top-right */}
      <button
        onClick={() => onEdit(p)}
        style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
        onMouseOver={e => (e.currentTarget.style.background = "#fff")}
        onMouseOut={e => (e.currentTarget.style.background = "rgba(255,255,255,0.85)")}
      >
        <Icon name="edit" size={14} style={{ color: C.onSurfaceVariant }} />
      </button>
      <Icon name="inventory_2" size={isMobile ? 32 : 48} style={{ color: C.outlineVariant, opacity: 0.5 }} />
    </div>

    {/* Body */}
    <div style={{ padding: isMobile ? "14px 14px 12px" : "24px 24px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <p style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 3 }}>{p.category}</p>
          <h3 style={{ fontFamily: "Geist", fontSize: isMobile ? 13 : 17, fontWeight: 500, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "nowrap" : "normal" }}>{p.name}</h3>
        </div>
        <span style={{ fontFamily: "Geist", fontSize: isMobile ? 13 : 17, fontWeight: 500, color: C.primary, flexShrink: 0 }}>{p.price}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.status === "in-stock" ? "#22c55e" : p.status === "low-stock" ? C.secondary : C.error }} />
          <span style={{ fontSize: 11, color: p.status === "in-stock" ? C.onSurfaceVariant : p.status === "low-stock" ? C.secondary : C.error }}>
            {isMobile ? p.stock : (p.stock === 0 ? "Out of stock" : `${p.stock} in stock`)}
          </span>
        </div>
        {p.status !== "in-stock" && (
          <button
            onClick={() => onRestock(p)}
            style={{ padding: "5px 10px", background: `${C.secondary}15`, color: C.secondary, borderRadius: 8, fontFamily: "Geist", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Restock
          </button>
        )}
      </div>
    </div>
  </div>
);

/* ── Page ─────────────────────────────────────────────────────────────────── */
const InventoryPage = ({ search }) => {
  const { data: inventory, loading: invLoading, error: invError } = useInventory();
  const { data: stockMovement, loading: smLoading } = useStockMovement();

  const [category,    setCategory]    = useState("All Products");
  const [sort,        setSort]        = useState("Name A–Z");
  const [showModal,   setShowModal]   = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [restockProduct, setRestockProduct] = useState(null);
  const [showSort,    setShowSort]    = useState(false);
  const isMobile = useIsMobile();

  // Price parser helper
  const parsePrice = p => parseFloat((p?.price ?? "").replace(/[$,]/g, "") || 0);

  const sorted = [...inventory].sort((a, b) => {
    switch (sort) {
      case "Name A–Z":  return (a.name ?? "").localeCompare(b.name ?? "");
      case "Name Z–A":  return (b.name ?? "").localeCompare(a.name ?? "");
      case "Price ↑":   return parsePrice(a) - parsePrice(b);
      case "Price ↓":   return parsePrice(b) - parsePrice(a);
      case "Stock ↑":   return (a.stock ?? 0) - (b.stock ?? 0);
      case "Stock ↓":   return (b.stock ?? 0) - (a.stock ?? 0);
      default:          return 0;
    }
  });

  const filtered = sorted.filter(p =>
    (category === "All Products" || p.category?.toLowerCase().includes(category.toLowerCase())) &&
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock   = inventory.filter(p => p.status === "low-stock").length;
  const outOfStock = inventory.filter(p => p.status === "out-of-stock").length;
  const totalValue = inventory.reduce((sum, p) => sum + (parsePrice(p) * (p.stock || 0)), 0);

  if (invLoading) return <Spinner />;
  if (invError)   return <ErrorBanner message={invError} />;

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }} onClick={() => showSort && setShowSort(false)}>

      {showModal      && <AddProductModal onClose={() => setShowModal(false)} />}
      {editProduct    && <EditProductModal product={editProduct} onClose={() => setEditProduct(null)} />}
      {restockProduct && <RestockModal product={restockProduct} onClose={() => setRestockProduct(null)} />}

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 12 : 20, marginBottom: isMobile ? 24 : 40 }}>
        {[
          { label: "Total SKU",       value: inventory.length,                    icon: "inventory_2",     warn: false },
          { label: "Low Stock",       value: lowStock + outOfStock,               icon: "warning",         warn: true  },
          { label: "Inventory Value", value: `$${(totalValue / 1000).toFixed(1)}k`, icon: "account_balance", warn: false },
          { label: "Out of Stock",    value: outOfStock,                           icon: "block",           warn: outOfStock > 0 },
        ].map(s => (
          <div key={s.label} className="card fade-up" style={{ padding: isMobile ? 18 : 28 }}>
            <Icon name={s.icon} size={18} style={{ color: s.warn ? C.secondary : C.onSurfaceVariant, marginBottom: 12 }} />
            <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontFamily: "Geist", fontSize: isMobile ? 28 : 36, fontWeight: 500, letterSpacing: "-0.02em", color: s.warn ? C.secondary : C.primary }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Category Tabs + Actions */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{ padding: "8px 14px", flexShrink: 0, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: category === c ? C.primary : C.onSurfaceVariant, borderBottom: `2px solid ${category === c ? C.primary : "transparent"}`, opacity: category === c ? 1 : 0.5, transition: "all 0.2s", whiteSpace: "nowrap" }}>
                {c}
              </button>
            ))}
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <SecondaryBtn icon="filter_list" onClick={e => { e.stopPropagation(); setShowSort(v => !v); }}>
                  {sort === "Name A–Z" ? "Filter & Sort" : sort}
                </SecondaryBtn>
                {showSort && <SortDropdown sort={sort} setSort={setSort} onClose={() => setShowSort(false)} />}
              </div>
              <PrimaryBtn icon="add" onClick={() => setShowModal(true)}>Add Product</PrimaryBtn>
            </div>
          )}
        </div>
        {isMobile && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <SecondaryBtn icon="filter_list" style={{ width: "100%", justifyContent: "center" }} onClick={e => { e.stopPropagation(); setShowSort(v => !v); }}>Sort</SecondaryBtn>
              {showSort && <SortDropdown sort={sort} setSort={setSort} onClose={() => setShowSort(false)} />}
            </div>
            <PrimaryBtn icon="add" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowModal(true)}>Add Product</PrimaryBtn>
          </div>
        )}
      </div>

      {/* Product Grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: isMobile ? 14 : 24, marginBottom: isMobile ? 32 : 48 }}>
        {filtered.map(p => (
          <ProductCard
            key={p.id}
            p={p}
            isMobile={isMobile}
            onEdit={setEditProduct}
            onRestock={setRestockProduct}
          />
        ))}

        {/* Add Product Card */}
        <div
          onClick={() => setShowModal(true)}
          style={{ border: `2px dashed ${C.outlineVariant}`, borderRadius: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: isMobile ? 180 : 280, cursor: "pointer", transition: "background 0.2s" }}
          onMouseOver={e => (e.currentTarget.style.background = C.surfaceContainer)}
          onMouseOut={e => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${C.primary}08`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <Icon name="add" size={24} style={{ color: C.primary }} />
          </div>
          <p style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.primary, textAlign: "center" }}>Add New Product</p>
        </div>
      </div>

      {/* Stock Movement Table */}
      <SectionTitle title="Stock Movement" />
      <div className="card" style={{ overflow: "hidden" }}>
        {smLoading ? <Spinner /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 500 : "auto" }}>
              <thead>
                <tr style={{ background: C.surfaceLow }}>
                  {["Product", "Action", "Date", "Qty Change", "Status"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: h === "Status" ? "right" : "left", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockMovement.map(r => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${C.outlineVariant}20` }} onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow + "60")} onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "14px 16px", fontFamily: "Geist", fontWeight: 500, fontSize: 13, color: C.primary, whiteSpace: "nowrap" }}>{r.product}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: C.onSurface, whiteSpace: "nowrap" }}>{r.action}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: C.onSurfaceVariant, whiteSpace: "nowrap" }}>{r.date}</td>
                    <td style={{ padding: "14px 16px", fontFamily: "Geist", fontWeight: 600, fontSize: 13, color: r.change?.startsWith("+") ? "#166534" : C.error }}>{r.change}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><Badge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;