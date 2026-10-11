import Link from "next/link";
import type { ReactNode } from "react";
import { BackIcon, BookMark } from "./Ink";

export function Masthead({ back, backLabel, right }: { back?: string; backLabel?: string; right?: ReactNode }) {
  return (
    <div className="masthead">
      {back ? (
        <Link className="back" href={back}>
          <BackIcon size={18} /> {backLabel || "Back"}
        </Link>
      ) : (
        <Link className="wordmark" href="/">
          <BookMark /> Storybound
        </Link>
      )}
      {right}
    </div>
  );
}
