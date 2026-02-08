type KvClient = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<unknown>;
};

function hasKvEnv(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) || process.env.REDIS_URL
  );
}

function tryParseJson(value: string): unknown {
  const s = value.trim();
  if (s === "") return value;
  const c = s[0];
  if (c !== "{" && c !== "[" && c !== '"' && c !== "-" && (c < "0" || c > "9")) {
    return value;
  }
  try {
    return JSON.parse(s);
  } catch {
    return value;
  }
}

type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<unknown>;
  isOpen: boolean;
  connect: () => Promise<void>;
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
};

let redisClientPromise: Promise<RedisClient> | null = null;

async function getRedisClient(): Promise<RedisClient | null> {
  if (!process.env.REDIS_URL) return null;
  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const { createClient } = await import("redis");
      const client = createClient({ url: process.env.REDIS_URL }) as unknown as RedisClient;
      client.on("error", () => {
        // swallow errors; availability is determined by successful ops
      });
      if (!client.isOpen) {
        await client.connect();
      }
      return client;
    })();
  }
  try {
    return await redisClientPromise;
  } catch {
    redisClientPromise = null;
    return null;
  }
}

async function getKvClient(): Promise<KvClient | null> {
  if (!hasKvEnv()) return null;

  const redis = await getRedisClient();
  if (redis) {
    const client: KvClient = {
      get: async (key: string) => {
        const v = await redis.get(key);
        if (v == null) return null;
        return tryParseJson(v);
      },
      set: async (key: string, value: unknown) => {
        const toStore = typeof value === "string" ? value : JSON.stringify(value);
        return redis.set(key, toStore);
      },
    };
    return client;
  }

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
  if (typeof v === "string") {
    return tryParseJson(v) as T;
  }
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
