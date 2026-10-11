"use client";

import { useEffect, useState } from "react";
import { InkDivider, InkUnderline } from "@/components/Ink";
import { Masthead } from "@/components/Masthead";
import { useSeason } from "@/components/Season";
import { api, useJob } from "@/components/useJob";
import { livePrice, patternImage, productImage, usePack } from "@/components/usePack";
import { formatMoney, type Money } from "@/lib/pack";
import { mergeColors } from "@/lib/palettes";
import { CHAPTERS, CHARMS, TRAVELERS, type Charm } from "@/lib/places";
import { ARCADE_PROMPTS, LAMPSHADE_MOTIFS } from "@/lib/prompts";

type Photo = { name: string; dataUrl: string; blob: Blob };
type FreshLamp = { patternUrl?: string; productId?: string; imageUrl?: string; price?: Money | null };

const WRITTEN_KEY = "storybound.epilogue.written";

/** Shrink a photo in the browser so uploads stay small and quick. */
async function shrink(file: File, max = 1280): Promise<Photo> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read that photo"))), "image/jpeg", 0.85));
  return { name: file.name, dataUrl: canvas.toDataURL("image/jpeg", 0.85), blob };
}

// points along the bracelet's curve (a cubic Bezier), so charms hang from the chain
const P = [{ x: 14, y: 30 }, { x: 110, y: 112 }, { x: 250, y: 112 }, { x: 346, y: 30 }];
function onChain(t: number) {
  const u = 1 - t;
  const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return { x: P.reduce((s, p, i) => s + p.x * b[i], 0), y: P.reduce((s, p, i) => s + p.y * b[i], 0) };
}

