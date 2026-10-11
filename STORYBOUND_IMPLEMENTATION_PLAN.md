# Storybound: Implementation Plan

*Team Storybound · Shopping 3.0 Hackathon · Oct 11, 2026 · 2-minute pitch at 3:30pm*

**Tagline: Your trip, one chapter a day.**
Supporting line: *Some pieces aren't finished until you get there.*

## 1. What we're building

Storybound turns a travel itinerary into a story told in chapters. Each day of the trip gets a small piece made for that place and season, plus an AI day card that says when to go, where to stand and how to use the piece in the photo. After the trip, AI turns the traveler's photos and achievements into an Epilogue: a lampshade made by Arcade and a charm bracelet.

## 2. The demo trip: New York State, 5 chapters, two seasons

| Chapter | Place | Piece | Made by | Arcade category |
| --- | --- | --- | --- | --- |
| 1 | The High Line | Scarf, with a Sun-Reveal preview | Arcade | Scarves |
| 2 | Brooklyn Bridge at sunrise | Pendant | Arcade | Pendant Necklace |
| 3 | Central Park | Hair ribbon | Arcade | Ribbon Scarf |
| 4 | Lake Placid | Brooch | Concept, with Arcade-designed art | none |
| 5 | Niagara Falls | Stick-on nails | Concept, with Arcade-designed art | none |
| Epilogue | Home | Drum lampshade | Arcade | Drum Lampshades |
| Epilogue | Home | Charm bracelet | Concept, with Arcade-designed charms | none |

- **Seasons:** Summer (July 12–16, 2027) and Winter (December 14–18, 2026). A toggle re-themes everything.
- **Other options in the app (not demoed):** pillow, table runner, tea towel or quilt for the Epilogue; earrings; the Sunprint Square.

## 3. End-to-end customer experience

| # | Screen | The customer | AI | Arcade |
| --- | --- | --- | --- | --- |
| 1 | Welcome | Taps "Start my story" | | |
| 2 | Your trip | Pastes an itinerary or uploads a screenshot | Itinerary reader pulls out days, dates and places, and asks one question if something is missing | |
| 3 | About you | Picks style and metal, loves and dislikes, who's coming; optional outfit photo | Outfit match picks 3 colors from the photo | Metal and fabric options from `categories/get` |
| 4 | Your story | Sees 5 chapter doors, flips Summer / Winter, can choose "Surprise me" | Story writer creates chapter titles and lines; Designer picks pieces and writes prompts | Generates designs and products, with live prices |
| 5 | Checkout | Taps "Order my chapters" | | Checkout for the Arcade pieces |
| 6 | Chapter card, during the trip | Opens today's chapter | Photo coach covers when, where, angle and how to wear it; suggests a swap if the weather turns | Fresh product images |
| 7 | Epilogue, after the trip | Uploads favorite photos and edits the achievement list | Curator builds the charm list and picks the best 3 photos | Photos become references for the lampshade; charm artwork |
| 8 | Epilogue checkout | Orders the lampshade | | Checkout |

## 4. Architecture

- **App:** Next.js (App Router, TypeScript), mobile-first, plain CSS, deployed on Vercel.
- **Keys stay on the server:** `ARCADE_API_KEY`, plus `ANTHROPIC_API_KEY` or another vision-capable AI key.
- **No database:** trip state lives in React state and is saved to `localStorage`, wrapped in try/catch. Demo data lives in `data/demo-pack.json`.
- **Library:** `suncalc` and `@types/suncalc`.

```
app/
  page.tsx                  welcome
  trip/page.tsx             paste itinerary
  you/page.tsx              taste and outfit
  story/page.tsx            chapter doors, season toggle, checkout
  chapter/[n]/page.tsx      day card
  epilogue/page.tsx         photos to lampshade and bracelet
  api/
    categories/route.ts
    ai/itinerary/route.ts
    ai/story/route.ts
    ai/outfit/route.ts
    ai/coach/route.ts
    ai/epilogue/route.ts
    arcade/generate/route.ts
    arcade/job/route.ts
    arcade/product/route.ts
    arcade/upload/route.ts
    arcade/checkout/route.ts
lib/
  arcade.ts  ai.ts  sun.ts  prompts.ts  places.ts  palettes.ts
scripts/pregen.ts
data/demo-pack.json
```

## 5. Arcade integration (checked against the docs on Oct 11)

