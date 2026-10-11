"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowIcon, InkDivider, InkUnderline, PinIcon, SunIcon } from "@/components/Ink";
import { LightBar } from "@/components/LightBar";
import { Masthead } from "@/components/Masthead";
import { PieceArt } from "@/components/PieceArt";
import { SeasonToggle, useSeason } from "@/components/Season";
import { api, useJob } from "@/components/useJob";
import { livePrice, patternImage } from "@/components/usePack";
import { useStory } from "@/components/useStory";
import { useTrip } from "@/components/useTrip";
import { formatMoney, type Money } from "@/lib/pack";
import { mergeColors } from "@/lib/palettes";
import { roman, TIME_ZONE } from "@/lib/places";
import { ARCADE_PROMPTS } from "@/lib/prompts";
import { formatDate, formatTime, sunDay, sunFacts } from "@/lib/sun";

type Coach = { when: string; where: string; angle: string; howToWear: string };
type Fresh = { imageUrl: string; price?: Money | null };

export default function ChapterPage() {
  const n = Number(useParams<{ n: string }>().n);
  const { season: themeSeason } = useSeason();
  const { trip } = useTrip();
  const story = useStory();
  const season = story.ds;
  const c = story.chapters.find((x) => x.n === n);
  const { state: job, start } = useJob();
  const [revealed, setRevealed] = useState(false);
  const [written, setWritten] = useState<Record<string, Coach>>({});
  const [fresh, setFresh] = useState<Record<string, Fresh>>({});

  // no date yet: use today plus the chapter's place in the trip, and say so on the page
  const date = c?.date || new Date(Date.now() + (n - 1) * 86_400_000).toISOString().slice(0, 10);
  const tz = c?.tz || TIME_ZONE;
  const lat = c?.lat ?? null;
  const lng = c?.lng ?? null;
  const best = c?.best;
  const sun = useMemo(() => (best && lat !== null && lng !== null ? sunDay(date, lat, lng, best) : null), [best, lat, lng, date]);
  const facts = useMemo(() => (best && sun ? sunFacts(sun, tz, best) : null), [best, sun, tz]);
  const key = `${story.isDemo ? "ny" : trip.id}-c${n}-${themeSeason}`;

  // The photo coach rewrites the tips from these facts only. Calculated tips show until it answers.
  useEffect(() => {
    if (!c || !sun || !facts || written[key] || !story.ready) return;
    let alive = true;
    const reveal = c.piece === "scarf" ? [`The scarf's colors come up in strong sun; the sun is highest at ${formatTime(sun.solarNoon, tz)}.`] : [];
    api
      .post<Coach>("/api/ai/coach", {
        piece: `the ${c.pieceLabel.toLowerCase()}`,
        facts: [...(c.fact ? [`Place: ${c.fact}`] : []), facts.when, facts.angle, ...reveal, `Where: ${c.coach.where}`, `Wearing: ${c.coach.wear}`],
      })
      .then((out) => alive && setWritten((w) => ({ ...w, [key]: out })))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [c, sun, facts, key, written, tz, story.ready]);

  if (!c) {
    return (
      <main className="screen">
        <Masthead back="/story" backLabel="Your story" />
        <div className="screen-body">
          <h1 className="h-page">That chapter isn&rsquo;t in this story.</h1>
        </div>
      </main>
    );
  }

  const piece = story.pieceFor(c.n);
  const status = story.statusFor(c.n);
  const price = c.kind === "arcade" ? livePrice(piece) : null;
  const isScarf = c.piece === "scarf";
  const coach: Coach = written[key] || {
    when: !sun || !facts ? "We couldn't place this spot on the map, so there are no sun times for it yet." : isScarf ? `Wear it out at ${formatTime(sun.solarNoon, tz)}, when the sun is highest, to bring the colors up. ${facts.when}` : facts.when,
    where: c.coach.where,
    angle: facts?.angle || "Keep the sun behind the camera when you can.",
    howToWear: c.coach.wear,
  };
  const pattern = patternImage(piece);
  const made = fresh[key];
  const inking = job.status === "starting" || job.status === "running";

  async function inkAgain() {
    if (!c) return;
    const colors = mergeColors(themeSeason, trip.outfitColors);
    const prompt =
      c.prompt ? c.prompt
      : c.piece === "pocket" ? ARCADE_PROMPTS.scarf
      : c.piece === "scarf" ? ARCADE_PROMPTS.scarf.replace("wildflowers and tall grasses", season === "winter" ? "snow-dusted grasses" : "wildflowers and tall grasses")
      : c.piece === "ribbon" ? ARCADE_PROMPTS.ribbon
      : c.piece === "pendant" ? ARCADE_PROMPTS.pendant(trip.metal || (season === "winter" ? "gold" : "silver"))
      : ARCADE_PROMPTS[c.piece][season];
    const done = await start("/api/arcade/generate", {
      requestId: `live-c${c.n}-${season}-${Date.now().toString(36)}`,
      prompt,
      colors,
      ...(c.piece === "pendant" ? { category: "Pendant Necklace" } : {}),
    });
    try {
      if (done.productId) {
        const p = await api.post<{ imageUrl: string; unitPrice: Money | null }>("/api/arcade/product", { productId: done.productId });
        setFresh((f) => ({ ...f, [key]: { imageUrl: p.imageUrl, price: p.unitPrice } }));
      } else if (done.patternId) {
        const p = await api.post<{ imageUrl: string }>("/api/arcade/pattern", { patternId: done.patternId });
        setFresh((f) => ({ ...f, [key]: { imageUrl: p.imageUrl } }));
      }
    } catch {
      // the job succeeded but the image could not be fetched; the morning's piece stays on the page
    }
  }

  const prev = story.chapters.find((x) => x.n === c.n - 1);
  const next = story.chapters.find((x) => x.n === c.n + 1);

  return (
    <main className="screen chapter" key={c.n}>
      <Masthead back="/story" backLabel="Your story" right={story.isDemo ? <SeasonToggle /> : null} />

      <div className="screen-body chapter-grid">
        <div className="chapter-left">
        <p className="eyebrow">
          Chapter {roman(c.n)} · {c.date ? formatDate(date, tz) : "date to confirm"}
        </p>
        <h1 className="h-page">
          {c.title[season]}
          <InkUnderline />
        </h1>
        <p className="small chapter-place">
          <PinIcon size={15} /> {[c.place, c.city].filter(Boolean).join(", ")}
        </p>

        <div className={`chapter-art ${isScarf ? "reveal" : ""} ${revealed ? "revealed" : ""}`}>
          <span className="tape" aria-hidden="true" />
          {made ? (
            <span className="swatch piece-art">
              <img src={made.imageUrl} alt={`${c.pieceLabel} for ${c.place}, inked just now`} />
            </span>
          ) : (
            <PieceArt chapter={c} piece={piece} tilt="-1deg" prefer={isScarf && !revealed && story.isDemo ? "pattern" : "product"} />
          )}
          <div className="chapter-art-meta">
            <span className={`badge ${c.kind === "arcade" ? "badge-made" : "badge-preview"}`}>{c.kind === "arcade" ? "Made with Arcade" : "Design preview"}</span>
            <span className="small">{made ? "Inked just now" : status === "inking" ? `Inking Chapter ${c.n}…` : status === "waiting" ? "Next in line" : status === "failed" ? "Needs another try" : c.pieceLabel}</span>
            {c.kind === "arcade" ? <span className="price">{formatMoney(made?.price || price) || (status === "ready" ? "…" : "")}</span> : null}
          </div>
        </div>

        {isScarf && !made ? (
          <div className="reveal-row">
            {revealed ? (
              <span className="hand">Some pieces aren&rsquo;t finished until you get there.</span>
            ) : (
              <button type="button" className="btn btn-sun" onClick={() => setRevealed(true)} disabled={status !== "ready"}>
                <SunIcon size={20} /> Step into the sun
              </button>
            )}
          </div>
        ) : null}

        <p className="why">{c.why[season]}</p>
        </div>

        <div className="chapter-right">
        <InkDivider />

        {sun ? (
          <section aria-label="The light that day">
            <div className="row between">
              <h2>The light that day</h2>
              {!isScarf ? <span className="hand">{sun.window.label.toLowerCase()}</span> : null}
            </div>
            <LightBar sun={sun} timeZone={tz} />
          </section>
        ) : null}

        <dl className="coach">
          <div>
            <dt className="eyebrow">When</dt>
            <dd>{coach.when}</dd>
          </div>
          <div>
            <dt className="eyebrow">Where to stand</dt>
            <dd>{coach.where}</dd>
          </div>
          <div>
            <dt className="eyebrow">Angle</dt>
            <dd>{coach.angle}</dd>
          </div>
          <div>
            <dt className="eyebrow">How to wear it</dt>
            <dd>{coach.howToWear}</dd>
          </div>
        </dl>

        {story.isDemo && c.n === 1 ? (
          <aside className="card card-stitched swap">
            <span className="eyebrow">If Day 1 were cloudy</span>
            <p>
              Swap Chapters I and III. The scarf needs strong sun to show its colors; the ribbon is happy under cloud. Your
              pieces stay the same, only the order changes.
            </p>
          </aside>
        ) : null}

        <div className="ink-again">
          <button type="button" className="btn btn-quiet" onClick={inkAgain} disabled={inking}>
            {inking ? `Inking Chapter ${c.n}…` : "Ink a new one, live"}
          </button>
          <p className="small" role="status">
            {inking
              ? "Arcade is drawing it now. This takes a minute or two."
              : job.status === "failed"
                ? job.error
                : made
                  ? "That one is new. The piece already in your order stays as it is."
                  : "Draws a fresh design for this chapter with Arcade."}
          </p>
        </div>
        </div>
      </div>

      <div className="dock dock-row">
        {prev ? (
          <Link className="btn btn-quiet" href={`/chapter/${prev.n}`}>
            Chapter {roman(prev.n)}
          </Link>
        ) : (
          <Link className="btn btn-quiet" href="/story">
            All chapters
          </Link>
        )}
        {next ? (
          <Link className="btn" href={`/chapter/${next.n}`}>
            Open Chapter {roman(next.n)} <ArrowIcon size={20} />
          </Link>
        ) : (
          <Link className="btn" href="/epilogue">
            Write my epilogue <ArrowIcon size={20} />
          </Link>
        )}
      </div>
    </main>
  );
}
