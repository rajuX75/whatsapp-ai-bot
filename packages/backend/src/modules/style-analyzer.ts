import type { ParsedMessage, StyleProfile } from '../types/index.js';

const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const PUNCT_RE = /[.,!?;:…—\-"'()]/g;
const WORD_RE = /[\p{L}\p{N}']+/gu;

/** Stop-word list for English + Spanish + Portuguese + French + German (lightweight). */
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','if','then','so','of','to','in','on','for','with','at','by','from','as','is','are','was','were','be','been','being','have','has','had','do','does','did','i','you','he','she','it','we','they','me','him','her','us','them','my','your','his','its','our','their','this','that','these','those','what','when','where','how','why','who','which','no','not','yes','ok','okay',
  'el','la','los','las','un','una','y','o','pero','si','de','que','en','por','para','con','un','una','es','soy','eres','son','era','han','he','has','tiene','tengo','yo','tu','el','ella','nosotros','ellos','mi','tu','su','este','esa','eso','esto',
  'o','a','os','as','um','uma','e','ou','mas','de','que','em','no','na','com','para','por','sou','é','são','era','tenho','tem','eu','você','ele','ela','nós','eles','meu','teu','seu','isso','este','essa',
  'le','les','un','une','et','ou','mais','de','que','en','dans','sur','pour','par','avec','suis','est','sont','était','j','je','tu','il','elle','nous','vous','ils','mon','ton','son','ce','ça',
  'der','die','das','und','oder','aber','wenn','dann','von','zu','in','auf','für','mit','bei','ich','du','er','sie','wir','sie','mein','dein','sein',
]);

interface BurstStats {
  pattern: 'single' | 'burst' | 'mixed';
  averageCount: number;
}

function calculateBursts(messages: ParsedMessage[]): BurstStats {
  if (messages.length < 2) return { pattern: 'single', averageCount: 1 };
  const bursts: number[] = [];
  let current = 1;
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1]!;
    const curr = messages[i]!;
    const gap = curr.timestamp.getTime() - prev.timestamp.getTime();
    if (curr.sender === prev.sender && gap < 60_000) {
      current += 1;
    } else {
      bursts.push(current);
      current = 1;
    }
  }
  bursts.push(current);
  const avg = bursts.reduce((s, n) => s + n, 0) / bursts.length;
  const burstShare = bursts.filter((b) => b >= 3).length / bursts.length;
  let pattern: BurstStats['pattern'] = 'single';
  if (burstShare > 0.4) pattern = 'burst';
  else if (burstShare > 0.1) pattern = 'mixed';
  return { pattern, averageCount: Number(avg.toFixed(2)) };
}

function detectCapitalization(messages: ParsedMessage[]): StyleProfile['capitalization'] {
  let lower = 0;
  let upper = 0;
  let sentence = 0;
  let mixed = 0;
  for (const m of messages) {
    const letters = m.content.replace(/[^A-Za-z\u00C0-\u024F]/g, '');
    if (!letters) continue;
    if (letters === letters.toUpperCase()) upper++;
    else if (letters === letters.toLowerCase()) lower++;
    else if (/^[A-Z\u00C0-\u024F]/.test(m.content)) sentence++;
    else mixed++;
  }
  const total = lower + upper + sentence + mixed;
  if (total === 0) return 'mixed';
  const ranking: Array<[StyleProfile['capitalization'], number]> = [
    ['lower', lower],
    ['upper', upper],
    ['sentence', sentence],
    ['mixed', mixed],
  ];
  ranking.sort((a, b) => b[1] - a[1]);
  return ranking[0]![0];
}

function detectLanguage(text: string): string {
  const lower = text.toLowerCase();
  const hits = {
    en: (lower.match(/\b(the|you|and|that|what|with|this)\b/g) ?? []).length,
    es: (lower.match(/\b(que|de|la|el|en|por|para|con)\b/g) ?? []).length,
    pt: (lower.match(/\b(que|de|para|com|não|você|está)\b/g) ?? []).length,
    fr: (lower.match(/\b(que|le|les|de|et|pour|avec|est)\b/g) ?? []).length,
    de: (lower.match(/\b(und|der|die|das|ist|nicht|mit)\b/g) ?? []).length,
  };
  const best = (Object.entries(hits) as Array<[string, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0];
  return best && best[1] > 0 ? best[0] : 'en';
}

function topN<T>(items: T[], n: number): T[] {
  return items.slice(0, n);
}

export interface AnalyseOptions {
  /** Only analyse messages from this sender (case-insensitive). If omitted, every sender is used. */
  targetSender?: string;
}

export function analyseStyle(
  sessionId: number,
  messages: ParsedMessage[],
  options: AnalyseOptions = {},
): StyleProfile {
  const filtered = options.targetSender
    ? messages.filter(
        (m) => m.sender.toLowerCase() === options.targetSender!.toLowerCase(),
      )
    : messages;

  if (filtered.length === 0) {
    return {
      sessionId,
      avgMsgLength: 0,
      emojiRatio: 0,
      topEmojis: [],
      capitalization: 'mixed',
      punctuation: {},
      topPhrases: [],
      burstPattern: 'single',
      avgBurstCount: 0,
      activeHours: [],
      language: 'en',
    };
  }

  let totalChars = 0;
  let totalEmojis = 0;
  const emojiCounts = new Map<string, number>();
  const punctCounts: Record<string, number> = {};
  const wordCounts = new Map<string, number>();
  const hourCounts = new Array<number>(24).fill(0);

  for (const m of filtered) {
    totalChars += m.content.length;
    const emojis = m.content.match(EMOJI_RE) ?? [];
    totalEmojis += emojis.length;
    for (const e of emojis) emojiCounts.set(e, (emojiCounts.get(e) ?? 0) + 1);

    const punct = m.content.match(PUNCT_RE) ?? [];
    for (const p of punct) punctCounts[p] = (punctCounts[p] ?? 0) + 1;

    const words = m.content.toLowerCase().match(WORD_RE) ?? [];
    for (const w of words) {
      if (w.length < 3) continue;
      if (STOP_WORDS.has(w)) continue;
      wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
    }

    const hour = m.timestamp.getHours();
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
  }

  const avgMsgLength = Number((totalChars / filtered.length).toFixed(2));
  const emojiRatio = Number((totalEmojis / Math.max(totalChars, 1)).toFixed(4));

  const topEmojis = topN(
    [...emojiCounts.entries()].sort((a, b) => b[1] - a[1]).map(([e]) => e),
    10,
  );
  const topPhrases = topN(
    [...wordCounts.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w),
    20,
  );

  const hoursRanked = hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .filter((h) => h.count > 0)
    .map((h) => h.hour)
    .sort((a, b) => a - b);

  const burst = calculateBursts(filtered);
  const capitalization = detectCapitalization(filtered);
  const language = detectLanguage(filtered.map((m) => m.content).join(' '));

  return {
    sessionId,
    avgMsgLength,
    emojiRatio,
    topEmojis,
    capitalization,
    punctuation: punctCounts,
    topPhrases,
    burstPattern: burst.pattern,
    avgBurstCount: burst.averageCount,
    activeHours: hoursRanked,
    language,
  };
}
