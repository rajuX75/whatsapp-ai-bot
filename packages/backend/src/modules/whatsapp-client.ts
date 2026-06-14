import { EventEmitter } from 'node:events';
import { mkdirSync } from 'node:fs';
import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
  type proto,
} from '@whiskeysockets/baileys';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { WaConnectionStatus, WaContactSummary } from '../types/index.js';

mkdirSync(config.AUTH_DIR, { recursive: true });

export interface IncomingMessageEvent {
  jid: string;
  pushName: string;
  text: string;
  timestamp: number;
  fromMe: boolean;
}

export type WaEvents = {
  qr: [qr: string];
  status: [status: WaConnectionStatus];
  message: [event: IncomingMessageEvent];
  contactsUpdated: [];
};

export class WhatsAppClient extends EventEmitter<WaEvents> {
  private sock: WASocket | null = null;
  private status: WaConnectionStatus = 'disconnected';
  private latestQr: string | null = null;
  private readonly contacts = new Map<string, WaContactSummary>();

  getStatus(): WaConnectionStatus {
    return this.status;
  }

  getLatestQr(): string | null {
    return this.latestQr;
  }

  listContacts(): WaContactSummary[] {
    return [...this.contacts.values()]
      .filter((c) => !c.jid.endsWith('@g.us')) // skip groups
      .sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
  }

  private setStatus(s: WaConnectionStatus): void {
    this.status = s;
    this.emit('status', s);
  }

  async connect(): Promise<void> {
    if (this.sock) return;
    this.setStatus('connecting');

    const { state, saveCreds } = await useMultiFileAuthState(config.AUTH_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    logger.info('whatsapp-client: using WA Web v%s (isLatest=%s)', version.join('.'), isLatest);

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['WA-AI-Bot', 'Chrome', '124.0.0'],
    });
    this.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        this.latestQr = qr;
        this.setStatus('qr');
        this.emit('qr', qr);
      }
      if (connection === 'open') {
        this.latestQr = null;
        this.setStatus('connected');
        logger.info('whatsapp-client: connected');
      } else if (connection === 'close') {
        const code = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        logger.warn('whatsapp-client: connection closed (code=%s, loggedOut=%s)', code, loggedOut);
        this.sock = null;
        if (loggedOut) {
          this.setStatus('logged_out');
        } else {
          this.setStatus('disconnected');
          setTimeout(() => {
            this.connect().catch((err) => logger.error('reconnect failed', err));
          }, 2000);
        }
      }
    });

    sock.ev.on('contacts.upsert', (contacts) => {
      for (const c of contacts) {
        if (!c.id) continue;
        this.contacts.set(c.id, {
          jid: c.id,
          name: c.name ?? c.notify ?? c.id.split('@')[0]!,
        });
      }
      this.emit('contactsUpdated');
    });

    sock.ev.on('chats.upsert', (chats) => {
      for (const chat of chats) {
        if (!chat.id) continue;
        const existing = this.contacts.get(chat.id);
        this.contacts.set(chat.id, {
          jid: chat.id,
          name: existing?.name ?? chat.name ?? chat.id.split('@')[0]!,
          lastMessageAt: typeof chat.conversationTimestamp === 'number'
            ? chat.conversationTimestamp * 1000
            : existing?.lastMessageAt,
        });
      }
      this.emit('contactsUpdated');
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const m of messages) {
        const event = this.toIncomingEvent(m);
        if (event) {
          // Track contacts on the fly
          const existing = this.contacts.get(event.jid);
          this.contacts.set(event.jid, {
            jid: event.jid,
            name: existing?.name ?? event.pushName ?? event.jid.split('@')[0]!,
            lastMessageAt: event.timestamp,
          });
          this.emit('message', event);
        }
      }
    });
  }

  private toIncomingEvent(m: proto.IWebMessageInfo): IncomingMessageEvent | null {
    const jid = m.key.remoteJid;
    if (!jid) return null;
    if (jid === 'status@broadcast') return null;
    const message = m.message;
    if (!message) return null;

    const text =
      message.conversation ??
      message.extendedTextMessage?.text ??
      message.imageMessage?.caption ??
      message.videoMessage?.caption ??
      '';
    if (!text) return null;

    return {
      jid,
      pushName: m.pushName ?? jid.split('@')[0]!,
      text,
      timestamp: (typeof m.messageTimestamp === 'number'
        ? m.messageTimestamp
        : Number(m.messageTimestamp ?? 0)) * 1000,
      fromMe: Boolean(m.key.fromMe),
    };
  }

  async sendPresenceTyping(jid: string): Promise<void> {
    if (!this.sock) throw new Error('WhatsApp socket not connected');
    await this.sock.presenceSubscribe(jid);
    await this.sock.sendPresenceUpdate('composing', jid);
  }

  async sendPresencePaused(jid: string): Promise<void> {
    if (!this.sock) return;
    await this.sock.sendPresenceUpdate('paused', jid);
  }

  async sendText(jid: string, text: string): Promise<void> {
    if (!this.sock) throw new Error('WhatsApp socket not connected');
    await this.sock.sendMessage(jid, { text });
  }

  async logout(): Promise<void> {
    if (!this.sock) return;
    try {
      await this.sock.logout();
    } catch (err) {
      logger.error('whatsapp-client: logout error', err);
    } finally {
      this.sock = null;
      this.setStatus('logged_out');
    }
  }
}

export const whatsappClient = new WhatsAppClient();
