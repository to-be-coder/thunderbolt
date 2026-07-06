/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import type { Grant, TeamAgentWithCapabilities } from '../api/types'
import { createRecordingClient, flush, renderAdmin } from '../test-utils'
import { GrantsPage, revocationConsequenceCopy } from './grants-page'

const agent: TeamAgentWithCapabilities = {
  id: 'ag1',
  name: 'Research Bot',
  icon: '',
  description: '',
  acpUrl: 'wss://a.test/acp',
  category: 'sealed',
  status: 'published',
  managedBy: '',
  advertisedModels: [],
  createdAt: new Date().toISOString(),
  deletedAt: null,
  capabilities: [],
}

const grant: Grant = {
  id: 'gr1',
  agentId: 'ag1',
  targetType: 'group',
  targetId: 'g1',
  createdAt: new Date().toISOString(),
  deletedAt: null,
}

const handler = (path: string) => {
  if (path === '/v1/admin/grants') {
    return [grant]
  }
  if (path === '/v1/admin/agents') {
    return [agent]
  }
  if (path === '/v1/admin/groups') {
    return [{ id: 'g1', name: 'Legal', createdAt: new Date().toISOString(), deletedAt: null }]
  }
  return []
}

describe('GrantsPage', () => {
  afterEach(cleanup)

  it('shows the verbatim revocation-consequence copy next to the revoke action', async () => {
    const { client } = createRecordingClient((call) => handler(call.path))
    renderAdmin(<GrantsPage />, client)
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    await flush()

    expect(screen.getByText(revocationConsequenceCopy)).toBeInTheDocument()
    expect(revocationConsequenceCopy).toBe(
      'Revocation is total: running tasks terminate immediately, sessions invalidate on next refresh, no cached recipe remains.',
    )
  })

  it('revoke DELETEs the grant at /v1/admin/grants/:id', async () => {
    const { client, calls } = createRecordingClient((call) => handler(call.path))
    renderAdmin(<GrantsPage />, client)
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    await flush()
    fireEvent.click(screen.getByRole('button', { name: 'Revoke access' }))
    await flush()

    const del = calls.find((call) => call.method === 'DELETE' && call.path === '/v1/admin/grants/gr1')
    expect(del).toBeDefined()
  })
})
