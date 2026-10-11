"use client";

import { useEffect, useState } from "react";
import type { LivePiece, Money } from "@/lib/pack";
import { mergeColors } from "@/lib/palettes";
import { CHAPTERS, DEMO_DATES, SEASON_COPY, TIME_ZONE, type Chapter } from "@/lib/places";
import { demoSeason, useSeason, type Season } from "./Season";
import { api } from "./useJob";
import { usePack } from "./usePack";
import { getTrip, setArt, useTrip, type ArtState } from "./useTrip";

type Live = NonNullable<LivePiece["live"]>;
type Job = { jobId: string; status: "running" | "succeeded" | "failed"; result: { patternId?: string; productId?: string } | null; error: { message: string } | null };

const MAX_JOBS = 5;
const busy = new Set<string>();
const freshCache = new Map<string, Live>();

/** Start the next waiting chapters (at most 5 Arcade jobs at once) and poll the running ones. */
async function tick(season: Season) {
  const t = getTrip();
  if (t.demo || !t.chapters.length) return;
  let running = t.chapters.filter((c) => t.art[c.n]?.status === "running").length;

  for (const c of t.chapters) {
    const a: ArtState = t.art[c.n] || {};
    const key = `${t.id}-c${c.n}-a${a.attempt || 0}`;
    if (busy.has(key)) continue;

    if (a.status === "running" && a.jobId) {
      busy.add(key);
      api
        .post<Job>("/api/arcade/job", { jobId: a.jobId })
        .then((job) => {
          if (job.status === "succeeded") setArt(c.n, { status: "succeeded", patternId: job.result?.patternId, productId: job.result?.productId });
          else if (job.status === "failed") setArt(c.n, { status: "failed", error: job.error?.message || "The piece could not be made" });
        })
        .catch(() => {})
        .finally(() => busy.delete(key));
    } else if (!a.status && running < MAX_JOBS && c.prompt) {
      running++;
      busy.add(key);
      api
        // stable requestId: a refresh or a second tab never starts a duplicate job
        .post<Job>("/api/arcade/generate", { requestId: `own-${key}`, prompt: c.prompt, colors: mergeColors(season, t.outfitColors), ...(c.category ? { category: c.category } : {}) })
        .then((job) => setArt(c.n, job.status === "failed" ? { status: "failed", error: job.error?.message } : { status: "running", jobId: job.jobId }))
        .catch((e) => setArt(c.n, { status: "failed", error: e instanceof Error ? e.message : "Could not start" }))
        .finally(() => busy.delete(key));
    }
  }
}

export type StoryStatus = "ready" | "inking" | "waiting" | "failed";

/** One view of the story, whether it is the pre-made New York trip or a trip of your own made live. */
export function useStory() {
  const { season } = useSeason();
  const { trip, ready } = useTrip();
  const pack = usePack();
  const ds = demoSeason(season);
  const isDemo = trip.demo || !trip.chapters.length;
  const [fresh, setFresh] = useState<Record<string, Live>>({});

  // own trip: keep the ink queue moving on whichever screen is open
  useEffect(() => {
    if (!ready || isDemo) return;
    tick(season);
    const id = setInterval(() => tick(season), 4000);
    return () => clearInterval(id);
  }, [ready, isDemo, season]);

  // own trip: image URLs expire, so fetch fresh ones (and the live price) for every finished piece
  useEffect(() => {
    if (isDemo) return;
    for (const c of trip.chapters) {
      const a = trip.art[c.n];
      const id = a?.productId || a?.patternId;
      if (a?.status !== "succeeded" || !id) continue;
      const cached = freshCache.get(id);
      if (cached) {
        if (!fresh[id]) setFresh((f) => ({ ...f, [id]: cached }));
        continue;
      }
      if (busy.has(id)) continue;
      busy.add(id);
      const load = a.productId
        ? api.post<{ imageUrl: string; unitPrice: Money | null; title: string; selectionLabel: string }>("/api/arcade/product", { productId: a.productId }).then((p): Live => ({ unitPrice: p.unitPrice, imageUrl: p.imageUrl, title: p.title, selectionLabel: p.selectionLabel }))
        : api.post<{ imageUrl: string }>("/api/arcade/pattern", { patternId: a.patternId }).then((p): Live => ({ unitPrice: null, patternUrl: p.imageUrl }));
      load
        .then((live) => {
          freshCache.set(id, live);
          setFresh((f) => ({ ...f, [id]: live }));
        })
        .catch(() => {})
        .finally(() => busy.delete(id));
    }
  }, [isDemo, trip.chapters, trip.art, fresh]);

  // New York example: summer and winter copy is on the chapter; spring and autumn have their own
  const both = (v: string) => ({ summer: v, winter: v });
  const chapters: Chapter[] = isDemo
    ? CHAPTERS.map((c) => {
        const alt = season === "spring" || season === "autumn" ? SEASON_COPY[season][c.n] : null;
        return { ...c, ...(alt ? { title: both(alt.title), line: both(alt.line), why: both(alt.why) } : {}), date: DEMO_DATES[season][c.n - 1], tz: TIME_ZONE };
      })
    : trip.chapters;
  // a piece made for this exact season, else the nearest season that was made (pendants are shared)
  const demoPiece = (n: number) => pack.pieces[`c${n}-${season}`] || pack.pieces[`c${n}-${ds}`];

  function pieceFor(n: number): LivePiece | undefined {
    if (isDemo) return demoPiece(n);
    const a = trip.art[n];
    const c = trip.chapters.find((x) => x.n === n);
    if (!a || !c) return undefined;
    const id = a.productId || a.patternId;
    return { key: `own-${n}`, kind: c.kind, patternId: a.patternId, productId: a.productId, live: id ? fresh[id] : undefined };
  }

  function statusFor(n: number): StoryStatus {
    if (isDemo) {
      const p = demoPiece(n);
      return p?.productId || p?.patternId ? "ready" : "inking";
    }
    const s = trip.art[n]?.status;
    return s === "succeeded" ? "ready" : s === "failed" ? "failed" : s === "running" ? "inking" : "waiting";
  }

  return {
    isDemo,
    ready,
    ds,
    chapters,
    pieceFor,
    statusFor,
    errorFor: (n: number) => trip.art[n]?.error,
    retry: (n: number) => setArt(n, null),
    packLoading: isDemo && pack.loading,
    live: isDemo ? pack.live : true,
    madeThisMorning: isDemo && Boolean(pack.generatedAt),
    pack,
  };
}
