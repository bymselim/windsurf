"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VerifyCertificateWaves } from "./verify-certificate-waves";
import { DEFAULT_VERIFY_DECLARATION, type VerifyDeclaration } from "@/lib/verify-declaration-io";

type VerifyPayload = {
  webpin: string;
  serialNumber: string;
  artworkTitle: string;
  artworkDate: string;
  ownerName: string;
  contactNotes: string;
  mediaUrls: string[];
  previousOwners: { ownerName: string; fromDate?: string; toDate?: string }[];
};

type Lang = "tr" | "en";

const PURPLE = "#7D5BB2";
const SLATE = "#5c5678";

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
}

function FieldLabel({ tr, en }: { tr: string; en: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: SLATE }}>
      <span style={{ color: PURPLE }}>{tr}</span>
      <span className="mx-1.5 text-neutral-400" aria-hidden>
        ·
      </span>
      <span className="text-neutral-500">{en}</span>
    </p>
  );
}

const UI: Record<
  Lang,
  {
    intro: string;
    webpinPlaceholder: string;
    verify: string;
    verifying: string;
    errEmptyPin: string;
    err404: string;
    errGeneric: string;
    errNetwork: string;
    errChangeShort: string;
    errChangeSend: string;
    errChangeFail: string;
    errChangeStorage: string;
    send: string;
    sending: string;
    cancel: string;
    changeRequest: string;
    yourRequest: string;
    changePlaceholder: string;
    noContact: string;
    dash: string;
    footer: string;
    authenticity: string;
    titleMain: string;
    coaLineEn: string;
    coaLineTr: string;
    successTr: string;
    successEn: string;
    artistUrl: string;
    artistRole: string;
  }
> = {
  tr: {
    intro: "Sertifikanızda yer alan webpin numarasını girerek eser bilgilerinizi güvenle doğrulayın.",
    webpinPlaceholder: "Örn. ABC12XY",
    verify: "Doğrula",
    verifying: "Sorgulanıyor…",
    errEmptyPin: "Lütfen webpin numaranızı girin.",
    err404: "Bu webpin ile eşleşen kayıt bulunamadı. Numarayı kontrol edin veya iletişime geçin.",
    errGeneric: "Doğrulama şu an yapılamadı. Lütfen daha sonra tekrar deneyin.",
    errNetwork: "Bağlantı hatası. Ağınızı kontrol edip tekrar deneyin.",
    errChangeShort: "Lütfen talebinizi birkaç cümle ile açıklayın.",
    errChangeSend: "Gönderilemedi.",
    errChangeFail: "Gönderim başarısız.",
    errChangeStorage:
      "Talep sunucuya yazılamadı (bulut ortamı). Lütfen bir süre sonra tekrar deneyin veya melikesevinc.com üzerinden iletişime geçin.",
    send: "Gönder",
    sending: "Gönderiliyor…",
    cancel: "Vazgeç",
    changeRequest: "Değişiklik talep et",
    yourRequest: "Talebiniz",
    changePlaceholder: "Hangi bilginin güncellenmesini istediğinizi yazın…",
    noContact: "Bu kayıt için iletişim bilgisi eklenmemiş.",
    dash: "—",
    footer: "Melike Sevinc · Eser doğrulama",
    authenticity: "Authenticity · Otantiklik",
    titleMain: "VERIFY YOUR ART",
    coaLineEn: "Certificate of Authenticity",
    coaLineTr: "Sahiplik sertifikası",
    successTr:
      "Talebiniz alındı. Size melikesevinc.com üzerinden ulaşılacak ve bilgilerinizin teyidi alınacaktır; onaylanması halinde düzenlemeler gerçekleşecektir.",
    successEn:
      "Your request has been received. You will be contacted via melikesevinc.com to confirm your details; if approved, the updates will be applied.",
    artistUrl: "www.melikesevinc.com",
    artistRole: "Artist · Sanatçı",
  },
  en: {
    intro: "Enter the webpin from your certificate to verify your artwork details securely.",
    webpinPlaceholder: "e.g. ABC12XY",
    verify: "Verify",
    verifying: "Checking…",
    errEmptyPin: "Please enter your webpin.",
    err404: "No record matches this webpin. Check the number or contact us.",
    errGeneric: "Verification is unavailable right now. Please try again later.",
    errNetwork: "Connection error. Check your network and try again.",
    errChangeShort: "Please describe your request in a few sentences.",
    errChangeSend: "Could not send.",
    errChangeFail: "Send failed.",
    errChangeStorage:
      "Your request could not be saved. Please try again later or contact us via melikesevinc.com.",
    send: "Send",
    sending: "Sending…",
    cancel: "Cancel",
    changeRequest: "Request a change",
    yourRequest: "Your request",
    changePlaceholder: "Describe which information you would like updated…",
    noContact: "No contact details have been added for this record.",
    dash: "—",
    footer: "Melike Sevinc · Artwork verification",
    authenticity: "Authenticity · Otantiklik",
    titleMain: "VERIFY YOUR ART",
    coaLineEn: "Certificate of Authenticity",
    coaLineTr: "Sahiplik sertifikası",
    successTr:
      "Talebiniz alındı. Size melikesevinc.com üzerinden ulaşılacak ve bilgilerinizin teyidi alınacaktır; onaylanması halinde düzenlemeler gerçekleşecektir.",
    successEn:
      "Your request has been received. You will be contacted via melikesevinc.com to confirm your details; if approved, the updates will be applied.",
    artistUrl: "www.melikesevinc.com",
    artistRole: "Artist · Sanatçı",
  },
};

