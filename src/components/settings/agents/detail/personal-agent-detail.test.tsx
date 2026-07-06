/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import type { Agent } from '@/types/acp'
import { PersonalAgentDetail } from './personal-agent-detail'

afterEach(() => {
  cleanup()
})

const agent: Agent = {
  id: 'custom-1',
  name: 'my-cli-agent',
  type: 'remote-acp',
  transport: 'websocket',
  url: 'wss://home.example.dev/agent',
  description: null,
  icon: null,
  isSystem: 0,
  enabled: 1,
  deletedAt: null,
  userId: 'user-1',
}

const onlineStatus = (() => ({ status: 'online' as const, refresh: () => {} })) as never

const renderDetail = (overrides: { onRemove?: () => void; useAcpAgentStatus?: never } = {}) =>
  render(
    <PersonalAgentDetail
      agent={agent}
      onBack={() => {}}
      onRemove={overrides.onRemove ?? (() => {})}
      useAcpAgentStatus={overrides.useAcpAgentStatus ?? onlineStatus}
    />,
  )

describe('PersonalAgentDetail', () => {
  it('renders the endpoint and connected status', () => {
    renderDetail()
    expect(screen.getByTestId('personal-endpoint')).toHaveTextContent('wss://home.example.dev/agent')
    expect(screen.getByTestId('personal-status')).toHaveTextContent('Connected')
  })

  it('re-probes when Test is clicked', () => {
    const refresh = mock(() => {})
    const stub = (() => ({ status: 'online' as const, refresh })) as never
    renderDetail({ useAcpAgentStatus: stub })
    fireEvent.click(screen.getByTestId('personal-test'))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('gently explains the seal in the About block', () => {
    renderDetail()
    expect(screen.getByText(/your Library items/i)).toHaveTextContent(/don.?t apply here/i)
  })

  it('is read-only apart from Test and Remove — no Start a chat', () => {
    renderDetail()
    expect(screen.queryByTestId('agent-start-chat')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('removes the reference (nothing remote) after confirmation', () => {
    const onRemove = mock(() => {})
    renderDetail({ onRemove })
    fireEvent.click(screen.getByTestId('personal-remove'))
    fireEvent.click(screen.getByTestId('personal-remove-confirm'))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
