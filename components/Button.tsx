import { ButtonHTMLAttributes } from "react";

export default function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex select-none items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-fg transition-[transform,opacity] duration-[var(--dur)] ease-snap hover:opacity-90 focus-visible:shadow-[0_0_0_3px_var(--glow)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
