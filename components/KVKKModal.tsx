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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="kvkk-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-700 px-4 py-3 sm:p-6 sm:pb-4">
              <h2 id="kvkk-title" className="text-base font-semibold text-zinc-100 sm:text-lg">
                KVKK Aydınlatma Metni
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="-mr-2 rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                aria-label="Kapat"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:p-6 sm:pt-4">
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-sm leading-relaxed text-zinc-300">
                {text.split("\n\n").map((p, i) => (
                  <p key={i} className="mb-3 last:mb-0">
                    {p}
                  </p>
                ))}
              </div>
            </div>
            <div className="shrink-0 border-t border-zinc-700 p-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-lg bg-amber-500 py-2.5 font-medium text-zinc-950 transition hover:bg-amber-600"
              >
                Kapat
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
