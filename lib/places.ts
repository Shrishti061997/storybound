// The New York State place library and the hand-written story. This is the fallback for every
// writing call: if a model call fails, the app reads from here.

import type { Season } from "@/components/Season";

export type PieceType = "scarf" | "pendant" | "ribbon" | "brooch" | "nails";
export type BestWindow = "sunrise" | "midday" | "afternoon" | "goldenEvening";

export type Chapter = {
  n: number;
  place: string;
  city: string;
  lat: number;
  lng: number;
  piece: PieceType;
  pieceLabel: string;
  kind: "arcade" | "concept";
  category?: "Scarves" | "Pendant Necklace" | "Ribbon Scarf";
  motif: Record<Season, string>;
  /** The only facts the photo coach may use. */
  fact: string;
  title: Record<Season, string>;
  line: Record<Season, string>;
  why: Record<Season, string>;
  best: BestWindow;
  coach: { where: string; wear: string };
};

export const TIME_ZONE = "America/New_York";

export const TRIP_DATES: Record<Season, string[]> = {
  summer: ["2027-07-12", "2027-07-13", "2027-07-14", "2027-07-15", "2027-07-16"],
  winter: ["2026-12-14", "2026-12-15", "2026-12-16", "2026-12-17", "2026-12-18"],
};

export const CHAPTERS: Chapter[] = [
  {
    n: 1,
    place: "The High Line",
    city: "New York City",
    lat: 40.748,
    lng: -74.0048,
    piece: "scarf",
    pieceLabel: "Sun-Reveal scarf",
    kind: "arcade",
    category: "Scarves",
    motif: { summer: "wildflowers on old rail tracks", winter: "snow-dusted grasses on old rail tracks" },
    fact: "Elevated park on a former rail line, with shaded and sunny stretches.",
    title: { summer: "Wildflowers above the avenue", winter: "Frost on the old rails" },
    line: {
      summer: "You start where the city grew a garden on its rails.",
      winter: "The rails are quiet and the grasses wear the first snow.",
    },
    why: {
      summer: "Drawn from the wildflowers that grow between the rails, in the greens you said you love.",
      winter: "The same rails and grasses, turned to the blues of a December afternoon.",
    },
    best: "goldenEvening",
    coach: {
      where: "Pick one of the sunny stretches of the walkway, with the rails running away behind you.",
      wear: "Loose over one shoulder so the pattern faces the camera. Let the wind take one corner.",
    },
  },
  {
    n: 2,
    place: "Brooklyn Bridge",
    city: "New York City",
    lat: 40.7061,
    lng: -73.9969,
    piece: "pendant",
    pieceLabel: "Pendant",
    kind: "arcade",
    category: "Pendant Necklace",
    motif: { summer: "gothic stone arches and cables", winter: "arches and cables with frost" },
    fact: "Pedestrian promenade; walking from Brooklyn toward Manhattan puts the sunrise behind you.",
    title: { summer: "First light on the cables", winter: "A cold bright crossing" },
    line: {
      summer: "Cross before the city wakes, with the sun at your back.",
      winter: "Breath in the air, stone arches ahead, the morning all yours.",
    },
    why: {
      summer: "Two stone arches and a fan of cables, small enough to sit at your collar.",
      winter: "The same arches in warm metal, for a morning that needs it.",
    },
    best: "sunrise",
    coach: {
      where: "On the promenade, walking from Brooklyn toward Manhattan, so the sunrise is behind you.",
      wear: "Outside your collar, on the shortest chain length. Turn a quarter toward the light so it catches.",
    },
  },
  {
    n: 3,
    place: "Central Park",
    city: "New York City",
    lat: 40.7716,
    lng: -73.975,
    piece: "ribbon",
    pieceLabel: "Hair ribbon",
    kind: "arcade",
    category: "Ribbon Scarf",
    motif: { summer: "elms and a curved stone footbridge", winter: "snowy elms and skaters" },
    fact: "Large open lawns with full sun around midday.",
    title: { summer: "Under the elms", winter: "Skaters and bare elms" },
    line: {
      summer: "A slow day on the grass, with nowhere you need to be.",
      winter: "Bare branches, bright ice, and something warm in your hands.",
    },
    why: {
      summer: "A repeat of elm leaves and little footbridges, narrow enough to tie in your hair.",
      winter: "The same repeat in ice blue, with one red thread running through.",
    },
    best: "midday",
    coach: {
      where: "On one of the large open lawns, in full sun.",
      wear: "Tied in a bow at the end of a braid or around a ponytail, tails left long.",
    },
  },
  {
    n: 4,
    place: "Lake Placid",
    city: "Lake Placid",
    lat: 44.2795,
    lng: -73.9799,
    piece: "brooch",
    pieceLabel: "Brooch",
    kind: "concept",
    motif: { summer: "a mountain lake, pines, canoes", winter: "a frozen lake, snowy pines, skates" },
    fact: "Lakeside village in the Adirondacks.",
    title: { summer: "Pines and still water", winter: "The lake holds its breath" },
    line: {
      summer: "The mountains lean in and the water keeps their picture.",
      winter: "Snow on the pines and a lake you can walk across.",
    },
    why: {
      summer: "A small round lake scene to pin where a pocket would be.",
      winter: "The lake again, frozen, with one pair of skates left at the edge.",
    },
    best: "goldenEvening",
    coach: {
      where: "At the edge of the lake, with the water and the mountains behind you.",
      wear: "Pinned high on your jacket, on the side nearest the camera.",
    },
  },
  {
    n: 5,
    place: "Niagara Falls",
    city: "Niagara Falls",
    lat: 43.0868,
    lng: -79.0685,
    piece: "nails",
    pieceLabel: "Stick-on nails",
    kind: "concept",
    motif: { summer: "a curtain waterfall with a rainbow", winter: "a frozen waterfall with icicles" },
    fact: "Rainbows appear in the mist when the sun is behind you.",
    title: { summer: "A rainbow in the mist", winter: "The falls in white" },
    line: {
      summer: "The last chapter is loud, wet, and worth every step.",
      winter: "Ice on every railing and the water still roaring.",
    },
    why: {
      summer: "Ten tiny falls and one rainbow, for the hand you hold up to the mist.",
      winter: "Icicles and pale blue, with the water still moving underneath.",
    },
    best: "afternoon",
    coach: {
      where: "Facing the mist with the sun behind you. That is where the rainbow shows.",
      wear: "Hold one hand up toward the falls, fingers relaxed, nails toward the camera.",
    },
  },
];

