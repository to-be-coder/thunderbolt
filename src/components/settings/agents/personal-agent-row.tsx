/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Agent } from '@/types/acp'
import { AgentRow } from './agent-row'
import { personalProvenanceLine } from './agent-provenance'

type PersonalAgentRowProps = {
  agent: Agent
  /** The member's icon override (Lucide KEY or uploaded image), resolved by the
   *  parent list so the row stays in sync with the detail picker. */
  iconValue: string
  selected?: boolean
  onOpen: () => void
}

/**
 * A personal ACP agent list row (agents-page-spec §1). Shows a STATIC endpoint
 * provenance — the roster never opens a connection (spec §0/§1), so there is no
 * live status probe here; reachability lives on the detail's on-demand Test.
 */
export const PersonalAgentRow = ({ agent, iconValue, selected, onOpen }: PersonalAgentRowProps) => (
  <AgentRow
    agentId={agent.id}
    iconValue={iconValue}
    name={agent.name}
    provenanceLine={personalProvenanceLine(agent.url)}
    selected={selected}
    onOpen={onOpen}
  />
)
