// Plan 32 — the probes behind the classifier's readings, as functions the sweep generator and the
// standalone probe scripts share (one implementation of each measurement).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { lsFitAtOmega, frequencyGrid, periodogram } from './spectrum.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { J2000_JD } = require('@essrt/physics/constants/units');
export const YEAR = 365.25;
const wrap180 = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const yearOf = (jd) => 2000 + (jd - J2000_JD) / 365.25;

/** The mean arguments' J2000 periods (days) and frequencies (cycles per Julian year). */
export const ARG_PERIODS_DAYS = { D: 29.530588853, Mp: 27.554549878, F: 27.212220817, M: 365.259636, L: 365.256363, V: 224.70069, Ma: 686.97985, J: 4332.589, S: 10759.22, Om: 6798.38, peri: 3232.6054, Ltrop: 27.321582 };
export const ARG_FREQ = Object.fromEntries(Object.entries(ARG_PERIODS_DAYS).map(([k, d]) => [k, YEAR / d]));
const f = ARG_FREQ;

/** The named terms of the Sun's geocentric longitude whose residual the sweep reads directly. */
export const SUN_NAMED_TERMS = [
  ['D (the barycentre term)', f.D], ['D − M′', Math.abs(f.D - f.Mp)], ['D + M′', f.D + f.Mp], ['D − M', f.D - f.M], ['D + M', f.D + f.M], ['M′', f.Mp],
  ['annual (M)', f.M], ['semi-annual (2M)', 2 * f.M],
  ['V − E', f.V - f.L], ['2V − 2E', 2 * (f.V - f.L)], ['2V − 3E', Math.abs(2 * f.V - 3 * f.L)], ['3V − 4E', Math.abs(3 * f.V - 4 * f.L)], ['3V − 5E', Math.abs(3 * f.V - 5 * f.L)],
  ['E − J', f.L - f.J], ['2E − 2J', 2 * (f.L - f.J)], ['J', f.J], ['2E − 2Mars', Math.abs(2 * f.L - 2 * f.Ma)],
  ['the lunar node Ω (nutation)', f.Om],
];

/** A: the Sun residual fitted at the named terms in each window: amplitude (″) and phase (°). */
export function sunNamedTable(rows, windows) {
  const out = [];
  for (const [a, b] of windows) {
    const sel = rows.filter((x) => x.t >= a && x.t < b), t = sel.map((x) => x.t), y = sel.map((x) => x.y), w = sel.map(() => 1);
    const terms = SUN_NAMED_TERMS.map(([label, fr]) => { const fit = lsFitAtOmega(t, y, w, 2 * Math.PI * fr); return { label, periodYears: 1 / fr, amplitudeArcsec: fit.amplitude, phaseDeg: Math.atan2(fit.c, fit.b) * 180 / Math.PI }; });
    out.push({ window: [a, b], n: t.length, rmsArcsec: Math.sqrt(y.reduce((s, v) => s + v * v, 0) / y.length), terms });
  }
  return out;
}

/** The strongest peaks of a dense window's periodogram down to the sampling's Nyquist, with each
 *  peak's alias under yearly sampling at the tropical year (the cardinal series' comb). */
export function densePeaks(rows, window, top = 12) {
  const TROP = YEAR / 365.2422;
  const sel = rows.filter((x) => x.t >= window[0] && x.t < window[1]), t = sel.map((x) => x.t), y = sel.map((x) => x.y), w = sel.map(() => 1);
  const freqs = frequencyGrid(t, { oversample: 4, fMaxFactor: 1 }), power = periodogram(t, y, w, freqs);
  const peaks = [];
  for (let i = 1; i < freqs.length - 1; i++) if (power[i] > power[i - 1] && power[i] >= power[i + 1]) peaks.push({ f: freqs[i], power: power[i] });
  peaks.sort((x, y2) => y2.power - x.power);
  return peaks.slice(0, top).map((p) => { const r = ((p.f % TROP) + TROP) % TROP, al = Math.min(r, TROP - r); return { periodDays: YEAR / p.f, periodYears: 1 / p.f, amplitudeArcsec: lsFitAtOmega(t, y, w, 2 * Math.PI * p.f).amplitude, yearlyAliasYears: 1 / al }; });
}

