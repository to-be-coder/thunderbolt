<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at http://mozilla.org/MPL/2.0/. -->

# Desktop tool-traffic attribution (Stage 7, T3)

## The question

Invoker attribution (**P0-7**) — "which user triggered this egress?" — is recorded
on the **web** path as the `user_id` field on the proxy observability event
(`backend/src/proxy/observability.ts`, `ProxyEventBase.user_id`; stamped for team
agents by the WS relay in `backend/src/proxy/ws-team-agent.ts`). The Tauri
(`src-tauri`) desktop build can open **direct** transports that bypass the egress
proxy where that attribution is recorded. So: for desktop, do we (a) route all tool
traffic through the proxy, or (b) self-report audit events from the desktop?

## What desktop actually does today

Two independent facts settle this:

1. **Team (company) agents ALWAYS proxy — on every platform.**
   `src/acp/transports/index.ts` `resolveWebSocketFactory` returns
   `createTeamAgentProxyWebSocket` **unconditionally** whenever a `teamAgentId` is
   set. The relay is addressed by id (`tbproxy.agent.<id>`), grant-checks the
   caller, resolves the ACP URL server-side, and strips the bearer upstream. The
   Tauri "proxy toggle" (`computeEffectiveProxyEnabled` / `isStandaloneTransport`)
   only governs **personal external-agent** routing — it never applies to team
   agents. So the P0-7-audited path (company agents) is attribution-guaranteed on
   desktop by construction; the seal holds.

2. **The only desktop bypass surface is personal, no-backend traffic.**
   In Tauri with the proxy toggle OFF ("Standalone"), `remote-acp` (user-configured
   external agents) uses a native `new WebSocket()` (`nativeWebSocketFactory`), and
   MCP servers hit the upstream directly (`createProxyFetch` with
   `getProxyEnabled` false). Standalone is, by design, a **no-cloud-backend** mode —
   there is no proxy hop and therefore no observability sink to record to.

## Decision

**Route company-agent tool traffic through the proxy (already the case); treat
personal-ACP / MCP standalone-desktop traffic as out-of-scope for v1 egress audit.**

- **Company agents (the audited invariant):** proxied and attributed on **all**
  platforms — no change needed. This is the traffic P0-7 exists to attribute, and
  it is un-bypassable from desktop (the seal is structural).
- **Personal ACP / MCP in Tauri-standalone:** intentionally un-audited. Standalone
  is a deliberate direct-connect mode with no backend; self-reporting audit events
  would require a backend to receive them, which standalone does not have.
- **Web:** attribution is correct today and stays correct
  (`observability.ts` `user_id`).

Chosen over full desktop→proxy routing because it matches codebase reality (team
traffic is already always relayed and attributed) and does not break the explicit
no-backend Standalone contract. Chosen over desktop self-report because there is no
audit sink in Standalone; adding one is the follow-up below.

## Follow-up (only if standalone personal-traffic attribution is ever required)

Desktop self-reports egress audit events to a backend when one is reachable
(Connected desktop), emitting an event shaped like `ProxyEventBase` with the
signed-in `user_id`. Not needed for v1: v1's audited surface is company agents,
which are already always attributed.

## Where this is enforced / documented in code

- `src/acp/transports/index.ts` — the team-agent branch (always-proxied) and the
  `remote-acp` standalone branch (direct, un-audited) both carry a comment pointing
  here.
- `src/lib/mcp-transport.ts` — the `getProxyEnabled` line carries a comment pointing
  here.
- `backend/src/proxy/observability.ts` / `backend/src/proxy/ws-team-agent.ts` — the
  web + relay attribution sink (P0-7 `user_id`).
