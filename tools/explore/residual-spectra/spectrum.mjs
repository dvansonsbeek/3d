// Plan 32 — the residual spectra: the ONE harness every series runs through.
//
// Generalised (floating-mean, weighted) Lomb–Scargle on an arbitrary sampling; the series'
// own SPECTRAL WINDOW (the periodogram of the sampling itself: a unit sinusoid at a reference
// frequency sampled at the same instants, so a spectral peak that coincides with a window peak
// is the window's — the 14.2-yr lesson, doc 111); a NOISE FLOOR from AR(1) surrogates on the same
// instants (the lag-1 correlation read off the unequal spacing as exp(−Δt/τ)), the floor being
// the 99th percentile of each surrogate's MAXIMUM over the frequency grid — the correction for
// the number of frequencies searched is in the statistic itself; and the two splits every
// candidate must survive: edge/interior (the first and last tenth removed) and two halves.
//
// Research code (tools/explore): reads residual series, writes nothing into the model.

/** Weighted least-squares fit of a + b·cos(ωt) + c·sin(ωt) at one angular frequency; returns the
 *  reduction of the weighted sum of squares (the "power") and the fitted amplitude. */
export function lsFitAtOmega(t, y, w, omega) {
  // normal equations for [1, cos, sin]
  let s00 = 0, s01 = 0, s02 = 0, s11 = 0, s12 = 0, s22 = 0, r0 = 0, r1 = 0, r2 = 0;
  for (let i = 0; i < t.length; i++) {
    const c = Math.cos(omega * t[i]), s = Math.sin(omega * t[i]), wi = w[i], yi = y[i];
    s00 += wi; s01 += wi * c; s02 += wi * s; s11 += wi * c * c; s12 += wi * c * s; s22 += wi * s * s;
    r0 += wi * yi; r1 += wi * yi * c; r2 += wi * yi * s;
  }
  // solve the 3×3 symmetric system by Cramer's rule
  const det = s00 * (s11 * s22 - s12 * s12) - s01 * (s01 * s22 - s12 * s02) + s02 * (s01 * s12 - s11 * s02);
  if (!(Math.abs(det) > 1e-300)) return { power: 0, amplitude: 0, a: 0, b: 0, c: 0 };
  const a = (r0 * (s11 * s22 - s12 * s12) - s01 * (r1 * s22 - s12 * r2) + s02 * (r1 * s12 - s11 * r2)) / det;
  const b = (s00 * (r1 * s22 - s12 * r2) - r0 * (s01 * s22 - s12 * s02) + s02 * (s01 * r2 - r1 * s02)) / det;
  const c = (s00 * (s11 * r2 - r1 * s12) - s01 * (s01 * r2 - r1 * s02) + r0 * (s01 * s12 - s11 * s02)) / det;
  // the weighted sum of squares explained by the sinusoid beyond the weighted mean
  const mean = r0 / s00;
  let ssMean = 0, ssFit = 0;
  for (let i = 0; i < t.length; i++) {
    const c1 = Math.cos(omega * t[i]), s1 = Math.sin(omega * t[i]);
    const dm = y[i] - mean, df = y[i] - (a + b * c1 + c * s1);
    ssMean += w[i] * dm * dm; ssFit += w[i] * df * df;
  }
  return { power: Math.max(0, ssMean - ssFit) / Math.max(ssMean, 1e-300), amplitude: Math.hypot(b, c), a, b, c };
}

/** The frequency grid: from 1/(oversample × span) to the pseudo-Nyquist 1/(2 × median spacing),
 *  `oversample` points per independent frequency 1/span. @returns {number[]} frequencies (1/yr) */
export function frequencyGrid(t, { oversample = 8, fMaxFactor = 1 } = {}) {
  const ts = [...t].sort((a, b) => a - b);
  const span = ts[ts.length - 1] - ts[0];
  const gaps = [];
  for (let i = 1; i < ts.length; i++) if (ts[i] > ts[i - 1]) gaps.push(ts[i] - ts[i - 1]);
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  const fMax = fMaxFactor * 0.5 / median, df = 1 / (oversample * span);
  const out = [];
  for (let f = df; f <= fMax; f += df) out.push(f);
  return out;
}

/** The periodogram (normalised power 0…1) over a frequency grid. */
export function periodogram(t, y, w, freqs) {
  return freqs.map((f) => lsFitAtOmega(t, y, w, 2 * Math.PI * f).power);
}

/** The spectral window: the periodogram of a unit cosine at `fRef` sampled at the instants,
 *  returned on the grid of OFFSETS from fRef (so it can be laid over any peak). */
