// Plan 33 step 0 — the eclipse formula of date: measurements 1, 3 and 4 (print-only; the record is the plan's
// status block in hu docs/plans/33 and the memory entry).
//
//  (1) The truncated lunar series' amplitudes at deep time against their elements-of-date scalings
//      (doc 111 §1.15 — a term's amplitude is a function of the elements). The series already scales the
//      e_E-bearing terms (Meeus's E factor on the channel of date) and the F-class terms (sin i_L of date);
//      the m = n_S/n_M family (the evection ∝ m·e_M, the variation ∝ m², the annual equation ∝ m·e_E, the
//      parallactic inequality ∝ m·a/a′) is carried at its J2000 amplitude. Each term's power of m is the
//      Hill–Brown characteristic: m^(|k_D| − |k_M′|), at least m¹ for any solar term (k_D ≠ 0 or k_M ≠ 0),
//      m⁰ for the pure lunar terms (the equation of centre, the reduction to the ecliptic). The rms longitude
//      misfit at a random syzygy phase, divided by the elongation rate of date, is the syzygy-instant error.
//  (3) The lunar eccentricity of date is a registry constant (0.0549) at every epoch: the band it puts on the
//      syzygy instant (the equation of centre's jitter ±2e·P_syn/2π, a phase) and on the shadow radii (±e).
//  (4) The recurrences of date: the physics of a recurrence is the SHIFT OF THE ARGUMENT PER CYCLE —
//      ΔF for the node (N_drac integer at the same node, half-integer at the opposite: the inex, the tritos),
//      ΔM′ for the anomaly (the type), Δλ_sun for the year (the season); primitive pairs, ranked by |Δ|, the
//      threshold the one that selects today's named cycles (|ΔF| ≤ 1°: the tritos, the Saros, the inex;
//      |Δλ| ≤ 1°: the Metonic; the Callippic is the Metonic's multiple).
//
// Run:  node tools/explore/plan33-step0-amplitudes.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createModel } from '../../packages/physics/src/index.js';
import { FITTED_COEFFICIENTS as F } from '../../packages/physics/src/constants/coefficients.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const DT = require('../lib/deep-time.js');
const rd = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const m = createModel(undefined, {
  secularSeriesArtifact: rd('data/nbody-secular-series.json'), spinCheckpointsArtifact: rd('data/spin-axis-checkpoints.json'),
  lunarCheckpointsArtifact: rd('data/lunar-cumulative-checkpoints.json'), obliquityBeatTableArtifact: rd('data/obliquity-beat-table.json'),
});
const L = F.MEEUS_LONGITUDE_TERMS, B = F.MEEUS_LATITUDE_TERMS;
const EDGE_MA = 4428.985;
const yearOf = (tMa) => 2000 - tMa * 1e6;

/** The elements of date the amplitudes ride (the chain's). @param {number} tMa */
function elementsAt(tMa) {
  const sidMonthS = DT.meanMoonSiderealMonthAtAge(tMa), synS = DT.meanSynodicMonthAtAge(tMa);
  const sidYearS = DT.meanSiderealYearSecondsAtAge(tMa), tropYearS = DT.meanTropicalYearSecondsAtAge(tMa);
  const dracS = DT.meanNodalMonthAtAge(tMa), anomS = DT.meanAnomalisticMonthAtAge(tMa);
  const aM = DT.meanMoonDistanceCorrectedAtAge(tMa), aS = DT.meanAuAtAge(tMa);
  const eE = m.earth.eccentricity(yearOf(tMa));
  const iL = DT.meanLunarFreeInclinationDegAtAge(tMa), tilt = DT.meanLaplaceTiltFromEclipticDegAtAge(tMa);
  return { tMa, mRatio: sidMonthS / sidYearS, sidMonthS, synS, dracS, anomS, sidYearS, tropYearS, aM, aS, aOverAp: aM / aS, eE, iL, tilt, lodS: DT.meanLodSecondsAtAge(tMa) };
}
const E0 = elementsAt(1e-6);
/** Hill–Brown characteristic: the power of m = n_S/n_M a term's amplitude carries.
 *  @param {number} kD @param {number} kM @param {number} kMp */
function mPower(kD, kM, kMp) {
  if (kD === 0) return kM !== 0 ? 1 : 0;
  return Math.max(1, Math.abs(kD) - Math.abs(kMp));
}
/** The of-date factor on a term the series does NOT already carry (E and the F-class scales are carried).
 *  @param {number[]} row @param {ReturnType<typeof elementsAt>} el */
