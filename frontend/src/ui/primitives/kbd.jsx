import { cn } from "@/ui/cn"

function Kbd({
  className,
  ...props
}) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm border border-border-strong bg-subtle px-1 font-sans text-xs id text-muted-foreground select-none",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:border-transparent [[data-slot=tooltip-content]_&]:bg-primary-foreground/20 [[data-slot=tooltip-content]_&]:text-primary-foreground",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({
  className,
  ...props
}) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
