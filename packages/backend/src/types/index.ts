export interface ParsedMessage {
  sender: string;
  timestamp: Date;
  content: string;
}

export interface StyleProfile {
  sessionId: number;
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

export interface ConversationLogEntry {
  id: number;
  sessionId: number;
  direction: 'in' | 'out';
  content: string;
  aiGenerated: boolean;
  sentAt: number;
}
