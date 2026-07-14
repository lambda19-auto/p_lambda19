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

`DATABASE_URL` must point to an existing PostgreSQL database. For example:

```env
DATABASE_URL=postgresql://lambda19:strong_password@localhost:5432/lambda19
```

The database and role can be created once by a PostgreSQL administrator:

```sql
CREATE ROLE lambda19 WITH LOGIN PASSWORD 'strong_password';
CREATE DATABASE lambda19 OWNER lambda19;
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

Contact requests are saved through `POST /api/leads`. Authenticated admin API endpoints provide lead listing, status and notes updates, and deletion. Leads are stored in PostgreSQL rather than browser storage.

A user UUID is assigned only after the browser first sends a chat message or contact request. The server stores it in the `lambda19_user_id` cookie for one year with `HttpOnly` and `SameSite=Lax`. Chat sessions belong to that user, and new leads store both `user_id` and the owned `session_id` when a chat session already exists. The lead UUID is returned explicitly as `leadId` while the existing `lead.id` field remains available for compatibility.

## Production

Set `NODE_ENV=production`, build the project, and start the bundled server:

```bash
npm run build
npm start
```

The health endpoint is available at `GET /api/health`.

## Database migrations

The server automatically runs pending SQL files from `migrations/` before it starts accepting HTTP requests. Applied migration names are recorded in `schema_migrations`, so every migration runs only once. A PostgreSQL advisory lock serializes startup migrations when multiple application instances start concurrently.

The production build copies migrations into `dist/migrations`; deploy that directory together with `dist/server.cjs`. If PostgreSQL is unavailable or a migration fails, startup fails without partially applying the migration transaction.
