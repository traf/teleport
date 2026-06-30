import { ReactNode } from "react";

// The rounded-square chrome box used for the logo and the social links.
export default function Badge({
  href,
  label,
  external,
  className = "",
  children,
}: {
  href: string;
  label: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={`grid size-9 shrink-0 select-none place-items-center rounded-xl border border-border bg-elevated/70 text-muted backdrop-blur-md transition-colors duration-[var(--dur)] ease-snap hover:border-fg/25 hover:text-fg focus-visible:text-fg ${className}`}
    >
      {children}
    </a>
  );
}
