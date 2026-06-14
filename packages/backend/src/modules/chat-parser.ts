import AdmZip from 'adm-zip';
import { logger } from '../utils/logger.js';
import type { ParsedMessage } from '../types/index.js';

/**
 * WhatsApp export line patterns. We accept several common variants:
 *   "6/14/25, 10:32 PM - Alice: hello"
 *   "14/6/2025, 22:32 - Alice: hello"
 *   "[14/06/2025, 22:32:01] Alice: hello"        (iOS bracket style)
 */
const LINE_PATTERNS: RegExp[] = [
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?)\s?(AM|PM)?\s-\s(.+?):\s(.+)$/i,
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?)\s?(AM|PM)?\]\s(.+?):\s(.+)$/i,
];

const MEDIA_PLACEHOLDERS = [
  '<Media omitted>',
  '<Multimedia omitido>',
  'image omitted',
  'video omitted',
  'audio omitted',
  'sticker omitted',
  'GIF omitted',
  'document omitted',
  '<attached:',
];

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

function decodeBuffer(buf: Buffer): string {
  // UTF-16 LE BOM
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString('utf16le').slice(1);
  }
  // UTF-16 BE BOM (swap then decode as LE)
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.alloc(buf.length);
    for (let i = 0; i + 1 < buf.length; i += 2) {
      swapped[i] = buf[i + 1]!;
      swapped[i + 1] = buf[i]!;
    }
    return swapped.toString('utf16le').slice(1);
  }
  return stripBom(buf.toString('utf8'));
}

function parseTimestamp(date: string, time: string, ampm?: string): Date | null {
  const dateParts = date.split('/').map((p) => Number(p));
  if (dateParts.length !== 3 || dateParts.some((n) => Number.isNaN(n))) return null;
  let [a, b, c] = dateParts as [number, number, number];
  // Heuristic: if the first component is > 12 it must be DD/MM/YYYY, otherwise default to MM/DD/YY.
  let day: number;
  let month: number;
  let year: number;
  if (a > 12) {
    day = a;
    month = b;
    year = c;
  } else {
    month = a;
    day = b;
    year = c;
  }
  if (year < 100) year += 2000;

  const timeParts = time.split(':').map((p) => Number(p));
  let hour = timeParts[0] ?? 0;
  const minute = timeParts[1] ?? 0;
  const second = timeParts[2] ?? 0;
  if (ampm) {
    const upper = ampm.toUpperCase();
    if (upper === 'PM' && hour < 12) hour += 12;
    if (upper === 'AM' && hour === 12) hour = 0;
  }
  const dt = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function isMediaLine(content: string): boolean {
  const lower = content.toLowerCase();
  return MEDIA_PLACEHOLDERS.some((p) => lower.includes(p.toLowerCase()));
}

function matchLine(
  line: string,
): { date: string; time: string; ampm?: string; sender: string; content: string } | null {
  for (const pattern of LINE_PATTERNS) {
    const m = pattern.exec(line);
    if (m) {
      const [, date, time, ampm, sender, content] = m as unknown as [
        string,
        string,
        string,
        string | undefined,
        string,
        string,
      ];
      return { date, time, ampm, sender, content };
    }
  }
  return null;
}

export function parseChatText(text: string): ParsedMessage[] {
  const normalised = stripBom(text).replace(/\r\n/g, '\n').replace(/\u200e/g, '');
  const lines = normalised.split('\n');
  const messages: ParsedMessage[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = matchLine(line);
    if (m) {
      if (isMediaLine(m.content)) continue;
      const ts = parseTimestamp(m.date, m.time, m.ampm);
      if (!ts) continue;
      messages.push({ sender: m.sender.trim(), timestamp: ts, content: m.content.trim() });
    } else if (messages.length > 0) {
      // Continuation of previous multi-line message.
      const last = messages[messages.length - 1]!;
      last.content += `\n${line}`;
    }
  }

  logger.info('chat-parser: parsed %d messages', messages.length);
  return messages;
}

export function parseChatBuffer(filename: string, buf: Buffer): ParsedMessage[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.zip')) {
    const zip = new AdmZip(buf);
    const entries = zip.getEntries();
    const txtEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('.txt'));
    if (!txtEntry) {
      throw new Error('ZIP archive contains no .txt file');
    }
    return parseChatText(decodeBuffer(txtEntry.getData()));
  }
  if (lower.endsWith('.txt')) {
    return parseChatText(decodeBuffer(buf));
  }
  throw new Error('Unsupported chat export file. Use .zip or .txt.');
}
