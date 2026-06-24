import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { C } from "../../tokens/design";
import { Icon, PrimaryBtn, SecondaryBtn } from "../ui";
import { useToast } from "../../context/ToastContext";
import useIsMobile from "../../hooks/useIsMobile";
import { db } from "../../firebase";
import {
  addClient, updateClient, deleteClient,
  addProduct, updateProduct, deleteProduct, addStockMovement,
  addTransaction, addStylist, updateStylist, deleteStylist,
  useStylists,
} from "../../hooks/useFirestore";

/* ─── Shared Overlay ──────────────────────────────────────────────────────── */
// Secondary Firebase Auth instance — lets us create a new login account
// without signing the currently logged-in admin out.
const getSecondaryAuth = () => {
  const existing = getApps().find(a => a.name === "secondary");
  if (existing) return getAuth(existing);
  const primary = getApps().find(a => a.name === "[DEFAULT]") ?? getApps()[0];
  const secondary = initializeApp(primary.options, "secondary");
  return getAuth(secondary);
};

const Overlay = ({ children }) => (
  <div
    style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.45)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}
  >
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      {children}
    </div>
  </div>
);

const ModalCard = ({ title, icon, onClose, onSubmit, submitting, children }) => (
  <div className="card" style={{ padding: 32, position: "relative" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, background: C.surfaceLow, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={20} style={{ color: C.primary }} />
        </div>
        <h2 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 500, color: C.primary }}>{title}</h2>
      </div>
      <button onClick={onClose} style={{ padding: 6, borderRadius: 8, transition: "background 0.15s" }}
        onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
        onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
        <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
      </button>
    </div>
    {children}
    <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "flex-end" }}>
      <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
      <PrimaryBtn onClick={onSubmit} icon={submitting ? "hourglass_empty" : "check"}>
        {submitting ? "Saving…" : "Save"}
      </PrimaryBtn>
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>
      {label}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width: "100%", padding: "10px 14px",
  background: C.surfaceLow,
  border: `1px solid ${C.outlineVariant}40`,
  borderRadius: 10,
  fontFamily: "Inter", fontSize: 14, color: C.onSurface,
  boxSizing: "border-box",
};

const selectStyle = { ...inputStyle, appearance: "none" };

/* ─── Add Client Modal ─────────────────────────────────────────────────────── */
const HAIRCUT_STYLES = [
  "Skin Fade", "Low Fade", "Mid Fade", "High Fade", "Taper Fade",
  "Crew Cut", "Pompadour", "Slick Back", "Undercut", "Buzz Cut",
  "Caesar Cut", "Textured Crop", "Classic Side Part", "Quiff", "French Crop",
  "Curly Fade", "Afro", "Locs/Dreads", "Bald", "Custom / Other",
];

const BEARD_STYLES = [
  "None", "Clean Shave", "5 O'Clock Shadow", "Short Beard", "Medium Beard",
  "Full Beard", "Goatee", "Circle Beard", "Van Dyke", "Mutton Chops",
  "Fade / Line-Up Only", "Custom / Other",
];

const HAIR_TEXTURES = ["Straight", "Wavy", "Curly", "Coily / Kinky", "Fine", "Thick / Coarse"];

const SectionTitle = ({ children }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 8,
    paddingBottom: 8, borderBottom: `1px solid ${C.outlineVariant}30`,
  }}>
    <p style={{
      fontFamily: "Geist", fontSize: 10, fontWeight: 700,
      letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant,
    }}>{children}</p>
  </div>
);

