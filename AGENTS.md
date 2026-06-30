# Teleport

A time machine for the web. Enter a URL, see each version of a site stacked like macOS
Time Machine windows, and browse each one live inside its frame.

## Stack
Next.js 16 (App Router) + React 19, TypeScript, Tailwind v4. Data is the public Internet
Archive Wayback API. No backend, no database, no env vars.

## How it works
1. The URL path is the source of truth. `components/Teleport.tsx` (rendered by `app/page.tsx`
   for `/` and `app/[...slug]/page.tsx` for `/stripe.com`) reads the slug, so deep links and
   teleports are shareable. A trailing `/jan-2020` segment pins an exact version (the rest is
   the site); the open version is synced back into the URL via `history.replaceState` as you
   navigate. `/` shows the home form. Loading is two-phase for speed: `GET /api/latest` returns
   just the newest capture (~1s) to paint the first window immediately, while `GET /api/snapshots`
   builds the full timeline in parallel and expands it in behind. Both API routes are cached hard
   at the edge (`Cache-Control s-maxage`), so repeat and shared links skip Wayback entirely. The
   root layout `preconnect`s to the archive so the first lookup/iframe skips DNS+TLS.
2. `fetchVersions` uses the **CDX** server as the source of truth — one query filtered to real
   `text/html` + `200` captures, collapsed to one per month (`collapse=timestamp:6`). The HTML
   filter keeps out redirects and non-page captures (e.g. Next.js RSC/flight payloads that would
   render as raw text). `pickDistinct` then keeps only captures whose `digest` changed AND whose
   archived `length` jumped past a threshold (a redesign proxy), and the result is down-sampled
   to `MAX_VERSIONS` (20). If CDX flakes it falls back to probing the **Availability API** across
   the lifespan, then to the single latest capture (`fetchLatestViaCdx`).
3. `components/Machine.tsx` lays the versions out in a 3D cascade and owns the `index`,
   `expanded`, and `visited` state. Arrow keys, the bottom control, and `Timeline.tsx` all
   drive `index`. `Tab.tsx` is the address tab: tap the × to retype the URL and teleport away.
4. `components/Window.tsx` renders a version. Once visited its iframe stays mounted so
   returning is instant; the active one is interactive with back/forward/reload/fullscreen.

## Conventions
- Tokens drive color/type/motion. They live in `app/globals.css` under `:root` (light) and
  the `prefers-color-scheme: dark` block, exposed through `@theme`.
- One shared motion curve: `ease-snap`. Text styles (`.title`, `.tagline`, `.label`) are
  defined once and applied by role.
- Components get one-word names and stay display-only; logic lives in `lib/` or the page.

## Gotchas
- Versions are chosen by `digest` + archived-`length` deltas (`pickDistinct`), a cheap proxy
  for a redesign — Wayback exposes no real one. It works for server-rendered sites; JS-heavy
  SPAs whose served HTML barely changes will honestly collapse to few versions even if the
  rendered design changed a lot. Tune `SIZE_DELTA` / cap `MAX_VERSIONS` in `lib/wayback.ts`.
- Iframes embed via the `if_` (toolbar-free) URL and render the **static** capture — the
  sandbox omits `allow-scripts`. Running the page's own JS made script-driven sites (SPAs)
  hydrate, fail to re-fetch un-archived data, and blank out after first paint; static captures
  stay stable. Links still navigate within the frame; we never grant `allow-top-navigation`.
- Some archived pages refuse to embed (frame-busting headers); that's the snapshot, not us.
- The CDX index can be slow for high-traffic domains; the query times out at 25s and falls
  back to the Availability-API probe (`fetchVersionsViaProbe`), then to latest-only.
