import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [user,        setUser]        = useState(null);
  const [role,        setRole]        = useState(null);   // "admin" | "barber"
  const [displayName, setDisplayName] = useState(null);   // from users/{uid}.name
  const [loading,     setLoading]     = useState(true);

  // MFA challenge state — set when login throws auth/multi-factor-auth-required
  const [mfaError,   setMfaError]   = useState(null);   // the raw Firebase error
  const [mfaPending, setMfaPending] = useState(false);  // show TOTP prompt in UI

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          const fetchedRole = snap.exists() ? (snap.data().role ?? "barber") : "barber";
          const fetchedName = snap.exists() ? (snap.data().name ?? null) : null;
          setRole(fetchedRole);
          setDisplayName(fetchedName);
        } catch {
          setRole("barber");
          setDisplayName(null);
        }
        setUser(u);
        // Clear any pending MFA state once fully signed in
        setMfaError(null);
        setMfaPending(false);
      } else {
        setUser(null);
        setRole(null);
        setDisplayName(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  /**
   * login() — attempts email/password sign-in.
   * If the account has TOTP enrolled, Firebase throws
   * auth/multi-factor-auth-required. We catch it here and surface
   * mfaPending=true + the raw error so LoginPage can show the TOTP prompt.
   */
  const login = async (email, password) => {
    setMfaError(null);
    setMfaPending(false);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === "auth/multi-factor-auth-required") {
        // Store the error so LoginPage can call resolveTOTPChallenge(mfaError, code)
        setMfaError(err);
        setMfaPending(true);
        // Re-throw so LoginPage knows to switch to MFA mode
        throw err;
      }
      throw err;
    }
  };

  const logout = () => {
    setMfaError(null);
    setMfaPending(false);
    return auth.signOut();
  };

  /** Called by LoginPage after user enters their TOTP code */
  const clearMfaState = () => {
    setMfaError(null);
    setMfaPending(false);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, role, displayName, login, logout, mfaError, mfaPending, clearMfaState }}>
      {children}
    </AuthContext.Provider>
  );
};