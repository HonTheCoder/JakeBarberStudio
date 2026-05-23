import { useState, useRef, useEffect } from "react";
import { C } from "../../tokens/design";
import { Icon, PrimaryBtn, SecondaryBtn } from "../ui";
import {
  addClient, updateClient, deleteClient,
  addProduct, updateProduct, deleteProduct, addStockMovement,
  addTransaction, addStylist, updateStylist, deleteStylist,
  useStylists,
} from "../../hooks/useFirestore";

/* ─── Shared Overlay ──────────────────────────────────────────────────────── */
const Overlay = ({ onClose, children }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.45)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}
  >
    <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 500 }}>
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
function buildQRMatrix(text) {
  const N = 21;
  const mat = Array.from({ length: N }, () => Array(N).fill(null));
  const finder = (r, c) => {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++)
      mat[r + i][c + j] = (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
    for (let k = 0; k < 8; k++) {
      if (r + 7 < N && c + k < N) mat[r + 7][c + k] = false;
      if (r + k < N && c + 7 < N) mat[r + k][c + 7] = false;
    }
  };
  finder(0, 0); finder(0, 14); finder(14, 0);
  for (let i = 8; i <= 12; i++) { mat[6][i] = (i % 2 === 0); mat[i][6] = (i % 2 === 0); }
  mat[13][8] = true;
  const fmtBits = [1,0,1,0,1,0,0,0,0,0,1,0,0,1,0];
  [0,1,2,3,4,5,7].forEach((pos, i) => { mat[8][pos] = fmtBits[i]; mat[pos][8] = fmtBits[14 - i]; });
  [8,9,10,11,12,13,14].forEach((pos, i) => { mat[pos][8] = fmtBits[6 + i]; mat[8][pos] = fmtBits[8 + i]; });
  const bytes = [];
  for (let i = 0; i < Math.min(text.length, 17); i++) bytes.push(text.charCodeAt(i));
  const bits = [];
  const push = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
  push(0b0100, 4); push(bytes.length, 8);
  bytes.forEach(b => push(b, 8));
  push(0b0000, 4);
  while (bits.length < 152) { bits.push(1,1,1,0,1,1,0,0); if (bits.length >= 152) break; bits.push(0,0,0,1,0,0,0,1); }
  bits.length = 152;
  let bitIdx = 0;
  const isReserved = (r, c) => mat[r][c] !== null;
  for (let col = N - 1; col >= 0; col -= 2) {
    const effectiveCol = col <= 6 ? col - 1 : col;
    for (let row = N - 1; row >= 0; row--) {
      for (let dc = 0; dc <= 1; dc++) {
        const c = effectiveCol - dc;
        if (c < 0 || c >= N) continue;
        if (!isReserved(row, c)) {
          const bit = bits[bitIdx++] ?? 0;
          mat[row][c] = ((row + c) % 2 === 0) ? !bit : !!bit;
        }
      }
    }
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (mat[r][c] === null) mat[r][c] = false;
  return mat;
}

/* ─── New Client QR Modal — shown after saving a new client ───────────────── */
export const NewClientQRModal = ({ client, onClose }) => {
  const canvasRef = useRef(null);
  const [downloaded, setDownloaded] = useState(false);

  const qrData = `jake-barber-studio:client:${client.id ?? "000"}`;
  const matrix = buildQRMatrix(qrData.slice(0, 17));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const N = matrix.length;
    const cell = 8, pad = 16;
    canvas.width = N * cell + pad * 2;
    canvas.height = N * cell + pad * 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      ctx.fillStyle = matrix[r][c] ? "#1b1c1c" : "#ffffff";
      ctx.fillRect(pad + c * cell, pad + r * cell, cell, cell);
    }
  }, []);

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
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()} className="card" style={{ padding: 36, maxWidth: 420, width: "100%", textAlign: "center" }}>
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
      const docRef = await addClient({ ...form, haircutStyle: resolvedHaircut, beardStyle: resolvedBeard, initials, visits: 0, spent: "$0" });
      // Show QR step — pass the new client id back via onSaved
      onSaved({ ...form, haircutStyle: resolvedHaircut, beardStyle: resolvedBeard, initials, id: docRef?.id ?? `tmp_${Date.now()}` });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="card" style={{ padding: 32, position: "relative", maxHeight: "90vh", overflowY: "auto", maxWidth: 560, width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: C.surfaceLow, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="person_add" size={20} style={{ color: C.primary }} />
            </div>
            <div>
              <h2 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 600, color: C.primary }}>Add Client</h2>
              <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 }}>Client profile + haircut preferences</p>
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
          <input style={inputStyle} placeholder="e.g. Alexander Reid" value={form.name} onChange={set("name")} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Phone">
            <input style={inputStyle} placeholder="+1 (555) 012-3456" value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Status">
            <select style={selectStyle} value={form.status} onChange={set("status")}>
              {["New", "Regular", "VIP"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Last Barber">
          <select style={selectStyle} value={form.barber} onChange={set("barber")}>
            <option value="">— Select barber —</option>
            {activeBarbers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </Field>

        {/* ── Haircut Style ── */}
        <SectionTitle>Haircut Preferences</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Field label="Hair Texture">
            <select style={selectStyle} value={form.hairTexture} onChange={set("hairTexture")}>
              <option value="">Select…</option>
              {HAIR_TEXTURES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Clipper Guard #">
            <input style={inputStyle} placeholder="e.g. 2, 3½" value={form.clipperGuard} onChange={set("clipperGuard")} />
          </Field>
          <Field label="Neckline">
            <select style={selectStyle} value={form.necklineStyle} onChange={set("necklineStyle")}>
              {["Tapered", "Blocked", "Rounded", "Faded"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Sideline Finish">
          <select style={selectStyle} value={form.sidelineStyle} onChange={set("sidelineStyle")}>
            {["Natural", "Hard Part", "Line Up", "Faded"].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Haircut Notes">
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 64 }}
            placeholder="e.g. Leaves top longer, blends low on sides, no product…"
            value={form.haircutNotes} onChange={set("haircutNotes")} />
        </Field>

        {/* ── Health ── */}
        <SectionTitle>Health & Scalp</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
  const [form, setForm] = useState({
    name:   client.name   ?? "",
    email:  client.email  ?? "",
    phone:  client.phone  ?? "",
    barber: client.barber ?? "",
    status: client.status ?? "Regular",
    visits: client.visits ?? 0,
    spent:  client.spent  ?? "$0",
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
      await updateClient(client.id, { ...form, initials });
      onClose();
    } catch (e) {
      setError(e.message);
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
            <input style={inputStyle} placeholder="e.g. $420" value={form.spent} onChange={set("spent")} />
          </Field>
        </div>
      </ModalCard>
    </Overlay>
  );
};

/* ─── Delete Client Modal ──────────────────────────────────────────────────── */
export const DeleteClientModal = ({ client, onClose }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await deleteClient(client.id);
      onClose();
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="card" style={{ padding: 32, maxWidth: 420, width: "100%" }}>
        <div style={{ width: 48, height: 48, background: "#fef2f2", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Icon name="delete_forever" size={24} style={{ color: C.error }} />
        </div>
        <h3 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 600, color: C.primary, marginBottom: 8 }}>Delete Client?</h3>
        <p style={{ fontSize: 14, color: C.onSurfaceVariant, marginBottom: 8, lineHeight: 1.6 }}>
          This will permanently remove <strong>{client.name}</strong> from the system. This action cannot be undone.
        </p>
        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <SecondaryBtn onClick={onClose} disabled={deleting}>Cancel</SecondaryBtn>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            style={{ padding: "10px 20px", borderRadius: 12, background: deleting ? C.outlineVariant : C.error, color: "#fff", fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8, opacity: deleting ? 0.7 : 1 }}
          >
            {deleting && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
            {deleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </Overlay>
  );
};

/* ─── Add Product Modal ────────────────────────────────────────────────────── */
const CATEGORIES = ["Styling", "Shave & Beard", "Fragrance", "Hair Care", "Equipment"];

export const AddProductModal = ({ onClose }) => {
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
      const price = form.price.startsWith("$") ? form.price : `$${form.price}`;
      await addProduct({ name: form.name, category: form.category.toUpperCase(), price, stock, status });
      onClose();
    } catch (e) {
      setError(e.message);
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
      const price = String(form.price).startsWith("$") ? form.price : `$${form.price}`;
      await updateProduct(product.id, { name: form.name, category: form.category.toUpperCase(), price, stock, status });
      onClose();
    } catch (e) {
      setError(e.message);
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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      onClose();
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="card" style={{ padding: 32, maxWidth: 420, width: "100%" }}>
        <div style={{ width: 48, height: 48, background: "#fef2f2", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Icon name="delete_forever" size={24} style={{ color: C.error }} />
        </div>
        <h3 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 600, color: C.primary, marginBottom: 8 }}>Delete Product?</h3>
        <p style={{ fontSize: 14, color: C.onSurfaceVariant, marginBottom: 8, lineHeight: 1.6 }}>
          This will permanently remove <strong>{product.name}</strong> from inventory. This action cannot be undone.
        </p>
        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <SecondaryBtn onClick={onClose} disabled={deleting}>Cancel</SecondaryBtn>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            style={{ padding: "10px 20px", borderRadius: 12, background: deleting ? C.outlineVariant : C.error, color: "#fff", fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8, opacity: deleting ? 0.7 : 1 }}
          >
            {deleting && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
            {deleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </Overlay>
  );
};

/* ─── Restock Modal ────────────────────────────────────────────────────────── */
export const RestockModal = ({ product, onClose }) => {
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
      onClose();
    } catch (e) {
      setError(e.message);
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
      const amount = form.amount.startsWith("$") ? form.amount : `$${form.amount}`;
      const txnId = `TXN-${Date.now().toString().slice(-4)}`;
      const date = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
      await addTransaction({ ...form, amount, txnId, date });
      onClose();
    } catch (e) {
      setError(e.message);
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
      onClose();
    } catch (e) {
      setError(e.message);
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
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Edit Stylist" icon="edit" onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 16 }}>{error}</p>}
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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await deleteStylist(stylist.id);
      onClose();
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="card" style={{ padding: 32, maxWidth: 420, width: "100%" }}>
        <div style={{ width: 48, height: 48, background: "#fef2f2", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Icon name="delete_forever" size={24} style={{ color: C.error }} />
        </div>
        <h3 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 600, color: C.primary, marginBottom: 8 }}>Remove Stylist?</h3>
        <p style={{ fontSize: 14, color: C.onSurfaceVariant, marginBottom: 8, lineHeight: 1.6 }}>
          This will permanently remove <strong>{stylist.name}</strong> from the system. This action cannot be undone.
        </p>
        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <SecondaryBtn onClick={onClose} disabled={deleting}>Cancel</SecondaryBtn>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            style={{ padding: "10px 20px", borderRadius: 12, background: deleting ? C.outlineVariant : C.error, color: "#fff", fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8, opacity: deleting ? 0.7 : 1 }}
          >
            {deleting && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
            {deleting ? "Removing…" : "Yes, Remove"}
          </button>
        </div>
      </div>
    </Overlay>
  );
};