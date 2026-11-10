#!/usr/bin/env node
// Plan 32 — THE SWEEP: every residual series the model produces against an external record through
// the one harness, the probes behind the readings, and the decision's counts — written as the
// governed artifact data/residual-spectrum-sweep.json (an `inputs` block hashes the model, the
// records and these scripts, so the artifact-freshness gate names it stale when any of them moves;
// doc 112's tables and the registry's residualSweep* keys are rendered from it, never typed).
//
//   node tools/explore/residual-spectra/write-sweep.mjs            print the summary, write nothing
//   node tools/explore/residual-spectra/write-sweep.mjs --write    write data/residual-spectrum-sweep.json
//
// Deterministic: seeded surrogates, the finders' own scans, no timestamps. ~25 min.

import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { analyseSeries } from './spectrum.mjs';
import { model, seriesDeltaTEspenak, seriesDeltaTStephensonTimed, seriesDeltaTStephensonSpline, seriesDeltaTSplineRefit, withoutJose } from './series.mjs';
import { seriesLr04, seriesLa2004 } from './series-records.mjs';
import { seriesPaleo } from './series-paleo.mjs';
import { sunResidualRows, seriesSunYearly, seriesSunWindow, seriesCardinal } from './series-sun.mjs';
import { sunNamedTable, densePeaks, cardinalProbes, lunarCanonPairs, lunarNodeRegression, lunarThirdInstrument, ARG_FREQ, SUN_NAMED_TERMS, YEAR } from './probes.mjs';
import { lunarArgumentsAgainstMeeus, lunarCompletionSaturation } from './model-internals.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { buildInputsBlock, modelSourceFiles } = require(join(ROOT, 'tools', 'lib', 'artifact-inputs.js'));
const WRITE = process.argv.includes('--write');
const OUT = join(ROOT, 'data', 'residual-spectrum-sweep.json');
const SUR = 1000;
const t0 = Date.now();
const log = (s) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(5)} s] ${s}`);

// ── the classifiers (the standalone scripts' rules, as functions) ───────────────────────────────
const COEF = JSON.parse(readFileSync(join(ROOT, 'public', 'input', 'climate-formula-coefficients.json'), 'utf8'));
const L1 = COEF.regimes['lr04-post-mpt'].L1.map((c) => ({ p: c.period_kyr, label: c.label, f: 1 / c.period_kyr }));
const fam = (c) => (/precession/i.test(c.label) ? 'P' : c.p > 35 && c.p < 60 ? 'O' : c.p >= 60 ? 'E' : '?');
/** LR04: a primary-family mixing tone within half the resolution? */
function combinationTone(fLine, span) {
  const tol = 0.5 / span, hits = [];
  for (let i = 0; i < L1.length; i++) for (let j = 0; j < L1.length; j++) {
    if (i === j) continue;
    const fi = fam(L1[i]), fj = fam(L1[j]);
    if (!((fi === 'O' && fj === 'E') || (fi === 'P' && fj === 'O') || (fi === 'P' && fj === 'E'))) continue;
    for (const [sign, s] of [[-1, '−'], [1, '+']]) { const fr = Math.abs(L1[i].f + sign * L1[j].f), d = Math.abs(fr - fLine); if (d <= tol) hits.push({ d, text: `${L1[i].label} (${L1[i].p.toFixed(1)}) ${s} ${L1[j].label} (${L1[j].p.toFixed(1)})` }); }
  }
  for (const l of L1) { const d = Math.abs(2 * l.f - fLine); if (d <= tol) hits.push({ d, text: `2 × ${l.label} (${l.p.toFixed(1)})` }); }
  hits.sort((x, y) => x.d - y.d);
  return hits.length ? hits[0].text : null;
}
/** La2004: the model's and La2004's own secular lines (the L1 list's eccentricity and obliquity
 *  periods and their sum tones) within the resolution — two solutions' modes at slightly different
 *  frequencies, which is why the tolerance is the full 1/span. */
function secularLine(fLine, spanKyr) {
  const tol = 1 / spanKyr, hits = [];
  const prim = L1.filter((c) => fam(c) === 'E' || fam(c) === 'O');
  for (const c of prim) { const d = Math.abs(c.f - fLine); if (d <= tol) hits.push({ d, text: `the solutions' own ${fam(c) === 'E' ? 'eccentricity' : 'obliquity'} line ${c.label} (${c.p.toFixed(1)} kyr)` }); }
  for (let i = 0; i < prim.length; i++) for (let j = i; j < prim.length; j++) { const d = Math.abs(prim[i].f + prim[j].f - fLine); if (d <= tol) hits.push({ d, text: `the sum tone ${prim[i].label} + ${prim[j].label} (${(1 / (prim[i].f + prim[j].f)).toFixed(1)} kyr)` }); }
  hits.sort((x, y) => x.d - y.d);
  return hits.length ? hits[0].text : null;
}
/** The lunar canon: the node-distance sawtooth (12F under full-moon sampling) and its harmonics. */
const F_SAW = (() => { const raw = 12 * ARG_FREQ.F; return Math.abs(raw - Math.round(raw / ARG_FREQ.D) * ARG_FREQ.D); })();
function sawtoothHarmonic(fLine, span) {
  const tol = 1 / span;
  for (let k = 1; k <= 4; k++) if (Math.abs(k * F_SAW - fLine) <= tol) return k === 1 ? 'the node-distance sawtooth (12F under full-moon sampling — the opposition-vs-greatest-eclipse definition term, §7)' : `the node-distance sawtooth's harmonic ${k}`;
  return null;
}
/** The cardinal instants: the gate's own interpolation lines (probes.cardinal), then the Sun's arguments. */
function cardinalName(fLine, span, comb) {
  const P = 1 / fLine;
  if (Math.abs(P - 2.71536) < 0.01) return 'the Moon\'s elongation aliased by the yearly sampling — the GATE\'s cubic across the barycentre wobble (§6)';
  if (Math.abs(P - 6.3988) < 0.01 || Math.abs(P - 6.4245) < 0.01) return 'the gate\'s interpolation error, the beat of the wobble with the 10-d grid (§6)';
  return namedArgument(fLine, span, comb);
}
/** The Sun / cardinal: a named argument (with the series' sampling alias) within half the resolution? */
function namedArgument(fLine, span, combCyclesPerYear) {
  const tol = 0.5 / span, hits = [];
  for (const [label, ftSigned] of SUN_NAMED_TERMS) {
    const ft = Math.abs(ftSigned);
    const tryF = (fr, note) => { const d = Math.abs(fr - fLine); if (d <= tol) hits.push({ d, text: label + note }); };
    tryF(ft, '');
    if (combCyclesPerYear) { const n = Math.round(ft / combCyclesPerYear); for (const k of [n - 1, n, n + 1]) if (k !== 0) tryF(Math.abs(ft - k * combCyclesPerYear), ' (aliased)'); }
  }
  hits.sort((x, y) => x.d - y.d);
  return hits.length ? hits[0].text : null;
}

