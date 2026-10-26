#!/usr/bin/env node
/**
 * THE PRECESSION OF DATE AGAINST ITS TWO THEORY REFEREES (plan 06 §9 item 10).
 *
 *   node tools/verify/equinox-vs-vondrak.js            reproduce + compare against the recorded artifact
 *   node tools/verify/equinox-vs-vondrak.js --write    (re)write data/equinox-vs-vondrak.json
 *
 * WHAT IS MEASURED. The spin integration's precession constant is the secular
 * (composed) law times two factors of date, both exactly 1 at J2000: the solar
 * torque at the eccentricity of date and the oblateness of date, J₂(t)/J₂₀,
 * from the GIA channel (earth/deep-orbital-history; climate/l1-orbital). This
 * generator banks what that movement reads against
 *
 *   1. THE EQUINOX, ±3000 yr — Vondrák, Capitaine & Wallace (2011), A&A 534,
 *      A22, the long-term precession (@essrt/reference vondrakFrameOfDate2011).
 *      Δequinox = the signed angle from Vondrák's equinox to the model's along
 *      the ecliptic of date, arcsec, + = east; the Sun's of-date longitude
 *      moves by −Δequinox. Beside it the same integration WITHOUT the two
 *      factors (the secular law alone) and with each one alone — the record of
 *      what each term carries.
 *   2. THE OBLIQUITY, the last million years — La2004 (Laskar et al. 2004,
 *      data/la2004-earth-51myr-back.asc), rms by window, the movement and the
 *      secular law alone. La2004 integrates the precession equations with the
 *      eccentricity-dependent solar torque and NO ice-age change of the
 *      dynamical ellipticity: it tests the eccentricity factor; the oblateness
 *      factor is the model's own statement beside it.
 *
 * THEORY AGAINST THEORY on both counts. Vondrák's series is IAU 2006 inside
 * ±1 kyr of J2000 and a fit to numerical integrations beyond (Laskar et al.
 * 1993, which carries no J₂ rate) — no observation resolves 20″ at −2500.
 *
 * GATES UNDER --write (the adoption's result, so a dropped term cannot ship
 * unseen): |Δequinox| ≤ 10″ over ±3000 yr (measured max 7.9 with p₀ = the
 * IAU 2006 p_A — plan 09; 6.5 on the retired year combs' derived beat, which
 * sat 8 ppm above p_A and absorbed that much of the model's growth into the
 * past against both referees; the secular law alone reads 28), ≤ 1.0″ inside
 * −500…+2500 (measured 0.62 on p_A; 0.3 before); the obliquity within 20″ rms
 * of La2004 over the last Myr (measured 15.0 on p_A, 13.7 before; the secular
 * law alone 80).
 *
 * Reproduction check: a plain run recomputes and compares (1e-6″).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');

const OUT = path.join(ROOT, 'data', 'equinox-vs-vondrak.json');
const WRITE = process.argv.includes('--write');
const INPUT_FILES = [
  'tools/verify/equinox-vs-vondrak.js',
  'packages/physics/src/earth/deep-orbital-history.cjs',
  'packages/physics/src/earth/frame-of-date.cjs',
  'packages/physics/src/earth/precession-composed.cjs',
  'packages/physics/src/climate/l1-orbital.cjs',
  'packages/physics/src/deltat/deep-time.cjs',
  'packages/reference/src/published-curves.cjs',
  'tools/lib/deep-orbital-history.js',
  'tools/lib/deep-time.js',
  'data/nbody-secular-series.json',
  'data/nbody-deep-secular-modes.json',
  'data/la2004-earth-51myr-back.asc',
  'public/input/astro-reference.json',   // (plan 11 step 6: model-parameters.json is deleted)
  'public/input/climate-formula-coefficients.json',
];

const req = createRequire(path.join(ROOT, 'package.json'));
const { vondrakFrameOfDate2011, iau2006FrameOfDate } = req('@essrt/reference/published-curves');
const { createDeepOrbitalHistory } = require(path.join(ROOT, 'packages/physics/src/earth/deep-orbital-history.cjs'));
const { computeEarthFrameOfDate } = require(path.join(ROOT, 'packages/physics/src/earth/frame-of-date.cjs'));
const { CHAIN_ARTIFACT } = require(path.join(ROOT, 'packages/physics/src/planets/chain-artifact.js'));
const DT = require(path.join(ROOT, 'tools/lib/deep-time.js'));
const C = require(path.join(ROOT, 'tools/lib/constants.js'));
const DOH = require(path.join(ROOT, 'tools/lib/deep-orbital-history.js'));

const R2AS = 648000 / Math.PI;
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const signedArcsec = (a, b, n) => Math.atan2(dot(n, cross(a, b)), dot(a, b)) * R2AS;
const round = (x, d) => Number(x.toFixed(d));

// ── the movement that ships, and the same factory with the factors removed ──
const movement = DOH.createOneSourceMovement();
if (!movement) { console.error('REFUSING: data/nbody-secular-series.json is absent.'); process.exit(1); }
const seriesArt = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-series.json'), 'utf8'));
const ART = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-deep-secular-modes.json'), 'utf8'));
const AE = CHAIN_ARTIFACT.j2000AnchorElements.earth, eb = seriesArt.bodies.earth;
const { DEEP_MODES_ARTIFACT } = require(path.join(ROOT, 'packages', 'physics', 'src', 'moon', 'deep-modes-artifact.cjs'));   // plan 21: the e/ϖ anchor is the series' own J2000 mean
const axial0 = DT.certifiedAxialPrecessionJ2000Years();   // plan 09: the IAU p_A anchor (was the retired year combs' beat at 2000)
const factory = (deps) => createDeepOrbitalHistory({
  zModes: ART.modes.earth.z, zetaModes: ART.modes.earth.zeta,
  zetaSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zetaQ, p: eb.zetaP },
  zSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zQ, p: eb.zP },
  anchorE: DEEP_MODES_ARTIFACT.anchorE, anchorPeriEclipticDeg: DEEP_MODES_ARTIFACT.anchorPeriEclipticDeg,
  anchorInclEclipticDeg: AE.inclEclipticDeg, anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
  axialPrecessionYearsJ2000: axial0, obliquityJ2000Deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
  axialPrecessionYearsAtYearFn: (yr) => DT.meanLunisolarTorquePeriodYearsAtAge((2000 - yr) / 1e6) ?? axial0,   // plan 12 §8: the TORQUE period (the integration's own ŝ·n̂ carries the cosine); plan 09 step 5c: the composed period directly
  ...deps,
});
const SOLAR = { solarTorqueShareJ2000: DT.PRECESSION_SOLAR_SHARE_J2000 };
const ELLIP = { dynamicalEllipticityRatioAtYearFn: DT.j2RatioAtYear };

// ── 1. the equinox, ±3000 yr ─────────────────────────────────────────────────
const fAll = factory({ ...SOLAR, ...ELLIP });   // the shipped wiring, for the factor read-outs
// PLAN 21 STEP 2 — the decomposition of the residual into its PLANETARY and LUNISOLAR
// parts. The planetary precession is not a factor: the integration generates it
// geometrically from the moving ecliptic n̂(t) (the N-body ζ series). The variant
// `planetaryFromReferee` runs the SAME integration (both factors on) with n̂(t)
// taken from Vondrák's own P_A/Q_A — the referee's ecliptic — so its residual
// against Vondrák is the lunisolar part alone and (shipped − variant) is what the
// model's ecliptic contributes. Vondrák's ζ = sin(i/2)·e^{iΩ} relative to the
// J2000 ecliptic: i = acos(n_z), Ω = atan2(n_x, −n_y) (the node of a plane with
// normal n̂); its J2000 value is 0 by definition of the J2000 ecliptic, so the
// variant's ζ anchors are 0 (the DOH join adds the anchor's ζ(0) to the series).
const refZeta = (() => {
  const t0Yr = -50000, stepYr = 100, n = (50000 - t0Yr) / stepYr + 1, q = new Array(n), p = new Array(n);
  for (let k = 0; k < n; k++) {
    const nv = vondrakFrameOfDate2011(2000 + t0Yr + k * stepYr).n;
    const inc = Math.acos(Math.max(-1, Math.min(1, nv[2]))), Om = Math.atan2(nv[0], -nv[1]), s2 = Math.sin(inc / 2);
    q[k] = s2 * Math.cos(Om); p[k] = s2 * Math.sin(Om);
  }
  return { t0Yr, stepYr, q, p };
})();
const era = {
  secular: factory({}).build(50000, -50000, 100), solarOnly: factory(SOLAR).build(50000, -50000, 100), ellipOnly: factory(ELLIP).build(50000, -50000, 100),
  planetaryFromReferee: factory({ ...SOLAR, ...ELLIP, zetaSeries: refZeta, anchorInclEclipticDeg: 0, anchorAscNodeEclipticDeg: 0 }).build(50000, -50000, 100),
};
const IAU2006_INNER_YR = 1000;   // the P03 polynomials' stated validity class about J2000
const equinoxRows = [];
for (let y = -3000; y <= 3000; y += 250) {
  const v = vondrakFrameOfDate2011(y), iau = iau2006FrameOfDate(y);
  const smp = movement.sampleAt(y), F = computeEarthFrameOfDate(smp);
  const dg = (s) => signedArcsec(v.g, computeEarthFrameOfDate(s).g, v.n);
  const onReferee = dg(era.planetaryFromReferee.at(y - 2000));
  const inner = Math.abs(y - 2000) <= IAU2006_INNER_YR;
  equinoxRows.push({
    year: y,
    equinoxArcsec: round(signedArcsec(v.g, F.g, v.n), 3),
    secularOnlyArcsec: round(dg(era.secular.at(y - 2000)), 3),
    solarTorqueOnlyArcsec: round(dg(era.solarOnly.at(y - 2000)), 3),
    ellipticityOnlyArcsec: round(dg(era.ellipOnly.at(y - 2000)), 3),
    // the decomposition: the shipped integration on the REFEREE's ecliptic (lunisolar part), and what the model's ecliptic adds
    lunisolarPartArcsec: round(onReferee, 3),
    planetaryPartArcsec: round(signedArcsec(v.g, F.g, v.n) - onReferee, 3),
    // the second referee inside its validity: model − IAU 2006 (P03), and the referees against each other
    iau2006Arcsec: inner ? round(signedArcsec(iau.g, F.g, iau.n), 3) : null,
    vondrakMinusIau2006Arcsec: inner ? round(signedArcsec(iau.g, v.g, iau.n), 3) : null,
    obliquityArcsec: round((smp.epsDeg - v.epsDeg) * 3600, 3),
    eclipticPoleArcsec: round(Math.hypot(F.n[0] - v.n[0], F.n[1] - v.n[1]) * R2AS, 3),
    solarTorqueFactorMinusOne: round(fAll.precessionOfDateFactorsAt(y - 2000).solarTorque - 1, 9),
    ellipticityFactorMinusOne: round(fAll.precessionOfDateFactorsAt(y - 2000).ellipticity - 1, 9),
  });
}
const maxAbs = (rows, k) => rows.reduce((m, r) => Math.max(m, Math.abs(r[k] ?? 0)), 0);
const inner = equinoxRows.filter((r) => r.year >= -500 && r.year <= 2500);
const rowAt = (y) => equinoxRows.find((r) => r.year === y);
const equinox = {
  unit: 'arcsec (model − Vondrák 2011, + = east; the Sun\'s of-date longitude moves by the negative)',
  maxAbsArcsec: round(maxAbs(equinoxRows, 'equinoxArcsec'), 3),
  maxAbsInnerArcsec: round(maxAbs(inner, 'equinoxArcsec'), 3),
  innerWindow: [-500, 2500],
  secularOnlyMaxAbsArcsec: round(maxAbs(equinoxRows, 'secularOnlyArcsec'), 3),
  obliquityMaxAbsArcsec: round(maxAbs(equinoxRows, 'obliquityArcsec'), 3),
  // plan 21 step 2 — the decomposition read at the span's past edge, and the second referee's window
  decomposition: {
    note: 'lunisolarPart = the shipped integration on the REFEREE\'s ecliptic (Vondrák P_A/Q_A) minus Vondrák; planetaryPart = shipped − that: what the model\'s N-body ecliptic contributes to the residual',
    atMinus3000: { total: rowAt(-3000).equinoxArcsec, lunisolarPart: rowAt(-3000).lunisolarPartArcsec, planetaryPart: rowAt(-3000).planetaryPartArcsec },
    atPlus3000: { total: rowAt(3000).equinoxArcsec, lunisolarPart: rowAt(3000).lunisolarPartArcsec, planetaryPart: rowAt(3000).planetaryPartArcsec },
    planetaryPartMaxAbsArcsec: round(maxAbs(equinoxRows, 'planetaryPartArcsec'), 3),
  },
  iau2006: {
    note: `model − IAU 2006 (P03, Capitaine et al. 2003; ERFA p06e) inside ±${IAU2006_INNER_YR} yr of J2000 — the polynomials' validity class — beside Vondrák − IAU 2006 (the referees against each other)`,
    windowYr: IAU2006_INNER_YR,
    modelMaxAbsArcsec: round(maxAbs(equinoxRows, 'iau2006Arcsec'), 3),
    refereesMaxAbsArcsec: round(maxAbs(equinoxRows, 'vondrakMinusIau2006Arcsec'), 3),
  },
  rows: equinoxRows,
};

// ── 2. the obliquity, the last million years, against La2004 ─────────────────
const la = fs.readFileSync(path.join(ROOT, 'data', 'la2004-earth-51myr-back.asc'), 'utf8').trim().split('\n').slice(0, 1001)
  .map((l) => l.trim().split(/\s+/).map((s) => Number(s.replace('D', 'E'))));
const SPAN = 1100000;
const deep = { model: fAll.build(SPAN, -SPAN, 1000), secular: factory({}).build(SPAN, -SPAN, 1000), solarOnly: factory(SOLAR).build(SPAN, -SPAN, 1000) };
const rmsVsLa = (S, a, b) => { let s = 0, n = 0; for (const r of la) { if (r[0] < a || r[0] > b) continue; const d = (S.at(r[0] * 1000).epsDeg - r[2] * 180 / Math.PI) * 3600; s += d * d; n++; } return Math.sqrt(s / n); };
const WINDOWS = [[-100, 0], [-250, -100], [-500, -250], [-1000, -500], [-1000, 0]];
const obliquity = {
  unit: 'arcsec rms (model − La2004), by window in kyr from J2000',
  windows: WINDOWS.map(([a, b]) => ({ fromKyr: a, toKyr: b, modelRmsArcsec: round(rmsVsLa(deep.model, a, b), 2), secularOnlyRmsArcsec: round(rmsVsLa(deep.secular, a, b), 2), solarTorqueOnlyRmsArcsec: round(rmsVsLa(deep.solarOnly, a, b), 2) })),
  equinoxShiftAtM1MyrDeg: round((((deep.model.at(-1000000).equinoxLonJ2000Deg - deep.secular.at(-1000000).equinoxLonJ2000Deg) + 540) % 360) - 180, 3),
};
const lastMyr = obliquity.windows[obliquity.windows.length - 1];
// the two factors over the last Myr (1-kyr samples): mean − 1 and the extremes
const fStats = (k) => { let s = 0, lo = Infinity, hi = -Infinity; for (const r of la) { const v = fAll.precessionOfDateFactorsAt(r[0] * 1000)[k] - 1; s += v; lo = Math.min(lo, v); hi = Math.max(hi, v); } return { meanMinusOne: round(s / la.length, 9), minMinusOne: round(lo, 9), maxMinusOne: round(hi, 9) }; };
const factors = { lastMyr: { solarTorque: fStats('solarTorque'), ellipticity: fStats('ellipticity') },
  j2RateJ2000PerYr: round((DT.j2RatioAtYear(2050) - DT.j2RatioAtYear(1950)) / 100 * C.earthJ2, 15), solarTorqueShareJ2000: round(DT.PRECESSION_SOLAR_SHARE_J2000, 6) };

const art = {
  _description: 'The precession of date against its two theory referees — GENERATED by tools/verify/equinox-vs-vondrak.js --write. equinox: the shipped movement\'s equinox of date minus Vondrák, Capitaine & Wallace (2011) over ±3000 yr (arcsec along the ecliptic of date, + = east), beside the same integration on the secular law alone and with each of-date factor alone. obliquity: the movement against La2004 over the last million years (rms by window), beside the secular law alone. factors: the two factors on the precession constant (solar torque at the eccentricity of date; J2(t)/J2_0 of the GIA channel) over the last Myr, and the channel\'s realized dJ2/dt at J2000 (the observed Cox & Chao rate by construction). THEORY AGAINST THEORY — Vondrák is IAU 2006 inside ±1 kyr and a fit to numerical integrations beyond; La2004 carries the eccentricity-dependent torque and no ice-age ellipticity. equinox.decomposition (plan 21 step 2): the residual split into its lunisolar part (the shipped integration run on Vondrák\'s own ecliptic P_A/Q_A) and its planetary part (what the model\'s N-body ecliptic contributes); equinox.iau2006: the model and Vondrák against the IAU 2006 (P03) polynomials inside their validity window.',
  reference: { equinox: 'Vondrák, Capitaine & Wallace (2011), A&A 534, A22 — @essrt/reference vondrakFrameOfDate2011; IAU 2006 (P03): Capitaine, Wallace & Chapront (2003), A&A 412, 567, coefficients as in ERFA p06e — @essrt/reference iau2006FrameOfDate', obliquity: 'Laskar et al. (2004) — data/la2004-earth-51myr-back.asc' },
  equinox, obliquity, factors,
  inputs: buildInputsBlock('node tools/verify/equinox-vs-vondrak.js --write', INPUT_FILES),
};

console.log('THE PRECESSION OF DATE — equinox vs Vondrák 2011 (″, + = east) · obliquity vs La2004 (″ rms)');
console.log('   year    model   secular only   +solar torque   +ellipticity   Δε      |Δn̂|   lunisolar  planetary   vs IAU2006  Vondrák−IAU');
const f2 = (/** @type {number|null} */ v, w = 8) => (v === null || v === undefined ? '—'.padStart(w) : v.toFixed(2).padStart(w));
for (const r of equinoxRows) console.log(`  ${String(r.year).padStart(5)} ${f2(r.equinoxArcsec)} ${f2(r.secularOnlyArcsec, 12)} ${f2(r.solarTorqueOnlyArcsec, 14)} ${f2(r.ellipticityOnlyArcsec, 14)} ${f2(r.obliquityArcsec)} ${f2(r.eclipticPoleArcsec, 7)} ${f2(r.lunisolarPartArcsec, 10)} ${f2(r.planetaryPartArcsec, 10)} ${f2(r.iau2006Arcsec, 11)} ${f2(r.vondrakMinusIau2006Arcsec, 12)}`);
console.log(`  max |Δequinox| ${equinox.maxAbsArcsec}″ (secular law alone ${equinox.secularOnlyMaxAbsArcsec}″); inside −500…+2500: ${equinox.maxAbsInnerArcsec}″`);
console.log(`  decomposition at −3000: total ${equinox.decomposition.atMinus3000.total}″ = lunisolar ${equinox.decomposition.atMinus3000.lunisolarPart}″ + planetary ${equinox.decomposition.atMinus3000.planetaryPart}″ (planetary max |·| ${equinox.decomposition.planetaryPartMaxAbsArcsec}″); vs IAU 2006 inside ±${IAU2006_INNER_YR} yr: model ${equinox.iau2006.modelMaxAbsArcsec}″, Vondrák − IAU 2006 ${equinox.iau2006.refereesMaxAbsArcsec}″`);
for (const w of obliquity.windows) console.log(`  ε vs La2004 ${String(w.fromKyr).padStart(6)} … ${String(w.toKyr).padStart(5)} kyr: model ${w.modelRmsArcsec.toFixed(1).padStart(6)}″ · secular only ${w.secularOnlyRmsArcsec.toFixed(1).padStart(6)}″ · +solar torque ${w.solarTorqueOnlyRmsArcsec.toFixed(1).padStart(6)}″`);
console.log(`  factors over the last Myr (mean − 1): solar torque ${factors.lastMyr.solarTorque.meanMinusOne.toExponential(3)}, ellipticity ${factors.lastMyr.ellipticity.meanMinusOne.toExponential(3)}; dJ2/dt(J2000) ${factors.j2RateJ2000PerYr.toExponential(3)} /yr`);

