type KvClient = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<unknown>;
};

function hasKvEnv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function getKvClient(): Promise<KvClient | null> {
  if (!hasKvEnv()) return null;
  try {
    const mod = (await import("@vercel/kv")) as unknown as { kv: KvClient };
    return mod.kv;
  } catch {
    return null;
  }
}

export async function kvGetString(key: string): Promise<string | null> {
  const kv = await getKvClient();
  if (!kv) return null;
  const v = await kv.get(key);
  if (v == null) return null;
  return typeof v === "string" ? v : JSON.stringify(v);
}

export async function kvSetString(key: string, value: string): Promise<void> {
  const kv = await getKvClient();
  if (!kv) throw new Error("KV not configured");
  await kv.set(key, value);
}

export async function kvGetJson<T>(key: string): Promise<T | null> {
  const kv = await getKvClient();
  if (!kv) return null;
  const v = await kv.get(key);
  if (v == null) return null;
  return v as T;
}

export async function kvSetJson<T>(key: string, value: T): Promise<void> {
  const kv = await getKvClient();
  if (!kv) throw new Error("KV not configured");
  await kv.set(key, value as unknown);
}

export async function isKvAvailable(): Promise<boolean> {
  return (await getKvClient()) != null;
}
