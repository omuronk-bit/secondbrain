// Minimal client for the SecondBrain backend (FastAPI). The app is served
// same-origin behind the Cloudflare tunnel, so the default base is `/api`.
// The bearer token is entered once via the ConnectGate and kept in localStorage
// (never baked into the bundle).
import { Item, Segment, Source } from '../types';

const BASE_KEY = 'sb_api_base';
const TOKEN_KEY = 'sb_api_token';

const DEFAULT_BASE =
  (import.meta.env.VITE_SB_API_BASE as string | undefined)?.replace(/\/$/, '') || '/api';

export const getApiBase = (): string =>
  (localStorage.getItem(BASE_KEY) || DEFAULT_BASE).replace(/\/$/, '');

export const getToken = (): string => localStorage.getItem(TOKEN_KEY) || '';

export const isConfigured = (): boolean => !!getToken();

export const setConfig = (base: string, token: string): void => {
  localStorage.setItem(BASE_KEY, (base || DEFAULT_BASE).replace(/\/$/, ''));
  localStorage.setItem(TOKEN_KEY, token.trim());
};

export const clearConfig = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body.slice(0, 200) || res.statusText}`);
  }
  return res;
}

export interface TodayStats {
  reviewed: number;
  mustRead: number;
  segments: number;
  timeSavedMin: number;
  memo: number;
}
export interface TodayResponse {
  items: Item[];
  stats: TodayStats;
}

export const fetchToday = (): Promise<TodayResponse> =>
  apiFetch('/today').then((r) => r.json());

export interface StatsResponse extends TodayStats {
  totalItems?: number;
  byType?: Record<string, number>;
  sources?: number;
}
export const fetchStats = (): Promise<StatsResponse> =>
  apiFetch('/stats').then((r) => r.json());

export const fetchSegments = (): Promise<{ segments: Segment[] }> =>
  apiFetch('/segments').then((r) => r.json());

export const fetchSources = (): Promise<{ sources: Source[] }> =>
  apiFetch('/sources').then((r) => r.json());

// Carry-overs — the per-item one_action nudges, resurfaced so they don't get forgotten.
export interface Carryover {
  id: string;
  action: string;
  title: string;
  source: string;
  url: string | null;
  createdAt: string;
}
export interface CarryoverResponse {
  items: Carryover[];
  stats: { open: number; done: number; dropped: number };
}
export const fetchCarryovers = (limit = 5): Promise<CarryoverResponse> =>
  apiFetch(`/carryovers?limit=${limit}`).then((r) => r.json());

export const closeCarryover = (id: string, status: 'done' | 'dropped'): Promise<{ ok: boolean }> =>
  apiFetch(`/carryovers/${encodeURIComponent(id)}/close`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  }).then((r) => r.json());

// Weekly recall quiz — active recall from your own vault claims.
export interface RecallItem {
  id: number;
  question: string;
  answered: boolean;
  answer: string | null;
  score: number | null;
  feedback: string | null;
  idealAnswer: string | null;
  sourceClaim: string | null;
  sourceTitle: string | null;
}
export interface RecallResponse {
  week: string;
  items: RecallItem[];
  stats: { answered: number; total: number; avgScore: number | null };
}
export interface RecallGrade {
  score: number;
  feedback: string;
  idealAnswer: string;
  sourceTitle: string;
  sourceClaim: string;
}
export const fetchRecall = (): Promise<RecallResponse> =>
  apiFetch('/recall').then((r) => r.json());

export const generateRecall = (): Promise<RecallResponse> =>
  apiFetch('/recall/generate', { method: 'POST' }).then((r) => r.json());

export const submitRecallAnswer = (id: number, answer: string): Promise<RecallGrade> =>
  apiFetch(`/recall/${id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
  }).then((r) => r.json());

// Explicit "more/less like this" — writes user_feedback, feeds the tuning loop.
export type FeedbackSignal = 'more_like_this' | 'less_like_this' | 'none';

