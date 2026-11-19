'use strict';
/**
 * PLAN 34 §2.1–2.3 — the ocean-dissipation history, measured before any build (print-only; no repo change).
 *
 * The instrument is the chain's own factory with a DIFFERENT distance artifact injected (`createDeepTimeChain`
 * takes the artifact as a dependency), so an alternative history runs through every quantity the shipped one
 * does — the day, the year count, the composed clock — with no new code path. Three histories beside the shipped
 * Farhat et al. 2022 column:
 *   (1) the RECORD-implied history: Wu et al. 2024's three interval recession rates (2.17 / 7.00 / 3.29 cm/yr over
 *       540–325 / 325–200 / 200–0 Ma) integrated backward from today's distance — a referee, never an input;
 *   (2) a unit BUMP: the Moon 1 R⊕ closer at 250 Ma, a Gaussian 50 Myr wide (FWHM) — the sensitivity table;
 *   (3) a CONSTANT-dissipation recent history (the LLR 3.82 cm/yr held, La2004's assumption) over the last 10 Myr
 *       — the La2004 precession-rate drift's decomposition.
 * Run: node tools/explore/plan34-dissipation-history-measure.cjs
 */
const path = require('node:path');
const P = require('@essrt/physics');
const C = require('../lib/constants');
const DT = require('../lib/deep-time.js');
const { DEEP_MODES_ARTIFACT } = require('@essrt/physics/moon/deep-modes-artifact');
const { MOON_DISTANCE_ARTIFACT: FARHAT } = require('@essrt/physics/deltat/moon-distance-artifact');
const anchors = require(path.join(__dirname, '..', '..', 'data', 'paleo-validation-anchors.json'));

const FLAGS = Object.freeze({ bond: false, hallstatt: false, jose5: false, jose4: false, resonator: false, resonatorDeltaT: false });
const A0_KM = DT.EPOCH_PARAMS.moonDistanceNowM / 1000;   // the model's own J2000 anchor (the artifact is read as a RATIO on it)
const RE_KM = C.earthParallaxRadiusKm;                  // the paleo-anchors gate's own Earth radius for the Wu rows

function buildChain(artifact) {
  return P.createDeepTimeChain({
    constants: P.DEFAULT_CONSTANTS, fitted: P.FITTED_COEFFICIENTS, deepModes: DEEP_MODES_ARTIFACT, moonDistanceArtifact: artifact,
    ageAnchorYear: C.startmodelYear, flagsAt: () => FLAGS, planetAuRatios: {}, stellarDayRaProjection: C.STELLAR_DAY_RA_PROJECTION,
  });
}
/** A copy of the artifact with every distance column multiplied by f(ageMa) (the obliquity columns untouched). */
function scaled(art, f) {
  const out = { ...art };
  for (const k of ['aEarthRadii', 'aMinEarthRadii', 'aMaxEarthRadii']) out[k] = art[k].map((v, i) => v * f(art.ageMa[i]));
  return Object.freeze(out);
}
const farhatRatio = (() => { const m = new Map(FARHAT.ageMa.map((t, i) => [t, FARHAT.aEarthRadii[i] / FARHAT.aEarthRadii[0]])); return (t) => m.get(t); })();

// (1) the record-implied history: Wu's piecewise rates, cm/yr → km over t Myr is rate × t × 10
const WU = [{ to: 200, rate: 3.29 }, { to: 325, rate: 7.00 }, { to: 540, rate: 2.17 }];
function wuDeltaKm(tMa) { let d = 0, from = 0; for (const s of WU) { if (tMa <= from) break; const to = Math.min(tMa, s.to); d += s.rate * (to - from) * 10; from = s.to; } return d; }
const recordFactor = (t) => { const tt = Math.min(t, 540); return (1 - wuDeltaKm(tt) / A0_KM) / farhatRatio(tt); };   // beyond 540 Ma: Farhat's shape, joined at 540
// (2) the step: the Moon 1 R⊕ closer at every age beyond 250 Ma, ramped over 225–275 Ma (a smoothstep) — the reader
//     requires a history monotone into the past, which a two-sided bump is not; the step's far side is the same
//     sensitivity read, per R⊕ of offset
const smooth = (u) => { const x = Math.max(0, Math.min(1, u)); return x * x * (3 - 2 * x); };
const bumpFactor = (t) => 1 - (RE_KM / (farhatRatio(t) * A0_KM)) * smooth((t - 225) / 50);
// (3) the constant-dissipation recent history: 3.82 cm/yr held over the last 10 Myr, Farhat's shape joined beyond
const LLR = 3.82;
const llrFactor = (t) => { const tt = Math.min(t, 10); return (1 - LLR * tt * 10 / A0_KM) / farhatRatio(tt); };

