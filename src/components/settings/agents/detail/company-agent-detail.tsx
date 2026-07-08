/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Info } from 'lucide-react'
import type { AgentCard } from '@shared/agent-cards'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useEnabledSkills as useEnabledSkills_default } from '@/skills/use-skills'
import { AgentDetailLayout, DetailSection, SubSection } from './agent-detail-layout'
import { AgentSkillsLines } from './agent-skills-section'
import { agentIconFor } from './agent-icons'

/** "Accepts images, audio · Remembers context across a session" from the flags. */
const acceptsLine = (accepts: string[]): string => {
  const modalities = accepts.filter((a) => a !== 'context')
  const parts: string[] = []
  if (modalities.length > 0) {
    parts.push(`Accepts ${modalities.join(', ')}`)
  }
  if (accepts.includes('context')) {
    parts.push('Remembers context across a session')
  }
  return parts.join(' · ')
}

/** Info tooltip next to the Models section — the member can't change these. */
const ModelsInfoTooltip = () => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label="Where do these models come from?"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info className="size-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-sm">
      Models are supplied by your organization. You can’t change them for this agent.
    </TooltipContent>
  </Tooltip>
)

/** A wrap of abstracted-kind chips, or an explicit muted "None" when the agent
 *  uses none — so the member always sees the answer, never a missing section. */
const UsesChips = ({ items, testid }: { items: string[] | undefined; testid: string }) =>
  items && items.length > 0 ? (
    <div className="flex flex-wrap gap-1.5" data-testid={testid}>
      {items.map((item) => (
        <span key={item} className="rounded-md bg-muted px-2 py-0.5 text-base text-primary">
          {item}
        </span>
      ))}
    </div>
  ) : (
    <p className="text-base text-primary" data-testid={testid}>
      None
    </p>
  )

type CompanyAgentDetailProps = {
  card: AgentCard
  onBack: () => void
  /** Injectable for tests; production uses the real member-side skills hook. */
  useEnabledSkills?: typeof useEnabledSkills_default
}

/**
 * Read-only rendered agent card for a company (team) agent (agent-card-content
 * spec §4). Built entirely from `AgentCard`, never live ACP. "What it can do" is
 * tool KINDS as verbs (class of action, never the target), destructive-first;
 * Accepts is input plumbing; Available modes is the RANGE the agent supports.
 * Members configure nothing here.
 */
export const CompanyAgentDetail = ({
  card,
  onBack,
  useEnabledSkills = useEnabledSkills_default,
}: CompanyAgentDetailProps) => (
  <AgentDetailLayout
    icon={agentIconFor(card.icon)}
    name={card.name}
    subtitle={`Granted via ${card.grantedVia}`}
    body={<CompanyCardBody card={card} useEnabledSkills={useEnabledSkills} />}
    onBack={onBack}
  />
)

/** The member card's SECTIONED BODY (About → What it uses [Integrations · MCP ·
 *  Skills] → Accepts → Available modes → Models), split out so the admin's
 *  "Preview member card" renders the EXACT same thing a member sees. "What it
 *  uses" groups the agent's plumbing in one card; MCP is abstracted KINDS only,
 *  never wiring (INVARIANT 2). There is deliberately NO "What it can do" section:
 *  capability lives in the admin-authored `description` (About)
 *  — Thunderbolt must never synthesize member-facing capability text from tool
 *  names/wiring (INVARIANT 2). The Skills section shows on EVERY agent; the
 *  category is never shown as a word — it only decides whether the member's
 *  Library skills reach the agent (extensible) or are blocked (sealed).
 *  `useEnabledSkills` is injectable for tests (the display-only card otherwise
 *  reads member-side skills directly). */
export const CompanyCardBody = ({
  card,
  useEnabledSkills = useEnabledSkills_default,
}: {
  card: AgentCard
  useEnabledSkills?: typeof useEnabledSkills_default
}) => {
  const extensible = card.category === 'extensible'
  return (
    <>
      {card.description && (
        <DetailSection title="About">
          <p className="text-base">{card.description}</p>
        </DetailSection>
      )}

      {/* One "What it uses" card grouping the agent's plumbing — Integrations
          (abstracted kinds), MCP (abstracted tool-server kinds), and Skills. */}
      <DetailSection title="What it uses">
        <div className="flex flex-col gap-4">
          {/* Integrations and MCP always render — an agent that uses none says
              so explicitly ("None") rather than hiding the sub-section. */}
          <SubSection label="Integrations">
            <UsesChips items={card.integrations} testid="company-integrations" />
          </SubSection>

          <SubSection label="MCP">
            <UsesChips items={card.mcpKinds} testid="company-mcp" />
          </SubSection>

          <SubSection label="Skills">
            <AgentSkillsLines
              agentSkillCount={card.agentSkillCount ?? 0}
              libraryAllowed={extensible}
              useEnabledSkills={useEnabledSkills}
            />
          </SubSection>
        </div>
      </DetailSection>

      {card.accepts && card.accepts.length > 0 && (
        <DetailSection title="Accepts">
          <p className="text-base" data-testid="accepts-line">
            {acceptsLine(card.accepts)}
          </p>
        </DetailSection>
      )}

      {card.modes && card.modes.length > 0 && (
        <DetailSection title="Available modes">
          <div className="flex flex-wrap gap-1.5" data-testid="available-modes">
            {card.modes.map((mode) => (
              <span key={mode} className="rounded-md bg-muted px-2 py-0.5 text-base">
                {mode}
              </span>
            ))}
          </div>
        </DetailSection>
      )}

      {card.advertisedModels.length > 0 && (
        <DetailSection title="Models" titleExtra={<ModelsInfoTooltip />}>
          <div className="flex flex-wrap gap-1.5" data-testid="company-model-line">
            {card.advertisedModels.map((model) => (
              <span key={model} className="rounded-md bg-muted px-2 py-0.5 text-base">
                {model}
              </span>
            ))}
          </div>
        </DetailSection>
      )}
    </>
  )
}
