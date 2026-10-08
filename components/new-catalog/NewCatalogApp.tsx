"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  NewCatalogPublic,
  NewCatalogPublicCategory,
  NewCatalogWork,
} from "@/lib/new-catalog-types";
import {
  displayMediaSrc,
  firstStillUrl,
  isVideoUrl,
} from "@/lib/tanidikalan-media";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "908505327262";
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "info@melikesevinc.com";
const INSTAGRAM_HANDLE =
  process.env.NEXT_PUBLIC_INSTAGRAM ??
  process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME ??
  "bymelikesevinc";
const SITE_URL = "https://www.melikesevinc.com";

function inquiryWhatsApp(work: NewCatalogWork): string {
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

function inquiryEmail(work: NewCatalogWork): string {
  const subject = encodeURIComponent(`Inquiry / Talep: ${work.title}`);
  const body = encodeURIComponent(
    [
      `Merhaba,`,
      ``,
      `"${work.title}" (${work.category}) eseri için talep göndermek istiyorum.`,
      work.dimensions ? `Ölçü: ${work.dimensions}` : "",
      ``,
      `Hello, I would like to inquire about "${work.title}".`,
      `Thank you.`,
    ].join("\n")
  );
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function SiteButton({ href }: { href: string }) {
  return (
    <a className="tk-site-btn" href={href} target="_blank" rel="noreferrer">
      melikesevinc.com →
    </a>
  );
}

function InquiryModal({
  work,
  onClose,
}: {
  work: NewCatalogWork;
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
      <div className="tk-modal" role="dialog" aria-modal="true">
        <h2>Talep et</h2>
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

/** Bir kategorinin seçili eserleri — yatay kaydırma. */
function CategorySwipeRail({
  category,
  onInquiry,
}: {
  category: NewCatalogPublicCategory;
  onInquiry: (work: NewCatalogWork) => void;
}) {
  const works = category.works;
  const railRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const syncActive = useCallback(() => {
    const rail = railRef.current;
    if (!rail || !works.length) return;
    const slides = Array.from(rail.querySelectorAll<HTMLElement>("[data-slide]"));
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
  }, [works.length]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => syncActive();
    rail.addEventListener("scroll", onScroll, { passive: true });
    syncActive();
    return () => rail.removeEventListener("scroll", onScroll);
  }, [syncActive]);

  if (!works.length) {
    return <div className="tk-photo-empty">Bu kategoride seçili eser yok</div>;
  }

  const current = works[active] || works[0];

  return (
    <div className="tk-photo-wrap">
      <div className="tk-photo-rail" ref={railRef}>
        {works.map((work, i) => {
          const src = work.imageUrl || work.images?.[0] || "";
          const href = displayMediaSrc(src, 1920);
          const video = isVideoUrl(src) || work.mediaType === "video";
          return (
            <div className="tk-photo" data-slide key={work.id}>
              {video ? (
                <video
                  src={href}
                  controls
                  playsInline
                  preload={i === active ? "metadata" : "none"}
                  aria-label={`${work.title}`}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={href} alt={work.title} loading="lazy" />
              )}
            </div>
          );
        })}
      </div>

      {works.length > 1 ? (
        <>
          <div className="tk-dots" role="tablist" aria-label={`${category.name} eserleri`}>
            {works.map((work, i) => (
              <button
                key={work.id}
                type="button"
                className="tk-dot"
                aria-label={work.title}
                aria-current={i === active ? "true" : undefined}
                onClick={() => {
                  railRef.current
                    ?.querySelectorAll<HTMLElement>("[data-slide]")
                    [i]?.scrollIntoView({
                      behavior: "smooth",
                      inline: "center",
                      block: "nearest",
                    });
                }}
              />
            ))}
          </div>
          <p className="tk-hint">Kaydır →</p>
        </>
      ) : null}

      {current ? (
        <div className="tk-work-body" style={{ marginTop: 18, padding: "0 4px" }}>
          <div className="tk-meta-row">
            <span>
              {current.number} / {current.category}
            </span>
            <span>
              {active + 1} / {works.length}
            </span>
          </div>
          <h3 className="tk-work-title">{current.title}</h3>
          <dl className="tk-facts">
            {current.dimensions ? (
              <div>
                <dt>Dimensions</dt>
                <dd>{current.dimensions}</dd>
              </div>
            ) : null}
          </dl>
          {(current.priceTR || current.priceUSD) && (
            <div className="tk-price">
              {[current.priceTR, current.priceUSD].filter(Boolean).join("  /  ")}
            </div>
          )}
          <button
            type="button"
            className="tk-inquiry-btn"
            onClick={() => onInquiry(current)}
          >
            Talep et / Inquiry
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function NewCatalogApp() {
  const [catalog, setCatalog] = useState<NewCatalogPublic | null>(null);
  const [error, setError] = useState("");
  const [inquiryWork, setInquiryWork] = useState<NewCatalogWork | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/new", { cache: "no-store" });
        if (!res.ok) throw new Error("Katalog yüklenemedi");
        const data = (await res.json()) as NewCatalogPublic;
        if (!cancelled) setCatalog(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Katalog yüklenemedi");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="tk-error">{error}</div>;
  if (!catalog) return <div className="tk-loading">Katalog hazırlanıyor…</div>;

  const siteHref = catalog.website?.trim() || SITE_URL;
  const heroSrc =
    firstStillUrl(catalog.categories.map((c) => c.coverUrl).filter(Boolean)) || "";

  return (
    <div className="tk-shell">
      <section className="tk-hero" aria-label="Giriş">
        <div className="tk-hero-media">
          {heroSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayMediaSrc(heroSrc, 1920)} alt="" />
          ) : null}
          <div className="tk-hero-shade" />
        </div>
        <div className="tk-hero-copy">
          <h1 className="tk-brand">{catalog.brand}</h1>
          <p className="tk-headline">{catalog.subtitle}</p>
          <p className="tk-lead">
            {[catalog.years, catalog.tagline].filter(Boolean).join(" · ")}
          </p>
          <a className="tk-cta" href="#katalog">
            Koleksiyonu gör
          </a>
        </div>
      </section>

      <div className="tk-site-btn-wrap">
        <SiteButton href={siteHref} />
      </div>

      <section className="tk-section" id="katalog" aria-label="Katalog">
        <div className="tk-section-head">
          <p className="tk-kicker">{catalog.subtitle || "Selected works"}</p>
          {catalog.intro ? <p className="tk-section-note">{catalog.intro}</p> : null}
        </div>

        {catalog.categories.length === 0 ? (
          <div className="tk-photo-empty" style={{ margin: "0 24px" }}>
            Henüz seçili eser yok. Admin → New Katalog’dan kategorilere fotoğraf ekleyin.
          </div>
        ) : (
          <div className="tk-list">
            {catalog.categories.map((cat) => (
              <section
                key={cat.id}
                className="tk-work"
                id={`cat-${cat.id}`}
                aria-label={cat.name}
              >
                <div className="tk-section-head" style={{ padding: 0, marginBottom: 14 }}>
                  <p className="tk-kicker">Series</p>
                  <h2 className="tk-section-title" style={{ fontSize: "clamp(1.6rem, 4.5vw, 2.2rem)" }}>
                    {cat.name}
                  </h2>
                  {cat.intro ? (
                    <p className="tk-section-note">{cat.intro}</p>
                  ) : null}
                </div>
                <CategorySwipeRail
                  category={cat}
                  onInquiry={setInquiryWork}
                />
              </section>
            ))}
          </div>
        )}
      </section>

      <div className="tk-site-btn-wrap end">
        <SiteButton href={siteHref} />
      </div>

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
