"use client";

export default function Logo() {
  return (
    <div className="p-4 flex items-center">
      <img
        src="/logo-zcmc.png"
        alt="ZCMC Logo"
        className="h-12 w-auto"
      />
      <span className="ml-2 text-xl font-semibold text-gray-800">
        ZCMC Dashboard
      </span>
    </div>
  );
}
