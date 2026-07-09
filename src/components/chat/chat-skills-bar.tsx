/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Info, Lock, Plus } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NO_SKILLS_ENABLED_MESSAGE, SEALED_SKILLS_MESSAGE } from '@/lib/agent-copy'
import { useIsMobile } from '@/hooks/use-mobile'
import { ReorderPanel } from '@/skills/reorder-panel'
import { SuggestionChip } from '@/skills/suggestion-chip'
import { useSkillTelemetry } from '@/skills/telemetry'
import {
  useEnabledSkills as useEnabledSkills_default,
  useLibrarySkills as useLibrarySkills_default,
  usePinnedSkills as usePinnedSkills_default,
} from '@/skills/use-skills'

type ChatSkillsBarProps = {
  /** Insert `"/slug "` into the chat input at the cursor. */
  onAddToChat: (slug: string) => void
  /** Insert the resolved skill's instruction prose into the chat input. */
  onAddInstruction: (instruction: string) => void
  /**
   * When `true`, render nothing. The composer toggles this on once any
   * message has been sent so the chips don't compete for space in an
   * ongoing thread — pinning is a "starting a new chat" affordance. This is a
   * NON-skills reason (same for every agent) — it must never be what produces
   * the sealed / empty states, which are explicit static renders.
   */
  hidden?: boolean
  /**
   * The agent doesn't use the member's Library (a sealed company agent). The
   * slot still renders — as a static, non-interactive status line — so the
   * control never appears for some agents and vanishes for others.
   */
  sealed?: boolean
  // Dependency injection for tests / Storybook.
  usePinnedSkills?: typeof usePinnedSkills_default
  useLibrarySkills?: typeof useLibrarySkills_default
  useEnabledSkills?: typeof useEnabledSkills_default
}

/**
 * The composer's skills area — a PERSISTENT slot (stable footprint) whose
 * contents change by state, so the control never appears for some agents and
 * vanishes for others (the ambiguity that reads as a bug):
 *  1. extensible agent with something to pin → the interactive bar (pinned chips
 *     + `+` popover). The canonical "add a pinned skill" entry point.
 *  2. extensible agent, nothing enabled/pinnable → static "No skills enabled yet".
 *  3. sealed agent (`sealed`) → static, non-interactive "Uses only its
 *     organization's tools" with a lock glyph — same weight as the button, but
 *     unmistakably not a control (no hover/press, default cursor).
 *
 * `hidden` (ongoing thread) still suppresses the whole slot, uniformly for every
 * agent — that's a non-skills reason and never produces states 2/3.
 */
