import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Activity, AlertCircle, CheckCircle2,
  Play, BookOpen, LayoutList, LayoutGrid,
  Briefcase, User, Globe, Clock, TrendingUp,
  Bookmark, Star, X, ChevronUp,
} from 'lucide-react';
import { RecommendationBadge } from '../components/shared/RecommendationBadge';
import { ActionControl } from '../components/shared/ActionControl';
import { ScoreDisplay } from '../components/shared/ScoreDisplay';
import { EmptyState } from '../components/shared/EmptyState';
import { ContentIcon } from '../components/shared/ContentIcon';
import { getItems, saveItems } from '../utils/storage';
import { segments, sources, syntheses, WORK_TOPICS, PERSONAL_TOPICS } from '../data/mockData';
import { Item, Source } from '../types';
import { cn } from '../lib/utils';

// ─── helpers ────────────────────────────────────────────────────────────────
// WORK_TOPICS and PERSONAL_TOPICS imported from mockData (single source of truth)

function topicCategory(item: Item): 'work' | 'personal' | 'both' {
  const lower = item.topics.map(t => t.toLowerCase());
  const isWork = lower.some(t => WORK_TOPICS.has(t));
  const isPersonal = lower.some(t => PERSONAL_TOPICS.has(t));
  if (isWork && isPersonal) return 'both';
  if (isPersonal) return 'personal';
  return 'work';
}

function matchesFilter(item: Item, filter: 'all' | 'work' | 'personal'): boolean {
  if (filter === 'all') return true;
  const cat = topicCategory(item);
  if (filter === 'work') return cat === 'work' || cat === 'both';
  return cat === 'personal' || cat === 'both';
}