/** The Horizons crossing of `target` inside cell i by a Lagrange interpolant through n rows. */
function crossing(rows, i, target, n, valueOf) {
  const lo = i - (n / 2 - 1), P = [];
  for (let k = 0; k < n; k++) P.push([rows[lo + k][0], valueOf(lo + k)]);
  const t0 = P[0][0], x = P.map((p) => p[0] - t0), base = P[n / 2 - 1][1];
  const yv = P.map((p) => base + wrap180(p[1] - base)), tgt = base + wrap180(target - base);
  const L = (t) => { let s = 0; for (let j = 0; j < n; j++) { let l = yv[j]; for (let k = 0; k < n; k++) if (k !== j) l *= (t - x[k]) / (x[j] - x[k]); s += l; } return s; };
  const dL = (t, h = 1e-3) => (L(t + h) - L(t - h)) / (2 * h);
  const a = n / 2 - 1;
  let t = x[a] + (tgt - yv[a]) / (yv[a + 1] - yv[a]) * (x[a + 1] - x[a]);
  for (let k = 0; k < 12; k++) { const g = L(t) - tgt; t -= g / dL(t); if (Math.abs(g) < 1e-10) break; }
  return t0 + t;
}
const meanD = (jdTT) => { const T = (jdTT - 2451545) / 36525; return (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * Math.PI / 180; };
const wobbleDeg = (jdTT) => 6.44 / 3600 * Math.sin(meanD(jdTT));

/** B: the cardinal series split into the apparent Sun's part and the cardinal tier's part, and the
 *  gate's crossing method against a quintic and a de-wobbled cubic (one type suffices for the
 *  attribution; the split is read for all four). Minutes of time throughout. */
export function cardinalProbes(m, horizonsRows, { typesForSplit = ['VE', 'SS', 'AE', 'WS'], typeForInterp = 'VE' } = {}) {
  const rows = horizonsRows;
  const dTs = (jd) => m.eclipse.deltaTSecondsAtJD(jd);
  const utForTT = (jdTT) => { let ut = jdTT - dTs(jdTT) / 86400; ut = jdTT - dTs(ut) / 86400; return jdTT - dTs(ut) / 86400; };
  const BRIDGE_DAYS = m.eclipse.ttBridgeSeconds / 86400;
  const ttOf = (jdUT) => { const jb = jdUT + BRIDGE_DAYS; return jb + dTs(jb) / 86400; };
  const RATE = 360 * 3600 / (365.2422 * 1440);
  const TARGETS = { VE: 0, SS: 90, AE: 180, WS: 270 };
  const lonRow = (k) => rows[k][1], lonRowNoWobble = (k) => rows[k][1] - wobbleDeg(rows[k][0]);
  const methods = {
    cubic4: (i, target) => crossing(rows, i, target, 4, lonRow),
    quintic6: (i, target) => crossing(rows, i, target, 6, lonRow),
    cubic4Dewobbled: (i, target) => { let jd = crossing(rows, i, target, 4, lonRowNoWobble); for (let k = 0; k < 3; k++) jd = crossing(rows, i, target - wobbleDeg(jd), 4, lonRowNoWobble); return jd; },
  };
  const split = Object.fromEntries(typesForSplit.map((k) => [k, { t: [], total: [], app: [], tier: [] }]));
  const interp = Object.fromEntries(Object.keys(methods).map((k) => [k, { t: [], sunPart: [] }]));
  for (let i = 2; i < rows.length - 3; i++) {
    const a = rows[i][1], b = rows[i + 1][1];
    for (const [type, target] of Object.entries(TARGETS)) {
      const da = wrap180(a - target), db = wrap180(b - target);
      if (!(da < 0 && db >= 0 && (db - da) < 40)) continue;
      const jdH = methods.cubic4(i, target), yH = yearOf(jdH);
      if (typesForSplit.includes(type)) {
        const year = Math.round(yH - 0.5 + (target / 360));
        let jdM = m.cardinal.jd(year, type), dMin = (ttOf(jdM) - jdH) * 1440;
        if (Math.abs(dMin) > 60 * 1440) { jdM = m.cardinal.jd(year + (dMin < 0 ? 1 : -1), type); dMin = (ttOf(jdM) - jdH) * 1440; }
        const appMin = -wrap180(m.eclipse.sunApparentLonDegAtJD(utForTT(jdH)) - target) * 3600 / RATE;
        split[type].t.push(yH); split[type].total.push(-dMin); split[type].app.push(-appMin); split[type].tier.push(-dMin + appMin);
      }
      if (type === typeForInterp) for (const [name, fn] of Object.entries(methods)) { const jd = fn(i, target); interp[name].t.push(yearOf(jd)); interp[name].sunPart.push(wrap180(m.eclipse.sunApparentLonDegAtJD(utForTT(jd)) - target) * 3600 / RATE); }
    }
  }
  const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
  const PERIODS = { dAlias: 2.71536, doubletA: 6.3988, doubletB: 6.4245, venus2V3E: 3.9834, venus3V5E: 8.1020, dMinusMpAlias: 8.8474 };
  const amps = (t, y) => { const w = t.map(() => 1); return Object.fromEntries(Object.entries(PERIODS).map(([k, P]) => [k, lsFitAtOmega(t, y, w, 2 * Math.PI / P).amplitude])); };
  return {
    split: Object.fromEntries(Object.entries(split).map(([type, s]) => [type, { n: s.t.length, rmsTotalMin: rms(s.total), rmsSunPartMin: rms(s.app), rmsTierPartMin: rms(s.tier), amplitudesMin: { total: amps(s.t, s.total), sunPart: amps(s.t, s.app), tierPart: amps(s.t, s.tier) } }])),
    interpolation: Object.fromEntries(Object.entries(interp).map(([name, s]) => [name, { type: typeForInterp, n: s.t.length, rmsSunPartMin: rms(s.sunPart), amplitudesMin: amps(s.t, s.sunPart) }])),
  };
}

/** C: the lunar canon matched to the model's finder (the recall generator's rule), with the
 *  dynamical-time residual and the node distance of the mean argument of latitude. */
export function lunarCanonPairs(m, { startYear = -1999, endYear = 3000, matchMin = 180 } = {}) {
  const canon = JSON.parse(readFileSync(join(ROOT, 'public', 'input', 'lunar-eclipses-nasa.json'), 'utf8'));
  const events = [];
  for (let yr = startYear; yr < endYear; yr += 100) events.push(...m.eclipse.findLunarInRange(m.time.jdFromYear(yr), m.time.jdFromYear(Math.min(yr + 100, endYear + 1))));
  events.sort((x, y) => x.jd - y.jd);
  const jdStart = m.time.jdFromYear(startYear), jdEnd = m.time.jdFromYear(endYear + 1);
  const nasa = canon.entries.filter((e) => e.jd >= jdStart && e.jd <= jdEnd);
  const used = new Uint8Array(nasa.length);
  const bsearch = (jd) => { let lo = 0, hi = nasa.length; while (lo < hi) { const mid = (lo + hi) >>> 1; if (nasa[mid].jd < jd) lo = mid + 1; else hi = mid; } return lo; };
  const BRIDGE_DAYS = m.eclipse.ttBridgeSeconds / 86400;
  const ttOf = (jdUT) => { const jb = jdUT + BRIDGE_DAYS; return jb + m.eclipse.deltaTSecondsAtJD(jb) / 86400; };
  const meanF = (jdTD) => { const T = (jdTD - 2451545) / 36525; return 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000; };
  const meanMp = (jdTD) => { const T = (jdTD - 2451545) / 36525; return 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000; };
  const pairs = [];
  for (const ev of events) {
    const i = bsearch(ev.jd); let best = -1, bestD = Infinity;
    for (let k = -1; k <= 1; k++) { const j = i + k; if (j < 0 || j >= nasa.length || used[j]) continue; const d = Math.abs(nasa[j].jd - ev.jd); if (d < bestD) { bestD = d; best = j; } }
    if (best >= 0 && bestD * 1440 <= matchMin) {
      used[best] = 1; const n = nasa[best], F = meanF(n.jd_TD), Mp = meanMp(n.jd_TD) * Math.PI / 180;
      // ev.jd is the finder's shipped instant (greatest eclipse since the plan-32 follow-up); ev.jdOpposition
      // the opposition in longitude it bisects first — the series on it reproduces the definition-term record
      const jdOpp = typeof ev.jdOpposition === 'number' ? ev.jdOpposition : ev.jd;
      pairs.push({ t: 2000 + (ev.jd - 2451545) / 365.25, dUT: (n.jd - ev.jd) * 1440, dTD: (n.jd_TD - ttOf(ev.jd)) * 1440, dTDOpposition: (n.jd_TD - ttOf(jdOpp)) * 1440, canonJdTD: n.jd_TD, modelJdTT: ttOf(jdOpp), modelJdTTGreatest: ttOf(ev.jd), u: ((((F + 90) % 180) + 180) % 180) - 90, sin2F: Math.sin(2 * F * Math.PI / 180), cosMp: Math.cos(Mp), sinMp: Math.sin(Mp), gamma: n.gamma, type: n.type });
    }
  }
  return { pairs, modelEvents: events.length, canonEvents: nasa.length };
}

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sdOf = (a) => { const mu = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - mu) * (v - mu), 0) / a.length); };
export function regress(x, y) { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my); } const slope = sxy / sxx; return { slope, intercept: my - slope * mx, r: sxy / Math.sqrt(sxx * syy) }; }

