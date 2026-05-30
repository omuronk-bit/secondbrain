import { useEffect, useState, ReactNode } from 'react';
import { Brain, Loader2, AlertCircle, Plug } from 'lucide-react';
import {
  isConfigured,
  getApiBase,
  getToken,
  setConfig,
  fetchToday,
  checkConnection,
} from '../lib/api';
import { saveItems } from '../utils/storage';
import { cn } from '../lib/utils';

type Phase = 'need-config' | 'connecting' | 'ready' | 'error';

// Gates the app on a live connection to the SecondBrain backend. On boot, if a
// token is stored, it hydrates localStorage('secondbrain_items') from /today so
// every page that reads getItems() shows real data with no further changes.
export function ConnectGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(isConfigured() ? 'connecting' : 'need-config');
  const [base, setBase] = useState(getApiBase());
  const [token, setToken] = useState(getToken());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function hydrate() {
    setPhase('connecting');
    setError('');
    try {
      const data = await fetchToday();
      saveItems(data.items);
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }

  useEffect(() => {
    if (isConfigured()) hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await checkConnection(base, token);
      setConfig(base, token);
      await hydrate();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'ready') return <>{children}</>;

  if (phase === 'connecting') {
    return (
      <Screen>
        <Brain className="w-10 h-10 text-primary" />
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading your SecondBrain…</p>
      </Screen>
    );
  }

  // need-config or error → connect form
  return (
    <Screen>
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="p-3 rounded-2xl bg-primary/10">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-black tracking-tight">Connect SecondBrain</h1>
          <p className="text-xs text-muted-foreground">
            Paste your API token to link this app to your knowledge base.
          </p>
        </div>

        <form onSubmit={handleConnect} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              API base
            </span>
            <input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="/api"
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full bg-card border-2 border-border/60 focus:border-primary/50 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              API token
            </span>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              placeholder="bearer token"
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full bg-card border-2 border-border/60 focus:border-primary/50 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors font-mono"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !token.trim()}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
              'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]',
              'disabled:opacity-40 disabled:pointer-events-none',
            )}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </form>
      </div>
    </Screen>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-background text-foreground px-6">
      {children}
    </div>
  );
}
