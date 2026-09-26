#!/usr/bin/env node
/**
 * T7 — export the MODEL'S OWN orbital histories for the fixed-phase L1 test
 * (holisticuniverse plan 06 §4 T7; the fitter is scripts/t7_fixed_phase_l1.py).
 *
 *     node tools/explore/t7-export-orbital-histories.mjs            print a summary
 *     node tools/explore/t7-export-orbital-histories.mjs --write    write data/t7-model-orbital-histories.json
 *
 * The SAME construction the scene renders and the API publishes — the
 * one-source movement (tools/lib/deep-orbital-history.js createOneSourceMovement;
 * twins in packages/physics model.js and src/script.js _deepHistSeries): the
 * banked ±10-Myr engine run (data/nbody-secular-series.json) for e and the
 * orbit normal, the obliquity hybrid integrated on it with the composed
 * lunisolar rate, the of-date climatic precession as the physical angle from
 * the moving equinox — built ONCE on a 1-kyr grid over 0 … −5.4 Myr (the
 * LR04 span with margin for the climate lag scan), instead of the movement's
 * 5-kyr deep tier (a 5-kyr linear interpolation of a 19–23-kyr line loses
 * amplitude; the test needs the lines intact). Columns per row (t = years
 * from J2000, negative = past): e, ε (deg), ϖ of date (deg, Earth's
 * perihelion from the moving equinox), e·sin ϖ, and the June-solstice daily
 * insolation at 65°N from the same three (Berger's daily form, the
 * simulator's computeDailyInsolationWm2: perigee = ϖ + 180°, S₀ = 1361 W/m²
 * — the amplitude scale is immaterial to an R²).
 *
 * "We are the source": these are the model's numbers; La2004 enters the test
 * only as a confirmation column, read by the fitter from its own file.
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_REL = 'data/t7-model-orbital-histories.json';
const SELF_REL = 'tools/explore/t7-export-orbital-histories.mjs';
const INPUTS = ['data/nbody-secular-series.json', 'data/nbody-deep-secular-modes.json',
  'packages/physics/src/earth/deep-orbital-history.cjs', 'tools/lib/deep-orbital-history.js', SELF_REL];

const T_MIN_YR = -5400000, STEP_YR = 1000;
const LAT_DEG = 65, SOLAR_LON_DEG = 90, S0_WM2 = 1361;

// ── the one-source movement's construction, one grid ───────────────────────
const seriesArt = JSON.parse(readFileSync(path.join(ROOT, 'data', 'nbody-secular-series.json'), 'utf8'));
const ART = JSON.parse(readFileSync(path.join(ROOT, 'data', 'nbody-deep-secular-modes.json'), 'utf8'));
const { CHAIN_ARTIFACT } = require(path.join(ROOT, 'packages/physics/src/planets/chain-artifact.js'));
const { createDeepOrbitalHistory: factory } = require(path.join(ROOT, 'packages/physics/src/earth/deep-orbital-history.cjs'));
const DT = require(path.join(ROOT, 'tools/lib/deep-time.js'));
const C = require(path.join(ROOT, 'tools/lib/constants.js'));

const AE = CHAIN_ARTIFACT.j2000AnchorElements.earth;
const sidDays = DT.computeSiderealYearDaysDirect(2000);
const solDays = DT.computeSolarYearDaysDirect(2000);
const axial0 = sidDays / (sidDays - solDays);
const H0 = DT.meanHAtAge(0);
const eb = seriesArt.bodies.earth;
const hist = factory({
  zModes: ART.modes.earth.z,
  zetaModes: ART.modes.earth.zeta,
  zetaSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zetaQ, p: eb.zetaP },
  zSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zQ, p: eb.zP },
  anchorE: AE.e,
  anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
  anchorInclEclipticDeg: AE.inclEclipticDeg,
  anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
  axialPrecessionYearsJ2000: axial0,
  obliquityJ2000Deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
  axialPrecessionYearsAtYearFn: (yr) => axial0 * DT.meanHAtAge((2000 - yr) / 1e6) / H0,
});
const t0 = Date.now();
const grid = hist.build(0, T_MIN_YR, STEP_YR);
const buildMs = Date.now() - t0;

/** Berger daily-mean insolation (W/m²) — the simulator's computeDailyInsolationWm2, same conventions. */
function dailyInsolationWm2(e, epsDeg, periDeg, latDeg, lamDeg) {
  const D = Math.PI / 180;
  const eps = epsDeg * D, phi = latDeg * D, lam = lamDeg * D, perigee = (periDeg + 180) * D;
  const rho2 = Math.pow(1 + e * Math.cos(lam - perigee), 2) / Math.pow(1 - e * e, 2);
  const delta = Math.asin(Math.sin(eps) * Math.sin(lam));
  const x = -Math.tan(phi) * Math.tan(delta);
  const H0h = x <= -1 ? Math.PI : x >= 1 ? 0 : Math.acos(x);
  return (S0_WM2 / Math.PI) * rho2 * (H0h * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(H0h));
}

