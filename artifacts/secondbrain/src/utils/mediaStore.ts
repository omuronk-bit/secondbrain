import { Segment, Source, Synthesis } from '../types';

// Real media data, populated by ConnectGate at boot (before any page renders).
// Exported as live ES-module bindings, so pages that import these names see the
// populated values at render time — no per-page wiring needed.
export let segments: Segment[] = [];
export let sources: Source[] = [];
export let syntheses: Synthesis[] = [];

export function setMediaData(s: Segment[], src: Source[]) {
  segments = s;
  sources = src;
}
