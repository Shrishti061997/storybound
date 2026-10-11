// Shape of data/demo-pack.json, written by scripts/pregen.ts. Safe to import anywhere (types only).

export type Money = { amount: string; currency: string };

export type PackPiece = {
  key: string;
  kind: "arcade" | "concept";
  patternId?: string;
  productId?: string;
  title?: string;
  selectionLabel?: string;
  /** Price snapshot from pregen. The app always asks Arcade for the live price before showing one. */
  unitPrice?: Money | null;
  /** Local copies under /public/demo, used until fresh Arcade URLs arrive. */
  image?: string;
  patternImage?: string;
  error?: string;
};

export type DemoPack = {
  generatedAt: string | null;
  categories: Record<string, { categoryId: string; world: string }>;
  pieces: Record<string, PackPiece>;
};

export type LivePiece = PackPiece & {
  /** Fresh from Arcade on this request. Absent when Arcade could not be reached. */
  live?: { unitPrice: Money | null; imageUrl?: string; images?: string[]; title?: string; selectionLabel?: string; patternUrl?: string };
};

export type PackResponse = { generatedAt: string | null; pieces: Record<string, LivePiece>; live: boolean; error?: string };

export function formatMoney(m?: Money | null) {
  if (!m) return null;
  const n = Number(m.amount);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: m.currency || "USD" }).format(n);
}
