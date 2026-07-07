/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Globe } from 'lucide-react'
import { useAcpAgentStatus as useAcpAgentStatus_default } from '@/hooks/use-acp-agent-status'
import type { Agent } from '@/types/acp'
import { AgentRow } from './agent-row'
import { personalProvenanceLine } from './agent-provenance'

type PersonalAgentRowProps = {
  agent: Agent
  selected?: boolean
  onOpen: () => void
  /** Injectable for tests — production probes the real endpoint on mount. */
  useAcpAgentStatus?: typeof useAcpAgentStatus_default
}

/**
 * A personal ACP agent list row (agents-page-spec §1). Wraps the presentational
 * {@link AgentRow} with the live status probe so the row shows ● online /
 * ○ offline. The probe hook is injectable for component tests.
 */
export const PersonalAgentRow = ({
  agent,
  selected,
  onOpen,
  useAcpAgentStatus = useAcpAgentStatus_default,
}: PersonalAgentRowProps) => {
  const { status } = useAcpAgentStatus(agent.url)
  return (
    <AgentRow
      agentId={agent.id}
      icon={Globe}
      name={agent.name}
      provenanceLine={personalProvenanceLine(agent.url)}
      status={status}
      selected={selected}
      onOpen={onOpen}
    />
  )
}
