import { Router } from 'express';
import { z } from 'zod';
import { whatsappClient } from '../modules/whatsapp-client.js';
import {
  clearActiveTarget,
  getActiveTarget,
  getOrCreateSession,
  setActiveTarget,
} from '../db/repository.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ contacts: whatsappClient.listContacts() });
});

const SelectSchema = z.object({
  jid: z.string().min(1),
  name: z.string().optional(),
});

router.post('/select', (req, res) => {
  const parsed = SelectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const sessionId = getOrCreateSession(null);
  const all = whatsappClient.listContacts();
  const matched = all.find((c) => c.jid === parsed.data.jid);
  const name = parsed.data.name ?? matched?.name ?? parsed.data.jid.split('@')[0]!;
  const target = setActiveTarget(sessionId, parsed.data.jid, name);
  res.json({ target });
});

router.get('/active', (_req, res) => {
  const sessionId = getOrCreateSession(null);
  res.json({ target: getActiveTarget(sessionId) });
});

router.delete('/active', (_req, res) => {
  const sessionId = getOrCreateSession(null);
  clearActiveTarget(sessionId);
  res.json({ ok: true });
});

export default router;
