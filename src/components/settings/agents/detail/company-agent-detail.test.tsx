/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
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

const renderCard = (card: AgentCard, onStartChat: () => void = () => {}) =>
  render(
    <MemoryRouter>
      <CompanyAgentDetail card={card} onBack={() => {}} onStartChat={onStartChat} />
    </MemoryRouter>,
  )

describe('CompanyAgentDetail', () => {
  it('renders the granted-via subtitle and description', () => {
    renderCard(baseCard)
    expect(screen.getByText('From ACME IT · granted via: Sales (group)')).toBeInTheDocument()
    expect(screen.getByText(/drafts outreach/i)).toBeInTheDocument()
  })

  it('shows the extensible banner + Library link for extensible agents', () => {
    renderCard(baseCard)
    expect(screen.getByTestId('category-banner-extensible')).toHaveTextContent('Works with your skills')
    expect(screen.getByTestId('manage-in-library-link')).toBeInTheDocument()
  })

  it('shows the sealed banner (no Library link) for sealed agents', () => {
    renderCard({ ...baseCard, category: 'sealed' })
    expect(screen.getByTestId('category-banner-sealed')).toHaveTextContent('Comes fully configured')
    expect(screen.queryByTestId('manage-in-library-link')).not.toBeInTheDocument()
  })

  it('lists plain-language capabilities and the org-set model + managed-by footer', () => {
    renderCard(baseCard)
    expect(screen.getByText('Searches the web')).toBeInTheDocument()
    expect(screen.getByText('Reads the Sales knowledge base')).toBeInTheDocument()
    expect(screen.getByTestId('company-model-line')).toHaveTextContent('set by your organization')
    expect(screen.getByTestId('company-managed-by')).toHaveTextContent('Managed by: ACME IT')
  })

  it('shows as_you rows truthfully as unsupported on the v1 external transport (no Connect)', () => {
    renderCard(baseCard)
    expect(screen.getByTestId('capability-unsupported')).toBeInTheDocument()
    expect(screen.queryByTestId('capability-connect')).not.toBeInTheDocument()
  })

  it('fires onStartChat', () => {
    const onStartChat = mock(() => {})
    renderCard(baseCard, onStartChat)
    fireEvent.click(screen.getByTestId('agent-start-chat'))
    expect(onStartChat).toHaveBeenCalledTimes(1)
  })
})
