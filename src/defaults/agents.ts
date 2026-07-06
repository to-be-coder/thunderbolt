/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Agent } from '@/types/acp'

/**
 * The built-in Thunderbolt agent — a fixed identity that lives in code only.
 * Exactly one per user, never a database row, zero stored config: the DAL
 * refuses to create, update, delete, or attach secrets/settings rows for this
 * id (see `src/dal/agents.ts`).
 *
 * The chat layer treats this special case as a thin adapter over the existing
 * `aiFetchStreamingResponse` pipeline; the ACP protocol is not involved.
 * Always present, always first in the agent list, never removable.
 *
 * Chat threads reference it as agentRef `{ kind: 'thunderbolt', agentId: null }`
 * (see `getAgentRef` in `src/dal/chat-threads.ts`).
 */
export const builtInAgent: Agent = {
  id: 'thunderbolt-built-in',
  name: 'Thunderbolt',
  type: 'built-in',
  transport: 'in-process',
  url: null,
  description: 'Built-in AI assistant',
  icon: 'zap',
  isSystem: 1,
  enabled: 1,
  deletedAt: null,
  userId: null,
}
