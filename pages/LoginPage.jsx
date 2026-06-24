import { useState, useRef } from "react";
import { C } from "../tokens/design";
import { Icon } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { resolveTOTPChallenge } from "../hooks/useTOTP";

/* ── Forgot Password Modal ───────────────────────────────────────────────── */
const ForgotModal = ({ prefill, onClose }) => {
  const [email,  setEmail]  = useState(prefill || "");
  const [status, setStatus] = useState("idle");
  const [err,    setErr]    = useState("");

  const handle = async () => {
    if (!email.trim()) { setErr("Please enter your email address."); return; }
    setStatus("sending");
    setErr("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setStatus("sent");
    } catch (e) {
      const msgs = {
        "auth/user-not-found":    "No account found with this email.",
        "auth/invalid-email":     "Invalid email address.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
      };
      setErr(msgs[e.code] || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div className="card" style={{ padding: 32, maxWidth: 400, width: "100%" }}>
        {status === "sent" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 52, height: 52, background: "#dcfce7", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="mark_email_read" size={26} style={{ color: "#166534" }} />
            </div>
            <h3 style={{ fontFamily: "Geist", fontSize: 17, fontWeight: 600, color: C.primary, marginBottom: 8 }}>Check your inbox</h3>
            <p style={{ fontSize: 13, color: C.onSurfaceVariant, lineHeight: 1.6, marginBottom: 24 }}>
              A password reset link was sent to <strong>{email}</strong>. Check your spam folder if it doesn't arrive within a minute.
            </p>
            <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 12, background: C.primary, color: "#fff", fontFamily: "Geist", fontSize: 13, fontWeight: 600 }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: "Geist", fontSize: 17, fontWeight: 600, color: C.primary }}>Reset password</h3>
                <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginTop: 4 }}>We'll send a reset link to your email.</p>
              </div>
              <button onClick={onClose} style={{ padding: 6, borderRadius: 8 }}
                onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
                onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                <Icon name="close" size={20} style={{ color: C.onSurfaceVariant }} />
              </button>
            </div>
            <label style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, display: "block", marginBottom: 8 }}>
              Email Address
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.surfaceLow, border: `1px solid ${C.outlineVariant}40`, borderRadius: 10, marginBottom: 16 }}>
              <Icon name="mail" size={16} style={{ color: C.onSurfaceVariant, opacity: 0.5, flexShrink: 0 }} />
              <input
                type="email" value={email}
                onChange={e => { setEmail(e.target.value); setErr(""); setStatus("idle"); }}
                onKeyDown={e => e.key === "Enter" && handle()}
                placeholder="name@lounge.com" autoFocus
                style={{ flex: 1, background: "transparent", border: "none", fontFamily: "Inter", fontSize: 14, color: C.onSurface }}
              />
            </div>
            {err && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fef2f2", borderRadius: 10, marginBottom: 16 }}>
                <Icon name="error" size={15} style={{ color: C.error, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.error }}>{err}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.outlineVariant}`, fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: C.onSurfaceVariant }}>
                Cancel
              </button>
              <button onClick={handle} disabled={status === "sending"}
                style={{ padding: "10px 20px", borderRadius: 10, background: status === "sending" ? C.outlineVariant : C.primary, color: "#fff", fontFamily: "Geist", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, opacity: status === "sending" ? 0.7 : 1 }}>
                {status === "sending" && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
                {status === "sending" ? "Sending…" : "Send Reset Link"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ── TOTP challenge step ─────────────────────────────────────────────────── */
const TOTPStep = ({ mfaError, onSuccess, onCancel }) => {
  const [code,    setCode]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleVerify = async () => {
    const trimmed = code.replace(/\s/g, "");
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await resolveTOTPChallenge(mfaError, trimmed);
      onSuccess();
    } catch (e) {
      const msgs = {
        "auth/invalid-verification-code": "Incorrect code. Check your authenticator app and try again.",
        "auth/code-expired":              "Code expired — wait for a new one and try again.",
        "auth/too-many-requests":         "Too many attempts. Please wait a moment.",
      };
      setError(msgs[e.code] || "Verification failed. Please try again.");
      setCode("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass card" style={{ padding: "32px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, background: C.surfaceLow, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="security" size={22} style={{ color: C.primary }} />
        </div>
        <div>
          <h2 style={{ fontFamily: "Geist", fontSize: 20, fontWeight: 500, color: C.primary }}>Two-factor authentication</h2>
          <p style={{ fontSize: 13, color: C.onSurfaceVariant, marginTop: 4 }}>Enter the 6-digit code from your authenticator app.</p>
        </div>
      </div>

      <label style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, display: "block", marginBottom: 10 }}>
        Authenticator Code
      </label>
      <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.outlineVariant}`, paddingBottom: 8, gap: 10, marginBottom: 8 }}>
        <Icon name="pin" size={18} style={{ color: C.onSurfaceVariant, opacity: 0.4 }} />
        <input
          ref={inputRef}
          value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleVerify()}
          placeholder="000000"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          style={{ flex: 1, background: "transparent", border: "none", fontFamily: "Inter", fontSize: 22, letterSpacing: "0.25em", color: C.onSurface, textAlign: "center" }}
        />
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fef2f2", borderRadius: 10, marginBottom: 16, marginTop: 8 }}>
          <Icon name="error" size={16} style={{ color: C.error, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: C.error }}>{error}</span>
        </div>
      )}

      <button
        onClick={handleVerify}
        disabled={loading || code.length < 6}
        style={{ width: "100%", marginTop: 24, padding: "16px", background: (loading || code.length < 6) ? C.outlineVariant : C.primary, color: "#fff", borderRadius: 12, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", opacity: (loading || code.length < 6) ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        {loading && <Icon name="hourglass_empty" size={14} style={{ color: "#fff" }} />}
        {loading ? "Verifying…" : "Verify & Sign In"}
      </button>

      <button
        onClick={onCancel}
        style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 10, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant }}
        onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
        onMouseOut={e => (e.currentTarget.style.background = "transparent")}
      >
        Back to login
      </button>
    </div>
  );
};

