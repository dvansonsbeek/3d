#!/usr/bin/env node
/**
 * ECLIPSE-AUDIT GENERATOR (§12h follow-up item 2 — partial adoption)
 * ==================================================================
 *
 * Owns the `lunar` and `solar` sections of `data/eclipse-audit-summary.json`:
 * Node port of the browser L-5b (lunar, 270-event button) and L-7 (solar,
 * 89-event button) SECTION 1 primary-source comparisons, verified to
 * reproduce the recorded campaign numbers before taking ownership.
 *
 * Method (script.js L-5b/L-7 Section 1 verbatim):
 *   1. Stephenson 2016 primary observations from the tracked
 *      `public/input/lunar-eclipses-stephenson-2016.json` (270 entries, 267
 *      with dt_observed_sec — the 3 S04 bounds-only rows are skipped) and
 *      `solar-eclipses-stephenson-2016.json` (89 entries).
 *   2. NASA ΔT(year) = per-calendar-year average of `delta_T_sec` over the
 *      Five Millennium Lunar Canon (`lunar-eclipses-nasa.json`, 12,064
 *      entries) — the Espenak/Meeus polynomial sampled at its own events.
 *   3. Framework ΔT = meanDeltaTSecondsAtAge((2000 − year)/1e6) from
 *      tools/lib/deep-time.js — the joint world (pure-tidal Simpson
 *      integral + 4-flag H-lattice stack + Core-mantle swing), the same
 *      chain the browser buttons call.
 *   4. Mean |residual| vs observation per model + events where the
 *      framework lands closer than NASA.
 *
 * Campaigns (b) audit-26 and (c) Babylon −135 (Phase 3b/3c) ride the
 * scene-umbra chain, ported here on top of the PROVEN Node twin
 * (tools/explore/umbra-scene-node-twin.js — 0.19–0.21 km against the
 * browser fixture's ecl.umbraScene probes; thresholds are 300/1000 km):
 * the browser's 26-preset loop verbatim — model UT from the shared
 * @essrt/physics eclipse finders (wired to the engine's truncated Meeus
 * series + framework ΔT), umbra gap at preset/model UT, the ±4h scan at
 * 30-s steps, and the five-way verdict classification
 * (script.js:30127-30190). The audit26/babylon135 sections are written
 * GENERATED only when the run reproduces the recorded verdict counts and
 * Babylon numbers exactly; on any divergence they are preserved verbatim
 * and the divergence is reported (exact-reproduction rule).
 *
 * Section (d) `centerlines` is the 20.3 accuracy instrument: the scene-umbra
 * twin evaluated at 15 fixed-UT NASA path-table CENTRAL-LINE points across
 * the five modern events (2024/2017/2026/1999/2023, two of them held-outs of
 * the 20.3c stack), reported in the SHADOW-PLANE metric — ground gap ×
 * sin(sun altitude), in km and in arcsec at the 1.86 km/″ Moon-distance
 * lever. Ground km are NOT comparable across events (1/sin alt amplifies
 * 6.9× at the low-sun 2026 crossing); shadow-plane arcsec are. Unlike the
 * audit-26 site scan, there is no ±4h search: fixed UT vs the table's own
 * central line — longitude-channel error cannot hide. Same
 * exact-reproduction convention as the other sections.
 *
 *   node tools/verify/eclipse-audit.js                        # compute + compare
 *   node tools/verify/eclipse-audit.js --write                # + write artifact
 *   node tools/verify/eclipse-audit.js --write --rebaseline   # conscious re-measurement
 *
 * --write REFUSES on any divergence from the recorded values (the guard
 * against accidental drift — a refit that legitimately moves these numbers
 * makes pipeline step 7i fail loudly instead of silently rewriting a
 * published value). --rebaseline is the conscious path: it accepts the
 * computed values as the new baseline. First used for the Babylon −135
 * correction: the recorded 1232 km / −1h45 was measured 2026-07 under the
 * pre-IAU-2006-refit anchors; after the twin was proven metre-faithful at
 * the Babylonian epochs (the ancient fixture probes + the UT→TT convention
 * fix in tools/lib/scene-graph.js), the current model reads 1257 km / −1h46
 * with the framework UT unchanged at 05:58.
 */

const fs = require('fs');
const path = require('path');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');
const DT = require('../lib/deep-time');
const C = require('../lib/constants.js');
const SG = require('../lib/scene-graph.js');
const { umbraFromSceneAtJdNode } = require('../explore/umbra-scene-node-twin.js');
const { createEclipseFinders } = require('@essrt/physics/eclipse/finders');

