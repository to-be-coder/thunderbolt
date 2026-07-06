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
  /** Legacy→new column renames applied during the copy. The value is read from
   *  the legacy column (key) and written to the new column (value). Used when a
   *  column was renamed since the legacy schema, e.g. `agents.url`→`acp_url`. */
  readonly columnRenames?: Readonly<Record<string, string>>
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
  // Stage 1 slimmed `agents` to personal-ACP-only and renamed `url`→`acp_url`;
  // the legacy endpoint carries over under its new name.
  { name: 'agents', columnRenames: { url: 'acp_url' } },
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
