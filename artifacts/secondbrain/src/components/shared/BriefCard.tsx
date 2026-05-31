import { useEffect, useState } from 'react';
import { Newspaper, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchBrief, Brief } from '../../lib/api';
import { Markdown } from './Markdown';
import { cn } from '../../lib/utils';

// One-line teaser from the brief body (first real bullet/line, markdown stripped).
function teaser(body: string): string {
  for (const raw of body.split('\n')) {
    const line = raw.replace(/^[#>\-*\d.\s]+/, '').replace(/\*\*/g, '').trim();
    if (line.length > 20) return line.slice(0, 120);
  }
  return '';
}

// "Your brief" — surfaces the daily/weekly brief the VM generates each morning.
export function BriefCard() {
  const [data, setData] = useState<{ daily: Brief | null; weekly: Brief | null } | null>(null);
  const [kind, setKind] = useState<'daily' | 'weekly'>('daily');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchBrief().then(setData).catch(() => { /* no brief yet */ });
  }, []);

  if (!data || (!data.daily && !data.weekly)) return null;
  const b = data[kind] ?? data.daily ?? data.weekly;
  if (!b) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        data-testid="brief-card"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Newspaper className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Your {kind} brief</p>
          {!open && <p className="text-xs text-muted-foreground line-clamp-1">{teaser(b.body)}</p>}
          {open && <p className="text-[11px] text-muted-foreground">{b.date}</p>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          {data.daily && data.weekly && (
            <div className="flex gap-1.5 mb-3">
              {(['daily', 'weekly'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors',
                    kind === k ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          )}
          <div className="max-h-[60vh] overflow-y-auto">
            <Markdown content={b.body} />
          </div>
        </div>
      )}
    </div>
  );
}
