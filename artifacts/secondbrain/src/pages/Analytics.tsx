import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getItems, getSources, getFeedback } from '../utils/storage';
import { segments, syntheses } from '../utils/mediaStore';
import { fetchStats, StatsResponse } from '../lib/api';
import {
  ArrowLeft, BarChart2, TrendingUp, TrendingDown,
  Zap, AlertTriangle, CheckCircle2, Clock, Radio,
  Play, Mail, FileText, ThumbsUp, ThumbsDown,
  Bookmark, Target, Activity,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Item, Source } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOW = new Date();
const WEEK_AGO = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
const FEEDBACK_LABELS: Record<string, string> = {
  more_like_this: 'More like this', less_like_this: 'Less like this',
  already_known: 'Already known', important_for_work: 'Work-critical',
  useful: 'Useful', not_useful: 'Not useful', too_basic: 'Too basic',
  personal_curiosity: 'Curiosity', wrong_reason: 'Wrong reason',
};
const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const WEEK_LABEL = `${fmtDay(WEEK_AGO)} – ${fmtDay(NOW)}, ${NOW.getFullYear()}`;

// ─── Analytics computation ────────────────────────────────────────────────────

function computeAnalytics(items: Item[], sources: Source[]) {
  const thisWeekItems = items.filter(i => new Date(i.ingestedAt) >= WEEK_AGO);
  const saved   = items.filter(i => i.status === 'saved');
  const dismissed = items.filter(i => i.status === 'dismissed');
  const reviewed = [...saved, ...dismissed];
  const skipItems = items.filter(i => i.recommendedAction === 'skip');
  const skimItems = items.filter(i => i.recommendedAction === 'skim');

  const estTimeSaved = Math.round(
    skipItems.reduce((s, i) => s + (i.durationMinutes ?? 10), 0) +
    skimItems.reduce((s, i) => s + (i.durationMinutes ?? 8) * 0.6, 0)
  );

  const memoIds = new Set(syntheses.flatMap(s => s.savedItemIds));
  const memoCandidates = items.filter(i => memoIds.has(i.id)).length;
  const segmentsConsumed = 0;

  // Source quality
  const sourceStats = sources.map(src => {
    const srcItems = items.filter(i => i.sourceId === src.id);
    const avgRel = srcItems.length
      ? srcItems.reduce((s, i) => s + i.relevanceScore, 0) / srcItems.length
      : 0;
    const useful = srcItems.filter(i => i.relevanceScore > 0.7).length;
    const dismissed_ = srcItems.filter(i => i.recommendedAction === 'skip').length;
    return { src, avgRel, useful, dismissed: dismissed_, count: srcItems.length };
  }).sort((a, b) => b.avgRel - a.avgRel);

  const avgSourceQuality =
    sourceStats.length
      ? sourceStats.reduce((s, x) => s + x.avgRel, 0) / sourceStats.length
      : 0;

  // Topic distribution
  const topicFreq: Record<string, number> = {};
  items.forEach(item => {
    item.topics.forEach(t => { topicFreq[t] = (topicFreq[t] || 0) + 1; });
  });
  const topTopics = Object.entries(topicFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Feedback distribution — real local feedback (empty until you rate items)
  const feedback = getFeedback();
  const fbCounts: Record<string, number> = {};
  feedback.forEach(f => { fbCounts[f.feedbackType] = (fbCounts[f.feedbackType] || 0) + 1; });
  const feedbackBreakdown = Object.entries(fbCounts)
    .map(([type, count]) => ({ type, label: FEEDBACK_LABELS[type] ?? type, count }))
    .sort((a, b) => b.count - a.count);
  const totalFeedback = feedback.length;
  const feedbackCoverage = items.length > 0 ? totalFeedback / items.length : 0;

  const reviewRate = items.length > 0 ? reviewed.length / items.length : 0;
  const noiseRate  = items.length > 0 ? skipItems.length / items.length : 0;

  // Health score (0–100)
  const score = Math.min(100, Math.round(
    Math.round(avgSourceQuality * 20) +
    Math.min(18, Math.round(reviewRate * 70)) +
    Math.min(14, Math.round(feedbackCoverage * 56)) +
    Math.min(10, Math.round(noiseRate * 48)) +
    (segmentsConsumed > 0 ? 8 : 0) +
    (saved.length > 0 ? 6 : 0)
  ));

  return {
    totalItems: items.length,
    thisWeekItems: thisWeekItems.length,
    saved: saved.length,
    dismissed: dismissed.length,
    reviewed: reviewed.length,
    skipItems: skipItems.length,
    segmentsConsumed,
    memoCandidates,
    estTimeSaved,
    sourceStats,
    avgSourceQuality,
    topTopics,
    feedbackBreakdown,
    totalFeedback,
    feedbackCoverage,
    reviewRate,
    noiseRate,
    score,
    contentTypeCounts: {
      podcast:    items.filter(i => i.contentType === 'podcast').length,
      youtube:    items.filter(i => i.contentType === 'youtube').length,
      article:    items.filter(i => i.contentType === 'article').length,
      newsletter: items.filter(i => i.contentType === 'newsletter').length,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number, of: number) {
  return of > 0 ? Math.round((n / of) * 100) : 0;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const dash = (score / 100) * circ;
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="rotate-[-90deg]">
      <circle cx="55" cy="55" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
      <circle cx="55" cy="55" r={radius} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
    </svg>
  );
}

function AnimBar({ value, max, color = 'bg-primary', mounted }: { value: number; max: number; color?: string; mounted: boolean }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-700 ease-out', color)}
        style={{ width: mounted ? `${w}%` : '0%' }} />
    </div>
  );
}

function SectionLabel({ icon: Icon, title, question }: { icon: typeof BarChart2; title: string; question: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-0.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</h2>
      </div>
      <p className="text-xs text-muted-foreground/70 pl-5 italic">{question}</p>
    </div>
  );
}

function DiagCard({ level, text }: { level: 'ok' | 'warn' | 'bad'; text: string }) {
  const cfg = {
    ok:   { cls: 'bg-emerald-500/8 border-emerald-500/20', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> },
    warn: { cls: 'bg-amber-500/8 border-amber-500/20',    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> },
    bad:  { cls: 'bg-rose-500/8 border-rose-500/20',      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> },
  }[level];
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border p-2.5', cfg.cls)}>
      {cfg.icon}
      <p className="text-xs text-foreground/80 leading-relaxed">{text}</p>
    </div>
  );
}

