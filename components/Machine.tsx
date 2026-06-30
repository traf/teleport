"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Snapshot } from "@/lib/wayback";
import Window from "./Window";
import Timeline from "./Timeline";
import Icon from "./Icon";
import Nav from "./Nav";
import Tab from "./Tab";

type Props = {
  url: string;
  snapshots: Snapshot[];
  initialIndex?: number;
  onIndex?: (index: number) => void;
  onExit: () => void;
};

export default function Machine({ url, snapshots, initialIndex = 0, onIndex, onExit }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [expanded, setExpanded] = useState(false);
  // Windows keep their iframe mounted once visited, so returning to one is instant and its
  // scroll and history are preserved instead of reloading from scratch.
  const [visited, setVisited] = useState<Set<number>>(() => new Set([initialIndex]));
  const last = snapshots.length - 1;

  // Reflect the current version in the URL so any spot is shareable / reloadable.
  useEffect(() => {
    onIndex?.(index);
  }, [index, onIndex]);

  const rootRef = useRef<HTMLElement>(null);
  const wheel = useRef(0);
  const locked = useRef(false);

  const go = useCallback((next: number) => {
    const clamped = Math.min(last, Math.max(0, next));
    setIndex(clamped);
    setVisited((seen) => (seen.has(clamped) ? seen : new Set(seen).add(clamped)));
  }, [last]);

  // Trackpad/wheel scrolls through versions: accumulate delta, step once per threshold, then
  // brief-lock so a flick paces smoothly through the cascade instead of skipping a dozen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (expanded) return; // let the fullscreen page scroll itself
      e.preventDefault();
      if (locked.current) return;
      wheel.current += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      const STEP = 60;
      if (Math.abs(wheel.current) < STEP) return;
      const dir = wheel.current > 0 ? 1 : -1;
      wheel.current = 0;
      locked.current = true;
      setTimeout(() => (locked.current = false), 260);
      go(index + dir);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [index, expanded, go]);

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
    <main ref={rootRef} className="cosmos relative h-dvh w-screen overflow-hidden">
      <Nav className={chrome} left={<Tab key={url} url={url} />} />

      <div className={`absolute inset-0 grid place-items-center [perspective:2600px] ${expanded ? "z-[60]" : ""}`}>
        <div
          className={`relative [transform-style:preserve-3d] transition-[width,height] duration-[440ms] ease-snap ${
            expanded
              ? "h-dvh w-screen"
              : "translate-y-3 h-[68dvh] w-[92vw] sm:translate-y-4 sm:h-[72dvh] sm:w-[min(1150px,86vw)]"
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

      <div className={`absolute right-5 top-1/2 z-50 hidden -translate-y-1/2 min-[1440px]:block ${chrome}`}>
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
