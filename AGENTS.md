<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# WeLaunch Client Portal

Private branded workspace for **WeLaunch** (marketing agency) and its clients.

## Roles

- **Agency (admin):** Full visibility — all clients, projects, metrics; internal tools for drafting, activity log, client management, and editing any client's data.
- **Client:** Scoped to their own org only — dashboard, tasks, tickets, marketing calendar, knowledge base, voice calls, demo tracker, channels.

## Client features (V1)

Dashboard · Tasks · Tickets · Marketing calendar · Knowledge base · Voice agent calls · Demo tracker · Channels

## V1 constraints

- Agency enters most data manually.
- Only AI voice-call data is automated inbound.
- UI and role-based auth are not implemented yet — see `docs/PROJECT.md`.
