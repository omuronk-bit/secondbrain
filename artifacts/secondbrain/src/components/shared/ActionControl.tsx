import { useState } from 'react';
import { useLocation } from 'wouter';
import { ExternalLink, Check, Loader2, Maximize2 } from 'lucide-react';
import { Item, RecommendedAction } from '../../types';
import { RecommendationBadge, actionLabel } from './RecommendationBadge';
import { setItemAction, openItemLink } from '../../lib/api';
import { updateItemAction } from '../../utils/storage';
import { toast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

const ACTIONS: RecommendedAction[] = ['deep_consume', 'skim', 'segment', 'skip'];

// Open-source button + a tappable badge that lets you change an item's flag.
// Self-contained: optimistic update, persists to the backend (survives reload)
// and to localStorage (consistent within the session), reverts on failure.
export function ActionControl({ item, className }: { item: Item; className?: string }) {
  const [, setLocation] = useLocation();
  const [action, setAction] = useState<RecommendedAction>(item.recommendedAction);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function choose(next: RecommendedAction) {
    setOpen(false);
    if (next === action || busy) return;
    const prev = action;
    setAction(next); // optimistic
    setBusy(true);
    try {
      await setItemAction(item.id, next);
      updateItemAction(item.id, next);
      toast({ title: `Flagged: ${actionLabel(next, item.contentType)}` });
    } catch {
      setAction(prev); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('flex items-center gap-1.5 shrink-0', className)}>
      <button
        type="button"
        onClick={() => setLocation(`/media?item=${item.id}`)}
        title="Open details"
        aria-label="Open details"
        data-testid={`detail-${item.id}`}
        className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-secondary/70 transition-colors active:scale-95"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>

      {item.originalUrl && (
        <button
          type="button"
          onClick={() => openItemLink(item)}
          title="Open source"
          aria-label="Open source"
          data-testid={`open-${item.id}`}
          className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-secondary/70 transition-colors active:scale-95"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          data-testid={`flag-${item.id}`}
          className="flex items-center active:scale-95 transition-transform"
        >
          {busy ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border-border/60">
              <Loader2 className="w-3 h-3 animate-spin" />
              {actionLabel(action, item.contentType)}
            </span>
          ) : (
            <RecommendationBadge action={action} confidence={item.confidence} contentType={item.contentType} />
          )}
        </button>

        {open && (
          <>
            {/* backdrop closes the menu */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-50 min-w-[148px] rounded-xl border border-border bg-card shadow-lg overflow-hidden py-1"
            >
              <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Set flag
              </p>
              {ACTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="menuitemradio"
                  aria-checked={a === action}
                  onClick={() => choose(a)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-left transition-colors',
                    a === action ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-secondary',
                  )}
                >
                  {actionLabel(a, item.contentType)}
                  {a === action && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
