"use client";

import { useEffect, useState } from "react";
import { auth } from "../../lib/auth"; // Now exported from auth.ts
import { User } from "firebase/auth";

export default function Header() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (user) setEmail(user.email || "");
      else setEmail("");
    });

    return () => unsubscribe();
  }, []);

  return (
    <header className="w-full h-16 px-6 bg-white border-b flex items-center justify-between">
      <div className="text-lg font-medium">Welcome Back</div>
      <div className="text-sm text-gray-500">{email}</div>
    </header>
  );
}
