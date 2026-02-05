// lib/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxkAUFVTOJbcNxNG08_Um1WyRk23FumEI",
  authDomain: "digital-logbook-9ee72.firebaseapp.com",
  projectId: "digital-logbook-9ee72",
  storageBucket: "digital-logbook-9ee72.appspot.com",
  messagingSenderId: "894459650936",
  appId: "1:894459650936:web:f4eaee3ac4401a190b5e8d",
};

// Initialize Firebase app only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ==========================
// Export Firebase instances
// ==========================
export { app };           // ✅ export app for use in other files
export const db = getFirestore(app);
export const auth = getAuth(app);
