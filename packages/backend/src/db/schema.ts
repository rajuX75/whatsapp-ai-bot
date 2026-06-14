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
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

CREATE TABLE IF NOT EXISTS style_profiles (
  session_id INTEGER PRIMARY KEY,
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
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conv_log_session ON conversation_log(session_id);
`;

export function migrate(): void {
  db.exec(SCHEMA_SQL);
  logger.info('SQLite schema ensured at %s', config.DB_PATH);
}
