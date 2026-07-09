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

const fakeUseEnabledSkills = (enabledCount: number) =>
  (() => ({
    isEnabled: () => true,
    setEnabled: async () => {},
    enabledCount,
  })) as unknown as typeof import('@/skills/use-skills').useEnabledSkills

const renderDetail = (overrides: { onRemove?: () => void; onBack?: () => void } = {}) =>
  render(
    <MemoryRouter>
      <ThunderboltAgentDetail
        onBack={overrides.onBack ?? (() => {})}
        onRemove={overrides.onRemove ?? (() => {})}
        useLibraryCounts={() => ({ skills: 4, mcpServers: 2, extensions: 1 })}
        useEnabledSkills={fakeUseEnabledSkills(4)}
        // The real ModelsManager needs DB/query/policy providers; the detail
        // view just slots it in, so a stub keeps these unit tests provider-free.
        models={<div data-testid="models-stub">Models manager</div>}
      />
    </MemoryRouter>,
  )

describe('ThunderboltAgentDetail', () => {
  it('has no provenance subtitle under the title', () => {
    renderDetail()
    expect(screen.queryByText('Your agent · uses your Library')).not.toBeInTheDocument()
  })

  it('shows the live Library counts as links in the "What it uses" sub-sections', () => {
    renderDetail()
    expect(screen.getByRole('link', { name: '1 integration' })).toHaveAttribute('href', '/settings/integrations')
    expect(screen.getByRole('link', { name: '2 MCP servers' })).toHaveAttribute('href', '/settings/mcp-servers')
    // The skills count surfaces through the Library skills line (asserted below).
  })

  it('shows a Skills section — no built-in skills line, just a link to your Library skills', () => {
    renderDetail()
    // The native agent has no bundled skills, so the "Agent Skills (0)" line is omitted.
    expect(screen.queryByTestId('agent-skills-count')).not.toBeInTheDocument()
    expect(screen.getByTestId('library-skills-line')).toHaveTextContent('Skills from your library (4)')
    expect(screen.getByTestId('library-skills-link')).toHaveAttribute('href', '/settings/skills')
  })

  it('has no Manage in Library link', () => {
    renderDetail()
    expect(screen.queryByTestId('manage-in-library-link')).not.toBeInTheDocument()
  })

  it('has no org-set model line and no Start a chat action', () => {
    renderDetail()
    expect(screen.queryByText(/set by your organization/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('agent-start-chat')).not.toBeInTheDocument()
  })

  it('renders a Models section that hosts the models manager', () => {
    renderDetail()
    // The "Models" label now lives inside the manager (stubbed here); the
    // section is identified by the injected manager content.
    expect(screen.getByTestId('models-stub')).toBeInTheDocument()
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
