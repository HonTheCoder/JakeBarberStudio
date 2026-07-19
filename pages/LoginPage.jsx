import { useState, useRef, useCallback, useEffect } from "react";
import { C } from "../tokens/design";
import { Icon } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { resolveTOTPChallenge } from "../hooks/useTOTP";
import useScrollLock from "../hooks/useScrollLock";
import useIsMobile from "../hooks/useIsMobile";

/* ── Shared: animated background (gradient blobs + dot grid) ────────────── */
const LoginBackground = () => (
  <>
    <div
      className="login-blob-1"
      style={{
        position: "absolute", top: "-12%", right: "-8%", width: 420, height: 420,
        borderRadius: "50%", background: `radial-gradient(circle, ${C.secondaryContainer}35, transparent 70%)`,
        filter: "blur(70px)", pointerEvents: "none",
      }}
    />
    <div
      className="login-blob-2"
      style={{
        position: "absolute", bottom: "-15%", left: "-10%", width: 460, height: 460,
        borderRadius: "50%", background: `radial-gradient(circle, ${C.primary}12, transparent 70%)`,
        filter: "blur(80px)", pointerEvents: "none",
      }}
    />
    <div
      className="login-blob-3"
      style={{
        position: "absolute", top: "50%", left: "50%", width: 520, height: 520,
        borderRadius: "50%", background: `radial-gradient(circle, ${C.secondary}0a, transparent 65%)`,
        filter: "blur(90px)", pointerEvents: "none",
      }}
    />
    <div
      style={{
        position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none",
        backgroundImage: `radial-gradient(${C.outlineVariant}30 1px, transparent 1px)`,
        backgroundSize: "28px 28px",
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
      }}
    />
  </>
);

/* ── Shared: 3D input row with icon + optional trailing action ──────────── */
const FieldRow = ({ icon, children, trailing }) => (
  <div
    className="login-input-row"
    style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 14px", background: C.surfaceLow,
      border: `1px solid ${C.outlineVariant}40`, borderRadius: 12,
    }}
  >
    <Icon name={icon} size={18} style={{ color: C.onSurfaceVariant, opacity: 0.5, flexShrink: 0 }} />
    {children}
    {trailing}
  </div>
);

