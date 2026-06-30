"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cleanUrl } from "@/lib/wayback";
import Icon from "./Icon";

// The machine's address bar: always an editable input showing the current site. Enter
// teleports to whatever's typed; Esc or clicking away reverts to the current site.
export default function Tab({ url }: { url: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(url);

  function commit() {
    const q = cleanUrl(value);
    if (!q || q === cleanUrl(url)) {
      setValue(url);
      return;
    }
    router.push(`/${encodeURI(q)}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        commit();
        inputRef.current?.blur();
      }}
      className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-elevated/70 px-4 py-2 backdrop-blur-md transition-colors duration-[var(--dur)] ease-snap hover:border-fg/20 focus-within:border-fg/30"
    >
      <input
        ref={inputRef}
        inputMode="url"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Site URL"
        placeholder="stripe.com"
        // Size to the value so the pill hugs the URL and grows as it gets longer.
        size={value.length || "stripe.com".length}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setValue(url)}
        onKeyDown={(e) => {
          // Keep typing (esc, arrows) from reaching the machine's keyboard shortcuts.
          e.stopPropagation();
          if (e.key === "Escape") {
            setValue(url);
            e.currentTarget.blur();
          }
        }}
        className="min-w-0 max-w-[60vw] bg-transparent text-sm text-fg outline-none placeholder:text-faint"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear"
          // Keep focus on the input (no blur-revert) so clearing leaves it ready to type.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          className="grid shrink-0 place-items-center rounded-full text-faint transition-colors duration-[var(--dur)] ease-snap hover:text-fg focus-visible:text-fg"
        >
          <Icon name="close" className="size-3" />
        </button>
      )}
    </form>
  );
}
