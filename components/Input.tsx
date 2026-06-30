import { InputHTMLAttributes } from "react";

export default function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-fg caret-accent placeholder:text-faint transition-[border-color,box-shadow] duration-[var(--dur)] ease-snap focus:border-fg/60 focus:shadow-[0_0_0_4px_var(--glow)] focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
