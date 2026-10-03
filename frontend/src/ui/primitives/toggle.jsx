import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/ui/cn"
import { Toggle as TogglePrimitive } from "radix-ui"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color] border border-transparent text-muted-foreground hover:bg-row-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-sev-critical data-[state=on]:border-border-strong data-[state=on]:bg-segment-active data-[state=on]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        // Multi-select chips: every item bordered; "on" is an ink border (not a fill), so it never reads
        // as a single-choice segmented track (design review P1-19).
        outline:
          "border border-input bg-transparent text-text-2 hover:bg-row-hover data-[state=on]:border-foreground data-[state=on]:bg-background",
      },
      size: {
        default: "h-8 touch:h-10 min-w-8 px-2.5",
        sm: "h-7 touch:h-10 min-w-7 px-2",
        lg: "h-10 min-w-10 px-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
