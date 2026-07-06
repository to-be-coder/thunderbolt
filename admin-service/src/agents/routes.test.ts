/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import type { AdminDb } from '../db/types'
import { auditEvents } from '../db/schema'
import { buildDeps, fakeUser } from '../test-utils/harness'
import { createTestDb } from '../test-utils/db'
import { createAgentsRoutes, type ConnectionProbe } from './routes'
import { getCapabilitiesForAgents, listLiveAgents } from './dal'

const adminEmail = 'admin@corp.test'

const buildApp = (db: AdminDb, probe?: ConnectionProbe, callerEmail: string = adminEmail) => {
  const deps = buildDeps({ db, user: fakeUser({ email: callerEmail }), seedAdminEmail: adminEmail })
  return new Elysia().use(createAgentsRoutes(deps, probe)) as unknown as Elysia
}

const postAgent = (app: Elysia, body: unknown) =>
  app.handle(
    new Request('http://localhost/admin/agents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

describe('agents routes', () => {
  let db: AdminDb
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    ;({ db, cleanup } = await createTestDb())
  })
  afterEach(async () => {
    await cleanup()
  })

  it('registers an agent with capabilities (category required) and audits', async () => {
    const app = buildApp(db)
    const res = await postAgent(app, {
      name: 'Legal Research',
      acpUrl: 'wss://agent.test/acp',
      category: 'sealed',
      status: 'published',
      advertisedModels: ['gpt-oss-120b'],
      capabilities: [{ label: 'Search Confluence', credentialMode: 'as_you' }],
    })
    expect(res.status).toBe(201)
    const agent = await res.json()
    expect(agent.category).toBe('sealed')

    const caps = await getCapabilitiesForAgents(db, [agent.id])
    expect(caps.map((c) => c.label)).toEqual(['Search Confluence'])

    const audit = await db.select().from(auditEvents).where(eq(auditEvents.action, 'agent.create'))
    expect(audit).toHaveLength(1)
  })

  it('rejects registration without a category (422)', async () => {
    const app = buildApp(db)
    const res = await postAgent(app, { name: 'No Category', acpUrl: 'wss://agent.test/acp' })
    expect(res.status).toBe(422)
  })

  it('connection-test returns reachable via the injected probe', async () => {
    const probe: ConnectionProbe = () => Promise.resolve({ reachable: true })
    const app = buildApp(db, probe)
    const res = await app.handle(
      new Request('http://localhost/admin/agents/connection-test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ acpUrl: 'wss://agent.test/acp' }),
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ reachable: true })
  })

  it('connection-test rejects a private ACP URL before probing', async () => {
    let probed = false
    const probe: ConnectionProbe = () => {
      probed = true
      return Promise.resolve({ reachable: true })
    }
    const app = buildApp(db, probe)
    const res = await app.handle(
      new Request('http://localhost/admin/agents/connection-test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ acpUrl: 'wss://127.0.0.1/acp' }),
      }),
    )
    const body = await res.json()
    expect(body.reachable).toBe(false)
    expect(probed).toBe(false)
  })

  it('soft-deletes an agent and audits', async () => {
    const app = buildApp(db)
    const created = await postAgent(app, { name: 'Temp', acpUrl: 'wss://agent.test/acp', category: 'extensible' }).then(
      (r) => r.json(),
    )
    const res = await app.handle(new Request(`http://localhost/admin/agents/${created.id}`, { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(await listLiveAgents(db)).toHaveLength(0)
    const audit = await db.select().from(auditEvents).where(eq(auditEvents.action, 'agent.delete'))
    expect(audit).toHaveLength(1)
  })
})
