# Teleport

A time machine for the web. Enter a URL, see each version of a site stacked like macOS
Time Machine windows, and browse each one live inside its frame.

## Stack
Next.js 16 (App Router) + React 19, TypeScript, Tailwind v4. Data is the public Internet
Archive Wayback API. No backend, no database, no env vars.

## How it works
1. `app/page.tsx` takes a URL and loads in two phases: `GET /api/latest` opens the machine
   instantly on the newest snapshot (Availability API), then `GET /api/snapshots` streams
   in the older versions behind it (slower CDX scan).
2. `lib/wayback.ts` `fetchSnapshots` samples monthly captures (`collapse=timestamp:6`) and
   segments the byte-size history into stable regimes (`detectVersions`): a size move opens
   a new version only when it clears `REDESIGN_THRESHOLD` from the regime median AND the
   next capture confirms it, so a single bloated/partial crawl can't fake a redesign. Each
   regime is shown via its most complete capture. Newest first.
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
- Versions are a byte-size proxy for redesigns, so a pure-CSS redesign (same HTML size) can
  be missed. `REDESIGN_THRESHOLD` in `lib/wayback.ts` is the knob.
- Iframes embed via the `if_` (toolbar-free) URL with a sandbox that omits `allow-scripts`:
  running the captured JS tends to hydrate against dead APIs and wipe the HTML, or
  frame-bust. Links still navigate (real anchors), which is what back/forward rides on.
- Some archived pages refuse to embed (frame-busting headers); that's the snapshot, not us.
- The CDX server can be slow (10 to 25s) for big domains; `/api/snapshots` times out at 25s.
