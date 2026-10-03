import { Inbox } from 'lucide-react'
import { cn } from '@/ui/cn'

/** A 20 px icon, one line that says what is missing, one action (§4.7). */
export function EmptyState({ icon: Icon = Inbox, title, action, className, ...props }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)} {...props}>
      <Icon aria-hidden="true" strokeWidth={1.5} className="size-5 text-muted-foreground" />
      <p className="text-sm text-text-2">{title}</p>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