export default function EpiloguePage() {
  const { season } = useSeason();
  const pack = usePack();
  const lampJob = useJob();
  const productJob = useJob();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [consent, setConsent] = useState(false);
  const [achievements, setAchievements] = useState<string[]>(CHARMS.map((c) => c.label));
  const [draft, setDraft] = useState("");
  const [written, setWritten] = useState(false);
  const [curating, setCurating] = useState(false);
  const [charms, setCharms] = useState<Charm[]>(CHARMS);
  const [active, setActive] = useState<string | null>(null);
  const [fresh, setFresh] = useState<FreshLamp | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(WRITTEN_KEY)) setWritten(true);
    } catch {
      // ignore
    }
  }, []);

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    try {
      const added = await Promise.all([...files].slice(0, 6 - photos.length).map((f) => shrink(f)));
      setPhotos((p) => [...p, ...added].slice(0, 6));
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not read that photo");
    }
  }

  async function write() {
    setNote(null);
    setCurating(true);
    let best = photos.slice(0, 3);
    try {
      const out = await api.post<{ charms: { label: string; symbol: string }[]; bestPhotos: number[] }>("/api/ai/epilogue", {
        chapters: CHAPTERS.map((c) => `${c.place}: ${c.motif[season]}`),
        steps: "12 miles",
        achievements,
        photos: photos.map((p) => p.dataUrl),
      });
      // keep Arcade-designed art where the label matches a charm we have art for
      setCharms(out.charms.map((c, i) => CHARMS.find((k) => k.label.toLowerCase() === c.label.toLowerCase()) || { key: `new-${i}`, label: c.label, symbol: c.symbol }));
      if (out.bestPhotos.length) best = out.bestPhotos.map((i) => photos[i]).filter(Boolean);
    } catch {
      setCharms(achievements.map((label, i) => CHARMS.find((k) => k.label === label) || { key: `new-${i}`, label, symbol: label }));
    } finally {
      setCurating(false);
      setWritten(true);
      try {
        sessionStorage.setItem(WRITTEN_KEY, "1");
      } catch {
        // ignore
      }
    }
    if (best.length && consent) void lampFromPhotos(best);
  }

  // upload up to 3 photos as references -> pattern -> lampshade product, each as a polled Arcade job
  async function lampFromPhotos(best: Photo[]) {
    const run = Date.now().toString(36);
    try {
      setStep("Sending your photos to Arcade…");
      const referenceIds: string[] = [];
      for (const [i, p] of best.entries()) {
        const form = new FormData();
        form.set("file", new File([p.blob], `photo-${i}.jpg`, { type: "image/jpeg" }));
        form.set("requestId", `epilogue-${run}-photo${i}`);
        const res = await fetch("/api/arcade/upload", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "A photo could not be uploaded");
        referenceIds.push(json.referenceId);
      }
      setStep("Painting your trip around the shade…");
      const made = await lampJob.start("/api/arcade/generate", {
        requestId: `epilogue-${run}-pattern`,
        prompt: ARCADE_PROMPTS.lampshade(LAMPSHADE_MOTIFS[season]),
        colors: mergeColors(season),
        referenceIds,
      });
      if (made.status !== "succeeded" || !made.patternId) throw new Error(made.error || "The scene could not be painted");
      const pattern = await api.post<{ imageUrl: string }>("/api/arcade/pattern", { patternId: made.patternId });
      setFresh({ patternUrl: pattern.imageUrl });

      setStep("Arcade is making the lampshade…");
      let built = await productJob.start("/api/arcade/product", { requestId: `epilogue-${run}-product`, patternId: made.patternId, category: "Drum Lampshades" });
      if (built.status === "failed" && /fit|aspect|crop/i.test(built.error || "")) {
        built = await productJob.start("/api/arcade/product", { requestId: `epilogue-${run}-product-fill`, patternId: made.patternId, category: "Drum Lampshades", fit: { mode: "fill" } });
      }
      if (built.status !== "succeeded" || !built.productId) throw new Error(built.error || "The lampshade could not be made");
      const product = await api.post<{ imageUrl: string; unitPrice: Money | null }>("/api/arcade/product", { productId: built.productId });
      setFresh({ patternUrl: pattern.imageUrl, productId: built.productId, imageUrl: product.imageUrl, price: product.unitPrice });
      setStep(null);
    } catch (e) {
      setStep(null);
      setNote(`${e instanceof Error ? e.message : "Something went wrong"} The lampshade from this morning is shown instead.`);
    }
  }

  const lamp = pack.pieces["lamp"];
  const lampProductId = fresh?.productId || lamp?.productId;
  const lampImage = fresh?.imageUrl || productImage(lamp);
  const lampPattern = fresh?.patternUrl || patternImage(lamp);
  const lampPrice = fresh?.productId ? fresh.price : livePrice(lamp);

  async function order() {
    setNote(null);
    if (!lampProductId) return setNote("Your lampshade is still being made.");
    const tab = window.open("", "_blank");
    setOrdering(true);
    try {
      const out = await api.post<{ checkoutUrl: string }>("/api/arcade/checkout", { requestId: `epilogue-checkout-${lampProductId}`.slice(0, 120), productIds: [lampProductId] });
      if (tab) tab.location.href = out.checkoutUrl;
      else window.location.assign(out.checkoutUrl);
    } catch (e) {
      tab?.close();
      setNote(e instanceof Error ? e.message : "Checkout could not be opened.");
    } finally {
      setOrdering(false);
    }
  }

  const slots = charms.slice(0, 6);
  const activeCharm = slots.find((c) => c.key === active);

  return (
    <main className="screen epilogue">
      <Masthead back="/story" backLabel="Your story" />

      <div className="screen-body">
        <p className="eyebrow">Epilogue · home again</p>
        <h1 className="h-page">
          {written ? "What the trip left behind" : "Now, the part you keep"}
          <InkUnderline />
        </h1>

        {!written ? (
          <>
            <p className="lede" style={{ marginTop: 14 }}>
              Add a few favorite photos and check the list of what you did. We&rsquo;ll turn them into a lampshade and a charm bracelet.
            </p>

            <section className="form-block">
              <h3>Your photos</h3>
              <div className="photo-row">
                {photos.map((p, i) => (
                  <span key={i} className="swatch photo" style={{ ["--tilt" as string]: `${i % 2 ? 2 : -2}deg` }}>
                    <img src={p.dataUrl} alt={`Trip photo ${i + 1}`} />
                  </span>
                ))}
                {photos.length < 6 ? (
                  <label className="swatch swatch-empty photo photo-add">
                    <span>Add</span>
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
                  </label>
                ) : null}
              </div>
              {photos.length ? (
                <label className="check">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>Everyone in these photos is happy for them to be used to design my lampshade.</span>
                </label>
              ) : (
                <p className="small">No photos handy? You can still see the Epilogue we made this morning.</p>
              )}
            </section>

            <section className="form-block">
              <h3>What you did</h3>
              <ul className="achievements">
                {achievements.map((a) => (
                  <li key={a}>
                    <span>{a}</span>
                    <button type="button" className="linkish" aria-label={`Remove ${a}`} onClick={() => setAchievements((list) => list.filter((x) => x !== a))}>
                      remove
                    </button>
                  </li>
                ))}
              </ul>
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = draft.trim();
                  if (v && !achievements.includes(v)) setAchievements((list) => [...list, v].slice(0, 6));
                  setDraft("");
                }}
              >
                <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Saw the falls at night" aria-label="Add something you did" />
                <button className="chip" type="submit">Add</button>
              </form>
            </section>
          </>
        ) : (
          <>
            <section className="lamp-stage" aria-label="Your lampshade">
              <span className="lamp-glow" aria-hidden="true" />
              {lampImage ? (
                <img className="lamp-photo" src={lampImage} alt="Drum lampshade printed with a painted panorama of the trip" />
              ) : (
                <span className="lamp-shape" role="img" aria-label="Lampshade wrapped in a painted panorama of the trip">
                  <span className={`lamp-shade ${lampPattern ? "" : "swatch-empty"}`} style={lampPattern ? { backgroundImage: `url("${lampPattern}")` } : undefined} />
                  <span className="lamp-stem" />
                  <span className="lamp-foot" />
                </span>
              )}
            </section>
            <div className="lamp-meta">
              <span className={`badge ${lampProductId ? "badge-made" : "badge-preview"}`}>{lampProductId ? "Made with Arcade" : "Design preview"}</span>
              <span className="small">{fresh?.productId ? "Made from your photos just now" : fresh?.patternUrl ? "Painted from your photos just now" : "Made this morning"}</span>
              <span className="price">{formatMoney(lampPrice) || (pack.loading && lampProductId ? "…" : "")}</span>
            </div>
            {step ? <p className="notice" role="status">{step} This takes a few minutes.</p> : null}
            <p className="why">Switch it on and the whole trip glows: rails, bridge, elms, lake and falls, in one unbroken line.</p>

            <InkDivider />

            <section aria-label="Your charm bracelet">
              <div className="row between">
                <h2>And a charm for each thing you did</h2>
              </div>
              <svg className="bracelet" viewBox="0 0 360 190" role="group" aria-label="Charm bracelet">
                <defs>
                  <clipPath id="charm-clip">
                    <circle r="21" />
                  </clipPath>
                </defs>
                <path className="ink chain" d={`M${P[0].x} ${P[0].y} C ${P[1].x} ${P[1].y}, ${P[2].x} ${P[2].y}, ${P[3].x} ${P[3].y}`} />
                {TRAVELERS.map((t, i) => {
                  const at = onChain(0.06 + i * 0.05);
                  return (
                    <circle key={t.name} cx={at.x} cy={at.y} r="5.500" fill={t.color} stroke="var(--ink)" strokeWidth="1.200">
                      <title>{t.name}</title>
                    </circle>
                  );
                })}
                {slots.map((c, i) => {
                  const at = onChain(0.26 + (i * 0.66) / Math.max(1, slots.length - 1));
                  const art = patternImage(pack.pieces[c.key]);
                  const drop = 34 + (i % 2) * 10;
                  return (
                    <g key={c.key} className={`charm ${active === c.key ? "active" : ""}`} role="button" tabIndex={0} aria-label={c.label} aria-pressed={active === c.key} onClick={() => setActive(active === c.key ? null : c.key)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActive(c.key)}>
                      <path className="ink" d={`M${at.x} ${at.y} v${drop - 21}`} />
                      <g transform={`translate(${at.x} ${at.y + drop})`}>
                        <circle r="22" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.500" />
                        {art ? <image href={art} x="-21" y="-21" width="42" height="42" preserveAspectRatio="xMidYMid slice" clipPath="url(#charm-clip)" /> : <text textAnchor="middle" dy="5" className="charm-initial">{c.label.slice(0, 1)}</text>}
                      </g>
                    </g>
                  );
                })}
              </svg>
              <p className="charm-label" aria-live="polite">
                {activeCharm ? <strong>{activeCharm.label}</strong> : "Tap a charm to read it."}
              </p>
              <p className="small">
                <span className="badge badge-preview">Design preview</span> Charm art designed with Arcade. The three beads are {TRAVELERS.map((t) => t.name).join(", ")}.
              </p>
            </section>
          </>
        )}

        {note ? <p className="notice" role="status">{note}</p> : null}
      </div>

      <div className="dock">
        {written ? (
          <button className="btn" onClick={order} disabled={ordering || !lampProductId}>
            {ordering ? "Opening Arcade checkout…" : lampProductId ? "Order my lampshade" : "Waiting for the lampshade…"}
          </button>
        ) : (
          <button className="btn" onClick={write} disabled={curating}>
            {curating ? "Writing your epilogue…" : "Write my epilogue"}
          </button>
        )}
      </div>
    </main>
  );
}