const FIELD = {
  record: { tr: "Kayıt", en: "Record" },
  serial: { tr: "Seri numarası", en: "Serial number" },
  media: { tr: "Görsel / video", en: "Photo & video" },
  title: { tr: "Eser adı", en: "Artwork title" },
  date: { tr: "Tarih", en: "Date" },
  ownerName: { tr: "Adı soyadı", en: "Name surname" },
  ownerRole: { tr: "Sahip", en: "Owner" },
  contact: { tr: "İletişim", en: "Contact" },
  prev: { tr: "Önceki sahiplikler", en: "Previous ownership" },
  prevNameCol: { tr: "Adı soyadı", en: "Name surname" },
  prevDatesCol: { tr: "Tarihler", en: "Dates" },
  webpin: { tr: "Webpin", en: "Webpin" },
};

export default function VerifyYourArtPage() {
  const [lang, setLang] = useState<Lang>("tr");
  const t = UI[lang];

  const [declaration, setDeclaration] = useState<VerifyDeclaration>(() => ({ ...DEFAULT_VERIFY_DECLARATION }));

  const [pinInput, setPinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerifyPayload | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeText, setChangeText] = useState("");
  const [changeSending, setChangeSending] = useState(false);
  const [changeDone, setChangeDone] = useState(false);
  const [changeErr, setChangeErr] = useState<string | null>(null);

  /** Webpin sonrası güncel metin (vadmin kaydından sonra da tekrar doğrulayınca gelir). */
  useEffect(() => {
    if (!data) return;
    void (async () => {
      try {
        const r = await fetch("/api/public/verify-declaration");
        if (!r.ok) return;
        const j = (await r.json()) as Partial<VerifyDeclaration>;
        if (typeof j?.en === "string" && typeof j?.tr === "string") {
          setDeclaration({ en: j.en, tr: j.tr });
        }
      } catch {
        /* varsayılan */
      }
    })();
  }, [data]);

  const lookup = useCallback(async () => {
    const q = pinInput.trim();
    const messages = UI[lang];
    if (!q) {
      setError(messages.errEmptyPin);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    setChangeOpen(false);
    setChangeDone(false);
    setChangeText("");
    setChangeErr(null);
    try {
      const res = await fetch(`/api/public/verify-art?webpin=${encodeURIComponent(q)}`);
      if (res.status === 404) {
        setError(messages.err404);
        return;
      }
      if (!res.ok) {
        setError(messages.errGeneric);
        return;
      }
      const json = (await res.json()) as VerifyPayload;
      setData(json);
    } catch {
      setError(messages.errNetwork);
    } finally {
      setLoading(false);
    }
  }, [pinInput, lang]);

  const sendChangeRequest = async () => {
    if (!data?.webpin) return;
    const messages = UI[lang];
    const msg = changeText.trim();
    if (msg.length < 5) {
      setChangeErr(messages.errChangeShort);
      return;
    }
    setChangeSending(true);
    setChangeErr(null);
    try {
      const res = await fetch("/api/public/verify-art/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webpin: data.webpin, message: msg }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        const code = j?.error;
        if (code === "storage_failed") setChangeErr(messages.errChangeStorage);
        else if (code === "not_found") setChangeErr(messages.err404);
        else setChangeErr(typeof code === "string" ? code : messages.errChangeSend);
        return;
      }
      setChangeDone(true);
      setChangeText("");
      setChangeOpen(false);
    } catch {
      setChangeErr(messages.errChangeFail);
    } finally {
      setChangeSending(false);
    }
  };

  const langToggle = useMemo(
    () => (
      <div
        className="inline-flex rounded-full border border-[#d4c4e8] bg-white/90 p-0.5 text-xs font-semibold shadow-sm backdrop-blur"
        role="group"
        aria-label="Language"
      >
        <button
          type="button"
          onClick={() => setLang("tr")}
          className={`rounded-full px-3 py-1.5 transition ${
            lang === "tr" ? "bg-[#7D5BB2] text-white shadow-sm" : "text-neutral-500 hover:text-[#7D5BB2]"
          }`}
        >
          TR
        </button>
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`rounded-full px-3 py-1.5 transition ${
            lang === "en" ? "bg-[#7D5BB2] text-white shadow-sm" : "text-neutral-500 hover:text-[#7D5BB2]"
          }`}
        >
          EN
        </button>
      </div>
    ),
    [lang]
  );

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fafafa] text-neutral-800">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,rgba(125,91,178,0.08),transparent_55%)]"
        aria-hidden
      />
      <VerifyCertificateWaves />
      <div
        className="pointer-events-none absolute right-0 top-0 hidden h-full w-1.5 bg-gradient-to-b from-[#7D5BB2] via-[#5a3d9e] to-transparent opacity-70 md:block"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-8 px-4 pb-28 pt-10 sm:gap-10 sm:px-6 sm:pt-14 md:pb-32">
        <div className="flex justify-end">{langToggle}</div>

        <header className="text-center animate-fade-in -mt-2">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.32em] text-[#7D5BB2]/85 sm:text-[11px]">
            {t.authenticity}
          </p>
          <h1 className="text-3xl font-bold uppercase tracking-[0.06em] text-[#7D5BB2] sm:text-4xl md:text-5xl">
            {t.titleMain}
          </h1>
          <div className="mx-auto mt-3 max-w-lg space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D5BB2] sm:text-sm">{t.coaLineEn}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 sm:text-xs">
              {t.coaLineTr}
            </p>
          </div>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">{t.intro}</p>
        </header>

        <section
          className="relative rounded-2xl border border-[#e8dff5] bg-[#f3ecfa]/95 p-6 shadow-[0_12px_40px_-24px_rgba(125,91,178,0.45)] sm:p-8 animate-fade-in"
          style={{ animationDelay: "0.08s" }}
        >
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#7D5BB2]/25 to-transparent" />
          <label className="block">
            <FieldLabel tr={FIELD.webpin.tr} en={FIELD.webpin.en} />
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <input
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void lookup()}
                placeholder={t.webpinPlaceholder}
                className="min-h-[48px] flex-1 rounded-xl border border-white/80 bg-white px-4 py-3 text-base text-neutral-900 shadow-inner outline-none ring-0 transition placeholder:text-neutral-400 focus:border-[#7D5BB2]/50 focus:ring-2 focus:ring-[#7D5BB2]/20"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => void lookup()}
                disabled={loading}
                className="min-h-[48px] shrink-0 rounded-xl bg-[#7D5BB2] px-6 text-sm font-semibold text-white shadow-md transition hover:bg-[#6a4fa0] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? t.verifying : t.verify}
              </button>
            </div>
          </label>
          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800">{error}</p>
          )}
        </section>

        {data && (
          <section className="space-y-8 animate-fade-in">
            <div className="relative rounded-2xl border border-neutral-200 bg-white/95 p-6 shadow-lg sm:p-8">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-neutral-100 pb-6">
                <div>
                  <FieldLabel tr={FIELD.record.tr} en={FIELD.record.en} />
                  <p className="mt-1 font-mono text-lg font-medium text-[#5a3d8a] sm:text-xl">{data.webpin}</p>
                </div>
                <div className="text-left sm:text-right">
                  <FieldLabel tr={FIELD.serial.tr} en={FIELD.serial.en} />
                  <p className="mt-1 font-mono text-sm text-neutral-700 sm:text-base">{data.serialNumber || t.dash}</p>
                </div>
              </div>

              {data.mediaUrls?.length > 0 && (
                <div className="mb-8">
                  <FieldLabel tr={FIELD.media.tr} en={FIELD.media.en} />
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {data.mediaUrls.map((url, i) =>
                      isVideoUrl(url) ? (
                        <video
                          key={`${url}-${i}`}
                          src={url}
                          controls
                          playsInline
                          className="aspect-video w-full rounded-xl border border-neutral-200 bg-black object-contain shadow-sm"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${url}-${i}`}
                          src={url}
                          alt=""
                          className="aspect-[4/3] w-full rounded-xl border border-neutral-200 object-cover shadow-sm"
                          loading="lazy"
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel tr={FIELD.title.tr} en={FIELD.title.en} />
                  <p
                    className="mt-2 text-xl font-semibold text-neutral-900 sm:text-2xl"
                    style={{ fontFamily: "var(--font-verify-display), Georgia, serif" }}
                  >
                    {data.artworkTitle}
                  </p>
                </div>
                <div>
                  <FieldLabel tr={FIELD.date.tr} en={FIELD.date.en} />
                  <p className="mt-2 text-lg text-neutral-700">{data.artworkDate || t.dash}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    <span style={{ color: PURPLE }}>{FIELD.ownerName.tr}</span>
                    <span className="mx-1.5 text-neutral-400" aria-hidden>
                      ·
                    </span>
                    <span className="text-neutral-500">{FIELD.ownerName.en}</span>
                    <span className="mx-2 text-neutral-400 normal-case tracking-normal">—</span>
                    <span className="normal-case tracking-normal text-neutral-600">
                      {FIELD.ownerRole.tr} / {FIELD.ownerRole.en}
                    </span>
                  </p>
                  <p className="mt-2 text-lg font-medium text-neutral-900">{data.ownerName}</p>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-[#ebe4f4] bg-[#faf8fc] p-5">
                <FieldLabel tr={FIELD.contact.tr} en={FIELD.contact.en} />
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
                  {data.contactNotes?.trim() ? data.contactNotes : t.noContact}
                </div>
              </div>

              {data.previousOwners?.length > 0 && (
                <div className="mt-8">
                  <FieldLabel tr={FIELD.prev.tr} en={FIELD.prev.en} />
                  <ul className="mt-3 space-y-3">
                    {data.previousOwners.map((o, i) => (
                      <li
                        key={i}
                        className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            {FIELD.prevNameCol.tr} · {FIELD.prevNameCol.en}
                          </p>
                          <span className="font-medium text-neutral-900">{o.ownerName}</span>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            {FIELD.prevDatesCol.tr} · {FIELD.prevDatesCol.en}
                          </p>
                          <span className="text-sm text-neutral-600">
                            {[o.fromDate, o.toDate].filter(Boolean).join(" → ") || t.dash}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-10 border-t border-neutral-100 pt-8">
                {!changeOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setChangeOpen(true);
                      setChangeErr(null);
                    }}
                    className="w-full rounded-xl border-2 border-[#7D5BB2]/35 bg-[#7D5BB2]/10 py-3.5 text-sm font-semibold text-[#5a3d8a] transition hover:bg-[#7D5BB2]/15 sm:w-auto sm:px-8"
                  >
                    {t.changeRequest}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{t.yourRequest}</span>
                      <textarea
                        value={changeText}
                        onChange={(e) => setChangeText(e.target.value)}
                        rows={5}
                        className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none focus:border-[#7D5BB2]/45 focus:ring-2 focus:ring-[#7D5BB2]/15"
                        placeholder={t.changePlaceholder}
                      />
                    </label>
                    {changeErr && <p className="text-sm text-red-600">{changeErr}</p>}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={changeSending}
                        onClick={() => void sendChangeRequest()}
                        className="rounded-xl bg-[#7D5BB2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#6a4fa0] disabled:opacity-50"
                      >
                        {changeSending ? t.sending : t.send}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChangeOpen(false);
                          setChangeErr(null);
                        }}
                        className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {changeDone && (
              <div
                role="status"
                className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/95 px-5 py-4 text-sm leading-relaxed text-emerald-900"
              >
                <p lang="tr">{t.successTr}</p>
                <p lang="en" className="border-t border-emerald-200/80 pt-3 text-emerald-800/95">
                  {t.successEn}
                </p>
              </div>
            )}

            {/* Sertifika beyanı — tablonun / sonuç bloğunun altında (vadmin’den düzenlenir) */}
            <div
              className="mx-auto w-full max-w-2xl rounded-2xl border border-neutral-200/90 bg-white/80 px-5 py-6 shadow-sm backdrop-blur-sm sm:px-8 sm:py-8"
              aria-labelledby="declaration-heading"
            >
              <h2 id="declaration-heading" className="sr-only">
                Certificate declaration
              </h2>
              <p
                lang="en"
                className="text-center text-[13px] leading-relaxed text-neutral-600 sm:text-sm md:text-[15px] md:leading-7"
              >
                {declaration.en}
              </p>
              <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-[#7D5BB2]/35 to-transparent" />
              <p
                lang="tr"
                className="text-center text-[13px] leading-relaxed text-neutral-500 sm:text-sm md:text-[15px] md:leading-7"
              >
                {declaration.tr}
              </p>
            </div>
          </section>
        )}

        <div className="mx-auto mt-4 w-full max-w-md border-t border-neutral-200/80 pt-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#7D5BB2]">Melike Sevinc</p>
          <p className="mt-1 text-xs text-neutral-500">{t.artistRole}</p>
          <a
            href="https://www.melikesevinc.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-neutral-500 underline-offset-2 hover:text-[#7D5BB2] hover:underline"
          >
            {t.artistUrl}
          </a>
        </div>

        <footer className="pb-6 text-center text-xs text-neutral-500">{t.footer}</footer>
      </div>
    </main>
  );
}
