"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function WorkMediaRail({ work }: { work: NewCatalogWork }) {
  const media = work.images?.length ? work.images : [work.imageUrl].filter(Boolean);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const syncActive = useCallback(() => {
    const rail = railRef.current;
    if (!rail || !media.length) return;
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
  }, [media.length]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => syncActive();
    rail.addEventListener("scroll", onScroll, { passive: true });
    syncActive();
    return () => rail.removeEventListener("scroll", onScroll);
  }, [syncActive]);

  if (!media.length) return <div className="tk-photo-empty">Medya yok</div>;

  return (
    <div className="tk-photo-wrap">
      <div className="tk-photo-rail" ref={railRef}>
        {media.map((src, i) => {
          const href = displayMediaSrc(src, 1920);
          const video = isVideoUrl(src) || work.mediaType === "video";
          return (
            <div className="tk-photo" data-photo key={`${work.id}-${i}`}>
              {video ? (
                <video src={href} controls playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={href} alt={`${work.title} — ${i + 1}`} loading="lazy" />
              )}
            </div>
          );
        })}
      </div>
      {media.length > 1 ? (
        <>
          <div className="tk-dots">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                className="tk-dot"
                aria-current={i === active ? "true" : undefined}
                onClick={() => {
                  railRef.current
                    ?.querySelectorAll<HTMLElement>("[data-photo]")
                    [i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
              />
            ))}
          </div>
          <p className="tk-hint">Kaydır →</p>
        </>
      ) : null}
    </div>
  );
}

export function NewCatalogApp({
  initialCategoryId,
}: {
  initialCategoryId?: string;
}) {
  const [catalog, setCatalog] = useState<NewCatalogPublic | null>(null);
  const [error, setError] = useState("");
  const [activeCatId, setActiveCatId] = useState<string | null>(initialCategoryId || null);
  const [inquiryWork, setInquiryWork] = useState<NewCatalogWork | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/new", { cache: "no-store" });
        if (!res.ok) throw new Error("Katalog yüklenemedi");
        const data = (await res.json()) as NewCatalogPublic;
        if (!cancelled) {
          setCatalog(data);
          if (!activeCatId && data.categories[0]) {
            setActiveCatId(data.categories[0].id);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Katalog yüklenemedi");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCat: NewCatalogPublicCategory | null = useMemo(() => {
    if (!catalog) return null;
    return catalog.categories.find((c) => c.id === activeCatId) || catalog.categories[0] || null;
  }, [catalog, activeCatId]);

  if (error) return <div className="tk-error">{error}</div>;
  if (!catalog) return <div className="tk-loading">Katalog hazırlanıyor…</div>;

  const siteHref = catalog.website?.trim() || SITE_URL;
  const heroSrc =
    firstStillUrl(
      activeCat?.works?.[0]
        ? [activeCat.coverUrl, activeCat.works[0].imageUrl]
        : catalog.categories.map((c) => c.coverUrl).filter(Boolean)
    ) || "";

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
          <>
            <div className="tk-cat-rail" role="tablist" aria-label="Kategoriler">
              {catalog.categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  className={`tk-cat-chip${activeCat?.id === cat.id ? " is-active" : ""}`}
                  aria-selected={activeCat?.id === cat.id}
                  onClick={() => setActiveCatId(cat.id)}
                >
                  <span className="tk-cat-chip-name">{cat.name}</span>
                  <span className="tk-cat-chip-count">{cat.workCount}</span>
                </button>
              ))}
            </div>

            {activeCat ? (
              <div className="tk-list" style={{ marginTop: 28 }}>
                {activeCat.intro ? (
                  <p className="tk-section-note" style={{ marginBottom: 8 }}>
                    {activeCat.intro}
                  </p>
                ) : null}
                <p className="tk-kicker" style={{ marginBottom: 12 }}>
                  {activeCat.name}
                </p>
                {activeCat.works.map((work) => (
                  <article className="tk-work" key={work.id} id={`work-${work.id}`}>
                    <WorkMediaRail work={work} />
                    <div className="tk-work-body">
                      <div className="tk-meta-row">
                        <span>
                          {work.number} / {work.category}
                        </span>
                        {work.year ? <span>{work.year}</span> : <span />}
                      </div>
                      <h3 className="tk-work-title">{work.title}</h3>
                      <dl className="tk-facts">
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
            ) : null}
          </>
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
