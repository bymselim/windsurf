import fs from "fs/promises";
import path from "path";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { isR2Configured } from "@/lib/object-storage";
import { isKvAvailable, kvGetJson } from "@/lib/kv-adapter";

export type StorageItem = {
  id: string;
  label: string;
  bytes: number;
  count?: number;
  note?: string;
};

export type StorageCategory = {
  id: string;
  label: string;
  description: string;
  bytes: number;
  items: StorageItem[];
};

export type StorageStats = {
  generatedAt: string;
  totalBytes: number;
  categories: StorageCategory[];
  r2Configured: boolean;
  kvAvailable: boolean;
};

function formatNote(parts: string[]): string | undefined {
  const t = parts.filter(Boolean).join(" · ");
  return t || undefined;
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function walkDir(
  root: string,
  opts?: { maxDepth?: number; skipNames?: Set<string> }
): Promise<{ bytes: number; files: number }> {
  const skip = opts?.skipNames ?? new Set(["node_modules", ".git", ".next", ".cursor"]);
  let bytes = 0;
  let files = 0;

  async function walk(dir: string, depth: number) {
    if (opts?.maxDepth != null && depth > opts.maxDepth) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (skip.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full, depth + 1);
      } else if (ent.isFile()) {
        try {
          const st = await fs.stat(full);
          bytes += st.size;
          files += 1;
        } catch {
          // ignore
        }
      }
    }
  }

  if (await dirExists(root)) await walk(root, 0);
  return { bytes, files };
}

async function fileSize(filePath: string): Promise<number> {
  try {
    const st = await fs.stat(filePath);
    return st.isFile() ? st.size : 0;
  } catch {
    return 0;
  }
}

function utf8Bytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
  } catch {
    return 0;
  }
}

async function listR2ByPrefix(): Promise<{
  totalBytes: number;
  totalObjects: number;
  byPrefix: Map<string, { bytes: number; count: number }>;
}> {
  const byPrefix = new Map<string, { bytes: number; count: number }>();
  let totalBytes = 0;
  let totalObjects = 0;

  if (!isR2Configured()) {
    return { totalBytes, totalObjects, byPrefix };
  }

  const accountId = process.env.R2_ACCOUNT_ID!;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  let token: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME!,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );
    for (const obj of res.Contents ?? []) {
      const size = obj.Size ?? 0;
      const key = obj.Key ?? "";
      totalBytes += size;
      totalObjects += 1;
      const prefix = key.includes("/") ? key.split("/")[0] || "root" : "root";
      const cur = byPrefix.get(prefix) ?? { bytes: 0, count: 0 };
      cur.bytes += size;
      cur.count += 1;
      byPrefix.set(prefix, cur);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  return { totalBytes, totalObjects, byPrefix };
}

const DATA_KV_KEYS: Array<{ id: string; label: string; key: string }> = [
  { id: "access_logs", label: "Access logs", key: "luxury_gallery:access_logs" },
  { id: "gate_logs", label: "Gate logs", key: "luxury_gallery:gate_logs" },
  { id: "faq_access", label: "FAQ access", key: "luxury_gallery:faq_access" },
  { id: "artworks", label: "Artworks metadata", key: "luxury_gallery:artworks" },
  { id: "categories", label: "Categories", key: "luxury_gallery:categories" },
  { id: "settings", label: "Settings", key: "luxury_gallery:settings" },
  { id: "phone_credits", label: "Phone credits", key: "luxury_gallery:phone_credits" },
  { id: "blocked_phones", label: "Blocked phones", key: "luxury_gallery:blocked_phones" },
  { id: "c_messages", label: "Quick messages", key: "luxury_gallery:c_messages" },
  { id: "certificates", label: "Certificates", key: "luxury_gallery:certificates" },
  { id: "erp_orders", label: "ERP orders", key: "luxury_gallery:erp_orders" },
  { id: "erp_expenses", label: "ERP expenses", key: "luxury_gallery:erp_expenses" },
  { id: "erp_settings", label: "ERP settings", key: "luxury_gallery:erp_settings" },
  { id: "erp_recurring", label: "ERP recurring", key: "luxury_gallery:erp_recurring" },
  { id: "erp_todos", label: "ERP todos", key: "luxury_gallery:erp_todos" },
  { id: "erp_todo_recurring", label: "ERP todo recurring", key: "luxury_gallery:erp_todo_recurring" },
  { id: "erp_email", label: "ERP email settings", key: "luxury_gallery:erp_email_settings" },
  { id: "erp_label", label: "ERP label settings", key: "luxury_gallery:erp_label_settings" },
];

const DATA_FILES: Array<{ id: string; label: string; file: string }> = [
  { id: "file_access_logs", label: "access-logs.json", file: "access-logs.json" },
  { id: "file_artworks", label: "artworks.json", file: "artworks.json" },
  { id: "file_categories", label: "categories.json", file: "categories.json" },
  { id: "file_settings", label: "settings.json", file: "settings.json" },
  { id: "file_c_messages", label: "c-messages.json", file: "c-messages.json" },
  { id: "file_certificates", label: "certificates.json", file: "certificates.json" },
  { id: "file_erp_todos", label: "erp-todos.json", file: "erp-todos.json" },
  { id: "file_erp_todo_recurring", label: "erp-todo-recurring.json", file: "erp-todo-recurring.json" },
];

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  const rounded = i === 0 ? String(Math.round(n)) : n.toFixed(n >= 10 || i === 1 ? 1 : 2);
  return `${rounded} ${units[i]}`;
}

