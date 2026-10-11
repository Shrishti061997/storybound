import type { Season } from "@/components/Season";
import { askJson } from "@/lib/ai";
import { PIECES, type BestWindow, type Chapter, type PieceType } from "@/lib/places";
import { promptFor, SYSTEM } from "@/lib/prompts";

type Day = { n: number; date: string | null; city: string | null; place: string | null };
type Planned = { n: number; title: string; line: string; why: string; piece: PieceType; motif: string; best: BestWindow; where: string; wear: string };
type Body = { days?: Day[]; season?: Season; mood?: string; style?: string; metal?: string; loves?: string; dislikes?: string; travelers?: string };

const BEST: BestWindow[] = ["sunrise", "midday", "afternoon", "goldenEvening"];
const ROTATION: PieceType[] = ["scarf", "pendant", "ribbon", "pocket", "brooch", "scarf", "nails"];

/** Coordinates and time zone from Open-Meteo (free, no key). Falls back from the place to its city. */
async function geocode(d: Day): Promise<{ lat: number; lng: number; tz: string } | null> {
  for (const name of [d.place, d.city]) {
    if (!name) continue;
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const hit = (await res.json()).results?.[0];
      if (hit) return { lat: hit.latitude, lng: hit.longitude, tz: hit.timezone };
    } catch {
      // try the next name
    }
  }
  return null;
}

const MOOD_LINE: Record<string, string> = {
  Romantic: "A slow, close day, with one small piece to open first.",
  Playful: "A day for wandering off the plan, with a small surprise to start.",
  Calm: "An unhurried day, with one small piece to open in the morning.",
  Adventurous: "A big day out, with one small piece to carry along.",
  Nostalgic: "A day to remember slowly, with one small piece to keep.",
  Celebratory: "A day worth marking, with one small piece to open first.",
};

/** Stand-in when the writer is unavailable. Built from the traveler's own words, and makes no claims about the place. */
function standIn(d: Day, i: number, mood: string): Planned {
  const where = (d.place || d.city || "your day").trim();
  const piece = ROTATION[i % ROTATION.length];
  const words = where.split(/\s+/).slice(0, 6);
  while (words.length > 1 && /^(and|the|of|at|in|a|to|with|by|on)$/i.test(words[words.length - 1])) words.pop();
  const title = words.join(" ").replace(/^./, (c) => c.toUpperCase());
  // plain descriptive words ("bamboo grove and the river bridge") can be drawn as written; names are kept out of the design
  const descriptive = where === where.toLowerCase() && where.split(/\s+/).length > 1;
  return {
    n: d.n,
    title,
    line: MOOD_LINE[mood] || MOOD_LINE.Calm,
    why: `Drawn from ${descriptive ? where : "the day you planned here"}, in the colors of your season.`,
    piece,
    motif: descriptive
      ? `${where}, drawn as one small scene with local plants and buildings around it`
      : `the streets, rooftops, trees and skyline of an old town, seen from a favorite viewpoint, with local plants in the foreground`,
    best: BEST[(i + 3) % BEST.length],
    where: `Stand where ${descriptive ? where : "the view"} fills the frame behind you, with nothing crossing in front.`,
    wear: `Keep the ${PIECES[piece].label.toLowerCase()} toward the camera, on the side the light reaches.`,
  };
}

// POST { days, season, mood, style, metal, loves, dislikes, travelers } -> { chapters, source }
// Turns any itinerary into chapters: where each place is, which piece suits the day, and the Arcade prompt for it.
export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const days = (body.days || []).filter((d) => d.place || d.city).slice(0, 7);
  if (!days.length) return Response.json({ error: "Add at least one day with a place" }, { status: 400 });
  const season = body.season || "summer";
  const mood = body.mood || "Calm";

  const [places, written] = await Promise.all([
    Promise.all(days.map(geocode)),
    askJson<{ chapters: Planned[] }>(
      SYSTEM.plan(mood, season),
      `Travelers: ${body.travelers || "not given"}\nThey love: ${body.loves || "not given"}\nThey would never wear: ${body.dislikes || "nothing listed"}\nStyle: ${body.style || "Painterly"}\nDays:\n${days.map((d) => `${d.n}. ${d.place || ""}${d.city ? ` (${d.city})` : ""}${d.date ? `, ${d.date}` : ""}`).join("\n")}`,
    ).catch(() => null),
  ]);

  const chapters: Chapter[] = days.map((d, i) => {
    const w = written?.chapters?.find((c) => Number(c.n) === d.n);
    const ok = w && w.title && w.line && w.motif && PIECES[w.piece];
    const p: Planned = ok ? { ...w, best: BEST.includes(w.best) ? w.best : "goldenEvening" } : standIn(d, i, mood);
    const meta = PIECES[p.piece];
    const both = (v: string) => ({ summer: v, winter: v });
    return {
      n: i + 1,
      place: d.place || d.city || `Day ${i + 1}`,
      city: d.city || "",
      lat: places[i]?.lat ?? null,
      lng: places[i]?.lng ?? null,
      tz: places[i]?.tz ?? null,
      date: d.date,
      piece: p.piece,
      pieceLabel: meta.label,
      kind: meta.kind,
      category: meta.category,
      motif: both(p.motif),
      fact: "",
      title: both(String(p.title).slice(0, 60)),
      line: both(String(p.line).slice(0, 140)),
      why: both(String(p.why || "").slice(0, 200)),
      best: p.best,
      coach: { where: String(p.where || "").slice(0, 220), wear: String(p.wear || "").slice(0, 220) },
      prompt: promptFor(p.piece, String(p.motif).slice(0, 320), { style: body.style, mood, season, metal: body.metal }),
    };
  });

  return Response.json({ chapters, source: written ? "writer" : "stand-in" });
}

// writing and lookup calls can take a while; give the function room
export const maxDuration = 60;
