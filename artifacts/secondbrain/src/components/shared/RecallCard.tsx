import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Brain, ChevronRight } from 'lucide-react';
import { fetchRecall } from '../../lib/api';

// Today entry to the weekly recall quiz. Read-only GET (never generates), so no
// LLM cost on Today load — generation happens when you open /recall.
export function RecallCard() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<{ total: number; remaining: number; avg: number | null } | null>(null);

  useEffect(() => {
    fetchRecall()
      .then((r) => setState({ total: r.stats.total, remaining: r.stats.total - r.stats.answered, avg: r.stats.avgScore }))
      .catch(() => { /* offline */ });
  }, []);

  if (!state) return null;
  const done = state.total > 0 && state.remaining === 0;
  const sub = state.total === 0
    ? 'Test what stuck this week'
    : done
      ? `✓ Done — avg ${state.avg ?? '–'}%`
      : `${state.remaining} question${state.remaining === 1 ? '' : 's'} to go`;

  return (
    <button
      onClick={() => navigate('/recall')}
      data-testid="recall-card"
      className="w-full flex items-center gap-3 rounded-2xl border bg-card shadow-sm px-4 py-3 hover:border-primary/40 transition-colors active:scale-[.99] text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
        <Brain className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">Weekly recall</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}
