import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { BotTarget, WaContactSummary } from '../types';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<WaContactSummary[]>([]);
  const [targets, setTargets] = useState<BotTarget[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [promptEditorJid, setPromptEditorJid] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [{ contacts }, { targets }] = await Promise.all([
        api.listContacts(),
        api.listTargets(),
      ]);
      setContacts(contacts);
      setTargets(targets);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const targetByJid = useMemo(() => {
    const map = new Map<string, BotTarget>();
    for (const t of targets) map.set(t.contactJid, t);
    return map;
  }, [targets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.jid.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  const addTarget = async (c: WaContactSummary) => {
    await api.addTarget(c.jid, { name: c.name, enabled: true });
    refresh();
  };

  const removeTarget = async (jid: string) => {
    await api.removeTarget(jid);
    refresh();
  };

  const toggle = async (jid: string, enabled: boolean) => {
    const updated = await api.toggleTarget(jid, enabled);
    setTargets(updated.targets);
  };

  const toggleAll = async (enabled: boolean) => {
    const updated = await api.toggleAllTargets(enabled);
    setTargets(updated.targets);
  };

  const openPrompt = (t: BotTarget) => {
    setPromptEditorJid(t.contactJid);
    setPromptDraft(t.customPrompt ?? '');
  };

  const savePrompt = async () => {
    if (!promptEditorJid) return;
    const updated = await api.updateTargetPrompt(
      promptEditorJid,
      promptDraft.trim() ? promptDraft : null,
    );
    setTargets(updated.targets);
    setPromptEditorJid(null);
  };

  const enabledCount = targets.filter((t) => t.enabled).length;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2>Bot Targets</h2>
          <p>
            Pick <strong>one or many</strong> contacts. Toggle auto-reply individually,
            or flip them all at once. Each contact can have its own custom prompt for a
            different response style.
          </p>
        </div>
        <button onClick={refresh} className="btn-ghost"
          style={{ padding: '8px 12px', fontSize: 13 }}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {err && (
        <div className="alert-error" style={{ marginBottom: 16 }}>{err}</div>
      )}

      {/* Targets section */}
      <div className="glass" style={{
        padding: 20, borderRadius: 14, marginBottom: 20,
        border: '1px solid rgba(37,211,102,0.25)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, marginBottom: 12, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Active Targets
              <span style={{
                fontSize: 11, marginLeft: 8, padding: '2px 8px', borderRadius: 99,
                background: 'rgba(37,211,102,0.15)', color: 'var(--accent-green)',
              }}>
                {enabledCount}/{targets.length} enabled
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              The bot will only reply to contacts whose toggle is ON.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => toggleAll(true)} className="btn-primary"
              disabled={!targets.length} style={{ padding: '6px 12px', fontSize: 12 }}>
              Enable all
            </button>
            <button onClick={() => toggleAll(false)} className="btn-ghost"
              disabled={!enabledCount} style={{ padding: '6px 12px', fontSize: 12 }}>
              Disable all
            </button>
          </div>
        </div>

        {targets.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
            No targets yet. Add a contact from the list below.
          </div>
        )}

        {targets.map((t) => (
          <div key={t.contactJid} className="glass-hover" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 10,
            background: t.enabled ? 'rgba(37,211,102,0.06)' : 'rgba(0,0,0,0.18)',
            border: `1px solid ${t.enabled ? 'rgba(37,211,102,0.2)' : 'var(--border)'}`,
            marginBottom: 8,
          }}>
            <Toggle value={t.enabled} onChange={(v) => toggle(t.contactJid, v)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 600,
                color: t.enabled ? 'var(--accent-green)' : 'var(--text-primary)',
              }}>
                {t.contactName}
              </div>
              <div style={{
                fontSize: 11, fontFamily: 'Fira Code, monospace',
                color: 'var(--text-muted)', marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {t.contactJid}
              </div>
              {t.customPrompt && (
                <div style={{
                  fontSize: 11, color: 'var(--accent-blue)', marginTop: 4,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  ✨ has custom prompt ({t.customPrompt.length} chars)
                </div>
              )}
            </div>
            <button onClick={() => openPrompt(t)} className="btn-ghost"
              style={{ padding: '6px 10px', fontSize: 12 }}>
              {t.customPrompt ? 'Edit prompt' : '+ Prompt'}
            </button>
            <button onClick={() => removeTarget(t.contactJid)} className="btn-danger"
              style={{ padding: '6px 10px', fontSize: 12 }}>
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts to add as targets…"
          className="input"
          style={{ paddingLeft: 14, paddingRight: 14, paddingTop: 12, paddingBottom: 12 }}
        />
      </div>

      {/* Contact pool */}
      <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          padding: '10px 14px', fontSize: 11, fontWeight: 600,
          color: 'var(--text-muted)', letterSpacing: '0.05em',
          textTransform: 'uppercase', borderBottom: '1px solid var(--border)',
        }}>
          Available Contacts ({filtered.length})
        </div>
        {loading && contacts.length === 0 && (
          <div style={{ padding: 16 }}>
            <div className="skeleton" style={{ height: 48, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 48 }} />
          </div>
        )}
        {filtered.map((c, i) => {
          const isTarget = targetByJid.has(c.jid);
          return (
            <div key={c.jid} className="glass-hover" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--border)',
              opacity: isTarget ? 0.5 : 1,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {c.name}
                </div>
                <div style={{
                  fontSize: 11, fontFamily: 'Fira Code, monospace',
                  color: 'var(--text-muted)', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.jid}
                </div>
              </div>
              {isTarget ? (
                <span style={{ fontSize: 11, color: 'var(--accent-green)' }}>✓ added</span>
              ) : (
                <button onClick={() => addTarget(c)} className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: 12 }}>
                  + Add target
                </button>
              )}
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {query ? 'No contacts match your search.' : 'No contacts yet. Send/receive a message on WhatsApp to populate this list.'}
          </div>
        )}
      </div>

      {/* Prompt editor modal */}
      {promptEditorJid && (
        <div
          onClick={() => setPromptEditorJid(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            backdropFilter: 'blur(4px)',
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 600, width: '100%', borderRadius: 16, padding: 24,
              background: '#0d1117', border: '1px solid var(--border)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Custom prompt for {targetByJid.get(promptEditorJid)?.contactName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              This text is appended to the system prompt for <strong>this contact only</strong>,
              overriding the global style. Use it to ask for a sarcastic tone, formal English,
              shorter replies, refusing certain topics, etc.
            </div>
            <textarea
              className="input"
              rows={8}
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              placeholder="e.g. Reply in formal English. Never use emojis. Refuse to discuss money or relationships."
              style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={() => { setPromptDraft(''); }} className="btn-ghost">
                Clear
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPromptEditorJid(null)} className="btn-ghost">Cancel</button>
                <button onClick={savePrompt} className="btn-primary">Save prompt</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        flexShrink: 0,
        width: 40, height: 22, borderRadius: 999,
        border: 'none', cursor: 'pointer',
        background: value ? 'var(--accent-green)' : 'rgba(255,255,255,0.15)',
        position: 'relative', transition: 'all 150ms ease',
      }}
      aria-pressed={value}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 20 : 2,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 150ms ease',
      }} />
    </button>
  );
}
