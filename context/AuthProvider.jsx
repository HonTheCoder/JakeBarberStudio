import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [user,        setUser]        = useState(null);
  const [role,        setRole]        = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [mfaError,    setMfaError]    = useState(null);
  const [mfaPending,  setMfaPending]  = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const userRef = doc(db, "users", u.uid);
          const snap    = await getDoc(userRef);

          let fetchedRole, fetchedName;

          if (snap.exists()) {
            fetchedRole = snap.data().role ?? "barber";
            fetchedName = snap.data().name ?? null;

            // Auth email changes (via verifyBeforeUpdateEmail) complete
            // asynchronously, after the user clicks a link in their inbox —
            // possibly on another device/tab. Catch up Firestore here so the
            // Staff Accounts / Stylists lists never show a stale email.
            if (snap.data().email !== u.email) {
              await updateDoc(userRef, { email: u.email });
              const stylistSnap = await getDocs(query(collection(db, "stylists"), where("uid", "==", u.uid)));
              await Promise.all(stylistSnap.docs.map(d => updateDoc(d.ref, { email: u.email })));
            }
          } else {
            // First login — create the users/{uid} doc so Firestore rules
            // can resolve getUserData().role. Without this doc, every rule
            // that calls getUserData() returns undefined and denies all reads.
            fetchedRole = "admin"; // first account = admin; change others in Firebase Console
            fetchedName = u.displayName ?? u.email?.split("@")[0] ?? null;
            await setDoc(userRef, {
              role:      fetchedRole,
              name:      fetchedName,
              email:     u.email,
              createdAt: serverTimestamp(),
            });
          }

          setRole(fetchedRole);
          setDisplayName(fetchedName);
        } catch (err) {
          console.error("[AuthProvider] Failed to load/create user profile:", err);
          setRole("barber");
          setDisplayName(null);
        }
        setUser(u);
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

  const login = async (email, password) => {
    setMfaError(null);
    setMfaPending(false);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === "auth/multi-factor-auth-required") {
        setMfaError(err);
        setMfaPending(true);
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