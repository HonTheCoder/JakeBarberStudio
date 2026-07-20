import { useState, useRef, useEffect, useMemo } from "react";
import { C, getNavItems } from "../tokens/design";
import { Icon } from "./ui";
import { useClients, useStylists } from "../hooks/useFirestore";

/* ─────────────────────────────────────────────────────────────────────────
   GlobalSearch — the TopBar search box, upgraded into a real omnisearch.

   Typing searches across three things at once:
     • App pages (matched by nav label — "sett" finds Settings)
     • Clients (matched by name / phone / email)
     • Stylists (matched by name / email)

   The input stays fully controlled by the parent (same `value`/`onChange`
   contract as before) so per-page live-filtering on Clients/Stylists still
   works exactly as it did. Picking a result from the dropdown calls
   `onNavigate(page, prefillQuery)`, which switches pages AND seeds that
   page's own search box with the picked name — so landing on Clients after
   picking "Jake Mariscotes" shows the list already filtered to just him.
───────────────────────────────────────────────────────────────────────── */
const GlobalSearch = ({ value, onChange, onNavigate, role, isMobile, style: s = {} }) => {
  const [open, setOpen]           = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  // Singleton Firestore listeners — cheap to open a second subscription,
  // the registry in useFirestore dedupes it against the one ClientsPage/
  // StylistsPage already have open.
  const { data: clients  = [] } = useClients();
  const { data: stylists = [] } = useStylists();

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = (value ?? "").trim().toLowerCase();

  // Reset the highlighted result whenever the query changes. Done during
  // render (React's recommended "adjusting state on prop/derived change"
  // pattern) rather than in a useEffect, which would cause an extra
  // cascading render just to zero out an index.
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setHighlight(0);
  }

  const results = useMemo(() => {
    if (!q) return { pages: [], clients: [], stylists: [] };

    const pages = getNavItems(role).filter(item => item.label.toLowerCase().includes(q)).slice(0, 4);

    const matchedClients = (clients ?? [])
      .filter(c =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      )
      .slice(0, 5);

    const matchedStylists = (stylists ?? [])
      .filter(st =>
        (st.name ?? "").toLowerCase().includes(q) ||
        (st.email ?? "").toLowerCase().includes(q)
      )
      .slice(0, 5);

    return { pages, clients: matchedClients, stylists: matchedStylists };
  }, [q, clients, stylists, role]);

  const flatResults = useMemo(() => [
    ...results.pages.map(p => ({ type: "page", id: p.id, label: p.label, icon: p.icon })),
    ...results.clients.map(c => ({ type: "client", id: c.id, label: c.name || "Unnamed client", sub: c.phone || c.email || "Client", icon: "group" })),
    ...results.stylists.map(st => ({ type: "stylist", id: st.id, label: st.name || "Unnamed stylist", sub: st.email || "Stylist", icon: "content_cut" })),
  ], [results]);

  const hasResults = flatResults.length > 0;

  const go = item => {
    if (!item) return;
    if (item.type === "page")          onNavigate(item.id, "");
    else if (item.type === "client")   onNavigate("clients", item.label);
    else if (item.type === "stylist")  onNavigate("stylists", item.label);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", ...s }}>
      <div style={{ position: "relative" }}>
        <Icon name="search" size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.onSurfaceVariant, opacity: 0.5, pointerEvents: "none" }} />
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => { if (q) setOpen(true); }}
          onKeyDown={e => {
            if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
            else if (e.key === "ArrowDown") { e.preventDefault(); if (hasResults) { setOpen(true); setHighlight(h => Math.min(h + 1, flatResults.length - 1)); } }
            else if (e.key === "ArrowUp")   { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
            else if (e.key === "Enter")     { e.preventDefault(); if (hasResults) go(flatResults[highlight]); }
          }}
          placeholder="Search clients, stylists, pages…"
          style={{ width: "100%", padding: "10px 16px 10px 42px", background: C.surfaceLow, border: "none", borderRadius: 12, fontFamily: "Inter", fontSize: 14, color: C.onSurface }}
        />
      </div>

      {open && q && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          width: isMobile ? "100%" : 380, maxHeight: 440, overflowY: "auto",
          background: C.surface, border: `1px solid ${C.outlineVariant}40`, borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.14)", zIndex: 300, padding: "8px 0",
        }}>
          {!hasResults ? (
            <div style={{ padding: "22px 18px", textAlign: "center", color: C.onSurfaceVariant, fontSize: 13, fontFamily: "Geist" }}>
              No results for "{value}"
            </div>
          ) : (
            <>
              {results.pages.length > 0 && (
                <ResultGroup title="Pages">
                  {results.pages.map(p => {
                    const idx = flatResults.findIndex(f => f.type === "page" && f.id === p.id);
                    return (
                      <ResultRow key={p.id} icon={p.icon} label={p.label} sub="Go to page"
                        active={idx === highlight} onClick={() => go(flatResults[idx])} />
                    );
                  })}
                </ResultGroup>
              )}
              {results.clients.length > 0 && (
                <ResultGroup title="Clients">
                  {results.clients.map(c => {
                    const idx = flatResults.findIndex(f => f.type === "client" && f.id === c.id);
                    return (
                      <ResultRow key={c.id ?? c.name} icon="group" label={c.name || "Unnamed client"} sub={c.phone || c.email || "Client"}
                        active={idx === highlight} onClick={() => go(flatResults[idx])} />
                    );
                  })}
                </ResultGroup>
              )}
              {results.stylists.length > 0 && (
                <ResultGroup title="Stylists">
                  {results.stylists.map(st => {
                    const idx = flatResults.findIndex(f => f.type === "stylist" && f.id === st.id);
                    return (
                      <ResultRow key={st.id ?? st.name} icon="content_cut" label={st.name || "Unnamed stylist"} sub={st.email || "Stylist"}
                        active={idx === highlight} onClick={() => go(flatResults[idx])} />
                    );
                  })}
                </ResultGroup>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ResultGroup = ({ title, children }) => (
  <div style={{ marginBottom: 4 }}>
    <p style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.onSurfaceVariant, fontFamily: "Geist" }}>
      {title}
    </p>
    {children}
  </div>
);

const ResultRow = ({ icon, label, sub, active, onClick }) => (
  <button
    onClick={onClick}
    onMouseDown={e => e.preventDefault() /* keep input focused so the click isn't lost to a blur-close race */}
    style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12,
      padding: "8px 16px", background: active ? C.surfaceLow : "transparent",
      textAlign: "left", transition: "background 0.1s", border: "none",
    }}
    onMouseEnter={e => (e.currentTarget.style.background = C.surfaceLow)}
    onMouseLeave={e => (e.currentTarget.style.background = active ? C.surfaceLow : "transparent")}
  >
    <div style={{ width: 32, height: 32, borderRadius: 9, background: C.surfaceHigh, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon name={icon} size={16} style={{ color: C.onSurfaceVariant }} />
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</p>
      <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</p>
    </div>
  </button>
);

export default GlobalSearch;