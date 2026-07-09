/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { AgentGlyph } from '@/components/settings/agents/detail/agent-icon-picker'
import { THUNDERBOLT_ICON_KEY } from '@/components/settings/agents/detail/agent-icons'
import { builtInAgent } from '@/defaults/agents'
import { Cpu, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useCompanySkills, useCreateCompanySkill, useDeleteCompanySkill } from '../api/hooks'
import { PillTabs } from './pill-tabs'
import { useAgentPolicy } from './use-agent-policy'

/**
 * The built-in Thunderbolt agent, edited in place in the Registry's detail
 * column. Unlike a company agent it has no endpoint, category, or grants — it is
 * the app's own assistant, given to members via the Agents-screen policy toggle.
 * Its two governable slices live behind tabs: the company Skills every member's
 * built-in agent can use, and whether members may bring their own Models.
 */
export const ThunderboltAgentDetailPanel = ({ onClose }: { onClose: () => void }) => {
  const [tab, setTab] = useState<'skills' | 'models'>('skills')

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col px-6 pt-6">
        {/* Fixed header — mirrors the company-agent panel so both read the same:
            a `min-h-touch-height-xl` centered row aligning with the list header. */}
        <div className="flex h-[var(--touch-height-xl)] shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex aspect-square size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              <AgentGlyph value={THUNDERBOLT_ICON_KEY} className="size-5" />
            </div>
            <span className="min-w-0 truncate text-xl font-semibold">{builtInAgent.name}</span>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close details" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-3">
          <PillTabs
            tabs={[
              { id: 'skills', label: 'Skills', icon: Sparkles },
              { id: 'models', label: 'Models', icon: Cpu },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pt-4 pb-6">
          {tab === 'skills' && <CompanySkillsTab />}
          {tab === 'models' && <ModelsTab />}
        </div>
      </div>
    </div>
  )
}

/** Company skills the built-in agent can use for everyone — list with remove,
 *  plus a small add form. */
const CompanySkillsTab = () => {
  const skills = useCompanySkills()
  const createSkill = useCreateCompanySkill()
  const deleteSkill = useDeleteCompanySkill()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    await createSkill.mutateAsync({ name: trimmed, description: description.trim() || undefined })
    setName('')
    setDescription('')
  }

  const items = skills.data ?? []

  return (
    <section className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Skills the built-in Thunderbolt agent can use for everyone in your company.
      </p>

      <div className="flex flex-col gap-2">
        {skills.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!skills.isPending && items.length === 0 && (
          <p className="text-sm text-muted-foreground">No company skills yet.</p>
        )}
        {items.map((skill) => (
          <div key={skill.id} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium">{skill.name}</p>
              {skill.description && <p className="text-sm text-muted-foreground">{skill.description}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${skill.name}`}
              onClick={() => deleteSkill.mutate(skill.id)}
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-secondary p-4 dark:bg-sidebar">
        <p className="text-sm font-medium text-muted-foreground">Add a skill</p>
        <Input
          aria-label="Skill name"
          placeholder="Skill name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="text-base"
        />
        <Input
          aria-label="Skill description"
          placeholder="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="text-base"
        />
        <div>
          <Button size="sm" onClick={handleAdd} disabled={!name.trim() || createSkill.isPending}>
            <Plus className="size-4" />
            Add skill
          </Button>
        </div>
      </div>
    </section>
  )
}

/** Whether members may use their own models with the built-in agent — the moved
 *  `Personal models` policy toggle, now in its natural home. */
const ModelsTab = () => {
  const { userModelsAllowed, setUserModels } = useAgentPolicy()

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Personal models</h2>
          <p className="text-sm text-muted-foreground">
            Let members use their own models with the built-in Thunderbolt agent.
          </p>
        </div>
        <Switch checked={userModelsAllowed} onCheckedChange={setUserModels} aria-label="Allow user models" />
      </div>
    </section>
  )
}
