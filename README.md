# 🤖 WhatsApp AI Clone Bot

Mimic any WhatsApp contact with AI — Powered by Open-Source.

> **⚠️ Legal Disclaimer**: This software is for **educational and personal research purposes only**. Using it to impersonate others without explicit consent may violate WhatsApp's Terms of Service and local privacy/communication laws. You are solely responsible for how you use this tool.

## ✨ Features

- 📱 **WhatsApp QR Login** — Connects via Baileys (open-source WhatsApp Web API).
- 👥 **Multi-Contact Selector** — Pick **one or many** target contacts and toggle auto-reply per contact (or for all of them at once).
- 💬 **Per-Contact Custom Prompts** — Give each contact its own system-prompt override to get a different response style per person.
- 📂 **Per-Contact Chat History Import** — Upload separate `.zip`/`.txt` exports for different contacts, each producing its own style profile.
- ⚙️ **20+ Runtime Settings** — Live-editable UI for model, sampling, schedule, filters, rate limits, anti-ban, etc. No restart required.
- 🧠 **Style Fingerprinting** — Extracts message length, emoji ratio, punctuation, vocabulary, burst pattern, active hours.
- 🤖 **LLM-Powered Replies** — Supports Anthropic Claude, OpenAI GPT-4o, and local Ollama (Llama 3.1 / Mistral).
- ⌨️ **Human-like Typing** — Random delays, presence updates, message bursts.
- 📊 **Web Dashboard** — Live message log, bot toggle, style profile view.

## 🧱 Tech Stack

| Layer | Stack |
|-------|-------|
| Runtime | Node.js 20+ |
| WhatsApp | `@whiskeysockets/baileys` |
| Backend | Express, WebSocket (`ws`), better-sqlite3 |
| Frontend | React 18, Vite, TailwindCSS |
| LLM | Vercel AI SDK (Anthropic / OpenAI / Ollama) |
| Parsing | adm-zip, custom regex |
| Language | TypeScript everywhere |

## 🗂 Project Structure

```
whatsapp-ai-bot/
├── packages/
│   ├── backend/        # Express API + Baileys + SQLite
│   │   └── src/
│   │       ├── modules/     # whatsapp-client, chat-parser, style-analyzer, ai-engine, message-router
│   │       ├── routes/      # REST endpoints
│   │       ├── db/          # SQLite schema + repository
│   │       ├── utils/       # logger, config
│   │       └── types/       # shared types
│   └── frontend/       # React + Vite SPA
│       └── src/
│           ├── pages/       # QR login, contacts, upload, profile, bot control, logs
│           ├── components/  # UI primitives
│           ├── hooks/       # WebSocket, API hooks
│           └── lib/         # API client
└── package.json        # npm workspaces root
```

## 🚀 Quick Start

```bash
# 1. Install
npm install

# 2. Configure backend
cp packages/backend/.env.example packages/backend/.env
#   edit ANTHROPIC_API_KEY / OPENAI_API_KEY / OLLAMA_*

# 3. Dev (runs backend on :3001 and frontend on :5173)
npm run dev

# 4. Production
npm run build
npm start
```

Open <http://localhost:5173>, scan the QR code with your phone, then pick a contact and upload chat history.

## 🔐 Environment Variables

See `packages/backend/.env.example`. The most important:

| Var | Description |
|-----|-------------|
| `LLM_PROVIDER` | `anthropic` \| `openai` \| `ollama` |
| `ANTHROPIC_API_KEY` | Required if provider=anthropic |
| `OPENAI_API_KEY` | Required if provider=openai |
| `OLLAMA_BASE_URL` | Default `http://localhost:11434` |
| `OLLAMA_MODEL` | e.g. `llama3.1` |
| `REPLY_DELAY_MIN` / `REPLY_DELAY_MAX` | Anti-ban delays in ms |

## 📡 API Reference

