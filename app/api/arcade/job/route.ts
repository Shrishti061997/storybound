import { errorResponse, getJob } from "@/lib/arcade";

// POST { jobId } -> current job status. Polled from the browser every few seconds.
export async function POST(req: Request) {
  try {
    const { jobId } = await req.json();
    if (!jobId) return Response.json({ error: "jobId is required" }, { status: 400 });
    return Response.json(await getJob(jobId));
  } catch (e) {
    return errorResponse(e);
  }
}
