"use client";

import { useCallback, useEffect, useState } from "react";

export type TripDay = { n: number; date: string | null; city: string | null; place: string | null };
export type Trip = {
  demo: boolean;
  itinerary: string;
  days: TripDay[];
  style: string;
  metal: string;
  loves: string;
  dislikes: string;
  travelers: string;
  surprise: boolean;
  outfitColors: string[];
  story: { n: number; title: string; line: string }[];
};

const KEY = "storybound.trip";
export const EMPTY_TRIP: Trip = { demo: true, itinerary: "", days: [], style: "Painterly", metal: "", loves: "", dislikes: "", travelers: "", surprise: false, outfitColors: [], story: [] };

// No database: trip state lives in React state and is saved to localStorage.
export function useTrip() {
  const [trip, setTrip] = useState<Trip>(EMPTY_TRIP);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setTrip({ ...EMPTY_TRIP, ...JSON.parse(saved) });
    } catch {
      // unreadable or blocked storage: start fresh
    }
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<Trip>) => {
    setTrip((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { trip, update, ready };
}
