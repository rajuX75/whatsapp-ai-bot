import { db } from './schema.js';
import type {
  ActiveTarget,
  ConversationLogEntry,
  ParsedMessage,
  StyleProfile,
} from '../types/index.js';

// -------------------- sessions --------------------

export function getOrCreateSession(phone: string | null): number {
  const existing = db
    .prepare<[], { id: number }>('SELECT id FROM sessions ORDER BY id DESC LIMIT 1')
    .get();
  if (existing) return existing.id;

  const info = db
    .prepare('INSERT INTO sessions (phone, created_at, status) VALUES (?, ?, ?)')
    .run(phone, Date.now(), 'connected');
  return Number(info.lastInsertRowid);
}

export function updateSessionStatus(sessionId: number, status: string): void {
  db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run(status, sessionId);
}

// -------------------- active target --------------------

export function setActiveTarget(
  sessionId: number,
  contactJid: string,
  contactName: string,
): ActiveTarget {
  const setAt = Date.now();
  db.prepare(
    `INSERT INTO active_target (session_id, contact_jid, contact_name, set_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       contact_jid = excluded.contact_jid,
       contact_name = excluded.contact_name,
       set_at = excluded.set_at`,
  ).run(sessionId, contactJid, contactName, setAt);
  return { sessionId, contactJid, contactName, setAt };
}

export function getActiveTarget(sessionId: number): ActiveTarget | null {
  const row = db
    .prepare<[number], {
      session_id: number;
      contact_jid: string;
      contact_name: string;
      set_at: number;
    }>(
      'SELECT session_id, contact_jid, contact_name, set_at FROM active_target WHERE session_id = ?',
    )
    .get(sessionId);
  if (!row) return null;
  return {
    sessionId: row.session_id,
    contactJid: row.contact_jid,
    contactName: row.contact_name,
    setAt: row.set_at,
  };
}

export function clearActiveTarget(sessionId: number): void {
  db.prepare('DELETE FROM active_target WHERE session_id = ?').run(sessionId);
}

// -------------------- chat messages (history import) --------------------

export function bulkInsertChatMessages(
  sessionId: number,
  messages: ParsedMessage[],
): number {
  const stmt = db.prepare(
    'INSERT INTO chat_messages (session_id, sender, timestamp, content) VALUES (?, ?, ?, ?)',
  );
  const tx = db.transaction((rows: ParsedMessage[]) => {
    for (const m of rows) {
      stmt.run(sessionId, m.sender, m.timestamp.getTime(), m.content);
    }
  });
  tx(messages);
  return messages.length;
}

export function clearChatMessages(sessionId: number): void {
  db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId);
}

export function getChatMessages(sessionId: number): ParsedMessage[] {
  const rows = db
    .prepare<[number], { sender: string; timestamp: number; content: string }>(
      'SELECT sender, timestamp, content FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC',
    )
    .all(sessionId);
  return rows.map((r) => ({
    sender: r.sender,
    timestamp: new Date(r.timestamp),
    content: r.content,
  }));
}

// -------------------- style profiles --------------------

export function saveStyleProfile(profile: StyleProfile): void {
  db.prepare(
    `INSERT INTO style_profiles (
       session_id, avg_msg_length, emoji_ratio, top_emojis, capitalization,
       punctuation, top_phrases, burst_pattern, avg_burst_count, active_hours, language
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       avg_msg_length   = excluded.avg_msg_length,
       emoji_ratio      = excluded.emoji_ratio,
       top_emojis       = excluded.top_emojis,
       capitalization   = excluded.capitalization,
       punctuation      = excluded.punctuation,
       top_phrases      = excluded.top_phrases,
       burst_pattern    = excluded.burst_pattern,
       avg_burst_count  = excluded.avg_burst_count,
       active_hours     = excluded.active_hours,
       language         = excluded.language`,
  ).run(
    profile.sessionId,
    profile.avgMsgLength,
    profile.emojiRatio,
    JSON.stringify(profile.topEmojis),
    profile.capitalization,
    JSON.stringify(profile.punctuation),
    JSON.stringify(profile.topPhrases),
    profile.burstPattern,
    profile.avgBurstCount,
    JSON.stringify(profile.activeHours),
    profile.language,
  );
}

export function getStyleProfile(sessionId: number): StyleProfile | null {
  const row = db
    .prepare<[number], {
      session_id: number;
      avg_msg_length: number;
      emoji_ratio: number;
      top_emojis: string;
      capitalization: string;
      punctuation: string;
      top_phrases: string;
      burst_pattern: string;
      avg_burst_count: number;
      active_hours: string;
      language: string;
    }>('SELECT * FROM style_profiles WHERE session_id = ?')
    .get(sessionId);
  if (!row) return null;
  return {
    sessionId: row.session_id,
    avgMsgLength: row.avg_msg_length,
    emojiRatio: row.emoji_ratio,
    topEmojis: JSON.parse(row.top_emojis) as string[],
    capitalization: row.capitalization as StyleProfile['capitalization'],
    punctuation: JSON.parse(row.punctuation) as Record<string, number>,
    topPhrases: JSON.parse(row.top_phrases) as string[],
    burstPattern: row.burst_pattern as StyleProfile['burstPattern'],
    avgBurstCount: row.avg_burst_count,
    activeHours: JSON.parse(row.active_hours) as number[],
    language: row.language,
  };
}

// -------------------- conversation log --------------------

export function logConversation(
  sessionId: number,
  direction: 'in' | 'out',
  content: string,
  aiGenerated: boolean,
): ConversationLogEntry {
  const sentAt = Date.now();
  const info = db
    .prepare(
      'INSERT INTO conversation_log (session_id, direction, content, ai_generated, sent_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(sessionId, direction, content, aiGenerated ? 1 : 0, sentAt);
  return {
    id: Number(info.lastInsertRowid),
    sessionId,
    direction,
    content,
    aiGenerated,
    sentAt,
  };
}

export function recentConversation(
  sessionId: number,
  limit = 100,
): ConversationLogEntry[] {
  const rows = db
    .prepare<[number, number], {
      id: number;
      session_id: number;
      direction: string;
      content: string;
      ai_generated: number;
      sent_at: number;
    }>(
      'SELECT id, session_id, direction, content, ai_generated, sent_at FROM conversation_log WHERE session_id = ? ORDER BY id DESC LIMIT ?',
    )
    .all(sessionId, limit);
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    direction: r.direction as 'in' | 'out',
    content: r.content,
    aiGenerated: r.ai_generated === 1,
    sentAt: r.sent_at,
  }));
}
