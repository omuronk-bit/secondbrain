import { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowUp, Loader2, Plus, Clock, Mic, Square, Volume2, VolumeX, Zap, RotateCcw } from 'lucide-react';
import { streamChat, askDeep, transcribeAudio, retrieveSources, Msg, SourceHit } from '../lib/api';
import { getAskHistory, saveAskHistory } from '../utils/storage';
import { Markdown } from '../components/shared/Markdown';
import { cn } from '../lib/utils';

type UiMsg = Msg & { sources?: SourceHit[] };

const SUGGESTIONS = [
  "What's my latest churn & net adds?",
  'What should I read first today?',
  "What's new in AI agents?",
  'Compare Millenicom and Oris on key metrics',
];

export const Ask = () => {
  const [messages, setMessages] = useState<UiMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>(getAskHistory());
  const [deep, setDeep] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

    const setAnswer = (content: string) =>
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], role: 'assistant', content }; return c; });
    const attachSources = () =>
      retrieveSources(q)
        .then(({ sources }) => setMessages((m) => {
          const c = [...m]; const last = c[c.length - 1];
          if (last?.role === 'assistant') c[c.length - 1] = { ...last, sources };
          return c;
        }))
        .catch(() => { /* best-effort */ });
    const fail = (e: unknown) => setAnswer(`⚠️ Query failed — ${e instanceof Error ? e.message : String(e)}`);

    if (deep) {
      askDeep(q).then(({ answer }) => { setAnswer(answer); return attachSources(); }).catch(fail).finally(() => setBusy(false));
      return;
    }
    streamChat(convo, setAnswer).then(attachSources).catch(fail).finally(() => setBusy(false));
  }

  // ── voice in: record → transcribe (whisper) → ask ──
  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || 'audio/webm';
        const ext = type.includes('mp4') ? 'm4a' : 'webm';
        setTranscribing(true);
        try {
          const { text } = await transcribeAudio(new Blob(chunksRef.current, { type }), `voice.${ext}`);
          if (text.trim()) send(text);
        } catch {
          /* transcription failed — ignore */
        } finally {
          setTranscribing(false);
        }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      /* mic denied/unavailable */
    }
  }
  function stopRec() {
    setRecording(false);
    recRef.current?.stop();
  }

  // ── voice out: read an answer aloud (browser TTS) ──
  function speak(idx: number, text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (speakingIdx === idx) { setSpeakingIdx(null); return; }
    const plain = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*`>_~|]/g, '');
    const u = new SpeechSynthesisUtterance(plain);
    u.onend = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(u);
  }
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

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
          <h1 className="text-base font-bold tracking-tight">Ask</h1>
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
        <div className={cn('max-w-2xl mx-auto w-full px-4', empty ? 'h-full flex flex-col justify-center' : 'py-4')}>
          {empty ? (
            <div className="space-y-7 max-w-xl">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center mb-3.5">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h2 className="font-serif text-[1.6rem] font-semibold tracking-tight leading-tight">What do you want to know?</h2>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Answers come straight from your vault — cited, and you can keep the thread going with follow-ups.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-[13px] font-medium px-3.5 py-2 rounded-full bg-card border border-border hover:border-primary/40 text-foreground/80 hover:text-foreground transition-all active:scale-95 shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {history.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Continue a thread
                  </h3>
                  {history.slice(0, 4).map((h, i) => (
                    <button
                      key={i}
                      onClick={() => send(h)}
                      className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all active:scale-[.99] shadow-sm"
                    >
                      <span className="w-8 h-8 rounded-lg bg-secondary grid place-items-center shrink-0 text-muted-foreground">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm text-foreground/80 truncate flex-1">{h}</span>
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
                      {m.content ? (
                        <>
                          <Markdown content={m.content} />
                          <button
                            onClick={() => speak(i, m.content)}
                            aria-label={speakingIdx === i ? 'Stop' : 'Read aloud'}
                            className="mt-1.5 text-muted-foreground hover:text-primary transition-colors active:scale-95"
                          >
                            {speakingIdx === i ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                          {m.sources && m.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Sources</p>
                              {m.sources.slice(0, 5).map((s) => (
                                <p key={s.n} className="text-[11px] text-muted-foreground leading-snug">
                                  <span className="text-primary font-bold">[{s.n}]</span> {s.title}
                                </p>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
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
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => setDeep((d) => !d)}
            className={cn(
              'mb-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors',
              deep ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
            title="Deep reasoning runs an agentic search+calc loop — slower, more thorough"
          >
            <Zap className={cn('w-3 h-3', deep && 'fill-current')} /> Deep reasoning · {deep ? 'on' : 'off'}
          </button>
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-end gap-2"
        >
          <button
            type="button"
            onClick={recording ? stopRec : startRec}
            disabled={transcribing || busy}
            aria-label={recording ? 'Stop recording' : 'Ask by voice'}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-colors disabled:opacity-40',
              recording ? 'bg-red-500 text-white animate-pulse' : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : recording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
          </button>
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
    </div>
  );
};
