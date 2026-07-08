/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { MemoryRouter } from 'react-router'
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

const reachableProbe = (async () => ({ success: true }) as const) as never

const fakeUseEnabledSkills = (enabledCount: number) =>
  (() => ({
    isEnabled: () => true,
    setEnabled: async () => {},
    enabledCount,
  })) as unknown as typeof import('@/skills/use-skills').useEnabledSkills

const renderDetail = (overrides: { onRemove?: () => void; testAcpConnection?: never } = {}) =>
  render(
    <MemoryRouter>
      <PersonalAgentDetail
        agent={agent}
        onBack={() => {}}
        onRemove={overrides.onRemove ?? (() => {})}
        testAcpConnection={overrides.testAcpConnection ?? reachableProbe}
        useEnabledSkills={fakeUseEnabledSkills(4)}
      />
    </MemoryRouter>,
  )

describe('PersonalAgentDetail', () => {
  it('shows the endpoint and a Last-connected status on view (last-known from connect, no probe)', () => {
    renderDetail()
    expect(screen.getByTestId('personal-endpoint')).toHaveValue('wss://home.example.dev/agent')
    expect(screen.getByTestId('personal-status')).toHaveTextContent('Last connected')
  })

  it('probes on demand when Test is clicked and shows the result', async () => {
    const probe = mock(async () => ({ success: true }) as const) as never
    renderDetail({ testAcpConnection: probe })
    await act(async () => {
      fireEvent.click(screen.getByTestId('personal-test'))
    })
    expect(probe).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('personal-status')).toHaveTextContent('Last connected')
  })

  it('mirrors the admin wiring fields (Models / MCP servers / Tools), no Category or tabs', () => {
    renderDetail()
    expect(screen.getByText('Models')).toBeInTheDocument()
    expect(screen.getByText('MCP servers')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
    // A personal agent is never shared, so there is no Category or Access tab.
    expect(screen.queryByText('Category')).not.toBeInTheDocument()
    expect(screen.queryByText('Access')).not.toBeInTheDocument()
  })

  it('shows a Skills section — agent skills plus your Library skills', () => {
    renderDetail()
    // Demo env derives 3 skills from the endpoint; Library count comes from the hook.
    expect(screen.getByTestId('agent-skills-count')).toHaveTextContent('Agent Skills (3)')
    expect(screen.getByTestId('library-skills-line')).toHaveTextContent('Skills from your library (4)')
  })

  it('exposes editable name + endpoint inputs, and no Start a chat', () => {
    renderDetail()
    expect(screen.queryByTestId('agent-start-chat')).not.toBeInTheDocument()
    // The member can edit their own agent's name and endpoint directly.
    expect(screen.getByLabelText('Agent name')).toBeInTheDocument()
    expect(screen.getByLabelText('ACP URL')).toBeInTheDocument()
  })

  it('removes the reference (nothing remote) after confirmation', () => {
    const onRemove = mock(() => {})
    renderDetail({ onRemove })
    // Remove lives behind the 3-dots menu; Radix opens on pointerdown.
    const trigger = screen.getByTestId('personal-menu')
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' })
    fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse' })
    fireEvent.click(screen.getByTestId('personal-remove'))
    fireEvent.click(screen.getByTestId('personal-remove-confirm'))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
