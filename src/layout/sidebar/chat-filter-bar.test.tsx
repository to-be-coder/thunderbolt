/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { builtInAgent } from '@/defaults/agents'
import { ChatFilterBar } from './chat-filter-bar'
import type { AgentFilterOption, ChatFilters } from './chat-filters'
import { initialChatFilters } from './chat-filters'

const options: AgentFilterOption[] = [
  { id: builtInAgent.id, label: 'Thunderbolt', kind: 'thunderbolt' },
  { id: 'team-1', label: 'Support Copilot', kind: 'team' },
]

afterEach(cleanup)

const openPopover = async () => {
  await act(async () => {
    fireEvent.click(screen.getByLabelText('Filter chats'))
  })
}

describe('ChatFilterBar', () => {
  it('dispatches a by-agent toggle when an agent is picked', async () => {
    const dispatch = mock(() => {})
    render(<ChatFilterBar options={options} filters={initialChatFilters} dispatch={dispatch} />)

    await openPopover()
    await act(async () => {
      fireEvent.click(screen.getByText('Support Copilot'))
    })

    expect(dispatch).toHaveBeenCalledWith({ type: 'toggleAgent', id: 'team-1' })
  })

  it('dispatches the Company quick toggle', async () => {
    const dispatch = mock(() => {})
    render(<ChatFilterBar options={options} filters={initialChatFilters} dispatch={dispatch} />)

    await openPopover()
    await act(async () => {
      fireEvent.click(screen.getByText('Company'))
    })

    expect(dispatch).toHaveBeenCalledWith({ type: 'setCompanyMine', value: 'company' })
  })

  it('clears all filters from the popover Clear all when a filter is active', async () => {
    const dispatch = mock(() => {})
    const active: ChatFilters = { agentIds: ['team-1'], companyMine: 'all' }
    render(<ChatFilterBar options={options} filters={active} dispatch={dispatch} />)

    // No external clear button; the reset lives inside the popover.
    expect(screen.queryByLabelText('Clear filters')).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Filter chats'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Clear all'))
    })

    expect(dispatch).toHaveBeenCalledWith({ type: 'clear' })
  })

  it('just highlights the filter button when active (no external clear affordance)', () => {
    const dispatch = mock(() => {})
    const active: ChatFilters = { agentIds: ['team-1'], companyMine: 'all' }
    render(<ChatFilterBar options={options} filters={active} dispatch={dispatch} />)
    expect(screen.queryByLabelText('Clear filters')).toBeNull()
    expect(screen.getByLabelText('Filter chats')).toHaveAttribute('aria-pressed', 'true')
  })
})
