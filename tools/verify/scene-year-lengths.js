#!/usr/bin/env node
/**
 * SCENE-YEAR-LENGTHS GATE — the calculations match what the scene measures
 * ========================================================================
 *
 * Owner (2026-09-30): "all calculations should match what we measure in the
 * scene." This gate samples the Node scene twin's solar events around two
 * epochs with the solar-measurements exporter's own event definitions
 * (declination zero crossing, declination extremum, wobble-centre distance
 * extremum; 0.5-h sampling, the same refinement —
 * packages/fitting/src/export-solar-measurements.cjs) and checks:
 *
 *   levels   — RA at the cardinals (the solstice is the declination extremum,
 *              0.17″ from λ = 90° by the obliquity's own rate); the solstice
 *              declination against ε of date; e from the distance extremes
 *              against the series; the Sun's certified longitude at
 *              perihelion against the apsidal line of date; the published
 *              cardinal instants against the scene crossings once the
 *              aberration+nutation shift is removed.
 *   years    — the sidereal, mean tropical and anomalistic years of date
 *              MEASURED in the scene against the one-family laws
 *              (earth/year-lengths.cjs), to 30 ms. The planetary completion
 *              terms are removed per event first (sunLonDegAtJD −
 *              sunLonCompletedDegAtJD: the 6.44″ lunar equation and the
 *              1,783-yr inequality, ~150 s of event timing), so a ±100-yr
 *              window resolves milliseconds: sidereal = the cumulative
 *              sidereal angle (one turn per event minus the world-angle
 *              advance), four-cardinal mean so the equation of centre
 *              cancels; tropical/anomalistic = least-squares slopes of the
 *              event instants (TT).
 *
 * WHAT IT CATCHES (measured before the 2026-09 restatement, all three would
 * fail here): the tropical-year law reading the equinox's PROJECTED
 * longitude rate instead of the general precession (57 ms at −4000, 180 ms
 * at 10,000); the precession period counted in tropical years by the pair
 * and realised per Julian year by the frame (26 ms); the anomalistic year on
 * the planet chain's secular tangent instead of the movement's own apsidal
 * line (1.1 s at −4000, 14 s at 10,000).
 *
 * Fail-proven: ESSRT_SCENE_YEARS_PLANT=1 shifts the compared sidereal law by
 * 0.1 s and the gate must fail.
 *
 *   node tools/verify/scene-year-lengths.js            the gate (~2 min)
 *   node tools/verify/scene-year-lengths.js --report   + the per-epoch table
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const rq = require('module').createRequire(path.join(ROOT, 'package.json'));
const SG = require(path.join(ROOT, 'tools/lib/scene-graph.js'));
const C = require(path.join(ROOT, 'tools/lib/constants.js'));
const DT = require(path.join(ROOT, 'tools/lib/deep-time.js'));
const DOH = require(path.join(ROOT, 'tools/lib/deep-orbital-history.js'));
const P = rq('@essrt/physics');
const { jdToDecimalYear } = rq('@essrt/physics/moon/arguments');

const REPORT = process.argv.includes('--report');
const PLANT = process.env.ESSRT_SCENE_YEARS_PLANT === '1' ? 0.1 : 0;
const EPOCHS = [-4000, 10000];
const HALF = 100;
const TOL = { yearS: 0.030, raArcsec: 0.30, epsArcsec: 0.001, e: 1e-6, periArcsec: 3.0, instantS: 8.0, axialYr: 0.3 };

const BRIDGE = P.DEFAULT_CONSTANTS.earthOrbital.deltaTStart;
const M = DOH.createOneSourceMovement();
if (!M) { console.error('FAIL scene-year-lengths: data/nbody-secular-series.json is absent'); process.exit(1); }
const YL = M.yearLengths;
const model = P.createModel(undefined, { secularSeriesArtifact: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/nbody-secular-series.json'), 'utf8')) });
const E = model.eclipse;
const jdTT = (jd) => jd + (BRIDGE + DT.meanDeltaTSecondsAtAge((C.startmodelYear - jdToDecimalYear(jd)) / 1e6)) / 86400;
const engineYear = (jd) => 2000 + (jdTT(jd) - C.j2000JD) / 365.25;
const fin = (jd) => jd + BRIDGE / 86400;
const w180 = (d) => ((d + 540) % 360 + 360) % 360 - 180;
const JY = 365.25 * 86400;

// ── the exporter's event definitions ────────────────────────────────────────
const STEP = 0.5 / 24, RANGE = 96;
const decOf = (p) => 90 - p.dec * 180 / Math.PI;
function extremum(approxJD, f, isMax) {
  let best = approxJD, bv = isMax ? -Infinity : Infinity; const s = [];
  for (let k = -RANGE; k <= RANGE; k++) { const jd = approxJD + k * STEP; const v = f(SG.computeSunPositionFast(jd)); s.push([jd, v]); if (isMax ? v > bv : v < bv) { bv = v; best = jd; } }
  const i = s.findIndex((x) => x[0] === best);
  if (i > 0 && i < s.length - 1) { const d = s[i - 1][1] - 2 * s[i][1] + s[i + 1][1]; if (Math.abs(d) > 1e-12) best = s[i][0] + (STEP / 2) * (s[i - 1][1] - s[i + 1][1]) / d; }
  return best;
}
function equinox(approxJD, asc) {
  let p1 = decOf(SG.computeSunPositionFast(approxJD - RANGE * STEP));
  for (let k = -RANGE + 1; k <= RANGE; k++) {
    const jd2 = approxJD + k * STEP, p2 = decOf(SG.computeSunPositionFast(jd2));
    if (asc ? (p1 < 0 && p2 >= 0) : (p1 >= 0 && p2 < 0)) return jd2 - STEP + (-p1 / (p2 - p1)) * STEP;
    p1 = p2;
  }
  return null;
}
const FIND = {
  VE: (a) => equinox(a, true), AE: (a) => equinox(a, false),
  SS: (a) => extremum(a, decOf, true), WS: (a) => extremum(a, decOf, false),
  PERI: (a) => extremum(a, (p) => p.wobbleDistAU, false), APH: (a) => extremum(a, (p) => p.wobbleDistAU, true),
};
const CARD = ['VE', 'SS', 'AE', 'WS'], TARGET = { VE: 0, SS: 90, AE: 180, WS: 270 };
const chainYr = { VE: C.meanSolarYearDays, AE: C.meanSolarYearDays, SS: C.meanSolarYearDays, WS: C.meanSolarYearDays, PERI: C.meanAnomalisticYearDays, APH: C.meanAnomalisticYearDays };

/** Sample all six event types over ±HALF years around an epoch. */
function sampleEpoch(Y0) {
  const jd0 = DT.yearToJDDeepTime(Y0);
  const scan = []; for (let d = -190; d <= 190; d += 0.5) { const p = SG.computeSunPositionFast(jd0 + d); scan.push([jd0 + d, decOf(p), p.wobbleDistAU]); }
  const arg = (col, isMax) => scan.reduce((b, x) => ((isMax ? x[col] > b[col] : x[col] < b[col]) ? x : b))[0];
  const cross = (asc) => { let best = null; for (let i = 1; i < scan.length; i++) { const a = scan[i - 1][1], b = scan[i][1]; if (asc ? (a < 0 && b >= 0) : (a >= 0 && b < 0)) { if (best === null || Math.abs(scan[i][0] - jd0) < Math.abs(best - jd0)) best = scan[i][0]; } } return best; };
  const seed = { VE: cross(true), AE: cross(false), SS: arg(1, true), WS: arg(1, false), PERI: arg(2, false), APH: arg(2, true) };
  const rows = {};
  for (const t of Object.keys(FIND)) {
    const ev = (idx, jd) => { const fp = SG.computeSunPositionFast(jd); return { idx, jd, ra: (fp.ra * 180 / Math.PI + 360) % 360, dec: decOf(fp), wa: fp.worldAngle, wob: fp.wobbleDistAU }; };
    const c = FIND[t](seed[t]);
    if (c === null) throw new Error(`scene-year-lengths: seed failed for ${t} at ${Y0}`);
    const list = [ev(0, c)];
    let prev = c, step = chainYr[t];
    for (let i = 1; i <= HALF; i++) { const j = FIND[t](prev + step); step = j - prev; prev = j; list.push(ev(i, j)); }
    prev = c; step = chainYr[t];
    for (let i = 1; i <= HALF; i++) { const j = FIND[t](prev - step); step = prev - j; prev = j; list.push(ev(-i, j)); }
    list.sort((a, b) => a.idx - b.idx);
    rows[t] = list;
  }
  return rows;
}