/** Ordinary least squares with an intercept on a few regressors (normal equations). */
function ols(X, y) {
  const n = y.length, k = X[0].length + 1;
  const A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
  for (let r = 0; r < n; r++) { const row = [1, ...X[r]]; for (let i = 0; i < k; i++) { b[i] += row[i] * y[r]; for (let j = 0; j < k; j++) A[i][j] += row[i] * row[j]; } }
  // Gaussian elimination
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < k; i++) { let p = i; for (let r = i + 1; r < k; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r; [M[i], M[p]] = [M[p], M[i]]; for (let r = i + 1; r < k; r++) { const f = M[r][i] / M[i][i]; for (let c = i; c <= k; c++) M[r][c] -= f * M[i][c]; } }
  const coef = new Array(k).fill(0);
  for (let i = k - 1; i >= 0; i--) { let s = M[i][k]; for (let c = i + 1; c < k; c++) s -= M[i][c] * coef[c]; coef[i] = s / M[i][i]; }
  const fitted = X.map((row) => coef[0] + row.reduce((s, v, i) => s + coef[i + 1] * v, 0));
  return { coef, residual: y.map((v, i) => v - fitted[i]) };
}

/** The five regressors of the definition model: the node term sin 2F, the anomaly phase (cos M′,
 *  sin M′) and the node term's anomaly sidebands (sin 2F · cos M′, sin 2F · sin M′). */
