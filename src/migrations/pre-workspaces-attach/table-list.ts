/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Canonical list of legacy `thunderbolt-sync.db` tables to copy into the new
 * `server-<id>.db` during the pre-Workspaces upgrade. Rows are copied over the
 * columns both schemas share — no synthetic columns are stamped.
 */
export type LegacyTable = {
  readonly name: string
}

export const syncedLegacyTables: readonly LegacyTable[] = [
  { name: 'chat_threads' },
  { name: 'chat_messages' },
  { name: 'tasks' },
  { name: 'models' },
  { name: 'prompts' },
  { name: 'skills' },
  { name: 'triggers' },
  { name: 'modes' },
  { name: 'model_profiles' },
  { name: 'agents' },
  { name: 'settings' },
  { name: 'devices' },
]

export const localLegacyTables: readonly LegacyTable[] = [
  { name: 'mcp_servers' },
  // models_secrets is intentionally absent: its api_key value is folded into
  // models.api_key by the local-db-migration (THU-579 reverts THU-505).
  { name: 'integrations_secrets' },
  { name: 'mcp_secrets' },
  { name: 'agents_secrets' },
  { name: 'agents_system' },
]

export const allLegacyTables: readonly LegacyTable[] = [...syncedLegacyTables, ...localLegacyTables]
