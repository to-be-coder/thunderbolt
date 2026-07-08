/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useMemo } from 'react'
import { useSettings } from './use-settings'

/**
 * User setting key: per-agent icon overrides for the member's personal ACP
 * agents, stored as a small JSON map (agentId → icon KEY). The personal `agents`
 * synced table carries no icon column (endpoint references only), and the glyph
 * is purely a per-member preference — so it rides here rather than in the table.
 * The default glyph still comes from the handshake; this only records overrides.
 */
export const PERSONAL_AGENT_ICONS_SETTING_KEY = 'personal_agent_icons'

/** Reactive icon overrides map + a setter for one agent's glyph. */
export const usePersonalAgentIcons = (): {
  icons: Record<string, string>
  setIcon: (agentId: string, key: string) => Promise<void>
} => {
  const { personalAgentIcons } = useSettings({ personal_agent_icons: '{}' })
  const value = personalAgentIcons.value
  const icons = useMemo(() => {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
    } catch {
      return {}
    }
  }, [value])
  const setIcon = (agentId: string, key: string) =>
    personalAgentIcons.setValue(JSON.stringify({ ...icons, [agentId]: key }))
  return { icons, setIcon }
}
