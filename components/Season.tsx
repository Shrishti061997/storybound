"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { SnowflakeIcon, SunIcon } from "./Ink";

export type Season = "summer" | "winter";

const KEY = "storybound.season";

const SeasonContext = createContext<{ season: Season; setSeason: (s: Season) => void }>({
  season: "summer",
  setSeason: () => {},
});

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeasonState] = useState<Season>("summer");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "winter" || saved === "summer") setSeasonState(saved);
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

export function SeasonToggle() {
  const { season, setSeason } = useSeason();
  return (
    <div className="season-toggle" role="group" aria-label="Season">
      <button type="button" aria-pressed={season === "summer"} onClick={() => setSeason("summer")}>
        <SunIcon size={18} /> Summer
      </button>
      <button type="button" aria-pressed={season === "winter"} onClick={() => setSeason("winter")}>
        <SnowflakeIcon size={18} /> Winter
      </button>
    </div>
  );
}
