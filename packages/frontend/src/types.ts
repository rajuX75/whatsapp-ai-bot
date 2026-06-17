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

export interface ConversationLogEntry {
  id: number;
  sessionId: number;
  direction: 'in' | 'out';
  content: string;
  aiGenerated: boolean;
  sentAt: number;
  contactJid: string | null;
}

export interface RuntimeSettings {
  llmProvider: 'anthropic' | 'openai' | 'ollama' | 'openrouter' | 'gemini';
  llmModel: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;

  replyDelayMin: number;
  replyDelayMax: number;
  typingIndicator: boolean;
  burstSplitEnabled: boolean;
  antiBanJitter: boolean;

  replyToGroups: boolean;
  replyToUnknown: boolean;
  ignoreRegex: string;
  allowedKeywords: string;
  ignoredKeywords: string;

  activeHoursStart: number;
  activeHoursEnd: number;
  weekendEnabled: boolean;
  timezoneOffset: number;

  emojiBoost: number;
  styleStrictness: number;
  languageOverride: string;

  maxRepliesPerHour: number;
  rateLimitEnabled: boolean;
  doNotDisturb: boolean;

  readReceipts: boolean;
  logRetentionDays: number;
  globalSystemPrompt: string;
}
