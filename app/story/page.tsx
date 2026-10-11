"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowIcon, InkDivider, InkUnderline, LampIcon, PinIcon } from "@/components/Ink";
import { Masthead } from "@/components/Masthead";
import { PieceArt } from "@/components/PieceArt";
import { SEASON_LABEL, SeasonIcon, SeasonToggle, useSeason, type DemoSeason } from "@/components/Season";
import { api } from "@/components/useJob";
import { livePrice } from "@/components/usePack";
import { useStory } from "@/components/useStory";
import { useTrip } from "@/components/useTrip";
import { formatMoney } from "@/lib/pack";
import { CHAPTERS, roman } from "@/lib/places";

type Written = Record<DemoSeason, { n: number; title: string; line: string }[]>;
const STORY_KEY = "storybound.story.v2";
const COUNT = ["no", "one", "two", "three", "four", "five", "six", "seven"];

const shortDate = (iso?: string | null) => (iso ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`)) : null);

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export default function StoryPage() {
  const router = useRouter();
  const { season } = useSeason();
  const { trip, update, ready } = useTrip();
  const story = useStory();
  const { chapters, ds, isDemo } = story;
  const [written, setWritten] = useState<Partial<Written>>({});
  const [writing, setWriting] = useState(false);
  const [opening, setOpening] = useState<number | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [orderNote, setOrderNote] = useState<string | null>(null);
  const asked = useRef(false);

  // New York story: the story writer drafts titles for both seasons in the traveler's mood.
  // A trip of your own already has its chapters written; the hand-written story stands in if the writer can't answer.
  useEffect(() => {
    if (!ready || !isDemo || asked.current) return;
    asked.current = true;
    const key = `${STORY_KEY}.${trip.mood}`;
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) return setWritten(JSON.parse(saved));
    } catch {
      // ignore
    }
    setWriting(true);
    const ask = (s: DemoSeason) =>
      api
        .post<{ chapters: Written[DemoSeason] }>("/api/ai/story", {
          days: CHAPTERS.map((c) => ({ n: c.n, city: c.city, place: `${c.place} (${c.motif[s]})` })),
          travelers: trip.travelers,
          occasion: `a ${trip.mood.toLowerCase()} ${s} trip, told like a storybook`,
        })
        .then((r) => [s, r.chapters] as const);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("slow")), 9000));
    Promise.race([Promise.all([ask("summer"), ask("winter")]), timeout])
      .then((pairs) => {
        const next = Object.fromEntries(pairs) as Written;
        setWritten(next);
        try {
          sessionStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore
        }
      })
      .catch(() => {})
      .finally(() => setWriting(false));
  }, [ready, isDemo, trip.travelers, trip.mood]);

  function open(e: MouseEvent, n: number) {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(`/chapter/${n}`);
    setOpening(n);
    setTimeout(() => router.push(`/chapter/${n}`), 400);
  }

  const lines = chapters.map((c) => {
    const piece = story.pieceFor(c.n);
    return { c, piece, status: story.statusFor(c.n), price: c.kind === "arcade" ? livePrice(piece) : null };
  });
  const buyable = lines.filter((l) => l.c.kind === "arcade" && l.piece?.productId);
  const total = buyable.reduce((sum, l) => sum + (l.price ? Number(l.price.amount) : 0), 0);
  const allPriced = buyable.length > 0 && buyable.every((l) => l.price);
  const currency = buyable.find((l) => l.price)?.price?.currency || "USD";
  const inkingCount = lines.filter((l) => l.status === "inking" || l.status === "waiting").length;

  async function order() {
    setOrderNote(null);
    const ids = buyable.map((l) => l.piece!.productId!);
    if (!ids.length) return setOrderNote("Your pieces are still being inked. Try again in a moment.");
    // open the tab inside the tap, so the browser doesn't block it once Arcade answers
    const tab = window.open("", "_blank");
    setOrdering(true);
    try {
      const out = await api.post<{ checkoutUrl: string }>("/api/arcade/checkout", { requestId: `chapters-${hash(ids.join("|"))}`, productIds: ids });
      if (tab) tab.location.href = out.checkoutUrl;
      else window.location.assign(out.checkoutUrl);
    } catch (e) {
      tab?.close();
      setOrderNote(e instanceof Error ? e.message : "Checkout could not be opened.");
    } finally {
      setOrdering(false);
    }
  }

  const first = shortDate(chapters[0]?.date);
  const last = shortDate(chapters[chapters.length - 1]?.date);
  const cities = [...new Set(chapters.map((c) => c.city).filter(Boolean))];
  const where = isDemo ? "New York State" : cities.slice(0, 2).join(" and ") || "Your trip";
  const particle = season === "winter" ? "flake" : season === "autumn" ? "leaf" : "petal";

  return (
    <main className="screen story">
      <div className="particles" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={`${season}-${i}`} className={particle} style={{ ["--i" as string]: i }} />
        ))}
      </div>

      <Masthead
        right={
          isDemo ? (
            <SeasonToggle />
          ) : (
            <Link href="/you" className="season-tag">
              <SeasonIcon season={season} /> {SEASON_LABEL[season]} · {trip.mood}
            </Link>
          )
        }
      />

      <div className="screen-body">
        <p className="eyebrow">
          {where}
          {first && last ? ` · ${first} to ${last}` : ""}
        </p>
        <h1 className="h-page">
          Your story, in {COUNT[chapters.length] || chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
          <InkUnderline />
        </h1>

        <div className="row between story-tools">
          <p className="small" aria-live="polite">
            {writing ? "Writing your chapters…" : !isDemo && inkingCount ? `Inking ${inkingCount} of your pieces with Arcade. Each takes a minute or two.` : `A ${trip.mood.toLowerCase()} story. One piece to open each morning.`}
          </p>
          <button type="button" className="chip chip-small" aria-pressed={trip.surprise} onClick={() => update({ surprise: !trip.surprise })}>
            Surprise me
          </button>
        </div>

        <ol className="doors">
          {lines.map(({ c, piece, price, status }) => {
            const w = isDemo && (season === "summer" || season === "winter") ? written[ds]?.find((s) => s.n === c.n) : undefined;
            const date = shortDate(c.date);
            return (
              <li key={c.n}>
                <a href={`/chapter/${c.n}`} className={`door ${opening === c.n ? "opening" : ""} ${c.n % 2 ? "" : "door-flip"}`} onClick={(e) => open(e, c.n)}>
                  <span className="door-flap" aria-hidden="true" />
                  <span className="door-text">
                    <span className="eyebrow">
                      Chapter {roman(c.n)}
                      {date ? ` · ${date}` : ""}
                    </span>
                    <span className="door-title">{w?.title || c.title[ds]}</span>
                    <span className="small door-place">
                      <PinIcon size={14} /> {c.place}
                    </span>
                    <span className="door-line">{w?.line || c.line[ds]}</span>
                    <span className="door-meta">
                      <span className={`badge ${c.kind === "arcade" ? "badge-made" : "badge-preview"}`}>{c.kind === "arcade" ? "Made with Arcade" : "Design preview"}</span>
                      <span className="price" role="status">
                        {status === "failed" ? "Needs another try"
                          : status === "inking" ? `Inking Chapter ${c.n}…`
                          : status === "waiting" ? "Next in line"
                          : c.kind !== "arcade" ? ""
                          : price ? formatMoney(price)
                          : story.packLoading || !isDemo ? "…" : "Price on request"}
                      </span>
                    </span>
                  </span>
                  <span className="door-art">
                    <PieceArt chapter={c} piece={piece} hidden={trip.surprise} tilt={c.n % 2 ? "2deg" : "-2deg"} />
                    <span className="small door-piece">{trip.surprise ? "Sealed until the day" : c.pieceLabel}</span>
                  </span>
                </a>
                {status === "failed" ? (
                  <p className="small door-retry">
                    {story.errorFor(c.n)}{" "}
                    <button type="button" className="linkish" onClick={() => story.retry(c.n)}>
                      Ink it again
                    </button>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>

        <InkDivider />

        <div className="story-foot">
          <section className="receipt" aria-label="Your order">
            <div className="row between">
              <h2>Your chapters</h2>
              <span className="hand">all packed</span>
            </div>
            <ul>
              {lines.map(({ c, piece, price, status }) => (
                <li key={c.n}>
                  <span>
                    {roman(c.n)}. {c.pieceLabel}
                  </span>
                  <span className="dots-line" aria-hidden="true" />
                  <span className="price">{c.kind === "concept" ? "Design preview" : price ? formatMoney(price) : piece?.productId ? "…" : status === "failed" ? "Not made" : "Being inked"}</span>
                </li>
              ))}
              <li className="receipt-total">
                <span>Arcade pieces</span>
                <span className="dots-line" aria-hidden="true" />
                <span className="price">{allPriced ? formatMoney({ amount: String(total), currency }) : "…"}</span>
              </li>
            </ul>
            <p className="small">
              {story.live ? "Prices come from Arcade, checked just now. " : ""}
              {story.madeThisMorning ? "These pieces were made this morning. " : ""}Checkout is hosted by Arcade. Design previews are not for sale yet.
            </p>
          </section>

          <Link href="/epilogue" className="card epilogue-teaser">
            <LampIcon size={30} />
            <span>
              <span className="eyebrow">After the trip</span>
              <strong>The Epilogue</strong>
              <span className="small">Your photos become a lampshade and a charm bracelet.</span>
            </span>
            <ArrowIcon size={20} />
          </Link>
        </div>

        {orderNote ? <p className="notice" role="status">{orderNote}</p> : null}
      </div>

      <div className="dock">
        <button className="btn" onClick={order} disabled={ordering}>
          {ordering ? "Opening Arcade checkout…" : "Order my chapters"}
        </button>
      </div>
    </main>
  );
}
