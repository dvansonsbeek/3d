#!/usr/bin/env node
/**
 * EARTH ζ-SERIES ARTIFACT — the C-2 one-source evaluator's data home
 * (plan 02, the Stage-C "one source for the movement" arc).
 *
 * WRITES data/nbody-earth-zeta-series.json (tracked; --write only): Earth's
 * ζ = sin(i/2)·e^{iΩ} series RESAMPLED from the model's own ±10-Myr N-body
 * run (the same 20-Myr GR dump behind data/nbody-deep-secular-modes.json)
 * to a 500-yr cadence — the engine's orbit-plane history banked VERBATIM
 * (linear resample), no mode extraction, no tiers.
 *
 * WHY A SERIES AND NOT A MODE TABLE (the C-1 verdict, plan 02): no flat ζ
 * mode table serves both scales — the era tier's in-era quality is the
 * local absorption of real s1/s2/s3 multiplet power into 8 carriers
 * (deepening measured 16→24→32 terms: in-era stuck 5″→3.3″→2.0″ vs the
 * 0.3″ certification, deep DEGRADING 0.0999°→0.1136°; the era8+residual
 * cascade inherits the deep-class local error at 4.8″). The hybrid driven
 * by the series itself beats BOTH tiers on their home turf; the banked
 * verdict block below carries the measured numbers.
 *
 * CADENCE (measured sweep, C-2): 500 yr keeps the in-era integration at
 * 0.16″/0.18″ rms vs IAU-2006 (raw 54.8-yr cadence: 0.13″/0.10″); 1000 yr
 * degrades 1600–2400 to 0.64″ (past the era tier), 2000 yr to 1.8″.
 *
 * ASSERTIONS UNDER --write (refuse-gates):
 *   - dump meta matches the registered run (wh / dt 2 / 1PN / ±10 Myr) and
 *     conservation |ΔE/E| ≤ 1e-7;
 *   - resample fidelity: max |series − raw ζ| on the raw grid ≤ 2e-5;
 *   - the hybrid ON THIS SERIES (deep-16 tail beyond the span) meets the
 *     C-1 class: ε vs IAU-2006 rms ≤ 0.25″ (1900–2100) and ≤ 0.30″
 *     (1600–2400); dε/dt(J2000) within 1% of the IAU reference (read from
 *     the shared astro reference — never retyped); ε vs La2004 rms ≤ 0.05°
 *     over −200..0 kyr (La2004 is a THEORY label, never an input).
 *
 * Run: node tools/verify/earth-zeta-series.js          (prints the bank)
 *      node tools/verify/earth-zeta-series.js --write  (regenerate + gate)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');
const C = require('../lib/constants.js');

const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'data', 'nbody-earth-zeta-series.json');
const DUMP = path.join(ROOT, 'tools', 'explore', 'lattice-long-window-ecliptic-20000000-gr.local.json');
const DEEP_MODES = path.join(ROOT, 'data', 'nbody-deep-secular-modes.json');
const LA2004 = path.join(ROOT, 'data', 'la2004-earth-51myr-back.asc');
const STEP_YR = 500;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;

if (!WRITE) {
  if (!fs.existsSync(OUT)) { console.log('no artifact yet — run with --write'); process.exit(0); }
  const art = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  console.log('data/nbody-earth-zeta-series.json — current artifact');
  console.log(`  ${art.q.length} samples @ ${art.stepYr} yr, span ${art.t0Yr} .. ${art.t0Yr + (art.q.length - 1) * art.stepYr} yr`);
  console.log(`  verdict: era rms ${art.verdict.eraRms19002100Arcsec.toFixed(3)}″ / ${art.verdict.eraRms16002400Arcsec.toFixed(3)}″ · deps/dt ${art.verdict.rateJ2000ArcsecPerCy.toFixed(2)} ″/cy · La2004 −200 kyr ${art.verdict.deep200KyrRmsDeg.toFixed(4)}°`);
  console.log('  (generator class — a plain run only prints; --write regenerates from the dump)');
  process.exit(0);
}

if (!fs.existsSync(DUMP)) {
  console.error(`REFUSING: dump missing (${path.relative(ROOT, DUMP)}). Reproduce it first:`);
  console.error('  node tools/explore/lattice-long-window-test.mjs years=20000000 integrator=wh dt=2 order=2 gr=1 frame=both sample=20000');
  process.exit(1);
}

console.log('reading the 20-Myr GR dump …');
const rawBuf = fs.readFileSync(DUMP);
const dumpSha256 = crypto.createHash('sha256').update(rawBuf).digest('hex');
const D = JSON.parse(rawBuf.toString('utf8'));
if (D.integrator !== 'wh' || D.dt !== 2 || D.gr !== true) {
  console.error(`REFUSING: dump is not the registered run (integrator ${D.integrator}, dt ${D.dt}, gr ${D.gr})`);
  process.exit(1);
}
const span = D.t[D.t.length - 1] - D.t[0];
if (Math.abs(span - 20000000) > 40000) { console.error(`REFUSING: dump span ${span} yr is not the registered ±10 Myr`); process.exit(1); }
if (D.conservation && Math.abs(D.conservation.maxDE ?? D.conservation) > 1e-7) {
  console.error('REFUSING: conservation exceeds the symplectic bound 1e-7'); process.exit(1);
}

// raw ζ series
const tR = D.t, E = D.elements.earth, NR = tR.length;
const qR = new Float64Array(NR), pR = new Float64Array(NR);
for (let i = 0; i < NR; i++) {
  const s2 = Math.sin(E.inc[i] * D2R / 2);
  qR[i] = s2 * Math.cos(E.Om[i] * D2R);
  pR[i] = s2 * Math.sin(E.Om[i] * D2R);
}
const rT0 = tR[0], rDt = tR[1] - tR[0];
const liRaw = (arr, tt) => {
  const x = (tt - rT0) / rDt, i = Math.max(0, Math.min(NR - 2, Math.floor(x))), f = x - i;
  return arr[i] * (1 - f) + arr[i + 1] * f;
};

// resample to the artifact cadence, 9-decimal rounding
const n = Math.floor((tR[NR - 1] - rT0) / STEP_YR) + 1;
const t0Yr = rT0;
const q = Array.from({ length: n }, (_, i) => Number(liRaw(qR, t0Yr + i * STEP_YR).toFixed(9)));
const p = Array.from({ length: n }, (_, i) => Number(liRaw(pR, t0Yr + i * STEP_YR).toFixed(9)));

// resample fidelity on the RAW grid (series interp back vs raw samples)
const liS = (arr, tt) => {
  const x = (tt - t0Yr) / STEP_YR, i = Math.max(0, Math.min(n - 2, Math.floor(x))), f = x - i;
  return arr[i] * (1 - f) + arr[i + 1] * f;
};
let maxResample = 0;
for (let i = 0; i < NR; i++) {
  maxResample = Math.max(maxResample,
    Math.abs(liS(q, tR[i]) - qR[i]), Math.abs(liS(p, tR[i]) - pR[i]));
}
console.log(`resampled ${n} samples @ ${STEP_YR} yr · max resample departure ${maxResample.toExponential(2)} (ζ scale ~0.014)`);
if (maxResample > 2e-5) { console.error('REFUSING: resample departure exceeds 2e-5 — cadence too coarse for this series'); process.exit(1); }

// ── quality gate: the hybrid ON THIS SERIES through the one-home factory ──
// The anchors come from the MODEL exactly as the Stage-C lab injects them
// (the measured year-length identity via model.epoch, ε₀ via model
// constants) — one convention, never retyped. createModel lives in the ESM
// barrel, so the gate runs inside an async main (dynamic import from CJS).
runQualityGateAndWrite().catch((e) => { console.error(e); process.exit(1); });

async function runQualityGateAndWrite() {
const { pathToFileURL } = require('url');
const phys = await import(pathToFileURL(path.join(ROOT, 'packages', 'physics', 'src', 'index.js')).href);
const model = phys.createModel();
const axialPrecessionYearsJ2000 = model.epoch.axialPrecessionYearsAtYear(2000);
const obliquityJ2000Deg = model.constants.earthOrbital.obliquityJ2000_deg;
const { createDeepOrbitalHistory } = require(path.join(ROOT, 'packages', 'physics', 'src', 'earth', 'deep-orbital-history.cjs'));
const MT = JSON.parse(fs.readFileSync(DEEP_MODES, 'utf8'));
const CHAIN = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-frequencies.json'), 'utf8'));
const AE = CHAIN.j2000AnchorElements.earth;
const tier = createDeepOrbitalHistory({
  zModes: MT.modes.earth.z,
  zetaModes: MT.modes.earth.zeta,             // the TAIL beyond the span
  zetaSeries: { t0Yr, stepYr: STEP_YR, q, p },
  anchorE: AE.e, anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
  anchorInclEclipticDeg: AE.inclEclipticDeg, anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
  axialPrecessionYearsJ2000,
  obliquityJ2000Deg,
});
// IAU 2006 mean obliquity (Hilton et al. 2006), arcsec; T = Julian centuries from J2000
const epsIau = (yr) => {
  const T = (yr - 2000) / 100;
  return (84381.406 - 46.836769 * T - 0.0001831 * T * T + 0.00200340 * T ** 3
    - 5.76e-7 * T ** 4 - 4.34e-8 * T ** 5) / 3600;
};
const stats = (ds) => ({ rms: Math.sqrt(ds.reduce((s, d) => s + d * d, 0) / ds.length), max: Math.max(...ds.map(Math.abs)) });
const era = tier.build(-500, 500, 5);
const eraDs = { a: [], b: [] };
for (let y = 1900; y <= 2100; y += 5) eraDs.a.push((era.at(y - 2000).epsDeg - epsIau(y)) * 3600);
for (let y = 1600; y <= 2400; y += 10) eraDs.b.push((era.at(y - 2000).epsDeg - epsIau(y)) * 3600);
const eraA = stats(eraDs.a), eraB = stats(eraDs.b);
const rateJ2000 = (era.at(50).epsDeg - era.at(-50).epsDeg) * 3600;   // ″/cy
const iauRate = C.ASTRO_REFERENCE.obliquityRate_arcsecPerCentury;
const la = fs.readFileSync(LA2004, 'utf8').trim().split('\n')
  .map((l) => l.trim().split(/\s+/).map((x) => Number(x.replace('D', 'E'))));
const laEps = new Map(la.map((r) => [Math.round(r[0] * 1000), r[2] * R2D]));
const deepB = tier.build(-1000000, 0, 1000);
const dDs = { a: [], b: [] };
for (let k = -200; k <= 0; k += 2) { const ref = laEps.get(k * 1000); if (ref !== undefined) dDs.a.push(deepB.at(k * 1000).epsDeg - ref); }
for (let k = -1000; k <= 0; k += 2) { const ref = laEps.get(k * 1000); if (ref !== undefined) dDs.b.push(deepB.at(k * 1000).epsDeg - ref); }
const d200 = stats(dDs.a), d1000 = stats(dDs.b);
// the span-edge seam: series vs the tail mode-sum at the last in-span node
const tEdge = t0Yr + (n - 1) * STEP_YR;
const seamDeg = (() => {
  const tierModes = createDeepOrbitalHistory({
    zModes: MT.modes.earth.z, zetaModes: MT.modes.earth.zeta,
    anchorE: AE.e, anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
    anchorInclEclipticDeg: AE.inclEclipticDeg, anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
    axialPrecessionYearsJ2000, obliquityJ2000Deg,
  });
  // ζ-space distance at the edge (the n̂ discontinuity a crossing sees)
  const a = tier, b = tierModes; // both expose only build(); compare via a fine local build
  const s1 = a.build(tEdge - 1000, tEdge, 500).at(tEdge - 500);
  const s2 = b.build(tEdge - 1000, tEdge, 500).at(tEdge - 500);
  return Math.abs(s1.inclEclDeg - s2.inclEclDeg);
})();

console.log(`era vs IAU-2006: 1900–2100 rms ${eraA.rms.toFixed(3)}″ (max ${eraA.max.toFixed(3)}″) · 1600–2400 rms ${eraB.rms.toFixed(3)}″`);
console.log(`deps/dt(J2000) ${rateJ2000.toFixed(2)} ″/cy (IAU ${iauRate})`);
console.log(`vs La2004: −200..0 kyr rms ${d200.rms.toFixed(4)}° · −1000..0 kyr rms ${d1000.rms.toFixed(4)}° (max ${d1000.max.toFixed(3)}°)`);
console.log(`span-edge seam (incl, series vs tail modes near +10 Myr): ${seamDeg.toFixed(4)}°`);

if (eraA.rms > 0.25) { console.error('REFUSING: 1900–2100 ε rms exceeds 0.25″ — the series does not meet the C-1 era class'); process.exit(1); }
if (eraB.rms > 0.30) { console.error('REFUSING: 1600–2400 ε rms exceeds 0.30″'); process.exit(1); }
if (Math.abs(rateJ2000 - iauRate) > Math.abs(iauRate) * 0.01) { console.error(`REFUSING: dε/dt ${rateJ2000.toFixed(2)} departs the IAU reference by >1%`); process.exit(1); }
if (d200.rms > 0.05) { console.error('REFUSING: −200..0 kyr ε rms vs La2004 exceeds 0.05°'); process.exit(1); }

const artifact = {
  _description: 'Earth ζ = sin(i/2)·e^{iΩ} series (ecliptic-J2000), resampled at 500-yr cadence from the model\'s own ±10-Myr Wisdom–Holman run (1PN, DE440 masses, Horizons J2000 seed) — the C-2 ONE-SOURCE orbit-plane history for the obliquity hybrid (deep-orbital-history.cjs zetaSeries option). No mode extraction: the C-1 verdict (plan 02) measured that no flat ζ mode table serves both the certified era and deep time; the series itself does. The deep-16 mode table (nbody-deep-secular-modes.json) remains the TAIL beyond the ±10-Myr span. Verdict block = the banked quality gate. Times are years from J2000: t_i = t0Yr + i·stepYr.',
  meta: {
    dumpFile: path.relative(ROOT, DUMP),
    dumpSha256,
    integrator: D.integrator, dtDays: D.dt, gr: D.gr, spanYears: span,
    rawSampleDays: D.sampleDays,
    cadenceYr: STEP_YR, samples: n, roundedDecimals: 9,
    resampleMaxDeparture: Number(maxResample.toExponential(2)),
    cadenceSweepNote: '500 yr keeps the hybrid at 0.16″/0.18″ rms vs IAU-2006 (raw: 0.13″/0.10″); 1000 yr degrades 1600–2400 to 0.64″ — the measured C-2 sweep',
  },
  t0Yr, stepYr: STEP_YR, q, p,
  verdict: {
    eraRms19002100Arcsec: eraA.rms, eraMax19002100Arcsec: eraA.max,
    eraRms16002400Arcsec: eraB.rms,
    rateJ2000ArcsecPerCy: rateJ2000, iauRateArcsecPerCy: iauRate,
    deep200KyrRmsDeg: d200.rms, deep1000KyrRmsDeg: d1000.rms, deep1000KyrMaxDeg: d1000.max,
    spanEdgeSeamInclDeg: seamDeg,
    baselines: {
      eraTier8: { eraRms19002100Arcsec: 0.311, deep200KyrRmsDeg: 0.1505 },
      deepTier16: { eraRms19002100Arcsec: 4.948, deep200KyrRmsDeg: 0.0694 },
      note: 'the C-1 measured baselines the series beats on both home turfs (plan 02 C-1 verdict)',
    },
  },
  inputs: buildInputsBlock('node tools/verify/earth-zeta-series.js --write', [
    'tools/explore/lattice-long-window-test.mjs',
    'tools/verify/earth-zeta-series.js',
    'packages/physics/src/earth/deep-orbital-history.cjs',
    'data/nbody-deep-secular-modes.json',
  ]),
};
fs.writeFileSync(OUT, JSON.stringify(artifact));
console.log(`✓ wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB)`);
}
