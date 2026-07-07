/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Loader2, MoreHorizontal } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { testAcpConnection as testAcpConnection_default } from '@/acp'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { isDemoMode } from '@/lib/demo-mode'
import { cn } from '@/lib/utils'
import type { Agent } from '@/types/acp'
import { AgentDetailLayout } from './agent-detail-layout'

/** On-demand test result (spec §0/§2/§4): the personal Status never polls on view
 *  — it starts `not_tested` and reflects the last explicit Test. */
type TestState = 'not_tested' | 'testing' | { reachable: boolean; reason?: string }

/** The Status line's dot + label, derived from the last-known Test result. */
const StatusValue = ({ result }: { result: TestState }) => {
  if (result === 'testing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground" data-testid="personal-status">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        testing…
      </span>
    )
  }
  if (result === 'not_tested') {
    return (
      <span className="text-sm text-muted-foreground" data-testid="personal-status">
        Not tested
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium',
        result.reachable ? 'text-green-600 dark:text-green-500' : 'text-destructive',
      )}
      data-testid="personal-status"
    >
      <span
        className={cn('inline-block size-2 rounded-full', result.reachable ? 'bg-green-500' : 'bg-destructive')}
        aria-hidden="true"
      />
      {result.reachable ? 'Reachable' : `Unreachable (${result.reason})`}
    </span>
  )
}

/** The agent's brain lives on the far end of the URL. A live server would report
 *  its own wiring; in the demo we derive a plausible per-endpoint descriptor so
 *  the view reads like the admin registry. Outside the demo we can't introspect
 *  a personal endpoint, so the wiring is left empty. */
const endpointWiring = (url: string): { models: string[]; mcpServers: string[]; tools: string[] } => {
  if (!isDemoMode() || !url) {
    return { models: [], mcpServers: [], tools: [] }
  }
  const seed = url.split('/').filter(Boolean).pop() ?? 'agent'
  return {
    models: ['claude-opus-4-8', 'claude-haiku-4-5'],
    mcpServers: [`${seed}-mcp`, 'shared-knowledge-mcp'],
    tools: [`search_${seed}`, `summarize_${seed}`, 'create_note'],
  }
}

type PersonalAgentDetailProps = {
  agent: Agent
  onBack: () => void
  /** Soft-deletes the reference only — nothing on the remote server is touched. */
  onRemove: () => void
  /** Injectable probe for the on-demand Test (tests stub it). */
  testAcpConnection?: typeof testAcpConnection_default
}

/**
 * Management view for a personal ACP agent. It mirrors the admin registry's
 * detail panel — Status, Endpoint, and the live wiring (Models / MCP servers /
 * Tools) — MINUS the tabs and Category, since a personal agent is only ever the
 * member's own and is never shared/granted. Read-only apart from Test (re-probe)
 * and Remove.
 */
export const PersonalAgentDetail = ({
  agent,
  onBack,
  onRemove,
  testAcpConnection = testAcpConnection_default,
}: PersonalAgentDetailProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<TestState>('not_tested')
  const wiring = endpointWiring(agent.url ?? '')

  const handleTest = async () => {
    if (!agent.url) {
      return
    }
    setResult('testing')
    const probe = await testAcpConnection({ url: agent.url })
    setResult(probe.success ? { reachable: true } : { reachable: false, reason: probe.error })
  }

  const handleRemove = () => {
    setConfirmOpen(false)
    onRemove()
  }

  return (
    <>
      <AgentDetailLayout
        name={agent.name}
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Agent actions" data-testid="personal-menu">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
                data-testid="personal-remove"
              >
                Remove agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        body={
          <section className="flex flex-col gap-4">
            <Field label="Status">
              <div className="flex items-center gap-3">
                <StatusValue result={result} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTest}
                  disabled={result === 'testing'}
                  data-testid="personal-test"
                >
                  Test connection
                </Button>
              </div>
            </Field>

            <Field label="Endpoint">
              <code className="text-sm break-all" data-testid="personal-endpoint">
                {agent.url}
              </code>
            </Field>

            <Field label="Models">
              <TagList items={wiring.models} />
            </Field>
            <Field label="MCP servers">
              <TagList items={wiring.mcpServers} />
            </Field>
            <Field label="Tools">
              <TagList items={wiring.tools} />
            </Field>
          </section>
        }
        onBack={onBack}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {agent.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the connection from Thunderbolt only. Nothing on the remote server is changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              data-testid="personal-remove-confirm"
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    {children}
  </div>
)

const TagList = ({ items }: { items: string[] }) =>
  items.length === 0 ? (
    <span className="text-sm text-muted-foreground">None</span>
  ) : (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-md bg-muted px-2 py-0.5 text-base">
          {item}
        </span>
      ))}
    </div>
  )
