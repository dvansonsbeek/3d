/**
 * Record / check the `tools/lib` regression fixture (plan §5b).
 *
 *   node tools/fixtures/record-tools-lib.mjs           check  (exit 1 on drift)
 *   node tools/fixtures/record-tools-lib.mjs --write   re-record
 *
 * These are REGRESSION values — what the engine does today, not what it should
 * do. They must never change unintentionally. Re-record only alongside a
 * deliberate behaviour change, and say so in the commit message.
 *
 * Values are compared EXACTLY. A fixture with a tolerance is a fixture that
 * stops noticing things; if a change is small enough not to matter, it is small
 * enough to re-record deliberately.
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, 'packages/fixtures/regression/tools-lib.json');
const require = createRequire(join(ROOT, 'package.json'));

const C = require(join(ROOT, 'tools/lib/constants.js'));
const DT = require(join(ROOT, 'tools/lib/deep-time.js'));

const AGES_MA = [-5, -1, 0, 1, 5];
const DT_STACK = [
  'bondCycleLodCorrection', 'hallstattCycleLodCorrection',
  'jose5CycleLodCorrection', 'jose4CycleLodCorrection',
  'dtCycleLodCorrectionSum', 'resonatorSwingLodCorrection',
];

function measure() {
  const v = {};

  // Anchors that pin the engine's identity.
  v['anchor.H'] = C.H;
  v['anchor.perihelionAlignmentYear'] = C.perihelionalignmentYear;
  v['anchor.correctionDays'] = C.correctionDays;
  v['anchor.meanSiderealYearSeconds'] = C.meanSiderealYearSeconds;

  // THREE distinct day lengths — never collapse these (CLAUDE.md).
  //   SI 86400 (definition) · LOD_mean (H/13 identity) · LOD_real (physical)
  v['lod.meanKinematicSeconds'] = DT.LOD_NOW_H13_S;
  v['lod.meanAtAge0'] = DT.meanLodSecondsAtAge(0);
  v['lod.realAtAge0'] = DT.meanLodSecondsAtAgeActual(0);

  // Deep-time behaviour away from the anchor — the anchor alone is a tautology.
  for (const t of AGES_MA) {
    v[`deeptime.H@${t}Ma`] = DT.meanHAtAge(t);
    v[`deeptime.lodSeconds@${t}Ma`] = DT.meanLodSecondsAtAge(t);
  }

  for (const fn of DT_STACK) {
    if (typeof DT[fn] === 'function') v[`dtstack.${fn}@0`] = DT[fn](0);
  }

  // ─── Cardinal points — the Phase 7 extraction gate ────────────────────────
  // The §10 + §10g family, ALL FOUR types, on the same deep-year grid the
  // browser fixture uses. These are the values the physics/cardinal package
  // extraction must keep BIT-IDENTICAL (plan §12a Phase 7). The raw
  // integrated-phase primitive (cycles at divisor 1) is pinned too, so a
  // phase-table error shows at the root, not only through its consumers.
  const OE = require(join(ROOT, 'tools/lib/orbital-engine.js'));
  const CP_YEARS = [-302635, -100000, -25000, -2000, 0, 1000, 2000, 3000, 6000, 32682];
  for (const y of CP_YEARS) {
    v[`phase.cycles@${y}`] = DT.cyclesBetweenYears(C.balancedYear, y, 1);
    for (const t of ['SS', 'WS', 'VE', 'AE']) {
      v[`cardinal.jd.${t}@${y}`] = OE.computeSolsticeJD(y, t);
      v[`cardinal.yearLen.${t}@${y}`] = OE.computeSolsticeYearLength(y, t);
      v[`cardinal.ra.${t}@${y}`] = OE.computeSolsticeRA(y, t);
    }
  }

  // ─── Moon — the Phase 8.2 extraction safety net ───────────────────────────
  // Pins CURRENT Node behaviour, divergences from the browser INCLUDED (the
  // known S1/S2/S3 shape differences — see the 8.2 survey). These values
  // move only with a deliberate, measured alignment commit.
  //
  // End-to-end through the scene graph (moveModel + series + RA/Dec override):
  const SG = require(join(ROOT, 'tools/lib/scene-graph.js'));
  const MOON_JDS = [
    1608421.835171,               // -309 Aug 15 (Agathocles)
    1671853.759762,               // -135 Apr 15 (Babylonian)
    2451545.0,                    // J2000
    2451716.575,                  // June solstice 2000 (model start)
    2460310.5,                    // 2024 Jan 1
    2451545.0 - 100000 * 365.25,  // −100 kyr (inside the moon-cycle tables)
    2451545.0 + 100000 * 365.25,  // +100 kyr
    2451545.0 + 275000 * 365.25,  // +275 kyr — past _MCT_MAX, Simpson path
  ];
  for (const jd of MOON_JDS) {
    const p = SG.computePlanetPosition('moon', jd);
    v[`moonPos.ra@${jd}`] = p.ra;
    v[`moonPos.dec@${jd}`] = p.dec;
    v[`moonPos.distAU@${jd}`] = p.distAU;
    v[`moonPos.meeusDistKm@${jd}`] = p.meeusDistKm;
  }

  // The deep-time month/precession chain. meanApsidalMeetsNodalAtAge and
  // meanLunarLevelingCycleAtAge deliberately absent: browser-only (S6).
  const MOON_TMAS = [-5, -1, -0.3, 0, 0.3, 1, 5];
  const MOON_ATAGE = [
    'meanMoonDistanceCorrectedAtAge', 'meanMoonSiderealMonthAtAge',
    'meanSynodicMonthAtAge', 'meanTropicalMonthAtAge',
    'meanAnomalisticMonthAtAge', 'meanNodalMonthAtAge',
    'meanLunarPerigeePrecessionAtAge', 'meanLunarNodePrecessionAtAge',
  ];
  for (const t of MOON_TMAS) {
    for (const fn of MOON_ATAGE) v[`moonAtAge.${fn}@${t}Ma`] = DT[fn](t);
  }

  // The e_E channel — the KNOWN S1 divergence point (tools: linear snapshot
  // phase; browser: integrated H/3). Pinned so the alignment commit shows
  // exactly these values moving, and nothing else.
  for (const tYr of [-102000, -27000, -2584, 0, 100, 30000, 102000]) {
    v[`moonFwEcc@${tYr}`] = DT._fwEarthEcc(tYr);
  }

  // Mode sections — the toggles are process-env consts in the Node engine, so
  // each alternate mode records in a child process.
  const childProbe = (env, jds, prefix) => {
    const script = `
      const SG = require(${JSON.stringify(join(ROOT, 'tools/lib/scene-graph.js'))});
      const out = {};
      for (const jd of ${JSON.stringify(jds)}) {
        const p = SG.computePlanetPosition('moon', jd);
        out['${prefix}.ra@' + jd] = p.ra;
        out['${prefix}.dec@' + jd] = p.dec;
        out['${prefix}.meeusDistKm@' + jd] = p.meeusDistKm;
      }
      process.stdout.write(JSON.stringify(out));
    `;
    return JSON.parse(execFileSync(process.execPath, ['-e', script], {
      env: { ...process.env, ...env },
    }).toString());
  };
  const IN_WINDOW_JDS = [1671853.759762, 2451545.0, 2460310.5];
  Object.assign(v, childProbe({ MOON_ARGS_PURE_MEEUS: '1' }, IN_WINDOW_JDS, 'moonPosMeeus'));
  Object.assign(v, childProbe({ SG_DEEP_TIME: '0' }, IN_WINDOW_JDS, 'moonPosSnap'));

  // ─── Planets — the Phase 8.3 extraction safety net ────────────────────────
  // Pins CURRENT Node behaviour, KNOWN divergences from the browser included
  // (S-P1 eccentricity period, S-P2 missing deep-time integrators, S-P3
  // snapshot obliquity — the 8.3 survey). These move only with deliberate,
  // measured alignment commits.
  const P7 = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  const P_JDS = [1671853.759762, 2451545.0, 2460310.5,
                 2451545.0 - 100000 * 365.25, 2451545.0 + 100000 * 365.25];
  for (const k of P7) {
    for (const jd of P_JDS) {
      const p = SG.computePlanetPosition(k, jd);
      v[`planetPos.${k}.ra@${jd}`] = p.ra;
      v[`planetPos.${k}.dec@${jd}`] = p.dec;
      v[`planetPos.${k}.distAU@${jd}`] = p.distAU;
    }
  }
  const P_YEARS = [-25000, -2000, 0, 1000, 2000, 2100, 6000];
  for (const k of P7) {
    for (const y of P_YEARS) {
      v[`planetObliq.${k}@${y}`] = OE.computePlanetObliquity(k, y);
      v[`planetAscNode.${k}@${y}`] = OE.computeAscendingNodeInvPlane(k, y);
    }
    const d = C.derived ? C.derived[k] : null;
    if (d) for (const [n, val] of Object.entries(d)) {
      if (typeof val === 'number') v[`planetDerived.${k}.${n}`] = val;
    }
    const p = C.planets[k];
    v[`planetLaw.${k}.inclAmp`] = p.invPlaneInclinationAmplitude;
    v[`planetLaw.${k}.inclMean`] = p.invPlaneInclinationMean;
    v[`planetLaw.${k}.eccAmp`] = p.orbitalEccentricityAmplitude;
    v[`planetLaw.${k}.eccBase`] = p.orbitalEccentricityBase;
    v[`planetLaw.${k}.wobblePeriod`] = p.wobblePeriod;
    v[`planetLaw.${k}.obliquityMean`] = p.obliquityMean;
  }

  // ─── ΔT / LOD stack — the Phase 8.4 extraction safety net ─────────────────
  // Pins CURRENT Node behaviour, KNOWN divergences from the browser included
  // (flag gates and taper wiring on the cycle corrections; frameworkDeltaT's
  // model-year convention vs the browser _eclDeltaT calendar-year convention;
  // pureH5DeltaTAtAge / meanLodSecondsAtAgeMeanAlpha / Espenak-Meeus are
  // browser-only — the 8.4 survey). These move only with deliberate, measured
  // alignment commits. The year-0 dtstack.* keys above predate this section
  // and stay (different key namespace, both load-bearing).
  const DT_YEARS_84 = [-12000, -9000, -6000, -3000, -1000, 0, 1000, 1900, 2000, 2100];
  const DT_CYCLES_84 = [
    'bondCycleDeltaTCorrection', 'hallstattCycleDeltaTCorrection',
    'jose5CycleDeltaTCorrection', 'jose4CycleDeltaTCorrection',
    'resonatorSwingDeltaTCorrection',
    'bondCycleLodCorrection', 'hallstattCycleLodCorrection',
    'jose5CycleLodCorrection', 'jose4CycleLodCorrection',
    'resonatorSwingLodCorrection', 'resonatorSwingLodRate',
    'dtCycleLodCorrectionSum',
  ];
  for (const y of DT_YEARS_84) {
    for (const fn of DT_CYCLES_84) v[`dtCycle.${fn}@${y}`] = DT[fn](y);
  }
  const DT_AGES_84 = [-400, -66, -1, -0.1, 0, 0.1, 1, 66, 400];
  for (const t of DT_AGES_84) {
    v[`dtAge.meanDeltaTSecondsAtAge@${t}Ma`] = DT.meanDeltaTSecondsAtAge(t);
    v[`dtAge.meanLodSecondsAtAge@${t}Ma`] = DT.meanLodSecondsAtAge(t);
    v[`dtAge.meanLodSecondsAtAgeActual@${t}Ma`] = DT.meanLodSecondsAtAgeActual(t);
    v[`dtAge.meanLodSecondsWithCorrectionsAtAge@${t}Ma`] = DT.meanLodSecondsWithCorrectionsAtAge(t);
    for (const [ch, val] of Object.entries(DT.dLodDtDecompositionAtAge(t))) {
      if (typeof val === 'number') v[`dtDecomp.${ch}@${t}Ma`] = val;
    }
  }
  const DT_JDS_84 = [1671853.759762, 2451545.0, 2460310.5,
                     2451545.0 - 100000 * 365.25, 2451545.0 + 100000 * 365.25];
  for (const jd of DT_JDS_84) v[`dtFw.frameworkDeltaT@${jd}`] = DT.frameworkDeltaT(jd);

  // ─── Sun position — the Phase 9 S-P8 safety net ───────────────────────────
  // Pins the sun-harmonics application end-to-end through BOTH scene-graph
  // code paths (moveModel and the fast animator carry verbatim copies of the
  // same 25-line evaluator — the S-P8 dedup target).
  for (const jd of [1355795.0, 2415020.5, 2451545.0, 2460409.262836, 2634166.0]) {
    const p = SG.computePlanetPosition('sun', jd);
    v[`sunPos.ra@${jd}`] = p.ra;
    v[`sunPos.dec@${jd}`] = p.dec;
  }

  return v;
}

const measured = measure();
const write = process.argv.includes('--write');

if (write) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({
    _comment: 'REGRESSION fixture — what tools/lib does today. Must never change unintentionally. Regenerate: node tools/fixtures/record-tools-lib.mjs --write',
    _source: 'tools/lib/{constants,deep-time}.js',
    values: measured,
  }, null, 2)}\n`);
  console.log(`recorded ${Object.keys(measured).length} values -> packages/fixtures/regression/tools-lib.json`);
  process.exit(0);
}

let expected;
try {
  expected = JSON.parse(readFileSync(OUT, 'utf8')).values;
} catch {
  console.error(`No fixture at ${OUT}. Record it first:\n  node tools/fixtures/record-tools-lib.mjs --write`);
  process.exit(1);
}

const drift = [];
const missing = [];
for (const [k, want] of Object.entries(expected)) {
  if (!(k in measured)) { missing.push(k); continue; }
  if (!Object.is(measured[k], want)) drift.push({ k, want, got: measured[k] });
}
const added = Object.keys(measured).filter((k) => !(k in expected));

console.log('REGRESSION — tools/lib');
console.log('='.repeat(74));
console.log(`  ${Object.keys(expected).length} fixture values checked`);

for (const { k, want, got } of drift) {
  const rel = want !== 0 ? (got - want) / want : NaN;
  console.log(`\n  DRIFT ${k}`);
  console.log(`    expected ${want}`);
  console.log(`    got      ${got}`);
  console.log(`    delta    ${got - want}  (${rel.toExponential(3)} relative)`);
}
for (const k of missing) console.log(`  GONE  ${k} — fixture exists, engine no longer produces it`);
for (const k of added) console.log(`  NEW   ${k} — engine produces it, fixture does not cover it (re-record)`);

if (drift.length || missing.length) {
  console.log(`\nFAIL — ${drift.length} drifted, ${missing.length} missing.`);
  console.log('If the change was intended, re-record with --write and say so in the commit.');
  process.exit(1);
}
console.log(added.length ? `\nPASS (with ${added.length} uncovered new value(s))` : '\nPASS — no drift.');
