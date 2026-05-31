import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { fetchFeedbackMap, setItemFeedback, FeedbackSignal } from '../../lib/api';
import { cn } from '../../lib/utils';
import { toast } from '../../hooks/use-toast';

// "More / less like this" — the explicit preference signal that tunes the feed.
export function FeedbackButtons({ contentId, className }: { contentId: string; className?: string }) {
  const [sig, setSig] = useState<FeedbackSignal>('none');

  useEffect(() => {
    let on = true;
    fetchFeedbackMap().then((m) => { if (on) setSig(m[contentId] ?? 'none'); });
    return () => { on = false; };
  }, [contentId]);

  function pick(choice: 'more_like_this' | 'less_like_this') {
    const next: FeedbackSignal = sig === choice ? 'none' : choice;
    const prev = sig;
    setSig(next); // optimistic
    setItemFeedback(contentId, next)
      .then(() => {
        if (next !== 'none') {
          toast({
            title: next === 'more_like_this' ? 'More like this' : 'Less like this',
            description: 'Tuning your feed.',
          });
        }
      })
      .catch(() => {
        setSig(prev);
        toast({ title: 'Could not save feedback' });
      });
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => pick('more_like_this')}
        aria-label="More like this"
        title="More like this"
        className={cn(
          'p-1.5 rounded-lg transition-colors active:scale-90',
          sig === 'more_like_this' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => pick('less_like_this')}
        aria-label="Less like this"
        title="Less like this"
        className={cn(
          'p-1.5 rounded-lg transition-colors active:scale-90',
          sig === 'less_like_this' ? 'bg-rose-500/15 text-rose-500' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
