import { useState } from "react";
import { C } from "../tokens/design";
import { Icon } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !pass) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    try {
      await login(email, pass);
    } catch (err) {
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
                  placeholder="name@lounge.com"
                  type="email"
                  autoComplete="email"
                  style={{ flex: 1, background: "transparent", border: "none", fontFamily: "Inter", fontSize: 15, color: C.onSurface }}
                />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant }}>Password</label>
                <button style={{ fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.onSurfaceVariant, opacity: 0.5 }}>Forgot?</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.outlineVariant}`, paddingBottom: 8, gap: 10 }}>
                <Icon name="lock" size={18} style={{ color: C.onSurfaceVariant, opacity: 0.4 }} />
                <input
                  value={pass}
                  onChange={e => { setPass(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
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

        <p style={{ textAlign: "center", marginTop: 28, fontFamily: "Geist", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.onSurfaceVariant, opacity: 0.4 }}>
          © 2024 The Parlour Management Systems
        </p>
      </div>
    </div>
  );
};

export default LoginPage;