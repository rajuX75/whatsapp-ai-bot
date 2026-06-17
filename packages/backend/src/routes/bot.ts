import { Router } from 'express';
import { z } from 'zod';
import { messageRouter } from '../modules/message-router.js';
import { getOrCreateSession, recentConversation } from '../db/repository.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({ enabled: messageRouter.isEnabled() });
});

const ToggleSchema = z.object({ enabled: z.boolean() });

router.post('/toggle', (req, res) => {
  const parsed = ToggleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  messageRouter.setEnabled(parsed.data.enabled);
  res.json({ enabled: messageRouter.isEnabled() });
});

router.get('/logs', (req, res) => {
  const sessionId = getOrCreateSession(null);
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const jid = typeof req.query.jid === 'string' ? req.query.jid : null;
  res.json({ logs: recentConversation(sessionId, limit, jid) });
});

export default router;
