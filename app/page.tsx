"use client";

import { useState } from "react";
import { Snapshot } from "@/lib/wayback";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import Machine from "@/components/Machine";

export default function Home() {
  const [url, setUrl] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  async function teleport(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      // Phase 1: open instantly on the latest snapshot.
      const res = await fetch(`/api/latest?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setSnapshots([data.snapshot]);

      // Phase 2: fill in older versions from the slower full history.
      setLoadingMore(true);
      fetch(`/api/snapshots?url=${encodeURIComponent(url)}`)
        .then(async (r) => ({ ok: r.ok, body: await r.json() }))
        .then(({ ok, body }) => {
          if (ok && Array.isArray(body.snapshots) && body.snapshots.length > 1) {
            // Keep the already-loaded latest at the front; append the older versions.
            setSnapshots((prev) => (prev ? [prev[0], ...body.snapshots.slice(1)] : body.snapshots));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingMore(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (snapshots) {
    return (
      <Machine
        url={url}
        snapshots={snapshots}
        loadingMore={loadingMore}
        onExit={() => {
          setSnapshots(null);
          setLoadingMore(false);
        }}
      />
    );
  }

  return (
    <main className="cosmos relative grid min-h-dvh place-items-center px-6">
      <Logo className="absolute left-5 top-5 size-9" />
      <div className="w-full max-w-xl text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-elevated/60 px-3 py-1.5 label text-muted backdrop-blur-sm">
          <Icon name="bolt" className="size-3.5 text-accent" />
          a time machine for the web
        </span>
        <h1 className="title text-fg">Teleport</h1>
        <p className="tagline mx-auto mt-4 max-w-md">
          Drop any URL and watch it evolve, year by year.
        </p>

        <form onSubmit={teleport} className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Input
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
            placeholder="apple.com"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
            className={error ? "border-fg [animation:shake_300ms]" : ""}
          />
          <Button type="submit" disabled={loading} className="sm:w-auto">
            <Icon name="bolt" className="size-4" />
            {loading ? "Teleporting…" : "Teleport"}
          </Button>
        </form>

        <p className="mt-3 h-5 text-sm text-muted" role="status">
          {error}
        </p>
      </div>
    </main>
  );
}
