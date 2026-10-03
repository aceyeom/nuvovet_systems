// Loading and error states shared by the console screens (skeletons mirror the final layout, §3.7).
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { Skeleton } from '@/ui/primitives/skeleton'
import { EmptyState } from '@/ui/patterns/EmptyState'
import { LOAD_ERROR } from '../strings.ko.js'

export function Page({ children, className = '' }) {
  return <div className={`flex min-w-0 flex-col gap-6 p-6 max-sm:p-4 ${className}`}>{children}</div>
}

export function PageSkeleton({ rows = 8 }) {
  return (
    <Page>
      <div data-skeleton="" className="flex flex-col gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div data-skeleton="" className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </Page>
  )
}

export function LoadError({ onRetry, title = LOAD_ERROR }) {
  return (
    <Page>
      <EmptyState icon={TriangleAlert} title={title} action={onRetry ? <Button variant="secondary" onClick={onRetry}>다시 불러오기</Button> : null} />
    </Page>
  )
}
