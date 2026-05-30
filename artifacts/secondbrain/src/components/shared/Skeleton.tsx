import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn('animate-pulse rounded bg-muted/60', className)} />
);

export const ItemCardSkeleton = () => (
  <div className="bg-card border rounded-xl p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full shrink-0" />
    </div>
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-5/6" />
    <div className="flex gap-2 pt-1 border-t border-border/40">
      <Skeleton className="h-7 w-16 rounded-lg" />
      <Skeleton className="h-7 w-16 rounded-lg" />
      <Skeleton className="h-7 w-16 rounded-lg ml-auto" />
    </div>
  </div>
);

export const SourceCardSkeleton = () => (
  <div className="bg-card border rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-12 rounded-full" />
    </div>
    <div className="flex gap-1.5">
      <Skeleton className="h-5 w-16 rounded" />
      <Skeleton className="h-5 w-20 rounded" />
      <Skeleton className="h-5 w-14 rounded" />
    </div>
    <Skeleton className="h-2 w-full rounded-full" />
  </div>
);
