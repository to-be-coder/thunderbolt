/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'

import { TooltipProvider } from '@/components/ui/tooltip'
import { SEALED_SKILLS_MESSAGE } from '@/lib/agent-copy'
import type { Skill } from '@/types'
import { ChatSkillsBar } from './chat-skills-bar'

const skill = (id: string, name: string): Skill => ({
  id,
  name,
  description: `desc for ${name}`,
  instruction: `instruction for ${name}`,
  enabled: 1,
  pinnedOrder: 0,
  deletedAt: null,
  defaultHash: null,
  userId: null,
})

const fakeUsePinnedSkills = (overrides?: {
  pinned?: Skill[]
  togglePin?: (id: string) => Promise<void>
  reorderPins?: (ids: string[]) => Promise<void>
}) =>
  (() => ({
    pinned: overrides?.pinned ?? [],
    pinnedSet: new Set((overrides?.pinned ?? []).map((s) => s.id)),
    togglePin: overrides?.togglePin ?? (async () => undefined),
    reorderPins: overrides?.reorderPins ?? (async () => undefined),
  })) as unknown as typeof import('@/skills/use-skills').usePinnedSkills

const fakeUseLibrarySkills = (skills: Skill[] = []) =>
  (() => ({
    skills,
    isLoading: false,
    createSkill: async () => skills[0]!,
    updateSkill: async () => undefined,
    softDeleteSkill: async () => undefined,
  })) as unknown as typeof import('@/skills/use-skills').useLibrarySkills

const fakeUseEnabledSkills = (enabledIds: ReadonlySet<string>) =>
  (() => ({
    isEnabled: (id: string) => enabledIds.has(id),
    setEnabled: async () => undefined,
  })) as unknown as typeof import('@/skills/use-skills').useEnabledSkills

const renderBar = (props: Partial<Parameters<typeof ChatSkillsBar>[0]> = {}) => {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <ChatSkillsBar
          onAddToChat={() => undefined}
          onAddInstruction={() => undefined}
          sealed={props.sealed}
          hidden={props.hidden}
          usePinnedSkills={props.usePinnedSkills ?? fakeUsePinnedSkills({ pinned: [] })}
          useLibrarySkills={props.useLibrarySkills ?? fakeUseLibrarySkills([])}
          useEnabledSkills={props.useEnabledSkills ?? fakeUseEnabledSkills(new Set())}
        />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

describe('ChatSkillsBar', () => {
  afterEach(cleanup)

  it('shows a static "No skills enabled yet" slot (not null) when nothing is enabled/pinnable', () => {
    renderBar()
    expect(screen.getByTestId('skills-empty')).toBeTruthy()
    expect(screen.getByText('No skills enabled yet')).toBeTruthy()
    // Static, not a control.
    expect(screen.queryByLabelText('Pin a skill')).toBeNull()
  })

  it('shows the shared sealed status line (non-interactive) for a sealed agent', () => {
    renderBar({ sealed: true })
    expect(screen.getByTestId('skills-sealed')).toBeTruthy()
    expect(screen.getByText(SEALED_SKILLS_MESSAGE)).toBeTruthy()
    expect(screen.queryByLabelText('Pin a skill')).toBeNull()
  })

  it('renders nothing when hidden (ongoing thread — uniform across agents, a non-skills reason)', () => {
    const { container } = renderBar({ hidden: true })
    expect(container.firstChild).toBeNull()
  })

  it('a sealed agent stays static even with pinnable skills in the library (never a control)', () => {
    const a = skill('a', 'daily-brief')
    renderBar({
      sealed: true,
      useLibrarySkills: fakeUseLibrarySkills([a]),
      useEnabledSkills: fakeUseEnabledSkills(new Set(['a'])),
    })
    expect(screen.getByTestId('skills-sealed')).toBeTruthy()
    expect(screen.queryByLabelText('Pin a skill')).toBeNull()
  })

  it('renders one chip per pinned skill plus the "Add skill" trigger', () => {
    const a = skill('a', 'daily-brief')
    const b = skill('b', 'important-emails')
    renderBar({
      usePinnedSkills: fakeUsePinnedSkills({ pinned: [a, b] }),
      useLibrarySkills: fakeUseLibrarySkills([a, b]),
      useEnabledSkills: fakeUseEnabledSkills(new Set(['a', 'b'])),
    })
    expect(screen.getByText('/daily-brief')).toBeTruthy()
    expect(screen.getByText('/important-emails')).toBeTruthy()
    expect(screen.getByLabelText('Add skill')).toBeTruthy()
  })

  it('renders the "+ Add skill" trigger even when nothing is pinned, so long as the library has candidates', () => {
    const a = skill('a', 'daily-brief')
    renderBar({
      usePinnedSkills: fakeUsePinnedSkills({ pinned: [] }),
      useLibrarySkills: fakeUseLibrarySkills([a]),
      useEnabledSkills: fakeUseEnabledSkills(new Set(['a'])),
    })
    expect(screen.getByLabelText('Add skill')).toBeTruthy()
  })

  it('keeps the "+ Add skill" trigger enabled when every enabled skill is already pinned', () => {
    const a = skill('a', 'daily-brief')
    renderBar({
      usePinnedSkills: fakeUsePinnedSkills({ pinned: [a] }),
      useLibrarySkills: fakeUseLibrarySkills([a]),
      useEnabledSkills: fakeUseEnabledSkills(new Set(['a'])),
    })
    const trigger = screen.getByLabelText('Add skill') as HTMLButtonElement
    expect(trigger.disabled).toBe(false)
  })

  it('keeps the "+ Add skill" trigger enabled at the pin cap (it routes to the skills page, never pins)', () => {
    const pinnedSkills = Array.from({ length: 10 }, (_, i) => skill(`p-${i}`, `pinned-${i}`))
    const candidate = skill('c', 'eleventh')
    renderBar({
      usePinnedSkills: fakeUsePinnedSkills({ pinned: pinnedSkills }),
      useLibrarySkills: fakeUseLibrarySkills([...pinnedSkills, candidate]),
      useEnabledSkills: fakeUseEnabledSkills(new Set([...pinnedSkills.map((s) => s.id), 'c'])),
    })
    const trigger = screen.getByLabelText('Add skill') as HTMLButtonElement
    expect(trigger.disabled).toBe(false)
  })

  it('the "+" navigates to the Library skills page', () => {
    const a = skill('a', 'daily-brief')
    render(
      <MemoryRouter initialEntries={['/']}>
        <TooltipProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ChatSkillsBar
                  onAddToChat={() => undefined}
                  onAddInstruction={() => undefined}
                  usePinnedSkills={fakeUsePinnedSkills({ pinned: [a] })}
                  useLibrarySkills={fakeUseLibrarySkills([a])}
                  useEnabledSkills={fakeUseEnabledSkills(new Set(['a']))}
                />
              }
            />
            <Route path="/settings/skills" element={<div>skills page</div>} />
          </Routes>
        </TooltipProvider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByLabelText('Add skill'))
    expect(screen.getByText('skills page')).toBeTruthy()
  })

  // The chip's click → onAddToChat path is exercised end-to-end at the
  // composer level; here we trust Radix's primitives.
})
