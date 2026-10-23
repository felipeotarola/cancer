# OpenCancer

A cancer-research workspace built with React, Vite, Eve and Supabase Auth.

## Local setup

Use Node.js 24. Copy `.env.example` to `.env` and configure all three values from the SAME Supabase project:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` for browser sign-in and RLS-protected queries.
- `SUPABASE_SECRET_KEY` for server-only session binding and message persistence. Never prefix this with VITE_ or expose it to the browser.

The application uses Supabase's Data API. No PostgreSQL password or DATABASE_URL is needed to run it. The supplied FRAME database is not used. Real model replies use `OPENAI_API_KEY` server-side to call GPT-6 Luna directly. The composer supports Auto (medium), none, low, medium, high, xhigh and max reasoning.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api`, `/eve` and workflow callbacks to Eve on port 2002. Add the local app origin to Supabase Auth's allowed redirect URLs for email-confirmed signup. The public config endpoint returns only the Supabase URL and publishable key. `.env` is ignored by Git.

## Schema installation

The schema is already installed in the configured Cue project. For a NEW empty project, run `npm run db:prepare` and execute `supabase/install.sql` in its SQL editor. It is a transactional first-time installer and deliberately fails if these app tables already exist. It creates only `cancer_` objects and records migration checksums in `cancer_migrations`.

For later CLI migrations, optionally supply a PostgreSQL `DATABASE_URL` for the same project and run `npm run db:migrate`. Preserve the connection port supplied by Supabase. Never reset the shared schema.

## Auth and persistence

- Email/password login, signup, refresh and logout use Supabase Auth. Email confirmation follows the project's settings.
- Application and chat-session requests validate tokens through `auth.getUser`. There is no local anonymous backend bypass.
- Each user has a default workspace and can create/select more workspaces.
- `cancer_workspaces`, `cancer_chats`, `cancer_messages`, `cancer_sessions` and `cancer_migrations` all have RLS enabled.
- User queries carry the user's bearer token, so the database enforces ownership. Browser roles cannot write session bindings or forge message history.
- Server-only RPC functions bind sessions and persist messages while checking the verified owner's ID. Eve stream, send and control endpoints check session ownership.
- Messages are recorded on the server, including assistant completion after the browser disconnects.
- Eve still owns workflow/event state under `.eve/`; Supabase holds the catalog, text history and session bindings. Production also needs durable Eve storage.
- Workspaces are private per account. Invitations and shared membership/roles are future work.
- Files remain browser-local: no upload, persistent document storage or agent file access yet. Analysis tools are future work.
- Old anonymous browser chats are not automatically assigned to an account.

## Verification

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run test:agent
npm run test:auth
npm run build
```

UI tests use explicit mock mode on 5174. Runtime tests check the real login screen, safe public config and unauthenticated rejection on 5173. `test:auth` uses two temporary, confirmed Supabase users; verifies real login, RLS, cross-user rejection, chat persistence, browser reload, workspace creation and logout; then deletes only its own identities and their cascading app rows. Set `CANCER_TEST_MODEL=1` to additionally require real model inference. The model check is optional and is not implied by other passing tests.

The original repository is https://github.com/felipeotarola/agent-workspace-react. See `docs/DESIGN_SYSTEM.md` for the design system. MIT license notices are retained.