export function spectralWindow(t, w, freqs, fRef) {
  const y = t.map((ti) => Math.cos(2 * Math.PI * fRef * ti));
  const fs = freqs.map((f) => fRef + f);
  return periodogram(t, y, w, fs);
}

/** A seeded xorshift128+ generator (reproducible surrogates). */
export function makeRng(seed = 1) {
  let s0 = BigInt(seed) * 0x9E3779B97F4A7C15n & 0xFFFFFFFFFFFFFFFFn || 1n, s1 = 0xD1B54A32D192ED03n;
  const next = () => {
    let x = s0; const y = s1; s0 = y; x ^= (x << 23n) & 0xFFFFFFFFFFFFFFFFn; s1 = x ^ y ^ (x >> 17n) ^ (y >> 26n);
    return Number(((s1 + y) & 0xFFFFFFFFFFFFFFFFn) >> 11n) / 9007199254740992;
  };
  const gauss = () => { const u = Math.max(next(), 1e-300), v = next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return { next, gauss };
}

/** The AR(1) parameters of a series on unequal spacing: the lag correlation read as
 *  exp(−Δt/τ) from the weighted regression of y(t_i) on y(t_{i−1}), the innovation variance. */
export function fitAr1(t, y, w) {
  const mean = y.reduce((a, v, i) => a + w[i] * v, 0) / w.reduce((a, v) => a + v, 0);
  const d = y.map((v) => v - mean);
  let sxy = 0, sxx = 0, sdt = 0, n = 0;
  for (let i = 1; i < t.length; i++) { const dt = t[i] - t[i - 1]; if (!(dt > 0)) continue; sxy += d[i] * d[i - 1]; sxx += d[i - 1] * d[i - 1]; sdt += dt; n++; }
  const rho = sxx > 0 ? Math.min(0.999, Math.max(0, sxy / sxx)) : 0;
  const meanDt = n ? sdt / n : 1;
  const tau = rho > 0 ? -meanDt / Math.log(rho) : 0;   // the correlation time at the mean spacing
  const variance = d.reduce((a, v, i) => a + w[i] * v * v, 0) / w.reduce((a, v) => a + v, 0);
  return { mean, rho, tau, variance };
}

/** One AR(1) surrogate on the instants `t` (τ = 0 gives white noise), unit variance. */
export function ar1Surrogate(t, tau, rng) {
  const out = new Array(t.length);
  out[0] = rng.gauss();
  for (let i = 1; i < t.length; i++) {
    const phi = tau > 0 ? Math.exp(-(t[i] - t[i - 1]) / tau) : 0;
    out[i] = phi * out[i - 1] + Math.sqrt(Math.max(0, 1 - phi * phi)) * rng.gauss();
  }
  return out;
}

/** The noise floor: the 99th (and 95th) percentile of the surrogates' MAXIMUM power over the grid
 *  — a peak above it is significant at p < 0.01 after the search over all frequencies. */
export function noiseFloor(t, w, freqs, tau, { n = 1000, seed = 7 } = {}) {
  // All surrogates first (the same generator order as one-at-a-time), then ONE pass over the
  // frequencies: the cosines, sines and the 3×3 normal matrix of [1, cos, sin] depend on the
  // sampling only, so they are computed once per frequency and each surrogate costs two dot
  // products. The power is the same statistic as lsFitAtOmega's: (xᵀr − r₀²/s₀₀)/SS_mean with
  // x the WLS solution and r the weighted moments. (Recomputing the trigonometry per surrogate
  // took 14 min for a 5,000-point series; this takes seconds.)
  const rng = makeRng(seed), N = t.length;
  let s00 = 0; for (let i = 0; i < N; i++) s00 += w[i];
  const wys = [], r0s = new Float64Array(n), ssMean = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const y = ar1Surrogate(t, tau, rng), wy = new Float64Array(N);
    let r0 = 0, syy = 0;
    for (let i = 0; i < N; i++) { wy[i] = w[i] * y[i]; r0 += wy[i]; syy += wy[i] * y[i]; }
    wys.push(wy); r0s[k] = r0; ssMean[k] = Math.max(syy - r0 * r0 / s00, 1e-300);
  }
  const maximaArr = new Float64Array(n), c = new Float64Array(N), s = new Float64Array(N);
  for (const f of freqs) {
    const om = 2 * Math.PI * f;
    let s01 = 0, s02 = 0, s11 = 0, s12 = 0, s22 = 0;
    for (let i = 0; i < N; i++) { const ci = Math.cos(om * t[i]), si = Math.sin(om * t[i]); c[i] = ci; s[i] = si; s01 += w[i] * ci; s02 += w[i] * si; s11 += w[i] * ci * ci; s12 += w[i] * ci * si; s22 += w[i] * si * si; }
    const det = s00 * (s11 * s22 - s12 * s12) - s01 * (s01 * s22 - s12 * s02) + s02 * (s01 * s12 - s11 * s02);
    if (!(Math.abs(det) > 1e-300)) continue;
    const i00 = (s11 * s22 - s12 * s12) / det, i01 = (s02 * s12 - s01 * s22) / det, i02 = (s01 * s12 - s02 * s11) / det;
    const i11 = (s00 * s22 - s02 * s02) / det, i12 = (s01 * s02 - s00 * s12) / det, i22 = (s00 * s11 - s01 * s01) / det;
    for (let k = 0; k < n; k++) {
      const wy = wys[k], r0 = r0s[k];
      let r1 = 0, r2 = 0;
      for (let i = 0; i < N; i++) { r1 += wy[i] * c[i]; r2 += wy[i] * s[i]; }
      const a = i00 * r0 + i01 * r1 + i02 * r2, b = i01 * r0 + i11 * r1 + i12 * r2, cc = i02 * r0 + i12 * r1 + i22 * r2;
      const p = (a * r0 + b * r1 + cc * r2 - r0 * r0 / s00) / ssMean[k];
      if (p > maximaArr[k]) maximaArr[k] = p;
    }
  }
  const maxima = Array.from(maximaArr);
  maxima.sort((a, b) => a - b);
  const q = (p) => maxima[Math.min(maxima.length - 1, Math.floor(p * maxima.length))];
  return { p99: q(0.99), p95: q(0.95), median: q(0.5), n, tau };
}

