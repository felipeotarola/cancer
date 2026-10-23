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

## Files and hosting

Workspace files are still browser-only. There are no analysis, upload or agent file-reading tools yet. Optional Eve tools/delegation remain disabled; Eve's upload policy rejects files.

Local startup runs Vite on 5173 and Eve on 2002. Production must serve the UI and proxy app, Eve and workflow callback routes to the server. Runtime credentials and durable workflow storage require deployment configuration. Local startup or a successful build does not deploy the app.

## Model and reasoning

The agent calls GPT-6 Luna directly through `eve/models/openai` using server-only OPENAI_API_KEY. The composer sends x-cancer-reasoning on each turn. The authenticated channel allowlists that preference, adds it to the current caller attributes, and the step model resolver passes it as OpenAI reasoningEffort. Auto and unknown values resolve to medium. Supported explicit values: none, low, medium, high, xhigh, max. Provider-native options preserve max, which is outside Eve 0.80.1 generic reasoning enum.

## Account profiles

Supabase user metadata stores display_name and avatar_url. POST /api/profile/avatar validates the Supabase session, limits uploads to 3 MB and 25 million pixels, and re-encodes images as 256px WebP without EXIF. The server uploads to the existing public Vercel Blob store using BLOB_READ_WRITE_TOKEN, under cancer/avatars/<authenticated-user-id>/<random-id>.webp. The secret never reaches the browser. Profile images have public URLs; workspace and chat permissions are unchanged.
