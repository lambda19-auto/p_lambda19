import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const JWT_SECRET = process.env.JWT_SECRET || 'iDG92r7B4quLPNV8qsDw';

  app.use(express.json());

  // API route for login
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && (password === 'admin' || password === 'iDG92r7B4quLPNV8qsDw' || password === 'admin123')) {
      const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ success: true, token });
    }
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  });

  // API route for verifying token
  app.post('/api/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return res.json({ success: true, decoded });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  });

  // API route for chatbot consultant using server-side Gemini
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing messages array' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('GEMINI_API_KEY is not configured on the server.');
        return res.status(500).json({ success: false, message: 'Gemini API key is not configured on the server' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Map roles from client ('assistant' -> 'model')
      const contents = messages.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const model = "gemini-3.5-flash";

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemInstruction || "You are a helpful assistant.",
        }
      });

      const text = response.text || "I'm sorry, I couldn't process that request.";
      return res.json({ success: true, text });
    } catch (error: any) {
      console.error('Error in /api/chat:', error);
      return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
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

startServer();
