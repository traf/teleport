"use client";

import { useCallback, useEffect, useState } from "react";
import { Snapshot } from "@/lib/wayback";
import Window from "./Window";
import Timeline from "./Timeline";
import Icon from "./Icon";

type Props = {
  url: string;
  snapshots: Snapshot[];
  loadingMore?: boolean;
  onExit: () => void;
};

export default function Machine({ url, snapshots, loadingMore, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  // Windows keep their iframe mounted once visited, so returning to one is instant and its
  // scroll and history are preserved instead of reloading from scratch.
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const last = snapshots.length - 1;

  const go = useCallback((next: number) => {
    const clamped = Math.min(last, Math.max(0, next));
    setIndex(clamped);
    setVisited((seen) => (seen.has(clamped) ? seen : new Set(seen).add(clamped)));
  }, [last]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (expanded) setExpanded(false);
        else onExit();
      } else if (expanded) return;
      else if (e.key === "ArrowUp") go(index - 1);
      else if (e.key === "ArrowDown") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, onExit, expanded]);

  const chrome = `transition-opacity duration-[440ms] ease-snap ${
    expanded ? "pointer-events-none opacity-0" : "opacity-100"
  }`;

  return (
    <main className="cosmos relative h-dvh w-screen overflow-hidden">
      <header className={`absolute inset-x-0 top-0 z-50 flex items-start p-4 sm:p-5 ${chrome}`}>
        <button
          onClick={onExit}
          className="flex min-w-0 select-none items-center gap-2 rounded-full border border-border bg-elevated/70 px-3 py-2 text-sm text-muted backdrop-blur-md transition-colors duration-[var(--dur)] ease-snap hover:text-fg focus-visible:text-fg"
        >
          <Icon name="close" className="size-3.5 shrink-0" />
          <span className="truncate max-w-[40vw]">{url}</span>
        </button>
      </header>

      <div className={`absolute inset-0 grid place-items-center [perspective:2600px] ${expanded ? "z-[60]" : ""}`}>
        <div
          className={`relative [transform-style:preserve-3d] transition-[width,height] duration-[440ms] ease-snap ${
            expanded ? "h-dvh w-screen" : "h-[68dvh] w-[92vw] sm:h-[72dvh] sm:w-[min(1150px,86vw)]"
          }`}
        >
          {snapshots.map((snap, i) => {
            const d = i - index;
            const older = d >= 0;
            const ty = older ? -d * 58 : -d * 88;
            const tz = older ? -d * 190 : -d * 360;
            const opacity = expanded ? (d === 0 ? 1 : 0) : older ? Math.max(0, 1 - d * 0.24) : 0;
            const blur = expanded || !older ? 0 : Math.min(d * 0.6, 3);
            return (
              <div
                key={snap.timestamp}
                className="absolute inset-0 transition-[transform,opacity,filter] duration-[440ms] ease-snap"
                style={{
                  transform: `translate3d(0, ${ty}px, ${tz}px)`,
                  opacity,
                  filter: `blur(${blur}px)`,
                  zIndex: 100 - Math.abs(d),
                  pointerEvents: d === 0 ? "auto" : "none",
                }}
                aria-hidden={d !== 0}
              >
                <Window
                  snapshot={snap}
                  url={url}
                  active={d === 0}
                  visited={visited.has(i)}
                  expanded={expanded}
                  onToggleExpand={() => setExpanded((e) => !e)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className={`absolute right-5 top-1/2 z-50 hidden -translate-y-1/2 sm:block ${chrome}`}>
        <Timeline snapshots={snapshots} index={index} onSelect={go} />
      </div>

      <div
        className={`absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-elevated/70 p-1 backdrop-blur-md ${chrome}`}
      >
        <Control label="Newer" disabled={index === 0} onClick={() => go(index - 1)} icon="up" />
        <span className="nums px-2 text-xs text-faint">
          {index + 1} / {snapshots.length}
        </span>
        <Control label="Older" disabled={index === last} onClick={() => go(index + 1)} icon="down" />
      </div>

      {loadingMore && (
        <p className={`absolute bottom-[4.75rem] left-1/2 z-50 -translate-x-1/2 label animate-pulse text-faint ${chrome}`}>
          summoning older versions…
        </p>
      )}
    </main>
  );
}

function Control({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: "up" | "down";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 select-none place-items-center rounded-full text-muted transition-colors duration-[var(--dur)] ease-snap hover:bg-surface hover:text-fg focus-visible:bg-surface focus-visible:text-fg disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon name={icon} />
    </button>
  );
}
