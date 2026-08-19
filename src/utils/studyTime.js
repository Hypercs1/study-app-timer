/**
 * Pure study-time accounting helpers.
 *
 * Kept free of React/React-Native imports so both the session UI and the unit
 * tests can share exactly one definition of "how much study time counts."
 * SessionScreen previously computed this two different ways (accumulated actual
 * elapsed seconds on finish/skip, but full nominal phase durations on a partial
 * quit), which over-reported study time when phases were skipped early.
 */

/**
 * Actual study seconds elapsed within a phase.
 *
 * Returns 0 for break phases or a missing phase, and never returns a negative
 * value (guards against secondsLeft briefly exceeding the phase length).
 *
 * @param {{ duration: number, isBreak?: boolean } | null | undefined} phase
 * @param {number} secondsLeft - Seconds remaining on the current phase timer
 * @returns {number} Whole/partial seconds of study actually elapsed
 */
export function phaseElapsedSecs(phase, secondsLeft) {
  if (!phase || phase.isBreak) return 0;
  return Math.max(0, phase.duration * 60 - secondsLeft);
}

/**
 * Convert seconds to minutes, rounded to one decimal place (0.1 min).
 * Matches the precision used when recording sessions to history.
 *
 * @param {number} secs
 * @returns {number} Minutes rounded to the nearest 0.1
 */
export function minsFromSecs(secs) {
  return Math.round((secs / 60) * 10) / 10;
}
