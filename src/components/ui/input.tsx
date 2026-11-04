import type { ComponentProps } from "react";
import { cn } from "@/lib/utils.ts";

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-control border border-control bg-surface px-3 text-sm text-ink outline-none placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
