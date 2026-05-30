import { useState, useEffect, useRef } from 'react';
import { generateMockAIAnswer, SUGGESTED_QUESTIONS, SearchScope, AskResult } from '../utils/mockAI';
import { getItems, getAskHistory, saveAskHistory } from '../utils/storage';
import { segments } from '../data/mockData';
import {
  Search, Send, Clock, Sparkles, ChevronDown, ChevronUp,
  Bookmark, Newspaper, HelpCircle, ThumbsUp, ThumbsDown,
  ExternalLink, AlertTriangle, Zap, Radio, Play, FileText,
  Mail, CheckCircle2, Filter, BarChart2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Scope configuration ─────────────────────────────────────────────────────

const SCOPES: SearchScope[] = [
  'Everything',
  'Media only',
  'My notes',
  'Saved items',
  'Last 7 days',
  'Work-related',
  'Personal curiosity',
];

const SCOPE_ICONS: Record<SearchScope, string> = {
  'Everything': '⬡',
  'Media only': '▶',
  'My notes': '✎',
  'Saved items': '◈',
  'Last 7 days': '◷',
  'Work-related': '◉',
  'Personal curiosity': '✦',
};

const PLACEHOLDERS = [
  'What should I consume today about AI agents?',
  'What have I collected about telecom churn?',
  'Which media items are relevant to pricing strategy?',
  'What did I save for the weekly memo?',
  'What are the strongest arguments against my current architecture?',
  'Which sources are producing high-value insights?',
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const cfg = {
    high: { label: 'HIGH CONFIDENCE', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    medium: { label: 'MEDIUM CONFIDENCE', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    low: { label: 'LOW CONFIDENCE', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  }[level];
  return (
    <span className={cn('text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function ContentTypeIcon({ type }: { type: string }) {
  const props = 'w-3.5 h-3.5 shrink-0';
  switch (type) {
    case 'podcast':     return <Radio className={props} />;
    case 'youtube':     return <Play className={props} />;
    case 'newsletter':  return <Mail className={props} />;
    default:            return <FileText className={props} />;
  }
}

function ContentTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    podcast:    'bg-violet-500/15 text-violet-400',
    youtube:    'bg-rose-500/15 text-rose-400',
    article:    'bg-sky-500/15 text-sky-400',
    newsletter: 'bg-amber-500/15 text-amber-400',
  };
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide',
      colors[type] || 'bg-muted text-muted-foreground'
    )}>
      <ContentTypeIcon type={type} />
      {type}
    </span>
  );
}

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums text-muted-foreground w-7 text-right">{pct}%</span>
    </div>
  );
}

function ActionFlash({ label, onDone }: { label: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400"
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      {label}
    </motion.div>
  );
}

// ─── Supporting item card ─────────────────────────────────────────────────────

interface SupportingCardProps {
  rank: number;
  item: import('../utils/mockAI').SupportingItemResult;
}

