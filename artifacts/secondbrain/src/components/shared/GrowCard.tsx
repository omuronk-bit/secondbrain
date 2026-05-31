import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Compass, ChevronRight } from 'lucide-react';
import { fetchGrow } from '../../lib/api';

// Today entry to the Grow screen (foundational reading + blind spots). Read-only
// GET (never generates) → no LLM cost on Today load.
export function GrowCard() {
  const [state, setState] = useState<{ reads: number; spots: number } | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetchGrow()
      .then((d) => setState({ reads: d.goDeeper.length, spots: d.blindSpots.length }))
      .catch(() => { /* offline */ });
  }, []);

  if (!state) return null;
  const has = state.reads + state.spots > 0;
  const sub = has
    ? `${state.reads} foundational read${state.reads === 1 ? '' : 's'} · ${state.spots} blind spot${state.spots === 1 ? '' : 's'}`
    : 'Find your next depth — what to read & what you’re missing';

  return (
    <button
      onClick={() => navigate('/grow')}
      data-testid="grow-card"
      className="w-full flex items-center gap-3 rounded-2xl border bg-card shadow-sm px-4 py-3 hover:border-primary/40 transition-colors active:scale-[.99] text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-amber-soft text-amber grid place-items-center shrink-0">
        <Compass className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">Grow your model</p>
        <p className="text-xs text-muted-foreground truncate">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}