function formatTime(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─── sub-components ──────────────────────────────────────────────────────────

interface CardState {
  saved: boolean;
  memo: boolean;
  dismissed: boolean;
  summaryExpanded: boolean;
}

interface MustConsumeCardProps {
  item: Item;
  source?: Source;
  compact: boolean;
  state: CardState;
  onAction: (action: 'save' | 'dismiss' | 'memo', id: string) => void;
  onToggleSummary: (id: string) => void;
}

const MustConsumeCard = ({ item, source, compact, state, onAction, onToggleSummary }: MustConsumeCardProps) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -24 }}
    className={cn(
      'rounded-xl border bg-card shadow-sm overflow-hidden transition-colors',
      'border-l-4',
      state.saved
        ? 'border-l-emerald-500 border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10'
        : state.memo
          ? 'border-l-amber-500 border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10'
          : 'border-l-primary border-border',
    )}
    data-testid={`must-consume-card-${item.id}`}
  >
    <div className="p-4 space-y-3">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <ContentIcon type={item.contentType} className="w-3.5 h-3.5" />
            <span className="truncate max-w-[140px]">{source?.name ?? item.creator}</span>
            {item.durationMinutes ? (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span>{item.durationMinutes}m</span>
              </>
            ) : null}
          </div>
          <h3 className="font-bold text-[15px] leading-snug text-foreground">{item.title}</h3>
        </div>
        <ActionControl item={item} className="mt-0.5" />
      </div>

      {/* why now — always visible */}
      <div className="flex gap-2 text-xs rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
        <TrendingUp className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <span className="text-primary font-medium leading-snug">{item.whyRecommended}</span>
      </div>

      {!compact && (
        <>
          <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
          <ScoreDisplay relevance={item.relevanceScore} novelty={item.noveltyScore} importance={item.importanceScore} />
        </>
      )}

      {/* actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <button
          onClick={() => onAction('save', item.id)}
          data-testid={`save-btn-${item.id}`}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95',
            state.saved
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
          )}
        >
          <Bookmark className={cn('w-3.5 h-3.5', state.saved && 'fill-current')} />
          {state.saved ? 'Saved' : 'Save'}
        </button>
        <button
          onClick={() => onAction('memo', item.id)}
          data-testid={`memo-btn-${item.id}`}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95',
            state.memo
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
          )}
        >
          <Star className={cn('w-3.5 h-3.5', state.memo && 'fill-current')} />
          {state.memo ? 'In Memo' : 'Add to Memo'}
        </button>
        <button
          onClick={() => onAction('dismiss', item.id)}
          data-testid={`dismiss-btn-${item.id}`}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground hover:text-destructive hover:bg-secondary/70 transition-all active:scale-95"
        >
          <X className="w-3.5 h-3.5" />
          Dismiss
        </button>
      </div>
    </div>
  </motion.div>
);

interface SegmentRowProps {
  segment: typeof segments[0];
  itemTitle?: string;
  onPlay?: () => void;
}

const SegmentRow = ({ segment, itemTitle, onPlay }: SegmentRowProps) => (
  <div className="rounded-xl border bg-card shadow-sm p-4 space-y-2.5" data-testid={`segment-row-${segment.id}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">
            {segment.startTime}–{segment.endTime}
          </span>
          {itemTitle && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{itemTitle}</span>
          )}
        </div>
        <h4 className="font-semibold text-sm leading-snug text-foreground">{segment.title}</h4>
      </div>
      <RecommendationBadge action={segment.recommendedAction} className="shrink-0" />
    </div>

    <p className="text-xs text-primary font-medium leading-snug border-l-2 border-primary/40 pl-2.5">
      {segment.whyRecommended}
    </p>

    <p className="text-xs italic text-muted-foreground leading-relaxed line-clamp-2 border-l-2 border-border pl-2.5">
      "{segment.transcriptExcerpt}"
    </p>

    <div className="flex items-center gap-2 pt-1 border-t border-border/40">
      <button
        onClick={onPlay}
        data-testid={`play-segment-btn-${segment.id}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        Play segment
      </button>
      <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
        <span className="font-medium">R</span>
        <span className="font-mono">{segment.relevanceScore.toFixed(2)}</span>
      </div>
    </div>
  </div>
);

interface SkimCardProps {
  item: Item;
  source?: Source;
  compact: boolean;
  state: CardState;
  onAction: (action: 'save' | 'dismiss' | 'memo', id: string) => void;
  onToggleSummary: (id: string) => void;
}

const SkimCard = ({ item, source, compact, state, onAction, onToggleSummary }: SkimCardProps) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -24 }}
    className={cn(
      'rounded-xl border bg-card shadow-sm overflow-hidden transition-colors',
      state.saved && 'border-emerald-500/25 bg-emerald-50/20 dark:bg-emerald-950/10',
      state.memo && 'border-amber-500/25 bg-amber-50/10 dark:bg-amber-950/10',
    )}
    data-testid={`skim-card-${item.id}`}
  >
    <div className="p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <ContentIcon type={item.contentType} className="w-3.5 h-3.5" />
            <span className="truncate max-w-[140px]">{source?.name ?? item.creator}</span>
            {item.durationMinutes ? (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span>{item.durationMinutes}m</span>
              </>
            ) : null}
          </div>
          <h3 className="font-semibold text-sm leading-snug text-foreground">{item.title}</h3>
        </div>
        <ActionControl item={item} />
      </div>

      {!compact && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
      )}

      <AnimatePresence>
        {state.summaryExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg bg-secondary/40 border border-border/50 p-3 text-xs text-foreground leading-relaxed space-y-1">
              <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5">2-min summary</p>
              <p>{item.summary}</p>
              <p className="text-muted-foreground italic">{item.whyRecommended}</p>
              {!compact && (
                <ScoreDisplay relevance={item.relevanceScore} novelty={item.noveltyScore} importance={item.importanceScore} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <button
          onClick={() => onToggleSummary(item.id)}
          data-testid={`skim-summary-btn-${item.id}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95"
        >
          <BookOpen className="w-3.5 h-3.5" />
          {state.summaryExpanded ? 'Collapse' : 'Read 2-min summary'}
        </button>
        <button
          onClick={() => onAction('save', item.id)}
          data-testid={`skim-save-btn-${item.id}`}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95',
            state.saved
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
          )}
        >
          <Bookmark className={cn('w-3.5 h-3.5', state.saved && 'fill-current')} />
          {state.saved ? 'Saved' : 'Save'}
        </button>
        <button
          onClick={() => onAction('memo', item.id)}
          data-testid={`skim-memo-btn-${item.id}`}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95',
            state.memo
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
          )}
        >
          <Star className={cn('w-3.5 h-3.5', state.memo && 'fill-current')} />
          Memo
        </button>
        <button
          onClick={() => onAction('dismiss', item.id)}
          data-testid={`skim-dismiss-btn-${item.id}`}
          className="ml-auto flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground hover:text-destructive hover:bg-secondary/70 transition-all active:scale-95"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </motion.div>
);

interface SkipCardProps {
  item: Item;
  source?: Source;
  onAction: (action: 'save' | 'dismiss' | 'memo', id: string) => void;
  state: CardState;
}

const SkipCard = ({ item, source, onAction, state }: SkipCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -24 }}
    className="rounded-xl border bg-card/60 shadow-sm p-3.5 flex items-start gap-3 opacity-70 hover:opacity-100 transition-opacity"
    data-testid={`skip-card-${item.id}`}
  >
    <ContentIcon type={item.contentType} className="w-4 h-4 text-muted-foreground mt-0.5" />
    <div className="flex-1 min-w-0 space-y-1">
      <h4 className="font-medium text-sm leading-snug text-foreground line-clamp-1">{item.title}</h4>
      <p className="text-xs text-muted-foreground leading-snug">{item.whyRecommended}</p>
    </div>
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <RecommendationBadge action={item.recommendedAction} />
      <button
        onClick={() => onAction('dismiss', item.id)}
        data-testid={`skip-dismiss-btn-${item.id}`}
        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
      >
        Dismiss
      </button>
    </div>
  </motion.div>
);

// ─── section header ──────────────────────────────────────────────────────────

interface SectionHeaderProps {
  dot?: string;
  icon?: React.ReactNode;
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  muted?: boolean;
}

const SectionHeader = ({ dot, icon, label, count, expanded, onToggle, muted }: SectionHeaderProps) => (
  <button
    onClick={onToggle}
    className="flex items-center w-full text-left gap-2 group"
    data-testid={`section-toggle-${label.toLowerCase().replace(/\s/g, '-')}`}
  >
    {dot && <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />}
    {icon}
    <span className={cn('text-base font-bold flex-1', muted && 'text-muted-foreground')}>
      {label}
      <span className="ml-1.5 text-sm font-normal text-muted-foreground">({count})</span>
    </span>
    {expanded
      ? <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      : <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />}
  </button>
);

// ─── main page ───────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'work' | 'personal';

interface ItemUIState {
  saved: boolean;
  memo: boolean;
  dismissed: boolean;
  summaryExpanded: boolean;
}

export const Today = () => {
  const [items, setItems] = useState<Item[]>(getItems());
  const [filter, setFilter] = useState<FilterMode>('all');
  const [compact, setCompact] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    mustConsume: true,
    segments: true,
    skim: true,
    skip: false,
    memo: true,
    loops: true,
  });
  const [uiState, setUiState] = useState<Record<string, ItemUIState>>(() => {
    const init: Record<string, ItemUIState> = {};
    getItems().forEach(item => {
      init[item.id] = {
        saved: item.status === 'saved',
        memo: false,
        dismissed: item.status === 'dismissed',
        summaryExpanded: false,
      };
    });
    return init;
  });

  const getState = (id: string): ItemUIState =>
    uiState[id] ?? { saved: false, memo: false, dismissed: false, summaryExpanded: false };

  const handleAction = (action: 'save' | 'dismiss' | 'memo', id: string) => {
    setUiState(prev => {
      const cur = prev[id] ?? { saved: false, memo: false, dismissed: false, summaryExpanded: false };
      const next = { ...cur };
      if (action === 'save') next.saved = !cur.saved;
      if (action === 'dismiss') next.dismissed = true;
      if (action === 'memo') next.memo = !cur.memo;
      return { ...prev, [id]: next };
    });

    const updated = items.map(i => {
      if (i.id !== id) return i;
      if (action === 'save') return { ...i, status: (i.status === 'saved' ? 'new' : 'saved') as Item['status'] };
      if (action === 'dismiss') return { ...i, status: 'dismissed' as Item['status'] };
      return i;
    });
    setItems(updated);
    saveItems(updated);
  };

  const handleToggleSummary = (id: string) => {
    setUiState(prev => {
      const cur = prev[id] ?? { saved: false, memo: false, dismissed: false, summaryExpanded: false };
      return { ...prev, [id]: { ...cur, summaryExpanded: !cur.summaryExpanded } };
    });
  };

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const getSource = (sourceId: string) => sources.find(s => s.id === sourceId);

  // Derived filtered lists
  const active = useMemo(
    () => items.filter(i => !getState(i.id).dismissed && matchesFilter(i, filter)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, filter, uiState],
  );

  const mustConsume = useMemo(
    () =>
      active
        .filter(i => i.recommendedAction === 'deep_consume' && i.importanceScore >= 0.85 && i.confidence === 'high')
        .sort((a, b) => b.importanceScore - a.importanceScore),
    [active],
  );

  const skimCandidates = useMemo(
    () => active.filter(i => i.recommendedAction === 'skim').sort((a, b) => b.relevanceScore - a.relevanceScore),
    [active],
  );

  const skipCandidates = useMemo(
    () => active.filter(i => i.recommendedAction === 'skip'),
    [active],
  );

  const memoCandidates = useMemo(
    () => active.filter(i => getState(i.id).saved || getState(i.id).memo || i.status === 'saved'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, uiState],
  );

  const bestSegments = useMemo(
    () =>
      segments
        .filter(s => {
          const item = items.find(i => i.id === s.itemId);
          if (!item) return false;
          if (getState(item.id).dismissed) return false;
          if (!matchesFilter(item, filter)) return false;
          return s.recommendedAction === 'deep_consume' || s.recommendedAction === 'segment';
        })
        .sort((a, b) => b.relevanceScore - a.relevanceScore),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, filter, uiState],
  );

  const latestSynthesis = syntheses[0];

  // Summary stats
  const totalActive = active.length;
  const savedCount = active.filter(i => getState(i.id).saved).length;
  const memoCount = active.filter(i => getState(i.id).memo).length;
  const timeSaved = skipCandidates.reduce((acc, i) => acc + (i.durationMinutes ?? 20), 0);

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-full bg-background pb-2" data-testid="today-page">
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">

        {/* ── date header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Today's Briefing</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Activity className="w-3.5 h-3.5 text-primary" />
              {dateStr}
            </p>
          </div>
          <button
            onClick={() => setCompact(c => !c)}
            data-testid="compact-toggle"
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
              compact
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-secondary',
            )}
          >
            {compact ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
            {compact ? 'Detailed' : 'Compact'}
          </button>
        </div>

        {/* ── summary strip ── */}
        <div className="grid grid-cols-5 gap-0 rounded-xl border bg-card shadow-sm overflow-hidden" data-testid="summary-strip">
          {[
            { label: 'Reviewed', value: totalActive, icon: <Activity className="w-3.5 h-3.5" /> },
            { label: 'Must-read', value: mustConsume.length, icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> },
            { label: 'Segments', value: bestSegments.length, icon: <Play className="w-3.5 h-3.5 text-blue-500" /> },
            { label: 'Time saved', value: formatTime(timeSaved), icon: <Clock className="w-3.5 h-3.5 text-amber-500" /> },
            { label: 'Memo', value: savedCount + memoCount, icon: <Star className="w-3.5 h-3.5 text-amber-500" /> },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                'flex flex-col items-center justify-center py-3 px-1 gap-0.5 text-center',
                i < 4 && 'border-r border-border',
              )}
            >
              <div className="text-muted-foreground">{stat.icon}</div>
              <div className="text-base font-bold text-foreground leading-none">{stat.value}</div>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── filter tabs ── */}
        <div className="flex gap-1.5" data-testid="filter-tabs">
          {([
            { key: 'all', label: 'All', icon: <Globe className="w-3.5 h-3.5" /> },
            { key: 'work', label: 'Work', icon: <Briefcase className="w-3.5 h-3.5" /> },
            { key: 'personal', label: 'Personal', icon: <User className="w-3.5 h-3.5" /> },
          ] as { key: FilterMode; label: string; icon: React.ReactNode }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              data-testid={`filter-${f.key}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                filter === f.key
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-secondary',
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* ── all-clear state ── */}
        {active.length === 0 && (
          <EmptyState
            icon={<CheckCircle2 className="w-5 h-5" />}
            title="Briefing complete"
            description={
              filter === 'all'
                ? 'All items reviewed for today. New content will surface tomorrow.'
                : `No ${filter} items in today's queue — switch to "All" to see everything.`
            }
          />
        )}

        {/* ── 1. must consume ── */}
        {mustConsume.length > 0 && (
          <section className="space-y-3" data-testid="section-must-consume">
            <SectionHeader
              dot="bg-emerald-500"
              label="Must consume today"
              count={mustConsume.length}
              expanded={expandedSections.mustConsume}
              onToggle={() => toggleSection('mustConsume')}
            />
            <AnimatePresence>
              {expandedSections.mustConsume && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  {mustConsume.map(item => (
                    <AnimatePresence key={item.id}>
                      {!getState(item.id).dismissed && (
                        <MustConsumeCard
                          item={item}
                          source={getSource(item.sourceId)}
                          compact={compact}
                          state={getState(item.id)}
                          onAction={handleAction}
                          onToggleSummary={handleToggleSummary}
                        />
                      )}
                    </AnimatePresence>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* ── 2. best segments ── */}
        {bestSegments.length > 0 && (
          <section className="space-y-3" data-testid="section-segments">
            <SectionHeader
              dot="bg-blue-500"
              label="Best segments"
              count={bestSegments.length}
              expanded={expandedSections.segments}
              onToggle={() => toggleSection('segments')}
            />
            <AnimatePresence>
              {expandedSections.segments && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  {bestSegments.map(seg => {
                    const item = items.find(i => i.id === seg.itemId);
                    return (
                      <SegmentRow
                        key={seg.id}
                        segment={seg}
                        itemTitle={item?.title}
                        onPlay={() => {}}
                      />
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* ── 3. skim candidates ── */}
        {skimCandidates.length > 0 && (
          <section className="space-y-3" data-testid="section-skim">
            <SectionHeader
              dot="bg-amber-400"
              label="Skim candidates"
              count={skimCandidates.length}
              expanded={expandedSections.skim}
              onToggle={() => toggleSection('skim')}
            />
            <AnimatePresence>
              {expandedSections.skim && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  {skimCandidates.map(item => (
                    <AnimatePresence key={item.id}>
                      {!getState(item.id).dismissed && (
                        <SkimCard
                          item={item}
                          source={getSource(item.sourceId)}
                          compact={compact}
                          state={getState(item.id)}
                          onAction={handleAction}
                          onToggleSummary={handleToggleSummary}
                        />
                      )}
                    </AnimatePresence>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* ── 4. safe to skip ── */}
        {skipCandidates.length > 0 && (
          <section className="space-y-3" data-testid="section-skip">
            <SectionHeader
              muted
              dot="bg-muted-foreground/40"
              label="Safe to skip"
              count={skipCandidates.length}
              expanded={expandedSections.skip}
              onToggle={() => toggleSection('skip')}
            />
            {!expandedSections.skip && (
              <p className="text-xs text-muted-foreground pl-4">
                {skipCandidates.length} item{skipCandidates.length !== 1 ? 's' : ''} scored below novelty threshold — expand to review skip reasons.
              </p>
            )}
            <AnimatePresence>
              {expandedSections.skip && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  {skipCandidates.map(item => (
                    <AnimatePresence key={item.id}>
                      {!getState(item.id).dismissed && (
                        <SkipCard
                          item={item}
                          source={getSource(item.sourceId)}
                          state={getState(item.id)}
                          onAction={handleAction}
                        />
                      )}
                    </AnimatePresence>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* ── 5. weekly memo candidates ── */}
        <section className="space-y-3" data-testid="section-memo">
          <SectionHeader
            icon={<Star className="w-4 h-4 text-amber-500 shrink-0" />}
            label="Weekly memo candidates"
            count={memoCandidates.length}
            expanded={expandedSections.memo}
            onToggle={() => toggleSection('memo')}
          />
          <AnimatePresence>
            {expandedSections.memo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {memoCandidates.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-4">No items saved to memo yet. Save or star items above.</p>
                ) : (
                  memoCandidates.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10 p-3.5 flex items-start gap-3"
                      data-testid={`memo-candidate-${item.id}`}
                    >
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground leading-snug">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.summary}</p>
                      </div>
                      <RecommendationBadge action={item.recommendedAction} className="shrink-0" />
                    </div>
                  ))
                )}

                {/* mini synthesis preview */}
                {latestSynthesis && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2.5" data-testid="synthesis-preview">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Weekly synthesis preview</span>
                      <span className="text-[10px] text-muted-foreground">{latestSynthesis.date}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{latestSynthesis.title}</p>
                    <ul className="space-y-1">
                      {latestSynthesis.keyInsights.map((insight, i) => (
                        <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                          <span className="text-primary font-bold shrink-0 mt-0.5">—</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                    {latestSynthesis.actions.length > 0 && (
                      <div className="pt-1 border-t border-border/50">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Actions</p>
                        {latestSynthesis.actions.map((action, i) => (
                          <p key={i} className="text-xs text-foreground">→ {action}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── 6. open loops ── */}
        {latestSynthesis && latestSynthesis.openQuestions.length > 0 && (
          <section className="space-y-3 pb-4" data-testid="section-loops">
            <SectionHeader
              icon={<AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
              label="Open loops"
              count={latestSynthesis.openQuestions.length}
              expanded={expandedSections.loops}
              onToggle={() => toggleSection('loops')}
            />
            <AnimatePresence>
              {expandedSections.loops && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  {latestSynthesis.openQuestions.map((q, i) => (
                    <div
                      key={i}
                      className="flex gap-3 p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/60 dark:border-amber-900/30"
                      data-testid={`open-loop-${i}`}
                    >
                      <span className="text-amber-500 font-bold text-sm mt-0.5 shrink-0">?</span>
                      <p className="text-sm text-amber-900 dark:text-amber-200 font-medium leading-snug">{q}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

      </div>
    </div>
  );
};
