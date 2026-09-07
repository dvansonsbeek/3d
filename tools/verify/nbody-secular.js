#!/usr/bin/env node
/**
 * ENGINE-D SECULAR FREQUENCIES — the governed artifact (plan: two-engine
 * model, Batch D / T1 + P8b).
 *
 * WRITES data/nbody-secular-frequencies.json (tracked; --write only) from the
 * model's own N-body pipeline: the Wisdom–Holman 9-body integration
 * (tools/explore/nbody-wh.mjs; exact Kepler drifts, 1PN, DE440 masses,
 * Horizons J2000 seed from tools/explore/j2000-state.mjs — the one home) and
 * NAFF frequency analysis (tools/explore/naff-frequencies.mjs, Laskar
 * 1990/1993). This script ORCHESTRATES those one-home scripts and computes
 * the window rates and the derived relativistic supplement itself; it never
 * re-implements the integrator or the frequency analysis.
 *
 * WHAT THE ARTIFACT HOLDS (the registry's engine-D keys read it):
 *   g[planet]      leading z-mode frequency (″/yr), ecliptic frame, 1PN ON —
 *                  quantity A (long-term apsidal). The LEADING mode is stored
 *                  honestly: Earth and Uranus lead with the g5 (Jupiter) term,
 *                  not their own mode — the nearestLaskar label says which.
 *   s[planet]      leading ζ-mode frequency (″/yr), INVARIABLE plane, 1PN ON —
 *                  quantity A (long-term nodal). Jupiter's own s5 ≡ 0 by
 *                  definition of the invariable plane.
 *   windowRatesArcsecCy   mean ecliptic dϖ/dt over 1800–2100 (quantity B,
 *                  present-epoch), 1PN on and Newton-only columns.
 *   relativisticSupplementArcsecCy   the derived 1PN apsidal supplement
 *                  ϖ̇₁PN = 3n³a²/(c²(1−e²)) per planet, INSTANTANEOUS
 *                  (J2000 e), from shared constants only (E20: never retyped).
 *
 * ASSERTIONS CARRIED (the measured traps of the campaign, §6 of the plan):
 *   - WH conservation: bounded |ΔE/E| < 1e-7 over the 1-Myr run (symplectic;
 *     secular growth = numerical problem, not physics).
 *   - Two-body spurious drift: ZERO by construction under WH (exact Kepler
 *     drifts) — the +85″/cy trap was RK4 at 0.5 d; integrator pinned to wh.
 *   - P8b closure: Mercury's measured window Δ(1PN − Newton) must equal the
 *     derived instantaneous supplement to 0.1 ″/cy (E2's −43.0 → −0.0).
 *   - The derived Mercury supplement must sit on the GR reference 42.98 ″/cy
 *     (theory cross-check, labeled) to 0.1.
 *   - Jupiter/Saturn leading g vs Laskar 2004 g5/g6 to 0.05 ″/yr — catches
 *     the mean-element-seeding trap (Saturn −1,300) and step regressions.
 *   - NAFF near-duplicate merge (cancelling amplitudes) is handled inside
 *     naff-frequencies.mjs (its refit drops sub-resolution duplicates).
 *
 * The eigen-level 1PN shift on Mercury's g1 is +0.473 ″/yr (measured, E3)
 * vs +0.430 instantaneous — the cycle-average of 1/(1−e²) over the e(t)
 * oscillation, NOT a discrepancy; only the instantaneous value is asserted.
 *
 * Runtime under --write: ~25–35 min (one 1-Myr WH frame=both run at dt 2 d,
 * two 600-yr window runs, two NAFF passes, then the K4.5/K4.7b periodic-term
 * pipeline: the ±10-kyr extraction + the ±2.5-kyr era solve). A plain run
 * only prints the current artifact summary — the freshness gate
 * (check:artifacts) guards staleness by input hashes, never by re-running
 * this.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');

const TL = require(path.join(ROOT, 'tools', 'lib', 'constants.js'));
const astro = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/input/astro-reference.json'), 'utf8'));

const OUT = 'data/nbody-secular-frequencies.json';
const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const ARCSEC_PER_RAD = 648000 / Math.PI;
// Laskar, J. et al. (2004), A&A 428, 261–285, Table 3 — external REFERENCE
// values (another theory's integration, not observations); labels only.
const LASKAR2004 = {
  g: { g1: 5.5965, g2: 7.4555, g3: 17.3711, g4: 17.9159, g5: 4.2575, g6: 28.2455, g7: 3.0876, g8: 0.6730 },
  s: { s1: -5.6197, s2: -7.0797, s3: -18.8506, s4: -17.7553, s6: -26.3475, s7: -2.9927, s8: -0.6919 },
};

/** Derived instantaneous 1PN apsidal supplement (″/cy) — shared constants only. */
function relativisticSupplementArcsecCy(planet) {
  const yearDays = planet === 'earth' ? TL.meanSolarYearDays : TL.planets[planet].solarYearInput;
  const e = planet === 'earth'
    ? astro.earthOrbital.earthEccentricityJ2000
    : TL.planets[planet].orbitalEccentricityJ2000;
  const gmPlanet = planet === 'earth' ? TL.GM_EARTH_MOON_SYSTEM : TL.GM_SUN / TL.massRatioDE440[planet];
  const n = 2 * Math.PI / (yearDays * 86400);              // rad/s
  const mu = TL.GM_SUN + gmPlanet;                          // km³/s²
  const a = Math.cbrt(mu / (n * n));                        // km
  const radPerS = 3 * n ** 3 * a ** 2 / (TL.speedOfLight ** 2 * (1 - e * e));
  return radPerS * ARCSEC_PER_RAD * 86400 * 36525;          // ″ per Julian century
}

