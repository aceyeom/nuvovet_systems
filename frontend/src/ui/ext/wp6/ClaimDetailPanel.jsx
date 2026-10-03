/**
 * ClaimDetailPanel (WP6, §5.3): the non-modal side panel of the queue at `wide:` (≥ 1440 px).
 * 720 px on the right, border-l, no backdrop, role="region", aria-label="청구 상세". The queue stays usable:
 * Tab leaves the panel; Esc (handled by the queue) closes it and returns focus to the row.
 */
import { X } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/primitives/button'

export function ClaimDetailPanel({ onClose, actions, footer, children, className, ...props }) {
  return (
    <aside
      role="region"
      aria-label="청구 상세"
      className={cn(
        'sticky top-12 flex h-[calc(100dvh-3rem)] shrink-0 flex-col border-l border-border bg-background',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-200',
        className,
      )}
      style={{ width: 720 }}
      {...props}
    >
      <div className="flex h-10 shrink-0 items-center justify-end gap-1 border-b border-border px-3">
        {actions}
        <Button variant="ghost" size="icon-sm" aria-label="패널 닫기" title="패널 닫기 (Esc)" onClick={onClose}>
          <X strokeWidth={1.5} />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-5">{children}</div>
      {footer}
    </aside>
  )
}
