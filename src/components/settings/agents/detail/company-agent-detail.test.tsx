/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { SEALED_SKILLS_MESSAGE } from '@/lib/agent-copy'
import { MemoryRouter } from 'react-router'
import type { AgentCard } from '@shared/agent-cards'
import { CompanyAgentDetail } from './company-agent-detail'

/** Fake `useEnabledSkills` returning a fixed enabled count — the member card's
 *  skills line reads only this, never the agent's ACP-carried skills. */
const fakeUseEnabledSkills = (enabledCount: number) =>
  (() => ({
    isEnabled: () => true,
    setEnabled: async () => {},
    enabledCount,
  })) as unknown as typeof import('@/skills/use-skills').useEnabledSkills

afterEach(() => {
  cleanup()
})

const baseCard: AgentCard = {
  id: 'sales',
  name: 'Sales Agent',
  icon: 'chart',
  description: 'Drafts outreach, summarizes accounts, and answers pipeline questions.',
  category: 'extensible',
  capabilities: [],
  advertisedModels: [],
  integrations: ['Salesforce', 'Web search'],
  toolKinds: ['read', 'delete', 'fetch'],
  accepts: ['images', 'context'],
  modes: ['Ask', 'Autonomous'],
  managedBy: 'ACME IT',
  grantedVia: 'Sales (group)',
}

const renderCard = (card: AgentCard, enabledCount = 24) =>
  render(
    <MemoryRouter>
      <CompanyAgentDetail card={card} onBack={() => {}} useEnabledSkills={fakeUseEnabledSkills(enabledCount)} />
    </MemoryRouter>,
  )

describe('CompanyAgentDetail', () => {
  it('renders the granted-via subtitle and description', () => {
    renderCard(baseCard)
    expect(screen.getByText('Granted via Sales (group)')).toBeInTheDocument()
    expect(screen.getByText(/drafts outreach/i)).toBeInTheDocument()
  })

  it('groups Integrations, MCP (abstracted kinds), and Skills under one "What it uses" card', () => {
    renderCard({ ...baseCard, mcpKinds: ['Sales knowledge base'] })
    expect(screen.getByText('What it uses')).toBeInTheDocument()
    expect(screen.getByTestId('company-integrations')).toHaveTextContent('Salesforce')
    expect(screen.getByTestId('company-mcp')).toHaveTextContent('Sales knowledge base')
    // Skills sub-section is in the same card (extensible → Library line renders).
    expect(screen.getByTestId('library-skills-line')).toBeInTheDocument()
  })

  it('says "None" for integrations/MCP the agent does not use — never hides the sub-section', () => {
    renderCard({ ...baseCard, integrations: [], mcpKinds: [] })
    expect(screen.getByTestId('company-integrations')).toHaveTextContent('None')
    expect(screen.getByTestId('company-mcp')).toHaveTextContent('None')
  })

  it('shows the Skills section — agent skill count + member Library skills — for an extensible agent, never the word', () => {
    renderCard({ ...baseCard, agentSkillCount: 5 }, 24)
    expect(screen.getByTestId('agent-skills-count')).toHaveTextContent('Agent Skills (5)')
    expect(screen.getByTestId('library-skills-line')).toHaveTextContent('Skills from your library (24)')
    // The Library line links to the member's Skills page.
    expect(screen.getByTestId('library-skills-link')).toHaveAttribute('href', '/settings/skills')
    // No category word anywhere member-facing.
    expect(screen.queryByText(/extensible/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('manage-in-library-link')).not.toBeInTheDocument()
  })

  it('blocks Library skills for a sealed agent (still shows the agent skill count, no category word)', () => {
    renderCard({ ...baseCard, category: 'sealed', agentSkillCount: 3 })
    expect(screen.getByTestId('agent-skills-count')).toHaveTextContent('Agent Skills (3)')
    expect(screen.getByTestId('library-skills-line')).toHaveTextContent(SEALED_SKILLS_MESSAGE)
    // The blocked line is not a link to the Library.
    expect(screen.queryByTestId('library-skills-link')).not.toBeInTheDocument()
    expect(screen.queryByText(/\bsealed\b/i)).not.toBeInTheDocument()
  })

  it('renders NO "What it can do" section — capability lives in the admin-authored About prose', () => {
    // toolKinds are present on the card but must not surface as a member-facing
    // capability list: bare tool-verbs synthesized from wiring can leak (INVARIANT 2).
    renderCard(baseCard)
    expect(screen.queryByTestId('tool-kinds')).not.toBeInTheDocument()
    expect(screen.queryByText('What it can do')).not.toBeInTheDocument()
    // The description (About) is still shown — that's where capability now lives.
    expect(screen.getByText(/drafts outreach/i)).toBeInTheDocument()
  })

  it('shows Accepts, Available modes (no explainer note), org-supplied models (no Managed by)', () => {
    renderCard({ ...baseCard, advertisedModels: ['claude-opus-4-8', 'claude-haiku-4-5'] })
    expect(screen.getByTestId('accepts-line')).toHaveTextContent('Accepts images')
    expect(screen.getByTestId('accepts-line')).toHaveTextContent(/remembers context/i)
    expect(screen.getByTestId('available-modes')).toHaveTextContent('Autonomous')
    // The "range this agent supports — you pick one per chat" note was removed.
    expect(screen.queryByText(/range this agent supports/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('company-model-line')).toHaveTextContent('claude-opus-4-8')
    expect(screen.getByTestId('company-model-line')).toHaveTextContent('claude-haiku-4-5')
    expect(screen.queryByText(/managed by/i)).not.toBeInTheDocument()
  })

  it('hides the Models section (never "Set by your organization") when no models are advertised', () => {
    renderCard({ ...baseCard, advertisedModels: [] })
    expect(screen.queryByTestId('company-model-line')).not.toBeInTheDocument()
    expect(screen.queryByText(/set by your organization/i)).not.toBeInTheDocument()
  })

  it('has no Start a chat action', () => {
    renderCard(baseCard)
    expect(screen.queryByTestId('agent-start-chat')).not.toBeInTheDocument()
  })
})
