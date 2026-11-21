// A solar tide of date in the deep day length against the paleo record (doc 99 §"The J₂ → α conversion factor";
// the LOD-budget decision closed on it). PRINT-ONLY — no repo write.
//
//   node tools/explore/solar-tide-paleo-test.mjs
//
// The deep LOD is the lunar angular-momentum transfer on the cited distance history: ω(t) = [L_total − L_M(a(t))]/C(t).
// A solar tide removes spin from the Earth without moving the Moon, so a chain carrying it has the Earth spinning
// FASTER in the past than the lunar-only budget says: LOD_s(t) = LOD(t) − ∫_t^0 r(t')·(dLOD_lunar/dt') dt', with the
// solar/lunar torque ratio of date r(t') = r₀·(a(t')/a₀)⁶ (equal lags). Four shares are read against the 29 day-length
// and day-count anchors of data/paleo-validation-anchors.json through the gate's own expectation types: the J2000
// budget's physical pair (5.6 %), today's dissipation budget (~17 %), equal lags (21 %) and La2004's spin history as
// measured by tools/explore/la2004-precession-attribution.mjs (27 %). The cited history's own LOD column (Farhat et
// al. 2022, astrogeo22 columns.lodHours) is printed beside the chain: it sits slightly ABOVE the lunar-only day in the
// past (a longer day: no net solar braking in that spin history either).
//
// Measured: shipped 0 of 29 outside; 5.6 % → 6 (the flagship Wells 380 +1.23 % against its 0.3–1.1 band, Williams 620
// +8.1 %, Wu 650 −3.7 %); 17 % → 19; 21 % → 19; 27 % → 22. The record bounds the NET non-lunar braking over the
// Phanerozoic to a few per cent of the lunar transfer — the 10-Myr La2004 drift measures that solution's convention,
// not nature's solar share.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const data = (f) => { try { return require(ROOT + 'data/' + f); } catch { return undefined; } };
const { createModel } = await import(ROOT + 'packages/physics/src/index.js');
const m = createModel(undefined, { secularSeriesArtifact: data('nbody-secular-series.json'), spinCheckpointsArtifact: data('spin-axis-checkpoints.json'), lunarCheckpointsArtifact: data('lunar-cumulative-checkpoints.json'), obliquityBeatTableArtifact: data('obliquity-beat-table.json') ?? null });
const AG = require(ROOT + 'data/astrogeo22-earth-moon.json');

const lodAt = (tMa) => m.epoch.lodSecondsAtYear(2000 - tMa * 1e6);
const aAt = (tMa) => m.epoch.moonDistanceKmAtYear(2000 - tMa * 1e6);
const yearSecAt = (tMa) => m.epoch.tropicalYearSecondsAtYear(2000 - tMa * 1e6);
const a0 = aAt(0);

/** the LOD the solar tide would have added between the age and now (the lunar lengthening per 1-Myr step, forward in
 *  time, times the torque ratio of date) — the past day is SHORTER by this */
const solarDeltaLod = (tMa, r0) => {
  let s = 0; const h = 1;
  for (let t = 0; t < tMa; t += h) { const tm = t + h / 2; const dlod = lodAt(tm - h / 2) - lodAt(tm + h / 2); s += r0 * (aAt(tm) / a0) ** 6 * dlod; }
  return s;
};
const R0 = [0.056, 0.17, 0.21, 0.27];
console.log('the day of date, hours — the lunar-only chain, then with a solar tide of date at r₀ = 5.6 % (the J2000 pair), 17 % (the dissipation budget), 21 % (equal lags), 27 % (La2004 measured) · r(t)/r₀ · the cited history\'s own LOD column');
const farhatLod = AG.columns.lodHours;
for (const t of [0, 10, 50, 100, 200, 300, 400, 500, 650, 1000, 2460]) {
  const lod = lodAt(t), idx = AG.columns.ageMa.indexOf(t);
  console.log(`  ${String(t).padStart(5)} Ma: lunar-only ${(lod / 3600).toFixed(3)} | ${R0.map((r0) => ((lod - solarDeltaLod(t, r0)) / 3600).toFixed(3)).join(' | ')} | ${((aAt(t) / a0) ** 6).toFixed(3)} | Farhat ${idx >= 0 ? Number(farhatLod[idx]).toFixed(3) : '—'}`);
}

// ── the paleo anchors re-read with the solar tide, through the gate's expectation types ────────────────
const anchors = require(ROOT + 'data/paleo-validation-anchors.json').anchors.filter((r) => r.quantity === 'daysPerYear' || r.quantity === 'lodHr');
const verdict = (r, value) => {
  const e = r.expectation;
  if (e.type === 'relativePct') { const d = (value / r.observed - 1) * 100; return { ok: Math.abs(d) <= e.tolerancePct, label: `${d.toFixed(2)} % (±${e.tolerancePct})` }; }
  if (e.type === 'deviationBandPct') { const d = (value / r.observed - 1) * 100; return { ok: d >= e.band[0] && d <= e.band[1], label: `${d.toFixed(2)} % (band ${e.band[0]}…${e.band[1]})` }; }
  if (e.type === 'range') { const [lo, hi] = r.observedRange; const out = value < lo ? value - lo : value > hi ? value - hi : 0; return { ok: Math.abs(out) <= e.outsideToleranceAbs, label: `${value.toFixed(2)} vs [${lo}, ${hi}] out ${out.toFixed(2)} (±${e.outsideToleranceAbs})` }; }
  if (e.type === 'deviationBandOutsideRange') { const [lo, hi] = r.observedRange; const out = value < lo ? value - lo : value > hi ? value - hi : 0; return { ok: out >= e.band[0] && out <= e.band[1], label: `out ${out.toFixed(2)} (band ${e.band[0]}…${e.band[1]})` }; }
  return { ok: true, label: e.type };
};
console.log('\nanchor                        | lunar-only (shipped)            | r₀ 5.6 %                      | r₀ 17 %                       | r₀ 21 %                       | r₀ 27 %');
const counts = R0.map(() => 0); let shippedFails = 0;
for (const r of anchors) {
  const t = r.ageMa, lod = lodAt(t), valueFor = (lodS) => (r.quantity === 'lodHr' ? lodS / 3600 : yearSecAt(t) / lodS);
  const base = verdict(r, valueFor(lod)); if (!base.ok) shippedFails++;
  const alts = R0.map((r0, i) => { const v = verdict(r, valueFor(lod - solarDeltaLod(t, r0))); if (!v.ok) counts[i]++; return v; });
  console.log(`  ${r.id.padEnd(28)} | ${(base.ok ? '  ' : '✗ ') + base.label.padEnd(29)} | ${alts.map((v) => (v.ok ? '  ' : '✗ ') + v.label.padEnd(28)).join(' | ')}`);
}
console.log(`\nanchors outside their expectation: shipped ${shippedFails} of ${anchors.length} · ${R0.map((r0, i) => `r₀ ${(r0 * 100).toFixed(1)} %: ${counts[i]}`).join(' · ')}`);
console.log('(a documented-deviation band is left by an improvement as well as by a worsening — the gate fails both)');