Base URL `https://platform.arcade.ai/v1`. Every call is a POST with a JSON body, from the server only, with these headers: `Authorization: Bearer $ARCADE_API_KEY`, `Content-Type: application/json`, `User-Agent: storybound-hackathon/0.1 (<team email>)`.

### 5.1 Endpoints we use

| Endpoint | Body | Returns | Used for |
| --- | --- | --- | --- |
| `categories/list` | `{}` | `items[]` with `categoryId`, `name`, `world` | Find Scarves, Ribbon Scarf, Pendant Necklace, Drum Lampshades |
| `categories/get` | `{ categoryId, selections }` | `options[]` (`key`, `values[]` with `value`, `label`, `available`), `selections`, `canManufacture` | Scarf fabric, metal choices, lampshade options |
| `patterns/create` | `{ requestId, prompt, colors?, referenceIds?, categoryId? }` | a job | Every design. With the Pendant Necklace `categoryId` it also builds the pendant |
| `jobs/get` | `{ jobId }` | `status`, `result.patternId`, `result.productId`, `error.message` | Polling |
| `patterns/get` | `{ patternId }` | `imageUrl`, `thumbnailUrl` | Concept art for the brooch, nails and charms |
| `patterns/refine/recolorClusters` | `{ requestId, patternId, clusterCount? }` | `clusters[]` with `clusterId`, `color` | Summer to winter |
| `patterns/refine/recolor` | `{ requestId, patternId, colors: [{ clusterId, color }] }` | a job | Winter version of the trip pattern |
| `patterns/refine/makeSeamless` | `{ requestId, patternId, tile: { left, top, size } }` | a job | Ribbon repeat |
| `patterns/refine/extendScene` | `{ requestId, patternId, targetWidth, targetHeight }` (16–1536 each) | a job | Wraparound lampshade scene |
| `references/createUpload` | `{ requestId, mediaType, byteLength }` (jpeg, png, webp or gif, up to 10 MiB) | `uploadId`, `uploadUrl`, `requiredHeaders` | Epilogue photos |
| PUT to `uploadUrl` | the file bytes, with `requiredHeaders` exactly | | Upload |
| `references/create` | `{ requestId, uploadId }` | `referenceId` | Pass up to 3 to `patterns/create` |
| `products/create` | `{ requestId, patternId, categoryId, selections }`, using the full `selections` object from `categories/get` | a job, then `productId` | Scarf, ribbon, lampshade |
| `products/get` | `{ productId }` | `title`, `imageUrl`, `images[].url`, `unitPrice` | Live price and product image |
| `checkouts/create` | `{ requestId, lines: [{ productId, quantity }], dropShip: true }` | `checkoutUrl` | Chapter checkout and Epilogue checkout |

### 5.2 Flows

