/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useAgentDescriptor as useAgentDescriptor_default } from '@/chats/agent-descriptor'
import { useChatStore, useCurrentChatSession } from '@/chats/chat-store'
import { useHaptics } from '@/hooks/use-haptics'
import { ModeSelector } from '@/components/ui/mode-selector'
import { useCallback } from 'react'
import { AdvertisedPicker } from './advertised-picker'

type ChatModePickerProps = {
  iconOnly?: boolean
  useAgentDescriptor?: typeof useAgentDescriptor_default
}

/**
 * Mode slot for the chat composer — data-driven, one component for every agent
 * kind (T2). Modes are NEVER configured per agent; they derive from what the
 * agent advertises:
 *
 * - Thunderbolt agent → the seeded Chat/Search/Research {@link ModeSelector}.
 * - Team / personal ACP agents → derived from the card's `capabilities`. Zero
 *   capabilities → the slot is absent (v1 ACP cards advertise nothing); one/many
 *   render a static chip / bounded picker of capability labels.
 */
export const ChatModePicker = ({
  iconOnly = false,
  useAgentDescriptor = useAgentDescriptor_default,
}: ChatModePickerProps) => {
  const modes = useChatStore((state) => state.modes)
  const setSelectedMode = useChatStore((state) => state.setSelectedMode)
  const { id: chatThreadId, selectedMode } = useCurrentChatSession()
  const { triggerSelection } = useHaptics()
  const descriptor = useAgentDescriptor()

  const handleModeChange = useCallback(
    (modeId: string) => {
      triggerSelection()
      setSelectedMode(chatThreadId, modeId).catch(console.error)
    },
    [chatThreadId, setSelectedMode, triggerSelection],
  )

  if (descriptor.kind !== 'thunderbolt') {
    const capabilityLabels = descriptor.capabilities.map((c) => c.label)
    if (capabilityLabels.length === 0) {
      return null
    }
    return <AdvertisedPicker options={capabilityLabels} emptyLabel="" ariaLabel="Agent capability" />
  }

  if (modes.length === 0) {
    return null
  }

  return <ModeSelector modes={modes} selectedMode={selectedMode} onModeChange={handleModeChange} iconOnly={iconOnly} />
}