const chains = { shipped: buildChain(FARHAT), record: buildChain(scaled(FARHAT, recordFactor)), bump: buildChain(scaled(FARHAT, bumpFactor)), llr: buildChain(scaled(FARHAT, llrFactor)) };
const beatKyr = (rate) => 1296000 / (rate - 18.74) / 1000;   // the obliquity beat from the composed rate by doc 99's own anchor (ψ̇ − |s₃| − the planetary mean: 42.38″/yr at 61.12), ±0.1 kyr — a labelled approximation
const Q = (ch, t) => ({ aRe: ch.meanMoonDistanceAtAge(t) / RE_KM, lodH: ch.meanLodSecondsAtAge(t) / 3600, days: ch.meanYearInDaysAtAge(t), rate: ch.meanLunisolarPrecessionRateArcsecPerYrAtAge(t), period: ch.meanLunisolarPrecessionPeriodYearsAtAge(t), cosF: ch.precessionObliquityFactorAtAge(t) });
const f2 = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : '—');

console.log('PLAN 34 — the ocean-dissipation history, measured on the shipped chain (print-only)');
console.log(`model anchor ${A0_KM.toFixed(1)} km; Farhat a(0) ${FARHAT.aEarthRadii[0]} R⊕(6378.1366) read as a ratio; Wu rates ${WU.map((s) => `${s.rate} cm/yr to ${s.to} Ma`).join(', ')}`);
console.log('\n§2.1 the record-implied history beside the shipped one (R⊕ = 6371 km as the anchors gate reads)');
console.log('  age Ma | a shipped | a record | Δ km | LOD h shipped/record | days/yr shipped/record | ψ̇ ″/yr shipped/record | beat kyr shipped/record');
for (const t of [0, 100, 200, 250, 300, 325, 380, 400, 500, 540, 650]) {
  const s = Q(chains.shipped, t), r = Q(chains.record, t);
  console.log(`  ${String(t).padStart(5)} | ${f2(s.aRe)} | ${f2(r.aRe)} | ${f2((r.aRe - s.aRe) * RE_KM, 0).padStart(7)} | ${f2(s.lodH)} / ${f2(r.lodH)} | ${f2(s.days, 1)} / ${f2(r.days, 1)} | ${f2(s.rate)} / ${f2(r.rate)} | ${f2(beatKyr(s.rate), 1)} / ${f2(beatKyr(r.rate), 1)}`);
}
console.log('\n  the anchors under each history (the gate\'s three predictors; deviation from the observed value or the range\'s nearer edge):');
const list = Array.isArray(anchors) ? anchors : (anchors.anchors || []);
const pred = { daysPerYear: (ch, t) => ch.meanYearInDaysAtAge(t), lodHr: (ch, t) => ch.meanLodSecondsAtAge(t) / 3600, moonDistanceRE: (ch, t) => ch.meanMoonDistanceCorrectedAtAge(t) / RE_KM };
const dev = (v, a) => { if (a.observed !== undefined) return (v / a.observed - 1) * 100; const [lo, hi] = a.observedRange; return v < lo ? (v / lo - 1) * 100 : v > hi ? (v / hi - 1) * 100 : 0; };
for (const a of list) {
  if (!pred[a.quantity] || a.ageMa === 0 || a.ageMa > 700) continue;
  const vs = pred[a.quantity](chains.shipped, a.ageMa), vr = pred[a.quantity](chains.record, a.ageMa), vb = pred[a.quantity](chains.bump, a.ageMa);
  const obs = a.observed !== undefined ? String(a.observed) : `[${a.observedRange[0]}, ${a.observedRange[1]}]`;
  console.log(`  ${a.id.padEnd(16)} ${String(a.ageMa).padStart(4)} Ma  observed ${obs.padEnd(14)} shipped ${f2(vs)} (${f2(dev(vs, a))} %)  record ${f2(vr)} (${f2(dev(vr, a))} %)  bump ${f2(vb)} (${f2(dev(vb, a))} %)`);
}
console.log('\n§2.2 the sensitivity: the Moon 1 R⊕ closer at every age beyond 250 Ma (a 50-Myr ramp at 225–275) — the change of each quantity, per R⊕');
console.log('  age Ma | Δa R⊕ | ΔLOD min | Δdays/yr | Δψ̇ ″/yr | Δψ̇ % | Δbeat kyr');
for (const t of [100, 200, 250, 300, 325, 380, 400, 500]) {
  const s = Q(chains.shipped, t), b = Q(chains.bump, t);
  console.log(`  ${String(t).padStart(5)} | ${f2(b.aRe - s.aRe, 3)} | ${f2((b.lodH - s.lodH) * 60, 2)} | ${f2(b.days - s.days, 2)} | ${f2(b.rate - s.rate, 3)} | ${f2((b.rate / s.rate - 1) * 100, 2)} | ${f2(beatKyr(b.rate) - beatKyr(s.rate), 2)}`);
}
console.log('\n§2.3 the La2004 precession-rate drift (0.0203″/yr mean over the last 10 Myr, doc 112 §8) decomposed');
const slopeCmYr = (FARHAT.aEarthRadii[0] - FARHAT.aEarthRadii[10]) / FARHAT.aEarthRadii[0] * A0_KM * 1e5 / 1e7;
console.log(`  the cited history's recent slope: ${slopeCmYr.toFixed(2)} cm/yr over the last 10 Myr (LLR today ${LLR}); La2004 holds the dissipation constant`);
let sumFull = 0, sumNoEps = 0, sumLlr = 0, sumEps = 0, n = 0;
console.log('  age Ma | ψ̇ shipped | ψ̇ with cos ε̄ factor removed | ψ̇ on the LLR-constant history | cos factor');
for (let t = 0; t <= 10; t += 1) {
  const s = Q(chains.shipped, t), l = Q(chains.llr, t);
  const noEps = s.rate / s.cosF;
  if (t > 0) { sumFull += s.rate; sumNoEps += noEps; sumLlr += l.rate; sumEps += s.rate - noEps; n++; }
  console.log(`  ${String(t).padStart(5)} | ${f2(s.rate, 4)} | ${f2(noEps, 4)} | ${f2(l.rate, 4)} | ${f2(s.cosF, 6)}`);
}
const p0 = Q(chains.shipped, 0).rate;
console.log(`  means over 1–10 Ma minus today's rate: full ${(sumFull / n - p0).toFixed(4)}″/yr · the a(t) part alone (cos factor removed) ${(sumNoEps / n - p0).toFixed(4)} · the cos ε̄ part ${(sumEps / n).toFixed(4)} · the planetary mean: constant in the model (0)`);
console.log(`  the shipped history against the LLR-constant one, mean over 1–10 Ma: ${((sumFull - sumLlr) / n).toFixed(4)}″/yr  (La2004's drift to explain: 0.0203)`);
// the a(t) part split into its two carriers at 10 Ma: the spin factor ω/ω₀ (= LOD₀/LOD, the hydrostatic J₂ ∝ ω² convention
// of the composed law) and the lunar torque term f_S + (1 − f_S)(a₀/a)³
{
  const s0 = Q(chains.shipped, 0), s10 = Q(chains.shipped, 10);
  const omega = s0.lodH / s10.lodH;
  const lunar = (s10.rate / s10.cosF / p0) / omega;   // what remains of the a(t) part once the spin factor is divided out
  const fS = P.DEFAULT_CONSTANTS.precessionSolarShareJ2000 ?? DT.EPOCH_PARAMS.precessionSolarShareJ2000;
  console.log(`  at 10 Ma: the spin factor ω/ω₀ ${omega.toFixed(6)} (+${((omega - 1) * p0).toFixed(4)}″/yr) · the lunar torque term ${lunar.toFixed(6)} (+${((lunar - 1) * p0).toFixed(4)}″/yr; f_S ${fS}) · cos ε̄ factor +${((s10.cosF - 1) * p0).toFixed(4)}″/yr — the sum is the full ${(s10.rate - p0).toFixed(4)}`);
  console.log(`  reading: La2004's 0.0203″/yr mean difference is ${(0.0203 / ((sumFull / n) - p0) * 100).toFixed(0)} % of the model's own drift over the span — not the history's recent slope (${((sumFull - sumLlr) / n).toFixed(4)}), a quarter of it the cited obliquity's factor (${(sumEps / n).toFixed(4)}); the remainder sits in how the spin enters the law (ω/ω₀ here) against La2004's ellipticity and tidal conventions — a precession-law question, not a dissipation-history one`);
}
console.log('\n§2.1 b — the record against itself: Wu\'s rates integrated from today vs the approach Wu\'s distance anchors imply');
for (const [t, lo, hi] of [[300, 53, 55], [400, 52, 53], [500, 53, 54]]) {
  const byRates = wuDeltaKm(t), byAnchors = (60.27 - (lo + hi) / 2) * RE_KM;
  console.log(`  ${t} Ma: approach by Wu's rates ${byRates.toFixed(0)} km (${(byRates / RE_KM).toFixed(2)} R⊕) · by Wu's anchor midpoint ${byAnchors.toFixed(0)} km (${(byAnchors / RE_KM).toFixed(2)} R⊕) · ratio ${(byAnchors / byRates).toFixed(1)}× · the cited history's own approach ${((60.27 - Q(chains.shipped, t).aRe) * RE_KM).toFixed(0)} km`);
}