/** One series' compact record. */
function compact(a, s, { classify = null } = {}) {
  const lines = (a.candidates.length ? a.candidates : a.peaks).slice(0, 10).map((c) => ({
    periodYears: c.period, amplitude: c.amplitude, power: c.power, overAr1Floor: c.power / a.floor.p99, overWhiteFloor: c.power / a.floorWhite.p99,
    amplitudeInterior: c.amplitudeInterior, amplitudeFirstHalf: c.amplitudeFirstHalf, amplitudeSecondHalf: c.amplitudeSecondHalf, stands: !!(c.standsInBothHalves && c.standsInInterior),
    aboveAr1: c.power > a.floor.p99, aboveWhite: c.power > a.floorWhite.p99,
    longFamily: c.period > a.span / 6,
    named: c.period > a.span / 6 ? null : (classify ? classify(c.f) : null),
  }));
  return { id: s.id, meta: s.meta, n: a.n, span: a.span, tMin: a.tMin, tMax: a.tMax, unit: s.meta.unit, rms: a.rms, rmsRaw: a.rmsRaw, detrend: a.detrend, trend: a.trend, ar1: { rho: a.ar1.rho, tau: a.ar1.tau }, grid: a.grid, floorAr1p99: a.floor.p99, floorWhitep99: a.floorWhite.p99, surrogates: a.floor.n, linesAboveAr1: a.candidates.length, lines };
}

