/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * The built-in EXTENSIONS Library item (agents-page-spec §2 / Stage 5, T6).
 *
 * Extensions are the app's built-in tool providers — capabilities that ship
 * with Thunderbolt rather than being user-added (Skills) or connected (MCP /
 * Integrations). Each is gated by a boolean setting so a member can enable or
 * disable it; the enabled set feeds the universal Library summary shown on the
 * Thunderbolt agent detail view and applies to every non-confidential agent.
 *
 * v1 ships exactly one extension (Tasks). The registry is the single source of
 * truth for the Library page and the live "N extensions" count.
 */
export type ExtensionDescriptor = {
  id: string
  name: string
  description: string
  /** The boolean setting key that toggles this extension on/off. */
  settingKey: 'experimental_feature_tasks'
}

export const builtInExtensions: readonly ExtensionDescriptor[] = [
  {
    id: 'tasks',
    name: 'Tasks',
    description: 'Let agents add and manage items on your to-do list.',
    settingKey: 'experimental_feature_tasks',
  },
]
