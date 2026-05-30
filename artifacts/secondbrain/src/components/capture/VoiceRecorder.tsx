import { useRef, useState } from 'react';
import { Mic, Square, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadFile } from '../../lib/api';
import { cn } from '../../lib/utils';

type Phase = 'idle' | 'recording' | 'uploading' | 'done' | 'error';

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Records on-device via MediaRecorder, uploads to /api/upload, which transcribes
// (whisper) + files a vault note. iOS Safari yields audio/mp4; others audio/webm.
export function VoiceRecorder({ onSaved }: { onSaved: (title: string) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | undefined>(undefined);

  async function start() {
    setError('');
    setTranscript('');
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
        upload(new Blob(chunksRef.current, { type }), type);
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

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('uploading');
    recRef.current?.stop();
  }

  async function upload(blob: Blob, mime: string) {
    try {
      const ext = mime.includes('mp4') ? 'm4a' : mime.includes('webm') ? 'webm' : 'm4a';
      const r = await uploadFile(blob, `voice-note.${ext}`);
      setTranscript(r.transcript || '');
      setPhase('done');
      onSaved(r.title || 'Voice note');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }

  const recording = phase === 'recording';

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-4">
        <button
          type="button"
          onClick={recording ? stop : start}
          disabled={phase === 'uploading'}
          data-testid="voice-record-btn"
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg disabled:opacity-60',
            recording
              ? 'bg-red-500 text-white'
              : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60',
          )}
        >
          {phase === 'uploading' ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : recording ? (
            <Square className="w-7 h-7 fill-current" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>
        <p className="text-xs text-muted-foreground font-medium tabular-nums">
          {recording
            ? `Recording… ${fmt(seconds)} — tap to stop`
            : phase === 'uploading'
              ? 'Transcribing & filing…'
              : phase === 'done'
                ? 'Saved to your vault'
                : 'Tap to record a voice note'}
        </p>
      </div>

      {phase === 'done' && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 space-y-2">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Transcribed
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {transcript || '(no speech detected)'}
          </p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 text-sm rounded-xl bg-rose-500/10 border border-rose-500/25 px-3 py-2.5 text-rose-600 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}
    </div>
  );
}
