import { createCheckout, errorResponse } from "@/lib/arcade";

// POST { requestId, productIds } -> { checkoutUrl }. Arcade pieces only, one of each, drop-shipped.
export async function POST(req: Request) {
  try {
    const { requestId, productIds } = (await req.json()) as { requestId?: string; productIds?: string[] };
    if (!requestId || !productIds?.length) return Response.json({ error: "requestId and productIds are required" }, { status: 400 });
    const lines = [...new Set(productIds)].map((productId) => ({ productId, quantity: 1 }));
    return Response.json(await createCheckout(requestId, lines));
  } catch (e) {
    return errorResponse(e);
  }
}
