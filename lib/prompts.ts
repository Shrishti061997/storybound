// Arcade prompts. Places are described generically: no text, no brand or trademarked names,
// and always under 1,000 characters.

import type { DemoSeason, Season } from "@/components/Season";
import type { PieceType } from "./places";

const NO_TEXT = "No text, no letters, no numbers, no logos, no signatures.";

const STYLE = "Hand-painted gouache and ink illustration with visible brush texture and loose, confident linework, flat layered color";

export const ARCADE_PROMPTS = {
  scarf: `${STYLE}, composed as a square scarf: an elevated garden walkway on old rail tracks, wildflowers and tall grasses growing between weathered steel rails, wooden benches, low brick buildings softly behind, a wide border of trailing stems framing the scene, generous cream ground, balanced so it reads well folded or flat. ${NO_TEXT}`,

  ribbon: `Small-scale tossed repeat pattern for a narrow hair ribbon, ink outline with watercolor fill: elm leaves, tiny curved stone footbridges and little rowboats scattered evenly on a pale ground, airy spacing, every motif complete, consistent scale. ${NO_TEXT}`,

  pendant: (metal: string) =>
    `A small round ${metal} pendant on a fine chain: a stone bridge tower with two tall gothic arches and a fan of suspension cables in raised relief, a low sun with short rays behind the tower, clean engraved lines, softly polished finish, simple and wearable.`,

  brooch: {
    summer: `${STYLE}. A single round emblem centered on a plain cream ground: a still mountain lake ringed with dark pines, one small canoe on the water, soft peaks behind, a thin rope border around the circle. ${NO_TEXT}`,
    winter: `${STYLE}. A single round emblem centered on a plain pale ground: a frozen mountain lake ringed with snowy pines, one pair of ice skates resting at the edge, soft white peaks behind, a thin rope border around the circle. ${NO_TEXT}`,
  } satisfies Record<DemoSeason, string>,

  nails: {
    summer: `Tiny-scale repeat pattern for nail art, ink and watercolor: narrow curtain waterfalls, small rainbow arcs and dots of mist on a pale sky ground, delicate, evenly spaced, every motif complete. ${NO_TEXT}`,
    winter: `Tiny-scale repeat pattern for nail art, ink and watercolor: frozen waterfalls, fine icicles and small snow dots on a pale ice-blue ground, delicate, evenly spaced, every motif complete. ${NO_TEXT}`,
  } satisfies Record<DemoSeason, string>,

  charm: (symbol: string) =>
    `One small round enamel charm design, centered on a plain white ground with wide margins: ${symbol}. Bold simple shapes, a thin gold outline, flat enamel colors, drawn like a hand-inked badge. ${NO_TEXT}`,

  lampshade: (motifs: string[]) =>
    `Wide panoramic watercolor and ink scene to wrap a drum lampshade, reading left to right as one continuous landscape: ${motifs.join("; ")}. One unbroken horizon, warm late light, soft paper texture, colors that glow when lit from behind. ${NO_TEXT}`,
};

export const LAMPSHADE_MOTIFS: Record<DemoSeason, string[]> = {
  summer: [
    "an elevated garden walkway with wildflowers on old rail tracks",
    "a stone bridge with gothic arches at sunrise",
    "park elms and a curved stone footbridge",
    "a mountain lake with pines and a canoe",
    "a broad curtain waterfall with a rainbow in the mist",
  ],
  winter: [
    "snow-dusted grasses on old rail tracks",
    "a stone bridge with gothic arches and frost",
    "snowy elms and skaters",
    "a frozen mountain lake with snowy pines",
    "a frozen waterfall with icicles",
  ],
};

// --- prompts for a trip of your own: style, mood and season shape every design ---

export const MOODS = ["Romantic", "Playful", "Calm", "Adventurous", "Nostalgic", "Celebratory"] as const;
export const STYLES = ["Painterly", "Botanical", "Graphic", "Quiet"] as const;

const MOOD_WORDS: Record<string, string> = {
  Romantic: "soft, tender and dreamy",
  Playful: "lively, whimsical and bright",
  Calm: "quiet, airy and restful",
  Adventurous: "bold, energetic and wide open",
  Nostalgic: "faded and warm, like an old postcard",
  Celebratory: "festive, joyful and generous",
};
const STYLE_WORDS: Record<string, string> = {
  Painterly: "hand-painted gouache and ink with visible brush texture",
  Botanical: "fine botanical illustration in ink and watercolor",
  Graphic: "bold flat shapes like a mid-century travel print",
  Quiet: "minimal ink line drawing with soft washes",
};
const SEASON_WORDS: Record<Season, string> = {
  spring: "in spring, with blossom and fresh green",
  summer: "in high summer light",
  autumn: "in autumn, with turning leaves and low gold light",
  winter: "in winter, with frost and snow",
};

