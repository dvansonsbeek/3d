/**
 * Cross-engine identity gate: the recorded BROWSER fixture values must equal
 * the NODE engine's live outputs for every shared cardinal-point probe.
 *
 *   node test/cross-engine.test.mjs        (exit 1 on divergence)
 *
 * This is the check that caught nothing three times by luck — run as a
 * scratchpad one-off during the §10g and symmetric-set landings — promoted to
 * a permanent gate ahead of the Phase 7 physics/cardinal extraction, whose
 * gate is exactly this identity. Requires a fresh browser fixture
 * (test:snapshot runs first in the chain).
 *
 * Expectations, calibrated from measurement:
 *   - solstice JDs: BIT-EXACT (Object.is) — the two engines share the §10
 *     evaluation form and the integrated-phase convention; measured 0.000 ms.
 *   - year lengths: BIT-EXACT since Phase 7.2 — the pre-extraction ≤5.6e-8 d
 *     gap turned out to be OPERATION-ORDER divergence between the two
 *     hand-mirrors (per-div phaseAdvance vs 2π·div·c), not the twins; the
 *     shared @essrt/physics/cardinal implementation dissolved it.
 *   - RA: bit-exact since the integrated-phase migration (same reason).
 *   - DEEP solstice JDs (|year| > 50 kyr): within 1e-6 d (0.1 s), NOT
 *     bit-exact — plan 06 R3 item 2, measured: headless Chromium's V8 and
 *     Node's V8 differ at the last bit on 5–15 % of arguments for pow, exp,
 *     log, sin, cos, tan, atan2, cbrt, asin, acos, sinh, cosh (4,552 of
 *     64,000 randomized evaluations; hypot and sqrt identical —
 *     tools/explore/runtime-math-fingerprint.mjs). The one-source hybrid's
 *     2-Myr, 400k-step RK4 chain amplifies those bits to ~2 ULP of the JD
 *     (3e-8 d) at −302,635, where the shared code was bit-exact under the
 *     previous climate coefficients by luck. Identical code, identical data,
 *     different runtime arithmetic — a tolerance is the honest statement,
 *     and the certified window (≤ 50 kyr) stays bit-exact.
 *   - DEEP year lengths (|year| > 50 kyr): within 1e-7 d — the same class
 *     (a year length is the difference of two deep JDs); measured 1–2 ULP
 *     of the JD at −302,635 once the deep eccentricity channel's slope
 *     anchor moved the Moon there. In-era year lengths stay bit-exact.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(join(ROOT, 'package.json'));
const OE = require(join(ROOT, 'tools/lib/orbital-engine.js'));
const DT = require(join(ROOT, 'tools/lib/deep-time.js'));
const SG = require(join(ROOT, 'tools/lib/scene-graph.js'));

const fixture = JSON.parse(readFileSync(
  join(ROOT, 'packages/fixtures/regression/script-js.json'), 'utf8')).values;

const YL_TOL_DAYS = 0;      // bit-exact — achieved at Phase 7.2 (shared code)
const DEEP_YEARS = 50000;   // beyond the certified fine zone the runtimes' Math differs at the last bit (header)
const DEEP_JD_TOL_DAYS = 1e-6;
// DEEP year lengths (|year| > DEEP_YEARS): the difference of two deep
// solstice JDs, so the same last-bit class as the JDs themselves — measured
// 1.49e-8 and 2.98e-8 d (1–2 ULP of a JD of magnitude 1e8) on solsticeVE /
// solsticeAE at −302,635 after the deep eccentricity channel's slope anchor
// moved the Moon (and with it the geocentric Sun) at that epoch; the
// certified window stays bit-exact.
const DEEP_YL_TOL_DAYS = 1e-7;
// Plan 06 R5 — the Moon SERIES inputs (the shared Meeus series on the
// framework-native arguments, at the scene's true TT): browser moonScene
// lon/lat/dist vs the Node engine at the same UT JD. Measured before the fix:
// the browser's argument factory froze its obliquity-carrier normalisation on
// the first frame from the K-comb fallback ε — 0.27″ at year 0, 6.7″ at
// ±100 kyr, 100″ at −5.34 Myr, invisible to every gate. Tolerance: the
// twins are the same code on the same data; only the runtimes' last-bit Math
// (header) separates them through the chain integrals — 0.002″ in-era,
// 0.02″ at deep time (both measured ≥10× above the post-fix residual).
const MOON_LON_TOL_ARCSEC = 0.002, MOON_LON_TOL_DEEP_ARCSEC = 0.02;
const MOON_DIST_TOL_KM = 0.01;
// Plan 06 R9 — the rendered PLANETS (the N-body element chain, the only
// planet path since K5, read at the engine year in both twins): browser
// scenePlanet theta/phi/dist vs the Node engine's computePlanetPosition at
// the same UT JD. Measured parity ≤0.004″ (the K4b record,
// tools/explore/k4b-browser-parity.mjs); 0.01″ / 1e-9 AU leave room for the
// runtimes' last-bit Math (header) through the chain and the frame walk.
const PLANET_TOL_ARCSEC = 0.01, PLANET_DIST_TOL_AU = 1e-9;
let exact = 0, withinTol = 0, failures = 0;

const moonNode = new Map();
const moonSeriesNode = (jd) => { if (!moonNode.has(jd)) moonNode.set(jd, SG.moonSeriesInputsAt(jd)); return moonNode.get(jd); };
const planetNode = new Map();
const planetPosNode = (name, jd) => { const k = name + '|' + jd; if (!planetNode.has(k)) planetNode.set(k, SG.computePlanetPosition(name, jd)); return planetNode.get(k); };
const wrapDeg = (d) => ((d + 540) % 360 + 360) % 360 - 180;

for (const [key, browserVal] of Object.entries(fixture)) {
  let m;
  let nodeVal, klass;
  if ((m = key.match(/^scenePlanet\.([a-z]+)\.(thetaRad|phiRad|distAU)@(-?\d+(?:\.\d+)?)$/))) {
    const n = planetPosNode(m[1], Number(m[3]));
    let d, tol, unit;
    if (m[2] === 'thetaRad') { d = Math.abs(wrapDeg(SG.thetaToRaDeg(browserVal) - SG.thetaToRaDeg(n.ra))) * 3600; tol = PLANET_TOL_ARCSEC; unit = '″'; }
    else if (m[2] === 'phiRad') { d = Math.abs(SG.phiToDecDeg(browserVal) - SG.phiToDecDeg(n.dec)) * 3600; tol = PLANET_TOL_ARCSEC; unit = '″'; }
    else { d = Math.abs(browserVal - n.distAU); tol = PLANET_DIST_TOL_AU; unit = ' AU'; }
    if (d === 0) { exact++; continue; }
    if (d <= tol) { withinTol++; continue; }
    console.log(`  DIVERGED (planet chain, >${tol}${unit}) ${key}  Δ=${d.toExponential(3)}${unit}`);
    failures++;
    continue;
  }
  if ((m = key.match(/^moonScene\.(lonDeg|latRad|distKm)@(-?\d+(?:\.\d+)?)$/))) {
    const jd = Number(m[2]), n = moonSeriesNode(jd);
    const deep = Math.abs(2000 + (jd - 2451545) / 365.25 - 2000) > DEEP_YEARS;
    let d, tol, unit;
    if (m[1] === 'lonDeg') { d = Math.abs(wrapDeg(browserVal - n.lonDeg)) * 3600; tol = deep ? MOON_LON_TOL_DEEP_ARCSEC : MOON_LON_TOL_ARCSEC; unit = '″'; }
    else if (m[1] === 'latRad') { d = Math.abs(browserVal * 180 / Math.PI - n.latDeg) * 3600; tol = deep ? MOON_LON_TOL_DEEP_ARCSEC : MOON_LON_TOL_ARCSEC; unit = '″'; }
    else { d = Math.abs(browserVal - n.distKm); tol = MOON_DIST_TOL_KM; unit = ' km'; }
    if (d === 0) { exact++; continue; }
    if (d <= tol) { withinTol++; continue; }
    console.log(`  DIVERGED (Moon series, >${tol}${unit}) ${key}  Δ=${d.toExponential(3)}${unit}`);
    failures++;
    continue;
  }
  if ((m = key.match(/^solsticeJD_(SS|WS|VE|AE)@(-?\d+)$/))) {
    nodeVal = OE.computeSolsticeJD(Number(m[2]), m[1]);
    klass = 'exact';
    if (Math.abs(Number(m[2])) > DEEP_YEARS) {
      if (Object.is(browserVal, nodeVal)) { exact++; continue; }
      const d = Math.abs(browserVal - nodeVal);
      if (d <= DEEP_JD_TOL_DAYS) { withinTol++; continue; }
      console.log(`  DIVERGED (deep, >${DEEP_JD_TOL_DAYS} d) ${key}  Δ=${d.toExponential(3)} d`);
      failures++;
      continue;
    }
  } else if ((m = key.match(/^solstice(SS|WS|VE|AE)@(-?\d+)$/))) {
    nodeVal = OE.computeSolsticeYearLength(Number(m[2]), m[1]);
    klass = 'tol';
  } else if ((m = key.match(/^solsticeRA_(SS|WS|VE|AE)@(-?\d+)$/))) {
    nodeVal = OE.computeSolsticeRA(Number(m[2]), m[1]);
    klass = 'tol';
  } else if ((m = key.match(/^lodReal@(-?\d+(?:\.\d+)?)Ma$/))) {
    // Phase 20.2 delegation gate: browser Layer-4 composite ≡ engine twin.
    nodeVal = DT.computeLodRealSecondsAtEpoch(2000 - Number(m[1]) * 1e6);
    klass = 'exact';
  } else {
    continue;
  }

  if (klass === 'exact') {
    if (Object.is(browserVal, nodeVal)) { exact++; continue; }
    console.log(`  DIVERGED (must be bit-exact) ${key}`);
    console.log(`    browser ${browserVal}`);
    console.log(`    node    ${nodeVal}`);
    failures++;
  } else {
    const d = Math.abs(browserVal - nodeVal);
    if (Object.is(browserVal, nodeVal)) { exact++; continue; }
    const tol = (m && Math.abs(Number(m[2])) > DEEP_YEARS) ? DEEP_YL_TOL_DAYS : YL_TOL_DAYS;
    if (d <= tol) { withinTol++; continue; }
    console.log(`  DIVERGED (>${tol}) ${key}  Δ=${d.toExponential(3)}`);
    failures++;
  }
}

const total = exact + withinTol + failures;
console.log(`CROSS-ENGINE — ${total} shared probes: ${exact} bit-exact, ${withinTol} within mirror tolerance, ${failures} diverged`);
if (failures) {
  console.log('FAIL — the two engines no longer compute the same cardinal model / Moon series.');
  process.exit(1);
}
console.log('PASS — browser fixture ≡ Node engine on every shared probe.');