const DEFINITION_REGRESSORS = (p) => [p.sin2F, p.cosMp, p.sinMp, p.sin2F * p.cosMp, p.sin2F * p.sinMp];
const DEFINITION_NAMES = ['intercept', 'sin2F', 'cosMp', 'sinMp', 'sin2FcosMp', 'sin2FsinMp'];
const named = (coef) => Object.fromEntries(DEFINITION_NAMES.map((k, i) => [k, coef[i]]));

/** The greatest-eclipse offset the shadow geometry predicts: the instant of least distance from the
 *  shadow axis against the opposition in longitude is Δt = −β β̇ / λ̇² = −(i² Ḟ / 2 λ̇²) · sin 2F for
 *  the Moon's inclination i, its argument-of-latitude rate Ḟ and its elongation rate λ̇ (= Ḋ), and
 *  both rates carry the anomaly: λ̇ ∝ 1 + 2e cos M′ (the Moon's share), so the coefficient is
 *  modulated by about −(4 − 2) e · n_M/(n_M − n_S) ≈ −2.3 e in cos M′. Minutes and a ratio. */
export function greatestEclipseOffsetPrediction() {
  const R = require('@essrt/physics').MEEUS_ARGUMENT_RATES_DEG_PER_CY;
  const degPerMin = (degPerCy) => degPerCy / 36525 / 1440;
  const i = 5.145396 * Math.PI / 180, Fdot = degPerMin(R.F) * Math.PI / 180, Ddot = degPerMin(R.D) * Math.PI / 180, e = 0.0549;
  const nM = R.Lp, nS = R.Lp - R.D;
  return { slopeMinPerSin2F: -(i * i * Fdot) / (2 * Ddot * Ddot), anomalyModulationCosMp: -(4 * nM / (nM - nS) - 2) * e };
}