export const DEMO_ITINERARY = `New York State, 5 days

Day 1 – New York City: walk the High Line
Day 2 – New York City: Brooklyn Bridge at sunrise
Day 3 – New York City: a slow day in Central Park
Day 4 – Lake Placid: the lake and the village
Day 5 – Niagara Falls`;

export type Charm = { key: string; label: string; symbol: string };

export const CHARMS: Charm[] = [
  { key: "charm-1", label: "High Line wildflowers", symbol: "a single wildflower growing between two rail tracks" },
  { key: "charm-2", label: "Brooklyn sunrise", symbol: "a stone bridge arch with a rising sun behind it" },
  { key: "charm-3", label: "Lake Placid", symbol: "a pine tree beside a small canoe" },
  { key: "charm-4", label: "Niagara", symbol: "a waterfall with a small rainbow" },
  { key: "charm-5", label: "12 miles walked", symbol: "a single walking boot with a trail of dots" },
];

export const TRAVELERS = [
  { name: "You", color: "var(--accent)" },
  { name: "Maya", color: "var(--highlight)" },
  { name: "Dad", color: "var(--accent-2)" },
];

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
export const roman = (n: number) => ROMAN[n - 1] ?? String(n);
export const chapter = (n: number) => CHAPTERS.find((c) => c.n === n);
