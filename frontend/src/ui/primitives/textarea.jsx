import * as React from "react"
import { cn } from "@/ui/cn"

function Textarea({
  className,
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm touch:text-lg transition-[color,background-color,border-color] placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-sev-critical",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
