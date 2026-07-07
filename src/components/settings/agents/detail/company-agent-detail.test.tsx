/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { MemoryRouter } from 'react-router'
import type { AgentCard } from '@shared/agent-cards'
import { CompanyAgentDetail } from './company-agent-detail'

afterEach(() => {
  cleanup()
})

const baseCard: AgentCard = {
  id: 'sales',
  name: 'Sales Agent',
  icon: 'chart',
  description: 'Drafts outreach, summarizes accounts, and answers pipeline questions.',
  category: 'extensible',
  capabilities: [
    { label: 'Searches the web' },
    { label: 'Reads the Sales knowledge base', credentialMode: 'service_account' },
    { label: 'Acts as you in Jira', credentialMode: 'as_you', connected: false },
    { label: 'Acts as a service account in Salesforce', credentialMode: 'service_account' },
  ],
  advertisedModels: [],
  managedBy: 'ACME IT',
  grantedVia: 'Sales (group)',
}

const renderCard = (card: AgentCard) =>
  render(
    <MemoryRouter>
      <CompanyAgentDetail card={card} onBack={() => {}} />
    </MemoryRouter>,
  )

describe('CompanyAgentDetail', () => {
  it('renders the granted-via subtitle and description', () => {
    renderCard(baseCard)
    expect(screen.getByText('Granted via Sales (group)')).toBeInTheDocument()
    expect(screen.getByText(/drafts outreach/i)).toBeInTheDocument()
  })

  it('names the category Extensible (explanation is in the tooltip, no Library link)', () => {
    renderCard(baseCard)
    expect(screen.getByTestId('category-extensible')).toHaveTextContent('Extensible')
    // The explanation lives in a hover tooltip, so it isn't in the DOM at rest.
    expect(screen.queryByText(/available to this agent/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('manage-in-library-link')).not.toBeInTheDocument()
  })

  it('names the category Sealed for sealed agents', () => {
    renderCard({ ...baseCard, category: 'sealed' })
    expect(screen.getByTestId('category-sealed')).toHaveTextContent('Sealed')
    expect(screen.queryByTestId('manage-in-library-link')).not.toBeInTheDocument()
  })

  it('lists capabilities and the org-supplied models (no Managed by)', () => {
    renderCard({ ...baseCard, advertisedModels: ['claude-opus-4-8', 'claude-haiku-4-5'] })
    expect(screen.getByText('Searches the web')).toBeInTheDocument()
    expect(screen.getByText('Reads the Sales knowledge base')).toBeInTheDocument()
    expect(screen.getByTestId('company-model-line')).toHaveTextContent('claude-opus-4-8')
    expect(screen.getByTestId('company-model-line')).toHaveTextContent('claude-haiku-4-5')
    expect(screen.queryByTestId('company-managed-by')).not.toBeInTheDocument()
    expect(screen.queryByText(/managed by/i)).not.toBeInTheDocument()
  })

  it('shows as_you rows truthfully as unsupported on the v1 external transport (no Connect)', () => {
    renderCard(baseCard)
    expect(screen.getByTestId('capability-unsupported')).toBeInTheDocument()
    expect(screen.queryByTestId('capability-connect')).not.toBeInTheDocument()
  })

  it('has no Start a chat action', () => {
    renderCard(baseCard)
    expect(screen.queryByTestId('agent-start-chat')).not.toBeInTheDocument()
  })
})
