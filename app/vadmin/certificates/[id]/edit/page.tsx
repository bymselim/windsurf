"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CertificateEditor from "@/app/vadmin/components/CertificateEditor";
import type { CertificateRecord } from "@/lib/certificate-types";
import { clearVadminPasswordClient, getVadminAuthHeaders } from "@/lib/vadmin-auth-client";

export default function EditCertificatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rec, setRec] = useState<CertificateRecord | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/vadmin/certificates?id=${encodeURIComponent(id)}`, {
        credentials: "include",
        headers: getVadminAuthHeaders(),
      });
      if (res.status === 401) {
        clearVadminPasswordClient();
        router.replace("/vadmin");
        return;
      }
      if (!res.ok) {
        if (!cancelled) setRec(null);
        return;
      }
      const data = (await res.json()) as CertificateRecord;
      if (!cancelled) setRec(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (rec === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        Yükleniyor…
      </div>
    );
  }

  if (!rec) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 text-center">
        <p className="text-zinc-400 mb-4">Kayıt bulunamadı.</p>
        <Link href="/vadmin/dashboard" className="text-amber-400 hover:text-amber-300">
          Panele dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto pt-2">
        <h1 className="text-xl font-semibold text-amber-100/90 mb-6">Kayıt düzenle</h1>
        <CertificateEditor mode="edit" initial={rec} />
      </div>
    </div>
  );
}
