/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { useChatStore } from '@/chats/chat-store'
import { resetTestDatabase, setupTestDatabase, teardownTestDatabase } from '@/dal/test-utils'
import { builtInAgent } from '@/defaults/agents'
import {
  createMockChatInstance,
  createMockChatThread,
  createMockModel,
  hydrateStore,
  resetStore,
} from '@/test-utils/chat-store-mocks'
import { createQueryTestWrapper } from '@/test-utils/react-query'
import { extensibleTeamAgent, sealedTeamAgent, teamAgentCardFixtures } from '@/test-utils/agent-card-fixtures'
import type { Agent } from '@/types/acp'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { ChatAgentSelector } from './chat-agent-selector'

const personalAgent: Agent = {
  id: 'personal-1',
  name: 'My Remote Agent',
  type: 'remote-acp',
  transport: 'websocket',
  url: 'wss://example.com',
  description: null,
  icon: null,
  isSystem: 0,
  enabled: 1,
  deletedAt: null,
  userId: 'user-1',
}

const QueryWrapper = createQueryTestWrapper()
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <QueryWrapper>{children}</QueryWrapper>
  </MemoryRouter>
)

const useTeamAgentsFixture = () => teamAgentCardFixtures
const useAgentsFixture = () => [personalAgent]

const setup = () => {
  hydrateStore({
    chatInstance: createMockChatInstance(),
    chatThread: createMockChatThread(),
    id: 'thread-1',
    models: [createMockModel()],
    selectedModel: createMockModel(),
    triggerData: null,
  })
}

const renderSelector = (readOnly: boolean) =>
  render(<ChatAgentSelector readOnly={readOnly} useTeamAgents={useTeamAgentsFixture} useAgents={useAgentsFixture} />, {
    wrapper: TestWrapper,
  })

describe('ChatAgentSelector', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })
  afterAll(async () => {
    await teardownTestDatabase()
  })
  beforeEach(() => {
    resetStore()
    setup()
  })
  afterEach(async () => {
    cleanup()
    resetStore()
    await resetTestDatabase()
  })

  it('shows both sections when opened on an empty thread', async () => {
    renderSelector(false)

    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-agent-selector-trigger'))
    })

    // No section headers inside the dropdown — assert the items from both the
    // company group and the member's own group are present.
    expect(screen.getAllByText('Thunderbolt').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('My Remote Agent')).toBeInTheDocument()
    expect(screen.getByText(sealedTeamAgent.name)).toBeInTheDocument()
    expect(screen.getByText(extensibleTeamAgent.name)).toBeInTheDocument()
  })

  it('sets a team agentRef when a company agent is picked', async () => {
    renderSelector(false)

    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-agent-selector-trigger'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText(sealedTeamAgent.name))
    })

    await waitFor(() => {
      const session = useChatStore.getState().sessions.get('thread-1')
      expect(session?.chatThread?.agentKind).toBe('team')
      expect(session?.chatThread?.agentId).toBe(sealedTeamAgent.id)
      expect(session?.selectedAgent.id).toBe(sealedTeamAgent.id)
    })
  })

  it('sets a personal agentRef when a personal agent is picked', async () => {
    renderSelector(false)

    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-agent-selector-trigger'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('My Remote Agent'))
    })

    await waitFor(() => {
      const session = useChatStore.getState().sessions.get('thread-1')
      expect(session?.chatThread?.agentKind).toBe('personal')
      expect(session?.chatThread?.agentId).toBe(personalAgent.id)
    })
  })

  it('sets the thunderbolt agentRef when the Thunderbolt agent is picked', async () => {
    // Start from a personal selection so picking Thunderbolt is an observable change.
    useChatStore.setState((state) => {
      const session = state.sessions.get('thread-1')!
      const next = new Map(state.sessions)
      next.set('thread-1', { ...session, selectedAgent: personalAgent })
      return { sessions: next }
    })
    renderSelector(false)

    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-agent-selector-trigger'))
    })
    await act(async () => {
      // Thunderbolt appears both in the trigger and the menu; the menu item is the last match.
      const matches = screen.getAllByText('Thunderbolt')
      fireEvent.click(matches[matches.length - 1])
    })

    await waitFor(() => {
      const session = useChatStore.getState().sessions.get('thread-1')
      expect(session?.chatThread?.agentKind).toBe('thunderbolt')
      expect(session?.selectedAgent.id).toBe(builtInAgent.id)
    })
  })

  it('renders read-only and inert on a thread with messages — tapping does nothing', () => {
    renderSelector(true)

    const readonly = screen.getByTestId('chat-agent-selector-readonly')
    fireEvent.click(readonly)

    // The agent is locked once the conversation starts: no picker opens and the
    // control carries no chevron affordance.
    expect(screen.queryByText('From your organization')).toBeNull()
    expect(screen.queryByText('Yours')).toBeNull()
    expect(readonly.querySelector('.lucide-chevron-down')).toBeNull()
  })
})
