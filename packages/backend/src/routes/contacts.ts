import { Router } from 'express';
import { z } from 'zod';
import { whatsappClient } from '../modules/whatsapp-client.js';
import {
  clearActiveTarget,
  deleteBotTarget,
  getActiveTarget,
  getOrCreateSession,
  listBotTargets,
  setActiveTarget,
  setAllBotTargetsEnabled,
  setBotTargetEnabled,
  setBotTargetPrompt,
  upsertBotTarget,
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

// ----------------------------------------------------------------------
// Multi-target endpoints
// ----------------------------------------------------------------------

router.get('/targets', (_req, res) => {
  const sessionId = getOrCreateSession(null);
  res.json({ targets: listBotTargets(sessionId) });
});

const AddTargetSchema = z.object({
  jid: z.string().min(1),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  customPrompt: z.string().nullable().optional(),
});

router.post('/targets', (req, res) => {
  const parsed = AddTargetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const sessionId = getOrCreateSession(null);
  const all = whatsappClient.listContacts();
  const matched = all.find((c) => c.jid === parsed.data.jid);
  const name = parsed.data.name ?? matched?.name ?? parsed.data.jid.split('@')[0]!;
  const target = upsertBotTarget(sessionId, parsed.data.jid, name);
  if (parsed.data.enabled !== undefined) {
    setBotTargetEnabled(sessionId, parsed.data.jid, parsed.data.enabled);
  }
  if (parsed.data.customPrompt !== undefined) {
    setBotTargetPrompt(sessionId, parsed.data.jid, parsed.data.customPrompt);
  }
  res.json({ target });
});

router.delete('/targets/:jid', (req, res) => {
  const sessionId = getOrCreateSession(null);
  deleteBotTarget(sessionId, req.params.jid);
  res.json({ ok: true });
});

const ToggleSchema = z.object({ enabled: z.boolean() });

router.post('/targets/all/toggle', (req, res) => {
  const parsed = ToggleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const sessionId = getOrCreateSession(null);
  setAllBotTargetsEnabled(sessionId, parsed.data.enabled);
  res.json({ targets: listBotTargets(sessionId) });
});

router.post('/targets/:jid/toggle', (req, res) => {
  const parsed = ToggleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const sessionId = getOrCreateSession(null);
  setBotTargetEnabled(sessionId, req.params.jid, parsed.data.enabled);
  res.json({ targets: listBotTargets(sessionId) });
});

const PromptSchema = z.object({ customPrompt: z.string().max(4000).nullable() });

router.put('/targets/:jid/prompt', (req, res) => {
  const parsed = PromptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const sessionId = getOrCreateSession(null);
  setBotTargetPrompt(sessionId, req.params.jid, parsed.data.customPrompt);
  res.json({ targets: listBotTargets(sessionId) });
});

export default router;
