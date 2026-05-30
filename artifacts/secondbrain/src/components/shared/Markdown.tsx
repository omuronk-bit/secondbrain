import { createElement, ReactNode } from 'react';

// Minimal, dependency-free markdown renderer — covers the common note elements
// (headings, bold/italic/code, links, lists, checkboxes, quotes, code fences, hr).
function inline(text: string, kb: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${kb}-${i++}`;
    if (tok.startsWith('`')) {
      nodes.push(
        <code key={key} className="px-1 py-0.5 rounded bg-muted text-[0.85em] font-mono">{tok.slice(1, -1)}</code>,
      );
    } else if (tok.startsWith('**') || tok.startsWith('__')) {
      nodes.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('[')) {
      const t = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
      nodes.push(
        <a key={key} href={t![2]} target="_blank" rel="noopener noreferrer" className="text-primary underline">{t![1]}</a>,
      );
    } else {
      nodes.push(<em key={key}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const H_CLS = [
  'text-2xl font-black mt-4 mb-2',
  'text-xl font-bold mt-4 mb-2',
  'text-lg font-bold mt-3 mb-1.5',
  'text-base font-bold mt-3 mb-1',
  'text-sm font-bold mt-2 mb-1',
  'text-sm font-semibold mt-2 mb-1',
];

// Flip the index-th task checkbox in the raw markdown (document order).
export function toggleCheckbox(md: string, index: number): string {
  const lines = (md || '').replace(/\r\n/g, '\n').split('\n');
  let n = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*(?:[-*]|\d+\.)\s+)\[([ xX])\](.*)$/);
    if (!m) continue;
    n++;
    if (n === index) {
      const checked = m[2].toLowerCase() === 'x';
      lines[i] = `${m[1]}[${checked ? ' ' : 'x'}]${m[3]}`;
      break;
    }
  }
  return lines.join('\n');
}

export function Markdown({
  content,
  onToggleCheckbox,
}: {
  content: string;
  onToggleCheckbox?: (index: number) => void;
}) {
  const lines = (content || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  let cbIndex = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre key={key++} className="bg-muted rounded-lg p-3 overflow-x-auto text-xs font-mono my-2 whitespace-pre">{buf.join('\n')}</pre>,
      );
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      blocks.push(createElement(`h${lvl}`, { key: key++, className: H_CLS[lvl - 1] }, inline(h[2], `h${key}`)));
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-3 border-border" />);
      i++;
      continue;
    }

    if (line.trim().startsWith('>')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">{inline(buf.join(' '), `bq${key}`)}</blockquote>,
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: ReactNode[] = [];
      let hasCheckbox = false;
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        const raw = lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, '');
        const cb = raw.match(/^\[([ xX])\]\s+(.*)$/);
        if (cb) {
          hasCheckbox = true;
          const idx = cbIndex++;
          const checked = cb[1].toLowerCase() === 'x';
          items.push(
            <li key={items.length} className="flex items-start gap-2 list-none">
              <input
                type="checkbox"
                checked={checked}
                readOnly={!onToggleCheckbox}
                onChange={onToggleCheckbox ? () => onToggleCheckbox(idx) : undefined}
                className={`mt-1 w-4 h-4 accent-primary${onToggleCheckbox ? ' cursor-pointer' : ''}`}
              />
              <span className={checked ? 'text-muted-foreground line-through' : undefined}>
                {inline(cb[2], `li${key}-${items.length}`)}
              </span>
            </li>,
          );
        } else {
          items.push(<li key={items.length}>{inline(raw, `li${key}-${items.length}`)}</li>);
        }
        i++;
      }
      const cls = hasCheckbox
        ? 'list-none ml-1 my-2 space-y-1'
        : ordered
          ? 'list-decimal ml-5 my-2 space-y-1'
          : 'list-disc ml-5 my-2 space-y-1';
      blocks.push(createElement(ordered ? 'ol' : 'ul', { key: key++, className: cls }, items));
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6}\s|>|\s*[-*]\s|\s*\d+\.\s|```)/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++} className="my-2 leading-relaxed">{inline(buf.join(' '), `p${key}`)}</p>);
  }

  return <div className="text-sm text-foreground">{blocks}</div>;
}
