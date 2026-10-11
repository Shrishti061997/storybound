// Pre-generates the New York demo with real Arcade jobs and saves every ID and price to
// data/demo-pack.json, plus local copies of the images under public/demo.
//
//   npm run scarf                 one scarf end to end (pattern, product, price)
//   npm run pregen                everything that is not in the pack yet (about 23 jobs, 5 at a time)
//   npm run pregen -- --only ribbon,pendant
//   npm run pregen -- --force     ignore what is already in the pack (same requestIds, so no duplicate jobs)
//   PREGEN_ATTEMPT=a2 npm run pregen -- --only scarf --force    really make new designs
//
// requestIds are stable (ny-<piece>-<step>-<attempt>), so re-running never starts duplicate work.

import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import * as A from "../lib/arcade";
import type { DemoPack, PackPiece } from "../lib/pack";
import { PALETTES, toWinter } from "../lib/palettes";
import { CHARMS } from "../lib/places";
import { ARCADE_PROMPTS, LAMPSHADE_MOTIFS } from "../lib/prompts";

const ROOT = process.cwd();
const PACK_PATH = path.join(ROOT, "data/demo-pack.json");
const IMG_DIR = path.join(ROOT, "public/demo");
const PHOTO_DIR = path.join(ROOT, "scripts/photos");
const ATTEMPT = process.env.PREGEN_ATTEMPT || "a1";
const MAX_JOBS = 5;

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const force = args.includes("--force");
const wants = (group: string) => !only || only.includes(group);
const rid = (s: string) => `ny-${s}-${ATTEMPT}`;
const t0 = Date.now();
const log = (label: string, msg: string) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)}s] ${label.padEnd(22)} ${msg}`);

// --- pack file ----------------------------------------------------------------

let pack: DemoPack & { references?: string[] };
let saving: Promise<void> = Promise.resolve();
function save() {
  saving = saving.then(() => writeFile(PACK_PATH, JSON.stringify(pack, null, 2) + "\n"));
  return saving;
}
async function put(key: string, piece: Partial<PackPiece>) {
  pack.pieces[key] = { ...pack.pieces[key], key, ...piece } as PackPiece;
  await save();
}
const done = (key: string, field: "patternId" | "productId") => !force && Boolean(pack.pieces[key]?.[field]);

// --- job runner: at most MAX_JOBS Arcade jobs at once ---------------------------

let active = 0;
const waiting: (() => void)[] = [];
async function run(label: string, start: () => Promise<A.Job>): Promise<A.Job> {
  if (active >= MAX_JOBS) await new Promise<void>((r) => waiting.push(r));
  else active++;
  try {
    log(label, "started");
    const job = await start();
    const finished = job.status === "running" ? await A.waitForJob(job.jobId) : job;
    if (finished.status === "failed") throw new A.ArcadeError(finished.error?.message || "Job failed", 500, "JOB_FAILED");
    log(label, "done");
    return finished;
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

// --- images ---------------------------------------------------------------------

const exec = promisify(execFile);
async function download(url: string, name: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed (${res.status}) for ${name}`);
  const type = res.headers.get("content-type") || "";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const file = path.join(IMG_DIR, `${name}.${ext}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  // keep the repo light: large files become 1400px JPEGs (sips ships with macOS)
  if ((await stat(file)).size > 500_000) {
    try {
      const out = path.join(IMG_DIR, `${name}.jpg`);
      await exec("sips", ["-Z", "1400", "-s", "format", "jpeg", "-s", "formatOptions", "82", file, "--out", out]);
      if (out !== file) await unlink(file);
      return `/demo/${name}.jpg`;
    } catch {
      // no sips: keep the original
    }
  }
  return `/demo/${name}.${ext}`;
}

// --- steps ------------------------------------------------------------------------

let cats: Record<string, A.Category> = {};

async function pattern(key: string, prompt: string, extra: { colors?: string[]; referenceIds?: string[] } = {}) {
  if (done(key, "patternId")) return pack.pieces[key].patternId!;
  const job = await run(`${key} pattern`, () => A.createPattern({ requestId: rid(`${key}-pattern`), prompt, ...extra }));
  const patternId = job.result?.patternId;
  if (!patternId) throw new Error(`${key}: job succeeded without a patternId`);
  await savePattern(key, patternId);
  return patternId;
}

async function savePattern(key: string, patternId: string) {
  const p = await A.getPattern(patternId);
  const patternImage = await download(p.imageUrl, `${key}-pattern`);
  await put(key, { patternId, patternImage });
  return p;
}

/** Summer to winter: read the clusters, map each to the winter palette, recolor. */
async function winterOf(key: string, summerPatternId: string) {
  if (done(key, "patternId")) return pack.pieces[key].patternId!;
  const clusterCount = 6;
  const { clusters } = await A.recolorClusters(rid(`${key}-clusters`), summerPatternId, clusterCount);
  const colors = clusters.map((c) => ({ clusterId: c.clusterId, color: toWinter(c.color) }));
  if (colors.every((c, i) => c.color.toLowerCase() === clusters[i].color.toLowerCase())) colors[0].color = "#1B4965";
  log(`${key} recolor`, clusters.map((c, i) => `${c.color}>${colors[i].color}`).join(" "));
  const job = await run(`${key} recolor`, () => A.recolor(rid(`${key}-recolor`), summerPatternId, colors, clusterCount));
  const patternId = job.result?.patternId;
  if (!patternId) throw new Error(`${key}: recolor finished without a patternId`);
  await savePattern(key, patternId);
  return patternId;
}

/** Walk categories/get toward preferred option labels, only ever choosing available values. */
async function chooseSelections(categoryId: string, prefer: RegExp[] = []) {
  let detail = await A.getCategory(categoryId, {});
  const chosen: Record<string, string> = {};
  for (const want of prefer) {
    for (const opt of detail.options) {
      if (chosen[opt.key]) continue;
      const hit = opt.values.find((v) => v.available && want.test(v.label));
      if (hit) {
        chosen[opt.key] = hit.value;
        detail = await A.getCategory(categoryId, chosen);
        break;
      }
    }
  }
  return detail;
}

async function product(key: string, patternId: string, categoryName: string, prefer: RegExp[] = []) {
  if (done(key, "productId")) return;
  const cat = cats[categoryName];
  if (!cat) throw new Error(`Category "${categoryName}" not found in categories/list`);
  const detail = await chooseSelections(cat.categoryId, prefer);
  if (!detail.canManufacture) throw new Error(`${key}: selections cannot be manufactured: ${JSON.stringify(detail.selections)}`);
  const base = { patternId, categoryId: cat.categoryId, selections: detail.selections };
  let job: A.Job;
  try {
    job = await run(`${key} product`, () => A.createProduct({ requestId: rid(`${key}-product`), ...base }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/fit|aspect|crop/i.test(msg)) throw e;
    log(`${key} product`, `needs a fit (${msg.slice(0, 120)}); retrying with fill`);
    job = await run(`${key} product`, () => A.createProduct({ requestId: rid(`${key}-product-fill`), ...base, fit: { mode: "fill" } }));
  }
  await saveProduct(key, job.result?.productId);
}

async function saveProduct(key: string, productId?: string) {
  if (!productId) throw new Error(`${key}: job succeeded without a productId`);
  const p = await A.getProduct(productId);
  const image = await download(p.imageUrl, `${key}-product`);
  await put(key, { kind: "arcade", productId, patternId: pack.pieces[key]?.patternId || p.patternId, title: p.title, selectionLabel: p.selectionLabel, unitPrice: p.unitPrice, image });
  log(`${key} product`, `${p.title} | ${p.selectionLabel} | ${p.unitPrice ? `${p.unitPrice.amount} ${p.unitPrice.currency}` : "no price"} | maker ${p.maker?.name}`);
  return p;
}

/** Jewelry: text only, metal named in the prompt. If pricing fails, try the next metal. */
async function pendant(key: string, tone: RegExp, fallbackMetal: string) {
  if (done(key, "productId")) return;
  const cat = cats["Pendant Necklace"];
  if (!cat) throw new Error('Category "Pendant Necklace" not found');
  const detail = await A.getCategory(cat.categoryId, {});
  const labels = detail.options.flatMap((o) => o.values.filter((v) => v.available).map((v) => v.label));
  const metals = [...new Set([...labels.filter((l) => tone.test(l)), fallbackMetal, ...labels.filter((l) => /silver|gold|brass|bronze/i.test(l))])].slice(0, 4);
  let lastError: unknown;
  for (const [i, metal] of metals.entries()) {
    try {
      const job = await run(`${key} ${metal}`, () => A.createPattern({ requestId: rid(`${key}-m${i}`), prompt: ARCADE_PROMPTS.pendant(metal), categoryId: cat.categoryId }));
      const p = await saveProduct(key, job.result?.productId);
      if (!p.unitPrice) throw new Error("no price returned");
      return;
    } catch (e) {
      lastError = e;
      log(`${key} ${metal}`, `failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  throw lastError;
}