/* ─── QR Builder (pure JS, no library) ────────────────────────────────────── */
/* ─── New Client QR Modal — shown after saving a new client ───────────────── */
export const NewClientQRModal = ({ client, onClose }) => {
  const canvasRef = useRef(null);
  const [downloaded, setDownloaded] = useState(false);

  // Full data string — qrcode library handles any length correctly
  const qrData = `jake-barber-studio:client:${client.id ?? "000"}`;

  // Render QR into the small preview canvas using the real qrcode library
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, qrData, {
      width: 200,
      margin: 2,
      color: { dark: "#1b1c1c", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }, [qrData]);

  const handleDownload = () => {
    const card = document.createElement("canvas");
    const W = 400, H = 520;
    card.width = W; card.height = H;
    const ctx = card.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fed65b"; ctx.fillRect(0, 0, W, 8);
    ctx.fillStyle = "#1b1c1c";
    ctx.font = "bold 22px Georgia, serif"; ctx.textAlign = "center";
    ctx.fillText("Jake Barber Studio", W / 2, 56);
    ctx.fillStyle = "#735c00"; ctx.font = "13px Georgia, serif";
    ctx.fillText("Premium Grooming Experience", W / 2, 78);
    ctx.strokeStyle = "#c4c7c730"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, 96); ctx.lineTo(W - 40, 96); ctx.stroke();
    const qrCanvas = canvasRef.current;
    if (qrCanvas) {
      const qrSize = 200, qrX = (W - qrSize) / 2, qrY = 116;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.roundRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 12); ctx.fill();
      ctx.strokeStyle = "#f0eded"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 12); ctx.stroke();
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    }
    ctx.fillStyle = "#1b1c1c"; ctx.font = "bold 20px Georgia, serif"; ctx.textAlign = "center";
    ctx.fillText(client.name ?? "Client", W / 2, 380);
    ctx.fillStyle = "#747878"; ctx.font = "11px monospace";
    ctx.fillText(`ID: ${(client.id ?? "000").slice(0, 12).toUpperCase()}`, W / 2, 404);
    ctx.strokeStyle = "#c4c7c730"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, 424); ctx.lineTo(W - 40, 424); ctx.stroke();
    ctx.fillStyle = "#444748"; ctx.font = "11px Georgia, serif";
    ctx.fillText("Present this QR at the studio for quick check-in", W / 2, 448);
    ctx.fillStyle = "#fed65b"; ctx.fillRect(0, H - 8, W, 8);
    const link = document.createElement("a");
    link.download = `JakeBarberStudio_${(client.name ?? "Client").replace(/\s+/g, "_")}_QR.png`;
    link.href = card.toDataURL("image/png");
    link.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div className="card" style={{ padding: 36, maxWidth: 420, width: "100%", textAlign: "center" }}>
        {/* Success header */}
        <div style={{ width: 52, height: 52, background: "#dcfce7", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Icon name="check_circle" size={28} style={{ color: "#166534" }} />
        </div>
        <h2 style={{ fontFamily: "Geist", fontSize: 20, fontWeight: 700, color: C.primary, marginBottom: 4 }}>
          Client Added!
        </h2>
        <p style={{ fontFamily: "Geist", fontSize: 13, color: C.onSurfaceVariant, marginBottom: 28 }}>
          Here's <strong>{client.name}</strong>'s QR card. Download or share it before closing.
        </p>

        {/* Branded card preview */}
        <div style={{
          background: "#ffffff", borderRadius: 20, padding: "20px 24px",
          border: `1px solid ${C.outlineVariant}20`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 0,
          position: "relative", overflow: "hidden", marginBottom: 20,
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "#fed65b" }} />
          <p style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: C.primary, marginTop: 6, letterSpacing: "-0.01em" }}>
            Jake Barber Studio
          </p>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 10, color: C.secondary, marginBottom: 14, marginTop: 2 }}>
            Premium Grooming Experience
          </p>
          <div style={{ padding: 10, background: "#fff", borderRadius: 10, border: `1px solid ${C.outlineVariant}15`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <canvas ref={canvasRef} style={{ display: "block", imageRendering: "pixelated" }} />
          </div>
          <p style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 700, color: C.primary, marginTop: 12 }}>{client.name}</p>
          <p style={{ fontFamily: "monospace", fontSize: 9, color: C.onSurfaceVariant, marginTop: 2 }}>
            {(client.id ?? "000").slice(0, 12).toUpperCase()}
          </p>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: "#fed65b" }} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleDownload}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 22px", borderRadius: 12,
              background: downloaded ? "#dcfce7" : C.primary,
              color: downloaded ? "#166534" : "#fff",
              fontFamily: "Geist", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.06em", textTransform: "uppercase",
              transition: "all 0.2s", boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            }}
          >
            <Icon name={downloaded ? "check_circle" : "download"} size={16} style={{ color: downloaded ? "#166534" : "#fff" }} />
            {downloaded ? "Downloaded!" : "Download QR Card"}
          </button>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 22px", borderRadius: 12,
              background: C.surfaceLow, color: C.onSurfaceVariant,
              fontFamily: "Geist", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}
          >
            <Icon name="close" size={16} style={{ color: C.onSurfaceVariant }} />
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


