import { useState, useEffect, useCallback } from "react";
import { C } from "../tokens/design";
import { Icon, PrimaryBtn, SecondaryBtn } from "../components/ui";
import useIsMobile from "../hooks/useIsMobile";
import {
  useSettings, saveSettings,
  clearAllTransactions, resetInventoryStock,
  deleteClientsByFilter, useClients,
} from "../hooks/useFirestore";

// Firebase — used only for account creation
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { db, auth as primaryAuth } from "../firebase";

/* ── Shared primitives ───────────────────────────────────────────────────── */
const Section = ({ title, subtitle, children }) => (
  <div style={{ marginBottom: 40 }}>
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginTop: 4 }}>{subtitle}</p>}
    </div>
    <div className="card" style={{ overflow: "hidden" }}>{children}</div>
  </div>
);

const Row = ({ icon, label, subtitle, children, last = false }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 16,
    padding: "20px 28px",
    borderBottom: last ? "none" : `1px solid ${C.outlineVariant}20`,
  }}>
    {icon && (
      <div style={{ width: 38, height: 38, background: C.surfaceLow, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={18} style={{ color: C.onSurfaceVariant }} />
      </div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 500, color: C.primary }}>{label}</div>
      {subtitle && <div style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>{subtitle}</div>}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
);

const FieldInput = ({ value, onChange, placeholder, type = "text" }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      padding: "9px 14px",
      background: C.surfaceLow,
      border: `1px solid ${C.outlineVariant}40`,
      borderRadius: 10,
      fontFamily: "Inter", fontSize: 13, color: C.onSurface,
      width: 220, maxWidth: "100%",
    }}
  />
);

