import { cn } from '@/ui/cn'

/** Lowercase "nuvovet" in Pretendard 700 at −0.03em, optional muted product suffix (§4.8). No icon tile. */
export function Logo({ product, size = 16, className, ...props }) {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 whitespace-nowrap', size === 20 ? 'text-xl' : 'text-lg', className)} {...props}>
      <span className="font-bold tracking-[-0.03em] text-foreground">nuvovet</span>
      {product ? <span className="text-sm font-medium text-muted-foreground">{product}</span> : null}
    </span>
  )
}
