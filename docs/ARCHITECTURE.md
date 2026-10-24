# OpenCancer architecture

## Identity and data access

AuthGate uses Supabase Auth. The public `/api/auth/config` endpoint supplies only the publishable key and URL. The frontend resolves its current bearer token before each application/Eve request. `server/auth.ts` validates it with Supabase `auth.getUser()`.

ResearchWorkspace loads the current account's workspaces and chat catalog. React state is scoped by authenticated user and workspace. Production chats never read or write the old anonymous localStorage index. Explicit mock-mode tests keep separate browser-only storage.

Routes in `agent/channels/workspace.ts` delegate to `server/http/research.ts`. The user Supabase client forwards the bearer token; RLS applies to every read/create. The server-only Supabase client is used for session bindings and runtime message persistence, always with a verified owner and stored session mapping. The secret key is never returned by the public config endpoint. No raw database password is required at runtime.

## Tables and functions

- cancer_workspaces: owner, name, default flag.
- cancer_chats: workspace, owner, title and timestamps; composite foreign keys prevent cross-owner associations.
- cancer_sessions: server-managed chat-to-Eve-session binding.
- cancer_messages: server-managed user/assistant text, ordered by an identity sequence.
- cancer_migrations: applied migration names/checksums; unavailable to browser roles.

All tables have RLS. Anonymous clients have no grants. Authenticated users can access only their own rows and cannot write session bindings or history directly. cancer_ensure_workspace runs with the caller's permissions. cancer_bind_session and cancer_save_message are callable only by service_role, validate owner associations, and perform atomic database updates.

The SQL editor installer is transactional and intended for new projects only. The optional PostgreSQL CLI migrator uses the same checksummed migration files and never resets a shared schema.

## Chat lifecycle

The UI saves a chat before opening Eve. LiveChat requests an idle session with x-cancer-chat-id. The creation wrapper checks ownership, reuses a binding when present, otherwise creates an idle Eve session and calls the binding RPC. The RPC locks the chat row and returns one canonical binding. Concurrent requests can produce unused idle candidates, but return the same canonical session; unbound candidates cannot pass the session ACL and never receive model input.

The UI then uses eve/react with the saved session ID and dynamic bearer authentication. An ownership ACL protects every stream, send and control request: Eve itself does not supply one. The onMessage hook records user text; message.completed records assistant text without depending on an open browser. get_workspace resolves the workspace from the trusted session mapping rather than client context.

Eve workflow/events remain in its own store. Supabase stores the application catalog and displayed text history, not the full runtime. Production/restart recovery needs durable Eve storage. Workspace membership is supported as described below; simultaneous content editing is not implemented yet.

## Workspace sharing

Migration 003 adds cancer_workspace_shares. Owners grant and revoke access by email through /api/workspace-shares. Access requires a matching, verified email in auth.users. An address can be added before signup; no notification email is sent. Only owners manage shares. Members see the workspace and can create their own private chats; chat/session/message access stays private and also requires current workspace access. Revocation blocks new requests and server message writes. Browser-local files are not shared.

## Kalibrera research library

The Forskning view consumes immutable, workspace-scoped imports of `research/tasks/*.json` from `x3r081/kalibrera`. The private repository is never bundled into frontend assets or copied into this repository. A manual server-side import (`npm run research:sync -- <workspace-uuid>`, Node 24) reads a single pinned main commit via GitHub, validates the bounded task records and inserts one snapshot into `cancer_research_snapshots`. It uses `KALIBRERA_GITHUB_TOKEN` or the operator's existing GitHub CLI authentication; no GitHub credential enters the browser or application runtime. Imports do not execute upstream code, acquire research datasets, claim tasks or write upstream. Re-importing the same commit is a no-op, including its original import timestamp.

Run migration `004_research_library.sql` before the first import. Only explicitly imported workspaces can read the repository data. Members inherit access through the existing verified-email workspace membership. New workspaces start disconnected. `cancer_research_links` stores a task ID and original commit, so later imports do not silently change saved material. Members can add/remove shared references; deletion does not alter Kalibrera or private chats. RLS enforces membership and the existence of the task in the referenced snapshot even for direct Supabase calls. Snapshot writes are service-role-only.

`/api/research-library` authenticates every GET/POST/DELETE, forwards the caller's bearer token for RLS, and returns no-store responses. Unknown workspaces and versions are rejected. The UI labels the import time and **last recorded event**, not official queue eligibility: it does not reimplement Kalibrera's lease or review rules. Until a stable upstream export exists, fresh assignment/eligibility must be checked in Kalibrera. Results/review artifacts link to their pinned repository paths and require GitHub repository access; file contents are not automatically ingested.

Discuss with Luna creates a new private chat and a user-editable draft containing the task record, source commit, E0 label and explicit untrusted-source framing. Nothing is sent automatically. The existing Eve chat protocol carries the user-submitted draft; no analysis or write tools are enabled. Drafts are in-memory until submitted. A workspace reference is not a reservation or an official research result.

Verification: `node --experimental-strip-types scripts/test-research-library.ts` exercises the live API, database RLS and UI using disposable accounts and synthetic tasks. Set `TEST_LIVE_MODEL=1` to additionally check a real Luna response. The test removes its own accounts and cascading records. No tests modify the partner repository.

## Workspace files and hosting

Workspace files are still browser-only. There are no analysis, upload or agent file-reading tools yet. Optional Eve tools/delegation remain disabled; Eve's upload policy rejects files.

Local startup runs Vite on 5173 and Eve on 2002. Production must serve the UI and proxy app, Eve and workflow callback routes to the server. Runtime credentials and durable workflow storage require deployment configuration. Local startup or a successful build does not deploy the app.

## Model and reasoning

The agent calls GPT-6 Luna directly through `eve/models/openai` using server-only OPENAI_API_KEY. The composer sends x-cancer-reasoning on each turn. The authenticated channel allowlists that preference, adds it to the current caller attributes, and the step model resolver passes it as OpenAI reasoningEffort. Auto and unknown values resolve to medium. Supported explicit values: none, low, medium, high, xhigh, max. Provider-native options preserve max, which is outside Eve 0.80.1 generic reasoning enum.

## Account profiles

Supabase user metadata stores display_name and avatar_url. POST /api/profile/avatar validates the Supabase session, limits uploads to 3 MB and 25 million pixels, and re-encodes images as 256px WebP without EXIF. The server uploads to the existing public Vercel Blob store using BLOB_READ_WRITE_TOKEN, under cancer/avatars/<authenticated-user-id>/<random-id>.webp. The secret never reaches the browser. Profile images have public URLs; workspace and chat permissions are unchanged.
