/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Relay-level e2e for Stage 4 T1 — team-agent session establishment through the
 * universal WS relay, driven by the SAME grant check (`resolveAgentAccess`) used
 * for establishment and revocation. Proves, at the socket level:
 *   - GRANTED  → the session opens and relays bidirectionally (service identity:
 *     the caller bearer is stripped before the upstream connect).
 *   - UNGRANTED → establishment is refused (close 4001).
 *   - REVOKED (in-flight) → the open socket is closed when the grant hub
 *     re-validates the agent and the caller no longer holds a grant.
 *
 * The grant check is injected (not a real admin DB) so the test isolates the
 * relay↔hub integration; `access.test.ts` covers the DB-backed check itself.
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { encodeWsBearer } from '@shared/ws-bearer'
import type { Auth } from '@/auth/elysia-plugin'
import { wsCloseUnauthorized } from '@/auth/ws-bearer-auth'
import { createGrantRevocationHub } from './grant-revocations'
import type { ObservabilityRecorder, ProxyWsRelayFields } from './observability'
import { createUniversalProxyWsRoutes } from './ws'

const callerEmail = 'member@corp.test'

const fakeAuth: Auth = {
  api: {
    getSession: () => Promise.resolve({ user: { id: 'u1', email: callerEmail, isAnonymous: false }, session: {} }),
  },
} as unknown as Auth

const startUpstream = () => {
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(req, srv) {
      const chosen = req.headers.get('sec-websocket-protocol')?.split(',')[0]?.trim()
      if (srv.upgrade(req, { headers: chosen ? { 'sec-websocket-protocol': chosen } : undefined })) {
        return
      }
      return new Response('nope', { status: 400 })
    },
    websocket: {
      message(ws, msg) {
        ws.send(`echo:${typeof msg === 'string' ? msg : msg.toString()}`)
      },
    },
  })
  return { port: server.port as number, stop: () => server.stop(true) }
}

const agentProtocols = (agentId: string): string[] => [
  'thunderbolt.v1',
  `thunderbolt.bearer.${encodeWsBearer('any-token')}`,
  `tbproxy.agent.${Buffer.from(agentId).toString('base64url')}`,
  'acp.v1',
]

const waitForClose = (ws: WebSocket): Promise<number> =>
  new Promise((resolve) => ws.addEventListener('close', (e: CloseEvent) => resolve(e.code)))

const waitFor = async (predicate: () => boolean, timeoutMs = 5000): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) {
      return
    }
    await new Promise((r) => setTimeout(r, 5))
  }
  if (!predicate()) {
    throw new Error('waitFor timed out')
  }
}

const nextMessage = (ws: WebSocket, timeoutMs = 5000): Promise<string> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('message timeout')), timeoutMs)
    ws.addEventListener('message', (e: MessageEvent) => {
      clearTimeout(timer)
      resolve(typeof e.data === 'string' ? e.data : '')
    })
  })

