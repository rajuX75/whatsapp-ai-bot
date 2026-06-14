import type {
  ActiveTarget,
  ConversationLogEntry,
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

  uploadChat: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return fetch('/api/upload/chat', { method: 'POST', body: form }).then(
      json<{ inserted: number; profile: StyleProfile }>,
    );
  },
  uploadStatus: () => fetch('/api/upload/status').then(json<unknown>),

  styleProfile: () =>
    fetch('/api/style-profile').then(json<{ profile: StyleProfile }>),

  botStatus: () => fetch('/api/bot/status').then(json<{ enabled: boolean }>),
  botToggle: (enabled: boolean) =>
    fetch('/api/bot/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }).then(json<{ enabled: boolean }>),
  logs: (limit = 100) =>
    fetch(`/api/bot/logs?limit=${limit}`).then(
      json<{ logs: ConversationLogEntry[] }>,
    ),
};
