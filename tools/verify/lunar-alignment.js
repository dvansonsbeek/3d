#!/usr/bin/env node
/**
 * lunar-alignment.js — lunar-eclipse ALIGNMENT gate/generator (Phase A of the
 * primary-source eclipse programme).
 *
 * Owns `data/lunar-alignment-summary.json`. Four sections:
 *
 *   canonGeometry — the model's lunar finder vs the NASA 5-Millennium Canon
 *       over 1600–2200, compared on the TT AXIS (model jd + model ΔT vs the
 *       canon's jd_TD). The axis choice is the point: TT isolates the LUNAR
 *       GEOMETRY from the ΔT model. The ΔT model is tested separately, on
 *       the UT axis, by eclipse-audit's L-5b section.
 *   visibility — the curated historical set's documented visibility regions
 *       vs the shipped api observer tier (geometric horizon at MAXIMUM
 *       eclipse; the documented maps cover any-phase visibility, so a
 *       deep-inside-region city is checked, not region edges).
 *   babylon746 — the −746 Feb 6 Babylonian partial eclipse (the oldest entry
 *       of NASA's historical-interest list): found, typed, umbral magnitude
 *       vs the canon 0.9199, visible from Babylon. The lunar sibling of
 *       eclipse-audit's babylon135 solar case.
 *   dtBands — the 267 Stephenson-2016 raw-timing reductions (dt_observed_sec)
 *       binned by source table: residuals against the framework ΔT curve and
 *       against the published Stephenson-2016 spline, side by side. NOTE the
 *       points are the STEPHENSON TEAM's reductions of the primary timings —
 *       a framework-side re-reduction (own geometry + moonrise) is the banked
 *       follow-up; it needs contact-time machinery.
 *
 * Convention (same as eclipse-audit): a plain run RECOMPUTES and compares
 * against the recorded summary, exit 1 on divergence — a refit cannot move
 * these numbers silently. `--write` refuses on divergence; `--write
 * --rebaseline` is the conscious re-measurement path.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { buildInputsBlock } = require('../lib/artifact-inputs');
const { stephensonDeltaT } = require('@essrt/physics/reference/published-curves');
const DT = require('../lib/deep-time.js');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'lunar-alignment-summary.json');
const WRITE = process.argv.includes('--write');
const REBASELINE = process.argv.includes('--rebaseline');

const rd = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

const INPUT_FILES = [
  'tools/verify/lunar-alignment.js',
  'public/input/lunar-eclipses-nasa.json',
  'public/input/lunar-eclipses-stephenson-2016.json',
  'public/input/lunar-eclipses-historical.json',
  'public/input/lunar-eclipses-documented.json',
  'public/input/stephenson-2016-deltaT-polynomial.json',
  'data/rspa20160404supp2/Table-S10.txt',
  'data/rspa20160404supp2/Table-S11.txt',
  'data/rspa20160404supp2/Table-S12.txt',
  'data/rspa20160404supp2/Table-S13.txt',
  'data/rspa20160404supp2/Table-S14.txt',
  'packages/physics/src/eclipse/finders.cjs',
  'packages/physics/src/moon/series.cjs',
  'packages/physics/src/moon/apparent.cjs',
  'packages/api/src/app.js',
  'public/input/model-parameters.json',
  'public/input/fitted-coefficients.json',
];

// Deep-inside-region observer cities for the visibility section. Chosen well
// away from region edges so the max-eclipse geometric check is meaningful.
// Keys must EQUAL a comma-separated token of the NASA visibility string —
// qualified tokens ("Western Europe", "Eastern Asia") deliberately do NOT
// match: the qualifier means the region only partially saw the eclipse, so
// its representative city proves nothing either way.
const REGION_CITIES = [
  { key: 'europe', city: 'Berlin', lat: 52.52, lon: 13.4 },
  { key: 'africa', city: 'Nairobi', lat: -1.29, lon: 36.82 },
  { key: 'asia', city: 'Delhi', lat: 28.61, lon: 77.21 },
  { key: 'australia', city: 'Sydney', lat: -33.87, lon: 151.21 },
  { key: 'americas', city: 'Kansas City', lat: 39.1, lon: -94.58 },
];
const BABYLON = { lat: 32.5364, lon: 44.4209 };

const NASA_TYPE = { N: 'Penumbral', P: 'Partial', T: 'Total' };

/**
 * Parse a Stephenson-2016 untimed-eclipse supplement table (raw text, as
 * published). Row quirks handled: negatives typeset with stray spaces
 * ("- 500", "-  60"), square brackets marking doubtful bounds (kept,
 * counted), "..." marking a one-sided bound (null). Column order differs
 * per table: S10 is DT-U then DT-L; S11–S13 are DT-L then DT-U; S14 is a
 * single DT estimate.
 * @param {string} rel @param {'UL'|'LU'|'single'} order
 * @returns {Array<{year:number, low:number|null, high:number|null, region:string, bracketed:boolean}>}
 */
