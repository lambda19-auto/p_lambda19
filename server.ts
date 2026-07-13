import 'dotenv/config';
import { timingSafeEqual } from 'crypto';
import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';

import { runRouterOnce } from './neuro_seller/router.js';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const JWT_SECRET = requireEnvironmentVariable('JWT_SECRET');
  const ADMIN_USERNAME = requireEnvironmentVariable('ADMIN_USERNAME');
  const ADMIN_PASSWORD = requireEnvironmentVariable('ADMIN_PASSWORD');

  if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body as { username?: unknown; password?: unknown };
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    if (safeEqual(username, ADMIN_USERNAME) && safeEqual(password, ADMIN_PASSWORD)) {
      const token = jwt.sign(
        { username, role: 'admin' },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '24h', issuer: 'lambda19' },
      );
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
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'lambda19',
      });
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

      if (sessionId !== undefined && (typeof sessionId !== 'string' || sessionId.trim().length > 128)) {
        return res.status(400).json({ success: false, message: 'Invalid session ID' });
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
      console.error('Error in /api/chat:', error);
      return res.status(500).json({ success: false, message: 'Unable to process the chat request' });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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
