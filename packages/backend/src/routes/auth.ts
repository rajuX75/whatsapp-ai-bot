import { Router } from 'express';
import QRCode from 'qrcode';
import { whatsappClient } from '../modules/whatsapp-client.js';

const router = Router();

router.get('/qr', async (_req, res) => {
  const qr = whatsappClient.getLatestQr();
  if (!qr) {
    res.status(404).json({ error: 'No QR available' });
    return;
  }
  const dataUrl = await QRCode.toDataURL(qr);
  res.json({ qr, dataUrl });
});

router.get('/status', (_req, res) => {
  res.json({ status: whatsappClient.getStatus() });
});

router.post('/logout', async (_req, res) => {
  await whatsappClient.logout();
  res.json({ ok: true });
});

export default router;