function run(args) {
  execFileSync('node', args, { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] });
}

const rdLocal = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

/** Mean rate of the unwrapped ecliptic ϖ over [y0, y1] (″/cy), OLS slope. */
// Generalized window slope on any dumped element series (°/yr for angles,
// unit/yr otherwise). Angles unwrap incrementally (±180 window — safe at the
// 10-day window cadence for every element including Mercury's L, 40.9°/sample).
function windowSlopePerYr(dump, planet, el, y0, y1, unwrapAngle) {
  const t = dump.t, w = dump.elements[planet][el];
  const x = [], y = [];
  let prev = null, acc = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] < y0 || t[i] > y1) continue;
    if (prev !== null) {
      let d = w[i] - prev;
      if (unwrapAngle) { while (d > 180) d -= 360; while (d < -180) d += 360; }
      acc += d;
    }
    prev = w[i];
    x.push(t[i]); y.push(acc);
  }
  const n = x.length, mx = x.reduce((s, q) => s + q, 0) / n, my = y.reduce((s, q) => s + q, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
  return sxy / sxx;
}

function windowRate(dump, planet, y0, y1) {
  const t = dump.t, w = dump.elements[planet].w;
  const x = [], y = [];
  let prev = null, acc = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] < y0 || t[i] > y1) continue;
    if (prev !== null) {
      let d = w[i] - prev;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      acc += d;
    }
    prev = w[i];
    x.push(t[i]); y.push(acc);
  }
  const n = x.length, mx = x.reduce((s, q) => s + q, 0) / n, my = y.reduce((s, q) => s + q, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
  return (sxy / sxx) * 3600 * 100;   // °/yr → ″/cy
}

const leadArcsecPerYr = (modes) => modes[0].omegaRadPerYr * ARCSEC_PER_RAD;
const leadAmp = (modes) => Math.hypot(modes[0].re, modes[0].im);
const nearestLaskar = (rate, set) => {
  let best = null;
  for (const [k, v] of Object.entries(set)) if (best === null || Math.abs(v - rate) < Math.abs(set[best] - rate)) best = k;
  return { mode: best, arcsecPerYr: set[best] };
};

