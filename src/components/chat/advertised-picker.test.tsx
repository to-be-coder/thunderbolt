/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { AdvertisedPicker } from './advertised-picker'

afterEach(cleanup)

describe('AdvertisedPicker', () => {
  it('renders the empty label as a static chip when nothing is advertised', () => {
    render(<AdvertisedPicker options={[]} emptyLabel="Set by your organization" ariaLabel="Advertised model" />)
    expect(screen.getByTestId('advertised-static-chip')).toHaveTextContent('Set by your organization')
  })

  it('renders a single advertised option as a picker that notes there is no other model', async () => {
    render(<AdvertisedPicker options={['Company GPT-4o']} emptyLabel="fallback" ariaLabel="Advertised model" />)

    // Not a static chip — an openable picker showing the single model.
    expect(screen.queryByTestId('advertised-static-chip')).toBeNull()
    const trigger = screen.getByLabelText('Advertised model')
    expect(trigger).toHaveTextContent('Company GPT-4o')

    await act(async () => {
      fireEvent.click(trigger)
    })
    expect(await screen.findByText('No other model available')).toBeInTheDocument()
  })

  it('renders a bounded picker for two or more options and lets the user switch', async () => {
    render(
      <AdvertisedPicker
        options={['Company GPT-4o', 'Company Claude Sonnet']}
        emptyLabel="fallback"
        ariaLabel="Advertised model"
      />,
    )

    // No static chip; the trigger defaults to the first option.
    expect(screen.queryByTestId('advertised-static-chip')).toBeNull()
    const trigger = screen.getByLabelText('Advertised model')
    expect(trigger).toHaveTextContent('Company GPT-4o')

    await act(async () => {
      fireEvent.click(trigger)
    })
    const option = await screen.findByText('Company Claude Sonnet')
    await act(async () => {
      fireEvent.click(option)
    })

    expect(screen.getByLabelText('Advertised model')).toHaveTextContent('Company Claude Sonnet')
  })
})
