// Writing calls (itinerary reader, story writer, photo coach, curator, outfit match).
// Server only. Every caller falls back to the hand-written data when a call fails.

import Anthropic from "@anthropic-ai/sdk";

if (typeof window !== "undefined") {
  throw new Error("lib/ai.ts must not be imported in the browser");
}

const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  client ||= new Anthropic({ timeout: 25_000, maxRetries: 1 });
  return client;
}

export type AiImage = { mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; base64: string };

/** One request, JSON back. Throws on refusal, truncation or unparseable output. */
export async function askJson<T>(system: string, user: string, images: AiImage[] = []): Promise<T> {
  const content: Anthropic.ContentBlockParam[] = [
    ...images.map((img): Anthropic.ImageBlockParam => ({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } })),
    { type: "text", text: user },
  ];
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    // short, well-specified extraction and copy: low effort keeps the screen quick
    output_config: { effort: "low" },
    system,
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") throw new Error("The request was declined");
  if (response.stop_reason === "max_tokens") throw new Error("The reply was cut off");
  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON in the reply");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

export function aiError(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError) return "The writing key was rejected";
  if (e instanceof Anthropic.RateLimitError) return "The writer is busy";
  if (e instanceof Anthropic.APIError) return `Writing service error ${e.status ?? ""}`.trim();
  return e instanceof Error ? e.message : "Unknown error";
}

/** Parse a data URL from the browser into an image block source. */
export function parseDataUrl(dataUrl: string): AiImage | null {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl);
  return m ? { mediaType: m[1] as AiImage["mediaType"], base64: m[2] } : null;
}
