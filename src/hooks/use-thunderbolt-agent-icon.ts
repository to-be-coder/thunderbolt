/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { builtInAgent } from '@/defaults/agents'
import { useSettings } from './use-settings'

/**
 * User setting key: the member's chosen icon KEY for the built-in Thunderbolt
 * agent. The agent itself lives in code (`src/defaults/agents.ts`); its default
 * glyph is the handshake/code icon, but — like a personal agent — the member may
 * override it. Purely a per-user preference, so it round-trips through settings.
 */
export const THUNDERBOLT_ICON_SETTING_KEY = 'thunderbolt_agent_icon'

/** Reactive read of {@link THUNDERBOLT_ICON_SETTING_KEY}, defaulting to the
 *  built-in agent's own icon key when the member hasn't overridden it. */
export const useThunderboltAgentIcon = (): string => {
  const { thunderboltAgentIcon } = useSettings({ thunderbolt_agent_icon: builtInAgent.icon ?? 'zap' })
  return thunderboltAgentIcon.value
}