function parseBoundsTable(rel, order) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const rows = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/-\s+(?=\d)/g, '-');
    const m = line.match(/^\s*1[0-4]\s+(-?\d+)\s+(\S+)(?:\s+(\S+))?\s+(\S+)\s*$/);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    const bracketed = /\[/.test(line);
    /** @param {string|undefined} s @returns {number|null} */
    const num = (s) => {
      if (s === undefined || s.includes('...')) return null;
      const v = parseInt(s.replace(/[[\]]/g, ''), 10);
      return Number.isFinite(v) ? v : null;
    };
    if (order === 'single') {
      rows.push({ year, low: num(m[2]), high: num(m[2]), region: m[4] ?? m[3] ?? '', bracketed });
    } else {
      const a = num(m[2]), b = num(m[3]);
      const [low, high] = order === 'UL' ? [b, a] : [a, b];
      rows.push({ year, low, high, region: m[4] ?? '', bracketed });
    }
  }
  return rows;
}

/** Flatten leaf primitives to dotted keys for exact reproduction compare. */
function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_description' || k === 'inputs') continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object') flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

async function main() {
  const { createModel } = await import('@essrt/physics');
  const { createApi } = await import(pathToFileURL(path.join(ROOT, 'packages/api/src/app.js')).href);
  const model = createModel();
  const { handle } = createApi();
  /** @param {Record<string,string>} query */
  const apiLunar = (query) => JSON.parse(handle({ method: 'GET', path: '/v1/eclipses/lunar', query }).body);

  const canon = rd('public/input/lunar-eclipses-nasa.json');
  const steph = rd('public/input/lunar-eclipses-stephenson-2016.json');
  const curated = rd('public/input/lunar-eclipses-historical.json');
  const stephPoly = rd('public/input/stephenson-2016-deltaT-polynomial.json');

  // ── Section 1: canonGeometry (TT axis, 1600–2200) ─────────────────────────
  const jdA = model.time.jdFromYear(1600), jdB = model.time.jdFromYear(2200);
  const events = model.eclipse.findLunarInRange(jdA, jdB);
  const canonRows = canon.entries.filter((e) => e.jd_TD >= jdA && e.jd_TD <= jdB);
  const usedCanon = new Set();
  let matched = 0, typeAgree = 0, sumAbsMin = 0, sumSqMin = 0, maxAbsMin = 0;
  for (const ev of events) {
    const evTT = ev.jd + model.eclipse.deltaTSecondsAtJD(ev.jd) / 86400;
    let best = null, bestD = 1;                       // 1-day matching window
    for (const c of canonRows) {
      const d = Math.abs(c.jd_TD - evTT);
      if (d < bestD && !usedCanon.has(c.catalog_num)) { best = c; bestD = d; }
    }
    if (!best) continue;
    usedCanon.add(best.catalog_num);
    matched += 1;
    const resMin = (evTT - best.jd_TD) * 1440;
    sumAbsMin += Math.abs(resMin); sumSqMin += resMin * resMin;
    if (Math.abs(resMin) > maxAbsMin) maxAbsMin = Math.abs(resMin);
    if (NASA_TYPE[best.type_nasa[0]] === ev.type) typeAgree += 1;
  }
  const canonGeometry = {
    windowYears: [1600, 2200],
    canonEvents: canonRows.length,
    modelEvents: events.length,
    matched,
    unmatchedModel: events.length - matched,
    unmatchedCanon: canonRows.length - matched,
    typeAgree,
    meanAbsResidualMinutes: Math.round((sumAbsMin / matched) * 1000) / 1000,
    meanAbsResidualMinutesFull: sumAbsMin / matched,
    rmsResidualMinutes: Math.round(Math.sqrt(sumSqMin / matched) * 1000) / 1000,
    rmsResidualMinutesFull: Math.sqrt(sumSqMin / matched),
    maxAbsResidualMinutes: Math.round(maxAbsMin * 1000) / 1000,
  };

  // ── Section 2: visibility (documented regions vs the api observer tier) ──
  const visEntries = [];
  let insideAgree = 0, outsideAgree = 0, outsideChecked = 0;
  for (const e of curated.entries) {
    const vis = String(e.visibility ?? '').toLowerCase();
    if (!vis) continue;
    const tokens = vis.split(',').map((t) => t.trim());
    // Inside: UNQUALIFIED region tokens only. The claim tested is "at least
    // one documented-region city sees the Moon at maximum eclipse" — robust
    // against NASA's any-phase region maps (a moonrise/moonset region may
    // legitimately miss the max), while a hemisphere-class error fails every
    // documented region at once. Outside: a region not mentioned AT ALL
    // (qualified or not) must never see the max.
    const insideCities = REGION_CITIES.filter((r) => tokens.includes(r.key));
    const outside = REGION_CITIES.find((r) => !vis.includes(r.key));
    if (insideCities.length === 0) continue;
    /** @param {{lat:number, lon:number}} obs */
    const at = (obs) => {
      const res = apiLunar({ startJd: String(e.jd - 3), stopJd: String(e.jd + 3), lat: String(obs.lat), lon: String(obs.lon) });
      const rows = res.data?.events ?? [];
      let bestRow = null, bestD = Infinity;
      for (const r of rows) { const d = Math.abs(r.jd - e.jd); if (d < bestD) { bestRow = r; bestD = d; } }
      return bestRow;
    };
    let bestCity = null, bestAlt = -Infinity;
    for (const c of insideCities) {
      const row = at(c);
      if (row && row.moonAltitudeDeg > bestAlt) { bestAlt = row.moonAltitudeDeg; bestCity = c.city; }
    }
    if (bestCity === null) continue;
    const outRow = outside ? at(outside) : null;
    const row = {
      label: e.label,
      bestInsideCity: bestCity,
      bestInsideAltitudeDeg: Math.round(bestAlt * 100) / 100,
      insideVisible: bestAlt > 0,
      outsideCity: outside ? outside.city : null,
      outsideVisible: outRow ? outRow.visible : null,
    };
    if (row.insideVisible) insideAgree += 1;
    if (outRow) { outsideChecked += 1; if (!outRow.visible) outsideAgree += 1; }
    visEntries.push(row);
  }
  const visibility = {
    entriesChecked: visEntries.length,
    insideAgree,
    outsideChecked,
    outsideAgree,
    entries: visEntries,
  };

  // ── Section 3: babylon746 (−746 Feb 6, canon catalog 3009) ────────────────
  const b746canon = canon.entries.find((e) => e.date === '-0746-02-06');
  const b746events = model.eclipse.findLunarInRange(b746canon.jd_TD - 5, b746canon.jd_TD + 5);
  const b746 = b746events.length ? b746events[0] : null;
  const b746TT = b746 ? b746.jd + model.eclipse.deltaTSecondsAtJD(b746.jd) / 86400 : null;
  const b746api = b746 ? apiLunar({ startJd: String(b746.jd - 2), stopJd: String(b746.jd + 2), lat: String(BABYLON.lat), lon: String(BABYLON.lon) }) : null;
  const b746row = b746api && b746api.data.events.length ? b746api.data.events[0] : null;
  const babylon746 = {
    found: b746 !== null,
    type: b746 ? b746.type : null,
    canonType: NASA_TYPE[b746canon.type_nasa[0]],
    magnitudeUmbral: b746 ? Math.round(b746.magnitudeUmbral * 10000) / 10000 : null,
    canonMagnitudeUmbral: b746canon.magnitude_umbral,
    ttResidualMinutes: b746TT !== null ? Math.round((b746TT - b746canon.jd_TD) * 1440 * 100) / 100 : null,
    visibleFromBabylon: b746row ? b746row.visible : null,
    babylonMoonAltitudeDeg: b746row ? Math.round(b746row.moonAltitudeDeg * 100) / 100 : null,
  };

  // ── Section 4: dtBands (Stephenson-2016 reductions vs the two curves) ────
  /** @type {Record<string, {n:number, sumF:number, sqF:number, sumS:number, sqS:number}>} */
  const bins = {};
  for (const obs of steph.entries) {
    if (obs.dt_observed_sec == null) continue;      // S04 bounds-only rows
    const fw = DT.meanDeltaTSecondsAtAge((2000 - obs.year) / 1e6);
    const sp = stephensonDeltaT(obs.year, stephPoly);
    const rF = obs.dt_observed_sec - fw, rS = obs.dt_observed_sec - sp;
    for (const key of [obs.source_table, 'overall']) {
      const b = bins[key] ?? (bins[key] = { n: 0, sumF: 0, sqF: 0, sumS: 0, sqS: 0 });
      b.n += 1; b.sumF += Math.abs(rF); b.sqF += rF * rF; b.sumS += Math.abs(rS); b.sqS += rS * rS;
    }
  }
  /** @type {Record<string, Record<string, number>>} */
  const dtBands = {};
  for (const [key, b] of Object.entries(bins).sort(([a], [c]) => a.localeCompare(c))) {
    dtBands[key] = {
      n: b.n,
      frameworkMeanAbsSeconds: Math.round(b.sumF / b.n),
      frameworkRmsSeconds: Math.round(Math.sqrt(b.sqF / b.n)),
      stephensonSplineMeanAbsSeconds: Math.round(b.sumS / b.n),
      stephensonSplineRmsSeconds: Math.round(Math.sqrt(b.sqS / b.n)),
    };
  }

  // ── Section 5: dtBounds (the UNTIMED tablets — S10–S14, never used before) ─
  // Each untimed record (a totality/partial/rise-set statement at a site)
  // yields a published ΔT INTERVAL rather than a value — the least
  // curve-dependent constraint class in the corpus. The framework's
  // eclipse-independent ΔT is tested for containment per event.
  const BOUNDS_TABLES = /** @type {const} */ ([
    ['S10', 'data/rspa20160404supp2/Table-S10.txt', 'UL', 'untimed total/annular solar'],
    ['S11', 'data/rspa20160404supp2/Table-S11.txt', 'LU', 'untimed partial solar'],
    ['S12', 'data/rspa20160404supp2/Table-S12.txt', 'LU', 'solar rose/set eclipsed'],
    ['S13', 'data/rspa20160404supp2/Table-S13.txt', 'LU', 'lunar rose/set eclipsed'],
  ]);
  /** @type {Record<string, any>} */
  const dtBounds = {};
  for (const [key, rel, order, label] of BOUNDS_TABLES) {
    const rows = parseBoundsTable(rel, /** @type {'UL'|'LU'} */ (order));
    let fwIn = 0, spIn = 0, oneSided = 0, bracketed = 0;
    for (const r of rows) {
      const fw = DT.meanDeltaTSecondsAtAge((2000 - r.year) / 1e6);
      const sp = stephensonDeltaT(r.year, stephPoly);
      const inside = (/** @type {number} */ v) => (r.low === null || v >= r.low) && (r.high === null || v <= r.high);
      if (r.low === null || r.high === null) oneSided += 1;
      if (r.bracketed) bracketed += 1;
      if (inside(fw)) fwIn += 1;
      if (inside(sp)) spIn += 1;
    }
    dtBounds[key] = { label, n: rows.length, oneSided, bracketed, frameworkInside: fwIn, stephensonSplineInside: spIn };
  }
  // S14: single degree-of-obscuration ΔT estimates — residual stats like dtBands.
  {
    const rows = parseBoundsTable('data/rspa20160404supp2/Table-S14.txt', 'single');
    let sumF = 0, sqF = 0, sumS = 0, sqS = 0;
    for (const r of rows) {
      const fw = DT.meanDeltaTSecondsAtAge((2000 - r.year) / 1e6);
      const sp = stephensonDeltaT(r.year, stephPoly);
      const rF = /** @type {number} */ (r.low) - fw, rS = /** @type {number} */ (r.low) - sp;
      sumF += Math.abs(rF); sqF += rF * rF; sumS += Math.abs(rS); sqS += rS * rS;
    }
    dtBounds.S14 = {
      label: 'lunar obscuration estimates', n: rows.length,
      frameworkMeanAbsSeconds: Math.round(sumF / rows.length),
      frameworkRmsSeconds: Math.round(Math.sqrt(sqF / rows.length)),
      stephensonSplineMeanAbsSeconds: Math.round(sumS / rows.length),
      stephensonSplineRmsSeconds: Math.round(Math.sqrt(sqS / rows.length)),
    };
  }
  // Headline row: the -135 Babylon totality bounds vs the framework curve.
  {
    const s10 = parseBoundsTable('data/rspa20160404supp2/Table-S10.txt', 'UL');
    const b = s10.find((r) => r.year === -135 && /babylon/i.test(r.region));
    const fw = DT.meanDeltaTSecondsAtAge((2000 - (-135)) / 1e6);
    dtBounds.babylon135 = b ? {
      boundsLowSeconds: b.low, boundsHighSeconds: b.high,
      frameworkSeconds: Math.round(fw),
      frameworkInside: (b.low === null || fw >= b.low) && (b.high === null || fw <= b.high),
    } : null;
  }

  // ── Section 6: dtBandsByCentury (the doc-102 Babylonian convergence, pinned)
  // Cuneiform-tablet centuries -800..-300: per-century mean observed ΔT vs
  // the framework curve, across the Babylonian timed lunar tables S01/S02/S04.
  /** @type {Record<string, {n:number, sumObs:number, sumFw:number}>} */
  const centBins = {};
  for (const obs of steph.entries) {
    if (obs.dt_observed_sec == null) continue;
    if (!/^S0[124]$/.test(obs.source_table)) continue;
    if (obs.year < -800 || obs.year > -301) continue;
    const cent = String(Math.floor(obs.year / 100) * 100);
    const b = centBins[cent] ?? (centBins[cent] = { n: 0, sumObs: 0, sumFw: 0 });
    b.n += 1; b.sumObs += obs.dt_observed_sec; b.sumFw += DT.meanDeltaTSecondsAtAge((2000 - obs.year) / 1e6);
  }
  /** @type {Record<string, Record<string, number>>} */
  const dtBandsByCentury = {};
  for (const [cent, b] of Object.entries(centBins).sort(([a], [c]) => Number(a) - Number(c))) {
    const obsHr = b.sumObs / b.n / 3600, fwHr = b.sumFw / b.n / 3600;
    dtBandsByCentury[cent] = {
      n: b.n,
      meanObservedHours: Math.round(obsHr * 100) / 100,
      meanFrameworkHours: Math.round(fwHr * 100) / 100,
      residualHours: Math.round((fwHr - obsHr) * 100) / 100,
    };
  }

  // ── Section 7: theoryDrift (framework vs ELP-class lunar theory, TT axis) ─
  // Signed mean TT residual (model opposition TT − canon greatest TT) per era
  // bin. The modern bins are per-event definitional scatter with near-zero
  // mean; the smooth secular drift at BCE measures the difference between the
  // framework's chain-integrated month evolution and the constant-ṅ
  // convention baked into ELP-class theories (canon AND the Stephenson
  // reductions). That drift is exactly the shift a framework-side
  // re-reduction applies to each tablet's implied ΔT — so
  // `predictedReducedResidualMinutes` is the PRE-REGISTERED expectation for
  // the contact-time re-reduction campaign: per-century residuals after
  // re-reduction ≈ gated dtBandsByCentury residual − drift at that era.
  const DRIFT_BINS = [-750, -650, -550, -450, -350, -250, -100, 100, 500, 1000, 1500, 1800, 2000];
  const DRIFT_HALF_YEARS = 40;
  /** @type {Record<string, {n:number, signedMeanMinutes:number}>} */
  const driftBins = {};
  for (const center of DRIFT_BINS) {
    const a = model.time.jdFromYear(center - DRIFT_HALF_YEARS);
    const bJd = model.time.jdFromYear(center + DRIFT_HALF_YEARS);
    const evs = model.eclipse.findLunarInRange(a, bJd);
    const inWin = canon.entries.filter((c) => c.jd_TD >= a - 1 && c.jd_TD <= bJd + 1);
    let n = 0, sum = 0;
    for (const ev of evs) {
      const evTT = ev.jd + model.eclipse.deltaTSecondsAtJD(ev.jd) / 86400;
      let best = null, bestD = 1;
      for (const c of inWin) { const d = Math.abs(c.jd_TD - evTT); if (d < bestD) { best = c; bestD = d; } }
      if (!best) continue;
      n += 1; sum += (evTT - best.jd_TD) * 1440;
    }
    driftBins[String(center)] = { n, signedMeanMinutes: Math.round((sum / n) * 100) / 100 };
  }
  const driftBaseline = ['1500', '1800', '2000'].reduce((s, k) => s + driftBins[k].signedMeanMinutes, 0) / 3;
  /** @type {Record<string, number>} */
  const driftMinutes = {};
  for (const [k, v] of Object.entries(driftBins)) driftMinutes[k] = Math.round((v.signedMeanMinutes - driftBaseline) * 100) / 100;
  // Effective Δṅ from the deepest bin: Δλ″ = |drift|·60 s · 0.5079 ″/s
  // (mean elongation rate); Δṅ = 2·Δλ / T² with T in centuries.
  const deepDrift = driftMinutes['-750'];
  const deepT = (2000 - (-750)) / 100;
  const effectiveDeltaNdot = Math.round((2 * Math.abs(deepDrift) * 60 * 0.5079 / (deepT * deepT)) * 100) / 100;
  // Pre-registered re-reduction prediction per Babylonian century (century
  // bin → nearest era bin center).
  const CENTURY_TO_BIN = { '-800': '-750', '-700': '-650', '-600': '-550', '-500': '-450', '-400': '-350' };
  /** @type {Record<string, number>} */
  const predictedReducedResidualMinutes = {};
  for (const [cent, bin] of Object.entries(CENTURY_TO_BIN)) {
    const oldResMin = dtBandsByCentury[cent].residualHours * 60;
    predictedReducedResidualMinutes[cent] = Math.round((oldResMin - driftMinutes[bin]) * 10) / 10;
  }
  const theoryDrift = {
    binHalfWidthYears: DRIFT_HALF_YEARS,
    modernBaselineMinutes: Math.round(driftBaseline * 100) / 100,
    bins: driftBins,
    driftVsModernMinutes: driftMinutes,
    effectiveDeltaNdotArcsecPerCy2: effectiveDeltaNdot,
    predictedReducedResidualMinutes,
  };

  // ── Section 8: Phase C — the differential contact-time re-reduction ──────
  // The pre-registered falsification test (plan §12i item 1). Per Babylonian
  // timed observation (S01/S02/S04, −800..−301): identify the canon eclipse
  // (year ± the Babylonian calendar straddle; night at Babylon at the implied
  // UT), then DT_re = DT_obs + (frameworkTT − canonTT) — the raw tablet time
  // and the shadow-enlargement convention cancel identically. Century
  // statistic: the MEDIAN with MAD-derived SE (measured rationale: high-
  // weight tablet pairs can contradict each other beyond LOD-continuity —
  // −593 w10 vs −587 w6 imply −2,700 ms/day over 6 yr — so weights must not
  // concentrate a century into one tablet; the median's SE also measured
  // tighter). Identification tolerance 15 min = half the per-event scatter
  // floor (the mis-ID-insensitivity property: both candidates' differentials
  // move together). Compared against the PRE-REGISTERED column, snapshotted
  // here from the same recorded artifact — never re-derived for comparison.
  // Development record: tools/explore/phase-c-rereduction-{poc,hardened}.mjs.
  const D2R = Math.PI / 180;
  const pcObs = steph.entries.filter((e) =>
    /^S0[124]$/.test(e.source_table) && e.year >= -800 && e.year <= -301 && e.dt_observed_sec != null);
  const pcGmst = (jd) => {
    const T = (jd - 2451545.0) / 36525;
    return ((280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T) % 360 + 360) % 360;
  };
  const pcSunAlt = (jdUT) => {
    const lam = model.eclipse.sunLonDegAtJD(jdUT) * D2R;
    const eps = model.earth.obliquityDeg(model.time.yearFromJD(jdUT)) * D2R;
    const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam));
    const dec = Math.asin(Math.sin(lam) * Math.sin(eps));
    const H = ((pcGmst(jdUT) + 44.4) * D2R) - ra;
    return Math.asin(Math.sin(32.5 * D2R) * Math.sin(dec) + Math.cos(32.5 * D2R) * Math.cos(dec) * Math.cos(H)) / D2R;
  };
  const pcCanonByYear = new Map();
  for (const c of canon.entries) {
    const m = /^(-?\d+)/.exec(c.date);
    if (!m) continue;
    const y = parseInt(m[1], 10);
    if (!pcCanonByYear.has(y)) pcCanonByYear.set(y, []);
    pcCanonByYear.get(y).push(c);
  }
  const pcVisible = (year, dtObs) => (pcCanonByYear.get(year) || [])
    .filter((c) => c.type_nasa !== 'N')
    .filter((c) => pcSunAlt(c.jd_TD - dtObs / 86400) < 0);
  const pcShift = (c) => {
    const evs = model.eclipse.findLunarInRange(c.jd_TD - 20, c.jd_TD + 20);
    let best = null, bestD = 2;
    for (const ev of evs) {
      const evTT = ev.jd + model.eclipse.deltaTSecondsAtJD(ev.jd) / 86400;
      const d = Math.abs(evTT - c.jd_TD);
      if (d < bestD) { best = evTT; bestD = d; }
    }
    return best === null ? null : (best - c.jd_TD) * 86400;
  };
  let pcIdentified = 0, pcStraddled = 0, pcAmbiguous = 0, pcDropped = 0;
  /** @type {Array<{year: number, residReMin: number}>} */
  const pcRows = [];
  for (const obs of pcObs) {
    const w = obs.weight === null || obs.weight === undefined ? 1 : obs.weight;
    if (w === 0) continue;
    let cands = pcVisible(obs.year, obs.dt_observed_sec);
    if (cands.length === 0) {
      cands = [...pcVisible(obs.year - 1, obs.dt_observed_sec), ...pcVisible(obs.year + 1, obs.dt_observed_sec)];
      if (cands.length > 0) pcStraddled += 1;
    }
    const shifts = cands.map(pcShift).filter((s) => s !== null);
    if (shifts.length === 0) { pcDropped += 1; continue; }
    const spread = Math.max(...shifts) - Math.min(...shifts);
    if (shifts.length > 1 && spread > 900) { pcAmbiguous += 1; continue; }
    pcIdentified += 1;
    const shiftSec = shifts.reduce((s, v) => s + v, 0) / shifts.length;
    const fwSec = DT.meanDeltaTSecondsAtAge((2000 - obs.year) / 1e6);
    pcRows.push({ year: obs.year, residReMin: (fwSec - (obs.dt_observed_sec + shiftSec)) / 60 });
  }
  /** @type {Record<string, {n: number, medianMinutes: number, seMinutes: number, preRegisteredMinutes: number | null, z: number | null}>} */
  const pcPerCentury = {};
  let pcChi2 = 0, pcChiN = 0;
  const pcCents = {};
  for (const r of pcRows) {
    const c = String(Math.floor(r.year / 100) * 100);
    (pcCents[c] ?? (pcCents[c] = [])).push(r.residReMin);
  }
  for (const cent of Object.keys(pcCents).sort((a, b) => Number(a) - Number(b))) {
    const vals = pcCents[cent].slice().sort((a, b) => a - b);
    const med = vals[Math.floor(vals.length / 2)];
    const mad = vals.map((x) => Math.abs(x - med)).sort((a, b) => a - b)[Math.floor(vals.length / 2)];
    const se = 1.4826 * mad / Math.sqrt(vals.length);
    const p = predictedReducedResidualMinutes[cent];
    const z = (p !== undefined && se > 0) ? (med - p) / se : null;
    if (z !== null) { pcChi2 += z * z; pcChiN += 1; }
    pcPerCentury[cent] = {
      n: vals.length,
      medianMinutes: Math.round(med * 10) / 10,
      seMinutes: Math.round(se * 10) / 10,
      preRegisteredMinutes: p !== undefined ? p : null,
      z: z !== null ? Math.round(z * 10) / 10 : null,
    };
  }
  const phaseC = {
    window: 'S01/S02/S04, years −800..−301, weight>0 (null=1)',
    identified: pcIdentified,
    viaYearStraddle: pcStraddled,
    ambiguous: pcAmbiguous,
    dropped: pcDropped,
    perCentury: pcPerCentury,
    chi2: Math.round(pcChi2 * 10) / 10,
    chi2Centuries: pcChiN,
  };

  const computed = {
    _description: 'Lunar-eclipse alignment summary — GENERATED by tools/verify/lunar-alignment.js --write. canonGeometry: model lunar finder vs the NASA 5-Millennium Canon 1600-2200 on the TT AXIS (isolates lunar geometry from the deltaT model, which eclipse-audit L-5b tests on the UT axis). visibility: documented visibility regions vs the shipped api observer tier (geometric horizon at maximum eclipse; deep-inside-region cities). babylon746: the -746 Feb 6 Babylonian partial eclipse anchor. dtBands: the Stephenson-2016 raw-timing reductions (their reduction of the primary timings, weights not applied) vs the framework deltaT curve and the published Stephenson spline, per source table. phaseC: the differential contact-time re-reduction (the pre-registered falsification test) — per-century MEDIAN re-reduced residuals ± MAD-SE vs the pre-registered column, χ² over the covered centuries. A plain run recomputes and FAILS on divergence from this file; --write refuses on divergence; --write --rebaseline is the conscious re-measurement path.',
    canonGeometry,
    visibility,
    babylon746,
    dtBands,
    dtBounds,
    dtBandsByCentury,
    theoryDrift,
    phaseC,
    inputs: buildInputsBlock('node tools/verify/lunar-alignment.js --write', INPUT_FILES),
  };

  console.log('  canonGeometry: %d/%d matched (types %d) | TT residual mean %s min, rms %s min, max %s min',
    matched, canonRows.length, typeAgree, canonGeometry.meanAbsResidualMinutes, canonGeometry.rmsResidualMinutes, canonGeometry.maxAbsResidualMinutes);
  console.log('  visibility: inside %d/%d | outside %d/%d', insideAgree, visEntries.length, outsideAgree, outsideChecked);
  console.log('  babylon746: %s mag %s (canon %s) | ttRes %s min | Babylon visible=%s alt=%s°',
    babylon746.type, babylon746.magnitudeUmbral, babylon746.canonMagnitudeUmbral, babylon746.ttResidualMinutes, babylon746.visibleFromBabylon, babylon746.babylonMoonAltitudeDeg);
  console.log('  dtBands overall (n=%d): framework meanAbs %d s | stephenson spline meanAbs %d s',
    dtBands.overall.n, dtBands.overall.frameworkMeanAbsSeconds, dtBands.overall.stephensonSplineMeanAbsSeconds);
  for (const [k, v] of Object.entries(dtBounds)) {
    if (k === 'babylon135' || k === 'S14') continue;
    console.log('  dtBounds %s (%s): framework inside %d/%d | spline inside %d/%d', k, v.label, v.frameworkInside, v.n, v.stephensonSplineInside, v.n);
  }
  console.log('  dtBounds S14 (%s, n=%d): framework meanAbs %d s | spline meanAbs %d s',
    dtBounds.S14.label, dtBounds.S14.n, dtBounds.S14.frameworkMeanAbsSeconds, dtBounds.S14.stephensonSplineMeanAbsSeconds);
  if (dtBounds.babylon135) console.log('  dtBounds babylon135: framework %d s vs bounds [%d, %d] → inside=%s',
    dtBounds.babylon135.frameworkSeconds, dtBounds.babylon135.boundsLowSeconds, dtBounds.babylon135.boundsHighSeconds, dtBounds.babylon135.frameworkInside);
  for (const [cent, v] of Object.entries(dtBandsByCentury)) {
    console.log('  century %s: n=%d obs %s hr | framework %s hr | residual %s hr', cent, v.n, v.meanObservedHours, v.meanFrameworkHours, v.residualHours);
  }
  console.log('  theoryDrift: baseline %s min | -750 drift %s min | effective Δṅ %s ″/cy²',
    theoryDrift.modernBaselineMinutes, driftMinutes['-750'], effectiveDeltaNdot);
  console.log('  phaseC: identified %d (%d straddle) | ambiguous %d | dropped %d | χ² %s/%d',
    phaseC.identified, phaseC.viaYearStraddle, phaseC.ambiguous, phaseC.dropped, phaseC.chi2, phaseC.chi2Centuries);
  for (const [cent, v] of Object.entries(phaseC.perCentury)) {
    console.log('  phaseC %s: n=%d | median %s ± %s min | pre-reg %s | z %s',
      cent, v.n, v.medianMinutes, v.seMinutes, v.preRegisteredMinutes, v.z);
  }
  console.log('  pre-registered re-reduction residuals (min):',
    Object.entries(predictedReducedResidualMinutes).map(([c, v]) => `${c}: ${v}`).join(' | '));

  // ── Recording convention ──────────────────────────────────────────────────
  if (!fs.existsSync(OUT)) {
    if (!WRITE) {
      console.error('FAIL — no recorded summary. First run: node tools/verify/lunar-alignment.js --write');
      process.exit(1);
    }
    fs.writeFileSync(OUT, JSON.stringify(computed, null, 2) + '\n');
    console.log('  ✓ wrote %s (first recording)', path.relative(ROOT, OUT));
    return;
  }
  const recorded = rd('data/lunar-alignment-summary.json');
  const rec = flatten(recorded, '', new Map());
  const now = flatten(computed, '', new Map());
  let diverged = 0;
  for (const [k, was] of rec) {
    const v = now.has(k) ? now.get(k) : '(missing)';
    const same = Object.is(was, v);
    if (!same) { diverged += 1; console.log('  DIVERGED   %s: recorded %s, computed %s', k, was, v); }
  }
  for (const k of now.keys()) if (!rec.has(k)) { diverged += 1; console.log('  NEW KEY    %s (not in recording)', k); }

  if (diverged === 0) {
    if (WRITE) { fs.writeFileSync(OUT, JSON.stringify(computed, null, 2) + '\n'); console.log('  ✓ wrote %s (values identical; inputs re-stamped)', path.relative(ROOT, OUT)); }
    else console.log('PASS — all recorded lunar-alignment values reproduced (%d keys).', rec.size);
    return;
  }
  if (WRITE && REBASELINE) {
    fs.writeFileSync(OUT, JSON.stringify(computed, null, 2) + '\n');
    console.log('  → REBASELINED: %d divergent value(s) adopted; wrote %s', diverged, path.relative(ROOT, OUT));
    return;
  }
  if (WRITE) {
    console.error('REFUSING to write: %d value(s) diverge from the recorded snapshot.', diverged);
    console.error('Investigate; if this is a conscious re-measurement, pass --rebaseline.');
    process.exit(1);
  }
  console.error('FAIL — %d lunar-alignment value(s) diverged from the recording.', diverged);
  process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