const rows = { t_yr_from_j2000: [], e: [], eps_deg: [], peri_of_date_deg: [], e_sin_peri: [], q65n_june_wm2: [] };
for (let t = 0; t >= T_MIN_YR; t -= STEP_YR) {
  const s = grid.at(t);
  rows.t_yr_from_j2000.push(t);
  rows.e.push(s.e);
  rows.eps_deg.push(s.epsDeg);
  rows.peri_of_date_deg.push(s.periOfDateDeg);
  rows.e_sin_peri.push(s.eSinPeri);
  rows.q65n_june_wm2.push(dailyInsolationWm2(s.e, s.epsDeg, s.periOfDateDeg, LAT_DEG, SOLAR_LON_DEG));
}
const j2000 = grid.at(0);
const n = rows.e.length;
const stats = (a) => ({ min: Math.min(...a), max: Math.max(...a), mean: a.reduce((x, y) => x + y, 0) / a.length });
console.log(`T7 histories: ${n} rows, ${STEP_YR}-yr grid, 0 … ${T_MIN_YR} yr (build ${buildMs} ms)`);
console.log(`  J2000: e ${j2000.e.toFixed(7)} · ε ${j2000.epsDeg.toFixed(5)}° · ϖ ${j2000.periOfDateDeg.toFixed(4)}° · e·sin ϖ ${j2000.eSinPeri.toFixed(6)} · Q65N ${rows.q65n_june_wm2[0].toFixed(2)} W/m²`);
for (const k of ['e', 'eps_deg', 'e_sin_peri', 'q65n_june_wm2']) { const s = stats(rows[k]); console.log(`  ${k.padEnd(14)} min ${s.min.toFixed(5)}  max ${s.max.toFixed(5)}  mean ${s.mean.toFixed(5)}`); }

if (process.argv.includes('--write')) {
  const sha = (rel) => createHash('sha256').update(readFileSync(path.join(ROOT, rel))).digest('hex');
  const out = {
    _description: 'T7 fixed-phase L1 test — the MODEL\'S OWN orbital histories on a 1-kyr grid over 0 … −5.4 Myr: the one-source movement\'s construction (banked ±10-Myr engine run + obliquity hybrid on the composed lunisolar rate + physical of-date climatic precession), built once at 1 kyr. Consumer: scripts/t7_fixed_phase_l1.py. Regenerate: node tools/explore/t7-export-orbital-histories.mjs --write',
    meta: {
      generated_by: SELF_REL,
      command: `node ${SELF_REL} --write`,
      generated_at: new Date().toISOString(),
      build_ms: buildMs,
      grid: { t_min_yr: T_MIN_YR, t_max_yr: 0, step_yr: STEP_YR, rows: n, t_axis: 'years from J2000 (negative = past); kyr BP ≈ −t/1000 (the 50-yr 1950 offset is below the grid)' },
      conventions: {
        eps_deg: 'obliquity of date, the hybrid (ds/dt = α(ŝ·n̂)(ŝ×n̂) on the banked ζ history, α from the composed lunisolar rate)',
        peri_of_date_deg: 'Earth\'s perihelion longitude of date from the moving equinox (the physical angle ŝ×n̂ → perihelion in the orbit plane)',
        e_sin_peri: 'e · sin(peri_of_date_deg) — the climatic precession index (Earth\'s perihelion; the Sun\'s is +180°, a sign flip)',
        q65n_june_wm2: `daily-mean insolation at ${LAT_DEG}°N for solar longitude ${SOLAR_LON_DEG}° (June solstice), Berger's form as the simulator's computeDailyInsolationWm2 (perigee = ϖ + 180°), S₀ = ${S0_WM2} W/m²`,
        axial_precession_j2000_yr: axial0,
      },
      inputs: INPUTS.map((rel) => ({ path: rel, sha256: sha(rel) })),
    },
    columns: Object.keys(rows),
    ...rows,
  };
  writeFileSync(path.join(ROOT, OUT_REL), JSON.stringify(out) + '\n');
  console.log(`wrote ${OUT_REL} (${(JSON.stringify(out).length / 1024).toFixed(0)} kB)`);
}
