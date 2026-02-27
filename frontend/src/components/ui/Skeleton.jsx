// Skeleton loading components using Tailwind's animate-pulse

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
  )
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  )
}

export function SkeletonJobCard() {
  return (
    <div className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="w-6 h-6 rounded" />
        <Skeleton className="h-4 flex-1" />
      </div>
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-2 mt-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonKanbanColumn() {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 min-h-[500px] flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-3 h-3 rounded-full" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="space-y-3">
        <SkeletonJobCard />
        <SkeletonJobCard />
        <SkeletonJobCard />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="p-4 flex gap-4">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton key={colIdx} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonResumeItem() {
  return (
    <div className="flex items-center p-4 rounded-lg border border-slate-200 dark:border-slate-600">
      <Skeleton className="w-5 h-5 flex-shrink-0" />
      <div className="ml-4 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="flex gap-2 ml-2">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
      </div>
    </div>
  )
}

export function SkeletonDashboardCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  )
}