### Connection / contacts

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/auth/qr`            | Current QR (also via `/ws/qr`) |
| GET  | `/api/auth/status`        | Connection status |
| POST | `/api/auth/logout`        | Clear session |
| GET  | `/api/contacts`           | List recent contacts |
| POST | `/api/contacts/select`    | Pick the legacy single target |
| GET  | `/api/contacts/active`    | Current legacy target |

### Multi-target management (new)

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/api/contacts/targets`                  | List every bot target |
| POST   | `/api/contacts/targets`                  | Add (or upsert) a target — `{ jid, name?, enabled?, customPrompt? }` |
| DELETE | `/api/contacts/targets/:jid`             | Remove a target |
| POST   | `/api/contacts/targets/:jid/toggle`      | Enable/disable auto-reply for one contact — `{ enabled }` |
| POST   | `/api/contacts/targets/all/toggle`       | Enable/disable for **all** targets — `{ enabled }` |
| PUT    | `/api/contacts/targets/:jid/prompt`      | Set/clear per-contact custom prompt — `{ customPrompt }` |

### Chat / style / logs

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/upload/chat`             | Upload export for the legacy active target |
| POST | `/api/upload/chat/:jid`        | Upload export and bind it to a specific contact |
| GET  | `/api/upload/status`           | Parse progress |
| GET  | `/api/style-profile?jid=...`   | Style fingerprint (optional per-contact) |
| GET  | `/api/bot/status`              | Is the global bot enabled? |
| POST | `/api/bot/toggle`              | Master enable / disable |
| GET  | `/api/bot/logs?jid=...`        | Recent conversation log (optional per-contact) |

### Settings (new — live editable)

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/api/settings`         | Current merged settings + defaults |
| PUT    | `/api/settings`         | Patch any subset of the 26 runtime settings |
| POST   | `/api/settings/reset`   | Reset all UI settings (env defaults remain) |

### WebSockets

| Method | Path | Purpose |
|--------|------|---------|
| WS   | `/ws/qr`              | QR code stream |
| WS   | `/ws/messages`        | Live message stream |

## ⚙️ Runtime Settings (UI)

The **Settings** page exposes a fully functional form for every setting below. They are persisted in SQLite (table `settings`) and applied on the *very next* incoming message — no restart needed.

| Group | Setting | Description |
|-------|---------|-------------|
| AI    | `llmProvider`            | Anthropic / OpenAI / Ollama / OpenRouter / Gemini |
| AI    | `llmModel`               | Override the provider's model name (empty = `.env` default) |
| AI    | `temperature`            | 0 – 2 sampler |
| AI    | `maxTokens`              | Reply length cap |
| AI    | `contextWindow`          | # of recent messages in the prompt |
| Reply | `replyDelayMin/Max`      | Human-like typing window (ms) |
| Reply | `typingIndicator`        | Send presence: composing |
| Reply | `burstSplitEnabled`      | Allow multi-message bursts |
| Reply | `antiBanJitter`          | Extra random delay |
| Filter| `replyToGroups`          | Allow group replies |
| Filter| `replyToUnknown`         | Reply to JIDs not in your target list |
| Filter| `ignoreRegex`            | Skip messages matching this regex |
| Filter| `allowedKeywords`        | Comma list — only reply when present |
| Filter| `ignoredKeywords`        | Comma list — skip when present |
| Sched | `activeHoursStart/End`   | Hour window (wraps over midnight) |
| Sched | `weekendEnabled`         | Reply on Sat/Sun |
| Sched | `timezoneOffset`         | Minutes vs UTC |
| Style | `emojiBoost`             | -1..+1 emoji density nudge |
| Style | `styleStrictness`        | 0..1 how closely to follow the fingerprint |
| Style | `languageOverride`       | ISO code, empty = auto |
| Safety| `maxRepliesPerHour`      | Hard cap when rate-limit is on |
| Safety| `rateLimitEnabled`       | Turn the hourly cap on/off |
| Safety| `doNotDisturb`           | Kill switch — ignore ALL inbound |
| Misc  | `readReceipts`           | Mark inbound as read |
| Misc  | `logRetentionDays`       | Days to keep logs |
| Misc  | `globalSystemPrompt`     | Injected into the prompt for **every** contact |

## 📁 Chat Export Format

Standard WhatsApp export, e.g.:

```
6/14/25, 10:32 PM - Alice: Hey, what's up?
6/14/25, 10:33 PM - Bob: Not much, you?
```

The parser supports both 12h and 24h formats, single/double-digit dates, `<Media omitted>` placeholders, and UTF-8/UTF-16 BOM normalisation.

## 🧪 Type Check

```bash
npm run typecheck
```

## 📝 License

MIT — see `LICENSE`.
