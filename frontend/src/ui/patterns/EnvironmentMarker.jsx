import { cn } from '@/ui/cn'
import { Badge } from '@/ui/primitives/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/primitives/tooltip'

/**
 * The only disclaimer on a screen (§4.7): an outline badge in the top bar ("합성 데이터" or
 * "교육용 프로토타입") with the full disclaimer in a tooltip.
 */
export function EnvironmentMarker({ label = '합성 데이터', tooltip, className }) {
  const badge = (
    <Badge variant="outline" tabIndex={tooltip ? 0 : undefined} className={cn('cursor-default', className)}>
      {label}
    </Badge>
  )
  if (!tooltip) return badge
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
