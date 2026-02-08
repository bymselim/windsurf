"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/admin/artworks", label: "Artworks", desc: "Edit all artworks", icon: "🖼️" },
  { href: "/admin/uploads", label: "Uploads", desc: "Upload photos/videos", icon: "⬆️" },
  { href: "/admin/categories", label: "Categories", desc: "Manage categories", icon: "📁" },
  { href: "/admin/access-logs", label: "Access Logs", desc: "View who logged in", icon: "📋" },
  { href: "/admin/analytics", label: "Analytics", desc: "Visits, devices, top artworks", icon: "📊" },
  { href: "/admin/settings", label: "Settings", desc: "Change passwords", icon: "🔐" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const saved =
      typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    setIsAuthenticated(saved === "true");
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/admin/access-logs");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-zinc-400 mb-8">Manage your gallery</p>

        <nav className="space-y-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition"
            >
              <span className="mr-2" aria-hidden>{item.icon}</span>
              <span className="font-semibold text-zinc-100">{item.label}</span>
              <p className="text-sm text-zinc-500 mt-1">{item.desc}</p>
            </Link>
          ))}
        </nav>

        <div className="mt-8 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <p className="text-sm text-zinc-500">
            Import/Export for bulk operations can be added later.
          </p>
        </div>
      </div>
    </div>
  );
}
