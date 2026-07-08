/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Member-facing copy for a sealed agent that doesn't use the member's Library
 * skills. Deliberately ONE string, shared by BOTH surfaces that state it — the
 * member agent detail card (Skills section) and the composer skills slot — so
 * the two can never drift. Do not reword in either place; edit here.
 */
export const SEALED_SKILLS_MESSAGE = "This agent can't use your personal skills (admin setting)"

/** Composer skills slot copy when an extensible agent has no enabled skills. */
export const NO_SKILLS_ENABLED_MESSAGE = 'No skills enabled yet'
