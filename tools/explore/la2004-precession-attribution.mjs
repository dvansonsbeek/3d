// The La2004 precession-rate drift attributed (doc 112 §8; TODO B closed 2026-11-21). PRINT-ONLY — no repo write.
//
//   node tools/explore/la2004-precession-attribution.mjs
//
// Doc 112 §8 recorded one secular drift of the model's Earth elements against La2004 over the last 10 Myr: the
// perihelion of date's residual slopes at 0.0203″/yr, the obliquity's 41-kyr line drifting in phase — a precession-
// RATE difference between La2004's tidal model and the composed law on the cited Earth–Moon history. This instrument
// reads both precession-rate histories off the obliquity itself and attributes the difference:
//
//   1. Per 1-Myr window, the obliquity's dominant frequency (the 41-kyr line, ψ̇_in − |s₃|) is read from La2004's ε(t)
//      and from the model's own ε(t) by the SAME estimator (a periodogram scan with a parabolic peak); the estimator's
//      window bias (the line mixture's phases — up to 0.6″/yr on a single window) cancels in the difference.
//   2. The model's law is decomposed per window: the spin factor ω/ω₀ (the hydrostatic J₂ ∝ ω²), the lunar torque term,
//      cos ε̄ of date, the e-of-date torque factor and J₂(t)/J₂₀ — the product reproduces the composed rate to 1e-14.
//   3. La2004's excess rise is regressed on the model's SPIN share: excess = a + r · (ω/ω₀ − 1)·p₀. Measured r = 0.27
//      (window scatter 0.20–0.59, the young windows the noisiest), a = 0.002″/yr; the equal-lag solar/lunar tidal
//      torque ratio (M_S/M_M)²(a_M/a_S)⁶ = 0.211. The model's deep LOD is the lunar angular-momentum transfer on the
//      cited distance history (2.13 ms/cy over the span) — the solar tide brakes the Earth without moving the Moon and
//      so cannot be in that chain; La2004's Mignard model carries both tides in ω(t). The drift is that solar share.
//
// The reading needs La2004's conventions only for its sign: with a constant dynamical ellipticity the spin factor would
// enter as 1/ω and La2004's rate would FALL into the past — the data rise, so E_d scales with ω² there as here.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const data = (f) => { try { return require(ROOT + 'data/' + f); } catch { return undefined; } };
const { createModel } = await import(ROOT + 'packages/physics/src/index.js');
const m = createModel(undefined, { secularSeriesArtifact: data('nbody-secular-series.json'), spinCheckpointsArtifact: data('spin-axis-checkpoints.json'), lunarCheckpointsArtifact: data('lunar-cumulative-checkpoints.json'), obliquityBeatTableArtifact: data('obliquity-beat-table.json') ?? null });

// ── La2004 on disk: t (kyr ≤ 0), e, ε (rad), ϖ̄ (rad, from the moving equinox) ──────────────────────────
const la = [];
for (const line of readFileSync(ROOT + 'data/la2004-earth-51myr-back.asc', 'utf8').split('\n')) {
  const tok = line.trim().replace(/D([+-]\d\d)/g, 'e$1').split(/\s+/); if (tok.length < 4) continue;
  const v = tok.map(Number); if (v.every(Number.isFinite)) la.push({ tKyr: v[0], e: v[1], epsRad: v[2], piRad: v[3] });
}
const laAt = new Map(la.map((r) => [Math.round(r.tKyr), r]));
const R2D = 180 / Math.PI;

