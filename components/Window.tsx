"use client";

import { ReactNode, useRef, useState } from "react";
import { Snapshot, embedUrl } from "@/lib/wayback";
import Icon from "./Icon";

type Props = {
  snapshot: Snapshot;
  url: string;
  active: boolean;
  visited: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
};

export default function Window({ snapshot, url, active, visited, expanded, onToggleExpand }: Props) {
  // Once visited, the iframe stays mounted (even while inactive) so the page stays loaded.
  if (visited) {
    return (
      <Frame snapshot={snapshot} url={url} active={active} expanded={expanded} onToggleExpand={onToggleExpand} />
    );
  }

  return (
    <Shell url={url} date={snapshot.date} expanded={expanded}>
      <div className="grid h-full place-items-center">
        <span className="nums text-7xl font-semibold tracking-tighter text-faint/40">{snapshot.year}</span>
      </div>
    </Shell>
  );
}

type Nav = {
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  onToggleExpand?: () => void;
  canBack?: boolean;
  canForward?: boolean;
};

function Frame({
  snapshot,
  url,
  active,
  expanded,
  onToggleExpand,
}: {
  snapshot: Snapshot;
  url: string;
  active: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [nonce, setNonce] = useState(0);
  // Browsing depth within this window, tracked through load events so back/forward stay
  // scoped here and back can never step out of the app.
  const [pos, setPos] = useState(0);
  const [max, setMax] = useState(0);
  const loads = useRef(0);
  const programmatic = useRef(false);

  function onLoad() {
    setLoaded(true);
    loads.current += 1;
    if (loads.current <= 1 || programmatic.current) {
      programmatic.current = false;
      return;
    }
    setPos(pos + 1);
    setMax(pos + 1);
  }

  function refresh() {
    setNonce(nonce + 1);
    setLoaded(false);
    setPos(0);
    setMax(0);
    loads.current = 0;
    programmatic.current = false;
  }
  function back() {
    if (pos === 0) return;
    programmatic.current = true;
    setPos(pos - 1);
    window.history.back();
  }
  function forward() {
    if (pos >= max) return;
    programmatic.current = true;
    setPos(pos + 1);
    window.history.forward();
  }

  return (
    <Shell
      url={url}
      date={snapshot.date}
      expanded={active && expanded}
      onBack={active ? back : undefined}
      onForward={active ? forward : undefined}
      onReload={active ? refresh : undefined}
      onToggleExpand={active ? onToggleExpand : undefined}
      canBack={active && pos > 0}
      canForward={active && pos < max}
    >
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center bg-surface">
          <span className="label animate-pulse text-faint">Rematerializing {snapshot.year}…</span>
        </div>
      )}
      <iframe
        key={nonce}
        src={embedUrl(snapshot.timestamp, url)}
        title={`${url} in ${snapshot.year}`}
        className="size-full"
        onLoad={onLoad}
        // The active window runs the captured page's own JS (so runtime theming, layout, and
        // hydration land closer to the real thing); inactive windows stay static. Windows
        // first mount while active, so the page loads with scripts. We never grant
        // allow-top-navigation, so frame-busting attempts can't break out of the app.
        sandbox={
          active
            ? "allow-scripts allow-same-origin allow-popups allow-forms"
            : "allow-same-origin allow-popups allow-forms"
        }
      />
    </Shell>
  );
}

function Shell({
  url,
  date,
  expanded,
  onBack,
  onForward,
  onReload,
  onToggleExpand,
  canBack = false,
  canForward = false,
  children,
}: Nav & {
  url: string;
  date: string;
  expanded: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden border bg-surface shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)] transition-[border-radius,border-color] duration-[440ms] ease-snap ${
        expanded ? "rounded-none border-transparent" : "rounded-2xl border-border"
      }`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-elevated px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <span className="hidden gap-2 sm:flex" aria-hidden>
          <span className="size-3 rounded-full bg-fg/55" />
          <span className="size-3 rounded-full bg-fg/30" />
          <span className="size-3 rounded-full bg-fg/15" />
        </span>
        <span className="flex shrink-0 items-center gap-0.5">
          <Chrome name="left" label="Back" onClick={onBack} disabled={!canBack} />
          <Chrome name="right" label="Forward" onClick={onForward} disabled={!canForward} />
          <Chrome name="refresh" label="Reload" onClick={onReload} />
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md bg-surface px-3 py-1.5 text-xs text-muted">
          <span className="truncate">{url}</span>
          <span className="nums shrink-0 text-faint">·</span>
          <span className="nums shrink-0 text-faint">{date}</span>
        </span>
        <span className="flex shrink-0 items-center">
          <Chrome
            name={expanded ? "shrink" : "expand"}
            label={expanded ? "Exit fullscreen" : "Fullscreen"}
            onClick={onToggleExpand}
          />
        </span>
      </header>
      <div className="relative min-h-0 flex-1 bg-surface">{children}</div>
    </div>
  );
}

function Chrome({
  name,
  label,
  onClick,
  disabled,
}: {
  name: "left" | "right" | "refresh" | "expand" | "shrink";
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-8 select-none place-items-center rounded-md text-muted transition-colors duration-[var(--dur)] ease-snap hover:bg-surface hover:text-fg focus-visible:bg-surface focus-visible:text-fg disabled:pointer-events-none disabled:opacity-30 sm:size-7"
    >
      <Icon name={name} className="size-3.5" />
    </button>
  );
}
