import pack from "@/data/demo-pack.json";
import { getPattern, getProduct, pool } from "@/lib/arcade";
import type { DemoPack, LivePiece } from "@/lib/pack";

export const dynamic = "force-dynamic";

// GET -> the demo pack with live prices and fresh image URLs (they expire, so they are re-fetched here).
export async function GET() {
  const base = pack as DemoPack;
  const pieces: Record<string, LivePiece> = structuredClone(base.pieces);
  let reached = 0;
  let lastError: string | undefined;

  const results = await pool(
    5,
    Object.values(pieces).map((piece) => async () => {
      if (piece.productId) {
        const p = await getProduct(piece.productId);
        piece.live = { unitPrice: p.unitPrice, imageUrl: p.imageUrl, images: p.images?.map((i) => i.url), title: p.title, selectionLabel: p.selectionLabel };
      } else if (piece.patternId) {
        const p = await getPattern(piece.patternId);
        piece.live = { unitPrice: null, patternUrl: p.imageUrl };
      }
    }),
  );
  for (const r of results) {
    if (r.status === "fulfilled") reached++;
    else lastError = r.reason instanceof Error ? r.reason.message : String(r.reason);
  }

  return Response.json({ generatedAt: base.generatedAt, pieces, live: reached > 0, error: lastError });
}
