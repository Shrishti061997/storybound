"use client";

import type { CSSProperties } from "react";
import type { LivePiece } from "@/lib/pack";
import type { Chapter } from "@/lib/places";
import { patternImage, productImage } from "./usePack";

type Props = { chapter: Chapter; piece?: LivePiece; hidden?: boolean; tilt?: string; prefer?: "product" | "pattern" };

/** The piece for a chapter: Arcade product photo, or Arcade-designed art inside a simple shape for concepts. */
export function PieceArt({ chapter, piece, hidden, tilt = "-1.5deg", prefer = "product" }: Props) {
  const style = { ["--tilt" as string]: tilt } as CSSProperties;
  if (hidden) {
    return (
      <span className="swatch swatch-empty piece-art piece-hidden" style={style} role="img" aria-label="A surprise, sealed until the day">
        <span aria-hidden="true">?</span>
      </span>
    );
  }

  const pattern = patternImage(piece);
  const product = productImage(piece);
  const alt = `${chapter.pieceLabel} for ${chapter.place}`;

  if (chapter.piece === "brooch") {
    return (
      <span className="piece-art brooch" style={style} role="img" aria-label={`${alt}, design preview`}>
        <span className={`brooch-face ${pattern ? "" : "swatch-empty"}`} style={pattern ? { backgroundImage: `url("${pattern}")` } : undefined} />
        <svg className="ink brooch-pin" viewBox="0 0 60 14" aria-hidden="true">
          <path d="M1.500 7.600c19-1.300 38-1.200 57 .200M4.200 4.400c-2.400 1.600-2.600 4.300-.300 6.100" />
        </svg>
      </span>
    );
  }

  if (chapter.piece === "nails") {
    return (
      <span className="piece-art nails" style={style} role="img" aria-label={`${alt}, design preview`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`nail ${pattern ? "" : "swatch-empty"}`} style={pattern ? { backgroundImage: `url("${pattern}")`, backgroundPosition: `${i * 23}% ${i * 17 + 10}%` } : undefined} />
        ))}
      </span>
    );
  }

  const src = prefer === "pattern" ? pattern || product : product || pattern;
  return (
    <span className={`swatch piece-art ${src ? "" : "swatch-empty"}`} style={style}>
      {src ? <img src={src} alt={alt} loading="lazy" /> : <span className="sr-only">{alt}, still being inked</span>}
    </span>
  );
}
