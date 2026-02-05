// lib/getUserRole.ts
import { db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

/**
 * Fetches the role of a user by UID from Firestore.
 * Returns 'unknown' if the user doc or role is missing.
 * Handles offline or network errors gracefully.
 */
export async function getUserRole(uid: string): Promise<string> {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.warn(`User document not found for UID: ${uid}`);
      return "unknown";
    }

    const data = userSnap.data();
    if (!data.role) {
      console.warn(`Role field missing for UID: ${uid}`);
      return "unknown";
    }

    console.log(`Role for UID ${uid}: ${data.role}`);
    return data.role as string;
  } catch (err: any) {
    console.error("Error fetching user role:", err);
    return "unknown";
  }
}
