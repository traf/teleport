import { ReactNode } from "react";
import Mark from "./Mark";
import Badge from "./Badge";
import Icon from "./Icon";

// The top bar shared by the home and machine screens: brand mark on the left (plus any
// page-specific control passed in), social links on the right.
export default function Nav({ left, className = "" }: { left?: ReactNode; className?: string }) {
  return (
    <header className={`absolute inset-x-0 top-0 z-50 flex items-center justify-between gap-2.5 p-4 sm:p-5 ${className}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <Mark />
        {left}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <Badge href="https://github.com/traf/teleport" label="GitHub" external>
          <Icon name="github" className="size-4" />
        </Badge>
        <Badge href="https://x.com/traf" label="X" external>
          <Icon name="x" className="size-4" />
        </Badge>
      </div>
    </header>
  );
}