async function concept(key: string, prompt: string, colors: string[]) {
  await pattern(key, prompt, { colors });
  await put(key, { kind: "concept" });
}

async function lampshade(key: string) {
  if (done(key, "productId")) return;
  // up to 3 of your own trip photos in scripts/photos become references
  let referenceIds = pack.references || [];
  if (!referenceIds.length) {
    const files = (await readdir(PHOTO_DIR).catch(() => [])).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).slice(0, 3);
    for (const [i, f] of files.entries()) {
      const bytes = await readFile(path.join(PHOTO_DIR, f));
      const mediaType = /png$/i.test(f) ? "image/png" : /webp$/i.test(f) ? "image/webp" : "image/jpeg";
      const ref = await A.uploadReference(rid(`lamp-photo${i}`), new Uint8Array(bytes), mediaType);
      referenceIds.push(ref.referenceId);
      log(`${key} reference`, `${f} -> ${ref.referenceId}`);
    }
    pack.references = referenceIds;
    await save();
  }
  if (!referenceIds.length) log(`${key} reference`, "no photos in scripts/photos; generating from the prompt alone");

  const base = await pattern(`${key}-base`, ARCADE_PROMPTS.lampshade(LAMPSHADE_MOTIFS.summer), { colors: PALETTES.summer, ...(referenceIds.length ? { referenceIds } : {}) });
  let patternId = base;
  try {
    const src = await A.getPattern(base);
    const targetHeight = Math.min(1536, src.height);
    const targetWidth = 1536;
    if (targetWidth > src.width) {
      const job = await run(`${key} extend`, () => A.extendScene(rid(`${key}-extend`), base, targetWidth, targetHeight));
      if (job.result?.patternId) patternId = job.result.patternId;
    }
  } catch (e) {
    log(`${key} extend`, `skipped, using the pattern as is: ${e instanceof Error ? e.message : e}`);
  }
  await savePattern(key, patternId);
  await product(key, patternId, "Drum Lampshades");
}

