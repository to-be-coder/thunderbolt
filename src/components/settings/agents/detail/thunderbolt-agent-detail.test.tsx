/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { MemoryRouter } from 'react-router'
import { ThunderboltAgentDetail } from './thunderbolt-agent-detail'

afterEach(() => {
  cleanup()
})

const renderDetail = (overrides: { onRemove?: () => void; onBack?: () => void } = {}) =>
  render(
    <MemoryRouter>
      <ThunderboltAgentDetail
        onBack={overrides.onBack ?? (() => {})}
        onRemove={overrides.onRemove ?? (() => {})}
        useLibraryCounts={() => ({ skills: 4, mcpServers: 2, extensions: 1 })}
      />
    </MemoryRouter>,
  )

describe('ThunderboltAgentDetail', () => {
  it('renders the native provenance subtitle', () => {
    renderDetail()
    expect(screen.getByText('Your agent · uses your Library')).toBeInTheDocument()
  })

  it('shows the live Library counts in the "What it uses" summary', () => {
    renderDetail()
    expect(screen.getByTestId('library-summary')).toHaveTextContent('4 skills · 2 MCP servers · 1 extension')
  })

  it('renders the instrumented Manage in Library link', () => {
    renderDetail()
    expect(screen.getByTestId('manage-in-library-link')).toBeInTheDocument()
  })

  it('is read-only — no model line, no form fields, no Start a chat', () => {
    renderDetail()
    expect(screen.queryByText(/set by your organization/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByTestId('agent-start-chat')).not.toBeInTheDocument()
  })

  it('fires onRemove after confirming from the 3-dots menu', () => {
    const onRemove = mock(() => {})
    renderDetail({ onRemove })
    // Remove lives behind the 3-dots menu; Radix opens on pointerdown.
    const trigger = screen.getByTestId('thunderbolt-menu')
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' })
    fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse' })
    fireEvent.click(screen.getByTestId('thunderbolt-remove'))
    fireEvent.click(screen.getByTestId('thunderbolt-remove-confirm'))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
