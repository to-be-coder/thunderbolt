/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import type { OrgPolicy } from '../api/types'
import { createRecordingClient, flush, renderAdmin } from '../test-utils'
import { PolicyPage } from './policy-page'

const serverPolicy: OrgPolicy = { personalAgentPolicy: 'all', userModelsAllowed: true, mcpAllowlist: [] }

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
      mcpAllowlist: ['https://mcp.example.com'],
    })
  })
})