describe('team-agent relay — grant-checked establishment + in-flight revocation', () => {
  const servers: Array<{ stop: () => void }> = []
  const apps: Array<{ stop: (force?: boolean) => void }> = []

  afterEach(() => {
    for (const s of servers) {
      s.stop()
    }
    for (const a of apps) {
      try {
        a.stop(true)
      } catch {
        // ignore
      }
    }
    servers.length = 0
    apps.length = 0
  })

  /** Boot a relay whose grant check consults `granted`, over a local upstream. */
  const boot = async (params: {
    granted: Map<string, string>
    hub: ReturnType<typeof createGrantRevocationHub>
    observability?: ObservabilityRecorder
  }) => {
    const upstream = startUpstream()
    servers.push(upstream)
    const routes = createUniversalProxyWsRoutes({
      auth: fakeAuth,
      grantHub: params.hub,
      observability: params.observability,
      resolveAgentAccess: async (email, agentId) => {
        const acpUrl = email === callerEmail ? params.granted.get(agentId) : undefined
        return acpUrl ? { acpUrl } : null
      },
      // Ignore the resolved public URL; connect the relay to the local upstream.
      wsFactory: (_url, protocols) => new WebSocket(`ws://127.0.0.1:${upstream.port}`, protocols) as never,
    })
    const app = new Elysia({ prefix: '/v1' }).use(routes as never)
    await new Promise<void>((resolve) => {
      app.listen({ port: 0, hostname: '127.0.0.1' }, () => resolve())
    })
    apps.push(app.server as unknown as { stop: (force?: boolean) => void })
    const port = (app as unknown as { server: { port: number } }).server.port
    return { port }
  }

  it('GRANTED: opens the session and relays a message bidirectionally', async () => {
    const hub = createGrantRevocationHub()
    const granted = new Map([['agent-ok', 'wss://agent.test/acp']])
    const { port } = await boot({ granted, hub })

    const client = new WebSocket(`ws://127.0.0.1:${port}/v1/proxy/ws`, agentProtocols('agent-ok'))
    await new Promise<void>((resolve, reject) => {
      client.addEventListener('open', () => resolve())
      client.addEventListener('error', () => reject(new Error('client errored')))
    })

    const echoed = nextMessage(client)
    client.send('ping')
    expect(await echoed).toBe('echo:ping')
    expect(hub.openCount('agent-ok')).toBe(1)
    client.close()
  })

  it('UNGRANTED: refuses establishment with close code 4001', async () => {
    const hub = createGrantRevocationHub()
    const { port } = await boot({ granted: new Map(), hub })

    const client = new WebSocket(`ws://127.0.0.1:${port}/v1/proxy/ws`, agentProtocols('agent-nope'))
    const code = await waitForClose(client)
    expect(code).toBe(wsCloseUnauthorized)
    expect(hub.openCount('agent-nope')).toBe(0)
  })

  it('AUDIT (T3): records the human INVOKER on a service-identity team-agent relay', async () => {
    // The upstream connection is anonymous (service identity — bearer stripped),
    // but the egress audit still carries the invoker's user_id (P0-7).
    const relayEvents: ProxyWsRelayFields[] = []
    const observability: ObservabilityRecorder = {
      proxyRequest: () => {},
      proxyWsRelay: (fields) => relayEvents.push(fields),
    }
    const hub = createGrantRevocationHub()
    const granted = new Map([['agent-ok', 'wss://agent.test/acp']])
    const { port } = await boot({ granted, hub, observability })

    const client = new WebSocket(`ws://127.0.0.1:${port}/v1/proxy/ws`, agentProtocols('agent-ok'))
    await new Promise<void>((resolve, reject) => {
      client.addEventListener('open', () => resolve())
      client.addEventListener('error', () => reject(new Error('client errored')))
    })
    client.close()
    // The audit event is recorded on the server-side close, which races the
    // client's close event — poll until it lands.
    await waitFor(() => relayEvents.length === 1)
    expect(relayEvents[0].user_id).toBe('u1')
  })

  it('REVOKED in-flight: an open session is closed when the grant is revoked', async () => {
    const hub = createGrantRevocationHub()
    const granted = new Map([['agent-rev', 'wss://agent.test/acp']])
    const { port } = await boot({ granted, hub })

    const client = new WebSocket(`ws://127.0.0.1:${port}/v1/proxy/ws`, agentProtocols('agent-rev'))
    await new Promise<void>((resolve, reject) => {
      client.addEventListener('open', () => resolve())
      client.addEventListener('error', () => reject(new Error('client errored')))
    })
    expect(hub.openCount('agent-rev')).toBe(1)

    const closed = waitForClose(client)
    // Grant revoked → the admin route would call this; re-validation now denies.
    granted.delete('agent-rev')
    await hub.revalidateAgent('agent-rev', async (email) => granted.has('agent-rev') && email === callerEmail)

    expect(await closed).toBe(wsCloseUnauthorized)
  })
})
