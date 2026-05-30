import { useEffect, useRef, useState } from 'react';
import {
  Mic, Square, Upload, Loader2, CheckCircle2, AlertCircle, Users, ChevronDown, ChevronUp,
} from 'lucide-react';
import { uploadMeeting, getMeeting, MeetingJob } from '../../lib/api';
import { cn } from '../../lib/utils';

type Phase = 'idle' | 'recording' | 'uploading' | 'processing' | 'done' | 'error';

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

// Meeting transcription: upload a recording (Voice Memos) or record in-app, then
// poll the async job until Deepgram (Turkish + speaker labels) + the summary land.
export function MeetingCapture({ onSaved }: { onSaved: (title: string) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [job, setJob] = useState<MeetingJob | null>(null);
  const [error, setError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | undefined>(undefined);
  const pollRef = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

  function poll(jobId: string) {
    pollRef.current = window.setInterval(async () => {
      try {
        const j = await getMeeting(jobId);
        if (j.status === 'done') {
          if (pollRef.current) clearInterval(pollRef.current);
          setJob(j);
          setPhase('done');
          onSaved(j.title || 'Meeting');
        } else if (j.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current);
          setError(j.error || 'transcription failed');
          setPhase('error');
        }
      } catch {
        /* transient — keep polling */
      }
    }, 3000);
  }

  async function send(blob: Blob, filename: string) {
    setPhase('uploading');
    setError('');
    setJob(null);
    try {
      const { job_id } = await uploadMeeting(blob, filename);
      setPhase('processing');
      poll(job_id);
    } catch (e) {
      setError(msg(e));
      setPhase('error');
    }
  }

  async function startRec() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || 'audio/webm';
        const ext = type.includes('mp4') ? 'm4a' : type.includes('webm') ? 'webm' : 'm4a';
        send(new Blob(chunksRef.current, { type }), `meeting.${ext}`);
      };
      recRef.current = rec;
      rec.start();
      setSeconds(0);
      setPhase('recording');
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('Microphone access was denied or is unavailable.');
      setPhase('error');
    }
  }

  function stopRec() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('uploading');
    recRef.current?.stop();
  }

  function reset() {
    setPhase('idle');
    setJob(null);
    setError('');
    setShowTranscript(false);
  }

  const busy = phase === 'uploading' || phase === 'processing';

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept=".m4a,.mp3,.wav,.mp4,.aac,.ogg,.webm,audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) send(f, f.name);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />

      {(phase === 'idle' || phase === 'recording') && (
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            type="button"
            onClick={phase === 'recording' ? stopRec : startRec}
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg',
              phase === 'recording'
                ? 'bg-red-500 text-white'
                : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200',
            )}
          >
            {phase === 'recording' ? (
              <Square className="w-7 h-7 fill-current" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>
          <p className="text-xs text-muted-foreground font-medium tabular-nums">
            {phase === 'recording' ? `Recording… ${fmt(seconds)} — tap to stop` : 'Tap to record the meeting'}
          </p>
          {phase === 'idle' && (
            <>
              <div className="flex items-center gap-3 w-full max-w-xs my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload a recording
              </button>
              <p className="text-[11px] text-muted-foreground/70 text-center max-w-xs">
                For long meetings, record in <span className="font-medium">Voice Memos</span> and upload it here — more reliable than in-app.
              </p>
            </>
          )}
        </div>
      )}

      {busy && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-foreground">
            {phase === 'uploading' ? 'Uploading recording…' : 'Transcribing & summarizing…'}
          </p>
          <p className="text-xs text-muted-foreground">Turkish + speaker labels · this can take a minute</p>
        </div>
      )}

      {phase === 'done' && job && (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Filed to your vault
            </p>
            <p className="text-sm font-bold text-foreground">{job.title}</p>
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Users className="w-3 h-3" />
              {job.speakers ?? 1} speaker{(job.speakers ?? 1) !== 1 ? 's' : ''}
              {job.duration ? ` · ${fmt(Math.round(job.duration))}` : ''}
            </p>
            {job.summary && <p className="text-sm text-foreground leading-relaxed">{job.summary}</p>}
          </div>

          {job.transcript && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Full transcript
                {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showTranscript && (
                <div className="px-4 pb-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap border-t border-border/50 pt-3 max-h-80 overflow-y-auto">
                  {job.transcript}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={reset}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors"
          >
            New meeting
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm rounded-xl bg-rose-500/10 border border-rose-500/25 px-3 py-2.5 text-rose-600 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
