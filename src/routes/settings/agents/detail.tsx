/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useNavigate, useParams } from 'react-router'
import type { AgentCard } from '@shared/agent-cards'
import { useDatabase } from '@/contexts'
import { deleteAgent, updateSettings } from '@/dal'
import { THUNDERBOLT_HIDDEN_SETTING_KEY } from '@/hooks/use-thunderbolt-agent-hidden'
import { useAgents } from '@/dal/agents'
import { useTeamAgents } from '@/dal/use-team-agents'
import { builtInAgent } from '@/defaults/agents'
import type { Agent } from '@/types/acp'
import { ThunderboltAgentDetail } from '@/components/settings/agents/detail/thunderbolt-agent-detail'
import { CompanyAgentDetail } from '@/components/settings/agents/detail/company-agent-detail'
import { PersonalAgentDetail } from '@/components/settings/agents/detail/personal-agent-detail'
import { RevokedAgentDetail } from '@/components/settings/agents/detail/revoked-agent-detail'

/** Which detail view an `:agentId` resolves to. A team id that no longer resolves
 *  (grant revoked) and any unknown id both collapse to `revoked` (spec §5). */
export type AgentDetailTarget =
  | { kind: 'thunderbolt' }
  | { kind: 'team'; card: AgentCard }
  | { kind: 'personal'; agent: Agent }
  | { kind: 'revoked' }

/** Pure resolver — the built-in id wins first, then the team cache, then the
 *  personal agents; anything else is unavailable. Exported for unit testing. */
export const resolveAgentDetailTarget = (
  agentId: string | undefined,
  teamCards: AgentCard[],
  personalAgents: Agent[],
): AgentDetailTarget => {
  if (!agentId || agentId === builtInAgent.id) {
    return agentId === builtInAgent.id ? { kind: 'thunderbolt' } : { kind: 'revoked' }
  }
  const card = teamCards.find((c) => c.id === agentId)
  if (card) {
    return { kind: 'team', card }
  }
  const agent = personalAgents.find((a) => a.id === agentId)
  if (agent) {
    return { kind: 'personal', agent }
  }
  return { kind: 'revoked' }
}

/**
 * Read-only agent detail route (`/settings/agents/:agentId`). Resolves the id to
 * one of the three agent kinds (agents-page-spec §2–4) and renders the matching
 * view through the shared detail anatomy, or the revoked/collapsed state (§5).
 */
export default function AgentDetailPage() {
  const { agentId } = useParams()
  const navigate = useNavigate()
  const db = useDatabase()
  const teamCards = useTeamAgents()
  const personalAgents = useAgents()

  const target = resolveAgentDetailTarget(agentId, teamCards, personalAgents)

  const onBack = () => navigate('/settings/agents')

  if (target.kind === 'thunderbolt') {
    return (
      <ThunderboltAgentDetail
        onBack={onBack}
        onRemove={async () => {
          await updateSettings(db, { [THUNDERBOLT_HIDDEN_SETTING_KEY]: 'true' })
          navigate('/settings/agents')
        }}
      />
    )
  }

  if (target.kind === 'team') {
    return <CompanyAgentDetail card={target.card} onBack={onBack} />
  }

  if (target.kind === 'personal') {
    const personal = target.agent
    return (
      <PersonalAgentDetail
        agent={personal}
        onBack={onBack}
        onRemove={async () => {
          await deleteAgent(db, personal.id)
          navigate('/settings/agents')
        }}
      />
    )
  }

  return <RevokedAgentDetail onBack={onBack} />
}
