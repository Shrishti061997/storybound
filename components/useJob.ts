"use client";

import { useCallback, useRef, useState } from "react";

export type JobState = { status: "idle" | "starting" | "running" | "succeeded" | "failed"; patternId?: string; productId?: string; error?: string };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

export const api = { post };

type Job = { jobId: string; status: "running" | "succeeded" | "failed"; result: { patternId?: string; productId?: string } | null; error: { message: string } | null };

/** Starts an Arcade job on the server, then polls it from the browser every 3 seconds. */
export function useJob() {
  const [state, setState] = useState<JobState>({ status: "idle" });
  const token = useRef(0);

  const start = useCallback(async (url: string, body: unknown): Promise<JobState> => {
    const mine = ++token.current;
    const set = (s: JobState) => {
      if (mine === token.current) setState(s);
      return s;
    };
    try {
      set({ status: "starting" });
      let job = await post<Job>(url, body);
      set({ status: "running" });
      const started = Date.now();
      while (job.status === "running") {
        if (Date.now() - started > 6 * 60_000) throw new Error("This is taking longer than usual. Try again in a minute.");
        await new Promise((r) => setTimeout(r, 3000));
        if (mine !== token.current) return { status: "idle" };
        job = await post<Job>("/api/arcade/job", { jobId: job.jobId });
      }
      if (job.status === "failed") throw new Error(job.error?.message || "The piece could not be made");
      return set({ status: "succeeded", patternId: job.result?.patternId, productId: job.result?.productId });
    } catch (e) {
      return set({ status: "failed", error: e instanceof Error ? e.message : "Something went wrong" });
    }
  }, []);

  return { state, start };
}
