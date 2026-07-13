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

2. Copy `.env.example` to `.env` and replace every placeholder:

```bash
cp .env.example .env
```

`JWT_SECRET` must contain at least 32 characters. You can generate one with
`openssl rand -base64 48`. Never commit `.env`.

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

## Production

Set `NODE_ENV=production`, build the project, and start the bundled server:

```bash
npm run build
npm start
```

The health endpoint is available at `GET /api/health`.
