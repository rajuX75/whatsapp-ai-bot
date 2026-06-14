import { Router } from 'express';
import { getOrCreateSession, getStyleProfile } from '../db/repository.js';

const router = Router();

router.get('/', (_req, res) => {
  const sessionId = getOrCreateSession(null);
  const profile = getStyleProfile(sessionId);
  if (!profile) {
    res.status(404).json({ error: 'No style profile yet. Upload chat history first.' });
    return;
  }
  res.json({ profile });
});

export default router;
