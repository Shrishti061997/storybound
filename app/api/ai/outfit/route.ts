import { aiError, askJson, parseDataUrl } from "@/lib/ai";
import { SYSTEM } from "@/lib/prompts";

// POST { image (data URL) } -> { colors: ["#RRGGBB" x3] }
export async function POST(req: Request) {
  const { image } = (await req.json()) as { image?: string };
  const img = image ? parseDataUrl(image) : null;
  if (!img) return Response.json({ error: "Add a JPEG, PNG or WebP photo" }, { status: 400 });
  try {
    const out = await askJson<{ colors: string[] }>(SYSTEM.outfit, "Pick the three colors.", [img]);
    const colors = (out.colors || []).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 3).map((c) => c.toUpperCase());
    if (colors.length < 3) throw new Error("Could not read three colors");
    return Response.json({ colors, source: "match" });
  } catch (e) {
    return Response.json({ error: aiError(e), source: "fallback" }, { status: 502 });
  }
}
