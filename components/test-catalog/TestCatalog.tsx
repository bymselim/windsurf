"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiHeart,
  FiHome,
  FiInstagram,
  FiMail,
  FiMenu,
  FiMessageCircle,
  FiSearch,
  FiShare2,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import type { Artwork, ArtworkFull } from "@/lib/types";
import type { CategoryJson } from "@/lib/categories-io";
import { mapFullToArtwork, type GalleryLocale } from "@/lib/gallery-locale";
import { isExternalImageUrl } from "@/lib/image-url-utils";

type View = "home" | "categories" | "category" | "detail" | "favorites" | "contact";

const FAV_KEY = "msa-test-favorites";
const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "905551234567";
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "info@gallery.com";
const INSTAGRAM_HANDLE =
  process.env.NEXT_PUBLIC_INSTAGRAM ??
  process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME ??
  "bymelikesevinc";

const COPY = {
  tr: {
    home: "Ana sayfa",
    categories: "Kategoriler",
    favorites: "Favoriler",
    contact: "İletişim",
    works: "Eserler",
    about: "Hakkımda",
    discover: "Koleksiyonu keşfet",
    heroTitle: "Sanat, daha neşeli bir dünya için.",
    heroQuote: "Art makes a happier world",
    all: "Tümü",
    worksCount: (n: number) => `${n} eser`,
    myFavorites: "Favorilerim",
    shareAll: "Tüm favorilerimi paylaş",
    emptyFav: "Henüz favori yok.",
    whatsappOrder: "WhatsApp ile sipariş ver",
    askQuestion: "Soru sor",
    description: "Açıklama",
    technical: "Teknik bilgiler",
    shipping: "Kargo ve teslimat",
    certificate: "Sertifika",
    shippingText:
      "Özenle paketlenir ve sigortalı kargo ile gönderilir. Teslimat süresi bölgeye göre değişir.",
    certificateText:
      "Her eser orijinallik belgesi ile birlikte teslim edilir.",
    year: "Yıl",
    technique: "Teknik",
    size: "Ölçü",
    series: "Seri",
    status: "Durum",
    forSale: "Satışta",
    contactLead: "Hayal ettiğin eser belki de bir mesaj kadar yakın.",
    contactQuote: "Little stories for a brighter world.",
    whatsapp: "WhatsApp",
    whatsappHint: "Hızlı ulaşım",
    email: "E-posta",
    emailHint: "Bize yazın",
    instagram: "Instagram",
    instagramHint: "Takip edin",
    searchPlaceholder: "Eser ara…",
    loading: "Yükleniyor…",
    noWorks: "Bu kategoride eser yok.",
    menuClose: "Kapat",
  },
  en: {
    home: "Home",
    categories: "Categories",
    favorites: "Favorites",
    contact: "Contact",
    works: "Artworks",
    about: "About",
    discover: "Discover the collection",
    heroTitle: "Art for a happier world.",
    heroQuote: "Art makes a happier world",
    all: "All",
    worksCount: (n: number) => `${n} works`,
    myFavorites: "My favorites",
    shareAll: "Share all favorites",
    emptyFav: "No favorites yet.",
    whatsappOrder: "Order via WhatsApp",
    askQuestion: "Ask a question",
    description: "Description",
    technical: "Technical details",
    shipping: "Shipping & delivery",
    certificate: "Certificate",
    shippingText:
      "Carefully packed and shipped with insured delivery. Timing varies by region.",
    certificateText: "Each artwork is delivered with a certificate of authenticity.",
    year: "Year",
    technique: "Technique",
    size: "Size",
    series: "Series",
    status: "Status",
    forSale: "Available",
    contactLead: "The piece you imagine may be just one message away.",
    contactQuote: "Little stories for a brighter world.",
    whatsapp: "WhatsApp",
    whatsappHint: "Quick reach",
    email: "Email",
    emailHint: "Write to us",
    instagram: "Instagram",
    instagramHint: "Follow us",
    searchPlaceholder: "Search artworks…",
    loading: "Loading…",
    noWorks: "No artworks in this category.",
    menuClose: "Close",
  },
} as const;

