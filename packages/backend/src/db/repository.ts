import { db } from './schema.js';
import {
  DEFAULT_SETTINGS,
  type ActiveTarget,
  type BotTarget,
  type ConversationLogEntry,
  type ParsedMessage,
  type RuntimeSettings,
  type StyleProfile,
} from '../types/index.js';

const DEFAULT_PROFILE_KEY = '__default__';

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

// -------------------- active target (legacy single-target) --------------------

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
  // Also ensure the target row exists in the multi-target table so the
  // legacy UI keeps working.
  upsertBotTarget(sessionId, contactJid, contactName);
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

// -------------------- multi-contact bot targets --------------------

interface BotTargetRow {
  session_id: number;
  contact_jid: string;
  contact_name: string;
  enabled: number;
  custom_prompt: string | null;
  created_at: number;
}

function rowToTarget(row: BotTargetRow): BotTarget {
  return {
    sessionId: row.session_id,
    contactJid: row.contact_jid,
    contactName: row.contact_name,
    enabled: row.enabled === 1,
    customPrompt: row.custom_prompt,
    createdAt: row.created_at,
  };
}

export function listBotTargets(sessionId: number): BotTarget[] {
  const rows = db
    .prepare<[number], BotTargetRow>(
      'SELECT * FROM bot_targets WHERE session_id = ? ORDER BY created_at ASC',
    )
    .all(sessionId);
  return rows.map(rowToTarget);
}

export function upsertBotTarget(
  sessionId: number,
  contactJid: string,
  contactName: string,
): BotTarget {
  const now = Date.now();
  db.prepare(
    `INSERT INTO bot_targets (session_id, contact_jid, contact_name, enabled, custom_prompt, created_at)
     VALUES (?, ?, ?, 0, NULL, ?)
     ON CONFLICT(session_id, contact_jid) DO UPDATE SET
       contact_name = excluded.contact_name`,
  ).run(sessionId, contactJid, contactName, now);
  return getBotTarget(sessionId, contactJid)!;
}

export function getBotTarget(sessionId: number, contactJid: string): BotTarget | null {
  const row = db
    .prepare<[number, string], BotTargetRow>(
      'SELECT * FROM bot_targets WHERE session_id = ? AND contact_jid = ?',
    )
    .get(sessionId, contactJid);
  return row ? rowToTarget(row) : null;
}

export function deleteBotTarget(sessionId: number, contactJid: string): void {
  db.prepare('DELETE FROM bot_targets WHERE session_id = ? AND contact_jid = ?').run(
    sessionId,
    contactJid,
  );
}

export function setBotTargetEnabled(
  sessionId: number,
  contactJid: string,
  enabled: boolean,
): void {
  db.prepare(
    'UPDATE bot_targets SET enabled = ? WHERE session_id = ? AND contact_jid = ?',
  ).run(enabled ? 1 : 0, sessionId, contactJid);
}

export function setAllBotTargetsEnabled(sessionId: number, enabled: boolean): void {
  db.prepare('UPDATE bot_targets SET enabled = ? WHERE session_id = ?').run(
    enabled ? 1 : 0,
    sessionId,
  );
}

export function setBotTargetPrompt(
  sessionId: number,
  contactJid: string,
  prompt: string | null,
): void {
  db.prepare(
    'UPDATE bot_targets SET custom_prompt = ? WHERE session_id = ? AND contact_jid = ?',
  ).run(prompt && prompt.trim() ? prompt : null, sessionId, contactJid);
}

// -------------------- chat messages (history import) --------------------

export function bulkInsertChatMessages(
  sessionId: number,
  messages: ParsedMessage[],
  contactJid: string | null = null,
): number {
  const stmt = db.prepare(
    'INSERT INTO chat_messages (session_id, sender, timestamp, content, contact_jid) VALUES (?, ?, ?, ?, ?)',
  );
  const tx = db.transaction((rows: ParsedMessage[]) => {
    for (const m of rows) {
      stmt.run(sessionId, m.sender, m.timestamp.getTime(), m.content, contactJid);
    }
  });
  tx(messages);
  return messages.length;
}

export function clearChatMessages(sessionId: number, contactJid: string | null = null): void {
  if (contactJid) {
    db.prepare(
      'DELETE FROM chat_messages WHERE session_id = ? AND contact_jid = ?',
    ).run(sessionId, contactJid);
  } else {
    db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId);
  }
}

