import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, Loader2, Brain, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import {
  fetchRecall, generateRecall, submitRecallAnswer, RecallItem, RecallResponse,
} from '../lib/api';
import { cn } from '../lib/utils';

function scoreColor(s: number) {
  return s >= 75 ? 'text-green-600 dark:text-green-400' : s >= 50 ? 'text-amber' : 'text-rose-500';
}
function scoreLabel(s: number) {
  return s >= 85 ? 'Sharp recall' : s >= 70 ? 'Solid' : s >= 50 ? 'Partial — close the gap' : 'Worth revisiting';
}

export const Recall = () => {
  const [, navigate] = useLocation();
  const [data, setData] = useState<RecallResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let d = await fetchRecall();
        if (d.items.length === 0) {
          setGenerating(true);
          d = await generateRecall();
          setGenerating(false);
        }
        setData(d);
        const firstUnanswered = d.items.findIndex((i) => !i.answered);
        setIdx(firstUnanswered === -1 ? d.items.length : firstUnanswered);
      } catch {
        /* offline / no registry */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items = data?.items ?? [];
  const cur: RecallItem | undefined = items[idx];

  async function submit() {
    if (!cur || !input.trim() || submitting) return;
    setSubmitting(true);
    try {
      const g = await submitRecallAnswer(cur.id, input.trim());
      setData((d) => {
        if (!d) return d;
        const next = d.items.map((it) =>
          it.id === cur.id
            ? { ...it, answered: true, answer: input.trim(), score: g.score, feedback: g.feedback,
                idealAnswer: g.idealAnswer, sourceClaim: g.sourceClaim, sourceTitle: g.sourceTitle }
            : it,
        );
        const scored = next.filter((i) => i.score != null).map((i) => i.score as number);
        return { ...d, items: next, stats: {
          answered: scored.length, total: next.length,
          avgScore: scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null,
        } };
      });
      setInput('');
    } catch {
      /* keep the input so the user can retry */
    } finally {
      setSubmitting(false);
    }
  }

  const Header = ({ subtitle }: { subtitle: string }) => (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={() => navigate('/today')} aria-label="Back"
        className="w-9 h-9 rounded-full bg-card border border-border grid place-items-center text-muted-foreground hover:text-foreground active:scale-95">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div>
        <h1 className="font-serif text-xl font-semibold leading-tight">Weekly recall</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-background" data-testid="recall-page">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-10">
        {loading || generating ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center text-primary">
              {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Brain className="w-6 h-6" />}
            </div>
            <p className="text-sm font-semibold">{generating ? 'Building this week’s recall…' : 'Loading…'}</p>
            {generating && <p className="text-xs text-muted-foreground max-w-[28ch]">Pulling what you read this week into 5 questions.</p>}
          </div>
        ) : items.length === 0 ? (
          <>
            <Header subtitle="active recall from your vault" />
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center text-primary mx-auto mb-3">
                <Brain className="w-6 h-6" />
              </div>
              <p className="font-serif font-semibold">Nothing to quiz on yet</p>
              <p className="text-xs text-muted-foreground mt-1">Once you’ve read a few things this week, your recall questions will appear here.</p>
            </div>
          </>
        ) : idx >= items.length ? (
          /* ── summary ── */
          <>
            <Header subtitle="this week — complete" />
            <div className="rounded-2xl border bg-card shadow-sm p-6 text-center mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Your recall this week</p>
              <p className={cn('font-serif text-5xl font-bold leading-none', data!.stats.avgScore != null ? scoreColor(data!.stats.avgScore) : 'text-foreground')}>
                {data!.stats.avgScore ?? '—'}<span className="text-2xl text-muted-foreground">%</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">{data!.stats.answered} of {data!.stats.total} answered</p>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <button key={it.id} onClick={() => setIdx(i)}
                  className="w-full flex items-center gap-3 text-left rounded-xl border border-border/60 bg-card px-3.5 py-3 hover:border-primary/30 transition-colors active:scale-[.99]">
                  <span className={cn('font-serif font-bold text-lg w-9 shrink-0 text-center', it.score != null ? scoreColor(it.score) : 'text-muted-foreground')}>{it.score ?? '–'}</span>
                  <span className="text-sm text-foreground/80 line-clamp-2 flex-1">{it.question}</span>
                </button>
              ))}
            </div>
            <button onClick={() => navigate('/today')}
              className="w-full mt-5 py-3 rounded-xl bg-foreground text-background font-bold text-sm active:scale-[0.98]">
              Back to Today
            </button>
          </>
        ) : (
          /* ── question stepper ── */
          <>
            <Header subtitle={`question ${idx + 1} of ${items.length}`} />
            <div className="flex gap-1.5 mb-5">
              {items.map((it, i) => (
                <div key={it.id} className={cn('h-1.5 flex-1 rounded-full',
                  i === idx ? 'bg-primary' : it.answered ? 'bg-primary/40' : 'bg-border')} />
              ))}
            </div>

            <div className="rounded-2xl border bg-card shadow-sm p-5">
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary mt-1 shrink-0" />
                <h2 className="font-serif text-lg font-semibold leading-snug">{cur!.question}</h2>
              </div>

              {!cur!.answered ? (
                <>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={5}
                    autoFocus
                    placeholder="Answer from memory — no peeking. What do you remember, and how would you use it?"
                    className="w-full bg-secondary/40 border border-border rounded-xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
                  />
                  <button onClick={submit} disabled={!input.trim() || submitting}
                    className="w-full mt-3 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Grading…</> : <>Check my recall <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className={cn('font-serif text-4xl font-bold leading-none', scoreColor(cur!.score!))}>{cur!.score}<span className="text-lg text-muted-foreground">%</span></span>
                    <span className={cn('text-xs font-bold', scoreColor(cur!.score!))}>{scoreLabel(cur!.score!)}</span>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Mentor feedback</p>
                    <p className="text-sm text-foreground/90 leading-relaxed">{cur!.feedback}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary mb-1">Model answer</p>
                    <p className="text-sm text-foreground/90 leading-relaxed">{cur!.idealAnswer}</p>
                    {cur!.sourceTitle && <p className="text-[11px] text-muted-foreground mt-2">from: {cur!.sourceTitle}</p>}
                  </div>
                  {cur!.answer && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-semibold">Your answer</summary>
                      <p className="mt-1.5 leading-relaxed">{cur!.answer}</p>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
                className="text-sm font-semibold text-muted-foreground disabled:opacity-30 px-3 py-2 active:scale-95">
                ← Prev
              </button>
              {cur!.answered && (
                <button onClick={() => setIdx((i) => i + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-bold active:scale-95">
                  {idx === items.length - 1 ? <>Finish <CheckCircle2 className="w-4 h-4" /></> : <>Next <ArrowRight className="w-4 h-4" /></>}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
