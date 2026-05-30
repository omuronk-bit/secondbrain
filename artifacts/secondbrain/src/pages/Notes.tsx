import { useEffect, useState } from 'react';
import {
  Search, Plus, ChevronLeft, Save, Trash2, Eye, Pencil, Loader2, FileText, CheckCircle2,
} from 'lucide-react';
import {
  listNotes, getNote, createNote, saveNote, deleteNote, NoteListItem,
} from '../lib/api';
import { Markdown, toggleCheckbox } from '../components/shared/Markdown';
import { NoteSkeletons } from '../components/shared/Skeleton';
import { PullToRefresh } from '../components/shared/PullToRefresh';
import { toast } from '../hooks/use-toast';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const DOMAINS: [string, string][] = [
  ['00-inbox', 'Inbox'],
  ['01-millenicom', 'Millenicom'],
  ['02-oris', 'Oris'],
  ['03-socar', 'SOCAR'],
  ['04-investments', 'Investments'],
  ['05-reading', 'Reading'],
  ['08-personal', 'Personal'],
];
const domainLabel = (d?: string) => DOMAINS.find(([k]) => k === d)?.[1] || d || 'Inbox';

interface Editor {
  id: string | null; // null = new
  title: string;
  body: string;
  domain: string;
}

export const Notes = () => {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busyOpen, setBusyOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await listNotes(query, filter);
      setNotes(r.notes);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!editor) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, editor]);

  // debounced search
  useEffect(() => {
    if (editor) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function openNote(item: NoteListItem) {
    setBusyOpen(true);
    try {
      const n = await getNote(item.id);
      setEditor({ id: n.id, title: n.title, body: n.body, domain: n.domain || '00-inbox' });
      setMode('preview');
      setDirty(false);
    } finally {
      setBusyOpen(false);
    }
  }

  function openNew() {
    setEditor({ id: null, title: '', body: '', domain: '00-inbox' });
    setMode('edit');
    setDirty(false);
  }

  async function save() {
    if (!editor) return;
    setSaving(true);
    try {
      if (editor.id === null) {
        const r = await createNote(editor.title || 'Untitled', editor.body, editor.domain);
        setEditor({ ...editor, id: r.id });
        toast({ title: 'Note created' });
      } else {
        await saveNote(editor.id, editor.body, editor.title);
        toast({ title: 'Note saved' });
      }
      setDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  // Tap a checkbox in preview → flip it in the markdown and persist immediately.
  async function onToggle(idx: number) {
    if (!editor) return;
    const body = toggleCheckbox(editor.body, idx);
    setEditor({ ...editor, body });
    if (editor.id) {
      try {
        await saveNote(editor.id, body, editor.title);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1200);
      } catch {
        /* leave the optimistic toggle; user can hit Save */
        setDirty(true);
      }
    } else {
      setDirty(true);
    }
  }

  async function remove() {
    if (!editor?.id) {
      setEditor(null);
      return;
    }
    if (!confirm('Delete this note?')) return;
    await deleteNote(editor.id);
    toast({ title: 'Note deleted' });
    setEditor(null);
  }

  // ── Editor view ──
  if (editor) {
    return (
      <div className="min-h-full bg-background flex flex-col">
        <div className="sticky top-[56px] z-30 bg-background/90 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2 max-w-2xl mx-auto">
            <button onClick={() => setEditor(null)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground" aria-label="Back">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setMode((m) => (m === 'edit' ? 'preview' : 'edit'))}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/70"
            >
              {mode === 'edit' ? <><Eye className="w-3.5 h-3.5" />Preview</> : <><Pencil className="w-3.5 h-3.5" />Edit</>}
            </button>
            <button
              onClick={remove}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={save}
              disabled={saving || (!dirty && editor.id !== null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedFlash ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {savedFlash ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full space-y-3">
          <input
            value={editor.title}
            onChange={(e) => { setEditor({ ...editor, title: e.target.value }); setDirty(true); }}
            placeholder="Title"
            className="w-full bg-transparent text-2xl font-black tracking-tight outline-none placeholder:text-muted-foreground/40"
          />
          <div className="flex items-center gap-2">
            <select
              value={editor.domain}
              onChange={(e) => { setEditor({ ...editor, domain: e.target.value }); setDirty(true); }}
              disabled={editor.id !== null}
              className="text-xs bg-secondary/50 border border-border rounded-lg px-2 py-1 text-muted-foreground disabled:opacity-60"
            >
              {DOMAINS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>

          {mode === 'edit' ? (
            <textarea
              value={editor.body}
              onChange={(e) => { setEditor({ ...editor, body: e.target.value }); setDirty(true); }}
              placeholder="Write your note in markdown… # heading, **bold**, - list, - [ ] task"
              className="w-full min-h-[55vh] bg-transparent outline-none resize-none text-sm leading-relaxed font-mono placeholder:text-muted-foreground/40"
              autoFocus
            />
          ) : (
            <div className="min-h-[40vh]">
              {editor.body.trim() ? <Markdown content={editor.body} onToggleCheckbox={onToggle} /> : <p className="text-sm text-muted-foreground/50 italic">Nothing yet — tap Edit to write.</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="min-h-full bg-background flex flex-col">
      <div className="px-4 pt-5 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between max-w-2xl mx-auto gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight">Notes</h1>
            <span className="text-xs text-muted-foreground">Your vault — searchable, feeds Ask & the brief</span>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
            data-testid="new-note"
          >
            <Plus className="w-4 h-4" />New
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full">
        <PullToRefresh onRefresh={load}>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your notes…"
                className="w-full bg-card border-2 border-border/60 focus:border-primary/40 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none transition-colors"
              />
            </div>

            <div className="flex overflow-x-auto gap-1.5 pb-1 no-scrollbar">
              {[['', 'All'], ...DOMAINS].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={cn(
                    'whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 transition-all',
                    filter === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {loading || busyOpen ? (
              <NoteSkeletons />
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center"><FileText className="w-5 h-5 text-muted-foreground" /></div>
                <p className="text-sm font-semibold text-foreground">{query ? 'No notes match' : 'No notes yet'}</p>
                <p className="text-xs text-muted-foreground">Tap “New” to write your first note.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map((n, i) => (
                  <motion.button
                    key={n.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.3) }}
                    onClick={() => openNote(n)}
                    className="w-full text-left bg-card border border-border/60 rounded-xl p-3.5 hover:border-border transition-colors space-y-1"
                    data-testid={`note-${n.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-1">{n.title}</h3>
                      <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{domainLabel(n.domain)}</span>
                    </div>
                    {n.snippet && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{n.snippet}</p>}
                    {n.date && <p className="text-[10px] text-muted-foreground/60">{n.date}</p>}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </PullToRefresh>
      </div>
    </div>
  );
};