export function getChatMessages(
  sessionId: number,
  contactJid: string | null = null,
): ParsedMessage[] {
  const rows = contactJid
    ? db
        .prepare<[number, string], { sender: string; timestamp: number; content: string }>(
          'SELECT sender, timestamp, content FROM chat_messages WHERE session_id = ? AND contact_jid = ? ORDER BY timestamp ASC',
        )
        .all(sessionId, contactJid)
    : db
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

interface StyleProfileRow {
  session_id: number;
  contact_jid: string;
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
}

function rowToProfile(row: StyleProfileRow): StyleProfile {
  return {
    sessionId: row.session_id,
    contactJid: row.contact_jid,
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

export function saveStyleProfile(profile: StyleProfile): void {
  const contactJid = profile.contactJid || DEFAULT_PROFILE_KEY;
  db.prepare(
    `INSERT INTO style_profiles (
       session_id, contact_jid, avg_msg_length, emoji_ratio, top_emojis, capitalization,
       punctuation, top_phrases, burst_pattern, avg_burst_count, active_hours, language
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id, contact_jid) DO UPDATE SET
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
    contactJid,
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

export function getStyleProfile(
  sessionId: number,
  contactJid: string | null = null,
): StyleProfile | null {
  // Prefer contact-specific profile, fall back to default.
  const key = contactJid ?? DEFAULT_PROFILE_KEY;
  const row =
    db
      .prepare<[number, string], StyleProfileRow>(
        'SELECT * FROM style_profiles WHERE session_id = ? AND contact_jid = ?',
      )
      .get(sessionId, key) ??
    db
      .prepare<[number, string], StyleProfileRow>(
        'SELECT * FROM style_profiles WHERE session_id = ? AND contact_jid = ?',
      )
      .get(sessionId, DEFAULT_PROFILE_KEY);
  return row ? rowToProfile(row) : null;
}

// -------------------- conversation log --------------------

export function logConversation(
  sessionId: number,
  direction: 'in' | 'out',
  content: string,
  aiGenerated: boolean,
  contactJid: string | null = null,
): ConversationLogEntry {
  const sentAt = Date.now();
  const info = db
    .prepare(
      'INSERT INTO conversation_log (session_id, direction, content, ai_generated, sent_at, contact_jid) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(sessionId, direction, content, aiGenerated ? 1 : 0, sentAt, contactJid);
  return {
    id: Number(info.lastInsertRowid),
    sessionId,
    direction,
    content,
    aiGenerated,
    sentAt,
    contactJid,
  };
}

export function recentConversation(
  sessionId: number,
  limit = 100,
  contactJid: string | null = null,
): ConversationLogEntry[] {
  const rows = contactJid
    ? db
        .prepare<[number, string, number], {
          id: number;
          session_id: number;
          direction: string;
          content: string;
          ai_generated: number;
          sent_at: number;
          contact_jid: string | null;
        }>(
          'SELECT id, session_id, direction, content, ai_generated, sent_at, contact_jid FROM conversation_log WHERE session_id = ? AND contact_jid = ? ORDER BY id DESC LIMIT ?',
        )
        .all(sessionId, contactJid, limit)
    : db
        .prepare<[number, number], {
          id: number;
          session_id: number;
          direction: string;
          content: string;
          ai_generated: number;
          sent_at: number;
          contact_jid: string | null;
        }>(
          'SELECT id, session_id, direction, content, ai_generated, sent_at, contact_jid FROM conversation_log WHERE session_id = ? ORDER BY id DESC LIMIT ?',
        )
        .all(sessionId, limit);
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    direction: r.direction as 'in' | 'out',
    content: r.content,
    aiGenerated: r.ai_generated === 1,
    sentAt: r.sent_at,
    contactJid: r.contact_jid,
  }));
}

export function countRecentOutbound(sessionId: number, sinceMs: number): number {
  const row = db
    .prepare<[number, string, number], { c: number }>(
      'SELECT COUNT(*) as c FROM conversation_log WHERE session_id = ? AND direction = ? AND sent_at >= ?',
    )
    .get(sessionId, 'out', sinceMs);
  return row?.c ?? 0;
}

// -------------------- settings --------------------

export function getAllSettings(): Record<string, unknown> {
  const rows = db
    .prepare<[], { key: string; value: string }>('SELECT key, value FROM settings')
    .all();
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      out[r.key] = r.value;
    }
  }
  return out;
}

export function getMergedSettings(): RuntimeSettings {
  const stored = getAllSettings() as Partial<RuntimeSettings>;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(patch: Record<string, unknown>): void {
  const now = Date.now();
  const stmt = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );
  const tx = db.transaction((entries: Array<[string, unknown]>) => {
    for (const [k, v] of entries) stmt.run(k, JSON.stringify(v), now);
  });
  tx(Object.entries(patch));
}

export function resetSettings(): void {
  db.prepare('DELETE FROM settings').run();
}
