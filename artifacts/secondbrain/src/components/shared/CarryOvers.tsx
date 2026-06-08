import { useEffect, useState } from 'react';
import { CheckCircle2, X, ExternalLink, Target } from 'lucide-react';
import { fetchCarryovers, closeCarryover, Carryover } from '../../lib/api';
import { toast } from '../../hooks/use-toast';

// "Worth acting on this week" — the mentor connects several things you engaged with
// into a few concrete, project-tied actions. Synthesized weekly (not per-item),
// so each one is rare and earned rather than a pile of homework.
export function CarryOvers() {
  const [items, setItems] = useState<Carryover[]>([]);
  const [stats, setStats] = useState({ open: 0, done: 0, dropped: 0 });
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetchCarryovers(5)
      .then((r) => { setItems(r.items); setStats(r.stats); })
      .catch(() => { /* no registry / offline */ })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  async function close(c: Carryover, status: 'done' | 'dropped') {
    setItems((xs) => xs.filter((x) => x.id !== c.id)); // optimistic
    setStats((s) => ({ ...s, open: Math.max(0, s.open - 1), [status]: s[status] + 1 }));
    try {
      await closeCarryover(c.id, status);
      toast({ title: status === 'done' ? 'Nice — acted on ✓' : 'Set aside' });
    } catch {
      toast({ title: 'Could not update', description: 'Try again.' });
      load();
    }
  }

  if (loading || items.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden" data-testid="carryovers">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
          <Target className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Worth acting on this week</p>
          <p className="text-[11px] text-muted-foreground">
            Connected from what you read{stats.done > 0 && ` · ${stats.done} done`}
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {items.map((c) => (
          <div key={c.id} className="px-4 py-3.5 space-y-2" data-testid={`carryover-${c.id}`}>
            {c.area && (
              <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {c.area}
              </span>
            )}
            <p className="text-sm font-semibold text-foreground leading-snug">{c.action}</p>
            {c.why && <p className="text-xs text-muted-foreground leading-relaxed">{c.why}</p>}

            {c.sources.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold">From</span>
                {c.sources.map((s, i) =>
                  s.url ? (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors max-w-[200px]"
                      title={s.title}
                    >
                      <span className="truncate">{s.title || s.source}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <span key={i} className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={s.title}>
                      {s.title || s.source}
                    </span>
                  ),
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => close(c, 'done')}
                data-testid={`carryover-done-${c.id}`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Did it
              </button>
              <button
                onClick={() => close(c, 'dropped')}
                data-testid={`carryover-drop-${c.id}`}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-[11px] font-semibold active:scale-95 transition-transform"
              >
                <X className="w-3.5 h-3.5" /> Not now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
