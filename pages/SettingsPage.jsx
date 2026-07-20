import { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../tokens/design";
import { Icon, PrimaryBtn, SecondaryBtn } from "../components/ui";
import useIsMobile from "../hooks/useIsMobile";
import useScrollLock from "../hooks/useScrollLock";
import { useSettingsContext } from "../context/useSettingsContext";
import {
  saveSettings,
  deleteClientsByFilter, useClients,
  addStylist, updateStylist, deleteStylist,
  wipeData,
} from "../hooks/useFirestore";
import { requestNotifPermission, getNotifPermission } from "../hooks/useNotification";
import { useTOTPStatus, startTOTPEnrollment, finishTOTPEnrollment, unenrollTOTP } from "../hooks/useTOTP";

// Firebase — used only for account creation
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

/* ── Shared primitives ───────────────────────────────────────────────────── */
const Section = ({ title, subtitle, children }) => (
  <div style={{ marginBottom: 40, breakInside: "avoid", WebkitColumnBreakInside: "avoid" }}>
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
      width: 260, maxWidth: "100%",
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
  useScrollLock();
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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}
    >
      <div className="card" style={{ padding: 32, maxWidth: 420, width: "100%", margin: "auto" }}>
        <div style={{ width: 48, height: 48, background: danger ? "var(--c-error-container)" : C.surfaceLow, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
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
            style={{ padding: "10px 20px", borderRadius: 12, background: busy ? C.outlineVariant : (danger ? C.error : C.primary), color: busy ? C.onSurfaceVariant : (danger ? C.onError : C.onPrimary), fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8, opacity: busy ? 0.7 : 1 }}
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
  useScrollLock();
  const [form, setForm] = useState({ name: member.name, role: member.role, email: member.email, phone: member.phone ?? "", status: member.status, appRole: member.appRole ?? "barber" });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async () => {
    setBusy(true);
    setErr("");
    try {
      await onSave({ ...member, ...form });
      onClose();
    } catch (e) {
      setErr(e.message || "Failed to save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div className="card" style={{ padding: 32, maxWidth: 500, width: "100%", margin: "auto" }}>
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
          <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Email (login username)</label>
          <input style={{ ...staffInputStyle, background: C.surfaceHigh, color: C.onSurfaceVariant, cursor: "not-allowed" }} type="email" value={form.email} disabled readOnly />
          <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 6, lineHeight: 1.5 }}>
            This is also this person's login username. It can only be changed by that person themselves, from their Profile → Account Security (requires re-entering their password). Editing it here would not update their actual login or where "Forgot password" sends the reset link.
          </p>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>Phone Number</label>
          <input style={staffInputStyle} type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={set("phone")} />
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
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>App Access</label>
          <select style={{ ...staffInputStyle, appearance: "none" }} value={form.appRole} onChange={set("appRole")}>
            <option value="barber">Barber — clients, stylists, appointments only</option>
            <option value="admin">Admin — full access (inventory, transactions, reports)</option>
          </select>
          <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 6, lineHeight: 1.5 }}>
            Controls what this account can see and edit in the app. Takes effect next time they log in.
          </p>
        </div>
        {err && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--c-error-container)", borderRadius: 10, marginBottom: 8 }}>
            <Icon name="error" size={16} style={{ color: C.error, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: C.error }}>{err}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={handle} icon={busy ? "hourglass_empty" : "check"} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
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
  useScrollLock();
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

      // Auto-create a stylist card whenever a barber account is created
      if (form.appRole === "barber") {
        const initials = form.name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
        await addStylist({
          uid,
          name:        form.name.trim(),
          email:       form.email.trim().toLowerCase(),
          role:        form.jobTitle,
          status:      "Active",
          specialties: [],
          bookings:    0,
          revenue:     "₱0",
          initials,
        });
      }

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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div className="card" style={{ padding: 32, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto", margin: "auto" }}>

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
          (() => {
            const isAdmin    = form.appRole === "admin";
            const badgeBg    = isAdmin ? C.secondaryContainer : C.surfaceHigh;
            const badgeColor = isAdmin ? C.secondary : C.onSurfaceVariant;
            const roleLabel  = isAdmin ? "Admin" : form.jobTitle || "Barber";
            return (
              <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                <div style={{ width: 56, height: 56, background: "var(--badge-success-bg)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Icon name="check_circle" size={28} style={{ color: "var(--badge-success-fg)" }} />
                </div>
                <p style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary, marginBottom: 6 }}>Account created!</p>
                <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginBottom: 8 }}>
                  <strong>{form.name}</strong> can now log in with <strong>{form.email}</strong>
                </p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: badgeBg, borderRadius: 999, marginBottom: 24 }}>
                  <Icon name="verified_user" size={14} style={{ color: badgeColor }} />
                  <span style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: badgeColor }}>
                    {roleLabel} access
                  </span>
                </div>
                <br />
                <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 12, background: C.primary, color: C.onPrimary, fontFamily: "Geist", fontSize: 13, fontWeight: 600 }}>
                  Done
                </button>
              </div>
            );
          })()
        ) : (
          <>


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
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--c-error-container)", borderRadius: 10, marginBottom: 16 }}>
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
  useScrollLock();
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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}
    >
      <div className="card" style={{ padding: 32, maxWidth: 520, width: "100%", margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "var(--c-error-container)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
            <div style={{ width: 56, height: 56, background: "var(--badge-success-bg)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="check_circle" size={28} style={{ color: "var(--badge-success-fg)" }} />
            </div>
            <p style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary, marginBottom: 6 }}>
              {done} client{done !== 1 ? "s" : ""} deleted
            </p>
            <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginBottom: 24 }}>The records have been permanently removed.</p>
            <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 12, background: C.primary, color: C.onPrimary, fontFamily: "Geist", fontSize: 13, fontWeight: 600 }}>
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
                  <button key={p.label} onClick={() => setVisitPreset(i)} style={{ padding: "7px 16px", borderRadius: 999, background: visitPreset === i ? C.primary : C.surfaceLow, color: visitPreset === i ? C.onPrimary : C.onSurfaceVariant, border: `1.5px solid ${visitPreset === i ? C.primary : C.outlineVariant + "50"}`, fontFamily: "Geist", fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: matched.length ? "var(--c-error-container)" : C.surfaceLow, border: `1px solid ${matched.length ? C.error + "30" : C.outlineVariant + "30"}`, borderRadius: 14, padding: "14px 18px", marginBottom: 22, display: "flex", alignItems: "center", gap: 14 }}>
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
              <button onClick={handleDelete} disabled={busy || !matched.length} style={{ padding: "10px 20px", borderRadius: 12, background: (!matched.length || busy) ? C.outlineVariant : C.error, color: (!matched.length || busy) ? C.onSurfaceVariant : C.onError, fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8, opacity: (!matched.length || busy) ? 0.6 : 1, transition: "all 0.15s" }}>
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

