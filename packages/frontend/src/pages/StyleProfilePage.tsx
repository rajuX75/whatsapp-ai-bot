import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { StyleProfile } from '../types';

export default function StyleProfilePage() {
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .styleProfile()
      .then((r) => setProfile(r.profile))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="animate-fade-in alert-error" style={{ maxWidth: 600 }}>
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h2>Style Fingerprint</h2>
          <p>Analyzing AI mimicry parameters...</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div className="page-header">
        <h2>Style Fingerprint</h2>
        <p>The AI uses these extracted traits to perfectly mimic your conversational style.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        <Stat label="Primary Language" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}>
          {profile.language}
        </Stat>

        <Stat label="Avg Message Length" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>}>
          <span style={{ fontSize: 24 }}>{profile.avgMsgLength.toFixed(1)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 6 }}>chars</span>
        </Stat>

        <Stat label="Emoji Density" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>}>
          <span style={{ fontSize: 24 }}>{(profile.emojiRatio * 100).toFixed(1)}%</span>
        </Stat>

        <Stat label="Capitalization Style" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>}>
          {profile.capitalization}
        </Stat>

        <Stat label="Burst Pattern" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}>
          <div style={{ textTransform: 'capitalize' }}>{profile.burstPattern}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>avg {profile.avgBurstCount} msgs</div>
        </Stat>

        <Stat label="Active Hours (24h)" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}>
          <div style={{ fontFamily: 'Fira Code, monospace', fontSize: 13 }}>
            {profile.activeHours.length ? profile.activeHours.join(', ') : '—'}
          </div>
        </Stat>

        <div style={{ gridColumn: '1 / -1' }}>
          <Stat label="Top Emojis" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}>
            <div style={{ fontSize: 32, letterSpacing: '4px' }}>
              {profile.topEmojis.length ? profile.topEmojis.join('') : '—'}
            </div>
          </Stat>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <Stat label="Top Catchphrases" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {profile.topPhrases.map((p) => (
                <div key={p} style={{
                  padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                  fontSize: 14, color: 'var(--text-primary)',
                }}>
                  "{p}"
                </div>
              ))}
              {profile.topPhrases.length === 0 && <span style={{ color: 'var(--text-muted)' }}>—</span>}
            </div>
          </Stat>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="stat-card glass-hover">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ color: 'var(--accent-blue)' }}>{icon}</div>
        <div className="label" style={{ marginBottom: 0 }}>{label}</div>
      </div>
      <div className="value">{children}</div>
    </div>
  );
}