/* ── LoginPage ───────────────────────────────────────────────────────────── */
const LoginPage = () => {
  const { login, mfaError, mfaPending, clearMfaState } = useAuth();
  const [email,      setEmail]      = useState("");
  const [pass,       setPass]       = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleLogin = async () => {
    if (!email || !pass) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    try {
      await login(email, pass);
      // On success, AuthProvider's onAuthStateChanged takes over — nothing to do here.
    } catch (err) {
      if (err.code === "auth/multi-factor-auth-required") {
        // mfaPending is now true in context — the TOTPStep renders below.
        setLoading(false);
        return;
      }
      const msgs = {
        "auth/user-not-found":     "No account found with this email.",
        "auth/wrong-password":     "Incorrect password.",
        "auth/invalid-email":      "Invalid email address.",
        "auth/invalid-credential": "Invalid email or password.",
        "auth/too-many-requests":  "Too many attempts. Try again later.",
      };
      setError(msgs[err.code] || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.surface, position: "relative", overflow: "hidden", padding: "24px 16px" }}>
      <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 400, height: 400, borderRadius: "50%", background: `${C.secondaryContainer}20`, filter: "blur(100px)" }} />
      <div style={{ position: "absolute", bottom: "-10%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: `${C.primary}08`, filter: "blur(100px)" }} />

      <div style={{ width: "100%", maxWidth: 480, zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontFamily: "Geist", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: C.primary }}>THE PARLOUR</h1>
          <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: C.onSurfaceVariant, opacity: 0.5, marginTop: 6 }}>Premium Grooming Lounge</p>
        </div>

        {/* ── MFA step — shown after password succeeds on a 2FA-enrolled account ── */}
        {mfaPending ? (
          <TOTPStep
            mfaError={mfaError}
            onSuccess={clearMfaState}
            onCancel={clearMfaState}
          />
        ) : (
          /* ── Normal login form ── */
          <div className="glass card" style={{ padding: "32px 28px" }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: "Geist", fontSize: 22, fontWeight: 500, color: C.primary }}>Welcome back</h2>
              <p style={{ fontSize: 14, color: C.onSurfaceVariant, marginTop: 6 }}>Sign in to access the management suite.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <div>
                <label style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, display: "block", marginBottom: 10 }}>Email Address</label>
                <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.outlineVariant}`, paddingBottom: 8, gap: 10 }}>
                  <Icon name="mail" size={18} style={{ color: C.onSurfaceVariant, opacity: 0.4 }} />
                  <input
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    placeholder="name@lounge.com" type="email" autoComplete="email"
                    style={{ flex: 1, background: "transparent", border: "none", fontFamily: "Inter", fontSize: 15, color: C.onSurface }}
                  />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <label style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant }}>Password</label>
                  <button onClick={() => setShowForgot(true)}
                    style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.secondary, opacity: 0.8, transition: "opacity 0.15s" }}
                    onMouseOver={e => (e.currentTarget.style.opacity = 1)}
                    onMouseOut={e => (e.currentTarget.style.opacity = 0.8)}>
                    Forgot?
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.outlineVariant}`, paddingBottom: 8, gap: 10 }}>
                  <Icon name="lock" size={18} style={{ color: C.onSurfaceVariant, opacity: 0.4 }} />
                  <input
                    value={pass}
                    onChange={e => { setPass(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    placeholder="••••••••" type="password" autoComplete="current-password"
                    style={{ flex: 1, background: "transparent", border: "none", fontFamily: "Inter", fontSize: 15, color: C.onSurface }}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 20, padding: "10px 14px", background: "#fef2f2", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="error" size={16} style={{ color: "#dc2626", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#dc2626" }}>{error}</span>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{ width: "100%", marginTop: 32, padding: "16px", background: loading ? C.outlineVariant : C.primary, color: "#fff", borderRadius: 12, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", transition: "opacity 0.2s", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 28, fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant, opacity: 0.4 }}>
          © 2024 The Parlour Management Systems
        </p>
      </div>

      {showForgot && <ForgotModal prefill={email} onClose={() => setShowForgot(false)} />}
    </div>
  );
};

export default LoginPage;