// ── estimators ─────────────────────────────────────────────────────────────────────────────────────────
/** least-squares line y = a + b t */
const lineFit = (t, y) => { const n = t.length; let St = 0, Sy = 0, Stt = 0, Sty = 0; for (let i = 0; i < n; i++) { St += t[i]; Sy += y[i]; Stt += t[i] * t[i]; Sty += t[i] * y[i]; } const b = (n * Sty - St * Sy) / (n * Stt - St * St); return { a: (Sy - b * St) / n, b }; };
/** the dominant frequency near f0 (cycles per kyr) of a detrended series at 1-kyr cadence: a fine periodogram scan + a parabolic peak refinement */
const peakFrequency = (t, y, f0, halfWidth = 0.004, step = 2e-5) => {
  const { a, b } = lineFit(t, y); const r = y.map((v, i) => v - a - b * t[i]);
  const power = (f) => { let c = 0, s = 0; for (let i = 0; i < t.length; i++) { const ph = 2 * Math.PI * f * t[i]; c += r[i] * Math.cos(ph); s += r[i] * Math.sin(ph); } return c * c + s * s; };
  let best = f0, pb = -1; for (let f = f0 - halfWidth; f <= f0 + halfWidth; f += step) { const p = power(f); if (p > pb) { pb = p; best = f; } }
  const pm = power(best - step), pp = power(best + step), denom = pm - 2 * pb + pp;
  return best + (denom < 0 ? 0.5 * (pm - pp) / denom : 0) * step;
};

/** the surface blocks that carry the precession law's pieces and the window-mean inertial rate (found by accessor) */
const PR = Object.values(m).find((o) => o && typeof o === 'object' && typeof o.meanRateArcsecPerYrAtYear === 'function');
if (!PR) throw new Error('the precession block was not found on the model surface');
const p0 = PR.meanRateArcsecPerYrAtYear(2000);
console.log(`the model's |s₃| ${PR.nodalModeS3ArcsecPerYr.toFixed(3)}″/yr (Laskar et al. 2004 Table 6: 18.85); ψ̇(J2000) ${p0.toFixed(4)}″/yr`);

// ── 1. the obliquity's 41-kyr line per window, both series ─────────────────────────────────────────────
console.log('\n1. the obliquity line ψ̇_in − |s₃| per 1-Myr window, ″/yr (the same estimator on both; its window bias cancels in Δ)');
console.log('   window (Ma) | La2004  | model   | Δ model−La | ε̄ La2004 ° | ε̄ model °');
const rows = [];
for (let w = 0; w < 10; w++) {
  const t0 = -1000 * (w + 1), t1 = -1000 * w, t = [], epsLa = [], epsMo = [];
  for (let k = t0; k <= t1; k++) { const r = laAt.get(k); if (!r) continue; t.push(k); epsLa.push(r.epsRad * R2D * 3600); epsMo.push(m.earth.obliquityDeg(2000 + k * 1000) * 3600); }
  const toRate = (f) => f * 1296000 / 1000;
  const rLa = toRate(peakFrequency(t, epsLa, 1 / 41)), rMo = toRate(peakFrequency(t, epsMo, 1 / 41));
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length / 3600;
  rows.push({ w, rLa, rMo });
  console.log(`   ${String(w + 1).padStart(2)}–${w}        | ${rLa.toFixed(4)} | ${rMo.toFixed(4)} | ${(rMo - rLa).toFixed(4).padStart(8)} | ${mean(epsLa).toFixed(4)}   | ${mean(epsMo).toFixed(4)}`);
}
const avg = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
console.log(`   mean Δ over 0–10 Ma ${(avg('rMo') - avg('rLa')).toFixed(4)}″/yr; slopes against age (″/yr per Myr): La2004 ${lineFit(rows.map((r) => r.w + 0.5), rows.map((r) => r.rLa)).b.toFixed(4)}, model ${lineFit(rows.map((r) => r.w + 0.5), rows.map((r) => r.rMo)).b.toFixed(4)}`);

// the sweep's own reading reproduced: the WRAPPED perihelion-of-date residual's slope (unwrapping per window fails
// across the eccentricity minima, where the perihelion swings)
{
  const t = [], d = [];
  for (let k = -10000; k <= 0; k += 2) { const r = laAt.get(k); if (!r) continue; let x = r.piRad * R2D - m.earth.perihelionLongitudeDeg(2000 + k * 1000); x = ((x + 540) % 360 + 360) % 360 - 180; t.push(k); d.push(x * 3600); }
  console.log(`   doc 112 §8's reading reproduced: the wrapped ϖ̄ residual (model − La2004) slope ${(-lineFit(t, d).b * 1000 / 1e6).toFixed(4)}″/yr over 0–10 Ma (recorded 0.0203)`);
}

