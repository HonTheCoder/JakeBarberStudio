import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  updatePassword,
} from "firebase/auth";
import { db, auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useStylists } from "../hooks/useFirestore";
import { C } from "../tokens/design";
import { Icon } from "../components/ui";
import useScrollLock from "../hooks/useScrollLock";
import useIsMobile from "../hooks/useIsMobile";
import { fmt, phpRound, computeCuts, toNum, TIER_DEFAULT_SPLIT } from "../utils/currency";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const todayStr = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const isSameDay = (dateVal) => {
  const d = dateVal?.toDate?.() ?? (dateVal ? new Date(dateVal) : null);
  return d && d.toISOString().slice(0, 10) === todayStr();
};

const isSameWeek = (dateVal) => {
  const d = dateVal?.toDate?.() ?? (dateVal ? new Date(dateVal) : null);
  if (!d) return false;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
};

const isSameMonth = (dateVal) => {
  const d = dateVal?.toDate?.() ?? (dateVal ? new Date(dateVal) : null);
  if (!d) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

/* ─── Submit Gross Income Modal ──────────────────────────────────────────── */
const SubmitIncomeModal = ({ barberName, barberSplit, displayLabel, onClose, onSubmitted }) => {
  useScrollLock();
  const [grossInput, setGrossInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [preview,    setPreview]    = useState(null);

  const handleInputChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    setGrossInput(raw);
    const num = parseFloat(raw);
    if (num > 0) {
      setPreview(computeCuts(num, barberSplit));
    } else {
      setPreview(null);
    }
    setError("");
  };

  const handleSubmit = async () => {
    const gross = phpRound(parseFloat(grossInput));
    if (!gross || gross <= 0) { setError("Enter a valid gross amount."); return; }
    if (isNaN(gross))          { setError("Invalid number — use digits only (e.g. 1500.00)."); return; }

    const { grossAmount, barberCut, adminCut } = computeCuts(gross, barberSplit);
    setSubmitting(true);
    try {
      await addDoc(collection(db, "transactions"), {
        barber:      barberName,
        grossAmount, // DECIMAL(10,2) equivalent — stored as precise float
        barberCut,
        adminCut,
        amount:      grossAmount,   // kept for backward compat with existing queries
        service:     "Daily Gross",
        status:      "Completed",
        date:        todayStr(),
        createdAt:   serverTimestamp(),
        source:      "barber_self_report",
      });
      onSubmitted({ grossAmount, barberCut, adminCut });
      onClose();
    } catch (e) {
      setError("Failed to save — please try again. (" + e.message + ")");
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = !!barberSplit?.isAdmin;
  const rate = isAdmin ? 100 : (barberSplit?.splitPercent ?? TIER_DEFAULT_SPLIT[barberSplit?.tier ?? "Junior"] ?? 50);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
      zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto",
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 440, padding: "32px 36px", margin: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: "Geist", fontSize: 18, fontWeight: 700, color: C.primary }}>Submit Daily Income</h2>
            <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginTop: 3 }}>
              {isAdmin ? "Admin — 100% personal income" : `${displayLabel} · ${rate}% / ${100 - rate}% split`}
            </p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8 }}
            onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
            onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
            <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
          </button>
        </div>

        {/* Gross input */}
        <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 8 }}>
          Today&apos;s Gross Income (PHP)
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 0, border: `1.5px solid ${C.outlineVariant}`, borderRadius: 12, overflow: "hidden", marginBottom: 6, background: C.surfaceLow }}>
          <span style={{ padding: "12px 14px", fontFamily: "Geist", fontSize: 18, fontWeight: 700, color: C.primary, background: C.surfaceContainer }}>₱</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={grossInput}
            onChange={handleInputChange}
            autoFocus
            style={{
              flex: 1, border: "none", outline: "none",
              padding: "12px 16px",
              fontFamily: "Geist", fontSize: 20, fontWeight: 700,
              color: C.primary, background: "transparent",
            }}
          />
        </div>
        <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant, marginBottom: 20 }}>
          Enter total income collected today before split
        </p>

        {/* Live preview */}
        {preview && (
          <div style={{ background: C.surfaceLow, borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
            <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 14 }}>
              Split Preview
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Gross",              value: fmt(preview.grossAmount), color: C.primary },
                { label: `Your ${rate}%`,      value: fmt(preview.barberCut),   color: "var(--badge-success-fg)" },
                ...(!isAdmin ? [{ label: `Admin ${100-rate}%`, value: fmt(preview.adminCut), color: C.onSurfaceVariant }] : []),
              ].map(row => (
                <div key={row.label} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "Geist", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 4 }}>{row.label}</p>
                  <p style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 700, color: row.color }}>{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: C.error, fontFamily: "Geist", fontSize: 12, marginBottom: 16 }}>{error}</p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px 0", borderRadius: 12, background: C.surfaceLow,
            fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: C.onSurfaceVariant,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !grossInput}
            style={{
              flex: 2, padding: "11px 0", borderRadius: 12,
              background: C.primary, color: C.onPrimary,
              fontFamily: "Geist", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.06em", textTransform: "uppercase",
              opacity: (submitting || !grossInput) ? 0.6 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <Icon name={submitting ? "hourglass_empty" : "check"} size={15} style={{ color: C.onPrimary }} />
            {submitting ? "Saving…" : "Submit & Split"}
          </button>
        </div>
      </div>
    </div>
  );
};