function formatPrice(artwork: Artwork, locale: GalleryLocale): string {
  const n = artwork.price || 0;
  if (locale === "en" || artwork.currency === "$") {
    return `€ ${n.toLocaleString("de-DE")}`;
  }
  return `₺ ${n.toLocaleString("tr-TR")}`;
}

function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  localStorage.setItem(FAV_KEY, JSON.stringify(ids));
}

function Media({
  src,
  alt,
  fill,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) {
    return <div className={className} style={{ background: "var(--msa-bg-soft)" }} />;
  }
  const external = isExternalImageUrl(src);
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes ?? "50vw"}
        unoptimized={external}
        priority={priority}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}

export function TestCatalog() {
  const [locale, setLocale] = useState<GalleryLocale>("tr");
  const t = COPY[locale];

  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [categories, setCategories] = useState<CategoryJson[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    description: true,
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, artRes] = await Promise.all([
        fetch("/api/categories", { credentials: "include" }),
        fetch("/api/artworks?limit=200&page=1&seed=test-catalog", {
          credentials: "include",
        }),
      ]);
      const catData = catRes.ok ? await catRes.json() : [];
      const artData = artRes.ok ? await artRes.json() : [];
      const cats = Array.isArray(catData) ? (catData as CategoryJson[]) : [];
      setCategories(cats.filter((c) => !c.hidden));

      const itemsRaw = Array.isArray(artData)
        ? artData
        : Array.isArray(artData?.items)
          ? artData.items
          : [];
      setArtworks(
        (itemsRaw as ArtworkFull[]).map((a) => mapFullToArtwork(a, locale))
      );
    } catch {
      setCategories([]);
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const heroArtworks = useMemo(
    () => artworks.filter((a) => a.isFeatured).slice(0, 3).concat(artworks.slice(0, 3)).slice(0, 3),
    [artworks]
  );

  useEffect(() => {
    if (heroArtworks.length < 2) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroArtworks.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [heroArtworks.length]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of artworks) {
      map.set(a.category, (map.get(a.category) ?? 0) + 1);
    }
    return map;
  }, [artworks]);

  const categoryList = useMemo(() => {
    return categories.length
      ? categories
      : Array.from(categoryCounts.keys()).map(
          (name) =>
            ({
              name,
              color: "#e2a4b3",
              icon: "",
            }) as CategoryJson
        );
  }, [categories, categoryCounts]);

  const filteredByCategory = useMemo(() => {
    if (!activeCategory) return artworks;
    return artworks.filter((a) => a.category === activeCategory);
  }, [artworks, activeCategory]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return [];
    return artworks.filter(
      (a) =>
        a.title.toLocaleLowerCase("tr").includes(q) ||
        a.category.toLocaleLowerCase("tr").includes(q)
    );
  }, [artworks, query]);

  const selected = useMemo(
    () => artworks.find((a) => a.id === selectedId) ?? null,
    [artworks, selectedId]
  );

  const favoriteArtworks = useMemo(
    () => artworks.filter((a) => favorites.includes(a.id)),
    [artworks, favorites]
  );

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      saveFavorites(next);
      return next;
    });
  };

  const openCategory = (name: string | null) => {
    setActiveCategory(name);
    setView("category");
    setMenuOpen(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDetail = (id: string) => {
    setSelectedId(id);
    setView("detail");
    setOpenAccordions({ description: true });
    setMenuOpen(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const go = (next: View) => {
    setView(next);
    setMenuOpen(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const whatsappHref = (artwork?: Artwork | null) => {
    const digits = WHATSAPP_NUMBER.replace(/\D/g, "");
    if (!artwork) {
      const text =
        locale === "tr"
          ? "Merhaba! Koleksiyon hakkında bilgi almak istiyorum."
          : "Hello! I'd like to learn more about the collection.";
      return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    }
    const text =
      locale === "tr"
        ? `Merhaba! '${artwork.title}' adlı eseri sipariş vermek istiyorum.`
        : `Hello! I'd like to order '${artwork.title}'.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  const shareFavorites = async () => {
    const lines = favoriteArtworks.map(
      (a) => `• ${a.title} — ${formatPrice(a, locale)}`
    );
    const text =
      (locale === "tr" ? "Favori eserlerim:\n" : "My favorite artworks:\n") +
      lines.join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Melike Sevinç Art", text });
        return;
      } catch {
        // fall through
      }
    }
    await navigator.clipboard.writeText(text);
    alert(locale === "tr" ? "Favoriler panoya kopyalandı." : "Favorites copied.");
  };

  const previewForCategory = (name: string) => {
    const cat = categoryList.find((c) => c.name === name);
    if (cat?.previewImageUrl) return cat.previewImageUrl;
    return artworks.find((a) => a.category === name)?.thumbnailUrl ||
      artworks.find((a) => a.category === name)?.imageUrl ||
      "";
  };

  const header = (
    <header className={`msa-header ${scrolled ? "scrolled" : ""}`}>
      <button type="button" className="msa-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
        <FiSearch size={20} />
      </button>
      <button type="button" className="msa-logo" onClick={() => go("home")}>
        Melike Sevinç Art
      </button>
      <button type="button" className="msa-icon-btn" onClick={() => setMenuOpen(true)} aria-label="Menu">
        <FiMenu size={22} />
      </button>
    </header>
  );

  const bottomNav = (
    <nav className="msa-bottom-nav">
      <button
        type="button"
        className={view === "home" ? "active" : ""}
        onClick={() => go("home")}
      >
        <FiHome />
        {t.home}
      </button>
      <button
        type="button"
        className={view === "categories" || view === "category" ? "active" : ""}
        onClick={() => go("categories")}
      >
        <FiMenu />
        {t.categories}
      </button>
      <button
        type="button"
        className={view === "favorites" ? "active" : ""}
        onClick={() => go("favorites")}
      >
        <FiHeart />
        {t.favorites}
      </button>
      <button
        type="button"
        className={view === "contact" ? "active" : ""}
        onClick={() => go("contact")}
      >
        <FiMessageCircle />
        {t.contact}
      </button>
    </nav>
  );

  const artworkCard = (a: Artwork) => (
    <article key={a.id} className="msa-card">
      <button
        type="button"
        className="msa-card-media"
        onClick={() => openDetail(a.id)}
        style={{ border: "none", padding: 0, cursor: "pointer", width: "100%" }}
      >
        <Media
          src={a.thumbnailUrl || a.imageUrl}
          alt={a.title}
          fill
          className="object-cover"
          sizes="45vw"
        />
      </button>
      <button
        type="button"
        className={`msa-heart ${favorites.includes(a.id) ? "on" : ""}`}
        onClick={() => toggleFavorite(a.id)}
        aria-label="Favorite"
      >
        <FiHeart fill={favorites.includes(a.id) ? "currentColor" : "none"} />
      </button>
      <div className="msa-card-meta">
        <button
          type="button"
          onClick={() => openDetail(a.id)}
          style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}
        >
          <div className="msa-card-title">{a.title}</div>
          <div className="msa-card-price">{formatPrice(a, locale)}</div>
        </button>
      </div>
    </article>
  );

  return (
    <div className="msa-app">
      {header}

      <main className="msa-main">
        {loading && (
          <p style={{ textAlign: "center", color: "var(--msa-muted)", padding: "3rem 1rem" }}>
            {t.loading}
          </p>
        )}

        {!loading && view === "home" && (
          <section className="msa-fade-in">
            <div style={{ position: "relative", aspectRatio: "3 / 4.1", background: "var(--msa-bg-soft)" }}>
              {heroArtworks[heroIndex] && (
                <Media
                  src={heroArtworks[heroIndex].imageUrl}
                  alt={heroArtworks[heroIndex].title}
                  fill
                  priority
                  className="object-cover"
                  sizes="480px"
                />
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(254,250,246,0.05) 35%, rgba(254,250,246,0.92) 78%, var(--msa-bg) 100%)",
                }}
              />
              <p
                className="msa-script"
                style={{
                  position: "absolute",
                  left: "1.1rem",
                  right: "1.1rem",
                  bottom: "38%",
                  fontSize: "1.55rem",
                  color: "var(--msa-ink)",
                  textShadow: "0 1px 12px rgba(255,255,255,0.7)",
                }}
              >
                {t.heroQuote} ♥
              </p>
            </div>
            <div style={{ padding: "0 1.25rem 1.5rem", marginTop: "-1.5rem", position: "relative" }}>
              <h1
                className="msa-display"
                style={{ fontSize: "2rem", fontWeight: 600, lineHeight: 1.15, marginBottom: "1rem" }}
              >
                {t.heroTitle}
              </h1>
              <button type="button" className="msa-btn-pink" onClick={() => go("categories")}>
                {t.discover} →
              </button>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "0.85rem",
                  marginTop: "1.25rem",
                  color: "var(--msa-muted)",
                  fontSize: "0.78rem",
                  letterSpacing: "0.08em",
                }}
              >
                {heroArtworks.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setHeroIndex(i)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: i === heroIndex ? "var(--msa-ink)" : "var(--msa-muted)",
                      fontWeight: i === heroIndex ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "0.5rem 1rem 0" }}>
              <h2 className="msa-display" style={{ fontSize: "1.35rem", marginBottom: "0.75rem" }}>
                {t.works}
              </h2>
            </div>
            <div className="msa-grid">
              {artworks.slice(0, 6).map(artworkCard)}
            </div>
          </section>
        )}

        {!loading && view === "categories" && (
          <section className="msa-fade-in" style={{ padding: "0.5rem 1rem 1.5rem" }}>
            <h1 className="msa-display" style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
              {t.categories}
            </h1>
            <div style={{ display: "grid", gap: "0.65rem" }}>
              <button
                type="button"
                onClick={() => openCategory(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                  padding: "0.7rem 0.85rem",
                  borderRadius: "1rem",
                  border: "1px solid var(--msa-line)",
                  background: "var(--msa-card)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    background: "var(--msa-bg-soft)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    color: "var(--msa-muted)",
                  }}
                >
                  {t.all}
                </span>
                <span style={{ flex: 1 }}>
                  <strong style={{ display: "block" }}>{t.all}</strong>
                  <span style={{ color: "var(--msa-muted)", fontSize: "0.8rem" }}>
                    {t.worksCount(artworks.length)}
                  </span>
                </span>
                <FiChevronRight color="var(--msa-muted)" />
              </button>
              {categoryList.map((c) => {
                const preview = previewForCategory(c.name);
                const count = categoryCounts.get(c.name) ?? 0;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => openCategory(c.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.85rem",
                      padding: "0.7rem 0.85rem",
                      borderRadius: "1rem",
                      border: "1px solid var(--msa-line)",
                      background: "var(--msa-card)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 999,
                        overflow: "hidden",
                        background: "var(--msa-bg-soft)",
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >
                      {preview ? (
                        <Media src={preview} alt={c.name} fill className="object-cover" sizes="48px" />
                      ) : null}
                    </span>
                    <span style={{ flex: 1 }}>
                      <strong style={{ display: "block" }}>{c.name}</strong>
                      <span style={{ color: "var(--msa-muted)", fontSize: "0.8rem" }}>
                        {t.worksCount(count)}
                      </span>
                    </span>
                    <FiChevronRight color="var(--msa-muted)" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {!loading && view === "category" && (
          <section className="msa-fade-in">
            <div style={{ padding: "0.35rem 1rem 0.75rem" }}>
              <h1 className="msa-display" style={{ fontSize: "1.7rem", lineHeight: 1.15 }}>
                {activeCategory ?? t.all}{" "}
                <span style={{ color: "var(--msa-muted)", fontSize: "1rem", fontWeight: 500 }}>
                  ({t.worksCount(filteredByCategory.length)})
                </span>
              </h1>
            </div>
            <div className="msa-chip-row">
              <button
                type="button"
                className={`msa-chip ${!activeCategory ? "active" : ""}`}
                onClick={() => openCategory(null)}
              >
                {t.all}
              </button>
              {categoryList.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className={`msa-chip ${activeCategory === c.name ? "active" : ""}`}
                  onClick={() => openCategory(c.name)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {filteredByCategory.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--msa-muted)", padding: "2rem" }}>
                {t.noWorks}
              </p>
            ) : (
              <div className="msa-grid">{filteredByCategory.map(artworkCard)}</div>
            )}
          </section>
        )}

        {!loading && view === "detail" && selected && (
          <section className="msa-fade-in">
            <div style={{ padding: "0.25rem 1rem 0.75rem", display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--msa-muted)", fontSize: "0.78rem" }}>
              <button type="button" onClick={() => go("home")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit", display: "inline-flex" }}>
                <FiHome size={14} />
              </button>
              <span>›</span>
              <button
                type="button"
                onClick={() => openCategory(selected.category)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit" }}
              >
                {selected.category}
              </button>
              <span>›</span>
              <span style={{ color: "var(--msa-ink)" }}>{selected.title}</span>
            </div>

            <div style={{ position: "relative", aspectRatio: "1 / 1.05", background: "var(--msa-bg-soft)" }}>
              <button
                type="button"
                onClick={() => setLightbox(true)}
                style={{ border: "none", padding: 0, width: "100%", height: "100%", position: "relative", cursor: "zoom-in" }}
              >
                <Media
                  src={selected.imageUrl}
                  alt={selected.title}
                  fill
                  className="object-cover"
                  sizes="480px"
                  priority
                />
              </button>
              <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                <button
                  type="button"
                  className={`msa-heart ${favorites.includes(selected.id) ? "on" : ""}`}
                  style={{ position: "static" }}
                  onClick={() => toggleFavorite(selected.id)}
                >
                  <FiHeart fill={favorites.includes(selected.id) ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  className="msa-heart"
                  style={{ position: "static" }}
                  onClick={async () => {
                    const url = typeof window !== "undefined" ? window.location.href : "";
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: selected.title, url });
                      } catch {
                        /* ignore */
                      }
                    } else {
                      await navigator.clipboard.writeText(`${selected.title} — ${url}`);
                    }
                  }}
                >
                  <FiShare2 />
                </button>
              </div>
            </div>

            <div style={{ padding: "1rem 1.15rem 1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline" }}>
                <h1 className="msa-display" style={{ fontSize: "1.85rem", fontWeight: 600 }}>
                  {selected.title}
                </h1>
                <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{formatPrice(selected, locale)}</div>
              </div>

              <div style={{ marginTop: "1rem", display: "grid", gap: "0.65rem" }}>
                <a
                  className="msa-btn-pink"
                  href={whatsappHref(selected)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaWhatsapp size={18} />
                  {t.whatsappOrder}
                </a>
                <a
                  className="msa-btn-outline"
                  href={whatsappHref(selected)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FiMessageCircle size={16} />
                  {t.askQuestion}
                </a>
              </div>

              {(
                [
                  ["description", t.description, selected.description || "—"],
                  [
                    "technical",
                    t.technical,
                    null,
                  ],
                  ["shipping", t.shipping, t.shippingText],
                  ["certificate", t.certificate, t.certificateText],
                ] as const
              ).map(([key, label, body]) => {
                const open = Boolean(openAccordions[key]);
                return (
                  <div key={key} className="msa-accordion">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                    >
                      {label}
                      <FiChevronDown
                        style={{
                          transform: open ? "rotate(180deg)" : undefined,
                          transition: "transform 0.2s",
                        }}
                      />
                    </button>
                    {open && (
                      <div className="msa-accordion-body">
                        {key === "technical" ? (
                          <div>
                            <div className="msa-tech-row">
                              <span>{t.size}</span>
                              <span>{selected.dimensions || "—"}</span>
                            </div>
                            <div className="msa-tech-row">
                              <span>{t.series}</span>
                              <span>{selected.category}</span>
                            </div>
                            <div className="msa-tech-row">
                              <span>{t.status}</span>
                              <span>{t.forSale}</span>
                            </div>
                            {selected.priceVariants && selected.priceVariants.length > 0 && (
                              <div style={{ marginTop: "0.75rem" }}>
                                {selected.priceVariants.map((v) => (
                                  <div key={v.size} className="msa-tech-row">
                                    <span>{locale === "en" && v.sizeEN ? v.sizeEN : v.size}</span>
                                    <span>
                                      {locale === "en"
                                        ? `€ ${(v.priceUSD ?? v.priceTRY).toLocaleString("de-DE")}`
                                        : `₺ ${v.priceTRY.toLocaleString("tr-TR")}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          body
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!loading && view === "favorites" && (
          <section className="msa-fade-in" style={{ padding: "0.5rem 1rem 1.5rem" }}>
            <h1 className="msa-display" style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
              {t.myFavorites} ({favoriteArtworks.length})
            </h1>
            {favoriteArtworks.length === 0 ? (
              <p style={{ color: "var(--msa-muted)" }}>{t.emptyFav}</p>
            ) : (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {favoriteArtworks.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      alignItems: "center",
                      padding: "0.55rem",
                      borderRadius: "1rem",
                      border: "1px solid var(--msa-line)",
                      background: "var(--msa-card)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openDetail(a.id)}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "0.75rem",
                        overflow: "hidden",
                        position: "relative",
                        border: "none",
                        padding: 0,
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                    >
                      <Media
                        src={a.thumbnailUrl || a.imageUrl}
                        alt={a.title}
                        fill
                        className="object-cover"
                        sizes="72px"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDetail(a.id)}
                      style={{
                        flex: 1,
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <div className="msa-card-title">{a.title}</div>
                      <div className="msa-card-price">{formatPrice(a, locale)}</div>
                    </button>
                    <button
                      type="button"
                      className="msa-icon-btn"
                      onClick={() => toggleFavorite(a.id)}
                      aria-label="Remove"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
                <button type="button" className="msa-btn-dark" onClick={() => void shareFavorites()}>
                  <FiShare2 />
                  {t.shareAll}
                </button>
              </div>
            )}
          </section>
        )}

        {!loading && view === "contact" && (
          <section className="msa-fade-in">
            <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--msa-bg-soft)" }}>
              {heroArtworks[1] || heroArtworks[0] ? (
                <Media
                  src={(heroArtworks[1] || heroArtworks[0]).imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="480px"
                />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(254,250,246,0.2), rgba(254,250,246,0.95))",
                }}
              />
            </div>
            <div style={{ padding: "0 1.15rem 2rem", marginTop: "-2.5rem", position: "relative" }}>
              <p className="msa-display" style={{ fontSize: "1.55rem", lineHeight: 1.25, marginBottom: "1.25rem" }}>
                {t.contactLead}
              </p>
              <div style={{ display: "grid", gap: "0.65rem" }}>
                <a
                  href={whatsappHref(null)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="msa-btn-outline"
                  style={{ justifyContent: "flex-start", gap: "0.85rem", borderRadius: "1rem", padding: "1rem" }}
                >
                  <FaWhatsapp size={22} color="#25D366" />
                  <span style={{ textAlign: "left" }}>
                    <strong style={{ display: "block" }}>{t.whatsapp}</strong>
                    <span style={{ color: "var(--msa-muted)", fontSize: "0.78rem", fontWeight: 400 }}>
                      {t.whatsappHint}
                    </span>
                  </span>
                </a>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="msa-btn-outline"
                  style={{ justifyContent: "flex-start", gap: "0.85rem", borderRadius: "1rem", padding: "1rem" }}
                >
                  <FiMail size={20} />
                  <span style={{ textAlign: "left" }}>
                    <strong style={{ display: "block" }}>{t.email}</strong>
                    <span style={{ color: "var(--msa-muted)", fontSize: "0.78rem", fontWeight: 400 }}>
                      {t.emailHint}
                    </span>
                  </span>
                </a>
                <a
                  href={`https://instagram.com/${INSTAGRAM_HANDLE.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="msa-btn-outline"
                  style={{ justifyContent: "flex-start", gap: "0.85rem", borderRadius: "1rem", padding: "1rem" }}
                >
                  <FiInstagram size={20} />
                  <span style={{ textAlign: "left" }}>
                    <strong style={{ display: "block" }}>{t.instagram}</strong>
                    <span style={{ color: "var(--msa-muted)", fontSize: "0.78rem", fontWeight: 400 }}>
                      {t.instagramHint}
                    </span>
                  </span>
                </a>
              </div>
              <p
                className="msa-script"
                style={{ textAlign: "center", fontSize: "1.45rem", margin: "1.75rem 0 0.35rem" }}
              >
                {t.contactQuote}
              </p>
              <p className="msa-logo" style={{ textAlign: "center", display: "block", fontSize: "1.35rem" }}>
                Melike Sevinç Art
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "0.75rem",
                  marginTop: "1.25rem",
                  fontSize: "0.85rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setLocale("tr")}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontWeight: locale === "tr" ? 700 : 400,
                    color: locale === "tr" ? "var(--msa-ink)" : "var(--msa-muted)",
                    cursor: "pointer",
                  }}
                >
                  TR
                </button>
                <span style={{ color: "var(--msa-line)" }}>|</span>
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontWeight: locale === "en" ? 700 : 400,
                    color: locale === "en" ? "var(--msa-ink)" : "var(--msa-muted)",
                    cursor: "pointer",
                  }}
                >
                  EN
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {bottomNav}

      {menuOpen && (
        <div className="msa-overlay msa-fade-in">
          <div className="msa-header">
            <span className="msa-logo">Melike Sevinç Art</span>
            <button type="button" className="msa-icon-btn" onClick={() => setMenuOpen(false)} aria-label={t.menuClose}>
              <FiX size={22} />
            </button>
          </div>
          <div style={{ padding: "0.5rem 1.25rem 2rem" }}>
            {(
              [
                ["home", t.home],
                ["categories", t.works],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  padding: "0.85rem 0",
                  fontSize: "1.35rem",
                  fontFamily: "var(--font-msa-display), Georgia, serif",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
            <div style={{ borderTop: "1px solid var(--msa-line)", margin: "0.5rem 0 0.75rem" }} />
            <p style={{ color: "var(--msa-muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
              {t.categories}
            </p>
            <div style={{ display: "grid", gap: "0.45rem" }}>
              {categoryList.map((c) => {
                const preview = previewForCategory(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => openCategory(c.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.7rem",
                      border: "none",
                      background: "transparent",
                      padding: "0.35rem 0",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        overflow: "hidden",
                        position: "relative",
                        background: "var(--msa-bg-soft)",
                        flexShrink: 0,
                      }}
                    >
                      {preview ? (
                        <Media src={preview} alt="" fill className="object-cover" sizes="36px" />
                      ) : null}
                    </span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ borderTop: "1px solid var(--msa-line)", margin: "1rem 0" }} />
            <button
              type="button"
              onClick={() => go("contact")}
              style={{
                display: "flex",
                width: "100%",
                justifyContent: "space-between",
                border: "none",
                background: "transparent",
                padding: "0.65rem 0",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              {t.contact}
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="msa-overlay msa-fade-in">
          <div className="msa-header">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              style={{
                flex: 1,
                border: "1px solid var(--msa-line)",
                borderRadius: 999,
                padding: "0.7rem 1rem",
                background: "var(--msa-card)",
                outline: "none",
              }}
            />
            <button type="button" className="msa-icon-btn" onClick={() => setSearchOpen(false)}>
              <FiX size={22} />
            </button>
          </div>
          <div className="msa-grid">
            {searchResults.map(artworkCard)}
          </div>
        </div>
      )}

      {lightbox && selected && (
        <div className="msa-lightbox">
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.85rem 1rem" }}>
            <span>1 / 1</span>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer" }}
            >
              <FiX size={22} />
            </button>
          </div>
          <div className="msa-lightbox-stage">
            <button
              type="button"
              onClick={() => setLightbox(false)}
              style={{
                position: "absolute",
                left: 8,
                cursor: "pointer",
                border: "none",
                background: "transparent",
                color: "#fff",
              }}
              aria-label="Prev"
            >
              <FiChevronLeft size={28} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.imageUrl} alt={selected.title} />
            <button
              type="button"
              onClick={() => setLightbox(false)}
              style={{
                position: "absolute",
                right: 8,
                cursor: "pointer",
                border: "none",
                background: "transparent",
                color: "#fff",
              }}
              aria-label="Next"
            >
              <FiChevronRight size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
