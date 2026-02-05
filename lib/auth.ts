// lib/auth.ts
import { auth, db } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

// ==========================
// SIGNUP: create user and Firestore doc
// ==========================
export async function signup(
  email: string,
  password: string,
  role: string = "user"
): Promise<User> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Create Firestore document if it doesn't exist
    const userRef = doc(db, "users", cred.user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email,
        role,
        createdAt: new Date().toISOString(),
      });
      console.log(`Firestore user created for ${email} with role ${role}`);
    } else {
      console.log(`User doc already exists for ${email}`);
    }

    return cred.user;
  } catch (err: any) {
    console.error("Signup error:", err);
    throw err;
  }
}

// ==========================
// LOGIN
// ==========================
export async function login(email: string, password: string): Promise<User> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log(`Logged in as ${cred.user.email}`);
    return cred.user;
  } catch (err: any) {
    console.error("Login error:", err);
    throw err;
  }
}

// ==========================
// LOGOUT
// ==========================
export async function logout() {
  try {
    await signOut(auth);
    console.log("Logged out successfully");
  } catch (err: any) {
    console.error("Logout error:", err);
    throw err;
  }
}

// ==========================
// GET CURRENT USER (sync)
// ==========================
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// ==========================
// SUBSCRIBE TO AUTH STATE
// ==========================
export function onAuthStateChanged(callback: (user: User | null) => void) {
  return auth.onAuthStateChanged(callback);
}

// ==========================
// EXPORT auth & db
// ==========================
export { auth, db };