const OUT = path.join(ROOT, 'data', 'eclipse-audit-summary.json');
const WRITE = process.argv.includes('--write');
const REBASELINE = process.argv.includes('--rebaseline');

const INPUT_FILES = [
  'tools/verify/eclipse-audit.js',
  'public/input/lunar-eclipses-stephenson-2016.json',
  'public/input/solar-eclipses-stephenson-2016.json',
  'public/input/lunar-eclipses-nasa.json',
  'data/deltaT-4flag-fit.json',
  'data/core-mantle-resonator-stage1.json',
  'packages/physics/src/deltat/cycles.cjs',
  // the audit-26 / Babylon scene-umbra chain:
  'tools/explore/umbra-scene-node-twin.js',
  'tools/lib/scene-graph.js',
  'packages/physics/src/eclipse/finders.cjs',
  'packages/physics/src/moon/series.cjs',
  'packages/physics/src/moon/apparent.cjs',
  'public/input/solar-eclipse-centerlines-nasa.json',
  'public/input/astro-reference.json',
  'public/input/model-parameters.json',
  'public/input/fitted-coefficients.json',
];

function rd(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

// NASA ΔT(year) lookup: per-calendar-year average over the Lunar Canon
// (browser L-5b/L-7 verbatim, including the leading-integer date parse).
function buildNasaDtByYear(canon) {
  const acc = new Map();
  for (const e of canon.entries) {
    const m = /^(-?\d+)/.exec(e.date);
    if (!m) continue;
    const y = parseInt(m[1], 10);
    const a = acc.get(y) || { sum: 0, n: 0 };
    a.sum += e.delta_T_sec; a.n += 1;
    acc.set(y, a);
  }
  const out = new Map();
  for (const [y, a] of acc) out.set(y, a.sum / a.n);
  return out;
}

/** Browser Section-1 comparison for one Stephenson dataset. */
function compare(steph, nasaDtByYear) {
  const records = [];
  for (const obs of steph.entries) {
    if (obs.dt_observed_sec == null) continue;   // S04 bounds-only rows
    const nasa_dt = nasaDtByYear.get(obs.year);
    if (nasa_dt == null) continue;
    const model_dt = DT.meanDeltaTSecondsAtAge((2000 - obs.year) / 1e6);
    records.push({
      res_model: obs.dt_observed_sec - model_dt,
      res_nasa: obs.dt_observed_sec - nasa_dt,
    });
  }
  const meanAbsModel = records.reduce((s, r) => s + Math.abs(r.res_model), 0) / records.length;
  const meanAbsNasa = records.reduce((s, r) => s + Math.abs(r.res_nasa), 0) / records.length;
  const closer = records.filter((r) => Math.abs(r.res_model) < Math.abs(r.res_nasa)).length;
  return {
    frameworkMeanAbsResidualSeconds: Math.round(meanAbsModel),
    frameworkMeanAbsResidualSecondsFull: meanAbsModel,
    nasaMeanAbsResidualSeconds: Math.round(meanAbsNasa),
    nasaMeanAbsResidualSecondsFull: meanAbsNasa,
    eventsBeatingNasa: closer,
    eventsTotal: records.length,
    eventsRawTotal: steph.entries.length,
  };
}

const canon = rd('public/input/lunar-eclipses-nasa.json');
const nasaDtByYear = buildNasaDtByYear(canon);
const lunar = compare(rd('public/input/lunar-eclipses-stephenson-2016.json'), nasaDtByYear);
const solar = compare(rd('public/input/solar-eclipses-stephenson-2016.json'), nasaDtByYear);
delete solar.eventsRawTotal;   // the recorded solar section has no raw-total key (89 = 89)

console.log('  L-5b lunar: framework %d s | NASA %d s | beating NASA %d/%d (raw %d)',
  lunar.frameworkMeanAbsResidualSeconds, lunar.nasaMeanAbsResidualSeconds,
  lunar.eventsBeatingNasa, lunar.eventsTotal, lunar.eventsRawTotal);
console.log('  L-7  solar: framework %d s | NASA %d s | beating NASA %d/%d',
  solar.frameworkMeanAbsResidualSeconds, solar.nasaMeanAbsResidualSeconds,
  solar.eventsBeatingNasa, solar.eventsTotal);

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
if (!prev) throw new Error('data/eclipse-audit-summary.json missing — nothing to compare against');
let diverged = 0;
for (const [section, computed] of [['lunar', lunar], ['solar', solar]]) {
  for (const [k, was] of Object.entries(prev[section])) {
    if (typeof was !== 'number') continue;
    const now = computed[k];
    const same = now === was;
    if (!same) diverged++;
    console.log(`  ${same ? 'REPRODUCED' : 'DIVERGED  '} ${section}.${k}: recorded ${was}, computed ${now}`);
  }
}

// ─── Campaigns (b)+(c): the 26-preset alignment audit + Babylon −135 ────────
// Browser 'Audit all 26 solar eclipse presets' loop verbatim, on the proven
// umbra twin. Constants and data are exact copies of the button's.

const GAP_OK_KM = 300;
const GAP_REGIONAL_KM = 1000;
const SCAN_WIN_H = 4;
const SCAN_STEP_MIN = 0.5;
const PRESET_JD_OFF_MIN = 30;
const BABYLON_JD = 1671853.759762;

// { jd, label } from ECLIPSE_PRESETS (script.js:24253) — the audit uses only these two fields.
const ECLIPSE_PRESETS = [
  { jd: 2461265.241042, label: '2026 Aug 12 Total' },
  { jd: 2460409.262050, label: '2024 Apr 8 Total' },
  { jd: 2457987.267733, label: '2017 Aug 21 Total' },
  { jd: 2451401.960508, label: '1999 Aug 11 Total' },
  { jd: 2441863.985208, label: '1973 Jun 30 Total' },
  { jd: 2422108.047858, label: '1919 May 29 Total' },
  { jd: 2347572.902675, label: '1715 May 3 Total' },
  { jd: 2325394.925106, label: '1654 Aug 12 Total' },
  { jd: 2173756.000111, label: '1239 Jun 3 Total' },
  { jd: 2154000.058445, label: '1185 May 1 Annular' },
  { jd: 2135100.002430, label: '1133 Aug 2 Total' },
  { jd: 2087792.051441, label: '1004 Jan 24 Annular' },
  { jd: 2083982.839931, label: '993 Aug 20 Annular' },
  { jd: 2081030.093891, label: '985 Jul 20 Annular' },
  { jd: 2078785.134930, label: '979 May 28 Annular' },
  { jd: 2078431.006474, label: '978 Jun 8 Annular' },
  { jd: 2078253.853718, label: '977 Dec 13 Total' },
  { jd: 1747068.890110, label: '71 Mar 20 Total' },
  { jd: 1671853.759762, label: '-135 Apr 15 Total' },
  { jd: 1608421.835171, label: '-309 Aug 15 Total' },
  { jd: 1564215.113895, label: '-430 Aug 3 Annular' },
  { jd: 1518118.032841, label: '-556 May 19 Partial' },
  { jd: 1507900.104145, label: '-584 May 28 Total' },
  { jd: 1484836.848499, label: '-647 Apr 6 Partial' },
  { jd: 1462658.779682, label: '-708 Jul 17 Total' },
  { jd: 1442902.839207, label: '-762 Jun 15 Total' },
];

// Site coordinates (script.js audit button, keyed by preset JD).
const SITES = new Map([
  [2461265.241042, { name: 'Burgos–central path', lat: 42.34, lon: -3.70 }],
  [2460409.262050, { name: 'Dallas–central path', lat: 32.78, lon: -96.80 }],
  [2457987.267733, { name: 'Carbondale, IL', lat: 37.73, lon: -89.22 }],
  [2451401.960508, { name: 'Constanța, Romania', lat: 44.18, lon: 28.65 }],
  [2441863.985208, { name: 'Niger (Agadez)', lat: 16.97, lon: 7.99 }],
  [2422108.047858, { name: 'Príncipe (Eddington)', lat: 1.60, lon: 7.40 }],
  [2347572.902675, { name: 'London (Halley)', lat: 51.50, lon: -0.10 }],
  [2325394.925106, { name: 'London (European total)', lat: 51.50, lon: -0.10 }],
  [2173756.000111, { name: 'Tuscany (Cerchiari)', lat: 43.70, lon: 10.40 }],
  [2154000.058445, { name: 'Russia (Igor’s Tale)', lat: 50.00, lon: 38.00 }],
  [2135100.002430, { name: 'England (Henry I)', lat: 52.00, lon: -2.00 }],
  [2087792.051441, { name: 'Cairo (Ibn Yunus)', lat: 30.05, lon: 31.24 }],
  [2083982.839931, { name: 'Cairo (Ibn Yunus)', lat: 30.05, lon: 31.24 }],
  [2081030.093891, { name: 'Cairo (Said-Stephenson)', lat: 30.05, lon: 31.24 }],
  [2078785.134930, { name: 'Cairo (Said-Stephenson)', lat: 30.05, lon: 31.24 }],
  [2078431.006474, { name: 'Cairo (Said-Stephenson)', lat: 30.05, lon: 31.24 }],
  [2078253.853718, { name: 'Cairo (Ibn Yunus)', lat: 30.05, lon: 31.24 }],
  [1747068.890110, { name: 'Aegean (Plutarch)', lat: 38.00, lon: 25.00 }],
  [1671853.759762, { name: 'Babylon', lat: 32.50, lon: 44.40 }],
  [1608421.835171, { name: 'Babylon (Antigonus)', lat: 32.50, lon: 44.40 }],
  [1564215.113895, { name: 'Athens (Thucydides)', lat: 37.97, lon: 23.72 }],
  [1518118.032841, { name: 'Babylon (Nabonidus)', lat: 32.50, lon: 44.40 }],
  [1507900.104145, { name: 'Anatolia (Thales/Halys)', lat: 39.00, lon: 35.00 }],
  [1484836.848499, { name: 'Babylon (early diary)', lat: 32.50, lon: 44.40 }],
  [1462658.779682, { name: 'Lu State (Chinese)', lat: 35.60, lon: 117.00 }],
  [1442902.839207, { name: 'Nineveh (Bur-Sagale)', lat: 36.36, lon: 43.16 }],
]);

const AR_FULL = rd('public/input/astro-reference.json');
const BD = AR_FULL.bodyDiametersKm;

// gcKmFromLatLon (script.js:45208) — haversine on the codebase's Earth radius.
function gcKm(lat1, lon1, lat2, lon2) {
  const d2r = Math.PI / 180;
  const R_E_km = BD.earth / 2;
  const f1 = lat1 * d2r, f2 = lat2 * d2r;
  const df = (lat2 - lat1) * d2r;
  const dl = (lon2 - lon1) * d2r;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return 2 * R_E_km * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function jdToHMM(jd) {
  const frac = (jd + 0.5) - Math.floor(jd + 0.5);
  const totalMin = Math.round(frac * 24 * 60);
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function fmtDt(dtMin) {   // ASCII '-' where the browser prints U+2212
  const sign = dtMin >= 0 ? '+' : '-';
  const absDt = Math.abs(dtMin);
  const h = Math.floor(absDt / 60);
  const m = Math.round(absDt - h * 60);
  return `${sign}${h}h${String(m).padStart(2, '0')}`;
}

// The shared eclipse finders, wired like the browser's _eclipse() but with
// the engine twins: the truncated Meeus series + frameworkDeltaT.
const MS = SG._moonSeriesForProbe();
const finders = createEclipseFinders({
  moonLonDegAt: (jd) => MS.truncatedLonDeg(jd),
  moonBetaDegAt: (jd) => MS.truncatedBetaDeg(jd),
  moonDistanceKmAt: (jd) => MS.truncatedDistanceKm(jd),
  deltaTSecondsAt: (jd) => DT.frameworkDeltaT(jd),
  getSynodicMonthDays: () => C.moonSynodicMonth,
  getSunDistanceKm: () => C.currentAUDistance,
  constants: {
    rEarthMetres: (BD.earth / 2) * 1000,
    moonDiameterKm: BD.moon,
    sunDiameterKm: BD.sun,
    j2000JD: C.j2000JD,
    julianCenturyDays: C.julianCenturyDays,
  },
});

function runAudit26() {
  const stepDays = (SCAN_STEP_MIN / 60) / 24;
  const halfWin = SCAN_WIN_H / 24;
  const counts = { confirmed: 0, offPeak: 0, regional: 0, dtSignal: 0,
    dtAndOffPeak: 0, dtAndRegional: 0, dtAndGeo: 0, geographic: 0, noSite: 0 };
  let babylon = null;

  for (const preset of ECLIPSE_PRESETS) {
    let site = SITES.get(preset.jd);
    if (!site) {
      for (const [k, v] of SITES) {
        if (Math.abs(k - preset.jd) < 0.5) { site = v; break; }
      }
    }
    if (!site) { counts.noSite++; continue; }

    let nearestModelJD = preset.jd;
    let foundAny = false;
    try {
      const events = finders.findSolarEclipsesInRange(preset.jd - 1, preset.jd + 1);
      let minDiff = Infinity;
      for (const evt of events) {
        const diff = Math.abs(evt.jd - preset.jd);
        if (diff < minDiff) { minDiff = diff; nearestModelJD = evt.jd; foundAny = true; }
      }
    } catch { /* no events — preset.jd fallback */ }
    const deltaJD_min = (nearestModelJD - preset.jd) * 24 * 60;

    const um0 = umbraFromSceneAtJdNode(preset.jd);
    const gap0 = (um0 === null) ? null : gcKm(site.lat, site.lon, um0.lat, um0.lon);
    const umMdl = foundAny ? umbraFromSceneAtJdNode(nearestModelJD) : null;
    const gapMdl = (umMdl === null) ? null : gcKm(site.lat, site.lon, umMdl.lat, umMdl.lon);

    let bestGap = Infinity, bestDt = 0;
    for (let dt = -halfWin; dt <= halfWin + 1e-9; dt += stepDays) {
      const um = umbraFromSceneAtJdNode(preset.jd + dt);
      if (um === null) continue;
      const g = gcKm(site.lat, site.lon, um.lat, um.lon);
      if (g < bestGap) { bestGap = g; bestDt = dt; }
    }

    const timingOff = foundAny && Math.abs(deltaJD_min) > PRESET_JD_OFF_MIN;
    const geoAtPrsOk = (gap0 !== null && gap0 <= GAP_OK_KM);
    const geoAtMdlOk = (gapMdl !== null && gapMdl <= GAP_OK_KM);
    const geoBestOk = (bestGap <= GAP_OK_KM);
    const geoAtMdlReg = (gapMdl !== null && gapMdl <= GAP_REGIONAL_KM);
    const geoBestRegional = (bestGap <= GAP_REGIONAL_KM);

    let verdict;
    if (!timingOff && geoAtPrsOk) { verdict = 'confirmed'; counts.confirmed++; }
    else if (!timingOff && geoBestOk) { verdict = 'offPeak'; counts.offPeak++; }
    else if (!timingOff && geoBestRegional) { verdict = 'regional'; counts.regional++; }
    else if (timingOff && geoAtMdlOk) { verdict = 'dtSignal'; counts.dtSignal++; }
    else if (timingOff && geoBestOk) { verdict = 'dtAndOffPeak'; counts.dtAndOffPeak++; }
    else if (timingOff && (geoAtMdlReg || geoBestRegional)) { verdict = 'dtAndRegional'; counts.dtAndRegional++; }
    else if (timingOff) { verdict = 'dtAndGeo'; counts.dtAndGeo++; }
    else { verdict = 'geographic'; counts.geographic++; }

    console.log(`    ${preset.label.padEnd(22)} ${site.name.padEnd(26)} bestGap ${bestGap.toFixed(0).padStart(6)} km  bestDt ${fmtDt(bestDt * 24 * 60).padStart(6)}  ${verdict}`);

    if (preset.jd === BABYLON_JD) {
      babylon = {
        bestGapKm: Math.round(bestGap),
        bestDeltaUT: fmtDt(bestDt * 24 * 60),
        frameworkUT: foundAny ? jdToHMM(nearestModelJD) : null,
      };
    }
  }
  return { counts, babylon };
}

console.log('\n  audit-26 (±4h scan at 30-s steps, ~25k umbra evaluations — 1-3 min)...');
const audit = runAudit26();
const a = audit.counts;
console.log('  verdicts: confirmed %d | offPeak %d | regional %d | dtRegional %d | geographic %d (dtSignal %d, dtAndOffPeak %d, dtAndGeo %d, noSite %d)',
  a.confirmed, a.offPeak, a.regional, a.dtAndRegional, a.geographic,
  a.dtSignal, a.dtAndOffPeak, a.dtAndGeo, a.noSite);
console.log('  babylon135: bestGap %d km | bestΔUT %s | frameworkUT %s',
  audit.babylon.bestGapKm, audit.babylon.bestDeltaUT, audit.babylon.frameworkUT);

// Exact-reproduction comparison for the two hand-recorded sections. The
// recorded run had zero ΔT-signal-class verdicts and zero no-site rows, so
// those buckets must be zero for the five-key mapping to hold at all.
const audit26Cmp = [
  ['confirmed', prev.audit26.confirmed, a.confirmed],
  ['offPeak', prev.audit26.offPeak, a.offPeak],
  ['regional', prev.audit26.regional, a.regional],
  ['dtRegional', prev.audit26.dtRegional, a.dtAndRegional],
  ['geographic', prev.audit26.geographic, a.geographic],
  ['(zero dtSignal)', 0, a.dtSignal],
  ['(zero dtAndOffPeak)', 0, a.dtAndOffPeak],
  ['(zero dtAndGeo)', 0, a.dtAndGeo],
  ['(zero noSite)', 0, a.noSite],
];
const babylonCmp = [
  ['bestGapKm', prev.babylon135.bestGapKm, audit.babylon.bestGapKm],
  ['bestDeltaUT', prev.babylon135.bestDeltaUT, audit.babylon.bestDeltaUT],
  ['frameworkUT', prev.babylon135.frameworkUT, audit.babylon.frameworkUT],
];
let audit26Diverged = 0;
for (const [k, was, now] of audit26Cmp) {
  const same = now === was;
  if (!same) audit26Diverged++;
  console.log(`  ${same ? 'REPRODUCED' : 'DIVERGED  '} audit26 ${k}: recorded ${was}, computed ${now}`);
}
let babylonDiverged = 0;
for (const [k, was, now] of babylonCmp) {
  const same = now === was;
  if (!same) babylonDiverged++;
  console.log(`  ${same ? 'REPRODUCED' : 'DIVERGED  '} babylon135 ${k}: recorded ${was}, computed ${now}`);
}

const audit26Section = (audit26Diverged && !REBASELINE) ? prev.audit26 : {
  _description:
    '26-event solar-eclipse alignment audit (docs/103) — GENERATED by ' +
    'tools/verify/eclipse-audit.js --write (Node port of the browser audit ' +
    'button on the proven scene-umbra twin, verified to reproduce the ' +
    'recorded verdict counts exactly before taking ownership). Verdict ' +
    'counts per category under the joint world; the recorded run has zero ' +
    'deltaT-signal-class verdicts and zero no-site rows, asserted on every ' +
    'regeneration. The alignment/scan-reach/total rollups are DERIVED by ' +
    'the registry.',
  confirmed: a.confirmed,
  offPeak: a.offPeak,
  regional: a.regional,
  dtRegional: a.dtAndRegional,
  geographic: a.geographic,
};
const babylon135Section = (babylonDiverged && !REBASELINE) ? prev.babylon135 : {
  _description:
    '-135 April 15 Babylonian solar eclipse case study (docs/103) — a ' +
    'geographic-boundary event: framework UT within 16 min of the ' +
    'documented UT (NOT a deltaT-signal event; the residual is ' +
    'umbra-centerline geography). GENERATED by tools/verify/eclipse-audit.js ' +
    '--write — the audit-26 scan row for the Babylon preset. Adopted via ' +
    '--rebaseline after the scene-umbra Node twin was proven metre-faithful ' +
    'at the Babylonian epochs (ancient fixture probes + the UT->TT ' +
    'convention fix): the previously recorded 1232 km / -1h45 was measured ' +
    'under the pre-IAU-2006-refit anchors and is superseded by the current ' +
    'joint-world values.',
  bestGapKm: audit.babylon.bestGapKm,
  bestDeltaUT: audit.babylon.bestDeltaUT,
  frameworkUT: audit.babylon.frameworkUT,
  documentedUT: prev.babylon135.documentedUT,
};
if (audit26Diverged && !REBASELINE) {
  console.log('  → audit26 section will be PRESERVED verbatim (divergence above).');
}
if (babylonDiverged && REBASELINE) {
  console.log('  → babylon135 REBASELINED: computed values adopted as the new baseline.');
} else if (babylonDiverged) {
  // Known state at first port: bestGapKm 1255 vs recorded 1232 and bestDeltaUT
  // -1h46 vs -1h45 — the flat-minimum scan-grid sensitivity (the browser's own
  // case-study meter reads 1221 km vs the audit's 1232) compounded by twin
  // fidelity at -135 being unverified (the fixture umbraScene probes are
  // modern-only). Adoption needs an ancient-JD browser probe first — see the
  // §12h follow-up item in the plan.
  console.log('  → babylon135 section will be PRESERVED verbatim (divergence above).');
}

// ---------------------------------------------------------------------------
// Section (d): NASA path-table centerlines — the 20.3 accuracy instrument.
// Fixed-UT scene-umbra hits vs the tables' central line, in the shadow-plane
// metric. Sun altitude at the reference point is computed from the scene sun
// via the standard GMST expression — metric NORMALIZATION only (sin alt),
// verified within 0.4° of the tables' own altitude column; it is not part of
// the model chain. The 1.86 km/″ lever is the Moon-distance body-direction
// class (60 Earth radii; Earth-orientation terms act at 31 m/″ and cancel
// between the co-located Sun and Moon at eclipse).
// ---------------------------------------------------------------------------
const CL = rd('public/input/solar-eclipse-centerlines-nasa.json');
const D2R = Math.PI / 180;
// ground gap via the file-level gcKm (haversine on the codebase Earth radius)

function sunAltDegAt(jd, latDeg, lonDeg) {
  SG.computePlanetPosition('moon', jd);
  const g = SG._getGraphForProbe();
  const sun = g.sunNodes.pivot.getWorldPosition();
  const earth = g.earthNodes.rotAxis.getWorldPosition();
  const M = g.earthNodes.rotAxis.worldMatrix.e;
  const R = [[M[0], M[4], M[8]], [M[1], M[5], M[9]], [M[2], M[6], M[10]]];
  const sg = [sun[0] - earth[0], sun[1] - earth[1], sun[2] - earth[2]];
  const e = [
    R[0][0] * sg[0] + R[1][0] * sg[1] + R[2][0] * sg[2],
    R[0][1] * sg[0] + R[1][1] * sg[1] + R[2][1] * sg[2],
    R[0][2] * sg[0] + R[1][2] * sg[1] + R[2][2] * sg[2],
  ];
  const ra = Math.atan2(e[0], e[2]);
  const dec = Math.asin(e[1] / Math.hypot(...e));
  const T = (jd - 2451545.0) / 36525;
  const gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T) % 360;
  const H = ((gmst + lonDeg) * D2R) - ra;
  return Math.asin(Math.sin(latDeg * D2R) * Math.sin(dec) +
    Math.cos(latDeg * D2R) * Math.cos(dec) * Math.cos(H)) / D2R;
}

const r1 = (x) => Math.round(x * 10) / 10;
console.log('\n  centerlines (fixed-UT shadow-plane vs NASA central lines, 15 points)...');
const clEvents = CL.events.map((ev) => {
  const points = ev.points.map((p) => {
    const u = umbraFromSceneAtJdNode(p.jd);
    const groundKm = gcKm(p.latDeg, p.lonDeg, u.lat, u.lon);
    const altDeg = sunAltDegAt(p.jd, p.latDeg, p.lonDeg);
    const shadowKm = groundKm * Math.sin(altDeg * D2R);
    return {
      utc: p.utc,
      groundGapKm: r1(groundKm),
      sunAltDeg: r1(altDeg),
      shadowPlaneKm: r1(shadowKm),
      shadowPlaneArcsec: r1(shadowKm / 1.86),
    };
  });
  const meanArcsec = r1(points.reduce((s, p) => s + p.shadowPlaneArcsec, 0) / points.length);
  console.log(`    ${ev.label.padEnd(36)} mean ${String(meanArcsec).padStart(5)}″  (${points.map((p) => `${p.utc} ${p.shadowPlaneArcsec}″`).join(' | ')})`);
  return { label: ev.label, points, meanShadowPlaneArcsec: meanArcsec };
});
const clAll = clEvents.flatMap((ev) => ev.points.map((p) => p.shadowPlaneArcsec));
const clMeanArcsec = r1(clAll.reduce((s, a) => s + a, 0) / clAll.length);
const clMaxArcsec = r1(Math.max(...clAll));
console.log(`    overall: mean ${clMeanArcsec}″ | max ${clMaxArcsec}″`);

let clDiverged = 0;
if (prev.centerlines) {
  for (let i = 0; i < clEvents.length; i++) {
    const was = prev.centerlines.events && prev.centerlines.events[i];
    const now = clEvents[i];
    for (let j = 0; j < now.points.length; j++) {
      const w = was && was.points && was.points[j] ? was.points[j].shadowPlaneArcsec : undefined;
      if (w !== now.points[j].shadowPlaneArcsec) {
        clDiverged++;
        console.log(`  DIVERGED   centerlines ${now.label} ${now.points[j].utc}: recorded ${w}″, computed ${now.points[j].shadowPlaneArcsec}″`);
      }
    }
    const same = was && was.meanShadowPlaneArcsec === now.meanShadowPlaneArcsec;
    if (!same) clDiverged++;
    console.log(`  ${same ? 'REPRODUCED' : 'DIVERGED  '} centerlines mean [${now.label}]: recorded ${was && was.meanShadowPlaneArcsec}″, computed ${now.meanShadowPlaneArcsec}″`);
  }
  for (const [k, now] of [['meanShadowPlaneArcsec', clMeanArcsec], ['maxShadowPlaneArcsec', clMaxArcsec]]) {
    const was = prev.centerlines[k];
    const same = was === now;
    if (!same) clDiverged++;
    console.log(`  ${same ? 'REPRODUCED' : 'DIVERGED  '} centerlines.${k}: recorded ${was}, computed ${now}`);
  }
  if (clDiverged && !REBASELINE) {
    console.log('  → centerlines section will be PRESERVED verbatim (divergence above).');
  } else if (clDiverged) {
    console.log('  → centerlines REBASELINED: computed values adopted as the new baseline.');
  }
} else {
  console.log('  centerlines: NEW section — first --write adopts the computed baseline.');
}
const centerlinesSection = (clDiverged && !REBASELINE) ? prev.centerlines : {
  _description:
    'The 20.3 solar-eclipse accuracy instrument — GENERATED by ' +
    'tools/verify/eclipse-audit.js --write. Scene-umbra ground point at ' +
    'fixed UT vs the NASA GSFC path-table CENTRAL LINE ' +
    '(public/input/solar-eclipse-centerlines-nasa.json, cross-checked ' +
    'rows — see its _meta for the limit-column trap), in the SHADOW-PLANE ' +
    'metric: ground gap × sin(sun altitude), and arcsec at the 1.86 km/″ ' +
    'Moon-distance lever. Ground km are not comparable across events ' +
    '(1/sin alt); shadow-plane arcsec are. No time scan: fixed UT, so the ' +
    'longitude channel cannot hide. The five events include two held-outs ' +
    'of the 20.3c apparent-place stack (1999, 2023). Sun altitude here is ' +
    'metric normalization only (GMST expression, 0.4° vs the tables), not ' +
    'part of the model chain.',
  events: clEvents,
  meanShadowPlaneArcsec: clMeanArcsec,
  maxShadowPlaneArcsec: clMaxArcsec,
};

const artifact = {
  _description:
    'Historical eclipse audit summary. The `lunar` and `solar` sections are ' +
    'GENERATED by tools/verify/eclipse-audit.js --write (Node port of the ' +
    'browser L-5b/L-7 Section-1 primary-source comparisons, verified to ' +
    'reproduce the recorded campaign numbers before taking ownership): mean ' +
    '|residual| in seconds of framework vs NASA Espenak/Meeus deltaT against ' +
    'the Stephenson 2016 primary observations (lunar: Babylonian/Greek/' +
    'Chinese/Arab, -720 to 1280 CE; solar: 89 events), under the joint world ' +
    '(4-flag stack + Core-mantle swing). NASA deltaT is fit to essentially ' +
    'this dataset, so per-event NASA residuals index fit quality against a ' +
    'smoothed representation, not physical validity; authoritative writeup ' +
    'docs/102-gia-alpha-lunar-validation.md. Consumed by the model-values ' +
    'registry (eclipse-audit keys); the framework-vs-NASA gap keys are ' +
    'DERIVED from these so a re-run flows through automatically. The audit26 ' +
    'and babylon135 sections are generated by the same script (the 26-preset ' +
    'audit loop + the Babylon scan row on the proven scene-umbra Node twin) ' +
    'once exact-reproduction was met; on any divergence a run preserves them ' +
    'verbatim and reports. The inputs block is verified by the ' +
    'artifact-freshness gate on every npm run check.',
  lunar,
  solar,
  audit26: audit26Section,
  babylon135: babylon135Section,
  centerlines: centerlinesSection,
  inputs: buildInputsBlock('node tools/verify/eclipse-audit.js --write', INPUT_FILES),
};

if (WRITE) {
  if (diverged && !REBASELINE) {
    console.log('\nREFUSING to write: lunar/solar values diverge from the recorded snapshot.');
    console.log('Investigate; if this is a conscious re-measurement, pass --rebaseline.');
    process.exit(1);
  }
  fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + '\n');
  const preserved = [audit26Diverged && 'audit26', babylonDiverged && 'babylon135',
    (clDiverged && !REBASELINE) && 'centerlines'].filter(Boolean);
  console.log(`\n  ✓ wrote ${path.relative(ROOT, OUT)}${preserved.length ? ` (${preserved.join('/')} preserved verbatim)` : ' (all five sections generated)'}`);
} else {
  console.log('\n  dry run — pass --write to update the artifact');
}
