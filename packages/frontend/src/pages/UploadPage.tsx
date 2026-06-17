import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { BotTarget, StyleProfile } from '../types';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; profile: StyleProfile; contactJid?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targets, setTargets] = useState<BotTarget[]>([]);
  const [selectedJid, setSelectedJid] = useState<string>('');

  useEffect(() => {
    api.listTargets()
      .then((r) => {
        setTargets(r.targets);
        if (r.targets.length && !selectedJid) setSelectedJid(r.targets[0]!.contactJid);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.uploadChat(file, selectedJid || undefined);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const selectedTarget = targets.find((t) => t.contactJid === selectedJid);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 700 }}>
      {/* Header */}
      <div className="page-header">
        <h2>Train the AI</h2>
        <p>Upload a WhatsApp chat export so the AI can learn the style. Each contact has its own dedicated style profile.</p>
      </div>

      {/* Contact selector */}
      <div className="glass" style={{ padding: 20, borderRadius: 12, marginBottom: 16 }}>
        <label style={{ display: 'block' }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6,
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            Assign this chat export to
          </div>
          <select
            className="input"
            value={selectedJid}
            onChange={(e) => setSelectedJid(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">— Use the currently active target —</option>
            {targets.map((t) => (
              <option key={t.contactJid} value={t.contactJid}>
                {t.contactName} {t.enabled ? '· auto-reply ON' : ''}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {selectedTarget
              ? `Style profile will be saved to "${selectedTarget.contactName}" only.`
              : 'No specific contact selected — the upload will use the legacy active target.'}
          </div>
        </label>
      </div>

      {/* Instructions */}
      <div className="glass" style={{ padding: 20, borderRadius: 12, marginBottom: 16, fontSize: 13 }}>
        <strong style={{ color: 'var(--text-primary)' }}>How to export from WhatsApp</strong>
        <ol style={{ margin: '8px 0 0', paddingLeft: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <li>Open the chat with the contact you selected above</li>
          <li>Tap <strong>⋮</strong> → <strong>More</strong> → <strong>Export chat</strong></li>
          <li>Choose <strong>Without media</strong></li>
          <li>Upload the <code>.zip</code> or <code>.txt</code> here</li>
        </ol>
      </div>

      <form onSubmit={onSubmit}>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent-blue)' : 'var(--border)'}`,
            background: isDragging ? 'rgba(59,130,246,0.05)' : 'var(--bg-card)',
            borderRadius: 16, padding: 36, textAlign: 'center',
            transition: 'all 200ms ease', marginBottom: 16,
            cursor: 'pointer', position: 'relative',
          }}
        >
          <input
            type="file"
            accept=".zip,.txt,text/plain,application/zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              opacity: 0, cursor: 'pointer',
            }}
          />
          <div style={{ fontSize: 16, fontWeight: 600, color: file ? 'var(--accent-green)' : 'var(--text-primary)' }}>
            {file ? file.name : 'Click or drag file to upload'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports .txt and .zip exports'}
          </div>
        </div>

        <button
          type="submit"
          disabled={!file || busy}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
        >
          {busy
            ? 'Parsing & modelling…'
            : selectedTarget
              ? `Train AI for "${selectedTarget.contactName}"`
              : 'Train AI (active target)'}
        </button>
      </form>

      {error && (
        <div className="alert-error animate-fade-in" style={{ marginTop: 16 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="animate-slide-in" style={{
          marginTop: 24, padding: 20, borderRadius: 12,
          background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)'
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-green)', marginBottom: 8 }}>
            ✓ Training complete
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Parsed <strong>{result.inserted}</strong> messages.
            {result.contactJid ? ` Style profile bound to ${result.contactJid}.` : ''}
            <br />
            Language: <strong>{result.profile.language}</strong> · avg length{' '}
            <strong>{result.profile.avgMsgLength.toFixed(1)}</strong> chars · burst{' '}
            <strong>{result.profile.burstPattern}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