export function promptFor(piece: PieceType, motif: string, o: { style?: string; mood?: string; season: Season; metal?: string }) {
  const look = `${STYLE_WORDS[o.style || ""] || STYLE_WORDS.Painterly}, the mood is ${MOOD_WORDS[o.mood || ""] || "warm and unhurried"}`;
  const when = SEASON_WORDS[o.season];
  const text =
    piece === "scarf" ? `Illustration in ${look}, composed as a square scarf: ${motif}, ${when}, a wide border framing the scene, generous pale ground, balanced so it reads well folded or flat. ${NO_TEXT}`
    : piece === "ribbon" ? `Small-scale tossed repeat pattern for a narrow hair ribbon, ${look}: small motifs drawn from ${motif}, ${when}, scattered evenly on a pale ground, every motif complete. ${NO_TEXT}`
    : piece === "pocket" ? `Illustration in ${look}, composed as a pocket square: ${motif}, ${when}, a neat contrast border and rich detail in the corners. ${NO_TEXT}`
    : piece === "pendant" ? `A small round ${o.metal || "sterling silver"} pendant on a fine chain: ${motif}, in raised relief with clean engraved lines, softly polished finish, simple and wearable.`
    : piece === "brooch" ? `Illustration in ${look}. A single round emblem centered on a plain pale ground: ${motif}, ${when}, a thin rope border around the circle. ${NO_TEXT}`
    : `Tiny-scale repeat pattern for nail art, ${look}: tiny motifs drawn from ${motif}, ${when}, delicate and evenly spaced, every motif complete. ${NO_TEXT}`;
  return text.slice(0, 990);
}

// --- system prompts for the writing calls (plan section 6) -------------------

export const SYSTEM = {
  itinerary:
    'Extract the trip as JSON {"days":[{"n":number,"date":"YYYY-MM-DD"|null,"city":string|null,"place":string|null}],"question":string|null}. Use only what is in the text or image. If a date or place is missing, set it to null and put one short question in `question`. At most one question. Reply with JSON only.',
  story: (occasion: string) =>
    `For each day, write a chapter title of at most 6 words and one warm line of at most 14 words. Tone: ${occasion}. Do not state facts such as opening hours or prices. Reply with JSON only: {"chapters":[{"n":number,"title":string,"line":string}]}.`,
  coach: (piece: string) =>
    `Using ONLY the facts, times and sun direction provided, write four one-line fields: when, where to stand, angle, and how to wear ${piece} in the shot. Do not add any facts. Never mention opening hours or crowds. Reply with JSON only: {"when":string,"where":string,"angle":string,"howToWear":string}.`,
  plan: (mood: string, season: string) =>
    `You are the narrator and designer for a travel keepsake. For each day of the trip return JSON only: {"chapters":[{"n":number,"title":string,"line":string,"why":string,"piece":"scarf"|"pendant"|"ribbon"|"pocket"|"brooch"|"nails","motif":string,"best":"sunrise"|"midday"|"afternoon"|"goldenEvening","where":string,"wear":string}]}. title: at most 6 words. line: one warm sentence of at most 14 words. why: one sentence on why this piece suits this day and this traveler, using their tastes. motif: what to draw, in 12 to 25 words of generic visual description only; never use the name of a place, landmark, building, brand, person or artwork, and no lettering. Use each piece at most twice and "pendant" at most once. best: the light that suits the place. where: one sentence on where to stand, using only what is plainly visible there; no opening hours, prices, crowd levels or anything that can go out of date. wear: one sentence on how to wear or hold the piece in the photo. Mood: ${mood}. Season: ${season}. Do not state facts. Never write the words AI or generate.`,
  outfit:
    'Look at the outfit in the photo and pick its 3 most characteristic colors. Reply with JSON only: {"colors":["#RRGGBB","#RRGGBB","#RRGGBB"]}.',
  epilogue:
    'You are curating a charm bracelet from a finished trip. From the chapters, step count and photos provided, return JSON only: {"charms":[{"label":string,"symbol":string}],"bestPhotos":[number,number,number]}. Each symbol is a short visual description with no digits or lettering. Show people as colored beads, never faces. bestPhotos are zero-based indexes of the three photos with the most place and light in them. At most 6 charms.',
};
