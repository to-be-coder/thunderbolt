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

  it('clears all filters in one tap when a filter is active', async () => {
    const dispatch = mock(() => {})
    const active: ChatFilters = { agentIds: ['team-1'], companyMine: 'all' }
    render(<ChatFilterBar options={options} filters={active} dispatch={dispatch} />)

    // The inline Clear affordance is shown next to the filter button.
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Clear filters'))
    })

    expect(dispatch).toHaveBeenCalledWith({ type: 'clear' })
  })

  it('hides the clear affordance when no filter is active', () => {
    const dispatch = mock(() => {})
    render(<ChatFilterBar options={options} filters={initialChatFilters} dispatch={dispatch} />)
    expect(screen.queryByLabelText('Clear filters')).toBeNull()
  })
})
