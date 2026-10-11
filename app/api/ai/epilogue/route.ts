import { aiError, askJson, parseDataUrl, type AiImage } from "@/lib/ai";
import { SYSTEM } from "@/lib/prompts";

// POST { chapters: string[], steps?, achievements?: string[], photos?: dataUrl[] } -> { charms, bestPhotos }
export async function POST(req: Request) {
  const { chapters, steps, achievements, photos } = (await req.json()) as { chapters?: string[]; steps?: string; achievements?: string[]; photos?: string[] };
  if (!chapters?.length) return Response.json({ error: "chapters are required" }, { status: 400 });
  try {
    const images = (photos || []).slice(0, 6).map(parseDataUrl).filter((i): i is AiImage => Boolean(i));
    const out = await askJson<{ charms: { label: string; symbol: string }[]; bestPhotos?: number[] }>(
      SYSTEM.epilogue,
      `Chapters: ${chapters.join("; ")}\nDistance walked: ${steps || "not given"}\nAchievements the traveler listed: ${(achievements || []).join("; ") || "none"}\nPhotos attached: ${images.length}`,
      images,
    );
    const charms = (out.charms || []).filter((c) => c?.label && c?.symbol).slice(0, 6).map((c) => ({ label: String(c.label).slice(0, 40), symbol: String(c.symbol).replace(/\d/g, "").slice(0, 160) }));
    if (!charms.length) throw new Error("No charms chosen");
    const bestPhotos = (out.bestPhotos || []).filter((n) => Number.isInteger(n) && n >= 0 && n < images.length).slice(0, 3);
    return Response.json({ charms, bestPhotos, source: "curator" });
  } catch (e) {
    return Response.json({ error: aiError(e), source: "fallback" }, { status: 502 });
  }
}