/* ── Data Wipe Modal ─────────────────────────────────────────────────────── */
const WIPE_CATEGORIES = [
  { key: "sales",     label: "Sales & Transactions", icon: "receipt_long", desc: "Every transaction record — amounts, barbers, clients, dates." },
  { key: "reports",   label: "Reports & Stock Logs", icon: "assessment",   desc: "Stock movement / audit history that feeds the Reports page." },
  { key: "inventory", label: "Inventory",            icon: "inventory_2",  desc: "All products, prices, and stock levels." },
  { key: "clients",   label: "Client Data",          icon: "group",        desc: "Every client profile, visit count, and spend history." },
];

const DataWipeModal = ({ onClose }) => {
  useScrollLock();
  const [selected, setSelected] = useState([]);
  const [typed,    setTyped]    = useState("");
  const [busy,     setBusy]     = useState(false);
  const [done,     setDone]     = useState(null);
  const [err,      setErr]      = useState("");

  const allSelected = selected.length === WIPE_CATEGORIES.length;
  const toggle = key => setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const toggleAll = () => setSelected(allSelected ? [] : WIPE_CATEGORIES.map(c => c.key));

  const confirmed = typed.trim() === "DELETE";

  const handleWipe = async () => {
    if (!selected.length || !confirmed) return;
    setBusy(true);
    setErr("");
    try {
      const results = await wipeData(selected);
      setDone(results);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}
    >
      <div className="card" style={{ padding: 32, maxWidth: 520, width: "100%", margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "var(--c-error-container)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="delete_forever" size={20} style={{ color: C.error }} />
            </div>
            <div>
              <h2 style={{ fontFamily: "Geist", fontSize: 17, fontWeight: 600, color: C.primary }}>Data Wipe</h2>
              <p style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>Permanently erase selected data — this cannot be undone</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8 }}
            onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
            onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
            <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 56, height: 56, background: "var(--badge-success-bg)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="check_circle" size={28} style={{ color: "var(--badge-success-fg)" }} />
            </div>
            <p style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary, marginBottom: 10 }}>Data wiped successfully</p>
            <div style={{ textAlign: "left", background: C.surfaceLow, borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
              {Object.entries(done).map(([cat, count]) => (
                <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                  <span style={{ color: C.onSurfaceVariant }}>{WIPE_CATEGORIES.find(c => c.key === cat)?.label ?? cat}</span>
                  <span style={{ fontFamily: "Geist", fontWeight: 600, color: C.primary }}>{count} deleted</span>
                </div>
              ))}
            </div>
            <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 12, background: C.primary, color: C.onPrimary, fontFamily: "Geist", fontSize: 13, fontWeight: 600 }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant }}>Select data to wipe</p>
              <button onClick={toggleAll} style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 600, color: C.secondary }}>
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div style={{ marginBottom: 22 }}>
              {WIPE_CATEGORIES.map(cat => {
                const active = selected.includes(cat.key);
                return (
                  <button key={cat.key} onClick={() => toggle(cat.key)} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 14, textAlign: "left",
                    padding: "12px 14px", borderRadius: 12, marginBottom: 8,
                    background: active ? C.errorContainer : C.surfaceLow,
                    border: `1.5px solid ${active ? C.error + "50" : C.outlineVariant + "30"}`,
                    transition: "all 0.15s",
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${active ? C.error : C.outlineVariant}`, background: active ? C.error : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {active && <Icon name="check" size={13} style={{ color: C.onError }} />}
                    </div>
                    <Icon name={cat.icon} size={18} style={{ color: active ? C.error : C.onSurfaceVariant, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: active ? C.error : C.primary }}>{cat.label}</p>
                      <p style={{ fontSize: 11, color: C.onSurfaceVariant, marginTop: 1 }}>{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {selected.length > 0 && (
              <div style={{ background: C.errorContainer, border: `1px solid ${C.error}30`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                <p style={{ fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.error, marginBottom: 8 }}>
                  TYPE <span style={{ fontFamily: "monospace", background: `${C.error}15`, padding: "1px 6px", borderRadius: 4 }}>DELETE</span> TO CONFIRM
                </p>
                <input
                  autoFocus
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  placeholder="DELETE"
                  style={{ width: "100%", padding: "9px 14px", background: C.surfaceLowest, color: C.onSurface, border: `1px solid ${confirmed ? C.error : C.outlineVariant}50`, borderRadius: 10, fontFamily: "monospace", fontSize: 14, letterSpacing: "0.06em", boxSizing: "border-box" }}
                />
              </div>
            )}

            {err && <p style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>{err}</p>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <SecondaryBtn onClick={onClose} disabled={busy}>Cancel</SecondaryBtn>
              <button
                onClick={handleWipe}
                disabled={busy || !selected.length || !confirmed}
                style={{
                  padding: "10px 20px", borderRadius: 12,
                  background: (!selected.length || !confirmed || busy) ? C.outlineVariant : C.error,
                  color: (!selected.length || !confirmed || busy) ? C.onSurfaceVariant : C.onError, fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em",
                  display: "flex", alignItems: "center", gap: 8,
                  opacity: (!selected.length || !confirmed || busy) ? 0.6 : 1,
                }}
              >
                {busy && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
                {busy ? "Wiping…" : `Wipe ${selected.length || ""} Selected`}
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
  name:          "Jake Barber Studio",
  tagline:       "Cut Safe · Cut Right",
  email:         "admin@theparlour.com",
  phone:         "+1 (555) 800-0001",
  address:       "128 Meridian Ave, Suite 4, New York, NY 10001",
  currency:      "PHP",
  timezone:      "Asia/Manila",
  monthlyTarget: "20000",
};

const DEFAULT_NOTIFS = {
  lowStock:        true,
  newSale:         true,
  dailySummary:    false,
  weeklySummary:   true,
  holidayReminder: true,
};

/* ── Page ────────────────────────────────────────────────────────────────── */
/* ── TOTP Setup Modal ────────────────────────────────────────────────────── */
/**
 * Guides the admin through:
 *  1. Enter current password (Firebase re-auth requirement)
 *  2. Scan QR code with authenticator app
 *  3. Verify the 6-digit code
 */
const TOTPSetupModal = ({ onClose }) => {
  useScrollLock();
  const [step,     setStep]     = useState("password"); // "password" | "qr" | "verify" | "done"
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [code,     setCode]     = useState("");
  const [secret,   setSecret]   = useState(null);
  const [qrUri,    setQrUri]    = useState("");
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState("");

  // Step 1 — re-auth + generate secret
  const handlePassword = async () => {
    if (!password) { setErr("Enter your current password to continue."); return; }
    setBusy(true); setErr("");
    try {
      const result = await startTOTPEnrollment(password);
      setSecret(result.secret);
      setQrUri(result.qrUri);
      setStep("qr");
    } catch (e) {
      const msgs = {
        "auth/wrong-password":        "Incorrect password.",
        "auth/invalid-credential":    "Incorrect password.",
        "auth/too-many-requests":     "Too many attempts. Wait a moment.",
        "auth/requires-recent-login": "Session expired — log out and back in first.",
      };
      setErr(msgs[e.code] || e.message);
    } finally {
      setBusy(false);
    }
  };

  // Step 3 — verify code
  const handleVerify = async () => {
    const trimmed = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(trimmed)) { setErr("Enter the 6-digit code from your app."); return; }
    setBusy(true); setErr("");
    try {
      await finishTOTPEnrollment(secret, trimmed);
      setStep("done");
    } catch (e) {
      const msgs = {
        "auth/invalid-verification-code": "Incorrect code — check your app and try again.",
        "auth/code-expired":              "Code expired. Wait for a new one.",
      };
      setErr(msgs[e.code] || e.message);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px",
    background: C.surfaceLow,
    border: `1px solid ${C.outlineVariant}40`,
    borderRadius: 10,
    fontFamily: "Inter", fontSize: 14, color: C.onSurface,
    boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div className="card" style={{ padding: 32, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", margin: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: C.surfaceLow, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="security" size={20} style={{ color: C.primary }} />
            </div>
            <div>
              <h2 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 500, color: C.primary }}>Set Up 2FA</h2>
              <p style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>
                {step === "password" ? "Step 1 of 3 — Verify identity" :
                 step === "qr"       ? "Step 2 of 3 — Scan QR code" :
                 step === "verify"   ? "Step 3 of 3 — Confirm code" : "Done"}
              </p>
            </div>
          </div>
          {step !== "done" && (
            <button onClick={onClose} style={{ padding: 6, borderRadius: 8 }}
              onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
              onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
              <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
            </button>
          )}
        </div>

        {/* Step 1 — password */}
        {step === "password" && (
          <>
            <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginBottom: 20, lineHeight: 1.6 }}>
              Enter your current password to verify your identity before enabling two-factor authentication.
            </p>
            <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 8 }}>Current Password</label>
            <div style={{ position: "relative" }}>
              <input style={{ ...inputStyle, paddingRight: 44 }} type={showPw ? "text" : "password"} placeholder="Your current password" value={password}
                onChange={e => { setPassword(e.target.value); setErr(""); }}
                onKeyDown={e => e.key === "Enter" && handlePassword()} autoFocus />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", borderRadius: 8 }}
              >
                <Icon name={showPw ? "visibility_off" : "visibility"} size={18} style={{ color: C.onSurfaceVariant }} />
              </button>
            </div>
            {err && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--c-error-container)", borderRadius: 10, marginTop: 12 }}>
                <Icon name="error" size={16} style={{ color: C.error, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.error }}>{err}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <SecondaryBtn onClick={onClose} disabled={busy}>Cancel</SecondaryBtn>
              <PrimaryBtn onClick={handlePassword} icon={busy ? "hourglass_empty" : "arrow_forward"} disabled={busy}>
                {busy ? "Verifying…" : "Continue"}
              </PrimaryBtn>
            </div>
          </>
        )}

        {/* Step 2 — QR code */}
        {step === "qr" && (
          <>
            <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginBottom: 20, lineHeight: 1.6 }}>
              Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app.
              Then click <em>Next</em> to enter the confirmation code.
            </p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              {/* Use Google Charts API to render QR — no extra dependency */}
              <img
                src={`https://chart.googleapis.com/chart?cht=qr&chs=220x220&chl=${encodeURIComponent(qrUri)}&choe=UTF-8`}
                alt="TOTP QR code"
                width={220} height={220}
                style={{ borderRadius: 12, background: "#fff", padding: 8 }}
              />
            </div>
            <p style={{ fontSize: 11, color: C.onSurfaceVariant, textAlign: "center", marginBottom: 20 }}>
              Can't scan? Open your authenticator app and enter the code manually.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <SecondaryBtn onClick={() => setStep("password")}>Back</SecondaryBtn>
              <PrimaryBtn onClick={() => setStep("verify")} icon="arrow_forward">Next</PrimaryBtn>
            </div>
          </>
        )}

        {/* Step 3 — verify code */}
        {step === "verify" && (
          <>
            <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginBottom: 20, lineHeight: 1.6 }}>
              Enter the 6-digit code currently shown in your authenticator app to confirm setup.
            </p>
            <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 8 }}>Verification Code</label>
            <input
              style={{ ...inputStyle, fontSize: 22, letterSpacing: "0.3em", textAlign: "center" }}
              type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && handleVerify()} autoFocus />
            {err && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--c-error-container)", borderRadius: 10, marginTop: 12 }}>
                <Icon name="error" size={16} style={{ color: C.error, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.error }}>{err}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <SecondaryBtn onClick={() => { setCode(""); setErr(""); setStep("qr"); }} disabled={busy}>Back</SecondaryBtn>
              <PrimaryBtn onClick={handleVerify} icon={busy ? "hourglass_empty" : "check"} disabled={busy || code.length < 6}>
                {busy ? "Verifying…" : "Enable 2FA"}
              </PrimaryBtn>
            </div>
          </>
        )}

        {/* Done */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <div style={{ width: 56, height: 56, background: "var(--badge-success-bg)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="verified_user" size={28} style={{ color: "var(--badge-success-fg)" }} />
            </div>
            <p style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary, marginBottom: 8 }}>2FA is now active</p>
            <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginBottom: 24, lineHeight: 1.6 }}>
              From now on you'll need a code from your authenticator app each time you sign in.
            </p>
            <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 12, background: C.primary, color: C.onPrimary, fontFamily: "Geist", fontSize: 13, fontWeight: 600 }}>
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

