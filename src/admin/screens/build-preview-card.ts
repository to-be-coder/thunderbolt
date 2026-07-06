/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AgentCard, AgentCardCapability } from '@shared/agent-cards'
import type { AgentCategory, CapabilityInput, CredentialMode } from '../api/types'

/** The display-safe subset of the registry form used to render the member's card
 *  preview. Mirrors admin-service's `SafeAgentFields` — display copy only, never
 *  executable identifiers (INVARIANT 2). */
export type PreviewInput = {
  name: string
  icon: string
  description: string
  category: AgentCategory
  managedBy: string
  advertisedModels: string[]
  capabilities: CapabilityInput[]
}

const toCardCapability = (capability: CapabilityInput): AgentCardCapability => {
  const mode: CredentialMode | undefined = capability.credentialMode
  return mode === undefined ? { label: capability.label } : { label: capability.label, credentialMode: mode }
}

/**
 * Build the read-only card a member will see, locally, from the admin's plain-
 * language inputs. This mirrors `admin-service/src/discovery/build-card.ts` field
 * by field rather than round-tripping through discovery — the preview must reflect
 * unsaved edits and stay display-only (never spread an agent row).
 */
export const buildPreviewCard = (input: PreviewInput): AgentCard => ({
  id: 'preview',
  name: input.name,
  icon: input.icon,
  description: input.description,
  category: input.category,
  capabilities: input.capabilities.filter((capability) => capability.label.trim() !== '').map(toCardCapability),
  advertisedModels: input.advertisedModels,
  managedBy: input.managedBy,
  grantedVia: 'Preview',
})
