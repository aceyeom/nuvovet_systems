import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/ui/cn"

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        neutral: "border-[color-mix(in_oklab,var(--sev-minor)_28%,transparent)] bg-sev-minor-bg text-foreground [&>svg]:text-sev-minor",
        warning: "border-[color-mix(in_oklab,var(--sev-moderate)_28%,transparent)] bg-sev-moderate-bg text-foreground [&>svg]:text-sev-moderate",
        critical: "border-[color-mix(in_oklab,var(--sev-critical)_28%,transparent)] bg-sev-critical-bg text-foreground [&>svg]:text-sev-critical",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Alert({
  className,
  variant = "neutral",
  ...props
}) {
  return (
    <div
      data-slot="alert"
      data-status={variant}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({
  className,
  ...props
}) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-text-2",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
