#!/usr/bin/env node
/**
 * GMST OF DATE — the sidereal angle is the mean Sun's (doc 111 §1.51). A GATE: three readings, FAILS on any.
 *
 *   node tools/verify/gmst-of-date.js
 *
 * THE ONE GMST (eclipse/besselian.cjs computeGmstDeg, read by the location tier, the API's observer tier,
 * the audits and the drawn Earth's spin) is Newcomb's definition on the model's own mean Sun:
 * GMST(jdUT) = T₀ + 360°·(jdUT − J2000) + [L(t) − L(t₀)], L the Sun's tropical mean longitude of date at the
 * engine year of the UT instant. It replaced the IAU 1982 polynomial (T₀ + rate·d + 1.39656″·T² on a
 * J2000-frozen rate — the one polynomial left in deep time, 270° mod 360 at −1 Myr). Three readings:
 *
 *  1. THE FRAME REFEREE. Guinot's non-rotating origin transported along the MODEL's moving equator (the
 *     one-source frames of date: the spin walk's pole, the N-body ecliptic) gives GMST − ERA; the IAU 2006
 *     polynomial (Capitaine 2003 eq. 42, ERA-based) is that quantity. Measured 0.03–0.12″ over −135…2026,
 *     0.3″ at −1000, 8.3″ at −3000 with nothing fitted: the model's second-order precession (ψ̈, χ̈, ε̇).
 *     Bound: ≤ 1″ at the audit-window rows, ≤ 15″ at −3000. (ζ_A + z_A is NOT this quantity beyond T²: its
 *     0.036″·T³ is the CIO locator; the origin drifts ~30° per precession cycle, the holonomy.)
 *  2. THE SHIPPED ANGLE against the polynomial it replaced (astro-reference's gmstMeanSidereal* — the
 *     referee inputs now, never read by the model). Exact at J2000 (T₀, the one anchor); within 1″ at the
 *     2024 and 1999 eclipses; the CONVENTION gap beyond: the model reads the mean Sun at the TT instant
 *     because the UT axis counts SOLAR DAYS of date (§1.36: the Sun on the meridian at UT noon at every
 *     age), the IAU's fictitious Sun takes the UT1 argument — they part by L̇·(ΔT − ΔT₀) plus 0.3″·T²
 *     (IAU UT1 is linear in the Earth rotation angle, mean solar time is not) and 0.5″/cy. Measured 25 s
 *     of time at −135, 2.4 min at −3000 — below the ΔT record's resolution, two orders inside the eclipse
 *     audit's 300-km verdict. Bound: ≤ 60 s over the audit window, ≤ 4 min at −3000, the predicted
 *     L̇·ΔT share within 20 % of the measured gap at −135 and −3000.
 *  3. THE RATE. dGMST/d(jdUT) ≡ 360°·LOD_real/siderealDaySeconds of date — the published sidereal day
 *     (LOD·Y/(Y+1), one rotation more than the Y solar days of the tropical year) by the same law — in the
 *     era to 1e-5° per day, at −400 Myr, −2 Gyr and the navigable edge to the UT Julian Day's grain over a
 *     10,000-day span (the J2000-frozen rate is 90°+ off there). The drawn spin, the umbra's longitude and
 *     the published day are one quantity.
 *
 * Fail-proven: ESSRT_GMST_PLANT=1 adds 2″ to the transported origin (row 1); =2 adds 300″ of time-equivalent
 * (4,500″ of angle) to the shipped GMST (row 2); =3 scales the measured rate by 1 + 1e-4 (row 3).
 */
'use strict';
const path = require('node:path');
const ROOT = path.join(__dirname, '..', '..');
const P = require('@essrt/physics');
const { createOneSourceMovement } = require('../lib/deep-orbital-history.js');
const { NAVIGABLE_PAST_YEARS } = require('@essrt/physics/time/navigable-domain');

const PLANT = process.env.ESSRT_GMST_PLANT ?? '';
const data = (f) => { try { return require(path.join(ROOT, 'data', f)); } catch { return undefined; } };
const secularSeriesArtifact = data('nbody-secular-series.json');
if (!secularSeriesArtifact) { console.error('gmst-of-date: data/nbody-secular-series.json is absent'); process.exit(1); }
const model = P.createModel(undefined, {
  secularSeriesArtifact,
  spinCheckpointsArtifact: data('spin-axis-checkpoints.json'),
  lunarCheckpointsArtifact: data('lunar-cumulative-checkpoints.json'),
  obliquityBeatTableArtifact: data('obliquity-beat-table.json') ?? null,
});
const K = require(path.join(ROOT, 'public/input/astro-reference.json')).physicalConstants;
const J2000 = 2451545.0;
const R2AS = 648000 / Math.PI;
const wrap180 = (x) => ((((x + 180) % 360) + 360) % 360) - 180;
const failures = [];
const check = (ok, line) => { console.log(`${ok ? '  ok  ' : 'FAIL  '}${line}`); if (!ok) failures.push(line); };

