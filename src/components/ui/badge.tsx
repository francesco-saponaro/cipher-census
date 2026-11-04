import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils.ts";

const badgeVariants = cva(
  "inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--pill-neutral-bg)] text-[var(--pill-neutral-ink)]",
        positive: "bg-[var(--pill-positive-bg)] text-[var(--pill-positive-ink)]",
        negative: "bg-[var(--pill-negative-bg)] text-[var(--pill-negative-ink)]",
        warning: "bg-[var(--pill-warning-bg)] text-[var(--pill-warning-ink)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
