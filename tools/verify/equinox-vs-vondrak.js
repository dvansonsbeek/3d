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
 * unseen): |Δequinox| ≤ 8″ over ±3000 yr (measured max 6.5; the secular law
 * alone reads 27), ≤ 0.5″ inside −500…+2500 (measured 0.3); the obliquity
 * within 20″ rms of La2004 over the last Myr (measured 13.7; the secular law
 * alone 79.5).
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
  'public/input/model-parameters.json',
  'public/input/astro-reference.json',
  'public/input/climate-formula-coefficients.json',
];

const req = createRequire(path.join(ROOT, 'package.json'));
const { vondrakFrameOfDate2011 } = req('@essrt/reference/published-curves');
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
const sid = DT.computeSiderealYearDaysDirect(2000), sol = DT.computeSolarYearDaysDirect(2000);
const axial0 = sid / (sid - sol), H0 = DT.meanHAtAge(0);
const factory = (deps) => createDeepOrbitalHistory({
  zModes: ART.modes.earth.z, zetaModes: ART.modes.earth.zeta,
  zetaSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zetaQ, p: eb.zetaP },
  zSeries: { t0Yr: seriesArt.t0Yr, stepYr: eb.stepYr, q: eb.zQ, p: eb.zP },
  anchorE: AE.e, anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
  anchorInclEclipticDeg: AE.inclEclipticDeg, anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
  axialPrecessionYearsJ2000: axial0, obliquityJ2000Deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
  axialPrecessionYearsAtYearFn: (yr) => axial0 * DT.meanHAtAge((2000 - yr) / 1e6) / H0,
  ...deps,
});
const SOLAR = { solarTorqueShareJ2000: DT.PRECESSION_SOLAR_SHARE_J2000 };
const ELLIP = { dynamicalEllipticityRatioAtYearFn: DT.j2RatioAtYear };

// ── 1. the equinox, ±3000 yr ─────────────────────────────────────────────────
const fAll = factory({ ...SOLAR, ...ELLIP });   // the shipped wiring, for the factor read-outs
const era = { secular: factory({}).build(50000, -50000, 100), solarOnly: factory(SOLAR).build(50000, -50000, 100), ellipOnly: factory(ELLIP).build(50000, -50000, 100) };
const equinoxRows = [];
for (let y = -3000; y <= 3000; y += 250) {
  const v = vondrakFrameOfDate2011(y);
  const smp = movement.sampleAt(y), F = computeEarthFrameOfDate(smp);
  const dg = (s) => signedArcsec(v.g, computeEarthFrameOfDate(s).g, v.n);
  equinoxRows.push({
    year: y,
    equinoxArcsec: round(signedArcsec(v.g, F.g, v.n), 3),
    secularOnlyArcsec: round(dg(era.secular.at(y - 2000)), 3),
    solarTorqueOnlyArcsec: round(dg(era.solarOnly.at(y - 2000)), 3),
    ellipticityOnlyArcsec: round(dg(era.ellipOnly.at(y - 2000)), 3),
    obliquityArcsec: round((smp.epsDeg - v.epsDeg) * 3600, 3),
    eclipticPoleArcsec: round(Math.hypot(F.n[0] - v.n[0], F.n[1] - v.n[1]) * R2AS, 3),
    solarTorqueFactorMinusOne: round(fAll.precessionOfDateFactorsAt(y - 2000).solarTorque - 1, 9),
    ellipticityFactorMinusOne: round(fAll.precessionOfDateFactorsAt(y - 2000).ellipticity - 1, 9),
  });
}
const maxAbs = (rows, k) => rows.reduce((m, r) => Math.max(m, Math.abs(r[k])), 0);
const inner = equinoxRows.filter((r) => r.year >= -500 && r.year <= 2500);
const equinox = {
  unit: 'arcsec (model − Vondrák 2011, + = east; the Sun\'s of-date longitude moves by the negative)',
  maxAbsArcsec: round(maxAbs(equinoxRows, 'equinoxArcsec'), 3),
  maxAbsInnerArcsec: round(maxAbs(inner, 'equinoxArcsec'), 3),
  innerWindow: [-500, 2500],
  secularOnlyMaxAbsArcsec: round(maxAbs(equinoxRows, 'secularOnlyArcsec'), 3),
  obliquityMaxAbsArcsec: round(maxAbs(equinoxRows, 'obliquityArcsec'), 3),
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
  _description: 'The precession of date against its two theory referees — GENERATED by tools/verify/equinox-vs-vondrak.js --write. equinox: the shipped movement\'s equinox of date minus Vondrák, Capitaine & Wallace (2011) over ±3000 yr (arcsec along the ecliptic of date, + = east), beside the same integration on the secular law alone and with each of-date factor alone. obliquity: the movement against La2004 over the last million years (rms by window), beside the secular law alone. factors: the two factors on the precession constant (solar torque at the eccentricity of date; J2(t)/J2_0 of the GIA channel) over the last Myr, and the channel\'s realized dJ2/dt at J2000 (the observed Cox & Chao rate by construction). THEORY AGAINST THEORY — Vondrák is IAU 2006 inside ±1 kyr and a fit to numerical integrations beyond; La2004 carries the eccentricity-dependent torque and no ice-age ellipticity.',
  reference: { equinox: 'Vondrák, Capitaine & Wallace (2011), A&A 534, A22 — @essrt/reference vondrakFrameOfDate2011', obliquity: 'Laskar et al. (2004) — data/la2004-earth-51myr-back.asc' },
  equinox, obliquity, factors,
  inputs: buildInputsBlock('node tools/verify/equinox-vs-vondrak.js --write', INPUT_FILES),
};