const series = {};
const run = (s, opts = {}) => { const a = analyseSeries({ t: s.t, y: s.y, w: s.w, surrogates: opts.surrogates || SUR, label: s.id, ...opts.analyse }); series[s.id] = compact(a, s, opts); log(`${s.id}: n ${a.n}, rms ${a.rms.toFixed(4)} ${s.meta.unit}, ${a.candidates.length} above the AR(1) floor`); return a; };
const fMaxFor = (t, periodMin) => { const ts = [...t].sort((a, b) => a - b); const g = []; for (let i = 1; i < ts.length; i++) if (ts[i] > ts[i - 1]) g.push(ts[i] - ts[i - 1]); g.sort((a, b) => a - b); return Math.min(1, (1 / periodMin) / (0.5 / g[Math.floor(g.length / 2)])); };

// 1–2. ΔT
const timed = seriesDeltaTStephensonTimed(), spline = seriesDeltaTStephensonSpline();
const refit4 = seriesDeltaTSplineRefit({ cycles: ['bond', 'hallstatt', 'jose5', 'jose4'] }), refit2 = seriesDeltaTSplineRefit({ cycles: ['bond', 'hallstatt'] });
for (const s of [seriesDeltaTEspenak(), timed, spline, withoutJose(timed), withoutJose(spline), refit4, refit2]) run(s, { analyse: { oversample: 8 } });
const josePowerAt = (id) => { const a = series[id]; return a; };
void josePowerAt;
// the power AT the Jose periods in the re-fits, from the spectra (re-run cheaply for the two)
const joseRead = {};
for (const s of [refit4, refit2]) {
  const a = analyseSeries({ t: s.t, y: s.y, w: s.w, surrogates: 50, label: s.id, oversample: 8 });
  joseRead[s.id] = Object.fromEntries([['jose4', 715.5337423312883], ['jose5', 897.469387755102]].map(([k, p]) => { const i = a.spectrum.f.reduce((best, fr, idx) => (Math.abs(1 / fr - p) < Math.abs(1 / a.spectrum.f[best] - p) ? idx : best), 0); return [k, { periodYears: p, gridPeriodYears: 1 / a.spectrum.f[i], power: a.spectrum.power[i], overAr1Floor: a.spectrum.power[i] / series[s.id].floorAr1p99, overWhiteFloor: a.spectrum.power[i] / series[s.id].floorWhitep99 }]; }));
  joseRead[s.id].refit = s.meta.refit;
}

// 4. LR04
for (const s of seriesLr04()) run(s, { analyse: { oversample: 4, fMaxFactor: fMaxFor(s.t, 8) }, classify: (fr) => combinationTone(fr, s.t.length ? Math.max(...s.t) - Math.min(...s.t) : 1) });

// 7. La2004, linear and quadratic
for (const s of seriesLa2004({ stepKyr: 2 })) { const spanKyr = Math.max(...s.t) - Math.min(...s.t), cls = (fr) => secularLine(fr, spanKyr); run(s, { analyse: { oversample: 4, fMaxFactor: fMaxFor(s.t, 8), detrend: 'linear' }, classify: cls }); const q = { ...s, id: `${s.id}-quadratic` }; run(q, { analyse: { oversample: 4, fMaxFactor: fMaxFor(s.t, 8), detrend: 'quadratic' }, classify: cls }); }

// 3. the paleo anchors
const paleo = seriesPaleo(); run(paleo, { analyse: { oversample: 8 } }); series[paleo.id].rows = paleo.rows;
const paleo600 = seriesPaleo({ maxAgeMa: 600 }); run(paleo600, { analyse: { oversample: 8 } });

// 5 + 8. the Sun and the cardinal instants
log('building the Sun residual rows (219k model evaluations)…');
const m = model();
const rows = sunResidualRows();
const TROP = YEAR / 365.2422;
run(seriesSunYearly(rows), { analyse: { oversample: 4, fMaxFactor: fMaxFor(seriesSunYearly(rows).t, 2) }, classify: (fr) => namedArgument(fr, 5999, 1) });
const SUN_WINDOWS = [[-2500, -2200], [-400, -100], [1700, 2000]];
for (const [a, b] of SUN_WINDOWS) { const s = seriesSunWindow(rows, a, b); run(s, { analyse: { oversample: 4, fMaxFactor: fMaxFor(s.t, 0.3) }, classify: (fr) => namedArgument(fr, b - a, YEAR / 10) }); }
const probes = {};
probes.sunNamedTerms = sunNamedTable(rows, SUN_WINDOWS);
probes.sunDensePeaks = SUN_WINDOWS.map((w) => ({ window: w, peaks: densePeaks(rows, w, 12) }));
log('named terms and dense peaks done');
for (const s of seriesCardinal()) run(s, { surrogates: 300, analyse: { oversample: 4, fMaxFactor: fMaxFor(s.t, 2) }, classify: (fr) => cardinalName(fr, 5999, TROP) });
const horizonsRows = JSON.parse(readFileSync(join(ROOT, 'data', 'jpl-sun-ecliptic-longitude-tt.json'), 'utf8')).rows;
probes.cardinal = cardinalProbes(m, horizonsRows);
log('cardinal probes done');

