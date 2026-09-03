// Signal backend — proxies chat requests to the Anthropic API.
// The API key lives only here (server-side), never in the client.

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const SYSTEM_PROMPT =
  'You are PILFER AI, a friendly, concise general-purpose assistant inside a mobile chat app. ' +
  'Keep answers clear and conversational, formatted for a small screen.';

if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY. Set it in server/.env — see .env.example.');
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve the PWA frontend as static files.
app.use(express.static('.'));

// Basic abuse protection: 30 requests/minute per IP.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    // Keep only the last N turns to bound context/cost. Tune as needed.
    const MAX_TURNS = 40;
    const trimmed = messages.slice(-MAX_TURNS);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: trimmed
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return res.status(502).json({ error: 'Upstream model error' });
    }

    const data = await response.json();
    const reply = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    res.json({ reply: reply || "Sorry, I couldn't generate a response." });
  } catch (err) {
    console.error('Chat handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Signal server running on http://localhost:${PORT}`);
});
