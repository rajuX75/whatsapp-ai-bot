import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WaConnectionStatus } from '../types';

type QrWsMessage =
  | { type: 'qr'; qr: string }
  | { type: 'status'; status: WaConnectionStatus };

const statusConfig: Record<WaConnectionStatus, { label: string; color: string; dot: string }> = {
  disconnected: { label: 'Disconnected', color: '#ef4444', dot: 'error' },
  connecting:   { label: 'Connecting…', color: '#f59e0b', dot: 'warning' },
  qr:           { label: 'Scan QR Code', color: '#3B82F6', dot: 'warning' },
  connected:    { label: 'Connected', color: '#25D366', dot: 'online' },
  logged_out:   { label: 'Logged Out', color: '#8b949e', dot: 'offline' },
};

export default function QrLoginPage() {
  const [status, setStatus] = useState<WaConnectionStatus>('disconnected');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const { lastMessage } = useWebSocket<QrWsMessage>('/ws/qr');

  useEffect(() => {
    api.authStatus().then((s) => setStatus(s.status)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'status') setStatus(lastMessage.status);
    if (lastMessage.type === 'qr') {
      api.authQr().then((r) => setQrDataUrl(r.dataUrl)).catch(() => undefined);
    }
  }, [lastMessage]);

  const handleLogout = async () => {
    await api.authLogout();
    setStatus('logged_out');
    setQrDataUrl(null);
  };

  const cfg = statusConfig[status];

  return (
    <div className="animate-fade-in" style={{ maxWidth: 560 }}>
      {/* Header */}
      <div className="page-header">
        <h2>Connect WhatsApp</h2>
        <p>Link your WhatsApp account to enable AI-powered auto-replies.</p>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 10, marginBottom: 24,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
      }}>
        <span className={`status-dot ${cfg.dot}`} />
        <span style={{ fontSize: 13, fontWeight: 500, color: cfg.color }}>{cfg.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>
          ws://{typeof window !== 'undefined' ? window.location.host : ''}/ws/qr
        </span>
      </div>

      {/* QR code state */}
      {status === 'qr' && qrDataUrl && (
        <div className="glass animate-fade-in" style={{ borderRadius: 16, padding: 28, textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', padding: 16, borderRadius: 12,
            background: '#fff', boxShadow: '0 0 40px rgba(37,211,102,0.15)',
            marginBottom: 20,
          }}>
            <img src={qrDataUrl} alt="WhatsApp QR Code" style={{ width: 220, height: 220, display: 'block' }} />
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Open WhatsApp on your phone
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            {['Tap Menu (⋮) or Settings', 'Tap Linked Devices', 'Tap Link a Device', 'Point your phone at the QR code'].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', background: 'rgba(37,211,102,0.15)',
                  color: 'var(--accent-green)', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{i + 1}</span>
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected state */}
      {status === 'connected' && (
        <div className="animate-fade-in" style={{
          padding: '24px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(37,211,102,0.06)',
          border: '1px solid rgba(37,211,102,0.2)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #25D366, #075E54)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 24px rgba(37,211,102,0.3)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            WhatsApp Connected
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Your account is linked. The bot is ready to use.
          </div>
          <button type="button" onClick={handleLogout} className="btn-danger">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Disconnect Account
          </button>
        </div>
      )}

      {/* Waiting / disconnected state */}
      {(status === 'disconnected' || status === 'logged_out' || status === 'connecting') && (
        <div className="glass animate-fade-in" style={{ borderRadius: 16, padding: 28, textAlign: 'center' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px',
              border: '2px solid rgba(59,130,246,0.3)',
              borderTopColor: 'var(--accent-blue)',
              animation: 'spin-slow 1.2s linear infinite',
            }} />
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Waiting for QR code from backend…
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            If nothing appears in 10 seconds, restart the backend server.
          </div>
        </div>
      )}
    </div>
  );
}
