/**
 * The secular SHAPE of a planet's eccentricity vector z = e·e^{iϖ} from the
 * governed artifact's mode table: the dominant mode, the largest companion
 * and their beat — the planet's own eccentricity cycle (the |e| wobble
 * period). ONE home (plan 06 Phase 7 commit 2): the planet panels'
 * "Eccentricity Cycle (g-mode beat)" row, and the period the K device's
 * retired axial-vs-obliquity "wobble" beat is replaced by in both scene
 * twins. Its own module so the governed chain module (a hashed input of the
 * N-body artifacts) stays untouched.
 */

'use strict';

/**
 * @param {{ secularModes: Record<string, { z: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}> }> }} artifact
 * @param {string} key
 * @returns {{ dom: { arcsecPerYr: number, amp: number }, sub: { arcsecPerYr: number, amp: number },
 *   rest: { count: number, amp: number }, ampSumAll: number, beatYears: number }}
 */
function computeSecularShape(artifact, key) {
  const radToArcsec = 180 / Math.PI * 3600;
  const modes = artifact.secularModes[key].z
    .map((m) => ({ arcsecPerYr: m.omegaRadPerYr * radToArcsec, amp: Math.hypot(m.re, m.im) }))
    .sort((a, b) => b.amp - a.amp);
  const ampSumAll = modes.reduce((t, m) => t + m.amp, 0);
  const dom = modes[0], sub = modes[1];
  const restAmp = ampSumAll - dom.amp - sub.amp;
  return {
    dom, sub,
    rest: { count: modes.length - 2, amp: restAmp },
    ampSumAll,
    beatYears: 1296000 / Math.abs(dom.arcsecPerYr - sub.arcsecPerYr),
  };
}

module.exports = { computeSecularShape };
