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
 * Runtime under --write: ~15–20 min (one 1-Myr WH frame=both run at dt 2 d
 * plus two 600-yr window runs and two NAFF passes). A plain run only prints
 * the current artifact summary — the freshness gate (check:artifacts) guards
 * staleness by input hashes, never by re-running this.
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

  console.log(`[1/4] 1-Myr WH run, frame=both, 1PN on (dt 2 d) — the slow step`);
  run([dumpScript, `years=${SPAN}`, 'integrator=wh', 'dt=2', 'order=2', 'gr=1', 'frame=both', 'sample=1000']);
  const longEcl = `tools/explore/lattice-long-window-ecliptic-${SPAN}-gr.local.json`;
  const longInv = `tools/explore/lattice-long-window-invariable-${SPAN}-gr.local.json`;

  console.log(`[2/4] window runs 1700–2300 (1PN on / Newton) for the 1800–2100 rates`);
  run([dumpScript, 'years=600', 'integrator=wh', 'dt=2', 'order=2', 'gr=1', 'frame=ecliptic', 'sample=10']);
  run([dumpScript, 'years=600', 'integrator=wh', 'dt=2', 'order=2', 'frame=ecliptic', 'sample=10']);

  console.log(`[3/4] NAFF (z from the ecliptic series, ζ from the invariable)`);
  const modesEcl = 'tools/explore/naff-modes-ecliptic-batchd.local.json';
  const modesInv = 'tools/explore/naff-modes-invariable-batchd.local.json';
  run([naffScript, `file=${path.join(ROOT, longEcl)}`, 'terms=8', `out=${path.join(ROOT, modesEcl)}`]);
  run([naffScript, `file=${path.join(ROOT, longInv)}`, 'terms=8', `out=${path.join(ROOT, modesInv)}`]);

  console.log(`[4/4] assemble + assert`);
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

  const rel = {};
  for (const p of PLANETS) rel[p] = relativisticSupplementArcsecCy(p);
  if (Math.abs(rel.mercury - 42.98) > 0.1) throw new Error(`derived Mercury 1PN supplement ${rel.mercury.toFixed(3)} ″/cy off the GR reference 42.98`);
  const mercuryClosure = windowRates.gr.mercury - windowRates.newton.mercury;
  if (Math.abs(mercuryClosure - rel.mercury) > 0.1) throw new Error(`P8b closure fails: measured window Δ ${mercuryClosure.toFixed(3)} vs derived ${rel.mercury.toFixed(3)} ″/cy (tol 0.1)`);

  const artifact = {
    _description: 'Engine-D secular frequencies from the model’s own N-body pipeline (WH 1-Myr, 1PN on, NAFF), the 1800–2100 window rates (B), and the derived instantaneous 1PN apsidal supplement. Frames: g ecliptic-J2000 z-modes, s INVARIABLE-plane ζ-modes. Laskar 2004 values are external reference labels (theory), never inputs. See tools/verify/nbody-secular.js for the assertions carried.',
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
    windowRatesArcsecCy: windowRates,
    relativisticSupplementArcsecCy: rel,
    checks: {
      mercuryClosureArcsecCy: { measuredWindowDelta: mercuryClosure, derivedInstantaneous: rel.mercury, diff: mercuryClosure - rel.mercury, tolerance: 0.1 },
      saturnG6: { measured: g.saturn.arcsecPerYr, laskar: LASKAR2004.g.g6 },
      jupiterG5: { measured: g.jupiter.arcsecPerYr, laskar: LASKAR2004.g.g5 },
    },
    inputs: buildInputsBlock('node tools/verify/nbody-secular.js --write', [
      'tools/verify/nbody-secular.js',
      'tools/explore/lattice-long-window-test.mjs',
      'tools/explore/naff-frequencies.mjs',
      'tools/explore/nbody-wh.mjs',
      'tools/explore/j2000-state.mjs',
      'public/input/astro-reference.json',
    ]),
  };
  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(artifact, null, 1) + '\n');
  console.log(`wrote ${OUT}`);
  console.log('g (″/yr): ' + PLANETS.map((p) => `${p} ${g[p].arcsecPerYr.toFixed(3)} [${g[p].nearestLaskar.mode}]`).join(' · '));
  console.log('s (″/yr): ' + PLANETS.map((p) => `${p} ${s[p].arcsecPerYr.toFixed(3)} [${s[p].nearestLaskar.mode}]`).join(' · '));
  console.log(`Mercury closure: window Δ ${mercuryClosure.toFixed(3)} vs derived ${rel.mercury.toFixed(3)} ″/cy — P8b holds`);
}

main();
