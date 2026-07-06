/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import { buildInferenceTelemetry } from './routes'

describe('buildInferenceTelemetry (T4 — per-user model-usage attribution)', () => {
  it('attributes usage to the invoker via posthogDistinctId + user_id', () => {
    const telemetry = buildInferenceTelemetry({
      userId: 'user-123',
      provider: 'anthropic',
      hasTools: true,
      temperature: 0.7,
      posthogConfigured: true,
    })

    expect(telemetry.posthogDistinctId).toBe('user-123')
    expect(telemetry.posthogProperties).toMatchObject({
      user_id: 'user-123',
      model_provider: 'anthropic',
      endpoint: '/chat/completions',
      has_tools: true,
      temperature: 0.7,
    })
  })

  it('includes posthogTraceId only when a trace id is supplied', () => {
    const withTrace = buildInferenceTelemetry({
      userId: 'u',
      provider: 'mistral',
      hasTools: false,
      temperature: undefined,
      traceId: 'trace-1',
      posthogConfigured: true,
    })
    expect(withTrace.posthogTraceId).toBe('trace-1')

    const withoutTrace = buildInferenceTelemetry({
      userId: 'u',
      provider: 'mistral',
      hasTools: false,
      temperature: undefined,
      posthogConfigured: true,
    })
    expect('posthogTraceId' in withoutTrace).toBe(false)
  })

  it('returns an empty object (no capture, no distinct id) when PostHog is off', () => {
    const telemetry = buildInferenceTelemetry({
      userId: 'user-123',
      provider: 'fireworks',
      hasTools: false,
      temperature: 1,
      posthogConfigured: false,
    })
    expect(telemetry).toEqual({})
  })
})
