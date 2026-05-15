"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ErpApp from "@/components/erp/ErpApp";
import "./erp.css";

export default function AdminErpPage() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" && localStorage.getItem("admin-authenticated") === "true";
    setReady(ok);
    if (!ok) router.replace("/admin/access-logs");
  }, [router]);

  if (ready === null) {
    return (
      <div className="loading-overlay" style={{ display: "flex" }}>
        <div className="spinner" />
        Yükleniyor…
      </div>
    );
  }

  if (!ready) return null;

  return <ErpApp />;
}
