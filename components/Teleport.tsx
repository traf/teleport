"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Snapshot, cleanUrl } from "@/lib/wayback";
import Input from "./Input";
import Button from "./Button";
import Nav from "./Nav";
import Machine from "./Machine";
import Tab from "./Tab";

// Sites that embed cleanly and have a quick, well-defined version history.
const EXAMPLES = ["stripe.com", "tailwindcss.com", "vercel.com"];

// A trailing `/jan-2020` segment pins an exact version; everything before it is the site.
const VERSION = /^[a-z]{3}-\d{4}$/i;
const tokenFor = (date: string) => date.toLowerCase().replace(" ", "-");

export default function Teleport() {
  const params = useParams<{ slug?: string[] }>();
  const router = useRouter();
  // The path is the source of truth: `/stripe.com` → teleport, `/stripe.com/jan-2020` → that
  // version, `/` → the form.
  const segments = params.slug ?? [];
  const hasVersion = segments.length >= 2 && VERSION.test(segments[segments.length - 1]);
  const version = hasVersion ? segments[segments.length - 1].toLowerCase() : "";
  const site = (hasVersion ? segments.slice(0, -1) : segments).join("/");

  const [url, setUrl] = useState(site);
  // Two phases: `latest` paints a window in ~1s; `full` is the whole timeline behind it.
  const [latest, setLatest] = useState<Snapshot | null>(null);
  const [full, setFull] = useState<Snapshot[] | null>(null);
  const [loading, setLoading] = useState(Boolean(site));
  const [error, setError] = useState("");
  const gotLatest = useRef(false);

  useEffect(() => {
    if (!site) {
      setLatest(null);
      setFull(null);
      setUrl("");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setUrl(site);
    setLatest(null);
    setFull(null);
    setLoading(true);
    setError("");
    gotLatest.current = false;

    // Fast path: newest capture only, so a window paints almost immediately. Skipped when a
    // version is pinned — we'd just have to jump off it once the full timeline lands.
    if (!version) {
      fetch(`/api/latest?url=${encodeURIComponent(site)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d?.snapshot) return;
          gotLatest.current = true;
          setLatest(d.snapshot);
        })
        .catch(() => {});
    }

    // Full timeline in parallel.
    fetch(`/api/snapshots?url=${encodeURIComponent(site)}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) throw new Error(body.error ?? "Something went wrong");
        setFull(body.snapshots);
      })
      .catch((e) => {
        if (cancelled || gotLatest.current) return; // keep the fast window if we have one
        setError(e instanceof Error ? e.message : "Something went wrong");
        router.replace("/");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [site, version, router]);

  // Merge keeps the fast latest pinned at the top (no reload) and the history behind it.
  const snapshots = useMemo(() => {
    if (full && latest) {
      const sameMonth = full[0]?.timestamp.slice(0, 6) === latest.timestamp.slice(0, 6);
      return sameMonth ? [latest, ...full.slice(1)] : [latest, ...full];
    }
    return full ?? (latest ? [latest] : null);
  }, [full, latest]);

  // Open on the version pinned in the URL (`/site/jan-2020`), else the newest.
  const initialIndex = useMemo(() => {
    if (!snapshots || !version) return 0;
    const i = snapshots.findIndex((s) => tokenFor(s.date) === version);
    return i >= 0 ? i : 0;
  }, [snapshots, version]);

  // Keep the URL in sync with the open version without a full navigation: bare domain for the
  // newest, `/site/jan-2020` for any older one. Shareable and reload-safe.
  const syncUrl = useCallback(
    (i: number) => {
      const snap = snapshots?.[i];
      const href = !snap || i <= 0 ? `/${site}` : `/${site}/${tokenFor(snap.date)}`;
      window.history.replaceState(null, "", encodeURI(href));
    },
    [snapshots, site],
  );

  // Teleporting is just navigation — it makes every result a shareable URL.
  function go(target: string) {
    const q = cleanUrl(target);
    if (!q || loading) return;
    router.push(`/${encodeURI(q)}`);
  }

  if (snapshots) {
    return (
      <Machine
        url={url}
        snapshots={snapshots}
        initialIndex={initialIndex}
        onIndex={syncUrl}
        onExit={() => router.push("/")}
      />
    );
  }

  // A deep link (or in-flight teleport) lands on the machine view with a loading state,
  // never the home form. Errors bounce back to `/`, so a live site here means "still loading".
  if (site) {
    return <Loading url={url || site} />;
  }

  return (
    <main className="cosmos relative grid min-h-dvh place-items-center px-6">
      <Nav />
      <p className="label absolute bottom-5 left-1/2 -translate-x-1/2 text-faint">
        powered by{" "}
        <a
          href="https://web.archive.org"
          target="_blank"
          rel="noreferrer"
          className="text-muted transition-colors duration-[var(--dur)] ease-snap hover:text-fg focus-visible:text-fg"
        >
          wayback machine
        </a>
      </p>
      <div className="w-full max-w-md text-center">
        <h1 className="title text-fg">Teleport</h1>
        <p className="tagline mt-4">A time machine for the web.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(url);
          }}
          className="mt-9 flex flex-col gap-2.5 sm:flex-row"
        >
          <Input
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
            disabled={loading}
            placeholder="stripe.com"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
            className={error ? "border-fg [animation:shake_300ms]" : ""}
          />
          <Button type="submit" disabled={loading} className="sm:w-auto">
            {loading ? "Teleporting…" : "Teleport"}
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={loading}
              onClick={() => go(ex)}
              className="rounded-full border border-border bg-elevated/60 px-3 py-1.5 label text-muted backdrop-blur-sm transition-colors duration-[var(--dur)] ease-snap hover:border-fg/25 hover:text-fg focus-visible:text-fg disabled:pointer-events-none disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>

        <p className="mt-3 h-5 text-sm text-muted" role="status">
          {error}
        </p>
      </div>
    </main>
  );
}

// The machine view while the timeline is still being assembled: same chrome, an empty window.
function Loading({ url }: { url: string }) {
  return (
    <main className="cosmos relative h-dvh w-screen overflow-hidden">
      <Nav left={<Tab key={url} url={url} />} />
      <div className="absolute inset-0 grid place-items-center [perspective:2600px]">
        <div className="relative translate-y-3 h-[68dvh] w-[92vw] sm:translate-y-4 sm:h-[72dvh] sm:w-[min(1150px,86vw)]">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)]">
            <header className="flex shrink-0 items-center gap-2 border-b border-border bg-elevated px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
              <span className="hidden gap-2 sm:flex" aria-hidden>
                <span className="size-3 rounded-full bg-fg/55" />
                <span className="size-3 rounded-full bg-fg/30" />
                <span className="size-3 rounded-full bg-fg/15" />
              </span>
              <span className="flex min-w-0 flex-1 items-center justify-center rounded-md bg-surface px-3 py-1.5 text-xs text-muted">
                <span className="truncate">{url}</span>
              </span>
            </header>
            <div className="grid min-h-0 flex-1 place-items-center bg-surface">
              <span className="label animate-pulse text-faint">Scanning the archive…</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
