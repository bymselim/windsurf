"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

const DEFAULT_KVKK_TEXT = `
KVKK Aydınlatma Metni (Özet)

Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında kişisel verilerinizin işlenmesine ilişkin aydınlatma amacıyla sunulmaktadır.

Veri Sorumlusu: Galeri işletmesi adına veri sorumlusu.

İşlenen Veriler: Ad soyad, telefon numarası ve erişim sırasında oluşan teknik veriler (IP, zaman damgası).

İşleme Amaçları: Erişim kontrolü, güvenlik ve yasal yükümlülüklerin yerine getirilmesi.

Hukuki Sebep: Açık rızanız ve meşru menfaat.

Saklama Süresi: Yasal zorunluluklar çerçevesinde saklanacaktır.

Haklarınız: Kişisel verilerinize erişim, düzeltme, silme, işlemenin kısıtlanması ve itiraz haklarınızı kullanabilirsiniz. Başvuru için [iletişim] üzerinden yazılı talepte bulunabilirsiniz.

Detaylı metin için galeri yönetimi ile iletişime geçiniz.
`.trim();

type KVKKModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Override from access gate settings; falls back to default text if empty. */
  kvkkText?: string;
};

export function KVKKModal({ isOpen, onClose, kvkkText = "" }: KVKKModalProps) {
  const text = (kvkkText && kvkkText.trim()) ? kvkkText.trim() : DEFAULT_KVKK_TEXT;
  useEffect(() => {
    if (isOpen) {
      const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="kvkk-title"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="kvkk-title" className="text-lg font-semibold text-zinc-100">
                KVKK Aydınlatma Metni
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                aria-label="Close"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-sm leading-relaxed text-zinc-300">
              {text.split("\n\n").map((p, i) => (
                <p key={i} className="mb-3 last:mb-0">
                  {p}
                </p>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-lg bg-amber-500 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-600"
            >
              Kapat
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
