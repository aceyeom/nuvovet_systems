"use client"

import * as React from "react"
import { cn } from "@/ui/cn"
import { useReturnFocus } from "@/ui/hooks/use-return-focus"
import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"

function Sheet({
  ...props
}) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-backdrop data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}) {
  const returnFocus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus })
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        onOpenAutoFocus={returnFocus.onOpenAutoFocus}
        onCloseAutoFocus={returnFocus.onCloseAutoFocus}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover shadow-modal transition-[color,background-color,border-color,opacity] ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-250",
          side === "right" &&
            "inset-y-0 right-0 h-full w-3/4 border-l motion-safe:data-[state=closed]:slide-out-to-right-4 motion-safe:data-[state=open]:slide-in-from-right-4 sm:max-w-sm",
          side === "left" &&
            "inset-y-0 left-0 h-full w-3/4 border-r motion-safe:data-[state=closed]:slide-out-to-left-4 motion-safe:data-[state=open]:slide-in-from-left-4 sm:max-w-sm",
          side === "top" &&
            "inset-x-0 top-0 h-auto border-b motion-safe:data-[state=closed]:slide-out-to-top-4 motion-safe:data-[state=open]:slide-in-from-top-4",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto border-t motion-safe:data-[state=closed]:slide-out-to-bottom-4 motion-safe:data-[state=open]:slide-in-from-bottom-4",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none data-[state=open]:bg-secondary">
            <XIcon className="size-4" />
            <span className="sr-only">닫기</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