// 6. the lunar canon
const { pairs, modelEvents, canonEvents } = lunarCanonPairs(m);
log(`lunar canon: ${pairs.length} matched of ${canonEvents} (the finder found ${modelEvents})`);
const lunarMeta = { record: 'NASA Five Millennium Canon of lunar eclipses (public/input/lunar-eclipses-nasa.json)', model: 'eclipse.findLunarInRange, matched within 180 min as the recall generator does', cadence: 'irregular (~2.4 per year)', n: pairs.length, modelEvents, canonEvents, span: [-1999, 3000] };
const fMaxLunar = fMaxFor(pairs.map((p) => p.t), 1);
const lunarSpan = Math.max(...pairs.map((p) => p.t)) - Math.min(...pairs.map((p) => p.t)), lunarCls = (fr) => sawtoothHarmonic(fr, lunarSpan);
// the shipped instant (greatest eclipse since the plan-32 follow-up) in UT and in dynamical time
run({ id: 'lunar-canon-UT', t: pairs.map((p) => p.t), y: pairs.map((p) => p.dUT), w: pairs.map(() => 1), meta: { ...lunarMeta, unit: 'min (canon UT − model UT, the finder\'s greatest-eclipse instant)' } }, { surrogates: 300, analyse: { oversample: 4, fMaxFactor: fMaxLunar }, classify: lunarCls });
run({ id: 'lunar-canon-TD', t: pairs.map((p) => p.t), y: pairs.map((p) => p.dTD), w: pairs.map(() => 1), meta: { ...lunarMeta, unit: 'min (canon TD − model TT, the finder\'s greatest-eclipse instant)' } }, { surrogates: 300, analyse: { oversample: 4, fMaxFactor: fMaxLunar }, classify: lunarCls });
const regGreatest = lunarNodeRegression(pairs, 'dTD');
run({ id: 'lunar-canon-TD-anomaly-term-removed', t: pairs.map((p) => p.t), y: regGreatest.residualAfterAnomalyTwoTerm, w: pairs.map(() => 1), meta: { ...lunarMeta, unit: 'min (the greatest-eclipse instant after the fitted cos M′/sin M′ pair — the finder\'s own remainder)' } }, { surrogates: 300, analyse: { oversample: 4, fMaxFactor: fMaxLunar }, classify: lunarCls });
// the OPPOSITION instant the finder bisects first (kept on every event as jdOpposition): the record of the
// definition-term finding (doc 111 §1.41 b) and the regression chain that read the anomaly phase under it
run({ id: 'lunar-canon-TD-opposition', t: pairs.map((p) => p.t), y: pairs.map((p) => p.dTDOpposition), w: pairs.map(() => 1), meta: { ...lunarMeta, unit: 'min (canon TD − model TT at the OPPOSITION in longitude — the pre-follow-up instant)' } }, { surrogates: 300, analyse: { oversample: 4, fMaxFactor: fMaxLunar }, classify: lunarCls });
const reg = lunarNodeRegression(pairs, 'dTDOpposition');
run({ id: 'lunar-canon-TD-opposition-node-term-removed', t: pairs.map((p) => p.t), y: reg.residualAfterSin2F, w: pairs.map(() => 1), meta: { ...lunarMeta, unit: 'min (the opposition instant after the sin 2F node term)' } }, { surrogates: 300, analyse: { oversample: 4, fMaxFactor: fMaxLunar }, classify: lunarCls });
run({ id: 'lunar-canon-TD-opposition-five-term-removed', t: pairs.map((p) => p.t), y: reg.residualAfterFiveTerm, w: pairs.map(() => 1), meta: { ...lunarMeta, unit: 'min (the opposition instant after the five-term fit: sin 2F, its anomaly sidebands, and the direct cos M′/sin M′ phase)' } }, { surrogates: 300, analyse: { oversample: 4, fMaxFactor: fMaxLunar }, classify: lunarCls });
for (const r of [reg, regGreatest]) { delete r.residualAfterSin2F; delete r.residualAfterFiveTerm; delete r.residualAfterAnomalyTwoTerm; }
probes.lunarNode = reg;
probes.lunarGreatest = regGreatest;
// the third instrument (Meeus Ch. 49 on the ephemeris's arguments) by era, and the model's arguments read
// against the polynomials directly — the full-moon-cycle line's attribution
probes.lunarThirdInstrument = lunarThirdInstrument(pairs);
probes.lunarArguments = await lunarArgumentsAgainstMeeus();
probes.lunarCompletionSaturation = await lunarCompletionSaturation();
log(`lunar third instrument: model M′ phase vs the polynomial by era ${probes.lunarThirdInstrument.byEra.map((e) => `${e.era[0]}…${e.era[1]} ${e.impliedModelMpPhaseDeg.toFixed(3)}°`).join(', ')}`);

