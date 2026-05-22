/**
 * Redis/KV'deki görsel URL türlerini özetler (migrate öncesi teşhis).
 * Kullanım: npx tsx scripts/check-image-urls.ts
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { readArtworksFromFile } from "../lib/artworks-io";
import { readCategoriesFromFile } from "../lib/categories-io";

function loadEnvLocal(): void {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const p = path.join(dir, ".env.local");
    if (existsSync(p)) {
      for (const line of readFileSync(p, "utf-8").split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq <= 0) continue;
        const k = t.slice(0, eq).trim();
        let v = t.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (process.env[k] === undefined) process.env[k] = v;
      }
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

loadEnvLocal();

async function main() {
  const arts = await readArtworksFromFile();
  const cats = await readCategoriesFromFile();
  const hosts: Record<string, number> = {};
  let blob = 0;
  let r2 = 0;
  let relative = 0;

  for (const e of arts) {
    for (const f of [e.filename, e.thumbnailFilename].filter(Boolean) as string[]) {
      if (!/^https?:\/\//i.test(f)) {
        relative++;
        continue;
      }
      try {
        const h = new URL(f).hostname;
        hosts[h] = (hosts[h] || 0) + 1;
        if (h.includes("blob.vercel-storage")) blob++;
        else if (h.includes("r2.dev")) r2++;
      } catch {
        /* ignore */
      }
    }
  }

  let catBlob = 0;
  for (const c of cats) {
    if ((c.previewImageUrl || "").includes("blob.vercel-storage")) catBlob++;
  }

  const cosmo = arts.filter((e) => /cosmo/i.test(e.category || "")).slice(0, 5);

  console.log("Veri kaynağı:", process.env.REDIS_URL ? "REDIS_URL" : process.env.KV_REST_API_URL ? "KV REST" : "dosya");
  console.log("Eser sayısı:", arts.length);
  console.log("Blob URL (eser):", blob);
  console.log("R2 URL (eser):", r2);
  console.log("Göreli / dosya adı:", relative);
  console.log("Kategori preview Blob:", catBlob, "/", cats.length);
  console.log("\nEn sık hostlar:");
  for (const [h, n] of Object.entries(hosts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${n}\t${h}`);
  }
  if (cosmo.length) {
    console.log("\nCosmo örnekleri (filename):");
    for (const e of cosmo) {
      console.log(`  ${e.titleTR?.slice(0, 30) || e.id}: ${(e.filename || "").slice(0, 100)}`);
    }
  }

  console.log("\nKategori preview URL'leri:");
  for (const c of cats) {
    const u = c.previewImageUrl || "";
    const tag = u.includes("blob.vercel-storage")
      ? "BLOB"
      : u.includes("r2.dev")
        ? "R2"
        : u
          ? "other"
          : "yok";
    console.log(`  [${tag}] ${c.name}: ${u.slice(0, 85)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
