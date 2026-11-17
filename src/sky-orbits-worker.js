/**
 * The sky of date's orbit worker (plan 28 §D, doc 111 §1.48): every star's heliocentric position at an engine
 * year on its Galactic orbit — ONE home @essrt/physics sky/galactic-orbits, the positions through
 * sky-orbit-positions.js (both tiers INTEGRATED on their deterministic node schedules, the nodes cached) —
 * computed OFF the main thread: a hundred thousand orbits per update is more than a frame carries.
 *
 * Protocol (postMessage; the position buffers travel as transferables and ping-pong, never allocated per update):
 *   { type: 'init',  set: 'hip' | 'gaia', n, raDeg, decDeg, distPc, pmRaMasYr, pmDecMasYr, rvKmS, epochYear }   Float64Arrays
 *      → { type: 'ready', set, n }
 *   { type: 'year',  year, hipBuf, gaiaBuf }  → { type: 'positions', year, hipBuf, gaiaBuf, gaiaDone, hipMs, gaiaMs }
 * A position buffer holds the stars' heliocentric vectors in PARSECS in the catalogue containers' local frame.
 * A star without a radial velocity rides v_r = 0 (flagged in the catalogue).
 */

/* global self, performance */
// the two sky homes by their files, not the package root: a module worker in Parcel's DEV build cannot share the
// page's module registry ("Cannot find module" at start — the worker died and every star sat at the origin), and
// the package root would pull the whole model into the worker; the files are the same assets the page bundles
import { galacticTriadEquatorialJ2000 } from '../packages/physics/src/sky/galactic-frame.cjs';
import { heliocentricGalacticState, ORBIT_INTEGRATION } from '../packages/physics/src/sky/galactic-orbits.cjs';
import { fillLocalPositionsIntegrated, integratedSet } from './sky-orbit-positions.js';

const T = galacticTriadEquatorialJ2000();
/** @type {{ hip: ReturnType<typeof integratedSet> | null, gaia: ReturnType<typeof integratedSet> | null }} */
const sets = { hip: null, gaia: null };

self.onmessage = (ev) => {
  const m = ev.data;
  if (m.type === 'init') {
    sets[m.set] = integratedSet(m, heliocentricGalacticState, m.set === 'hip' ? ORBIT_INTEGRATION.named : ORBIT_INTEGRATION.arriving);
    self.postMessage({ type: 'ready', set: m.set, n: m.n });
    return;
  }
  if (m.type === 'year') {
    const t0 = performance.now();
    if (sets.hip && m.hipBuf) fillLocalPositionsIntegrated(sets.hip, m.year, m.hipBuf, T);
    const t1 = performance.now();
    const gaiaDone = !!(sets.gaia && m.gaiaBuf);
    if (gaiaDone) fillLocalPositionsIntegrated(sets.gaia, m.year, m.gaiaBuf, T);
    const transfer = []; if (m.hipBuf) transfer.push(m.hipBuf.buffer); if (m.gaiaBuf) transfer.push(m.gaiaBuf.buffer);
    self.postMessage({ type: 'positions', year: m.year, hipBuf: m.hipBuf || null, gaiaBuf: m.gaiaBuf || null, gaiaDone, hipMs: t1 - t0, gaiaMs: performance.now() - t1 }, transfer);
  }
};
