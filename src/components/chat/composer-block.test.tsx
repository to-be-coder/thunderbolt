/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { MemoryRouter } from 'react-router'
import type { AgentDescriptor } from '@/chats/agent-descriptor'
import { ComposerBlock, resolveComposerBlock } from './composer-block'

const descriptor = (over: Partial<AgentDescriptor>): AgentDescriptor => ({
  kind: 'thunderbolt',
  id: 'thunderbolt-built-in',
  name: 'Thunderbolt',
  icon: null,
  category: null,
  advertisedModels: [],
  capabilities: [],
  card: null,
  revoked: false,
  ...over,
})

afterEach(cleanup)

describe('resolveComposerBlock', () => {
  it('blocks a revoked team grant', () => {
    const state = resolveComposerBlock({
      descriptor: descriptor({ kind: 'team', revoked: true }),
      connectionStatus: 'idle',
      connectionError: null,
      modelCount: 3,
    })
    expect(state).toEqual({ kind: 'revoked' })
  })

  it('blocks an offline personal ACP agent', () => {
    const state = resolveComposerBlock({
      descriptor: descriptor({ kind: 'personal' }),
      connectionStatus: 'error',
      connectionError: new Error('down'),
      modelCount: 3,
    })
    expect(state).toEqual({ kind: 'offline' })
  })

  it('blocks the Thunderbolt agent when no models are connected', () => {
    const state = resolveComposerBlock({
      descriptor: descriptor({ kind: 'thunderbolt' }),
      connectionStatus: 'idle',
      connectionError: null,
      modelCount: 0,
    })
    expect(state).toEqual({ kind: 'no-models' })
  })

  it('does not block a healthy Thunderbolt agent', () => {
    const state = resolveComposerBlock({
      descriptor: descriptor({ kind: 'thunderbolt' }),
      connectionStatus: 'idle',
      connectionError: null,
      modelCount: 2,
    })
    expect(state).toBeNull()
  })
})

describe('ComposerBlock', () => {
  it('shows the revoked banner', () => {
    render(
      <MemoryRouter>
        <ComposerBlock
          state={{ kind: 'revoked' }}
          descriptor={descriptor({ kind: 'team', revoked: true })}
          agentUrl={null}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert').textContent ?? '').toMatch(/access to this agent was removed/i)
  })

  it('deep-links to Settings → Models when no model is connected', () => {
    render(
      <MemoryRouter>
        <ComposerBlock state={{ kind: 'no-models' }} descriptor={descriptor({})} agentUrl={null} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Connect a model')).toBeInTheDocument()
  })

  it('offers a Test affordance for an offline agent and reports the probe result', async () => {
    const testAcpConnection = mock(async () => ({ success: false as const, error: 'Could not reach agent' }))
    render(
      <MemoryRouter>
        <ComposerBlock
          state={{ kind: 'offline' }}
          descriptor={descriptor({ kind: 'personal', name: 'My Agent' })}
          agentUrl="wss://example.com"
          testAcpConnection={testAcpConnection}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/is offline/i)).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByText('Test connection'))
    })

    expect(testAcpConnection).toHaveBeenCalledWith({ url: 'wss://example.com' })
    await waitFor(() => expect(screen.getByText('Could not reach agent')).toBeInTheDocument())
  })
})
