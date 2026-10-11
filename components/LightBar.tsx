import { formatTime, type SunDay } from "@/lib/sun";

/** A timeline of the day: sunrise, both golden hours, sunset, and the best window for the photo. */
export function LightBar({ sun, timeZone }: { sun: SunDay; timeZone: string }) {
  const start = sun.dawn.getTime();
  const span = sun.dusk.getTime() - start;
  const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - start) / span) * 100));
  const seg = (a: Date, b: Date) => ({ left: `${pct(a)}%`, width: `${Math.max(1.5, pct(b) - pct(a))}%` });
  const f = (d: Date) => formatTime(d, timeZone);
  const bestMid = (pct(sun.window.start) + pct(sun.window.end)) / 2;

  return (
    <div
      className="lightbar"
      role="img"
      aria-label={`Sunrise ${f(sun.sunrise)}, sun highest ${f(sun.solarNoon)}, golden hour from ${f(sun.goldenHour)}, sunset ${f(sun.sunset)}. Best light ${f(sun.window.start)} to ${f(sun.window.end)}.`}
    >
      <div className="lightbar-best-label" style={{ left: `${Math.min(74, Math.max(26, bestMid))}%` }}>
        <strong>{sun.window.label}</strong> {f(sun.window.start)} to {f(sun.window.end)}
      </div>
      <div className="lightbar-track">
        <span className="lightbar-golden" style={seg(sun.sunrise, sun.goldenHourEnd)} />
        <span className="lightbar-golden" style={seg(sun.goldenHour, sun.sunset)} />
        <span className="lightbar-best" style={seg(sun.window.start, sun.window.end)} />
        <span className="lightbar-tick" style={{ left: `${pct(sun.sunrise)}%` }} />
        <span className="lightbar-tick" style={{ left: `${pct(sun.solarNoon)}%` }} />
        <span className="lightbar-tick" style={{ left: `${pct(sun.sunset)}%` }} />
      </div>
      <div className="lightbar-marks" aria-hidden="true">
        <span style={{ left: `${pct(sun.sunrise)}%` }}>
          <em>Sunrise</em>
          {f(sun.sunrise)}
        </span>
        <span style={{ left: `${pct(sun.solarNoon)}%` }}>
          <em>Highest</em>
          {f(sun.solarNoon)}
        </span>
        <span style={{ left: `${pct(sun.sunset)}%` }}>
          <em>Sunset</em>
          {f(sun.sunset)}
        </span>
      </div>
    </div>
  );
}
