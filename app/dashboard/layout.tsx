// app/dashboard/layout.tsx
"use client"; // must be client

import Sidebar from "../dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      
      <main className="flex-1 p-6 bg-gray-100">{children}</main>
    </div>
  );
}
