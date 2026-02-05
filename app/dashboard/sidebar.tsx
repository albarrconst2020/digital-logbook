"use client";

// components/Sidebar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserRole } from "../../hooks/useUserRole";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebaseConfig";
import Image from "next/image";

export default function Sidebar() {
  const { role, loading } = useUserRole();
  const pathname = usePathname();

  if (loading) return <div>Loading...</div>;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed", err);
      alert("Logout failed. Try again.");
    }
  };

  const linkClass = (href: string) =>
    `block p-2 rounded transition-colors duration-200 ${
      pathname === href
        ? "bg-green-500 text-white font-bold"
        : "text-black hover:bg-green-400 hover:text-white"
    }`;

  return (
    <aside className="w-64 bg-white text-black min-h-screen p-4 shadow-lg">
      {/* Logo */}
      <div className="mb-6 flex justify-center">
        <Image src="/images/logo.png" alt="Logo" width={80} height={30} />
      </div>

      <ul className="space-y-2">
        {/* Everyone */}
        <li>
          <Link href="/dashboard" className={linkClass("/dashboard")}>
            Home
          </Link>
        </li>

        {/* Admin-only links */}
        {role === "admin" && (
          <>
            <li>
              <Link
                href="/dashboard/vehicle-registration"
                className={linkClass("/dashboard/vehicle-registration")}
              >
                Vehicle Registration
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/vehicles"
                className={linkClass("/dashboard/vehicles")}
              >
                All Registered Vehicles
              </Link>
            </li>
          </>
        )}

        {/* Logout always visible */}
        <li>
          <button
            onClick={handleLogout}
            className="w-full text-left p-2 rounded hover:bg-green-400 hover:text-white transition-colors duration-200"
          >
            Logout
          </button>
        </li>
      </ul>
    </aside>
  );
}