// ── 2. the model's law per window ──────────────────────────────────────────────────────────────────────
console.log('\n2. the model\'s ψ̇ law at the window middles (″/yr beyond p₀): composed | spin ω/ω₀ | lunar term | cos ε̄ | e-torque | J₂ ratio');
for (let w = 0; w < 10; w++) {
  const year = 2000 - (w + 0.5) * 1e6, rate = PR.meanRateArcsecPerYrAtYear(year);
  const spin = m.epoch.lodSecondsAtYear(2000) / m.epoch.lodSecondsAtYear(year), lunar = PR.torqueTermAtYear(year), cosF = PR.precessionObliquityFactorAtYear(year);
  const st = PR.solarTorqueFactorOfDateAtYear(year), j2 = PR.ellipticityRatioOfDateAtYear(year);
  console.log(`   ${(w + 0.5).toFixed(1).padStart(4)} Ma: ${(rate - p0).toFixed(4).padStart(7)} | +${((spin - 1) * p0).toFixed(4)} | +${((lunar - 1) * p0).toFixed(4)} | +${((cosF - 1) * p0).toFixed(4)} | ${((st - 1) * p0).toFixed(4).padStart(7)} | ${((j2 - 1) * p0).toFixed(4).padStart(7)}   (product − composed ${(p0 * spin * lunar * cosF - rate).toExponential(1)})`);
}

// ── 3. La2004's excess rise against the model's spin share ─────────────────────────────────────────────
{
  const rs = rows.map((r) => { const year = 2000 - (r.w + 0.5) * 1e6, spin = (m.epoch.lodSecondsAtYear(2000) / m.epoch.lodSecondsAtYear(year) - 1) * p0; return { w: r.w, excess: r.rLa - r.rMo, spin }; });
  const fit = lineFit(rs.map((x) => x.spin), rs.map((x) => x.excess));
  const lodSlope = (m.epoch.lodSecondsAtYear(2000) - m.epoch.lodSecondsAtYear(2000 - 9.5e6)) / 9.5e6 * 1e5;
  const mS = 1.98892e30, mM = 7.34767e22, aM = 384399e3, aS = 1.495979e11, solarOverLunar = (mS / mM) ** 2 * (aM / aS) ** 6;
  console.log('\n3. La2004\'s excess rise (La2004 − model, the obliquity line) against the model\'s spin share (ω/ω₀ − 1)·p₀');
  for (const x of rs) console.log(`   ${(x.w + 0.5).toFixed(1).padStart(4)} Ma: excess ${x.excess.toFixed(4).padStart(7)}″/yr · spin share ${x.spin.toFixed(4)} · ratio ${(x.excess / x.spin).toFixed(2)}`);
  console.log(`   excess = ${fit.a.toFixed(4)} + ${fit.b.toFixed(3)} × spin share — r = ${fit.b.toFixed(2)}`);
  console.log(`   the model's mean tidal LOD slope over the span ${lodSlope.toFixed(3)} ms/cy (the lunar transfer alone, by construction); the equal-lag solar/lunar tidal torque ratio (M_S/M_M)²(a_M/a_S)⁶ = ${solarOverLunar.toFixed(3)}`);
  console.log(`   reading: La2004's spin history brakes ${(fit.b * 100).toFixed(0)} % faster than the lunar-only chain — the solar tide's share (theory ${(solarOverLunar * 100).toFixed(0)} % for equal lags); at 9.5 Ma that is ${(fit.b * rs[9].spin).toFixed(3)}″/yr of the ${rs[9].excess.toFixed(3)} measured.`);
}
