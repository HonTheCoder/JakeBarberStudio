/**
 * useTOTP.js
 *
 * Wraps Firebase Auth TOTP MFA (RFC 6238 / authenticator-app based).
 * Requires Firebase JS SDK v10+ (project uses v11).
 *
 * Exports:
 *  - useTOTPStatus()          → { enrolled, displayName, loading }
 *  - startTOTPEnrollment()    → { secret, qrUri }  (call after re-auth)
 *  - finishTOTPEnrollment()   → verifies code, writes enrolledMFA flag
 *  - unenrollTOTP()           → removes the factor
 *  - resolveTOTPChallenge()   → used at login when MFA is required
 */

import { useState, useEffect } from "react";
import {
  multiFactor,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase";

/* ── Check whether the current user has TOTP enrolled ─────────────────────── */
export const useTOTPStatus = () => {
  const [enrolled,    setEnrolled]    = useState(false);
  const [displayName, setDisplayName] = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const check = () => {
      const user = auth.currentUser;
      if (!user) { setEnrolled(false); setLoading(false); return; }
      const factors = multiFactor(user).enrolledFactors;
      const totp    = factors.find(f => f.factorId === TotpMultiFactorGenerator.FACTOR_ID);
      setEnrolled(!!totp);
      setDisplayName(totp?.displayName ?? null);
      setLoading(false);
    };
    // Run on mount and whenever auth state changes
    check();
    return auth.onAuthStateChanged(check);
  }, []);

  return { enrolled, displayName, loading };
};

/**
 * Step 1 of enrollment.
 * Re-authenticates the user (required by Firebase before MFA changes),
 * then generates a TOTP secret + QR URI for the authenticator app.
 *
 * @param {string} password   - current user's password (for re-auth)
 * @returns {{ secret: object, qrUri: string }}
 */
export const startTOTPEnrollment = async (password) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");

  // Re-authenticate (Firebase requires this before MFA enrollment)
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);

  // Generate TOTP secret
  const mfaUser = multiFactor(user);
  const session  = await mfaUser.getSession();
  const secret   = await TotpMultiFactorGenerator.generateSecret(session);

  // Build a standard otpauth:// URI for QR code display
  const appName  = "The Parlour";
  const qrUri    = secret.generateQrCodeUrl(user.email, appName);

  return { secret, qrUri };
};

/**
 * Step 2 of enrollment.
 * Verifies the 6-digit code from the authenticator app and finalises enrollment.
 *
 * @param {object}     secret  - the secret returned by startTOTPEnrollment
 * @param {string}     code    - 6-digit TOTP code from the authenticator app
 * @param {string}     label   - display name stored on the factor (optional)
 */
export const finishTOTPEnrollment = async (secret, code, label = "Authenticator App") => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");

  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
  await multiFactor(user).enroll(assertion, label);
};

/**
 * Remove TOTP from the current user.
 * Re-authentication is NOT required for unenrollment via the SDK.
 */
export const unenrollTOTP = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");

  const factors = multiFactor(user).enrolledFactors;
  const totp    = factors.find(f => f.factorId === TotpMultiFactorGenerator.FACTOR_ID);
  if (!totp) return; // already unenrolled

  await multiFactor(user).unenroll(totp);
};

/**
 * Called at login when Firebase throws auth/multi-factor-auth-required.
 * Takes the error, extracts the resolver, and verifies the TOTP code.
 *
 * @param {Error}  mfaError  - the error thrown by signInWithEmailAndPassword
 * @param {string} code      - 6-digit TOTP code
 */
export const resolveTOTPChallenge = async (mfaError, code) => {
  const resolver = getMultiFactorResolver(auth, mfaError);

  // Find the TOTP hint
  const hint = resolver.hints.find(
    h => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
  );
  if (!hint) throw new Error("No TOTP factor found on this account.");

  const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code);
  const result    = await resolver.resolveSignIn(assertion);
  return result;
};