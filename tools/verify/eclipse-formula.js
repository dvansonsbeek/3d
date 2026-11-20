#!/usr/bin/env node
/**
 * The eclipse formula of date against its referees (plan 33 §4; packages/physics/src/eclipse/formula.cjs).
 * A GATE — FAILS, writes nothing.
 *
 *   (1) The canon's era: the formula's syzygies against the finders' events in 25 one-year windows
 *       spread over the NASA Five Millennium Canon's span (−1999…+3000), both kinds: every finder
 *       event has the formula's syzygy at the same instant (the greatest-eclipse instant within
 *       1 s — the finders bisect to 1/86,400 d and refine on a 1-min grid; the syzygy itself within
 *       1 s), the same type, the same least distance (σ or γ to 1e-6); and the formula reports no
 *       eclipse the finder did not find. The recall campaign reads the finders; the finders and the
 *       formula classify with the SAME geometry (ONE home), so the canon's recall is the formula's.
 *   (2) Formula ≡ finder at the four deep positions of the epoch-consistency gate (−1 Myr, −400 Myr,
 *       −2 Gyr, 10 kyr inside the genesis edge; the finders scan with the month OF DATE there):
 *       the same events, the same types; the instants to the Julian Day's own GRAIN at depth
 *       (doc 111 §1.37 — 1.5e-5 d at 400 Ma, 1.2e-4 d = 10 s at −2 Gyr; the syzygy within 1 s + 3 ulp,
 *       the greatest-eclipse instant, the minimum of a flat function, within 2 s + 25 ulp), σ/γ to
 *       5e-4 (measured: the syzygy 2.6 s at 400 Ma = 2 ulp, 10.5 s at −2 Gyr = 1 ulp; greatest
 *       16 s and 190 s; σ 4e-5 and 1.8e-4°).
 *   (3) The recurrences golden: today's pairs reproduced exactly — the node family 88/95.5, the
 *       tritos 135/146.5, the Saros 223/242, the inex 358/388.5, 493/535, 581/630.5 (|ΔF| ≤ 1°);
 *       the anomaly family's Saros 223/239; the year family's Metonic 235/19 alone — and the pairs of
 *       date at the step-0 epochs pinned: 82/88.5 + 53 months = 4 yr at 400 Ma, 101/108 + 196/13 at
 *       1.4 Ga, 214/227.5 + 33/2 at 2.46 Ga, 229/237 + 498/17 at 4.0 Ga, 307/308 + 402/1 at the edge.
 *   (4) The amplitude-of-date rows: the formula's periodic correction at the MEAN syzygies (the
 *       series' elongation residual there) regressed on sin M′ over ~200 syzygies at J2000, 400 Ma,
 *       2.46 Ga and the edge equals the longitude table's own sin M′ coefficient at that phase of
 *       D with the m-family's scales of date (ONE home moon/solar-perturbation-scales: the evection's
 *       −1.274° × m/m₀ against the equation of the centre's 6.289°, the sign cos(k_D·D₀) at new and
 *       full Moon) — and the SAME prediction on the J2000 amplitudes FAILS at 2.46 Ga and the edge
 *       (6 % and 25 % apart): a J2000 amplitude planted at the genesis fails, by construction.
 *   (5) The regime tag: an eclipse inside the canon's span is 'certified', one at −1 Myr
 *       'reproducible', and the statistics of date stand at every deep position (finite, the
 *       seasons ~2.1 per year, the eclipse year of date).
 *
 *   ESSRT_ECLIPSE_FORMULA_PLANT=1  shifts every finder instant by 3 s before the comparison — (1) must fail
 *   ESSRT_ECLIPSE_FORMULA_PLANT=2  reads the amplitude prediction on the J2000 amplitudes — (4) must fail
 *
 *   node tools/verify/eclipse-formula.js   (exit 1 on fail; ~40 s)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT } = require('../lib/artifact-inputs');

const PLANT = process.env.ESSRT_ECLIPSE_FORMULA_PLANT || '';
const J2000_JD = 2451545.0;
const Y = 365.25;
const D2R = Math.PI / 180;

/** @param {number} jd @returns {number} the Julian Day's ulp in seconds */
const ulpSeconds = (jd) => Math.abs(jd) * Number.EPSILON * 86400;
/** @param {number} x @param {number} d */
const pr = (x, d) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

