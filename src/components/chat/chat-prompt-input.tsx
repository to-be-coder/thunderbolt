/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { isAgentAvailable as isAgentAvailable_default } from '@/acp/agent-availability'
import { testAcpConnection as testAcpConnection_default } from '@/acp'
import {
  isSealedForSlash,
  showsSkillsBar,
  useAgentDescriptor as useAgentDescriptor_default,
} from '@/chats/agent-descriptor'
import { useChatStore, useCurrentChatSession } from '@/chats/chat-store'
import { estimateTokensForText } from '@/ai/tokenizers'
import { useContextTracking as useContextTracking_default } from '@/hooks/use-context-tracking'
import { useIsMobile as useIsMobile_default } from '@/hooks/use-mobile'
import { isMobile as isPlatformMobile } from '@/lib/platform'
import { trackEvent as trackEvent_default } from '@/lib/posthog'
import { appendSlashToken } from '@/skills/compose-chat-input'
import { renderHighlightedSkillTokens, type SkillStatusClassifier } from '@/skills/highlight-skill-tokens'
import { resolveSkillTokenInstructions } from '@/skills/resolve-skill-system-messages'
import { SlashPopup } from '@/skills/slash-popup'
import { useSkillTelemetry } from '@/skills/telemetry'
import { useSlashCommand } from '@/skills/use-slash-command'
import { useAgentCommands } from '@/acp/agent-commands-store'
import { useWarmAcpCommands } from '@/chats/use-warm-acp-commands'
import {
  useEnabledSkills as useEnabledSkills_default,
  useLibrarySkills as useLibrarySkills_default,
  usePinnedSkills as usePinnedSkills_default,
} from '@/skills/use-skills'
import { NO_SKILLS_ENABLED_MESSAGE, SEALED_SKILLS_MESSAGE } from '@/lib/agent-copy'
import { type Model } from '@/types'
import { useChat as useChat_default } from '@ai-sdk/react'
import { useDraftInput } from '@/hooks/use-draft-input'
import { Info, Loader2, Lock, X } from 'lucide-react'
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useLocation as useLocation_default, useNavigate as useNavigate_default } from 'react-router'
import { ChatSkillsBar } from './chat-skills-bar'
import { ComposerBlock, resolveComposerBlock } from './composer-block'
import { SealedSlashHint } from './sealed-slash-hint'
import { useSealedSlashHint } from './use-sealed-slash-hint'
import { ContextOverflowModal } from '../context-overflow-modal'
import { ContextUsageIndicator } from '../context-usage-indicator'
import { PromptInput } from '../ui/prompt-input'
import { ChatModePicker } from './chat-mode-picker'
import { ChatModelPicker } from './chat-model-picker'

export type ChatPromptInputRef = {
  focus: () => void
  setInput: (text: string) => void
}

type ChatPromptInputProps = {
  useNavigate?: typeof useNavigate_default
  useLocation?: typeof useLocation_default
  useChat?: typeof useChat_default
  useContextTracking?: typeof useContextTracking_default
  trackEvent?: typeof trackEvent_default
  useIsMobile?: typeof useIsMobile_default
  useLibrarySkills?: typeof useLibrarySkills_default
  useEnabledSkills?: typeof useEnabledSkills_default
  usePinnedSkills?: typeof usePinnedSkills_default
  /** Inject for tests that need to drive the unavailable-agent fallback. */
  isAgentAvailable?: typeof isAgentAvailable_default
  /** Inject to drive per-agent-kind composer behavior (pickers / skills / block). */
  useAgentDescriptor?: typeof useAgentDescriptor_default
  /** Inject for the offline (T5b) Test-connection affordance. */
  testAcpConnection?: typeof testAcpConnection_default
}

/** The sealed / no-skills notice as the prompt-input's header row (icon +
 *  message + dismiss). Rendered INSIDE the composer's rounded card via the
 *  `header` slot, so it never floats as a separate overlapping card. */
