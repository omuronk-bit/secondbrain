import { useState } from 'react';
import { Bookmark, Star, X } from 'lucide-react';
import { Item, Source } from '../../types';
import { ActionControl } from '../shared/ActionControl';
import { ScoreDisplay } from '../shared/ScoreDisplay';
import { ContentIcon } from '../shared/ContentIcon';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { updateItemStatus } from '../../utils/storage';
import { toast } from '../../hooks/use-toast';

interface Props {
  item: Item;
  source?: Source;
  compact?: boolean;
  /** Controlled saved state — if undefined, component manages it locally and persists to localStorage */
  saved?: boolean;
  /** Controlled memo state */
  memo?: boolean;
  onAction?: (action: 'save' | 'dismiss' | 'memo', item: Item) => void;
}

export const ItemCard = ({ item, source, compact = false, saved: savedProp, memo: memoProp, onAction }: Props) => {
  const controlled = savedProp !== undefined;
  const [localSaved, setLocalSaved] = useState(item.status === 'saved');
  const [localMemo, setLocalMemo] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const isSaved = controlled ? savedProp : localSaved;
  const isMemo  = memoProp  !== undefined ? memoProp  : localMemo;

  const handleAction = (action: 'save' | 'dismiss' | 'memo') => {
    if (!controlled) {
      // Uncontrolled mode — manage local state and persist to localStorage directly
      if (action === 'save') {
        const next = !localSaved;
        setLocalSaved(next);
        updateItemStatus(item.id, next ? 'saved' : 'new');
        toast({ title: next ? 'Saved to Library' : 'Removed from saved' });
      } else if (action === 'dismiss') {
        setIsDismissed(true);
        updateItemStatus(item.id, 'dismissed');
        toast({ title: 'Dismissed' });
      } else if (action === 'memo') {
        setLocalMemo(m => !m);
      }
    }
    onAction?.(action, item);
  };

  if (isDismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      layout
      className={cn(
        'bg-card border rounded-xl p-4 space-y-3 shadow-sm transition-colors',
        isSaved && 'border-emerald-500/25 bg-emerald-50/20 dark:bg-emerald-950/10',
        isMemo  && !isSaved && 'border-amber-500/25 bg-amber-50/10 dark:bg-amber-950/10',
      )}
      data-testid={`item-card-${item.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <ContentIcon type={item.contentType} className="w-3.5 h-3.5" />
            <span className="truncate max-w-[140px]">{source?.name ?? item.creator}</span>
            {item.durationMinutes && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{item.durationMinutes}m</span>
              </>
            )}
          </div>
          <h3 className={cn('font-bold leading-snug text-foreground', compact ? 'text-sm' : 'text-[15px]')}>
            {item.title}
          </h3>
        </div>
        <ActionControl item={item} className="mt-0.5" />
      </div>

      <p className={cn('text-sm text-muted-foreground leading-relaxed', compact && 'line-clamp-2')}>
        {item.summary}
      </p>

      {!compact && (
        <>
          <div className="flex gap-2 rounded-lg bg-primary/5 border border-primary/12 px-3 py-2 text-xs">
            <span className="font-semibold text-primary shrink-0">Why:</span>
            <span className="text-primary/80 leading-snug">{item.whyRecommended}</span>
          </div>

          <ScoreDisplay
            relevance={item.relevanceScore}
            novelty={item.noveltyScore}
            importance={item.importanceScore}
          />

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
            <button
              onClick={() => handleAction('save')}
              aria-pressed={isSaved}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95',
                isSaved
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
              )}
            >
              <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-current')} />
              {isSaved ? 'Saved' : 'Save'}
            </button>

            <button
              onClick={() => handleAction('memo')}
              aria-pressed={isMemo}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95',
                isMemo
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
              )}
            >
              <Star className={cn('w-3.5 h-3.5', isMemo && 'fill-current')} />
              {isMemo ? 'In Memo' : 'Memo'}
            </button>

            <button
              onClick={() => handleAction('dismiss')}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-muted-foreground hover:text-destructive hover:bg-secondary/70 transition-all active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              Dismiss
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
};
