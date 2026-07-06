/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, screen } from '@testing-library/react'
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
    if (call.path === '/v1/admin/agents/status') {
      return { state: 'ready' }
    }
    return []
  })
  renderAdminAt('/admin/agents/ag-sales', '/admin/agents/:agentId', <AgentDetailPage />, client)
  return calls
}

describe('AgentDetailPage', () => {
  afterEach(cleanup)

  it('shows the agent name and no member-preview section', async () => {
    renderDetail()
    await flush()

    expect(screen.getByText('Sales Agent')).toBeInTheDocument()
    expect(screen.queryByText('What members see')).not.toBeInTheDocument()
    expect(screen.queryByText('Drafts outreach and summarizes accounts.')).not.toBeInTheDocument()
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

  it('Edit opens the agent form pre-filled from the agent', async () => {
    renderDetail()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await flush()

    expect(screen.getByLabelText('ACP URL')).toHaveValue('wss://agents.test/sales')
  })

  it('Delete removes the agent via DELETE', async () => {
    const calls = renderDetail()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete agent' }))
    await flush()

    const del = calls.find((call) => call.method === 'DELETE' && call.path === '/v1/admin/agents/ag-sales')
    expect(del).toBeDefined()
  })
})
