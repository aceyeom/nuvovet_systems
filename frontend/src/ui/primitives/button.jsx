import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/ui/cn"
import { Slot } from "radix-ui"
import { LoaderCircle } from "lucide-react"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity] duration-100 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-sev-critical [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover",
        destructive:
          "bg-sev-critical-solid text-on-solid hover:bg-sev-critical-solid/90 active:bg-sev-critical-solid/90",
        outline:
          "border border-input bg-background text-foreground hover:bg-row-hover active:bg-row-pressed",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-row-pressed active:bg-row-pressed",
        ghost:
          "text-foreground hover:bg-row-hover active:bg-row-pressed",
        link: "h-auto px-0 text-brand underline-offset-4 hover:text-brand-hover hover:underline",
      },
      size: {
        default: "h-8 touch:h-10 px-3 has-[>svg]:px-2.5",
        xs: "h-6 touch:h-10 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 touch:h-10 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2",
        lg: "h-10 rounded-md px-4 has-[>svg]:px-3",
        icon: "size-8 touch:size-10",
        "icon-xs": "size-6 touch:size-10 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 touch:size-10",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? children : (
        <>
          {loading ? <LoaderCircle aria-hidden="true" strokeWidth={1.5} className="motion-safe:animate-spin" /> : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
