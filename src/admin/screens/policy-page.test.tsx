/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import type { OrgPolicy } from '../api/types'
import { createRecordingClient, flush, renderAdmin } from '../test-utils'
import { PolicyPage } from './policy-page'

const serverPolicy: OrgPolicy = {
  personalAgentPolicy: 'all',
  userModelsAllowed: true,
  mcpPolicy: 'allowlist',
  mcpAllowlist: [],
}

describe('PolicyPage', () => {
  afterEach(cleanup)

  it('save PUTs the edited policy to /v1/admin/policy', async () => {
    const { client, calls } = createRecordingClient((call) => {
      if (call.method === 'GET' && call.path === '/v1/admin/policy') {
        return serverPolicy
      }
      return call.body
    })
    renderAdmin(<PolicyPage />, client)
    await flush()

    // Add an MCP allowlist entry, then save.
    fireEvent.change(screen.getByLabelText('MCP server URL'), { target: { value: 'https://mcp.example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save policy' }))
    await flush()

    const put = calls.find((call) => call.method === 'PUT' && call.path === '/v1/admin/policy')
    expect(put).toBeDefined()
    expect(put?.body).toEqual({
      personalAgentPolicy: 'all',
      userModelsAllowed: true,
      mcpPolicy: 'allowlist',
      mcpAllowlist: ['https://mcp.example.com'],
    })
  })

  const renderAndSave = async (interact: () => void) => {
    const { client, calls } = createRecordingClient((call) =>
      call.method === 'GET' && call.path === '/v1/admin/policy' ? serverPolicy : call.body,
    )
    renderAdmin(<PolicyPage />, client)
    await flush()
    interact()
    fireEvent.click(screen.getByRole('button', { name: 'Save policy' }))
    await flush()
    return calls.find((call) => call.method === 'PUT' && call.path === '/v1/admin/policy')
  }

  it('turning off "Allow personal agents" saves company_only', async () => {
    const put = await renderAndSave(() => {
      fireEvent.click(screen.getByLabelText('Allow personal agents'))
    })
    expect((put?.body as OrgPolicy).personalAgentPolicy).toBe('company_only')
  })

  it('turning off the built-in agent (personal still on) saves no_native', async () => {
    const put = await renderAndSave(() => {
      fireEvent.click(screen.getByLabelText('Allow the built-in Thunderbolt agent'))
    })
    expect((put?.body as OrgPolicy).personalAgentPolicy).toBe('no_native')
  })

  it('the built-in-agent switch is disabled once personal agents are off', async () => {
    const { client } = createRecordingClient((call) =>
      call.method === 'GET' && call.path === '/v1/admin/policy' ? serverPolicy : call.body,
    )
    renderAdmin(<PolicyPage />, client)
    await flush()
    fireEvent.click(screen.getByLabelText('Allow personal agents')) // → company_only
    expect(screen.getByLabelText('Allow the built-in Thunderbolt agent')).toBeDisabled()
  })
})