export const AddClientModal = ({ onClose, onSaved }) => {
  const { success, error: toastError } = useToast();
  const isMobile = useIsMobile();
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [form, setForm] = useState({
    // Basic
    name: "", phone: "", status: "New",
    // Barber prefs
    barber: "", haircutStyle: "", haircutCustom: "", beardStyle: "None", beardCustom: "", hairTexture: "",
    // Haircut details
    clipperGuard: "", necklineStyle: "Tapered", sidelineStyle: "Natural",
    haircutNotes: "",
    // Health / allergies
    allergies: "", scalpCondition: "",
    // General notes
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: stylists = [] } = useStylists();
  const activeBarbers = stylists.filter(s => s.status === "Active");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSubmitting(true);
    try {
      const initials = form.name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      const resolvedHaircut = form.haircutStyle === "Custom / Other" ? (form.haircutCustom.trim() || "Custom") : form.haircutStyle;
      const resolvedBeard   = form.beardStyle   === "Custom / Other" ? (form.beardCustom.trim()   || "Custom") : form.beardStyle;
      const docRef = await addClient({ ...form, haircutStyle: resolvedHaircut, beardStyle: resolvedBeard, initials, visits: 0, spent: "₱0" });
      success(`Client "${form.name.trim()}" added successfully`);
      onSaved({ ...form, haircutStyle: resolvedHaircut, beardStyle: resolvedBeard, initials, id: docRef?.id ?? `tmp_${Date.now()}` });
    } catch (e) {
      setError(e.message);
      toastError("Failed to add client — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="card" style={{ padding: isMobile ? 24 : 36, position: "relative", maxHeight: "90vh", overflowY: "auto", maxWidth: isMobile ? 560 : 840, width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: C.surfaceLow, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="person_add" size={20} style={{ color: C.primary }} />
            </div>
            <div>
              <h2 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 600, color: C.primary }}>Add Client</h2>
              <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 }}>
                {showFullProfile ? "Client profile + haircut preferences" : "Quick add — just the essentials"}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, transition: "background 0.15s" }}
            onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
            onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
            <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
          </button>
        </div>

        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 16 }}>{error}</p>}

        {/* ── Personal Info ── */}
        <SectionTitle>Personal Information</SectionTitle>
        <Field label="Full Name *">
          <input style={inputStyle} placeholder="e.g. Alexander Reid" value={form.name} onChange={set("name")} autoFocus />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14 }}>
          <Field label="Phone">
            <input style={inputStyle} placeholder="+1 (555) 012-3456" value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Status">
            <select style={selectStyle} value={form.status} onChange={set("status")}>
              {["New", "Regular", "VIP"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          {!isMobile && (
            <Field label="Last Barber">
              <select style={selectStyle} value={form.barber} onChange={set("barber")}>
                <option value="">— Select barber —</option>
                {activeBarbers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
          )}
        </div>
        {isMobile && (
          <Field label="Last Barber">
            <select style={selectStyle} value={form.barber} onChange={set("barber")}>
              <option value="">— Select barber —</option>
              {activeBarbers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </Field>
        )}

        {/* ── Toggle: full profile ── */}
        <button
          type="button"
          onClick={() => setShowFullProfile(v => !v)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", padding: "12px 16px", borderRadius: 12,
            background: C.surfaceLow, marginTop: 8, marginBottom: showFullProfile ? 20 : 8,
            border: "none", cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="content_cut" size={16} style={{ color: C.onSurfaceVariant }} />
            <span style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: C.primary }}>
              Add haircut profile & health notes
            </span>
            <span style={{ fontFamily: "Geist", fontSize: 10, color: C.onSurfaceVariant, opacity: 0.7 }}>(optional — can add later)</span>
          </div>
          <Icon name={showFullProfile ? "expand_less" : "expand_more"} size={18} style={{ color: C.onSurfaceVariant }} />
        </button>

        {showFullProfile && (
          <>
        {/* ── Haircut Style ── */}
        <SectionTitle>Haircut Preferences</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 14 }}>
          <div>
            <Field label="Haircut Style">
              <select style={selectStyle} value={form.haircutStyle} onChange={set("haircutStyle")}>
                <option value="">Select style…</option>
                {HAIRCUT_STYLES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            {form.haircutStyle === "Custom / Other" && (
              <Field label="Describe Haircut">
                <input style={inputStyle} placeholder="e.g. Mohawk with skin fade…" value={form.haircutCustom} onChange={set("haircutCustom")} autoFocus />
              </Field>
            )}
          </div>
          <div>
            <Field label="Beard Style">
              <select style={selectStyle} value={form.beardStyle} onChange={set("beardStyle")}>
                {BEARD_STYLES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            {form.beardStyle === "Custom / Other" && (
              <Field label="Describe Beard">
                <input style={inputStyle} placeholder="e.g. Shaped with hard lines…" value={form.beardCustom} onChange={set("beardCustom")} autoFocus />
              </Field>
            )}
          </div>
          <Field label="Hair Texture">
            <select style={selectStyle} value={form.hairTexture} onChange={set("hairTexture")}>
              <option value="">Select…</option>
              {HAIR_TEXTURES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Clipper Guard #">
            <input style={inputStyle} placeholder="e.g. 2, 3½" value={form.clipperGuard} onChange={set("clipperGuard")} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <Field label="Neckline">
            <select style={selectStyle} value={form.necklineStyle} onChange={set("necklineStyle")}>
              {["Tapered", "Blocked", "Rounded", "Faded"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Sideline Finish">
            <select style={selectStyle} value={form.sidelineStyle} onChange={set("sidelineStyle")}>
              {["Natural", "Hard Part", "Line Up", "Faded"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Haircut Notes">
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 64 }}
            placeholder="e.g. Leaves top longer, blends low on sides, no product…"
            value={form.haircutNotes} onChange={set("haircutNotes")} />
        </Field>

        {/* ── Health ── */}
        <SectionTitle>Health & Scalp</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr", gap: 14 }}>
          <Field label="Allergies / Sensitivities">
            <input style={inputStyle} placeholder="e.g. Fragrance, Latex" value={form.allergies} onChange={set("allergies")} />
          </Field>
          <Field label="Scalp Condition">
            <input style={inputStyle} placeholder="e.g. Dandruff, Sensitive" value={form.scalpCondition} onChange={set("scalpCondition")} />
          </Field>
        </div>

        {/* ── General Notes ── */}
        <SectionTitle>General Notes</SectionTitle>
        <Field label="Notes">
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 64 }}
            placeholder="Any other preferences, VIP instructions, special occasions…"
            value={form.notes} onChange={set("notes")} />
        </Field>
          </>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={handleSubmit} icon={submitting ? "hourglass_empty" : "check"}>
            {submitting ? "Saving…" : "Save Client"}
          </PrimaryBtn>
        </div>
      </div>
    </Overlay>
  );
};

/* ─── Edit Client Modal ────────────────────────────────────────────────────── */
export const EditClientModal = ({ client, onClose }) => {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState({
    name:   client.name   ?? "",
    email:  client.email  ?? "",
    phone:  client.phone  ?? "",
    barber: client.barber ?? "",
    status: client.status ?? "Regular",
    visits: client.visits ?? 0,
    spent:  client.spent  ?? "₱0",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: stylists = [] } = useStylists();
  const activeBarbers = stylists.filter(s => s.status === "Active");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSubmitting(true);
    try {
      const initials = form.name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      const rawSpent = String(form.spent ?? "0").replace(/[₱$,\s]/g, "") || "0";
      const spent = `₱${rawSpent}`;
      await updateClient(client.id, { ...form, initials, spent });
      success(`Client "${form.name.trim()}" updated`);
      onClose();
    } catch (e) {
      setError(e.message);
      toastError("Failed to update client — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Edit Client" icon="edit" onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 16 }}>{error}</p>}
        <Field label="Full Name *">
          <input style={inputStyle} value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Email">
          <input style={inputStyle} type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Phone">
          <input style={inputStyle} value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label="Preferred Barber">
          <select style={selectStyle} value={form.barber} onChange={set("barber")}>
            <option value="">— Select barber —</option>
            {activeBarbers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select style={selectStyle} value={form.status} onChange={set("status")}>
            {["New", "Regular", "VIP"].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Total Visits">
            <input style={inputStyle} type="number" min="0" value={form.visits} onChange={set("visits")} />
          </Field>
          <Field label="Total Spent">
            <input style={inputStyle} placeholder="e.g. ₱420" value={form.spent} onChange={set("spent")} />
          </Field>
        </div>
      </ModalCard>
    </Overlay>
  );
};

/* ─── Shared Delete Confirm Modal ──────────────────────────────────────────── */
const DeleteConfirmModal = ({ title, description, confirmLabel = "Yes, Delete", onClose, onConfirm, deleting, error }) => {
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim() === "DELETE";

  return (
    <Overlay onClose={onClose}>
      <div className="card" style={{ padding: 32, maxWidth: 440, width: "100%" }}>
        <div style={{ width: 48, height: 48, background: "#fef2f2", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Icon name="delete_forever" size={24} style={{ color: C.error }} />
        </div>
        <h3 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 600, color: C.primary, marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 14, color: C.onSurfaceVariant, marginBottom: 20, lineHeight: 1.6 }}>{description}</p>

        <div style={{ background: "#fef2f2", border: `1px solid ${C.error}30`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <p style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.error, marginBottom: 8 }}>
            TYPE <span style={{ fontFamily: "monospace", background: `${C.error}15`, padding: "1px 6px", borderRadius: 4 }}>DELETE</span> TO CONFIRM
          </p>
          <input
            autoFocus
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder="DELETE"
            style={{ ...inputStyle, background: "#fff", border: `1px solid ${confirmed ? C.error : C.outlineVariant}50`, color: C.onSurface, fontFamily: "monospace", letterSpacing: "0.06em" }}
          />
        </div>

        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 8 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <SecondaryBtn onClick={onClose} disabled={deleting}>Cancel</SecondaryBtn>
          <button
            onClick={onConfirm}
            disabled={deleting || !confirmed}
            style={{
              padding: "10px 20px", borderRadius: 12,
              background: !confirmed ? C.outlineVariant : deleting ? C.outlineVariant : C.error,
              color: "#fff", fontFamily: "Geist", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8,
              opacity: (!confirmed || deleting) ? 0.55 : 1,
              cursor: (!confirmed || deleting) ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {deleting && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
            {deleting ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </Overlay>
  );
};

/* ─── Delete Client Modal ──────────────────────────────────────────────────── */
export const DeleteClientModal = ({ client, onClose }) => {
  const { success, error: toastError } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await deleteClient(client.id);
      success(`Client "${client.name}" deleted`);
      onClose();
    } catch (e) {
      setError(e.message);
      toastError("Failed to delete client — please try again");
      setDeleting(false);
    }
  };

  return (
    <DeleteConfirmModal
      title="Delete Client?"
      description={<>This will permanently remove <strong>{client.name}</strong> from the system. All visit history and preferences will be lost. This action cannot be undone.</>}
      onClose={onClose}
      onConfirm={handleConfirm}
      deleting={deleting}
      error={error}
    />
  );
};

/* ─── Add Product Modal ────────────────────────────────────────────────────── */
const CATEGORIES = ["Styling", "Shave & Beard", "Fragrance", "Hair Care", "Equipment"];

export const AddProductModal = ({ onClose }) => {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState({ name: "", category: "Styling", price: "", stock: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Product name is required."); return; }
    if (!form.price) { setError("Price is required."); return; }
    setSubmitting(true);
    try {
      const stock = parseInt(form.stock) || 0;
      const status = stock === 0 ? "out-of-stock" : stock <= 5 ? "low-stock" : "in-stock";
      const price = form.price.startsWith("₱") ? form.price : `₱${form.price}`;
      await addProduct({ name: form.name, category: form.category.toUpperCase(), price, stock, status });
      success(`Product "${form.name.trim()}" added`);
      onClose();
    } catch (e) {
      setError(e.message);
      toastError("Failed to add product — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Add Product" icon="add_box" onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 16 }}>{error}</p>}
        <Field label="Product Name *">
          <input style={inputStyle} placeholder="e.g. Matte Clay No. 04" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Category">
          <select style={selectStyle} value={form.category} onChange={set("category")}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Price *">
            <input style={inputStyle} placeholder="e.g. 42" value={form.price} onChange={set("price")} />
          </Field>
          <Field label="Stock Qty">
            <input style={inputStyle} type="number" min="0" placeholder="e.g. 20" value={form.stock} onChange={set("stock")} />
          </Field>
        </div>
      </ModalCard>
    </Overlay>
  );
};

/* ─── Edit Product Modal ───────────────────────────────────────────────────── */
export const EditProductModal = ({ product, onClose }) => {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState({
    name:     product.name     ?? "",
    category: product.category ?? "STYLING",
    price:    product.price    ?? "",
    stock:    product.stock    ?? 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Product name is required."); return; }
    if (!form.price) { setError("Price is required."); return; }
    setSubmitting(true);
    try {
      const stock = parseInt(form.stock) || 0;
      const status = stock === 0 ? "out-of-stock" : stock <= 5 ? "low-stock" : "in-stock";
      const price = String(form.price).startsWith("₱") ? form.price : `₱${form.price}`;
      await updateProduct(product.id, { name: form.name, category: form.category.toUpperCase(), price, stock, status });
      success(`Product "${form.name.trim()}" updated`);
      onClose();
    } catch (e) {
      setError(e.message);
      toastError("Failed to update product — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const categoryValue = CATEGORIES.find(c => c.toUpperCase() === form.category?.toUpperCase()) ?? CATEGORIES[0];

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Edit Product" icon="edit" onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 16 }}>{error}</p>}
        <Field label="Product Name *">
          <input style={inputStyle} value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Category">
          <select style={selectStyle} value={categoryValue} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Price *">
            <input style={inputStyle} value={form.price} onChange={set("price")} />
          </Field>
          <Field label="Stock Qty">
            <input style={inputStyle} type="number" min="0" value={form.stock} onChange={set("stock")} />
          </Field>
        </div>
      </ModalCard>
    </Overlay>
  );
};

/* ─── Delete Product Modal ─────────────────────────────────────────────────── */
export const DeleteProductModal = ({ product, onClose }) => {
  const { success, error: toastError } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      success(`Product "${product.name}" deleted`);
      onClose();
    } catch (e) {
      setError(e.message);
      toastError("Failed to delete product — please try again");
      setDeleting(false);
    }
  };

  return (
    <DeleteConfirmModal
      title="Delete Product?"
      description={<>This will permanently remove <strong>{product.name}</strong> from inventory. Stock history will also be lost. This action cannot be undone.</>}
      onClose={onClose}
      onConfirm={handleConfirm}
      deleting={deleting}
      error={error}
    />
  );
};

/* ─── Restock Modal ────────────────────────────────────────────────────────── */
export const RestockModal = ({ product, onClose }) => {
  const { success, error: toastError } = useToast();
  const [qty, setQty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const addQty = parseInt(qty);
    if (!addQty || addQty <= 0) { setError("Enter a valid quantity greater than 0."); return; }
    setSubmitting(true);
    try {
      const newStock = (product.stock ?? 0) + addQty;
      const status = newStock === 0 ? "out-of-stock" : newStock <= 5 ? "low-stock" : "in-stock";
      await updateProduct(product.id, { stock: newStock, status });
      await addStockMovement({
        product: product.name,
        action: "Restock",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        change: `+${addQty}`,
        status: "in-stock",
      });
      success(`Restocked "${product.name}" — +${addQty} units added`);
      onClose();
    } catch (e) {
      setError(e.message);
      toastError("Failed to restock product — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: `${C.secondary}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="add_circle" size={20} style={{ color: C.secondary }} />
            </div>
            <h2 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 500, color: C.primary }}>Restock Product</h2>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8 }}
            onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
            onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
            <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
          </button>
        </div>

        <div style={{ background: C.surfaceLow, borderRadius: 12, padding: "14px 18px", marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 2 }}>{product.category}</p>
            <p style={{ fontFamily: "Geist", fontSize: 15, fontWeight: 500, color: C.primary }}>{product.name}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 2 }}>Current Stock</p>
            <p style={{ fontFamily: "Geist", fontSize: 20, fontWeight: 700, color: product.stock === 0 ? C.error : C.secondary }}>{product.stock ?? 0}</p>
          </div>
        </div>

        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 14 }}>{error}</p>}

        <Field label="Quantity to Add *">
          <input
            style={inputStyle}
            type="number"
            min="1"
            placeholder="e.g. 20"
            value={qty}
            onChange={e => setQty(e.target.value)}
            autoFocus
          />
        </Field>

        {qty && parseInt(qty) > 0 && (
          <p style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: -10, marginBottom: 16 }}>
            New stock will be <strong style={{ color: C.primary }}>{(product.stock ?? 0) + parseInt(qty)} units</strong>
          </p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: "10px 20px", borderRadius: 12, background: submitting ? C.outlineVariant : C.secondary, color: "#fff", fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
            {submitting ? "Saving…" : "Confirm Restock"}
          </button>
        </div>
      </div>
    </Overlay>
  );
};

/* ─── New Sale Modal ───────────────────────────────────────────────────────── */
const SERVICES = [
  "Executive Cut & Style",
  "Royal Hot Towel Shave",
  "Beard Sculpting",
  "Charcoal Facial Detox",
  "Classic Haircut",
  "Kids Cut",
];

export const NewSaleModal = ({ onClose }) => {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState({ client: "", service: SERVICES[0], barber: "", amount: "", method: "Card", status: "Completed" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: stylists = [] } = useStylists();
  const activeBarbers = stylists.filter(s => s.status === "Active");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.client.trim()) { setError("Client name is required."); return; }
    if (!form.amount) { setError("Amount is required."); return; }
    setSubmitting(true);
    try {
      const amount = form.amount.startsWith("₱") ? form.amount : `₱${form.amount}`;
      const txnId = `TXN-${Date.now().toString().slice(-4)}`;
      const date = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
      await addTransaction({ ...form, amount, txnId, date });
      success(`Sale recorded — ${amount} for ${form.client.trim()}`);
      onClose();
    } catch (e) {
      setError(e.message);
      toastError("Failed to record sale — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="New Sale" icon="receipt_long" onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 16 }}>{error}</p>}
        <Field label="Client Name *">
          <input style={inputStyle} placeholder="e.g. Alexander Reid" value={form.client} onChange={set("client")} />
        </Field>
        <Field label="Service">
          <select style={selectStyle} value={form.service} onChange={set("service")}>
            {SERVICES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Barber">
          <select style={selectStyle} value={form.barber} onChange={set("barber")}>
            <option value="">— Select barber —</option>
            {activeBarbers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Amount *">
            <input style={inputStyle} placeholder="e.g. 85" value={form.amount} onChange={set("amount")} />
          </Field>
          <Field label="Payment Method">
            <select style={selectStyle} value={form.method} onChange={set("method")}>
              {["Card", "Cash"].map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Status">
          <select style={selectStyle} value={form.status} onChange={set("status")}>
            {["Completed", "Refunded"].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </ModalCard>
    </Overlay>
  );
};

/* ─── Add Stylist Modal ────────────────────────────────────────────────────── */
const ROLES = ["Master Stylist", "Creative Lead", "Senior Stylist", "Junior Stylist"];
const ALL_SERVICES = ["Executive Cut", "Hot Towel Shave", "Beard Sculpting", "Facial Detox", "Classic Haircut", "Kids Cut"];

export const AddStylistModal = ({ onClose }) => {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState({ name: "", role: ROLES[0], phone: "", email: "", status: "Active", specialties: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleSpecialty = sp => setForm(f => ({
    ...f,
    specialties: f.specialties.includes(sp)
      ? f.specialties.filter(s => s !== sp)
      : [...f.specialties, sp],
  }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSubmitting(true);
    try {
      const initials = form.name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      await addStylist({ ...form, initials });
      success(`Stylist "${form.name.trim()}" added`);
      onClose();
    } catch (e) {
      setError(e.message);
      toastError("Failed to add stylist — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Add Stylist" icon="person_add" onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 16 }}>{error}</p>}
        <Field label="Full Name *">
          <input style={inputStyle} placeholder="e.g. Julian Vance" value={form.name} onChange={set("name")} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Role">
            <select style={selectStyle} value={form.role} onChange={set("role")}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select style={selectStyle} value={form.status} onChange={set("status")}>
              {["Active", "Inactive"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Email">
          <input style={inputStyle} type="email" placeholder="e.g. julian@theparlour.com" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Phone">
          <input style={inputStyle} placeholder="e.g. +1 (555) 200-0001" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label="Specialties">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_SERVICES.map(sp => {
              const selected = form.specialties.includes(sp);
              return (
                <button key={sp} type="button" onClick={() => toggleSpecialty(sp)} style={{
                  padding: "5px 12px", borderRadius: 8,
                  background: selected ? C.primary : C.surfaceLow,
                  color: selected ? "#fff" : C.onSurfaceVariant,
                  border: `1px solid ${selected ? C.primary : C.outlineVariant}40`,
                  fontFamily: "Geist", fontSize: 11, fontWeight: 500,
                  transition: "all 0.15s",
                }}>{sp}</button>
              );
            })}
          </div>
        </Field>
      </ModalCard>
    </Overlay>
  );
};

/* ─── Edit Stylist Modal ───────────────────────────────────────────────────── */
export const EditStylistModal = ({ stylist, onClose }) => {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState({
    name:        stylist.name        ?? "",
    role:        stylist.role        ?? ROLES[0],
    phone:       stylist.phone       ?? "",
    email:       stylist.email       ?? "",
    status:      stylist.status      ?? "Active",
    specialties: stylist.specialties ?? [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── App Access (Firestore users/{uid}.role) — only relevant if linked ──
  const hasLogin = !!stylist.uid;
  const [appRole, setAppRole] = useState("barber");
  const [appRoleLoading, setAppRoleLoading] = useState(hasLogin); // true only while fetching an existing login's role

  useEffect(() => {
    if (!hasLogin) return;
    let active = true;
    getDoc(doc(db, "users", stylist.uid))
      .then(snap => { if (active && snap.exists()) setAppRole(snap.data().role ?? "barber"); })
      .catch(() => {})
      .finally(() => { if (active) setAppRoleLoading(false); });
    return () => { active = false; };
  }, [hasLogin, stylist.uid]);

  // ── Login account creation (for stylists added without one) ────────────
  const [showCreateLogin, setShowCreateLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ password: "", confirmPassword: "", appRole: "barber" });
  const [loginBusy,  setLoginBusy]  = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginDone,  setLoginDone]  = useState(false);

  const setLogin = k => e => setLoginForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreateLogin = async () => {
    if (!form.email.trim()) { setLoginError("Add an email above first."); return; }
    if (loginForm.password.length < 6) { setLoginError("Password must be at least 6 characters."); return; }
    if (loginForm.password !== loginForm.confirmPassword) { setLoginError("Passwords do not match."); return; }

    setLoginBusy(true);
    setLoginError("");
    try {
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email.trim(), loginForm.password);
      const uid  = cred.user.uid;
      await secondaryAuth.signOut();

      await setDoc(doc(db, "users", uid), {
        uid,
        name:      form.name.trim(),
        email:     form.email.trim().toLowerCase(),
        role:      loginForm.appRole, // "admin" | "barber" — controls Firestore access
        jobTitle:  form.role,
        status:    form.status,
        createdAt: new Date().toISOString(),
      });

      // Link this stylist card to the new account
      await updateStylist(stylist.id, { uid, email: form.email.trim().toLowerCase() });

      setLoginDone(true);
      setAppRole(loginForm.appRole);
      success(`Login created for ${form.name.trim()}`);
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use": "That email is already registered to another account.",
        "auth/invalid-email":        "Invalid email address.",
        "auth/weak-password":        "Password is too weak.",
      };
      setLoginError(msgs[e.code] || e.message);
    } finally {
      setLoginBusy(false);
    }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleSpecialty = sp => setForm(f => ({
    ...f,
    specialties: f.specialties.includes(sp)
      ? f.specialties.filter(s => s !== sp)
      : [...f.specialties, sp],
  }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSubmitting(true);
    try {
      const initials = form.name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      await updateStylist(stylist.id, { ...form, initials });

      // Sync App Access if this stylist has a linked login
      if (hasLogin) {
        await setDoc(doc(db, "users", stylist.uid), { role: appRole }, { merge: true });
      }

      success(`Stylist "${form.name.trim()}" updated`);
      onClose();
    } catch (e) {
      setError(e.message);
      toastError("Failed to update stylist — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Edit Stylist" icon="edit" onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 16 }}>{error}</p>}

        {/* ── No login account warning ── */}
        {!hasLogin && !loginDone && (
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Icon name="warning" size={18} style={{ color: "#92400e", flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: "#92400e" }}>
                  No login account
                </p>
                <p style={{ fontFamily: "Geist", fontSize: 11, color: "#92400e", marginTop: 2, lineHeight: 1.5 }}>
                  This stylist can't sign in or appear in Settings → Staff Accounts. Create a login below to enable access.
                </p>
                {!showCreateLogin && (
                  <button
                    type="button"
                    onClick={() => setShowCreateLogin(true)}
                    style={{
                      marginTop: 10, padding: "7px 14px", borderRadius: 8,
                      background: "#92400e", color: "#fff",
                      fontFamily: "Geist", fontSize: 11, fontWeight: 600,
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <Icon name="person_add" size={13} style={{ color: "#fff" }} />
                    Create Login
                  </button>
                )}
              </div>
            </div>

            {showCreateLogin && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #fde68a" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input
                    type="password" placeholder="Password (min. 6 chars)"
                    style={{ ...inputStyle, background: "#fff" }}
                    value={loginForm.password} onChange={setLogin("password")}
                  />
                  <input
                    type="password" placeholder="Confirm password"
                    style={{ ...inputStyle, background: "#fff" }}
                    value={loginForm.confirmPassword} onChange={setLogin("confirmPassword")}
                  />
                </div>
                <select
                  style={{ ...selectStyle, background: "#fff", marginBottom: 10 }}
                  value={loginForm.appRole} onChange={setLogin("appRole")}
                >
                  <option value="barber">Barber access — clients, stylists, appointments</option>
                  <option value="admin">Admin access — full access</option>
                </select>
                {loginError && <p style={{ color: C.error, fontSize: 12, marginBottom: 10 }}>{loginError}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateLogin(false)}
                    style={{ padding: "8px 14px", borderRadius: 8, background: "#fff", color: "#92400e", fontFamily: "Geist", fontSize: 11, fontWeight: 600, border: "1px solid #fde68a" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateLogin}
                    disabled={loginBusy}
                    style={{ padding: "8px 14px", borderRadius: 8, background: "#92400e", color: "#fff", fontFamily: "Geist", fontSize: 11, fontWeight: 600, opacity: loginBusy ? 0.6 : 1 }}
                  >
                    {loginBusy ? "Creating…" : "Confirm & Create"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {loginDone && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#dcfce7", border: "1px solid #86efac", borderRadius: 12, padding: "10px 14px", marginBottom: 20 }}>
            <Icon name="check_circle" size={16} style={{ color: "#16a34a", flexShrink: 0 }} />
            <span style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: "#15803d" }}>
              Login created — this stylist can now sign in and appears in Settings → Staff Accounts
            </span>
          </div>
        )}

        {/* ── App Access (editable when login already exists) ── */}
        {(hasLogin || loginDone) && !appRoleLoading && (
          <Field label="App Access">
            <select style={selectStyle} value={appRole} onChange={e => setAppRole(e.target.value)}>
              <option value="barber">Barber — clients, stylists, appointments only</option>
              <option value="admin">Admin — full access (inventory, transactions, reports)</option>
            </select>
          </Field>
        )}

        <Field label="Full Name *">
          <input style={inputStyle} value={form.name} onChange={set("name")} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Role">
            <select style={selectStyle} value={form.role} onChange={set("role")}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select style={selectStyle} value={form.status} onChange={set("status")}>
              {["Active", "Inactive"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Email">
          <input style={inputStyle} type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Phone">
          <input style={inputStyle} value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label="Specialties">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_SERVICES.map(sp => {
              const selected = form.specialties.includes(sp);
              return (
                <button key={sp} type="button" onClick={() => toggleSpecialty(sp)} style={{
                  padding: "5px 12px", borderRadius: 8,
                  background: selected ? C.primary : C.surfaceLow,
                  color: selected ? "#fff" : C.onSurfaceVariant,
                  border: `1px solid ${selected ? C.primary : C.outlineVariant}40`,
                  fontFamily: "Geist", fontSize: 11, fontWeight: 500,
                  transition: "all 0.15s",
                }}>{sp}</button>
              );
            })}
          </div>
        </Field>
      </ModalCard>
    </Overlay>
  );
};

/* ─── Delete Stylist Modal ─────────────────────────────────────────────────── */
export const DeleteStylistModal = ({ stylist, onClose }) => {
  const { success, error: toastError } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await deleteStylist(stylist.id);
      success(`Stylist "${stylist.name}" removed`);
      onClose();
    } catch (e) {
      setError(e.message);
      toastError("Failed to delete stylist — please try again");
      setDeleting(false);
    }
  };

  return (
    <DeleteConfirmModal
      title="Remove Stylist?"
      description={<>This will permanently remove <strong>{stylist.name}</strong> from the system. Their performance history will also be deleted. This action cannot be undone.</>}
      confirmLabel="Yes, Remove"
      onClose={onClose}
      onConfirm={handleConfirm}
      deleting={deleting}
      error={error}
    />
  );
};