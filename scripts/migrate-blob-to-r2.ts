/**
 * Vercel Blob URL'lerini indirip R2'ye yükler; eser kayıtlarındaki URL'leri günceller.
 *
 * Gereksinim: .env.local veya ortamda R2_* değişkenleri + üretim verisi için REDIS_URL (KV).
 *
 * Kullanım:
 *   npx tsx scripts/migrate-blob-to-r2.ts --list-categories
 *   npx tsx scripts/migrate-blob-to-r2.ts --category=Stone --dry-run
 *   npx tsx scripts/migrate-blob-to-r2.ts --category=Stone
 *   npx tsx scripts/migrate-blob-to-r2.ts --all --limit=20
 *   npx tsx scripts/migrate-blob-to-r2.ts --migrate-categories [--dry-run]
 *   (Blob 404 ise aynı kategorideki R2 eser URL’si önizlemeye yazılır.)
 *
 * Not: Aynı Blob URL birden fazla eserde geçerse tek indirme / tek R2 nesnesi (idempotent).
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { isR2Configured, uploadPublicExactKey } from "../lib/object-storage";
import {
  readArtworksFromFile,
  writeArtworksToFile,
  type ArtworkJson,
} from "../lib/artworks-io";
import {
  readCategoriesFromFile,
  writeCategoriesToFile,
  type CategoryJson,
} from "../lib/categories-io";

const R2_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_BASE_URL",
] as const;

/** cwd veya üst klasörlerde .env.local ara (yanlış klasörden çalışmayı tolere eder). */
function findEnvLocalPath(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const p = path.join(dir, ".env.local");
    if (existsSync(p)) return p;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadEnvLocal(): void {
  const envPath = findEnvLocalPath();
  if (!envPath) return;
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    const isR2Key = (R2_KEYS as readonly string[]).includes(k);
    const existing = process.env[k];
    const existingEmpty = existing === undefined || String(existing).trim() === "";
    if (process.env[k] === undefined || (isR2Key && existingEmpty)) {
      process.env[k] = v;
    }
  }
  if (process.env.MIGRATE_DEBUG === "1") {
    console.error(`[migrate] .env.local yüklendi: ${envPath}`);
  }
}

function printMissingR2Keys(): void {
  console.error("Şu anki çalışma klasörü (cwd):", process.cwd());
  console.error(
    ".env.local:",
    findEnvLocalPath() ?? "bulunamadı (package.json ile aynı klasörde olmalı)"
  );
  console.error("Eksik veya boş olan R2 değişkenleri:");
  for (const k of R2_KEYS) {
    const v = process.env[k];
    const ok = Boolean(v && String(v).trim() !== "");
    console.error(`  ${k}: ${ok ? "tamam" : "YOK veya boş"}`);
  }
}

/** Import’lardan hemen sonra çalışsın: main() öncesi env hazır olsun. */
loadEnvLocal();

function safeSegment(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 80) || "other";
}

function isVercelBlobUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    return new URL(url).hostname.includes("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function isAlreadyR2(url: string): boolean {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return Boolean(base && url.startsWith(base + "/"));
}

function extFromUrlOrType(url: string, contentType: string | null): string {
  const lower = url.toLowerCase();
  const fromPath = lower.match(/\.(jpg|jpeg|png|webp|gif|mp4|webm|mov|ogg)(\?|$)/i);
  if (fromPath) return "." + fromPath[1].toLowerCase().replace("jpeg", "jpg");
  if (!contentType) return ".bin";
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("mp4")) return ".mp4";
  if (contentType.includes("webm")) return ".webm";
  if (contentType.includes("quicktime")) return ".mov";
  return ".bin";
}

async function fetchBlob(url: string): Promise<{ buffer: Buffer; contentType: string | null }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "BlobToR2Migration/1.0" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type");
  return { buffer: buf, contentType: ct };
}

/** Aynı kaynak URL → aynı R2 key (tekrar çalıştırmada güvenli). */
const migratedCache = new Map<string, string>();

