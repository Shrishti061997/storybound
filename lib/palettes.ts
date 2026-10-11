import type { Season } from "@/components/Season";

export const PALETTES: Record<Season, string[]> = {
  spring: ["#F7C6D0", "#A8456B", "#8FCB9B", "#FFFFFF", "#F2E394"],
  summer: ["#2D6A4F", "#74C69D", "#48CAE4", "#FFFFFF", "#FFD166"],
  autumn: ["#9A4A1C", "#D98E32", "#E9B44C", "#5B6B3A", "#FAF4EA"],
  winter: ["#FFFFFF", "#CAE9FF", "#5FA8D3", "#1B4965", "#9D0208"],
};

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

function hsl(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}

/**
 * Summer to winter: warm, saturated clusters (the sun yellows) become the winter red accent;
 * everything else moves to the winter blue of the closest lightness.
 */
export function toWinter(hex: string): string {
  const { h, s, l } = hsl(hex);
  if (s > 0.45 && l > 0.3 && l < 0.85 && (h < 75 || h > 330)) return "#9D0208";
  const cool = ["#FFFFFF", "#CAE9FF", "#5FA8D3", "#1B4965"];
  return cool.reduce((best, c) => (Math.abs(hsl(c).l - l) < Math.abs(hsl(best).l - l) ? c : best), cool[0]);
}

/** Recolor target for any season: each cluster moves to the season color of the closest lightness. */
export function toSeason(hex: string, target: Season): string {
  if (target === "winter") return toWinter(hex);
  const palette = PALETTES[target];
  const l = hsl(hex).l;
  return palette.reduce((best, c) => (Math.abs(hsl(c).l - l) < Math.abs(hsl(best).l - l) ? c : best), palette[0]);
}

/** Merge outfit colors with the season palette, 10 colors at most (Arcade's limit). */
export function mergeColors(season: Season, extra: string[] = []): string[] {
  const all = [...extra, ...PALETTES[season]].map((c) => c.toUpperCase()).filter((c) => /^#[0-9A-F]{6}$/.test(c));
  return [...new Set(all)].slice(0, 10);
}
