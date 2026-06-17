import { Router } from 'express';
import { z } from 'zod';
import {
  getMergedSettings,
  resetSettings,
  saveSettings,
} from '../db/repository.js';
import { DEFAULT_SETTINGS, type RuntimeSettings } from '../types/index.js';

const router = Router();

const SettingsSchema = z.object({
  llmProvider: z.enum(['anthropic', 'openai', 'ollama', 'openrouter', 'gemini']).optional(),
  llmModel: z.string().max(200).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(16).max(4096).optional(),
  contextWindow: z.number().int().min(1).max(200).optional(),

  replyDelayMin: z.number().int().min(0).max(120_000).optional(),
  replyDelayMax: z.number().int().min(0).max(120_000).optional(),
  typingIndicator: z.boolean().optional(),
  burstSplitEnabled: z.boolean().optional(),
  antiBanJitter: z.boolean().optional(),

  replyToGroups: z.boolean().optional(),
  replyToUnknown: z.boolean().optional(),
  ignoreRegex: z.string().max(500).optional(),
  allowedKeywords: z.string().max(1000).optional(),
  ignoredKeywords: z.string().max(1000).optional(),

  activeHoursStart: z.number().int().min(0).max(23).optional(),
  activeHoursEnd: z.number().int().min(0).max(23).optional(),
  weekendEnabled: z.boolean().optional(),
  timezoneOffset: z.number().int().min(-720).max(840).optional(),

  emojiBoost: z.number().min(-1).max(1).optional(),
  styleStrictness: z.number().min(0).max(1).optional(),
  languageOverride: z.string().max(20).optional(),

  maxRepliesPerHour: z.number().int().min(1).max(10_000).optional(),
  rateLimitEnabled: z.boolean().optional(),
  doNotDisturb: z.boolean().optional(),

  readReceipts: z.boolean().optional(),
  logRetentionDays: z.number().int().min(1).max(3650).optional(),
  globalSystemPrompt: z.string().max(4000).optional(),
});

router.get('/', (_req, res) => {
  res.json({
    settings: getMergedSettings(),
    defaults: DEFAULT_SETTINGS,
  });
});

router.put('/', (req, res) => {
  const parsed = SettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  // Validate min <= max for delay window.
  const merged: RuntimeSettings = { ...getMergedSettings(), ...parsed.data };
  if (merged.replyDelayMin > merged.replyDelayMax) {
    res.status(400).json({
      error: { fieldErrors: { replyDelayMin: ['must be ≤ replyDelayMax'] } },
    });
    return;
  }
  saveSettings(parsed.data);
  res.json({ settings: getMergedSettings() });
});

router.post('/reset', (_req, res) => {
  resetSettings();
  res.json({ settings: getMergedSettings() });
});

export default router;
