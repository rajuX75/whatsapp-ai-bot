export default function SettingsPage() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div className="page-header">
        <h2>System Settings</h2>
        <p>Configure LLM providers and bot behavior via environment variables.</p>
      </div>

      <div className="glass" style={{ padding: 32, borderRadius: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"/>
          </svg>
          .env Configuration
        </h3>
        
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
          The backend configuration is loaded from the <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-primary)' }}>.env</code> file in the backend package directory. 
          Restart the backend server after making changes.
        </p>

        <div style={{ display: 'grid', gap: 16 }}>
          <EnvVar
            name="LLM_PROVIDER"
            values={['anthropic', 'openai', 'ollama', 'openrouter', 'gemini']}
            desc="Select which AI engine to use for generating responses."
          />
          <EnvVar
            name="ANTHROPIC_API_KEY"
            desc="Required if using Anthropic. Get this from console.anthropic.com."
          />
          <EnvVar
            name="OPENAI_API_KEY"
            desc="Required if using OpenAI. Get this from platform.openai.com."
          />
          <EnvVar
            name="OPENROUTER_API_KEY"
            name2="OPENROUTER_MODEL"
            desc="Required if using OpenRouter. e.g. openai/gpt-4o, anthropic/claude-3.5-sonnet."
          />
          <EnvVar
            name="GEMINI_API_KEY"
            name2="GEMINI_MODEL"
            desc="Required if using Gemini. e.g. gemini-1.5-pro, gemini-2.0-flash."
          />
          <EnvVar
            name="OLLAMA_BASE_URL"
            name2="OLLAMA_MODEL"
            desc="For local models. Base URL is typically http://127.0.0.1:11434."
          />
          <EnvVar
            name="REPLY_DELAY_MIN"
            name2="REPLY_DELAY_MAX"
            desc="Human-like typing delay in milliseconds (Anti-ban)."
          />
          <EnvVar
            name="CONTEXT_WINDOW"
            desc="Number of recent messages to include as conversational context."
          />
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: '16px 20px', borderRadius: 12,
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        display: 'flex', gap: 16, alignItems: 'flex-start',
      }}>
        <div style={{ color: 'var(--warning)', marginTop: 2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--warning)', marginBottom: 4 }}>
            Important Disclaimer
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Use this software responsibly. Impersonating real people without their explicit consent
            may break laws in your jurisdiction and violates WhatsApp's Terms of Service.
          </div>
        </div>
      </div>
    </div>
  );
}

function EnvVar({ name, name2, values, desc }: { name: string; name2?: string; values?: string[]; desc: string }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 8,
      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <code style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 600 }}>{name}</code>
        {name2 && <code style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 600 }}>{name2}</code>}
        {values && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {values.map(v => (
              <span key={v} style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 99, color: 'var(--text-muted)' }}>
                {v}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</div>
    </div>
  );
}