// ── 1. the frame referee: the non-rotating origin on the model's frames vs the IAU 2006 polynomial ──────────
{
  const M = createOneSourceMovement();
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = (v) => { const n = Math.hypot(v[0], v[1], v[2]); return [v[0] / n, v[1] / n, v[2] / n]; };
  const rodrigues = (v, k, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang), kv = cross(k, v), kd = dot(k, v);
    return [v[0] * c + kv[0] * s + k[0] * kd * (1 - c), v[1] * c + kv[1] * s + k[1] * kd * (1 - c), v[2] * c + kv[2] * s + k[2] * kd * (1 - c)];
  };
  /** the equinox ĝ and the pole ŝ of date, J2000-ecliptic components */
  const frameAt = (year) => { const f = P.computeEarthFrameOfDate(M.sampleAt(year)); return { g: f.g, z: f.s }; };
  // Capitaine 2003 eq. 42: GMST − ERA, arcsec, T in Julian centuries TT from J2000 (the secular polynomial)
  const gmst2006 = (T) => 0.014506 + 4612.156534 * T + 1.3915817 * T * T - 0.00000044 * T ** 3 - 0.000029956 * T ** 4;
  const rows = new Map([[2026, 1], [1500, 1], [1000, 1], [500, 1], [0, 1], [-135, 1], [-3000, 15]]);
  const walk = (yearEnd, stepYr) => {
    const out = new Map();
    let { g: sigma, z } = frameAt(2000);   // the origin starts at the J2000 equinox
    const sgn = yearEnd < 2000 ? -1 : 1, n = Math.round(Math.abs(yearEnd - 2000) / stepYr);
    for (let i = 1; i <= n; i++) {
      const y = 2000 + sgn * i * stepYr, F = frameAt(y);
      const ax = cross(z, F.z), sa = Math.hypot(ax[0], ax[1], ax[2]), ang = Math.atan2(sa, dot(z, F.z));
      if (sa > 0) sigma = rodrigues(sigma, [ax[0] / sa, ax[1] / sa, ax[2] / sa], ang);   // the minimal rotation taking the pole on: an axis IN the equator
      sigma = unit([sigma[0] - dot(sigma, F.z) * F.z[0], sigma[1] - dot(sigma, F.z) * F.z[1], sigma[2] - dot(sigma, F.z) * F.z[2]]);
      z = F.z;
      if (rows.has(y)) out.set(y, Math.atan2(dot(cross(F.g, sigma), F.z), dot(sigma, F.g)) * R2AS);   // σ̂ → ĝ along the equator, +RA
    }
    return out;
  };
  const past = walk(-3000, 0.5), fut = walk(2026, 0.5);
  console.log('1. the non-rotating origin on the model\'s frames vs the IAU 2006 GMST − ERA polynomial');
  for (const [y, tol] of rows) {
    const T = (y - 2000) / 100, ref = gmst2006(T) - gmst2006(0);
    let v = (y > 2000 ? fut : past).get(y) + (PLANT === '1' ? 2 : 0);
    v += 1296000 * Math.round((ref - v) / 1296000);
    check(Math.abs(v - ref) <= tol, `${String(y).padStart(6)}  model ${v.toFixed(3).padStart(13)}″  IAU 2006 ${ref.toFixed(3).padStart(13)}″  diff ${(v - ref).toFixed(3).padStart(8)}″  (≤ ${tol}″)`);
  }
}

