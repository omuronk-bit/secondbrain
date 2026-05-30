import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export const EmptyState = ({ icon, title, description, action, className, compact }: Props) => (
  <div className={cn(
    'flex flex-col items-center justify-center text-center bg-card border border-border/60 rounded-xl',
    compact ? 'py-6 px-4 space-y-2' : 'py-10 px-6 space-y-3',
    className
  )}>
    <div className="p-2.5 bg-muted/60 rounded-full text-muted-foreground/60">
      {icon}
    </div>
    <div className="space-y-1">
      <p className={cn('font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>{title}</p>
      {description && (
        <p className={cn('text-muted-foreground leading-relaxed', compact ? 'text-[11px]' : 'text-xs')}>
          {description}
        </p>
      )}
    </div>
    {action && <div className="pt-1">{action}</div>}
  </div>
);
