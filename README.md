# Teleport

A time machine for the web. Drop a URL and watch it evolve, version by version, each one stacked like windows in time.

<img width="3562" height="1968" alt="og" src="https://github.com/user-attachments/assets/1f06a7f3-2e82-42f3-8a4e-4a1cd76e3716" />

## How it works

- Builds a timeline from the Internet Archive by probing the Availability API across a site's whole lifespan, capped to a scroll-free set of versions spanning its full history.
- Loads the whole timeline up front, then opens the machine on every version at once.
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

Next.js 16 (App Router) and React 19, TypeScript, Tailwind v4. See [`AGENTS.md`](./AGENTS.md) for architecture and conventions.
