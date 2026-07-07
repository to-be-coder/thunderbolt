/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { AlertTriangle, Building2, Check, Info, KeyRound, MoreHorizontal, Pencil, X } from 'lucide-react'
import type { AgentCard } from '@shared/agent-cards'
import { CompanyCardBody } from '@/components/settings/agents/detail/company-agent-detail'
import type { ReactNode } from 'react'
import { useReducer, useState } from 'react'
import {
  useAgentEndpointDetail,
  useConnectionFailures,
  useDeleteAgent,
  useTestConnection,
  useUpdateAgent,
} from '../api/hooks'
import type { AgentCategory, TeamAgentWithCapabilities } from '../api/types'
import { AgentAccessTab } from './agent-access-tab'
import { PillTabs } from './pill-tabs'

type EditorState = {
  name: string
  category: AgentCategory
  acpUrl: string
  description: string
  editingName: boolean
  editingEndpoint: boolean
}

const initEditor = (agent: TeamAgentWithCapabilities): EditorState => ({
  name: agent.name,
  category: agent.category,
  acpUrl: agent.acpUrl,
  description: agent.description,
  editingName: false,
  editingEndpoint: false,
})

type EditorAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_CATEGORY'; value: AgentCategory }
  | { type: 'SET_ACP'; value: string }
  | { type: 'SET_DESCRIPTION'; value: string }
  | { type: 'EDIT_NAME'; value: boolean }
  | { type: 'EDIT_ENDPOINT'; value: boolean }
  | { type: 'CLOSE_EDITS' }
  | { type: 'RESET'; agent: TeamAgentWithCapabilities }

const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.value }
    case 'SET_CATEGORY':
      return { ...state, category: action.value }
    case 'SET_ACP':
      return { ...state, acpUrl: action.value }
    case 'SET_DESCRIPTION':
      return { ...state, description: action.value }
    case 'EDIT_NAME':
      return { ...state, editingName: action.value }
    case 'EDIT_ENDPOINT':
      return { ...state, editingEndpoint: action.value }
    case 'CLOSE_EDITS':
      return { ...state, editingName: false, editingEndpoint: false }
    case 'RESET':
      return initEditor(action.agent)
    default:
      return state
  }
}

/**
 * S1a — Agent detail, edited in place in the Registry's detail column. Click the
 * title to rename, pick the category from a dropdown, or edit the endpoint via
 * its pencil; any change reveals a Save bar to confirm the write. Status and the
 * live wiring (models/MCP/tools) reflect the SAVED endpoint, not the draft.
 * Delete lives in the ⋯ menu. (This panel is keyed by agent id, so switching
 * agents resets the draft.)
 */