const lsq = (x, y) => { const n = x.length; let sx = 0, sy = 0; for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; } const mx = sx / n, my = sy / n; let a = 0, b = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; } return a / b; };

const failures = [];
const lines = [];
const check = (label, value, tol, unit) => {
  const ok = Math.abs(value) <= tol;
  lines.push(`  ${ok ? '✓' : '✗'} ${label}: ${value >= 0 ? '+' : ''}${value.toPrecision(3)} ${unit} (tolerance ${tol})`);
  if (!ok) failures.push(`${label}: ${value} ${unit} exceeds ${tol}`);
};

for (const ep of EPOCHS) {
  const rows = sampleEpoch(ep);
  for (const t of Object.keys(rows)) {
    const r = rows[t]; let acc = 0;
    for (let i = 0; i < r.length; i++) {
      const e = r[i];
      e.tt = jdTT(e.jd) * 86400;
      e.y = engineYear(e.jd);
      const bare = E.sunLonDegAtJD(fin(e.jd)), done = E.sunLonCompletedDegAtJD(fin(e.jd));
      e.lam = done;
      e.compl = w180(bare - done);
      e.n = w180(E.sunLonDegAtJD(fin(e.jd) + 0.5) - E.sunLonDegAtJD(fin(e.jd) - 0.5));
      e.ttBare = e.tt - (e.compl / e.n) * 86400 * (jdTT(e.jd + 0.5) - jdTT(e.jd - 0.5));
      if (i > 0) acc += w180(e.wa - r[i - 1].wa);
      e.phiBare = (e.idx - r[0].idx) * 360 - acc + e.compl;
    }
  }
  const mid = (t) => rows[t][HALF];
  const yc = CARD.reduce((s, t) => s + mid(t).y, 0) / 4;
  const wOf = (i) => 1 - ((i - HALF) / (HALF + 0.5)) ** 2;
  const wMean = (fn, t) => { let s = 0, w = 0; rows[t].forEach((e, i) => { const k = wOf(i); s += k * fn(e.y); w += k; }); return s / w; };
  lines.push(`epoch ${ep} (engine year ${yc.toFixed(1)}, ±${HALF} yr, ${6 * (2 * HALF + 1)} events)`);
  // levels
  check('RA at the cardinals, max |dev|', Math.max(...CARD.flatMap((t) => rows[t].map((e) => Math.abs(w180(e.ra - TARGET[t])) * 3600))), TOL.raArcsec, '″');
  check('solstice declination − ε of date, max |dev|', Math.max(...rows.SS.map((e) => Math.abs(e.dec - M.epsDeg(e.y)) * 3600), ...rows.WS.map((e) => Math.abs(-e.dec - M.epsDeg(e.y)) * 3600)), TOL.epsArcsec, '″');
  check('e from the distance extremes − the series', (mid('APH').wob - mid('PERI').wob) / (mid('APH').wob + mid('PERI').wob) - M.e(yc), TOL.e, '');
  check('Sun at perihelion/aphelion − the apsidal line of date, max |dev|', Math.max(...rows.PERI.map((e) => Math.abs(w180(e.lam - (M.periOfDateDeg(e.y) + 180))) * 3600), ...rows.APH.map((e) => Math.abs(w180(e.lam - M.periOfDateDeg(e.y))) * 3600)), TOL.periArcsec, '″');
  let instResMax = 0;
  for (const t of CARD) for (const i of [0, HALF, 2 * HALF]) {
    const e = rows[t][i];
    const inst = model.cardinal.jdNearUT(e.jd, t);
    const appMinusGeo = w180(E.sunApparentLonDegAtJD(fin(inst)) - E.sunLonCompletedDegAtJD(fin(inst)));
    instResMax = Math.max(instResMax, Math.abs((inst - e.jd) * 86400 - (-appMinusGeo / e.n) * 86400));
  }
  check('published cardinal instant − scene crossing − the aberration/nutation shift, max |res|', instResMax, TOL.instantS, 's');
  // years
  const idx = rows.VE.map((e) => e.idx);
  const yr = {}; for (const t of [...CARD, 'PERI', 'APH']) yr[t] = lsq(idx, rows[t].map((e) => e.ttBare));
  const trop = CARD.reduce((s, t) => s + yr[t], 0) / 4;
  const tEv = idx.map((_, i) => CARD.reduce((s, t) => s + rows[t][i].tt, 0) / 4);
  const pbar = idx.map((_, i) => CARD.reduce((s, t) => s + rows[t][i].phiBare, 0) / 4);
  const sid = 360 / lsq(tEv, pbar);
  const anom = (yr.PERI + yr.APH) / 2;
  const sidLaw = wMean(YL.siderealYearSecondsAtYear, 'SS') + PLANT, tropLaw = wMean(YL.tropicalYearSecondsAtYear, 'SS'), anomLaw = wMean(YL.anomalisticYearSecondsAtYear, 'PERI');
  check('sidereal year, scene − law', sid - sidLaw, TOL.yearS, 's');
  check('mean tropical year, scene − law', trop - tropLaw, TOL.yearS, 's');
  check('anomalistic year, scene − law', anom - anomLaw, TOL.yearS, 's');
  check('axial precession from the scene pair − law', sid * trop / ((sid - trop) * JY) - wMean(YL.axialPrecessionYearsAtYear, 'SS'), TOL.axialYr, 'Julian yr');
  if (REPORT) lines.push(`  scene: sidereal ${(sid / 86400).toFixed(9)} d · tropical ${(trop / 86400).toFixed(9)} d · anomalistic ${(anom / 86400).toFixed(9)} d`);
}

console.log('SCENE-YEAR-LENGTHS GATE — the scene\'s measured years against the one-family laws');
console.log(lines.join('\n'));
if (PLANT) console.log('(planted: the compared sidereal law shifted by +0.1 s)');
if (failures.length) {
  console.error(`\nFAIL — ${failures.length} check(s) outside tolerance:`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`\nPASS — ${lines.filter((l) => l.startsWith('  ✓')).length} checks at ${EPOCHS.length} epochs.`);
