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
    'flex flex-col items-center justify-center text-center bg-card border border-dashed border-border rounded-2xl',
    compact ? 'py-7 px-4 space-y-2.5' : 'py-12 px-6 space-y-3',
    className
  )}>
    <div className={cn('rounded-2xl bg-primary/10 text-primary grid place-items-center', compact ? 'w-11 h-11' : 'w-14 h-14')}>
      {icon}
    </div>
    <div className="space-y-1">
      <p className={cn('font-serif font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>{title}</p>
      {description && (
        <p className={cn('text-muted-foreground leading-relaxed mx-auto', compact ? 'text-[11px] max-w-[30ch]' : 'text-xs max-w-[36ch]')}>
          {description}
        </p>
      )}
    </div>
    {action && <div className="pt-1.5">{action}</div>}
  </div>
);
