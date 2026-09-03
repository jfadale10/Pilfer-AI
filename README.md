# Signal — AI Chat Assistant

A mobile-first, installable AI chatbot. Two parts:

- **`public/`** — the PWA frontend (chat UI, offline app-shell caching, local history)
- **`server/`** — a small Express backend that holds the Anthropic API key and proxies chat requests

The frontend never talks to Anthropic directly — it calls your own `/api/chat` endpoint, which forwards the request server-side. This keeps your API key out of the browser.

## Run it locally

```bash
cd server
npm install
cp .env.example .env
# edit .env and paste your real ANTHROPIC_API_KEY
npm start
```

Then open **http://localhost:3000** — the server also serves the frontend as static files, so this one command runs the whole app.

## How it fits together

```
Phone browser (PWA)
   │  POST /api/chat  { messages }
   ▼
Express server (server.js)
   │  attaches ANTHROPIC_API_KEY, forwards to Anthropic
   ▼
Anthropic Messages API
   │  { content: [...] }
   ▼
Express server → { reply: "..." } → back to the browser
```

- **Chat history** persists in the browser's `localStorage`, so conversations survive a refresh or app close. "New chat" clears it.
- **Rate limiting** is applied per IP (30 req/min) to avoid runaway API costs — tune `chatLimiter` in `server.js`.
- **Context window**: the server trims to the last 40 turns before calling the model — tune `MAX_TURNS`.

## Installing it as a mobile app

Once deployed to a real URL (see below), open it in Chrome (Android) or Safari (iOS):
- **Android/Chrome**: you'll see an "Install" banner in-app (from `beforeinstallprompt`), or use the browser menu → "Add to Home screen."
- **iOS/Safari**: Share button → "Add to Home Screen" (Safari doesn't fire `beforeinstallprompt`, so the in-app banner won't show — this is a browser limitation, not a bug).

## Deploying

Any Node host works (Render, Railway, Fly.io, a VPS, etc.):

1. Push this folder to your host.
2. Set the `ANTHROPIC_API_KEY` environment variable in your host's dashboard (don't upload `.env`).
3. Start command: `npm start` (from `server/`).
4. Make sure it's served over **HTTPS** — service workers and install prompts require it (localhost is exempt for testing).

## Next steps worth considering

- Swap `localStorage` history for a real per-user backend store if you want history to sync across devices
- Add streaming responses (Anthropic supports SSE) for lower perceived latency on longer replies
- Add auth if this won't be a single-user/personal deployment
