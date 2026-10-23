# Agent Workspace

React 19 + Vite frontend with Eve 0.80.1 backend. Node.js 24 is required.
Read `docs/ARCHITECTURE.md` before backend work and `docs/DESIGN_SYSTEM.md` before UI work.

- Keep React in `src/`, agent definitions in `agent/`, application logic in `server/`, and cross-boundary schemas in `shared/`.
- Reuse Eve's session protocol and `eve/react`; do not implement another agent loop or streaming parser.
- HTTP routes and agent tools call shared application services. Introduce scoped repositories when real persistence is needed.
- Keep credentials server-side. Never copy environment files or database credentials from Personal Agent Template.
- Optional default tools and delegation are disabled; add capabilities explicitly when needed.
- The current workspace file area is browser-local. Do not imply that the agent can read those files.
- Route authentication is shared in `server/auth.ts`; Supabase identity validation and Eve session ownership checks are required in development and production. Do not add a local auth bypass.
- Keep app tables/functions prefixed `cancer_`; preserve unrelated shared tables. Use Supabase keys from the same project as Auth. User Data API queries must carry the user's token for RLS; server-only writes must check owner/session bindings. Never expose SUPABASE_SECRET_KEY to the browser.
- `npm run dev` starts UI and Eve locally. `npm run dev:ui` with `VITE_AGENT_MODE=mock` is an explicit design-only mode.
- Check `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`, `npm run test:agent`, and `npm run build` as appropriate. UI mocks, live runtime checks, and real model acceptance are different evidence levels.
- Read versioned `node_modules/eve/docs/README.md` and the relevant guide before changing Eve code.
