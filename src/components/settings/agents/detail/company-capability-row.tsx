/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AgentCardCapability } from '@shared/agent-cards'
import { resolveCapabilityAvailability } from '@/chats/capability-availability'
import { Button } from '@/components/ui/button'

/** The control a capability row shows, derived purely from availability. Only
 *  `as_you` rows are ever interactive; `unsupported_as_you` renders truthfully
 *  with no connect affordance and never silently falls back to another identity. */
export type CapabilityControl = 'none' | 'connect' | 'disconnect' | 'unsupported'

/** Map a capability + transport into the control its row should render.
 *  Exported for unit testing without rendering. */
export const capabilityControl = (
  capability: AgentCardCapability,
  transportPassesInvoker: boolean,
): CapabilityControl => {
  const availability = resolveCapabilityAvailability(capability, transportPassesInvoker)
  if (availability.state === 'unsupported_as_you') {
    return 'unsupported'
  }
  if (availability.state === 'needs_connection') {
    return 'connect'
  }
  // available: an `as_you` capability that's available is a connected one the
  // member can disconnect; a service-account capability has no control.
  return capability.credentialMode === 'as_you' ? 'disconnect' : 'none'
}

type CompanyCapabilityRowProps = {
  capability: AgentCardCapability
  /** FALSE for external team agents (the v1 case) — they reach upstream through
   *  the service-identity relay and cannot pass the invoker's identity. */
  transportPassesInvoker: boolean
  onConnect: (capability: AgentCardCapability) => void
  onDisconnect: (capability: AgentCardCapability) => void
}

/**
 * One "WHAT IT CAN DO" row on a company agent (agents-page-spec §3). The label
 * is the card's plain-language capability copy (never a skill name, never prompt
 * text). `as_you` rows carry live connect state — the page's ONLY interactive
 * credential elements — driven by {@link resolveCapabilityAvailability}.
 */
export const CompanyCapabilityRow = ({
  capability,
  transportPassesInvoker,
  onConnect,
  onDisconnect,
}: CompanyCapabilityRowProps) => {
  const control = capabilityControl(capability, transportPassesInvoker)

  return (
    <li className="flex items-center justify-between gap-3 py-1" data-testid="capability-row">
      <span className="text-[length:var(--font-size-body)]">{capability.label}</span>
      {control === 'connect' && (
        <Button size="sm" variant="outline" onClick={() => onConnect(capability)} data-testid="capability-connect">
          Connect
        </Button>
      )}
      {control === 'disconnect' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDisconnect(capability)}
          data-testid="capability-disconnect"
        >
          Disconnect
        </Button>
      )}
      {control === 'unsupported' && (
        <span
          className="text-[length:var(--font-size-xs)] text-muted-foreground shrink-0"
          data-testid="capability-unsupported"
        >
          Unavailable as you
        </span>
      )}
    </li>
  )
}