/** The event-definition term of the lunar canon's dynamical-time residual (the finder's opposition
 *  against the canon's greatest eclipse): linear in the node distance — sin 2F — with the anomaly
 *  sidebands the speed of date puts on it, and a direct anomaly phase (cos M′, sin M′) that the
 *  geometry does NOT predict — it is the model's M′ against the ephemeris's (lunarThirdInstrument).
 *  Under eclipse sampling sin 2F correlates with sin M′ (r ≈ −0.32), so the one-term slope is biased;
 *  the five-term fit is the measurement. The residual after each is returned for the spectra. */
export function lunarNodeRegression(pairs, key = 'dTDOpposition') {
  const d = pairs.map((p) => p[key]), u = pairs.map((p) => p.u), s2 = pairs.map((p) => p.sin2F), g = pairs.map((p) => p.gamma);
  const onU = regress(u, d), onSin2F = regress(s2, d), onGamma = regress(g, d);
  const afterSin2F = d.map((v, i) => v - (onSin2F.intercept + onSin2F.slope * s2[i]));
  const five = ols(pairs.map(DEFINITION_REGRESSORS), d);
  const two = ols(pairs.map((p) => [p.cosMp, p.sinMp]), d);
  const byType = {};
  for (const ty of [...new Set(pairs.map((p) => p.type))]) { const sel = pairs.filter((p) => p.type === ty); byType[ty] = { n: sel.length, ...regress(sel.map((p) => p.u), sel.map((p) => p[key])) }; }
  const c = named(five.coef);
  return {
    instant: key, n: pairs.length, meanUTMin: mean(pairs.map((p) => p.dUT)), sdUTMin: sdOf(pairs.map((p) => p.dUT)), meanTDMin: mean(d), sdTDMin: sdOf(d), uRangeDeg: [Math.min(...u), Math.max(...u)],
    onNodeDistance: onU, onSin2F, onGamma, sdAfterSin2FMin: sdOf(afterSin2F), byType,
    correlationSin2FSinMp: correlation(s2, pairs.map((p) => p.sinMp)),
    fiveTerm: { coefficients: c, sdAfterMin: sdOf(five.residual), anomalyModulationCosMp: c.sin2FcosMp / c.sin2F, directAnomalyAmplitudeMin: Math.hypot(c.cosMp, c.sinMp), predicted: greatestEclipseOffsetPrediction() },
    anomalyTwoTerm: { coefficients: { intercept: two.coef[0], cosMp: two.coef[1], sinMp: two.coef[2] }, amplitudeMin: Math.hypot(two.coef[1], two.coef[2]), sdAfterMin: sdOf(two.residual) },
    residualAfterSin2F: afterSin2F, residualAfterFiveTerm: five.residual, residualAfterAnomalyTwoTerm: two.residual,
  };
}

function correlation(a, b) {
  const ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb);
}

/** Meeus Ch. 49: the instant of the full moon nearest lunation k (TD, Julian Day), with the mean
 *  anomaly and argument of latitude the formula evaluates — the third instrument between the canon's
 *  greatest eclipse and the model's opposition, on the ephemeris's own arguments. */
export function meeusFullMoonJDE(kIn) {
  const D2R = Math.PI / 180, s = Math.sin;
  const k = Math.floor(kIn) + 0.5; const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = (2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3) * D2R;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * D2R;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * D2R;
  const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * D2R;
  jde += -0.40614 * s(Mp) + 0.17302 * E * s(M) + 0.01614 * s(2 * Mp) + 0.01043 * s(2 * F) + 0.00734 * E * s(Mp - M) - 0.00514 * E * s(Mp + M)
    + 0.00209 * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp)
    + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F) - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(Om) - 0.00007 * s(Mp + 2 * M)
    + 0.00004 * s(2 * Mp - 2 * F) + 0.00004 * s(3 * M) + 0.00003 * s(Mp + M - 2 * F) + 0.00003 * s(2 * Mp + 2 * F) - 0.00003 * s(Mp + M + 2 * F)
    + 0.00003 * s(Mp - M + 2 * F) - 0.00002 * s(Mp - M - 2 * F) - 0.00002 * s(3 * Mp + M) + 0.00002 * s(4 * Mp);
  const A = [[299.77 + 0.107408 * k - 0.009173 * T2, 0.000325], [251.88 + 0.016321 * k, 0.000165], [251.83 + 26.651886 * k, 0.000164], [349.42 + 36.412478 * k, 0.000126],
    [84.66 + 18.206239 * k, 0.000110], [141.74 + 53.303771 * k, 0.000062], [207.14 + 2.453732 * k, 0.000060], [154.84 + 7.306860 * k, 0.000056], [34.52 + 27.261239 * k, 0.000047],
    [207.19 + 0.121824 * k, 0.000042], [291.34 + 1.844379 * k, 0.000040], [161.72 + 24.198154 * k, 0.000037], [239.56 + 25.513099 * k, 0.000035], [331.55 + 3.592518 * k, 0.000023]];
  for (const [a, c] of A) jde += c * s(a * D2R);
  return { jde, Mp, F };
}