const Toggle = ({ on, onToggle }) => (
  <button
    onClick={onToggle}
    style={{
      width: 44, height: 26, borderRadius: 999,
      background: on ? C.primary : C.outlineVariant,
      position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}
  >
    <div style={{
      width: 20, height: 20, borderRadius: "50%", background: "#fff",
      position: "absolute", top: 3,
      left: on ? 21 : 3,
      transition: "left 0.2s",
      boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    }} />
  </button>
);

const LocalBadge = ({ label, color = C.secondary, bg = C.secondaryContainer }) => (
  <span style={{ background: bg, color, padding: "3px 12px", borderRadius: 999, fontSize: 11, fontFamily: "Geist", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
    {label}
  </span>
);

/* ── Confirm Dialog ──────────────────────────────────────────────────────── */
const ConfirmDialog = ({ title, message, confirmLabel = "Confirm", onConfirm, onClose, danger = true }) => {
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const handle = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()} className="card" style={{ padding: 32, maxWidth: 420, width: "100%" }}>
        <div style={{ width: 48, height: 48, background: danger ? "#fef2f2" : C.surfaceLow, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Icon name={danger ? "warning" : "info"} size={24} style={{ color: danger ? C.error : C.secondary }} />
        </div>
        <h3 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 600, color: C.primary, marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 14, color: C.onSurfaceVariant, marginBottom: 8, lineHeight: 1.6 }}>{message}</p>
        {err && <p style={{ color: C.error, fontSize: 13, marginBottom: 8 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <SecondaryBtn onClick={onClose} disabled={busy}>Cancel</SecondaryBtn>
          <button
            onClick={handle}
            disabled={busy}
            style={{ padding: "10px 20px", borderRadius: 12, background: busy ? C.outlineVariant : (danger ? C.error : C.primary), color: "#fff", fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8, opacity: busy ? 0.7 : 1 }}
          >
            {busy && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Staff Edit Modal ────────────────────────────────────────────────────── */
const staffInputStyle = {
  width: "100%", padding: "10px 14px",
  background: C.surfaceLow,
  border: `1px solid ${C.outlineVariant}40`,
  borderRadius: 10,
  fontFamily: "Inter", fontSize: 14, color: C.onSurface,
  boxSizing: "border-box",
};

const StaffEditModal = ({ member, onClose, onSave }) => {
  const [form, setForm] = useState({ name: member.name, role: member.role, email: member.email, status: member.status });
  const [busy, setBusy] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async () => {
    setBusy(true);
    try {
      await onSave({ ...member, ...form });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ padding: 32, maxWidth: 500, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: C.surfaceLow, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="manage_accounts" size={20} style={{ color: C.primary }} />
            </div>
            <h2 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 500, color: C.primary }}>Edit Staff Member</h2>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8 }}
            onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
            onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
            <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
          </button>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Full Name</label>
          <input style={staffInputStyle} value={form.name} onChange={set("name")} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Email</label>
          <input style={staffInputStyle} type="email" value={form.email} onChange={set("email")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
          <div>
            <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Role</label>
            <select style={{ ...staffInputStyle, appearance: "none" }} value={form.role} onChange={set("role")}>
              {["Administrator", "Master Stylist", "Creative Lead", "Senior Stylist", "Junior Stylist"].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Status</label>
            <select style={{ ...staffInputStyle, appearance: "none" }} value={form.status} onChange={set("status")}>
              {["Active", "Inactive"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={handle} icon={busy ? "hourglass_empty" : "check"}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        </div>
      </div>
    </div>
  );
};

/* ── Create Account Modal (replaces fake Invite) ─────────────────────────── */
/**
 * Creates a real Firebase Auth account + writes users/{uid} in Firestore.
 * Uses a secondary Auth instance so creating the barber account doesn't
 * sign the admin out.
 */
const getSecondaryAuth = () => {
  // Re-use existing secondary app if already initialized
  const existing = getApps().find(a => a.name === "secondary");
  if (existing) return getAuth(existing);
  // Clone config from the primary app
  const primary = getApps().find(a => a.name === "[DEFAULT]") ?? getApps()[0];
  const secondary = initializeApp(primary.options, "secondary");
  return getAuth(secondary);
};

const CreateAccountModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", appRole: "barber", jobTitle: "Junior Stylist" });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");
  const [done, setDone] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async () => {
    if (!form.name.trim())    { setErr("Full name is required."); return; }
    if (!form.email.trim())   { setErr("Email is required."); return; }
    if (form.password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirmPassword) { setErr("Passwords do not match."); return; }

    setBusy(true);
    setErr("");
    try {
      // Use a secondary Auth instance so admin stays signed in
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email.trim(), form.password);
      const uid  = cred.user.uid;

      // Sign out from the secondary instance immediately
      await secondaryAuth.signOut();

      // Write role document to Firestore
      await setDoc(doc(db, "users", uid), {
        uid,
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        role:     form.appRole,       // "admin" | "barber"
        jobTitle: form.jobTitle,
        status:   "Active",
        createdAt: new Date().toISOString(),
      });

      onCreated?.({ uid, name: form.name.trim(), email: form.email.trim(), role: form.appRole, jobTitle: form.jobTitle, status: "Active" });
      setDone(true);
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use": "That email is already registered.",
        "auth/invalid-email":        "Invalid email address.",
        "auth/weak-password":        "Password is too weak.",
      };
      setErr(msgs[e.code] || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ padding: 32, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: C.surfaceLow, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="person_add" size={20} style={{ color: C.primary }} />
            </div>
            <div>
              <h2 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 500, color: C.primary }}>Create Account</h2>
              <p style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>Sets up Firebase Auth + assigns role</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8 }}
            onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
            onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
            <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
          </button>
        </div>

        {done ? (
          /* ── Success ── */
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <div style={{ width: 56, height: 56, background: "#dcfce7", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="check_circle" size={28} style={{ color: "#166534" }} />
            </div>
            <p style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary, marginBottom: 6 }}>Account created!</p>
            <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginBottom: 8 }}>
              <strong>{form.name}</strong> can now log in with <strong>{form.email}</strong>
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: form.appRole === "admin" ? C.secondaryContainer : C.surfaceHigh, borderRadius: 999, marginBottom: 24 }}>
              <Icon name="verified_user" size={14} style={{ color: form.appRole === "admin" ? C.secondary : C.onSurfaceVariant }} />
              <span style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: form.appRole === "admin" ? C.secondary : C.onSurfaceVariant }}>
                {form.appRole} access
              </span>
            </div>
            <br />
            <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 12, background: C.primary, color: "#fff", fontFamily: "Geist", fontSize: 13, fontWeight: 600 }}>
              Done
            </button>
          </div>
        ) : (
          <>
            {/* App Role selector — most important field, shown first */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 10 }}>
                Access Role *
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { value: "barber", label: "Barber", icon: "content_cut", desc: "Schedule & clients only" },
                  { value: "admin",  label: "Admin",  icon: "admin_panel_settings", desc: "Full access" },
                ].map(opt => {
                  const sel = form.appRole === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, appRole: opt.value }))}
                      style={{
                        flex: 1, padding: "14px 12px", borderRadius: 12, textAlign: "left",
                        border: `2px solid ${sel ? C.primary : C.outlineVariant + "50"}`,
                        background: sel ? C.surfaceLow : "transparent",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Icon name={opt.icon} size={16} style={{ color: sel ? C.primary : C.onSurfaceVariant }} />
                        <span style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: sel ? C.primary : C.onSurfaceVariant }}>{opt.label}</span>
                        {sel && <Icon name="check_circle" size={14} style={{ color: C.primary, marginLeft: "auto" }} />}
                      </div>
                      <span style={{ fontSize: 11, color: C.onSurfaceVariant }}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Full Name *</label>
              <input style={staffInputStyle} placeholder="e.g. Marcus Reid" value={form.name} onChange={set("name")} />
            </div>

            {/* Job title */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Job Title</label>
              <select style={{ ...staffInputStyle, appearance: "none" }} value={form.jobTitle} onChange={set("jobTitle")}>
                {["Master Stylist", "Creative Lead", "Senior Stylist", "Junior Stylist", "Manager", "Administrator"].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Email *</label>
              <input style={staffInputStyle} type="email" placeholder="e.g. marcus@theparlour.com" value={form.email} onChange={set("email")} />
            </div>

            {/* Password row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Password *</label>
                <input style={staffInputStyle} type="password" placeholder="Min. 6 characters" value={form.password} onChange={set("password")} />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Confirm *</label>
                <input style={staffInputStyle} type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={set("confirmPassword")} />
              </div>
            </div>

            {err && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fef2f2", borderRadius: 10, marginBottom: 16 }}>
                <Icon name="error" size={16} style={{ color: C.error, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.error }}>{err}</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4, justifyContent: "flex-end" }}>
              <SecondaryBtn onClick={onClose} disabled={busy}>Cancel</SecondaryBtn>
              <PrimaryBtn onClick={handle} icon={busy ? "hourglass_empty" : "person_add"} disabled={busy}>
                {busy ? "Creating…" : "Create Account"}
              </PrimaryBtn>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ── Client Cleanup Modal ────────────────────────────────────────────────── */
const STATUS_OPTIONS = ["New", "Regular", "VIP"];
const VISIT_PRESETS  = [
  { label: "Any visits",   min: null, max: null  },
  { label: "0 visits",     min: 0,    max: 0     },
  { label: "1–3 visits",   min: 1,    max: 3     },
  { label: "4–9 visits",   min: 4,    max: 9     },
  { label: "10+ visits",   min: 10,   max: null  },
];

const STATUS_COLORS = {
  VIP:     { bg: "#fed65b", color: "#735c00" },
  Regular: { bg: "#f0eded", color: "#444748" },
  New:     { bg: "#e4e2e1", color: "#1b1c1c" },
};

const ClientCleanupModal = ({ onClose }) => {
  const { data: allClients } = useClients();
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [visitPreset,      setVisitPreset]      = useState(0);
  const [busy,             setBusy]             = useState(false);
  const [done,             setDone]             = useState(null);
  const [err,              setErr]              = useState("");

  const preset = VISIT_PRESETS[visitPreset];

  const matched = allClients.filter(c => {
    const statusOk = !selectedStatuses.length || selectedStatuses.includes(c.status);
    const visits   = parseInt(c.visits) || 0;
    const minOk    = preset.min == null || visits >= preset.min;
    const maxOk    = preset.max == null || visits <= preset.max;
    return statusOk && minOk && maxOk;
  });

  const toggleStatus = s => setSelectedStatuses(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  );

  const handleDelete = async () => {
    if (!matched.length) return;
    setBusy(true);
    setErr("");
    try {
      const count = await deleteClientsByFilter({
        statuses:  selectedStatuses,
        minVisits: preset.min,
        maxVisits: preset.max,
      });
      setDone(count);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()} className="card" style={{ padding: 32, maxWidth: 520, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "#fef2f2", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="group_remove" size={20} style={{ color: C.error }} />
            </div>
            <div>
              <h2 style={{ fontFamily: "Geist", fontSize: 17, fontWeight: 600, color: C.primary }}>Client Cleanup</h2>
              <p style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>Filter and permanently delete client records</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8 }}
            onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
            onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
            <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
          </button>
        </div>

        {done != null ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 56, height: 56, background: "#dcfce7", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="check_circle" size={28} style={{ color: "#166534" }} />
            </div>
            <p style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary, marginBottom: 6 }}>
              {done} client{done !== 1 ? "s" : ""} deleted
            </p>
            <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginBottom: 24 }}>The records have been permanently removed.</p>
            <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 12, background: C.primary, color: "#fff", fontFamily: "Geist", fontSize: 13, fontWeight: 600 }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 22 }}>
              <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 10 }}>
                Filter by Status <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(leave blank = all statuses)</span>
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map(s => {
                  const active = selectedStatuses.includes(s);
                  const sc = STATUS_COLORS[s];
                  return (
                    <button key={s} onClick={() => toggleStatus(s)} style={{ padding: "7px 16px", borderRadius: 999, background: active ? sc.bg : C.surfaceLow, color: active ? sc.color : C.onSurfaceVariant, border: `1.5px solid ${active ? sc.bg : C.outlineVariant + "50"}`, fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
                      {active && <Icon name="check" size={14} style={{ color: sc.color }} />}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 10 }}>Filter by Visit Count</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {VISIT_PRESETS.map((p, i) => (
                  <button key={p.label} onClick={() => setVisitPreset(i)} style={{ padding: "7px 16px", borderRadius: 999, background: visitPreset === i ? C.primary : C.surfaceLow, color: visitPreset === i ? "#fff" : C.onSurfaceVariant, border: `1.5px solid ${visitPreset === i ? C.primary : C.outlineVariant + "50"}`, fontFamily: "Geist", fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: matched.length ? "#fef2f2" : C.surfaceLow, border: `1px solid ${matched.length ? C.error + "30" : C.outlineVariant + "30"}`, borderRadius: 14, padding: "14px 18px", marginBottom: 22, display: "flex", alignItems: "center", gap: 14 }}>
              <Icon name={matched.length ? "person_remove" : "person_search"} size={22} style={{ color: matched.length ? C.error : C.onSurfaceVariant, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 600, color: matched.length ? C.error : C.onSurfaceVariant }}>
                  {matched.length} client{matched.length !== 1 ? "s" : ""} will be deleted
                </p>
                {matched.length > 0 && (
                  <p style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>
                    {[...new Set(matched.map(c => c.status))].join(", ")} · out of {allClients.length} total clients
                  </p>
                )}
              </div>
              {matched.length > 0 && <span style={{ fontFamily: "Geist", fontSize: 22, fontWeight: 700, color: C.error }}>{matched.length}</span>}
            </div>
            {matched.length > 0 && (
              <div style={{ marginBottom: 20, maxHeight: 140, overflowY: "auto" }} className="scrollbar-thin">
                {matched.slice(0, 5).map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.outlineVariant}20` }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.surfaceHigh, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Geist", fontSize: 11, fontWeight: 700, color: C.onSurfaceVariant, flexShrink: 0 }}>
                      {c.initials ?? c.name?.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 500, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                      <p style={{ fontSize: 11, color: C.onSurfaceVariant }}>{c.visits ?? 0} visits · {c.spent ?? "₱0"}</p>
                    </div>
                    <span style={{ background: STATUS_COLORS[c.status]?.bg ?? C.surfaceLow, color: STATUS_COLORS[c.status]?.color ?? C.onSurfaceVariant, padding: "2px 10px", borderRadius: 999, fontSize: 10, fontFamily: "Geist", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>
                      {c.status}
                    </span>
                  </div>
                ))}
                {matched.length > 5 && <p style={{ fontSize: 12, color: C.onSurfaceVariant, paddingTop: 8, textAlign: "center" }}>…and {matched.length - 5} more</p>}
              </div>
            )}
            {err && <p style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>{err}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <SecondaryBtn onClick={onClose} disabled={busy}>Cancel</SecondaryBtn>
              <button onClick={handleDelete} disabled={busy || !matched.length} style={{ padding: "10px 20px", borderRadius: 12, background: (!matched.length || busy) ? C.outlineVariant : C.error, color: "#fff", fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8, opacity: (!matched.length || busy) ? 0.6 : 1, transition: "all 0.15s" }}>
                {busy && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
                {busy ? "Deleting…" : `Delete ${matched.length} Client${matched.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ── Default shop settings ───────────────────────────────────────────────── */
const DEFAULT_SHOP = {
  name:     "The Parlour",
  tagline:  "Premium Grooming Lounge",
  email:    "admin@theparlour.com",
  phone:    "+1 (555) 800-0001",
  address:  "128 Meridian Ave, Suite 4, New York, NY 10001",
  currency: "PHP",
  timezone: "Asia/Manila",
};

const DEFAULT_NOTIFS = {
  lowStock:      true,
  newSale:       true,
  dailySummary:  false,
  weeklySummary: true,
};

/* ── Page ────────────────────────────────────────────────────────────────── */
const SettingsPage = ({ onDarkModeChange, onCompactNavChange }) => {
  const isMobile = useIsMobile();
  const { settings, loading: settingsLoading } = useSettings();

  const [shop,      setShop]      = useState(DEFAULT_SHOP);
  const [notifs,    setNotifs]    = useState(DEFAULT_NOTIFS);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [darkMode,   setDarkMode]   = useState(false);
  const [compactNav, setCompactNav] = useState(false);

  // Staff list — now also seeded from Firestore users collection
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);

  // Load real staff from Firestore users collection on mount
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        if (!snap.empty) {
          const fromFirestore = snap.docs.map(d => ({
            id:       d.id,
            name:     d.data().name     ?? "Unknown",
            email:    d.data().email    ?? "",
            role:     d.data().role === "admin" ? "Administrator" : (d.data().jobTitle ?? "Barber"),
            appRole:  d.data().role     ?? "barber",
            status:   d.data().status   ?? "Active",
          }));
          setStaff(fromFirestore);
        }
      } catch {
        // Firestore unavailable — fall back to defaults from settings
      } finally {
        setStaffLoading(false);
      }
    };
    loadStaff();
  }, []);

  // Hydrate other settings from Firestore once loaded
  useEffect(() => {
    if (!settings) return;
    if (settings.shop)           setShop(s          => ({ ...s, ...settings.shop, currency: "PHP", timezone: "Asia/Manila" }));
    if (settings.notifs)         setNotifs(n        => ({ ...n,          ...settings.notifs }));
    if (settings.twoFactor     != null) setTwoFactor(settings.twoFactor);
    if (settings.sessionTimeout != null) setSessionTimeout(settings.sessionTimeout);
    if (settings.darkMode      != null) { setDarkMode(settings.darkMode);   onDarkModeChange?.(settings.darkMode); }
    if (settings.compactNav    != null) { setCompactNav(settings.compactNav); onCompactNavChange?.(settings.compactNav); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const [savedSnapshot, setSavedSnapshot] = useState(null);

  const handleDiscard = () => {
    if (!savedSnapshot) return;
    setShop(savedSnapshot.shop);
    setNotifs(savedSnapshot.notifs);
    setTwoFactor(savedSnapshot.twoFactor);
    setSessionTimeout(savedSnapshot.sessionTimeout);
    const dm = savedSnapshot.darkMode;
    const cn = savedSnapshot.compactNav;
    setDarkMode(dm);   onDarkModeChange?.(dm);
    setCompactNav(cn); onCompactNavChange?.(cn);
  };

  const setShopField = useCallback((k) => (e) => setShop(s => ({ ...s, [k]: e.target.value })), []);
  const toggleNotif  = useCallback((k) => () => setNotifs(n => ({ ...n, [k]: !n[k] })), []);

  const handleDarkToggle = () => {
    const next = !darkMode;
    setDarkMode(next);
    onDarkModeChange?.(next);
  };

  const handleCompactToggle = () => {
    const next = !compactNav;
    setCompactNav(next);
    onCompactNavChange?.(next);
  };

  const [saveState, setSaveState] = useState("idle");
  const handleSave = async () => {
    setSaveState("saving");
    const payload = { shop: { ...shop, currency: "PHP", timezone: "Asia/Manila" }, notifs, twoFactor, sessionTimeout, darkMode, compactNav };
    try {
      await saveSettings(payload);
      setSavedSnapshot(payload);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const [editingStaff,      setEditingStaff]      = useState(null);
  const [showCreate,        setShowCreate]        = useState(false);
  const [showClientCleanup, setShowClientCleanup] = useState(false);
  const [confirm,           setConfirm]           = useState(null);

  const handleStaffSave = updated => {
    setStaff(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const handleAccountCreated = newAccount => {
    setStaff(prev => [...prev, {
      id:      newAccount.uid,
      name:    newAccount.name,
      email:   newAccount.email,
      role:    newAccount.role === "admin" ? "Administrator" : (newAccount.jobTitle ?? "Barber"),
      appRole: newAccount.role,
      status:  "Active",
    }]);
  };

  if (settingsLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: C.onSurfaceVariant, fontFamily: "Geist", fontSize: 14 }}>
        <Icon name="hourglass_empty" size={20} style={{ color: C.onSurfaceVariant, marginRight: 8 }} />
        Loading settings…
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp 0.4s ease", maxWidth: 800 }}>

      {/* ── Shop Information ─────────────────────────────────────────── */}
      <Section title="Shop Information" subtitle="Basic details about your business.">
        <Row icon="storefront" label="Shop Name" subtitle="Displayed across the app and receipts">
          <FieldInput value={shop.name} onChange={setShopField("name")} placeholder="Shop name" />
        </Row>
        <Row icon="sell" label="Tagline" subtitle="Short descriptor shown on login screen">
          <FieldInput value={shop.tagline} onChange={setShopField("tagline")} placeholder="e.g. Premium Grooming Lounge" />
        </Row>
        <Row icon="mail" label="Business Email" subtitle="Used for system notifications">
          <FieldInput value={shop.email} onChange={setShopField("email")} type="email" placeholder="admin@yourshop.com" />
        </Row>
        <Row icon="phone" label="Phone Number">
          <FieldInput value={shop.phone} onChange={setShopField("phone")} placeholder="+1 (555) 000-0000" />
        </Row>
        <Row icon="location_on" label="Address">
          <FieldInput value={shop.address} onChange={setShopField("address")} placeholder="Street, City, State" />
        </Row>
        <Row icon="language" label="Timezone" subtitle="Fixed to Philippine Standard Time">
          <div style={{ padding: "9px 14px", background: C.surfaceLow, border: `1px solid ${C.outlineVariant}40`, borderRadius: 10, fontFamily: "Inter", fontSize: 13, color: C.onSurfaceVariant, display: "flex", alignItems: "center", gap: 8, userSelect: "none" }}>
            <span style={{ color: C.onSurface, fontWeight: 500 }}>Asia/Manila</span>
            <span style={{ background: C.surfaceHigh, color: C.secondary, padding: "2px 8px", borderRadius: 999, fontSize: 10, fontFamily: "Geist", fontWeight: 700, letterSpacing: "0.08em" }}>PH TIME</span>
          </div>
        </Row>
        <Row icon="attach_money" label="Currency" subtitle="Fixed to Philippine Peso" last>
          <div style={{ padding: "9px 14px", background: C.surfaceLow, border: `1px solid ${C.outlineVariant}40`, borderRadius: 10, fontFamily: "Inter", fontSize: 13, color: C.onSurfaceVariant, display: "flex", alignItems: "center", gap: 8, userSelect: "none" }}>
            <span style={{ color: C.onSurface, fontWeight: 500 }}>PHP</span>
            <span style={{ background: C.surfaceHigh, color: C.secondary, padding: "2px 8px", borderRadius: 999, fontSize: 10, fontFamily: "Geist", fontWeight: 700, letterSpacing: "0.08em" }}>₱ PESO</span>
          </div>
        </Row>
      </Section>

      {/* ── Staff Accounts ───────────────────────────────────────────── */}
      <Section title="Staff Accounts" subtitle="All accounts are managed via Firebase Authentication.">
        {staffLoading ? (
          <div style={{ padding: "24px 28px", color: C.onSurfaceVariant, fontSize: 13, fontFamily: "Geist", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="hourglass_empty" size={16} style={{ color: C.onSurfaceVariant }} />
            Loading accounts…
          </div>
        ) : staff.length === 0 ? (
          <div style={{ padding: "24px 28px", color: C.onSurfaceVariant, fontSize: 13, fontFamily: "Geist" }}>
            No accounts found. Create your first staff account below.
          </div>
        ) : (
          staff.map((s, i) => (
            <Row
              key={s.id ?? s.email}
              icon="person"
              label={s.name}
              subtitle={`${s.role} · ${s.email}`}
              last={i === staff.length - 1}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <LocalBadge
                  label={s.appRole === "admin" ? "Admin" : "Barber"}
                  color={s.appRole === "admin" ? C.primary : C.secondary}
                  bg={s.appRole === "admin" ? C.surfaceHigh : C.secondaryContainer}
                />
                <button
                  onClick={() => setEditingStaff(s)}
                  style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.outlineVariant}`, fontFamily: "Geist", fontSize: 11, fontWeight: 600, color: C.onSurfaceVariant, letterSpacing: "0.06em" }}
                  onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
                  onMouseOut={e => (e.currentTarget.style.background = "transparent")}
                >
                  Edit
                </button>
              </div>
            </Row>
          ))
        )}
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${C.outlineVariant}20` }}>
          <PrimaryBtn icon="person_add" onClick={() => setShowCreate(true)}>Create Account</PrimaryBtn>
        </div>
      </Section>

      {/* ── Notifications ────────────────────────────────────────────── */}
      <Section title="Notifications" subtitle="Choose what alerts you receive.">
        <Row icon="warning" label="Low Stock Alerts" subtitle="Notify when inventory drops below threshold">
          <Toggle on={notifs.lowStock} onToggle={toggleNotif("lowStock")} />
        </Row>
        <Row icon="receipt" label="New Sale" subtitle="Alert for every completed transaction">
          <Toggle on={notifs.newSale} onToggle={toggleNotif("newSale")} />
        </Row>
        <Row icon="today" label="Daily Summary" subtitle="End-of-day revenue and booking recap">
          <Toggle on={notifs.dailySummary} onToggle={toggleNotif("dailySummary")} />
        </Row>
        <Row icon="date_range" label="Weekly Report" subtitle="Sent every Monday morning" last>
          <Toggle on={notifs.weeklySummary} onToggle={toggleNotif("weeklySummary")} />
        </Row>
      </Section>

      {/* ── Security ─────────────────────────────────────────────────── */}
      <Section title="Security" subtitle="Control access and authentication settings.">
        <Row icon="lock" label="Two-Factor Authentication" subtitle={twoFactor ? "Enabled — via authenticator app" : "Add an extra layer of login security"}>
          <Toggle on={twoFactor} onToggle={() => setTwoFactor(v => !v)} />
        </Row>
        <Row icon="timer" label="Session Timeout" subtitle="Auto-logout after inactivity" last>
          <select
            value={sessionTimeout}
            onChange={e => setSessionTimeout(e.target.value)}
            style={{ padding: "9px 14px", background: C.surfaceLow, border: `1px solid ${C.outlineVariant}40`, borderRadius: 10, fontFamily: "Inter", fontSize: 13, color: C.onSurface }}
          >
            {[["15","15 minutes"],["30","30 minutes"],["60","1 hour"],["120","2 hours"],["0","Never"]].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Row>
      </Section>

      {/* ── Display ──────────────────────────────────────────────────── */}
      <Section title="Display" subtitle="Personalise how the app looks.">
        <Row icon="dark_mode" label="Dark Mode" subtitle="Switch to a darker colour scheme">
          <Toggle on={darkMode} onToggle={handleDarkToggle} />
        </Row>
        <Row icon="view_sidebar" label="Compact Sidebar" subtitle="Start with sidebar collapsed by default" last>
          <Toggle on={compactNav} onToggle={handleCompactToggle} />
        </Row>
      </Section>

      {/* ── Danger Zone ──────────────────────────────────────────────── */}
      <Section title="Danger Zone" subtitle="Irreversible actions — proceed with caution.">
        <Row icon="delete_forever" label="Clear All Transactions" subtitle="Permanently removes all transaction and stock movement history">
          <button
            onClick={() => setConfirm({ title: "Clear All Transactions?", message: "This will permanently delete all transaction records and stock movement history. This cannot be undone.", confirmLabel: "Yes, Clear All", action: clearAllTransactions })}
            style={{ padding: "8px 16px", borderRadius: 10, background: "#fef2f2", color: C.error, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Clear
          </button>
        </Row>
        <Row icon="reset_wrench" label="Reset Inventory" subtitle="Sets all product stock quantities to zero">
          <button
            onClick={() => setConfirm({ title: "Reset Inventory?", message: "This will set the stock quantity of every product to zero and mark them all as out-of-stock. This cannot be undone.", confirmLabel: "Yes, Reset", action: resetInventoryStock })}
            style={{ padding: "8px 16px", borderRadius: 10, background: "#fef2f2", color: C.error, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Reset
          </button>
        </Row>
        <Row icon="group_remove" label="Delete Clients" subtitle="Permanently remove client records by status or visit count" last>
          <button
            onClick={() => setShowClientCleanup(true)}
            style={{ padding: "8px 16px", borderRadius: 10, background: "#fef2f2", color: C.error, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Manage
          </button>
        </Row>
      </Section>

      {/* ── Save Bar ─────────────────────────────────────────────────── */}
      <div style={{ position: "sticky", bottom: isMobile ? 16 : 32, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, background: C.surface, padding: "16px 0" }}>
        {saveState === "saved" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#166534", fontSize: 13, fontFamily: "Geist", fontWeight: 500 }}>
            <Icon name="check_circle" size={16} style={{ color: "#166534" }} />
            Saved successfully
          </div>
        )}
        {saveState === "error" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.error, fontSize: 13, fontFamily: "Geist", fontWeight: 500 }}>
            <Icon name="error" size={16} style={{ color: C.error }} />
            Save failed — try again
          </div>
        )}
        <SecondaryBtn onClick={handleDiscard} disabled={saveState === "saving"}>Discard</SecondaryBtn>
        <PrimaryBtn icon={saveState === "saving" ? "hourglass_empty" : "save"} onClick={handleSave} disabled={saveState === "saving"}>
          {saveState === "saving" ? "Saving…" : "Save Changes"}
        </PrimaryBtn>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {editingStaff && (
        <StaffEditModal
          member={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSave={handleStaffSave}
        />
      )}

      {showCreate && (
        <CreateAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={handleAccountCreated}
        />
      )}

      {showClientCleanup && (
        <ClientCleanupModal onClose={() => setShowClientCleanup(false)} />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.action}
          onClose={() => setConfirm(null)}
          danger
        />
      )}

    </div>
  );
};

export default SettingsPage;