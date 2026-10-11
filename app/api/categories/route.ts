import { CATEGORY_NAMES, errorResponse, findCategory, getCategory, listCategories } from "@/lib/arcade";

export const dynamic = "force-dynamic";

// GET /api/categories -> the four categories we use, mapped by name, with their live options.
export async function GET() {
  try {
    const items = await listCategories();
    const found = await Promise.all(
      CATEGORY_NAMES.map(async (name) => {
        const cat = findCategory(items, name);
        if (!cat) return { name, missing: true as const };
        const detail = await getCategory(cat.categoryId, {});
        return {
          name,
          matchedName: cat.name,
          categoryId: cat.categoryId,
          world: cat.world,
          canManufacture: detail.canManufacture,
          selections: detail.selections,
          options: detail.options,
        };
      }),
    );
    return Response.json({ count: items.length, categories: found, allNames: items.map((c) => `${c.name} (${c.world})`) });
  } catch (e) {
    return errorResponse(e);
  }
}