let _feedbackMap: Promise<Record<string, FeedbackSignal>> | null = null;
export const fetchFeedbackMap = (): Promise<Record<string, FeedbackSignal>> =>
  (_feedbackMap ??= apiFetch('/feedback')
    .then((r) => r.json())
    .then((d) => (d.feedback ?? {}) as Record<string, FeedbackSignal>)
    .catch(() => ({})));

export const setItemFeedback = async (id: string, signal: FeedbackSignal): Promise<void> => {
  await apiFetch(`/items/${encodeURIComponent(id)}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ signal }),
  });
  if (_feedbackMap) {
    const m = await _feedbackMap;
    if (signal === 'none') delete m[id];
    else m[id] = signal;
  }
};

// Mentor "depth": foundational reading + blind spots from your knowledge graph.
export interface GoDeeperItem { title: string; theme: string; why: string; }
export interface BlindSpotItem { title: string; why: string; ref: string; }
export interface GrowResponse {
  week: string;
  goDeeper: GoDeeperItem[];
  blindSpots: BlindSpotItem[];
}
export const fetchGrow = (): Promise<GrowResponse> =>
  apiFetch('/grow').then((r) => r.json());
export const generateGrow = (): Promise<GrowResponse> =>
  apiFetch('/grow/generate', { method: 'POST' }).then((r) => r.json());

// Self-improvement loop: approve/reject the daily tuner's source/interest suggestions.
export interface TuningCandidate {
  tid: number;
  type: string;
  label: string;
  detail: string;
  rationale: string;
  url: string | null;
}
export const fetchTuning = (): Promise<{ batch: string | null; candidates: TuningCandidate[] }> =>
  apiFetch('/tuning').then((r) => r.json());
export const applyTuning = (approve: number[], reject: number[]): Promise<{ ok: boolean; pushed: boolean }> =>
  apiFetch('/tuning/apply', { method: 'POST', body: JSON.stringify({ approve, reject }) }).then((r) => r.json());

export interface Brief {
  date: string;
  body: string;
}
export const fetchBrief = (): Promise<{ daily: Brief | null; weekly: Brief | null }> =>
  apiFetch('/brief').then((r) => r.json());

export const askApi = (question: string): Promise<{ answer: string }> =>
  apiFetch('/ask', { method: 'POST', body: JSON.stringify({ question }) }).then((r) => r.json());

export interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

async function streamPost(path: string, body: unknown, onChunk: (full: string) => void): Promise<string> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${t.slice(0, 200) || res.statusText}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }
  return full;
}

/** Stream a one-shot answer; onChunk receives the full text so far. */
export const streamAsk = (question: string, onChunk: (full: string) => void): Promise<string> =>
  streamPost('/ask/stream', { question }, onChunk);

/** Stream a multi-turn answer over a conversation. */
export const streamChat = (messages: Msg[], onChunk: (full: string) => void): Promise<string> =>
  streamPost('/chat/stream', { messages }, onChunk);

/** Deep agentic answer (Opus tool-use loop: search + kpi lookup + calc). Slower, non-streamed. */
export const askDeep = (question: string): Promise<{ answer: string }> =>
  apiFetch('/deep', { method: 'POST', body: JSON.stringify({ question }) }).then((r) => r.json());

export interface SourceHit {
  n: number;
  path: string;
  title: string;
  excerpt: string;
}
/** The vault notes that informed an answer (for citation cards). */
export const retrieveSources = (question: string): Promise<{ sources: SourceHit[] }> =>
  apiFetch('/retrieve', { method: 'POST', body: JSON.stringify({ question }) }).then((r) => r.json());

/** Transcribe a short audio clip to text (local whisper). */
export async function transcribeAudio(blob: Blob, filename = 'voice.webm'): Promise<{ text: string }> {
  const fd = new FormData();
  fd.append('file', blob, filename);
  const res = await fetch(`${getApiBase()}/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${t.slice(0, 160) || res.statusText}`);
  }
  return res.json();
}

export const captureApi = (
  text: string,
  type = 'note',
): Promise<{ ok: boolean; path: string }> =>
  apiFetch('/capture', { method: 'POST', body: JSON.stringify({ text, type }) }).then((r) =>
    r.json(),
  );

/** Persist a user override of an item's recommended action. */
export const setItemAction = (
  id: string,
  action: string,
): Promise<{ ok: boolean; action: string }> =>
  apiFetch(`/items/${encodeURIComponent(id)}/action`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  }).then((r) => r.json());

/** Open an item's source (article/video/podcast/Gmail) in a new tab. */
export const openItemLink = (item: Item): void => {
  if (item.originalUrl) window.open(item.originalUrl, '_blank', 'noopener,noreferrer');
};

export interface UploadResult {
  ok: boolean;
  path: string;
  title?: string;
  transcript?: string;
}

/** Upload a file (document or audio) — multipart, so Content-Type is left to the browser. */
export async function uploadFile(file: Blob, filename?: string): Promise<UploadResult> {
  const fd = new FormData();
  fd.append('file', file, filename || (file as File).name || 'upload');
  const res = await fetch(`${getApiBase()}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body.slice(0, 200) || res.statusText}`);
  }
  return res.json();
}

export interface MeetingJob {
  status: 'processing' | 'done' | 'error';
  job_id?: string;
  title?: string;
  summary?: string;
  speakers?: number;
  duration?: number;
  transcript?: string;
  path?: string;
  error?: string;
}

/** Upload meeting audio for async Deepgram transcription + diarization. */
export async function uploadMeeting(file: Blob, filename?: string): Promise<{ job_id: string }> {
  const fd = new FormData();
  fd.append('file', file, filename || (file as File).name || 'meeting.m4a');
  const res = await fetch(`${getApiBase()}/meetings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body.slice(0, 200) || res.statusText}`);
  }
  return res.json();
}

/** Poll a meeting transcription job. */
export const getMeeting = (jobId: string): Promise<MeetingJob> =>
  apiFetch(`/meetings/${encodeURIComponent(jobId)}`).then((r) => r.json());

// ───────────────────────── notes ─────────────────────────
export interface NoteListItem {
  id: string;
  title: string;
  domain: string;
  date: string;
  snippet: string;
  updated: number;
  tags: string[];
}
export interface NoteDetail {
  id: string;
  title: string;
  domain?: string;
  date: string;
  tags: string[];
  body: string;
}

// Encode each path segment but keep the slashes (the API uses a :path route).
const encNote = (id: string) => id.split('/').map(encodeURIComponent).join('/');

export const listNotes = (q = '', domain = ''): Promise<{ notes: NoteListItem[]; total: number }> =>
  apiFetch(`/notes?q=${encodeURIComponent(q)}&domain=${encodeURIComponent(domain)}`).then((r) => r.json());

export const getNote = (id: string): Promise<NoteDetail> =>
  apiFetch(`/notes/${encNote(id)}`).then((r) => r.json());

export const createNote = (title: string, body = '', domain = '00-inbox'): Promise<{ ok: boolean; id: string }> =>
  apiFetch('/notes', { method: 'POST', body: JSON.stringify({ title, body, domain }) }).then((r) => r.json());

export const saveNote = (id: string, body: string, title?: string): Promise<{ ok: boolean; id: string }> =>
  apiFetch(`/notes/${encNote(id)}`, { method: 'PUT', body: JSON.stringify({ body, title }) }).then((r) => r.json());

export const deleteNote = (id: string): Promise<{ ok: boolean }> =>
  apiFetch(`/notes/${encNote(id)}`, { method: 'DELETE' }).then((r) => r.json());

/** Validate base+token before saving — used by the connect screen. */
export async function checkConnection(base: string, token: string): Promise<void> {
  const res = await fetch(`${(base || DEFAULT_BASE).replace(/\/$/, '')}/today`, {
    headers: { Authorization: `Bearer ${token.trim()}` },
  });
  if (res.status === 401) throw new Error('Invalid token (401 Unauthorized).');
  if (!res.ok) throw new Error(`Server returned ${res.status}.`);
}
