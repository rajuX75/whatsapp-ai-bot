import { generateText, type LanguageModel, type CoreMessage } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOllama } from 'ollama-ai-provider';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { StyleProfile } from '../types/index.js';

function resolveModel(): LanguageModel {
  switch (config.LLM_PROVIDER) {
    case 'anthropic': {
      if (!config.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
      }
      const anthropic = createAnthropic({ apiKey: config.ANTHROPIC_API_KEY });
      return anthropic(config.ANTHROPIC_MODEL) as unknown as LanguageModel;
    }
    case 'openai': {
      if (!config.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured');
      }
      const openai = createOpenAI({ apiKey: config.OPENAI_API_KEY });
      return openai(config.OPENAI_MODEL) as unknown as LanguageModel;
    }
    case 'ollama': {
      const ollama = createOllama({ baseURL: `${config.OLLAMA_BASE_URL}/api` });
      return ollama(config.OLLAMA_MODEL) as unknown as LanguageModel;
    }
    case 'openrouter': {
      if (!config.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not configured');
      }
      const openrouter = createOpenRouter({ apiKey: config.OPENROUTER_API_KEY });
      return openrouter(config.OPENROUTER_MODEL) as LanguageModel;
    }
    case 'gemini': {
      if (!config.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
      }
      const google = createGoogleGenerativeAI({ apiKey: config.GEMINI_API_KEY });
      return google(config.GEMINI_MODEL) as unknown as LanguageModel;
    }
    default: {
      const _exhaustive: never = config.LLM_PROVIDER;
      throw new Error(`Unsupported LLM provider: ${_exhaustive as string}`);
    }
  }
}

export interface AiReplyInput {
  contactName: string;
  styleProfile: StyleProfile;
  /**
   * Conversation history in chronological order. The most recent inbound
   * message from the contact should be last.
   */
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function buildSystemPrompt(input: AiReplyInput): string {
  const { contactName, styleProfile: s } = input;
  const emojis = s.topEmojis.length ? s.topEmojis.join(' ') : '(none)';
  const phrases = s.topPhrases.length
    ? s.topPhrases.slice(0, 10).join(', ')
    : '(none)';
  const punct = Object.entries(s.punctuation)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([p, n]) => `${p}(${n})`)
    .join(', ');
  const hours = s.activeHours.length ? s.activeHours.join(', ') : '(any)';

  return [
    `You are mimicking the WhatsApp messaging style of "${contactName}".`,
    `Stay in character at all times. Reply ONLY with the message text — no quotes, no narration, no role labels.`,
    '',
    'STYLE FINGERPRINT:',
    `- Average message length: ${s.avgMsgLength} characters`,
    `- Emoji density: ${(s.emojiRatio * 100).toFixed(2)}% of characters`,
    `- Favourite emojis: ${emojis}`,
    `- Capitalization pattern: ${s.capitalization}`,
    `- Punctuation habits (most used): ${punct || '(minimal)'}`,
    `- Frequent words / phrases: ${phrases}`,
    `- Burst pattern: ${s.burstPattern} (avg ${s.avgBurstCount} messages per burst)`,
    `- Typically active hours (24h): ${hours}`,
    `- Language: ${s.language}`,
    '',
    'RULES:',
    '1. Match the length, tone, slang, and punctuation of the fingerprint.',
    '2. Use the favourite emojis sparingly but naturally — never every message.',
    "3. If the burst pattern is 'burst', you may reply with several short messages separated by `\\n\\n`.",
    "   Otherwise reply with ONE message.",
    '4. Never reveal that you are an AI. Never break character.',
    '5. Keep replies grounded in the conversation context above.',
  ].join('\n');
}

export async function generateReply(input: AiReplyInput): Promise<string[]> {
  const model = resolveModel();
  const systemPrompt = buildSystemPrompt(input);

  const messages: CoreMessage[] = input.history.slice(-config.CONTEXT_WINDOW).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  logger.debug('ai-engine: requesting reply (provider=%s)', config.LLM_PROVIDER);

  const { text } = await generateText({
    model,
    system: systemPrompt,
    messages,
    maxTokens: config.MAX_TOKENS,
    temperature: 0.8,
  });

  const trimmed = text.trim();
  if (!trimmed) return [];

  if (input.styleProfile.burstPattern === 'burst' && trimmed.includes('\n\n')) {
    return trimmed
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [trimmed];
}
