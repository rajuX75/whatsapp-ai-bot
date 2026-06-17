import { Router } from 'express';
import { getOrCreateSession, getStyleProfile } from '../db/repository.js';

const router = Router();

router.get('/', (req, res) => {
  const sessionId = getOrCreateSession(null);
  const jid = typeof req.query.jid === 'string' ? req.query.jid : null;
  const profile = getStyleProfile(sessionId, jid);
  if (!profile) {
    res.status(404).json({
      error: jid
        ? `No style profile yet for ${jid}. Upload chat history for this contact first.`
        : 'No style profile yet. Upload chat history first.',
    });
    return;
  }
  res.json({ profile });
});

export default router;
