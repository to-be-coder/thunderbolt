/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useId, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Upload } from 'lucide-react'
import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import logoSrc from '@/assets/logo.svg'
import { AGENT_ICONS, agentIconFor, isCustomImageIcon, THUNDERBOLT_ICON_KEY } from './agent-icons'

/** Legacy curated keys (some aren't valid Lucide names, e.g. `chart`) resolve to
 *  their static component; everything else is a full-library Lucide icon name. */
const CURATED_KEYS = new Set(AGENT_ICONS.map((icon) => icon.key))
const LUCIDE_NAMES = new Set<string>(iconNames)

/** A broad, diverse starter set shown before the member searches — spanning tech,
 *  business, comms, people, nature, animals, food, travel, tools, science, media,
 *  and shapes. Filtered against the real Lucide list so a typo silently drops out
 *  rather than rendering a broken icon. (Searching reaches the full ~1,960.) */
const POPULAR_ICON_NAMES: IconName[] = [
  // Tech / dev
  'building-2',
  'bot',
  'cpu',
  'server',
  'database',
  'terminal',
  'code-2',
  'braces',
  'git-branch',
  'package',
  'boxes',
  'layers',
  'component',
  'binary',
  'monitor',
  'smartphone',
  'laptop',
  'keyboard',
  'hard-drive',
  'wifi',
  'file-code',
  'folder',
  'folder-open',
  'save',
  'scan',
  'qr-code',
  'printer',
  'battery',
  'plug',
  'power',
  // Business / charts
  'bar-chart-3',
  'pie-chart',
  'line-chart',
  'trending-up',
  'activity',
  'target',
  'briefcase',
  'wallet',
  'credit-card',
  'dollar-sign',
  'coins',
  'banknote',
  'receipt',
  'award',
  'trophy',
  'medal',
  'gift',
  'crown',
  // Comms / people
  'mail',
  'send',
  'inbox',
  'message-square',
  'message-circle',
  'messages-square',
  'phone',
  'bell',
  'megaphone',
  'at-sign',
  'hash',
  'link',
  'paperclip',
  'rss',
  'share-2',
  'user',
  'users',
  'user-check',
  'contact',
  'smile',
  // Docs / time
  'book',
  'book-open',
  'bookmark',
  'tag',
  'tags',
  'calendar',
  'clock',
  'timer',
  'flag',
  'fingerprint',
  // Nature / weather
  'leaf',
  'flower',
  'tree-pine',
  'sprout',
  'sun',
  'moon',
  'cloud',
  'cloud-rain',
  'snowflake',
  'droplet',
  'wind',
  'mountain',
  'waves',
  'thermometer',
  // Animals
  'cat',
  'dog',
  'bird',
  'fish',
  'rabbit',
  'turtle',
  'snail',
  'squirrel',
  'egg',
  // Food
  'coffee',
  'pizza',
  'apple',
  'cookie',
  'cake',
  'utensils',
  'wine',
  'ice-cream',
  'soup',
  'carrot',
  'cherry',
  'grape',
  // Travel / objects
  'key',
  'lock',
  'anchor',
  'ship',
  'plane',
  'car',
  'bike',
  'train-front',
  'map',
  'map-pin',
  'route',
  'tent',
  'backpack',
  'umbrella',
  'glasses',
  'watch',
  // Tools
  'hammer',
  'wrench',
  'ruler',
  'scissors',
  'paintbrush',
  'pencil',
  'pen-tool',
  'magnet',
  'cog',
  'settings',
  'sliders-horizontal',
  'filter',
  'wand-2',
  // Science / shapes
  'circle',
  'square',
  'triangle',
  'hexagon',
  'diamond',
  'infinity',
  'atom',
  'orbit',
  'telescope',
  'microscope',
  'flask-conical',
  'test-tube',
  'dna',
  'pill',
  'stethoscope',
  'heart-pulse',
  // Media
  'image',
  'video',
  'film',
  'camera',
  'music',
  'headphones',
  'mic',
  'speaker',
  'radio',
  'tv',
  'play',
  'podcast',
  'disc',
  'guitar',
  'gamepad-2',
  'dice-5',
  // Fun / misc
  'sparkles',
  'zap',
  'star',
  'heart',
  'flame',
  'gem',
  'rocket',
  'brain',
  'lightbulb',
  'globe',
  'shield',
  'shield-check',
  'compass',
  'search',
  'palette',
  'feather',
  'puzzle',
  'swords',
  'party-popper',
  'ghost',
  'skull',
  'bomb',
  'thumbs-up',
  'bug',
].filter((name): name is IconName => LUCIDE_NAMES.has(name))

/**
 * Renders an agent glyph from a stored icon value — the Thunderbolt brand mark
 * for the reserved {@link THUNDERBOLT_ICON_KEY}, an uploaded / remote IMAGE
 * (`data:` or `http` URL) as an `<img>`, a curated legacy key as its static
 * Lucide component, otherwise ANY Lucide icon resolved by name (loaded on
 * demand). Shared so every surface shows the same glyph.
 */
export const AgentGlyph = ({ value, className }: { value: string; className?: string }) => {
  if (value === THUNDERBOLT_ICON_KEY) {
    return <img src={logoSrc} alt="" draggable={false} className={cn('object-contain', className)} />
  }
  if (isCustomImageIcon(value)) {
    return <img src={value} alt="" className={cn('size-full rounded-md object-cover', className)} />
  }
  if (!CURATED_KEYS.has(value) && LUCIDE_NAMES.has(value)) {
    return <DynamicIcon name={value as IconName} className={className} aria-hidden />
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
  const [query, setQuery] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Empty search shows the starter set; typing searches the entire Lucide library
  // (capped so we never mount hundreds of lazy icons at once).
  const shownIcons = useMemo<IconName[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return POPULAR_ICON_NAMES
    }
    return iconNames.filter((name) => name.includes(q)).slice(0, 90)
  }, [query])
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
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search icons"
                  aria-label="Search icons"
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <div className="grid max-h-52 grid-cols-5 gap-1 overflow-y-auto p-0.5">
                {shownIcons.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-label={name}
                    onClick={() => pick(name)}
                    className={cn(
                      'flex aspect-square size-9 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent',
                      name === value && 'bg-accent ring-1 ring-inset ring-primary',
                    )}
                  >
                    <DynamicIcon name={name} className="size-5 text-muted-foreground" aria-hidden />
                  </button>
                ))}
                {shownIcons.length === 0 && (
                  <p className="col-span-5 px-2 py-3 text-center text-xs text-muted-foreground">No icons found</p>
                )}
              </div>
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
