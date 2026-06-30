# Teleport

A time machine for the web. Enter a URL, see every yearly version of a site stacked
like macOS Time Machine windows, and browse each one live inside its frame.

## Stack
- Next.js 16 (App Router) + React 19, TypeScript, Tailwind v4.
- No component or icon libraries. Tailwind only, tokens drive every value.
- Data comes from the Internet Archive Wayback CDX API. No backend, no database.

## How it works
1. Home (`app/page.tsx`) takes a URL and calls `GET /api/snapshots?url=`.
2. The route (`app/api/snapshots/route.ts`) → `lib/wayback.ts` samples monthly captures
   (`collapse=timestamp:6`) and segments the byte-size history into stable regimes
   (`detectVersions`): a size move opens a new version only when it clears
   `REDESIGN_THRESHOLD` from the regime median AND the next capture confirms it, so a
   single bloated/partial crawl can't fake a redesign. Each regime is represented by its
   most complete capture (deepest crawl, best assets). Newest first.
3. `components/Machine.tsx` lays the years out in a 3D cascade. The selected window is
   interactive and loads the archived page in an iframe via the `if_` (toolbar-free) URL.
   Older years recede up and back; navigated-past years fly toward the viewer and fade.
4. `components/Timeline.tsx` is the right-edge year rail. Arrow keys, the bottom control,
   and the rail all drive the same `index`.

## Conventions
- Read `traf/SYSTEM.md` before changing UI. Tokens live in `app/globals.css` under
  `:root` (light) and the `prefers-color-scheme: dark` block, exposed through `@theme`.
- One shared motion curve: `ease-snap`. Text styles (`.title`, `.tagline`, `.label`)
  are defined once and applied by role.
- Components get one-word names and stay display-only; logic lives in `lib/` or the page.

## Notes / limits
- Versions are detected by archived-size regimes, a cheap proxy for a redesign. Wayback
  exposes no real "redesign" signal, so a redesign that keeps the same HTML size (pure
  CSS change) can still be missed. Tune `REDESIGN_THRESHOLD` in `lib/wayback.ts`. The
  truly accurate route would be screenshotting and visually diffing each capture, which
  is far heavier than this.
- Snapshots embed via the `if_` (toolbar-free) URL with a sandbox that omits
  `allow-scripts`. Running the captured JS tends to hydrate against dead APIs and wipe
  the server-rendered HTML, or frame-bust, so we render the static capture instead. Links
  still navigate (they're real anchors), which is what back/forward rides on.
- Some archived pages set frame-busting headers and may refuse to embed; that is the
  site's snapshot, not a bug here.
- The CDX server can be slow (10 to 25s) for high-traffic domains; the route times out
  at 25s.