export async function collectStorageStats(): Promise<StorageStats> {
  const root = process.cwd();
  const dataDir = path.join(root, "lib", "data");
  const publicArtworks = path.join(root, "public", "artworks");

  const [localMedia, appCode, componentsCode, libCode, publicAll, scripts] = await Promise.all([
    walkDir(publicArtworks),
    walkDir(path.join(root, "app")),
    walkDir(path.join(root, "components")),
    walkDir(path.join(root, "lib"), { skipNames: new Set(["node_modules", ".git", "data"]) }),
    walkDir(path.join(root, "public")),
    walkDir(path.join(root, "scripts")),
  ]);

  let r2;
  try {
    r2 = await listR2ByPrefix();
  } catch {
    r2 = { totalBytes: 0, totalObjects: 0, byPrefix: new Map<string, { bytes: number; count: number }>() };
  }

  const mediaItems: StorageItem[] = [
    {
      id: "local_artworks",
      label: "Yerel galeri medyası (public/artworks)",
      bytes: localMedia.bytes,
      count: localMedia.files,
    },
  ];

  if (isR2Configured()) {
    mediaItems.push({
      id: "r2_total",
      label: "Cloudflare R2 (toplam)",
      bytes: r2.totalBytes,
      count: r2.totalObjects,
      note: r2.totalObjects ? undefined : "Bucket boş veya liste alınamadı",
    });
    for (const [prefix, info] of Array.from(r2.byPrefix.entries()).sort(
      (a, b) => b[1].bytes - a[1].bytes
    )) {
      mediaItems.push({
        id: `r2_${prefix}`,
        label: `R2 / ${prefix}`,
        bytes: info.bytes,
        count: info.count,
      });
    }
  } else {
    mediaItems.push({
      id: "r2_unavailable",
      label: "Cloudflare R2",
      bytes: 0,
      note: "Yapılandırılmamış",
    });
  }

  const mediaBytes = mediaItems.reduce((s, i) => s + i.bytes, 0);

  const dataItems: StorageItem[] = [];
  const kvOk = await isKvAvailable();

  if (kvOk) {
    for (const row of DATA_KV_KEYS) {
      try {
        const val = await kvGetJson<unknown>(row.key);
        const bytes = val == null ? 0 : utf8Bytes(val);
        dataItems.push({
          id: `kv_${row.id}`,
          label: `KV · ${row.label}`,
          bytes,
          note: bytes === 0 ? "boş" : undefined,
        });
      } catch {
        dataItems.push({
          id: `kv_${row.id}`,
          label: `KV · ${row.label}`,
          bytes: 0,
          note: "okunamadı",
        });
      }
    }
  }

  for (const row of DATA_FILES) {
    const bytes = await fileSize(path.join(dataDir, row.file));
    dataItems.push({
      id: row.id,
      label: `Dosya · ${row.label}`,
      bytes,
      note: bytes === 0 ? "yok / boş" : undefined,
    });
  }

  dataItems.sort((a, b) => b.bytes - a.bytes);
  const dataBytes = dataItems.reduce((s, i) => s + i.bytes, 0);

  const systemItems: StorageItem[] = [
    {
      id: "app",
      label: "Uygulama kodu (app/)",
      bytes: appCode.bytes,
      count: appCode.files,
    },
    {
      id: "components",
      label: "Bileşenler (components/)",
      bytes: componentsCode.bytes,
      count: componentsCode.files,
    },
    {
      id: "lib",
      label: "Kütüphane (lib/, data hariç)",
      bytes: libCode.bytes,
      count: libCode.files,
    },
    {
      id: "public_other",
      label: "Public (artworks dahil)",
      bytes: publicAll.bytes,
      count: publicAll.files,
      note: formatNote([localMedia.bytes ? `artworks ${formatBytes(localMedia.bytes)}` : ""]),
    },
    {
      id: "scripts",
      label: "Scriptler (scripts/)",
      bytes: scripts.bytes,
      count: scripts.files,
    },
  ].sort((a, b) => b.bytes - a.bytes);

  const systemBytes = systemItems.reduce((s, i) => s + i.bytes, 0);

  const categories: StorageCategory[] = [
    {
      id: "media",
      label: "Görseller / Medya",
      description: "Yerel artwork dosyaları ve R2 bucket içeriği",
      bytes: mediaBytes,
      items: mediaItems,
    },
    {
      id: "data",
      label: "Veri dosyaları / KV",
      description: "Access/gate log, ERP, ayarlar ve diğer JSON/KV kayıtları",
      bytes: dataBytes,
      items: dataItems,
    },
    {
      id: "system",
      label: "Sistem / proje dosyaları",
      description: "Kod ve statik proje klasörleri (node_modules / .next hariç)",
      bytes: systemBytes,
      items: systemItems,
    },
  ];

  // Avoid double-counting local artworks in total: media already includes it;
  // system includes full public. Total = media + data + system code parts without public duplicate.
  const totalBytes =
    mediaBytes +
    dataBytes +
    appCode.bytes +
    componentsCode.bytes +
    libCode.bytes +
    scripts.bytes +
    Math.max(0, publicAll.bytes - localMedia.bytes);

  return {
    generatedAt: new Date().toISOString(),
    totalBytes,
    categories,
    r2Configured: isR2Configured(),
    kvAvailable: kvOk,
  };
}
