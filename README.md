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

When the router invokes `goodbye_hard`, the server returns that agent's final response and then blocks the associated user from further chat requests for 24 hours. The expiry is stored in PostgreSQL, so the restriction survives restarts. Blocked requests receive HTTP `429`, a `Retry-After` header, and the `USER_TEMPORARILY_BANNED` error code. The public website and lead form remain available.

### Consultant site search

Set `CONSULT_SEARCH_DOMAIN` to give the `consult` agent a hosted web-search tool restricted to that domain:

```env
CONSULT_SEARCH_DOMAIN=lambda19.org
```

Use a hostname without a path, query, port, or credentials. Values with `http://` or `https://` are normalized to the hostname. The allowed domain also includes its subdomains. If the variable is empty or absent, the search tool is not attached, which prevents accidental unrestricted web searches.

Contact requests are saved through `POST /api/leads`. Authenticated admin API endpoints provide lead listing, status and notes updates, and deletion. Leads are stored in PostgreSQL rather than browser storage.

A user UUID is assigned only after the browser first sends a chat message or contact request. The server stores it in the `lambda19_user_id` cookie for one year with `HttpOnly` and `SameSite=Lax`. Chat sessions belong to that user, and new leads store both `user_id` and the owned `session_id` when a chat session already exists. The lead UUID is returned explicitly as `leadId` while the existing `lead.id` field remains available for compatibility.

## Logging and retention

The server uses Pino and `pino-http`. Production output is structured JSON written to stdout, so Docker or the hosting platform can collect it without storing files inside the application container. Authorization headers, cookies, passwords, tokens, API keys, and database URLs are redacted. Request bodies and AI conversation text are not written to logs.

Logs that need retention and admin management are also stored in PostgreSQL with these categories:

| Type | Content | Retention |
| --- | --- | ---: |
| `http_success` | Successful HTTP requests | 30 days |
| `application_error` | Application and database errors | 90 days |
| `ai_error` | AI consultant errors | 90 days |
| `lead_audit` | Lead creation, updates, and deletion | 365 days |
| `security_audit` | Authentication and administrator actions | 365 days |

Expired rows are removed once at startup and then every 24 hours. The authenticated admin panel has a **Log Management** section for viewing counts, exporting up to 50,000 rows of one type as CSV, and deleting all rows of one type. Export and deletion require a reason and are themselves recorded in `security_audit`.

Correlated records include `requestId`, `userId`, `sessionId`, and `leadId` when those identifiers are available.

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