/** The local maxima of a periodogram above a floor, as candidates {f, period, power, amplitude}. */
export function candidates(t, y, w, freqs, power, floor) {
  const out = [];
  for (let i = 1; i < freqs.length - 1; i++) {
    if (power[i] > floor && power[i] >= power[i - 1] && power[i] >= power[i + 1]) {
      const fit = lsFitAtOmega(t, y, w, 2 * Math.PI * freqs[i]);
      out.push({ f: freqs[i], period: 1 / freqs[i], power: power[i], amplitude: fit.amplitude });
    }
  }
  return out.sort((a, b) => b.power - a.power);
}

/** A candidate's power on a subset of the instants (the splits): the fit at the same frequency. */
export function powerOnSubset(t, y, w, idx, f) {
  const ts = idx.map((i) => t[i]), ys = idx.map((i) => y[i]), ws = idx.map((i) => w[i]);
  return lsFitAtOmega(ts, ys, ws, 2 * Math.PI * f);
}

/** The index sets of the two splits: interior (the first and last tenth of the SPAN removed),
 *  and the two halves by time. */
export function splitIndices(t) {
  const ts = [...t].sort((a, b) => a - b), t0 = ts[0], t1 = ts[ts.length - 1], span = t1 - t0;
  const all = t.map((_, i) => i);
  return {
    interior: all.filter((i) => t[i] >= t0 + 0.1 * span && t[i] <= t1 - 0.1 * span),
    firstHalf: all.filter((i) => t[i] < t0 + 0.5 * span),
    secondHalf: all.filter((i) => t[i] >= t0 + 0.5 * span),
  };
}

/** A weighted linear trend {slope, intercept} and the detrended series — for a residual that
 *  carries a secular drift (the series-7 class: a g-mode rate offset reads as a slope); the
 *  slope is reported beside the lines, never hidden. */
export function linearTrend(t, y, w) {
  let sw = 0, st = 0, sy = 0, stt = 0, sty = 0;
  for (let i = 0; i < t.length; i++) { sw += w[i]; st += w[i] * t[i]; sy += w[i] * y[i]; stt += w[i] * t[i] * t[i]; sty += w[i] * t[i] * y[i]; }
  const den = sw * stt - st * st;
  const slope = den !== 0 ? (sw * sty - st * sy) / den : 0, intercept = (sy - slope * st) / sw;
  return { slope, intercept, detrended: y.map((v, i) => v - (intercept + slope * t[i])) };
}

