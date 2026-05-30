import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, Mic, FileText, Upload, PlusCircle,
  Loader2, CheckCircle2, ChevronDown, ChevronUp,
  Clock, Tag, Briefcase, User, Users,
  ExternalLink, Eye, X, ArrowRight,
  AudioWaveform, Sparkles, AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getCaptures, saveCaptures, getSources, saveSources } from '../utils/storage';
import { captureApi } from '../lib/api';
import { toast } from '../hooks/use-toast';
import { FileUpload } from '../components/capture/FileUpload';
import { VoiceRecorder } from '../components/capture/VoiceRecorder';
import { MeetingCapture } from '../components/capture/MeetingCapture';
import {
  CapturedItem, CaptureCategory, Priority, VoiceExtraction, Source
} from '../types';


// ─── helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}

const KNOWN_TOPIC_KEYWORDS: Record<string, string> = {
  'ai': 'AI', 'agent': 'AI agents', 'llm': 'LLMs', 'gpt': 'LLMs',
  'pric': 'pricing strategy', 'saas': 'SaaS', 'enterprise': 'enterprise software',
  'churn': 'telecom churn', 'telecom': 'telecom churn', 'leadership': 'leadership',
  'product': 'product management', 'engineer': 'software engineering',
  'startup': 'startups', 'venture': 'venture capital', 'invest': 'venture capital',
};

function extractTopicsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [keyword, topic] of Object.entries(KNOWN_TOPIC_KEYWORDS)) {
    if (lower.includes(keyword)) found.add(topic);
  }
  return found.size > 0 ? [...found].slice(0, 4) : ['general'];
}

// ─── field primitives ────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

const Field = ({ label, error, children }: FieldProps) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
    {children}
    {error && (
      <p className="text-[11px] text-destructive flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />{error}
      </p>
    )}
  </div>
);

const inputCls = "w-full bg-secondary/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all min-h-[44px]";
const textareaCls = "w-full bg-secondary/40 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none";

// ─── priority + category selectors ───────────────────────────────────────────

const PrioritySelect = ({ value, onChange }: { value: Priority; onChange: (v: Priority) => void }) => (
  <div className="flex gap-1.5">
    {(['low', 'medium', 'high'] as Priority[]).map(p => (
      <button
        key={p}
        type="button"
        onClick={() => onChange(p)}
        className={cn(
          'flex-1 py-2 rounded-lg text-xs font-semibold border capitalize transition-all active:scale-95',
          value === p
            ? p === 'high' ? 'bg-red-500 text-white border-red-500'
              : p === 'medium' ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-secondary text-secondary-foreground border-border'
            : 'bg-card text-muted-foreground border-border hover:bg-secondary',
        )}
      >{p}</button>
    ))}
  </div>
);

const CategorySelect = ({ value, onChange }: { value: CaptureCategory; onChange: (v: CaptureCategory) => void }) => (
  <div className="flex gap-1.5">
    {([
      { key: 'work' as const, icon: <Briefcase className="w-3.5 h-3.5" />, label: 'Work' },
      { key: 'personal' as const, icon: <User className="w-3.5 h-3.5" />, label: 'Personal' },
      { key: 'both' as const, icon: <Users className="w-3.5 h-3.5" />, label: 'Both' },
    ]).map(c => (
      <button
        key={c.key}
        type="button"
        onClick={() => onChange(c.key)}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all active:scale-95',
          value === c.key
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card text-muted-foreground border-border hover:bg-secondary',
        )}
      >
        {c.icon}{c.label}
      </button>
    ))}
  </div>
);

// ─── status badge ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  captured: 'Captured',
  processing: 'Extracting content',
  summarized: 'Summarizing',
  ready: 'Ready for review',
};

const StatusBadge = ({ status }: { status: string }) => {
  const isActive = status === 'processing' || status === 'summarized';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
      status === 'ready' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40',
      status === 'captured' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40',
      isActive && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40',
    )}>
      {isActive ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : status === 'ready' ? <CheckCircle2 className="w-2.5 h-2.5" /> : null}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
};

// ─── type icon ───────────────────────────────────────────────────────────────

const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
  switch (type) {
    case 'link': return <Link2 className={className} />;
    case 'voice': return <Mic className={className} />;
    case 'text': return <FileText className={className} />;
    case 'source': return <PlusCircle className={className} />;
    default: return <FileText className={className} />;
  }
};

// ─── recent capture card ──────────────────────────────────────────────────────