function ofDateFactor(row, el) {
  const [kD, kM, kMp] = row;
  let f = Math.pow(el.mRatio / E0.mRatio, mPower(kD, kM, kMp));
  if (kD !== 0 && Math.abs(kD) % 2 === 1) f *= (el.aOverAp / E0.aOverAp);
  return f;
}
const pr = (/** @type {number} */ x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

console.log('=== Plan 33 step 0.1 / 0.3 — the elements of date, the m-family amplitudes, the e_M band ===');
for (const tMa of [1e-6, 400, 2460, EDGE_MA]) {
  const el = elementsAt(tMa);
  const degPerDayElong = 360 / (el.synS / 86400);
  console.log(`\n-- age ${tMa} Ma: m = ${pr(el.mRatio, 6)} (×${pr(el.mRatio / E0.mRatio, 4)} of today), e_E ${pr(el.eE, 5)}, a/a' ${el.aOverAp.toExponential(3)}, i_L ${pr(el.iL, 3)}°, tilt ${pr(el.tilt, 4)}°, synodic month ${pr(el.synS / 3600, 2)} h, elongation rate ${pr(degPerDayElong, 1)} °/d`);
  let sumSq = 0, sumSqCarried = 0;
  /** @type {Array<{arg: string, p: number, A0: number, carried: number, ofDate: number, dA: number}>} */
  const rows = [];
  for (const r of L) {
    const [kD, kM, kMp, kF, A] = r;
    const A0deg = A * 1e-6;
    const carried = A0deg * Math.pow(el.eE / E0.eE, Math.abs(kM));
    const ofDate = carried * ofDateFactor(r, el);
    const dA = carried - ofDate;
    sumSq += dA * dA; sumSqCarried += carried * carried;
    if (Math.abs(A0deg) > 0.02) rows.push({ arg: `${kD}D${kM ? (kM > 0 ? '+' : '') + kM + 'M' : ''}${kMp ? (kMp > 0 ? '+' : '') + kMp + "M'" : ''}${kF ? (kF > 0 ? '+' : '') + kF + 'F' : ''}`, p: mPower(kD, kM, kMp), A0: A0deg, carried, ofDate, dA });
  }
  rows.sort((a, b) => Math.abs(b.dA) - Math.abs(a.dA));
  for (const x of rows.slice(0, 8)) console.log(`   ${x.arg.padEnd(14)} m^${x.p}  J2000 ${pr(x.A0, 4)}°  carried (E-scaled) ${pr(x.carried, 4)}°  of date ${pr(x.ofDate, 5)}°  misfit ${pr(x.dA, 4)}°`);
  const eM0 = 0.0549;
  const jitter = (/** @type {number} */ e) => (2 * e) / (2 * Math.PI) * (el.synS / 3600);
  console.log(`   e_M band: the syzygy-instant jitter ±${pr(jitter(0.02), 2)} / ±${pr(jitter(eM0), 2)} / ±${pr(jitter(0.10), 2)} h for e_M 0.02 / 0.0549 / 0.10 (a phase, not an error); the distance band ±2 / ±5.5 / ±10 % moves the umbra's angular radius at the Moon by the same fraction`);
  const rmsDeg = Math.sqrt(sumSq / 2);
  console.log(`   longitude misfit rms ${pr(rmsDeg, 4)}° (the series' total rms ${pr(Math.sqrt(sumSqCarried / 2), 3)}°) → syzygy instant ${pr(rmsDeg / degPerDayElong * 1440, 2)} min of a ${pr(el.synS / 3600, 1)}-h month`);
  let sq = 0;
  for (const r of B) { const [, kM, , , A] = r; const c = A * 1e-6 * Math.pow(el.eE / E0.eE, Math.abs(kM)); const d = c - c * ofDateFactor(r, el); sq += d * d; }
  console.log(`   latitude misfit rms ${pr(Math.sqrt(sq / 2), 4)}° (the F-class scales already ride sin i_L; this is the m-family only)`);
}

console.log('\n=== Plan 33 step 0.4 — the recurrences of date (primitive pairs ranked by the argument shift per cycle) ===');
/** @param {ReturnType<typeof elementsAt>} el */
function recurrences(el, maxN = 1200) {
  const Psyn = el.synS / 86400, Pdrac = el.dracS / 86400, Panom = el.anomS / 86400, Ptrop = el.tropYearS / 86400;
  /** @type {Record<string, Array<{n: number, k: number, res: number, shiftDeg: number, spanDays: number}>>} */
  const out = { drac: [], anom: [], year: [] };
  for (let n = 1; n <= maxN; n++) {
    const span = n * Psyn;
    for (const [key, P, half] of /** @type {[string, number, boolean][]} */ ([['drac', Pdrac, true], ['anom', Panom, false], ['year', Ptrop, false]])) {
      const k = half ? Math.round(2 * span / P) / 2 : Math.round(span / P);
      if (k <= 0) continue;
      const res = span - k * P;
      out[key].push({ n, k, res, shiftDeg: 360 * res / P, spanDays: span });
    }
  }
  const primitive = (/** @type {typeof out.drac} */ list) => { /** @type {typeof out.drac} */ const kept = []; for (const x of list) { if (kept.some((y) => x.n % y.n === 0 && Math.abs(x.k / y.k - x.n / y.n) < 1e-9)) continue; kept.push(x); } return kept; };
  for (const key of Object.keys(out)) out[key] = primitive(out[key].sort((a, b) => Math.abs(a.shiftDeg) - Math.abs(b.shiftDeg)).filter((x) => Math.abs(x.shiftDeg) <= (key === 'anom' ? 3.5 : 1.0))).sort((a, b) => a.n - b.n).slice(0, 6);
  return out;
}
for (const tMa of [1e-6, 400, 1400, 2460, 4000, EDGE_MA]) {
  const el = elementsAt(tMa);
  const r = recurrences(el);
  const fmt = (/** @type {ReturnType<typeof recurrences>['drac']} */ list) => list.map((x) => `${x.n}/${x.k} (${pr(x.spanDays / (el.lodS / 86400), 0)} solar d, ${pr(x.spanDays / (el.tropYearS / 86400), 2)} yr, Δ ${pr(x.shiftDeg, 2)}°/cycle)`).join('; ') || '—';
  console.log(`\n-- age ${tMa} Ma: P_syn ${pr(el.synS / 86400, 4)} d, P_drac ${pr(el.dracS / 86400, 4)} d, P_anom ${pr(el.anomS / 86400, 4)} d, year ${pr(el.tropYearS / 86400, 2)} SI d (${pr(el.tropYearS / el.lodS, 1)} solar d); months per year ${pr(el.tropYearS / el.synS, 2)}`);
  console.log(`   node (|ΔF| ≤ 1°)      : ${fmt(r.drac)}`);
  console.log(`   anomaly (|ΔM′| ≤ 3.5°): ${fmt(r.anom)}`);
  console.log(`   year (|Δλ| ≤ 1°)      : ${fmt(r.year)}`);
}
