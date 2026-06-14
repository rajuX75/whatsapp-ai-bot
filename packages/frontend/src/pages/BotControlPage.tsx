import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ActiveTarget } from '../types';

export default function BotControlPage() {
  const [enabled, setEnabled] = useState(false);
  const [target, setTarget] = useState<ActiveTarget | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.botStatus().then((r) => setEnabled(r.enabled)).catch(() => undefined);
    api.activeContact().then((r) => setTarget(r.target)).catch(() => undefined);
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      const r = await api.botToggle(!enabled);
      setEnabled(r.enabled);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 560 }}>
      {/* Header */}
      <div className="page-header">
        <h2>Bot Control</h2>
        <p>Enable or disable the autonomous AI responder.</p>
      </div>

      {/* Target Info */}
      <div className="glass" style={{
        padding: '20px 24px', borderRadius: 12, marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>
            Current Target
          </div>
          {target ? (
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              {target.contactName}
              <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 400, fontFamily: 'Fira Code, monospace' }}>
                {target.contactJid}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 15, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              No contact selected
            </div>
          )}
        </div>
      </div>

      {/* Main Control Panel */}
      <div style={{
        padding: 32, borderRadius: 16,
        background: enabled ? 'rgba(37,211,102,0.08)' : 'var(--bg-card)',
        border: '1px solid',
        borderColor: enabled ? 'rgba(37,211,102,0.3)' : 'var(--border)',
        boxShadow: enabled ? '0 0 40px rgba(37,211,102,0.1)' : 'none',
        transition: 'all 300ms ease',
        textAlign: 'center',
      }}>
        {/* Big icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
          background: enabled ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
          color: enabled ? '#000' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: enabled ? '0 0 30px var(--accent-green-glow)' : 'none',
          transition: 'all 300ms ease',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            <line x1="8" y1="16" x2="8.01" y2="16" strokeWidth="3"/>
            <line x1="16" y1="16" x2="16.01" y2="16" strokeWidth="3"/>
          </svg>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Auto-Responder is {enabled ? <span style={{ color: 'var(--accent-green)' }}>ON</span> : <span style={{ color: 'var(--text-muted)' }}>OFF</span>}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
          {enabled 
            ? 'The AI is actively reading incoming messages and responding autonomously.' 
            : 'The AI is currently paused. Messages will be ignored until enabled.'}
        </p>

        <button
          onClick={toggle}
          disabled={busy || !target}
          className={enabled ? 'btn-danger' : 'btn-primary'}
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}
        >
          {busy ? (
            <svg className="animate-spin-slow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
            </svg>
          ) : enabled ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
              Disable Auto-Responder
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Enable Auto-Responder
            </>
          )}
        </button>

        {!target && (
          <div className="alert-warning" style={{ marginTop: 20, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            You must select a target contact before enabling the bot.
          </div>
        )}
      </div>
    </div>
  );
}