function SupportingCard({ rank, item }: SupportingCardProps) {
  const date = new Date(item.item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-2">
        {/* Rank */}
        <span className="mt-0.5 text-[11px] font-black text-muted-foreground/50 w-4 shrink-0">{rank}</span>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{item.item.title}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <ContentTypeBadge type={item.item.contentType} />
            <span className="opacity-40">·</span>
            <span>{item.source?.name || item.item.creator}</span>
            <span className="opacity-40">·</span>
            <span>{date}</span>
          </div>
        </div>
        <a
          href={item.item.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          title="Open item"
          onClick={(e) => e.preventDefault()}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Relevance bar */}
      <div className="px-6">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-3 h-3 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Match strength</span>
        </div>
        <RelevanceBar score={item.matchScore} />
      </div>

      {/* Excerpt */}
      {item.excerpt && (
        <p className="px-6 text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-3 ml-4">
          "{item.excerpt}"
        </p>
      )}

      {/* Key matches */}
      {item.keyMatches.length > 0 && (
        <div className="px-6 flex flex-wrap gap-1">
          {item.keyMatches.slice(0, 4).map(kw => (
            <span key={kw} className="text-[9px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wide">
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const Ask = () => {
  const [scope, setScope] = useState<SearchScope>('Everything');
  const [query, setQuery] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [history, setHistory] = useState<string[]>(getAskHistory());
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const [actionFlash, setActionFlash] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rotate placeholders
  useEffect(() => {
    const int = setInterval(() => {
      setPlaceholderIdx(p => (p + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(int);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsGenerating(true);
    setResult(null);
    setShowAllItems(false);

    const newHistory = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, 8);
    setHistory(newHistory);
    saveAskHistory(newHistory);

    // Simulate retrieval + synthesis latency
    setTimeout(() => {
      const ans = generateMockAIAnswer(trimmed, scope, getItems(), segments);
      setResult(ans);
      setIsGenerating(false);
    }, 1400);
  };

  const runSuggestedQuery = (q: string) => {
    setQuery(q);
    textareaRef.current?.focus();
  };

  const handleAction = (label: string) => {
    setActionFlash(label);
  };

  const visibleItems = result
    ? showAllItems ? result.supportingItems : result.supportingItems.slice(0, 3)
    : [];

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-3 border-b border-border/50">
        <div className="flex items-baseline gap-2 max-w-2xl mx-auto">
          <h1 className="text-xl font-black tracking-tight">Intelligence Query</h1>
          <span className="text-xs text-muted-foreground font-medium">Reason over your knowledge base</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full space-y-4">

        {/* ── Scope selector ── */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Search Scope</span>
          </div>
          <div className="flex overflow-x-auto gap-1.5 pb-1 no-scrollbar">
            {SCOPES.map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  'whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0',
                  scope === s
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="mr-1 opacity-70">{SCOPE_ICONS[s]}</span>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Query input ── */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="absolute left-3 top-3.5 text-muted-foreground/50">
            <Search className="w-4 h-4" />
          </div>
          <textarea
            ref={textareaRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            rows={3}
            className={cn(
              'w-full bg-card border-2 rounded-xl pl-9 pr-14 py-3.5 resize-none',
              'focus:outline-none transition-colors text-sm leading-relaxed',
              'placeholder:text-muted-foreground/40',
              query ? 'border-primary/50' : 'border-border/60 focus:border-primary/40'
            )}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={!query.trim() || isGenerating}
            className={cn(
              'absolute right-3 bottom-3 w-9 h-9 rounded-lg flex items-center justify-center transition-all',
              'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
              'disabled:opacity-40 disabled:pointer-events-none'
            )}
          >
            {isGenerating
              ? <Sparkles className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
          <p className="absolute right-14 bottom-4 text-[10px] text-muted-foreground/30 font-medium select-none">
            ↵ Send
          </p>
        </form>

        {/* ── Generating state ── */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 space-y-3"
            >
              <div className="relative">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                <div className="absolute inset-0 w-8 h-8 rounded-full bg-primary/20 animate-ping" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-foreground">Synthesizing intelligence…</p>
                <p className="text-xs text-muted-foreground">
                  Scanning {scope === 'Everything' ? 'all items' : `"${scope}"`} · matching keywords · ranking by signal
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Answer panel ── */}
        <AnimatePresence>
          {result && !isGenerating && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Answer card */}
              <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">

                {/* Answer header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Synthesis · {result.totalScanned} item{result.totalScanned !== 1 ? 's' : ''} scanned
                    </span>
                  </div>
                  <ConfidenceBadge level={result.confidence} />
                </div>

                {/* Direct answer */}
                <div className="px-4 py-4">
                  <p className="text-sm leading-relaxed text-foreground">{result.directAnswer}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground/60 italic">{result.confidenceReason}</p>
                </div>

                {/* Action buttons */}
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { icon: Bookmark,    label: 'Save answer',        flash: 'Answer saved to library' },
                      { icon: Newspaper,   label: 'Add to memo',         flash: 'Added to weekly memo' },
                      { icon: HelpCircle,  label: 'Open question',       flash: 'Saved as open question' },
                      { icon: ThumbsUp,    label: 'More like this',      flash: 'Preference noted' },
                      { icon: ThumbsDown,  label: 'Less like this',      flash: 'Preference noted' },
                    ].map(({ icon: Icon, label, flash }) => (
                      <button
                        key={label}
                        onClick={() => handleAction(flash)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold',
                          'border border-border/60 bg-muted/30 text-muted-foreground',
                          'hover:bg-muted hover:text-foreground transition-colors'
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                      </button>
                    ))}
                    <AnimatePresence mode="wait">
                      {actionFlash && (
                        <ActionFlash
                          key={actionFlash}
                          label={actionFlash}
                          onDone={() => setActionFlash(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Supporting items */}
              {result.supportingItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                    Supporting Evidence · {result.supportingItems.length} item{result.supportingItems.length !== 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-2">
                    {visibleItems.map((r, idx) => (
                      <SupportingCard key={r.item.id} rank={idx + 1} item={r} />
                    ))}
                  </div>
                  {result.supportingItems.length > 3 && (
                    <button
                      onClick={() => setShowAllItems(v => !v)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showAllItems
                        ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                        : <><ChevronDown className="w-3.5 h-3.5" /> Show {result.supportingItems.length - 3} more</>
                      }
                    </button>
                  )}
                </div>
              )}

              {/* Relevant segments */}
              {result.relatedSegments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                    Relevant Segments
                  </h3>
                  <div className="space-y-2">
                    {result.relatedSegments.map(seg => (
                      <div key={seg.id} className="bg-muted/20 border border-border/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{seg.title}</p>
                          <span className="text-[10px] text-muted-foreground font-mono">{seg.startTime}–{seg.endTime}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                          "{seg.transcriptExcerpt.slice(0, 160)}{seg.transcriptExcerpt.length > 160 ? '…' : ''}"
                        </p>
                        <p className="text-[11px] text-foreground/80">{seg.segmentSummary}</p>
                        <div className="flex items-center gap-2">
                          <BarChart2 className="w-3 h-3 text-muted-foreground/40" />
                          <div className="flex-1">
                            <RelevanceBar score={seg.relevanceScore} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uncertainties */}
              {result.uncertainties.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                      What the system is uncertain about
                    </h3>
                  </div>
                  <ul className="space-y-1">
                    {result.uncertainties.map((u, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="mt-1 w-1 h-1 rounded-full bg-amber-500/50 shrink-0" />
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested next action */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/15 rounded-lg shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Suggested Next Action</p>
                    <p className="text-sm text-foreground leading-relaxed">{result.suggestedNextAction}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state: History + Suggested questions ── */}
        {!result && !isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Recent queries */}
            {history.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Recent Queries
                </h3>
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => runSuggestedQuery(h)}
                      className="w-full text-left px-3 py-2.5 bg-muted/30 hover:bg-muted border border-border/40 hover:border-border/70 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 group"
                    >
                      <Clock className="w-3 h-3 opacity-40 group-hover:opacity-70 shrink-0 transition-opacity" />
                      <span className="truncate">{h}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested questions */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Suggested Questions
              </h3>
              <div className="space-y-1.5">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => runSuggestedQuery(q)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border group',
                      'bg-card hover:bg-muted/50 border-border/40 hover:border-primary/30',
                      'text-foreground/80 hover:text-foreground'
                    )}
                  >
                    <span className="text-primary/50 group-hover:text-primary mr-2 font-bold transition-colors">→</span>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