const ComposerSkillsNotice = ({ kind, onDismiss }: { kind: 'sealed' | 'empty'; onDismiss: () => void }) => (
  <div
    data-testid={kind === 'sealed' ? 'skills-sealed' : 'skills-empty'}
    className="flex items-center gap-1.5 px-2 pt-1 text-[length:var(--font-size-sm)] text-muted-foreground"
  >
    {kind === 'sealed' ? (
      <Lock className="size-3.5 shrink-0" aria-hidden />
    ) : (
      <Info className="size-3.5 shrink-0" aria-hidden />
    )}
    <span className="min-w-0 flex-1 truncate">
      {kind === 'sealed' ? SEALED_SKILLS_MESSAGE : NO_SKILLS_ENABLED_MESSAGE}
    </span>
    <button
      type="button"
      aria-label="Dismiss"
      onClick={onDismiss}
      className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
    >
      <X className="size-3.5" />
    </button>
  </div>
)

export const ChatPromptInput = forwardRef<ChatPromptInputRef, ChatPromptInputProps>(
  (
    {
      useNavigate = useNavigate_default,
      useLocation = useLocation_default,
      useChat = useChat_default,
      useContextTracking = useContextTracking_default,
      trackEvent = trackEvent_default,
      useIsMobile = useIsMobile_default,
      useLibrarySkills = useLibrarySkills_default,
      useEnabledSkills = useEnabledSkills_default,
      usePinnedSkills = usePinnedSkills_default,
      isAgentAvailable = isAgentAvailable_default,
      useAgentDescriptor = useAgentDescriptor_default,
      testAcpConnection = testAcpConnection_default,
    },
    ref,
  ) => {
    const navigate = useNavigate()
    const location = useLocation()

    const { isMobile } = useIsMobile()

    const {
      chatInstance,
      chatThread,
      connectionStatus,
      connectionError,
      id: chatThreadId,
      selectedAgent,
      selectedModel,
    } = useCurrentChatSession()

    const { messages, status, stop, sendMessage } = useChat({ chat: chatInstance })

    // The normalized, agent-kind-aware descriptor drives which pickers render,
    // whether the skills bar exists, the seal-hit education, and the three
    // blocked thread states — all derived during render, no effect.
    const descriptor = useAgentDescriptor()
    const modelCount = useChatStore((state) => state.models.length)
    const blockState = resolveComposerBlock({ descriptor, connectionStatus, connectionError, modelCount })
    const sealedHint = useSealedSlashHint({
      sealed: isSealedForSlash(descriptor),
      agentKind: descriptor.kind,
      trackEvent,
    })
    const hasMessages = messages.length > 0

    const { skills: library } = useLibrarySkills()
    const { isEnabled } = useEnabledSkills()
    const { pinned, pinnedSet } = usePinnedSkills()
    // Sealed / no-skills notice — hoisted OUT of ChatSkillsBar and into the
    // prompt-input header so it shares the composer's rounded card (one border,
    // no overlapping-corner artifacts). Dismissible, and re-armed per agent.
    const composerNoticeKind: 'sealed' | 'empty' | null = !showsSkillsBar(descriptor)
      ? 'sealed'
      : pinned.length === 0 && library.filter((s) => isEnabled(s.id) && !pinnedSet.has(s.id)).length === 0
        ? 'empty'
        : null
    const [dismissedNoticeAgent, setDismissedNoticeAgent] = useState<string | null>(null)
    const showComposerNotice = !hasMessages && composerNoticeKind !== null && dismissedNoticeAgent !== descriptor.id
    const trackSkillEvent = useSkillTelemetry()
    const skillBySlug = useMemo(() => new Map(library.map((s) => [s.name, s])), [library])
    const enabledSlugs = useMemo(
      () => new Set(library.filter((s) => isEnabled(s.id)).map((s) => s.name)),
      [library, isEnabled],
    )
    const isValidSkillSlug = useCallback((slug: string) => enabledSlugs.has(slug), [enabledSlugs])

    // Commands the connected ACP agent advertises — surfaced in the slash menu
    // as external suggestions alongside the user's own skills, and treated as
    // valid slugs by the highlighter so they don't render red.
    const agentCommands = useAgentCommands(selectedAgent.id)
    const agentCommandNames = useMemo(() => new Set(agentCommands.map((c) => c.name)), [agentCommands])

    const classifySkill = useCallback<SkillStatusClassifier>(
      (slug) => {
        const skill = skillBySlug.get(slug)
        if (skill) {
          return isEnabled(skill.id)
            ? { status: 'enabled', skillId: skill.id }
            : { status: 'disabled', skillId: skill.id }
        }
        // No user skill by that name — but an external command advertised by the
        // connected agent is still a valid slug, so treat it as enabled rather
        // than flagging it unknown (red, with a "Create it" popover).
        if (agentCommandNames.has(slug)) {
          return { status: 'enabled' }
        }
        return { status: 'unknown' }
      },
      [skillBySlug, isEnabled, agentCommandNames],
    )

    const isStreaming = status === 'streaming'
    const isConnecting = connectionStatus === 'connecting'

    // isMobile = viewport is narrow (responsive breakpoint, e.g. desktop browser resized small)
    // isPlatformMobile() = native platform is iOS/Android (Tauri mobile app)
    // Either condition means we prefer mobile-style input where Enter inserts a newline.
    const shouldInsertNewlineOnEnter = isMobile || isPlatformMobile()

    // Use a stable "new" key for unsaved chats so the draft persists across /chats/new navigations
    const draftKey = chatThread ? chatThreadId : 'new'
    const [showOverflowModal, setShowOverflowModal] = useState(false)
    const isNewChat = !chatThread
    const [input, setInput, clearDraft] = useDraftInput(draftKey, { persist: !isNewChat })
    // Latest-input ref so deferred callers (e.g. the `runSkill` microtask
    // below) read the current value at execution time rather than the value
    // captured when the callback was created. Without this, a draft restore
    // racing with the microtask could silently discard the user's text.
    const inputRef = useRef(input)
    inputRef.current = input
    const formRef = useRef<HTMLFormElement>(null)
    // Discovered lazily — the form ref is set after the first render, and we
    // need a stable ref to pass to `useSlashCommand` so it can focus / set
    // selection after inserting a token. Keeping a single ref (rather than
    // one for the form and one for the textarea) avoids two cached pointers
    // to the same node drifting out of sync.
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)

    const getTextarea = (): HTMLTextAreaElement | null => {
      textareaRef.current = formRef.current?.querySelector('textarea') ?? null
      return textareaRef.current
    }

    textareaRef.current = getTextarea()

    // Eagerly connect the agent + warm its ACP session so the agent commands
    // are populated before the user's first message (not just after a send).
    useWarmAcpCommands({ id: chatThreadId, selectedAgent, chatThread })

    const {
      setCursorPos,
      popupItems,
      popupOpen,
      highlightedIdx,
      setHighlightedIdx,
      selectItem: selectItemFromPopup,
      handleKeyDown: handleSlashKeyDown,
    } = useSlashCommand({
      value: input,
      setValue: setInput,
      inputRef: textareaRef,
      library,
      isEnabled: isValidSkillSlug,
      agentCommands,
    })

    const addSkillChip = useCallback(
      (slug: string) => {
        // Read the latest input from a ref so deferred callers (e.g. the
        // `runSkill` microtask) don't operate on a stale closure value.
        const next = appendSlashToken(inputRef.current, slug)
        // Update value AND cursor in the same commit. Otherwise the re-render
        // between `setInput` and the rAF runs with a stale `cursorPos` that
        // may still point inside a `/slug` token, briefly flashing the slash
        // popup open — same fix as `selectSkill` in `use-slash-command.ts`.
        setInput(next)
        setCursorPos(next.length)
        requestAnimationFrame(() => {
          const ta = getTextarea()
          ta?.focus()
          ta?.setSelectionRange(next.length, next.length)
        })
      },
      [setInput, setCursorPos],
    )

    const insertInstructionText = useCallback(
      (text: string) => {
        const ta = getTextarea()
        const start = ta?.selectionStart ?? input.length
        const end = ta?.selectionEnd ?? input.length
        const needsSpace = start > 0 && input[start - 1] !== ' '
        const insert = needsSpace ? ` ${text}` : text
        const next = input.slice(0, start) + insert + input.slice(end)
        const pos = start + insert.length
        // Update value AND cursor in the same commit. Otherwise the re-render
        // between `setInput` and the rAF runs with a stale `cursorPos` that
        // may still point inside a `/slug` token, briefly flashing the slash
        // popup open — same fix as `addSkillChip` above and `selectSkill`
        // in `use-slash-command.ts`.
        setInput(next)
        setCursorPos(pos)
        requestAnimationFrame(() => {
          const focused = getTextarea()
          focused?.focus()
          focused?.setSelectionRange(pos, pos)
        })
      },
      [input, setInput, setCursorPos],
    )

    // Run-in-chat router-state nav (Skills v1 §5). Read once during render
    // and clear the state via `navigate(replace)` so back/forward doesn't
    // re-trigger. Tracked via `consumedRunSkillRef` so React's StrictMode
    // double-render doesn't insert the token twice. Once the state is
    // cleared we reset the ref so the user can click "Run skill" on the
    // same skill again.
    const consumedRunSkillRef = useRef<string | null>(null)
    const runSkill = (location.state as { runSkill?: string } | null)?.runSkill
    if (!runSkill) {
      consumedRunSkillRef.current = null
    } else if (consumedRunSkillRef.current !== runSkill) {
      consumedRunSkillRef.current = runSkill
      // Defer setState until after render to avoid setState-in-render warnings.
      queueMicrotask(() => {
        addSkillChip(runSkill)
        navigate(location.pathname, { replace: true, state: {} })
        const resolved = skillBySlug.get(runSkill)
        if (resolved) {
          trackSkillEvent('skill_used', resolved.id, { via: 'settings-nav' })
        }
      })
    }

    // Map of enabled-skill slug → instruction. Shared by the overflow
    // estimate below and the send-time resolver in `ai/fetch.ts` (via
    // `resolveSkillTokenInstructions`), so a future change to resolution
    // semantics moves both surfaces together.
    const enabledInstructionBySlug = useMemo(() => {
      const map = new Map<string, string>()
      for (const skill of library) {
        if (isEnabled(skill.id)) {
          map.set(skill.name, skill.instruction)
        }
      }
      return map
    }, [library, isEnabled])

    // Estimate the token cost of resolved skill instructions so the
    // overflow modal fires correctly when /name tokens push the send past
    // the model's context window — Skills v1 Open Q #5.
    const additionalInputTokens = useMemo(() => {
      const instructions = resolveSkillTokenInstructions(input, enabledInstructionBySlug)
      let total = 0
      for (const instruction of instructions) {
        total += estimateTokensForText(instruction)
      }
      return total
    }, [input, enabledInstructionBySlug])

    const { usedTokens, maxTokens, isContextKnown, isOverflowing } = useContextTracking({
      model: selectedModel,
      chatThreadId,
      currentInput: input,
      additionalInputTokens,
      onOverflow: () => handleShowOverflowModal(selectedModel, input.trim().length, messages.length + 1),
    })

    const handleSubmit = async () => {
      try {
        // Prevent submitting while streaming or if input is empty
        const textToSend = input.trim()
        if (isStreaming || !textToSend) {
          return
        }

        if (isOverflowing) {
          handleShowOverflowModal(selectedModel, textToSend.length, messages.length + 1)
          return
        }

        // Clear input and persisted draft immediately for responsive UX
        clearDraft()

        await sendMessage({ text: textToSend })
      } catch (error) {
        console.error('Error submitting message:', error)
      }
    }

    const handleNewChat = async () => {
      await navigate('/chats/new')
    }

    const handleShowOverflowModal = useCallback(
      (model: Model, length: number, prompt_number: number) => {
        setShowOverflowModal(true)
        trackEvent('chat_send_prompt_overflow', {
          model,
          length,
          prompt_number,
        })
      },
      [trackEvent],
    )

    useImperativeHandle(ref, () => ({
      focus: () => {
        const textareaElement = formRef.current?.querySelector('textarea')
        textareaElement?.focus()

        const textLength = textareaElement?.value.length ?? 0
        textareaElement?.setSelectionRange(textLength, textLength)
      },
      setInput,
    }))

    const footerStartElements = (
      <div className="flex items-center gap-2">
        {isConnecting ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 px-3 h-[var(--touch-height-sm)] text-muted-foreground text-[length:var(--font-size-body)]"
          >
            <Loader2 className="size-[var(--icon-size-default)] shrink-0 animate-spin" />
            <span>Connecting to {selectedAgent.name}...</span>
          </div>
        ) : (
          // The connection failure is surfaced in the message stream
          // (ConnectionFailureMessage), so the composer keeps its normal
          // controls rather than repeating a "Failed to connect" line here.
          <>
            <ChatModePicker iconOnly={isMobile} />
            <ChatModelPicker />
          </>
        )}
        {isContextKnown && !isMobile && (
          <ContextUsageIndicator usedTokens={usedTokens ?? 0} maxTokens={maxTokens ?? 0} />
        )}
      </div>
    )

    const handleAddChipFromBar = useCallback(
      (slug: string) => {
        addSkillChip(slug)
        const resolved = skillBySlug.get(slug)
        if (resolved) {
          trackSkillEvent('skill_used', resolved.id, { via: 'chip' })
        }
      },
      [addSkillChip, skillBySlug, trackSkillEvent],
    )

    const handleSelectFromSlashPopup = useCallback(
      (item: Parameters<typeof selectItemFromPopup>[0]) => {
        selectItemFromPopup(item)
        // Telemetry is for the user's own skills; agent commands are external.
        if (item.kind === 'skill') {
          trackSkillEvent('skill_used', item.skill.id, { via: 'slash' })
        }
      },
      [selectItemFromPopup, trackSkillEvent],
    )

    if (!isAgentAvailable(selectedAgent)) {
      return (
        <div
          role="status"
          className="flex items-center justify-center px-4 py-3 text-muted-foreground text-[length:var(--font-size-sm)]"
        >
          <span>This chat uses {selectedAgent.name}, which is not available on this platform.</span>
        </div>
      )
    }

    // Thread states (T5): a revoked team grant, an offline personal ACP agent, or
    // the Thunderbolt agent with no connected models each replace the composer.
    if (blockState) {
      return (
        <ComposerBlock
          state={blockState}
          descriptor={descriptor}
          agentUrl={selectedAgent.url}
          testAcpConnection={testAcpConnection}
        />
      )
    }

    const promptInput = (
      <PromptInput
        ref={formRef}
        value={input}
        onChange={(value: string) => setInput(value)}
        placeholder="Ask me anything..."
        showSubmitButton
        onSubmit={handleSubmit}
        isLoading={isStreaming || isConnecting}
        isStreaming={isStreaming}
        onStop={stop}
        autoFocus={!isMobile}
        submitOnEnter={!isStreaming && !shouldInsertNewlineOnEnter}
        className="flex flex-col w-full gap-0 rounded-2xl border bg-sidebar p-2"
        footerStartElements={footerStartElements}
        renderOverlay={(value) => renderHighlightedSkillTokens(value, classifySkill)}
        popoverSlot={
          popupOpen ? (
            <SlashPopup
              items={popupItems}
              agentName={selectedAgent.name}
              highlightedIdx={highlightedIdx}
              onSelect={handleSelectFromSlashPopup}
              onHover={setHighlightedIdx}
            />
          ) : null
        }
        onTextareaKeyDown={(e) => {
          // First `/` in a sealed / personal-ACP thread raises the one-time
          // educational note + fires the seal-hit demand signal (no-op for
          // agents that have a skills surface).
          if (e.key === '/') {
            sealedHint.notifySlash()
          }
          handleSlashKeyDown(e)
        }}
        onTextareaSelect={(e) => setCursorPos(e.currentTarget.selectionStart)}
      />
    )

    return (
      <>
        <div className="flex w-full flex-col gap-3">
          {sealedHint.visible && <SealedSlashHint agentName={descriptor.name} onDismiss={sealedHint.dismiss} />}
          {/* Skills chips for interactive (Library-using) agents. Sealed /
              no-skills agents instead surface a dismissible notice INSIDE the
              prompt-input header below (see `header`), so it shares the
              composer's rounded card. `hidden` (ongoing thread) suppresses both.
              Pinning is a "starting a new chat" affordance. */}
          {composerNoticeKind === null && (
            <ChatSkillsBar
              onAddToChat={handleAddChipFromBar}
              onAddInstruction={insertInstructionText}
              sealed={false}
              hidden={hasMessages}
            />
          )}
          {/* Sealed / no-skills agents: the notice is a card that sits BEHIND
              the prompt input — SAME width as it — peeking out above it, its lower
              edge tucked behind the composer via the prompt input's negative top
              margin. Dismiss → normal composer. */}
          {showComposerNotice && composerNoticeKind !== null ? (
            <div className="relative flex flex-col">
              <div className="rounded-t-2xl border border-border bg-secondary pt-1 pb-6 dark:bg-sidebar-accent">
                <ComposerSkillsNotice
                  kind={composerNoticeKind}
                  onDismiss={() => setDismissedNoticeAgent(descriptor.id)}
                />
              </div>
              <div className="relative z-10 -mt-4">{promptInput}</div>
            </div>
          ) : (
            promptInput
          )}
        </div>
        <ContextOverflowModal
          isOpen={showOverflowModal}
          onClose={() => setShowOverflowModal(false)}
          maxTokens={maxTokens ?? undefined}
          onNewChat={handleNewChat}
        />
      </>
    )
  },
)
