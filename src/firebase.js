import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "vaclaims-194006"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vaclaims-194006",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "vaclaims-194006"}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Lazy-init: Firebase Auth throws immediately with empty API key,
// which kills the entire app. Defer init so only /admin is affected.
let _app, _db, _auth, _storage, _googleProvider;

function lazyApp() {
  if (!_app) _app = initializeApp(firebaseConfig);
  return _app;
}
export function lazyDb() {
  if (!_db) _db = getFirestore(lazyApp());
  return _db;
}
export function lazyAuth() {
  if (!_auth) _auth = getAuth(lazyApp());
  return _auth;
}
export function lazyStorage() {
  if (!_storage) _storage = getStorage(lazyApp());
  return _storage;
}
export function lazyGoogleProvider() {
  if (!_googleProvider) _googleProvider = new GoogleAuthProvider();
  return _googleProvider;
}
