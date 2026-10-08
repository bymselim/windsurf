"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TanidikalanCatalog as Catalog, TanidikalanWork } from "@/lib/tanidikalan-types";
import { workImages } from "@/lib/tanidikalan-types";
import { displayImageSrc } from "@/lib/tanidikalan-media";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "908505327262";
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "info@melikesevinc.com";
const INSTAGRAM_HANDLE =
  process.env.NEXT_PUBLIC_INSTAGRAM ??
  process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME ??
  "bymelikesevinc";

function inquiryWhatsApp(work: TanidikalanWork): string {
  const price = [work.priceTR, work.priceUSD].filter(Boolean).join(" / ");
  const text = [
    `Merhaba! "${work.title}" eseri için talep / inquiry göndermek istiyorum.`,
    work.dimensions ? `Ölçü: ${work.dimensions}` : "",
    price ? `Fiyat: ${price}` : "",
    "",
    `Hello! I would like to inquire about "${work.title}".`,
    "Please contact me.",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

function inquiryEmail(work: TanidikalanWork): string {
  const price = [work.priceTR, work.priceUSD].filter(Boolean).join(" / ");
  const subject = encodeURIComponent(`Inquiry / Talep: ${work.title}`);
  const body = encodeURIComponent(
    [
      `Merhaba,`,
      ``,
      `"${work.title}" eseri için bilgi / satın alma talebi göndermek istiyorum.`,
      work.dimensions ? `Ölçü: ${work.dimensions}` : "",
      price ? `Fiyat: ${price}` : "",
      ``,
      `Hello,`,
      `I would like to inquire about the artwork "${work.title}".`,
      `Please contact me with availability and next steps.`,
      ``,
      `Thank you.`,
    ]
      .filter((line) => line !== undefined)
      .join("\n")
  );
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function InquiryModal({
  work,
  onClose,
}: {
  work: TanidikalanWork;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const ig = `https://instagram.com/${INSTAGRAM_HANDLE.replace(/^@/, "")}`;

  return (
    <div className="tk-modal-root" role="presentation">
      <button type="button" className="tk-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        className="tk-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tk-inquiry-title"
      >
        <h2 id="tk-inquiry-title">Talep et</h2>
        <p className="tk-modal-sub">Inquiry</p>
        <p className="tk-modal-work">
          {work.number} · {work.title}
          {work.dimensions ? ` · ${work.dimensions}` : ""}
        </p>
        <div className="tk-modal-options">
          <a
            className="tk-modal-option"
            href={inquiryWhatsApp(work)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
          >
            <span>WhatsApp</span>
            <span aria-hidden>→</span>
          </a>
          <a className="tk-modal-option" href={inquiryEmail(work)} onClick={onClose}>
            <span>E-posta / Email</span>
            <span aria-hidden>→</span>
          </a>
          <a
            className="tk-modal-option"
            href={ig}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
          >
            <span>Instagram</span>
            <span aria-hidden>→</span>
          </a>
        </div>
        <button type="button" className="tk-modal-close" onClick={onClose}>
          Kapat / Close
        </button>
      </div>
    </div>
  );
}

function WorkPhotoRail({ work }: { work: TanidikalanWork }) {
  const images = workImages(work);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const syncActive = useCallback(() => {
    const rail = railRef.current;
    if (!rail || !images.length) return;
    const slides = Array.from(rail.querySelectorAll<HTMLElement>("[data-photo]"));
    if (!slides.length) return;
    const mid = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((slide, i) => {
      const center = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  }, [images.length]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => syncActive();
    rail.addEventListener("scroll", onScroll, { passive: true });
    syncActive();
    return () => rail.removeEventListener("scroll", onScroll);
  }, [syncActive]);

  if (!images.length) {
    return <div className="tk-photo-empty">Görsel yok</div>;
  }

  return (
    <div className="tk-photo-wrap">
      <div className="tk-photo-rail" ref={railRef}>
        {images.map((src, i) => (
          <div className="tk-photo" data-photo key={`${work.id}-${src}-${i}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageSrc(src, 1600)}
              alt={`${work.title} — ${i + 1}`}
              loading="lazy"
            />
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <>
          <div className="tk-dots" role="tablist" aria-label={`${work.title} fotoğrafları`}>
            {images.map((src, i) => (
              <button
                key={`${work.id}-dot-${i}`}
                type="button"
                className="tk-dot"
                aria-label={`Fotoğraf ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => {
                  const rail = railRef.current;
                  const slide = rail?.querySelectorAll<HTMLElement>("[data-photo]")[i];
                  slide?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
              />
            ))}
          </div>
          <p className="tk-hint">Fotoğrafları kaydır →</p>
        </>
      ) : null}
    </div>
  );
}

export function TanidikalanCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [inquiryWork, setInquiryWork] = useState<TanidikalanWork | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/tanidikalan", { cache: "no-store" });
        if (!res.ok) throw new Error("Katalog yüklenemedi");
        const data = (await res.json()) as Catalog;
        if (!cancelled) setCatalog(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Katalog yüklenemedi");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div className="tk-error">{error}</div>;
  }

  if (!catalog) {
    return <div className="tk-loading">Katalog hazırlanıyor…</div>;
  }

  const heroImage = workImages(catalog.works[0] || { imageUrl: "", images: [] })[0] || "";

  return (
    <div className="tk-shell">
      <section className="tk-hero" aria-label="Giriş">
        <div className="tk-hero-media">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayImageSrc(heroImage, 1920)} alt="" />
          ) : null}
          <div className="tk-hero-shade" />
        </div>
        <div className="tk-hero-copy">
          <h1 className="tk-brand">{catalog.brand}</h1>
          <p className="tk-headline">{catalog.subtitle}</p>
          <p className="tk-lead">
            {catalog.years}
            {catalog.tagline ? ` · ${catalog.tagline}` : ""}
          </p>
          <a className="tk-cta" href="#eserler">
            Eserleri gör
          </a>
        </div>
      </section>

      <section className="tk-section" id="eserler" aria-label="Seçili eserler">
        <div className="tk-section-head">
          <p className="tk-kicker">Selected works</p>
          <h2 className="tk-section-title">Altı heykel</h2>
          {catalog.intro ? <p className="tk-section-note">{catalog.intro}</p> : null}
        </div>

        <div className="tk-list">
          {catalog.works.map((work) => (
            <article className="tk-work" key={work.id} id={`work-${work.id}`}>
              <WorkPhotoRail work={work} />
              <div className="tk-work-body">
                <div className="tk-meta-row">
                  <span>
                    {work.number} / {work.category}
                  </span>
                  {work.year ? <span>{work.year}</span> : <span />}
                </div>
                <h3 className="tk-work-title">{work.title}</h3>
                <dl className="tk-facts">
                  {work.material ? (
                    <div>
                      <dt>Material</dt>
                      <dd>{work.material}</dd>
                    </div>
                  ) : null}
                  {work.dimensions ? (
                    <div>
                      <dt>Dimensions</dt>
                      <dd>{work.dimensions}</dd>
                    </div>
                  ) : null}
                </dl>
                {(work.priceTR || work.priceUSD) && (
                  <div className="tk-price">
                    {[work.priceTR, work.priceUSD].filter(Boolean).join("  /  ")}
                  </div>
                )}
                <button
                  type="button"
                  className="tk-inquiry-btn"
                  onClick={() => setInquiryWork(work)}
                >
                  Talep et / Inquiry
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="tk-artist">
        <h2>{catalog.artistName}</h2>
        <p>{catalog.artistRole}</p>
        <div className="tk-links">
          {catalog.website ? (
            <a href={catalog.website} target="_blank" rel="noreferrer">
              Website
            </a>
          ) : null}
          {catalog.instagram ? (
            <a href={catalog.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
          ) : null}
        </div>
      </footer>

      {inquiryWork ? (
        <InquiryModal work={inquiryWork} onClose={() => setInquiryWork(null)} />
      ) : null}
    </div>
  );
}
