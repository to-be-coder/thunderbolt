/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Elysia, t } from 'elysia'
import type { ServiceDeps } from '../lib/context'
import { authorizeAdmin } from '../lib/context'
import { writeAudit } from '../audit/audit'
import {
  getCapabilitiesForAgents,
  getLiveAgentById,
  insertAgent,
  listLiveAgents,
  softDeleteAgent,
  updateAgent,
} from './dal'
import { testAcpConnection, type TestAcpConnectionResult } from './connection-test'
import { validateAcpUrl } from './url-validation'

/** Injected ACP probe — defaults to the real one; tests pass a fake to avoid a
 *  live socket. */
export type ConnectionProbe = (url: string) => Promise<TestAcpConnectionResult>

const defaultProbe: ConnectionProbe = (url) => testAcpConnection({ url })

const capabilityBody = t.Object({
  label: t.String({ minLength: 1 }),
  credentialMode: t.Optional(t.Union([t.Literal('as_you'), t.Literal('service_account')])),
})

/**
 * Team-agent registry CRUD + connection test.
 *
 *  POST   /admin/agents                  register (category REQUIRED)
 *  GET    /admin/agents                  list live agents (+ capabilities)
 *  PATCH  /admin/agents/:id              edit
 *  DELETE /admin/agents/:id              soft delete
 *  POST   /admin/agents/connection-test  probe an ACP endpoint for reachability
 */
export const createAgentsRoutes = (deps: ServiceDeps, probe: ConnectionProbe = defaultProbe) =>
  new Elysia({ name: 'admin-agents', prefix: '/admin/agents' })
    .post(
      '/connection-test',
      async ({ body, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }
        const validated = validateAcpUrl(body.acpUrl)
        if (!validated.ok) {
          return { reachable: false, error: validated.error }
        }
        return probe(validated.url)
      },
      { body: t.Object({ acpUrl: t.String({ minLength: 1 }) }) },
    )
    .post(
      '/',
      async ({ body, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }

        const agent = await deps.db.transaction(async (tx) => {
          const created = await insertAgent(tx, body)
          await writeAudit(tx, {
            actor: authz.value.email,
            action: 'agent.create',
            target: `agent:${created.id}`,
            diff: { name: created.name, category: created.category, status: created.status },
          })
          return created
        })

        set.status = 201
        return agent
      },
      {
        body: t.Object({
          name: t.String({ minLength: 1 }),
          icon: t.Optional(t.String()),
          description: t.Optional(t.String()),
          acpUrl: t.String({ minLength: 1 }),
          category: t.Union([t.Literal('sealed'), t.Literal('extensible')]),
          status: t.Optional(t.Union([t.Literal('draft'), t.Literal('published')])),
          managedBy: t.Optional(t.String()),
          advertisedModels: t.Optional(t.Array(t.String())),
          capabilities: t.Optional(t.Array(capabilityBody)),
        }),
      },
    )
    .get('/', async ({ request, set }) => {
      const authz = await authorizeAdmin(deps, request.headers)
      if (!authz.ok) {
        set.status = authz.status
        return authz.body
      }
      const agents = await listLiveAgents(deps.db)
      const capabilities = await getCapabilitiesForAgents(
        deps.db,
        agents.map((agent) => agent.id),
      )
      return agents.map((agent) => ({
        ...agent,
        capabilities: capabilities.filter((cap) => cap.agentId === agent.id),
      }))
    })
    .patch(
      '/:id',
      async ({ params, body, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }
        const existing = await getLiveAgentById(deps.db, params.id)
        if (!existing) {
          set.status = 404
          return { error: 'Agent not found' }
        }

        const updated = await deps.db.transaction(async (tx) => {
          const result = await updateAgent(tx, params.id, body)
          await writeAudit(tx, {
            actor: authz.value.email,
            action: 'agent.update',
            target: `agent:${params.id}`,
            diff: { patch: body },
          })
          return result
        })
        return updated
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          name: t.Optional(t.String({ minLength: 1 })),
          icon: t.Optional(t.String()),
          description: t.Optional(t.String()),
          acpUrl: t.Optional(t.String({ minLength: 1 })),
          category: t.Optional(t.Union([t.Literal('sealed'), t.Literal('extensible')])),
          status: t.Optional(t.Union([t.Literal('draft'), t.Literal('published')])),
          managedBy: t.Optional(t.String()),
          advertisedModels: t.Optional(t.Array(t.String())),
          capabilities: t.Optional(t.Array(capabilityBody)),
        }),
      },
    )
    .delete(
      '/:id',
      async ({ params, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }
        const existing = await getLiveAgentById(deps.db, params.id)
        if (!existing) {
          set.status = 404
          return { error: 'Agent not found' }
        }
        await deps.db.transaction(async (tx) => {
          await softDeleteAgent(tx, params.id)
          await writeAudit(tx, {
            actor: authz.value.email,
            action: 'agent.delete',
            target: `agent:${params.id}`,
            diff: { name: existing.name },
          })
        })
        return { success: true }
      },
      { params: t.Object({ id: t.String() }) },
    )
