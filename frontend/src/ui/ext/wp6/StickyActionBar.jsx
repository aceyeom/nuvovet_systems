/** StickyActionBar (WP6, §4.2): h-14, hairline top, flat (no blur), sticky at the bottom. */
import { cn } from '@/ui/cn'

export function StickyActionBar({ className, children, ...props }) {
  return (
    <div
      role="toolbar"
      className={cn('sticky bottom-0 z-[var(--z-sticky)] flex h-14 shrink-0 items-center gap-2 border-t border-border bg-background px-6 max-sm:px-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}
