import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { RuntimeSettings } from '../types';

type Patch = Partial<RuntimeSettings>;

export default function SettingsPage() {
  const [settings, setSettings] = useState<RuntimeSettings | null>(null);
  const [dirty, setDirty] = useState<Patch>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    api.getSettings()
      .then((r) => setSettings(r.settings))
      .catch((e: Error) => setError(e.message));
  }, []);

  const set = <K extends keyof RuntimeSettings>(key: K, value: RuntimeSettings[K]) => {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
    setDirty((d) => ({ ...d, [key]: value }));
  };

  const save = async () => {
    if (!Object.keys(dirty).length) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.updateSettings(dirty);
      setSettings(r.settings);
      setDirty({});
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!confirm('Reset ALL runtime settings to their defaults?')) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.resetSettings();
      setSettings(r.settings);
      setDirty({});
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!settings) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h2>Settings</h2>
          <p>Loading runtime configuration…</p>
        </div>
        {error && <div className="alert-error">{error}</div>}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 60, marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  const s = settings;
  const isDirty = Object.keys(dirty).length > 0;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, paddingBottom: 100 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2>Bot Settings</h2>
          <p>
            All settings below are <strong>live</strong> &mdash; they take effect on the
            next incoming message without restarting the backend.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={reset} className="btn-ghost" disabled={busy}>Reset</button>
          <button
            onClick={save}
            disabled={!isDirty || busy}
            className="btn-primary"
            style={{ padding: '8px 16px' }}
          >
            {busy ? 'Saving…' : isDirty ? `Save (${Object.keys(dirty).length})` : 'Saved'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: 16 }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      {savedAt && !isDirty && (
        <div style={{
          padding: '10px 14px', marginBottom: 16, borderRadius: 8,
          background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)',
          fontSize: 13, color: 'var(--accent-green)',
        }}>
          ✓ Settings saved · {new Date(savedAt).toLocaleTimeString()}
        </div>
      )}

      {/* LLM */}
      <Section title="🧠 AI Model" desc="Provider, model name and core sampling controls.">
        <Field label="LLM Provider" hint="Which AI engine to call for replies.">
          <select className="input" value={s.llmProvider}
            onChange={(e) => set('llmProvider', e.target.value as RuntimeSettings['llmProvider'])}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
            <option value="ollama">Ollama (local)</option>
            <option value="openrouter">OpenRouter</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </Field>
        <Field label="Model name override" hint="Empty = use the default from your .env (e.g. claude-3-5-sonnet-20240620).">
          <input className="input" type="text" value={s.llmModel} placeholder="(use .env default)"
            onChange={(e) => set('llmModel', e.target.value)} />
        </Field>
        <Field label={`Temperature: ${s.temperature.toFixed(2)}`} hint="Lower = more deterministic, higher = more creative.">
          <input type="range" min={0} max={2} step={0.05} value={s.temperature}
            onChange={(e) => set('temperature', Number(e.target.value))} style={{ width: '100%' }} />
        </Field>
        <Field label="Max output tokens" hint="Upper bound for each generated reply.">
          <input className="input" type="number" min={16} max={4096} value={s.maxTokens}
            onChange={(e) => set('maxTokens', Number(e.target.value))} />
        </Field>
        <Field label="Context window" hint="How many recent messages to include in the prompt.">
          <input className="input" type="number" min={1} max={200} value={s.contextWindow}
            onChange={(e) => set('contextWindow', Number(e.target.value))} />
        </Field>
      </Section>

      {/* Reply behaviour */}
      <Section title="⌨️ Reply Behaviour" desc="How the bot times and shapes outgoing messages.">
        <Field label="Min reply delay (ms)" hint="Lower bound for the human-like typing delay.">
          <input className="input" type="number" min={0} max={120000} value={s.replyDelayMin}
            onChange={(e) => set('replyDelayMin', Number(e.target.value))} />
        </Field>
        <Field label="Max reply delay (ms)" hint="Upper bound for the human-like typing delay.">
          <input className="input" type="number" min={0} max={120000} value={s.replyDelayMax}
            onChange={(e) => set('replyDelayMax', Number(e.target.value))} />
        </Field>
        <Toggle label="Show typing indicator" desc="Send presence: composing → paused around each reply."
          value={s.typingIndicator} onChange={(v) => set('typingIndicator', v)} />
        <Toggle label="Enable burst-split" desc="When the style is 'burst', allow splitting into multiple messages."
          value={s.burstSplitEnabled} onChange={(v) => set('burstSplitEnabled', v)} />
        <Toggle label="Anti-ban jitter" desc="Adds an extra small random delay before each reply."
          value={s.antiBanJitter} onChange={(v) => set('antiBanJitter', v)} />
      </Section>

      {/* Filters */}
      <Section title="🛡️ Filters" desc="Pick exactly which inbound messages the bot should answer.">
        <Toggle label="Reply in groups" desc="Allow the bot to respond inside group chats (default off)."
          value={s.replyToGroups} onChange={(v) => set('replyToGroups', v)} />
        <Toggle label="Reply to unknown contacts" desc="If on, reply even when the JID is not in your target list."
          value={s.replyToUnknown} onChange={(v) => set('replyToUnknown', v)} />
        <Field label="Ignore regex" hint="Skip any inbound message matching this regex (case-insensitive).">
          <input className="input" type="text" value={s.ignoreRegex} placeholder="^stop$|/cmd"
            onChange={(e) => set('ignoreRegex', e.target.value)} />
        </Field>
        <Field label="Allowed keywords" hint="Comma-separated. If non-empty, only reply when one of these is present.">
          <input className="input" type="text" value={s.allowedKeywords} placeholder="hi, hello, help"
            onChange={(e) => set('allowedKeywords', e.target.value)} />
        </Field>
        <Field label="Ignored keywords" hint="Comma-separated. Messages containing any of these are skipped.">
          <input className="input" type="text" value={s.ignoredKeywords} placeholder="spam, promo"
            onChange={(e) => set('ignoredKeywords', e.target.value)} />
        </Field>
      </Section>

      {/* Schedule */}
      <Section title="🕒 Schedule" desc="Restrict the bot to certain hours / days.">
        <Field label={`Active hours start: ${s.activeHoursStart}:00`} hint="">
          <input type="range" min={0} max={23} step={1} value={s.activeHoursStart}
            onChange={(e) => set('activeHoursStart', Number(e.target.value))} style={{ width: '100%' }} />
        </Field>
        <Field label={`Active hours end: ${s.activeHoursEnd}:59`} hint="If end < start the window wraps over midnight.">
          <input type="range" min={0} max={23} step={1} value={s.activeHoursEnd}
            onChange={(e) => set('activeHoursEnd', Number(e.target.value))} style={{ width: '100%' }} />
        </Field>
        <Toggle label="Reply on weekends" desc="Turn off to keep weekends quiet."
          value={s.weekendEnabled} onChange={(v) => set('weekendEnabled', v)} />
        <Field label="Timezone offset (minutes vs UTC)" hint="Use the offset for your active-hours window. e.g. 330 = IST, -480 = PST.">
          <input className="input" type="number" min={-720} max={840} step={15} value={s.timezoneOffset}
            onChange={(e) => set('timezoneOffset', Number(e.target.value))} />
        </Field>
      </Section>

      {/* Style */}
      <Section title="🎨 Style Tweaks" desc="Fine-tune how strictly the AI follows the learned fingerprint.">
        <Field label={`Emoji boost: ${s.emojiBoost > 0 ? '+' : ''}${s.emojiBoost.toFixed(2)}`}
          hint="-1 = strip emojis aggressively, +1 = use more than the baseline.">
          <input type="range" min={-1} max={1} step={0.1} value={s.emojiBoost}
            onChange={(e) => set('emojiBoost', Number(e.target.value))} style={{ width: '100%' }} />
        </Field>
        <Field label={`Style strictness: ${(s.styleStrictness * 100).toFixed(0)}%`}
          hint="Higher = stick closer to the fingerprint, lower = freer responses.">
          <input type="range" min={0} max={1} step={0.05} value={s.styleStrictness}
            onChange={(e) => set('styleStrictness', Number(e.target.value))} style={{ width: '100%' }} />
        </Field>
        <Field label="Language override" hint="ISO code like 'en', 'es', 'hi'. Empty = auto-detect.">
          <input className="input" type="text" value={s.languageOverride} placeholder="(auto)"
            onChange={(e) => set('languageOverride', e.target.value)} />
        </Field>
      </Section>

      {/* Safety */}
      <Section title="⚠️ Safety & Limits" desc="Hard caps that protect your account from getting banned.">
        <Toggle label="Do-not-disturb (kill switch)" desc="When on, the bot ignores ALL messages, regardless of other toggles."
          value={s.doNotDisturb} onChange={(v) => set('doNotDisturb', v)} />
        <Toggle label="Enable rate-limit" desc="Stops replying once the hourly cap is hit."
          value={s.rateLimitEnabled} onChange={(v) => set('rateLimitEnabled', v)} />
        <Field label="Max replies per hour" hint="Applied when rate-limit is enabled.">
          <input className="input" type="number" min={1} max={10000} value={s.maxRepliesPerHour}
            onChange={(e) => set('maxRepliesPerHour', Number(e.target.value))} />
        </Field>
      </Section>

      {/* Misc */}
      <Section title="🧰 Misc" desc="Logging and global prompt injection.">
        <Toggle label="Send read receipts" desc="Mark incoming messages as read (best-effort)."
          value={s.readReceipts} onChange={(v) => set('readReceipts', v)} />
        <Field label="Log retention (days)" hint="Older log entries can be cleared by your housekeeping job.">
          <input className="input" type="number" min={1} max={3650} value={s.logRetentionDays}
            onChange={(e) => set('logRetentionDays', Number(e.target.value))} />
        </Field>
        <Field
          label="Global custom prompt"
          hint="Injected into the system prompt for EVERY contact. Use per-contact prompts in the Contacts page for fine-grained styles."
        >
          <textarea
            className="input"
            rows={4}
            placeholder="e.g. Always reply in lowercase. Never use exclamation marks. Refuse politely to discuss money."
            value={s.globalSystemPrompt}
            onChange={(e) => set('globalSystemPrompt', e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Field>
      </Section>

      {/* Sticky save bar */}
      {isDirty && (
        <div style={{
          position: 'fixed', bottom: 16, left: 256, right: 16, zIndex: 10,
          padding: '12px 20px', borderRadius: 12,
          background: 'rgba(13,17,23,0.95)', border: '1px solid rgba(37,211,102,0.3)',
          backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent-green)' }}>{Object.keys(dirty).length}</strong> unsaved change(s)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setDirty({}); api.getSettings().then((r) => setSettings(r.settings)); }}
              className="btn-ghost" disabled={busy}>Discard</button>
            <button onClick={save} className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="glass" style={{ padding: 24, borderRadius: 14, marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
      <p style={{ margin: '4px 0 18px', fontSize: 13, color: 'var(--text-muted)' }}>{desc}</p>
      <div style={{ display: 'grid', gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>{hint}</div>}
      {children}
    </label>
  );
}

function Toggle({ label, desc, value, onChange }: {
  label: string; desc?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '10px 12px', borderRadius: 8,
      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          flexShrink: 0,
          width: 44, height: 24, borderRadius: 999,
          border: 'none', cursor: 'pointer',
          background: value ? 'var(--accent-green)' : 'rgba(255,255,255,0.15)',
          position: 'relative', transition: 'all 150ms ease',
        }}
        aria-pressed={value}
        aria-label={label}
      >
        <span style={{
          position: 'absolute', top: 2, left: value ? 22 : 2,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left 150ms ease',
        }} />
      </button>
    </div>
  );
}
