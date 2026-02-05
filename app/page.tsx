"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, login, logout } from "../lib/auth";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true); // Wait until auth + role is checked

  // Fetch user role from Firestore
  const getUserRole = async (uid: string): Promise<string | null> => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().role || null;
      }
      return null;
    } catch (err) {
      console.error("Error fetching user role:", err);
      return null;
    }
  };

  // Listen for auth state changes and redirect immediately
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const role = await getUserRole(currentUser.uid);

        if (role === "entrance") router.push("/entry");
        else if (role === "exit") router.push("/exit");
        else if (role === "admin") router.push("/dashboard");
        else setError("Role not defined. Contact admin.");
      }
      setInitializing(false); // Done checking auth + role
    });

    return () => unsubscribe();
  }, [router]);

  // Handle login
  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const loggedInUser: User = await login(email, password);
      const role = await getUserRole(loggedInUser.uid);

      if (role === "entrance") router.push("/entry");
      else if (role === "exit") router.push("/exit");
      else if (role === "admin") router.push("/dashboard");
      else setError("Role not defined. Contact admin.");

      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handle logout (only relevant if you stay on this page, usually not needed with redirect)
  const handleLogout = async () => {
    setLoading(true);
    setError("");

    try {
      await logout();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Prevent flashing UI until auth + role is confirmed
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Render login form (no logout UI here to prevent flash)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-4">
    <img src="/zcmc.png" alt="Logo" className="w-24 h-24 object-contain" />
  </div>
        <h1 className="text-2xl font-bold mb-6 text-center">ZCMC Vehicle E-Logbook</h1>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>

        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
      </div>
    </div>
  );
}
