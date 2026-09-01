"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ErpApp from "@/components/erp/ErpApp";
import { verifyAdminSession } from "@/lib/admin-auth-client";
import "@/app/admin/erp/erp.css";

export default function ErpPage() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await verifyAdminSession();
      if (cancelled) return;
      setReady(ok);
      if (!ok) router.replace("/admin/access-logs?next=/erp");
    })();
    return () => {
      cancelled = true;
    };
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
