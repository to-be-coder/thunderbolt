/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PageHeader } from '@/components/ui/page-header'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useAgentEndpointDetail, useAgents } from '../api/hooks'
import type { TeamAgentWithCapabilities } from '../api/types'
import { StatusPill } from './status-pill'

/** Demo icon names → emoji; a real card carries a proper icon. */
const ICON_EMOJI: Record<string, string> = { bot: '🤖', chart: '📊', book: '📖' }
const iconFor = (icon: string): string => ICON_EMOJI[icon] ?? (icon || '🤖')

/**
 * S1a — Agent detail. Two faithful views of one team agent:
 *  - "Admin view": the live technical wiring (models, MCP servers, tools,
 *    credentials) fetched fresh from the ACP endpoint. Admin-only; never stored
 *    or synced — the display-only card can't carry it (INVARIANT 2).
 *  - "What members see": the sanitized display card a granted member gets in the
 *    app — what the agent does and its capability labels, no security detail.
 */
export const AgentDetailPage = () => {
  const { agentId } = useParams()
  const agentsQuery = useAgents()
  const agent = (agentsQuery.data ?? []).find((candidate) => candidate.id === agentId) ?? null

  if (agentsQuery.isPending) {
    return <p className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">Loading…</p>
  }

  if (!agent) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">Agent not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <BackLink />
      <PageHeader title={agent.name}>
        <StatusPill tone={agent.category === 'sealed' ? 'muted' : 'info'}>{agent.category}</StatusPill>
      </PageHeader>
      <p className="text-sm text-muted-foreground">{agent.description || 'No description provided.'}</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminDetail agent={agent} />
        <MemberView agent={agent} />
      </div>
    </div>
  )
}

const BackLink = () => (
  <Link
    to="/admin"
    className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
  >
    <ArrowLeft className="size-4" /> Registry
  </Link>
)

/** Live, admin-only endpoint wiring. */
const AdminDetail = ({ agent }: { agent: TeamAgentWithCapabilities }) => {
  const detailQuery = useAgentEndpointDetail(agent.acpUrl)
  const detail = detailQuery.data

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Admin view</h2>
        <p className="text-xs text-muted-foreground">
          Fetched live from the endpoint · admin-only · not stored or synced to members.
        </p>
      </div>

      <Field label="Endpoint">
        <code className="text-xs break-all">{agent.acpUrl}</code>
      </Field>

      {detailQuery.isPending && <p className="text-sm text-muted-foreground">Connecting to the endpoint…</p>}
      {detailQuery.isError && <p className="text-sm text-destructive">Could not reach the endpoint.</p>}
      {detail && (
        <>
          <Field label="Models">
            <TagList items={detail.models} />
          </Field>
          <Field label="MCP servers">
            <TagList items={detail.mcpServers} />
          </Field>
          <Field label="Tools">
            <TagList items={detail.tools} />
          </Field>
          <Field label="Credentials">
            <ul className="flex flex-col gap-1 text-sm">
              {detail.credentials.map((credential) => (
                <li key={credential.label} className="flex items-center justify-between gap-2">
                  <span>{credential.label}</span>
                  <StatusPill tone={credential.mode === 'as_you' ? 'warning' : 'muted'}>
                    {credential.mode === 'as_you' ? 'as you' : 'service account'}
                  </StatusPill>
                </li>
              ))}
            </ul>
          </Field>
        </>
      )}
    </section>
  )
}

/** The sanitized display-only card a granted member sees in the app. */
const MemberView = ({ agent }: { agent: TeamAgentWithCapabilities }) => (
  <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold">What members see</h2>
      <p className="text-xs text-muted-foreground">
        The display-only card in the app — no endpoint, credentials, or model details.
      </p>
    </div>

    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {iconFor(agent.icon)}
        </span>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{agent.name}</span>
            <StatusPill tone={agent.category === 'sealed' ? 'muted' : 'info'}>{agent.category}</StatusPill>
          </div>
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        </div>
      </div>

      {agent.capabilities.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Can</p>
          <ul className="flex flex-col gap-1 text-sm">
            {agent.capabilities.map((capability) => (
              <li key={capability.id} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                {capability.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </section>
)

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    {children}
  </div>
)

const TagList = ({ items }: { items: string[] }) =>
  items.length === 0 ? (
    <span className="text-sm text-muted-foreground">None</span>
  ) : (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-md bg-muted px-2 py-0.5 text-xs">
          {item}
        </span>
      ))}
    </div>
  )
