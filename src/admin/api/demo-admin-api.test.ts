/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import { createDemoAdminApi } from './demo-admin-api'

describe('demo admin api', () => {
  it('reports the caller as an admin (unhides the console gate)', async () => {
    const api = createDemoAdminApi()
    expect((await api.getMe()).isAdmin).toBe(true)
  })

  it('seeds a demo org: members, groups, published agents, a grant', async () => {
    const api = createDemoAdminApi()
    expect((await api.listMembers()).length).toBeGreaterThanOrEqual(3)
    expect((await api.listGroups()).map((g) => g.name)).toContain('Sales')
    const agents = await api.listAgents()
    expect(agents.map((a) => a.name)).toEqual(expect.arrayContaining(['Sales Agent', 'Finance KB']))
    expect(agents.find((a) => a.name === 'Sales Agent')?.category).toBe('extensible')
    expect(agents.find((a) => a.name === 'Finance KB')?.category).toBe('sealed')
    expect((await api.listGrants()).length).toBeGreaterThanOrEqual(1)
  })

  it('applies mutations against the in-memory store and audits them', async () => {
    const api = createDemoAdminApi()

    const member = await api.inviteMember({ email: 'newhire@demo.thunderbolt' })
    expect(member.status).toBe('invited')
    expect((await api.listMembers()).some((m) => m.email === 'newhire@demo.thunderbolt')).toBe(true)

    const group = await api.createGroup('Support')
    expect((await api.listGroups()).some((g) => g.id === group.id)).toBe(true)

    const grant = await api.createGrant({ agentId: 'x', targetType: 'group', targetId: group.id })
    await api.revokeGrant(grant.id)
    expect((await api.listGrants()).some((g) => g.id === grant.id)).toBe(false)

    const audit = await api.listAudit()
    expect(audit.map((e) => e.action)).toEqual(
      expect.arrayContaining(['member.invite', 'group.create', 'grant.create', 'grant.revoke']),
    )
  })

  it('soft-deletes removed members so they drop from the list', async () => {
    const api = createDemoAdminApi()
    const [first] = await api.listMembers()
    await api.removeMember(first.id)
    expect((await api.listMembers()).some((m) => m.id === first.id)).toBe(false)
  })
})
