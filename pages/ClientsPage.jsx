import { useState, useRef, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import useIsMobile from "../hooks/useIsMobile";
import { C } from "../tokens/design";
import { useAuth } from "../context/AuthContext";
import { Badge, Icon, PrimaryBtn, SecondaryBtn, ErrorBanner } from "../components/ui";
import { AddClientModal, EditClientModal, DeleteClientModal, NewClientQRModal } from "../components/modals";
import QRScannerModal from "./QRScannerModal";
import { useClients } from "../hooks/useFirestore";

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

const getInitials = name =>
  (name ?? "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

const thisMonth = () => {
  const now = new Date();
  return `${now.toLocaleString("en-US", { month: "short" })} ${now.getFullYear()}`;
};

const isThisMonth = dateStr => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) {
    // Try parsing "Oct 12, 2024" style
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed)) {
        const now = new Date();
        return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
      }
    } catch { return false; }
  }
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

/* ─────────────────────────────────────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────────────────────────────────────── */
const Sk = ({ w = "100%", h = 14, r = 6, style: s = {} }) => (
  <div className="pulse" style={{ width: w, height: h, borderRadius: r, background: C.surfaceLow, ...s }} />
);

/* ─────────────────────────────────────────────────────────────────────────────
   CLIENT AVATAR
───────────────────────────────────────────────────────────────────────────── */
const Avatar = ({ client, size = 40, fontSize = 13 }) => {
  const isVip = client.status === "VIP";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: isVip ? C.secondaryContainer : C.surfaceLow,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Geist", fontSize, fontWeight: 700,
      color: isVip ? C.secondary : C.onSurfaceVariant,
      flexShrink: 0, position: "relative",
    }}>
      {client.initials ?? getInitials(client.name)}
      {isVip && (
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: 14, height: 14, borderRadius: "50%",
          background: C.secondaryContainer,
          border: `1.5px solid ${C.surfaceLowest}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="star" size={8} style={{ color: C.secondary }} />
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   BRANDED QR CARD — spec-compliant QR via the `qrcode` npm package
───────────────────────────────────────────────────────────────────────────── */
const BrandedQRCard = ({ client }) => {
  const canvasRef = useRef(null);
  const [downloaded, setDownloaded] = useState(false);

  const qrData = `jake-barber-studio:client:${client.id ?? "000"}`;

  // Render QR code onto the canvas using the `qrcode` library
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, qrData, {
      width: 168,
      margin: 2,
      color: { dark: "#1b1c1c", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).catch(err => console.error("QR render error:", err));
  }, [qrData]);

  const handleDownload = () => {
    // Build a full branded card on an offscreen canvas
    const card = document.createElement("canvas");
    const W = 400, H = 520;
    card.width = W; card.height = H;
    const ctx = card.getContext("2d");

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Top gold stripe
    ctx.fillStyle = "#fed65b";
    ctx.fillRect(0, 0, W, 8);

    // Studio name
    ctx.fillStyle = "#1b1c1c";
    ctx.font = "bold 22px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Jake Barber Studio", W / 2, 56);

    // Subtitle
    ctx.fillStyle = "#735c00";
    ctx.font = "13px Georgia, serif";
    ctx.fillText("Premium Grooming Experience", W / 2, 78);

    // Divider
    ctx.strokeStyle = "#c4c7c730";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, 96); ctx.lineTo(W - 40, 96); ctx.stroke();

    // QR code centered
    const qrCanvas = canvasRef.current;
    if (qrCanvas) {
      const qrSize = 200;
      const qrX = (W - qrSize) / 2;
      const qrY = 116;
      // White bg behind QR
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 12);
      ctx.fill();
      ctx.strokeStyle = "#f0eded";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 12);
      ctx.stroke();
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    }

    // Client name
    ctx.fillStyle = "#1b1c1c";
    ctx.font = "bold 20px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(client.name ?? "Client", W / 2, 380);

    // Client ID
    ctx.fillStyle = "#747878";
    ctx.font = "11px monospace";
    ctx.fillText(`ID: ${(client.id ?? "000").slice(0, 12).toUpperCase()}`, W / 2, 404);

    // Bottom divider
    ctx.strokeStyle = "#c4c7c730";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, 424); ctx.lineTo(W - 40, 424); ctx.stroke();

    // Footer
    ctx.fillStyle = "#444748";
    ctx.font = "11px Georgia, serif";
    ctx.fillText("Present this QR at the studio for quick check-in", W / 2, 448);

    // Bottom gold stripe
    ctx.fillStyle = "#fed65b";
    ctx.fillRect(0, H - 8, W, 8);

    // Download
    const link = document.createElement("a");
    link.download = `JakeBarberStudio_${(client.name ?? "Client").replace(/\s+/g, "_")}_QR.png`;
    link.href = card.toDataURL("image/png");
    link.click();

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {/* Branded preview card */}
      <div style={{
        background: "#ffffff",
        borderRadius: 20,
        padding: "24px 28px",
        border: `1px solid ${C.outlineVariant}30`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
        minWidth: 240, position: "relative", overflow: "hidden",
      }}>
        {/* Top accent */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "#fed65b" }} />

        <p style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: C.primary, marginTop: 8, letterSpacing: "-0.01em" }}>
          Jake Barber Studio
        </p>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: C.secondary, marginBottom: 16, marginTop: 2 }}>
          Premium Grooming Experience
        </p>

        {/* QR canvas */}
        <div style={{
          padding: 12, background: "#fff", borderRadius: 12,
          border: `1px solid ${C.outlineVariant}20`,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}>
          <canvas ref={canvasRef} style={{ display: "block", imageRendering: "pixelated" }} />
        </div>

        <p style={{ fontFamily: "Geist", fontSize: 15, fontWeight: 700, color: C.primary, marginTop: 14 }}>
          {client.name}
        </p>
        <p style={{ fontFamily: "monospace", fontSize: 10, color: C.onSurfaceVariant, marginTop: 3 }}>
          {(client.id ?? "000").slice(0, 12).toUpperCase()}
        </p>

        {/* Bottom accent */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: "#fed65b" }} />
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "11px 22px", borderRadius: 12,
          background: downloaded ? "#dcfce7" : C.primary,
          color: downloaded ? "#166534" : "#fff",
          fontFamily: "Geist", fontSize: 12, fontWeight: 600,
          letterSpacing: "0.06em", textTransform: "uppercase",
          transition: "all 0.2s",
          boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
        }}
        onMouseOver={e => { if (!downloaded) e.currentTarget.style.opacity = "0.88"; }}
        onMouseOut={e => (e.currentTarget.style.opacity = "1")}
      >
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
          {downloaded ? "check_circle" : "download"}
        </span>
        {downloaded ? "Downloaded!" : "Download QR Card"}
      </button>

      <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, textAlign: "center", maxWidth: 220, lineHeight: 1.6 }}>
        PNG card with QR code ready to send to your client.
      </p>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   CLIENT DETAIL MODAL — full profile, visit history, QR code
───────────────────────────────────────────────────────────────────────────── */
const ClientDetailModal = ({ client, role, onClose, onEdit, onDelete, initialTab = "profile" }) => {
  const [tab, setTab] = useState(initialTab); // "profile" | "history" | "qr"
  const visitHistory = Array.isArray(client.visitHistory) ? client.visitHistory : [];

  const tabs = [
    { id: "profile", icon: "person",         label: "Profile" },
    { id: "history", icon: "history",         label: "Visit History" },
    { id: "qr",      icon: "qr_code_scanner", label: "QR Code" },
  ];

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "24px 28px 0", borderBottom: `1px solid ${C.outlineVariant}20` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar client={client} size={52} fontSize={16} />
              <div>
                <h2 style={{ fontFamily: "Geist", fontSize: 19, fontWeight: 600, color: C.primary }}>{client.name}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                  <Badge status={client.status} />
                  <span style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant }}>
                    {client.visits ?? 0} visits total
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ padding: 6, borderRadius: 8, flexShrink: 0 }}
              onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
              onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
              <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
            </button>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 0 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 16px",
                fontFamily: "Geist", fontSize: 12, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase",
                color: tab === t.id ? C.primary : C.onSurfaceVariant,
                borderBottom: `2px solid ${tab === t.id ? C.primary : "transparent"}`,
                transition: "all 0.15s",
                opacity: tab === t.id ? 1 : 0.6,
              }}>
                <Icon name={t.icon} size={15} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }} className="scrollbar-thin">

          {/* ── Profile Tab ── */}
          {tab === "profile" && (
            <div>
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Total Visits",  value: client.visits ?? 0,      icon: "event_repeat" },
                  { label: "Total Spent",   value: client.spent ?? "$0",     icon: "payments" },
                  { label: "Last Visit",    value: client.lastVisit ?? "—",  icon: "event" },
                ].map(s => (
                  <div key={s.label} style={{ background: C.surfaceLow, borderRadius: 14, padding: "14px 16px", textAlign: "center" }}>
                    <Icon name={s.icon} size={18} style={{ color: C.onSurfaceVariant, marginBottom: 6, display: "block", margin: "0 auto 6px" }} />
                    <p style={{ fontFamily: "Geist", fontSize: 15, fontWeight: 600, color: C.primary }}>{s.value}</p>
                    <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.onSurfaceVariant, marginTop: 3 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Contact info */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 12 }}>
                  Personal Information
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { icon: "phone",       label: "Contact",   val: client.phone   ?? "—" },
                    { icon: "mail",        label: "Email",     val: client.email   ?? "—" },
                    { icon: "content_cut", label: "Barber",    val: client.barber  ?? "—" },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, background: C.surfaceLow, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name={row.icon} size={17} style={{ color: C.onSurfaceVariant }} />
                      </div>
                      <div>
                        <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.onSurfaceVariant }}>{row.label}</p>
                        <p style={{ fontFamily: "Geist", fontSize: 13, color: C.primary, marginTop: 1 }}>{row.val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Haircut details */}
              {(client.haircutStyle || client.beardStyle || client.clipperGuard || client.haircutNotes) && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 12 }}>
                    Haircut Preferences
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    {[
                      { icon: "content_cut", label: "Style",        val: client.haircutStyle || "—" },
                      { icon: "face",        label: "Beard",        val: client.beardStyle   || "—" },
                      { icon: "texture",     label: "Hair Texture", val: client.hairTexture  || "—" },
                      { icon: "straighten",  label: "Guard #",      val: client.clipperGuard || "—" },
                      { icon: "south",       label: "Neckline",     val: client.necklineStyle|| "—" },
                      { icon: "border_style",label: "Sideline",     val: client.sidelineStyle|| "—" },
                    ].map(row => (
                      <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10, background: C.surfaceLow, borderRadius: 10, padding: "10px 12px" }}>
                        <Icon name={row.icon} size={15} style={{ color: C.onSurfaceVariant, flexShrink: 0 }} />
                        <div>
                          <p style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.onSurfaceVariant }}>{row.label}</p>
                          <p style={{ fontFamily: "Geist", fontSize: 12, color: C.primary, marginTop: 1 }}>{row.val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {client.haircutNotes && (
                    <div style={{ background: C.surfaceLow, borderRadius: 10, padding: "10px 14px" }}>
                      <p style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 4 }}>Haircut Notes</p>
                      <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurface, lineHeight: 1.6 }}>{client.haircutNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Allergies / Scalp */}
              {(client.allergies || client.scalpCondition) && (
                <div style={{ background: "#fef9e7", borderRadius: 12, padding: "12px 14px", marginBottom: 20, border: `1px solid #fed65b60` }}>
                  <p style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#735c00", marginBottom: 8 }}>Health & Scalp</p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {client.allergies && (
                      <div>
                        <p style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 600, color: "#735c00", textTransform: "uppercase", letterSpacing: "0.08em" }}>Allergies</p>
                        <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurface, marginTop: 2 }}>{client.allergies}</p>
                      </div>
                    )}
                    {client.scalpCondition && (
                      <div>
                        <p style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 600, color: "#735c00", textTransform: "uppercase", letterSpacing: "0.08em" }}>Scalp</p>
                        <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurface, marginTop: 2 }}>{client.scalpCondition}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* General Notes */}
              {client.notes && (
                <div style={{ background: C.surfaceLow, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                  <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Notes</p>
                  <p style={{ fontFamily: "Geist", fontSize: 13, color: C.onSurface, lineHeight: 1.6 }}>{client.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Visit History Tab ── */}
          {tab === "history" && (
            <div>
              {visitHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Icon name="history" size={36} style={{ color: C.outlineVariant, display: "block", margin: "0 auto 12px" }} />
                  <p style={{ fontFamily: "Geist", fontSize: 13, color: C.onSurfaceVariant }}>No visit history recorded yet.</p>
                  <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant, opacity: 0.7, marginTop: 4 }}>Visits will be recorded via QR scan check-in.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[...visitHistory].reverse().map((v, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 14,
                      padding: "14px 0",
                      borderBottom: i < visitHistory.length - 1 ? `1px solid ${C.outlineVariant}20` : "none",
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.surfaceLow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "Geist", fontSize: 11, fontWeight: 700, color: C.onSurfaceVariant }}>
                        {visitHistory.length - i}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.primary }}>{v.service ?? "Service"}</p>
                        <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 }}>
                          {v.barber ?? "—"} · {v.date ?? "—"}
                        </p>
                        {v.notes && (
                          <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant, marginTop: 4, fontStyle: "italic" }}>{v.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── QR Code Tab ── */}
          {tab === "qr" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0" }}>
              <BrandedQRCard client={client} />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${C.outlineVariant}20`, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {role === "admin" && (
            <SecondaryBtn icon="edit" onClick={onEdit}>Edit</SecondaryBtn>
          )}

          <div style={{ flex: 1 }} />

          {role === "admin" && (
            <button
              onClick={onDelete}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 16px", borderRadius: 10,
                background: "#fef2f2", color: C.error,
                fontFamily: "Geist", fontSize: 11, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}
            >
              <Icon name="delete" size={15} style={{ color: C.error }} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, sub, accent = false }) => (
  <div className="card fade-up" style={{ padding: "22px 24px" }}>
    <div style={{ width: 40, height: 40, borderRadius: 12, background: accent ? C.secondaryContainer : C.surfaceLow, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
      <Icon name={icon} size={20} style={{ color: accent ? C.secondary : C.onSurfaceVariant }} />
    </div>
    <p style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 5 }}>{label}</p>
    <p style={{ fontFamily: "Geist", fontSize: 28, fontWeight: 500, color: C.primary, letterSpacing: "-0.01em" }}>{value}</p>
    {sub && <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 4 }}>{sub}</p>}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   FILTER CHIP
───────────────────────────────────────────────────────────────────────────── */
const FilterChip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "7px 16px", borderRadius: 999, flexShrink: 0,
      fontFamily: "Geist", fontSize: 11, fontWeight: 600,
      letterSpacing: "0.08em", textTransform: "uppercase",
      background: active ? C.primary : C.surfaceLow,
      color: active ? "#fff" : C.onSurfaceVariant,
      border: `1.5px solid ${active ? C.primary : C.outlineVariant + "40"}`,
      transition: "all 0.18s",
    }}
  >
    {label}
  </button>
);

/* ─────────────────────────────────────────────────────────────────────────────
   ACTION BUTTON (icon only, compact)
───────────────────────────────────────────────────────────────────────────── */
const ActionBtn = ({ icon, label, onClick, danger = false, color }) => (
  <button
    title={label}
    onClick={e => { e.stopPropagation(); onClick(); }}
    style={{
      width: 32, height: 32, borderRadius: 8,
      background: danger ? "#fef2f2" : C.surfaceLow,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.15s",
      border: "none",
    }}
    onMouseOver={e => { e.currentTarget.style.background = danger ? "#fecaca" : C.surfaceHigh; }}
    onMouseOut={e => { e.currentTarget.style.background = danger ? "#fef2f2" : C.surfaceLow; }}
  >
    <Icon name={icon} size={15} style={{ color: color ?? (danger ? C.error : C.onSurfaceVariant) }} />
  </button>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
const ClientsPage = ({ search = "" }) => {
  const { role } = useAuth();
  const { data: clients, loading, error } = useClients();
  const isMobile = useIsMobile();

  const isAdmin = role === "admin";

  // Modal states
  const [detailClient,   setDetailClient]   = useState(null);
  const [detailTab,      setDetailTab]      = useState("profile");
  const [editTarget,     setEditTarget]     = useState(null);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [showAdd,        setShowAdd]        = useState(false);
  const [newClientForQR, setNewClientForQR] = useState(null); // shown after add
  const [showScanner,    setShowScanner]    = useState(false);

  // Open the detail modal directly on a given tab (used by QR action buttons)
  const openDetailOnTab = (client, tabId = "profile") => {
    setDetailTab(tabId);
    setDetailClient(client);
  };

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortMode,     setSortMode]     = useState("name"); // "name" | "visits" | "recent"
  const [localSearch,  setLocalSearch]  = useState("");

  // Pagination
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  // Combined search (from TopBar or local)
  const q = (localSearch || search).toLowerCase().trim();

  // Stats
  const stats = useMemo(() => {
    const total    = clients.length;
    const newCount = clients.filter(c => isThisMonth(c.lastVisit) || c.status === "New").length;
    const frequent = clients.filter(c => parseInt(c.visits ?? 0) >= 10).length;
    return { total, newCount, frequent };
  }, [clients]);

  // Reset to page 1 when filters change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [q, statusFilter, sortMode]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = clients.filter(c => {
      const matchStatus = statusFilter === "All" || c.status === statusFilter;
      const matchSearch = !q ||
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });

    if (sortMode === "visits") list = [...list].sort((a, b) => parseInt(b.visits ?? 0) - parseInt(a.visits ?? 0));
    else if (sortMode === "recent") list = [...list].sort((a, b) => {
      const da = new Date(a.lastVisit ?? 0);
      const db_ = new Date(b.lastVisit ?? 0);
      return (isNaN(da) ? 0 : da) < (isNaN(db_) ? 0 : db_) ? 1 : -1;
    });
    else list = [...list].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    return list;
  }, [clients, statusFilter, q, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openDetail = (client) => {
    setDetailClient(client);
  };

  if (loading) {
    return (
      <div style={{ animation: "fadeUp 0.4s ease" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 20, marginBottom: 32 }}>
          {Array(3).fill(null).map((_, i) => (
            <div key={i} className="card" style={{ padding: "22px 24px" }}>
              <Sk w={40} h={40} r={12} style={{ marginBottom: 16 }} />
              <Sk w="50%" h={10} style={{ marginBottom: 8 }} />
              <Sk w="65%" h={28} />
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 28 }}>
          {Array(5).fill(null).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < 4 ? `1px solid ${C.outlineVariant}20` : "none" }}>
              <Sk w={40} h={40} r="50%" />
              <div style={{ flex: 1 }}><Sk w="40%" h={14} style={{ marginBottom: 6 }} /><Sk w="60%" h={11} /></div>
              <Sk w={60} h={22} r={999} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorBanner message={error} />;

  /* ── True zero-data empty state (no clients at all) ── */
  if (!loading && clients.length === 0) {
    return (
      <div style={{ animation: "fadeUp 0.4s ease" }}>
        {showAdd && (
          <AddClientModal
            onClose={() => setShowAdd(false)}
            onSaved={(newClient) => { setShowAdd(false); setNewClientForQR(newClient); }}
          />
        )}
        {newClientForQR && (
          <NewClientQRModal client={newClientForQR} onClose={() => setNewClientForQR(null)} />
        )}
        <div className="card" style={{
          padding: "80px 40px", textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: `${C.secondary}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 24,
          }}>
            <Icon name="group" size={36} style={{ color: C.secondary }} />
          </div>
          <p style={{ fontFamily: "Geist", fontSize: 20, fontWeight: 600, color: C.primary, marginBottom: 10 }}>
            No clients yet
          </p>
          <p style={{ fontFamily: "Geist", fontSize: 14, color: C.onSurfaceVariant, marginBottom: 32, maxWidth: 340 }}>
            Add your first client to start tracking visits, preferences, and loyalty rewards.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: 14,
              background: C.primary, color: "#fff",
              fontFamily: "Geist", fontSize: 13, fontWeight: 600,
              letterSpacing: "0.04em", border: "none", cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseOut={e => (e.currentTarget.style.opacity = "1")}
          >
            <Icon name="person_add" size={18} style={{ color: "#fff" }} />
            Add your first client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }} onClick={() => {}}>

      {/* ── Modals ── */}
      {showScanner && (
        <QRScannerModal
          clients={clients}
          onFound={(client) => { setShowScanner(false); setDetailClient(client); }}
          onClose={() => setShowScanner(false)}
        />
      )}
      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onSaved={(newClient) => { setShowAdd(false); setNewClientForQR(newClient); }}
        />
      )}
      {editTarget    && <EditClientModal   client={editTarget}   onClose={() => setEditTarget(null)} />}
      {deleteTarget  && <DeleteClientModal client={deleteTarget} onClose={() => setDeleteTarget(null)} />}
      {newClientForQR && (
        <NewClientQRModal
          client={newClientForQR}
          onClose={() => setNewClientForQR(null)}
        />
      )}
      {detailClient && (
        <ClientDetailModal
          client={detailClient}
          role={role}
          initialTab={detailTab}
          onClose={() => { setDetailClient(null); setDetailTab("profile"); }}
          onEdit={() => { setEditTarget(detailClient); setDetailClient(null); setDetailTab("profile"); }}
          onDelete={() => { setDeleteTarget(detailClient); setDetailClient(null); setDetailTab("profile"); }}
        />
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? 12 : 20, marginBottom: isMobile ? 20 : 32 }}>
        <StatCard icon="group"        label="Total Clients"    value={stats.total}    sub="All registered clients" />
        <StatCard icon="fiber_new"    label="New This Month"   value={stats.newCount} sub={`Added in ${thisMonth()}`} />
        <StatCard icon="star"         label="Frequent Clients" value={stats.frequent} sub="10+ visits" accent />
      </div>

      {/* ── Controls Row ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20, alignItems: "center" }}>

        {/* Local search */}
        <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "1 1 220px", minWidth: 180 }}>
          <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.onSurfaceVariant, opacity: 0.5 }} />
          <input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search by name or phone…"
            style={{
              width: "100%", padding: "9px 14px 9px 36px",
              background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`,
              borderRadius: 12, fontFamily: "Inter", fontSize: 13, color: C.onSurface,
            }}
          />
        </div>

        {/* Status filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["All", "VIP", "Regular", "New"].map(f => (
            <FilterChip key={f} label={f} active={statusFilter === f} onClick={() => setStatusFilter(f)} />
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: "flex", gap: 6, background: C.surfaceLow, borderRadius: 10, padding: 4 }}>
          {[
            { id: "name",   icon: "sort_by_alpha", label: "Name" },
            { id: "visits", icon: "trending_up",   label: "Most Visits" },
            { id: "recent", icon: "schedule",       label: "Recent" },
          ].map(s => (
            <button
              key={s.id}
              title={s.label}
              onClick={() => setSortMode(s.id)}
              style={{
                padding: "6px 10px", borderRadius: 8,
                background: sortMode === s.id ? C.surfaceLowest : "transparent",
                boxShadow: sortMode === s.id ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 5,
                fontFamily: "Geist", fontSize: 10, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase",
                color: sortMode === s.id ? C.primary : C.onSurfaceVariant,
              }}
            >
              <Icon name={s.icon} size={14} />
              {!isMobile && s.label}
            </button>
          ))}
        </div>

        {/* Scan QR button */}
        <button
          onClick={() => setShowScanner(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 18px", borderRadius: 12,
            background: C.surfaceLow,
            border: `1.5px solid ${C.outlineVariant}40`,
            fontFamily: "Geist", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: C.onSurfaceVariant,
            transition: "all 0.15s",
          }}
          onMouseOver={e => { e.currentTarget.style.background = C.surfaceHigh; e.currentTarget.style.color = C.primary; }}
          onMouseOut={e => { e.currentTarget.style.background = C.surfaceLow; e.currentTarget.style.color = C.onSurfaceVariant; }}
        >
          <Icon name="qr_code_scanner" size={15} />
          {!isMobile && "Scan QR"}
        </button>

        {/* Add client — all roles */}
        <PrimaryBtn icon="person_add" onClick={() => setShowAdd(true)}>
          {isMobile ? "Add" : "Add Client"}
        </PrimaryBtn>
      </div>

      {/* ── Empty state (search/filter yielded nothing) ── */}
      {filtered.length === 0 && (
        <div className="card" style={{ padding: "64px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: C.surfaceLow,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
          }}>
            <Icon name="search_off" size={30} style={{ color: C.outlineVariant }} />
          </div>
          <p style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary, marginBottom: 8 }}>No clients found</p>
          <p style={{ fontFamily: "Geist", fontSize: 13, color: C.onSurfaceVariant, marginBottom: 28, maxWidth: 320 }}>
            Try adjusting your search or filters, or add a new client.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 24px", borderRadius: 12,
              background: C.primary, color: "#fff",
              fontFamily: "Geist", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.04em", border: "none", cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseOut={e => (e.currentTarget.style.opacity = "1")}
          >
            <Icon name="person_add" size={16} style={{ color: "#fff" }} />
            Add Client
          </button>
        </div>
      )}

      {/* ── Mobile Card List ── */}
      {isMobile && filtered.length > 0 && (
        <>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {paginated.map(c => (
            <div
              key={c.id}
              className="card"
              onClick={() => openDetail(c)}
              style={{ padding: "16px 18px", cursor: "pointer", transition: "box-shadow 0.15s" }}
              onMouseOver={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)")}
              onMouseOut={e => (e.currentTarget.style.boxShadow = "")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <Avatar client={c} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 600, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                  <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant, marginTop: 1 }}>{c.phone ?? c.email ?? "—"}</p>
                </div>
                <Badge status={c.status} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant }}>
                    <span style={{ fontWeight: 600, color: C.primary }}>{c.visits ?? 0}</span> visits
                  </span>
                  <span style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant }}>
                    Last: {c.lastVisit ?? "—"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <ActionBtn icon="qr_code_scanner" label="QR Code" onClick={() => openDetailOnTab(c, "qr")} color={C.onSurfaceVariant} />
                  {isAdmin && <ActionBtn icon="edit" label="Edit" onClick={() => setEditTarget(c)} />}
                  {isAdmin && <ActionBtn icon="delete" label="Delete" onClick={() => setDeleteTarget(c)} danger />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                background: C.surfaceLowest, opacity: page === 1 ? 0.4 : 1,
                border: `1px solid ${C.outlineVariant}40`,
              }}
            >
              <Icon name="chevron_left" size={20} style={{ color: C.onSurfaceVariant }} />
            </button>
            <span style={{ fontFamily: "Geist", fontSize: 13, color: C.onSurfaceVariant }}>
              Page <span style={{ fontWeight: 700, color: C.primary }}>{page}</span> of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                background: C.surfaceLowest, opacity: page === totalPages ? 0.4 : 1,
                border: `1px solid ${C.outlineVariant}40`,
              }}
            >
              <Icon name="chevron_right" size={20} style={{ color: C.onSurfaceVariant }} />
            </button>
          </div>
        )}
        </>
      )}

      {/* ── Desktop Table ── */}
      {!isMobile && filtered.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: C.surfaceLow }}>
                  {["Client", "Contact", "Haircut Style", "Visits", "Last Visit", "Last Barber", "Status", "Actions"].map(h => (
                    <th key={h} style={{
                      padding: "13px 18px", textAlign: "left",
                      fontFamily: "Geist", fontSize: 10, fontWeight: 600,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      color: C.onSurfaceVariant, whiteSpace: "nowrap",
                      borderBottom: `1px solid ${C.outlineVariant}30`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((c, i) => (
                  <tr
                    key={c.id}
                    onClick={() => openDetail(c)}
                    style={{
                      borderBottom: i < paginated.length - 1 ? `1px solid ${C.outlineVariant}20` : "none",
                      cursor: "pointer", transition: "background 0.12s",
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow + "80")}
                    onMouseOut={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Client */}
                    <td style={{ padding: "15px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Avatar client={c} size={38} />
                        <span style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 600, color: C.primary, whiteSpace: "nowrap" }}>
                          {c.name}
                        </span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td style={{ padding: "15px 18px" }}>
                      <p style={{ fontFamily: "Geist", fontSize: 13, color: C.onSurface }}>{c.phone ?? "—"}</p>
                    </td>

                    {/* Haircut Style */}
                    <td style={{ padding: "15px 18px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: C.onSurface, whiteSpace: "nowrap" }}>
                          {c.haircutStyle || "—"}
                        </span>
                        {c.beardStyle && c.beardStyle !== "None" && (
                          <span style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant }}>
                            Beard: {c.beardStyle}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Visits */}
                    <td style={{ padding: "15px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary }}>{c.visits ?? 0}</span>
                        {parseInt(c.visits ?? 0) >= 10 && (
                          <span style={{ background: C.secondaryContainer, color: C.secondary, padding: "2px 8px", borderRadius: 999, fontFamily: "Geist", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            Frequent
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Last Visit */}
                    <td style={{ padding: "15px 18px", fontFamily: "Geist", fontSize: 13, color: C.onSurfaceVariant, whiteSpace: "nowrap" }}>
                      {c.lastVisit ?? "—"}
                    </td>

                    {/* Last Barber */}
                    <td style={{ padding: "15px 18px", fontFamily: "Geist", fontSize: 13, color: C.onSurface, whiteSpace: "nowrap" }}>
                      {c.barber ?? "—"}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "15px 18px" }}>
                      <Badge status={c.status} />
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "15px 18px" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                        <ActionBtn icon="visibility"      label="View Details" onClick={() => openDetailOnTab(c, "profile")} color={C.onSurfaceVariant} />
                        <ActionBtn icon="qr_code_scanner" label="QR Code"      onClick={() => openDetailOnTab(c, "qr")} color={C.onSurfaceVariant} />
                        {isAdmin && <ActionBtn icon="edit"   label="Edit"   onClick={() => setEditTarget(c)} />}
                        {isAdmin && <ActionBtn icon="delete" label="Delete" onClick={() => setDeleteTarget(c)} danger />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer count + pagination */}
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.outlineVariant}20`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant }}>
              Showing <span style={{ fontWeight: 600, color: C.primary }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span style={{ fontWeight: 600, color: C.primary }}>{filtered.length}</span> clients
              {statusFilter !== "All" && (
                <button
                  onClick={() => { setStatusFilter("All"); setLocalSearch(""); }}
                  style={{ marginLeft: 12, fontFamily: "Geist", fontSize: 11, fontWeight: 600, color: C.secondary, letterSpacing: "0.06em", textTransform: "uppercase" }}
                >
                  Clear Filter
                </button>
              )}
            </p>
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    background: page === 1 ? C.surfaceLow : C.surfaceLowest,
                    opacity: page === 1 ? 0.4 : 1,
                    border: `1px solid ${C.outlineVariant}40`,
                  }}
                >
                  <Icon name="chevron_left" size={18} style={{ color: C.onSurfaceVariant }} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant, padding: "0 4px" }}>…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          fontFamily: "Geist", fontSize: 12, fontWeight: page === p ? 700 : 500,
                          background: page === p ? C.primary : C.surfaceLowest,
                          color: page === p ? "#fff" : C.onSurfaceVariant,
                          border: `1px solid ${page === p ? C.primary : C.outlineVariant + "40"}`,
                        }}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    background: page === totalPages ? C.surfaceLow : C.surfaceLowest,
                    opacity: page === totalPages ? 0.4 : 1,
                    border: `1px solid ${C.outlineVariant}40`,
                  }}
                >
                  <Icon name="chevron_right" size={18} style={{ color: C.onSurfaceVariant }} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;