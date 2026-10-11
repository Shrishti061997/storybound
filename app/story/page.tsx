"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowIcon, InkDivider, InkUnderline, LampIcon, PinIcon } from "@/components/Ink";
import { Masthead } from "@/components/Masthead";
import { PieceArt } from "@/components/PieceArt";
import { SeasonToggle, useSeason, type Season } from "@/components/Season";
import { api } from "@/components/useJob";
import { livePrice, usePack } from "@/components/usePack";
import { useTrip } from "@/components/useTrip";
import { formatMoney } from "@/lib/pack";
import { CHAPTERS, roman, TRIP_DATES } from "@/lib/places";

type Story = Record<Season, { n: number; title: string; line: string }[]>;
const STORY_KEY = "storybound.story.v1";

const shortDate = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export default function StoryPage() {
  const router = useRouter();
  const { season } = useSeason();
  const { trip, update, ready } = useTrip();
  const pack = usePack();
  const [story, setStory] = useState<Partial<Story>>({});
  const [writing, setWriting] = useState(false);
  const [opening, setOpening] = useState<number | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [orderNote, setOrderNote] = useState<string | null>(null);
  const asked = useRef(false);

  // The story writer drafts titles for both seasons once; the hand-written story stands in if it can't.
  useEffect(() => {
    if (!ready || asked.current) return;
    asked.current = true;
    try {
      const saved = sessionStorage.getItem(STORY_KEY);
      if (saved) return setStory(JSON.parse(saved));
    } catch {
      // ignore
    }
    setWriting(true);
    const ask = (s: Season) =>
      api
        .post<{ chapters: Story[Season] }>("/api/ai/story", {
          days: CHAPTERS.map((c) => ({ n: c.n, city: c.city, place: `${c.place} (${c.motif[s]})` })),
          travelers: trip.travelers,
          occasion: `a ${s} trip with people you love, told like a storybook`,
        })
        .then((r) => [s, r.chapters] as const);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("slow")), 9000));
    Promise.race([Promise.all([ask("summer"), ask("winter")]), timeout])
      .then((pairs) => {
        const next = Object.fromEntries(pairs) as Story;
        setStory(next);
        try {
          sessionStorage.setItem(STORY_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      })
      .catch(() => {})
      .finally(() => setWriting(false));
  }, [ready, trip.travelers]);

  function open(e: MouseEvent, n: number) {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(`/chapter/${n}`);
    setOpening(n);
    setTimeout(() => router.push(`/chapter/${n}`), 400);
  }

  const lines = CHAPTERS.map((c) => {
    const piece = pack.pieces[`c${c.n}-${season}`];
    return { c, piece, price: c.kind === "arcade" ? livePrice(piece) : null };
  });
  const buyable = lines.filter((l) => l.c.kind === "arcade" && l.piece?.productId);
  const total = buyable.reduce((sum, l) => sum + (l.price ? Number(l.price.amount) : 0), 0);
  const allPriced = buyable.length > 0 && buyable.every((l) => l.price);
  const currency = buyable.find((l) => l.price)?.price?.currency || "USD";

  async function order() {
    setOrderNote(null);
    const ids = buyable.map((l) => l.piece!.productId!);
    if (!ids.length) return setOrderNote("Your pieces are still being inked. Try again in a moment.");
    // open the tab inside the tap, so the browser doesn't block it once Arcade answers
    const tab = window.open("", "_blank");
    setOrdering(true);
    try {
      const out = await api.post<{ checkoutUrl: string }>("/api/arcade/checkout", { requestId: `ny-${season}-chapters-${hash(ids.join("|"))}`, productIds: ids });
      if (tab) tab.location.href = out.checkoutUrl;
      else window.location.assign(out.checkoutUrl);
    } catch (e) {
      tab?.close();
      setOrderNote(e instanceof Error ? e.message : "Checkout could not be opened.");
    } finally {
      setOrdering(false);
    }
  }

  const dates = TRIP_DATES[season];

  return (
    <main className="screen story">
      <div className="particles" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={`${season}-${i}`} className={season === "winter" ? "flake" : "petal"} style={{ ["--i" as string]: i }} />
        ))}
      </div>

      <Masthead right={<SeasonToggle />} />

      <div className="screen-body">
        <p className="eyebrow">
          New York State · {shortDate(dates[0])} to {shortDate(dates[4])}
        </p>
        <h1 className="h-page">
          Your story, in five chapters
          <InkUnderline />
        </h1>

        <div className="row between story-tools">
          <p className="small" aria-live="polite">{writing ? "Writing your chapters…" : "One piece to open each morning."}</p>
          <button type="button" className="chip chip-small" aria-pressed={trip.surprise} onClick={() => update({ surprise: !trip.surprise })}>
            Surprise me
          </button>
        </div>

        <ol className="doors">
          {lines.map(({ c, piece, price }) => {
            const written = story[season]?.find((s) => s.n === c.n);
            return (
              <li key={c.n}>
                <a href={`/chapter/${c.n}`} className={`door ${opening === c.n ? "opening" : ""} ${c.n % 2 ? "" : "door-flip"}`} onClick={(e) => open(e, c.n)}>
                  <span className="door-flap" aria-hidden="true" />
                  <span className="door-text">
                    <span className="eyebrow">
                      Chapter {roman(c.n)} · {shortDate(dates[c.n - 1])}
                    </span>
                    <span className="door-title">{written?.title || c.title[season]}</span>
                    <span className="small door-place">
                      <PinIcon size={14} /> {c.place}
                    </span>
                    <span className="door-line">{written?.line || c.line[season]}</span>
                    <span className="door-meta">
                      <span className={`badge ${c.kind === "arcade" ? "badge-made" : "badge-preview"}`}>{c.kind === "arcade" ? "Made with Arcade" : "Design preview"}</span>
                      {c.kind === "arcade" ? (
                        <span className="price">{price ? formatMoney(price) : !piece?.productId ? "Being inked" : pack.loading ? "…" : "Price on request"}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="door-art">
                    <PieceArt chapter={c} piece={piece} hidden={trip.surprise} tilt={c.n % 2 ? "2deg" : "-2deg"} />
                    <span className="small door-piece">{trip.surprise ? "Sealed until the day" : c.pieceLabel}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>

        <InkDivider />

        <section className="receipt" aria-label="Your order">
          <div className="row between">
            <h2>Your chapters</h2>
            <span className="hand">all five, packed</span>
          </div>
          <ul>
            {lines.map(({ c, piece, price }) => (
              <li key={c.n}>
                <span>
                  {roman(c.n)}. {c.pieceLabel}
                </span>
                <span className="dots-line" aria-hidden="true" />
                <span className="price">{c.kind === "concept" ? "Design preview" : price ? formatMoney(price) : piece?.productId ? "…" : "Being inked"}</span>
              </li>
            ))}
            <li className="receipt-total">
              <span>Arcade pieces</span>
              <span className="dots-line" aria-hidden="true" />
              <span className="price">{allPriced ? formatMoney({ amount: String(total), currency }) : "…"}</span>
            </li>
          </ul>
          <p className="small">
            {pack.live ? "Prices checked with Arcade just now. " : ""}
            {pack.generatedAt ? "These pieces were made this morning. " : ""}Checkout is hosted by Arcade. Design previews are not for sale yet.
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
