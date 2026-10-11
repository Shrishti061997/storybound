"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { BlossomIcon, LeafIcon, SnowflakeIcon, SunIcon } from "./Ink";

export type Season = "spring" | "summer" | "autumn" | "winter";
/** The pre-made New York story exists in two seasons. */
export type DemoSeason = "summer" | "winter";

export const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
export const SEASON_LABEL: Record<Season, string> = { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" };
export const demoSeason = (s: Season): DemoSeason => (s === "winter" || s === "autumn" ? "winter" : "summer");

/** Season from a date and hemisphere: months flip south of the equator. */
export function seasonFor(isoDate: string, lat = 40): Season {
  const month = Number(isoDate.slice(5, 7));
  const north: Season = month >= 3 && month <= 5 ? "spring" : month >= 6 && month <= 8 ? "summer" : month >= 9 && month <= 11 ? "autumn" : "winter";
  if (lat >= 0) return north;
  return ({ spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" } as const)[north];
}

const KEY = "storybound.season";

const SeasonContext = createContext<{ season: Season; setSeason: (s: Season) => void }>({
  season: "summer",
  setSeason: () => {},
});

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeasonState] = useState<Season>("summer");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Season | null;
      if (saved && SEASONS.includes(saved)) setSeasonState(saved);
    } catch {
      // private mode or blocked storage: stay on summer
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.season = season;
  }, [season]);

  const setSeason = useCallback((s: Season) => {
    setSeasonState(s);
    try {
      localStorage.setItem(KEY, s);
    } catch {
      // ignore
    }
  }, []);

  return <SeasonContext.Provider value={{ season, setSeason }}>{children}</SeasonContext.Provider>;
}

export function useSeason() {
  return useContext(SeasonContext);
}

export function SeasonIcon({ season, size = 18 }: { season: Season; size?: number }) {
  if (season === "spring") return <BlossomIcon size={size} />;
  if (season === "autumn") return <LeafIcon size={size} />;
  if (season === "winter") return <SnowflakeIcon size={size} />;
  return <SunIcon size={size} />;
}

/** Compact four-season switch for the masthead. The active season shows its name. */
export function SeasonToggle() {
  const { season, setSeason } = useSeason();
  return (
    <div className="season-toggle season-four" role="group" aria-label="Season">
      {SEASONS.map((s) => (
        <button key={s} type="button" aria-pressed={season === s} aria-label={SEASON_LABEL[s]} title={SEASON_LABEL[s]} onClick={() => setSeason(s)}>
          <SeasonIcon season={s} />
          {season === s ? <span>{SEASON_LABEL[s]}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Four seasons, for a trip of your own. The whole app takes on the season you pick. */
export function SeasonPicker() {
  const { season, setSeason } = useSeason();
  return (
    <div className="chips" role="group" aria-label="Season of your trip">
      {SEASONS.map((s) => (
        <button key={s} type="button" className="chip chip-icon" aria-pressed={season === s} onClick={() => setSeason(s)}>
          <SeasonIcon season={s} /> {SEASON_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
