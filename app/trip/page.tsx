"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowIcon, InkDivider, InkUnderline, PinIcon } from "@/components/Ink";
import { Masthead } from "@/components/Masthead";
import { api } from "@/components/useJob";
import { useTrip, type TripDay } from "@/components/useTrip";
import { CHAPTERS, DEMO_ITINERARY, TRIP_DATES } from "@/lib/places";

const DEMO_DAYS: TripDay[] = CHAPTERS.map((c) => ({ n: c.n, date: TRIP_DATES.summer[c.n - 1], city: c.city, place: c.place }));

function TripScreen() {
  const router = useRouter();
  const demo = useSearchParams().get("demo") === "1";
  const { trip, update, ready } = useTrip();
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
    setText(demo ? DEMO_ITINERARY : trip.demo ? "" : trip.itinerary);
  }, [ready, demo, trip.demo, trip.itinerary]);

  async function read() {
    setBusy(true);
    setNote(null);
    setQuestion(null);
    try {
      const out = await api.post<{ days: TripDay[]; question: string | null }>("/api/ai/itinerary", { text, image });
      setDays(out.days);
      setQuestion(out.question);
    } catch {
      // the reader is unavailable: the New York demo still has its hand-written days
      if (demo || text.trim() === DEMO_ITINERARY.trim()) {
        setDays(DEMO_DAYS);
      } else {
        setNote("We couldn't read that just now. Try again in a moment, or open the New York story.");
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

  function confirm() {
    if (!days) return;
    const isDemo = demo || days.every((d, i) => d.place === DEMO_DAYS[i]?.place);
    update({ demo: isDemo, itinerary: text, days, story: [] });
    router.push("/you");
  }

  return (
    <main className="screen">
      <Masthead back="/" backLabel="Welcome" />
      <div className="screen-body">
        <p className="eyebrow">Your trip</p>
        <h1 className="h-page">
          Where are you going?
          <InkUnderline />
        </h1>
        <p className="lede" style={{ marginTop: 14 }}>
          Paste your itinerary as it is. A booking email, your notes, anything with days and places.
        </p>

        <label className="field" style={{ marginTop: 22 }}>
          <span className="eyebrow">Itinerary</span>
          <textarea value={text} onChange={(e) => { setText(e.target.value); setDays(null); }} placeholder={"Day 1 – Lisbon: Alfama and the river\nDay 2 – Sintra…"} />
        </label>

        <div className="row" style={{ marginTop: 6 }}>
          <label className="linkish file-link">
            {image ? "Screenshot added. Change it" : "Or add a screenshot"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); setDays(null); }} />
          </label>
        </div>

        {note ? <p className="notice" role="status">{note}</p> : null}

        {days ? (
          <section aria-live="polite">
            <InkDivider />
            <div className="row between">
              <h2>Here&rsquo;s what we read</h2>
              <span className="hand">look right?</span>
            </div>
            <ol className="days">
              {days.map((d) => (
                <li key={d.n}>
                  <span className="eyebrow">Day {d.n}</span>
                  <span>
                    <strong>{d.place || "Somewhere in " + (d.city || "your trip")}</strong>
                    <span className="small"> <PinIcon size={14} /> {d.city || "city to confirm"}</span>
                  </span>
                </li>
              ))}
            </ol>
            {question ? <p className="notice">{question}</p> : null}
          </section>
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
