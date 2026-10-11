import { errorResponse, extendScene, getPattern } from "@/lib/arcade";

// POST { patternId } -> pattern with fresh image URLs.
// POST { patternId, extend: { requestId, targetWidth, targetHeight } } -> an extendScene job.
export async function POST(req: Request) {
  try {
    const { patternId, extend } = await req.json();
    if (!patternId) return Response.json({ error: "patternId is required" }, { status: 400 });
    if (extend) return Response.json(await extendScene(extend.requestId, patternId, extend.targetWidth, extend.targetHeight));
    return Response.json(await getPattern(patternId));
  } catch (e) {
    return errorResponse(e);
  }
}
