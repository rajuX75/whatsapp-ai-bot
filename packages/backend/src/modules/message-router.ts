import { EventEmitter } from 'node:events';
import { logger } from '../utils/logger.js';
import { randomInt, sleep } from '../utils/random.js';
import { whatsappClient, type IncomingMessageEvent } from './whatsapp-client.js';
import { generateReply } from './ai-engine.js';
import {
  countRecentOutbound,
  getBotTarget,
  getMergedSettings,
  getStyleProfile,
  listBotTargets,
  logConversation,
  recentConversation,
} from '../db/repository.js';
import type {
  ConversationLogEntry,
  RuntimeSettings,
} from '../types/index.js';

export type RouterEvents = {
  log: [entry: ConversationLogEntry];
  error: [err: Error];
};

class MessageRouter extends EventEmitter<RouterEvents> {
  /**
   * Global master switch. When false, the bot never replies — regardless of
   * per-contact toggles. (Backward-compat with the original /api/bot/toggle.)
   */
  private enabled = false;
  private sessionId: number | null = null;
  private inflightJids = new Set<string>();

  bindSession(sessionId: number): void {
    this.sessionId = sessionId;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    logger.info('message-router: global bot %s', value ? 'ENABLED' : 'DISABLED');
  }

  attach(): void {
    whatsappClient.on('message', (event) => {
      this.handleIncoming(event).catch((err) => {
        logger.error('message-router: handler error', err);
        this.emit('error', err as Error);
      });
    });
  }

  /** True when the message passes all configured filters / schedule checks. */
  private passesFilters(
    event: IncomingMessageEvent,
    settings: RuntimeSettings,
  ): { ok: true } | { ok: false; reason: string } {
    if (settings.doNotDisturb) return { ok: false, reason: 'do-not-disturb' };

    if (event.jid.endsWith('@g.us') && !settings.replyToGroups) {
      return { ok: false, reason: 'group-disabled' };
    }

    const text = event.text;
    if (settings.ignoreRegex.trim()) {
      try {
        const re = new RegExp(settings.ignoreRegex, 'i');
        if (re.test(text)) return { ok: false, reason: 'ignore-regex' };
      } catch {
        // Invalid regex — ignore the rule, don't block messages.
      }
    }

    const ignored = settings.ignoredKeywords
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (ignored.length && ignored.some((kw) => text.toLowerCase().includes(kw))) {
      return { ok: false, reason: 'ignored-keyword' };
    }

    const allowed = settings.allowedKeywords
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allowed.length && !allowed.some((kw) => text.toLowerCase().includes(kw))) {
      return { ok: false, reason: 'allowed-keyword-missing' };
    }

    // Schedule check (24h window, with timezone offset)
    const tzOffsetMs = settings.timezoneOffset * 60_000;
    const local = new Date(Date.now() + tzOffsetMs);
    const hour = local.getUTCHours();
    const dow = local.getUTCDay(); // 0=Sun, 6=Sat
    if (!settings.weekendEnabled && (dow === 0 || dow === 6)) {
      return { ok: false, reason: 'weekend-disabled' };
    }
    const { activeHoursStart: s, activeHoursEnd: e } = settings;
    const inWindow =
      s <= e ? hour >= s && hour <= e : hour >= s || hour <= e;
    if (!inWindow) return { ok: false, reason: 'outside-active-hours' };

    return { ok: true };
  }

  private async handleIncoming(event: IncomingMessageEvent): Promise<void> {
    if (event.fromMe) return;
    if (!this.enabled) return;
    if (this.sessionId == null) return;

    const settings = getMergedSettings();

    // Multi-contact mode: only reply if the contact has an enabled target row.
    const target = getBotTarget(this.sessionId, event.jid);
    if (!target) {
      if (!settings.replyToUnknown) return;
    } else if (!target.enabled) {
      return;
    }

    const filter = this.passesFilters(event, settings);
    if (!filter.ok) {
      logger.debug('message-router: skipping (%s) for %s', filter.reason, event.jid);
      return;
    }

    // Rate-limit
    if (settings.rateLimitEnabled) {
      const sinceMs = Date.now() - 60 * 60 * 1000;
      const outbound = countRecentOutbound(this.sessionId, sinceMs);
      if (outbound >= settings.maxRepliesPerHour) {
        logger.warn(
          'message-router: rate-limit hit (%d/h) for %s',
          settings.maxRepliesPerHour,
          event.jid,
        );
        return;
      }
    }

    if (this.inflightJids.has(event.jid)) {
      logger.debug('message-router: already replying to %s, skipping', event.jid);
      return;
    }
    this.inflightJids.add(event.jid);

    try {
      const inboundEntry = logConversation(
        this.sessionId,
        'in',
        event.text,
        false,
        event.jid,
      );
      this.emit('log', inboundEntry);

      const profile = getStyleProfile(this.sessionId, event.jid);
      if (!profile) {
        logger.warn('message-router: no style profile yet for %s, skipping reply', event.jid);
        return;
      }

      const history = recentConversation(
        this.sessionId,
        settings.contextWindow,
        event.jid,
      )
        .slice()
        .reverse()
        .map((entry) => ({
          role: entry.direction === 'in' ? ('user' as const) : ('assistant' as const),
          content: entry.content,
        }));

      const contactName = target?.contactName ?? event.pushName ?? event.jid;
      const replies = await generateReply({
        contactName,
        styleProfile: profile,
        history,
        customPrompt: target?.customPrompt ?? null,
      });

      if (replies.length === 0) {
        logger.warn('message-router: model returned empty reply');
        return;
      }

      for (const reply of replies) {
        let delay = randomInt(settings.replyDelayMin, settings.replyDelayMax);
        if (settings.antiBanJitter) {
          delay += randomInt(0, Math.max(500, Math.floor(delay * 0.25)));
        }
        if (settings.typingIndicator) {
          await whatsappClient.sendPresenceTyping(event.jid);
        }
        await sleep(delay);
        await whatsappClient.sendText(event.jid, reply);
        if (settings.typingIndicator) {
          await whatsappClient.sendPresencePaused(event.jid);
        }

        const outEntry = logConversation(
          this.sessionId,
          'out',
          reply,
          true,
          event.jid,
        );
        this.emit('log', outEntry);
      }
    } finally {
      this.inflightJids.delete(event.jid);
    }
  }
}

export const messageRouter = new MessageRouter();
