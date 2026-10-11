import { aiError, askJson, parseDataUrl } from "@/lib/ai";
import { SYSTEM } from "@/lib/prompts";

export type ItineraryDay = { n: number; date: string | null; city: string | null; place: string | null };

// POST { text?, image? (data URL) } -> { days, question, source }
export async function POST(req: Request) {
  const { text, image } = (await req.json()) as { text?: string; image?: string };
  if (!text?.trim() && !image) return Response.json({ error: "Paste an itinerary or add a screenshot" }, { status: 400 });
  try {
    const img = image ? parseDataUrl(image) : null;
    const out = await askJson<{ days: ItineraryDay[]; question?: string | null }>(
      SYSTEM.itinerary,
      text?.trim() ? `Itinerary:\n${text.slice(0, 6000)}` : "The itinerary is in the screenshot.",
      img ? [img] : [],
    );
    const days = (out.days || [])
      .filter((d) => d && (d.place || d.city))
      .slice(0, 7)
      .map((d, i) => ({ n: i + 1, date: /^\d{4}-\d{2}-\d{2}$/.test(d.date || "") ? d.date : null, city: d.city || null, place: d.place || null }));
    if (!days.length) throw new Error("No days found");
    return Response.json({ days, question: out.question || null, source: "reader" });
  } catch (e) {
    return Response.json({ error: aiError(e), source: "fallback" }, { status: 502 });
  }
}

// writing and lookup calls can take a while; give the function room
export const maxDuration = 60;
