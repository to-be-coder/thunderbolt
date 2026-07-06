/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { createRecordingClient, flush, renderAdminAt } from '../test-utils'
import type { TeamAgentWithCapabilities } from '../api/types'
import { AgentDetailPage } from './agent-detail-page'

const agent: TeamAgentWithCapabilities = {
  id: 'ag-sales',
  name: 'Sales Agent',
  icon: 'chart',
  description: 'Drafts outreach and summarizes accounts.',
  acpUrl: 'wss://agents.test/sales',
  category: 'extensible',
  status: 'published',
  managedBy: 'IT',
  advertisedModels: [],
  createdAt: new Date().toISOString(),
  deletedAt: null,
  capabilities: [
    {
      id: 'cap1',
      agentId: 'ag-sales',
      label: 'Searches the web',
      credentialMode: null,
      position: 'a',
      createdAt: new Date().toISOString(),
      deletedAt: null,
    },
  ],
}

const endpointDetail = {
  models: ['claude-opus-4-8'],
  mcpServers: ['sales-mcp'],
  tools: ['search_sales'],
  credentials: [{ label: 'CRM', mode: 'as_you' }],
}

const renderDetail = () => {
  const { client, calls } = createRecordingClient((call) => {
    if (call.method === 'GET' && call.path === '/v1/admin/agents') {
      return [agent]
    }
    if (call.path === '/v1/admin/agents/describe') {
      return endpointDetail
    }
    return []
  })
  renderAdminAt('/admin/agents/ag-sales', '/admin/agents/:agentId', <AgentDetailPage />, client)
  return calls
}

describe('AgentDetailPage', () => {
  afterEach(cleanup)

  it('shows the member-facing summary and capability labels', async () => {
    renderDetail()
    await flush()

    expect(screen.getByText('What members see')).toBeInTheDocument()
    // The summary appears at the top and again inside the member card.
    expect(screen.getAllByText('Drafts outreach and summarizes accounts.').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Searches the web')).toBeInTheDocument()
  })

  it('fetches and shows the admin-only endpoint wiring', async () => {
    const calls = renderDetail()
    await flush()

    // The live descriptor is fetched from the endpoint, keyed by ACP URL.
    const probe = calls.find((call) => call.path === '/v1/admin/agents/describe')
    expect(probe?.method).toBe('POST')
    expect(probe?.body).toEqual({ acpUrl: 'wss://agents.test/sales' })

    // Admin-only wiring the member card never carries (INVARIANT 2).
    expect(screen.getByText('wss://agents.test/sales')).toBeInTheDocument()
    expect(screen.getByText('claude-opus-4-8')).toBeInTheDocument()
    expect(screen.getByText('sales-mcp')).toBeInTheDocument()
    expect(screen.getByText('search_sales')).toBeInTheDocument()
  })
})
