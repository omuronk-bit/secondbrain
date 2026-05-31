import { useEffect, useState } from 'react';
import { Sliders, Check, X, Loader2 } from 'lucide-react';
import { fetchTuning, applyTuning, TuningCandidate } from '../../lib/api';
import { cn } from '../../lib/utils';
import { toast } from '../../hooks/use-toast';

// Self-hiding card: surfaces the daily tuner's source/interest suggestions for
// in-app approval (writes sources.yaml/interests.yaml + pushes, like Telegram did).
export function TuningCard() {
  const [cands, setCands] = useState<TuningCandidate[] | null>(null);
  const [decisions, setDecisions] = useState<Record<number, 'approve' | 'reject'>>({});
  const [applying, setApplying] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    fetchTuning().then((d) => setCands(d.candidates)).catch(() => { /* offline */ });
  }, []);

  if (hidden || !cands || cands.length === 0) return null;
  const decided = Object.keys(decisions).length;

  async function apply() {
    if (!cands) return;
    setApplying(true);
    const approve = cands.filter((c) => decisions[c.tid] === 'approve').map((c) => c.tid);
    const reject = cands.filter((c) => decisions[c.tid] === 'reject').map((c) => c.tid);
    try {
      await applyTuning(approve, reject);
      toast({ title: 'Feed tuned', description: `${approve.length} added · ${reject.length} skipped` });
      setHidden(true);
    } catch {
      toast({ title: 'Could not apply' });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden" data-testid="tuning-card">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-amber-soft text-amber grid place-items-center shrink-0">
          <Sliders className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Tune your feed</p>
          <p className="text-[11px] text-muted-foreground">{cands.length} suggestion{cands.length === 1 ? '' : 's'} from your agent</p>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {cands.map((c) => (
          <div key={c.tid} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug">{c.label}</p>
                {c.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{c.detail}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setDecisions((d) => ({ ...d, [c.tid]: 'approve' }))}
                  aria-label="Add"
                  className={cn('p-1.5 rounded-lg active:scale-90 transition-colors',
                    decisions[c.tid] === 'approve' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDecisions((d) => ({ ...d, [c.tid]: 'reject' }))}
                  aria-label="Skip"
                  className={cn('p-1.5 rounded-lg active:scale-90 transition-colors',
                    decisions[c.tid] === 'reject' ? 'bg-rose-500/15 text-rose-500' : 'bg-secondary text-muted-foreground hover:text-foreground')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {c.rationale && <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{c.rationale}</p>}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-border/50">
        <button
          onClick={apply}
          disabled={decided === 0 || applying}
          className="w-full py-2.5 rounded-xl bg-foreground text-background font-bold text-sm disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {applying ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</> : `Apply ${decided} decision${decided === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
