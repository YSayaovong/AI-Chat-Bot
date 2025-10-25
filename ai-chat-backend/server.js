import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { upsertSession, listMessages, addMessage } from './db.js';

const app = express();
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0'; // bind to all interfaces
const ALLOW_ORIGIN = process.env.CORS_ORIGIN?.split(',').map(s => s.trim());

// --- Middleware ---
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || !ALLOW_ORIGIN) return cb(null, true);
      cb(null, ALLOW_ORIGIN.includes(origin));
    },
  })
);

const limiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// --- Routes ---
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/session', (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  upsertSession(sessionId);
  res.json({ ok: true, sessionId });
});

app.get('/api/messages/:sessionId', (req, res) => {
  const msgs = listMessages(req.params.sessionId);
  res.json({ messages: msgs });
});

app.post('/api/chat/stream', async (req, res) => {
  try {
    const { sessionId, model = 'gpt-4o-mini', messages = [] } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({ error: 'OPENAI_API_KEY not set' });

    const last = messages[messages.length - 1];
    if (last?.role === 'user') addMessage(sessionId, 'user', last.content);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const oaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!oaiResp.ok || !oaiResp.body) {
      const text = await oaiResp.text();
      res.write(`event: token\ndata: ${JSON.stringify('[OpenAI error] ' + text)}\n\n`);
      res.write('event: end\ndata: {}\n\n');
      return res.end();
    }

    const reader = oaiResp.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = '';
    const send = (evt, data = '') => res.write(`event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            assistantText += delta;
            send('token', delta);
          }
        } catch { /* ignore partials */ }
      }
    }

    if (assistantText) addMessage(sessionId, 'assistant', assistantText);
    send('end', {});
    res.end();
  } catch (err) {
    console.error('STREAM ERROR:', err);
    res.write(`event: token\ndata: ${JSON.stringify('Server error: ' + err.message)}\n\n`);
    res.write('event: end\ndata: {}\n\n');
    res.end();
  }
});

// --- Start Server with explicit host + error logging ---
const server = app.listen(PORT, HOST, () => {
  console.log(`✅ API listening on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
server.on('error', (e) => {
  console.error('❌ Failed to start server:', e.code, e.message);
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Change PORT in .env or stop the other process.`);
  }
});
