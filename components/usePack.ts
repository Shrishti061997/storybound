"use client";

import { useEffect, useState } from "react";
import base from "@/data/demo-pack.json";
import type { DemoPack, LivePiece, PackResponse } from "@/lib/pack";

type State = { pieces: Record<string, LivePiece>; live: boolean; loading: boolean; generatedAt: string | null };

let request: Promise<PackResponse> | null = null;

/** The demo pack, then the same pack with live Arcade prices and fresh image URLs. */
export function usePack(): State {
  const pack = base as DemoPack;
  const [state, setState] = useState<State>({ pieces: pack.pieces, live: false, loading: true, generatedAt: pack.generatedAt });

  useEffect(() => {
    let alive = true;
    request ||= fetch("/api/pack").then((r) => r.json());
    request
      .then((res) => alive && setState({ pieces: res.pieces || pack.pieces, live: Boolean(res.live), loading: false, generatedAt: res.generatedAt ?? pack.generatedAt }))
      .catch(() => {
        request = null;
        if (alive) setState((s) => ({ ...s, loading: false }));
      });
    return () => {
      alive = false;
    };
  }, [pack]);

  return state;
}

export const productImage = (p?: LivePiece) => p?.live?.imageUrl || p?.image;
export const patternImage = (p?: LivePiece) => p?.live?.patternUrl || p?.patternImage;
/** Only a price Arcade returned on this page load counts as live. */
export const livePrice = (p?: LivePiece) => p?.live?.unitPrice ?? null;
