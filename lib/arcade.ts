// Arcade API client. Server only: route handlers and scripts. Never import from a client component.
// Docs: https://docs.arcade.ai  (every call is a POST with a JSON body)

const BASE = "https://platform.arcade.ai/v1";

if (typeof window !== "undefined") {
  throw new Error("lib/arcade.ts must not be imported in the browser");
}

export class ArcadeError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ArcadeError";
  }
}

export type World = "print" | "jewelry";
export type Category = { categoryId: string; name: string; imageUrl: string | null; world: World; category?: { categoryId: string; name: string } };
export type OptionValue = { value: string; label: string; isDefault: boolean; available: boolean };
export type CategoryOption = { key: string; label: string; values: OptionValue[] };
export type CategoryDetail = {
  categoryId: string;
  name: string;
  options: CategoryOption[];
  selections: Record<string, string>;
  canManufacture: boolean;
  world: World;
};
export type Job = {
  jobId: string;
  kind: "pattern" | "product" | "download";
  status: "running" | "succeeded" | "failed";
  result: { patternId?: string; productId?: string } | null;
  error: { message: string } | null;
  createdAt: string;
  completedAt: string | null;
};
export type Pattern = { patternId: string; imageUrl: string; thumbnailUrl: string; width: number; height: number; prompt: string | null; sourcePatternId: string | null };
export type Money = { amount: string; currency: string };
export type Product = {
  productId: string;
  title: string;
  categoryId: string;
  maker: { makerId: string; name: string };
  selections: Record<string, string>;
  selectionLabel: string;
  imageUrl: string;
  images: { url: string }[];
  description: string | null;
  patternId: string;
  unitPrice: Money | null;
};
export type Fit = { mode: "fill" } | { mode: "crop"; crop: { left: number; top: number; width: number; height: number }; zoomLevel: 1 | 2 | 3 | 4 | 8 | 12 };

function headers(): Record<string, string> {
  const key = process.env.ARCADE_API_KEY;
  if (!key) throw new ArcadeError("ARCADE_API_KEY is not set. Add it to .env.local.", 500, "NO_KEY");
  const contact = process.env.ARCADE_CONTACT_EMAIL || "team-storybound";
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "User-Agent": `storybound-hackathon/0.1 (${contact})`,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST to Arcade. Retries 429 (Retry-After), 5xx and a still-starting 409 with the same body. */
export async function arcade<T>(path: string, body: object = {}, tries = 4): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}/${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.ok) return (await res.json()) as T;

    const text = await res.text();
    let parsed: { code?: string; message?: string; error?: string; data?: unknown } | undefined;
    try {
      parsed = JSON.parse(text);
    } catch {
      // edge 403s and malformed-body errors are plain text
    }
    const message = parsed?.message || text.slice(0, 300) || res.statusText;
    const stillStarting = res.status === 409 && /still|starting|in progress/i.test(message);
    const retryable = res.status === 429 || res.status >= 500 || stillStarting;
    if (retryable && attempt < tries - 1) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 1500 * (attempt + 1));
      continue;
    }
    throw new ArcadeError(`${path}: ${message}`, res.status, parsed?.code || parsed?.error, parsed?.data);
  }
}

// --- categories -------------------------------------------------------------

export const listCategories = () => arcade<{ items: Category[] }>("categories/list", {}).then((r) => r.items);

export const getCategory = (categoryId: string, selections: Record<string, string> = {}) =>
  arcade<CategoryDetail>("categories/get", { categoryId, selections });

export const CATEGORY_NAMES = ["Scarves", "Ribbon Scarf", "Pendant Necklace", "Drum Lampshades"] as const;
export type CategoryName = (typeof CATEGORY_NAMES)[number];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Map categories by name from categories/list. IDs are never hardcoded. */
export function findCategory(items: Category[], name: string): Category | undefined {
  const want = norm(name);
  return (
    items.find((c) => norm(c.name) === want) ||
    items.find((c) => norm(c.name) === want.replace(/s$/, "") || norm(c.name).replace(/s$/, "") === want) ||
    items.find((c) => norm(c.name).includes(want) || want.includes(norm(c.name)))
  );
}

// --- patterns and refines ---------------------------------------------------

export const createPattern = (body: { requestId: string; prompt: string; colors?: string[]; referenceIds?: string[]; categoryId?: string }) => {
  if (body.prompt.length > 1000) throw new ArcadeError("Prompt is over 1,000 characters", 400, "PROMPT_TOO_LONG");
  return arcade<Job>("patterns/create", body);
};