/** The whole analysis of one series: grid, periodogram, window, floor, candidates with splits. */
export function analyseSeries({ t: tIn, y: yRaw, w: wIn = null, oversample = 8, surrogates = 1000, seed = 7, fMaxFactor = 1, label = '', detrend = 'none' }) {
  // the series is analysed in TIME ORDER whatever order it arrives in (LR04 is listed by age, La2004
  // backwards): the AR(1) lag estimate and the surrogates step from each instant to the next, and on a
  // descending series the estimator read ρ = 0 and the "red-noise" floor was the white one
  const order = tIn.map((_, i) => i).sort((a, b) => tIn[a] - tIn[b]);
  const t = order.map((i) => tIn[i]), yIn = order.map((i) => yRaw[i]);
  const ww = wIn ? order.map((i) => wIn[i]) : t.map(() => 1);
  let trend = null, y = yIn;
  if (detrend === 'linear') { const lt = linearTrend(t, yIn, ww); trend = { slope: lt.slope, intercept: lt.intercept }; y = lt.detrended; }
  if (detrend === 'quadratic') {
    // a weighted quadratic in the centred, scaled time u = (t − t̄)/half-span (an ANALYSIS detrend,
    // stated beside the lines: a rate offset that itself drifts leaves a parabola, whose Fourier
    // terms at span/n would otherwise read as a family of "lines")
    const t0 = (t[0] + t[t.length - 1]) / 2, h = (t[t.length - 1] - t[0]) / 2 || 1;
    const S = [0, 0, 0, 0, 0], R = [0, 0, 0];
    for (let i = 0; i < t.length; i++) { const u = (t[i] - t0) / h; let p = ww[i]; for (let k = 0; k < 5; k++) { S[k] += p; if (k < 3) R[k] += p * yIn[i]; p *= u; } }
    const A = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]];
    const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det3(A), col = (k) => A.map((row, i) => row.map((v, j) => (j === k ? R[i] : v)));
    const c0 = det3(col(0)) / D, c1 = det3(col(1)) / D, c2 = det3(col(2)) / D;
    trend = { quadratic: true, t0, halfSpan: h, c0, c1, c2, slope: c1 / h, curvaturePerUnit2: c2 / (h * h) };
    y = yIn.map((v, i) => { const u = (t[i] - t0) / h; return v - (c0 + c1 * u + c2 * u * u); });
  }
  const freqs = frequencyGrid(t, { oversample, fMaxFactor });
  const power = periodogram(t, y, ww, freqs);
  const ar1 = fitAr1(t, y, ww);
  const floor = noiseFloor(t, ww, freqs, ar1.tau, { n: surrogates, seed });
  const floorWhite = noiseFloor(t, ww, freqs, 0, { n: Math.min(surrogates, 300), seed: seed + 1 });
  const cands = candidates(t, y, ww, freqs, power, floor.p99);
  const peaksAll = candidates(t, y, ww, freqs, power, 0);   // every local maximum, for the record when nothing passes
  const splits = splitIndices(t);
  // the window laid over each candidate: the window's own secondary peaks near it (offsets > 1/span)
  const span = Math.max(...t) - Math.min(...t);
  const window = spectralWindow(t, ww, freqs.slice(0, Math.min(freqs.length, Math.round(oversample * 20))), 0);   // offsets 0 … 20/span
  const decorate = (list) => list.map((c) => {
    const interior = powerOnSubset(t, y, ww, splits.interior, c.f), h1 = powerOnSubset(t, y, ww, splits.firstHalf, c.f), h2 = powerOnSubset(t, y, ww, splits.secondHalf, c.f);
    // a window sidelobe near this candidate? the window's power at the offset from the strongest candidate
    const strongest = list[0];
    const offset = Math.abs(c.f - strongest.f), k = Math.round(offset * span * oversample);
    const windowAtOffset = k < window.length ? window[k] : 0;
    return {
      ...c,
      amplitudeInterior: interior.amplitude, amplitudeFirstHalf: h1.amplitude, amplitudeSecondHalf: h2.amplitude,
      standsInBothHalves: h1.amplitude > 0.5 * c.amplitude && h2.amplitude > 0.5 * c.amplitude,
      standsInInterior: interior.amplitude > 0.5 * c.amplitude,
      windowSidelobeOfStrongest: c !== strongest && windowAtOffset > 0.3,
    };
  });
  const withSplits = decorate(cands), peaks = decorate(peaksAll.slice(0, 10));
  return {
    label, n: t.length, span, tMin: Math.min(...t), tMax: Math.max(...t), detrend, trend,
    rmsRaw: Math.sqrt(yIn.reduce((a, v, i) => a + ww[i] * v * v, 0) / ww.reduce((a, v) => a + v, 0)),
    rms: Math.sqrt(y.reduce((a, v, i) => a + ww[i] * v * v, 0) / ww.reduce((a, v) => a + v, 0)),
    ar1, grid: { fMin: freqs[0], fMax: freqs[freqs.length - 1], nFreq: freqs.length, oversample },
    floor, floorWhite,
    spectrum: { f: freqs, power },
    window: { offsetsPerSpan: window.map((_, i) => i / oversample), power: window },
    candidates: withSplits,
    peaks,
  };
}
