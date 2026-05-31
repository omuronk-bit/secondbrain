import { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowUp, Loader2, Plus, Clock } from 'lucide-react';
import { streamChat, Msg } from '../lib/api';
import { getAskHistory, saveAskHistory } from '../utils/storage';
import { Markdown } from '../components/shared/Markdown';
import { cn } from '../lib/utils';

const SUGGESTIONS = [
  "What's my latest churn & net adds?",
  'What should I read first today?',
  "What's new in AI agents?",
  'Compare Millenicom and Oris on key metrics',
];

export const Ask = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>(getAskHistory());
  const endRef = useRef<HTMLDivElement>(null);

  function send(raw: string) {
    const q = raw.trim();
    if (!q || busy) return;
    const convo: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages([...convo, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    const nh = [q, ...history.filter((h) => h !== q)].slice(0, 8);
    setHistory(nh);
    saveAskHistory(nh);

    streamChat(convo, (full) => {
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: 'assistant', content: full };
        return c;
      });
    })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: 'assistant', content: `⚠️ Query failed — ${msg}` };
          return c;
        });
      })
      .finally(() => setBusy(false));
  }

  // Auto-run a question handed off from the home ask bar.
  useEffect(() => {
    const q = sessionStorage.getItem('sb_ask_q');
    if (q) {
      sessionStorage.removeItem('sb_ask_q');
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-60px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] bg-background">
      {/* header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h1 className="text-base font-black tracking-tight">Ask your second brain</h1>
        </div>
        {!empty && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        )}
      </div>

      {/* thread / empty state */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto w-full px-4 py-4">
          {empty ? (
            <div className="space-y-6 pt-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ask anything about your knowledge base — churn, what to read, decisions, comparisons. Answers come from your vault, cited, and you can keep the thread going with follow-ups.
              </p>
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Try</h3>
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-card border border-border/50 hover:border-primary/30 text-sm text-foreground/80 hover:text-foreground transition-all"
                  >
                    <span className="text-primary/60 mr-2 font-bold">→</span>
                    {q}
                  </button>
                ))}
              </div>
              {history.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Recent
                  </h3>
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => send(h)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted text-sm text-muted-foreground hover:text-foreground truncate transition-all"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'user' ? (
                    <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-relaxed">
                      {m.content}
                    </div>
                  ) : (
                    <div className="max-w-[92%] bg-card border border-border/60 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                      {m.content ? <Markdown content={m.content} /> : <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-3 py-2.5">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="max-w-2xl mx-auto flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            rows={1}
            placeholder="Ask anything…"
            className="flex-1 resize-none bg-card border-2 border-border/60 focus:border-primary/40 rounded-2xl px-3.5 py-2.5 text-sm outline-none max-h-32 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Send"
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 shrink-0"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
