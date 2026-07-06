/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AgentCard } from '@shared/agent-cards'
import { StatusPill } from './status-pill'

/**
 * The GENERATED, NON-EDITABLE reachability preview: renders exactly the card a
 * granted member would see, from the admin's plain-language inputs. Read-only by
 * construction (no inputs, no handlers) — the admin edits the form; this shows the
 * result.
 */
export const AgentCardPreview = ({ card }: { card: AgentCard }) => (
  <div aria-label="Member card preview" className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
    <div className="flex items-center gap-2">
      <span className="text-2xl leading-none" aria-hidden>
        {card.icon || '🤖'}
      </span>
      <div className="flex flex-col">
        <span className="font-semibold">{card.name || 'Untitled agent'}</span>
        {card.managedBy && <span className="text-xs text-muted-foreground">Managed by {card.managedBy}</span>}
      </div>
      <span className="ml-auto">
        <StatusPill tone={card.category === 'sealed' ? 'muted' : 'info'}>{card.category}</StatusPill>
      </span>
    </div>

    {card.description && <p className="text-sm text-muted-foreground">{card.description}</p>}

    {card.capabilities.length > 0 && (
      <ul className="flex flex-col gap-1">
        {card.capabilities.map((capability, index) => (
          <li key={`${capability.label}-${index}`} className="flex items-center gap-2 text-sm">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            {capability.label}
            {capability.credentialMode && (
              <span className="text-xs text-muted-foreground">
                ({capability.credentialMode === 'as_you' ? 'runs as you' : 'service account'})
              </span>
            )}
          </li>
        ))}
      </ul>
    )}

    {card.advertisedModels.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {card.advertisedModels.map((model) => (
          <span key={model} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {model}
          </span>
        ))}
      </div>
    )}
  </div>
)
