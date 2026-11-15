/**
 * The obliquity a DRAWN scene shows beyond the hybrid's domain (plan 31 A2; doc 111 §1.44).
 *
 * The published obliquity is the hybrid spin integration inside the banked ζ series' span
 * (±10 Myr about J2000). Beyond it the hybrid carries NO tidal evolution of its mean — nothing
 * in dŝ/dt = α(ŝ·n̂)(ŝ×n̂) moves ŝ·n̂'s mean — so its beat mean stays the Quaternary 23.2–23.4° at
 * every age (MEASURED on the A2 build: 23.37° at 10 Ma, 23.30 at 400 Ma, 23.31 at 2.46 Ga, 23.19
 * at the history's end), where the cited mean obliquity of date (Farhat et al. 2022's column,
 * ONE home earth/mean-obliquity-history) reads 22.2°, 19.7° and 11.9°. The API therefore REFUSES the value beyond the
 * domain and serves the cited mean beside the hybrid's band (one beat period's swing). A scene
 * must still draw ONE tilt, and the Laplace-plane regime it draws the Moon's orbit on reads the
 * cited mean — so beyond the domain the drawn tilt is the CITED MEAN carrying the hybrid's own
 * wobble about its beat mean (the band's amplitude and period, the quantity the model predicts
 * there), handed over C¹ with a smoothstep across SCENE_OBLIQUITY_HANDOVER_YEARS past the
 * domain's edge (the two means part by 0.15° at the seam: a step there would turn the drawn axis
 * mid-jump). ONE home — the package model, the browser's frame and rows and the Node scene twin
 * read these functions; the samplers are injected.
 *
 * COST (measured, the A2 build): a deep read of the hybrid at a NEW age seats on the nearest bank
 * checkpoint (250 kyr apart off the dense tier) and walks to the age — 20–30 ms per region at
 * 400 Ma; the 41-sample beat instrument read live per frame cost 30 ms per new year, and the
 * Genesis Analysis chart's 480 points 14–23 s. The beat's mean, min and max are therefore read
 * from a lazy table of nodes every HYBRID_BEAT_TABLE_NODE_YEARS (the instrument at the node, the
 * three values linearly interpolated between nodes — the beat mean moves 0.2° over 4 Gyr, the
 * swing's amplitude smoothly with the beat), built on demand per session: one region per Myr.
 */

'use strict';

/** The hand-over window beyond the hybrid's domain edge, years (0 at the edge, 1 a window past it). */
const SCENE_OBLIQUITY_HANDOVER_YEARS = 1e7;
/** The beat table's node spacing, years of the engine axis (nodes at 2000 + k × this). */
const HYBRID_BEAT_TABLE_NODE_YEARS = 1e6;

/**
 * The cited mean's weight at a decimal year: 0 inside the hybrid's domain, a C¹ smoothstep to 1
 * over SCENE_OBLIQUITY_HANDOVER_YEARS beyond either edge; 0 without a domain (no banked series).
 * @param {number} year  decimal year, the engine's
 * @param {[number, number] | null | undefined} domainYears  the hybrid's [yearFrom, yearTo]
 * @returns {number}
 */
function sceneObliquityHandoverWeight(year, domainYears) {
  if (!domainYears) return 0;
  const d = year < domainYears[0] ? domainYears[0] - year : year > domainYears[1] ? year - domainYears[1] : 0;
  if (!(d > 0)) return 0;
  const x = Math.min(1, d / SCENE_OBLIQUITY_HANDOVER_YEARS);
  return x * x * (3 - 2 * x);
}

/**
 * The hybrid's beat mean at a year: ε averaged over one obliquity beat period centred on the year
 * (41 samples — the API's band instrument, `obliquityBandAt`, on the same grid).
 * @param {(year: number) => number} epsDegAt  the hybrid's ε sampler
 * @param {number} year
 * @param {number} beatPeriodYears  the obliquity beat of date, 2π/(ψ̇ᵢₙ − |s₃|)
 * @returns {number} degrees
 */
function hybridBeatMeanDeg(epsDegAt, year, beatPeriodYears) {
  return hybridBeatBandDeg(epsDegAt, year, beatPeriodYears).meanDeg;
}

/**
 * The hybrid's beat band at a year: the mean, min and max of ε over one beat centred on the year
 * (the same 41 samples).
 * @param {(year: number) => number} epsDegAt
 * @param {number} year
 * @param {number} beatPeriodYears
 * @returns {{meanDeg: number, minDeg: number, maxDeg: number}}
 */
function hybridBeatBandDeg(epsDegAt, year, beatPeriodYears) {
  let s = 0, lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= 40; i++) {
    const e = epsDegAt(year + (i / 40 - 0.5) * beatPeriodYears);
    s += e; if (e < lo) lo = e; if (e > hi) hi = e;
  }
  return { meanDeg: s / 41, minDeg: lo, maxDeg: hi };
}

