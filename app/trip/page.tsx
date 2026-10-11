"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowIcon, InkDivider, InkUnderline } from "@/components/Ink";
import { Masthead } from "@/components/Masthead";
import { seasonFor, SeasonPicker, useSeason } from "@/components/Season";
import { api } from "@/components/useJob";
import { newTripId, useTrip, type TripDay } from "@/components/useTrip";
import { CHAPTERS, DEMO_ITINERARY, TRIP_DATES } from "@/lib/places";

const DEMO_DAYS: TripDay[] = CHAPTERS.map((c) => ({ n: c.n, date: TRIP_DATES.summer[c.n - 1], city: c.city, place: c.place }));

/** Plain reading, used when the itinerary reader can't be reached. Any text is accepted; you can fix what it gets wrong. */
function readLines(text: string): TripDay[] {
  const marker = /^(day\s*\d+|\d{1,2}[./-]\d{1,2}|\d{4}-\d{2}-\d{2}|[-*•]\s)/i;
  let lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const marked = lines.filter((l) => marker.test(l));
  if (marked.length) lines = marked;
  // one long sentence: each stop becomes a day
  else if (lines.length === 1) lines = lines[0].split(/\s*(?:;|,| then | and then |\. )\s*/i).filter((l) => l.trim().length > 2);
  else if (lines.length > 2 && !/\d/.test(lines[0]) && lines[0].length < 40) lines = lines.slice(1); // a heading line

  return lines.slice(0, 7).map((line, i) => {
    const date = /(\d{4}-\d{2}-\d{2})/.exec(line)?.[1] || null;
    const rest = line.replace(/^(day\s*\d+|[-*•])\s*[-–—:.)]*\s*/i, "").replace(/\d{4}-\d{2}-\d{2}\s*[-–—:]*\s*/, "");
    const [head, ...tail] = rest.split(/\s*[:–—]\s+|\s+-\s+/);
    const place = (tail.join(" ") || head).trim().replace(/\.$/, "");
    return { n: i + 1, date, city: tail.length ? head.trim() : null, place };
  }).filter((d) => d.place);
}