export const ChatSkillsBar = ({
  onAddToChat,
  onAddInstruction,
  hidden,
  sealed,
  usePinnedSkills = usePinnedSkills_default,
  useLibrarySkills = useLibrarySkills_default,
  useEnabledSkills = useEnabledSkills_default,
}: ChatSkillsBarProps) => {
  const { pinned, pinnedSet, reorderPins, togglePin } = usePinnedSkills()
  const { skills: library } = useLibrarySkills()
  const { isEnabled } = useEnabledSkills()
  const { isMobile } = useIsMobile()
  const trackSkillEvent = useSkillTelemetry()

  const navigate = useNavigate()
  const [openChipId, setOpenChipId] = useState<string | null>(null)
  const [reorderMode, setReorderMode] = useState(false)

  if (hidden) {
    return null
  }

  // State 3 — sealed agent: a static status line, never a control. Rendered
  // before any skills lookup; the string is fixed (INVARIANT 2 — never reads
  // agent-carried skill data) and shared with the detail card. (In the member
  // composer this state is hoisted into the prompt-input header instead — see
  // `useComposerSkillsNotice` — so this render only serves tests/other callers.)
  if (sealed) {
    return (
      <StaticSkillsSlot testid="skills-sealed" icon={<Lock className="size-3.5" aria-hidden />}>
        {SEALED_SKILLS_MESSAGE}
      </StaticSkillsSlot>
    )
  }

  const showOverlay = isMobile && (openChipId !== null || reorderMode)
  const dismissOverlay = () => {
    setOpenChipId(null)
    setReorderMode(false)
  }

  if (reorderMode) {
    return (
      <>
        {showOverlay && <MobileOverlay onDismiss={dismissOverlay} />}
        <ReorderPanel
          pinned={pinned}
          onReorder={async (ids, move) => {
            // `move` comes from dnd-kit's `active.id` / index lookup — unambiguous
            // even for adjacent swaps, where a diff-based heuristic can't tell
            // which side the user actually dragged. Await the mutation before
            // firing telemetry so a rejection doesn't record a phantom event.
            try {
              await reorderPins(ids)
              trackSkillEvent('skill_reordered', move.id, { from_index: move.from, to_index: move.to })
            } catch (error) {
              console.warn('reorderPins failed:', error)
            }
          }}
          onClose={() => setReorderMode(false)}
        />
      </>
    )
  }

  // Enabled-but-unpinned skills — used only to decide the empty state below. The
  // "+" no longer pins from here; it routes to the Library skills page.
  const pinnable = library.filter((s) => isEnabled(s.id) && !pinnedSet.has(s.id))

  // State 2 — extensible agent with nothing enabled to pin (and nothing pinned):
  // a static "No skills enabled yet" in the SAME slot, not an absent control.
  if (pinned.length === 0 && pinnable.length === 0) {
    return (
      <StaticSkillsSlot testid="skills-empty" icon={<Info className="size-3.5" aria-hidden />}>
        {NO_SKILLS_ENABLED_MESSAGE}
      </StaticSkillsSlot>
    )
  }

  return (
    <>
      {showOverlay && <MobileOverlay onDismiss={dismissOverlay} />}
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {pinned.map((skill) => (
          <SuggestionChip
            key={skill.id}
            label={skill.name}
            dimmed={openChipId !== null && openChipId !== skill.id}
            canEdit
            onClick={() => onAddToChat(skill.name)}
            onOpenChange={(open) => setOpenChipId(open ? skill.id : null)}
            onAddInstruction={() => onAddInstruction(skill.instruction)}
            onReorder={() => setReorderMode(true)}
            onUnpin={async () => {
              // Telemetry only fires after the mutation settles, so a rejection
              // doesn't record an action the user didn't actually complete.
              try {
                await togglePin(skill.id)
                trackSkillEvent('skill_unpinned', skill.id, {})
              } catch (error) {
                console.warn('togglePin failed:', error)
              }
            }}
          />
        ))}
        {/* The "+" is a persistent, always-enabled entry to the Library skills
            page — pinning now happens there, not from a composer popover. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Add skill"
              onClick={() => navigate('/settings/skills')}
              className={`shrink-0 cursor-pointer rounded-full border-border bg-card transition-opacity hover:bg-accent dark:border-border dark:bg-card ${
                openChipId ? 'opacity-40' : ''
              }`}
            >
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add skill</TooltipContent>
        </Tooltip>
      </div>
    </>
  )
}

/**
 * A static, non-interactive skills-slot render (states 2 & 3). Same footprint as
 * the interactive bar (`min-h-8`, same row rhythm) so nothing shifts when
 * switching agents — but unmistakably NOT a control: muted, a status glyph, no
 * hover/press, default cursor, unselectable.
 */
const StaticSkillsSlot = ({ icon, children, testid }: { icon: ReactNode; children: ReactNode; testid: string }) => (
  <div
    data-testid={testid}
    className="-mx-1 flex min-h-8 cursor-default select-none items-center gap-1.5 px-1 text-[length:var(--font-size-sm)] text-muted-foreground"
  >
    {icon}
    <span>{children}</span>
  </div>
)

/**
 * Backdrop shown behind an open chip menu / the reorder panel on mobile.
 * A `<button>` rather than a `<div>` so keyboard users can `Escape` /
 * `Enter` / `Space` to dismiss; the document-level Escape listener is the
 * primary path, but the button keeps the dismiss target focusable for
 * screen readers and assistive tech.
 */
const MobileOverlay = ({ onDismiss }: { onDismiss: () => void }) => {
  // Document-level Escape so users don't have to focus the backdrop first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onDismiss])

  return createPortal(
    <button
      type="button"
      aria-label="Dismiss"
      className="fixed inset-0 z-[5] cursor-default bg-black/30 backdrop-blur-sm"
      onClick={onDismiss}
    />,
    document.body,
  )
}
