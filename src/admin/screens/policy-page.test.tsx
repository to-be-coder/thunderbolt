/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import type { OrgPolicy } from '../api/types'
import { createRecordingClient, flush, renderAdmin } from '../test-utils'
import { PolicyPage } from './policy-page'

const serverPolicy: OrgPolicy = {
  personalAgentPolicy: 'all',
  userModelsAllowed: true,
  mcpPolicy: 'allowlist',
  mcpAllowlist: [],
  blockedExtensions: [],
  blockedIntegrations: [],
}

describe('PolicyPage', () => {
  afterEach(cleanup)

  const setup = () => {
    const { client, calls } = createRecordingClient((call) =>
      call.method === 'GET' && call.path === '/v1/admin/policy' ? serverPolicy : call.body,
    )
    renderAdmin(<PolicyPage />, client)
    return calls
  }
  type Calls = ReturnType<typeof setup>
  // The last policy PUT — each toggle auto-persists, so a two-toggle test emits
  // two PUTs and we assert on the final one.
  const lastPolicyPut = (calls: Calls) =>
    [...calls].reverse().find((call) => call.method === 'PUT' && call.path === '/v1/admin/policy')
  // Toggle + flush so React re-renders between clicks (fresh draft closure).
  const toggle = async (label: string) => {
    await act(async () => {
      fireEvent.click(screen.getByLabelText(label))
    })
    await flush()
  }

  it('has NO Save button — toggling user models persists immediately', async () => {
    const calls = setup()
    await flush()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()

    await toggle('Allow user models')
    expect(lastPolicyPut(calls)?.body).toEqual({
      personalAgentPolicy: 'all',
      userModelsAllowed: false,
      mcpPolicy: 'allowlist',
      mcpAllowlist: [],
      blockedExtensions: [],
      blockedIntegrations: [],
    })
    // The moved controls are no longer on this page.
    expect(screen.queryByLabelText('MCP server URL')).not.toBeInTheDocument()
  })

  it('turning off "Allow personal agents" persists native_only (built-in stays on)', async () => {
    const calls = setup()
    await flush()
    await toggle('Allow personal agents')
    expect((lastPolicyPut(calls)?.body as OrgPolicy).personalAgentPolicy).toBe('native_only')
  })

  it('turning off the built-in agent (personal still on) persists no_native', async () => {
    const calls = setup()
    await flush()
    await toggle('Allow the built-in Thunderbolt agent')
    expect((lastPolicyPut(calls)?.body as OrgPolicy).personalAgentPolicy).toBe('no_native')
  })

  it('the built-in-agent switch stays enabled and toggleable once personal agents are off', async () => {
    setup()
    await flush()
    await toggle('Allow personal agents') // → native_only
    expect(screen.getByLabelText('Allow the built-in Thunderbolt agent')).not.toBeDisabled()
    expect(screen.getByLabelText('Allow the built-in Thunderbolt agent')).toBeChecked()
  })

  it('turning BOTH off persists company_only', async () => {
    const calls = setup()
    await flush()
    await toggle('Allow personal agents')
    await toggle('Allow the built-in Thunderbolt agent')
    expect((lastPolicyPut(calls)?.body as OrgPolicy).personalAgentPolicy).toBe('company_only')
  })
})
