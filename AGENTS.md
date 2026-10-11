# Storybound: instructions for coding agents

Read `STORYBOUND_IMPLEMENTATION_PLAN.md` first. It is the source of truth for features, the customer flow, Arcade API calls, the demo and the timeline. This file adds standing rules on top of it.

## The project

- **Storybound** — "Your trip, one chapter a day."
- A mobile-first Next.js web app for the Shopping 3.0 hackathon. The demo is due at 3:30pm today; aim to be deployed and working by 3:00.
- Build the New York demo path end to end first. Only then add "Plan my own trip" (plan section 12).

## Secrets: do this before the first commit

- Create `.gitignore` with `.env*`, `node_modules`, `.next` and `.vercel` before anything is committed.
- Keys live only in `.env.local`: `ARCADE_API_KEY` and `ANTHROPIC_API_KEY`. Create the file with empty placeholders; the human pastes the real values. Add the same variables in Vercel's project settings for deploys.
- Only server code (route handlers and scripts) reads keys. Never import them into client components, never log them, never use a `NEXT_PUBLIC_` name for them.
- If a key is ever committed or printed, stop and say so immediately so it can be rotated.

## How to work

- Follow the milestone order in the plan. After each milestone: run it, show what works, commit with a clear message, and push.
- Install Arcade's agent skill first: `npx skills add https://docs.arcade.ai`.
- Test ONE real Arcade call (one scarf: pattern, product, price) before any batch generation. Ask before starting bulk jobs.
- Never invent prices, category IDs or API fields. When an Arcade call fails, read the error message and Arcade's docs before retrying.
- Start Arcade jobs on the server and return the `jobId`; poll from the browser. Never wait for a job inside one request.
- Deploy to Vercel early (right after scaffolding) and redeploy after each milestone.

## Art direction: Art + AI, never "AI-generated looking"

The feeling is an artist's travel journal: paper, ink and real art. AI shows up in the patterns, not in the interface chrome.

**Do:**
- Paper background with a subtle grain (inline SVG `feTurbulence` noise at low opacity), never flat white.
- Type: **Fraunces** for headings and chapter titles, **Inter** for body text, and **Caveat** for at most one short handwritten margin note per screen.
- Real art as the main imagery: Arcade-generated patterns on the chapter doors, cards and section backgrounds, shown like fabric swatches.
- Optional, if time allows: one public-domain artwork per place, published before 1929 and taken from an open-access collection (the Met, the National Gallery of Art, the Library of Congress). Show it as "the place, then" beside the Arcade pattern "the place, now," with a small credit line.
- Hand-drawn feel: SVG ink lines for dividers, underlines and small icons (sun, snowflake, lamp, pin), slightly irregular strokes around 1.5px, in the ink color.
- Editorial, slightly asymmetric layouts: left-aligned text, generous margins, images tilted 1–2° as if pasted into a journal.
- Season themes through CSS variables, as listed in plan section 13.

**Don't:**
- No purple or blue gradients, glassmorphism, glowing blobs, 3D shapes, sparkle icons, emoji, stock icon sets, "AI-powered" badges, or generic SaaS hero sections.
- No heavy drop shadows and no rounded-everything. Cards are paper with a thin ink border or a stitched dashed border.
- No lorem ipsum or filler copy. Use the narrator voice from plan section 13.

## Motion: small and few

- An ink underline draws itself under main headings on load (`stroke-dashoffset`, about 800ms).
- Season particles on the Story screen only: 5–8 slow-drifting petals or leaves in summer, snowflakes in winter.
- Chapter doors open like an envelope flap (about 400ms).
- Sun-Reveal scarf: grayscale to full color over about 2 seconds.
- Epilogue lamp: a soft glow that warms up once, then a very slow breathing pulse.
- Season toggle: colors cross-fade in about 400ms.
- Use CSS and SVG only; no animation libraries.
- Respect `prefers-reduced-motion` everywhere. No bouncing, parallax or other looping motion beyond the particles and the lamp.

## Copy

- Customer-facing text never says "AI" or "generate." Use the narrator voice: "Writing your chapters…", "Inking Chapter 2…", "Start my story."
- One exception, the footer: "Art from the places you go · designed with AI · made by Arcade."
- Label real Arcade pieces "Made with Arcade" and concept pieces "Design preview."

## Arcade rules (details in plan section 5)

- Base URL `https://platform.arcade.ai/v1`; every call is a POST with JSON, from the server only.
- Map categories by name from `categories/list` (Scarves, Ribbon Scarf, Pendant Necklace, Drum Lampshades); never hardcode IDs.
- Stable `requestId`s, prompts under 1,000 characters, no text and no trademarked names in prompts.
- Jewelry is text-only; refines work on Home & Textiles patterns only.
- Re-fetch image URLs before showing them; they expire.
- Checkout uses `dropShip: true` for single items.
