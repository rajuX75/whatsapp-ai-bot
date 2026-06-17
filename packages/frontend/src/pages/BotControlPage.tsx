import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { BotTarget } from '../types';

export default function BotControlPage() {
  const [enabled, setEnabled] = useState(false);
  const [targets, setTargets] = useState<BotTarget[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [s, t] = await Promise.all([
      api.botStatus().catch(() => ({ enabled: false })),
      api.listTargets().catch(() => ({ targets: [] })),
    ]);
    setEnabled(s.enabled);
    setTargets(t.targets);
  };

  useEffect(() => {
    refresh();
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

  const enabledTargets = targets.filter((t) => t.enabled);
  const canEnable = enabledTargets.length > 0;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h2>Bot Control</h2>
        <p>
          Global master switch for the autonomous AI responder. Per-contact toggles live in the{' '}
          <Link to="/contacts" style={{ color: 'var(--accent-blue)' }}>Contacts</Link> page.
        </p>
      </div>

      {/* Target summary */}
      <div className="glass" style={{ padding: 20, borderRadius: 12, marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12, gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Target summary
          </div>
          <Link to="/contacts" className="btn-ghost" style={{
            padding: '6px 12px', fontSize: 12, textDecoration: 'none',
          }}>
            Manage contacts →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <Stat label="Total targets" value={targets.length} />
          <Stat label="Auto-reply ON" value={enabledTargets.length} highlight={canEnable} />
          <Stat label="With custom prompt" value={targets.filter((t) => t.customPrompt).length} />
        </div>

        {enabledTargets.length > 0 && (
          <div style={{
            marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)',
            display: 'flex', gap: 6, flexWrap: 'wrap',
          }}>
            {enabledTargets.slice(0, 8).map((t) => (
              <span key={t.contactJid} style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 99,
                background: 'rgba(37,211,102,0.12)', color: 'var(--accent-green)',
                border: '1px solid rgba(37,211,102,0.25)',
              }}>
                {t.contactName}{t.customPrompt ? ' ✨' : ''}
              </span>
            ))}
            {enabledTargets.length > 8 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                +{enabledTargets.length - 8} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main switch */}
      <div style={{
        padding: 28, borderRadius: 16,
        background: enabled ? 'rgba(37,211,102,0.08)' : 'var(--bg-card)',
        border: `1px solid ${enabled ? 'rgba(37,211,102,0.3)' : 'var(--border)'}`,
        boxShadow: enabled ? '0 0 40px rgba(37,211,102,0.1)' : 'none',
        transition: 'all 300ms ease',
        textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
          background: enabled ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
          color: enabled ? '#000' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: enabled ? '0 0 30px var(--accent-green-glow)' : 'none',
          transition: 'all 300ms ease',
          fontSize: 32,
        }}>
          {enabled ? '⚡' : '⏸'}
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          Auto-Responder is{' '}
          {enabled
            ? <span style={{ color: 'var(--accent-green)' }}>ON</span>
            : <span style={{ color: 'var(--text-muted)' }}>OFF</span>}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
          {enabled
            ? `Replying autonomously to ${enabledTargets.length} enabled contact${enabledTargets.length === 1 ? '' : 's'}.`
            : 'The AI is paused globally. Per-contact toggles are ignored until you enable the master switch.'}
        </p>

        <button
          onClick={toggle}
          disabled={busy || (!enabled && !canEnable)}
          className={enabled ? 'btn-danger' : 'btn-primary'}
          style={{ minWidth: 220, justifyContent: 'center', padding: '12px', fontSize: 14 }}
        >
          {busy
            ? 'Working…'
            : enabled
              ? 'Disable globally'
              : 'Enable globally'}
        </button>

        {!canEnable && !enabled && (
          <div className="alert-warning" style={{ marginTop: 16, textAlign: 'left', fontSize: 12 }}>
            Add at least one enabled target on the Contacts page before turning the bot on.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 700,
        color: highlight ? 'var(--accent-green)' : 'var(--text-primary)',
      }}>
        {value}
      </div>
    </div>
  );
}
