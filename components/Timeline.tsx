"use client";

import { Snapshot } from "@/lib/wayback";

type Props = {
  snapshots: Snapshot[];
  index: number;
  onSelect: (index: number) => void;
};

export default function Timeline({ snapshots, index, onSelect }: Props) {
  return (
    <nav aria-label="Snapshot versions" className="flex max-h-[82dvh] flex-col overflow-y-auto">
      <ul className="flex flex-col">
        {snapshots.map((snap, i) => {
          const active = i === index;
          return (
            <li key={snap.timestamp}>
              <button
                onClick={() => onSelect(i)}
                aria-current={active}
                className="group flex w-full select-none items-center gap-3 py-1.5 pr-1 transition-opacity duration-[var(--dur)] ease-snap focus-visible:outline-none"
              >
                <span
                  className={`h-px transition-all duration-[var(--dur)] ease-snap ${
                    active ? "w-8 bg-accent" : "w-4 bg-border group-hover:w-6 group-hover:bg-muted"
                  }`}
                />
                <span
                  className={`nums label whitespace-nowrap transition-colors duration-[var(--dur)] ease-snap ${
                    active ? "text-accent" : "text-faint group-hover:text-muted"
                  }`}
                >
                  {snap.date}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
