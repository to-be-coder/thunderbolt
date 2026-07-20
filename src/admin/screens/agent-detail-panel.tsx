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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AnimatePresence, m } from 'framer-motion'
import { AlertTriangle, Eye, Info, KeyRound, MoreHorizontal, X } from 'lucide-react'
import type { AgentCard } from '@shared/agent-cards'
import { CompanyCardBody } from '@/components/settings/agents/detail/company-agent-detail'
import { agentIconFor } from '@/components/settings/agents/detail/agent-icons'
import { AgentGlyph, AgentIconPicker } from '@/components/settings/agents/detail/agent-icon-picker'
import type { ReactNode } from 'react'
import { useEffect, useReducer, useState } from 'react'
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
  icon: string
  category: AgentCategory
  acpUrl: string
  description: string
  editingName: boolean
  editingEndpoint: boolean
}

const initEditor = (agent: TeamAgentWithCapabilities): EditorState => ({
  name: agent.name,
  icon: agent.icon,
  category: agent.category,
  acpUrl: agent.acpUrl,
  description: agent.description,
  editingName: false,
  editingEndpoint: false,
})

type EditorAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_ICON'; value: string }
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
    case 'SET_ICON':
      return { ...state, icon: action.value }
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
  const [tab, setTab] = useState<'details' | 'access' | 'preview'>('details')
  const dirty =
    state.name.trim() !== agent.name ||
    state.icon !== agent.icon ||
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
        icon: state.icon,
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
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Floating Save row — a FULL-BLEED overlay pinned to the top of the panel:
          it spans the whole column width (edge to edge) and is tall enough to
          cover the header (incl. the X) behind it, without reflowing the content.
          Its own `px-6` keeps the message/buttons aligned with the content below.
          AnimatePresence slides it down on appear and UP on Discard/Save. */}
      <AnimatePresence>
        {dirty && (
          <m.div
            key="save-banner"
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-x-0 top-0 z-20 flex h-[calc(var(--touch-height-xl)_+_1.5rem)] items-center justify-between gap-2 border-b border-yellow-300 bg-yellow-100 px-6 shadow-sm dark:border-yellow-800 dark:bg-yellow-900"
          >
            <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Unsaved changes</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'RESET', agent })} disabled={saving}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!canSave || saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Padded content column — the banner above bleeds full-width while the
          header / tabs / body keep their horizontal inset. */}
      <div className="flex min-h-0 flex-1 flex-col px-6 pt-6">
        {/* Fixed header — the title + close stay pinned while the body scrolls.
          A `min-h-touch-height-xl` centered row so it lines up with the page
          header (the list column's PageHeader uses the same). */}
        <div className="flex h-[var(--touch-height-xl)] shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* Display-only glyph — the icon is EDITED in the Configuration section below. */}
            <div className="flex aspect-square size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              <AgentGlyph value={state.icon} className="size-5 text-muted-foreground" />
            </div>
            {/* Display-only — the name is edited in the Configuration section below. */}
            <span className="min-w-0 truncate text-xl font-semibold">{state.name}</span>
          </div>
          {/* Actions on the right: the ⋯ menu sits next to the close (X). */}
          <div className="flex shrink-0 items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Agent actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close details"
              onClick={onClose}
              className="size-8 rounded-md border border-border md:size-[var(--touch-height-sm)] md:rounded-lg md:border-0"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Pinned tabs — fixed below the header, not scrolling with the body. */}
        <div className="mt-3">
          <PillTabs
            tabs={[
              { id: 'details', label: 'Details', icon: Info },
              { id: 'access', label: 'Access', icon: KeyRound },
              { id: 'preview', label: 'Preview', icon: Eye },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {/* Scrolling body — the tab content. */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pt-4 pb-6">
          {tab === 'access' && <AgentAccessTab agentId={agent.id} />}

          {tab === 'details' && (
            <section className="flex flex-col gap-5">
              {/* What the admin SETS — endpoint, category, and the About prose the
              members read — grouped in one card, plus the member-card preview. */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">Configuration</p>
                <div className="flex flex-col gap-5 rounded-xl bg-secondary p-4 dark:bg-sidebar">
                  <Field label="Identity">
                    <div className="flex items-center gap-2">
                      <AgentIconPicker
                        value={state.icon}
                        onChange={(key) => dispatch({ type: 'SET_ICON', value: key })}
                      />
                      <Input
                        aria-label="Agent name"
                        value={state.name}
                        onChange={(event) => dispatch({ type: 'SET_NAME', value: event.target.value })}
                        className="flex-1 text-base"
                      />
                    </div>
                  </Field>

                  <Field label="Endpoint">
                    <Input
                      aria-label="ACP URL"
                      value={state.acpUrl}
                      onChange={(event) => dispatch({ type: 'SET_ACP', value: event.target.value })}
                      className="text-base"
                    />
                  </Field>

                  <Field label="Category">
                    <Select
                      value={state.category}
                      onValueChange={(value) => dispatch({ type: 'SET_CATEGORY', value: value as AgentCategory })}
                    >
                      <SelectTrigger className="w-full text-base" aria-label="Category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-(--radix-select-trigger-width)">
                        <SelectItem
                          value="sealed"
                          description="Runs only what it came with. The member's Library skills don't reach it."
                        >
                          Sealed
                        </SelectItem>
                        <SelectItem
                          value="extensible"
                          description="The member's enabled Library skills & integrations are available to this agent."
                        >
                          Extensible
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <label htmlFor="agent-purpose" className="text-sm font-medium text-muted-foreground">
                        About
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="What is the About field?"
                            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Info className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-sm">
                          This is what members read to learn what the agent does.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Textarea
                      id="agent-purpose"
                      rows={2}
                      value={state.description}
                      placeholder="This is to tell your members what the agent is for."
                      onChange={(event) => dispatch({ type: 'SET_DESCRIPTION', value: event.target.value })}
                      className="text-base"
                    />
                  </div>
                </div>
              </div>

              {/* (c) Reference — read-only, from the agent's server (Job 4). Label
              sits outside the card, matching the top section. */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">From ACP server</p>
                <div className="flex flex-col gap-4 rounded-xl bg-secondary p-4 dark:bg-sidebar">
                  <AgentHealth agentId={agent.id} acpUrl={agent.acpUrl} />
                  <AdminWiring acpUrl={agent.acpUrl} />
                </div>
              </div>
            </section>
          )}

          {tab === 'preview' && (
            <MemberCardPreview
              agent={agent}
              name={state.name}
              icon={state.icon}
              description={state.description}
              category={state.category}
            />
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
      </div>
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
 * live poll) whose last result reads Not tested → Testing… → Last connected /
 * Lost connection (with the test's timestamp), plus the passive, deduped
 * **failure count** the admin reads.
 */
const AgentHealth = ({ agentId, acpUrl }: { agentId: string; acpUrl: string }) => {
  const test = useTestConnection()
  const failures = useConnectionFailures(agentId)
  const result = test.data

  const count = failures.data?.count ?? 0
  const since = failures.data?.since

  // The test's submit time IS the connection moment: a reachable result means the
  // endpoint answered just then. For a drop, prefer when the failures began (the
  // meaningful "since"), falling back to the test time.
  const at = test.submittedAt ? new Date(test.submittedAt).toISOString() : null
  const lostSince = since ?? at
  const label = test.isPending
    ? 'Testing…'
    : result === undefined
      ? 'Not tested'
      : result.reachable
        ? `Last connected ${at ? formatSince(at) : 'just now'}`
        : lostSince
          ? `Lost connection since ${formatSince(lostSince)}`
          : 'Lost connection'
  const tone =
    result === undefined || test.isPending
      ? 'text-muted-foreground'
      : result.reachable
        ? 'text-green-600 dark:text-green-400'
        : 'text-destructive'

  // Auto-test on open — the endpoint was verified when the agent connected, so
  // the Status reflects that reachability rather than sitting at "Not tested".
  const testMutate = test.mutate
  useEffect(() => {
    testMutate(acpUrl)
  }, [acpUrl, testMutate])

  return (
    <Field label="Status">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className={cn('text-base font-medium', tone)} data-testid="agent-health-status">
            {label}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => test.mutate(acpUrl)}
            disabled={test.isPending}
            data-testid="agent-test-connection"
            className="h-9 border border-border bg-card hover:bg-accent"
          >
            Test connection
          </Button>
        </div>
        {count > 0 && (
          <p
            className="inline-flex items-center gap-1.5 text-base text-destructive"
            data-testid="agent-health-failures"
          >
            <AlertTriangle className="size-3.5 shrink-0" />
            {count} user failure{count === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </Field>
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
  icon,
  description,
  category,
}: {
  agent: TeamAgentWithCapabilities
  name: string
  icon: string
  description: string
  category: AgentCategory
}) => {
  const Icon = agentIconFor(icon)
  const card: AgentCard = {
    id: agent.id,
    name,
    icon,
    description,
    category,
    capabilities: [],
    advertisedModels: agent.advertisedModels,
    integrations: agent.integrations,
    mcpKinds: agent.mcpKinds,
    toolKinds: agent.toolKinds,
    accepts: agent.accepts,
    modes: agent.modes,
    agentSkillCount: agent.agentSkillCount,
    managedBy: agent.managedBy,
    grantedVia: '',
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted-foreground">
        This is how the agent appears to your members in the Thunderbolt app
      </p>
      <div
        className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3"
        data-testid="member-preview"
      >
        <div className="flex items-center gap-2">
          <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="size-5 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-base font-medium">{name}</p>
        </div>
        <CompanyCardBody card={card} />
      </div>
    </div>
  )
}

/** Live, admin-only endpoint wiring for the SAVED endpoint. Stays silent until
 *  real wiring arrives — no loading or error state to flash in and out; a failing
 *  endpoint is signalled once, by the failure count in {@link AgentHealth}. */
const AdminWiring = ({ acpUrl }: { acpUrl: string }) => {
  const detail = useAgentEndpointDetail(acpUrl).data
  if (!detail) {
    return null
  }

  return (
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
