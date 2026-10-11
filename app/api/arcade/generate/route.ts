import { createPattern, errorResponse, findCategory, listCategories } from "@/lib/arcade";

// POST { requestId, prompt, colors?, referenceIds?, category? } -> the job. The browser polls /api/arcade/job.
export async function POST(req: Request) {
  try {
    const { requestId, prompt, colors, referenceIds, category } = await req.json();
    if (!requestId || !prompt) return Response.json({ error: "requestId and prompt are required" }, { status: 400 });
    let categoryId: string | undefined;
    let jewelry = false;
    if (category) {
      const cat = findCategory(await listCategories(), category);
      if (!cat) return Response.json({ error: `Category "${category}" is not available` }, { status: 404 });
      categoryId = cat.categoryId;
      jewelry = cat.world === "jewelry";
    }
    const job = await createPattern({
      requestId,
      prompt,
      ...(categoryId ? { categoryId } : {}),
      // jewelry is text only
      ...(!jewelry && colors?.length ? { colors: colors.slice(0, 10) } : {}),
      ...(!jewelry && referenceIds?.length ? { referenceIds: referenceIds.slice(0, 3) } : {}),
    });
    return Response.json(job);
  } catch (e) {
    return errorResponse(e);
  }
}
