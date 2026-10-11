import { createProduct, errorResponse, findCategory, getCategory, getProduct, listCategories, type Fit } from "@/lib/arcade";

// POST { productId } -> product with live price and fresh image URLs.
// POST { requestId, patternId, category, fit? } -> a product job, using the complete selections from categories/get.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.productId) return Response.json(await getProduct(body.productId));

    const { requestId, patternId, category, fit } = body as { requestId?: string; patternId?: string; category?: string; fit?: Fit };
    if (!requestId || !patternId || !category) return Response.json({ error: "requestId, patternId and category are required" }, { status: 400 });
    const cat = findCategory(await listCategories(), category);
    if (!cat) return Response.json({ error: `Category "${category}" is not available` }, { status: 404 });
    const detail = await getCategory(cat.categoryId, {});
    if (!detail.canManufacture) return Response.json({ error: "That combination cannot be made right now" }, { status: 409 });
    return Response.json(await createProduct({ requestId, patternId, categoryId: cat.categoryId, selections: detail.selections, ...(fit ? { fit } : {}) }));
  } catch (e) {
    return errorResponse(e);
  }
}