// --- main ---------------------------------------------------------------------------

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  pack = JSON.parse(await readFile(PACK_PATH, "utf8"));
  pack.pieces ||= {};

  const items = await A.listCategories();
  for (const name of A.CATEGORY_NAMES) {
    const c = A.findCategory(items, name);
    if (c) {
      cats[name] = c;
      pack.categories[name] = { categoryId: c.categoryId, world: c.world };
    } else log("categories", `"${name}" not found`);
  }
  await save();
  log("categories", Object.entries(cats).map(([n, c]) => `${n} (${c.world})`).join(", "));

  const tasks: Record<string, () => Promise<unknown>> = {
    "scarf-summer": async () => {
      const p = await pattern("c1-summer", ARCADE_PROMPTS.scarf, { colors: PALETTES.summer });
      await product("c1-summer", p, "Scarves");
    },
    "scarf-winter": async () => {
      const p = await pattern("c1-summer", ARCADE_PROMPTS.scarf, { colors: PALETTES.summer });
      await product("c1-winter", await winterOf("c1-winter", p), "Scarves");
    },
    ribbon: async () => {
      const baseId = await pattern("c3-base", ARCADE_PROMPTS.ribbon, { colors: PALETTES.summer });
      let summer = pack.pieces["c3-summer"]?.patternId;
      if (!summer || force) {
        const src = await A.getPattern(baseId);
        const size = Math.min(src.width, src.height);
        const job = await run("c3-summer seamless", () => A.makeSeamless(rid("c3-summer-seamless"), baseId, { left: Math.floor((src.width - size) / 2), top: Math.floor((src.height - size) / 2), size }));
        summer = job.result?.patternId || baseId;
        await savePattern("c3-summer", summer);
      }
      const summerId = summer;
      await Promise.all([
        product("c3-summer", summerId, "Ribbon Scarf"),
        winterOf("c3-winter", summerId).then((w) => product("c3-winter", w, "Ribbon Scarf")),
      ]);
    },
    "pendant-summer": () => pendant("c2-summer", /silver|white|platinum/i, "sterling silver"),
    "pendant-winter": () => pendant("c2-winter", /gold/i, "gold"),
    "brooch-summer": () => concept("c4-summer", ARCADE_PROMPTS.brooch.summer, PALETTES.summer),
    "brooch-winter": () => concept("c4-winter", ARCADE_PROMPTS.brooch.winter, PALETTES.winter),
    "nails-summer": () => concept("c5-summer", ARCADE_PROMPTS.nails.summer, PALETTES.summer),
    "nails-winter": () => concept("c5-winter", ARCADE_PROMPTS.nails.winter, PALETTES.winter),
    ...Object.fromEntries(CHARMS.map((c) => [c.key, () => concept(c.key, ARCADE_PROMPTS.charm(c.symbol), PALETTES.summer)])),
    lampshade: () => lampshade("lamp"),
  };

  // group names accepted by --only
  const groups: Record<string, string[]> = {
    scarf: ["scarf-summer", "scarf-winter"],
    pendant: ["pendant-summer", "pendant-winter"],
    brooch: ["brooch-summer", "brooch-winter"],
    nails: ["nails-summer", "nails-winter"],
    concept: ["brooch-summer", "brooch-winter", "nails-summer", "nails-winter"],
    charms: CHARMS.map((c) => c.key),
  };
  const selected = Object.keys(tasks).filter((name) => wants(name) || Object.entries(groups).some(([g, members]) => wants(g) && only && members.includes(name)));

  log("pregen", `running: ${selected.join(", ")}`);
  const results = await Promise.allSettled(selected.map((name) => tasks[name]()));
  await saving;

  let failed = 0;
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      failed++;
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      log(selected[i], `FAILED: ${msg}`);
    }
  });
  pack.generatedAt = new Date().toISOString();
  await save();

  console.log("\nPieces in data/demo-pack.json:");
  for (const p of Object.values(pack.pieces)) {
    const price = p.unitPrice ? `${p.unitPrice.amount} ${p.unitPrice.currency}` : "";
    console.log(`  ${p.key.padEnd(12)} ${(p.kind || "").padEnd(8)} pattern ${p.patternId ? "yes" : "no "}  product ${p.productId ? "yes" : "no "}  ${price}  ${p.title || ""}`);
  }
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
