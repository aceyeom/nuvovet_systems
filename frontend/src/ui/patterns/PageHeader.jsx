import { cn } from '@/ui/cn'

/** One page title per screen (text-xl 600) with optional meta line and right-aligned actions. */
export function PageHeader({ title, meta, actions, breadcrumb, className, as: H = 'h1', ...props }) {
  return (
    <header className={cn('flex flex-col gap-2', className)} {...props}>
      {breadcrumb}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <H className="text-xl font-semibold text-foreground">{title}</H>
          {meta ? <div className="text-sm text-muted-foreground">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
