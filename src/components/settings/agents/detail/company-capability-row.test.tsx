/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import type { AgentCardCapability } from '@shared/agent-cards'
import { CompanyCapabilityRow, capabilityControl } from './company-capability-row'

afterEach(() => {
  cleanup()
})

const serviceCap: AgentCardCapability = { label: 'Reads the Sales knowledge base', credentialMode: 'service_account' }
const plainCap: AgentCardCapability = { label: 'Searches the web' }
const asYouUnconnected: AgentCardCapability = {
  label: 'Acts as you in Jira',
  credentialMode: 'as_you',
  connected: false,
}
const asYouConnected: AgentCardCapability = { label: 'Acts as you in Jira', credentialMode: 'as_you', connected: true }

describe('capabilityControl', () => {
  it('shows no control for service-account capabilities', () => {
    expect(capabilityControl(serviceCap, false)).toBe('none')
    expect(capabilityControl(plainCap, false)).toBe('none')
  })

  it('shows unsupported for as_you when the transport cannot pass invoker identity (external team agents)', () => {
    expect(capabilityControl(asYouUnconnected, false)).toBe('unsupported')
    expect(capabilityControl(asYouConnected, false)).toBe('unsupported')
  })

  it('shows connect for an unconnected as_you when the transport can pass identity', () => {
    expect(capabilityControl(asYouUnconnected, true)).toBe('connect')
  })

  it('shows disconnect for a connected as_you when the transport can pass identity', () => {
    expect(capabilityControl(asYouConnected, true)).toBe('disconnect')
  })
})

describe('CompanyCapabilityRow', () => {
  const noop = () => {}

  it('renders the plain-language label and no control for a service capability', () => {
    render(
      <CompanyCapabilityRow
        capability={serviceCap}
        transportPassesInvoker={false}
        onConnect={noop}
        onDisconnect={noop}
      />,
    )
    expect(screen.getByText('Reads the Sales knowledge base')).toBeInTheDocument()
    expect(screen.queryByTestId('capability-connect')).not.toBeInTheDocument()
    expect(screen.queryByTestId('capability-disconnect')).not.toBeInTheDocument()
  })

  it('shows the unsupported note truthfully for as_you rows on the v1 external transport', () => {
    render(
      <CompanyCapabilityRow
        capability={asYouUnconnected}
        transportPassesInvoker={false}
        onConnect={noop}
        onDisconnect={noop}
      />,
    )
    expect(screen.getByTestId('capability-unsupported')).toBeInTheDocument()
    expect(screen.queryByTestId('capability-connect')).not.toBeInTheDocument()
  })

  it('renders a Connect button and fires onConnect for a connectable as_you row', () => {
    const onConnect = mock((_: AgentCardCapability) => {})
    render(
      <CompanyCapabilityRow
        capability={asYouUnconnected}
        transportPassesInvoker
        onConnect={onConnect}
        onDisconnect={noop}
      />,
    )
    fireEvent.click(screen.getByTestId('capability-connect'))
    expect(onConnect).toHaveBeenCalledTimes(1)
  })

  it('renders a Disconnect button and fires onDisconnect for a connected as_you row', () => {
    const onDisconnect = mock((_: AgentCardCapability) => {})
    render(
      <CompanyCapabilityRow
        capability={asYouConnected}
        transportPassesInvoker
        onConnect={noop}
        onDisconnect={onDisconnect}
      />,
    )
    fireEvent.click(screen.getByTestId('capability-disconnect'))
    expect(onDisconnect).toHaveBeenCalledTimes(1)
  })
})