const KpiCard = ({ icon, label, value, sub, accent }) => (
  <div className="card" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: accent ? `${accent}18` : C.surfaceLow,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name={icon} size={18} style={{ color: accent ?? C.primary }} />
      </div>
      <span style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant }}>{label}</span>
    </div>
    <p style={{ fontFamily: "Geist", fontSize: 26, fontWeight: 700, color: C.primary, lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant }}>{sub}</p>}
  </div>
);

/* ─── Account Security card (self-service email / password) ────────────────
 * Firebase Auth only lets a user change their OWN email/password from the
 * client SDK, and requires a recent sign-in to do it — hence the current-
 * password reauth step below. This is why admin can't edit someone else's
 * login email from the Staff/Stylists pages; each person must do it here.
 */
/* Password input with a show/hide eye toggle */
const PasswordField = ({ label, value, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete="current-password"
          style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 10, border: `1px solid ${C.outlineVariant}`, background: C.surfaceLow, fontFamily: "Geist", fontSize: 13, color: C.primary }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", borderRadius: 8 }}
        >
          <Icon name={show ? "visibility_off" : "visibility"} size={18} style={{ color: C.onSurfaceVariant }} />
        </button>
      </div>
    </div>
  );
};

const AccountSecurityCard = () => {
  const { user } = useAuth();
  const [mode,       setMode]       = useState(null); // null | "email" | "password"
  const [currentPw,  setCurrentPw]  = useState("");
  const [newEmail,   setNewEmail]   = useState(user?.email ?? "");
  const [newPw,       setNewPw]      = useState("");
  const [confirmPw,   setConfirmPw]  = useState("");
  const [busy,        setBusy]       = useState(false);
  const [error,        setError]      = useState("");
  const [justSaved,    setJustSaved]  = useState("");

  const resetForm = () => {
    setMode(null);
    setCurrentPw("");
    setNewEmail(user?.email ?? "");
    setNewPw("");
    setConfirmPw("");
    setError("");
  };

  const friendlyError = (e) => ({
    "auth/wrong-password":         "That current password is incorrect.",
    "auth/invalid-credential":     "That current password is incorrect.",
    "auth/requires-recent-login":  "For security, please sign out and back in, then try again.",
    "auth/email-already-in-use":   "That email is already registered to another account.",
    "auth/invalid-email":          "Invalid email address.",
    "auth/weak-password":          "New password is too weak (minimum 6 characters).",
  }[e.code] || e.message || "Something went wrong — please try again.");

  const reauth = async () => {
    if (!currentPw) throw { code: "auth/wrong-password" };
    const cred = EmailAuthProvider.credential(user.email, currentPw);
    await reauthenticateWithCredential(auth.currentUser, cred);
  };

  const handleSaveEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || trimmed === user.email) { setError("Enter a new, different email."); return; }
    setBusy(true);
    setError("");
    try {
      await reauth();
      // Firebase deprecated the old instant updateEmail() for security reasons.
      // This sends a real confirmation email to the NEW address; the login
      // email only actually changes once that link is clicked. Firestore gets
      // synced automatically on next login (see AuthProvider).
      await verifyBeforeUpdateEmail(auth.currentUser, trimmed);
      setJustSaved(`Confirmation link sent to ${trimmed}. Your login stays on ${user.email} until you open that email and click the link.`);
      resetForm();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPw.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
    setBusy(true);
    setError("");
    try {
      await reauth();
      await updatePassword(auth.currentUser, newPw);
      setJustSaved("Password updated.");
      resetForm();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ padding: "24px 28px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: mode ? 20 : 0 }}>
        <div>
          <p style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 3 }}>Account Security</p>
          <p style={{ fontFamily: "Geist", fontSize: 12, color: C.onSurfaceVariant }}>
            Login email: <strong>{user?.email}</strong>
          </p>
        </div>
        {!mode && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { resetForm(); setMode("email"); }} style={{ padding: "8px 16px", borderRadius: 10, background: C.surfaceLow, fontFamily: "Geist", fontSize: 11, fontWeight: 600, color: C.primary }}>
              Change Email
            </button>
            <button onClick={() => { resetForm(); setMode("password"); }} style={{ padding: "8px 16px", borderRadius: 10, background: C.surfaceLow, fontFamily: "Geist", fontSize: 11, fontWeight: 600, color: C.primary }}>
              Change Password
            </button>
          </div>
        )}
      </div>

      {justSaved && !mode && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--badge-success-bg)", border: "1px solid var(--badge-success-fg)", borderRadius: 10, padding: "10px 14px", marginTop: 16 }}>
          <Icon name="check_circle" size={16} style={{ color: "var(--badge-success-fg)", flexShrink: 0 }} />
          <span style={{ fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: "var(--badge-success-fg)" }}>{justSaved}</span>
        </div>
      )}

      {mode === "email" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 6 }}>New Email</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.outlineVariant}`, background: C.surfaceLow, fontFamily: "Geist", fontSize: 13, color: C.primary }} />
          </div>
          <PasswordField label="Current Password (to confirm it's you)" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
          {error && <p style={{ color: C.error, fontSize: 12, fontFamily: "Geist" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={resetForm} style={{ padding: "9px 16px", borderRadius: 10, background: C.surfaceLow, fontFamily: "Geist", fontSize: 11, fontWeight: 600, color: C.onSurfaceVariant }}>Cancel</button>
            <button onClick={handleSaveEmail} disabled={busy} style={{ padding: "9px 16px", borderRadius: 10, background: C.primary, color: C.onPrimary, fontFamily: "Geist", fontSize: 11, fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
              {busy ? "Saving…" : "Save Email"}
            </button>
          </div>
        </div>
      )}

      {mode === "password" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <PasswordField label="Current Password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <PasswordField label="New Password" value={newPw} onChange={e => setNewPw(e.target.value)} />
            <PasswordField label="Confirm New Password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
          </div>
          {error && <p style={{ color: C.error, fontSize: 12, fontFamily: "Geist" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={resetForm} style={{ padding: "9px 16px", borderRadius: 10, background: C.surfaceLow, fontFamily: "Geist", fontSize: 11, fontWeight: 600, color: C.onSurfaceVariant }}>Cancel</button>
            <button onClick={handleSavePassword} disabled={busy} style={{ padding: "9px 16px", borderRadius: 10, background: C.primary, color: C.onPrimary, fontFamily: "Geist", fontSize: 11, fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
              {busy ? "Saving…" : "Save Password"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Page ───────────────────────────────────────────────────────────────── */
const ProfilePage = () => {
  const { user, role, displayName } = useAuth();
  const { data: stylists } = useStylists();
  const isMobile = useIsMobile();

  // ── Find this barber's stylist record (by uid link or name) ───────────
  const myStylist = useMemo(() => {
    if (!stylists?.length) return null;
    return (
      stylists.find(s => s.uid === user?.uid) ??
      stylists.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase()) ??
      null
    );
  }, [stylists, user]);

  const barberName = myStylist?.name ?? displayName ?? user?.email ?? "Me";
  // Admin → special "admin" tier (100% cut of own income, no split)
  // Barber → uses their stylist record's saved experience tier + custom split
  // (set by an admin via Stylists → Barber Splits), falling back to Junior.
  const isAdmin = role === "admin";
  const barberTier  = myStylist?.tier ?? "Junior";
  const barberSplit = {
    isAdmin,
    tier: barberTier,
    splitPercent: myStylist?.splitPercent,
  };
  const displayLabel = isAdmin ? "Admin" : (myStylist?.role ?? `${barberTier} Barber`);
  const initials   = barberName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  // ── Scoped Firestore listener — ONLY this barber's transactions ────────
  // Security: queries are filtered by barber name server-side.
  // Firestore Rules must also restrict reads (your existing rules already
  // require auth; add a rule for transactions: allow read if
  // resource.data.barber == request.auth.token.name for extra hardening).
  const [txns, setTxns] = useState([]);
  const [txnsLoading, setTxnsLoading] = useState(true);

  useEffect(() => {
    if (!barberName) return;
    const q = query(
      collection(db, "transactions"),
      where("barber", "==", barberName)
    );
    const unsub = onSnapshot(q, snap => {
      setTxns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTxnsLoading(false);
    }, () => setTxnsLoading(false));
    return unsub;
  }, [barberName]);

  // ── Aggregate income metrics ──────────────────────────────────────────
  const { todayIncome, weekIncome, monthIncome, todayBarberCut, weekBarberCut, monthBarberCut, recentTxns } = useMemo(() => {
    let todayIncome = 0, weekIncome = 0, monthIncome = 0;
    let todayBarberCut = 0, weekBarberCut = 0, monthBarberCut = 0;

    txns.forEach(t => {
      if (t.status === "Refunded") return;
      const gross  = Number(t.grossAmount ?? toNum(t.amount)) || 0;
      const myCut  = Number(t.barberCut)  || gross; // fallback: full amount if old record
      const date   = t.createdAt ?? t.date;

      if (isSameDay(date))   { todayIncome += gross; todayBarberCut += myCut; }
      if (isSameWeek(date))  { weekIncome  += gross; weekBarberCut  += myCut; }
      if (isSameMonth(date)) { monthIncome += gross; monthBarberCut += myCut; }
    });

    const recentTxns = [...txns]
      .filter(t => t.status !== "Refunded")
      .sort((a, b) => {
        const da = a.createdAt?.toDate?.() ?? new Date(a.date ?? 0);
        const db_ = b.createdAt?.toDate?.() ?? new Date(b.date ?? 0);
        return db_ - da;
      })
      .slice(0, 8);

    return {
      todayIncome,  weekIncome,  monthIncome,
      todayBarberCut, weekBarberCut, monthBarberCut,
      recentTxns,
    };
  }, [txns]);

  // ── Submit modal ──────────────────────────────────────────────────────
  const [showSubmit, setShowSubmit]       = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState(null);

  const handleSubmitted = useCallback((result) => {
    setLastSubmitted(result);
    setTimeout(() => setLastSubmitted(null), 5000);
  }, []);

  const rate    = isAdmin ? 100 : (barberSplit.splitPercent ?? TIER_DEFAULT_SPLIT[barberTier] ?? 50);
  const TIER_COLORS = { Junior: { bg: C.surfaceLow, color: C.onSurfaceVariant }, Senior: { bg: "var(--badge-warning-bg)", color: "var(--badge-warning-fg)" }, Head: { bg: "var(--badge-info-bg)", color: "var(--badge-info-fg)" } };
  const tierBg  = isAdmin ? C.primaryContainer : (TIER_COLORS[barberTier]?.bg ?? C.surfaceLow);
  const tierCol = isAdmin ? C.onPrimaryContainer : (TIER_COLORS[barberTier]?.color ?? C.onSurfaceVariant);
  const tierLabel = isAdmin ? "Admin" : displayLabel;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

      {/* ── Profile header card ─────────────────────────────────────── */}
      <div className="card" style={{ padding: "28px 32px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%", flexShrink: 0,
            background: C.secondaryContainer,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Geist", fontSize: 20, fontWeight: 700, color: C.secondary,
          }}>{initials}</div>
          <div>
            <p style={{ fontFamily: "Geist", fontSize: 20, fontWeight: 700, color: C.primary }}>{barberName}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ padding: "2px 10px", borderRadius: 999, background: tierBg, color: tierCol, fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {tierLabel}
              </span>
              <span style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant }}>
                {isAdmin ? "100% personal income" : `${rate}% your cut · ${100 - rate}% admin cut`}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowSubmit(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 24px", borderRadius: 14,
            background: C.primary, color: C.onPrimary,
            fontFamily: "Geist", fontSize: 12, fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase",
            boxShadow: `0 4px 14px ${C.primary}40`,
            transition: "opacity 0.15s",
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = "0.88")}
          onMouseOut={e => (e.currentTarget.style.opacity = "1")}
        >
          <Icon name="add_circle" size={18} style={{ color: C.onPrimary }} />
          Submit Daily Income
        </button>
      </div>

      {/* ── Account Security (self-service email / password) ──────────── */}
      <AccountSecurityCard />

      {/* ── Success toast ────────────────────────────────────────────── */}
      {lastSubmitted && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px", borderRadius: 12, marginBottom: 20,
          background: "var(--badge-success-bg)", border: "1px solid var(--badge-success-fg)",
          animation: "fadeUp 0.3s ease",
        }}>
          <Icon name="check_circle" size={18} style={{ color: "var(--badge-success-fg)", flexShrink: 0 }} />
          <span style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: "var(--badge-success-fg)" }}>
            Recorded — Gross {fmt(lastSubmitted.grossAmount)} · Your cut {fmt(lastSubmitted.barberCut)} · Admin {fmt(lastSubmitted.adminCut)}
          </span>
        </div>
      )}

      {/* ── KPI grid ─────────────────────────────────────────────────── */}
      {txnsLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.onSurfaceVariant, fontFamily: "Geist" }}>Loading your earnings…</div>
      ) : (
        <>
          {/* Gross income row */}
          <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 12 }}>
            Gross Income
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
            <KpiCard icon="today"          label="Today"       value={fmt(todayIncome)}  sub="Gross collected today"       accent={C.primary} />
            <KpiCard icon="date_range"     label="This Week"   value={fmt(weekIncome)}   sub="Current calendar week"       />
            <KpiCard icon="calendar_month" label="This Month"  value={fmt(monthIncome)}  sub={new Date().toLocaleString("en-PH", { month: "long", year: "numeric" })} />
          </div>

          {/* Your cut row */}
          <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: 12 }}>
            {isAdmin ? "Your Income (100%)" : `Your Earnings (${rate}% cut)`}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
            <KpiCard icon="payments" label="Today"      value={fmt(todayBarberCut)} sub="Your take home today"  accent="var(--badge-success-fg)" />
            <KpiCard icon="payments" label="This Week"  value={fmt(weekBarberCut)}  sub="Your weekly take home" accent="var(--badge-success-fg)" />
            <KpiCard icon="payments" label="This Month" value={fmt(monthBarberCut)} sub="Your monthly take home" accent="var(--badge-success-fg)" />
          </div>

          {/* Recent transactions */}
          <div className="card" style={{ padding: "24px 28px" }}>
            <p style={{ fontFamily: "Geist", fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 18 }}>
              Recent Transactions
            </p>
            {recentTxns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 0", color: C.onSurfaceVariant, fontFamily: "Geist", fontSize: 13 }}>
                No transactions yet — submit your first daily income above.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recentTxns.map(t => {
                  const dateStr = t.createdAt?.toDate?.()
                    ? t.createdAt.toDate().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                    : t.date ?? "—";
                  const gross  = Number(t.grossAmount ?? toNum(t.amount)) || 0;
                  const myCut  = Number(t.barberCut) || gross;
                  return (
                    <div key={t.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                      padding: "12px 16px", borderRadius: 12, background: C.surfaceLow,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                          background: C.surfaceContainer,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Icon name="payments" size={16} style={{ color: C.onSurfaceVariant }} />
                        </div>
                        <div>
                          <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 600, color: C.primary }}>{t.service ?? "Service"}</p>
                          <p style={{ fontFamily: "Geist", fontSize: 11, color: C.onSurfaceVariant }}>{dateStr}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: "Geist", fontSize: 13, fontWeight: 700, color: "var(--badge-success-fg)" }}>{fmt(myCut)}</p>
                        <p style={{ fontFamily: "Geist", fontSize: 10, color: C.onSurfaceVariant }}>of {fmt(gross)} gross</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Submit modal */}
      {showSubmit && (
        <SubmitIncomeModal
          barberName={barberName}
          barberSplit={barberSplit}
          displayLabel={displayLabel}
          onClose={() => setShowSubmit(false)}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  );
};

export default ProfilePage;