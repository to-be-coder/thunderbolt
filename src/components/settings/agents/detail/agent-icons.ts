/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  BarChart3,
  Book,
  Bot,
  Brain,
  Briefcase,
  Bug,
  Building2,
  Camera,
  Cloud,
  Code2,
  Compass,
  Cpu,
  Database,
  Feather,
  Flame,
  Gem,
  Globe,
  Headphones,
  Heart,
  Leaf,
  Lightbulb,
  MessageSquare,
  Music,
  Palette,
  PenTool,
  Rocket,
  Search,
  Shield,
  Sparkles,
  Star,
  Terminal,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/**
 * The curated set of agent icons an admin can pick from, keyed by the stable
 * string stored on the agent (`AgentCard.icon` / `TeamAgent.icon`). The key is
 * what persists; the component is a render detail. Every member/admin surface
 * resolves the key through {@link agentIconFor} so an agent looks the same
 * everywhere and an admin's icon edit shows up on the member card.
 */
export const AGENT_ICONS: { key: string; Icon: LucideIcon; label: string }[] = [
  { key: 'building', Icon: Building2, label: 'Building' },
  { key: 'bot', Icon: Bot, label: 'Bot' },
  { key: 'chart', Icon: BarChart3, label: 'Chart' },
  { key: 'book', Icon: Book, label: 'Book' },
  { key: 'bug', Icon: Bug, label: 'Bug' },
  { key: 'sparkles', Icon: Sparkles, label: 'Sparkles' },
  { key: 'zap', Icon: Zap, label: 'Zap' },
  { key: 'globe', Icon: Globe, label: 'Globe' },
  { key: 'wrench', Icon: Wrench, label: 'Wrench' },
  { key: 'shield', Icon: Shield, label: 'Shield' },
  { key: 'rocket', Icon: Rocket, label: 'Rocket' },
  { key: 'brain', Icon: Brain, label: 'Brain' },
  { key: 'database', Icon: Database, label: 'Database' },
  { key: 'search', Icon: Search, label: 'Search' },
  { key: 'message', Icon: MessageSquare, label: 'Message' },
  { key: 'code', Icon: Code2, label: 'Code' },
  { key: 'terminal', Icon: Terminal, label: 'Terminal' },
  { key: 'cpu', Icon: Cpu, label: 'CPU' },
  { key: 'cloud', Icon: Cloud, label: 'Cloud' },
  { key: 'compass', Icon: Compass, label: 'Compass' },
  { key: 'briefcase', Icon: Briefcase, label: 'Briefcase' },
  { key: 'lightbulb', Icon: Lightbulb, label: 'Idea' },
  { key: 'palette', Icon: Palette, label: 'Palette' },
  { key: 'pen', Icon: PenTool, label: 'Pen' },
  { key: 'camera', Icon: Camera, label: 'Camera' },
  { key: 'music', Icon: Music, label: 'Music' },
  { key: 'headphones', Icon: Headphones, label: 'Headphones' },
  { key: 'star', Icon: Star, label: 'Star' },
  { key: 'heart', Icon: Heart, label: 'Heart' },
  { key: 'flame', Icon: Flame, label: 'Flame' },
  { key: 'gem', Icon: Gem, label: 'Gem' },
  { key: 'leaf', Icon: Leaf, label: 'Leaf' },
  { key: 'feather', Icon: Feather, label: 'Feather' },
]

/**
 * The built-in Thunderbolt agent's brand glyph. Not part of the pickable grid —
 * it renders the app's own logo (a full-color mark) rather than a Lucide icon, so
 * {@link AgentGlyph} special-cases it. Used as the Thunderbolt agent's default.
 */
export const THUNDERBOLT_ICON_KEY = 'thunderbolt'

const ICON_BY_KEY = new Map(AGENT_ICONS.map(({ key, Icon }) => [key, Icon]))

/** Resolve an agent's stored icon key to a Lucide component, defaulting to the
 *  company/building glyph for unknown or empty keys (never throws in render). */
export const agentIconFor = (key: string | undefined): LucideIcon => ICON_BY_KEY.get(key ?? '') ?? Building2

/** An icon value can be a lucide KEY or an uploaded/remote IMAGE (data: or http
 *  URL). This distinguishes the two so callers render an `<img>` vs a glyph. */
export const isCustomImageIcon = (value: string | undefined): value is string =>
  !!value && (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://'))