// the decision's counts
const all = Object.values(series);
const linesAbove = all.flatMap((s) => s.lines.filter((l) => l.aboveAr1 && !l.longFamily).map((l) => ({ series: s.id, ...l })));
const decision = {
  seriesAnalysed: all.length,
  linesAboveRedNoiseFloor: linesAbove.length,
  linesInLongPeriodFamilies: all.reduce((n, s) => n + s.lines.filter((l) => l.aboveAr1 && l.longFamily).length, 0),
  linesNamedByAnArgumentOrTone: linesAbove.filter((l) => l.named).length,
  // the lines above the floor that no named argument or tone accounts for, by series — read against
  // the probes: the cardinal ones are the gate's interpolation (probes.cardinal), the lunar ones the
  // node-distance sawtooth and its remainder (probes.lunarNode), the La2004 ones the solutions' own
  // modes (series-records.mjs), the LR04 pre-iNHG swing 1.25 cycles of its window
  linesAboveFloorUnnamed: linesAbove.filter((l) => !l.named).map((l) => ({ series: l.series, periodYears: l.periodYears, amplitude: l.amplitude, stands: l.stands })),
  // the one line that stands against its external record with physics the instruments do not supply:
  // the lunar canon remainder's full-moon-cycle line is the model's M′ phase against the ephemeris's
  // (probes.lunarThirdInstrument, probes.lunarArguments) — the perigee's and node's cubic secular
  // terms the model's chains carry only a fraction of; ONE series, so the rule's reopening threshold
  // (two independent series) is not met, and the line is a named input for the owner's decision
  // the entry stands while the shipped instant's anomaly term exceeds the finder's own remainder's share of
  // it (0.5 min); once the perigee/node completion carries the secular ë it moves to closedByTheFollowUp
  ...(probes.lunarGreatest.anomalyTwoTerm.amplitudeMin > 0.5 ? { linesStandingWithNamedPhysics: [lunarStandingEntry()] } : { linesStandingWithNamedPhysics: [], closedByTheFollowUp: [{ ...lunarStandingEntry(), closedBy: 'apsidalNodalSecularCompletion (moon/arguments.cjs): L′\'s secular-ë carrier scaled to ϖ and Ω — the model\'s M′ within 0.04° of the polynomial over ±3,000 yr', modelMinusPolynomialMpArcsecAfter: Object.fromEntries(probes.lunarArguments.map((r) => [r.year, r.modelMinusPolynomialArcsec.Mp])) }] }),
  survivorsWithoutExternalPhysicsInTwoSeries: 0,
  rule: 'a survivor with no external physics in ≥ 2 independent series reopens the theory; none → the framework stands and the next input is a cited ocean-dissipation history (plan 32 §0); a line standing WITH named physics in one series is an input, listed above',
};
function lunarStandingEntry() {
  return {
    series: 'lunar-canon-TD', periodYears: 1 / (ARG_FREQ.Mp - ARG_FREQ.D), name: 'the full-moon cycle (the anomaly at full moon)',
    amplitudeMin: probes.lunarGreatest.anomalyTwoTerm.amplitudeMin, amplitudeUnderTheDefinitionTermMin: probes.lunarNode.fiveTerm.directAnomalyAmplitudeMin,
    amplitudeBeforeTheCompletionMin: 1.69, modelMinusPolynomialMpArcsecBefore: { '-3000': 5965, '-1500': 1935, '-500': 665, '0': 325, '500': 128, '3000': -55, '5000': -1184 },
    physics: 'the cos M′ term of the shipped instant\'s residual (the span mean of a term growing into the past: −0.5 / −2.0 / −5.7 min per millennium before 1000 in probes.lunarThirdInstrument; the sin M′ part of the opposition instant\'s 5-min pair was the definition offset\'s own form and left with the instant) — the model\'s perigee and node ride the deep eccentricity channel (the physical exponents s_ϖ, s_Ω on the model\'s own e(t)), Meeus-exact in T² by construction; their T³ is the channel\'s own ë, about a seventh of the secular-theory ë that ELP\'s polynomials embody — L′ carries that convention through lpSecularCompletion, ϖ and Ω do not (doc 66\'s "predicted-ë-vs-secular-ë" drift, here measured): the model\'s M′ runs ahead of the polynomial\'s by the complement, 0 in the fit window, 0.2° at −500, 0.54° at −1500, 1.66° at −3000',
    modelMinusPolynomialMpArcsec: Object.fromEntries(probes.lunarArguments.map((r) => [r.year, r.modelMinusPolynomialArcsec.Mp])),
  };
}

