import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils.ts";

const buttonVariants = cva(
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control px-3 text-sm font-medium whitespace-nowrap transition-[background-color,transform] duration-150 outline-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-ink hover:bg-ink/90",
        outline: "border border-control bg-surface text-ink hover:bg-raised",
        ghost: "text-ink hover:bg-raised",
        link: "h-auto px-0 text-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-7 px-2 text-xs",
      },
    },
    defaultVariants: { variant: "outline", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
