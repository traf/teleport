# Teleport

A time machine for the web. Enter a URL, see each version of a site stacked like macOS
Time Machine windows, and browse each one live inside its frame.

## Stack
Next.js 16 (App Router) + React 19, TypeScript, Tailwind v4. Data is the public Internet
Archive Wayback API. No backend, no database, no env vars.

## How it works
1. `app/page.tsx` takes a URL and calls `GET /api/snapshots` once, waits for the whole
   timeline, then opens the machine on all versions at once (a slower load, but complete).
2. `fetchVersions` leans on the Wayback **Availability API**, which answers a "closest capture
   to this date" lookup in well under a second. It bounds the site's lifespan with two
   lookups, probes every year (Jan + Jul) across it with bounded concurrency (`mapLimit`, so
   the archive doesn't rate-limit a burst), dedupes by month, and down-samples evenly to
   `MAX_VERSIONS` (25) so the rail never scrolls. This replaced the CDX size-scan, which was
   slow and routinely gateway-timed-out; CDX is now only a last-resort latest-capture
   fallback (`fetchLatestViaCdx`).
3. `components/Machine.tsx` lays the versions out in a 3D cascade and owns the `index`,
   `expanded`, and `visited` state. Arrow keys, the bottom control, and `Timeline.tsx` all
   drive `index`.
4. `components/Window.tsx` renders a version. Once visited its iframe stays mounted so
   returning is instant; the active one is interactive with back/forward/reload/fullscreen.

## Conventions
- Tokens drive color/type/motion. They live in `app/globals.css` under `:root` (light) and
  the `prefers-color-scheme: dark` block, exposed through `@theme`.
- One shared motion curve: `ease-snap`. Text styles (`.title`, `.tagline`, `.label`) are
  defined once and applied by role.
- Components get one-word names and stay display-only; logic lives in `lib/` or the page.

## Gotchas
- The timeline is time-sampled (every ~6 months), not redesign-detected, so adjacent windows
  can look similar and a short-lived redesign between probes can be missed. Cadence is
  `PROBES_PER_YEAR` in `lib/wayback.ts`.
- Iframes embed via the `if_` (toolbar-free) URL. The active window gets `allow-scripts` so
  runtime theming/layout/hydration render closer to the real page; inactive windows stay
  static. The sandbox never grants `allow-top-navigation`, so frame-busting can't escape the
  app. Some captures' JS still hydrates against dead APIs and can blank out — that's the
  trade for higher fidelity on script-driven sites.
- Some archived pages refuse to embed (frame-busting headers); that's the snapshot, not us.
- `fetchVersions` fires ~40 parallel Availability lookups; the archive occasionally rate-
  limits one, which just drops that probe (the dedupe still yields a full timeline).
