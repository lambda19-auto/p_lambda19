import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';

import { runRouterOnce } from './neuro_seller/router.js';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const JWT_SECRET = process.env.JWT_SECRET || 'iDG92r7B4quLPNV8qsDw';

  app.use(express.json({ limit: '32kb' }));

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && (password === 'admin' || password === 'iDG92r7B4quLPNV8qsDw' || password === 'admin123')) {
      const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ success: true, token });
    }
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  });

  app.post('/api/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
      return res.json({ success: true, decoded });
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is not configured on the server.');
        return res.status(500).json({ success: false, message: 'OpenAI API key is not configured on the server' });
      }

      const { messages, sessionId } = req.body as {
        messages?: ChatMessage[];
        sessionId?: string;
      };

      if (!Array.isArray(messages)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing messages array' });
      }

      const lastUserMessage = [...messages]
        .reverse()
        .find((message) => message.role === 'user' && typeof message.content === 'string')
        ?.content.trim();

      if (!lastUserMessage) {
        return res.status(400).json({ success: false, message: 'A user message is required' });
      }

      if (lastUserMessage.length > 4000) {
        return res.status(413).json({ success: false, message: 'Message is too long' });
      }

      const result = await runRouterOnce(lastUserMessage, sessionId);
      return res.json({ success: true, text: result.response, sessionId: result.sessionId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      console.error('Error in /api/chat:', error);
      return res.status(500).json({ success: false, message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});
