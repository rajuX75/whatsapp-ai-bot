import { Router } from 'express';
import multer from 'multer';
import { parseChatBuffer } from '../modules/chat-parser.js';
import { analyseStyle } from '../modules/style-analyzer.js';
import {
  bulkInsertChatMessages,
  clearChatMessages,
  getActiveTarget,
  getBotTarget,
  getOrCreateSession,
  saveStyleProfile,
  upsertBotTarget,
} from '../db/repository.js';
import { logger } from '../utils/logger.js';
import { whatsappClient } from '../modules/whatsapp-client.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();

interface UploadState {
  status: 'idle' | 'parsing' | 'done' | 'error';
  totalMessages: number;
  targetSender: string | null;
  targetJid: string | null;
  error?: string;
  finishedAt?: number;
}

let lastUpload: UploadState = {
  status: 'idle',
  totalMessages: 0,
  targetSender: null,
  targetJid: null,
};

/**
 * POST /api/upload/chat                — import for the legacy "active" target
 * POST /api/upload/chat?jid=xxx        — import for a specific contact
 * POST /api/upload/chat/:jid           — convenience path form
 */
function importHandler(req: import('express').Request, res: import('express').Response): void {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const sessionId = getOrCreateSession(null);

  // Resolve the contact this import belongs to.
  const explicitJid =
    (req.params.jid as string | undefined) ??
    (typeof req.query.jid === 'string' ? req.query.jid : undefined);

  let contactJid: string;
  let contactName: string;

  if (explicitJid) {
    contactJid = explicitJid;
    const known = whatsappClient.listContacts().find((c) => c.jid === explicitJid);
    const existingTarget = getBotTarget(sessionId, explicitJid);
    contactName =
      existingTarget?.contactName ?? known?.name ?? explicitJid.split('@')[0]!;
    // Make sure a target row exists so the user can toggle this contact on.
    upsertBotTarget(sessionId, contactJid, contactName);
  } else {
    const active = getActiveTarget(sessionId);
    if (!active) {
      res.status(400).json({ error: 'Select a target contact first' });
      return;
    }
    contactJid = active.contactJid;
    contactName = active.contactName;
  }

  lastUpload = {
    status: 'parsing',
    totalMessages: 0,
    targetSender: contactName,
    targetJid: contactJid,
  };
  try {
    const messages = parseChatBuffer(req.file.originalname, req.file.buffer);
    clearChatMessages(sessionId, contactJid);
    const inserted = bulkInsertChatMessages(sessionId, messages, contactJid);
    const profile = analyseStyle(sessionId, messages, {
      targetSender: contactName,
      contactJid,
    });
    saveStyleProfile(profile);
    lastUpload = {
      status: 'done',
      totalMessages: inserted,
      targetSender: contactName,
      targetJid: contactJid,
      finishedAt: Date.now(),
    };
    res.json({ inserted, profile, contactJid });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('upload: parse failed', err);
    lastUpload = {
      status: 'error',
      totalMessages: 0,
      targetSender: contactName,
      targetJid: contactJid,
      error: message,
      finishedAt: Date.now(),
    };
    res.status(400).json({ error: message });
  }
}

router.post('/chat', upload.single('file'), importHandler);
router.post('/chat/:jid', upload.single('file'), importHandler);

router.get('/status', (_req, res) => {
  res.json(lastUpload);
});

export default router;
