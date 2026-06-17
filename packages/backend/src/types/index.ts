export interface ParsedMessage {
  sender: string;
  timestamp: Date;
  content: string;
}

export interface StyleProfile {
  sessionId: number;
  contactJid: string;
  avgMsgLength: number;
  emojiRatio: number;
  topEmojis: string[];
  capitalization: 'lower' | 'upper' | 'mixed' | 'sentence';
  punctuation: Record<string, number>;
  topPhrases: string[];
  burstPattern: 'single' | 'burst' | 'mixed';
  avgBurstCount: number;
  activeHours: number[];
  language: string;
}

export type WaConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr'
  | 'connected'
  | 'logged_out';

export interface WaContactSummary {
  jid: string;
  name: string;
  lastMessageAt?: number;
}

export interface ActiveTarget {
  sessionId: number;
  contactJid: string;
  contactName: string;
  setAt: number;
}

export interface BotTarget {
  sessionId: number;
  contactJid: string;
  contactName: string;
  enabled: boolean;
  customPrompt: string | null;
  createdAt: number;
}

export interface ConversationLogEntry {
  id: number;
  sessionId: number;
  direction: 'in' | 'out';
  content: string;
  aiGenerated: boolean;
  sentAt: number;
  contactJid: string | null;
}

/** UI-editable runtime settings. All optional — falls back to env / defaults. */
export interface RuntimeSettings {
  // ---- LLM ----
  llmProvider: 'anthropic' | 'openai' | 'ollama' | 'openrouter' | 'gemini';
  llmModel: string;          // override the provider-specific model name
  temperature: number;       // 0 - 2
  maxTokens: number;         // 1 - 4096
  contextWindow: number;     // # of recent messages
  // ---- Reply behaviour ----
  replyDelayMin: number;     // ms
  replyDelayMax: number;     // ms
  typingIndicator: boolean;
  burstSplitEnabled: boolean;
  antiBanJitter: boolean;    // adds extra random jitter
  // ---- Filters ----
  replyToGroups: boolean;
  replyToUnknown: boolean;
  ignoreRegex: string;       // skip messages matching this regex
  allowedKeywords: string;   // comma-separated, if non-empty only reply when present
  ignoredKeywords: string;   // comma-separated, skip when present
  // ---- Schedule ----
  activeHoursStart: number;  // 0 - 23
  activeHoursEnd: number;    // 0 - 23 (wraps if end<start)
  weekendEnabled: boolean;
  timezoneOffset: number;    // minutes from UTC, -720 .. +840
  // ---- Style overrides ----
  emojiBoost: number;        // -1 .. +1 (decrease/increase emoji density)
  styleStrictness: number;   // 0 .. 1
  languageOverride: string;  // '' = auto
  // ---- Safety / limits ----
  maxRepliesPerHour: number;
  rateLimitEnabled: boolean;
  doNotDisturb: boolean;     // hard kill-switch
  // ---- Misc ----
  readReceipts: boolean;
  logRetentionDays: number;
  globalSystemPrompt: string; // applied to every contact unless overridden
}

export const DEFAULT_SETTINGS: RuntimeSettings = {
  llmProvider: 'anthropic',
  llmModel: '',
  temperature: 0.8,
  maxTokens: 512,
  contextWindow: 20,
  replyDelayMin: 2000,
  replyDelayMax: 8000,
  typingIndicator: true,
  burstSplitEnabled: true,
  antiBanJitter: true,
  replyToGroups: false,
  replyToUnknown: false,
  ignoreRegex: '',
  allowedKeywords: '',
  ignoredKeywords: '',
  activeHoursStart: 0,
  activeHoursEnd: 23,
  weekendEnabled: true,
  timezoneOffset: 0,
  emojiBoost: 0,
  styleStrictness: 0.7,
  languageOverride: '',
  maxRepliesPerHour: 60,
  rateLimitEnabled: false,
  doNotDisturb: false,
  readReceipts: false,
  logRetentionDays: 30,
  globalSystemPrompt: '',
};
