import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

mkdirSync(dirname(config.DB_PATH), { recursive: true });

export const db = new Database(config.DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS active_target (
  session_id INTEGER PRIMARY KEY,
  contact_jid TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  set_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  sender TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  content TEXT NOT NULL,
  contact_jid TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_contact ON chat_messages(contact_jid);

CREATE TABLE IF NOT EXISTS style_profiles (
  session_id INTEGER NOT NULL,
  contact_jid TEXT NOT NULL DEFAULT '__default__',
  avg_msg_length REAL NOT NULL,
  emoji_ratio REAL NOT NULL,
  top_emojis TEXT NOT NULL,
  capitalization TEXT NOT NULL,
  punctuation TEXT NOT NULL,
  top_phrases TEXT NOT NULL,
  burst_pattern TEXT NOT NULL,
  avg_burst_count REAL NOT NULL,
  active_hours TEXT NOT NULL,
  language TEXT NOT NULL,
  PRIMARY KEY (session_id, contact_jid),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL,
  contact_jid TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conv_log_session ON conversation_log(session_id);
CREATE INDEX IF NOT EXISTS idx_conv_log_contact ON conversation_log(contact_jid);

-- Multi-contact bot targets. Each row = one contact that the bot may reply to,
-- with its own enable/disable flag and optional custom prompt.
CREATE TABLE IF NOT EXISTS bot_targets (
  session_id INTEGER NOT NULL,
  contact_jid TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  custom_prompt TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, contact_jid),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Key/value runtime settings (UI-editable).
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

/** Lightweight column migrations for existing DBs. */
function ensureColumn(table: string, column: string, decl: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
    logger.info('schema: added column %s.%s', table, column);
  }
}

export function migrate(): void {
  db.exec(SCHEMA_SQL);
  // Best-effort additive migrations for older DBs.
  try {
    ensureColumn('chat_messages', 'contact_jid', 'TEXT');
    ensureColumn('conversation_log', 'contact_jid', 'TEXT');
  } catch (err) {
    logger.warn('schema: column migration warning: %s', (err as Error).message);
  }
  logger.info('SQLite schema ensured at %s', config.DB_PATH);
}
