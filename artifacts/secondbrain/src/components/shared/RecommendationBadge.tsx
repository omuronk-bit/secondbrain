import { RecommendedAction, Confidence, ContentType } from '../../types';
import { cn } from '../../lib/utils';

interface Props {
  action: RecommendedAction;
  confidence?: Confidence;
  /** When set, deep_consume reads as Listen/Watch/Read and segment as Best part. */
  contentType?: ContentType;
  className?: string;
}

const CONFIG: Record<RecommendedAction, { label: string; cls: string }> = {
  skip:         { label: 'Skip',      cls: 'bg-muted text-muted-foreground border-border/60' },
  skim:         { label: 'Skim',      cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25' },
  segment:      { label: 'Segment',   cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25' },
  deep_consume: { label: 'Deep Read', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25' },
};

/** Content-aware label so deep_consume reads naturally per medium. */
export function actionLabel(action: RecommendedAction, contentType?: ContentType): string {
  if (action === 'deep_consume') {
    if (contentType === 'podcast') return 'Listen';
    if (contentType === 'youtube') return 'Watch';
    return 'Read';
  }
  if (action === 'segment') return 'Best part';
  return CONFIG[action]?.label ?? CONFIG.skip.label;
}

export const RecommendationBadge = ({ action, confidence = 'high', contentType, className }: Props) => {
  const { cls } = CONFIG[action] ?? CONFIG.skip;
  const label = actionLabel(action, contentType);
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap',
        cls,
        confidence === 'medium' && 'opacity-75',
        confidence === 'low'    && 'opacity-50 border-dashed',
        className
      )}
      data-testid={`badge-${action}`}
    >
      {label}
    </span>
  );
};
