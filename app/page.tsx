import Link from "next/link";
import { ArrowIcon, BookMark, InkDivider, InkUnderline } from "@/components/Ink";
import { WelcomeSwatches } from "@/components/WelcomeSwatches";

export default function Welcome() {
  return (
    <main className="screen">
      <div className="masthead">
        <span className="wordmark">
          <BookMark /> Storybound
        </span>
      </div>

      <div className="screen-body">
        <div className="welcome-hero">
          <p className="eyebrow">A travel journal you can wear</p>
          <h1>
            Your trip, one chapter a day.
            <InkUnderline />
          </h1>
          <p className="lede">
            A small piece to open each morning, made for the place you&rsquo;ll be standing, and a note on when the
            light is best.
          </p>
        </div>

        <WelcomeSwatches />

        <InkDivider />

        <ol className="welcome-steps">
          <li>
            <span className="eyebrow">Before</span>
            <p>Paste your itinerary. Each day becomes a chapter with its own piece.</p>
          </li>
          <li>
            <span className="eyebrow">During</span>
            <p>Open the day&rsquo;s chapter. It tells you where to stand and when.</p>
          </li>
          <li>
            <span className="eyebrow">After</span>
            <p>Your photos become the Epilogue: a lampshade that glows with the trip.</p>
          </li>
        </ol>
      </div>

      <div className="dock">
        <Link className="btn" href="/trip?demo=1">
          Start my story <ArrowIcon size={20} />
        </Link>
        <Link className="btn btn-quiet" href="/trip">
          Plan my own trip
        </Link>
      </div>
    </main>
  );
}
