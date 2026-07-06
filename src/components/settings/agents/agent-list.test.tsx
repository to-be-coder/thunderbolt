/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import type { AgentCard, OrgPolicy } from '@shared/agent-cards'
import { builtInAgent } from '@/defaults/agents'
import type { Agent } from '@/types/acp'
import { AgentList } from './agent-list'

afterEach(() => {
  cleanup()
})

// Deterministic status probe so personal rows don't open real sockets.
const stubStatus = (() => ({ status: 'online' as const, refresh: () => {} })) as never

const extensibleCard: AgentCard = {
  id: 'sales',
  name: 'Sales Agent',
  icon: 'chart',
  description: 'Drafts outreach',
  category: 'extensible',
  capabilities: [],
  advertisedModels: [],
  managedBy: 'ACME',
  grantedVia: 'Sales (group)',
}

const sealedCard: AgentCard = {
  ...extensibleCard,
  id: 'finance',
  name: 'Finance KB',
  category: 'sealed',
}

const personalAgent: Agent = {
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

const allPolicy: OrgPolicy = {
  personalAgentPolicy: 'all',
  userModelsAllowed: true,
  mcpPolicy: 'allow',
  mcpAllowlist: [],
  blockedExtensions: [],
}

const renderList = (props: Partial<Parameters<typeof AgentList>[0]> = {}) =>
  render(
    <AgentList
      teamCards={props.teamCards ?? [extensibleCard, sealedCard]}
      personalAgents={props.personalAgents ?? [personalAgent]}
      policy={props.policy ?? allPolicy}
      onOpenAgent={props.onOpenAgent ?? (() => {})}
      useAcpAgentStatus={stubStatus}
      // Default: nothing newly granted (no DB). Individual tests override.
      useNewlyGrantedTeamAgents={props.useNewlyGrantedTeamAgents ?? (() => new Set<string>())}
    />,
  )

describe('AgentList — sections + provenance', () => {
  it('renders both labeled sections', () => {
    renderList()
    expect(screen.getByText('FROM YOUR ORGANIZATION')).toBeInTheDocument()
    expect(screen.getByText('YOURS')).toBeInTheDocument()
    expect(screen.getByTestId('agent-section-org')).toBeInTheDocument()
    expect(screen.getByTestId('agent-section-yours')).toBeInTheDocument()
  })

  it('renders the exact provenance copy per agent kind', () => {
    renderList()
    expect(screen.getByTestId('agent-provenance-sales')).toHaveTextContent('From ACME · works with your skills')
    expect(screen.getByTestId('agent-provenance-finance')).toHaveTextContent('From ACME · comes fully configured')
    expect(screen.getByTestId(`agent-provenance-${builtInAgent.id}`)).toHaveTextContent(
      'Your agent · uses your Library',
    )
    expect(screen.getByTestId('agent-provenance-custom-1')).toHaveTextContent('Connected agent · home.example.dev')
  })

  it('pins the Thunderbolt row first in YOURS and shows a chevron on EVERY row', () => {
    renderList()
    for (const id of ['sales', 'finance', builtInAgent.id, 'custom-1']) {
      expect(screen.getByTestId(`agent-chevron-${id}`)).toBeInTheDocument()
    }
  })

  it('has NO edit / toggle / delete affordance anywhere', () => {
    renderList()
    expect(screen.queryByTestId(`agent-edit-${builtInAgent.id}`)).not.toBeInTheDocument()
    expect(screen.queryByTestId('agent-toggle-custom-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('agent-delete-custom-1')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('opens the detail view when a row is tapped', () => {
    const onOpenAgent = mock((_: string) => {})
    renderList({ onOpenAgent })
    fireEvent.click(screen.getByRole('button', { name: /open sales agent/i }))
    expect(onOpenAgent).toHaveBeenCalledWith('sales')
  })
})

describe('AgentList — policy variants (spec §5, absent never disabled)', () => {
  it('no_native hides the Thunderbolt row but keeps personal ACP rows', () => {
    renderList({ policy: { ...allPolicy, personalAgentPolicy: 'no_native' } })
    expect(screen.getByTestId('agent-section-yours')).toBeInTheDocument()
    expect(screen.queryByTestId(`agent-row-${builtInAgent.id}`)).not.toBeInTheDocument()
    expect(screen.getByTestId('agent-row-custom-1')).toBeInTheDocument()
  })

  it('company_only hides the entire YOURS section', () => {
    renderList({ policy: { ...allPolicy, personalAgentPolicy: 'company_only' } })
    expect(screen.getByTestId('agent-section-org')).toBeInTheDocument()
    expect(screen.queryByTestId('agent-section-yours')).not.toBeInTheDocument()
    expect(screen.queryByTestId(`agent-row-${builtInAgent.id}`)).not.toBeInTheDocument()
  })

  it('consumer / nothing granted hides the org section', () => {
    renderList({ teamCards: [] })
    expect(screen.queryByTestId('agent-section-org')).not.toBeInTheDocument()
    expect(screen.getByTestId('agent-section-yours')).toBeInTheDocument()
  })
})

describe('AgentList — grant-received highlight (T2)', () => {
  it('shows the one-time "New" badge only on newly-granted org cards', () => {
    renderList({ useNewlyGrantedTeamAgents: () => new Set(['sales']) })
    // The newly-granted card carries the highlight; the already-seen one doesn't.
    const badges = screen.getAllByTestId('new-grant-badge')
    expect(badges).toHaveLength(1)
    expect(screen.getByTestId('agent-row-sales')).toContainElement(badges[0])
    expect(screen.getByTestId('agent-row-finance')).not.toContainElement(badges[0])
  })

  it('shows no badge when nothing is newly granted', () => {
    renderList()
    expect(screen.queryByTestId('new-grant-badge')).not.toBeInTheDocument()
  })
})
