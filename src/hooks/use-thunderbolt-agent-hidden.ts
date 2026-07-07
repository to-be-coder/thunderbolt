/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useSettings } from './use-settings'

/**
 * User setting key: when `'true'`, the member has removed the built-in
 * Thunderbolt agent from their lists. The agent itself is never deleted — it
 * lives in code and remains the chat fallback (see `src/defaults/agents.ts`);
 * this is purely a per-user visibility preference, so it can be restored.
 */
export const THUNDERBOLT_HIDDEN_SETTING_KEY = 'thunderbolt_agent_hidden'

/** Reactive read of {@link THUNDERBOLT_HIDDEN_SETTING_KEY} — `true` hides the
 *  built-in agent from the member's agent lists. Defaults to `false`. */
export const useThunderboltAgentHidden = (): boolean => {
  const { thunderboltAgentHidden } = useSettings({ thunderbolt_agent_hidden: false })
  return thunderboltAgentHidden.value
}
