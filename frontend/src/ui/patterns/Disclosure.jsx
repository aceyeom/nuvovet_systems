import { ChevronRight } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/primitives/collapsible'

/** Vendored Collapsible with a button[aria-expanded] header row (chevron, 150 ms). */
export function Disclosure({ title, meta, defaultOpen = false, open, onOpenChange, className, children }) {
  return (
    <Collapsible defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange} className={cn('group/disclosure', className)}>
      <CollapsibleTrigger className="flex h-9 w-full items-center gap-2 rounded-md text-left text-sm font-medium text-foreground hover:bg-row-hover">
        <ChevronRight
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]/disclosure:rotate-90"
        />
        <span className="flex-1">{title}</span>
        {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pl-6">{children}</CollapsibleContent>
    </Collapsible>
  )
}
