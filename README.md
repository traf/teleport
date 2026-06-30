# Teleport

A time machine for the web. Drop a URL and watch it evolve, version by version, each one stacked like windows in time and browsable live inside its frame.

## How it works

- Detects real redesigns from the Internet Archive by walking a site's capture history and segmenting it into stable size regimes, so you see drastic changes, not every re-crawl.
- Opens instantly on the latest snapshot (Availability API), then streams in older versions behind it (CDX).
- Renders each version in a sandboxed frame from the toolbar-free archive, with back, forward, reload, and fullscreen.

## Run locally

Requires Node 20.9+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter a URL, and hit Teleport.

No environment variables, no database, no API keys. It talks straight to the public Wayback Machine.

## Scripts

| Command         | What it does                       |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start the dev server               |
| `npm run build` | Production build                   |
| `npm start`     | Serve the production build         |
| `npm run lint`  | Lint with ESLint                   |

## Stack

Next.js 16 (App Router) and React 19, TypeScript, Tailwind v4. No component or icon libraries. See [`AGENTS.md`](./AGENTS.md) for architecture and conventions.
