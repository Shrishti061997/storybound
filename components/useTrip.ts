"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Chapter } from "@/lib/places";

export type TripDay = { n: number; date: string | null; city: string | null; place: string | null };
export type ArtState = { status?: "running" | "succeeded" | "failed"; attempt?: number; jobId?: string; patternId?: string; productId?: string; error?: string };
export type Trip = {
  /** True for the pre-made New York story; false for a trip of your own, made live. */
  demo: boolean;
  id: string;
  itinerary: string;
  days: TripDay[];
  mood: string;
  style: string;
  metal: string;
  loves: string;
  dislikes: string;
  travelers: string;
  surprise: boolean;
  outfitColors: string[];
  /** Chapters written for your own trip. */
  chapters: Chapter[];
  /** Arcade job and product IDs per chapter number, so a refresh picks up where it left off. */
  art: Record<number, ArtState>;
};

const KEY = "storybound.trip.v2";
export const EMPTY_TRIP: Trip = { demo: false, id: "", itinerary: "", days: [], mood: "Calm", style: "Painterly", metal: "", loves: "", dislikes: "", travelers: "", surprise: false, outfitColors: [], chapters: [], art: {} };

// No database: one shared in-memory trip, saved to localStorage. Every component sees the same copy.
let state: Trip = EMPTY_TRIP;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) state = { ...EMPTY_TRIP, ...JSON.parse(saved) };
  } catch {
    // unreadable or blocked storage: start fresh
  }
}

export function getTrip(): Trip {
  load();
  return state;
}

export function setTrip(patch: Partial<Trip> | ((t: Trip) => Partial<Trip>)) {
  load();
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function setArt(n: number, patch: ArtState | null) {
  setTrip((t) => ({ art: { ...t.art, [n]: patch ? { ...t.art[n], ...patch } : { attempt: (t.art[n]?.attempt || 0) + 1 } } }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTrip() {
  const trip = useSyncExternalStore(subscribe, getTrip, () => EMPTY_TRIP);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return { trip, update: setTrip, ready };
}

export const newTripId = () => Math.random().toString(36).slice(2, 10);
