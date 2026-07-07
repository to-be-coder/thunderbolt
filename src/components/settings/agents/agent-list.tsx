/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Building2, Zap } from 'lucide-react'
import type { AgentCard, OrgPolicy } from '@shared/agent-cards'
import { builtInAgent } from '@/defaults/agents'
import { useNewlyGrantedTeamAgents as useNewlyGrantedTeamAgents_default } from '@/hooks/use-newly-granted-agents'
import type { Agent } from '@/types/acp'
import { AgentRow } from './agent-row'
import { PersonalAgentRow } from './personal-agent-row'
import { companyProvenanceLine, nativeProvenanceLine } from './agent-provenance'

/** The section label copy mirrors the composer agent selector (spec §1). */
const ORG_SECTION_LABEL = 'FROM YOUR ORGANIZATION'
const YOURS_SECTION_LABEL = 'YOURS'

const SectionLabel = ({ children }: { children: string }) => (
  <h2 className="text-[length:var(--font-size-xs)] font-medium tracking-wide text-muted-foreground uppercase">
    {children}
  </h2>
)

type AgentListProps = {
  teamCards: AgentCard[]
  personalAgents: Agent[]
  policy: OrgPolicy
  /** The member removed the built-in Thunderbolt agent (a per-user preference) —
   *  hide its row here even when org policy would otherwise show it. */
  nativeHidden?: boolean
  /** The agent id whose detail is currently open — brightens that row. */
  selectedId?: string | null
  /** Opens the read-only detail view for the given agent id. */
  onOpenAgent: (agentId: string) => void
  /** Injectable newly-granted diff (tests drive fixtures without the DB). */
  useNewlyGrantedTeamAgents?: typeof useNewlyGrantedTeamAgents_default
}

/**
 * The Agents list (agents-page-spec §1): two labeled sections mirroring the
 * composer selector — "FROM YOUR ORGANIZATION" (team cards) then "YOURS" (the
 * Thunderbolt agent pinned first, then personal ACP agents). Every row opens a
 * read-only detail view; nothing is editable.
 *
 * Sections honor the personal-agent policy (spec §5), always by ABSENCE, never
 * a disabled/locked state:
 *  - `no_native`    → the Thunderbolt row is absent (personal ACP rows remain).
 *  - `company_only` → the entire YOURS section is absent.
 *  - consumer / nothing granted → the ORG section is absent.
 */
export const AgentList = ({
  teamCards,
  personalAgents,
  policy,
  nativeHidden = false,
  selectedId,
  onOpenAgent,
  useNewlyGrantedTeamAgents = useNewlyGrantedTeamAgents_default,
}: AgentListProps) => {
  const showOrgSection = teamCards.length > 0
  const showYoursSection = policy.personalAgentPolicy !== 'company_only'
  const showNativeRow = policy.personalAgentPolicy !== 'no_native' && !nativeHidden
  const newlyGranted = useNewlyGrantedTeamAgents()

  return (
    <div className="flex flex-col gap-6" data-testid="agent-list">
      {showOrgSection && (
        <section className="flex flex-col gap-2" data-testid="agent-section-org">
          <SectionLabel>{ORG_SECTION_LABEL}</SectionLabel>
          <div className="flex flex-col gap-2">
            {teamCards.map((card) => (
              <AgentRow
                key={card.id}
                agentId={card.id}
                icon={Building2}
                name={card.name}
                // Static category — the roster opens no connection (spec §0/§1).
                provenanceLine={companyProvenanceLine(card)}
                isNewlyGranted={newlyGranted.has(card.id)}
                selected={selectedId === card.id}
                onOpen={() => onOpenAgent(card.id)}
              />
            ))}
          </div>
        </section>
      )}

      {showYoursSection && (
        <section className="flex flex-col gap-2" data-testid="agent-section-yours">
          <SectionLabel>{YOURS_SECTION_LABEL}</SectionLabel>
          <div className="flex flex-col gap-2">
            {showNativeRow && (
              <AgentRow
                agentId={builtInAgent.id}
                icon={Zap}
                name={builtInAgent.name}
                provenanceLine={nativeProvenanceLine()}
                selected={selectedId === builtInAgent.id}
                onOpen={() => onOpenAgent(builtInAgent.id)}
              />
            )}
            {personalAgents.map((agent) => (
              <PersonalAgentRow
                key={agent.id}
                agent={agent}
                selected={selectedId === agent.id}
                onOpen={() => onOpenAgent(agent.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
