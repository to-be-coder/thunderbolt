/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useId, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Upload } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import logoSrc from '@/assets/logo.svg'
import { AGENT_ICONS, agentIconFor, isCustomImageIcon, THUNDERBOLT_ICON_KEY } from './agent-icons'

/**
 * Renders an agent glyph from a stored icon value — the Thunderbolt brand mark
 * for the reserved {@link THUNDERBOLT_ICON_KEY}, an uploaded / remote IMAGE
 * (`data:` or `http` URL) as an `<img>`, otherwise a Lucide icon resolved from
 * the key. Shared so every surface shows the same glyph.
 */
export const AgentGlyph = ({ value, className }: { value: string; className?: string }) => {
  if (value === THUNDERBOLT_ICON_KEY) {
    return <img src={logoSrc} alt="" draggable={false} className={cn('object-contain', className)} />
  }
  if (isCustomImageIcon(value)) {
    return <img src={value} alt="" className={cn('size-full rounded-md object-cover', className)} />
  }
  const Icon = agentIconFor(value)
  return <Icon className={className} aria-hidden />
}

type IconTab = 'default' | 'icon' | 'upload'

/**
 * The agent's icon tile beside the title — click to open a 3-tab picker shared
 * by the admin registry and the member-facing personal/native agent detail:
 *  • Default — the provider/handshake glyph (`defaultKey`); pick it to reset.
 *  • Icon    — a grid of built-in glyphs.
 *  • Upload  — drop or browse for a custom image (stored as a data URL).
 * The chosen value (icon KEY or image data URL) is what persists.
 */
export const AgentIconPicker = ({
  value,
  onChange,
  defaultKey = 'globe',
}: {
  value: string
  onChange: (value: string) => void
  /** The provider/handshake default glyph, shown on the Default tab. */
  defaultKey?: string
}) => {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<IconTab>('icon')
  const fileRef = useRef<HTMLInputElement>(null)
  // Unique per picker instance so the sliding underline never bleeds between two
  // open pickers sharing a framer-motion layout context.
  const tabLayoutId = useId()

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  const readImage = (file: File | undefined) => {
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        pick(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const tabs: { id: IconTab; label: string }[] = [
    { id: 'default', label: 'Default' },
    { id: 'icon', label: 'Icon' },
    { id: 'upload', label: 'Upload' },
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Change agent icon"
          className="flex aspect-square size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md bg-muted transition-colors hover:bg-muted/70"
        >
          <AgentGlyph value={value} className="size-5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="flex border-b border-border">
          {tabs.map(({ id, label }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'relative flex-1 cursor-pointer px-2 py-2 text-sm transition-colors',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
                {active && (
                  <motion.span
                    layoutId={tabLayoutId}
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', damping: 35, stiffness: 400, mass: 0.8 }}
                  />
                )}
              </button>
            )
          })}
        </div>
        <div className="p-2">
          {tab === 'default' && (
            <button
              type="button"
              onClick={() => pick(defaultKey)}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-accent',
                value === defaultKey && 'bg-accent',
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                <AgentGlyph value={defaultKey} className="size-5 text-muted-foreground" />
              </div>
              <span className="text-sm">Provider default</span>
            </button>
          )}
          {tab === 'icon' && (
            <div className="grid max-h-56 grid-cols-5 gap-1 overflow-y-auto p-0.5">
              {AGENT_ICONS.map(({ key, Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  onClick={() => pick(key)}
                  className={cn(
                    'flex aspect-square size-9 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent',
                    key === value && 'bg-accent ring-1 ring-inset ring-primary',
                  )}
                >
                  <Icon className="size-5 text-muted-foreground" aria-hidden />
                </button>
              ))}
            </div>
          )}
          {tab === 'upload' && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && fileRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                readImage(event.dataTransfer.files[0])
              }}
              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground transition-colors hover:bg-accent/50"
            >
              <Upload className="size-5" aria-hidden />
              <span>Drop an image here, or click to browse</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => readImage(event.target.files?.[0])}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
