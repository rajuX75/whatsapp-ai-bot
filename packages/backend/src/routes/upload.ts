import { Router } from 'express';
import multer from 'multer';
import { parseChatBuffer } from '../modules/chat-parser.js';
import { analyseStyle } from '../modules/style-analyzer.js';
import {
  bulkInsertChatMessages,
  clearChatMessages,
  getActiveTarget,
  getOrCreateSession,
  saveStyleProfile,
} from '../db/repository.js';
import { logger } from '../utils/logger.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();

interface UploadState {
  status: 'idle' | 'parsing' | 'done' | 'error';
  totalMessages: number;
  targetSender: string | null;
  error?: string;
  finishedAt?: number;
}

let lastUpload: UploadState = { status: 'idle', totalMessages: 0, targetSender: null };

router.post('/chat', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const sessionId = getOrCreateSession(null);
  const active = getActiveTarget(sessionId);
  if (!active) {
    res.status(400).json({ error: 'Select a target contact first' });
    return;
  }

  lastUpload = { status: 'parsing', totalMessages: 0, targetSender: active.contactName };
  try {
    const messages = parseChatBuffer(req.file.originalname, req.file.buffer);
    clearChatMessages(sessionId);
    const inserted = bulkInsertChatMessages(sessionId, messages);
    const profile = analyseStyle(sessionId, messages, { targetSender: active.contactName });
    saveStyleProfile(profile);
    lastUpload = {
      status: 'done',
      totalMessages: inserted,
      targetSender: active.contactName,
      finishedAt: Date.now(),
    };
    res.json({ inserted, profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('upload: parse failed', err);
    lastUpload = {
      status: 'error',
      totalMessages: 0,
      targetSender: active.contactName,
      error: message,
      finishedAt: Date.now(),
    };
    res.status(400).json({ error: message });
  }
});

router.get('/status', (_req, res) => {
  res.json(lastUpload);
});

export default router;
