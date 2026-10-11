import pack from "@/data/demo-pack.json";
import type { DemoPack } from "@/lib/pack";

const SHOWN = [
  { key: "c1-summer", label: "The High Line", tilt: "-2deg" },
  { key: "c3-summer", label: "Central Park", tilt: "1.5deg" },
  { key: "c5-summer", label: "Niagara Falls", tilt: "-1deg" },
];

export function WelcomeSwatches() {
  const pieces = (pack as unknown as DemoPack).pieces;
  return (
    <div className="welcome-swatches">
      {SHOWN.map((s, i) => {
        const src = pieces[s.key]?.patternImage;
        return (
          <figure key={s.key} style={{ ["--tilt" as string]: s.tilt }} className={`welcome-swatch w${i + 1}`}>
            <span className={`swatch ${src ? "" : "swatch-empty"}`}>
              {src ? <img src={src} alt={`Pattern drawn for ${s.label}`} /> : null}
            </span>
            <figcaption className="eyebrow">{s.label}</figcaption>
          </figure>
        );
      })}
      <span className="hand welcome-note">made for where you&rsquo;ll stand</span>
    </div>
  );
}
