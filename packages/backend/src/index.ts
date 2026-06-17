import http from 'node:http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { migrate } from './db/schema.js';
import { getOrCreateSession } from './db/repository.js';
import { whatsappClient } from './modules/whatsapp-client.js';
import { messageRouter } from './modules/message-router.js';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import uploadRoutes from './routes/upload.js';
import styleRoutes from './routes/style.js';
import botRoutes from './routes/bot.js';
import settingsRoutes from './routes/settings.js';

async function main(): Promise<void> {
  migrate();
  const sessionId = getOrCreateSession(null);
  messageRouter.bindSession(sessionId);
  messageRouter.attach();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/contacts', contactRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/style-profile', styleRoutes);
  app.use('/api/bot', botRoutes);
  app.use('/api/settings', settingsRoutes);

  const server = http.createServer(app);

  // ---------- WebSocket: QR ----------
  const qrWss = new WebSocketServer({ noServer: true });
  qrWss.on('connection', (ws) => {
    const qr = whatsappClient.getLatestQr();
    if (qr) ws.send(JSON.stringify({ type: 'qr', qr }));
    ws.send(JSON.stringify({ type: 'status', status: whatsappClient.getStatus() }));
  });

  const broadcast = (wss: WebSocketServer, payload: unknown): void => {
    const data = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  };

  whatsappClient.on('qr', (qr) => broadcast(qrWss, { type: 'qr', qr }));
  whatsappClient.on('status', (status) => broadcast(qrWss, { type: 'status', status }));

  // ---------- WebSocket: messages ----------
  const msgWss = new WebSocketServer({ noServer: true });
  messageRouter.on('log', (entry) => broadcast(msgWss, { type: 'log', entry }));
  messageRouter.on('error', (err) =>
    broadcast(msgWss, { type: 'error', message: err.message }),
  );

  server.on('upgrade', (req, socket, head) => {
    const { url } = req;
    if (!url) {
      socket.destroy();
      return;
    }
    if (url.startsWith('/ws/qr')) {
      qrWss.handleUpgrade(req, socket, head, (ws) => qrWss.emit('connection', ws, req));
    } else if (url.startsWith('/ws/messages')) {
      msgWss.handleUpgrade(req, socket, head, (ws) => msgWss.emit('connection', ws, req));
    } else {
      socket.destroy();
    }
  });

  server.listen(config.PORT, () => {
    logger.info(`HTTP+WS server listening on http://localhost:${config.PORT}`);
  });

  whatsappClient.connect().catch((err) => logger.error('whatsapp connect failed', err));
}

main().catch((err) => {
  logger.error('fatal startup error', err);
  process.exit(1);
});