// ── 2. the shipped GMST vs the retired IAU 1982 polynomial — the anchor, the era, the convention gap ──────
{
  const poly = (jd) => { const T = (jd - J2000) / 36525; return ((K.gmstMeanSiderealT0Deg + K.gmstMeanSiderealRateDegPerDay * (jd - J2000) + K.gmstMeanSiderealT2Deg * T * T) % 360 + 360) % 360; };
  const shipped = (jd) => model.eclipse.gmstDegAtJD(jd) + (PLANT === '2' ? 4500 / 3600 : 0);
  const dT0 = model.epoch.deltaTSecondsAtYear(2000);
  const LdotDegPerDay = 360 / (model.epoch.tropicalYearSecondsAtYear(2000) / 86400);
  const L = (y) => model.sun.meanLongitudeDegAt(y);
  /** the Sun table unwrapped on its tropical rate (the integer turn is unambiguous), degrees from L(2000) */
  const Lfrom2000 = (y) => { const v = L(y) - L(2000), guess = (y - 2000) * LdotDegPerDay * 365.25; return v + 360 * Math.round((guess - v) / 360); };
  console.log('\n2. the shipped GMST vs the IAU 1982 polynomial (astro-reference gmstMeanSidereal*, the referee inputs)');
  check(Math.abs(wrap180(shipped(J2000) - K.gmstMeanSiderealT0Deg)) < 1e-9, `J2000  shipped ${shipped(J2000).toFixed(9)}°  ≡ T₀ ${K.gmstMeanSiderealT0Deg}  (the one anchor)`);
  for (const [jd, label, tolSec] of [[2460409.262050, '2024 Apr 8', 1 / 15], [2451401.960508, '1999 Aug 11', 1 / 15], [2451545 - 36525 * 5, '1500', 60], [2451545 - 36525 * 10, '1000', 60], [2451545 - 36525 * 20, '0', 60], [1671853.759762, '−135 (Babylon)', 60], [2451545 - 36525 * 50, '−3000', 240]]) {
    const gapArcsec = wrap180(shipped(jd) - poly(jd)) * 3600, gapSec = gapArcsec / 15;
    const d = jd - J2000, T = d / 36525, yearTT = model.time.engineYearFromJDUT(jd), dT = model.epoch.deltaTSecondsAtYear(yearTT);
    // the two named shares: the mean Sun's motion during ΔT − ΔT₀ (the solar-day convention), and the model's own
    // tropical L at the UT argument against the polynomial's rate and T² (0.3″·T² + 0.5″/cy)
    const deltaTShare = LdotDegPerDay * (dT - dT0) / 86400 * 3600;
    const conventionShare = (Lfrom2000(2000 + d / 365.25) - (K.gmstMeanSiderealRateDegPerDay - 360) * d - K.gmstMeanSiderealT2Deg * T * T) * 3600;
    const line = `${label.padEnd(16)} gap ${gapSec.toFixed(2).padStart(8)} s of time  = L̇·(ΔT−ΔT₀) ${(deltaTShare / 15).toFixed(1).padStart(7)} s + [0.3″T² + 0.5″/cy] ${(conventionShare / 15).toFixed(1).padStart(6)} s  (≤ ${tolSec < 1 ? '1″' : `${tolSec} s`})`;
    check(Math.abs(gapSec) <= tolSec, line);
    const resid = gapArcsec - deltaTShare - conventionShare;
    check(Math.abs(resid) <= 5, `${label.padEnd(16)} the decomposition closes: residual ${resid.toFixed(2)}″ (≤ 5″)`);
  }
}

// ── 3. the rate ≡ the published sidereal day of date ─────────────────────────────────────────────────────
{
  console.log('\n3. dGMST/d(jdUT) ≡ 360°·LOD_real/siderealDaySeconds of date');
  const edgeYear = 2000 - NAVIGABLE_PAST_YEARS + 20000;
  /** the UT JD whose engine year (time.engineYearFromJDUT — the TT Julian year of the instant, the besselian's own axis)
   *  is the given one; NOT solved on `time.jdUTToPositionYear`, the position-COUNT year 0.055 % away (2.4 Myr at the edge, §1.38) */
  const jdUTOfYear = (year) => {
    let jd = J2000 + (year - 2000) * 365.25 - model.epoch.deltaTSecondsAtYear(year) / 86400;
    for (let i = 0; i < 60; i++) { const f = model.time.engineYearFromJDUT(jd) - year; if (Math.abs(f) < 1e-9) break; jd -= f * 365.25 * 86400 / model.epoch.lodSecondsAtYear(year); }
    return jd;
  };
  const rateExcess = (year) => 360 * (model.lengths.lodRealSeconds(year) / model.lengths.siderealDaySeconds(year) - 1);   // ° per solar day beyond one turn ≡ 360·LOD/T_trop
  for (const [year, h, tolDeg] of [[2000, 1, 1e-5], [-3000, 1, 1e-5], [-98000, 1, 1e-5], [-998000, 1, 1e-4], [-4e8 + 2000, 1e4, 0.1], [-2e9 + 2000, 1e4, 0.2], [edgeYear, 1e4, 0.5]]) {
    const jd = jdUTOfYear(year);
    const measured = wrap180(model.eclipse.gmstDegAtJD(jd + h) - model.eclipse.gmstDegAtJD(jd - h)) * (PLANT === '3' ? 1 + 1e-4 : 1);
    const predicted = wrap180(2 * h * rateExcess(year));
    const frozen = wrap180(2 * h * (K.gmstMeanSiderealRateDegPerDay - 360));
    const d = wrap180(measured - predicted);
    check(Math.abs(d) <= tolDeg, `${String(year).padStart(12)}  over ±${h} d: measured ${measured.toFixed(6).padStart(12)}°  predicted ${predicted.toFixed(6).padStart(12)}°  diff ${d.toExponential(2).padStart(10)}°  (≤ ${tolDeg}°; the J2000-frozen rate ${wrap180(frozen - predicted).toFixed(2)}° off)`);
  }
}

console.log('');
if (failures.length) { console.log(`FAIL — gmst-of-date: ${failures.length} row(s)`); process.exit(1); }
console.log('PASS — the GMST of date: the non-rotating origin on the model\'s frames ≡ IAU 2006 (nothing fitted), the shipped angle anchored on T₀ with its convention gap bounded, its rate ≡ the published sidereal day of date to the navigable edge.');
