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
