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
import { Info, KeyRound, MoreHorizontal, Pencil, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useReducer, useState } from 'react'
import { useAgentEndpointDetail, useDeleteAgent, useUpdateAgent } from '../api/hooks'
import type { AgentCategory, TeamAgentWithCapabilities } from '../api/types'
import { AgentAccessTab } from './agent-access-tab'
import { AgentConnectionIndicator } from './connection-status'
import { CategoryInfoTooltip } from './category-info'
import { PillTabs } from './pill-tabs'

type EditorState = {
  name: string
  category: AgentCategory
  acpUrl: string
  editingName: boolean
  editingEndpoint: boolean
}

const initEditor = (agent: TeamAgentWithCapabilities): EditorState => ({
  name: agent.name,
  category: agent.category,
  acpUrl: agent.acpUrl,
  editingName: false,
  editingEndpoint: false,
})

type EditorAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_CATEGORY'; value: AgentCategory }
  | { type: 'SET_ACP'; value: string }
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

  const dirty =
    state.name.trim() !== agent.name || state.category !== agent.category || state.acpUrl.trim() !== agent.acpUrl
  const saving = updateAgent.isPending
  const canSave = dirty && state.name.trim() !== '' && state.acpUrl.trim() !== ''

  const handleSave = async () => {
    await updateAgent.mutateAsync({
      id: agent.id,
      patch: { name: state.name.trim(), category: state.category, acpUrl: state.acpUrl.trim() },
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
          <div className="flex flex-col gap-4 rounded-xl bg-secondary p-4 dark:bg-sidebar">
            <Field label="Category" labelExtra={<CategoryInfoTooltip />}>
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

          <div className="flex flex-col gap-4 rounded-xl bg-secondary p-4 dark:bg-sidebar">
            <Field label="Status">
              <div>
                <span className="inline-flex rounded-md bg-muted px-2 py-0.5">
                  <AgentConnectionIndicator acpUrl={agent.acpUrl} showDot={false} />
                </span>
              </div>
            </Field>

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