function ContentTypeIcon({ type }: { type: string }) {
  const cls = 'w-3 h-3';
  if (type === 'podcast')    return <Radio className={cls} />;
  if (type === 'youtube')    return <Play className={cls} />;
  if (type === 'newsletter') return <Mail className={cls} />;
  return <FileText className={cls} />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const Analytics = () => {
  const [, navigate] = useLocation();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  const items   = getItems();
  const sources = getSources();
  const data    = computeAnalytics(items, sources);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    fetchStats().then(setStats).catch(() => { /* keep computed fallback */ });
    return () => clearTimeout(t);
  }, []);

  // Canonical headline numbers from /api/stats (fall back to computed if not loaded).
  const totalSegments = stats?.segments ?? segments.length;

  const scoreColor = data.score >= 70 ? 'text-emerald-500' : data.score >= 50 ? 'text-amber-500' : 'text-rose-500';
  const scoreLabel = data.score >= 70 ? 'Strong' : data.score >= 50 ? 'Developing' : 'Early stage';

  // Diagnoses
  const diagnoses: { level: 'ok' | 'warn' | 'bad'; text: string }[] = [];
  if (data.avgSourceQuality > 0.75) diagnoses.push({ level: 'ok', text: `Source quality is strong (${Math.round(data.avgSourceQuality * 100)}% avg relevance). Feeds are well-calibrated.` });
  else diagnoses.push({ level: 'warn', text: `Source quality is moderate (${Math.round(data.avgSourceQuality * 100)}% avg). Consider auditing low-signal feeds.` });

  if (data.reviewRate < 0.3) diagnoses.push({ level: 'warn', text: `Review rate is low (${pct(data.reviewed, data.totalItems)}%). ${data.totalItems - data.reviewed} items are waiting for a decision.` });
  else diagnoses.push({ level: 'ok', text: `Review rate is healthy (${pct(data.reviewed, data.totalItems)}%). Items are being actioned.` });

  if (data.feedbackCoverage < 0.3) diagnoses.push({ level: 'bad', text: `Feedback coverage is very low (${pct(data.totalFeedback, data.totalItems)}%). Recommendations can't improve without signals.` });

  if (data.dismissed === 0) diagnoses.push({ level: 'warn', text: 'No items dismissed — the system may not be filtering enough noise. Try using "Dismiss" on weak items.' });

  if (data.saved > data.reviewed * 0.7) diagnoses.push({ level: 'warn', text: `You're saving aggressively (${data.saved} saved vs ${data.reviewed} reviewed). Ensure saved items are being consumed, not just archived.` });

  return (
    <div className="min-h-full bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background border-b border-border px-4 py-2.5 flex items-center gap-3">
        <button onClick={() => navigate('/today')}
          className="p-1.5 -ml-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-sm font-black tracking-tight">Loop Health</h1>
          <p className="text-[10px] text-muted-foreground">{WEEK_LABEL}</p>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-6">

        {/* ── Health score ── */}
        <div className="bg-card border border-border/70 rounded-xl p-5 flex items-center gap-5">
          <div className="relative shrink-0 flex items-center justify-center">
            <ScoreRing score={mounted ? data.score : 0} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-2xl font-black tabular-nums', scoreColor)}>{data.score}</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">/100</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className={cn('text-lg font-black', scoreColor)}>{scoreLabel}</span>
              <span className="text-xs text-muted-foreground">loop health</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Composite score based on source quality, review rate, feedback coverage, and engagement.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Ingested', val: data.thisWeekItems, color: 'text-foreground' },
                { label: 'Reviewed', val: data.reviewed, color: 'text-primary' },
                { label: 'Saved', val: data.saved, color: 'text-emerald-500' },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center">
                  <p className={cn('text-base font-black', color)}>{val}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Diagnoses ── */}
        <div>
          <SectionLabel icon={Activity} title="System Diagnostics" question="What's working? What needs attention?" />
          <div className="space-y-2">
            {diagnoses.map((d, i) => <DiagCard key={i} level={d.level} text={d.text} />)}
          </div>
        </div>

        {/* ── Consumption funnel ── */}
        <div>
          <SectionLabel icon={BarChart2} title="Consumption Funnel" question="Is the system reducing noise?" />
          <div className="bg-card border border-border/70 rounded-xl p-4 space-y-3">
            {[
              { label: 'Ingested (all time)',  val: data.totalItems,  color: 'bg-primary',      pctOf: data.totalItems },
              { label: 'This week',            val: data.thisWeekItems, color: 'bg-primary/70', pctOf: data.totalItems },
              { label: 'Reviewed / actioned',  val: data.reviewed,   color: 'bg-sky-500',       pctOf: data.totalItems },
              { label: 'Saved',                val: data.saved,      color: 'bg-emerald-500',   pctOf: data.totalItems },
              { label: 'Dismissed',            val: data.dismissed,  color: 'bg-rose-500',      pctOf: data.totalItems },
              { label: 'Flagged to skip',      val: data.skipItems,  color: 'bg-orange-400',    pctOf: data.totalItems },
              { label: 'Segments consumed',    val: data.segmentsConsumed, color: 'bg-violet-500', pctOf: totalSegments },
            ].map(({ label, val, color, pctOf }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
                <AnimBar value={val} max={pctOf} color={color} mounted={mounted} />
                <span className="text-xs font-bold tabular-nums w-5 text-right">{val}</span>
                <span className="text-[10px] text-muted-foreground w-8 text-right">{pct(val, pctOf)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Source quality ── */}
        <div>
          <SectionLabel icon={TrendingUp} title="Source Quality" question="Which sources are useful? Which should be cut?" />
          <div className="bg-card border border-border/70 rounded-xl overflow-hidden divide-y divide-border/50">
            {data.sourceStats.map((s, idx) => {
              const isTop = idx === 0;
              const isBottom = idx === data.sourceStats.length - 1;
              const barColor = s.avgRel > 0.79 ? 'bg-emerald-500' : s.avgRel > 0.59 ? 'bg-amber-500' : 'bg-rose-500';
              const relColor = s.avgRel > 0.79 ? 'text-emerald-500' : s.avgRel > 0.59 ? 'text-amber-500' : 'text-rose-500';
              return (
                <div key={s.src.id} className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {isTop && <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    {isBottom && <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                    {!isTop && !isBottom && <span className="w-3.5 shrink-0" />}
                    <span className="text-sm font-semibold flex-1">{s.src.name}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{s.src.type}</span>
                    <span className={cn('text-xs font-black tabular-nums', relColor)}>{Math.round(s.avgRel * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2 pl-5">
                    <AnimBar value={s.avgRel * 100} max={100} color={barColor} mounted={mounted} />
                  </div>
                  <div className="flex gap-3 pl-5 text-[11px] text-muted-foreground">
                    <span><span className="font-bold text-foreground">{s.count}</span> items</span>
                    <span><span className="font-bold text-emerald-500">{s.useful}</span> useful</span>
                    <span><span className="font-bold text-rose-400">{s.dismissed}</span> skip-flagged</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Topic distribution ── */}
        <div>
          <SectionLabel icon={Target} title="Topic Distribution" question="Which topics dominate your knowledge base?" />
          <div className="bg-card border border-border/70 rounded-xl p-4 space-y-2.5">
            {data.topTopics.map(([topic, count]) => (
              <div key={topic} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground capitalize w-36 shrink-0 truncate">{topic}</span>
                <AnimBar value={count} max={data.topTopics[0]?.[1] || 1} color="bg-primary/70" mounted={mounted} />
                <span className="text-xs font-bold tabular-nums w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Content type mix ── */}
        <div>
          <SectionLabel icon={FileText} title="Content Type Mix" question="How diverse is your input?" />
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Podcast',    val: data.contentTypeCounts.podcast,    icon: Radio,     color: 'text-violet-500 bg-violet-500/10' },
              { label: 'Video',      val: data.contentTypeCounts.youtube,    icon: Play,      color: 'text-rose-500 bg-rose-500/10' },
              { label: 'Article',    val: data.contentTypeCounts.article,    icon: FileText,  color: 'text-sky-500 bg-sky-500/10' },
              { label: 'Newsletter', val: data.contentTypeCounts.newsletter, icon: Mail,      color: 'text-amber-500 bg-amber-500/10' },
            ].map(({ label, val, icon: Icon, color }) => (
              <div key={label} className="bg-card border border-border/60 rounded-xl p-3 text-center space-y-2">
                <div className={cn('w-8 h-8 rounded-lg mx-auto flex items-center justify-center', color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-black text-foreground">{val}</p>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Feedback ── */}
        <div>
          <SectionLabel icon={ThumbsUp} title="Feedback Coverage" question="Are recommendations getting enough signal?" />
          <div className="bg-card border border-border/70 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{data.totalFeedback} signals across {data.totalItems} items</span>
              <span className={cn('text-xs font-bold', data.feedbackCoverage > 0.3 ? 'text-emerald-500' : data.feedbackCoverage > 0.15 ? 'text-amber-500' : 'text-rose-500')}>
                {pct(data.totalFeedback, data.totalItems)}% coverage
              </span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <AnimBar value={data.totalFeedback} max={data.totalItems} color="bg-primary" mounted={mounted} />
            </div>
            <div className="space-y-2 pt-1 border-t border-border/40">
              {data.feedbackBreakdown.length === 0 && (
                <p className="text-xs text-muted-foreground/70 italic">No feedback yet — rate items (👍/👎) to tune your recommendations.</p>
              )}
              {data.feedbackBreakdown.map(fb => {
                const fbColor = fb.type === 'more_like_this' || fb.type === 'important_for_work'
                  ? 'text-emerald-500' : fb.type === 'less_like_this' ? 'text-rose-500' : 'text-amber-500';
                return (
                  <div key={fb.type} className="flex items-center gap-3">
                    {fb.type === 'more_like_this' || fb.type === 'important_for_work'
                      ? <ThumbsUp className="w-3 h-3 text-emerald-500 shrink-0" />
                      : fb.type === 'less_like_this'
                      ? <ThumbsDown className="w-3 h-3 text-rose-500 shrink-0" />
                      : <span className="w-3 h-3 shrink-0" />
                    }
                    <span className="text-xs text-muted-foreground flex-1">{fb.label}</span>
                    <AnimBar value={fb.count} max={data.totalFeedback} color="bg-muted-foreground/30" mounted={mounted} />
                    <span className={cn('text-xs font-bold tabular-nums w-4 text-right', fbColor)}>{fb.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Efficiency & placeholders ── */}
        <div>
          <SectionLabel icon={Zap} title="Efficiency Signals" question="Is the system saving you time?" />
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Est. time saved', value: `~${data.estTimeSaved} min`, sub: 'from skip + skim routing', color: 'text-emerald-500', icon: Clock },
              { label: 'Memo candidates', value: `${data.memoCandidates}`, sub: 'items flagged for weekly brief', color: 'text-primary', icon: Bookmark },
              { label: 'Must-consume precision', value: '96%', sub: 'placeholder — needs tracking', color: 'text-amber-500', icon: Target },
              { label: 'Segment usefulness', value: '91%', sub: 'placeholder — needs tracking', color: 'text-amber-500', icon: BarChart2 },
            ].map(({ label, value, sub, color, icon: Icon }) => (
              <div key={label} className="bg-card border border-border/60 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-[9px] font-bold text-amber-500/70 uppercase">{sub.includes('placeholder') ? 'PLACEHOLDER' : ''}</span>
                </div>
                <p className={cn('text-xl font-black', color)}>{value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">{label}</p>
                <p className="text-[10px] text-muted-foreground/60 italic">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Attention balance ── */}
        <div>
          <SectionLabel icon={Activity} title="Attention Balance" question="Is the user saving too much and reviewing too little?" />
          <div className="bg-card border border-border/70 rounded-xl p-4 space-y-4">
            {[
              {
                label: 'Save rate',
                val: data.saved, of: data.totalItems,
                good: 0.15, warn: 0.35,
                goodMsg: 'Healthy — selective saving',
                warnMsg: 'Moderate — watch for over-saving',
                badMsg: 'High — saved items may become a backlog',
                color: data.saved / Math.max(1, data.totalItems) > 0.35 ? 'bg-rose-500' : data.saved / Math.max(1, data.totalItems) > 0.15 ? 'bg-amber-500' : 'bg-emerald-500',
              },
              {
                label: 'Review rate',
                val: data.reviewed, of: data.totalItems,
                good: 0.4, warn: 0.2,
                goodMsg: 'Healthy — items getting actioned',
                warnMsg: 'Low — queue growing',
                badMsg: 'Very low — items piling up unreviewed',
                color: data.reviewed / Math.max(1, data.totalItems) > 0.4 ? 'bg-emerald-500' : data.reviewed / Math.max(1, data.totalItems) > 0.2 ? 'bg-amber-500' : 'bg-rose-500',
              },
              {
                label: 'Noise reduction',
                val: data.skipItems, of: data.totalItems,
                good: 0.15, warn: 0.05,
                goodMsg: 'Healthy — system filtering noise',
                warnMsg: 'Low — not enough is being filtered',
                badMsg: 'Very low — most content is treated as relevant',
                color: data.skipItems / Math.max(1, data.totalItems) > 0.15 ? 'bg-emerald-500' : data.skipItems / Math.max(1, data.totalItems) > 0.05 ? 'bg-amber-500' : 'bg-rose-500',
              },
            ].map(({ label, val, of: total, color }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{val} / {total} · {pct(val, total)}%</span>
                </div>
                <AnimBar value={val} max={total} color={color} mounted={mounted} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-muted-foreground/50 pb-2">
          All metrics computed from local data · {WEEK_LABEL}
        </p>

      </div>
    </div>
  );
};
