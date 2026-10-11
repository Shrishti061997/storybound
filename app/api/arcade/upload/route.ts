import { errorResponse, uploadReference, type ReferenceMediaType } from "@/lib/arcade";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// POST multipart form { file, requestId } -> { referenceId }. Up to 10 MiB, passed to patterns/create.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const requestId = String(form.get("requestId") || "");
    if (!(file instanceof File) || !requestId) return Response.json({ error: "file and requestId are required" }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return Response.json({ error: "Use a JPEG, PNG, WebP or GIF photo" }, { status: 415 });
    if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Photos can be up to 10 MB" }, { status: 413 });
    const ref = await uploadReference(requestId, new Uint8Array(await file.arrayBuffer()), file.type as ReferenceMediaType);
    return Response.json({ referenceId: ref.referenceId });
  } catch (e) {
    return errorResponse(e);
  }
}
