"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebaseConfig";

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔍 useUserRole mounted");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔥 Auth state changed");
      console.log("👉 user from listener:", user);

      if (!user) {
        console.warn("❌ No authenticated user");
        setRole(null);
        setLoading(false);
        return;
      }

      const uid = user.uid;
      console.log("✅ User UID:", uid);

      try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          console.error("❌ User document NOT FOUND");
          setRole(null);
        } else {
          const data = snap.data();
          console.log("📄 Document data:", data);

          if (!data.role) {
            console.error("❌ role field is missing");
            setRole(null);
          } else {
            console.log("✅ Role found:", data.role);
            setRole(data.role.toLowerCase()); // normalize role
          }
        }
      } catch (error: any) {
        console.error("🔥 Firestore read failed:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { role, loading };
}
