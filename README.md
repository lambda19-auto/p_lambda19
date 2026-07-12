# lambda19 website

React/Vite website served by a single Express backend in `server.ts`.

The consultant widget uses the OpenAI Agents SDK and the agents in `neuro_seller/`:

- `router.ts`
- `consult.ts`
- `goodbye-soft.ts`
- `goodbye-hard.ts`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```env
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
PORT=3000
```

3. Start development mode:

```bash
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

The browser sends chat messages to `POST /api/chat`. Agent instructions and the OpenAI API key remain on the server.