/* ── Forgot Password Modal ───────────────────────────────────────────────── */
const ForgotModal = ({ prefill, onClose }) => {
  useScrollLock();
  const [email,  setEmail]  = useState(prefill || "");
  const [status, setStatus] = useState("idle");
  const [err,    setErr]    = useState("");

  // Sends a real Firebase password-reset email to the address on file.
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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}
    >
      <div className="glass card login-fade-in" style={{ padding: 32, maxWidth: 400, width: "100%", margin: "auto", boxShadow: "0 30px 60px rgba(0,0,0,0.18)" }}>
        {status === "sent" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, background: "var(--badge-success-bg)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 20px rgba(22,101,52,0.2)" }}>
              <Icon name="mark_email_read" size={28} style={{ color: "var(--badge-success-fg)" }} />
            </div>
            <h3 style={{ fontFamily: "Geist", fontSize: 17, fontWeight: 600, color: C.primary, marginBottom: 8 }}>Check your inbox</h3>
            <p style={{ fontSize: 13, color: C.onSurfaceVariant, lineHeight: 1.6, marginBottom: 24 }}>
              A password reset link was sent to <strong>{email}</strong>. Check your spam folder if it doesn't arrive within a minute.
            </p>
            <button onClick={onClose} className="login-btn-shine" style={{ padding: "10px 28px", borderRadius: 12, background: C.primary, color: C.onPrimary, fontFamily: "Geist", fontSize: 13, fontWeight: 600 }}>
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
            <FieldRow icon="mail">
              <input
                type="email" value={email}
                onChange={e => { setEmail(e.target.value); setErr(""); setStatus("idle"); }}
                onKeyDown={e => e.key === "Enter" && handle()}
                placeholder="name@lounge.com" autoFocus
                style={{ flex: 1, background: "transparent", border: "none", fontFamily: "Inter", fontSize: 14, color: C.onSurface }}
              />
            </FieldRow>
            <div style={{ marginBottom: err ? 16 : 0, marginTop: 16 }}>
              {err && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--c-error-container)", borderRadius: 10 }}>
                  <Icon name="error" size={15} style={{ color: C.error, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.error }}>{err}</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={onClose} style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.outlineVariant}`, fontFamily: "Geist", fontSize: 12, fontWeight: 600, color: C.onSurfaceVariant }}>
                Cancel
              </button>
              <button onClick={handle} disabled={status === "sending"} className="login-btn-shine"
                style={{ padding: "10px 20px", borderRadius: 10, background: status === "sending" ? C.outlineVariant : C.primary, color: C.onPrimary, fontFamily: "Geist", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, opacity: status === "sending" ? 0.7 : 1 }}>
                {status === "sending" && <Icon name="hourglass_empty" size={14} style={{ color: C.onPrimary }} />}
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
    <div className="glass card login-fade-in" style={{ padding: "32px 28px", boxShadow: "0 30px 60px rgba(0,0,0,0.12)" }}>
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
      <FieldRow icon="pin">
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
      </FieldRow>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--c-error-container)", borderRadius: 10, marginTop: 16 }}>
          <Icon name="error" size={16} style={{ color: C.error, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: C.error }}>{error}</span>
        </div>
      )}

      <button
        onClick={handleVerify}
        disabled={loading || code.length < 6}
        className="login-btn-shine"
        style={{ width: "100%", marginTop: 24, padding: "16px", background: (loading || code.length < 6) ? C.outlineVariant : C.primary, color: C.onPrimary, borderRadius: 12, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", opacity: (loading || code.length < 6) ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        {loading && <Icon name="hourglass_empty" size={14} style={{ color: C.onPrimary }} />}
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
  const isMobile = useIsMobile();

  const [email,       setEmail]       = useState("");
  const [pass,        setPass]        = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [showForgot,  setShowForgot]  = useState(false);

  // Shop branding for the login header. The Settings page's live listener is
  // gated behind auth (so logged-out users never hit a permission-denied
  // Firestore listener), so here we do a single one-off read instead and
  // quietly keep the defaults below if it's blocked or fails — this only
  // shows real data if your Firestore rules allow public read on
  // settings/main; otherwise it degrades gracefully to the fallback text.
  const [shopName,    setShopName]    = useState("Jake Barber Studio");
  const [shopTagline, setShopTagline] = useState("Cut Safe · Cut Right");
  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, "settings", "main"))
      .then(snap => {
        if (cancelled || !snap.exists()) return;
        const shop = snap.data()?.shop;
        if (shop?.name)    setShopName(shop.name);
        if (shop?.tagline) setShopTagline(shop.tagline);
      })
      .catch(() => { /* logged out / rules block it — keep defaults */ });
    return () => { cancelled = true; };
  }, []);

  // 3D tilt + spotlight — desktop only, follows the pointer within the card.
  const cardRef = useRef(null);
  const handleTilt = useCallback((e) => {
    if (isMobile || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * 10; // rotateX
    const ry = (px - 0.5) * 10; // rotateY
    cardRef.current.style.setProperty("--rx", `${rx}deg`);
    cardRef.current.style.setProperty("--ry", `${ry}deg`);
    cardRef.current.style.setProperty("--mx", `${px * 100}%`);
    cardRef.current.style.setProperty("--my", `${py * 100}%`);
  }, [isMobile]);
  const resetTilt = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty("--rx", "0deg");
    cardRef.current.style.setProperty("--ry", "0deg");
  }, []);

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
      <LoginBackground />

      <div style={{ width: "100%", maxWidth: 440, zIndex: 1 }}>
        <div className="login-fade-in" style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            className="login-logo-ring"
            style={{
              width: 56, height: 56, margin: "0 auto 16px", borderRadius: 16,
              background: `linear-gradient(135deg, #1b1c1c, ${C.secondary})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            }}
          >
            <Icon name="content_cut" size={26} style={{ color: "#fff" }} />
          </div>
          <h1
            style={{
              fontFamily: "Geist", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em",
              backgroundImage: `linear-gradient(135deg, ${C.primary}, ${C.onSurfaceVariant})`,
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              color: C.primary,
            }}
          >
            {shopName}
          </h1>
          <p style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: C.onSurfaceVariant, opacity: 0.55, marginTop: 6 }}>
            {shopTagline}
          </p>
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
          <div
            ref={cardRef}
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            className="glass card login-card-3d login-fade-in"
            style={{ padding: "36px 32px", boxShadow: "0 30px 70px rgba(0,0,0,0.14)" }}
          >
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: "Geist", fontSize: 22, fontWeight: 500, color: C.primary }}>Welcome back</h2>
              <p style={{ fontSize: 14, color: C.onSurfaceVariant, marginTop: 6 }}>Sign in to access the management suite.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, display: "block", marginBottom: 10 }}>
                  Email Address
                </label>
                <FieldRow icon="mail">
                  <input
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    placeholder="name@lounge.com" type="email" autoComplete="email"
                    style={{ flex: 1, background: "transparent", border: "none", fontFamily: "Inter", fontSize: 15, color: C.onSurface }}
                  />
                </FieldRow>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <label style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.secondary, opacity: 0.8, transition: "opacity 0.15s" }}
                    onMouseOver={e => (e.currentTarget.style.opacity = 1)}
                    onMouseOut={e => (e.currentTarget.style.opacity = 0.8)}
                  >
                    Forgot?
                  </button>
                </div>
                <FieldRow
                  icon="lock"
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="login-eye-btn"
                      aria-label={showPass ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      <Icon name={showPass ? "visibility_off" : "visibility"} size={18} style={{ color: C.onSurfaceVariant }} />
                    </button>
                  }
                >
                  <input
                    value={pass}
                    onChange={e => { setPass(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    placeholder="••••••••" type={showPass ? "text" : "password"} autoComplete="current-password"
                    style={{ flex: 1, background: "transparent", border: "none", fontFamily: "Inter", fontSize: 15, color: C.onSurface, minWidth: 0 }}
                  />
                </FieldRow>
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 20, padding: "10px 14px", background: "var(--c-error-container)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="error" size={16} style={{ color: "var(--c-error)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "var(--c-error)" }}>{error}</span>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="login-btn-shine"
              style={{ width: "100%", marginTop: 32, padding: "16px", background: loading ? C.outlineVariant : C.primary, color: C.onPrimary, borderRadius: 12, fontFamily: "Geist", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", transition: "opacity 0.2s, transform 0.15s", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.98)")}
              onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              {loading && <Icon name="hourglass_empty" size={14} style={{ color: C.onPrimary }} />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 28, fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant, opacity: 0.4 }}>
          © {new Date().getFullYear()} JakeBarberStudioManagement
        </p>
      </div>

      {showForgot && <ForgotModal prefill={email} onClose={() => setShowForgot(false)} />}
    </div>
  );
};

export default LoginPage;