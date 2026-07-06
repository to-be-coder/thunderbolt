/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { createRecordingClient, flush, renderAdmin } from '../test-utils'
import { RegistryPage } from './registry-page'

const agentResponse = (name: string) => ({
  id: 'ag1',
  name,
  icon: '',
  description: '',
  acpUrl: 'wss://a.test/acp',
  category: 'sealed',
  status: 'draft',
  managedBy: '',
  advertisedModels: [],
  createdAt: new Date().toISOString(),
  deletedAt: null,
})

describe('RegistryPage', () => {
  afterEach(cleanup)

  it('register connects to the endpoint and derives the name when Name is blank', async () => {
    const { client, calls } = createRecordingClient((call) => {
      if (call.path === '/v1/admin/agents/connection-test') {
        return { reachable: true, name: 'Research' }
      }
      if (call.method === 'GET' && call.path === '/v1/admin/agents') {
        return []
      }
      return agentResponse('Research')
    })
    renderAdmin(<RegistryPage />, client)
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Register an agent' }))
    fireEvent.change(screen.getByLabelText('ACP URL'), { target: { value: 'wss://research.company.com/acp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    await flush()

    const probe = calls.find((call) => call.path === '/v1/admin/agents/connection-test')
    expect(probe?.method).toBe('POST')
    expect(probe?.body).toEqual({ acpUrl: 'wss://research.company.com/acp' })
    const post = calls.find((call) => call.method === 'POST' && call.path === '/v1/admin/agents')
    expect((post?.body as { name: string }).name).toBe('Research')
  })

  it('register POSTs a typed name without probing the endpoint', async () => {
    const { client, calls } = createRecordingClient((call) => {
      if (call.method === 'GET' && call.path === '/v1/admin/agents') {
        return []
      }
      return agentResponse('Research Bot')
    })
    renderAdmin(<RegistryPage />, client)
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Register an agent' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Research Bot' } })
    fireEvent.change(screen.getByLabelText('ACP URL'), { target: { value: 'wss://agent.test/acp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    await flush()

    expect(calls.find((call) => call.path === '/v1/admin/agents/connection-test')).toBeUndefined()
    const post = calls.find((call) => call.method === 'POST' && call.path === '/v1/admin/agents')
    expect(post).toBeDefined()
    const body = post?.body as { name: string; acpUrl: string; category: string; status: string }
    expect(body.name).toBe('Research Bot')
    expect(body.acpUrl).toBe('wss://agent.test/acp')
    expect(body.category).toBe('sealed')
    // v1 has no draft/published control (that's P1-2); new agents register live.
    expect(body.status).toBe('published')
  })
})
