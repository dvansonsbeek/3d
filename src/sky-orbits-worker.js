/**
 * The sky of date's orbit worker (plan 28 §D, doc 111 §1.48): every star's heliocentric position at an engine
 * year on its Galactic orbit — ONE home @essrt/physics sky/galactic-orbits, the positions through
 * sky-orbit-positions.js (both tiers INTEGRATED on their deterministic node schedules, the nodes cached) —
 * computed OFF the main thread: a hundred thousand orbits per update is more than a frame carries.
 *
 * Protocol (postMessage; the position buffers travel as transferables and ping-pong, never allocated per update):
 *   { type: 'init',  set: 'hip' | 'gaia', n, raDeg, decDeg, distPc, pmRaMasYr, pmDecMasYr, rvKmS, epochYear, limitYears }   Float64Arrays
 *      → { type: 'ready', set, n }
 *   { type: 'year',  year, hipBuf, gaiaBuf }  → { type: 'positions', year, hipBuf, gaiaBuf, gaiaDone, hipMs, gaiaMs, nodes, prefetched }
 * A position buffer holds the stars' heliocentric vectors in PARSECS in the catalogue containers' local frame.
 * A star without a radial velocity rides v_r = 0 (flagged in the catalogue).
 *
 * The node PREFETCH: after every answer the worker builds, in idle ticks (one node per setTimeout tick, so a
 * `year` message interleaves within a node's build — ~60 ms for the named tier, ~200 ms for the arriving one),
 * the nodes within PREFETCH.radius of the current node, the direction of travel first, up to the regime's limit
 * (limitYears from the init: no node beyond the scene's clamp is ever asked for); nodes farther than PREFETCH.keep
 * from the current one are dropped (the epoch's never), so the memory stays bounded — at most 13 nodes per tier,
 * 26 MB for the named tier and 74 MB for the arriving one — and a dropped node rebuilds bit for bit when asked
 * again (a deep return after many landings elsewhere rebuilds its chain, ~1.5 s). A landing one node ahead then
 * finds its node cached (`nodes.hip.hit`); a jump across the regime still builds its chain. The answer reports
 * each set's node index, hit and cache size, the nodes prefetched so far and the time they took.
 */

/* global self, performance, setTimeout */
// the two sky homes by their files, not the package root: a module worker in Parcel's DEV build cannot share the
// page's module registry ("Cannot find module" at start — the worker died and every star sat at the origin), and
// the package root would pull the whole model into the worker; the files are the same assets the page bundles
import { galacticTriadEquatorialJ2000 } from '../packages/physics/src/sky/galactic-frame.cjs';
import { heliocentricGalacticState, ORBIT_INTEGRATION } from '../packages/physics/src/sky/galactic-orbits.cjs';
import { evictNodes, fillLocalPositionsIntegrated, integratedSet, prefetchOneNode } from './sky-orbit-positions.js';

const T = galacticTriadEquatorialJ2000();
/** The prefetch reach and the cache's keep radius, in nodes (named tier: 5-Myr nodes; arriving: 10-Myr). */
const PREFETCH = Object.freeze({ radius: 2, keep: 6 });
/** @type {{ hip: ReturnType<typeof integratedSet> | null, gaia: ReturnType<typeof integratedSet> | null }} */
const sets = { hip: null, gaia: null };
/** Per set: the regime's farthest node index, the current node and the direction of travel; the prefetch tick, its count and time. */
const P = /** @type {any} */ ({ hip: { limit: 0, index: 0, dir: 1 }, gaia: { limit: 0, index: 0, dir: 1 }, timer: 0, built: 0, builtMs: 0, lastYear: NaN });

function schedulePrefetch() { if (!P.timer) P.timer = setTimeout(prefetchTick, 0); }
function prefetchTick() {
  P.timer = 0;
  for (const name of ['hip', 'gaia']) {
    const set = sets[name]; if (!set) continue;
    const c = P[name], t0 = performance.now();
    if (prefetchOneNode(set, c.index, c.dir, PREFETCH.radius, c.limit) !== null) { P.built++; P.builtMs += performance.now() - t0; schedulePrefetch(); return; }
  }
}

self.onmessage = (ev) => {
  const m = ev.data;
  if (m.type === 'init') {
    const sched = m.set === 'hip' ? ORBIT_INTEGRATION.named : ORBIT_INTEGRATION.arriving;
    sets[m.set] = integratedSet(m, heliocentricGalacticState, sched);
    P[m.set].limit = Number.isFinite(m.limitYears) ? Math.ceil(m.limitYears / sched.nodeYears) + 1 : 0;
    self.postMessage({ type: 'ready', set: m.set, n: m.n });
    schedulePrefetch();
    return;
  }
  if (m.type === 'year') {
    const dir = Number.isFinite(P.lastYear) && m.year !== P.lastYear ? Math.sign(m.year - P.lastYear) : Math.sign(m.year - 2000) || 1;
    P.lastYear = m.year;
    const nodes = /** @type {any} */ ({ hip: null, gaia: null });
    const t0 = performance.now();
    if (sets.hip && m.hipBuf) { nodes.hip = fillLocalPositionsIntegrated(sets.hip, m.year, m.hipBuf, T); P.hip.index = nodes.hip.nodeIndex; P.hip.dir = dir; evictNodes(sets.hip, nodes.hip.nodeIndex, PREFETCH.keep); }
    const t1 = performance.now();
    const gaiaDone = !!(sets.gaia && m.gaiaBuf);
    if (gaiaDone) { nodes.gaia = fillLocalPositionsIntegrated(sets.gaia, m.year, m.gaiaBuf, T); P.gaia.index = nodes.gaia.nodeIndex; P.gaia.dir = dir; evictNodes(sets.gaia, nodes.gaia.nodeIndex, PREFETCH.keep); }
    const transfer = []; if (m.hipBuf) transfer.push(m.hipBuf.buffer); if (m.gaiaBuf) transfer.push(m.gaiaBuf.buffer);
    self.postMessage({ type: 'positions', year: m.year, hipBuf: m.hipBuf || null, gaiaBuf: m.gaiaBuf || null, gaiaDone, hipMs: t1 - t0, gaiaMs: performance.now() - t1, nodes, prefetched: P.built, prefetchMs: P.builtMs }, transfer);
    schedulePrefetch();
  }
};
