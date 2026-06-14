import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ActiveTarget, WaContactSummary } from '../types';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<WaContactSummary[]>([]);
  const [target, setTarget] = useState<ActiveTarget | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [{ contacts }, { target }] = await Promise.all([
        api.listContacts(),
        api.activeContact(),
      ]);
      setContacts(contacts);
      setTarget(target);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const pick = async (c: WaContactSummary) => {
    const { target } = await api.selectContact(c.jid, c.name);
    setTarget(target);
  };

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: 640 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Target Contact</h2>
          <p>Select the contact the AI bot will auto-reply to.</p>
        </div>
        <button
          onClick={refresh}
          className="btn-ghost"
          style={{ padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin-slow' : ''}>
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Active Target Banner */}
      {target && (
        <div className="animate-slide-in" style={{
          padding: '16px 20px', borderRadius: 12, marginBottom: 24,
          background: 'rgba(37,211,102,0.06)',
          border: '1px solid rgba(37,211,102,0.2)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--accent-green)', color: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(37,211,102,0.3)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-green)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Active Target
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {target.contactName}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>
            {target.contactJid}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter contacts…"
          className="input"
          style={{ paddingLeft: 40, paddingRight: 14, paddingTop: 12, paddingBottom: 12 }}
        />
      </div>

      {/* Contact List */}
      <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
        {loading && contacts.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div className="skeleton" style={{ height: 48, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 48, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 48 }} />
          </div>
        )}
        
        {filtered.map((c, i) => {
          const isActive = target?.contactJid === c.jid;
          return (
            <button
              key={c.jid}
              type="button"
              onClick={() => pick(c)}
              className="glass-hover"
              style={{
                display: 'flex', alignItems: 'center', width: '100%',
                padding: '16px 20px', textAlign: 'left',
                border: 'none', borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--border)',
                background: isActive ? 'var(--bg-card-hover)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)', marginRight: 16,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace', marginTop: 2 }}>
                  {c.jid}
                </div>
              </div>
              {isActive && (
                <div style={{ color: 'var(--accent-green)', paddingLeft: 12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
        
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
            <div style={{ marginBottom: 12, opacity: 0.5 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            {query ? 'No contacts match your search.' : 'No contacts yet. Send/receive a message on WhatsApp to populate this list.'}
          </div>
        )}
      </div>
    </div>
  );
}
