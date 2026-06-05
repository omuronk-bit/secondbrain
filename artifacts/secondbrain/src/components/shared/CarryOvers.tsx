import { useEffect, useState } from 'react';
import { CheckCircle2, X, ExternalLink, ListTodo } from 'lucide-react';
import { fetchCarryovers, closeCarryover, Carryover } from '../../lib/api';
import { toast } from '../../hooks/use-toast';

// "Did you act on these?" — resurfaces the oldest open one_action nudges and
// lets you close each one (done / drop). Turns a write-only field into a loop.
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
      toast({ title: status === 'done' ? 'Nice — acted on ✓' : 'Dropped' });
      load(); // replenish with the next-oldest carry-over
    } catch {
      toast({ title: 'Could not update', description: 'Try again.' });
      load();
    }
  }

  if (loading || stats.open === 0) return null;

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden" data-testid="carryovers">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-amber-soft text-amber grid place-items-center shrink-0">
          <ListTodo className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Carry-overs — did you act on these?</p>
          <p className="text-[11px] text-muted-foreground">
            {stats.open} open{stats.done > 0 && ` · ${stats.done} acted on`}
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {items.map((c) => (
          <div key={c.id} className="px-4 py-3 space-y-2">
            <p className="text-sm text-foreground leading-snug">{c.action}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-foreground truncate flex-1 min-w-0">
                {c.source} · {c.title}
              </span>
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors p-0.5"
                  aria-label={c.at ? `Open source at ${c.at}` : 'Open source'}
                >
                  {c.at && <span className="font-mono text-primary">▸ {c.at}</span>}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={() => close(c, 'done')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Did it
              </button>
              <button
                onClick={() => close(c, 'dropped')}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-[11px] font-semibold active:scale-95 transition-transform"
              >
                <X className="w-3.5 h-3.5" /> Drop
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
