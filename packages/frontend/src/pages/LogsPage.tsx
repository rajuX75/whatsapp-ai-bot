import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import type { ConversationLogEntry } from '../types';

type LogWsMessage =
  | { type: 'log'; entry: ConversationLogEntry }
  | { type: 'error'; message: string };

export default function LogsPage() {
  const [logs, setLogs] = useState<ConversationLogEntry[]>([]);
  const { lastMessage, connected } = useWebSocket<LogWsMessage>('/ws/messages');

  useEffect(() => {
    api.logs(200).then((r) => setLogs(r.logs.slice().reverse())).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'log') {
      setLogs((prev) => [...prev, lastMessage.entry].slice(-500));
    }
  }, [lastMessage]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2>Live Message Log</h2>
          <p>Real-time stream of incoming and outgoing bot messages.</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 99,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)'
        }}>
          <span className={`status-dot ${connected ? 'online' : 'error'}`} />
          {connected ? 'Streaming' : 'Disconnected'}
        </div>
      </div>

      {/* Terminal View */}
      <div className="glass" style={{
        flex: 1, borderRadius: 12, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minHeight: 400,
      }}>
        {/* Terminal Header */}
        <div style={{
          padding: '10px 16px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 6,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {logs.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace', fontSize: 13 }}>
              &gt; Waiting for messages..._
            </div>
          )}
          
          {logs.map((entry) => {
            const isIn = entry.direction === 'in';
            const isBot = entry.aiGenerated;
            
            return (
              <div
                key={entry.id}
                className="animate-slide-in"
                style={{
                  alignSelf: isIn ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                  justifyContent: isIn ? 'flex-start' : 'flex-end',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
                  color: isIn ? 'var(--text-muted)' : (isBot ? 'var(--accent-purple)' : 'var(--accent-blue)'),
                }}>
                  {isIn ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      USER IN
                    </>
                  ) : (
                    <>
                      {isBot ? 'AI BOT OUT' : 'MANUAL OUT'}
                      {isBot ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 2L11 13"/>
                          <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                        </svg>
                      )}
                    </>
                  )}
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span style={{ opacity: 0.7, fontFamily: 'Fira Code, monospace', letterSpacing: 0 }}>
                    {new Date(entry.sentAt).toLocaleTimeString()}
                  </span>
                </div>
                
                <div style={{
                  padding: '12px 16px', borderRadius: 12, fontSize: 14, lineHeight: 1.5,
                  borderBottomLeftRadius: isIn ? 4 : 12,
                  borderBottomRightRadius: !isIn ? 4 : 12,
                  background: isIn ? 'var(--bg-card-hover)' : (isBot ? 'rgba(168,85,247,0.15)' : 'rgba(59,130,246,0.15)'),
                  border: '1px solid',
                  borderColor: isIn ? 'var(--border)' : (isBot ? 'rgba(168,85,247,0.3)' : 'rgba(59,130,246,0.3)'),
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  boxShadow: !isIn ? `0 4px 12px ${isBot ? 'rgba(168,85,247,0.05)' : 'rgba(59,130,246,0.05)'}` : 'none',
                }}>
                  {entry.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