/** The Meeus/ELP secular polynomials' T³ (and T⁴) share of the lunar perigee ϖ = L′ − M′ and node
 *  Ω = L′ − F at T Julian centuries from J2000, in arcseconds — the terms the model's chains do not carry
 *  (they are Meeus-exact in T², plan 23). */
export function meeusArgumentTailArcsec(T) {
  const T3 = T ** 3, T4 = T ** 4;
  const Lp = T3 / 538841 - T4 / 65194000, Mp = T3 / 69699 - T4 / 14712000, F = -T3 / 3526000 + T4 / 863310000;
  return { Lp: Lp * 3600, Mp: Mp * 3600, F: F * 3600, perigee: (Lp - Mp) * 3600, node: (Lp - F) * 3600 };
}

/** The third instrument, by era: Meeus Ch. 49's full moon between the canon's greatest eclipse and
 *  the model's opposition. canon − Meeus carries the pure definition term in every era (the canon's
 *  M′ is the ephemeris's); model − Meeus carries the model's M′ phase against the polynomial, read
 *  off the cos M′ coefficient through the formula's −0.40614 d · sin M′ (δM′ = −c / (0.40614 · 1440)
 *  radians), beside the polynomial's T³ share of M′ at the era's midpoint. */
export function lunarThirdInstrument(pairs, eras = [[-1999, -1000], [-1000, 0], [0, 1000], [1000, 1600], [1600, 2200], [2200, 3000]]) {
  const rows = [];
  for (const p of pairs) {
    const k = (p.canonJdTD - 2451550.09766) / 29.530588861; const fm = meeusFullMoonJDE(k);
    if (Math.abs(fm.jde - p.canonJdTD) > 0.5) continue;
    rows.push({ t: p.t, canonMinusMeeusMin: (p.canonJdTD - fm.jde) * 1440, modelMinusMeeusMin: (p.modelJdTT - fm.jde) * 1440, canonMinusModelOppositionMin: p.dTDOpposition, canonMinusModelMin: p.dTD, x: [Math.sin(2 * fm.F), Math.cos(fm.Mp), Math.sin(fm.Mp), Math.sin(2 * fm.F) * Math.cos(fm.Mp), Math.sin(2 * fm.F) * Math.sin(fm.Mp)] });
  }
  const fit = (sel, key) => { const y = sel.map((r) => r[key]); const o = ols(sel.map((r) => r.x), y); return { mean: mean(y), sd: sdOf(y), coefficients: named(o.coef), sdAfter: sdOf(o.residual) }; };
  const era = (a, b) => {
    const sel = rows.filter((r) => r.t >= a && r.t < b); if (sel.length < 50) return null;
    const cm = fit(sel, 'canonMinusMeeusMin'), mm = fit(sel, 'modelMinusMeeusMin'), cmo = fit(sel, 'canonMinusModelOppositionMin'), cmod = fit(sel, 'canonMinusModelMin');
    const Tmid = ((a + b) / 2 - 2000) / 100;
    return { era: [a, b], n: sel.length, canonMinusMeeus: cm, modelMinusMeeus: mm, canonMinusModelOpposition: cmo, canonMinusModel: cmod, impliedModelMpPhaseDeg: -mm.coefficients.cosMp / (0.40614 * 1440) * 180 / Math.PI, meeusMpTailAtMidpointDeg: meeusArgumentTailArcsec(Tmid).Mp / 3600 };
  };
  return { n: rows.length, full: era(-Infinity, Infinity), byEra: eras.map(([a, b]) => era(a, b)).filter(Boolean) };
}
