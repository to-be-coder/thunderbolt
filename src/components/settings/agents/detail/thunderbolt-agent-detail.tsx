/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useState } from 'react'
import { MoreHorizontal, Zap } from 'lucide-react'
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
import { Link } from 'react-router'
import { builtInAgent } from '@/defaults/agents'
import { useLibraryCounts as useLibraryCounts_default } from '@/hooks/use-library-counts'
import { useEnabledSkills as useEnabledSkills_default } from '@/skills/use-skills'
import { AgentDetailLayout, DetailSection, SubSection } from './agent-detail-layout'
import { AgentSkillsLines } from './agent-skills-section'
import { THUNDERBOLT_ICON_KEY } from './agent-icons'

type ThunderboltAgentDetailProps = {
  onBack: () => void
  /** Hides the built-in agent from this member's lists (a user setting — the
   *  agent still exists in code as the chat fallback; nothing is truly deleted). */
  onRemove: () => void
  /** Current icon KEY (member override or the built-in default). */
  iconKey?: string
  /** Persists a member-chosen icon KEY for the built-in agent. */
  onIconChange?: (key: string) => void
  /** Injectable for tests — production reads live enabled-Library counts. */
  useLibraryCounts?: typeof useLibraryCounts_default
  /** Injectable for tests — production reads member-side enabled skills. */
  useEnabledSkills?: typeof useEnabledSkills_default
}

/**
 * Read-only info view for the built-in Thunderbolt agent (agents-page-spec §2).
 * NO fields, NO model — the app's only configuration surface is the Library, so
 * "What it uses" is the universal-Library summary with LIVE counts and the
 * instrumented "Manage in Library →" deep link. The ⋯ menu can Remove it, which
 * hides it from the member's lists (a per-user preference, not a hard delete).
 */
export const ThunderboltAgentDetail = ({
  onBack,
  onRemove,
  iconKey,
  onIconChange,
  useLibraryCounts = useLibraryCounts_default,
  useEnabledSkills = useEnabledSkills_default,
}: ThunderboltAgentDetailProps) => {
  const counts = useLibraryCounts()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleRemove = () => {
    setConfirmOpen(false)
    onRemove()
  }

  return (
    <>
      <AgentDetailLayout
        icon={Zap}
        iconKey={iconKey ?? builtInAgent.icon ?? THUNDERBOLT_ICON_KEY}
        iconDefaultKey={THUNDERBOLT_ICON_KEY}
        onIconChange={onIconChange}
        name={builtInAgent.name}
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Agent actions" data-testid="thunderbolt-menu">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
                data-testid="thunderbolt-remove"
              >
                Remove agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        body={
          <>
            <DetailSection title="About">
              <p className="text-base">
                Thunderbolt is the agent built into the app, always here, no setup needed. It draws on everything you've
                enabled in your Library (skills, integrations, and MCP servers) to help with whatever you're working on,
                running right on your device wherever the model allows.
              </p>
            </DetailSection>

            {/* Mirrors the company agent's "What it uses" (Integrations · MCP ·
                Skills sub-sections), but the answers stay LINKS into the member's
                Library — the built-in agent uses everything enabled there. */}
            <DetailSection title="What it uses">
              <div className="flex flex-col gap-4">
                <SubSection label="Integrations">
                  <Link
                    to="/settings/integrations"
                    className="text-base text-primary underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    {counts.extensions} {counts.extensions === 1 ? 'integration' : 'integrations'}
                  </Link>
                </SubSection>
                <SubSection label="MCP">
                  <Link
                    to="/settings/mcp-servers"
                    className="text-base text-primary underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    {counts.mcpServers} {counts.mcpServers === 1 ? 'MCP server' : 'MCP servers'}
                  </Link>
                </SubSection>
                <SubSection label="Skills">
                  <AgentSkillsLines agentSkillCount={0} libraryAllowed useEnabledSkills={useEnabledSkills} />
                </SubSection>
              </div>
            </DetailSection>
          </>
        }
        onBack={onBack}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {builtInAgent.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides the built-in agent from your agents list. It stays available as the app&apos;s fallback and can
              be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              data-testid="thunderbolt-remove-confirm"
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
