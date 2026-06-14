import { useState } from 'react';
import { api } from '../lib/api';
import type { StyleProfile } from '../types';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; profile: StyleProfile } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.uploadChat(file);
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

  return (
    <div className="animate-fade-in" style={{ maxWidth: 640 }}>
      {/* Header */}
      <div className="page-header">
        <h2>Train the AI</h2>
        <p>Upload your WhatsApp chat history so the AI can learn your vocabulary, emojis, and texting habits.</p>
      </div>

      {/* Instructions */}
      <div className="glass" style={{
        padding: 24, borderRadius: 12, marginBottom: 24,
        display: 'flex', gap: 20, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>How to export</h3>
          <ol style={{ margin: 0, paddingLeft: 16, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <li>Open WhatsApp on your phone</li>
            <li>Go to any chat with a lot of messages</li>
            <li>Tap <strong>⋮</strong> (Menu) → <strong>More</strong> → <strong>Export chat</strong></li>
            <li>Select <strong>Without media</strong></li>
            <li>Upload the <code style={{ color: 'var(--text-primary)', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>.zip</code> or <code style={{ color: 'var(--text-primary)', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>.txt</code> here</li>
          </ol>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent-blue)' : 'var(--border)'}`,
            background: isDragging ? 'rgba(59,130,246,0.05)' : 'var(--bg-card)',
            borderRadius: 16, padding: 40, textAlign: 'center',
            transition: 'all 200ms ease', marginBottom: 24,
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
          <div style={{ color: file ? 'var(--accent-green)' : 'var(--text-muted)', marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
              {file ? (
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"/>
              ) : (
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12"/>
              )}
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: file ? 'var(--accent-green)' : 'var(--text-primary)' }}>
            {file ? file.name : 'Click or drag file to upload'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports .txt and .zip files'}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!file || busy}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}
        >
          {busy ? (
            <>
              <svg className="animate-spin-slow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                <line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
              </svg>
              Parsing & Modeling...
            </>
          ) : (
            'Train AI Model'
          )}
        </button>
      </form>

      {error && (
        <div className="alert-error animate-fade-in" style={{ marginTop: 24 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="animate-slide-in" style={{
          marginTop: 32, padding: 24, borderRadius: 12,
          background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-green)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-green)' }}>
              Training Complete
            </div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Successfully parsed <strong>{result.inserted}</strong> messages into the vector database.
            The AI has built a new stylistic profile based on this data.
          </p>
        </div>
      )}
    </div>
  );
}
