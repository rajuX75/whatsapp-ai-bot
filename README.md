# 🤖 WhatsApp AI Clone Bot

Mimic any WhatsApp contact with AI — Powered by Open-Source.

> **⚠️ Legal Disclaimer**: This software is for **educational and personal research purposes only**. Using it to impersonate others without explicit consent may violate WhatsApp's Terms of Service and local privacy/communication laws. You are solely responsible for how you use this tool.

## ✨ Features

- 📱 **WhatsApp QR Login** — Connects via Baileys (open-source WhatsApp Web API).
- 👥 **Contact Selector** — Pick exactly **one** target contact at a time.
- 📂 **Chat History Import** — Upload exported chat as `.zip` or `.txt`.
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

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/auth/qr`        | Current QR (also via `/ws/qr`) |
| GET  | `/api/auth/status`    | Connection status |
| POST | `/api/auth/logout`    | Clear session |
| GET  | `/api/contacts`       | List recent contacts |
| POST | `/api/contacts/select`| Pick target contact |
| GET  | `/api/contacts/active`| Current target |
| POST | `/api/upload/chat`    | Upload `.zip`/`.txt` chat export |
| GET  | `/api/upload/status`  | Parse progress |
| GET  | `/api/style-profile`  | Extracted style fingerprint |
| GET  | `/api/bot/status`     | Is the bot replying? |
| POST | `/api/bot/toggle`     | Enable / disable |
| GET  | `/api/logs`           | Recent conversation log |
| WS   | `/ws/qr`              | QR code stream |
| WS   | `/ws/messages`        | Live message stream |

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
