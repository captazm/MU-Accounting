import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import { app, firebaseConfig, db } from "./firebase";
import { initializeApp } from "firebase/app";
import { getAuth as getAuth2 } from "firebase/auth";

// Primary auth instance
export const auth = getAuth(app);

// Secondary app instance — used to create new users without signing out the current admin
let _secondaryApp = null;
function getSecondaryAuth() {
  if (!_secondaryApp) {
    _secondaryApp = initializeApp(firebaseConfig, "Secondary");
  }
  return getAuth2(_secondaryApp);
}

// ── Sign In ────────────────────────────────────────────────────────────────
export async function authSignIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── Sign Out ───────────────────────────────────────────────────────────────
export async function authSignOut() {
  await signOut(auth);
}

// ── Auth State Listener ────────────────────────────────────────────────────
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Fetch a single user profile from Firestore ────────────────────────────
export async function fetchUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) return { uid, ...snap.data() };
    return null;
  } catch (e) {
    console.error("fetchUserProfile error:", e);
    return null;
  }
}

// ── Fetch all users (admin only) ────────────────────────────────────────
export async function fetchAllUsers() {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (e) {
    console.error("fetchAllUsers error:", e);
    return [];
  }
}

// ── Check if any users exist (first-time setup detection) ─────────────────
export async function hasAnyUser() {
  try {
    const snap = await getDocs(collection(db, "users"));
    return !snap.empty;
  } catch (e) {
    return false;
  }
}

// ── Create a new user (Admin only) — uses secondary auth app ─────────────
export async function createUser(email, password, role, displayName, createdByUid) {
  const secondaryAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = cred.user.uid;

  await setDoc(doc(db, "users", uid), {
    email,
    displayName: displayName || email.split("@")[0],
    role,          // "admin" | "accountant"
    createdAt: new Date().toISOString(),
    createdBy: createdByUid || "system",
    active: true,
  });

  // Sign out of secondary so it doesn't interfere
  await signOut(secondaryAuth);
  return uid;
}

// ── First-time admin setup ─────────────────────────────────────────────────
export async function setupFirstAdmin(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  await setDoc(doc(db, "users", uid), {
    email,
    displayName: displayName || "Administrator",
    role: "admin",
    createdAt: new Date().toISOString(),
    createdBy: "system",
    active: true,
  });
  return uid;
}

// ── Reset Password ─────────────────────────────────────────────────────────
export async function resetUserPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Toggle user active state ───────────────────────────────────────────────
export async function toggleUserActive(uid, active) {
  try {
    await updateDoc(doc(db, "users", uid), { active });
    return true;
  } catch (e) {
    console.error("toggleUserActive error:", e);
    return false;
  }
}
