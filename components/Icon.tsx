type Name = "up" | "down" | "left" | "right" | "close" | "bolt" | "refresh" | "expand" | "shrink";

const paths: Record<Name, string> = {
  up: "M5 14l7-7 7 7",
  down: "M19 10l-7 7-7-7",
  left: "M15 18l-6-6 6-6",
  right: "M9 6l6 6-6 6",
  close: "M6 6l12 12M18 6L6 18",
  bolt: "M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z",
  refresh: "M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6",
  expand: "M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3",
  shrink: "M3 8h3a2 2 0 0 0 2-2V3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M21 16h-3a2 2 0 0 0-2 2v3",
};

export default function Icon({ name, className = "size-4" }: { name: Name; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={name === "bolt" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}