function main() {
  const WRITE = process.argv.includes('--write');
  if (!WRITE) {
    if (fs.existsSync(path.join(ROOT, OUT))) {
      const a = JSON.parse(fs.readFileSync(path.join(ROOT, OUT), 'utf8'));
      console.log(`${OUT} present — g: ` + PLANETS.map((p) => `${p} ${a.g[p].arcsecPerYr.toFixed(3)}`).join(' · '));
      console.log('Regeneration: node tools/verify/nbody-secular.js --write (~15-20 min). Freshness: npm run check:artifacts.');
    } else {
      console.log(`${OUT} MISSING — run: node tools/verify/nbody-secular.js --write`);
    }
    return;
  }

  const SPAN = parseFloat((process.argv.find((a) => a.startsWith('years=')) || 'years=1000000').slice(6));
  const dumpScript = 'tools/explore/lattice-long-window-test.mjs';
  const naffScript = 'tools/explore/naff-frequencies.mjs';

  console.log(`[1/5] 1-Myr WH run, frame=both, 1PN on (dt 2 d) — the slow step`);
  run([dumpScript, `years=${SPAN}`, 'integrator=wh', 'dt=2', 'order=2', 'gr=1', 'frame=both', 'sample=1000']);
  const longEcl = `tools/explore/lattice-long-window-ecliptic-${SPAN}-gr.local.json`;
  const longInv = `tools/explore/lattice-long-window-invariable-${SPAN}-gr.local.json`;

  console.log(`[2/5] window runs 1700–2300 (1PN on / Newton) for the 1800–2100 rates`);
  run([dumpScript, 'years=600', 'integrator=wh', 'dt=2', 'order=2', 'gr=1', 'frame=ecliptic', 'sample=10']);
  run([dumpScript, 'years=600', 'integrator=wh', 'dt=2', 'order=2', 'frame=ecliptic', 'sample=10']);

  console.log(`[3/5] NAFF (z from the ecliptic series, ζ from the invariable)`);
  const modesEcl = 'tools/explore/naff-modes-ecliptic-batchd.local.json';
  const modesInv = 'tools/explore/naff-modes-invariable-batchd.local.json';
  run([naffScript, `file=${path.join(ROOT, longEcl)}`, 'terms=8', `out=${path.join(ROOT, modesEcl)}`]);
  run([naffScript, `file=${path.join(ROOT, longInv)}`, 'terms=8', `out=${path.join(ROOT, modesInv)}`]);

  console.log(`[4/5] assemble + assert`);
  const dumpLong = rdLocal(longEcl);
  const conservation = dumpLong.conservation || [];
  const maxDE = Math.max(...conservation.map((d) => d.maxDE));
  if (!(maxDE < 1e-7)) throw new Error(`WH conservation violated: max |ΔE/E| ${maxDE} ≥ 1e-7`);

  const mEcl = rdLocal(modesEcl).modes, mInv = rdLocal(modesInv).modes;
  const g = {}, s = {};
  for (const p of PLANETS) {
    const gz = leadArcsecPerYr(mEcl[p].z);
    g[p] = { arcsecPerYr: gz, amplitude: leadAmp(mEcl[p].z), nearestLaskar: nearestLaskar(gz, LASKAR2004.g) };
    const sz = leadArcsecPerYr(mInv[p].zeta);
    s[p] = { arcsecPerYr: sz, amplitude: leadAmp(mInv[p].zeta), nearestLaskar: nearestLaskar(sz, LASKAR2004.s) };
  }
  if (Math.abs(g.saturn.arcsecPerYr - LASKAR2004.g.g6) > 0.05) throw new Error(`Saturn leading g ${g.saturn.arcsecPerYr} vs Laskar g6 ${LASKAR2004.g.g6} — seeding/step trap?`);
  if (Math.abs(g.jupiter.arcsecPerYr - LASKAR2004.g.g5) > 0.05) throw new Error(`Jupiter leading g ${g.jupiter.arcsecPerYr} vs Laskar g5 ${LASKAR2004.g.g5} — seeding/step trap?`);

  const winGr = rdLocal('tools/explore/lattice-long-window-ecliptic-600-gr.local.json');
  const winNt = rdLocal('tools/explore/lattice-long-window-ecliptic-600.local.json');
  const windowRates = { gr: {}, newton: {} };
  for (const p of PLANETS) {
    windowRates.gr[p] = windowRate(winGr, p, -200, 100);
    windowRates.newton[p] = windowRate(winNt, p, -200, 100);
  }

  // ── K2.1 (P5, plan 02) — the Keplerian chain's governed inputs ─────────
  // Window element rates fitted on the same 1PN window run, and the J2000
  // anchor osculating elements taken from the dump's t = 0 sample (the HZ
  // seed state, engine-extracted — ONE home for the chain's inputs: this
  // artifact). Era-typed: 1800–2100 window values, like windowRatesArcsecCy.
  const windowElementRates = {};
  const j2000AnchorElements = {};
  const t0i = winGr.t.findIndex((tv) => Math.abs(tv) < 1e-9);
  if (t0i < 0) throw new Error('window dump has no t = 0 sample — anchor extraction impossible');
  for (const p of PLANETS) {
    windowElementRates[p] = {
      meanMotionDegPerYr: windowSlopePerYr(winGr, p, 'L', -200, 100, true),
      nodeRateArcsecCy: windowSlopePerYr(winGr, p, 'Om', -200, 100, true) * 3600 * 100,
      eccDotPerCy: windowSlopePerYr(winGr, p, 'e', -200, 100, false) * 100,
      inclDotArcsecCy: windowSlopePerYr(winGr, p, 'inc', -200, 100, false) * 3600 * 100,
    };
    const E = winGr.elements[p];
    j2000AnchorElements[p] = {
      aAU: E.a[t0i], e: E.e[t0i], inclEclipticDeg: E.inc[t0i],
      ascNodeEclipticDeg: E.Om[t0i], lonPeriEclipticDeg: E.w[t0i], meanLonEclipticDeg: E.L[t0i],
    };
  }
  // Cross-gate: engine D's Earth window mean motion must sit on the model's
  // OWN sidereal-year anchor (the K2 instrument measured them 0.28 ″/yr
  // apart) — this ties the N-body to the framework's foundational constant.
  const nSiderealDegPerYr = 360 * 365.25 * 86400 / TL.meanSiderealYearSeconds;
  const dEarthArcsecYr = (windowElementRates.earth.meanMotionDegPerYr - nSiderealDegPerYr) * 3600;
  if (!(Math.abs(dEarthArcsecYr) < 2)) throw new Error(`Earth window mean motion off the model sidereal anchor by ${dEarthArcsecYr.toFixed(3)} ″/yr (tol 2)`);

  // K5c — the engine's OWN invariable plane (unit total angular momentum of
  // the J2000 seed state, computed by the dump script, ecliptic-J2000
  // coords). Literature planes (Souami & Souchay 2012: 1.5787°) are external
  // reference labels, never inputs — the sanity band only catches a broken
  // basis, not a mismatch with theory.
  const invariablePlane = dumpLong.invariablePlane;
  if (!invariablePlane || !(invariablePlane.inclEclipticDeg > 1.4 && invariablePlane.inclEclipticDeg < 1.8)) {
    throw new Error(`invariable-plane orientation missing or implausible: ${JSON.stringify(invariablePlane)} (expected incl ~1.4–1.8° to ECLIPJ2000)`);
  }

  const rel = {};
  for (const p of PLANETS) rel[p] = relativisticSupplementArcsecCy(p);
  if (Math.abs(rel.mercury - 42.98) > 0.1) throw new Error(`derived Mercury 1PN supplement ${rel.mercury.toFixed(3)} ″/cy off the GR reference 42.98`);
  const mercuryClosure = windowRates.gr.mercury - windowRates.newton.mercury;
  if (Math.abs(mercuryClosure - rel.mercury) > 0.1) throw new Error(`P8b closure fails: measured window Δ ${mercuryClosure.toFixed(3)} vs derived ${rel.mercury.toFixed(3)} ″/cy (tol 0.1)`);

  const artifact = {
    _description: 'Engine-D secular frequencies from the model’s own N-body pipeline (WH 1-Myr, 1PN on, NAFF), the 1800–2100 window rates (B), the Keplerian chain’s governed inputs (K2.1/P5: windowElementRates + j2000AnchorElements — era-typed window values and the t=0 anchor, the chain’s ONE home), and the derived instantaneous 1PN apsidal supplement. Frames: g ecliptic-J2000 z-modes, s INVARIABLE-plane ζ-modes. Laskar 2004 values are external reference labels (theory), never inputs. See tools/verify/nbody-secular.js for the assertions carried.',
    meta: {
      integrator: 'wh', order: 2, dtDays: 2, spanYears: SPAN, sampleDays: 1000, gr: true,
      seed: 'JPL Horizons J2000 heliocentric state vectors (tools/explore/j2000-state.mjs, the one home)',
      masses: 'DE440 mass ratios (astro-reference physicalConstants)',
      naffTerms: 8, windowYears: [1800, 2100],
      laskarRef: 'Laskar, J. et al. (2004), A&A 428, 261–285, Table 3',
      conservationMaxDE: maxDE,
      note1PN: 'Mercury eigen-level 1PN shift ≈ +0.473 ″/yr (cycle-average of 1/(1−e²)) vs +0.430 instantaneous — not a discrepancy; only the instantaneous value is asserted (P8b).',
    },
    g, s,
    // K4.7 (P5) — the FULL secular mode tables, ecliptic frame (z = k+ih =
    // e·e^{iϖ}, ζ = q+ip = sin(i/2)·e^{iΩ}; each mode (re+i·im)·e^{iωt},
    // t in years from J2000). The chain's secular skeleton: the elements
    // ride the multi-mode vectors, not a tangent line — the linear-drift
    // approximation was measured leaving the eigenmode-rotation curvature
    // (Saturn ~700µ sagitta over ±2.5 kyr) as an unfixable residual.
    secularModes: Object.fromEntries(PLANETS.map((p) => [p, { z: mEcl[p].z, zeta: mEcl[p].zeta }])),
    windowRatesArcsecCy: windowRates,
    windowElementRates,
    j2000AnchorElements,
    // K5c — the s-frame definition: the engine's own invariable plane in
    // ecliptic-J2000 coords (pole from the J2000 seed's total angular
    // momentum; node = the plane's ascending node on the ecliptic). The
    // evaluator rotates ecliptic elements-of-date into this frame exactly.
    invariablePlane,
    relativisticSupplementArcsecCy: rel,
    checks: {
      mercuryClosureArcsecCy: { measuredWindowDelta: mercuryClosure, derivedInstantaneous: rel.mercury, diff: mercuryClosure - rel.mercury, tolerance: 0.1 },
      earthMeanMotionVsSiderealAnchor: { engineDegPerYr: windowElementRates.earth.meanMotionDegPerYr, modelSiderealDegPerYr: nSiderealDegPerYr, diffArcsecPerYr: dEarthArcsecYr, tolerance: 2 },
      saturnG6: { measured: g.saturn.arcsecPerYr, laskar: LASKAR2004.g.g6 },
      jupiterG5: { measured: g.jupiter.arcsecPerYr, laskar: LASKAR2004.g.g5 },
    },
    inputs: buildInputsBlock('node tools/verify/nbody-secular.js --write', [
      'tools/verify/nbody-secular.js',
      'tools/explore/lattice-long-window-test.mjs',
      'tools/explore/naff-frequencies.mjs',
      'tools/explore/nbody-wh.mjs',
      'tools/explore/j2000-state.mjs',
      // K4.5/K4.7b periodic-term pipeline + the runtime evaluator: the terms
      // and the evaluation form are a MATCHED PAIR (the ~1162-minute-class
      // rule) — an evaluator change must flag the artifact stale. The
      // evaluator lives ONCE in the package (K4.6c); tools/lib is its Node
      // binding — both hashed.
      'tools/explore/k45-residual-naff.mjs',
      'tools/explore/k45e-amplitude-solve.mjs',
      'packages/physics/src/planets/keplerian-chain.cjs',
      'tools/lib/keplerian-chain.js',
      'public/input/astro-reference.json',
    ]),
  };
  // Write the CORE artifact first: the periodic-term pipeline below builds
  // its skeleton chains FROM this file (bootstrap order is load-bearing).
  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(artifact, null, 1) + '\n');
  console.log(`wrote ${OUT} (core)`);

  // ── K4.5/K4.7b (P5) — the derived periodic-term layer, generator-owned ──
  // The extraction (±10-kyr NAFF seeds — the resonant multiplets are 0.47
  // Rayleigh apart in the era window, only the long window separates them)
  // then the era solve (±2.5-kyr LSQ, golden-refined residual-scan
  // augmentation; λ̄/a/z/ζ channels — the a-channel is load-bearing: the
  // heliocentric osculating elements slosh together at the synodic periods).
  // Both scripts measure ENGINE DATA ONLY and build skeleton chains from the
  // core artifact just written. Their headers carry the campaign record.
  console.log(`[5/5] derived periodic terms (extraction seeds → era solve)`);
  run(['tools/explore/k45-residual-naff.mjs']);
  run(['tools/explore/k45e-amplitude-solve.mjs']);
  const termsLocal = rdLocal('tools/explore/k45-terms.local.json');
  artifact.periodicTerms = termsLocal.giants;   // mars + the four giants
  artifact.meta.periodicTermsMethod = termsLocal.method;
  artifact.meta.periodicTermsSpanYr = termsLocal.spanYr;
  artifact.meta.periodicTermsCadenceYr = termsLocal.cadenceYr;
  artifact._description = artifact._description.replace(
    'and the derived instantaneous 1PN apsidal supplement.',
    'the derived instantaneous 1PN apsidal supplement, and the K4.5/K4.7b derived periodic-term layer (periodicTerms: λ̄/a/z/ζ lines + era window affine, engine-measured — tools/explore/k45e-amplitude-solve.mjs).');
  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(artifact, null, 1) + '\n');
  console.log(`wrote ${OUT} (+periodicTerms)`);
  console.log('g (″/yr): ' + PLANETS.map((p) => `${p} ${g[p].arcsecPerYr.toFixed(3)} [${g[p].nearestLaskar.mode}]`).join(' · '));
  console.log('s (″/yr): ' + PLANETS.map((p) => `${p} ${s[p].arcsecPerYr.toFixed(3)} [${s[p].nearestLaskar.mode}]`).join(' · '));
  console.log(`Mercury closure: window Δ ${mercuryClosure.toFixed(3)} vs derived ${rel.mercury.toFixed(3)} ″/cy — P8b holds`);
}

main();