const gate = (ok, msg) => { if (!ok) { console.error('REFUSING: ' + msg); process.exit(1); } };
if (WRITE) {
  gate(equinox.maxAbsArcsec <= 10, `max |Δequinox| ${equinox.maxAbsArcsec}″ over ±3000 yr exceeds 10″ — a precession-of-date term is missing or changed`);
  gate(equinox.maxAbsInnerArcsec <= 1.0, `max |Δequinox| ${equinox.maxAbsInnerArcsec}″ inside −500…+2500 exceeds 1.0″`);
  gate(lastMyr.modelRmsArcsec <= 20, `obliquity vs La2004 over the last Myr ${lastMyr.modelRmsArcsec}″ rms exceeds 20″ — the eccentricity factor is missing or changed`);
  fs.writeFileSync(OUT, JSON.stringify(art, null, 1) + '\n');
  console.log('✓ wrote data/equinox-vs-vondrak.json');
} else {
  if (!fs.existsSync(OUT)) { console.error('FAIL — no recorded artifact. First run: node tools/verify/equinox-vs-vondrak.js --write'); process.exit(1); }
  const rec = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const bad = [];
  (function walk(a, b, p) {
    if (typeof a === 'number' && typeof b === 'number') { if (Math.abs(a - b) > 1e-6) bad.push(`${p}: recorded ${b}, computed ${a}`); return; }
    if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], p + '/' + k); return; }
    if (a !== b) bad.push(`${p}: recorded ${JSON.stringify(b)}, computed ${JSON.stringify(a)}`);
  })({ equinox: art.equinox, obliquity: art.obliquity, factors: art.factors }, { equinox: rec.equinox, obliquity: rec.obliquity, factors: rec.factors }, '');
  if (bad.length) { for (const l of bad.slice(0, 20)) console.error('  DIVERGED ' + l); console.error(`FAIL — ${bad.length} value(s) diverged from the recording. Investigate; if this is a conscious re-measurement, run with --write.`); process.exit(1); }
  console.log('PASS — the recorded artifact is reproduced.');
}
