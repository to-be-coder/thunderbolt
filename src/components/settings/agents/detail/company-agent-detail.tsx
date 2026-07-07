/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Building2, Info } from 'lucide-react'
import type { AgentCard } from '@shared/agent-cards'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AgentDetailLayout, DetailSection } from './agent-detail-layout'

/** Tool KINDS shown destructive-first — the scariest-sounding facts are the
 *  safest to show because they name no target, and they're the trust question
 *  (spec §4). Order: delete, execute, then edit, fetch, read. */
const KIND_ORDER = ['delete', 'execute', 'edit', 'fetch', 'read']
const KIND_LABEL: Record<string, string> = {
  delete: 'Delete',
  execute: 'Execute',
  edit: 'Edit',
  fetch: 'Fetch',
  read: 'Read',
}
const orderedKinds = (kinds: string[]): string[] =>
  [...kinds].sort((a, b) => {
    const ia = KIND_ORDER.indexOf(a)
    const ib = KIND_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
const isDestructiveKind = (kind: string): boolean => kind === 'delete' || kind === 'execute'

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

/** The Category section names the card's category (Extensible / Sealed). The
 *  explanation lives in a tooltip on the word itself (agents-page-spec §3). */
const CategorySection = ({ card }: { card: AgentCard }) => {
  const extensible = card.category === 'extensible'
  const explanation = extensible
    ? 'Your enabled Library items (skills, MCP servers) are available to this agent.'
    : 'This agent uses only what your organization built into it.'
  return (
    <DetailSection title="Category">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="w-fit cursor-help text-base font-medium underline decoration-dotted underline-offset-4 decoration-muted-foreground"
            data-testid={`category-${card.category}`}
          >
            {extensible ? 'Extensible' : 'Sealed'}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm">{explanation}</TooltipContent>
      </Tooltip>
    </DetailSection>
  )
}

/** Info tooltip next to the Integrations section — the abstraction is the point. */
const IntegrationsInfoTooltip = () => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label="What are these?"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info className="size-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-sm">
      The kinds of systems this agent connects to — never the specific instance, endpoint, scope, or credentials.
    </TooltipContent>
  </Tooltip>
)

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
      Models are supplied by your organization — you can’t change them for this agent.
    </TooltipContent>
  </Tooltip>
)

type CompanyAgentDetailProps = {
  card: AgentCard
  onBack: () => void
}

/**
 * Read-only rendered agent card for a company (team) agent (agent-card-content
 * spec §4). Built entirely from `AgentCard`, never live ACP. "What it can do" is
 * tool KINDS as verbs (class of action, never the target), destructive-first;
 * Accepts is input plumbing; Available modes is the RANGE the agent supports.
 * Members configure nothing here.
 */
export const CompanyAgentDetail = ({ card, onBack }: CompanyAgentDetailProps) => (
  <AgentDetailLayout
    icon={Building2}
    name={card.name}
    subtitle={`Granted via ${card.grantedVia}`}
    body={<CompanyCardBody card={card} />}
    onBack={onBack}
  />
)

/** The member card's SECTIONED BODY (About → Category → What it can do →
 *  Integrations → Accepts → Available modes → Models), split out so the admin's
 *  "Preview member card" (spec §5.2b) renders the EXACT same thing a member sees. */
export const CompanyCardBody = ({ card }: { card: AgentCard }) => (
  <>
    {card.description && (
      <DetailSection title="About">
        <p className="text-base">{card.description}</p>
      </DetailSection>
    )}

    <CategorySection card={card} />

    {card.toolKinds && card.toolKinds.length > 0 && (
      <DetailSection title="What it can do">
        <div className="flex flex-wrap gap-1.5" data-testid="tool-kinds">
          {orderedKinds(card.toolKinds).map((kind) => (
            <span
              key={kind}
              className={cn(
                'rounded-md px-2 py-0.5 text-base',
                isDestructiveKind(kind) ? 'bg-destructive/10 font-medium text-destructive' : 'bg-muted text-foreground',
              )}
            >
              {KIND_LABEL[kind] ?? kind}
            </span>
          ))}
        </div>
      </DetailSection>
    )}

    {card.integrations && card.integrations.length > 0 && (
      <DetailSection title="Integrations" titleExtra={<IntegrationsInfoTooltip />}>
        <div className="flex flex-wrap gap-1.5" data-testid="company-integrations">
          {card.integrations.map((integration) => (
            <span key={integration} className="rounded-md bg-muted px-2 py-0.5 text-base">
              {integration}
            </span>
          ))}
        </div>
      </DetailSection>
    )}

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
        <p className="text-sm text-muted-foreground">The range this agent supports — you pick one per chat.</p>
      </DetailSection>
    )}

    <DetailSection title="Models" titleExtra={<ModelsInfoTooltip />}>
      {card.advertisedModels.length === 0 ? (
        <span className="text-sm text-muted-foreground" data-testid="company-model-line">
          Set by your organization
        </span>
      ) : (
        <div className="flex flex-wrap gap-1.5" data-testid="company-model-line">
          {card.advertisedModels.map((model) => (
            <span key={model} className="rounded-md bg-muted px-2 py-0.5 text-base">
              {model}
            </span>
          ))}
        </div>
      )}
    </DetailSection>
  </>
)
