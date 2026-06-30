"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Snapshot, cleanUrl } from "@/lib/wayback";
import Input from "./Input";
import Button from "./Button";
import Nav from "./Nav";
import Machine from "./Machine";

// Sites that embed cleanly and have a quick, well-defined version history.
const EXAMPLES = ["stripe.com", "tailwindcss.com", "vercel.com"];

export default function Teleport() {
  const params = useParams<{ slug?: string[] }>();
  const router = useRouter();
  // The path is the source of truth: `/stripe.com` → teleport, `/` → the form.
  const slug = params.slug?.join("/") ?? "";

  const [url, setUrl] = useState(slug);
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      setSnapshots(null);
      setUrl("");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setUrl(slug);
    setSnapshots(null);
    setLoading(true);
    setError("");
    fetch(`/api/snapshots?url=${encodeURIComponent(slug)}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) throw new Error(body.error ?? "Something went wrong");
        setSnapshots(body.snapshots);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Something went wrong");
        router.replace("/");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  // Teleporting is just navigation — it makes every result a shareable URL.
  function go(target: string) {
    const q = cleanUrl(target);
    if (!q || loading) return;
    router.push(`/${encodeURI(q)}`);
  }

  if (snapshots) {
    return <Machine url={url} snapshots={snapshots} onExit={() => router.push("/")} />;
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
