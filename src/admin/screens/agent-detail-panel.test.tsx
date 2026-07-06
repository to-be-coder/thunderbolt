/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { createRecordingClient, flush, renderAdmin } from '../test-utils'
import type { TeamAgentWithCapabilities } from '../api/types'
import { AgentDetailPanel } from './agent-detail-panel'

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
  capabilities: [],
}

const endpointDetail = {
  models: ['claude-opus-4-8'],
  mcpServers: ['sales-mcp'],
  tools: ['search_sales'],
  credentials: [],
}

const renderPanel = (onClose: () => void = () => {}) => {
  const { client, calls } = createRecordingClient((call) => {
    if (call.path === '/v1/admin/agents/describe') {
      return endpointDetail
    }
    if (call.path === '/v1/admin/agents/status') {
      return { state: 'ready' }
    }
    return []
  })
  // The panel renders a SheetTitle, so it must live inside a Sheet.
  renderAdmin(
    <Sheet open>
      <SheetContent>
        <AgentDetailPanel agent={agent} onClose={onClose} />
      </SheetContent>
    </Sheet>,
    client,
  )
  return calls
}

describe('AgentDetailPanel', () => {
  afterEach(cleanup)

  it('shows the admin-only endpoint wiring fetched from the endpoint', async () => {
    const calls = renderPanel()
    await flush()

    const probe = calls.find((call) => call.path === '/v1/admin/agents/describe')
    expect(probe?.method).toBe('POST')
    expect(probe?.body).toEqual({ acpUrl: 'wss://agents.test/sales' })

    expect(screen.getByText('Admin view')).toBeInTheDocument()
    expect(screen.getByText('wss://agents.test/sales')).toBeInTheDocument()
    expect(screen.getByText('claude-opus-4-8')).toBeInTheDocument()
    expect(screen.getByText('sales-mcp')).toBeInTheDocument()
  })

  it('Edit opens the agent form pre-filled from the agent', async () => {
    renderPanel()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await flush()

    expect(screen.getByLabelText('ACP URL')).toHaveValue('wss://agents.test/sales')
  })

  it('Delete removes the agent and closes the panel', async () => {
    let closed = false
    const calls = renderPanel(() => {
      closed = true
    })
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete agent' }))
    await flush()

    const del = calls.find((call) => call.method === 'DELETE' && call.path === '/v1/admin/agents/ag-sales')
    expect(del).toBeDefined()
    expect(closed).toBe(true)
  })
})
