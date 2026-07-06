/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
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
  renderAdmin(<AgentDetailPanel agent={agent} onClose={onClose} />, client)
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

    expect(screen.getByText('wss://agents.test/sales')).toBeInTheDocument()
    expect(screen.getByText('claude-opus-4-8')).toBeInTheDocument()
    expect(screen.getByText('sales-mcp')).toBeInTheDocument()
  })

  // Delete lives behind the 3-dots menu next to the title. Radix opens on
  // pointerdown for a primary click.
  const openMenu = () => {
    const trigger = screen.getByRole('button', { name: 'Agent actions' })
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' })
    fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse' })
  }

  it('renaming the title reveals Save and PATCHes the name', async () => {
    const calls = renderPanel()
    await flush()

    // No Save bar until something changes.
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sales Agent' }))
    fireEvent.change(screen.getByLabelText('Agent name'), { target: { value: 'Sales Bot' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await flush()

    const patch = calls.find((call) => call.method === 'PATCH' && call.path === '/v1/admin/agents/ag-sales')
    expect(patch).toBeDefined()
    expect((patch?.body as { name: string }).name).toBe('Sales Bot')
  })

  it('editing the endpoint reveals Save and PATCHes the acpUrl', async () => {
    const calls = renderPanel()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Edit endpoint' }))
    fireEvent.change(screen.getByLabelText('ACP URL'), { target: { value: 'wss://new.test/acp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await flush()

    const patch = calls.find((call) => call.method === 'PATCH' && call.path === '/v1/admin/agents/ag-sales')
    expect((patch?.body as { acpUrl: string }).acpUrl).toBe('wss://new.test/acp')
  })

  it('Delete (in the menu) removes the agent and closes the panel', async () => {
    let closed = false
    const calls = renderPanel(() => {
      closed = true
    })
    await flush()

    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete agent' }))
    await flush()

    const del = calls.find((call) => call.method === 'DELETE' && call.path === '/v1/admin/agents/ag-sales')
    expect(del).toBeDefined()
    expect(closed).toBe(true)
  })
})