- **Printed piece (scarf, ribbon scarf):** `patterns/create` with the prompt and season `colors`, then poll for the `patternId`. For the ribbon, run `makeSeamless`. Then `categories/get` with the chosen fabric; if `canManufacture` is true, call `products/create` with the returned `selections`, poll for the `productId`, and call `products/get`.
- **Winter version:** run `recolorClusters` on the summer pattern, map each cluster to the nearest winter palette color, run `recolor`, poll for the new `patternId`, then `products/create`.
- **Pendant:** `patterns/create` with the Pendant Necklace `categoryId` and the metal written into the prompt. No colors, references or refines. Poll for the `productId`, then `products/get`. If the job fails pricing, retry with another metal.
- **Concept art (brooch, nails, charms):** `patterns/create` without a `categoryId`, poll, then `patterns/get`. Show the image inside CSS shapes, labeled "Design preview."
- **Lampshade:** upload up to 3 photos as references, then `patterns/create` with the `referenceIds`, season colors and achievement motifs. Run `extendScene` to a wide wrap (for example 1536 × 512; check the shade's proportions in `categories/get`), then `categories/get`, `products/create`, `products/get`, and checkout.
- **Checkout:** Arcade pieces only. One checkout for the chapters, one for the Epilogue.

### 5.3 Rules

- Never hardcode category IDs; map them by name from `categories/list`.
- Use stable `requestId`s, such as `ny-winter-c2-a1`, up to 128 characters.
- Keep prompts under 1,000 characters, with no text and no brand or trademarked names.
- Jewelry is text-only, and refines only work on Home & Textiles patterns.
- Re-fetch image URLs before showing them, because they expire.
- Run at most 5 jobs at once and show a status on each chapter door.
- Report API problems with Arcade's `feedback.create` (see their docs).

## 6. AI layer

Use one vision-capable model through server routes. Ask for JSON, check it against a schema, and fall back to the hand-written demo data if a call fails.

| Feature | Input | Output | Guardrail |
| --- | --- | --- | --- |
| Itinerary reader | Pasted text or a screenshot | `days[]` with `n`, `date`, `city`, `place` | Asks at most one question; the customer confirms |
| Story writer | Days, travelers, occasion | `chapters[]` with `title`, `line` | Short and warm, no facts |
| Outfit match | Outfit photo | 3 hex colors | Merged with the season palette, 10 colors at most |
| Designer | Place, season, piece, tastes, colors | Arcade prompt plus a "why it's yours" line | Under 1,000 characters, no text, no brands |
| Photo coach | Calculated sun times and direction, place fact sheet, piece | `when`, `where`, `angle`, `howToWear` | Uses only the fact sheet; never invents hours or crowds |
| Weather swap | Forecast per day (Open-Meteo, free) | Suggested swap and reason | In the demo, labeled "if Day 1 were cloudy" |
| Epilogue curator | Trip photos, step count, chapters | `charms[]` with `label`, `symbol`; best 3 photos | Symbols, not digits; people as colored beads; ask before using other people's photos |
| Shot check (stretch) | Test photo and chapter | 1–2 fixes | |

System prompts to start from:

- **Itinerary reader:** "Extract the trip as JSON {days:[{n, date (YYYY-MM-DD), city, place}]}. Use only what is in the text. If a date or place is missing, set it to null and put one short question in `question`."
- **Story writer:** "For each day, write a chapter title of at most 6 words and one warm line of at most 14 words. Tone: {occasion}. Do not state facts such as opening hours or prices."
- **Photo coach:** "Using ONLY the facts, times and sun direction provided, write four one-line fields: when, where to stand, angle, and how to wear {piece} in the shot. Do not add any facts."

Sun math:

- `SunCalc.getTimes(date, lat, lng)` gives `sunrise`, `goldenHourEnd`, `goldenHour`, `sunset` and `dusk`.
- `SunCalc.getPosition(time, lat, lng).azimuth` is in radians, measured from south toward west. Compass bearing = `(azimuth * 180 / Math.PI + 180) % 360`.
- Format times with `Intl.DateTimeFormat(..., { timeZone: "America/New_York" })`.
- Sun-reveal scarf: reveal it around midday when the sun is strongest, then photograph at golden hour.

## 7. Place library (New York State)

| Ch | Place | Lat, lng | Summer motif | Winter motif | Fact sheet |
| --- | --- | --- | --- | --- | --- |
| 1 | The High Line | 40.7480, -74.0048 | wildflowers on old rail tracks | snow-dusted grasses on old rail tracks | Elevated park on a former rail line, with shaded and sunny stretches |
| 2 | Brooklyn Bridge | 40.7061, -73.9969 | gothic stone arches and cables | arches and cables with frost | Pedestrian promenade; walking from Brooklyn toward Manhattan puts the sunrise behind you |
| 3 | Central Park | 40.7716, -73.9750 | elms and a curved stone footbridge | snowy elms and skaters | Large open lawns with full sun around midday |
| 4 | Lake Placid | 44.2795, -73.9799 | a mountain lake, pines, canoes | a frozen lake, snowy pines, skates | Lakeside village in the Adirondacks |
| 5 | Niagara Falls | 43.0868, -79.0685 | a curtain waterfall with a rainbow | a frozen waterfall with icicles | Rainbows appear in the mist when the sun is behind you |

Palettes: summer `#2D6A4F #74C69D #48CAE4 #FFFFFF #FFD166`; winter `#FFFFFF #CAE9FF #5FA8D3 #1B4965 #9D0208`.

Prompts describe places generically, for example "an elevated garden walkway on old rail tracks" or "a stone bridge with gothic arches." Never use trademarked names.

## 8. Demo mode and pre-generation (start this first)

`scripts/pregen.ts` runs these steps and saves every ID and price to `data/demo-pack.json`:

1. `categories/list`; save the IDs for Scarves, Ribbon Scarf, Pendant Necklace and Drum Lampshades.
2. Summer trip pattern for the scarf, then `recolor` for winter.
3. Ribbon pattern, then `makeSeamless`, then recolor for winter.
4. Scarf and ribbon products for both seasons (4 products).
5. Pendant for summer (silver-toned) and winter (gold-toned): 2 jewelry products.
6. Pattern-only art for the brooch, the nails and 5 charms.
7. Lampshade: upload 3 of your own New York trip photos as references, generate the pattern, `extendScene`, then create the product.

That's about 20 jobs, 5 at a time. The app loads the demo pack, and one "Generate live" button starts a real job during the pitch.

## 9. Timeline, 12:55 to 3:30pm

| Time | Person A: app and AI | Person B: Arcade |
| --- | --- | --- |
| 12:55–1:15 | Next.js scaffold, deploy empty to Vercel, add keys | `categories/list`, `categories/get` (scarf fabrics, metals, lampshade options), write `lib/arcade.ts` |
| 1:15–2:00 | Trip, About you and Story screens using demo JSON | `scripts/pregen.ts` running; generate, job and product routes |
| 2:00–2:40 | Chapter card with sun times and coach tips, season toggle, sun-reveal animation | Lampshade flow (upload, references, extendScene, product), checkout route |
| 2:40–3:05 | AI routes: itinerary reader and story writer, then outfit match if there's time | Epilogue screen data; refresh images and prices |
| 3:05–3:15 | Deploy and test on a phone | Same |
| 3:15–3:30 | Rehearse twice and record a backup video | Same |

If you fall behind, cut in this order: outfit match, then the live weather swap (show a static card instead), then live AI (use the hand-written data). Skip shot check.

## 10. The 2-minute pitch

| Time | What happens | What you say |
| --- | --- | --- |
| 0:00–0:15 | Hold up a paper pouch labeled "Chapter 1." | "Last time I was at Niagara Falls, I bought the same keychain as everyone else." |
| 0:15–0:30 | Title screen. | "Storybound turns your itinerary into a story: a small piece to open each day, made for where you'll be, and AI that tells you when and where to take the photo." |
| 0:30–1:15 | Paste the itinerary; chapters appear with Arcade pieces and live prices. Flip to Winter and Arcade recolors everything. Open Chapter 2: sunrise time, where to stand, the angle. Tap Order to open Arcade checkout. | "Same trip, opposite seasons. Every price is live from Arcade." |
| 1:15–1:40 | Epilogue: upload 3 photos; the lampshade and charm bracelet appear. | "When you're home, your photos become a lampshade that glows with your trip, and every achievement becomes a charm." |
| 1:40–2:00 | Close. | "AI is the storyteller and the art director. Arcade is the maker. Storybound: your trip, one chapter a day." |

Keep it honest: label concept pieces "Design preview," label pre-made Arcade pieces "made this morning," pull prices live, and open checkout without paying unless asked.

## 11. Risks and fallbacks

- **No wool for the scarf:** offer whatever fabrics `categories/get` lists, and say "fabric options from Arcade."
- **Pendant fails pricing:** retry with another metal. If it keeps failing, switch Chapter 2 to a printed Pocket Square.
- **The extended scene looks odd:** use the pattern without extending it.
- **AI key or AI call fails:** use the hand-written demo data.
- **Network fails on stage:** play the backup video.
- **Delivery lead time is unknown:** don't show an "order by" date until Arcade confirms it.

## 12. Any trip, not just the demo

Two ways in from the Welcome screen:
- **"Try the New York demo"** loads `data/demo-pack.json` and shows everything instantly. Use this in the pitch.
- **"Plan my own trip"** runs everything live for any destination.

| Step | How it works for any trip |
| --- | --- |
| Days, dates, places | AI itinerary reader |
| Coordinates and time zone | Open-Meteo geocoding (free, no key): `https://geocoding-api.open-meteo.com/v1/search?name=<place>&count=1` returns `latitude`, `longitude` and `timezone`. If a landmark isn't found, search its city instead; sun times barely change across a city |
| Season | From the date and hemisphere: flip the months when latitude is negative, and use the summer palette near the equator |
| Motifs | The AI designer writes generic motifs for the place, with no trademarked names |
| Piece for each day | AI tags each day (landmark, park, water, city at night, nature) and simple rules pick the piece |
| Photo coach | Sun times and direction are calculated for any place. AI adds general framing tips. Places in the curated library also get local tips. Never invent opening hours or crowd facts |
| Arcade | Same calls, generated live. Doors fill in as jobs finish, which takes a few minutes |
| Weather swap | Open-Meteo forecast, only for trips starting within about two weeks |
| Long trips | Cap at 7 chapters; AI picks the best days |

Build this only after the New York demo path works end to end; it adds roughly 30–40 minutes. Show it live in the pitch only if it works reliably by 3:00. Otherwise just say "it works for any trip."

## 13. Brand and UI design

**The feel:** a travel journal crossed with a storybook, with an Art + AI theme. Detailed art direction and motion rules are in `CLAUDE.md` / `AGENTS.md`; follow those where they add detail.

**In short:** a travel journal crossed with a storybook. Warm paper, ink-like type, chapters you open like envelopes. It should feel like reading your own trip, not browsing a store: no product grids, no filters, one thing per screen.

### Tagline and voice

- **Tagline:** "Your trip, one chapter a day." It goes on the Welcome screen, the browser tab title, and the pitch's closing line.
- **Supporting line:** "Some pieces aren't finished until you get there." Use it on the Sun-Reveal scarf and the Sunprint preview.
- **What we call things:** a **Chapter** is a day of the trip; a **chapter piece** is what you wear or use that day; the **Epilogue** is what you keep at home afterward (the lampshade and the charm bracelet). Avoid the word "souvenir" except when describing the problem: the generic airport souvenir we replace.
- **Voice:** warm and short, like a narrator. Customer-facing copy never says "AI" or "generate."
  - Loading: "Writing your chapters…", "Inking Chapter 2…", "Waiting for the sun…"
  - Buttons: "Start my story", "Open Chapter 1", "Order my chapters", "Write my epilogue"
  - Labels: "Made with Arcade" for real pieces, "Design preview" for concepts.

### Look

- **Type:** a serif for headings and chapter titles (Fraunces or Playfair Display from Google Fonts), a clean sans for body text (Inter). Chapter numbers in small caps: "CHAPTER II."
- **Wordmark:** "Storybound" in the heading serif, with a small open-book mark.
- **Season themes:** the Summer / Winter toggle swaps a set of CSS variables, so the whole app changes with one tap.

| Token | Summer | Winter |
| --- | --- | --- |
| `--paper` (background) | #FBF7EF | #F6F9FC |
| `--ink` (text) | #1F2A24 | #1B2733 |
| `--accent` (buttons, links) | #2D6A4F | #1B4965 |
| `--accent-2` (secondary) | #48CAE4 | #5FA8D3 |
| `--highlight` (badges, small moments) | #FFD166 | #9D0208 |

### Layout

- Mobile-first, single column, 16px side gutters, 44px minimum tap targets.
- On a laptop, center the app at about 430px wide inside a phone-shaped frame, so the demo looks like a phone app.
- One main action per screen, pinned to the bottom.

### Key components

| Component | Design |
| --- | --- |
| Chapter door | A paper card with a stitched (dashed) border like a fabric pouch. Shows chapter number, title, place, piece image (or "?" if Surprise me is on), badge, and price for Arcade pieces. Tapping it opens like an envelope flap |
| Season toggle | A pill switch at the top of the Story screen with sun and snowflake icons. Theme colors cross-fade in about 400ms |
| Day card | A journal page: chapter title, the "why it's yours" line, then a **light bar**, a horizontal timeline of the day with sunrise, golden hours and sunset marked and the best window highlighted. Below it, "Where to stand," "Angle," and "How to wear it" |
| Sun-Reveal scarf | Shows the pattern in pale grayscale with a "Step into the sun" button; the color fades in over about 2 seconds |
| Concept pieces | The Arcade pattern shown inside simple CSS shapes: nail shapes for the nails, a circle with a pin back for the brooch |
| Epilogue lampshade | The Arcade product image with a soft warm glow behind it (a radial gradient), as if the lamp is switched on |
| Charm bracelet | A thin curved chain (SVG) with small round charms, each showing Arcade-designed art. Tap a charm to see its label: "Brooklyn sunrise," "Niagara," "12 miles walked" |
| Price and checkout | A paper "receipt" summary at the bottom of the Story screen with the Arcade pieces and the live total |

### Motion and accessibility

- Gentle motion only: envelope opening, page slide between chapters, the scarf fade-in. Turn it off when the device prefers reduced motion.
- Keep text contrast readable on both themes, and give every image alt text.
