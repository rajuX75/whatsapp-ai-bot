import type {
  ActiveTarget,
  BotTarget,
  ConversationLogEntry,
  RuntimeSettings,
  StyleProfile,
  WaConnectionStatus,
  WaContactSummary,
} from '../types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  authStatus: () =>
    fetch('/api/auth/status').then(json<{ status: WaConnectionStatus }>),
  authQr: () =>
    fetch('/api/auth/qr').then(json<{ qr: string; dataUrl: string }>),
  authLogout: () =>
    fetch('/api/auth/logout', { method: 'POST' }).then(json<{ ok: true }>),

  listContacts: () =>
    fetch('/api/contacts').then(json<{ contacts: WaContactSummary[] }>),
  selectContact: (jid: string, name?: string) =>
    fetch('/api/contacts/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid, name }),
    }).then(json<{ target: ActiveTarget }>),
  activeContact: () =>
    fetch('/api/contacts/active').then(json<{ target: ActiveTarget | null }>),
  clearActive: () =>
    fetch('/api/contacts/active', { method: 'DELETE' }).then(json<{ ok: true }>),

  // -------- multi-target --------
  listTargets: () =>
    fetch('/api/contacts/targets').then(json<{ targets: BotTarget[] }>),
  addTarget: (
    jid: string,
    opts: { name?: string; enabled?: boolean; customPrompt?: string | null } = {},
  ) =>
    fetch('/api/contacts/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid, ...opts }),
    }).then(json<{ target: BotTarget }>),
  removeTarget: (jid: string) =>
    fetch(`/api/contacts/targets/${encodeURIComponent(jid)}`, {
      method: 'DELETE',
    }).then(json<{ ok: true }>),
  toggleTarget: (jid: string, enabled: boolean) =>
    fetch(`/api/contacts/targets/${encodeURIComponent(jid)}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }).then(json<{ targets: BotTarget[] }>),
  toggleAllTargets: (enabled: boolean) =>
    fetch('/api/contacts/targets/all/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }).then(json<{ targets: BotTarget[] }>),
  updateTargetPrompt: (jid: string, customPrompt: string | null) =>
    fetch(`/api/contacts/targets/${encodeURIComponent(jid)}/prompt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customPrompt }),
    }).then(json<{ targets: BotTarget[] }>),

  uploadChat: (file: File, jid?: string) => {
    const form = new FormData();
    form.append('file', file);
    const url = jid
      ? `/api/upload/chat/${encodeURIComponent(jid)}`
      : '/api/upload/chat';
    return fetch(url, { method: 'POST', body: form }).then(
      json<{ inserted: number; profile: StyleProfile; contactJid?: string }>,
    );
  },
  uploadStatus: () => fetch('/api/upload/status').then(json<unknown>),

  styleProfile: (jid?: string) =>
    fetch(jid ? `/api/style-profile?jid=${encodeURIComponent(jid)}` : '/api/style-profile').then(
      json<{ profile: StyleProfile }>,
    ),

  botStatus: () => fetch('/api/bot/status').then(json<{ enabled: boolean }>),
  botToggle: (enabled: boolean) =>
    fetch('/api/bot/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }).then(json<{ enabled: boolean }>),
  logs: (limit = 100, jid?: string) =>
    fetch(
      jid
        ? `/api/bot/logs?limit=${limit}&jid=${encodeURIComponent(jid)}`
        : `/api/bot/logs?limit=${limit}`,
    ).then(json<{ logs: ConversationLogEntry[] }>),

  // -------- settings --------
  getSettings: () =>
    fetch('/api/settings').then(
      json<{ settings: RuntimeSettings; defaults: RuntimeSettings }>,
    ),
  updateSettings: (patch: Partial<RuntimeSettings>) =>
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(json<{ settings: RuntimeSettings }>),
  resetSettings: () =>
    fetch('/api/settings/reset', { method: 'POST' }).then(
      json<{ settings: RuntimeSettings }>,
    ),
};
