import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/ui/cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent h-5 px-1.5 text-xs leading-4 font-medium whitespace-nowrap transition-[color,background-color,border-color] aria-invalid:border-sev-critical [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-foreground",
        outline: "border-border-strong bg-background text-text-2",
        id: "id border-border bg-subtle text-text-2",
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-sev-critical-solid text-on-solid",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
