// Minimal client for the SecondBrain backend (FastAPI). The app is served
// same-origin behind the Cloudflare tunnel, so the default base is `/api`.
// The bearer token is entered once via the ConnectGate and kept in localStorage
// (never baked into the bundle).
import { Item } from '../types';

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

export const askApi = (question: string): Promise<{ answer: string }> =>
  apiFetch('/ask', { method: 'POST', body: JSON.stringify({ question }) }).then((r) => r.json());

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
