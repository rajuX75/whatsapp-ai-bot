import { EventEmitter } from 'node:events';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { randomInt, sleep } from '../utils/random.js';
import { whatsappClient, type IncomingMessageEvent } from './whatsapp-client.js';
import { generateReply } from './ai-engine.js';
import {
  getActiveTarget,
  getStyleProfile,
  logConversation,
  recentConversation,
} from '../db/repository.js';
import type { ConversationLogEntry } from '../types/index.js';

export type RouterEvents = {
  log: [entry: ConversationLogEntry];
  error: [err: Error];
};

class MessageRouter extends EventEmitter<RouterEvents> {
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
    logger.info('message-router: bot %s', value ? 'ENABLED' : 'DISABLED');
  }

  attach(): void {
    whatsappClient.on('message', (event) => {
      this.handleIncoming(event).catch((err) => {
        logger.error('message-router: handler error', err);
        this.emit('error', err as Error);
      });
    });
  }

  private async handleIncoming(event: IncomingMessageEvent): Promise<void> {
    if (event.fromMe) return;
    if (!this.enabled) return;
    if (this.sessionId == null) return;

    const target = getActiveTarget(this.sessionId);
    if (!target) return;
    if (event.jid !== target.contactJid) return;

    // Single-flight per contact to avoid overlapping LLM calls.
    if (this.inflightJids.has(event.jid)) {
      logger.debug('message-router: already replying to %s, skipping', event.jid);
      return;
    }
    this.inflightJids.add(event.jid);

    try {
      const inboundEntry = logConversation(this.sessionId, 'in', event.text, false);
      this.emit('log', inboundEntry);

      const profile = getStyleProfile(this.sessionId);
      if (!profile) {
        logger.warn('message-router: no style profile yet, skipping reply');
        return;
      }

      const history = recentConversation(this.sessionId, config.CONTEXT_WINDOW)
        .slice()
        .reverse()
        .map((entry) => ({
          role: entry.direction === 'in' ? ('user' as const) : ('assistant' as const),
          content: entry.content,
        }));

      const replies = await generateReply({
        contactName: target.contactName,
        styleProfile: profile,
        history,
      });

      if (replies.length === 0) {
        logger.warn('message-router: model returned empty reply');
        return;
      }

      for (const reply of replies) {
        const delay = randomInt(config.REPLY_DELAY_MIN, config.REPLY_DELAY_MAX);
        await whatsappClient.sendPresenceTyping(target.contactJid);
        await sleep(delay);
        await whatsappClient.sendText(target.contactJid, reply);
        await whatsappClient.sendPresencePaused(target.contactJid);

        const outEntry = logConversation(this.sessionId, 'out', reply, true);
        this.emit('log', outEntry);
      }
    } finally {
      this.inflightJids.delete(event.jid);
    }
  }
}

export const messageRouter = new MessageRouter();