export const getJob = (jobId: string) => arcade<Job>("jobs/get", { jobId });
export const getPattern = (patternId: string) => arcade<Pattern>("patterns/get", { patternId });

export const recolorClusters = (requestId: string, patternId: string, clusterCount?: number) =>
  arcade<{ clusters: { clusterId: string; color: string }[] }>("patterns/refine/recolorClusters", { requestId, patternId, ...(clusterCount ? { clusterCount } : {}) });

export const recolor = (requestId: string, patternId: string, colors: { clusterId: string; color: string }[], clusterCount?: number) =>
  arcade<Job>("patterns/refine/recolor", { requestId, patternId, colors, ...(clusterCount ? { clusterCount } : {}) });

export const makeSeamless = (requestId: string, patternId: string, tile: { left: number; top: number; size: number }) =>
  arcade<Job>("patterns/refine/makeSeamless", { requestId, patternId, tile });

export const extendScene = (requestId: string, patternId: string, targetWidth: number, targetHeight: number) =>
  arcade<Job>("patterns/refine/extendScene", { requestId, patternId, targetWidth, targetHeight });

// --- references -------------------------------------------------------------

export type ReferenceMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export const createUpload = (requestId: string, mediaType: ReferenceMediaType, byteLength: number) =>
  arcade<{ uploadId: string; uploadUrl: string; requiredHeaders: Record<string, string> }>("references/createUpload", { requestId, mediaType, byteLength });

export const createReference = (requestId: string, uploadId: string) =>
  arcade<{ referenceId: string; imageUrl: string; thumbnailUrl: string }>("references/create", { requestId, uploadId });

/** Upload bytes and save them as a reference for patterns/create. */
export async function uploadReference(requestId: string, bytes: Uint8Array, mediaType: ReferenceMediaType) {
  const up = await createUpload(`${requestId}-up`, mediaType, bytes.byteLength);
  const put = await fetch(up.uploadUrl, { method: "PUT", headers: up.requiredHeaders, body: bytes as BodyInit });
  if (!put.ok) throw new ArcadeError(`Reference upload failed (${put.status})`, put.status);
  return createReference(`${requestId}-ref`, up.uploadId);
}

// --- products and checkout --------------------------------------------------

export const createProduct = (body: { requestId: string; patternId: string; categoryId: string; selections: Record<string, string>; fit?: Fit }) =>
  arcade<Job>("products/create", body);

export const getProduct = (productId: string, quantity?: number) =>
  arcade<Product>("products/get", { productId, ...(quantity ? { quantity } : {}) });

export const createCheckout = (requestId: string, lines: { productId: string; quantity: number }[]) =>
  arcade<{ checkoutId: string; checkoutUrl: string }>("checkouts/create", { requestId, lines, dropShip: true });

export const sendFeedback = (requestId: string, text: string, procedure?: string) =>
  arcade<{ requestId: string }>("feedback/create", { requestId, text, procedure, agent: "storybound-hackathon" });

// --- helpers for scripts (never wait for a job inside a request handler) ----

export async function waitForJob(jobId: string, { everyMs = 3000, timeoutMs = 8 * 60_000, onTick }: { everyMs?: number; timeoutMs?: number; onTick?: (j: Job) => void } = {}) {
  const started = Date.now();
  for (;;) {
    const job = await getJob(jobId);
    onTick?.(job);
    if (job.status === "succeeded") return job;
    if (job.status === "failed") throw new ArcadeError(job.error?.message || "Job failed", 500, "JOB_FAILED");
    if (Date.now() - started > timeoutMs) throw new ArcadeError(`Job ${jobId} timed out`, 504, "JOB_TIMEOUT");
    await sleep(everyMs);
  }
}

/** Run tasks with a concurrency cap (Arcade: at most 5 jobs at once). */
export async function pool<T>(limit: number, tasks: (() => Promise<T>)[]): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, async () => {
      while (next < tasks.length) {
        const i = next++;
        try {
          results[i] = { status: "fulfilled", value: await tasks[i]() };
        } catch (reason) {
          results[i] = { status: "rejected", reason };
        }
      }
    }),
  );
  return results;
}

export function errorResponse(e: unknown) {
  const err = e instanceof ArcadeError ? e : new ArcadeError(e instanceof Error ? e.message : "Unknown error", 500);
  const status = err.status >= 400 && err.status < 600 ? err.status : 500;
  return Response.json({ error: err.message, code: err.code, data: err.data }, { status });
}
