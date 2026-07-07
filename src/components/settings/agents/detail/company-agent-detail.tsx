/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Info } from 'lucide-react'
import type { AgentCard, AgentCardCapability } from '@shared/agent-cards'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AgentDetailLayout, DetailSection } from './agent-detail-layout'
import { CompanyCapabilityRow } from './company-capability-row'

/**
 * External team agents reach their upstream through the service-identity relay,
 * which strips the caller bearer — so the transport CANNOT pass the invoker's
 * identity (Stage-3 finding). `as_you` capabilities therefore resolve to
 * `unsupported_as_you` and show truthfully. This is the v1 constant.
 */
const TRANSPORT_PASSES_INVOKER = false

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
  onConnectCapability?: (capability: AgentCardCapability) => void
  onDisconnectCapability?: (capability: AgentCardCapability) => void
}

/**
 * Read-only rendered agent card for a company (team) agent (agents-page-spec §3).
 * The card is DISPLAY-ONLY (INVARIANT 2) — capabilities are plain-language
 * labels, never skill names or prompt text. Models are supplied by the org (with
 * a tooltip saying so); the only interactive elements are the `as_you` credential
 * rows (Connect / Disconnect).
 */
export const CompanyAgentDetail = ({
  card,
  onBack,
  onConnectCapability = () => {},
  onDisconnectCapability = () => {},
}: CompanyAgentDetailProps) => (
  <AgentDetailLayout
    name={card.name}
    subtitle={`Granted via ${card.grantedVia}`}
    body={
      <>
        {card.description && (
          <DetailSection title="About">
            <p className="text-base">{card.description}</p>
          </DetailSection>
        )}

        <CategorySection card={card} />

        <DetailSection title="What it can do">
          <ul className="flex flex-col" data-testid="capability-list">
            {card.capabilities.map((capability, index) => (
              <CompanyCapabilityRow
                // Capability labels are display copy and may repeat; index keys
                // are stable for this static, non-reordered list.
                key={`${capability.label}-${index}`}
                capability={capability}
                transportPassesInvoker={TRANSPORT_PASSES_INVOKER}
                onConnect={onConnectCapability}
                onDisconnect={onDisconnectCapability}
              />
            ))}
          </ul>
        </DetailSection>

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
    }
    onBack={onBack}
  />
)
