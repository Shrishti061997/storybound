"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowIcon, InkDivider, InkUnderline } from "@/components/Ink";
import { Masthead } from "@/components/Masthead";
import { SEASON_LABEL, SeasonPicker, useSeason } from "@/components/Season";
import { api } from "@/components/useJob";
import { useTrip } from "@/components/useTrip";
import type { Chapter } from "@/lib/places";
import { MOODS, STYLES } from "@/lib/prompts";

const LOVES = ["Greens", "Wildflowers", "Water", "Old stone", "Snow", "Gold light", "Night lights", "Markets"];

type Option = { key: string; label: string; values: { value: string; label: string; available: boolean }[] };
type CategoriesResponse = { categories: { name: string; options?: Option[] }[] };

export default function YouPage() {
  const router = useRouter();
  const { trip, update } = useTrip();
  const { season } = useSeason();
  const [metals, setMetals] = useState<{ label: string; available: boolean }[]>([]);
  const [fabrics, setFabrics] = useState<string[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchNote, setMatchNote] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // metal and fabric choices come from Arcade, never from a hardcoded list
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res: CategoriesResponse) => {
        const pendant = res.categories.find((c) => c.name === "Pendant Necklace");
        const scarf = res.categories.find((c) => c.name === "Scarves");
        const metalOpt = pendant?.options?.find((o) => /metal|material|finish/i.test(o.key + o.label));
        const fabricOpt = scarf?.options?.find((o) => /fabric|material/i.test(o.key + o.label));
        setMetals(metalOpt?.values.map((v) => ({ label: v.label, available: v.available })) || []);
        setFabrics(fabricOpt?.values.filter((v) => v.available).map((v) => v.label) || []);
      })
      .catch(() => {});
  }, []);

  const loves = trip.loves ? trip.loves.split(", ") : [];
  const toggleLove = (l: string) => update({ loves: (loves.includes(l) ? loves.filter((x) => x !== l) : [...loves, l]).join(", ") });

  function onOutfit(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setMatching(true);
      setMatchNote(null);
      try {
        const out = await api.post<{ colors: string[] }>("/api/ai/outfit", { image: String(reader.result) });
        update({ outfitColors: out.colors });
      } catch {
        setMatchNote("We couldn't read the colors just now. Your season palette will be used.");
      } finally {
        setMatching(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function write() {
    setNote(null);
    if (trip.demo) return router.push("/story");
    if (!trip.days.length) return router.push("/trip");
    setWriting(true);
    try {
      const out = await api.post<{ chapters: Chapter[] }>("/api/plan", {
        days: trip.days,
        season,
        mood: trip.mood,
        style: trip.style,
        metal: trip.metal,
        loves: trip.loves,
        dislikes: trip.dislikes,
        travelers: trip.travelers,
      });
      // new chapters mean new pieces: clear any earlier Arcade jobs for this trip
      update({ chapters: out.chapters, art: {} });
      router.push("/story");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Your chapters could not be written just now. Try again in a moment.");
    } finally {
      setWriting(false);
    }
  }

  return (
    <main className="screen">
      <Masthead back="/trip" backLabel="Your trip" />
      <div className="screen-body narrow">
        <p className="eyebrow">About you</p>
        <h1 className="h-page">
          What do you reach for?
          <InkUnderline />
        </h1>

        <section className="form-block">
          <div className="row between">
            <h3>The mood of this trip</h3>
            <span className="hand">sets the tone</span>
          </div>
          <div className="chips">
            {MOODS.map((m) => (
              <button key={m} type="button" className="chip" aria-pressed={trip.mood === m} onClick={() => update({ mood: m })}>
                {m}
              </button>
            ))}
          </div>
        </section>

        <section className="form-block">
          <h3>Season</h3>
          <SeasonPicker />
        </section>

        <section className="form-block">
          <h3>Style</h3>
          <div className="chips">
            {STYLES.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={trip.style === s} onClick={() => update({ style: s })}>
                {s}
              </button>
            ))}
          </div>
        </section>

        <section className="form-block">
          <div className="row between">
            <h3>Metal</h3>
            {metals.length ? <span className="small">from Arcade</span> : null}
          </div>
          {metals.length ? (
            <div className="chips">
              {metals.map((m) => (
                <button key={m.label} type="button" className="chip" disabled={!m.available} aria-pressed={trip.metal === m.label} onClick={() => update({ metal: m.label })}>
                  {m.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="small">Metal choices appear here once Arcade answers.</p>
          )}
          {fabrics.length ? <p className="small" style={{ marginTop: 10 }}>Scarf fabric options from Arcade: {fabrics.join(", ")}.</p> : null}
        </section>

        <section className="form-block">
          <h3>You love</h3>
          <div className="chips">
            {LOVES.map((l) => (
              <button key={l} type="button" className="chip" aria-pressed={loves.includes(l)} onClick={() => toggleLove(l)}>
                {l}
              </button>
            ))}
          </div>
          <label className="field" style={{ marginTop: 14 }}>
            <span className="small">Anything you&rsquo;d never wear?</span>
            <input type="text" value={trip.dislikes} onChange={(e) => update({ dislikes: e.target.value })} placeholder="Neon, big logos…" />
          </label>
        </section>

        <section className="form-block">
          <h3>Who&rsquo;s coming</h3>
          <label className="field">
            <span className="sr-only">Who is coming</span>
            <input type="text" value={trip.travelers} onChange={(e) => update({ travelers: e.target.value })} placeholder="Me, my sister Maya, and Dad" />
          </label>
        </section>

        <InkDivider />

        <section className="outfit">
          <div>
            <h3>Match an outfit</h3>
            <p className="small">Optional. Add a photo of something you&rsquo;ll pack and we&rsquo;ll pull three colors from it.</p>
            <label className="linkish file-link">
              {matching ? "Reading the colors…" : trip.outfitColors.length ? "Try another photo" : "Add an outfit photo"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onOutfit(e.target.files?.[0])} />
            </label>
            {matchNote ? <p className="small">{matchNote}</p> : null}
          </div>
          {trip.outfitColors.length ? (
            <div className="dots" aria-label={`Colors from your outfit: ${trip.outfitColors.join(", ")}`}>
              {trip.outfitColors.map((c) => (
                <span key={c} style={{ background: c }} />
              ))}
            </div>
          ) : null}
        </section>

        {note ? <p className="notice" role="status">{note}</p> : null}
      </div>

      <div className="dock">
        <button className="btn" onClick={write} disabled={writing}>
          {writing ? "Writing your chapters…" : (
            <>
              Write my {trip.mood.toLowerCase()} {SEASON_LABEL[season].toLowerCase()} story <ArrowIcon size={20} />
            </>
          )}
        </button>
      </div>
    </main>
  );
}
