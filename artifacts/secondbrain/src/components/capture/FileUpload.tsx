import { useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { uploadFile } from '../../lib/api';
import { cn } from '../../lib/utils';

const ACCEPT =
  '.pdf,.doc,.docx,.txt,.md,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.m4a,.mp3,.wav,.aac,audio/*';

// Real file upload → POST /api/upload. PDFs/Word/text/slides/sheets/images are
// extracted + filed as vault notes; audio files are transcribed.
export function FileUpload({ onSaved }: { onSaved: (title: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ title: string } | null>(null);
  const [error, setError] = useState('');

  async function handle(files: FileList | null) {
    const file = files?.[0];
    if (!file || busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const r = await uploadFile(file);
      const title = r.title || file.name;
      setResult({ title });
      onSaved(title);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        data-testid="file-input"
        onChange={(e) => handle(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files);
        }}
        className={cn(
          'w-full rounded-2xl border-2 border-dashed transition-colors p-10 text-center space-y-4 disabled:opacity-60',
          drag ? 'border-primary bg-primary/5' : 'border-border bg-card',
        )}
        data-testid="file-dropzone"
      >
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
          {busy ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1">
          <p className="font-bold text-foreground">
            {busy ? 'Uploading & filing…' : 'Tap to choose a file, or drop it here'}
          </p>
          <p className="text-sm text-muted-foreground">
            PDF · Word · text · slides · sheets · images · audio
          </p>
        </div>
      </button>

      {result && (
        <div className="flex items-start gap-2 text-sm rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-2.5 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Added to your vault: <span className="font-semibold">{result.title}</span>
          </span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 text-sm rounded-xl bg-rose-500/10 border border-rose-500/25 px-3 py-2.5 text-rose-600 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 px-1">
        <FileText className="w-3 h-3" />
        Each file is read, summarized, and filed into the right area of your brain.
      </p>
    </div>
  );
}