/**
 * The lazy beat table: the band instrument at nodes every HYBRID_BEAT_TABLE_NODE_YEARS of the
 * engine axis, built on first read and kept (pure in the year: a node's value never depends on
 * the visit order), the three values linearly interpolated between the two nodes about a year.
 * With the GENERATED artifact (data/obliquity-beat-table.json, tools/verify/obliquity-beat-table.js
 * --write: every node over the navigable domain, each the instrument's own value) a node inside its
 * range is read, never computed — a record, not a value: the generator refuses unless a fresh model
 * reproduces its nodes bit-exactly, so the table and the live instrument are one number.
 * @typedef {{ nodeYears: number, kMin: number, kMax: number, nodes: ReadonlyArray<ReadonlyArray<number>> }} HybridBeatTableArtifact
 *   nodes[k − kMin] = [meanDeg, minDeg, maxDeg] at the year 2000 + k × nodeYears
 * @param {{ epsDegAt: (year: number) => number, beatYearsAtYear: (year: number) => number, nodesArtifact?: HybridBeatTableArtifact | null }} deps
 * @returns {{ atYear: (year: number) => {meanDeg: number, minDeg: number, maxDeg: number}, nodeYear: (k: number) => number, nodeAt: (k: number) => {meanDeg: number, minDeg: number, maxDeg: number}, nodeRange: [number, number] | null }}
 */
function createHybridBeatTable({ epsDegAt, beatYearsAtYear, nodesArtifact = null }) {
  /** @type {Map<number, {meanDeg: number, minDeg: number, maxDeg: number}>} */
  const nodes = new Map();
  const nodeYear = (/** @type {number} */ k) => 2000 + k * HYBRID_BEAT_TABLE_NODE_YEARS;
  const art = nodesArtifact && nodesArtifact.nodeYears === HYBRID_BEAT_TABLE_NODE_YEARS && Array.isArray(nodesArtifact.nodes) ? nodesArtifact : null;
  const node = (/** @type {number} */ k) => {
    let n = nodes.get(k);
    if (n === undefined) {
      if (art && k >= art.kMin && k <= art.kMax) {
        const r = art.nodes[k - art.kMin];
        n = { meanDeg: r[0], minDeg: r[1], maxDeg: r[2] };
      } else {
        const y = nodeYear(k); n = hybridBeatBandDeg(epsDegAt, y, beatYearsAtYear(y));
      }
      nodes.set(k, n);
    }
    return n;
  };
  return {
    nodeYear,
    nodeAt: node,
    nodeRange: art ? [art.kMin, art.kMax] : null,
    atYear(year) {
      const u = (year - 2000) / HYBRID_BEAT_TABLE_NODE_YEARS;
      const k0 = Math.floor(u), f = u - k0;
      const a = node(k0);
      if (f === 0) return a;
      const b = node(k0 + 1);
      return { meanDeg: a.meanDeg + (b.meanDeg - a.meanDeg) * f, minDeg: a.minDeg + (b.minDeg - a.minDeg) * f, maxDeg: a.maxDeg + (b.maxDeg - a.maxDeg) * f };
    },
  };
}

/**
 * The drawn obliquity: ε_hybrid + w · (ε̄_cited − ε̄_hybrid). The hybrid itself where w = 0 or the
 * cited mean is unavailable (NaN beyond the history's end — the navigable domain ends inside it).
 * @param {number} epsHybridDeg
 * @param {number} beatMeanDeg
 * @param {number} citedMeanDeg
 * @param {number} weight  sceneObliquityHandoverWeight
 * @returns {number} degrees
 */
function composeSceneObliquityDeg(epsHybridDeg, beatMeanDeg, citedMeanDeg, weight) {
  if (!(weight > 0) || !Number.isFinite(citedMeanDeg) || !Number.isFinite(beatMeanDeg)) return epsHybridDeg;
  return epsHybridDeg + weight * (citedMeanDeg - beatMeanDeg);
}

/**
 * The drawn band: the hybrid's beat band shifted by the same w · (ε̄_cited − ε̄_hybrid) — its centre
 * is the tilt the scene draws, its width the swing the model claims (the Genesis Analysis chart).
 * @param {{meanDeg: number, minDeg: number, maxDeg: number}} band  the hybrid's beat band
 * @param {number} citedMeanDeg
 * @param {number} weight
 * @returns {{centreDeg: number, minDeg: number, maxDeg: number, hybridMeanDeg: number}}
 */
function composeSceneObliquityBand(band, citedMeanDeg, weight) {
  const shift = composeSceneObliquityDeg(band.meanDeg, band.meanDeg, citedMeanDeg, weight) - band.meanDeg;
  return { centreDeg: band.meanDeg + shift, minDeg: band.minDeg + shift, maxDeg: band.maxDeg + shift, hybridMeanDeg: band.meanDeg };
}

module.exports = {
  SCENE_OBLIQUITY_HANDOVER_YEARS, HYBRID_BEAT_TABLE_NODE_YEARS,
  sceneObliquityHandoverWeight, hybridBeatMeanDeg, hybridBeatBandDeg, createHybridBeatTable,
  composeSceneObliquityDeg, composeSceneObliquityBand,
};