interface RecentCardProps {
  cap: CapturedItem;
  onDismiss: (id: string) => void;
  onConvert: (id: string) => void;
}

const RecentCard = ({ cap, onDismiss, onConvert }: RecentCardProps) => {
  const [expanded, setExpanded] = useState(false);

  if (cap.dismissed) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'rounded-xl border bg-card shadow-sm overflow-hidden transition-colors',
        cap.convertedToItem && 'opacity-60',
      )}
      data-testid={`capture-card-${cap.id}`}
    >
      <div className="p-3.5 space-y-2.5">
        {/* header */}
        <div className="flex items-start gap-2.5">
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
            cap.type === 'link' && 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
            cap.type === 'voice' && 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
            cap.type === 'text' && 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
            cap.type === 'source' && 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
          )}>
            <TypeIcon type={cap.type} className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground leading-snug line-clamp-1">{cap.title}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />{timeAgo(cap.capturedAt)}
              </span>
              <StatusBadge status={cap.status} />
              {cap.priority && (
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize',
                  cap.priority === 'high' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                  cap.priority === 'medium' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                  cap.priority === 'low' && 'bg-secondary text-muted-foreground',
                )}>{cap.priority}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            data-testid={`expand-capture-${cap.id}`}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* topics */}
        {cap.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 pl-9">
            {cap.topics.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border font-medium">{t}</span>
            ))}
          </div>
        )}

        {/* expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pl-9 space-y-2 pt-1">
                {cap.url && (
                  <a href={cap.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline break-all">
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {cap.url}
                  </a>
                )}
                {(cap.note || cap.content) && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{cap.note ?? cap.content}</p>
                )}
                {cap.voiceExtraction && (
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30 p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-purple-700 dark:text-purple-400">AI extraction</p>
                    <p className="text-xs font-semibold text-foreground">{cap.voiceExtraction.title}</p>
                    <p className="text-xs text-muted-foreground">{cap.voiceExtraction.summary}</p>
                    <p className="text-xs"><span className="font-medium">Action: </span>{cap.voiceExtraction.possibleAction}</p>
                    <p className="text-xs"><span className="font-medium">Category: </span>{cap.voiceExtraction.suggestedCategory}</p>
                  </div>
                )}
                {cap.category && (
                  <p className="text-xs text-muted-foreground capitalize">Category: <span className="text-foreground font-medium">{cap.category}</span></p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* actions */}
        <div className="flex items-center gap-2 pl-9">
          <button
            onClick={() => setExpanded(e => !e)}
            data-testid={`review-capture-${cap.id}`}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {expanded ? 'Collapse' : 'Review'}
          </button>

          {!cap.convertedToItem && (
            <button
              onClick={() => onConvert(cap.id)}
              data-testid={`convert-capture-${cap.id}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors ml-auto"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Convert to item
            </button>
          )}

          {cap.convertedToItem && (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />Converted
            </span>
          )}

          <button
            onClick={() => onDismiss(cap.id)}
            data-testid={`dismiss-capture-${cap.id}`}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── schemas ──────────────────────────────────────────────────────────────────

const linkSchema = z.object({
  url: z.string().url('Enter a valid URL'),
  title: z.string().optional(),
  note: z.string().optional(),
  topics: z.string().optional(),
});

const textSchema = z.object({
  content: z.string().min(1, 'Note cannot be empty'),
  topics: z.string().optional(),
  project: z.string().optional(),
});

const sourceSchema = z.object({
  name: z.string().min(1, 'Name required'),
  url: z.string().url('Enter a valid URL'),
  topics: z.string().optional(),
});

// ─── mode config ──────────────────────────────────────────────────────────────

type CaptureMode = 'link' | 'voice' | 'meeting' | 'text' | 'file' | 'source';

const MODES: { id: CaptureMode; icon: React.ReactNode; label: string }[] = [
  { id: 'link', icon: <Link2 className="w-5 h-5" />, label: 'Link' },
  { id: 'voice', icon: <Mic className="w-5 h-5" />, label: 'Voice' },
  { id: 'meeting', icon: <Users className="w-5 h-5" />, label: 'Meeting' },
  { id: 'text', icon: <FileText className="w-5 h-5" />, label: 'Text' },
  { id: 'file', icon: <Upload className="w-5 h-5" />, label: 'File' },
  { id: 'source', icon: <PlusCircle className="w-5 h-5" />, label: 'Source' },
];

// ─── main component ───────────────────────────────────────────────────────────

export const Capture = () => {
  const [mode, setMode] = useState<CaptureMode>('link');
  const [captures, setCaptures] = useState<CapturedItem[]>(getCaptures);
  const [sources, setSources] = useState<Source[]>(getSources);

  // Link form state
  const [linkPriority, setLinkPriority] = useState<Priority>('medium');
  const [linkCategory, setLinkCategory] = useState<CaptureCategory>('work');
  const [linkSuccess, setLinkSuccess] = useState(false);

  // Text state
  const [textPriority, setTextPriority] = useState<Priority>('medium');
  const [textCategory, setTextCategory] = useState<CaptureCategory>('work');
  const [textSuccess, setTextSuccess] = useState(false);

  // Source form state
  const [srcType, setSrcType] = useState<string>('podcast');
  const [srcPriority, setSrcPriority] = useState<Priority>('medium');
  const [srcTrust, setSrcTrust] = useState<string>('medium');
  const [srcActive, setSrcActive] = useState(true);
  const [srcSuccess, setSrcSuccess] = useState(false);

  // Forms
  const linkForm = useForm<z.infer<typeof linkSchema>>({
    resolver: zodResolver(linkSchema),
    defaultValues: { url: '', title: '', note: '', topics: '' },
  });
  const textForm = useForm<z.infer<typeof textSchema>>({
    resolver: zodResolver(textSchema),
    defaultValues: { content: '', topics: '', project: '' },
  });
  const sourceForm = useForm<z.infer<typeof sourceSchema>>({
    resolver: zodResolver(sourceSchema),
    defaultValues: { name: '', url: '', topics: '' },
  });

  // TODO Phase 2: Replace status progression with a real ingestion job watcher.
  // POST /api/captures → returns { id, jobId }. Poll GET /api/jobs/:jobId for status updates.
  const addCapture = useCallback((item: Omit<CapturedItem, 'id' | 'capturedAt' | 'status'>) => {
    // Writes are real + instant now — no simulated progression. Land in 'ready'.
    const newItem: CapturedItem = {
      ...item,
      id: `cap_${Date.now()}`,
      capturedAt: new Date().toISOString(),
      status: 'ready',
    };
    setCaptures(prev => {
      const next = [newItem, ...prev].slice(0, 20);
      saveCaptures(next);
      return next;
    });
    toast({ title: 'Saved to your vault', description: newItem.title });
    return newItem.id;
  }, []);

  const dismissCapture = useCallback((id: string) => {
    setCaptures(prev => {
      const next = prev.map(c => c.id === id ? { ...c, dismissed: true } : c);
      saveCaptures(next);
      return next;
    });
  }, []);

  const convertCapture = useCallback((id: string) => {
    setCaptures(prev => {
      const next = prev.map(c => c.id === id ? { ...c, convertedToItem: true } : c);
      saveCaptures(next);
      return next;
    });
  }, []);

  // ── Link submit
  const onLinkSubmit = (data: z.infer<typeof linkSchema>) => {
    const tags = parseTags(data.topics ?? '');
    const guessedTitle = data.url.replace(/^https?:\/\//, '').split('/')[0];
    addCapture({
      type: 'link',
      title: data.title || guessedTitle,
      url: data.url,
      note: data.note,
      topics: tags.length > 0 ? tags : extractTopicsFromText(data.note ?? data.url),
      priority: linkPriority,
      category: linkCategory,
    });
    linkForm.reset();
    setLinkSuccess(true);
    setTimeout(() => setLinkSuccess(false), 2000);
  };

  // ── Text submit
  const onTextSubmit = (data: z.infer<typeof textSchema>) => {
    const tags = parseTags(data.topics ?? '');
    addCapture({
      type: 'text',
      title: data.content.slice(0, 50) + (data.content.length > 50 ? '...' : ''),
      content: data.content,
      note: data.project ? `Project: ${data.project}` : undefined,
      topics: tags.length > 0 ? tags : extractTopicsFromText(data.content),
      priority: textPriority,
      category: textCategory,
    });
    // Persist to the real vault (Haiku classifies domain/title, then write_note).
    const body = data.project ? `${data.content}\n\nProject: ${data.project}` : data.content;
    captureApi(body, 'note').catch((e) => console.error('vault capture failed', e));
    textForm.reset();
    setTextSuccess(true);
    setTimeout(() => setTextSuccess(false), 2000);
  };

  // ── Source submit
  const onSourceSubmit = (data: z.infer<typeof sourceSchema>) => {
    const newSource: Source = {
      id: `src_${Date.now()}`,
      name: data.name,
      type: srcType as Source['type'],
      url: data.url,
      priority: srcPriority as Priority,
      trustLevel: srcTrust as Source['trustLevel'],
      active: srcActive,
      topics: parseTags(data.topics ?? ''),
      lastCheckedAt: new Date().toISOString(),
    };
    const updated = [newSource, ...sources];
    setSources(updated);
    saveSources(updated);
    addCapture({
      type: 'source',
      title: `Source: ${data.name}`,
      url: data.url,
      topics: parseTags(data.topics ?? ''),
      priority: srcPriority as Priority,
    });
    sourceForm.reset();
    setSrcSuccess(true);
    setTimeout(() => setSrcSuccess(false), 2000);
  };

  const visibleCaptures = captures.filter(c => !c.dismissed);

  const submitBtnCls = "w-full min-h-[50px] py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm";

  return (
    <div className="min-h-full bg-background flex flex-col" data-testid="capture-page">

      {/* ── mode tabs ── */}
      <div className="sticky top-[56px] z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex overflow-x-auto gap-1.5 px-4 py-3 no-scrollbar">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              data-testid={`mode-${m.id}`}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border whitespace-nowrap transition-all active:scale-95 min-h-[40px]',
                mode === m.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-secondary',
              )}
            >
              {m.icon}{m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-4 pb-6 space-y-6">

        {/* ══ LINK FORM ══ */}
        {mode === 'link' && (
          <motion.div key="link" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-base text-foreground">Capture a link</h2>

            <form onSubmit={linkForm.handleSubmit(onLinkSubmit)} className="space-y-4">
              <Field label="URL *" error={linkForm.formState.errors.url?.message}>
                <input
                  {...linkForm.register('url')}
                  type="url"
                  placeholder="https://..."
                  className={inputCls}
                  autoFocus
                  data-testid="link-url-input"
                />
              </Field>

              <Field label="Title (optional)">
                <input
                  {...linkForm.register('title')}
                  placeholder="Auto-extracted if blank"
                  className={inputCls}
                  data-testid="link-title-input"
                />
              </Field>

              <Field label="Note (optional)">
                <textarea
                  {...linkForm.register('note')}
                  rows={2}
                  placeholder="Why are you saving this?"
                  className={textareaCls}
                  data-testid="link-note-input"
                />
              </Field>

              <Field label="Topic tags">
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    {...linkForm.register('topics')}
                    placeholder="pricing, AI agents, SaaS"
                    className={cn(inputCls, 'pl-8')}
                    data-testid="link-topics-input"
                  />
                </div>
              </Field>

              <Field label="Category">
                <CategorySelect value={linkCategory} onChange={setLinkCategory} />
              </Field>

              <Field label="Priority">
                <PrioritySelect value={linkPriority} onChange={setLinkPriority} />
              </Field>

              <button type="submit" className={submitBtnCls} data-testid="link-submit">
                {linkSuccess
                  ? <><CheckCircle2 className="w-4 h-4" />Captured!</>
                  : <><Link2 className="w-4 h-4" />Capture link</>}
              </button>
            </form>
          </motion.div>
        )}

        {/* ══ VOICE NOTE ══ */}
        {mode === 'voice' && (
          <motion.div key="voice" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-base text-foreground">Voice note</h2>
            <VoiceRecorder onSaved={(title) => addCapture({ type: 'voice', title, topics: [] })} />
          </motion.div>
        )}

        {/* ══ MEETING ══ */}
        {mode === 'meeting' && (
          <motion.div key="meeting" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="font-bold text-base text-foreground">Meeting</h2>
              <p className="text-xs text-muted-foreground">Turkish transcription with speaker labels → summary, decisions & action items.</p>
            </div>
            <MeetingCapture onSaved={(title) => addCapture({ type: 'voice', title, topics: ['meeting'] })} />
          </motion.div>
        )}

        {/* ══ TEXT NOTE ══ */}
        {mode === 'text' && (
          <motion.div key="text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-base text-foreground">Text note</h2>

            <form onSubmit={textForm.handleSubmit(onTextSubmit)} className="space-y-4">
              <Field label="Note *" error={textForm.formState.errors.content?.message}>
                <textarea
                  {...textForm.register('content')}
                  rows={5}
                  placeholder="What's on your mind?"
                  className={textareaCls}
                  autoFocus
                  data-testid="text-content-input"
                />
              </Field>

              <Field label="Topic tags">
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    {...textForm.register('topics')}
                    placeholder="pricing, AI agents, leadership"
                    className={cn(inputCls, 'pl-8')}
                    data-testid="text-topics-input"
                  />
                </div>
              </Field>

              <Field label="Link to project / theme">
                <input
                  {...textForm.register('project')}
                  placeholder="e.g. Q3 pricing review, AI roadmap"
                  className={inputCls}
                  data-testid="text-project-input"
                />
              </Field>

              <Field label="Category">
                <CategorySelect value={textCategory} onChange={setTextCategory} />
              </Field>

              <Field label="Priority">
                <PrioritySelect value={textPriority} onChange={setTextPriority} />
              </Field>

              <button type="submit" className={submitBtnCls} data-testid="text-submit">
                {textSuccess
                  ? <><CheckCircle2 className="w-4 h-4" />Saved!</>
                  : <><FileText className="w-4 h-4" />Save note</>}
              </button>
            </form>
          </motion.div>
        )}

        {/* ══ FILE UPLOAD ══ */}
        {mode === 'file' && (
          <motion.div key="file" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <FileUpload onSaved={(title) => addCapture({ type: 'text', title, topics: [] })} />
          </motion.div>
        )}

        {/* ══ ADD SOURCE ══ */}
        {mode === 'source' && (
          <motion.div key="source" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-base text-foreground">Add source</h2>

            <form onSubmit={sourceForm.handleSubmit(onSourceSubmit)} className="space-y-4">
              <Field label="Source name *" error={sourceForm.formState.errors.name?.message}>
                <input
                  {...sourceForm.register('name')}
                  placeholder="e.g. Lex Fridman Podcast"
                  className={inputCls}
                  autoFocus
                  data-testid="source-name-input"
                />
              </Field>

              <Field label="Type">
                <select
                  value={srcType}
                  onChange={e => setSrcType(e.target.value)}
                  className={inputCls}
                  data-testid="source-type-select"
                >
                  {['podcast', 'youtube', 'newsletter', 'rss', 'substack', 'article_site', 'manual'].map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </Field>

              <Field label="URL *" error={sourceForm.formState.errors.url?.message}>
                <input
                  {...sourceForm.register('url')}
                  type="url"
                  placeholder="https://..."
                  className={inputCls}
                  data-testid="source-url-input"
                />
              </Field>

              <Field label="Priority">
                <PrioritySelect value={srcPriority} onChange={setSrcPriority} />
              </Field>

              <Field label="Trust level">
                <div className="flex gap-1.5">
                  {(['low', 'medium', 'high'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSrcTrust(t)}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-xs font-semibold border capitalize transition-all active:scale-95',
                        srcTrust === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border hover:bg-secondary',
                      )}
                    >{t}</button>
                  ))}
                </div>
              </Field>

              <Field label="Topics">
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    {...sourceForm.register('topics')}
                    placeholder="AI, pricing, leadership"
                    className={cn(inputCls, 'pl-8')}
                    data-testid="source-topics-input"
                  />
                </div>
              </Field>

              <Field label="Status">
                <button
                  type="button"
                  onClick={() => setSrcActive(a => !a)}
                  data-testid="source-active-toggle"
                  className={cn(
                    'w-full min-h-[44px] py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95',
                    srcActive
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900/50'
                      : 'bg-secondary text-muted-foreground border-border',
                  )}
                >
                  {srcActive ? '● Active — will be monitored' : '○ Inactive — paused'}
                </button>
              </Field>

              <button type="submit" className={submitBtnCls} data-testid="source-submit">
                {srcSuccess
                  ? <><CheckCircle2 className="w-4 h-4" />Source added!</>
                  : <><PlusCircle className="w-4 h-4" />Add source</>}
              </button>
            </form>
          </motion.div>
        )}

        {/* ══ RECENT CAPTURES ══ */}
        {visibleCaptures.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Recent captures
              </h3>
              <span className="text-[10px] text-muted-foreground">{visibleCaptures.length} items</span>
            </div>
            <AnimatePresence>
              {visibleCaptures.map(cap => (
                <RecentCard
                  key={cap.id}
                  cap={cap}
                  onDismiss={dismissCapture}
                  onConvert={convertCapture}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {visibleCaptures.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <Link2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">Nothing captured yet</p>
            <p className="text-xs text-muted-foreground">Start with a link, voice note, or text</p>
          </div>
        )}
      </div>
    </div>
  );
};