async function migrateOneUrl(
  oldUrl: string,
  category: string,
  dryRun: boolean,
  keyPrefix = "migrated/artworks"
): Promise<string> {
  if (!isVercelBlobUrl(oldUrl)) return oldUrl;
  if (isAlreadyR2(oldUrl)) return oldUrl;

  if (migratedCache.has(oldUrl)) {
    return migratedCache.get(oldUrl)!;
  }

  const catSeg = safeSegment(category);
  const hash16 = createHash("sha256").update(oldUrl).digest("hex").slice(0, 16);

  if (dryRun) {
    const previewKey = `${keyPrefix}/${catSeg}/${hash16}<ext>`;
    console.log(`  [dry-run] would migrate: ${oldUrl.slice(0, 72)}... -> ${previewKey}`);
    return oldUrl;
  }

  const { buffer, contentType } = await fetchBlob(oldUrl);
  const ext = extFromUrlOrType(oldUrl, contentType);
  const objectKey = `${keyPrefix}/${catSeg}/${hash16}${ext}`;

  const { url: newUrl } = await uploadPublicExactKey(objectKey, buffer, contentType ?? undefined);
  migratedCache.set(oldUrl, newUrl);
  console.log(`  OK ${hash16}${ext} (${(buffer.length / 1024).toFixed(1)} KB)`);
  return newUrl;
}

function normCategoryKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function blobFolderFromUrl(url: string): string | null {
  const m = url.match(/\/artworks\/([^/]+)\//i);
  return m ? normCategoryKey(m[1]) : null;
}

function isR2ImageUrl(url: string): boolean {
  if (isAlreadyR2(url)) return true;
  try {
    return new URL(url).hostname.includes("r2.dev");
  } catch {
    return false;
  }
}

function artworkPreviewUrl(e: ArtworkJson): string | null {
  const thumb = e.thumbnailFilename?.trim();
  const main = e.filename?.trim();
  if (thumb && isR2ImageUrl(thumb)) return thumb;
  if (main && isR2ImageUrl(main)) return main;
  return null;
}

function pickR2PreviewFromArtworks(
  categoryName: string,
  entries: ArtworkJson[],
  oldBlobUrl?: string
): string | null {
  const catKey = normCategoryKey(categoryName);
  const blobKey = oldBlobUrl ? blobFolderFromUrl(oldBlobUrl) : null;

  for (const e of entries) {
    const url = artworkPreviewUrl(e);
    if (!url) continue;
    const artKey = normCategoryKey(e.category || "");
    if (artKey === catKey || artKey === blobKey) return url;
  }
  return null;
}

async function migrateCategoryPreviews(dryRun: boolean): Promise<void> {
  const [categories, artworks] = await Promise.all([
    readCategoriesFromFile(),
    readArtworksFromFile(),
  ]);
  let blobCount = 0;
  for (const c of categories) {
    if (c.previewImageUrl && isVercelBlobUrl(c.previewImageUrl)) blobCount++;
  }

  console.log(`Kategori sayısı: ${categories.length}`);
  console.log(`Blob preview içeren kategori: ${blobCount}${dryRun ? " [DRY-RUN]" : ""}`);

  if (blobCount === 0) {
    console.log("Taşınacak kategori önizlemesi yok.");
    return;
  }

  let data: CategoryJson[] = [...categories];
  let updated = 0;
  let fromArtwork = 0;

  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    const old = c.previewImageUrl;
    if (!old || !isVercelBlobUrl(old)) continue;

    console.log(`\n→ kategori "${c.name}"`);
    let next: string | null = null;
    let usedArtworkFallback = false;
    try {
      next = await migrateOneUrl(old, c.name, dryRun, "migrated/category-previews");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  HATA: ${msg}`);
      if (/\b404\b/.test(msg)) {
        const fromArt = pickR2PreviewFromArtworks(c.name, artworks, old);
        if (fromArt) {
          next = fromArt;
          usedArtworkFallback = true;
          console.log(`  Blob silinmiş (404); R2 eser önizlemesi kullanılacak.`);
        } else {
          console.error(`  Bu kategoride R2 eser bulunamadı — önizleme elle seçilmeli.`);
        }
      }
    }

    if (dryRun) {
      if (next && next !== old) {
        console.log(
          usedArtworkFallback
            ? `  [dry-run] Redis'e yazılacak: eserden R2 URL`
            : `  [dry-run] Blob indirilip R2'ye taşınacak`
        );
      }
      continue;
    }

    if (next && next !== old) {
      data[i] = { ...c, previewImageUrl: next };
      await writeCategoriesToFile(data);
      updated++;
      if (usedArtworkFallback) fromArtwork++;
      console.log(`  Kategori kaydı güncellendi (${updated}).`);
    }
  }

  console.log("");
  if (dryRun) {
    console.log("Bitti. DRY-RUN: kategori kayıtları yazılmadı.");
  } else {
    console.log(
      `Bitti. Güncellenen kategori: ${updated}${fromArtwork > 0 ? ` (${fromArtwork} tanesi Blob 404 → eserden R2)` : ""}.`
    );
  }
}

