/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Globe, Loader2, MoreHorizontal } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { isDemoMode } from '@/lib/demo-mode'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import '@/lib/dayjs'
import { useEnabledSkills as useEnabledSkills_default } from '@/skills/use-skills'
import type { Agent } from '@/types/acp'
import { AgentDetailLayout } from './agent-detail-layout'
import { AgentIconPicker } from './agent-icon-picker'
import { AgentSkillsLines } from './agent-skills-section'

/** On-demand test result (spec §0/§2/§4): the personal Status never polls on view
 *  — it starts `not_tested` and reflects the last explicit Test. */
type TestState = 'not_tested' | 'testing' | { reachable: boolean; reason?: string; at: string }

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
      {result.reachable
        ? `Last connected ${dayjs(result.at).fromNow()}`
        : `Lost connection ${dayjs(result.at).fromNow()}`}
    </span>
  )
}

/** The agent's brain lives on the far end of the URL. A live server would report
 *  its own wiring; in the demo we derive a plausible per-endpoint descriptor so
 *  the view reads like the admin registry. Outside the demo we can't introspect
 *  a personal endpoint, so the wiring is left empty. */
const endpointWiring = (url: string): { models: string[]; mcpServers: string[]; tools: string[]; skills: string[] } => {
  if (!isDemoMode() || !url) {
    return { models: [], mcpServers: [], tools: [], skills: [] }
  }
  const seed = url.split('/').filter(Boolean).pop() ?? 'agent'
  return {
    models: ['claude-opus-4-8', 'claude-haiku-4-5'],
    mcpServers: [`${seed}-mcp`, 'shared-knowledge-mcp'],
    tools: [`search_${seed}`, `summarize_${seed}`, 'create_note'],
    skills: [`${seed}-research`, 'summarize-thread', 'cite-sources'],
  }
}

type PersonalAgentDetailProps = {
  agent: Agent
  onBack: () => void
  /** Soft-deletes the reference only — nothing on the remote server is touched. */
  onRemove: () => void
  /** Current icon KEY (member override, else the handshake default). */
  iconKey?: string
  /** Persists a member-chosen icon KEY. Absent → icon stays read-only. */
  onIconChange?: (key: string) => void
  /** Persists an edited endpoint URL. Absent → endpoint stays read-only. */
  onEndpointChange?: (url: string) => void
  /** Persists an edited agent name. Absent → name stays read-only. */
  onNameChange?: (name: string) => void
  /** Injectable probe for the on-demand Test (tests stub it). */
  testAcpConnection?: typeof testAcpConnection_default
  /** Injectable for tests — production reads member-side enabled skills. */
  useEnabledSkills?: typeof useEnabledSkills_default
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
  iconKey,
  onIconChange,
  onEndpointChange,
  onNameChange,
  testAcpConnection = testAcpConnection_default,
  useEnabledSkills = useEnabledSkills_default,
}: PersonalAgentDetailProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Connecting the agent already handshook successfully, so the last-known state
  // is Reachable — mirror the admin registry rather than sitting at "Not tested".
  const [result, setResult] = useState<TestState>(() => ({ reachable: true, at: new Date().toISOString() }))
  // The name and endpoint are always-editable text inputs (type directly, like a
  // title) — a Save row appears once a value changes. Drafts seed from the agent
  // (the panel is keyed by id, so this re-inits when switching agents).
  const [draftUrl, setDraftUrl] = useState(agent.url ?? '')
  const [draftName, setDraftName] = useState(agent.name)
  const wiring = endpointWiring(agent.url ?? '')
  const endpointDirty = draftUrl.trim() !== '' && draftUrl.trim() !== (agent.url ?? '')
  const nameDirty = draftName.trim() !== '' && draftName.trim() !== agent.name

  const saveEndpoint = () => onEndpointChange?.(draftUrl.trim())
  const discardEndpoint = () => setDraftUrl(agent.url ?? '')
  const saveName = () => onNameChange?.(draftName.trim())
  const discardName = () => setDraftName(agent.name)

  const handleTest = async () => {
    if (!agent.url) {
      return
    }
    setResult('testing')
    const probe = await testAcpConnection({ url: agent.url })
    setResult(
      probe.success
        ? { reachable: true, at: new Date().toISOString() }
        : { reachable: false, reason: probe.error, at: new Date().toISOString() },
    )
  }

  const handleRemove = () => {
    setConfirmOpen(false)
    onRemove()
  }

  return (
    <>
      <AgentDetailLayout
        icon={Globe}
        iconKey={iconKey ?? agent.icon ?? 'globe'}
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
          <section className="flex flex-col gap-5">
            {/* Configuration — mirrors the admin registry's section; the member
                can edit the name and endpoint of their OWN agent (no category /
                about — those are admin-only concerns). */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">Configuration</p>
              <div className="flex flex-col gap-4 rounded-xl bg-secondary p-4 dark:bg-sidebar">
                {onIconChange && (
                  <Field label="Icon">
                    <AgentIconPicker
                      value={iconKey ?? agent.icon ?? 'globe'}
                      onChange={onIconChange}
                      defaultKey={agent.icon ?? 'globe'}
                    />
                  </Field>
                )}
                <Field label="Name">
                  <div className="flex flex-col gap-2">
                    <Input
                      aria-label="Agent name"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && nameDirty && saveName()}
                      className="text-base"
                      data-testid="personal-name"
                    />
                    {nameDirty && (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={discardName}>
                          Discard
                        </Button>
                        <Button size="sm" onClick={saveName} data-testid="personal-name-save">
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                </Field>

                <Field label="Endpoint">
                  <div className="flex flex-col gap-2">
                    <Input
                      aria-label="ACP URL"
                      value={draftUrl}
                      onChange={(event) => setDraftUrl(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && endpointDirty && saveEndpoint()}
                      className="text-base"
                      data-testid="personal-endpoint"
                    />
                    {/* Save row appears once the value changes. */}
                    {endpointDirty && (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={discardEndpoint}>
                          Discard
                        </Button>
                        <Button size="sm" onClick={saveEndpoint} data-testid="personal-endpoint-save">
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                </Field>
              </div>
            </div>

            {/* From ACP server — live status + wiring the endpoint reports,
                mirroring the admin panel, plus the agent's Skills. */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">From ACP server</p>
              <div className="flex flex-col gap-4 rounded-xl bg-secondary p-4 dark:bg-sidebar">
                <Field label="Status">
                  <div className="flex items-center gap-3">
                    <StatusValue result={result} />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleTest}
                      disabled={result === 'testing'}
                      data-testid="personal-test"
                      className="h-9 border border-border bg-card hover:bg-accent"
                    >
                      Test connection
                    </Button>
                  </div>
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
                <Field label="Skills">
                  <AgentSkillsLines
                    agentSkillCount={wiring.skills.length}
                    libraryAllowed
                    useEnabledSkills={useEnabledSkills}
                  />
                </Field>
              </div>
            </div>
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

const Field = ({ label, labelExtra, children }: { label: string; labelExtra?: ReactNode; children: ReactNode }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-1.5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {labelExtra}
    </div>
    {children}
  </div>
)

const TagList = ({ items }: { items: string[] }) =>
  items.length === 0 ? (
    <span className="text-base text-muted-foreground">None</span>
  ) : (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-md bg-muted px-2 py-0.5 text-base">
          {item}
        </span>
      ))}
    </div>
  )
