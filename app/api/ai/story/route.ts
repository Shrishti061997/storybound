import { aiError, askJson } from "@/lib/ai";
import { SYSTEM } from "@/lib/prompts";

// POST { days, travelers?, occasion? } -> { chapters: [{ n, title, line }] }
export async function POST(req: Request) {
  const { days, travelers, occasion } = (await req.json()) as { days?: { n: number; city?: string | null; place?: string | null }[]; travelers?: string; occasion?: string };
  if (!days?.length) return Response.json({ error: "days are required" }, { status: 400 });
  try {
    const out = await askJson<{ chapters: { n: number; title: string; line: string }[] }>(
      SYSTEM.story(occasion || "a warm trip with people you love"),
      `Travelers: ${travelers || "not given"}\nDays:\n${days.map((d) => `${d.n}. ${d.place || ""}${d.city ? `, ${d.city}` : ""}`).join("\n")}`,
    );
    const chapters = (out.chapters || []).filter((c) => c?.title && c?.line).map((c) => ({ n: Number(c.n), title: String(c.title).slice(0, 60), line: String(c.line).slice(0, 140) }));
    if (!chapters.length) throw new Error("No chapters written");
    return Response.json({ chapters, source: "writer" });
  } catch (e) {
    return Response.json({ error: aiError(e), source: "fallback" }, { status: 502 });
  }
}

// writing and lookup calls can take a while; give the function room
export const maxDuration = 60;
