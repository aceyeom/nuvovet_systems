"use client";
import * as React from "react"
import { cn } from "@/ui/cn"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { toggleVariants } from "@/ui/primitives/toggle"

const ToggleGroupContext = React.createContext({
  size: "default",
  variant: "default",
  spacing: 0,
})

function ToggleGroup({
  className,
  variant: variantProp,
  size = "default",
  spacing: spacingProp,
  children,
  ...props
}) {
  // The grey segmented track means "pick one". A multi-select group defaults to separate bordered
  // items that wrap (design review P1-19); pass variant="default" to force the track.
  const variant = variantProp ?? (props.type === "multiple" ? "outline" : "default")
  const spacing = spacingProp ?? (variant === "outline" && props.type === "multiple" ? 2 : 0)
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      style={{
        "--gap": spacing
      }}
      className={cn(
        "group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[variant=default]:bg-segment data-[variant=default]:p-0.5 data-[variant=outline]:data-[spacing=2]:flex-wrap",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}) {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10",
        "data-[variant=default]:rounded-sm data-[variant=default]:h-7 data-[variant=default]:data-[size=sm]:h-6 data-[variant=default]:touch:min-h-9 data-[spacing=0]:data-[variant=outline]:rounded-none data-[spacing=0]:data-[variant=outline]:first:rounded-l-md data-[spacing=0]:data-[variant=outline]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