function parseArgs(): {
  category: string | null;
  all: boolean;
  dryRun: boolean;
  limit: number | null;
  listCategories: boolean;
  migrateCategories: boolean;
} {
  const argv = process.argv.slice(2);
  let category: string | null = null;
  let all = false;
  let dryRun = false;
  let limit: number | null = null;
  let listCategories = false;
  let migrateCategories = false;

  for (const a of argv) {
    if (a === "--all") all = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--list-categories") listCategories = true;
    else if (a === "--migrate-categories") migrateCategories = true;
    else if (a.startsWith("--category=")) category = a.slice("--category=".length).trim() || null;
    else if (a.startsWith("--limit=")) {
      const n = parseInt(a.slice("--limit=".length), 10);
      if (!Number.isNaN(n) && n > 0) limit = n;
    }
  }

  return { category, all, dryRun, limit, listCategories, migrateCategories };
}

async function main(): Promise<void> {
  if (!isR2Configured()) {
    console.error(
      "R2 ortam değişkenleri eksik veya boş (5 adet: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL)."
    );
    console.error("");
    printMissingR2Keys();
    console.error("");
    console.error(
      "Çözüm: Terminalde proje köküne gir: cd /Users/selim/yenisistem  (içinde package.json ve .env.local olmalı), sonra komutu tekrar çalıştır."
    );
    process.exit(1);
  }

  const { category, all, dryRun, limit, listCategories, migrateCategories } = parseArgs();

  function dataSourceLabel(): string {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      return "Vercel KV (KV_REST_API_URL)";
    }
    if (process.env.REDIS_URL?.trim()) {
      return "Redis/KV (REDIS_URL)";
    }
    return "Yerel lib/data/artworks.json (REDIS_URL ve KV yok — canlı site verisi DEĞİL)";
  }

  if (migrateCategories) {
    console.log(`Veri kaynağı: ${dataSourceLabel()}`);
    await migrateCategoryPreviews(dryRun);
    return;
  }

  const entries = await readArtworksFromFile();

  if (listCategories) {
    const categories = await readCategoriesFromFile();
    let catBlob = 0;
    for (const c of categories) {
      if (c.previewImageUrl && isVercelBlobUrl(c.previewImageUrl)) catBlob++;
    }

    let blobRows = 0;
    const set = new Set<string>();
    for (const e of entries) {
      const main = e.filename;
      const thumb = e.thumbnailFilename;
      const hasBlob =
        isVercelBlobUrl(main) || (thumb !== undefined && isVercelBlobUrl(thumb));
      if (hasBlob) {
        blobRows++;
        set.add(e.category || "(boş)");
      }
    }
    const list = Array.from(set).sort();

    console.log(`Okunan eser sayısı: ${entries.length}`);
    console.log(`Veri kaynağı: ${dataSourceLabel()}`);
    console.log(`Blob URL içeren eser sayısı: ${blobRows}`);
    console.log(`Blob preview içeren kategori sayısı: ${catBlob} / ${categories.length}`);
    console.log("");
    console.log("Blob URL içeren eserlerin kategorileri:");
    for (const c of list) console.log(`  - ${c}`);
    console.log(`\nToplam: ${list.length} kategori`);

    if (entries.length === 0) {
      console.log(
        "\nNot: Hiç eser okunamadı. REDIS_URL canlı ortamdan kopyalı mı kontrol et; yoksa sadece yerel JSON kullanılıyor olabilir."
      );
    } else if (blobRows === 0 && catBlob === 0) {
      console.log(
        "\nNot: Bu veri kümesinde Vercel Blob adresi yok (zaten R2 / göreli yol / sadece dosya adı olabilir). Taşıma gerekmiyor olabilir."
      );
    } else if (blobRows === 0 && catBlob > 0) {
      console.log(
        "\nNot: Eserler R2'de; kategori kartlarındaki Blob önizlemeleri için:\n  npx tsx scripts/migrate-blob-to-r2.ts --migrate-categories --dry-run\n  npx tsx scripts/migrate-blob-to-r2.ts --migrate-categories"
      );
    }
    return;
  }

  if (!all && !category) {
    console.error("Bir kategori seçin: --category=Stone veya --all");
    console.error("Önce: npx tsx scripts/migrate-blob-to-r2.ts --list-categories");
    process.exit(1);
  }

  if (all && category) {
    console.error("--all ile --category birlikte kullanılamaz.");
    process.exit(1);
  }

  const filtered = entries.filter((e) => {
    if (all) return true;
    return (e.category || "").trim() === (category ?? "").trim();
  });

  const workList: ArtworkJson[] = [];
  for (const e of filtered) {
    const needs =
      isVercelBlobUrl(e.filename) ||
      (e.thumbnailFilename && isVercelBlobUrl(e.thumbnailFilename));
    if (needs) workList.push(e);
  }

  const capped = limit != null ? workList.slice(0, limit) : workList;

  console.log(`Veri kaynağı: ${dataSourceLabel()}`);
  console.log(`Okunan eser sayısı: ${entries.length}`);
  console.log(
    `Hedef: ${all ? "TÜM kategoriler" : `kategori "${category}"`} | Blob taşıması gereken eser: ${workList.length} (bu koşuda işlenecek: ${capped.length})${dryRun ? " [DRY-RUN]" : ""}`
  );

  if (capped.length === 0) {
    console.log("Taşınacak Blob URL yok.");
    if (entries.length > 0 && !process.env.REDIS_URL?.trim() && !process.env.KV_REST_API_URL) {
      console.log("");
      console.log(
        "Muhtemel neden: Komut yerel JSON okudu; canlı sitedeki Blob URL'ler Vercel KV'de."
      );
      console.log(
        "Çözüm: Vercel → Project → Settings → Environment Variables içinden REDIS_URL (veya KV_REST_API_URL + KV_REST_API_TOKEN) değerlerini .env.local'e kopyalayın, sonra tekrar çalıştırın."
      );
    }
    return;
  }

  let data = [...entries];

  let updated = 0;
  for (const item of capped) {
    console.log(`\n→ ${item.id} | ${item.category} | ${item.titleTR?.slice(0, 40) ?? ""}`);

    const idx = data.findIndex((x) => x.id === item.id);
    if (idx < 0) continue;
    const cur = data[idx];

    let nextFilename = cur.filename;
    let nextThumb = cur.thumbnailFilename;

    try {
      nextFilename = await migrateOneUrl(cur.filename, cur.category, dryRun);
      if (cur.thumbnailFilename) {
        nextThumb = await migrateOneUrl(cur.thumbnailFilename, cur.category, dryRun);
      }

      if (
        !dryRun &&
        (nextFilename !== cur.filename || nextThumb !== cur.thumbnailFilename)
      ) {
        data[idx] = {
          ...cur,
          filename: nextFilename,
          thumbnailFilename: nextThumb,
        };
        await writeArtworksToFile(data);
        updated++;
        console.log(`  Kayıt güncellendi (${updated}).`);
      }
    } catch (err) {
      console.error(`  HATA: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("");
  if (dryRun) {
    console.log("Bitti. DRY-RUN: hiçbir kayıt veritabanına yazılmadı (normal).");
    console.log("Gerçek taşıma için aynı komutu --dry-run OLMADAN tekrar çalıştır.");
  } else {
    console.log(`Bitti. Güncellenen eser: ${updated}`);
    if (updated === 0 && capped.length > 0) {
      console.log("");
      console.log(
        "Uyarı: İşlenecek eser vardı ama güncelleme 0. Yukarıda her satırda HATA mesajı var mı bakın (ağ, R2 kota, Blob okuma)."
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
