import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { isR2Configured, uploadPublicExactKey } from "../lib/object-storage";

type MappingEntry = {
  localPath: string;
  blobPath: string;
  url: string;
  size: number;
  sha1: string;
};

async function fileSha1(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  return createHash("sha1").update(data).digest("hex");
}

async function collectFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await collectFiles(p)));
    } else if (e.isFile()) {
      const lower = e.name.toLowerCase();
      if (
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".gif") ||
        lower.endsWith(".mp4") ||
        lower.endsWith(".mov") ||
        lower.endsWith(".webm")
      ) {
        out.push(p);
      }
    }
  }
  return out;
}

function requireR2(): void {
  if (!isR2Configured()) {
    throw new Error(
      "R2 gerekli: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL"
    );
  }
}

async function main() {
  requireR2();

  const root = process.cwd();
  const artworksDir = path.join(root, "public", "artworks");

  const files = await collectFiles(artworksDir);
  if (files.length === 0) {
    console.log(`No files found under ${artworksDir}`);
    return;
  }

  const prefix = (process.env.BLOB_PREFIX ?? "artworks").replace(/^\/+|\/+$/g, "");
  const concurrency = Number(process.env.BLOB_CONCURRENCY ?? "4") || 4;
  const outFile = path.join(root, "scripts", "blob-mapping.json");

  console.log(`Found ${files.length} files. Uploading with concurrency=${concurrency}...`);

  const mapping: MappingEntry[] = [];
  let idx = 0;

  const worker = async () => {
    while (true) {
      const i = idx++;
      if (i >= files.length) return;
      const filePath = files[i];
      const rel = path
        .relative(artworksDir, filePath)
        .split(path.sep)
        .join("/");

      const objectKey = `${prefix}/${rel}`;
      const stat = await fs.stat(filePath);
      const sha1 = await fileSha1(filePath);
      const buf = await fs.readFile(filePath);

      const res = await uploadPublicExactKey(objectKey, buf, undefined);

      mapping.push({
        localPath: filePath,
        blobPath: objectKey,
        url: res.url,
        size: stat.size,
        sha1,
      });

      if ((i + 1) % 25 === 0 || i === files.length - 1) {
        console.log(`Uploaded ${i + 1}/${files.length}`);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  mapping.sort((a, b) => a.blobPath.localeCompare(b.blobPath));
  await fs.writeFile(outFile, JSON.stringify(mapping, null, 2), "utf-8");

  console.log(`Done. Wrote mapping to ${outFile}`);
  console.log(`Example URL: ${mapping[0]?.url ?? ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
