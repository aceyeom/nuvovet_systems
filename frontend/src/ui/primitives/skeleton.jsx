import { cn } from "@/ui/cn"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      data-skeleton=""
      aria-hidden="true"
      className={cn("rounded-md bg-muted motion-safe:animate-shimmer motion-safe:bg-[length:200%_100%] motion-safe:bg-[linear-gradient(90deg,var(--muted)_25%,color-mix(in_oklab,var(--muted)_40%,var(--background))_50%,var(--muted)_75%)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
