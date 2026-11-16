import type { HTMLAttributes } from "react";

import { cn } from "@/lib/format";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        className,
      )}
      {...props}
    />
  );
}
