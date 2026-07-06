/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useAgentDescriptor as useAgentDescriptor_default } from '@/chats/agent-descriptor'
import { useChatStore, useCurrentChatSession } from '@/chats/chat-store'
import { ModelSelector } from '@/components/ui/model-selector'
import { useIsMobile } from '@/hooks/use-mobile'
import { useNavigate } from 'react-router'
import { AdvertisedPicker } from './advertised-picker'

type ChatModelPickerProps = {
  useAgentDescriptor?: typeof useAgentDescriptor_default
}

/**
 * Model slot for the chat composer — data-driven, one component for every agent
 * kind (T2: "the picker shows what the agent card advertises"):
 *
 * - Thunderbolt agent → the user's connected models (BYO + company-supplied),
 *   the full {@link ModelSelector}. When zero models are connected the slot is
 *   empty — the composer's blocked state (T5c) prompts "Connect a model".
 * - Team / personal ACP agents → the card's `advertisedModels`: a static chip
 *   for one/none (personal v1 cards advertise nothing → "Set by your
 *   organization"), or a bounded picker for two or more.
 */
export const ChatModelPicker = ({ useAgentDescriptor = useAgentDescriptor_default }: ChatModelPickerProps = {}) => {
  const models = useChatStore((state) => state.models)
  const setSelectedModel = useChatStore((state) => state.setSelectedModel)
  const navigate = useNavigate()
  const { isMobile } = useIsMobile()
  const { id: chatThreadId, selectedModel, chatThread } = useCurrentChatSession()
  const descriptor = useAgentDescriptor()

  if (descriptor.kind !== 'thunderbolt') {
    return (
      <AdvertisedPicker
        options={descriptor.advertisedModels}
        emptyLabel="Set by your organization"
        ariaLabel="Advertised model"
      />
    )
  }

  if (models.length === 0) {
    return null
  }

  const handleModelChange = (modelId: string) => {
    setSelectedModel(chatThreadId, modelId).catch(console.error)
  }

  return (
    <ModelSelector
      variant="bordered"
      models={models}
      selectedModel={selectedModel ?? null}
      chatThread={chatThread ?? null}
      onModelChange={handleModelChange}
      onAddModels={() => navigate('/settings/models')}
      side={isMobile ? 'top' : 'bottom'}
      align="start"
    />
  )
}