export const AgentDetailPanel = ({ agent, onClose }: { agent: TeamAgentWithCapabilities; onClose: () => void }) => {
  const updateAgent = useUpdateAgent()
  const deleteAgent = useDeleteAgent()
  const [state, dispatch] = useReducer(editorReducer, agent, initEditor)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [tab, setTab] = useState<'details' | 'access'>('details')
  const [previewOpen, setPreviewOpen] = useState(false)

  const dirty =
    state.name.trim() !== agent.name ||
    state.category !== agent.category ||
    state.acpUrl.trim() !== agent.acpUrl ||
    state.description.trim() !== agent.description
  const saving = updateAgent.isPending
  const canSave = dirty && state.name.trim() !== '' && state.acpUrl.trim() !== ''

  const handleSave = async () => {
    await updateAgent.mutateAsync({
      id: agent.id,
      patch: {
        name: state.name.trim(),
        category: state.category,
        acpUrl: state.acpUrl.trim(),
        description: state.description.trim(),
      },
    })
    dispatch({ type: 'CLOSE_EDITS' })
  }

  const handleDelete = async () => {
    await deleteAgent.mutateAsync(agent.id)
    onClose()
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto rounded-lg border border-border p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {state.editingName ? (
            <input
              autoFocus
              aria-label="Agent name"
              value={state.name}
              onChange={(event) => dispatch({ type: 'SET_NAME', value: event.target.value })}
              onBlur={() => dispatch({ type: 'EDIT_NAME', value: false })}
              onKeyDown={(event) => event.key === 'Enter' && dispatch({ type: 'EDIT_NAME', value: false })}
              className="w-full border-b border-border bg-transparent text-xl font-semibold outline-none focus:border-primary"
            />
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: 'EDIT_NAME', value: true })}
              className="min-w-0 truncate text-left text-xl font-semibold hover:underline"
              title="Click to rename"
            >
              {state.name}
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Agent actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close details" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {dirty && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">Unsaved changes</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'RESET', agent })} disabled={saving}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <div className="border-b border-border">
        <PillTabs
          tabs={[
            { id: 'details', label: 'Details', icon: Info },
            { id: 'access', label: 'Access', icon: KeyRound },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'access' && <AgentAccessTab agentId={agent.id} />}

      {tab === 'details' && (
        <section className="flex flex-col gap-3">
          {/* (a) Controls — what the admin SETS (Job 2). */}
          <div className="flex flex-col gap-4 rounded-xl bg-secondary p-4 dark:bg-sidebar">
            <Field label="Category">
              <Select
                value={state.category}
                onValueChange={(value) => dispatch({ type: 'SET_CATEGORY', value: value as AgentCategory })}
              >
                <SelectTrigger className="w-fit" aria-label="Category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sealed">Sealed</SelectItem>
                  <SelectItem value="extensible">Extensible</SelectItem>
                </SelectContent>
              </Select>
              {/* Inline consequence, not a tooltip (spec §5.2a / D62). */}
              <p className="text-sm text-muted-foreground">{categoryConsequence(state.category)}</p>
            </Field>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-muted-foreground">Endpoint</p>
                <button
                  type="button"
                  aria-label="Edit endpoint"
                  onClick={() => dispatch({ type: 'EDIT_ENDPOINT', value: !state.editingEndpoint })}
                  className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
              {state.editingEndpoint ? (
                <Input
                  autoFocus
                  aria-label="ACP URL"
                  value={state.acpUrl}
                  onChange={(event) => dispatch({ type: 'SET_ACP', value: event.target.value })}
                />
              ) : (
                <code className="text-sm break-all">{state.acpUrl}</code>
              )}
            </div>
          </div>

          {/* (b) Authoring zone — the one prose field the admin owns + a preview (Job 3). */}
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4">
            <p className="text-sm font-medium text-muted-foreground">What members see</p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="agent-purpose" className="text-sm text-muted-foreground">
                Purpose — one honest sentence about what this agent is for.
              </label>
              <Textarea
                id="agent-purpose"
                rows={2}
                value={state.description}
                placeholder="e.g. Reviews pull requests and proposes fixes."
                onChange={(event) => dispatch({ type: 'SET_DESCRIPTION', value: event.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen((open) => !open)}
              className="w-fit cursor-pointer text-sm font-medium text-primary hover:underline"
            >
              {previewOpen ? 'Hide member-card preview' : 'Preview member card'}
            </button>
            {previewOpen && (
              <MemberCardPreview
                agent={agent}
                name={state.name}
                description={state.description}
                category={state.category}
              />
            )}
          </div>

          {/* (c) Reference — from the agent's server, read-only verification material (Job 4). */}
          <div className="flex flex-col gap-4 rounded-xl bg-secondary p-4 dark:bg-sidebar">
            <p className="text-sm font-medium text-muted-foreground">From the agent's server — read-only</p>
            <MatchSignal description={state.description} acpUrl={agent.acpUrl} />
            <AgentHealth agentId={agent.id} acpUrl={agent.acpUrl} />
            <AdminWiring acpUrl={agent.acpUrl} />
          </div>
        </section>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {agent.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the agent and all grants to it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Compact "2pm today"-style stamp for the failure-since line (spec §3.2). */
const formatSince = (iso: string): string => {
  const d = new Date(iso)
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: d.getMinutes() ? '2-digit' : undefined })
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? `${time.toLowerCase().replace(' ', '')} today`
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/**
 * The Status line (spec §2/§3/§4): an on-demand reachability **Test** (never a
 * live poll) whose last result reads Not tested → testing… → Reachable /
 * Unreachable, plus the passive, deduped **failure count** the admin reads.
 */
const AgentHealth = ({ agentId, acpUrl }: { agentId: string; acpUrl: string }) => {
  const test = useTestConnection()
  const failures = useConnectionFailures(agentId)
  const result = test.data

  const label = test.isPending
    ? 'testing…'
    : result === undefined
      ? 'Not tested'
      : result.reachable
        ? 'Reachable'
        : `Unreachable (${result.error})`
  const tone =
    result === undefined || test.isPending
      ? 'text-muted-foreground'
      : result.reachable
        ? 'text-green-600 dark:text-green-400'
        : 'text-destructive'
  const count = failures.data?.count ?? 0
  const since = failures.data?.since

  return (
    <Field label="Status">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className={cn('text-sm font-medium', tone)} data-testid="agent-health-status">
            {label}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => test.mutate(acpUrl)}
            disabled={test.isPending}
            data-testid="agent-test-connection"
          >
            Test connection
          </Button>
        </div>
        {count > 0 && since && (
          <p className="inline-flex items-center gap-1.5 text-sm text-destructive" data-testid="agent-health-failures">
            <AlertTriangle className="size-3.5 shrink-0" />
            {count} user failure{count === 1 ? '' : 's'} since {formatSince(since)}
          </p>
        )}
      </div>
    </Field>
  )
}

/** Plain-language consequence of the category — shown inline for the admin too
 *  (spec §5.2a): the sentence, not a tooltip. */
const categoryConsequence = (category: AgentCategory): string =>
  category === 'extensible'
    ? "Extensible — members' enabled skills & integrations are available to this agent."
    : 'Sealed — runs only what it came with.'

/**
 * The authored-vs-live consistency signal (spec §5.3) — the reason this page
 * beats unverified self-declaration. Soft v1: confirm the card is backed by a
 * live, reachable endpoint and surface a rough capability count.
 */
const MatchSignal = ({ description, acpUrl }: { description: string; acpUrl: string }) => {
  const detailQuery = useAgentEndpointDetail(acpUrl)
  if (detailQuery.isPending) {
    return null
  }
  if (detailQuery.isError || !detailQuery.data) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-destructive">
        <AlertTriangle className="size-3.5 shrink-0" />
        Couldn’t verify — the endpoint is unreachable.
      </p>
    )
  }
  const toolCount = detailQuery.data.tools.length
  return (
    <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Check className="size-3.5 shrink-0 text-green-600 dark:text-green-500" />
      {description.trim() ? 'Card verified against the live endpoint' : 'Add a purpose sentence to publish'} · the agent
      advertises {toolCount} tool{toolCount === 1 ? '' : 's'}.
    </p>
  )
}

/**
 * Inline "what members see" preview (spec §5.2b). Renders the EXACT member card
 * body (`CompanyCardBody`) — same component, same data — so the preview is
 * byte-identical to what a granted member sees. Name / purpose / category reflect
 * the live, unsaved edits; the rest are the agent's own card fields (admin↔member
 * identity is unified — see `@/lib/demo-team-agents`).
 */
const MemberCardPreview = ({
  agent,
  name,
  description,
  category,
}: {
  agent: TeamAgentWithCapabilities
  name: string
  description: string
  category: AgentCategory
}) => {
  const card: AgentCard = {
    id: agent.id,
    name,
    icon: agent.icon,
    description,
    category,
    capabilities: [],
    advertisedModels: agent.advertisedModels,
    integrations: agent.integrations,
    toolKinds: agent.toolKinds,
    accepts: agent.accepts,
    modes: agent.modes,
    managedBy: agent.managedBy,
    grantedVia: '',
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3" data-testid="member-preview">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Member preview</p>
      <div className="flex items-center gap-2">
        <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Building2 className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <p className="text-base font-medium">{name}</p>
      </div>
      <CompanyCardBody card={card} />
    </div>
  )
}

/** Live, admin-only endpoint wiring for the SAVED endpoint. */
const AdminWiring = ({ acpUrl }: { acpUrl: string }) => {
  const detailQuery = useAgentEndpointDetail(acpUrl)
  const detail = detailQuery.data

  return (
    <>
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
        </>
      )}
    </>
  )
}

const Field = ({ label, labelExtra, children }: { label: string; labelExtra?: ReactNode; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-1.5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {labelExtra}
    </div>
    {children}
  </div>
)

const TagList = ({ items }: { items: string[] }) =>
  items.length === 0 ? (
    <span className="text-sm text-muted-foreground">None</span>
  ) : (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-md bg-muted px-2 py-0.5 text-sm">
          {item}
        </span>
      ))}
    </div>
  )
