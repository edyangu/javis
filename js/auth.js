import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { DEFAULTS } from "./config.js";

async function ensureOrganiser(user) {
  // 1. organiser profile
  try {
    const orgRef = doc(db, "organisers", user.uid);
    const snap = await getDoc(orgRef);
    if (!snap.exists()) {
      await setDoc(orgRef, {
        email: user.email,
        name: user.email.split("@")[0],
        createdAt: serverTimestamp()
      });
    }
  } catch (e) {
    console.warn("organiser doc write failed:", e);
  }

  // 2. event doc, one per organiser, keyed by uid
  try {
    const eventRef = doc(db, "events", user.uid);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) {
      await setDoc(eventRef, {
        organiserUid: user.uid,
        orgName: user.email.split("@")[0],
        eventName: DEFAULTS.eventName,
        location: DEFAULTS.location,
        entryTime: DEFAULTS.entryTime,
        currency: DEFAULTS.currency,
        prices: { ...DEFAULTS.prices },
        mtnNumber: DEFAULTS.mtnNumber,
        airtelNumber: DEFAULTS.airtelNumber,
        active: true,
        createdAt: serverTimestamp()
      });
    }
  } catch (e) {
    console.warn("event doc write failed:", e);
  }
}

function mapAuthError(code) {
  switch (code) {
    case "auth/invalid-email":        return "Invalid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":   return "Invalid email or password.";
    case "auth/email-already-in-use": return "That email already has an account.";
    case "auth/weak-password":        return "Password too weak, min 6 characters.";
    case "auth/unauthorized-domain":  return "This domain is not authorised in Firebase.";
    default:                          return "Auth error: " + code;
  }
}

window.handleLogin = async function () {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-password").value;
  const err = document.getElementById("login-error");
  err.textContent = "";
  if (!email || !pass) { err.textContent = "Enter email and password."; return; }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await ensureOrganiser(cred.user);
    window.location.href = "dashboard.html";
  } catch (e) {
    err.textContent = mapAuthError(e.code);
  }
};

window.handleRegister = async function () {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-password").value;
  const err = document.getElementById("login-error");
  err.textContent = "";
  if (!email || !pass) { err.textContent = "Enter email and password."; return; }
  if (pass.length < 6) { err.textContent = "Password must be at least 6 characters."; return; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: email.split("@")[0] });
    await ensureOrganiser(cred.user);
    window.location.href = "dashboard.html";
  } catch (e) {
    err.textContent = mapAuthError(e.code);
  }
};