function TripScreen() {
  const router = useRouter();
  const example = useSearchParams().get("demo") === "1";
  const { trip, update, ready } = useTrip();
  const { setSeason } = useSeason();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [days, setDays] = useState<TripDay[] | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!ready || seeded.current) return;
    seeded.current = true;
    if (example) return setText(DEMO_ITINERARY);
    setText(trip.demo ? "" : trip.itinerary);
    if (!trip.demo && trip.days.length) setDays(trip.days);
  }, [ready, example, trip.demo, trip.itinerary, trip.days]);

  function accept(next: TripDay[]) {
    setDays(next);
    const firstDate = next.find((d) => d.date)?.date;
    if (firstDate) setSeason(seasonFor(firstDate));
  }

  async function read() {
    setBusy(true);
    setNote(null);
    setQuestion(null);
    try {
      const out = await api.post<{ days: TripDay[]; question: string | null }>("/api/ai/itinerary", { text, image });
      accept(out.days);
      setQuestion(out.question);
    } catch {
      const plain = example && text.trim() === DEMO_ITINERARY.trim() ? DEMO_DAYS : readLines(text);
      if (plain.length) {
        accept(plain);
        setNote("Read line by line. Fix anything that looks off below.");
      } else {
        accept([{ n: 1, date: null, city: "", place: "" }]);
        setNote("We couldn't find the days in that. Add them below, one place per day.");
      }
    } finally {
      setBusy(false);
    }
  }

  function onFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  const edit = (i: number, patch: Partial<TripDay>) => setDays((d) => d && d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setDays((d) => d && d.filter((_, j) => j !== i).map((x, j) => ({ ...x, n: j + 1 })));
  const add = () => setDays((d) => [...(d || []), { n: (d?.length || 0) + 1, date: null, city: d?.[d.length - 1]?.city || "", place: "" }].slice(0, 7));

  function confirm() {
    const kept = (days || []).filter((d) => d.place?.trim() || d.city?.trim()).map((d, i) => ({ ...d, n: i + 1 }));
    if (!kept.length) return setNote("Add at least one day with a place.");
    // the pre-made New York story is used only when its itinerary is left exactly as it was
    const isExample = example && kept.length === DEMO_DAYS.length && kept.every((d, i) => d.place === DEMO_DAYS[i].place);
    update({ demo: isExample, id: newTripId(), itinerary: text, days: kept, chapters: [], art: {} });
    router.push("/you");
  }

  return (
    <main className="screen">
      <Masthead back="/" backLabel="Welcome" />
      <div className="screen-body narrow">
        <p className="eyebrow">Your trip</p>
        <h1 className="h-page">
          Where are you going?
          <InkUnderline />
        </h1>
        <p className="lede" style={{ marginTop: 14 }}>
          Paste your itinerary as it is. A booking email, your notes, anything with days and places. Or skip it and add your days by hand.
        </p>

        <label className="field" style={{ marginTop: 22 }}>
          <span className="eyebrow">Itinerary</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"Day 1 – Lisbon: Alfama and the river\nDay 2 – Sintra: the palace gardens\nDay 3 – Cascais: the sea wall at sunset"} />
        </label>

        <div className="row between" style={{ marginTop: 6 }}>
          <label className="linkish file-link">
            {image ? "Screenshot added. Change it" : "Or add a screenshot"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {!days ? (
            <button type="button" className="linkish" onClick={add}>
              Add days by hand
            </button>
          ) : null}
        </div>

        {days ? (
          <section aria-live="polite">
            <InkDivider />
            <div className="row between">
              <h2>Your days</h2>
              <span className="hand">look right?</span>
            </div>
            {note ? <p className="notice" role="status">{note}</p> : null}
            {question ? <p className="notice">{question}</p> : null}
            <ol className="day-rows">
              {days.map((d, i) => (
                <li key={i}>
                  <span className="eyebrow">Day {i + 1}</span>
                  <input type="text" aria-label={`Day ${i + 1} place`} value={d.place || ""} onChange={(e) => edit(i, { place: e.target.value })} placeholder="Place or what you'll do" />
                  <input type="text" aria-label={`Day ${i + 1} city`} value={d.city || ""} onChange={(e) => edit(i, { city: e.target.value })} placeholder="City" />
                  <input type="date" aria-label={`Day ${i + 1} date`} value={d.date || ""} onChange={(e) => edit(i, { date: e.target.value || null })} />
                  <button type="button" className="linkish" onClick={() => remove(i)} aria-label={`Remove day ${i + 1}`}>
                    remove
                  </button>
                </li>
              ))}
            </ol>
            {days.length < 7 ? (
              <button type="button" className="btn btn-quiet" onClick={add}>
                Add a day
              </button>
            ) : (
              <p className="small">Seven chapters is the most one story holds.</p>
            )}

            <div className="form-block">
              <h3>What season will it be?</h3>
              <SeasonPicker />
              <p className="small" style={{ marginTop: 8 }}>The colors of every piece, and of this journal, follow the season.</p>
            </div>
          </section>
        ) : note ? (
          <p className="notice" role="status">{note}</p>
        ) : null}
      </div>

      <div className="dock">
        {days ? (
          <button className="btn" onClick={confirm}>
            Yes, that&rsquo;s my trip <ArrowIcon size={20} />
          </button>
        ) : (
          <button className="btn" onClick={read} disabled={busy || (!text.trim() && !image)}>
            {busy ? "Reading your itinerary…" : "Read my itinerary"}
          </button>
        )}
      </div>
    </main>
  );
}

export default function TripPage() {
  return (
    <Suspense>
      <TripScreen />
    </Suspense>
  );
}
