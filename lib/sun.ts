// Sun math for the day card. Times and direction are calculated, never invented.

import * as SunCalc from "suncalc";
import type { BestWindow } from "./places";

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const WORDS: Record<string, string> = {
  N: "north", NNE: "north-northeast", NE: "northeast", ENE: "east-northeast", E: "east", ESE: "east-southeast",
  SE: "southeast", SSE: "south-southeast", S: "south", SSW: "south-southwest", SW: "southwest", WSW: "west-southwest",
  W: "west", WNW: "west-northwest", NW: "northwest", NNW: "north-northwest",
};

export const compass = (bearing: number) => COMPASS[Math.round(bearing / 22.5) % 16];
export const compassWords = (bearing: number) => WORDS[compass(bearing)];

/** suncalc 2.x returns azimuth in degrees clockwise from north, and altitude in degrees. */
export function sunBearing(time: Date, lat: number, lng: number) {
  const { azimuth, altitude } = SunCalc.getPosition(time, lat, lng);
  return { bearing: ((azimuth % 360) + 360) % 360, altitude };
}

export function formatTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(d).toLowerCase();
}

export function formatDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone }).format(new Date(`${iso}T17:00:00Z`));
}

export type SunDay = {
  sunrise: Date;
  goldenHourEnd: Date;
  solarNoon: Date;
  goldenHour: Date;
  sunset: Date;
  dusk: Date;
  dawn: Date;
  window: { start: Date; end: Date; label: string };
  /** Where the sun is in the middle of the best window. */
  bearing: number;
  altitude: number;
};

export function sunDay(isoDate: string, lat: number, lng: number, best: BestWindow): SunDay {
  // 17:00 UTC is midday on the US east coast, so SunCalc lands on the right calendar day.
  // at these latitudes every time exists; the library types allow null for polar days
  const t = SunCalc.getTimes(new Date(`${isoDate}T17:00:00Z`), lat, lng) as unknown as Record<string, Date>;
  const hour = 3600_000;
  const window =
    best === "sunrise"
      ? { start: t.sunrise, end: t.goldenHourEnd, label: "Sunrise light" }
      : best === "midday"
        ? { start: new Date(t.solarNoon.getTime() - hour), end: new Date(t.solarNoon.getTime() + hour), label: "Full midday sun" }
        : best === "afternoon"
          ? { start: new Date(t.goldenHour.getTime() - 2 * hour), end: t.goldenHour, label: "Afternoon sun" }
          : { start: t.goldenHour, end: t.sunset, label: "Golden hour" };
  const mid = new Date((window.start.getTime() + window.end.getTime()) / 2);
  const { bearing, altitude } = sunBearing(mid, lat, lng);
  return { sunrise: t.sunrise, goldenHourEnd: t.goldenHourEnd, solarNoon: t.solarNoon, goldenHour: t.goldenHour, sunset: t.sunset, dusk: t.dusk, dawn: t.dawn, window, bearing, altitude };
}

/** Plain sentences built only from calculated values. Used as-is, and as the facts given to the coach. */
export function sunFacts(s: SunDay, timeZone: string, best: BestWindow) {
  const f = (d: Date) => formatTime(d, timeZone);
  const sunFrom = compassWords(s.bearing);
  const facing = compassWords((s.bearing + 180) % 360);
  const when =
    best === "sunrise"
      ? `Sunrise is at ${f(s.sunrise)}. The soft light lasts until ${f(s.goldenHourEnd)}.`
      : best === "midday"
        ? `The sun is highest at ${f(s.solarNoon)}. Go between ${f(s.window.start)} and ${f(s.window.end)}.`
        : best === "afternoon"
          ? `Go between ${f(s.window.start)} and ${f(s.window.end)}, before golden hour begins.`
          : `Golden hour starts at ${f(s.goldenHour)} and the sun sets at ${f(s.sunset)}.`;
  const angle =
    best === "sunrise" || best === "afternoon"
      ? `The sun will be in the ${sunFrom}. Keep it behind you and face ${facing}; the camera stands between you and the sun.`
      : best === "midday"
        ? `The sun will be high in the ${sunFrom}. Tip your chin up a little and shoot from slightly above to soften shadows.`
        : `The sun will be low in the ${sunFrom}. Turn so it lights one side of your face, and shoot from chest height.`;
  return { when, angle, sunFrom, facing };
}