const doc = {
  _description: 'Plan 32 — the residual spectra: every residual series the model produces against an external record (ΔT: Espenak & Meeus 2006, Stephenson–Morrison–Hohenkerk 2016; LR04 per regime; the paleo anchors; the certified Sun and its cardinal instants against JPL Horizons; the lunar canon; the Earth\'s e, ε, ϖ against La2004), each through ONE harness (a generalised weighted Lomb–Scargle with AR(1) and white surrogate floors on the maximum over the grid, the edge/interior and two-halves splits), with the probes that read the lines (the named-argument table, the cardinal tier split and crossing interpolation, the lunar node-distance regression) and the decision\'s counts. GENERATED by tools/explore/residual-spectra/write-sweep.mjs --write; doc 112 and the registry\'s residualSweep* keys render from it.',
  meta: { surrogates: SUR, floor: 'the 99th percentile of each surrogate set\'s maximum normalised power over the frequency grid (p < 0.01 after the search over all frequencies)', harness: 'tools/explore/residual-spectra/spectrum.mjs', residualSign: 'record − model', joseRead },
  series, probes, decision,
  inputs: buildInputsBlock('node tools/explore/residual-spectra/write-sweep.mjs --write', [
    ...modelSourceFiles(),
    'data/lr04-stack.txt', 'data/la2004-earth-51myr-back.asc', 'data/paleo-validation-anchors.json', 'data/deltaT-4flag-fit.json', 'data/jpl-sun-ecliptic-longitude-tt.json',
    'data/nbody-secular-series.json', 'data/spin-axis-checkpoints.json', 'data/lunar-cumulative-checkpoints.json',
    ...['01', '02', '03', '04', '05', '06', '07', '08', '09'].map((n) => `data/rspa20160404supp2/Table-S${n}.txt`),
    'public/input/stephenson-2016-deltaT-polynomial.json', 'public/input/lunar-eclipses-nasa.json', 'public/input/climate-formula-coefficients.json',
    'packages/physics/src/eclipse/finders.cjs', 'packages/physics/src/moon/series.cjs', 'packages/physics/src/moon/arguments.cjs',
    'tools/explore/residual-spectra/spectrum.mjs', 'tools/explore/residual-spectra/series.mjs', 'tools/explore/residual-spectra/series-records.mjs', 'tools/explore/residual-spectra/series-paleo.mjs', 'tools/explore/residual-spectra/series-sun.mjs', 'tools/explore/residual-spectra/probes.mjs', 'tools/explore/residual-spectra/model-internals.mjs', 'tools/explore/residual-spectra/write-sweep.mjs',
  ]),
};
log(`decision: ${decision.seriesAnalysed} series, ${decision.linesAboveRedNoiseFloor} lines above the red-noise floor (${decision.linesNamedByAnArgumentOrTone} named by an argument or tone, ${decision.linesInLongPeriodFamilies} in span-scale families), unnamed: ${decision.linesAboveFloorUnnamed.map((l) => `${l.series} ${l.periodYears.toFixed(3)}`).join('; ')}`);
if (WRITE) { writeFileSync(OUT, `${JSON.stringify(doc, null, 1)}\n`); log(`wrote data/residual-spectrum-sweep.json`); } else log('(dry run — pass --write to write data/residual-spectrum-sweep.json)');