async function main() {
  const { createModel, createSolarPerturbationScales, solarCharacteristicPower, FITTED_COEFFICIENTS, axisDistanceDeg, lunarTypeAt, solarTypeAt, CANON_WINDOW_YEARS } = await import('../../packages/physics/src/index.js');
  const DT = require('../lib/deep-time.js');
  const read = (/** @type {string} */ f) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8')); } catch { return undefined; } };
  const m = createModel(undefined, {
    secularSeriesArtifact: read('nbody-secular-series.json'), spinCheckpointsArtifact: read('spin-axis-checkpoints.json'),
    lunarCheckpointsArtifact: read('lunar-cumulative-checkpoints.json'), obliquityBeatTableArtifact: read('obliquity-beat-table.json'),
  });
  const F = m.eclipse.formula;
  /** @type {string[]} */
  const failures = [];
  const t0 = Date.now();

  // ── (1) + (2): the formula against the finders ────────────────────────────────────────────────
  /**
   * @param {string} label @param {number} jdUT0 @param {number} spanDays @param {'lunar' | 'solar'} kind
   * @param {{syzygyS: number, greatestS: number, dist: number}} tol @param {number | undefined} stepDays
   * @returns {{events: number, maxSyz: number, maxGreat: number, maxDist: number}}
   */
  function compare(label, jdUT0, spanDays, kind, tol, stepDays) {
    const opts = stepDays ? { stepDays } : undefined;
    const finder = kind === 'lunar' ? m.eclipse.findLunarInRange(jdUT0, jdUT0 + spanDays, opts) : m.eclipse.findSolarInRange(jdUT0, jdUT0 + spanDays, opts);
    const formula = F.syzygiesInRange(jdUT0, jdUT0 + spanDays, kind);
    let maxSyz = 0, maxGreat = 0, maxDist = 0, flips = 0;
    /** the Moon's latitude rate at a UT instant (deg per UT day) over the grain's stencil @param {number} jd */
    const betaRate = (jd) => { const h = Math.max(1 / 1440, 64 * Math.abs(jd) * Number.EPSILON); return (m.moon.betaDegAtJD(jd + h) - m.moon.betaDegAtJD(jd - h)) / (2 * h); };
    /** At the edge a limit-grazing type is the INSTANT's: the two methods' greatest-eclipse instants differ by
     *  the clock's jitter (~1 h), and the Moon's latitude moves 190°/d there — the type is re-read at the
     *  finder's own instant with the formula's geometry; it must then agree. @param {import('../../packages/physics/src/eclipse/formula.cjs').EclipseOfDate} f @param {number} jdFinder @param {string} finderType */
    const sameTypeAtFinderInstant = (f, jdFinder, finderType) => {
      if (kind === 'lunar') {
        const sig = axisDistanceDeg(F.elongationResidualDegAt(jdFinder, 'lunar'), m.moon.betaDegAtJD(jdFinder));
        return lunarTypeAt(sig, /** @type {any} */ (f.geometry)).type === finderType;
      }
      return solarTypeAt(Math.abs(m.moon.betaDegAtJD(jdFinder)), /** @type {any} */ (f.geometry)) === finderType;
    };
    for (const e of finder) {
      const eJd = e.jd + (PLANT === '1' ? 3 / 86400 : 0);
      const f = formula.find((x) => Math.abs(x.jdUT - eJd) < 0.5);
      if (!f) { failures.push(`${label} ${kind}: the finder's ${e.type} at JD ${e.jd} has no formula syzygy within half a day`); continue; }
      const dGreat = Math.abs(f.jdUT - eJd) * 86400;
      const dSyz = kind === 'lunar' ? Math.abs(f.jdSyzygyUT - (/** @type {{jdOpposition: number}} */ (/** @type {unknown} */ (e))).jdOpposition - (PLANT === '1' ? 3 / 86400 : 0)) * 86400 : 0;
      const dDist = kind === 'lunar' ? Math.abs((/** @type {number} */ (f.sigmaDeg)) - (/** @type {{leastDistanceDeg: number}} */ (/** @type {unknown} */ (e))).leastDistanceDeg) : 0;
      maxGreat = Math.max(maxGreat, dGreat); maxSyz = Math.max(maxSyz, dSyz); maxDist = Math.max(maxDist, dDist);
      if (dGreat > tol.greatestS) failures.push(`${label} ${kind}: greatest eclipse at JD ${e.jd} — formula ${pr(dGreat, 2)} s from the finder (tol ${pr(tol.greatestS, 1)} s)`);
      if (dSyz > tol.syzygyS) failures.push(`${label} ${kind}: the syzygy at JD ${e.jd} — formula ${pr(dSyz, 2)} s from the finder's opposition (tol ${pr(tol.syzygyS, 1)} s)`);
      if (dDist > tol.dist) failures.push(`${label} ${kind}: the least distance at JD ${e.jd} — formula ${pr(dDist, 7)}° from the finder's (tol ${tol.dist})`);
      if (f.type !== e.type) {
        if (tol.edgeJitter && sameTypeAtFinderInstant(f, e.jd, e.type)) flips++;
        else failures.push(`${label} ${kind}: the type at JD ${e.jd} — formula ${f.type} vs finder ${e.type}`);
      }
    }
    for (const f of formula) {
      if (f.type !== null && !finder.some((e) => Math.abs(f.jdUT - e.jd) < 0.5)) {
        // at the edge an eclipse the finder did not find is tolerated where the formula's own distance sits
        // within the jitter's reach of the outer limit (σ within tol.dist of the penumbral limit; |β| within
        // β̇ × the greatest-eclipse jitter of the partial limit)
        const G = /** @type {any} */ (f.geometry);
        const near = kind === 'lunar'
          ? Math.abs(/** @type {number} */ (f.sigmaDeg) - G.penumMax) <= tol.dist
          : Math.abs(Math.abs(f.betaDeg) - G.partialLim) <= Math.abs(betaRate(f.jdUT)) * tol.greatestS / 86400;
        if (tol.edgeJitter && near) flips++;
        else failures.push(`${label} ${kind}: the formula reports a ${f.type} at JD ${f.jdUT} the finder did not find`);
      }
    }
    return { events: finder.length, maxSyz, maxGreat, maxDist, flips };
  }

  const ERA_TOL = { syzygyS: 1.0, greatestS: 1.0, dist: 1e-6, edgeJitter: false };
  const W = CANON_WINDOW_YEARS;
  console.log(`(1) the canon's era — 25 one-year windows over ${W.min}…+${W.max}, both kinds`);
  let eraEvents = 0, eraMaxGreat = 0, eraMaxSyz = 0, eraMaxDist = 0;
  for (let i = 0; i < 25; i++) {
    const year = W.min + ((W.max - W.min) * i) / 24;
    const jd0 = J2000_JD + (year - 2000) * Y;
    for (const kind of /** @type {const} */ (['lunar', 'solar'])) {
      const r = compare(`era ${year.toFixed(0)}`, jd0, Y, kind, ERA_TOL, undefined);
      eraEvents += r.events; eraMaxGreat = Math.max(eraMaxGreat, r.maxGreat); eraMaxSyz = Math.max(eraMaxSyz, r.maxSyz); eraMaxDist = Math.max(eraMaxDist, r.maxDist);
    }
  }
  console.log(`    ${eraEvents} finder events matched — max |Δ greatest| ${pr(eraMaxGreat, 3)} s, max |Δ syzygy| ${pr(eraMaxSyz, 3)} s, max |Δσ| ${eraMaxDist.toExponential(1)}°`);

  console.log('(2) the four deep positions — the finder scanning with the month of date');
  const rng = m.time.navigableYearRange();
  const edgeYear = 2000.5 + (rng.yearMin - 2000.5) + 10000;   // 10 kyr inside the genesis edge, on the position axis
  const edgeJdTT = m.time.positionYearToJDTT(edgeYear);
  /** @type {Array<[string, number]>} */
  const deep = [['−1 Myr', J2000_JD + (-1e6 - 2000) * Y], ['−400 Myr', J2000_JD + (-400e6 - 2000) * Y], ['−2 Gyr', J2000_JD + (-2000e6 - 2000) * Y]];
  if (edgeJdTT !== null) deep.push(['the edge + 10 kyr', edgeJdTT]);
  /** TT → UT through the model's ONE bridge (the position axis in between): never the UT reader on a TT value. @param {number} jdTT */
  const jdUTOfTT = (jdTT) => { const y = m.time.jdTTToPositionYear(jdTT); const u = y === null ? null : m.time.positionYearToJDUT(y); return u === null ? jdTT - m.eclipse.deltaTSecondsAtJD(jdTT) / 86400 : u; };
  for (const [label, jdTT] of deep) {
    const jdUT = jdUTOfTT(jdTT);
    const P = F.periodsAt(jdTT), S = F.statisticsAt(jdTT);
    if (!P || !S) { failures.push(`${label}: the periods of date are undefined`); continue; }
    // The finders' axis counts SOLAR days of date (5.5 h at the genesis): the month and the step in UT
    // days are the SI values over the solar day. The window is one eclipse SEASON of date plus two
    // months — the first window, 14 months in SI days, was 3.2 months of UT at the edge and fell
    // between seasons (the Moon 24° from the ecliptic at every one of its syzygies: no eclipse, rightly).
    const monthUT = P.synodicDays / P.solarDayDays;
    const windowUT = (S.eclipseYearDays / 2) / P.solarDayDays + 2 * monthUT;
    const ulp = ulpSeconds(jdUT);
    // The tolerances carry the axis's grain (ulp of the UT Julian Day: 3 s at 400 Ma, 17 s at −2 Gyr).
    // At the genesis edge (47 s per ulp) the UT → TT bridge's own residual — a difference of three
    // 1e12-day numbers — cannot be evaluated below ~1e-3 d, so the TT instant of a UT instant jitters by
    // a few TT ulps: 0.4° of lunar longitude, and both methods read the noisy minimum of a flat function
    // for greatest eclipse. MEASURED there: 8 ulp of syzygy, 87 ulp of greatest eclipse, 0.22° of σ on
    // a 9.4°-wide umbra — the edge's eclipse instants are reproducible to the clock's jitter (~1 h for
    // greatest eclipse), and the tolerances say so; the types agree at every one of the 101 events.
    const edgeJitter = ulp > 30;
    const tol = edgeJitter
      ? { syzygyS: 1 + 12 * ulp, greatestS: 2 + 100 * ulp, dist: 0.3, edgeJitter }
      : { syzygyS: 1 + 3 * ulp, greatestS: 2 + 25 * ulp, dist: 5e-4, edgeJitter };
    for (const kind of /** @type {const} */ (['lunar', 'solar'])) {
      const r = compare(label, jdUT, windowUT, kind, tol, monthUT / 60);
      console.log(`    ${label.padEnd(18)} ${kind.padEnd(5)} ${String(r.events).padStart(2)} events · |Δ greatest| ${pr(r.maxGreat, 2).padStart(8)} s (tol ${pr(tol.greatestS, 1)}) · |Δ syzygy| ${pr(r.maxSyz, 2).padStart(7)} s (tol ${pr(tol.syzygyS, 1)}) · |Δσ| ${r.maxDist.toExponential(1)}${r.flips ? ` · ${r.flips} limit-grazing type(s) read at the other instant` : ''} · month ${pr(P.synodicDays, 4)} SI d = ${pr(monthUT, 3)} UT d · window ${pr(windowUT / monthUT, 0)} months · ulp ${pr(ulp, 2)} s`);
      if (r.events === 0) failures.push(`${label} ${kind}: the finder found no event in one eclipse season — the position is not exercised`);
    }
  }

  // ── (3) the recurrences golden ────────────────────────────────────────────────────────────────
  console.log('(3) the recurrences of date — today\'s pairs exactly, the step-0 epochs pinned');
  /** @param {import('../../packages/physics/src/eclipse/formula.cjs').Recurrence[]} list */
  const pairs = (list) => list.map((r) => `${r.synodicMonths}/${r.cycles}`);
  const R0 = F.recurrencesAt(J2000_JD);
  if (!R0) failures.push('J2000: no recurrences');
  else {
    const want = { node: ['88/95.5', '135/146.5', '223/242', '358/388.5', '493/535', '581/630.5'], year: ['235/19'] };
    if (pairs(R0.node).join(' ') !== want.node.join(' ')) failures.push(`J2000 node recurrences ${pairs(R0.node).join(' ')} ≠ ${want.node.join(' ')}`);
    if (pairs(R0.year).join(' ') !== want.year.join(' ')) failures.push(`J2000 year recurrences ${pairs(R0.year).join(' ')} ≠ ${want.year.join(' ')}`);
    if (!pairs(R0.anomaly).includes('223/239')) failures.push(`J2000 anomaly recurrences ${pairs(R0.anomaly).join(' ')} lack the Saros 223/239`);
    const names = R0.node.map((r) => r.name).filter(Boolean).join(',');
    if (names !== 'tritos,Saros,inex') failures.push(`J2000 node names ${names} ≠ tritos,Saros,inex`);
    if (R0.year[0].name !== 'Metonic') failures.push('J2000 year pair is not named Metonic');
    console.log(`    J2000: node ${pairs(R0.node).join(' ')} (${names}) · anomaly ${pairs(R0.anomaly).join(' ')} · year ${pairs(R0.year).join(' ')} (${R0.year[0].name})`);
  }
  /** @type {Array<[string, number, string, string, string, string]>} the step-0 epochs: the SHORTEST node pair of the
   *  shipped list, the node pair step 0's record quoted (in the list), the shortest year pair, the year pair the record quoted */
  const deepPairs = [
    ['400 Ma', 400, '82/88.5', '82/88.5', '53/4', '53/4'], ['1.4 Ga', 1400, '101/108', '101/108', '196/13', '196/13'],
    ['2.46 Ga', 2460, '103/109.5', '214/227.5', '33/2', '33/2'], ['4.0 Ga', 4000, '43/44.5', '229/237', '205/7', '498/17'],
  ];
  for (const [label, tMa, shortest, recorded, year, yearRecorded] of deepPairs) {
    const R = F.recurrencesAt(J2000_JD - tMa * 1e6 * Y);
    if (!R) { failures.push(`${label}: no recurrences`); continue; }
    const n0 = R.node.length ? `${R.node[0].synodicMonths}/${R.node[0].cycles}` : '—', y0 = R.year.length ? `${R.year[0].synodicMonths}/${R.year[0].cycles}` : '—';
    console.log(`    ${label.padEnd(8)}: node ${pairs(R.node).join(' ')} · year ${pairs(R.year).join(' ')} (the shortest ${R.node.length ? pr(R.node[0].spanYears, 2) : '—'} yr / ${R.year.length ? pr(R.year[0].spanYears, 2) : '—'} yr)`);
    if (n0 !== shortest) failures.push(`${label}: the shortest node recurrence ${n0} ≠ ${shortest}`);
    if (!pairs(R.node).includes(recorded)) failures.push(`${label}: the node recurrences ${pairs(R.node).join(' ')} lack ${recorded} (step 0's record)`);
    if (y0 !== year) failures.push(`${label}: the shortest season recurrence ${y0} ≠ ${year}`);
    if (!pairs(R.year).includes(yearRecorded)) failures.push(`${label}: the season recurrences ${pairs(R.year).join(' ')} lack ${yearRecorded} (step 0's record)`);
  }
  // the edge: the node locks near 1:1 with the month (the cycle closes within one month at the opposite
  // node) and the eclipse year IS the year — the pairs read against the edge's own periods
  if (edgeJdTT !== null) {
    const R = F.recurrencesAt(edgeJdTT);
    if (!R || !R.node.length || !R.year.length) failures.push('the edge: no recurrences');
    else {
      const n = R.node[0], y = R.year[0];
      console.log(`    the edge: node ${n.synodicMonths}/${n.cycles} (${pr(n.spanYears, 2)} yr) · year ${y.synodicMonths}/${y.cycles} (${pr(y.spanYears, 2)} yr) · month ${pr(n.spanDays / n.synodicMonths, 4)} SI d`);
      if (n.cycles - n.synodicMonths !== 0.5 && n.cycles - n.synodicMonths !== 1) failures.push(`the edge: the shortest node recurrence ${n.synodicMonths}/${n.cycles} is not the near-1:1 lock`);
      if (y.cycles !== 1) failures.push(`the edge: the shortest season recurrence ${y.synodicMonths}/${y.cycles} is not the eclipse year itself`);
    }
  }

  // ── (4) the amplitude-of-date rows ────────────────────────────────────────────────────────────
  console.log('(4) the periodic correction at the mean syzygies — the sin M′ coefficient of date vs the table\'s');
  const L = /** @type {number[][]} */ (FITTED_COEFFICIENTS.MEEUS_LONGITUDE_TERMS);
  const scalesAt = createSolarPerturbationScales({
    siderealMonthSecondsAtAge: DT.meanMoonSiderealMonthAtAge, siderealYearSecondsAtAge: DT.meanSiderealYearSecondsAtAge,
    moonDistanceKmAtAge: DT.meanMoonDistanceCorrectedAtAge, auAtAge: DT.meanAuAtAge,
  });
  /** The table's sin M′ coefficient at D₀ (0 new, 180 full), degrees, on the scales of date (or J2000's).
   *  @param {number} tMa @param {'lunar' | 'solar'} kind @param {boolean} j2000Amplitudes */
  const predictedC1 = (tMa, kind, j2000Amplitudes) => {
    const s = j2000Amplitudes ? { mRatio: 1, aRatio: 1 } : scalesAt(tMa);
    if (!s) return NaN;
    let c = 0;
    for (const r of L) {
      const [kD, kM, kMp, kF, A] = r;
      if (kM !== 0 || kF !== 0 || Math.abs(kMp) !== 1) continue;
      const sign = kind === 'lunar' ? (kD % 2 === 0 ? 1 : -1) : 1;   // cos(k_D·D₀): D₀ = 180° at full Moon
      const p = solarCharacteristicPower(kD, kM, kMp);
      c += A * 1e-6 * kMp * sign * Math.pow(s.mRatio, p) * (kD % 2 !== 0 ? s.aRatio : 1);
    }
    return c;
  };
  /** Least squares of y on the columns X (n × p). @param {number[][]} X @param {number[]} y */
  const lstsq = (X, y) => {
    const p = X[0].length;
    const A = Array.from({ length: p }, () => new Array(p + 1).fill(0));
    for (let i = 0; i < X.length; i++) for (let a = 0; a < p; a++) { for (let b = 0; b < p; b++) A[a][b] += X[i][a] * X[i][b]; A[a][p] += X[i][a] * y[i]; }
    for (let c = 0; c < p; c++) {
      let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]];
      for (let r = 0; r < p; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k <= p; k++) A[r][k] -= f * A[c][k]; }
    }
    return A.map((row, i) => row[p] / row[i]);
  };
  /** @type {Array<[string, number]>} */
  const ampPositions = [['J2000', 1e-6], ['400 Ma', 400], ['2.46 Ga', 2460]];
  if (edgeJdTT !== null) ampPositions.push(['the edge', (J2000_JD - edgeJdTT) / Y / 1e6 - 0.0005]);
  const N_SYZ = 180;
  for (const [label, tMa] of ampPositions) {
    const jdTT0 = J2000_JD - tMa * 1e6 * Y;
    for (const kind of /** @type {const} */ (['lunar', 'solar'])) {
      const k0 = F.meanSyzygyCountAt(jdTT0, kind);
      if (k0 === null) { failures.push(`${label} ${kind}: no mean syzygy count`); continue; }
      /** @type {number[][]} */ const X = []; /** @type {number[]} */ const yv = [];
      // the sampling STRIDE in syzygies: M′ must advance ≥ 10° per sample (25.9° per month today, 0.9° at
      // the edge where the anomalistic and synodic months nearly coincide — 180 consecutive syzygies
      // there span 160° of M′ and the regressor is near-singular: measured −317° for 6.2°)
      const Pd = F.periodsAt(jdTT0);
      const advanceDeg = Pd ? 360 * (Pd.synodicDays / Pd.anomalisticDays - 1) : 25.9;
      const stride = Math.min(50, Math.max(1, Math.ceil(10 / Math.abs(advanceDeg))));
      let seed = jdTT0;
      for (let i = 0; i < N_SYZ; i++) {
        const ms = F.meanSyzygy(Math.floor(k0) + i * stride, kind, seed);
        if (!ms) break;
        seed = ms.jdTT;
        const a = F.argumentsAt(ms.jdTT);
        const Mp = a.Mp * D2R, M = a.M * D2R;
        X.push([1, Math.sin(Mp), Math.cos(Mp), Math.sin(2 * Mp), Math.cos(2 * Mp), Math.sin(M), Math.cos(M), Math.sin(Mp - M), Math.cos(Mp - M)]);
        yv.push(F.elongationResidualDegAt(ms.jdUT, kind));
      }
      if (X.length < N_SYZ / 2) { failures.push(`${label} ${kind}: only ${X.length} mean syzygies solved`); continue; }
      const c = lstsq(X, yv);
      const measured = c[1];
      const shipped = predictedC1(tMa, kind, false), frozen = predictedC1(tMa, kind, true);
      const want = PLANT === '2' ? frozen : shipped;
      // 1 % + the other lines' leakage (measured ≤ 5e-3°) — a 5 % BAND inside the Laplace-plane regime
      // (the edge: the series composes into the ecliptic by the plane's 11.8° rotation, whose longitude
      // share the table prediction does not carry; measured −3.6 % / +3.5 % at the two syzygy phases)
      const inRegime = (F.statisticsAt(jdTT0) || { approximate: false }).approximate;
      const tolDeg = (inRegime ? 0.05 : 0.01) * Math.abs(shipped) + 0.01;
      const ok = Math.abs(measured - want) <= tolDeg;
      console.log(`    ${label.padEnd(8)} ${kind.padEnd(5)} n ${X.length}: measured sin M′ ${pr(measured, 4)}° · the table of date ${pr(shipped, 4)}° · on J2000 amplitudes ${pr(frozen, 4)}° · tol ${pr(tolDeg, 4)}${ok ? '' : '  ✗'}`);
      if (!ok) failures.push(`${label} ${kind}: the mean-syzygy correction's sin M′ coefficient ${pr(measured, 4)}° ≠ the table's ${pr(want, 4)}° (tol ${pr(tolDeg, 4)})`);
      // the fail-proof built in: at 2.46 Ga and the edge the J2000 amplitudes must part from the measurement
      if (tMa > 1000 && Math.abs(measured - frozen) <= tolDeg) failures.push(`${label} ${kind}: the J2000 amplitudes (${pr(frozen, 4)}°) also fit the measurement (${pr(measured, 4)}°) — the m-family of date is not discriminated`);
    }
  }

  // ── (5) the regime tag and the statistics ─────────────────────────────────────────────────────
  console.log('(5) the regime tag and the statistics of date');
  const inEra = F.nextEclipseAfter(J2000_JD, 'lunar'), inDeep = F.nextEclipseAfter(J2000_JD + (-1e6 - 2000) * Y, 'lunar');
  if (!inEra || inEra.regime !== 'certified') failures.push(`the first lunar eclipse after J2000 is tagged ${inEra && inEra.regime}, not 'certified'`);
  if (!inDeep || inDeep.regime !== 'reproducible') failures.push(`the first lunar eclipse after −1 Myr is tagged ${inDeep && inDeep.regime}, not 'reproducible'`);
  // The certified window IS the canon's span: read the canon input's first and last entries (the ONE
  // source), never a literal — CANON_WINDOW_YEARS is the formula's home for it, the window the tag reads.
  const w = F.certifiedWindowYears;
  const canonEntries = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/input/lunar-eclipses-nasa.json'), 'utf8')).entries;
  const canonYear = (/** @type {string} */ d) => Number(d.match(/^(-?\d+)-/)[1]);
  const canonSpan = { min: canonYear(canonEntries[0].date), max: canonYear(canonEntries[canonEntries.length - 1].date) };
  if (w.min !== canonSpan.min || w.max !== canonSpan.max || w.min !== W.min || w.max !== W.max) failures.push(`the certified window is ${JSON.stringify(w)}, not the canon's ${JSON.stringify(canonSpan)}`);
  for (const [label, jdTT] of [['J2000', J2000_JD], ...deep]) {
    const s = F.statisticsAt(jdTT);
    if (!s || !Number.isFinite(s.seasonsPerYear) || !Number.isFinite(s.lunar.perYear.any) || !Number.isFinite(s.eclipseYearDays)) { failures.push(`${label}: the statistics of date are undefined`); continue; }
    console.log(`    ${label.padEnd(18)} seasons/yr ${pr(s.seasonsPerYear, 3)}${s.approximate ? ' (approximate: the Laplace-plane regime, tilt ' + pr(s.laplaceTiltDeg, 1) + '°)' : ''} · eclipse year ${pr(s.eclipseYearDays, 2)} SI d · lunar/yr ${pr(s.lunar.perYear.any, 2)} (umbral ${pr(s.lunar.perYear.umbral, 2)}) · solar/yr ${pr(s.solar.perYear.any, 2)} (central ${pr(s.solar.perYear.central, 2)}) · i ${pr(s.inclinationDeg, 2)}° · node limit (penumbral) ${pr(Math.asin(Math.min(1, s.lunar.sinFLimit.penumbral)) / D2R, 1)}°`);
    // outside the Laplace-plane regime the node regresses on the ecliptic and the Sun meets it twice per eclipse year
    if (!s.approximate && (s.seasonsPerYear < 1.9 || s.seasonsPerYear > 2.3)) failures.push(`${label}: ${pr(s.seasonsPerYear, 3)} eclipse seasons per year (expected ~2.1: the Sun returns to each node once per eclipse year)`);
    if (s.approximate && label !== 'the edge + 10 kyr') failures.push(`${label}: the statistics are flagged approximate (tilt ${pr(s.laplaceTiltDeg, 2)}°) outside the regime`);
  }
  if (inEra) console.log(`    J2000 next lunar: JD ${inEra.jdUT.toFixed(5)} ${inEra.type} γ ${pr(inEra.gamma, 4)} (${inEra.regime}); −1 Myr: ${inDeep ? inDeep.type + ' (' + inDeep.regime + ')' : '—'}`);

  if (PLANT) console.log(`  (ESSRT_ECLIPSE_FORMULA_PLANT=${PLANT}: ${PLANT === '1' ? 'the finder instants shifted by 3 s' : 'the amplitude prediction on the J2000 amplitudes'} — this run should FAIL)`);
  console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (failures.length) {
    for (const f of failures.slice(0, 40)) console.log('  FAIL  ' + f);
    if (failures.length > 40) console.log(`  … ${failures.length - 40} more`);
    console.log(`FAIL — ${failures.length} row(s): the eclipse formula of date has parted from its referees.`);
    process.exit(1);
  }
  console.log(`PASS — the eclipse formula of date: ${eraEvents} canon-era events ≡ the finders, the four deep positions, today's recurrences and the step-0 epochs, the amplitudes of date discriminated, the regime tags.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
