import { aiError, askJson } from "@/lib/ai";
import { SYSTEM } from "@/lib/prompts";

// POST { piece, facts: string[] } -> { when, where, angle, howToWear }
// `facts` holds the place fact sheet plus calculated sun times and direction. Nothing else may be used.
export async function POST(req: Request) {
  const { piece, facts } = (await req.json()) as { piece?: string; facts?: string[] };
  if (!piece || !facts?.length) return Response.json({ error: "piece and facts are required" }, { status: 400 });
  try {
    const out = await askJson<{ when: string; where: string; angle: string; howToWear: string }>(SYSTEM.coach(piece), `Facts:\n${facts.map((f) => `- ${f}`).join("\n")}`);
    if (!out.when || !out.where || !out.angle || !out.howToWear) throw new Error("Incomplete reply");
    return Response.json({ ...out, source: "coach" });
  } catch (e) {
    return Response.json({ error: aiError(e), source: "fallback" }, { status: 502 });
  }
}