console.log('THE PRECESSION OF DATE — equinox vs Vondrák 2011 (″, + = east) · obliquity vs La2004 (″ rms)');
console.log('   year    model   secular only   +solar torque   +ellipticity   Δε      |Δn̂|');
for (const r of equinoxRows) console.log(`  ${String(r.year).padStart(5)} ${r.equinoxArcsec.toFixed(2).padStart(8)} ${r.secularOnlyArcsec.toFixed(2).padStart(12)} ${r.solarTorqueOnlyArcsec.toFixed(2).padStart(14)} ${r.ellipticityOnlyArcsec.toFixed(2).padStart(14)} ${r.obliquityArcsec.toFixed(2).padStart(8)} ${r.eclipticPoleArcsec.toFixed(2).padStart(7)}`);
console.log(`  max |Δequinox| ${equinox.maxAbsArcsec}″ (secular law alone ${equinox.secularOnlyMaxAbsArcsec}″); inside −500…+2500: ${equinox.maxAbsInnerArcsec}″`);
for (const w of obliquity.windows) console.log(`  ε vs La2004 ${String(w.fromKyr).padStart(6)} … ${String(w.toKyr).padStart(5)} kyr: model ${w.modelRmsArcsec.toFixed(1).padStart(6)}″ · secular only ${w.secularOnlyRmsArcsec.toFixed(1).padStart(6)}″ · +solar torque ${w.solarTorqueOnlyRmsArcsec.toFixed(1).padStart(6)}″`);
console.log(`  factors over the last Myr (mean − 1): solar torque ${factors.lastMyr.solarTorque.meanMinusOne.toExponential(3)}, ellipticity ${factors.lastMyr.ellipticity.meanMinusOne.toExponential(3)}; dJ2/dt(J2000) ${factors.j2RateJ2000PerYr.toExponential(3)} /yr`);

const gate = (ok, msg) => { if (!ok) { console.error('REFUSING: ' + msg); process.exit(1); } };
if (WRITE) {
  gate(equinox.maxAbsArcsec <= 8, `max |Δequinox| ${equinox.maxAbsArcsec}″ over ±3000 yr exceeds 8″ — a precession-of-date term is missing or changed`);
  gate(equinox.maxAbsInnerArcsec <= 0.5, `max |Δequinox| ${equinox.maxAbsInnerArcsec}″ inside −500…+2500 exceeds 0.5″`);
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
