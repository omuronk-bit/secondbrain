import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, Loader2, BookOpen, Compass, Sparkles } from 'lucide-react';
import { fetchGrow, generateGrow, GrowResponse } from '../lib/api';

export const Grow = () => {
  const [, navigate] = useLocation();
  const [data, setData] = useState<GrowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let d = await fetchGrow();
        if (d.goDeeper.length === 0 && d.blindSpots.length === 0) {
          setGenerating(true);
          d = await generateGrow();
          setGenerating(false);
        }
        setData(d);
      } catch {
        /* offline */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const empty = data && data.goDeeper.length === 0 && data.blindSpots.length === 0;

  return (
    <div className="min-h-full bg-background" data-testid="grow-page">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-10">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/today')} aria-label="Back"
            className="w-9 h-9 rounded-full bg-card border border-border grid place-items-center text-muted-foreground hover:text-foreground active:scale-95">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-xl font-semibold leading-tight">Grow</h1>
            <p className="text-xs text-muted-foreground">deepen your model — and find what you’re missing</p>
          </div>
        </div>

        {loading || generating ? (
          <div className="flex flex-col items-center justify-center min-h-[55vh] gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center text-primary">
              {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Compass className="w-6 h-6" />}
            </div>
            <p className="text-sm font-semibold">{generating ? 'Mapping your knowledge graph…' : 'Loading…'}</p>
            {generating && <p className="text-xs text-muted-foreground max-w-[30ch]">Finding the foundations to read and the gaps you keep circling.</p>}
          </div>
        ) : empty ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center text-primary mx-auto mb-3">
              <Compass className="w-6 h-6" />
            </div>
            <p className="font-serif font-semibold">Not enough signal yet</p>
            <p className="text-xs text-muted-foreground mt-1">As your graph grows, depth recommendations will appear here.</p>
          </div>
        ) : (
          <div className="space-y-7">
            {/* ── Go Deeper ── */}
            {data!.goDeeper.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-soft text-amber grid place-items-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h2 className="font-serif text-lg font-semibold">Go deeper</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-3 -mt-1 ml-9">Canonical works that build your mental model — not more news.</p>
                <div className="space-y-2.5">
                  {data!.goDeeper.map((it, i) => (
                    <div key={i} className="rounded-2xl border bg-card shadow-sm p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-[15px] leading-snug text-foreground">{it.title}</h3>
                      </div>
                      {it.theme && <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-soft text-amber mb-2">{it.theme}</span>}
                      <p className="text-sm text-muted-foreground leading-relaxed">{it.why}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Blind Spots ── */}
            {data!.blindSpots.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h2 className="font-serif text-lg font-semibold">Blind spots</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-3 -mt-1 ml-9">Topics you keep brushing against in your notes but never engage.</p>
                <div className="space-y-2.5">
                  {data!.blindSpots.map((it, i) => (
                    <div key={i} className="rounded-2xl border bg-card shadow-sm p-4">
                      <h3 className="font-bold text-[15px] leading-snug text-foreground mb-1.5">{it.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{it.why}</p>
                      {it.ref && (
                        <div className="flex items-start gap-1.5 mt-2.5 text-[12px] text-foreground/80 bg-secondary/50 rounded-lg px-2.5 py-2">
                          <Sparkles className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          <span><span className="font-semibold">Start here:</span> {it.ref}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="text-[11px] text-muted-foreground text-center pt-2">Foundational picks are AI-suggested — worth a quick check before you commit.</p>
          </div>
        )}
      </div>
    </div>
  );
};
