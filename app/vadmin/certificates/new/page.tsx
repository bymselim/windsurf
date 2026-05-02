import CertificateEditor from "@/app/vadmin/components/CertificateEditor";

export default function NewCertificatePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto pt-2">
        <h1 className="text-xl font-semibold text-amber-100/90 mb-6">Yeni sertifika kaydı</h1>
        <CertificateEditor mode="create" />
      </div>
    </div>
  );
}