/* ── TOTP Remove Modal ───────────────────────────────────────────────────── */
const TOTPRemoveModal = ({ onClose }) => {
  useScrollLock();
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");
  const [done, setDone] = useState(false);

  const handleRemove = async () => {
    setBusy(true); setErr("");
    try {
      await unenrollTOTP();
      setDone(true);
    } catch (e) {
      setErr(e.message || "Failed to remove 2FA. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div className="card" style={{ padding: 32, maxWidth: 420, width: "100%", margin: "auto" }}>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, background: C.surfaceLow, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="lock_open" size={24} style={{ color: C.onSurfaceVariant }} />
            </div>
            <p style={{ fontFamily: "Geist", fontSize: 16, fontWeight: 600, color: C.primary, marginBottom: 8 }}>2FA removed</p>
            <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginBottom: 24 }}>Two-factor authentication has been disabled for this account.</p>
            <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 12, background: C.primary, color: C.onPrimary, fontFamily: "Geist", fontSize: 13, fontWeight: 600 }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ width: 48, height: 48, background: "var(--c-error-container)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Icon name="no_encryption" size={24} style={{ color: C.error }} />
            </div>
            <h3 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 600, color: C.primary, marginBottom: 8 }}>Remove Two-Factor Authentication?</h3>
            <p style={{ fontSize: 14, color: C.onSurfaceVariant, lineHeight: 1.6, marginBottom: 8 }}>
              This will remove the authenticator app requirement from your account. You'll only need your password to sign in.
            </p>
            {err && <p style={{ color: C.error, fontSize: 13, marginBottom: 8 }}>{err}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <SecondaryBtn onClick={onClose} disabled={busy}>Cancel</SecondaryBtn>
              <button onClick={handleRemove} disabled={busy}
                style={{ padding: "10px 20px", borderRadius: 12, background: busy ? C.outlineVariant : C.error, color: busy ? C.onSurfaceVariant : C.onError, fontFamily: "Geist", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8, opacity: busy ? 0.7 : 1 }}>
                {busy && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
                {busy ? "Removing…" : "Remove 2FA"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


const SettingsPage = ({ onDarkModeChange, onCompactNavChange }) => {
  const isMobile = useIsMobile();
  const { settings, loading: settingsLoading } = useSettingsContext();

  // Stable refs so the hydrate useEffect doesn't need these in its dep array
  const onDarkModeChangeRef   = useRef(onDarkModeChange);
  const onCompactNavChangeRef = useRef(onCompactNavChange);
  useEffect(() => { onDarkModeChangeRef.current   = onDarkModeChange;   }, [onDarkModeChange]);
  useEffect(() => { onCompactNavChangeRef.current = onCompactNavChange; }, [onCompactNavChange]);

  const [shop,      setShop]      = useState(DEFAULT_SHOP);
  const [notifs,    setNotifs]    = useState(DEFAULT_NOTIFS);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [darkMode,   setDarkMode]   = useState(() => {
    try { return localStorage.getItem("darkMode") === "true"; } catch { return false; }
  });
  const [compactNav, setCompactNav] = useState(() => {
    try { return localStorage.getItem("compactNav") === "true"; } catch { return false; }
  });

  // Staff list — now also seeded from Firestore users collection
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffLoadError, setStaffLoadError] = useState(null);

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
            phone:    d.data().phone    ?? "",
            role:     d.data().role === "admin" ? "Administrator" : (d.data().jobTitle ?? "Barber"),
            appRole:  d.data().role     ?? "barber",
            status:   d.data().status   ?? "Active",
          }));
          setStaff(fromFirestore);
        }
      } catch (err) {
        console.error("[SettingsPage] Failed to load staff list:", err);
        setStaffLoadError(err.message || "Failed to load staff accounts.");
      } finally {
        setStaffLoading(false);
      }
    };
    loadStaff();
  }, []);

  // Hydrate other settings from Firestore once loaded.
  // setState calls here are intentional one-time seeding from a remote source,
  // not a reactive loop — safe to suppress the lint rule for this block.
  useEffect(() => {
    if (!settings) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (settings.shop) {
      setShop(s => ({ ...s, ...settings.shop, currency: "PHP", timezone: "Asia/Manila" }));
    }
    if (settings.notifs)                 setNotifs(n => ({ ...n, ...settings.notifs }));
    if (settings.sessionTimeout != null) setSessionTimeout(settings.sessionTimeout);
    if (settings.darkMode != null) {
      setDarkMode(settings.darkMode);
      onDarkModeChangeRef.current?.(settings.darkMode);
      try { localStorage.setItem("darkMode", String(settings.darkMode)); } catch { /* noop */ }
    }
    if (settings.compactNav != null) {
      setCompactNav(settings.compactNav);
      onCompactNavChangeRef.current?.(settings.compactNav);
      try { localStorage.setItem("compactNav", String(settings.compactNav)); } catch { /* noop */ }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [settings]);

  const [savedSnapshot, setSavedSnapshot] = useState(null);

  const handleDiscard = () => {
    if (!savedSnapshot) return;
    setShop(savedSnapshot.shop);
    setNotifs(savedSnapshot.notifs);
    setSessionTimeout(savedSnapshot.sessionTimeout);
    const dm = savedSnapshot.darkMode;
    const cn = savedSnapshot.compactNav;
    setDarkMode(dm);   onDarkModeChange?.(dm);
    setCompactNav(cn); onCompactNavChange?.(cn);
    try { localStorage.setItem("darkMode",  String(dm)); } catch { /* noop */ }
    try { localStorage.setItem("collapsed", String(cn)); } catch { /* noop */ }
  };

  const setShopField = useCallback((k) => (e) => setShop(s => ({ ...s, [k]: e.target.value })), []);

  const handleDarkToggle = () => {
    const next = !darkMode;
    setDarkMode(next);
    onDarkModeChange?.(next);
    try { localStorage.setItem("darkMode", String(next)); } catch { /* noop */ }
  };

  const handleCompactToggle = () => {
    const next = !compactNav;
    setCompactNav(next);
    onCompactNavChange?.(next);
    try { localStorage.setItem("compactNav", String(next)); } catch { /* noop */ }
  };

  // ── Browser notification permission ────────────────────────────────────
  const [notifPermission, setNotifPermission] = useState(getNotifPermission());

  // When any notification toggle is turned ON, request browser permission
  const toggleNotif = useCallback((k) => async () => {
    setNotifs(n => {
      const next = { ...n, [k]: !n[k] };
      // If turning ON, request permission immediately
      if (next[k]) {
        requestNotifPermission().then(result => setNotifPermission(result));
      }
      return next;
    });
  }, []);

  const [saveState, setSaveState] = useState("idle");
  const handleSave = async () => {
    setSaveState("saving");
    const payload = { shop: { ...shop, currency: "PHP", timezone: "Asia/Manila" }, notifs, sessionTimeout, darkMode, compactNav };
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

  const { enrolled: totpEnrolled, loading: totpLoading, refresh: refreshTOTPStatus } = useTOTPStatus();

  const [editingStaff,      setEditingStaff]      = useState(null);
  const [showCreate,        setShowCreate]        = useState(false);
  const [showClientCleanup, setShowClientCleanup] = useState(false);
  const [showDataWipe,      setShowDataWipe]      = useState(false);
  const [showTOTPSetup,     setShowTOTPSetup]     = useState(false);
  const [showTOTPRemove,    setShowTOTPRemove]    = useState(false);
  const [confirm,           setConfirm]           = useState(null);

  const handleStaffSave = async (updated) => {
    // Persist to Firestore users/{uid}
    await updateDoc(doc(db, "users", updated.id), {
      name:     updated.name,
      // email intentionally omitted — it's the person's login username and can
      // only be changed by them via Profile → Account Security (reauth flow),
      // which keeps Firebase Auth and Firestore in sync.
      phone:    updated.phone ?? "",
      jobTitle: updated.role,
      status:   updated.status,
      role:     updated.appRole ?? "barber", // controls Firestore security rule access
    });
    // Also sync the matching stylist card (matched by uid field)
    const stylistSnap = await getDocs(query(collection(db, "stylists"), where("uid", "==", updated.id)));
    if (!stylistSnap.empty) {
      const initials = updated.name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      await Promise.all(stylistSnap.docs.map(d => updateStylist(d.id, {
        name:    updated.name,
        phone:   updated.phone ?? "",
        role:    updated.role,
        status:  updated.status,
        initials,
      })));
    }
    // Update local state only after Firestore confirms
    setStaff(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const handleAccountCreated = newAccount => {
    setStaff(prev => [...prev, {
      id:      newAccount.uid,
      name:    newAccount.name,
      email:   newAccount.email,
      phone:   newAccount.phone ?? "",
      role:    newAccount.role === "admin" ? "Administrator" : (newAccount.jobTitle ?? "Barber"),
      appRole: newAccount.role,
      status:  "Active",
    }]);
  };

  const handleStaffDelete = async (member) => {
    try {
      await deleteDoc(doc(db, "users", member.id));
      const stylistSnap = await getDocs(query(collection(db, "stylists"), where("uid", "==", member.id)));
      if (!stylistSnap.empty) {
        await Promise.all(stylistSnap.docs.map(d => deleteStylist(d.id)));
      }
      setStaff(prev => prev.filter(m => m.id !== member.id));
    } catch (e) {
      console.error("Failed to delete staff member:", e);
    }
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
    <div style={{ animation: "fadeUp 0.4s ease", maxWidth: 1480 }}>
      <div style={{
        columnCount: isMobile ? 1 : 2,
        columnGap: 24,
      }}>

      {/* ── Shop Information ─────────────────────────────────────────── */}
      <Section title="Shop Information" subtitle="Basic details about your business.">
        <Row icon="storefront" label="Shop Name" subtitle="Displayed across the app and receipts">
          <FieldInput value={shop.name} onChange={setShopField("name")} placeholder="Shop name" />
        </Row>
        <Row icon="sell" label="Tagline" subtitle="Short descriptor shown on login screen">
          <FieldInput value={shop.tagline} onChange={setShopField("tagline")} placeholder="e.g. Cut Safe · Cut Right" />
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
        <Row icon="track_changes" label="Monthly Revenue Target" subtitle="Used as the target line in the Revenue Trend chart">
          <FieldInput value={shop.monthlyTarget} onChange={setShopField("monthlyTarget")} placeholder="e.g. 20000" type="number" />
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
        ) : staffLoadError ? (
          <div style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "var(--c-error-container)", borderRadius: 12 }}>
              <Icon name="error" size={18} style={{ color: C.error, flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: C.error }}>Couldn't load staff accounts</p>
                <p style={{ fontFamily: "Geist", fontSize: 11, color: C.error, marginTop: 3, lineHeight: 1.5 }}>{staffLoadError}</p>
                <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 6, lineHeight: 1.5 }}>
                  This is almost always a Firestore Security Rules issue — your signed-in account needs permission to list the <code>users</code> collection.
                </p>
              </div>
            </div>
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
              subtitle={[s.role, s.email, s.phone].filter(Boolean).join(" · ")}
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
                {s.appRole !== "admin" && (
                  <button
                    onClick={() => setConfirm({
                      title: `Delete ${s.name}?`,
                      message: `This will permanently remove ${s.name}'s account and their stylist profile. This cannot be undone.`,
                      confirmLabel: "Delete Account",
                      danger: true,
                      action: () => handleStaffDelete(s),
                    })}
                    style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.error}40`, fontFamily: "Geist", fontSize: 11, fontWeight: 600, color: C.error, letterSpacing: "0.06em" }}
                    onMouseOver={e => (e.currentTarget.style.background = `${C.error}12`)}
                    onMouseOut={e => (e.currentTarget.style.background = "transparent")}
                  >
                    Delete
                  </button>
                )}
              </div>
            </Row>
          ))
        )}
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${C.outlineVariant}20` }}>
          <PrimaryBtn icon="person_add" onClick={() => setShowCreate(true)}>Create Account</PrimaryBtn>
        </div>
      </Section>

      {/* ── Notifications ────────────────────────────────────────────── */}
      <Section title="Notifications" subtitle="Choose what alerts you receive. Alerts are sent as browser notifications.">
        {/* Permission status banner */}
        {notifPermission === "denied" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: "var(--c-error-container)", borderBottom: `1px solid ${C.outlineVariant}20` }}>
            <Icon name="notifications_off" size={18} style={{ color: C.error, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.error }}>Browser notifications blocked</p>
              <p style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>Open your browser's site settings and allow notifications for this site.</p>
            </div>
          </div>
        )}
        {notifPermission === "default" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: `${C.secondary}14`, borderBottom: `1px solid ${C.outlineVariant}20` }}>
            <Icon name="notifications_active" size={18} style={{ color: C.secondary, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 500, color: C.primary }}>Browser permission required</p>
              <p style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>Enable a toggle below — your browser will ask for permission.</p>
            </div>
            <button
              onClick={() => requestNotifPermission().then(r => setNotifPermission(r))}
              style={{ padding: "8px 16px", borderRadius: 10, background: C.secondary, color: C.onSecondary, fontFamily: "Geist", fontSize: 12, fontWeight: 600, flexShrink: 0 }}
            >
              Allow
            </button>
          </div>
        )}
        {notifPermission === "granted" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", background: "var(--badge-success-bg)", borderBottom: `1px solid ${C.outlineVariant}20` }}>
            <Icon name="check_circle" size={16} style={{ color: "var(--badge-success-fg)", flexShrink: 0 }} />
            <p style={{ fontSize: 12, fontFamily: "Geist", color: "var(--badge-success-fg)", fontWeight: 500 }}>Browser notifications are active</p>
          </div>
        )}
        <Row icon="warning" label="Low Stock Alerts" subtitle="Fires when any item drops to ≤ 5 units">
          <Toggle on={notifs.lowStock} onToggle={toggleNotif("lowStock")} />
        </Row>
        <Row icon="receipt" label="New Sale" subtitle="Fires on every completed transaction">
          <Toggle on={notifs.newSale} onToggle={toggleNotif("newSale")} />
        </Row>
        <Row icon="today" label="Daily Summary" subtitle="Fires once per day with revenue total">
          <Toggle on={notifs.dailySummary} onToggle={toggleNotif("dailySummary")} />
        </Row>
        <Row icon="date_range" label="Weekly Report" subtitle="Fires once per week with sales summary">
          <Toggle on={notifs.weeklySummary} onToggle={toggleNotif("weeklySummary")} />
        </Row>
        <Row icon="celebration" label="Holiday & Peak Day Reminders" subtitle="Fires 3 days before a PH holiday or peak season" last>
          <Toggle on={notifs.holidayReminder} onToggle={toggleNotif("holidayReminder")} />
        </Row>
      </Section>

      {/* ── Security ─────────────────────────────────────────────────── */}
      <Section title="Security" subtitle="Control access and authentication settings.">
        <Row
          icon="lock"
          label="Two-Factor Authentication"
          subtitle={
            totpLoading ? "Checking status…"
            : totpEnrolled ? "Active — authenticator app is set up"
            : "Add an extra layer of security at login"
          }
        >
          {totpLoading ? (
            <Icon name="hourglass_empty" size={18} style={{ color: C.onSurfaceVariant }} />
          ) : totpEnrolled ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: "var(--badge-success-bg)", color: "var(--badge-success-fg)", padding: "3px 12px", borderRadius: 999, fontSize: 11, fontFamily: "Geist", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Active</span>
              <button
                onClick={() => setShowTOTPRemove(true)}
                style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.error}40`, fontFamily: "Geist", fontSize: 11, fontWeight: 600, color: C.error, letterSpacing: "0.06em" }}
                onMouseOver={e => (e.currentTarget.style.background = `${C.error}12`)}
                onMouseOut={e => (e.currentTarget.style.background = "transparent")}
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTOTPSetup(true)}
              style={{ padding: "8px 16px", borderRadius: 10, background: C.primary, color: C.onPrimary, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              Set Up
            </button>
          )}
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
        <Row icon="delete_forever" label="Data Wipe" subtitle="Delete all data at once, or pick sales, reports, inventory, or client data individually">
          <button
            onClick={() => setShowDataWipe(true)}
            style={{ padding: "8px 16px", borderRadius: 10, background: "var(--c-error-container)", color: C.error, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Manage
          </button>
        </Row>
        <Row icon="group_remove" label="Delete Clients (Filtered)" subtitle="Permanently remove client records by status or visit count" last>
          <button
            onClick={() => setShowClientCleanup(true)}
            style={{ padding: "8px 16px", borderRadius: 10, background: "var(--c-error-container)", color: C.error, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Manage
          </button>
        </Row>
      </Section>
      </div>

      {/* ── Save Bar ─────────────────────────────────────────────────── */}
      <div style={{ position: "sticky", bottom: isMobile ? 16 : 32, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, background: C.surface, padding: "16px 0" }}>
        {saveState === "saved" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--badge-success-fg)", fontSize: 13, fontFamily: "Geist", fontWeight: 500 }}>
            <Icon name="check_circle" size={16} style={{ color: "var(--badge-success-fg)" }} />
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

      {showDataWipe && (
        <DataWipeModal onClose={() => setShowDataWipe(false)} />
      )}

      {showTOTPSetup && (
        <TOTPSetupModal onClose={() => { setShowTOTPSetup(false); refreshTOTPStatus(); }} />
      )}

      {showTOTPRemove && (
        <TOTPRemoveModal onClose={() => { setShowTOTPRemove(false); refreshTOTPStatus(); }} />
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